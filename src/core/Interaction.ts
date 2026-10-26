import * as THREE from 'three';
import {
  HOPPER_INTERACT_RADIUS,
  HOPPER_POSITION,
  LADDER_HEIGHT,
  LADDER_REACH,
  PIT_HALF,
  SAFE_ZONE_HALF,
  SURFACE_DECK_Y,
  maxCarryWeight,
} from '../config';
import { PROTOCOL_VERSION } from '../network/Protocol';
import type {
  DaySaleLine,
  LadderOrientation,
  NetworkLadderState,
} from '../types';
import type { CollectedLoot } from '../world/Loot';
import { formatMoney, formatNumber } from '../ui/format';
import { roundCoordinate } from './RunState';
import type { Game } from './Game';

export function staffCollect(game: Game, collected: CollectedLoot, count: number): void {
  if (!game.isAuthority()) {
    return;
  }
  game.audio.playPickup(collected.position, count);
  game.effects.spawnHit(collected.position, collected.carbon > 0 ? 0x8ad8df : 0xffd16b, 0.35);
  const cargoLabel = [
    collected.carbon > 0 ? `${formatNumber(collected.carbon)} t` : null,
    collected.money > 0 ? formatMoney(collected.money) : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ');
  game.ui.spawnFloat(
    collected.position.clone().add(new THREE.Vector3(0, 2.2, 0)),
    `RECOLECTOR · ${cargoLabel} · ${formatNumber(count)} PIEZAS`,
    'positive',
  );
  applyTeamDeposit(game, collected.carbon, collected.money, true, collected.lines);
}

export function onLootCollected(game: Game, collected: CollectedLoot): boolean {
  const capacity = maxCarryWeight(game.run.loadout);
  const totals = game.inventory.totals();
  if (totals.weight + collected.weight > capacity + 1e-6) {
    const now = performance.now();
    if (now - game.lastCargoFullToast > 1200) {
      game.lastCargoFullToast = now;
      game.ui.notify(
        `CAPACIDAD COMPLETA · ${totals.weight.toFixed(1)} / ${capacity} kg. Vuelve a la tolva.`,
        'danger',
      );
      game.audio.playError();
    }
    return false;
  }
  const result = game.inventory.addMineral(
    collected.mineral,
    collected.carbon,
    collected.money,
    collected.weight,
  );
  if (!result.accepted) {
    const now = performance.now();
    if (now - game.lastCargoFullToast > 1200) {
      game.lastCargoFullToast = now;
      game.ui.notify(
        'INVENTARIO LLENO · todas las casillas están ocupadas. Deposita en la tolva.',
        'danger',
      );
      game.audio.playError();
    }
    return false;
  }
  const updated = game.inventory.totals();
  game.cargoCoal = updated.carbon;
  game.cargoMoney = updated.money;
  game.cargoWeight = updated.weight;
  game.audio.playPickup(collected.position, updated.count);
  game.effects.spawnMuzzle(collected.position, collected.carbon > 0 ? 0x77e6dd : 0xffd576, 3);
  const now = performance.now();
  if (now - game.lastCollectFloat > 150) {
    game.lastCollectFloat = now;
    const valueParts = [
      collected.carbon > 0 ? `${formatNumber(collected.carbon)} t CARBÓN` : null,
      collected.money > 0 ? formatMoney(collected.money) : null,
    ].filter((part): part is string => part !== null);
    const label = `+${[...valueParts, `${collected.weight.toFixed(2)} kg`].join(' · ')}`;
    game.ui.spawnFloat(
      collected.position,
      label,
      collected.carbon > 0 ? 'positive' : 'amber',
    );
  }
  game.lastHudSignature = '';
  return true;
}

export function isNearHopper(game: Game): boolean {
  const feet = game.player.getPosition();
  const dx = feet.x - HOPPER_POSITION.x;
  const dz = feet.z - HOPPER_POSITION.z;
  return (
    Math.hypot(dx, dz) <= HOPPER_INTERACT_RADIUS &&
    feet.y > SURFACE_DECK_Y - 0.5 &&
    feet.y < SURFACE_DECK_Y + 2.5
  );
}

export function applyTeamDeposit(
  game: Game,
  coal: number,
  money: number,
  fromStaff = false,
  lines: readonly DaySaleLine[] = [],
): void {
  const cleanCoal = Math.max(0, Math.floor(coal));
  const cleanMoney = Math.max(0, Math.floor(money));
  if (cleanCoal <= 0 && cleanMoney <= 0) {
    return;
  }
  game.run.carbon += cleanCoal;
  game.run.money += cleanMoney;
  game.run.stats.coalMined += cleanCoal;
  game.run.stats.moneyEarned += cleanMoney;
  game.recordDayDeposit(lines, cleanMoney);
  game.hopper.triggerPulse();
  game.audio.playDeposit(game.hopper.getPosition(), fromStaff);
  game.lastHudSignature = '';
  if (game.online && game.role === 'host' && game.network) {
    game.broadcastEconomy();
  }
}

export function depositCargo(game: Game): void {
  if (game.phase !== 'playing' || !isNearHopper(game)) {
    return;
  }
  const totals = game.inventory.totals();
  const lines = game.inventory.breakdown();
  const coal = Math.max(0, Math.floor(totals.carbon));
  const money = Math.max(0, Math.floor(totals.money));
  if (totals.count <= 0) {
    game.audio.playError();
    game.ui.notify('La tolva espera carga. Extrae mineral y vuelve a la superficie.', 'info');
    return;
  }
  if (game.online && game.role === 'client' && game.network) {
    const sent = game.network.sendToHost({
      t: 'deposit',
      v: PROTOCOL_VERSION,
      coal,
      money,
      lines,
    });
    if (!sent) {
      game.ui.notify('No se pudo enviar la carga al anfitrión. Inténtalo de nuevo.', 'danger');
      return;
    }
    game.clearCargo();
    game.ui.notify('Carga entregada. El anfitrión está actualizando la tolva.', 'positive');
  } else {
    game.clearCargo();
    applyTeamDeposit(game, coal, money, false, lines);
    game.ui.notify('Carga depositada en la tolva corporativa.', 'positive');
  }
  game.hopper.triggerPulse();
  game.audio.playUnload(game.hopper.getPosition());
  game.ui.flashInventoryDump();
  game.effects.spawnNodeBreak(
    game.hopper.getPosition().clone().add(new THREE.Vector3(0, 2.4, 0)),
    0xffc46a,
    0.8,
  );
  game.ui.spawnFloat(
    game.hopper.getPosition().clone().add(new THREE.Vector3(0, 3.1, 0)),
    `TOLVA +${formatNumber(coal)} t · ${formatMoney(money)} · ${formatNumber(totals.count)} PIEZAS`,
    'positive',
  );
}

export function discardCargo(game: Game, reason: string): void {
  const totals = game.inventory.totals();
  if (totals.count <= 0 && game.cargoCoal <= 0 && game.cargoMoney <= 0) {
    return;
  }
  game.clearCargo();
  game.ui.notify(reason, 'danger');
}

export interface LadderCandidate {
  state: NetworkLadderState;
  valid: boolean;
  reason: string;
}

function clampLadderXZ(value: number): number {
  return THREE.MathUtils.clamp(value, -PIT_HALF + 0.4, PIT_HALF - 0.4);
}

function makeLadderState(
  x: number,
  y: number,
  z: number,
  nx: number,
  nz: number,
  orientation: LadderOrientation,
  anchorId: string,
): NetworkLadderState {
  return {
    id: 'pending',
    x: roundCoordinate(clampLadderXZ(x), 3),
    y: roundCoordinate(y, 3),
    z: roundCoordinate(clampLadderXZ(z), 3),
    nx: roundCoordinate(nx, 3),
    nz: roundCoordinate(nz, 3),
    height: LADDER_HEIGHT,
    orientation,
    anchorId,
  };
}

function horizontalAim(direction: THREE.Vector3): { nx: number; nz: number } {
  const length = Math.hypot(direction.x, direction.z);
  if (length < 0.08) {
    return { nx: 0, nz: -1 };
  }
  return { nx: direction.x / length, nz: direction.z / length };
}

function deckPoint(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
): { x: number; z: number } | null {
  if (Math.abs(direction.y) < 1e-4) {
    return null;
  }
  const t = (SURFACE_DECK_Y - origin.y) / direction.y;
  if (t <= 0 || t > LADDER_REACH) {
    return null;
  }
  const x = origin.x + direction.x * t;
  const z = origin.z + direction.z * t;
  const outsidePit = Math.abs(x) > PIT_HALF || Math.abs(z) > PIT_HALF;
  const insideSafe = Math.abs(x) <= SAFE_ZONE_HALF && Math.abs(z) <= SAFE_ZONE_HALF;
  if (!outsidePit || !insideSafe) {
    return null;
  }
  return { x, z };
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

function intersectsMinerals(game: Game, state: NetworkLadderState): boolean {
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

function validateLadderCandidate(game: Game, state: NetworkLadderState): LadderCandidate {
  const top = state.orientation === 'vertical' ? state.y + state.height : state.y + 0.08;
  if (state.y < -119 || top > 8) {
    return { state, valid: false, reason: 'FUERA DE LOS LÍMITES DEL POZO' };
  }
  if (game.ladders.overlaps(state)) {
    return { state, valid: false, reason: 'SE SOLAPA CON OTRA ESCALERA' };
  }
  if (intersectsMinerals(game, state)) {
    return { state, valid: false, reason: 'MINERAL EN MEDIO' };
  }
  return { state, valid: true, reason: '' };
}

export function findLadderCandidate(game: Game): LadderCandidate | null {
  if (game.run.loadout.ladders <= 0 || game.phase !== 'playing') {
    return null;
  }
  const orientation = game.ladderOrientation;
  const origin = game.player.getEyePosition();
  const direction = game.player.getAimDirection();
  const anchor = game.ladders.findAnchor(origin, direction, LADDER_REACH + LADDER_HEIGHT);
  if (anchor && orientation === 'vertical' && anchor.kind === 'vertical-top') {
    const ladder = anchor.ladder;
    return validateLadderCandidate(
      game,
      makeLadderState(
        ladder.x,
        ladder.y + ladder.height,
        ladder.z,
        ladder.nx,
        ladder.nz,
        'vertical',
        ladder.id,
      ),
    );
  }
  if (anchor && orientation === 'horizontal' && anchor.kind === 'horizontal-end') {
    const ladder = anchor.ladder;
    return validateLadderCandidate(
      game,
      makeLadderState(
        ladder.x + ladder.nx * ladder.height,
        ladder.y,
        ladder.z + ladder.nz * ladder.height,
        ladder.nx,
        ladder.nz,
        'horizontal',
        ladder.id,
      ),
    );
  }
  if (anchor) {
    return null;
  }

  const hit = game.terrain.raycast(origin, direction, LADDER_REACH);
  if (!hit) {
    const deck = deckPoint(origin, direction);
    if (!deck) {
      return null;
    }
    if (orientation === 'vertical') {
      return validateLadderCandidate(
        game,
        makeLadderState(
          deck.x,
          SURFACE_DECK_Y + 0.02,
          deck.z,
          0,
          1,
          'vertical',
          'ground',
        ),
      );
    }
    const { nx, nz } = horizontalAim(direction);
    return validateLadderCandidate(
      game,
      makeLadderState(
        deck.x,
        SURFACE_DECK_Y + 0.02,
        deck.z,
        nx,
        nz,
        'horizontal',
        'ground',
      ),
    );
  }
  const onGround = Math.abs(hit.normal.y) > 0.72 && hit.normal.y > 0;
  if (orientation === 'vertical') {
    if (onGround) {
      return validateLadderCandidate(
        game,
        makeLadderState(hit.x, hit.y + 0.02, hit.z, 0, 1, 'vertical', 'ground'),
      );
    }
    const horizontal = Math.hypot(hit.normal.x, hit.normal.z);
    if (horizontal < 0.2) {
      return null;
    }
    const nx = hit.normal.x / horizontal;
    const nz = hit.normal.z / horizontal;
    return validateLadderCandidate(
      game,
      makeLadderState(
        hit.x + nx * 0.16,
        game.player.getPosition().y - 0.05,
        hit.z + nz * 0.16,
        nx,
        nz,
        'vertical',
        'wall',
      ),
    );
  }

  if (onGround) {
    const { nx, nz } = horizontalAim(direction);
    return validateLadderCandidate(
      game,
      makeLadderState(hit.x, hit.y + 0.02, hit.z, nx, nz, 'horizontal', 'ground'),
    );
  }
  const horizontal = Math.hypot(hit.normal.x, hit.normal.z);
  if (horizontal < 0.2) {
    return null;
  }
  const nx = -hit.normal.x / horizontal;
  const nz = -hit.normal.z / horizontal;
  return validateLadderCandidate(
    game,
    makeLadderState(
      hit.x + nx * 0.2,
      game.player.getPosition().y - 0.05,
      hit.z + nz * 0.2,
      nx,
      nz,
      'horizontal',
      'wall',
    ),
  );
}

export function findLadderPlacement(game: Game): NetworkLadderState | null {
  const candidate = findLadderCandidate(game);
  return candidate?.valid ? candidate.state : null;
}

export function placeLadder(game: Game): void {
  if (game.phase !== 'playing' || !game.ladderPlacementEnabled) {
    return;
  }
  if (game.run.loadout.ladders <= 0) {
    game.audio.playError();
    game.ui.notify('No quedan escaleras. Compra un kit barato en la oficina nocturna.', 'danger');
    return;
  }
  const candidate = findLadderCandidate(game);
  if (!candidate) {
    game.audio.playError();
    game.ui.notify('Apunta al suelo, a una pared o al extremo de otra escalera.', 'danger');
    return;
  }
  if (!candidate.valid) {
    game.audio.playError();
    game.ui.notify(candidate.reason, 'danger');
    return;
  }
  const ladder = candidate.state;
  ladder.id = nextLadderId(game);
  if (!game.ladders.add(ladder)) {
    game.audio.playError();
    game.ui.notify('No se pudo colocar la escalera: límite de estructuras alcanzado.', 'danger');
    return;
  }
  game.run.loadout.ladders -= 1;
  game.syncEquipmentInventory();
  if (game.player.isClimbing() && ladder.orientation === 'vertical') {
    game.player.switchClimbingLadder(ladder.id);
  }
  game.audio.playLadder(new THREE.Vector3(ladder.x, ladder.y + 0.6, ladder.z));
  game.effects.spawnMuzzle(
    new THREE.Vector3(ladder.x, ladder.y + 0.6, ladder.z),
    0xdca64c,
    6,
  );
  game.ui.spawnFloat(
    new THREE.Vector3(ladder.x, ladder.y + 1.9, ladder.z),
    `${ladder.orientation === 'horizontal' ? 'PUENTE' : 'ESCALERA'} · QUEDAN ${game.run.loadout.ladders}`,
    'amber',
  );
  game.nearHopper = false;
  game.interactionPrompt = null;
  game.lastHudSignature = '';
  game.saveRun(false);
  if (game.online && game.network) {
    if (game.role === 'client') {
      game.network.sendToHost({
        t: 'ladder_place',
        v: PROTOCOL_VERSION,
        ladder,
      });
    } else if (game.role === 'host') {
      game.network.broadcast({
        t: 'ladder_placed',
        v: PROTOCOL_VERSION,
        ladder,
      });
      game.broadcastEconomy();
    }
  }
}

export function nextLadderId(game: Game): string {
  game.ladderCounter += 1;
  const owner = game.selfPeerId.replace(/[^a-zA-Z0-9]/g, '').slice(-5) || 'solo';
  return `l-${game.run.day}-${owner}-${game.ladderCounter}`;
}

export function handleInteract(game: Game): void {
  if (game.phase !== 'playing' || !game.input.isLocked()) {
    return;
  }
  if (isNearHopper(game)) {
    depositCargo(game);
    return;
  }
  if (!game.ladderPlacementEnabled) {
    return;
  }
  placeLadder(game);
}

export function updateInteractionState(game: Game): void {
  if (game.phase !== 'playing' || !game.input.isLocked()) {
    game.nearHopper = false;
    game.interactionPrompt = null;
    game.ladders.clearGhost();
    return;
  }
  game.nearHopper = isNearHopper(game);
  if (game.nearHopper) {
    game.ladders.clearGhost();
    const pieces = game.inventory.totals().count;
    const hasCargo = pieces > 0;
    game.interactionPrompt = {
      key: 'E',
      text: hasCargo
        ? `DEPOSITAR CARGA · ${formatNumber(game.cargoCoal)} t · ${formatMoney(game.cargoMoney)} · ${formatNumber(pieces)} PIEZAS`
        : 'TOLVA VACÍA · EXTRAE MINERAL Y VUELVE',
    };
    return;
  }
  if (!game.ladderPlacementEnabled) {
    game.ladders.clearGhost();
    game.interactionPrompt = null;
    return;
  }
  const candidate = findLadderCandidate(game);
  game.ladders.showGhost(candidate?.state ?? null, candidate?.valid ?? false);
  if (!candidate) {
    game.interactionPrompt = null;
    return;
  }
  const mode = game.ladderOrientation === 'horizontal' ? 'PUENTE' : 'ESCALERA';
  game.interactionPrompt = {
    key: 'E',
    text: candidate.valid
      ? `COLOCAR ${mode} · R CAMBIAR · G OCULTAR · QUEDAN ${game.run.loadout.ladders}`
      : `${candidate.reason} · R CAMBIAR · G OCULTAR`,
  };
}
