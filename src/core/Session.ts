import {
  LADDER_ORIENTATION_LABELS,
  LADDER_ORIENTATION_ORDER,
  WEAPON_ORDER,
  dayDuration,
  quotaForDay,
} from '../config';
import { PeerNetwork } from '../network/PeerNetwork';
import type { DifficultyModifier, GameMode, LadderOrientation, Loadout, WeaponId } from '../types';
import {
  applyProfessionStartingKit,
  professionCanUseWeapon,
} from '../data/professions';
import { BigValue } from './BigValue';
import { randomSeed } from './Rng';
import { cloneLoadout, cloneStats, defaultRun } from './RunState';
import type { Game } from './Game';

export function startSolo(game: Game): void {
  void game.audio.init();
  if (game.network) {
    closeNetwork(game, false);
  }
  game.saves.saveName(game.ui.getPlayerName());
  game.online = false;
  game.role = 'solo';
  game.roster = [];
  game.selfPeerId = '';
  game.remoteAvatars.clear();
  game.staffAvatars.clear();
  game.remoteStates.clear();
  game.run = defaultRun();
  const config = game.ui.getRunConfig();
  game.run.mode = config.mode;
  game.run.modifiers = config.modifiers;
  game.run.map = config.map;
  game.run.loadout.profession = config.profession;
  applyProfessionStartingKit(game.run.loadout);
  game.run.quota = quotaForDay(1, 1, config.mode, config.modifiers);
  game.carveHistory = [];
  game.resetInventory();
  game.clearCargo();
  game.closeInventory();
  game.ladderCounter = 0;
  game.ladders.clear();
  game.shopVictory = false;
  game.shopSuccess = false;
  game.seed = randomSeed();
  game.beginAuthorityDay();
  game.saveRun(false);
}

export function continueRun(game: Game): void {
  const saved = game.saves.load();
  if (!saved) {
    game.ui.setMenuError('No hay un expediente válido que recuperar.');
    return;
  }
  void game.audio.init();
  if (game.network) {
    closeNetwork(game, false);
  }
  game.saves.saveName(game.ui.getPlayerName());
  const loadout = cloneLoadout(saved.loadout);
  const mode: GameMode = saved.mode ?? 'normal';
  const modifiers: DifficultyModifier[] = saved.modifiers ?? [];
  const map = saved.map ?? 'standard';
  game.online = false;
  game.role = 'solo';
  game.roster = [];
  game.selfPeerId = '';
  game.remoteAvatars.clear();
  game.staffAvatars.clear();
  game.remoteStates.clear();
  game.run = {
    day: saved.day,
    money: saved.money,
    moneyBig: BigValue.fromWire(saved.moneyWire ?? String(saved.money)),
    carbon: 0,
    quota: quotaForDay(saved.day, 1, mode, modifiers),
    timeLeft: dayDuration(loadout),
    infinite: saved.infinite,
    mode,
    modifiers,
    map,
    loadout,
    stats: cloneStats(saved.stats),
    platformDepth: saved.platformDepth || 0,
  };
  game.carveHistory = [];
  game.shopVictory = false;
  game.shopSuccess = false;
  game.resetInventory();
  game.seed = randomSeed();
  game.beginAuthorityDay();
  game.saveRun(false);
}

export function leaveLobby(game: Game): void {
  game.networkCloseIntentional = true;
  if (game.network) {
    game.network.close('Has abandonado el lobby.');
    game.network = null;
  }
  game.online = false;
  game.role = 'solo';
  game.roster = [];
  game.selfPeerId = '';
  game.remoteStates.clear();
  game.remoteAvatars.clear();
  game.ui.setMenuBusy(false);
  game.phase = 'menu';
  game.ui.showMenu(game.saves.summary());
}

export function leaveGame(game: Game): void {
  game.saveRun(false);
  returnToMenu(game);
}

export async function createRoom(game: Game, name: string): Promise<void> {
  if (game.phase !== 'menu' && game.phase !== 'lobby') {
    return;
  }
  game.saves.saveName(name);
  game.ui.setMenuBusy(true, 'CREANDO SALA…');
  game.ui.clearMenuError();
  game.networkCloseIntentional = false;
  game.remoteAvatars.clear();
  game.remoteStates.clear();
  game.roster = [];
  void game.audio.init();
  try {
    const network = await PeerNetwork.host(name, game.networkCallbacks());
    game.network = network;
    game.ui.setMenuBusy(false);
    if (game.phase === 'lobby') {
      game.ui.updateLobby(game.buildLobbyView(network.getRoomCode(), 'host'));
    }
  } catch (error) {
    game.network = null;
    game.ui.setMenuBusy(false);
    game.ui.setMenuError(errorMessage(error));
  }
}

export async function joinRoom(game: Game, name: string, code: string): Promise<void> {
  if (game.phase !== 'menu' && game.phase !== 'lobby') {
    return;
  }
  game.saves.saveName(name);
  const normalized = code.trim().toUpperCase();
  if (normalized.length !== 6) {
    game.ui.setMenuError('Introduce un código corporativo de 6 caracteres.');
    return;
  }
  game.ui.setMenuBusy(true, 'CONECTANDO…');
  game.ui.clearMenuError();
  game.networkCloseIntentional = false;
  game.remoteAvatars.clear();
  game.remoteStates.clear();
  game.roster = [];
  void game.audio.init();
  try {
    const network = await PeerNetwork.join(name, normalized, game.networkCallbacks());
    game.network = network;
    game.ui.setMenuBusy(false);
    if (game.phase === 'lobby') {
      game.ui.updateLobby(game.buildLobbyView(network.getRoomCode(), 'client'));
    }
  } catch (error) {
    game.network = null;
    game.ui.setMenuBusy(false);
    game.ui.setMenuError(errorMessage(error));
  }
}

export function startOnlineMatch(game: Game): void {
  if (!game.network || game.role !== 'host' || game.phase !== 'lobby') {
    return;
  }
  void game.audio.init();
  game.run = defaultRun();
  const config = game.ui.getRunConfig();
  game.run.mode = config.mode;
  game.run.modifiers = config.modifiers;
  game.run.map = config.map;
  game.run.loadout.profession = config.profession;
  applyProfessionStartingKit(game.run.loadout);
  const players = game.network.getPlayerCount();
  game.run.quota = quotaForDay(1, players, config.mode, config.modifiers);
  game.seed = randomSeed();
  game.carveHistory = [];
  game.shopVictory = false;
  game.shopSuccess = false;
  game.resetInventory();
  game.clearCargo();
  game.closeInventory();
  game.ladderCounter = 0;
  game.ladders.clear();
  game.ui.hideLobby();
  game.beginAuthorityDay(true);
  game.saveRun(false);
}

export function returnToMenu(game: Game): void {
  if (game.network) {
    game.networkCloseIntentional = true;
    game.network.close('Operación abandonada.');
    game.network = null;
  }
  game.online = false;
  game.role = 'solo';
  game.roster = [];
  game.selfPeerId = '';
  game.remoteStates.clear();
  game.remoteAvatars.clear();
  game.staffAvatars.clear();
  game.staffManager.clear();
  game.clearProjectiles();
  game.clearCargo();
  game.closeInventory();
  game.input.setEnabled(false);
  game.input.unlock();
  game.tools.setVisible(false);
  game.player.headlamp.visible = false;
  closeLadderDial(game, false);
  game.paused = false;
  game.phase = 'menu';
  game.ui.hideHud();
  game.ui.hideShop();
  game.ui.hideLobby();
  game.ui.hidePause();
  game.ui.hideGameOver();
  game.ui.hideNetworkError();
  game.ui.showMenu(game.saves.summary());
  game.ui.setMenuBusy(false);
  game.audio.setDrillActive(false);
  game.audio.setJetpackActive(false);
  game.updateMenuCamera();
  game.applyPixelMode(true);
}

export function toggleMute(game: Game): void {
  game.audio.toggleMuted();
  game.audio.playUi();
  game.updateHud();
}

export function pauseGame(game: Game): void {
  if (game.phase !== 'playing') {
    return;
  }
  closeLadderDial(game, false);
  if (game.input.isLocked()) {
    game.input.unlock();
  } else {
    game.closeInventory();
    game.paused = true;
    game.ui.showPause(game.online, game.role === 'host');
  }
}

export function resumeGame(game: Game): void {
  if (game.phase !== 'playing') {
    return;
  }
  game.paused = false;
  game.ui.hidePause();
  void game.input.requestLock();
}

export function handleLockChange(game: Game, locked: boolean): void {
  if (locked) {
    game.hasLockedOnce = true;
    game.paused = false;
    game.ui.hidePause();
    if (game.inventoryOpen) {
      game.closeInventory();
    }
    return;
  }
  game.pendingPickaxeStrike = 0;
  if (game.inventoryOpen && game.phase === 'playing') {
    game.paused = true;
    return;
  }
  game.closeInventory();
  if (game.phase !== 'playing') {
    return;
  }
  if (game.hasLockedOnce) {
    game.paused = true;
    game.ui.showPause(game.online, game.role === 'host');
  }
}

export function toggleLadderPlacement(game: Game): void {
  game.ladderPlacementEnabled = !game.ladderPlacementEnabled;
  if (!game.ladderPlacementEnabled) {
    closeLadderDial(game, false);
    game.ladders.clearGhost();
  }
  game.audio.playUi();
  game.ui.notify(
    game.ladderPlacementEnabled
      ? 'MODO ESCALERA ACTIVADO · apunta a una pared, al suelo o a otra escalera.'
      : 'MODO ESCALERA DESACTIVADO · la vista queda libre.',
    'info',
  );
  game.lastHudSignature = '';
  game.updateHud();
}

export function toggleLadderOrientation(game: Game): void {
  if (game.ladderDialOpen) {
    return;
  }
  const index = LADDER_ORIENTATION_ORDER.indexOf(game.ladderOrientation);
  game.ladderOrientation =
    LADDER_ORIENTATION_ORDER[(index + 1) % LADDER_ORIENTATION_ORDER.length];
  game.audio.playUi();
  game.ui.notify(`ORIENTACIÓN · ${LADDER_ORIENTATION_LABELS[game.ladderOrientation]}`, 'info');
  game.lastHudSignature = '';
  game.updateHud();
}

const DIAL_DEADZONE = 18;
const DIAL_RADIUS = 104;

export function openLadderDial(game: Game): boolean {
  if (
    game.phase !== 'playing' ||
    !game.ladderPlacementEnabled ||
    game.run.loadout.ladders <= 0 ||
    game.ladderDialOpen
  ) {
    return false;
  }
  game.ladderDialOpen = true;
  game.ladderDialStartOrientation = game.ladderOrientation;
  game.ladderDialPointerX = 0;
  game.ladderDialPointerY = 0;
  game.ui.showLadderDial(game.ladderOrientation, 0, 0);
  game.audio.playUi();
  return true;
}

export function moveLadderDial(game: Game, dx: number, dy: number): void {
  if (!game.ladderDialOpen) {
    return;
  }
  game.ladderDialPointerX = Math.max(
    -DIAL_RADIUS,
    Math.min(DIAL_RADIUS, game.ladderDialPointerX + dx),
  );
  game.ladderDialPointerY = Math.max(
    -DIAL_RADIUS,
    Math.min(DIAL_RADIUS, game.ladderDialPointerY + dy),
  );
  const pointerLength = Math.hypot(
    game.ladderDialPointerX,
    game.ladderDialPointerY,
  );
  if (pointerLength >= DIAL_DEADZONE) {
    // Las opciones están arriba, derecha, abajo e izquierda del dial.
    const scores: Array<[LadderOrientation, number]> = [
      ['vertical', -game.ladderDialPointerY],
      ['diagonal-up', game.ladderDialPointerX],
      ['horizontal', game.ladderDialPointerY],
      ['diagonal-down', -game.ladderDialPointerX],
    ];
    let bestOrientation = game.ladderOrientation;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const [orientation, score] of scores) {
      if (score > bestScore + 0.001) {
        bestScore = score;
        bestOrientation = orientation;
      }
    }
    if (bestOrientation !== game.ladderOrientation) {
      game.ladderOrientation = bestOrientation;
      game.audio.playUi();
      game.lastHudSignature = '';
    }
  }
  game.ui.updateLadderDial(
    game.ladderOrientation,
    game.ladderDialPointerX,
    game.ladderDialPointerY,
  );
}

export function closeLadderDial(game: Game, commit: boolean): void {
  if (!game.ladderDialOpen) {
    return;
  }
  game.ladderDialOpen = false;
  game.ladderDialPointerX = 0;
  game.ladderDialPointerY = 0;
  if (!commit) {
    game.ladderOrientation = game.ladderDialStartOrientation;
  }
  game.ui.hideLadderDial();
  game.audio.playUi();
  game.lastHudSignature = '';
  game.updateHud();
}

export function firstOwnedWeapon(loadout: Loadout): WeaponId {
  for (const weapon of WEAPON_ORDER) {
    if (
      loadout.weapons[weapon] &&
      professionCanUseWeapon(loadout.profession, weapon)
    ) {
      return weapon;
    }
  }
  return 'pickaxe';
}

export function closeNetwork(game: Game, sendBye: boolean): void {
  if (!game.network) {
    return;
  }
  game.networkCloseIntentional = true;
  game.network.close(sendBye ? 'El anfitrión ha cerrado la sala.' : 'Conexión cerrada.');
  game.network = null;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo establecer la conexión P2P.';
}
