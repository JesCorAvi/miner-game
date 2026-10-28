import * as THREE from 'three';
import {
  WEAPONS,
  carveRadiusMultiplier,
  layerAtDepth,
  professionCarveMultiplier,
} from '../config';
import {
  PATENTS,
  computeEffectiveRadius,
  computeTotalCarveMultiplier,
} from './Progression';
import {
  PROTOCOL_VERSION,
  type FxWire,
} from '../network/Protocol';
import type { CarveEvent, WeaponId } from '../types';
import type { ResourceNode } from '../world/Resources';
import { CARVE_HISTORY_LIMIT } from './GameConstants';
import { hashString } from './Rng';
import { cloneLoadout, roundCoordinate } from './RunState';
import { addMoney } from './Economy';

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
  game.missions.onNodeBroken(node.id, game);
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
    const reward = game.resources.getChestReward(node, game.run.loadout.profession);
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
  if (game.isAuthority()) {
    game.missions.onNodeBroken(node.id, game);
  }
  if (node.type === 'chest') {
    if (game.isAuthority()) {
      grantChestReward(game, node, game.selfPeerId || 'solo');
    } else {
      const reward = game.resources.getChestReward(node, game.run.loadout.profession);
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
  const reward = game.resources.getChestReward(node, game.run.loadout.profession);
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
    addMoney(game.run, money);
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
  const wet = node.wetUntil > performance.now();
  const effectiveDamage = damage * (wet ? 2 : 1);
  const result = game.resources.damage(node.id, effectiveDamage);
  if (wet && Math.random() < 0.25) {
    game.ui.spawnFloat(
      new THREE.Vector3(node.x, node.y + 0.4, node.z),
      'MOJADO ×2',
      'cyan',
    );
  }
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
