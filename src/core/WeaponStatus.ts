import * as THREE from 'three';
import type { Game } from './Game';
import type { ResourceNode } from '../world/Resources';
import { damageNodeLocally } from './Combat';

const WET_DURATION = 6;
const POISON_DURATION = 4;
const POISON_TICK = 0.5;

function positionOf(node: ResourceNode): THREE.Vector3 {
  return new THREE.Vector3(node.x, node.y, node.z);
}

/** Aplica Mojado: el siguiente daño contra la veta se multiplica por dos. */
export function applyWet(game: Game, node: ResourceNode, duration = WET_DURATION): void {
  if (node.broken) {
    return;
  }
  node.wetUntil = Math.max(node.wetUntil, performance.now() + duration * 1000);
  game.effects.spawnHit(positionOf(node), 0x6ad8ff, 0.45);
}

export function applyWetArea(
  game: Game,
  position: THREE.Vector3,
  radius: number,
  duration = WET_DURATION,
): void {
  for (const node of game.resources.getNearby(position, radius)) {
    applyWet(game, node, duration);
  }
  game.effects.spawnHit(position, 0x6ad8ff, 1.1);
}

/**
 * Aplica veneno. Un veneno más débil sobre uno activo se desperdicia; uno más
 * fuerte lo sustituye y reinicia su duración, como en el referente.
 */
export function applyPoison(
  game: Game,
  node: ResourceNode,
  dps: number,
  duration = POISON_DURATION,
): void {
  if (node.broken) {
    return;
  }
  const now = performance.now();
  if (node.poisonUntil > now && node.poisonDps > dps) {
    return;
  }
  node.poisonDps = Math.max(node.poisonDps, dps);
  node.poisonUntil = now + duration * 1000;
  node.poisonNextTick = now + POISON_TICK * 1000;
  game.poisonedNodes.set(node.id, node);
  game.effects.spawnHit(positionOf(node), 0x8aff6a, 0.55);
}

export function applyPoisonArea(
  game: Game,
  position: THREE.Vector3,
  radius: number,
  dps: number,
  duration = POISON_DURATION,
): void {
  for (const node of game.resources.getNearby(position, radius)) {
    applyPoison(game, node, dps, duration);
  }
  game.effects.spawnHit(position, 0x8aff6a, 1.15);
}

/**
 * Tick del veneno en cada extremo. El host lo difunde; un cliente envía sus
 * ticks como `node_hit` y el host los valida y retransmite al resto.
 */
export function updatePoisonStatuses(game: Game, _dt: number): void {
  const now = performance.now();
  for (const [id, node] of game.poisonedNodes) {
    if (node.broken || node.poisonUntil <= now || node.poisonDps <= 0) {
      node.poisonDps = 0;
      node.poisonUntil = 0;
      node.poisonNextTick = 0;
      game.poisonedNodes.delete(id);
      continue;
    }
    if (now < node.poisonNextTick) {
      continue;
    }
    node.poisonNextTick = now + POISON_TICK * 1000;
    damageNodeLocally(game, node, node.poisonDps * POISON_TICK);
  }
}
