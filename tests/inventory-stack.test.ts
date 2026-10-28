import { describe, expect, it } from 'vitest';
import { Inventory } from '../src/core/Inventory';
import { makeDefaultLoadout, maxCarryWeight, maxStackFor } from '../src/config';

describe('Compactador de carga y escala de mochila', () => {
  it('aumenta el stack de mineral con la mejora', () => {
    const base = makeDefaultLoadout();
    expect(maxStackFor(base)).toBe(64);
    base.upgrades.stack = 4;
    expect(maxStackFor(base)).toBe(64 + 4 * 32);
  });

  it('llena un solo stack hasta el límite mejorado', () => {
    const loadout = makeDefaultLoadout();
    loadout.upgrades.stack = 2;
    const inventory = new Inventory();
    inventory.syncLoadout(loadout);
    for (let index = 0; index < 100; index += 1) {
      inventory.addMineral('coal', 1, 1, 0.1);
    }
    const totals = inventory.totals();
    expect(totals.count).toBe(100);
    expect(totals.carbon).toBe(100);
    const first = inventory.slots.find((item) => item?.kind === 'mineral');
    expect(first && first.kind === 'mineral' ? first.count : 0).toBe(100);
  });

  it('permite ampliar la capacidad hasta el nuevo máximo', () => {
    const loadout = makeDefaultLoadout();
    loadout.upgrades.capacity = 12;
    expect(maxCarryWeight(loadout)).toBe(40 + 12 * 40);
  });
});
