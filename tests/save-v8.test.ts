import { beforeEach, describe, expect, it } from 'vitest';
import { SAVE_KEY, makeDefaultLoadout } from '../src/config';
import { SaveManager } from '../src/save/SaveManager';

describe('Migración de Guardado v9 y Carga de Partida', () => {
  const store = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => {
      store.set(key, val);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };

  beforeEach(() => {
    store.clear();
    (globalThis as unknown as { window: { localStorage: typeof mockLocalStorage } }).window = {
      localStorage: mockLocalStorage,
    };
  });

  it('guarda en la clave v9 con versión 9 y limpia claves legacy', () => {
    const manager = new SaveManager();
    store.set('carbon-magnate.save.v7', JSON.stringify({ version: 7, day: 2, money: 500 }));
    store.set('carbon-magnate.save.v6', JSON.stringify({ version: 6, day: 2, money: 500 }));
    store.set('carbon-magnate.save.v5', JSON.stringify({ version: 5, day: 2, money: 500 }));

    const loadout = makeDefaultLoadout();
    loadout.winches = 1;
    loadout.fieldDepots = 2;
    loadout.beacons = 4;
    loadout.conveyors = 8;

    const saved = manager.save({
      day: 3,
      money: 1200,
      infinite: false,
      loadout,
      stats: {
        coalMined: 100,
        moneyEarned: 2500,
        nodesBroken: 15,
        chestsOpened: 2,
        daysCompleted: 2,
        playSeconds: 450,
      },
      playerName: 'MineroPro',
    });

    expect(saved).toBe(true);
    expect(store.has(SAVE_KEY)).toBe(true);
    expect(store.has('carbon-magnate.save.v7')).toBe(false);
    expect(store.has('carbon-magnate.save.v6')).toBe(false);
    expect(store.has('carbon-magnate.save.v5')).toBe(false);

    const loaded = manager.load();
    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe(9);
    expect(loaded?.day).toBe(3);
    expect(loaded?.money).toBe(1200);
    expect(loaded?.loadout.winches).toBe(1);
    expect(loaded?.loadout.fieldDepots).toBe(2);
    expect(loaded?.loadout.beacons).toBe(4);
    expect(loaded?.loadout.conveyors).toBe(8);
  });

  it('migra limpiamente un guardado legacy v5 asignando valores por defecto a campos modernos', () => {
    const manager = new SaveManager();
    const legacyV5Data = {
      version: 5,
      savedAt: 123456789,
      day: 4,
      money: 3000,
      infinite: false,
      loadout: {
        weapons: { pickaxe: true, drill: true },
        upgrades: { battery: 1, capacity: 2 },
        passives: {},
        employees: { roster: [], nextId: 1 },
        ladders: 10,
        grenades: { frag: 2, charge: 0, breach: 0, seismic: 0 },
      },
      stats: {
        coalMined: 500,
        moneyEarned: 7000,
        nodesBroken: 80,
        chestsOpened: 5,
        daysCompleted: 3,
        playSeconds: 1200,
      },
      playerName: 'VeteranoV5',
    };

    store.set('carbon-magnate.save.v5', JSON.stringify(legacyV5Data));

    const loaded = manager.load();
    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe(9);
    expect(loaded?.day).toBe(4);
    expect(loaded?.loadout.weapons.drill).toBe(true);
    expect(loaded?.loadout.ladders).toBe(10);
    expect(loaded?.loadout.grenades.frag).toBe(2);
    expect(loaded?.loadout.winches).toBe(0);
    expect(loaded?.loadout.fieldDepots).toBe(0);
    expect(loaded?.loadout.beacons).toBe(0);
    expect(loaded?.loadout.conveyors).toBe(0);
  });

  it('migra limpiamente un guardado v7 preservando doctrina, accesibilidad y brigadas', () => {
    const manager = new SaveManager();
    const legacyV7Data = {
      version: 7,
      savedAt: 200000000,
      day: 6,
      money: 8500,
      infinite: false,
      accessibility: {
        shake: 0.5,
        fov: 75,
        bulkLoot: true,
        ledgerMode: true,
      },
      loadout: {
        weapons: { pickaxe: true, drill: true, blaster: false },
        upgrades: { battery: 2, capacity: 3 },
        passives: {},
        employees: { roster: [], nextId: 2 },
        ladders: 15,
        grenades: { frag: 3, charge: 1, breach: 0, seismic: 0 },
        winches: 2,
        fieldDepots: 1,
        beacons: 3,
        doctrine: 'blasting',
      },
      stats: {
        coalMined: 1200,
        moneyEarned: 15000,
        nodesBroken: 150,
        chestsOpened: 8,
        daysCompleted: 5,
        playSeconds: 2400,
      },
      playerName: 'SupervisorV7',
    };

    store.set('carbon-magnate.save.v7', JSON.stringify(legacyV7Data));

    const loaded = manager.load();
    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe(9);
    expect(loaded?.day).toBe(6);
    expect(loaded?.loadout.doctrine).toBe('blasting');
    expect(loaded?.accessibility?.bulkLoot).toBe(true);
    expect(loaded?.accessibility?.ledgerMode).toBe(true);
    expect(loaded?.loadout.winches).toBe(2);
    expect(loaded?.loadout.conveyors).toBe(0);
  });
});
