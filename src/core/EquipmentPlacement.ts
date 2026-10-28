import * as THREE from 'three';
import {
  FALL_SPILL_RATIO_MAX,
  FALL_SPILL_RATIO_MIN,
  MIN_FALL_SPILL_DISTANCE,
  maxCarryWeight,
} from '../config';
import { PROTOCOL_VERSION } from '../network/Protocol';
import { hasUtilityActive } from './Progression';
import { placeLadder } from './Interaction';
import type { Game } from './Game';

export function syncPlayerCargoState(game: Game): void {
  const updated = game.inventory.totals();
  game.cargoCoal = updated.carbon;
  game.cargoMoney = updated.money;
  game.cargoWeight = updated.weight;
  game.player.setWeightRatio(game.cargoWeight / maxCarryWeight(game.run.loadout));
  game.lastHudSignature = '';
}

export function handleHardLandingSpill(game: Game, fallDistance: number): void {
  if (hasUtilityActive(game.run.loadout, 'rappel_harness')) {
    return;
  }
  const totals = game.inventory.totals();
  if (totals.count <= 0) return;
  const ratio = Math.min(
    FALL_SPILL_RATIO_MAX,
    Math.max(FALL_SPILL_RATIO_MIN, 0.05 + (fallDistance - MIN_FALL_SPILL_DISTANCE) * 0.01),
  );
  const spillCount = Math.max(1, Math.round(totals.count * ratio));
  let spilledItems = 0;
  let spilledWeight = 0;
  const playerPos = game.player.getPosition();
  const slots = game.inventory.getSlots();

  for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
    const slot = slots[slotIndex];
    if (!slot || slot.kind !== 'mineral') continue;
    const countToRemove = Math.min(slot.count, spillCount - spilledItems);
    if (countToRemove <= 0) continue;
    const unitWeight = slot.weight / slot.count;
    const unitCarbon = slot.carbon / slot.count;
    const unitMoney = slot.money / slot.count;

    game.inventory.removeOreFromSlot(slotIndex, countToRemove);
    spilledItems += countToRemove;
    spilledWeight += countToRemove * unitWeight;

    for (let k = 0; k < countToRemove; k += 1) {
      const angle = (k + 1) * 2.39996;
      const dist = 0.5 + (k % 5) * 0.25;
      const dropPos = new THREE.Vector3(
        playerPos.x + Math.cos(angle) * dist,
        playerPos.y + 0.2,
        playerPos.z + Math.sin(angle) * dist,
      );
      game.loot.spawnDrop(
        dropPos,
        slot.mineral,
        Math.round(unitCarbon),
        Math.round(unitMoney),
        unitWeight,
      );
    }
    if (spilledItems >= spillCount) break;
  }

  syncPlayerCargoState(game);
  game.audio.playError();
  game.ui.notify(
    `¡IMPACTO BRUSCO! DERRAME DE CARGA (${spilledWeight.toFixed(1)} kg dispersados).`,
    'danger',
  );
}

export function placeWinch(game: Game): boolean {
  if (game.phase !== 'playing') {
    return false;
  }
  const stock = game.run.loadout.winches ?? 0;
  if (stock <= 0) {
    game.audio.playError();
    game.ui.notify('Sin cabrias en inventario. Cómpralas en la oficina nocturna.', 'danger');
    return false;
  }
  const origin = game.player.getEyePosition();
  const dir = game.player.getAimDirection();
  const candidate = game.winches.validatePlacement(origin, dir, game.terrain);
  if (!candidate || !candidate.valid) {
    game.audio.playError();
    game.ui.notify(candidate?.reason ?? 'Superficie no válida para cabria.', 'danger');
    return false;
  }
  const id = `w-${game.run.day}-${game.winches.getSnapshot().length + 1}`;
  candidate.state.id = id;
  candidate.state.ownerId = game.selfPeerId;
  if (!game.winches.add(candidate.state)) {
    game.audio.playError();
    game.ui.notify('No se pudo instalar la cabria: límite alcanzado.', 'danger');
    return false;
  }
  game.run.loadout.winches = Math.max(0, stock - 1);
  game.syncEquipmentInventory();
  game.audio.playLadder(new THREE.Vector3(candidate.state.x, candidate.state.topY, candidate.state.z));
  game.ui.notify('CABRIA VERTICAL INSTALADA (8 m/s).', 'positive');
  if (game.online && game.network) {
    if (game.role === 'client') {
      game.network.sendToHost({ t: 'winch_place', v: PROTOCOL_VERSION, winch: candidate.state });
    } else {
      game.network.broadcast({ t: 'winch_placed', v: PROTOCOL_VERSION, winch: candidate.state });
    }
  }
  return true;
}

export function placeFieldDepot(game: Game): boolean {
  if (game.phase !== 'playing') {
    return false;
  }
  const stock = game.run.loadout.fieldDepots ?? 0;
  if (stock <= 0) {
    game.audio.playError();
    game.ui.notify('Sin tolvas de campaña en inventario. Cómpralas en la oficina.', 'danger');
    return false;
  }
  const origin = game.player.getEyePosition();
  const dir = game.player.getAimDirection();
  const candidate = game.fieldDepots.validatePlacement(origin, dir, game.terrain, game.run.loadout);
  if (!candidate || !candidate.valid) {
    game.audio.playError();
    game.ui.notify(candidate?.reason ?? 'Superficie no válida para tolva de campaña.', 'danger');
    return false;
  }
  const id = `d-${game.run.day}-${game.fieldDepots.getSnapshot().length + 1}`;
  candidate.state.id = id;
  candidate.state.ownerId = game.selfPeerId;
  if (!game.fieldDepots.add(candidate.state)) {
    game.audio.playError();
    game.ui.notify('No se pudo instalar la tolva de campaña: límite alcanzado.', 'danger');
    return false;
  }
  game.run.loadout.fieldDepots = Math.max(0, stock - 1);
  game.syncEquipmentInventory();
  game.audio.playPickup(new THREE.Vector3(candidate.state.x, candidate.state.y, candidate.state.z), 1);
  game.ui.notify(`TOLVA DE CAMPAÑA INSTALADA (${candidate.state.maxCapacity} kg).`, 'positive');
  if (game.online && game.network) {
    if (game.role === 'client') {
      game.network.sendToHost({ t: 'depot_place', v: PROTOCOL_VERSION, depot: candidate.state });
    } else {
      game.network.broadcast({ t: 'depot_sync', v: PROTOCOL_VERSION, depots: game.fieldDepots.getSnapshot() });
    }
  }
  return true;
}

export function depositToFieldDepot(game: Game, depotId: string): boolean {
  const depot = game.fieldDepots.get(depotId);
  if (!depot) return false;
  const carried = game.inventory.totals();
  if (carried.count <= 0) {
    game.audio.playError();
    game.ui.notify('MOCHILA SIN MINERALES · Extrae mineral de la roca para almacenarlo.', 'info');
    return false;
  }
  if (depot.totalWeight >= depot.maxCapacity - 0.05) {
    game.audio.playError();
    game.ui.notify(
      `TOLVA DE CAMPAÑA LLENA · Capacidad colmada (${depot.totalWeight.toFixed(1)} / ${depot.maxCapacity} kg). Pulsa F para retirar.`,
      'danger',
    );
    return false;
  }
  const res = game.fieldDepots.depositFromInventory(depot.id, game.inventory);
  if (res.transferredItems > 0) {
    syncPlayerCargoState(game);
    game.audio.playPickup(game.player.getPosition(), res.transferredItems);
    game.ui.notify(
      `ALMACENADO EN TOLVA DE CAMPAÑA · ${res.transferredWeight.toFixed(1)} kg (${res.transferredItems} piezas).`,
      'info',
    );
    if (game.online && game.network) {
      game.network.sendToHost({
        t: 'depot_interact',
        v: PROTOCOL_VERSION,
        depotId: depot.id,
        action: 'deposit',
        depot: game.fieldDepots.get(depot.id),
      });
    }
    return true;
  }
  game.audio.playError();
  game.ui.notify(
    `ESPACIO INSUFICIENTE EN TOLVA · El espacio libre (${(depot.maxCapacity - depot.totalWeight).toFixed(1)} kg) no admite las piezas actuales.`,
    'danger',
  );
  return false;
}

export function withdrawFromFieldDepot(game: Game, depotId: string): boolean {
  const depot = game.fieldDepots.get(depotId);
  if (!depot) return false;
  if (depot.stored.length === 0 || depot.totalWeight <= 0) {
    game.audio.playError();
    game.ui.notify('TOLVA DE CAMPAÑA VACÍA · No hay mineral almacenado en este punto.', 'info');
    return false;
  }
  const maxCapacity = maxCarryWeight(game.run.loadout);
  const currentWeight = game.inventory.totals().weight;
  if (currentWeight >= maxCapacity - 0.05) {
    game.audio.playError();
    game.ui.notify(
      `MOCHILA LLENA · Capacidad máxima alcanzada (${currentWeight.toFixed(1)} / ${maxCapacity} kg). Vuelve a la tolva principal.`,
      'danger',
    );
    return false;
  }
  const res = game.fieldDepots.withdrawToInventory(depot.id, game.inventory, maxCapacity);
  if (res.transferredItems > 0) {
    syncPlayerCargoState(game);
    game.audio.playPickup(game.player.getPosition(), res.transferredItems);
    game.ui.notify(
      `RETIRADO DE TOLVA DE CAMPAÑA · ${res.transferredWeight.toFixed(1)} kg (${res.transferredItems} piezas).`,
      'positive',
    );
    if (game.online && game.network) {
      game.network.sendToHost({
        t: 'depot_interact',
        v: PROTOCOL_VERSION,
        depotId: depot.id,
        action: 'withdraw',
        depot: game.fieldDepots.get(depot.id),
      });
    }
    return true;
  }
  game.audio.playError();
  game.ui.notify('ESPACIO INSUFICIENTE · Las piezas en tolva exceden el peso o huecos de tu mochila.', 'danger');
  return false;
}

export function placeBeaconFromPlayer(game: Game): boolean {
  if (game.phase !== 'playing') {
    return false;
  }
  const stock = game.run.loadout.beacons ?? 0;
  if (stock <= 0) {
    game.audio.playError();
    game.ui.notify('Sin balizas en stock. Adquiérelas en la tienda corporativa.', 'danger');
    return false;
  }
  const id = `b-${game.run.day}-${game.beacons.getAll().length + 1}`;
  const origin = game.player.getEyePosition();
  const dir = game.player.getAimDirection();
  const placed = game.beacons.placeAt(origin, dir, game.terrain, id, game.selfPeerId);
  if (placed) {
    game.run.loadout.beacons = Math.max(0, stock - 1);
    game.syncEquipmentInventory();
    game.audio.playPickup(new THREE.Vector3(placed.x, placed.y, placed.z), 1);
    game.ui.notify(`BALIZA INSTALADA · ${placed.label ?? 'Señal'} en ruta.`, 'positive');
    if (game.online && game.network) {
      if (game.role === 'client') {
        game.network.sendToHost({ t: 'beacon_place', v: PROTOCOL_VERSION, beacon: placed });
      } else {
        game.network.broadcast({ t: 'beacon_sync', v: PROTOCOL_VERSION, beacons: game.beacons.getSnapshot() });
      }
    }
    return true;
  }
  return false;
}

export function handlePlaceEquipmentOnClick(game: Game): boolean {
  const item = game.getActiveHotbarItem();
  if (!item) {
    return false;
  }
  if (item.kind === 'ladder') {
    if (!game.ladderPlacementEnabled) return false;
    placeLadder(game);
    return true;
  }
  if (item.kind === 'winch') {
    return placeWinch(game);
  }
  if (item.kind === 'field_depot') {
    return placeFieldDepot(game);
  }
  if (item.kind === 'beacon') {
    return placeBeaconFromPlayer(game);
  }
  return false;
}
