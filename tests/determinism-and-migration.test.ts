import { beforeEach, describe, expect, it } from 'vitest';
import { Terrain } from '../src/world/Terrain';
import { Resources } from '../src/world/Resources';
import {
  compressCarveHistory,
  decompressCarveHistory,
} from '../src/world/TerrainCarveCompressor';
import { encodeMessage, parseHostMessage, PROTOCOL_VERSION } from '../src/network/Protocol';
import { SaveManager } from '../src/save/SaveManager';
import { SAVE_KEY } from '../src/config';
import type { CarveEvent } from '../src/types';

describe('FASE 5A — Determinismo, Snapshot y Cadena de Migración Completa (Anexo A)', () => {
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

    const mockCanvas = {
      width: 64,
      height: 64,
      getContext: () => ({
        createRadialGradient: () => ({ addColorStop: () => {} }),
        fillRect: () => {},
        fillStyle: '',
      }),
    };
    (globalThis as any).document = {
      createElement: () => mockCanvas,
    };
  });

  it('verifica que el orden determinista estricto produce resultados idénticos entre host y clientes', () => {
    const fixedSeed = 0x5a17e0;
    const day = 5;

    // Simular generación en Host
    const terrainHost = new Terrain();
    const resourcesHost = new Resources();

    terrainHost.generate(fixedSeed);
    resourcesHost.generate(fixedSeed, day, terrainHost);

    // Aplicar historial de 20 carves
    const carves: Array<[number, number, number, number, number, number, number]> = [];
    for (let i = 0; i < 20; i++) {
      carves.push([i * 0.5 - 5, -15 - (i % 10), i * 0.3, 1.8, 1, 1, i]);
    }
    terrainHost.applyCarveHistory(carves);

    // Romper 5 nodos
    const nodes = resourcesHost.nodes;
    expect(nodes.length).toBeGreaterThan(100);
    const brokenNodes = nodes.slice(0, 5).map((n) => n.id);
    for (const id of brokenNodes) {
      resourcesHost.markBroken(id);
    }

    // Simular reconstrucción en Cliente mediante Snapshot en el orden crítico:
    // terrain.generate -> resources.generate -> applyCarveHistory -> markBroken
    const terrainClient = new Terrain();
    const resourcesClient = new Resources();

    terrainClient.generate(fixedSeed);
    resourcesClient.generate(fixedSeed, day, terrainClient);
    terrainClient.applyCarveHistory(carves);
    for (const id of brokenNodes) {
      resourcesClient.markBroken(id);
    }

    // Comprobación de determinismo absoluto:
    // 1. Número idéntico de nodos
    const clientNodes = resourcesClient.nodes;
    expect(clientNodes.length).toBe(nodes.length);

    // 2. IDs y posiciones idénticas
    for (let i = 0; i < 50; i++) {
      expect(clientNodes[i].id).toBe(nodes[i].id);
      expect(clientNodes[i].x).toBeCloseTo(nodes[i].x, 5);
      expect(clientNodes[i].y).toBeCloseTo(nodes[i].y, 5);
      expect(clientNodes[i].z).toBeCloseTo(nodes[i].z, 5);
      expect(clientNodes[i].broken).toBe(nodes[i].broken);
    }

    // 3. Conteo de sólidos de terreno idéntico
    expect(terrainClient.getSolidCount()).toBe(terrainHost.getSolidCount());

    terrainHost.dispose();
    terrainClient.dispose();
  });

  it('valida que un snapshot masivo de 10 días con 8.000 carves comprimidos ocupa < 512 KiB y carga en < 5 s', () => {
    // Generar 8.000 eventos de carve
    const carves: CarveEvent[] = [];
    for (let k = 0; k < 8000; k++) {
      carves.push({
        x: (k % 40) - 20,
        y: -10 - (k % 100),
        z: ((k * 3) % 40) - 20,
        r: 1.6,
        s: 1.0,
        shape: 'sphere',
      });
    }

    const compressedBytes = compressCarveHistory(carves);
    // 8.000 carves a 8 bytes + 2 bytes header = 64.002 bytes (~56 KiB), muy inferior al presupuesto de 96 KiB
    expect(compressedBytes.byteLength).toBe(64002);

    const decompressed = decompressCarveHistory(compressedBytes);
    expect(decompressed.length).toBe(8000);
    expect(decompressed[0].r).toBeCloseTo(carves[0].r, 1);

    // Snapshot para late-join
    const carveTuples: Array<[number, number, number, number, number, number, number]> = carves.slice(0, 300).map(c => [
      c.x, c.y, c.z, c.r, 1, 1, 0
    ]);

    const snapshot = {
      phase: 'playing' as const,
      day: 10,
      seed: 12345,
      quota: 40000,
      timeLeft: 90,
      money: 150000,
      carbon: 42000,
      dayMoneyBase: 120000,
      dayReport: null,
      infinite: false,
      loadout: {
        weapons: { pickaxe: true, drill: true, blaster: true },
        upgrades: { damage: 5, capacity: 5, speed: 4, magnet: 3, jetpack: 1, dayTime: 3 },
        passives: { digRadius: 2, nodeDamage: 3, magnet: 1, employeeSpeed: 2, jetpackFuel: 1 },
        employees: { roster: [], nextId: 1 },
        ladders: 20,
        grenades: { frag: 5, charge: 2, breach: 1, seismic: 1 },
        winches: 2,
        fieldDepots: 2,
        beacons: 4,
        conveyors: 32,
        patent: 4,
        doctrine: 'freight' as const,
        clauses: [],
        reserveCarbon: 500,
        maxLayerReached: 4,
      },
      stats: { coalMined: 5000, moneyEarned: 80000, nodesBroken: 450, chestsOpened: 12, daysCompleted: 9, playSeconds: 1500 },
      carveHistory: carves.slice(0, 300),
      brokenNodes: Array.from({ length: 40 }, (_, i) => `node-broken-${i}`),
      nodeHp: {},
      players: [],
      staff: [],
      ladders: [],
      winches: [
        { id: 'w-1', x: 0, topY: 0, bottomY: -45, z: 0 },
        { id: 'w-2', x: 12, topY: 0, bottomY: -90, z: 8 },
      ],
      depots: [
        { id: 'd-1', x: 4, y: -30, z: 2, carbon: 500, money: 800, weight: 120, count: 40 },
        { id: 'd-2', x: -6, y: -70, z: -4, carbon: 1200, money: 2000, weight: 180, count: 65 },
      ],
      beacons: Array.from({ length: 8 }, (_, i) => ({
        id: `b-${i}`,
        x: i * 3,
        y: -15 * (i % 4),
        z: (i % 2) * 5,
        color: 0x3b82f6,
      })),
      brigades: [
        { id: 'b-1', name: 'Brigada 1', sectorId: 's-1', headcount: 20, kind: 'miners' as const, rank: 2, seed: 101 },
        { id: 'b-2', name: 'Brigada 2', sectorId: 's-2', headcount: 25, kind: 'miners' as const, rank: 3, seed: 102 },
        { id: 'b-3', name: 'Brigada 3', sectorId: 's-3', headcount: 15, kind: 'gatherers' as const, rank: 1, seed: 103 },
        { id: 'b-4', name: 'Brigada 4', sectorId: 's-4', headcount: 30, kind: 'miners' as const, rank: 2, seed: 104 },
      ],
      sectors: [
        { id: 's-1', name: 'S1', x: 0, y: -20, z: 0, radius: 8, layer: 1, density: 1.2 },
        { id: 's-2', name: 'S2', x: 10, y: -45, z: 0, radius: 8, layer: 2, density: 1.5 },
        { id: 's-3', name: 'S3', x: -10, y: -75, z: 5, radius: 8, layer: 3, density: 1.8 },
        { id: 's-4', name: 'S4', x: 5, y: -105, z: -5, radius: 8, layer: 4, density: 2.2 },
      ],
      conveyors: Array.from({ length: 32 }, (_, i) => ({
        id: `c-${i}`,
        x: (i % 8) * 3,
        y: -10 - Math.floor(i / 8) * 20,
        z: 0,
        dirX: 1,
        dirZ: 0,
        isJammed: false,
        speed: 3.5,
      })),
      moneyWire: '150000',
      carbonWire: '42000',
      quotaWire: '40000',
    };

    const hostSyncMessage = {
      v: PROTOCOL_VERSION,
      t: 'sync' as const,
      snapshot,
    };

    const serialized = encodeMessage(hostSyncMessage as any);
    const byteSize = new TextEncoder().encode(serialized).length;

    // Invariante de red WebRTC: el mensaje completo debe medir < 512 KiB
    expect(byteSize).toBeLessThan(512 * 1024);

    // Medición de rendimiento de carga / parseo
    const start = performance.now();
    const parsed = parseHostMessage(serialized);
    const elapsedMs = performance.now() - start;

    expect(parsed).not.toBeNull();
    // La carga debe ser instantánea (< 5.000 ms, típicamente < 50 ms)
    expect(elapsedMs).toBeLessThan(5000);
  });

  it('verifica la cadena completa de migración v5 -> v6 -> v7 -> v8 -> v9 sin pérdida de datos ni fallos por corrupción', () => {
    const manager = new SaveManager();

    // 1. Migración desde v5
    const v5Save = {
      version: 5,
      savedAt: 100000,
      day: 4,
      money: 4500,
      infinite: false,
      loadout: {
        weapons: { pickaxe: true, drill: true, blaster: false },
        upgrades: { damage: 2, capacity: 3, speed: 1, magnet: 1, jetpack: 0, dayTime: 1 },
        passives: { digRadius: 1, nodeDamage: 2, magnet: 0, employeeSpeed: 0, jetpackFuel: 0 },
        employees: {
          roster: [
            { id: 'emp-1', kind: 'miner', rank: 1 },
            { id: 'emp-2', kind: 'collector', rank: 0 },
          ],
          nextId: 3,
        },
        ladders: 18,
        grenades: { frag: 4, charge: 1, breach: 0, seismic: 0 },
      },
      stats: { coalMined: 800, moneyEarned: 9500, nodesBroken: 90, chestsOpened: 4, daysCompleted: 3, playSeconds: 950 },
      playerName: 'VeteranoV5',
    };
    store.set('carbon-magnate.save.v5', JSON.stringify(v5Save));

    let loaded = manager.load();
    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe(9);
    expect(loaded?.day).toBe(4);
    expect(loaded?.money).toBe(4500);
    expect(loaded?.loadout.weapons.drill).toBe(true);
    expect(loaded?.loadout.employees.roster).toHaveLength(2);
    expect(loaded?.loadout.winches).toBe(0);
    expect(loaded?.loadout.conveyors).toBe(0);

    // 2. Migración desde v6 (añadió cabrias, depósitos, balizas)
    store.clear();
    const v6Save = {
      ...v5Save,
      version: 6,
      loadout: {
        ...v5Save.loadout,
        winches: 1,
        fieldDepots: 2,
        beacons: 5,
      },
    };
    store.set('carbon-magnate.save.v6', JSON.stringify(v6Save));

    loaded = manager.load();
    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe(9);
    expect(loaded?.loadout.winches).toBe(1);
    expect(loaded?.loadout.fieldDepots).toBe(2);
    expect(loaded?.loadout.beacons).toBe(5);

    // 3. Migración desde v7 (añadió doctrinas, cláusulas, reserva)
    store.clear();
    const v7Save = {
      ...v6Save,
      version: 7,
      loadout: {
        ...v6Save.loadout,
        doctrine: 'precision',
        clauses: ['surprise_audit'],
        reserveCarbon: 120,
        maxLayerReached: 3,
        patent: 2,
      },
      accessibility: {
        shake: 0.5,
        fov: 85,
        bulkLoot: true,
        ledgerMode: false,
      },
    };
    store.set('carbon-magnate.save.v7', JSON.stringify(v7Save));

    loaded = manager.load();
    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe(9);
    expect(loaded?.loadout.doctrine).toBe('precision');
    expect(loaded?.loadout.clauses).toContain('surprise_audit');
    expect(loaded?.loadout.reserveCarbon).toBe(120);
    expect(loaded?.loadout.maxLayerReached).toBe(3);
    expect(loaded?.loadout.patent).toBe(2);
    expect(loaded?.accessibility?.fov).toBe(85);

    // 4. Manejo robusto de datos corruptos o valores extraños
    store.clear();
    const corruptedSave = {
      version: 8,
      day: 'tres', // tipo incorrecto
      money: -999, // negativo
      loadout: null, // null
      stats: 'corrupto',
      playerName: '<script>alert(1)</script>',
    };
    store.set(SAVE_KEY, JSON.stringify(corruptedSave));

    loaded = manager.load();
    // No debe lanzar excepción y debe sanear valores
    expect(loaded).not.toBeNull();
    expect(loaded?.day).toBe(1); // fallback
    expect(loaded?.money).toBe(0); // clamp a 0
    expect(loaded?.loadout.ladders).toBeGreaterThanOrEqual(0);
    expect(loaded?.playerName).not.toContain('<script>');
  });
});
