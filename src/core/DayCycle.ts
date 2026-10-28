import {
  TRUE_VICTORY_DAY,
  VICTORY_DAY,
  WEAPON_ORDER,
  dayDuration,
  quotaForDay,
} from '../config';
import {
  computeDayDurationWithModifiers,
  computeQuotaWithModifiers,
  computeReserveApplication,
  hasUtilityActive,
} from './Progression';
import {
  PROTOCOL_VERSION,
  type DaySnapshot,
  type GameHostMessage,
} from '../network/Protocol';
import type { RunStats } from '../types';
import { formatNumber } from '../ui/format';
import { clearProjectiles } from './Combat';
import { buildDayReport, computeFootprintStage } from './DaySettlement';
import { discardCargo } from './Interaction';
import { randomSeed } from './Rng';
import { cloneLoadout, cloneStats } from './RunState';
import { buildShopView } from './ShopView';
import { applyPixelMode, updateOfficeCamera } from './View';
import type { Game } from './Game';

export { computeFootprintStage };

export function beginAuthorityDay(game: Game, broadcastStart = false): void {
  game.environment.setFootprintStage(computeFootprintStage(game.run.day));
  const hasDustClause = game.run.loadout.clauses?.includes('suspended_dust') ?? false;
  const hasDustFilter = hasUtilityActive(game.run.loadout, 'dust_filter');
  game.environment.setSuspendedDust(hasDustClause && !hasDustFilter);
  game.finishing = false;
  game.pendingPickaxeStrike = 0;
  game.carveHistory = [];
  game.shopSuccess = false;
  game.shopVictory = false;
  game.clearCargo();
  game.closeInventory();
  game.ladderCounter = 0;
  game.hopperTripsToday = 0;
  game.resetDaySettlement();
  game.dayMoneyBase = game.run.money;
  const snapshot: DaySnapshot = {
    phase: 'playing',
    day: game.run.day,
    seed: game.seed,
    quota: game.run.quota,
    timeLeft: game.run.timeLeft,
    money: game.run.money,
    carbon: game.run.carbon,
    dayMoneyBase: game.dayMoneyBase,
    dayReport: game.dayReport,
    infinite: game.run.infinite,
    mode: game.run.mode ?? 'normal',
    modifiers: game.run.modifiers ?? [],
    map: game.run.map ?? 'standard',
    loadout: cloneLoadout(game.run.loadout),
    stats: cloneStats(game.run.stats),
    carveHistory: [],
    brokenNodes: [],
    nodeHp: {},
    players: game.getAllHostStates(),
    staff: [],
    ladders: [],
    winches: [],
    depots: [],
    beacons: [],
    platformDepth: game.run.platformDepth || 0,
  };
  loadSnapshot(game, snapshot, true);
  snapshot.missions = game.missions.getSnapshot();
  if (broadcastStart && game.online && game.role === 'host' && game.network) {
    game.network.broadcast({
      t: 'start_day',
      v: PROTOCOL_VERSION,
      snapshot,
    });
  }
  game.ui.showBanner(
    'TURNO INICIADO',
    `DÍA ${String(game.run.day).padStart(2, '0')} · CUOTA ${formatNumber(game.run.quota)} t`,
    2800,
  );
  if (game.run.day === 1) {
    window.setTimeout(() => {
      game.ui.notify(
        'DIRECTIVA: El carbón cubre la cuota diaria; los minerales financian la oficina.',
        'info',
      );
    }, 1200);
  }
  void game.input.requestLock();
}

export function loadSnapshot(game: Game, snapshot: DaySnapshot, authority: boolean): void {
  game.run = {
    day: snapshot.day,
    money: snapshot.money,
    carbon: snapshot.carbon,
    quota: snapshot.quota,
    timeLeft: snapshot.timeLeft,
    infinite: snapshot.infinite,
    mode: snapshot.mode ?? 'normal',
    modifiers: snapshot.modifiers ?? [],
    map: snapshot.map ?? 'standard',
    loadout: cloneLoadout(snapshot.loadout),
    stats: cloneStats(snapshot.stats),
    platformDepth: snapshot.platformDepth || 0,
  };
  game.seed = snapshot.seed >>> 0;
  game.dayMoneyBase = snapshot.dayMoneyBase;
  game.hopperTripsToday = 0;
  game.resetDaySettlement();
  game.dayReport = snapshot.dayReport;
  game.carveHistory = authority ? [] : [...snapshot.carveHistory];
  game.phase = snapshot.phase === 'shop' ? 'shop' : 'playing';
  game.paused = false;
  game.pendingPickaxeStrike = 0;
  game.finishing = false;
  game.hasLockedOnce = false;
  game.shopSuccess = false;
  game.shopVictory = false;
  for (const weapon of WEAPON_ORDER) {
    game.cooldowns[weapon] = 0;
  }
  clearProjectiles(game);
  game.clearCargo();
  game.closeInventory();
  game.syncEquipmentInventory();
  game.ladderCounter = 0;
  game.interactionPrompt = null;
  game.ladders.fromSnapshot(snapshot.ladders);
  if (snapshot.winches) game.winches.fromSnapshot(snapshot.winches);
  if (snapshot.depots) game.fieldDepots.fromSnapshot(snapshot.depots);
  game.environment.setFootprintStage(computeFootprintStage(game.run.day));
  const hasDustClause = game.run.loadout.clauses?.includes('suspended_dust') ?? false;
  const hasDustFilter = hasUtilityActive(game.run.loadout, 'dust_filter');
  game.environment.setSuspendedDust(hasDustClause && !hasDustFilter);
  game.environment.updatePlatformDepth(game.run.platformDepth || 0);
  game.hopper.setPlatformDepth(game.run.platformDepth || 0);
  game.player.setPlatformDepth(game.run.platformDepth || 0);
  if (snapshot.beacons) game.beacons.fromSnapshot(snapshot.beacons);
  if (snapshot.brigades && snapshot.sectors && game.brigades) {
    game.brigades.fromSnapshot(snapshot.brigades, snapshot.sectors);
  }
  if (snapshot.conveyors && game.conveyors) {
    game.conveyors.fromSnapshot(snapshot.conveyors);
  }
  game.remoteStates.clear();
  game.rewardedChests.clear();
  game.lastHudSignature = '';
  game.staffVisualAccumulator = 0;
  game.tools.setActive(game.activeWeapon, false);
  game.tools.setPatent(game.run.loadout.patent ?? 0);
  game.ui.showLoading('GENERANDO POZO…');
  game.terrain.generate(game.seed, game.run.map ?? 'standard');
  game.missions.generate(
    game.seed,
    game.run.day,
    game.run.map ?? 'standard',
    game.terrain,
  );
  game.resources.generate(
    game.seed,
    game.run.day,
    game.terrain,
    game.run.modifiers ?? [],
    game.run.map ?? 'standard',
    game.missions.getExclusions(),
  );
  game.missions.bindSampleNodes(game.resources);
  if (snapshot.missions && snapshot.missions.length > 0) {
    game.missions.fromSnapshot(snapshot.missions);
  }
  game.terrain.applyCarveHistory(snapshot.carveHistory);
  for (const nodeId of snapshot.brokenNodes) {
    game.resources.markBroken(nodeId);
  }
  for (const [nodeId, hp] of Object.entries(snapshot.nodeHp)) {
    game.resources.setNodeHp(nodeId, hp);
  }
  game.loot.clear();
  game.player.setTerrain(game.terrain);
  game.player.setLoadout(game.run.loadout);
  game.player.spawnAtSurface();
  game.hopper.update(0, game.run.carbon, game.run.quota);
  if (authority) {
    game.staffManager.configure(game.terrain, game.resources, game.loot, game.run.loadout);
    game.staffAvatars.applyStates(game.staffManager.getStates());
  } else {
    game.staffManager.clear();
    game.staffAvatars.applyStates(snapshot.staff);
  }
  game.remoteAvatars.setRoster(game.roster);
  game.remoteAvatars.applyStates(snapshot.players);
  game.ui.hideLoading();
  game.ui.hideMenu();
  game.ui.hideLobby();
  game.ui.hideShop();
  game.ui.hideDaySummary();
  game.ui.hidePause();
  game.ui.hideGameOver();
  game.ui.hideNetworkError();
  game.ui.showHud();
  game.input.setEnabled(true);
  game.ui.updateAim(null);
  game.updateHud();
  game.ui.setObjective(game.computeObjective());
  applyPixelMode(game, true);
  const hasDust = game.run.loadout.clauses?.includes('suspended_dust') ?? false;
  const filterOk = hasUtilityActive(game.run.loadout, 'dust_filter');
  game.environment.setSuspendedDust(hasDust && !filterOk);
  if (!authority) {
    game.ui.notify('Pozo sincronizado. Haz clic en la escena para capturar el ratón.', 'info');
  }
}

export function applyShopSnapshot(game: Game, snapshot: DaySnapshot): void {
  game.run = {
    day: snapshot.day,
    money: snapshot.money,
    carbon: snapshot.carbon,
    quota: snapshot.quota,
    timeLeft: snapshot.timeLeft,
    infinite: snapshot.infinite,
    mode: snapshot.mode ?? 'normal',
    modifiers: snapshot.modifiers ?? [],
    map: snapshot.map ?? 'standard',
    loadout: cloneLoadout(snapshot.loadout),
    stats: cloneStats(snapshot.stats),
    platformDepth: snapshot.platformDepth || 0,
  };
  game.seed = snapshot.seed >>> 0;
  game.dayMoneyBase = snapshot.dayMoneyBase;
  game.hopperTripsToday = 0;
  game.resetDaySettlement();
  game.dayReport = snapshot.dayReport;
  game.phase = 'shop';
  game.shopSuccess = true;
  game.shopVictory =
    (snapshot.day === VICTORY_DAY || snapshot.day === TRUE_VICTORY_DAY) &&
    !snapshot.infinite &&
    (snapshot.mode ?? 'normal') !== 'peaceful';
  game.syncEquipmentInventory();
  game.input.setEnabled(false);
  game.input.unlock();
  game.tools.setVisible(false);
  game.player.headlamp.visible = false;
  game.ui.hideLoading();
  game.ui.hideLobby();
  game.ui.hideHud();
  game.ui.hideDaySummary();
  game.ui.showShop(buildShopView(game));
  updateOfficeCamera(game);
  applyPixelMode(game, true);
  game.remoteAvatars.clear();
  game.staffAvatars.clear();
  game.staffManager.clear();
  game.ladders.clear();
  game.clearCargo();
  game.closeInventory();
}

export function finishDay(game: Game): void {
  if (game.phase !== 'playing' || game.role === 'client' || game.finishing) {
    return;
  }
  game.finishing = true;
  game.pendingPickaxeStrike = 0;
  game.closeInventory();
  game.paused = false;
  game.input.setEnabled(false);
  game.input.unlock();
  game.tools.setVisible(false);
  game.player.headlamp.visible = false;
  clearProjectiles(game);
  discardCargo(game, 'La carga que no llegó a la tolva se ha perdido al cerrar el turno.');
  const success = game.run.carbon >= game.run.quota;
  const victory =
    success &&
    (game.run.mode ?? 'normal') !== 'peaceful' &&
    !game.run.infinite &&
    (game.run.day === VICTORY_DAY || game.run.day === TRUE_VICTORY_DAY);
  const oreValue = Math.max(0, game.run.money - game.dayMoneyBase);
  const duration = dayDuration(game.run.loadout);
  const preview = buildDayReport(
    game.dayLedger,
    game.run.day,
    game.run.carbon,
    game.run.quota,
    oreValue,
    game.run.money,
    game.securedAt,
    duration,
    {
      clauses: game.run.loadout.clauses,
      modifiers: game.run.modifiers ?? [],
      doctrine: game.run.loadout.doctrine,
    },
  );
  if (success) {
    const settlementProfit = preview.bonus + preview.punctuality + preview.surplusCapital;
    game.run.money += settlementProfit;
    game.run.stats.moneyEarned += settlementProfit;
  }
  const report = buildDayReport(
    game.dayLedger,
    game.run.day,
    game.run.carbon,
    game.run.quota,
    oreValue,
    game.run.money,
    game.securedAt,
    duration,
    {
      clauses: game.run.loadout.clauses,
      modifiers: game.run.modifiers ?? [],
      doctrine: game.run.loadout.doctrine,
    },
  );
  game.dayReport = report;
  if (success) {
    game.run.stats.daysCompleted += 1;
    game.phase = 'shop';
    game.shopSuccess = true;
    game.shopVictory = victory;
    game.ui.hideHud();
    game.ui.showDaySummary(report);
    updateOfficeCamera(game);
    applyPixelMode(game, true);
    if (victory) {
      game.audio.playVictory();
    } else {
      game.audio.playDayComplete(true);
    }
    saveRun(game, false);
    if (game.online && game.role === 'host' && game.network) {
      game.network.broadcast({
        t: 'day_result',
        v: PROTOCOL_VERSION,
        success: true,
        victory,
        day: game.run.day,
        carbon: game.run.carbon,
        quota: game.run.quota,
        money: game.run.money,
        loadout: cloneLoadout(game.run.loadout),
        stats: cloneStats(game.run.stats),
        report,
        infinite: game.run.infinite,
        message: victory
          ? 'La junta aprueba la explotación. Has alcanzado la victoria corporativa.'
          : 'Cuota cubierta. La oficina nocturna abre sus catálogos.',
      });
    }
  } else {
    game.phase = 'gameover';
    game.shopSuccess = false;
    game.shopVictory = false;
    game.ui.hideHud();
    game.ui.showGameOver({
      victory: false,
      message: `Faltaron ${formatNumber(game.run.quota - game.run.carbon)} t de carbón. La junta cierra el expediente.`,
      stats: game.run.stats,
    });
    updateOfficeCamera(game);
    applyPixelMode(game, true);
    game.audio.playDayComplete(false);
    game.saves.clear();
    if (game.online && game.role === 'host' && game.network) {
      game.network.broadcast({
        t: 'game_over',
        v: PROTOCOL_VERSION,
        stats: cloneStats(game.run.stats),
        message: `Cuota incumplida por ${formatNumber(game.run.quota - game.run.carbon)} t. Expediente clausurado.`,
      });
    }
  }
  game.finishing = false;
}

export function startNextDay(game: Game): void {
  if (game.phase !== 'shop' || !game.shopSuccess || game.role === 'client') {
    return;
  }
  if (game.shopVictory && game.run.day >= TRUE_VICTORY_DAY && !game.run.infinite) {
    game.run.infinite = true;
  }
  game.shopVictory = false;
  game.shopSuccess = false;
  game.ui.hideDaySummary();
  game.run.day += 1;
  game.run.carbon = 0;
  game.run.money = Math.max(0, game.run.money);
  const playerCount =
    game.online && game.network ? game.network.getPlayerCount() : 1;
  const rawQuota = quotaForDay(
    game.run.day,
    playerCount,
    game.run.mode ?? 'normal',
    game.run.modifiers ?? [],
  );
  const modifiedQuota = computeQuotaWithModifiers(
    rawQuota,
    game.run.loadout.doctrine,
    game.run.loadout.clauses,
  );
  const { applied, effectiveQuota, remainingReserve } = computeReserveApplication(
    modifiedQuota,
    game.run.loadout.reserveCarbon ?? 0,
  );
  game.run.loadout.reserveCarbon = remainingReserve;
  game.run.quota = effectiveQuota;
  game.run.timeLeft = computeDayDurationWithModifiers(
    dayDuration(game.run.loadout),
    game.run.loadout.doctrine,
    game.run.loadout.clauses,
  );
  game.seed = randomSeed();
  game.carveHistory = [];
  game.ui.hideShop();
  game.ui.hideLoading();
  if (applied > 0) {
    game.ui.notify(`FONDO DE RESERVA · ${applied} t amortizadas con la reserva corporativa.`, 'positive');
  }
  game.environment.setFootprintStage(computeFootprintStage(game.run.day));
  const hasDustClause = game.run.loadout.clauses?.includes('suspended_dust') ?? false;
  const hasDustFilter = hasUtilityActive(game.run.loadout, 'dust_filter');
  game.environment.setSuspendedDust(hasDustClause && !hasDustFilter);
  beginAuthorityDay(game, game.online && game.role === 'host');
  saveRun(game, false);
}

export function saveRun(game: Game, showUi = true): boolean {
  if (
    game.role === 'client' ||
    game.phase === 'menu' ||
    game.phase === 'lobby' ||
    game.phase === 'gameover'
  ) {
    return false;
  }
  const saveInShop = game.phase === 'shop' && game.shopSuccess;
  const saved = game.saves.save({
    day: saveInShop ? game.run.day + 1 : game.run.day,
    money: game.run.money,
    infinite:
      game.run.infinite ||
      (saveInShop && game.shopVictory && game.run.day >= TRUE_VICTORY_DAY),
    mode: game.run.mode ?? 'normal',
    modifiers: game.run.modifiers ?? [],
    map: game.run.map ?? 'standard',
    loadout: cloneLoadout(game.run.loadout),
    stats: cloneStats(game.run.stats),
    playerName: game.ui.getPlayerName(),
    platformDepth: game.run.platformDepth || 0,
  });
  if (saved && showUi) {
    game.ui.setSaved();
  }
  return saved;
}

export function applyDayResult(
  game: Game,
  message: Extract<GameHostMessage, { t: 'day_result' }>,
): void {
  game.run.carbon = message.carbon;
  game.run.quota = message.quota;
  game.run.money = message.money;
  game.run.loadout = cloneLoadout(message.loadout);
  game.run.stats = cloneStats(message.stats);
  game.run.infinite = message.infinite;
  game.run.day = message.day;
  game.dayReport = message.report;
  discardCargo(game, 'La carga que no llegó a la tolva se ha perdido al cerrar el turno.');
  game.syncEquipmentInventory();
  game.phase = message.success ? 'shop' : 'gameover';
  game.shopSuccess = message.success;
  game.shopVictory = message.victory;
  game.input.setEnabled(false);
  game.input.unlock();
  game.tools.setVisible(false);
  game.player.headlamp.visible = false;
  game.ui.hideHud();
  game.audio.playDayComplete(message.success);
  if (message.success) {
    game.ui.showDaySummary(message.report);
    updateOfficeCamera(game);
    applyPixelMode(game, true);
  } else {
    game.ui.showGameOver({
      victory: false,
      message: message.message,
      stats: game.run.stats,
    });
    updateOfficeCamera(game);
    applyPixelMode(game, true);
  }
}

export function showGameOverFromHost(game: Game, message: string, stats: RunStats): void {
  game.run.stats = cloneStats(stats);
  discardCargo(game, 'La carga pendiente se ha perdido.');
  game.phase = 'gameover';
  game.input.setEnabled(false);
  game.input.unlock();
  game.tools.setVisible(false);
  game.player.headlamp.visible = false;
  game.ui.hideHud();
  game.audio.playDayComplete(false);
  game.ui.showGameOver({
    victory: false,
    message,
    stats: game.run.stats,
  });
  updateOfficeCamera(game);
  applyPixelMode(game, true);
}
