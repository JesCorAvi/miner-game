import * as THREE from 'three';
import {
  PROTOCOL_VERSION,
  type GameClientMessage,
  type GameHostMessage,
} from '../network/Protocol';
import { formatNumber } from '../ui/format';
import {
  breakNodeAsClient,
  breakNodeAsHost,
  recordCarve,
  showRemoteFx,
  spawnNodeHitEffect,
} from './Combat';
import {
  applyDayResult,
  applyShopSnapshot,
  loadSnapshot,
  showGameOverFromHost,
} from './DayCycle';
import { applyTeamDeposit } from './Interaction';
import { BigValue } from './BigValue';
import { moneyOf, setMoney } from './Economy';
import { cloneLoadout, cloneStats } from './RunState';
import { applyPurchase, broadcastShopState, buildShopView } from './ShopView';
import type { Game } from './Game';

export function handleClientMessage(
  game: Game,
  message: GameClientMessage,
  fromId: string,
): void {
  const entry = game.roster.find((item) => item.id === fromId);
  if (!entry) {
    return;
  }
  switch (message.t) {
    case 'state': {
      game.remoteStates.set(fromId, {
        id: fromId,
        name: entry.name,
        color: entry.color,
        ...message.state,
      });
      break;
    }
    case 'carve': {
      const changed = game.terrain.carve(message.e);
      if (!changed) {
        return;
      }
      recordCarve(game, message.e);
      game.network?.broadcast(
        {
          t: 'carve',
          v: PROTOCOL_VERSION,
          e: message.e,
          by: fromId,
        },
        fromId,
      );
      game.effects.spawnHit(
        new THREE.Vector3(message.e.x, message.e.y, message.e.z),
        0xb8a48b,
        0.5,
      );
      break;
    }
    case 'node_hit': {
      const result = game.resources.damage(message.id, message.dmg);
      if (!result) {
        return;
      }
      spawnNodeHitEffect(game, result.node);
      game.network?.broadcast(
        {
          t: 'node_hit',
          v: PROTOCOL_VERSION,
          id: message.id,
          dmg: message.dmg,
          by: fromId,
        },
        fromId,
      );
      if (result.broke) {
        breakNodeAsHost(game, result.node, fromId);
      }
      break;
    }
    case 'node_break': {
      const node = game.resources.getNode(message.id);
      if (node && !node.broken) {
        breakNodeAsHost(game, node, fromId);
      }
      break;
    }
    case 'mission_interact': {
      const state = game.remoteStates.get(fromId);
      if (state) {
        game.missions.interactRemote(game, message.moduleId, message.objectiveId, state);
      }
      break;
    }
    case 'deposit': {
      if (game.phase === 'playing') {
        applyTeamDeposit(game, message.coal, message.money, false, message.lines);
      }
      break;
    }
    case 'grenade_use': {
      if (game.phase !== 'playing') {
        break;
      }
      const stock = game.run.loadout.grenades[message.tier] ?? 0;
      if (stock > 0) {
        game.run.loadout.grenades[message.tier] = stock - 1;
        game.syncEquipmentInventory();
        game.broadcastEconomy();
        game.lastHudSignature = '';
      } else {
        game.broadcastEconomy();
      }
      break;
    }
    case 'ladder_place': {
      if (game.phase !== 'playing' || game.run.loadout.ladders <= 0) {
        game.broadcastEconomy();
        break;
      }
      if (game.ladders.add(message.ladder)) {
        game.run.loadout.ladders -= 1;
        game.network?.broadcast(
          {
            t: 'ladder_placed',
            v: PROTOCOL_VERSION,
            ladder: message.ladder,
          },
          fromId,
        );
        game.broadcastEconomy();
        game.lastHudSignature = '';
      }
      break;
    }
    case 'winch_place': {
      if (game.phase !== 'playing' || (game.run.loadout.winches ?? 0) <= 0) {
        break;
      }
      if (game.winches.add(message.winch)) {
        game.run.loadout.winches = Math.max(0, (game.run.loadout.winches ?? 0) - 1);
        game.network?.broadcast(
          {
            t: 'winch_placed',
            v: PROTOCOL_VERSION,
            winch: message.winch,
          },
          fromId,
        );
      }
      break;
    }
    case 'depot_place': {
      if (game.phase !== 'playing' || (game.run.loadout.fieldDepots ?? 0) <= 0) {
        break;
      }
      if (game.fieldDepots.add(message.depot)) {
        game.run.loadout.fieldDepots = Math.max(0, (game.run.loadout.fieldDepots ?? 0) - 1);
        game.network?.broadcast({
          t: 'depot_sync',
          v: PROTOCOL_VERSION,
          depots: game.fieldDepots.getSnapshot(),
        });
      }
      break;
    }
    case 'depot_interact': {
      if (message.depot) {
        game.fieldDepots.add(message.depot);
      }
      game.network?.broadcast({
        t: 'depot_sync',
        v: PROTOCOL_VERSION,
        depots: game.fieldDepots.getSnapshot(),
      });
      break;
    }
    case 'beacon_place': {
      if (game.phase !== 'playing' || (game.run.loadout.beacons ?? 0) <= 0) {
        break;
      }
      if (game.beacons.add(message.beacon)) {
        game.run.loadout.beacons = Math.max(0, (game.run.loadout.beacons ?? 0) - 1);
        game.network?.broadcast({
          t: 'beacon_sync',
          v: PROTOCOL_VERSION,
          beacons: game.beacons.getSnapshot(),
        });
      }
      break;
    }
    case 'sector_place': {
      if (game.brigades.addSector(message.beacon, game.terrain)) {
        game.network?.broadcast({
          t: 'brigade_state',
          v: PROTOCOL_VERSION,
          brigades: [...game.brigades.getBrigades()],
          sectors: [...game.brigades.getSectors()],
        });
      }
      break;
    }
    case 'belt_place': {
      if (game.conveyors.placeModule(message.module.x, message.module.y, message.module.z, message.module.dirX, message.module.dirZ, game.terrain)) {
        game.network?.broadcast({
          t: 'belt_state',
          v: PROTOCOL_VERSION,
          modules: [...game.conveyors.getModules()],
          isJammed: game.conveyors.isAnyJammed(),
        });
      }
      break;
    }
    case 'fx': {
      showRemoteFx(game, message.fx);
      game.network?.broadcast(
        {
          t: 'fx',
          v: PROTOCOL_VERSION,
          fx: message.fx,
          by: fromId,
        },
        fromId,
      );
      break;
    }
    case 'purchase': {
      if (game.phase === 'shop') {
        if (applyPurchase(game, message.itemId)) {
          broadcastShopState(game);
        }
      }
      break;
    }
  }
}

export function handleHostMessage(game: Game, message: GameHostMessage): void {
  switch (message.t) {
    case 'start_day': {
      loadSnapshot(game, message.snapshot, false);
      game.ui.showBanner(
        'TURNO SINCRONIZADO',
        `DÍA ${String(game.run.day).padStart(2, '0')} · CUOTA ${formatNumber(game.run.quota)} t`,
        2600,
      );
      break;
    }
    case 'sync': {
      if (message.snapshot.phase === 'playing') {
        loadSnapshot(game, message.snapshot, false);
        game.ui.showBanner(
          'TURNO EN CURSO',
          `DÍA ${String(game.run.day).padStart(2, '0')}`,
          2400,
        );
      } else if (message.snapshot.phase === 'shop') {
        applyShopSnapshot(game, message.snapshot);
      }
      break;
    }
    case 'players': {
      game.remoteAvatars.applyStates(message.states);
      break;
    }
    case 'staff': {
      game.staffAvatars.applyStates(message.states);
      break;
    }
    case 'carve': {
      game.terrain.carve(message.e);
      break;
    }
    case 'node_hit': {
      const result = game.resources.damage(message.id, message.dmg);
      if (result) {
        spawnNodeHitEffect(game, result.node);
      }
      break;
    }
    case 'node_break': {
      const node = game.resources.getNode(message.id);
      if (node && !node.broken) {
        breakNodeAsClient(game, node, message.dropSeed);
      }
      break;
    }
    case 'economy': {
      if (game.phase === 'playing') {
        const incomingMoney = BigValue.fromWire(message.moneyWire ?? String(message.money));
        if (incomingMoney.gt(moneyOf(game.run))) {
          setMoney(game.run, incomingMoney);
        }
        game.run.carbon = Math.max(game.run.carbon, message.carbon);
        game.run.timeLeft = message.timeLeft;
        game.run.day = message.day;
        game.run.quota = message.quota;
        game.run.loadout.ladders = message.ladders;
        game.run.loadout.grenades = { ...message.grenades };
        game.syncEquipmentInventory();
        game.lastHudSignature = '';
      }
      break;
    }
    case 'ladder_placed': {
      game.ladders.add(message.ladder);
      break;
    }
    case 'winch_placed': {
      game.winches.add(message.winch);
      break;
    }
    case 'depot_sync': {
      game.fieldDepots.fromSnapshot(message.depots);
      break;
    }
    case 'beacon_sync': {
      game.beacons.fromSnapshot(message.beacons);
      break;
    }
    case 'brigade_state': {
      break;
    }
    case 'belt_state': {
      break;
    }
    case 'mission_state': {
      const before = game.run.loadout.certifications?.length ?? 0;
      game.missions.applyRemote(message.modules);
      game.run.loadout = cloneLoadout(message.loadout);
      game.player.setLoadout(game.run.loadout);
      game.syncEquipmentInventory();
      const after = game.run.loadout.certifications?.length ?? 0;
      if (after > before) {
        game.ui.notify('CERTIFICACIÓN DE CAMPO DESBLOQUEADA · Revisa la oficina.', 'positive');
      }
      game.lastHudSignature = '';
      break;
    }
    case 'fx': {
      showRemoteFx(game, message.fx);
      break;
    }
    case 'day_result': {
      applyDayResult(game, message);
      break;
    }
    case 'shop_state': {
      setMoney(game.run, BigValue.fromWire(message.moneyWire ?? String(message.money)));
      game.run.loadout = cloneLoadout(message.loadout);
      game.run.stats = cloneStats(message.stats);
      game.run.quota = message.quota;
      game.run.day = message.day;
      game.run.infinite = message.infinite;
      game.player.setLoadout(game.run.loadout);
      game.syncEquipmentInventory();
      if (game.phase === 'shop') {
        game.ui.updateShop(buildShopView(game));
      }
      break;
    }
    case 'passive': {
      game.run.loadout = cloneLoadout(message.loadout);
      game.player.setLoadout(game.run.loadout);
      game.ui.notify(`COFRE ABIERTO · ${message.title}`, 'positive');
      game.audio.playChest(game.player.getPosition());
      break;
    }
    case 'game_over': {
      showGameOverFromHost(game, message.message, message.stats);
      break;
    }
    case 'disconnect': {
      game.handleNetworkClosed(message.reason);
      break;
    }
    case 'error': {
      game.ui.notify(message.message, 'danger');
      break;
    }
  }
}
