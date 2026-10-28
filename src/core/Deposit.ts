import * as THREE from 'three';
import {
  HOPPER_INTERACT_RADIUS,
  HOPPER_POSITION,
  MINERALS,
  SURFACE_DECK_Y,
  dayDuration,
} from '../config';
import { PROTOCOL_VERSION } from '../network/Protocol';
import type { DaySaleLine, DifficultyModifier } from '../types';
import { formatMoney, formatNumber } from '../ui/format';
import type { Game } from './Game';

export function isNearHopper(game: Game): boolean {
  const feet = game.player.getPosition();
  const dx = feet.x - HOPPER_POSITION.x;
  const dz = feet.z - HOPPER_POSITION.z;
  const targetDeckY = SURFACE_DECK_Y - (game.run.platformDepth || 0);
  return (
    Math.hypot(dx, dz) <= HOPPER_INTERACT_RADIUS &&
    feet.y > targetDeckY - 0.5 &&
    feet.y < targetDeckY + 2.5
  );
}

/**
 * El modificador COALWORTHLESS convierte en 0 el capital del carbón, pero
 * mantiene intacta la cuota. Se aplica en cliente y host para que el agregado
 * del depósito coincida.
 */
export function applyCoalValuePolicy(
  lines: readonly DaySaleLine[],
  money: number,
  modifiers: readonly DifficultyModifier[] | undefined,
): { lines: DaySaleLine[]; money: number } {
  if (!modifiers?.includes('coal_worthless')) {
    return { lines: [...lines], money };
  }
  let removed = 0;
  const adjusted = lines.map((line) => {
    if (MINERALS[line.mineral]?.family === 'coal' && line.money > 0) {
      removed += line.money;
      return { ...line, money: 0 };
    }
    return { ...line };
  });
  return { lines: adjusted, money: Math.max(0, money - removed) };
}

export function applyTeamDeposit(
  game: Game,
  coal: number,
  money: number,
  fromStaff = false,
  lines: readonly DaySaleLine[] = [],
): void {
  const policy = applyCoalValuePolicy(lines, money, game.run.modifiers);
  const cleanCoal = Math.max(0, Math.floor(coal));
  const cleanMoney = Math.max(0, Math.floor(policy.money));
  if (cleanCoal <= 0 && cleanMoney <= 0) {
    return;
  }
  game.run.carbon += cleanCoal;
  game.run.money += cleanMoney;
  game.run.stats.coalMined += cleanCoal;
  game.run.stats.moneyEarned += cleanMoney;
  if (game.securedAt === null && game.run.carbon >= game.run.quota) {
    const duration = dayDuration(game.run.loadout);
    game.securedAt = Math.max(0, duration - game.run.timeLeft);
  }
  game.recordDayDeposit(policy.lines, cleanMoney);
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
  const rawLines = game.inventory.breakdown();
  const policy = applyCoalValuePolicy(rawLines, totals.money, game.run.modifiers);
  const lines = policy.lines;
  const coal = Math.max(0, Math.floor(totals.carbon));
  const money = Math.max(0, Math.floor(policy.money));
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
  game.hopperTripsToday += 1;
  game.returnPlanner.recordTripArrival();
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
