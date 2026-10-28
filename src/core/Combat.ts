import * as THREE from 'three';
import {
  GRENADE_AREA_RADIUS,
  GRENADE_BLAST_RADIUS,
  GRENADE_FUSE,
  GRENADE_TIERS,
  PIT_HALF,
  WEAPONS,
  carveRadiusMultiplier,
  cooldownMultiplier,
  damageMultiplier,
  layerAtDepth,
  weaponDamageScale,
  weaponPassiveMultiplier,
  weaponProfessionMultiplier,
  professionCarveMultiplier,
  professionGrenadeDamageMultiplier,
} from '../config';
import {
  PATENTS,
  computeEffectiveRadius,
  computeTotalCarveMultiplier,
} from './Progression';
import { passiveMultiplier } from '../config';
import {
  PROTOCOL_VERSION,
  type FxWire,
} from '../network/Protocol';
import type { CarveEvent, GrenadeTierId, WeaponId } from '../types';
import type { NodeRayHit, ResourceNode } from '../world/Resources';
import { CARVE_HISTORY_LIMIT } from './GameConstants';
import type { AimTarget } from './GameTypes';
import { hashString } from './Rng';
import { cloneLoadout, roundCoordinate } from './RunState';
import { PICKAXE_IMPACT_FRACTION } from '../player/PickaxeModel';
import type { Game } from './Game';
export function breakNodeAsHost(game: Game, node: ResourceNode, by: string): void {
  if (node.broken) {
    return;
  }
  const dropSeed = getDropSeed(game, node);
  game.resources.markBroken(node.id);
  spawnBreakEffect(game, node);
  game.loot.spawnFromNode(node, game.terrain, dropSeed);
  game.run.stats.nodesBroken += 1;
  if (node.type === 'chest') {
    grantChestReward(game, node, by);
  }
  game.network?.broadcast({
    t: 'node_break',
    v: PROTOCOL_VERSION,
    id: node.id,
    dropSeed,
    by,
  });
}

export function breakNodeAsClient(game: Game, node: ResourceNode, dropSeed: number): void {
  if (node.broken) {
    return;
  }
  game.resources.markBroken(node.id);
  spawnBreakEffect(game, node);
  game.loot.spawnFromNode(node, game.terrain, dropSeed);
  game.run.stats.nodesBroken += 1;
  if (node.type === 'chest') {
    const reward = game.resources.getChestReward(node);
    game.ui.notify(`Cofre fracturado · ${reward.title}. El anfitrión valida la mejora.`, 'positive');
  }
}

export function breakNodeLocally(game: Game, node: ResourceNode): void {
  if (node.broken) {
    return;
  }
  const dropSeed = getDropSeed(game, node);
  game.resources.markBroken(node.id);
  spawnBreakEffect(game, node);
  game.loot.spawnFromNode(node, game.terrain, dropSeed);
  game.run.stats.nodesBroken += 1;
  if (node.type === 'chest') {
    if (game.isAuthority()) {
      grantChestReward(game, node, game.selfPeerId || 'solo');
    } else {
      const reward = game.resources.getChestReward(node);
      game.ui.notify(`Cofre fracturado · ${reward.title}. Pendiente de validación.`, 'positive');
    }
  }
  if (game.online && game.network) {
    if (game.role === 'client') {
      game.network.sendToHost({
        t: 'node_break',
        v: PROTOCOL_VERSION,
        id: node.id,
        dropSeed,
      });
    } else if (game.role === 'host') {
      game.network.broadcast({
        t: 'node_break',
        v: PROTOCOL_VERSION,
        id: node.id,
        dropSeed,
        by: game.selfPeerId,
      });
    }
  }
}

export function grantChestReward(game: Game, node: ResourceNode, by: string): void {
  if (!game.rewardedChests.add(node.id)) {
    return;
  }
  game.run.stats.chestsOpened += 1;
  const reward = game.resources.getChestReward(node);
  game.audio.playChest(
    node ? new THREE.Vector3(node.x, node.y, node.z) : game.player.getPosition(),
  );

  if (reward.kind === 'passive' && reward.passive) {
    const points = reward.points ?? 1;
    game.run.loadout.passives[reward.passive] =
      (game.run.loadout.passives[reward.passive] ?? 0) + points;
    game.player.setLoadout(game.run.loadout);
    game.ui.notify(`${reward.title}: ${reward.description}`, 'positive');
    if (game.online && game.role === 'host' && game.network) {
      game.network.broadcast({
        t: 'passive',
        v: PROTOCOL_VERSION,
        passive: reward.passive,
        title: reward.title,
        loadout: cloneLoadout(game.run.loadout),
        by,
      });
    }
    return;
  }

  const money = Math.max(0, Math.floor(reward.money ?? 0));
  if (money > 0) {
    game.run.money += money;
    game.run.stats.moneyEarned += money;
    game.recordDayDeposit(
      reward.mineral
        ? [{ mineral: reward.mineral, count: 1, carbon: 0, money }]
        : [],
      money,
    );
  }
  game.ui.notify(`${reward.title}: ${reward.description}`, 'positive');
  if (game.online && game.role === 'host' && game.network) {
    game.broadcastEconomy();
  }
}

export function getDropSeed(game: Game, node: ResourceNode): number {
  return hashString(`${game.seed}:${node.id}:drop`) >>> 0;
}

export function spawnBreakEffect(game: Game, node: ResourceNode): void {
  const position = new THREE.Vector3(node.x, node.y, node.z);
  const color = node.type === 'chest' ? 0xffc45f : node.mineral?.glow ?? 0xffe0a0;
  game.effects.spawnNodeBreak(position, color, node.type === 'chest' ? 2.2 : 1.35);
  const patentPitch = PATENTS[game.run.loadout.patent ?? 0]?.soundPitch ?? 1.0;
  game.audio.playNodeBreak(position, node.mineral?.family === 'ore', patentPitch);
}

export function spawnNodeHitEffect(
  game: Game,
  node: ResourceNode,
  point?: THREE.Vector3 | null,
  normal?: THREE.Vector3 | null,
): void {
  const color = node.type === 'chest' ? 0xffc45f : node.mineral?.glow ?? 0xffc891;
  const position = point ?? new THREE.Vector3(node.x, node.y, node.z);
  if (normal) {
    game.effects.spawnImpact(
      position,
      color,
      node.type === 'chest' ? 1.1 : 0.72,
      normal,
      { metalSparks: isHardOreNode(node) },
    );
    return;
  }
  game.effects.spawnHit(
    position,
    color,
    node.type === 'chest' ? 1.4 : 0.8,
  );
}

function isHardOreNode(node: ResourceNode): boolean {
  const mineral = node.mineral;
  return Boolean(
    mineral &&
      mineral.family === 'ore' &&
      (mineral.metalness >= 0.5 || mineral.hp >= 100),
  );
}

export function damageNodeLocally(
  game: Game,
  node: ResourceNode,
  damage: number,
  impactPoint?: THREE.Vector3 | null,
  impactNormal?: THREE.Vector3 | null,
): void {
  if (node.broken) {
    return;
  }
  const effectiveDamage = damage;
  const result = game.resources.damage(node.id, effectiveDamage);
  if (!result) {
    return;
  }
  spawnNodeHitEffect(game, result.node, impactPoint, impactNormal);
  if (game.online && game.network) {
    if (game.role === 'client') {
      game.network.sendToHost({
        t: 'node_hit',
        v: PROTOCOL_VERSION,
        id: node.id,
        dmg: roundCoordinate(effectiveDamage, 1),
      });
    } else if (game.role === 'host') {
      game.network.broadcast({
        t: 'node_hit',
        v: PROTOCOL_VERSION,
        id: node.id,
        dmg: roundCoordinate(effectiveDamage, 1),
        by: game.selfPeerId,
      });
    }
  }
  if (result.broke) {
    const layerIdx = layerAtDepth(Math.max(0, -result.node.y)).biomeIndex;
    if ((game.run.loadout.maxLayerReached ?? 1) < layerIdx) {
      game.run.loadout.maxLayerReached = layerIdx;
    }
    breakNodeLocally(game, result.node);
  }
}

export function staffAttackNode(game: Game, node: ResourceNode, damage: number): void {
  const result = game.resources.damage(node.id, damage);
  if (!result) {
    return;
  }
  spawnNodeHitEffect(game, result.node);
  if (game.network && game.role === 'host') {
    game.network.broadcast({
      t: 'node_hit',
      v: PROTOCOL_VERSION,
      id: node.id,
      dmg: roundCoordinate(damage, 1),
      by: 'staff',
    });
  }
  if (result.broke) {
    breakNodeAsHost(game, result.node, 'staff');
  }
}

export function carveFromStaff(game: Game, event: CarveEvent): void {
  if (!game.isAuthority()) {
    return;
  }
  const changed = game.terrain.carve(event);
  if (!changed) {
    return;
  }
  recordCarve(game, event);
  game.effects.spawnHit(
    new THREE.Vector3(event.x, event.y, event.z),
    0xbfa88b,
    0.35,
  );
  if (game.network && game.role === 'host') {
    game.network.broadcast({
      t: 'carve',
      v: PROTOCOL_VERSION,
      e: event,
      by: 'staff',
    });
  }
}

export function recordCarve(game: Game, event: CarveEvent): void {
  if (!game.isAuthority()) {
    return;
  }
  game.carveHistory.push({ ...event });
  if (game.carveHistory.length > CARVE_HISTORY_LIMIT) {
    game.carveHistory.splice(0, game.carveHistory.length - CARVE_HISTORY_LIMIT);
  }
}

export function applyLocalCarve(game: Game, event: CarveEvent): void {
  const changed = game.terrain.carve(event);
  if (!changed) {
    return;
  }
  if (game.isAuthority()) {
    recordCarve(game, event);
    if (game.network && game.role === 'host') {
      game.network.broadcast({
        t: 'carve',
        v: PROTOCOL_VERSION,
        e: event,
        by: game.selfPeerId,
      });
    }
  } else if (game.network) {
    game.network.sendToHost({
      t: 'carve',
      v: PROTOCOL_VERSION,
      e: event,
    });
  }
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
  const cooldown = weapon.cooldown * cooldownMultiplier(game.run.loadout);
  game.cooldowns[weaponId] = cooldown;
  game.tools.playFire(weaponId, weapon.style === 'melee' ? cooldown : undefined);
  switch (weapon.style) {
    case 'melee':
      game.pendingPickaxeStrike = cooldown * PICKAXE_IMPACT_FRACTION;
      break;
    case 'chain':
      fireTesla(game);
      break;
    case 'continuous':
      fireDrill(game);
      break;
    case 'shotgun':
      fireShotgun(game);
      break;
  }
}

export function updatePendingPickaxeStrike(game: Game, dt: number): void {
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
    firePickaxe(game);
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

export function carveTerrainAt(
  game: Game,
  point: THREE.Vector3,
  radiusBase: number,
  strengthBase: number,
  power = 1,
  feedback = true,
  impactStyle: 'pickaxe' | 'generic' = 'generic',
): boolean {
  const depth = Math.max(0, -point.y);
  const layer = layerAtDepth(depth);
  const resistance = layer.hardness;
  const factor = THREE.MathUtils.clamp((power * 1.35) / resistance, 0.36, 1.55);
  const toolKind: 'pickaxe' | 'drill' | 'shotgun' = impactStyle === 'pickaxe' ? 'pickaxe' : 'drill';
  const radiusBonus = Math.max(0, carveRadiusMultiplier(game.run.loadout) - 1);
  const { effectiveRadius, extraFracture } = computeEffectiveRadius(toolKind, radiusBase, radiusBonus);
  const patentCarve = computeTotalCarveMultiplier(game.run.loadout);
  const professionCarve = professionCarveMultiplier(game.run.loadout.profession);
  const radius = effectiveRadius * (0.55 + factor * 0.45) * professionCarve;
  const strength = strengthBase * (0.55 + factor * 0.45) * patentCarve * professionCarve;
  const event: CarveEvent = {
    x: roundCoordinate(point.x, 3),
    y: roundCoordinate(point.y, 3),
    z: roundCoordinate(point.z, 3),
    r: roundCoordinate(radius, 2),
    s: roundCoordinate(strength, 2),
  };
  applyLocalCarve(game, event);
  if (extraFracture > 1.0) {
    const nearby = game.resources.getNearby(point, radius * 1.5);
    for (const node of nearby) {
      damageNodeLocally(game, node, 12 * (extraFracture - 1.0));
    }
  }
  const layerColor = layer.rock;
  if (impactStyle === 'pickaxe') {
    const normal = game.terrain.getNormal(point.x, point.y, point.z);
    game.effects.spawnImpact(point, layerColor, 0.55 + factor * 0.35, normal);
    game.player.addImpactShake(0.55);
    game.tools.playImpact(false);
  } else {
    game.effects.spawnHit(point, layerColor, 0.7 + factor * 0.4);
  }
  const patentPitch = PATENTS[game.run.loadout.patent ?? 0]?.soundPitch ?? 1.0;
  game.audio.playPickaxe(point, layer.index, false, false, patentPitch);
  if (feedback) {
    game.ui.spawnFloat(
      point,
      layer.biomeIndex > 1 ? `ROCA ×${layer.hardness.toFixed(1)}` : 'EXCAVANDO',
      layer.biomeIndex > 2 ? 'amber' : 'positive',
    );
  }
  return true;
}

function firePickaxe(game: Game): void {
  const weapon = WEAPONS[game.activeWeapon] ?? WEAPONS.pickaxe;
  const reach = weapon.range + (game.run.loadout.doctrine === 'precision' ? 1.0 : 0);
  const target = findAimTarget(game, reach);
  const damage =
    weapon.damage *
    damageMultiplier(game.run.loadout, 'melee') *
    weaponDamageScale(game.run.loadout, weapon.id) *
    weaponPassiveMultiplier(game.run.loadout, weapon.id) *
    weaponProfessionMultiplier(game.run.loadout, weapon.id);
  const patentPitch = PATENTS[game.run.loadout.patent ?? 0]?.soundPitch ?? 1.0;
  sendShotFx(game, weapon.id);
  if (target.node) {
    const metallic = isHardOreNode(target.node);
    const impactPoint = target.point ?? game.player.getPosition();
    game.loot.spawnNodeHitChips(target.node, game.terrain);
    damageNodeLocally(game, target.node, damage, target.point, target.normal);
    game.audio.playPickaxe(
      impactPoint,
      layerAtDepth(target.depth).index,
      true,
      metallic,
      patentPitch,
    );
    game.player.addImpactShake(metallic ? 0.78 : 0.62);
    game.tools.playImpact(metallic || target.node.type === 'chest');
    game.ui.spawnFloat(
      impactPoint,
      `-${Math.round(damage)} MINERAL`,
      'amber',
    );
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
    game.audio.playPickaxe(
      game.player.getPosition(),
      game.player.getLayer(),
      false,
      false,
      patentPitch,
    );
  }
}

function fireTesla(game: Game): void {
  const weapon = WEAPONS[game.activeWeapon] ?? WEAPONS.tesla;
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
    const targets = clusterNodes.slice(0, weapon.chainCount + 1);
    const points: number[] = [origin.x, origin.y, origin.z];
    const damage = weapon.damage * damageMultiplier(game.run.loadout, 'chain') * weaponDamageScale(game.run.loadout, weapon.id) * weaponPassiveMultiplier(game.run.loadout, weapon.id) * weaponProfessionMultiplier(game.run.loadout, weapon.id);
    for (const node of targets) {
      points.push(node.x, node.y, node.z);
      game.effects.spawnLightning(
        origin,
        new THREE.Vector3(node.x, node.y, node.z),
        0x92edff,
        0.36,
      );
      damageNodeLocally(game, node, damage);
    }
    if (target.point) {
      game.effects.spawnHit(target.point, 0x91ecff, 1.25);
    }
    sendFx(game, {
      kind: 'lightning',
      points,
    });
  } else if (target.point) {
    carveTerrainAt(game, target.point, weapon.carveRadius, weapon.carveStrength, 1.2);
    game.effects.spawnLightning(origin, target.point, 0x92edff, 0.3);
    sendFx(game, {
      kind: 'lightning',
      points: [origin.x, origin.y, origin.z, target.point.x, target.point.y, target.point.z],
    });
  }
}

function fireDrill(game: Game): void {
  const weapon = WEAPONS[game.activeWeapon] ?? WEAPONS.drill;
  const target = findAimTarget(game, weapon.range);
  const origin = game.tools.getMuzzleWorldPosition(new THREE.Vector3());
  const end = target.point ?? origin.clone().add(game.player.getAimDirection().multiplyScalar(3));
  game.effects.setDrillBeam(origin, end, true);
  if (target.node) {
    const damage =
      weapon.damage *
      damageMultiplier(game.run.loadout, 'continuous') *
      weaponDamageScale(game.run.loadout, weapon.id) *
      weaponPassiveMultiplier(game.run.loadout, weapon.id) *
      weaponProfessionMultiplier(game.run.loadout, weapon.id);
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

function fireShotgun(game: Game): void {
  const weapon = WEAPONS[game.activeWeapon] ?? WEAPONS.shotgun;
  const origin = game.player.getEyePosition();
  const baseDirection = game.player.getAimDirection();
  const right = new THREE.Vector3().crossVectors(baseDirection, new THREE.Vector3(0, 1, 0));
  if (right.lengthSq() < 0.001) {
    right.set(1, 0, 0);
  } else {
    right.normalize();
  }
  const up = new THREE.Vector3().crossVectors(right, baseDirection).normalize();
  const damage =
    weapon.damage *
    damageMultiplier(game.run.loadout, 'shotgun') *
    weaponDamageScale(game.run.loadout, weapon.id) *
    weaponPassiveMultiplier(game.run.loadout, weapon.id) *
    weaponProfessionMultiplier(game.run.loadout, weapon.id);
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
  sendShotFx(game, 'shotgun');
  game.audio.playShot(origin, 'shotgun');
  game.player.addShake(0.26);
  if (!game.player.isGrounded() && baseDirection.y < -0.24) {
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

export function throwGrenade(game: Game, tier: GrenadeTierId): boolean {
  const definition = GRENADE_TIERS[tier];
  if (!definition) {
    return false;
  }
  const origin = game.player.getEyePosition().clone();
  const direction = game.player.getAimDirection();
  origin.addScaledVector(direction, 0.7);
  const mesh = new THREE.Mesh(game.grenadeGeometry, game.grenadeMaterial);
  mesh.position.copy(origin);
  game.scene.add(mesh);
  game.projectiles.push({
    mesh,
    position: origin.clone(),
    velocity: direction
      .clone()
      .multiplyScalar(18)
      .add(game.player.getVelocity().clone().multiplyScalar(0.35)),
    fuse: GRENADE_FUSE,
    bounces: 0,
    tier,
  });
  game.audio.playShot(origin, 'grenade');
  game.player.addShake(0.12);
  return true;
}

export function updateProjectiles(game: Game, dt: number): void {
  for (let index = game.projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = game.projectiles[index];
    projectile.fuse -= dt;
    projectile.velocity.y -= 19 * dt;
    const candidate = projectile.position
      .clone()
      .addScaledVector(projectile.velocity, dt);
    let detonate = false;
    if (game.terrain.isSolid(candidate.x, candidate.y, candidate.z)) {
      const normal = game.terrain.getNormal(candidate.x, candidate.y, candidate.z);
      const dot =
        projectile.velocity.x * normal.x +
        projectile.velocity.y * normal.y +
        projectile.velocity.z * normal.z;
      projectile.velocity.addScaledVector(normal, -1.35 * dot).multiplyScalar(0.45);
      projectile.position.addScaledVector(normal, 0.22);
      projectile.bounces += 1;
      game.effects.spawnHit(candidate.clone(), 0xffad5e, 0.35);
      if (projectile.bounces >= 3 && projectile.velocity.length() < 2.2) {
        detonate = true;
      }
    } else {
      projectile.position.copy(candidate);
    }
    if (
      projectile.position.x < -PIT_HALF + 0.4 ||
      projectile.position.x > PIT_HALF - 0.4 ||
      projectile.position.z < -PIT_HALF + 0.4 ||
      projectile.position.z > PIT_HALF - 0.4
    ) {
      projectile.position.x = THREE.MathUtils.clamp(
        projectile.position.x,
        -PIT_HALF + 0.5,
        PIT_HALF - 0.5,
      );
      projectile.position.z = THREE.MathUtils.clamp(
        projectile.position.z,
        -PIT_HALF + 0.5,
        PIT_HALF - 0.5,
      );
      projectile.velocity.x *= -0.3;
      projectile.velocity.z *= -0.3;
    }
    projectile.mesh.position.copy(projectile.position);
    if (projectile.fuse <= 0 || detonate) {
      explodeGrenade(game, projectile.position.clone(), projectile.tier);
      game.scene.remove(projectile.mesh);
      game.projectiles.splice(index, 1);
    }
  }
}

function explodeGrenade(
  game: Game,
  position: THREE.Vector3,
  tier: GrenadeTierId,
): void {
  const definition = GRENADE_TIERS[tier];
  const radiusBonus = Math.max(0, carveRadiusMultiplier(game.run.loadout) - 1);
  const { effectiveRadius, extraFracture } = computeEffectiveRadius('grenade', GRENADE_AREA_RADIUS, radiusBonus);
  game.effects.spawnExplosion(position, effectiveRadius, definition.color);
  game.audio.playExplosion(position, effectiveRadius);
  const distance = game.player.getPosition().distanceTo(position);
  game.player.addShake(THREE.MathUtils.clamp(1.2 - distance / 18, 0.2, 1.1));
  const layer = layerAtDepth(Math.max(0, -position.y));
  const canBreak = layer.biomeIndex <= definition.maxLayer;
  if (canBreak) {
    const patentCarve = computeTotalCarveMultiplier(game.run.loadout);
    const professionCarve = professionCarveMultiplier(game.run.loadout.profession);
    applyLocalCarve(game, {
      x: roundCoordinate(position.x, 3),
      y: roundCoordinate(position.y, 3),
      z: roundCoordinate(position.z, 3),
      r: roundCoordinate(effectiveRadius * professionCarve, 2),
      s: roundCoordinate(definition.carveStrength * patentCarve * professionCarve, 2),
      shape: definition.shape,
      length: definition.length,
      dirX: 0,
      dirY: -1,
      dirZ: 0,
    });
    const nodes = game.resources.getNearby(position, GRENADE_BLAST_RADIUS);
    for (const node of nodes) {
      if (layerAtDepth(Math.max(0, -node.y)).biomeIndex > definition.maxLayer) {
        continue;
      }
      damageNodeLocally(
        game,
        node,
        definition.damage *
          damageMultiplier(game.run.loadout, 'grenade') *
          extraFracture *
          passiveMultiplier('bombDamage', game.run.loadout.passives.bombDamage ?? 0) *
          professionGrenadeDamageMultiplier(game.run.loadout.profession),
      );
    }
  } else {
    game.ui.spawnFloat(
      position,
      `POTENCIA INSUFICIENTE · BIOMA ${layer.biomeIndex} · NECESITA BIOMA ${definition.maxLayer}+`,
      'amber',
    );
  }
  sendFx(game, {
    kind: 'explosion',
    x: position.x,
    y: position.y,
    z: position.z,
    radius: GRENADE_AREA_RADIUS,
  });
}

export function clearProjectiles(game: Game): void {
  for (const projectile of game.projectiles) {
    game.scene.remove(projectile.mesh);
  }
  game.projectiles.length = 0;
}

function weaponSound(weaponId: WeaponId): 'pickaxe' | 'tesla' | 'drill' | 'shotgun' {
  const style = WEAPONS[weaponId]?.style;
  if (style === 'melee') return 'pickaxe';
  if (style === 'chain') return 'tesla';
  if (style === 'continuous') return 'drill';
  return 'shotgun';
}

export function sendShotFx(game: Game, weapon: WeaponId): void {
  const origin = game.tools.getMuzzleWorldPosition(new THREE.Vector3());
  const direction = game.player.getAimDirection();
  sendFx(game, {
    kind: 'shot',
    weapon: weaponSound(weapon),
    x: origin.x,
    y: origin.y,
    z: origin.z,
    dx: direction.x,
    dy: direction.y,
    dz: direction.z,
  });
}

export function sendFx(game: Game, fx: FxWire): void {
  if (!game.online || !game.network) {
    return;
  }
  if (game.role === 'client') {
    game.network.sendToHost({
      t: 'fx',
      v: PROTOCOL_VERSION,
      fx,
    });
  } else if (game.role === 'host') {
    game.network.broadcast({
      t: 'fx',
      v: PROTOCOL_VERSION,
      fx,
      by: game.selfPeerId,
    });
  }
}

export function showRemoteFx(game: Game, fx: FxWire): void {
  switch (fx.kind) {
    case 'shot': {
      const position = new THREE.Vector3(fx.x, fx.y, fx.z);
      game.audio.playShot(position, fx.weapon);
      if (fx.weapon === 'shotgun' || fx.weapon === 'tesla') {
        game.effects.spawnMuzzle(position, 0xffc27a, fx.weapon === 'shotgun' ? 7 : 4);
      }
      break;
    }
    case 'lightning': {
      if (fx.points.length >= 6) {
        const start = new THREE.Vector3(fx.points[0], fx.points[1], fx.points[2]);
        for (let index = 3; index + 2 < fx.points.length; index += 3) {
          const end = new THREE.Vector3(fx.points[index], fx.points[index + 1], fx.points[index + 2]);
          game.effects.spawnLightning(start, end, 0x90ecff, 0.34);
        }
        game.audio.playShot(start, 'tesla');
      }
      break;
    }
    case 'explosion': {
      const position = new THREE.Vector3(fx.x, fx.y, fx.z);
      game.effects.spawnExplosion(position, fx.radius, 0xff8740);
      game.audio.playExplosion(position, fx.radius);
      const distance = game.player.getPosition().distanceTo(position);
      if (distance < 15) {
        game.player.addShake(THREE.MathUtils.clamp(0.7 - distance / 35, 0.08, 0.5));
      }
      break;
    }
    case 'hit': {
      const position = new THREE.Vector3(fx.x, fx.y, fx.z);
      game.effects.spawnHit(position, fx.color, fx.strong ? 1.2 : 0.55);
      break;
    }
  }
}
