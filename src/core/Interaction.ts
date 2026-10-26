import * as THREE from 'three';
import {
  HOPPER_INTERACT_RADIUS,
  HOPPER_POSITION,
  LADDER_HEIGHT,
  LADDER_ORIENTATION_LABELS,
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
import {
  footingHeight,
  isDiagonalOrientation,
  isSurfaceFooting,
  validateLadderCandidate,
  type LadderCandidate,
} from './LadderSupport';

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
    x: roundCoordinate(x, 3),
    y: roundCoordinate(y, 3),
    z: roundCoordinate(z, 3),
    nx: roundCoordinate(nx, 3),
    nz: roundCoordinate(nz, 3),
    height: LADDER_HEIGHT,
    orientation,
    anchorId,
  };
}

function ladderLabel(orientation: LadderOrientation): string {
  return LADDER_ORIENTATION_LABELS[orientation];
}

function horizontalAim(
  direction: THREE.Vector3,
  fallbackYaw = 0,
): { nx: number; nz: number } {
  const length = Math.hypot(direction.x, direction.z);
  if (length < 0.08) {
    // Al mirar casi en vertical, la rampa sigue el rumbo del jugador.
    return { nx: -Math.sin(fallbackYaw), nz: -Math.cos(fallbackYaw) };
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

export function findLadderCandidate(game: Game): LadderCandidate | null {
  if (game.run.loadout.ladders <= 0 || game.phase !== 'playing') {
    return null;
  }
  const orientation = game.ladderOrientation;
  const origin = game.player.getEyePosition();
  const direction = game.player.getAimDirection();
  const yaw = game.player.getLookAngles().yaw;

  if (isDiagonalOrientation(orientation)) {
    const p = game.player.getPosition();
    // Una rampa cerca de otra escalera se enlaza a ella antes que al suelo.
    const link = game.ladders.findDiagonalLink(p, direction);
    if (link) {
      return validateLadderCandidate(
        game,
        makeLadderState(
          link.x,
          link.y,
          link.z,
          link.nx,
          link.nz,
          orientation,
          link.anchorId,
        ),
      );
    }
    const { nx, nz } = horizontalAim(direction, yaw);
    const footY = footingHeight(game, p.x, p.y, p.z) ?? p.y + 0.02;
    if (isSurfaceFooting(game, p.x, footY, p.z)) {
      return validateLadderCandidate(
        game,
        makeLadderState(p.x, footY, p.z, nx, nz, orientation, 'ground'),
      );
    }
    // Sin suelo bajo los pies, una pared vertical puede sostener el extremo.
    const wall = game.terrain.raycast(origin, direction, LADDER_REACH);
    if (wall) {
      const horizontal = Math.hypot(wall.normal.x, wall.normal.z);
      if (horizontal >= 0.2 && wall.normal.y <= 0.72) {
        const wx = wall.normal.x / horizontal;
        const wz = wall.normal.z / horizontal;
        return validateLadderCandidate(
          game,
          makeLadderState(
            wall.x + wx * 0.02,
            wall.y,
            wall.z + wz * 0.02,
            wx,
            wz,
            orientation,
            'wall',
          ),
        );
      }
    }
    return validateLadderCandidate(
      game,
      makeLadderState(p.x, footY, p.z, nx, nz, orientation, 'ground'),
    );
  }

  // Desde una cima o un extremo se puede continuar sin apuntar al punto exacto.
  if (orientation === 'vertical') {
    const top = game.ladders.findNearestTop(game.player.getPosition(), 1.4);
    if (top) {
      return validateLadderCandidate(
        game,
        makeLadderState(
          top.x,
          top.y + top.height,
          top.z,
          top.nx,
          top.nz,
          'vertical',
          top.id,
        ),
      );
    }
    const end = game.ladders.findNearestEnd(game.player.getPosition(), 1.4);
    if (end) {
      return validateLadderCandidate(
        game,
        makeLadderState(
          end.x + end.nx * end.height,
          end.y + 0.08,
          end.z + end.nz * end.height,
          -end.nx,
          -end.nz,
          'vertical',
          end.id,
        ),
      );
    }
  }
  if (orientation === 'horizontal') {
    const end = game.ladders.findNearestEnd(game.player.getPosition(), 1.4);
    if (end) {
      const horizontalLength = Math.hypot(direction.x, direction.z);
      const useAim = horizontalLength >= 0.08;
      const nx = useAim ? direction.x / horizontalLength : end.nx;
      const nz = useAim ? direction.z / horizontalLength : end.nz;
      return validateLadderCandidate(
        game,
        makeLadderState(
          end.x + end.nx * end.height,
          end.y,
          end.z + end.nz * end.height,
          nx,
          nz,
          'horizontal',
          end.id,
        ),
      );
    }
  }

  if (orientation === 'horizontal') {
    // Puente a la altura apuntada de una vertical (mitad o cualquier punto).
    const hit = game.ladders.findVerticalPoint(
      origin,
      direction,
      LADDER_REACH + LADDER_HEIGHT,
    );
    if (hit) {
      const ladder = hit.ladder;
      const p = game.player.getPosition();
      const side =
        (p.x - ladder.x) * ladder.nx + (p.z - ladder.z) * ladder.nz >= 0 ? 1 : -1;
      const horizontalLength = Math.hypot(direction.x, direction.z);
      const outward =
        direction.x * ladder.nx * side + direction.z * ladder.nz * side;
      const useAim = horizontalLength >= 0.08 && outward > -0.2;
      const nx = useAim ? direction.x / horizontalLength : ladder.nx * side;
      const nz = useAim ? direction.z / horizontalLength : ladder.nz * side;
      return validateLadderCandidate(
        game,
        makeLadderState(
          ladder.x,
          hit.y - 0.08,
          ladder.z,
          nx,
          nz,
          'horizontal',
          ladder.id,
        ),
      );
    }
  }

  if (orientation === 'horizontal') {
    // Puente a cualquier altura de una vertical: se ancla al tramo actual.
    const vertical = game.ladders.findNearest(game.player.getPosition());
    if (vertical) {
      const horizontalLength = Math.hypot(direction.x, direction.z);
      const useAim = horizontalLength >= 0.08;
      const nx = useAim ? direction.x / horizontalLength : vertical.nx;
      const nz = useAim ? direction.z / horizontalLength : vertical.nz;
      return validateLadderCandidate(
        game,
        makeLadderState(
          vertical.x,
          game.player.getPosition().y - 0.08,
          vertical.z,
          nx,
          nz,
          'horizontal',
          vertical.id,
        ),
      );
    }
  }

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
  if (anchor && orientation === 'horizontal' && anchor.kind === 'vertical-top') {
    const ladder = anchor.ladder;
    const horizontalLength = Math.hypot(direction.x, direction.z);
    const useAim = horizontalLength >= 0.08;
    const nx = useAim ? direction.x / horizontalLength : ladder.nx;
    const nz = useAim ? direction.z / horizontalLength : ladder.nz;
    return validateLadderCandidate(
      game,
      makeLadderState(
        ladder.x,
        ladder.y + ladder.height - 0.08,
        ladder.z,
        nx,
        nz,
        'horizontal',
        ladder.id,
      ),
    );
  }
  if (anchor) {
    return null;
  }

  // Puente sobre una escalera vertical sin apuntar a la cima: el jugador
  // está de pie encima y solo necesita mirar en la dirección del puente.
  if (orientation === 'horizontal') {
    const top = game.ladders.findNearestTop(game.player.getPosition(), 1.4);
    if (top) {
      const horizontalLength = Math.hypot(direction.x, direction.z);
      const useAim = horizontalLength >= 0.08;
      const nx = useAim ? direction.x / horizontalLength : top.nx;
      const nz = useAim ? direction.z / horizontalLength : top.nz;
      return validateLadderCandidate(
        game,
        makeLadderState(
          top.x,
          top.y + top.height - 0.08,
          top.z,
          nx,
          nz,
          'horizontal',
          top.id,
        ),
      );
    }
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
    const { nx, nz } = horizontalAim(direction, yaw);
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
        hit.x + nx * 0.06,
        game.player.getPosition().y - 0.05,
        hit.z + nz * 0.06,
        nx,
        nz,
        'vertical',
        'wall',
      ),
    );
  }

  if (onGround) {
    const { nx, nz } = horizontalAim(direction, yaw);
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
      hit.x + nx * 0.03,
      hit.y - 0.04,
      hit.z + nz * 0.03,
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
    game.ui.notify(
      'Apunta al suelo, a una pared o a otra escalera. Las rampas necesitan un extremo apoyado.',
      'danger',
    );
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
  // Colocar con G no debe desactivar el modo tras el primer tramo.
  if (game.run.loadout.ladders > 0) {
    game.ladderPlacementEnabled = true;
  }
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
    `${ladderLabel(ladder.orientation)} · QUEDAN ${game.run.loadout.ladders}`,
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
  }
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
  const mode = ladderLabel(game.ladderOrientation);
  game.interactionPrompt = {
    key: 'CLIC IZQ',
    text: candidate.valid
      ? `COLOCAR ${mode} · CLIC DER DIAL · G OCULTAR · QUEDAN ${game.run.loadout.ladders}`
      : `${candidate.reason} · CLIC DER DIAL · G OCULTAR`,
  };
}
