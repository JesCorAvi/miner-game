import * as THREE from 'three';
import {
  WEAPONS,
  cooldownMultiplier,
  damageMultiplier,
  layerAtDepth,
  passiveMultiplier,
  professionCanUseWeapon,
  weaponDamageScale,
  weaponFamily,
  weaponPassiveMultiplier,
  weaponProfessionMultiplier,
  weaponTier,
} from '../config';
import { PATENTS } from './Progression';
import type { WeaponId } from '../types';
import type { NodeRayHit, ResourceNode } from '../world/Resources';
import type { AimTarget } from './GameTypes';
import type { Game } from './Game';
import {
  carveTerrainAt,
  damageNodeLocally,
  sendFx,
  sendShotFx,
} from './Combat';
import { fireOrbitWeapon, fireProjectileWeapon, fireQuakeWeapon } from './Projectiles';
import { applyPoison, applyWetArea } from './WeaponStatus';
import { PICKAXE_IMPACT_FRACTION } from '../player/PickaxeModel';

type WeaponBehavior =
  | 'melee'
  | 'chain'
  | 'continuous'
  | 'hitscan'
  | 'projectile'
  | 'orbit'
  | 'quake';

function weaponBehavior(weaponId: WeaponId): WeaponBehavior {
  const family = weaponFamily(weaponId);
  if (family.id === 'battleaxe') return 'orbit';
  if (family.id === 'earthquake') return 'quake';
  if (
    family.model === 'staff' ||
    family.model === 'mortar' ||
    family.model === 'tank' ||
    family.model === 'jet'
  ) {
    return 'projectile';
  }
  if (
    family.id === 'pickaxe' ||
    family.id === 'axe' ||
    family.id === 'boxingGlove' ||
    family.id === 'roundhouseKick'
  ) {
    return 'melee';
  }
  if (family.id === 'tesla' || family.id === 'orb') return 'chain';
  if (family.style === 'continuous') return 'continuous';
  return 'hitscan';
}

export function tryUseWeapon(game: Game): void {
  if (game.cooldowns[game.activeWeapon] > 0) {
    return;
  }
  const weaponId = game.activeWeapon;
  const weapon = WEAPONS[weaponId];
  if (!weapon || !game.run.loadout.weapons[weaponId]) {
    return;
  }
  if (!professionCanUseWeapon(game.run.loadout.profession, weaponId)) {
    return;
  }
  const cooldown = weapon.cooldown * cooldownMultiplier(game.run.loadout, weaponId);
  game.cooldowns[weaponId] = cooldown;
  game.tools.playFire(weaponId, weapon.style === 'melee' ? cooldown : undefined);
  switch (weaponBehavior(weaponId)) {
    case 'melee':
      game.pendingPickaxeStrike = cooldown * PICKAXE_IMPACT_FRACTION;
      break;
    case 'chain':
      fireChainWeapon(game);
      break;
    case 'continuous':
      fireContinuousWeapon(game);
      break;
    case 'hitscan':
      fireHitscanWeapon(game);
      break;
    case 'projectile':
      fireProjectileWeapon(game);
      break;
    case 'orbit':
      fireOrbitWeapon(game);
      break;
    case 'quake':
      fireQuakeWeapon(game);
      break;
  }
}

export function updatePendingWeaponStrike(game: Game, dt: number): void {
  if (game.pendingPickaxeStrike <= 0) {
    return;
  }
  const weapon = WEAPONS[game.activeWeapon];
  if (
    game.phase !== 'playing' ||
    weapon?.style !== 'melee' ||
    !game.run.loadout.weapons[game.activeWeapon]
  ) {
    game.pendingPickaxeStrike = 0;
    return;
  }
  game.pendingPickaxeStrike = Math.max(0, game.pendingPickaxeStrike - dt);
  if (game.pendingPickaxeStrike === 0) {
    fireMeleeWeapon(game);
  }
}

function nodeAimTarget(
  hit: NodeRayHit,
  direction: THREE.Vector3,
  terrainDistance: number,
): AimTarget {
  const normal = hit.point
    .clone()
    .sub(new THREE.Vector3(hit.node.x, hit.node.y, hit.node.z));
  if (normal.lengthSq() < 1e-6) {
    normal.copy(direction).negate();
  } else {
    normal.normalize();
  }
  return {
    node: hit.node,
    point: hit.point,
    normal,
    distance: hit.distance,
    terrainDistance,
    depth: Math.max(0, -hit.node.y),
  };
}

export function findAimTarget(
  game: Game,
  range: number,
  direction?: THREE.Vector3,
): AimTarget {
  const origin = game.player.getEyePosition();
  const dir = (direction ?? game.player.getAimDirection()).clone().normalize();
  const terrainHit = game.terrain.raycast(origin, dir, range + 0.8);
  const terrainDistance = terrainHit?.distance ?? Number.POSITIVE_INFINITY;
  const nodeHit = game.resources.raycast(origin, dir, range, terrainDistance);
  if (nodeHit) {
    return nodeAimTarget(nodeHit, dir, terrainDistance);
  }
  const assistHit = game.resources.raycastAssist(origin, dir, range, game.terrain);
  if (assistHit) {
    return nodeAimTarget(assistHit, dir, terrainDistance);
  }
  if (terrainHit) {
    return {
      node: null,
      point: new THREE.Vector3(terrainHit.x, terrainHit.y, terrainHit.z),
      normal: terrainHit.normal,
      distance: terrainHit.distance,
      terrainDistance,
      depth: terrainHit.depth,
    };
  }
  return {
    node: null,
    point: null,
    normal: null,
    distance: Number.POSITIVE_INFINITY,
    terrainDistance,
    depth: Math.max(0, -game.player.getPosition().y),
  };
}

function weaponDamage(game: Game, style: 'melee' | 'chain' | 'continuous' | 'shotgun'): {
  weapon: (typeof WEAPONS)[WeaponId];
  damage: number;
  familyId: string;
} {
  const weapon = WEAPONS[game.activeWeapon] ?? WEAPONS.pickaxe;
  return {
    weapon,
    damage:
      weapon.damage *
      damageMultiplier(game.run.loadout, style) *
      weaponDamageScale(game.run.loadout, weapon.id) *
      weaponPassiveMultiplier(game.run.loadout, weapon.id) *
      weaponProfessionMultiplier(game.run.loadout, weapon.id),
    familyId: weapon.id,
  };
}

function playImpact(
  game: Game,
  point: THREE.Vector3,
  node: ResourceNode | null,
): void {
  const pitch = PATENTS[game.run.loadout.patent ?? 0]?.soundPitch ?? 1.0;
  game.audio.playPickaxe(
    point,
    layerAtDepth(Math.max(0, -point.y)).index,
    true,
    Boolean(node && node.type !== 'chest' && node.mineral?.family === 'ore'),
    pitch,
  );
}

function fireMeleeWeapon(game: Game): void {
  const familyId = weaponFamily(game.activeWeapon).id;
  if (familyId === 'roundhouseKick') {
    fireKickArc(game);
    return;
  }
  if (familyId === 'axe') {
    fireAxeSweep(game);
    return;
  }
  if (familyId === 'boxingGlove') {
    firePunch(game);
    return;
  }
  firePickaxe(game);
}

function firePickaxe(game: Game): void {
  const { weapon, damage } = weaponDamage(game, 'melee');
  const reach = weapon.range + (game.run.loadout.doctrine === 'precision' ? 1.0 : 0);
  const target = findAimTarget(game, reach);
  sendShotFx(game, weapon.id);
  if (target.node) {
    const impactPoint = target.point ?? game.player.getPosition();
    game.loot.spawnNodeHitChips(target.node, game.terrain);
    damageNodeLocally(game, target.node, damage, target.point, target.normal);
    playImpact(game, impactPoint, target.node);
    game.player.addImpactShake(0.62);
    game.tools.playImpact(Boolean(target.node.type === 'chest'));
    game.ui.spawnFloat(impactPoint, `-${Math.round(damage)} MINERAL`, 'amber');
  } else if (target.point) {
    carveTerrainAt(
      game,
      target.point,
      weapon.carveRadius,
      weapon.carveStrength,
      1,
      true,
      'pickaxe',
    );
  } else {
    const pitch = PATENTS[game.run.loadout.patent ?? 0]?.soundPitch ?? 1.0;
    game.audio.playPickaxe(
      game.player.getPosition(),
      game.player.getLayer(),
      false,
      false,
      pitch,
    );
  }
}

function firePunch(game: Game): void {
  const { weapon, damage } = weaponDamage(game, 'melee');
  const target = findAimTarget(game, weapon.range);
  sendShotFx(game, weapon.id);
  if (target.node) {
    const point = target.point ?? game.player.getPosition();
    damageNodeLocally(game, target.node, damage, target.point, target.normal);
    playImpact(game, point, target.node);
    game.player.addImpactShake(0.45);
    game.tools.playImpact();
  } else if (target.point) {
    carveTerrainAt(game, target.point, weapon.carveRadius, weapon.carveStrength, 0.8);
  }
}

function fireAxeSweep(game: Game): void {
  const { weapon, damage } = weaponDamage(game, 'melee');
  const target = findAimTarget(game, weapon.range);
  sendShotFx(game, weapon.id);
  const center = target.node
    ? new THREE.Vector3(target.node.x, target.node.y, target.node.z)
    : target.point;
  if (center) {
    const hits = new Set<string>();
    if (target.node) {
      hits.add(target.node.id);
      damageNodeLocally(game, target.node, damage, target.point, target.normal);
    }
    for (const node of game.resources.getNearby(center, 2.0)) {
      if (hits.has(node.id) || node.broken) continue;
      hits.add(node.id);
      damageNodeLocally(game, node, damage * 0.65);
    }
    carveTerrainAt(
      game,
      target.point ?? center,
      weapon.carveRadius,
      weapon.carveStrength,
      1.1,
    );
    game.player.addImpactShake(0.7);
    game.tools.playImpact();
    game.ui.spawnFloat(center, 'BARRIDO DE HACHA', 'amber');
  }
}

function fireKickArc(game: Game): void {
  const { weapon, damage } = weaponDamage(game, 'melee');
  const origin = game.player.getPosition().clone();
  const center = origin.clone().add(new THREE.Vector3(0, 0.7, 0));
  const hits = game.resources.getNearby(center, weapon.range);
  for (const node of hits) {
    damageNodeLocally(game, node, damage * 0.8);
  }
  carveTerrainAt(game, center, weapon.carveRadius, weapon.carveStrength, 1.0, true);
  game.effects.spawnExplosion(center, 1.4, 0xff8a8a);
  game.audio.playPickaxe(center, game.player.getLayer(), true, false, 1);
  game.player.addShake(0.22);
  game.tools.playImpact();
  game.ui.spawnFloat(center, 'PATADA GIRATORIA', 'amber');
}

function fireChainWeapon(game: Game): void {
  if (weaponFamily(game.activeWeapon).id === 'orb') {
    fireOrb(game);
    return;
  }
  fireTesla(game);
}

function fireTesla(game: Game): void {
  const { weapon, damage } = weaponDamage(game, 'chain');
  const target = findAimTarget(game, weapon.range);
  const origin = game.tools.getMuzzleWorldPosition(new THREE.Vector3());
  sendShotFx(game, weapon.id);
  game.audio.playShot(origin, 'tesla');
  if (target.node && target.node.type !== 'chest') {
    const mineral = target.node.mineral;
    const clusterNodes = game.resources.getNearby(
      new THREE.Vector3(target.node.x, target.node.y, target.node.z),
      weapon.chainRange,
      target.node.clusterId,
      mineral?.id,
    );
    clusterNodes.sort((a, b) => {
      return (
        Math.hypot(a.x - target.node!.x, a.y - target.node!.y, a.z - target.node!.z) -
        Math.hypot(b.x - target.node!.x, b.y - target.node!.y, b.z - target.node!.z)
      );
    });
    const targets = clusterNodes.slice(0, Math.min(4, weapon.chainCount + 1));
    const points: number[] = [origin.x, origin.y, origin.z];
    targets.forEach((node, index) => {
      points.push(node.x, node.y, node.z);
      game.effects.spawnLightning(
        origin,
        new THREE.Vector3(node.x, node.y, node.z),
        0x92edff,
        0.36,
      );
      damageNodeLocally(game, node, damage * Math.pow(0.8, index));
    });
    if (target.point) {
      game.effects.spawnHit(target.point, 0x91ecff, 1.25);
    }
    sendFx(game, { kind: 'lightning', points });
  } else if (target.point) {
    carveTerrainAt(game, target.point, weapon.carveRadius, weapon.carveStrength, 1.2);
    game.effects.spawnLightning(origin, target.point, 0x92edff, 0.3);
    sendFx(game, {
      kind: 'lightning',
      points: [origin.x, origin.y, origin.z, target.point.x, target.point.y, target.point.z],
    });
  }
}

function fireOrb(game: Game): void {
  const { weapon, damage } = weaponDamage(game, 'chain');
  const target = findAimTarget(game, weapon.range);
  const origin = game.tools.getMuzzleWorldPosition(new THREE.Vector3());
  const orbRadius = passiveMultiplier(
    'orbRadius',
    game.run.loadout.passives.orbRadius ?? 0,
  );
  const chainRange = weapon.chainRange * orbRadius;
  const chainCount = weapon.chainCount + Math.floor((orbRadius - 1) * 2);
  sendShotFx(game, weapon.id);
  game.audio.playShot(origin, 'tesla');
  if (target.node) {
    const center = new THREE.Vector3(target.node.x, target.node.y, target.node.z);
    const nodes = game.resources
      .getNearby(center, chainRange)
      .sort(
        (a, b) =>
          Math.hypot(a.x - center.x, a.y - center.y, a.z - center.z) -
          Math.hypot(b.x - center.x, b.y - center.y, b.z - center.z),
      )
      .slice(0, Math.max(1, chainCount));
    const points: number[] = [origin.x, origin.y, origin.z];
    nodes.forEach((node, index) => {
      points.push(node.x, node.y, node.z);
      game.effects.spawnLightning(
        origin,
        new THREE.Vector3(node.x, node.y, node.z),
        0xd8a8ff,
        0.4,
      );
      damageNodeLocally(game, node, damage * Math.pow(0.82, index));
    });
    sendFx(game, { kind: 'lightning', points });
  } else if (target.point) {
    carveTerrainAt(game, target.point, weapon.carveRadius, weapon.carveStrength, 1.0);
    game.effects.spawnHit(target.point, 0xd8a8ff, 1.2);
  }
}

function fireContinuousWeapon(game: Game): void {
  const familyId = weaponFamily(game.activeWeapon).id;
  if (familyId === 'flamethrower') {
    fireCone(game, 'flame');
    return;
  }
  if (familyId === 'poisonGun') {
    fireCone(game, 'poison');
    return;
  }
  if (familyId === 'waterGun') {
    fireWaterGun(game);
    return;
  }
  fireDrill(game);
}

function fireDrill(game: Game): void {
  const { weapon, damage } = weaponDamage(game, 'continuous');
  const target = findAimTarget(game, weapon.range);
  const origin = game.tools.getMuzzleWorldPosition(new THREE.Vector3());
  const end = target.point ?? origin.clone().add(game.player.getAimDirection().multiplyScalar(3));
  game.effects.setDrillBeam(origin, end, true);
  if (target.node) {
    damageNodeLocally(game, target.node, damage);
  }
  if (target.point) {
    carveTerrainAt(game, target.point, weapon.carveRadius, weapon.carveStrength, 1.35, false);
  }
  game.drillFxAccumulator += weapon.cooldown;
  if (game.drillFxAccumulator > 0.22) {
    game.drillFxAccumulator = 0;
    sendShotFx(game, 'drill');
  }
  game.audio.playShot(origin, 'drill');
}

function fireCone(game: Game, kind: 'flame' | 'poison'): void {
  const { weapon, damage } = weaponDamage(game, 'continuous');
  const origin = game.player.getEyePosition();
  const direction = game.player.getAimDirection();
  const color = kind === 'flame' ? 0xff8a4a : 0x8aff6a;
  const target = findAimTarget(game, weapon.range);
  const nodes = game.resources.getNearby(origin, weapon.range);
  let hitAny = false;
  for (const node of nodes) {
    const toNode = new THREE.Vector3(node.x, node.y, node.z).sub(origin);
    const distance = toNode.length();
    if (distance <= 0.01 || distance > weapon.range) continue;
    const facing = toNode.normalize().dot(direction);
    if (facing < 0.55) continue;
    hitAny = true;
    const falloff = 1 - (distance / weapon.range) * 0.35;
    if (kind === 'poison') {
      damageNodeLocally(game, node, damage * 0.45 * falloff);
      applyPoison(game, node, damage * 0.6, 4);
    } else {
      damageNodeLocally(game, node, damage * 0.75 * falloff);
    }
  }
  if (target.point) {
    carveTerrainAt(game, target.point, weapon.carveRadius, weapon.carveStrength, 0.9, false);
  }
  const plume = target.point ?? origin.clone().addScaledVector(direction, weapon.range * 0.6);
  game.effects.spawnMuzzle(plume, color, kind === 'flame' ? 8 : 5);
  game.effects.spawnHit(plume, color, 0.8);
  game.audio.playShot(origin, 'drill');
  game.drillFxAccumulator += weapon.cooldown;
  if (game.drillFxAccumulator > 0.2) {
    game.drillFxAccumulator = 0;
    sendShotFx(game, weapon.id);
  }
  if (hitAny) {
    game.ui.spawnFloat(plume, kind === 'flame' ? 'LANZALLAMAS' : 'VENENO', kind === 'flame' ? 'amber' : 'positive');
  }
}

function fireWaterGun(game: Game): void {
  const { weapon, damage } = weaponDamage(game, 'continuous');
  const target = findAimTarget(game, weapon.range);
  const tier = Math.max(1, Math.min(4, weaponTier(game.run.loadout, weapon.id)));
  const radius = [2, 4, 7, 10][tier - 1] ?? 2;
  const center = target.node
    ? new THREE.Vector3(target.node.x, target.node.y, target.node.z)
    : target.point ?? game.player.getEyePosition().clone().addScaledVector(
      game.player.getAimDirection(),
      weapon.range * 0.6,
    );
  if (target.node) {
    damageNodeLocally(game, target.node, damage * 0.3);
  }
  applyWetArea(game, center, radius, 6);
  if (target.point) {
    carveTerrainAt(game, target.point, weapon.carveRadius, weapon.carveStrength, 0.75, false);
  }
  game.audio.playShot(center, 'drill');
  game.drillFxAccumulator += weapon.cooldown;
  if (game.drillFxAccumulator > 0.2) {
    game.drillFxAccumulator = 0;
    sendShotFx(game, weapon.id);
  }
  game.ui.spawnFloat(center, `MOJADO · RADIO ${radius.toFixed(0)} m`, 'cyan');
}

const RECOIL_SHAKE: Record<string, number> = {
  pistol: 0.12,
  rifle: 0.06,
  minigun: 0.05,
  shotgun: 0.26,
};

const RECOIL_IMPULSE: Record<string, number> = {
  pistol: 0.1,
  rifle: 0.035,
  minigun: 0.02,
  shotgun: 0.32,
};

function fireHitscanWeapon(game: Game): void {
  const { weapon, damage } = weaponDamage(game, 'shotgun');
  const origin = game.player.getEyePosition();
  const baseDirection = game.player.getAimDirection();
  const right = new THREE.Vector3().crossVectors(baseDirection, new THREE.Vector3(0, 1, 0));
  if (right.lengthSq() < 0.001) {
    right.set(1, 0, 0);
  } else {
    right.normalize();
  }
  const up = new THREE.Vector3().crossVectors(right, baseDirection).normalize();
  const hitNodes = new Set<string>();
  for (let pellet = 0; pellet < weapon.pellets; pellet += 1) {
    const angle = Math.random() * Math.PI * 2;
    const spread = Math.random() * weapon.spread;
    const direction = baseDirection
      .clone()
      .addScaledVector(right, Math.cos(angle) * spread)
      .addScaledVector(up, Math.sin(angle) * spread)
      .normalize();
    const target = findAimTarget(game, weapon.range, direction);
    if (target.node && !hitNodes.has(target.node.id)) {
      hitNodes.add(target.node.id);
      damageNodeLocally(game, target.node, damage);
    } else if (target.point) {
      carveTerrainAt(
        game,
        target.point,
        weapon.carveRadius,
        weapon.carveStrength,
        0.85,
        false,
      );
    }
  }
  sendShotFx(game, weapon.id);
  game.audio.playShot(origin, 'shotgun');
  game.player.addShake(RECOIL_SHAKE[weapon.id] ?? 0.1);
  const recoilPassive = passiveMultiplier(
    'gunRecoil',
    game.run.loadout.passives.gunRecoil ?? 0,
  );
  const recoilImpulse = (RECOIL_IMPULSE[weapon.id] ?? 0) * recoilPassive;
  if (recoilImpulse > 0) {
    game.player.addImpulse(
      new THREE.Vector3(
        -baseDirection.x * recoilImpulse,
        game.player.isGrounded() ? 0 : recoilImpulse * 0.35,
        -baseDirection.z * recoilImpulse,
      ),
    );
  }
  const shotgunJump =
    weapon.id === 'shotgun' && !game.player.isGrounded() && baseDirection.y < -0.24;
  if (shotgunJump) {
    const impulse = new THREE.Vector3(
      -baseDirection.x * 2.1,
      5.4 + Math.abs(baseDirection.y) * 7.2,
      -baseDirection.z * 2.1,
    );
    game.player.addImpulse(impulse);
    game.ui.spawnFloat(game.player.getPosition(), 'SHOTGUN JUMP', 'cyan');
    game.effects.spawnMuzzle(
      game.player.getPosition().clone().add(new THREE.Vector3(0, 0.6, 0)),
      0xffba74,
      9,
    );
  }
}

/** Entrada usada por la HUD para saber si un arma es de disparo continuo. */
export function isContinuousWeapon(weaponId: WeaponId): boolean {
  return WEAPONS[weaponId]?.style === 'continuous';
}
