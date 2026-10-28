import {
  PROTOCOL_VERSION,
  type ClientMessage,
  type DaySnapshot,
  type GameClientMessage,
  type GameHostMessage,
  type PlayerWireState,
} from '../network/Protocol';
import type { NetworkCallbacks } from '../network/PeerNetwork';
import type { NetworkPlayerState } from '../types';
import type { LobbyViewData } from '../ui/UI';
import {
  ECONOMY_INTERVAL,
  PLAYER_NET_INTERVAL,
  STAFF_NET_INTERVAL,
} from './GameConstants';
import { handleClientMessage, handleHostMessage } from './NetworkMessages';
import { cloneLoadout, cloneStats } from './RunState';
import { BigValue } from './BigValue';
import { moneyWire } from './Economy';
import type { Game } from './Game';

export function networkCallbacks(game: Game): NetworkCallbacks {
  return {
    onReady: (selfId, _hostId, roster, roomCode, role) => {
      game.online = true;
      game.role = role;
      game.selfPeerId = selfId;
      game.roster = [...roster];
      game.remoteAvatars.setLocalId(selfId);
      game.remoteAvatars.setRoster(roster);
      game.phase = 'lobby';
      game.ui.setMenuBusy(false);
      game.ui.showLobby(buildLobbyView(game, roomCode, role));
    },
    onRoster: (roster) => {
      game.roster = [...roster];
      game.remoteAvatars.setRoster(roster);
      if (game.phase === 'lobby' && game.network) {
        game.ui.updateLobby({
          ...buildLobbyView(
            game,
            game.network.getRoomCode(),
            game.role === 'host' ? 'host' : 'client',
          ),
          roster: [...roster],
        });
      }
      game.updateHud();
    },
    onMessage: (message, fromId) => {
      if (!game.online) {
        return;
      }
      if (game.role === 'host') {
        const clientMessage = message as ClientMessage;
        if ((clientMessage as { t: string }).t !== 'hello') {
          handleClientMessage(game, clientMessage as GameClientMessage, fromId);
        }
      } else {
        handleHostMessage(game, message as GameHostMessage);
      }
    },
    onPeerJoined: (peerId) => {
      if (game.role !== 'host' || !game.network) {
        return;
      }
      const peer = game.roster.find((entry) => entry.id === peerId);
      if (game.phase === 'menu' || game.phase === 'lobby') {
        game.ui.notify(`${peer?.name ?? 'Un operario'} se ha unido a la sala.`, 'info');
        return;
      }
      if (game.phase === 'gameover') {
        game.network.sendTo(peerId, {
          t: 'disconnect',
          v: PROTOCOL_VERSION,
          reason: 'La operación ya ha finalizado.',
        });
        return;
      }
      sendSnapshotTo(game, peerId);
      game.ui.notify(`${peer?.name ?? 'Un operario'} se ha sincronizado con el pozo.`, 'info');
      game.audio.playUi();
    },
    onPeerLeft: (peerId) => {
      const peer = game.roster.find((entry) => entry.id === peerId);
      game.remoteStates.delete(peerId);
      if (game.phase === 'playing' || game.phase === 'shop') {
        game.ui.notify(`${peer?.name ?? 'Un operario'} ha abandonado la operación.`, 'danger');
      }
    },
    onError: (message) => {
      if (game.phase === 'menu' || game.phase === 'lobby') {
        game.ui.setLobbyStatus(
          game.role === 'host' ? 'Error en el enlace P2P.' : 'Error en el enlace P2P.',
          message,
        );
        if (game.phase === 'menu') {
          game.ui.setMenuError(message);
        }
      } else {
        game.ui.notify(message, 'danger');
      }
    },
    onClosed: (reason) => {
      if (game.networkCloseIntentional) {
        game.networkCloseIntentional = false;
        return;
      }
      handleNetworkClosed(game, reason);
    },
  };
}

export function buildLobbyView(
  game: Game,
  roomCode: string,
  role: 'host' | 'client',
): LobbyViewData {
  return {
    code: roomCode,
    role,
    roster: game.roster,
    status:
      role === 'host'
        ? 'Sala abierta. Comparte el código con tu escuadrón.'
        : 'Conectado al anfitrión. Esperando el inicio del turno.',
    error: '',
    canStart: role === 'host',
  };
}

export function handleNetworkClosed(game: Game, reason: string): void {
  game.network = null;
  game.online = false;
  game.role = 'solo';
  game.roster = [];
  game.remoteStates.clear();
  game.remoteAvatars.clear();
  game.staffAvatars.clear();
  game.staffManager.clear();
  game.input.setEnabled(false);
  game.input.unlock();
  game.tools.setVisible(false);
  game.player.headlamp.visible = false;
  game.audio.playDisconnect();
  const wasLobbyOrMenu = game.phase === 'lobby' || game.phase === 'menu';
  game.phase = 'menu';
  game.paused = false;
  game.ui.hideHud();
  game.ui.hideShop();
  game.ui.hideLobby();
  if (wasLobbyOrMenu) {
    game.ui.hideNetworkError();
    game.ui.setMenuBusy(false);
    game.ui.showMenu(game.saves.summary());
    game.ui.setMenuError(reason || 'No se pudo mantener la conexión.');
  } else {
    game.ui.showNetworkError(reason || 'La sesión cooperativa ha finalizado.');
  }
}

export function sendSnapshotTo(game: Game, peerId: string): void {
  if (!game.network || game.role !== 'host') {
    return;
  }
  const snapshot = buildSnapshot(game);
  game.network.sendTo(peerId, {
    t: 'sync',
    v: PROTOCOL_VERSION,
    snapshot,
  });
}

export function buildSnapshot(game: Game): DaySnapshot {
  return {
    phase: game.phase === 'shop' ? 'shop' : 'playing',
    day: game.run.day,
    seed: game.seed,
    quota: game.run.quota,
    timeLeft: game.run.timeLeft,
    money: game.run.money,
    carbon: game.run.carbon,
    dayMoneyBase: game.dayMoneyBase,
    dayMoneyWire: game.dayMoneyBaseBig.toWire(),
    dayReport: game.dayReport,
    infinite: game.run.infinite,
    mode: game.run.mode ?? 'normal',
    modifiers: game.run.modifiers ?? [],
    map: game.run.map ?? 'standard',
    loadout: cloneLoadout(game.run.loadout),
    stats: cloneStats(game.run.stats),
    carveHistory: game.phase === 'playing' ? [...game.carveHistory] : [],
    brokenNodes: game.resources.getBrokenIds(),
    nodeHp: game.resources.getDamagedSnapshot(),
    players: getAllHostStates(game),
    staff: game.staffManager.getStates(),
    ladders: game.ladders.getSnapshot(),
    winches: game.winches ? game.winches.getSnapshot() : [],
    depots: game.fieldDepots ? game.fieldDepots.getSnapshot() : [],
    beacons: game.beacons ? game.beacons.getSnapshot() : [],
    brigades: game.brigades ? [...game.brigades.getBrigades()] : [],
    sectors: game.brigades ? [...game.brigades.getSectors()] : [],
    conveyors: game.conveyors ? [...game.conveyors.getModules()] : [],
    missions: game.missions ? game.missions.getSnapshot() : [],
    moneyWire: moneyWire(game.run),
    carbonWire: BigValue.fromNumber(game.run.carbon).toWire(),
    quotaWire: BigValue.fromNumber(game.run.quota).toWire(),
    platformDepth: game.run.platformDepth || 0,
  };
}

export function getAllHostStates(game: Game): NetworkPlayerState[] {
  const states: NetworkPlayerState[] = [];
  const self = game.roster.find((entry) => entry.id === game.selfPeerId);
  states.push({
    id: game.selfPeerId || 'host',
    name: self?.name ?? game.ui.getPlayerName(),
    color: self?.color ?? 0,
    x: game.player.getPosition().x,
    y: game.player.getPosition().y,
    z: game.player.getPosition().z,
    yaw: game.player.getLookAngles().yaw,
    pitch: game.player.getLookAngles().pitch,
    weapon: game.activeWeapon,
    jetpack: game.player.isJetpackActive(),
    mining: game.input.isAttacking(),
  });
  for (const entry of game.roster) {
    if (entry.id === game.selfPeerId) {
      continue;
    }
    const state = game.remoteStates.get(entry.id);
    if (state) {
      states.push({
        ...state,
        name: entry.name,
        color: entry.color,
      });
    }
  }
  return states;
}

export function hostNetworkTick(game: Game, dt: number): void {
  if (!game.network) {
    return;
  }
  game.playerSendAccumulator += dt;
  if (game.playerSendAccumulator >= PLAYER_NET_INTERVAL) {
    game.playerSendAccumulator = 0;
    game.network.broadcast({
      t: 'players',
      v: PROTOCOL_VERSION,
      states: getAllHostStates(game),
    });
  }
  game.staffSendAccumulator += dt;
  if (game.staffSendAccumulator >= STAFF_NET_INTERVAL) {
    game.staffSendAccumulator = 0;
    const states = game.staffManager.getStates();
    game.network.broadcast({
      t: 'staff',
      v: PROTOCOL_VERSION,
      states,
    });
  }
  game.economySendAccumulator += dt;
  if (game.economySendAccumulator >= ECONOMY_INTERVAL) {
    game.economySendAccumulator = 0;
    broadcastEconomy(game);
  }
}

export function broadcastEconomy(game: Game): void {
  if (!game.online || game.role !== 'host' || !game.network) {
    return;
  }
  game.network.broadcast({
    t: 'economy',
    v: PROTOCOL_VERSION,
    money: game.run.money,
    moneyWire: moneyWire(game.run),
    carbon: game.run.carbon,
    timeLeft: game.run.timeLeft,
    day: game.run.day,
    quota: game.run.quota,
    ladders: game.run.loadout.ladders,
    grenades: { ...game.run.loadout.grenades },
  });
}

export function clientNetworkTick(game: Game, dt: number): void {
  if (!game.network) {
    return;
  }
  game.playerSendAccumulator += dt;
  if (game.playerSendAccumulator >= PLAYER_NET_INTERVAL) {
    game.playerSendAccumulator = 0;
    const state: PlayerWireState = {
      x: game.player.getPosition().x,
      y: game.player.getPosition().y,
      z: game.player.getPosition().z,
      yaw: game.player.getLookAngles().yaw,
      pitch: game.player.getLookAngles().pitch,
      weapon: game.activeWeapon,
      jetpack: game.player.isJetpackActive(),
      mining: game.input.isAttacking(),
    };
    game.network.sendToHost({
      t: 'state',
      v: PROTOCOL_VERSION,
      state,
    });
  }
}
