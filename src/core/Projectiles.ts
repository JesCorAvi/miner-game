import * as THREE from 'three';
import {
  GRENADE_AREA_RADIUS,
  GRENADE_BLAST_RADIUS,
  GRENADE_FUSE,
  GRENADE_TIERS,
  PIT_HALF,
  WEAPONS,
  carveRadiusMultiplier,
  damageMultiplier,
  layerAtDepth,
  passiveMultiplier,
  professionCarveMultiplier,
  professionGrenadeDamageMultiplier,
  weaponDamageScale,
  weaponFamily,
  weaponPassiveMultiplier,
  weaponProfessionMultiplier,
  weaponTier,
} from '../config';
import {
  computeEffectiveRadius,
  computeTotalCarveMultiplier,
} from './Progression';
import type { Game } from './Game';
import type { GrenadeProjectile } from './GameTypes';
import type { GrenadeTierId } from '../types';
import { roundCoordinate } from './RunState';
import { sendFx } from './Combat';
import { applyLocalCarve, carveTerrainAt, damageNodeLocally } from './Combat';
import { applyPoisonArea, applyWetArea } from './WeaponStatus';

const PROJECTILE_GEOMETRY = new THREE.SphereGeometry(0.16, 6, 4);

function projectilePhysics(model: string): { speed: number; gravity: number; fuse: number } {
  switch (model) {
    case 'mortar':
      return { speed: 26, gravity: 16, fuse: 4 };
    case 'tank':
      return { speed: 34, gravity: 14, fuse: 4 };
    case 'staff':
      return { speed: 28, gravity: 0, fuse: 3 };
    case 'jet':
      return { speed: 30, gravity: 4, fuse: 3 };
    default:
      return { speed: 24, gravity: 8, fuse: 3 };
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
    kind: 'grenade',
  });
  game.audio.playShot(origin, 'grenade');
  game.player.addShake(0.12);
  return true;
}

function projectileCount(game: Game, weaponId: string): number {
  if (weaponId === 'magicStaff') {
    const tier = Math.max(1, weaponTier(game.run.loadout, weaponId));
    return Math.min(30, 2 + (tier - 1) * 2);
  }
  if (weaponId === 'jet' && !game.player.isGrounded()) {
    return 3;
  }
  return 1;
}

export function fireProjectileWeapon(game: Game): void {
  const weapon = WEAPONS[game.activeWeapon];
  if (!weapon) return;
  const family = weaponFamily(weapon.id);
  const physics = projectilePhysics(family.model);
  const origin = game.tools.getMuzzleWorldPosition(new THREE.Vector3());
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
    damageMultiplier(game.run.loadout, weapon.style) *
    weaponDamageScale(game.run.loadout, weapon.id) *
    weaponPassiveMultiplier(game.run.loadout, weapon.id) *
    weaponProfessionMultiplier(game.run.loadout, weapon.id);
  const count = projectileCount(game, weapon.id);
  for (let index = 0; index < count; index += 1) {
    const centered = count > 1 ? (index / (count - 1) - 0.5) * 2 : 0;
    const jitter = count > 1 ? (Math.random() - 0.5) * 0.06 : 0;
    const direction = baseDirection
      .clone()
      .addScaledVector(right, centered * 0.075 + jitter)
      .addScaledVector(up, (Math.random() - 0.5) * 0.04)
      .normalize();
    const material = new THREE.MeshBasicMaterial({ color: family.color });
    const mesh = new THREE.Mesh(PROJECTILE_GEOMETRY, material);
    mesh.position.copy(origin);
    mesh.scale.setScalar(
      family.model === 'tank' ? 1.8 : family.model === 'mortar' ? 1.4 : family.model === 'staff' ? 0.8 : 1,
    );
    game.scene.add(mesh);
    game.projectiles.push({
      mesh,
      position: origin.clone(),
      velocity: direction
        .clone()
        .multiplyScalar(physics.speed)
        .add(game.player.getVelocity().clone().multiplyScalar(0.2)),
      fuse: physics.fuse,
      bounces: 0,
      kind: 'weapon',
      weaponId: weapon.id,
      damage,
      blastRadius: Math.max(1.1, weapon.blastRadius),
      carveRadius: weapon.carveRadius,
      carveStrength: weapon.carveStrength,
      color: family.color,
      gravity: physics.gravity,
    });
  }
  game.audio.playShot(origin, 'shotgun');
  game.effects.spawnMuzzle(origin, family.color, count > 1 ? 9 : 6);
  game.player.addShake(0.1);
}

export function fireOrbitWeapon(game: Game): void {
  const weapon = WEAPONS[game.activeWeapon];
  if (!weapon) return;
  const family = weaponFamily(weapon.id);
  const damage =
    weapon.damage *
    damageMultiplier(game.run.loadout, weapon.style) *
    weaponDamageScale(game.run.loadout, weapon.id) *
    weaponPassiveMultiplier(game.run.loadout, weapon.id) *
    weaponProfessionMultiplier(game.run.loadout, weapon.id);
  const position = game.player.getPosition().clone();
  const nodes = game.resources.getNearby(position, weapon.range + 1.5);
  for (const node of nodes) {
    damageNodeLocally(game, node, damage * 0.65);
  }
  carveTerrainAt(
    game,
    position.clone().add(new THREE.Vector3(0, 0.8, 0)),
    0.9,
    0.55,
    0.9,
    false,
  );
  game.effects.spawnExplosion(position, 1.8, family.color);
  game.effects.spawnMuzzle(position, family.color, 8);
  game.audio.playShot(position, 'pickaxe');
  game.player.addShake(0.2);
}

export function fireQuakeWeapon(game: Game): void {
  const weapon = WEAPONS[game.activeWeapon];
  if (!weapon) return;
  const family = weaponFamily(weapon.id);
  const aimPoint = game.aim?.point ?? null;
  const direction = game.player.getAimDirection();
  const position =
    aimPoint?.clone() ??
    game.player.getEyePosition().clone().addScaledVector(direction, weapon.range * 0.6);
  const radius = Math.max(2.5, weapon.blastRadius);
  const damage =
    weapon.damage *
    damageMultiplier(game.run.loadout, weapon.style) *
    weaponDamageScale(game.run.loadout, weapon.id) *
    weaponPassiveMultiplier(game.run.loadout, weapon.id) *
    weaponProfessionMultiplier(game.run.loadout, weapon.id);
  game.effects.spawnExplosion(position, radius, family.color);
  game.audio.playExplosion(position, radius);
  carveTerrainAt(
    game,
    position,
    weapon.carveRadius,
    weapon.carveStrength,
    1.1,
    false,
  );
  for (const node of game.resources.getNearby(position, radius)) {
    damageNodeLocally(game, node, damage * 0.8);
  }
  const distance = game.player.getPosition().distanceTo(position);
  game.player.addShake(THREE.MathUtils.clamp(0.9 - distance / 24, 0.15, 0.8));
  sendFx(game, {
    kind: 'explosion',
    x: position.x,
    y: position.y,
    z: position.z,
    radius,
  });
}

export function updateProjectiles(game: Game, dt: number): void {
  for (let index = game.projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = game.projectiles[index];
    projectile.fuse -= dt;
    projectile.velocity.y -= (projectile.gravity ?? 19) * dt;
    const candidate = projectile.position
      .clone()
      .addScaledVector(projectile.velocity, dt);
    let detonate = false;
    if (game.terrain.isSolid(candidate.x, candidate.y, candidate.z)) {
      if (projectile.kind === 'weapon') {
        detonate = true;
      } else {
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
      if (projectile.kind === 'weapon') {
        detonate = true;
      } else {
        projectile.velocity.x *= -0.3;
        projectile.velocity.z *= -0.3;
      }
    }
    projectile.mesh.position.copy(projectile.position);
    if (projectile.fuse <= 0 || detonate) {
      if (projectile.kind === 'weapon') {
        explodeWeaponProjectile(game, projectile);
      } else if (projectile.tier) {
        explodeGrenade(game, projectile.position.clone(), projectile.tier);
      }
      game.scene.remove(projectile.mesh);
      if (projectile.kind === 'weapon') {
        const material = projectile.mesh.material;
        if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
        else material.dispose();
      }
      game.projectiles.splice(index, 1);
    }
  }
}

function explodeWeaponProjectile(game: Game, projectile: GrenadeProjectile): void {
  const position = projectile.position.clone();
  const radius = projectile.blastRadius ?? 1.2;
  const damage = projectile.damage ?? 0;
  const color = projectile.color ?? 0xffc46a;
  game.effects.spawnExplosion(position, radius, color);
  game.audio.playExplosion(position, radius);
  carveTerrainAt(
    game,
    position,
    projectile.carveRadius ?? 0.4,
    projectile.carveStrength ?? 0.5,
    1.0,
    false,
  );
  for (const node of game.resources.getNearby(position, radius)) {
    damageNodeLocally(game, node, damage);
  }
  const family = projectile.weaponId ? weaponFamily(projectile.weaponId) : null;
  if (family?.id === 'poisonStaff') {
    applyPoisonArea(game, position, radius * 1.2, damage * 0.35, 5);
  } else if (family?.id === 'waterStaff') {
    applyWetArea(game, position, Math.max(radius, 4), 8);
  }
  const distance = game.player.getPosition().distanceTo(position);
  game.player.addShake(THREE.MathUtils.clamp(0.8 - distance / 22, 0.1, 0.7));
  sendFx(game, {
    kind: 'explosion',
    x: position.x,
    y: position.y,
    z: position.z,
    radius,
  });
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
    if (projectile.kind === 'weapon') {
      const material = projectile.mesh.material;
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
      else material.dispose();
    }
  }
  game.projectiles.length = 0;
}
