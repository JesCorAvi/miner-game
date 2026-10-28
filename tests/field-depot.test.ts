import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  FIELD_DEPOT_CAPACITY_RATIO,
  MAX_FIELD_DEPOTS,
  makeDefaultLoadout,
  maxCarryWeight,
} from '../src/config';
import { Inventory } from '../src/core/Inventory';
import { FieldDepotSystem } from '../src/world/FieldDepot';

describe('Sistema de Tolva de Campaña (Field Depot)', () => {
  it('constantes de tolva de campaña configuradas correctamente', () => {
    expect(MAX_FIELD_DEPOTS).toBe(2);
    expect(FIELD_DEPOT_CAPACITY_RATIO).toBe(0.30);
  });

  it('calcula la capacidad de la tolva al 30% de la capacidad de mochila', () => {
    const loadout = makeDefaultLoadout();
    const playerMaxWeight = maxCarryWeight(loadout);
    const depotCapacity = Math.round(playerMaxWeight * FIELD_DEPOT_CAPACITY_RATIO);
    expect(depotCapacity).toBeGreaterThan(0);
  });

  it('deposita minerales desde el inventario sin otorgar capital ni cuota', () => {
    const manager = new FieldDepotSystem();
    const depotId = 'depot-test-1';
    manager.add({
      id: depotId,
      x: 0,
      y: -20,
      z: 0,
      stored: [],
      totalWeight: 0,
      maxCapacity: 50,
    });

    const inventory = new Inventory();
    // Añadir mineral al inventario: carbón (peso 2.5 kg, carbon 8, money 0)
    inventory.addMineral('coal', 8, 0, 2.5);
    inventory.addMineral('coal', 8, 0, 2.5);
    // Añadir mineral con valor: oro (peso 4.0 kg, carbon 0, money 120)
    inventory.addMineral('gold', 0, 120, 4.0);

    expect(inventory.totals().count).toBe(3);
    expect(inventory.totals().weight).toBe(9.0);

    // Depositar en la tolva de campaña
    const result = manager.depositFromInventory(depotId, inventory);
    expect(result.transferredItems).toBe(3);
    expect(result.transferredWeight).toBe(9.0);

    // El inventario debe haber quedado vacío de minerales
    expect(inventory.totals().count).toBe(0);
    expect(inventory.totals().weight).toBe(0);

    // La tolva de campaña tiene los minerales almacenados
    const depot = manager.get(depotId);
    expect(depot).toBeDefined();
    expect(depot?.totalWeight).toBe(9.0);
    expect(depot?.stored).toHaveLength(2);

    manager.dispose();
  });

  it('retira minerales de la tolva hacia el inventario respetando el límite de peso', () => {
    const manager = new FieldDepotSystem();
    const depotId = 'depot-test-2';
    manager.add({
      id: depotId,
      x: 0,
      y: -15,
      z: 0,
      stored: [
        {
          mineral: 'copper',
          count: 5,
          carbon: 0,
          money: 50,
          weight: 15.0, // 3.0 kg cada uno
        },
      ],
      totalWeight: 15.0,
      maxCapacity: 40,
    });

    const inventory = new Inventory();
    // Jugador con capacidad máxima reducida a 7 kg (solo caben 2 cobres = 6.0 kg)
    const maxPlayerCapacity = 7.0;

    const withdrawResult = manager.withdrawToInventory(depotId, inventory, maxPlayerCapacity);
    expect(withdrawResult.transferredItems).toBe(2);
    expect(withdrawResult.transferredWeight).toBe(6.0);

    // El jugador ahora tiene 2 cobres
    expect(inventory.totals().count).toBe(2);
    expect(inventory.totals().weight).toBe(6.0);

    // La tolva conserva los 3 cobres restantes (9.0 kg)
    const depot = manager.get(depotId);
    expect(depot?.totalWeight).toBe(9.0);
    expect(depot?.stored[0].count).toBe(3);

    manager.dispose();
  });

  it('no acepta más carga si la tolva está llena', () => {
    const manager = new FieldDepotSystem();
    const depotId = 'depot-full';
    manager.add({
      id: depotId,
      x: 0,
      y: -10,
      z: 0,
      stored: [],
      totalWeight: 19.5,
      maxCapacity: 20.0,
    });

    const inventory = new Inventory();
    // Añadir mineral que pesa 2.5 kg (no cabe en 0.5 kg de espacio)
    inventory.addMineral('coal', 8, 0, 2.5);

    const result = manager.depositFromInventory(depotId, inventory);
    expect(result.transferredItems).toBe(0);
    expect(result.transferredWeight).toBe(0);
    expect(inventory.totals().count).toBe(1);

    manager.dispose();
  });

  it('permite retirar minerales cuando el inventario ya contiene minerales parciales', () => {
    const manager = new FieldDepotSystem();
    const depotId = 'depot-partial-carry';
    manager.add({
      id: depotId,
      x: 0,
      y: -20,
      z: 0,
      stored: [
        {
          mineral: 'coal',
          count: 4,
          carbon: 32,
          money: 0,
          weight: 10.0, // 2.5 kg cada uno
        },
      ],
      totalWeight: 10.0,
      maxCapacity: 25.0,
    });

    const inventory = new Inventory();
    // Jugador ya lleva 1 mineral (peso 2.5 kg)
    inventory.addMineral('coal', 8, 0, 2.5);
    expect(inventory.totals().weight).toBe(2.5);

    // Capacidad máxima de 8.0 kg (caben 2 piezas más de 2.5 kg = 5.0 kg adicionales)
    const maxCapacity = 8.0;
    const withdrawResult = manager.withdrawToInventory(depotId, inventory, maxCapacity);

    expect(withdrawResult.transferredItems).toBe(2);
    expect(withdrawResult.transferredWeight).toBe(5.0);

    // El inventario ahora tiene 3 piezas (7.5 kg en total)
    expect(inventory.totals().count).toBe(3);
    expect(inventory.totals().weight).toBe(7.5);

    // En la tolva quedan 2 piezas (5.0 kg)
    const depot = manager.get(depotId);
    expect(depot?.totalWeight).toBe(5.0);
    expect(depot?.stored[0].count).toBe(2);

    manager.dispose();
  });

  it('rechaza retirar si el inventario ya superó la capacidad máxima del jugador', () => {
    const manager = new FieldDepotSystem();
    const depotId = 'depot-overweight';
    manager.add({
      id: depotId,
      x: 0,
      y: -20,
      z: 0,
      stored: [
        {
          mineral: 'coal',
          count: 2,
          carbon: 16,
          money: 0,
          weight: 5.0,
        },
      ],
      totalWeight: 5.0,
      maxCapacity: 25.0,
    });

    const inventory = new Inventory();
    // Jugador con mochila de 10 kg llena a 10 kg
    inventory.addMineral('gold', 0, 100, 10.0);

    const withdrawResult = manager.withdrawToInventory(depotId, inventory, 10.0);
    expect(withdrawResult.transferredItems).toBe(0);
    expect(withdrawResult.transferredWeight).toBe(0);

    // La tolva permanece intacta
    const depot = manager.get(depotId);
    expect(depot?.totalWeight).toBe(5.0);
    expect(depot?.stored[0].count).toBe(2);

    manager.dispose();
  });
});
