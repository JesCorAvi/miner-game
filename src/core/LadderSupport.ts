import * as THREE from 'three';
import {
  PIT_HALF,
  SAFE_ZONE_HALF,
  SURFACE_DECK_HALF,
  SURFACE_DECK_Y,
} from '../config';
import type { LadderOrientation, NetworkLadderState } from '../types';
import type { Game } from './Game';

export interface LadderCandidate {
  state: NetworkLadderState;
  valid: boolean;
  reason: string;
}

export function isDiagonalOrientation(orientation: LadderOrientation): boolean {
  return orientation === 'diagonal-up' || orientation === 'diagonal-down';
}

function pointSegmentDistance(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq < 1e-6) {
    return Math.hypot(px - ax, pz - az);
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lengthSq));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

function pointSegment3DDistance(
  px: number,
  py: number,
  pz: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const lengthSq = dx * dx + dy * dy + dz * dz;
  if (lengthSq < 1e-6) {
    return Math.hypot(px - ax, py - ay, pz - az);
  }
  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / lengthSq),
  );
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t), pz - (az + dz * t));
}

function intersectsMinerals(game: Game, state: NetworkLadderState): boolean {
  if (isDiagonalOrientation(state.orientation)) {
    const sign = state.orientation === 'diagonal-up' ? 1 : -1;
    const run = state.height * Math.SQRT1_2;
    const endX = state.x + state.nx * run;
    const endY = state.y + sign * run;
    const endZ = state.z + state.nz * run;
    for (const node of game.resources.nodes) {
      if (node.broken) {
        continue;
      }
      if (
        pointSegment3DDistance(
          node.x,
          node.y,
          node.z,
          state.x,
          state.y,
          state.z,
          endX,
          endY,
          endZ,
        ) <
        node.radius + 0.12
      ) {
        return true;
      }
    }
    return false;
  }
  const endX = state.x + state.nx * state.height;
  const endZ = state.z + state.nz * state.height;
  const top = state.y + state.height;
  for (const node of game.resources.nodes) {
    if (node.broken) {
      continue;
    }
    if (state.orientation === 'vertical') {
      if (node.y + node.radius < state.y || node.y - node.radius > top) {
        continue;
      }
      if (Math.hypot(node.x - state.x, node.z - state.z) < node.radius + 0.12) {
        return true;
      }
    } else {
      if (Math.abs(node.y - (state.y + 0.04)) > node.radius + 0.35) {
        continue;
      }
      if (
        pointSegmentDistance(node.x, node.z, state.x, state.z, endX, endZ) <
        node.radius + 0.12
      ) {
        return true;
      }
    }
  }
  return false;
}

function isDeckFooting(x: number, z: number, y: number): boolean {
  const outsidePit = Math.abs(x) > PIT_HALF || Math.abs(z) > PIT_HALF;
  if (!outsidePit) {
    return false;
  }
  if (Math.abs(x) > SURFACE_DECK_HALF || Math.abs(z) > SURFACE_DECK_HALF) {
    return false;
  }
  return Math.abs(y - (SURFACE_DECK_Y + 0.02)) <= 0.06;
}

const DOWNWARD = new THREE.Vector3(0, -1, 0);

/** Altura real del apoyo bajo los pies, para que la rampa lo toque. */
export function footingHeight(
  game: Game,
  x: number,
  feetY: number,
  z: number,
): number | null {
  if (isDeckFooting(x, z, feetY)) {
    return SURFACE_DECK_Y + 0.02;
  }
  const ladderTop = game.ladders.findHorizontalTop(x, z, feetY, 0.34, 0.06);
  if (ladderTop !== null && ladderTop <= feetY + 0.08) {
    return ladderTop + 0.01;
  }
  const hit = game.terrain.raycast(
    new THREE.Vector3(x, feetY + 0.03, z),
    DOWNWARD,
    0.7,
  );
  return hit ? hit.y + 0.02 : null;
}

export function isSurfaceFooting(
  game: Game,
  x: number,
  y: number,
  z: number,
): boolean {
  if (isDeckFooting(x, z, y)) {
    return true;
  }
  const ladderTop = game.ladders.findHorizontalTop(x, z, y, 0.34, 0.05);
  if (
    ladderTop !== null &&
    ladderTop <= y + 0.03 &&
    Math.abs(ladderTop - y) <= 0.08
  ) {
    return true;
  }
  const hit = game.terrain.raycast(
    new THREE.Vector3(x, y + 0.02, z),
    DOWNWARD,
    0.45,
  );
  return (
    hit !== null &&
    hit.y <= y + 0.01 &&
    Math.abs(hit.y + 0.02 - y) <= 0.08
  );
}

function hasWallContact(game: Game, state: NetworkLadderState): boolean {
  const offset = 0.14;
  const backX = state.x - state.nx * offset;
  const backZ = state.z - state.nz * offset;
  const frontX = state.x + state.nx * offset;
  const frontZ = state.z + state.nz * offset;
  const touches = (y: number): boolean =>
    game.terrain.isSolid(backX, y, backZ) ||
    game.terrain.isSolid(frontX, y, frontZ);
  if (state.orientation === 'vertical') {
    // Una escalera de pared queda sujeta mientras toque la roca en algún
    // tramo de su altura; no hace falta que el suelo esté justo bajo la base.
    for (const height of [0.35, 1.6, 3]) {
      if (height < state.height && touches(state.y + height)) {
        return true;
      }
    }
    return false;
  }
  return touches(state.y + 0.06);
}

function diagonalSpanBlocked(game: Game, state: NetworkLadderState): boolean {
  const sign = state.orientation === 'diagonal-up' ? 1 : -1;
  const run = state.height * Math.SQRT1_2;
  const dx = state.nx * run;
  const dy = sign * run;
  const dz = state.nz * run;
  const farY = state.y + dy;
  // Un descenso puede cruzar la plataforma segura sin que ninguna muestra
  // caiga exactamente dentro de su espesor.
  if (state.y >= SURFACE_DECK_Y + 0.02 && farY < SURFACE_DECK_Y - 0.05) {
    const t = (SURFACE_DECK_Y - state.y) / (farY - state.y);
    if (t > 0 && t < 1) {
      const x = state.x + dx * t;
      const z = state.z + dz * t;
      const outsidePit = Math.abs(x) > PIT_HALF || Math.abs(z) > PIT_HALF;
      const insideDeck =
        Math.abs(x) <= SURFACE_DECK_HALF && Math.abs(z) <= SURFACE_DECK_HALF;
      if (outsidePit && insideDeck) {
        return true;
      }
    }
  }
  for (const t of [0.55, 0.75, 0.95]) {
    const x = state.x + dx * t;
    const y = state.y + dy * t;
    const z = state.z + dz * t;
    if (game.terrain.isSolid(x, y, z)) {
      return true;
    }
    const outsidePit = Math.abs(x) > PIT_HALF || Math.abs(z) > PIT_HALF;
    const insideDeck =
      Math.abs(x) <= SURFACE_DECK_HALF && Math.abs(z) <= SURFACE_DECK_HALF;
    if (
      outsidePit &&
      insideDeck &&
      y <= SURFACE_DECK_Y + 0.05 &&
      y >= SURFACE_DECK_Y - 0.45
    ) {
      return true;
    }
  }
  return false;
}

const LADDER_CONTACT_TOLERANCE = 0.4;

function hasDiagonalSupport(game: Game, state: NetworkLadderState): boolean {
  if (state.anchorId === 'wall') {
    return hasWallContact(game, state);
  }
  if (state.anchorId && state.anchorId !== 'ground') {
    return (
      game.ladders.contactDistance(
        state.anchorId,
        state.x,
        state.y,
        state.z,
      ) <= LADDER_CONTACT_TOLERANCE
    );
  }
  return isSurfaceFooting(game, state.x, state.y, state.z);
}

export function validateLadderCandidate(game: Game, state: NetworkLadderState): LadderCandidate {
  let low = state.y;
  let high = state.y;
  if (isDiagonalOrientation(state.orientation)) {
    const rise = state.height * Math.SQRT1_2 * (state.orientation === 'diagonal-up' ? 1 : -1);
    low = Math.min(state.y, state.y + rise);
    high = Math.max(state.y, state.y + rise);
  } else {
    high = state.orientation === 'vertical' ? state.y + state.height : state.y + 0.08;
  }
  if (low < -119 || high > 8) {
    return { state, valid: false, reason: 'FUERA DE LOS LÍMITES DEL POZO' };
  }
  if (Math.abs(state.x) > SAFE_ZONE_HALF || Math.abs(state.z) > SAFE_ZONE_HALF) {
    return { state, valid: false, reason: 'FUERA DE LA ZONA DE OPERACIÓN' };
  }
  if (isDiagonalOrientation(state.orientation)) {
    if (!hasDiagonalSupport(game, state)) {
      return {
        state,
        valid: false,
        reason: 'FALTA ANCLAJE · PISA EL SUELO O ACÉRCATE A UNA ESCALERA',
      };
    }
    if (diagonalSpanBlocked(game, state)) {
      return { state, valid: false, reason: 'SIN HUECO PARA LA RAMPA' };
    }
  } else if (state.anchorId === 'ground') {
    if (!isSurfaceFooting(game, state.x, state.y, state.z)) {
      return {
        state,
        valid: false,
        reason: 'FALTA ANCLAJE · APOYA LA ESCALERA EN UNA SUPERFICIE',
      };
    }
  } else if (state.anchorId === 'wall') {
    if (!hasWallContact(game, state)) {
      return { state, valid: false, reason: 'SIN CONTACTO CON LA PARED' };
    }
  } else if (
    !state.anchorId ||
    game.ladders.contactDistance(
      state.anchorId,
      state.x,
      state.y,
      state.z,
    ) > LADDER_CONTACT_TOLERANCE
  ) {
    return {
      state,
      valid: false,
      reason: 'SIN CONTACTO CON LA ESCALERA DE ANCLAJE',
    };
  }
  if (game.ladders.overlaps(state)) {
    return { state, valid: false, reason: 'SE SOLAPA CON OTRA ESCALERA' };
  }
  if (intersectsMinerals(game, state)) {
    return { state, valid: false, reason: 'MINERAL EN MEDIO' };
  }
  return { state, valid: true, reason: '' };
}
