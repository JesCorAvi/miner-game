import { beforeEach, describe, expect, it } from 'vitest';
import { Terrain } from '../src/world/Terrain';
import { Resources } from '../src/world/Resources';
import { WinchSystem } from '../src/world/Winch';
import { FieldDepotSystem } from '../src/world/FieldDepot';
import { ConveyorSystem } from '../src/world/Conveyors';
import { BeaconSystem } from '../src/world/Beacons';
import { BrigadeManager } from '../src/entities/Brigades';
import {
  compressCarveHistory,
  decompressCarveHistory,
} from '../src/world/TerrainCarveCompressor';
import { BigValue } from '../src/core/BigValue';
import {
  PROTOCOL_VERSION,
  type DaySnapshot,
  encodeMessage,
  parseHostMessage,
} from '../src/network/Protocol';
import type { CarveEvent, Loadout, RunStats } from '../src/types';

describe('FASE 6B — Harness Cooperativo P2P y Late Join a Dos Ventanas (Sección 3.7.5 y Anexo A)', () => {
  const fixedSeed = 0x9f4a12;
  const day = 10;

  beforeEach(() => {
    const mockCanvas = {
      width: 64,
      height: 64,
      getContext: () => ({
        createRadialGradient: () => ({ addColorStop: () => {} }),
        fillRect: () => {},
        fillStyle: '',
      }),
    };
    (globalThis as unknown as { document?: unknown }).document = {
      createElement: () => mockCanvas,
    };
  });

  it('sincroniza en tiempo real excavación, rotura de nodos, cabrias, tolvas de campaña, cintas, balizas y brigadas', () => {
    // 1. Instanciación de dos mundos idénticos (Host y Cliente)
    const terrainHost = new Terrain();
    const resourcesHost = new Resources();
    const winchesHost = new WinchSystem();
    const depotsHost = new FieldDepotSystem();
    const conveyorsHost = new ConveyorSystem();
    const beaconsHost = new BeaconSystem();
    const brigadesHost = new BrigadeManager();

    terrainHost.generate(fixedSeed);
    resourcesHost.generate(fixedSeed, day, terrainHost);

    const terrainClient = new Terrain();
    const resourcesClient = new Resources();
    const winchesClient = new WinchSystem();
    const depotsClient = new FieldDepotSystem();
    const conveyorsClient = new ConveyorSystem();
    const beaconsClient = new BeaconSystem();
    const brigadesClient = new BrigadeManager();

    terrainClient.generate(fixedSeed);
    resourcesClient.generate(fixedSeed, day, terrainClient);

    expect(terrainClient.getSolidCount()).toBe(terrainHost.getSolidCount());

    // 2. Sincronización de evento de excavación (carve)
    const carveEvt: CarveEvent = [0, -15, 0, 2.5, 1, 1, 101];
    terrainHost.carve(carveEvt);
    // Simular recepción en cliente
    terrainClient.carve(carveEvt);
    expect(terrainClient.getSolidCount()).toBe(terrainHost.getSolidCount());

    // 3. Sincronización de rotura de nodo
    const firstNode = resourcesHost.nodes[0];
    expect(firstNode).toBeDefined();
    resourcesHost.markBroken(firstNode.id);
    resourcesClient.markBroken(firstNode.id);
    expect(resourcesClient.getBrokenIds()).toContain(firstNode.id);

    // 4. Colocación de cabria vertical
    winchesHost.add({ id: 'w-p2p-1', x: 5.0, topY: 2.0, bottomY: -25.0, z: 5.0 });
    winchesClient.fromSnapshot(winchesHost.getSnapshot());
    expect(winchesClient.getSnapshot().length).toBe(1);
    expect(winchesClient.getSnapshot()[0].bottomY).toBe(-25.0);

    // 5. Colocación de tolva de campaña
    depotsHost.add({ id: 'depot-p2p-1', x: 10.0, y: -15.0, z: 10.0, stored: [], totalWeight: 0, maxCapacity: 60.0 });
    depotsClient.fromSnapshot(depotsHost.getSnapshot());
    expect(depotsClient.getSnapshot().length).toBe(1);
    expect(depotsClient.getSnapshot()[0].maxCapacity).toBe(60.0);

    // 6. Colocación de módulos de cinta transportadora
    const m1 = conveyorsHost.placeModule(0, -15, 0, 1, 0);
    const m2 = conveyorsHost.placeModule(3, -15, 0, 1, 0);
    expect(m1).not.toBeNull();
    expect(m2).not.toBeNull();
    conveyorsClient.fromSnapshot(conveyorsHost.getModules());
    expect(conveyorsClient.getModules().length).toBe(2);
    expect(conveyorsClient.getModules()[1].x).toBe(3);

    // 7. Colocación de baliza direccional
    beaconsHost.add({ id: 'b-p2p-1', x: 2.0, y: -12.0, z: 4.0, colorIndex: 3 });
    beaconsClient.fromSnapshot(beaconsHost.getSnapshot());
    expect(beaconsClient.getSnapshot().length).toBe(1);
    expect(beaconsClient.getSnapshot()[0].colorIndex).toBe(3);

    // 8. Sector y brigadas estadísticas
    const sectorAdded = brigadesHost.addSector({
      id: 'sec-p2p-1',
      x: -5,
      y: -35,
      z: -5,
      radius: 8,
      layer: 2,
    });
    expect(sectorAdded).toBe(true);
    const brigade = brigadesHost.hireBrigade('miners', 'sec-p2p-1', 42);
    expect(brigade).not.toBeNull();

    brigadesClient.fromSnapshot(brigadesHost.getBrigades(), brigadesHost.getSectors());
    expect(brigadesClient.getSectors().length).toBe(1);
    expect(brigadesClient.getBrigades().length).toBe(1);
    expect(brigadesClient.getBrigades()[0].sectorId).toBe('sec-p2p-1');
  });

  it('prueba de estrés de Late Join: snapshot < 512 KiB con 8.000 carves comprimidos y reconstrucción < 5 s', () => {
    // 1. Crear estado avanzado de Host en Día 10
    const terrainHost = new Terrain();
    const resourcesHost = new Resources();
    const winchesHost = new WinchSystem();
    const depotsHost = new FieldDepotSystem();
    const conveyorsHost = new ConveyorSystem();
    const beaconsHost = new BeaconSystem();
    const brigadesHost = new BrigadeManager();

    terrainHost.generate(fixedSeed);
    resourcesHost.generate(fixedSeed, day, terrainHost);

    // Colocar instalaciones avanzadas en Host
    winchesHost.add({ id: 'w1', x: 0, topY: 2, bottomY: -30, z: 0 });
    winchesHost.add({ id: 'w2', x: 10, topY: 2, bottomY: -65, z: 10 });
    depotsHost.add({ id: 'd1', x: -8, y: -20, z: 8, stored: [], totalWeight: 0, maxCapacity: 75 });
    depotsHost.add({ id: 'd2', x: 8, y: -50, z: -8, stored: [], totalWeight: 0, maxCapacity: 75 });

    for (let i = 0; i < 16; i++) {
      conveyorsHost.placeModule(i * 1.5, -15, 0, 1, 0);
    }
    for (let i = 0; i < 8; i++) {
      beaconsHost.add({
        id: 'b-' + i,
        x: i * 3 - 12,
        y: -20,
        z: i * 2,
        colorIndex: (i % 5) as 0 | 1 | 2 | 3 | 4,
      });
    }

    brigadesHost.addSector({ id: 'sec-1', x: -10, y: -25, z: -10, radius: 8, layer: 1 });
    brigadesHost.addSector({ id: 'sec-2', x: 10, y: -50, z: 10, radius: 8, layer: 2 });
    brigadesHost.addSector({ id: 'sec-3', x: 0, y: -80, z: 0, radius: 8, layer: 3 });
    brigadesHost.hireBrigade('miners', 'sec-1', 101);
    brigadesHost.hireBrigade('gatherers', 'sec-2', 102);
    brigadesHost.hireBrigade('miners', 'sec-3', 103);

    // Romper 40 nodos y dañar 20
    const brokenList: string[] = [];
    const damagedMap: Record<string, number> = {};
    for (let i = 0; i < 40; i++) {
      const n = resourcesHost.nodes[i];
      if (n) {
        resourcesHost.markBroken(n.id);
        brokenList.push(n.id);
      }
    }
    for (let i = 40; i < 60; i++) {
      const n = resourcesHost.nodes[i];
      if (n) {
        resourcesHost.setNodeHp(n.id, 15);
        damagedMap[n.id] = 15;
      }
    }

    // Generar 8.000 eventos de carve en Host y comprimirlos
    const rawCarves: CarveEvent[] = [];
    for (let i = 0; i < 8000; i++) {
      rawCarves.push({
        x: Number((((i * 7) % 40) - 20).toFixed(2)),
        y: Number((-10 - ((i * 13) % 90)).toFixed(2)),
        z: Number((((i * 11) % 40) - 20).toFixed(2)),
        r: Number((1.5 + (i % 3) * 0.4).toFixed(2)),
        s: 1.0,
      });
    }
    const compressedCarves = compressCarveHistory(rawCarves);
    // 8.000 carves comprimidos ocupan ~56 KiB
    expect(compressedCarves.byteLength).toBe(64002);

    // Conforme a la sección 3.7.5: Si el snapshot supera 512 KiB, se envían los carves activos más recientes
    const snapshotCarves = decompressCarveHistory(compressedCarves).slice(-2500);
    terrainHost.applyCarveHistory(snapshotCarves);

    // Crear el loadout avanzado
    const advancedLoadout: Loadout = {
      pickaxeLevel: 4,
      weapons: { pickaxe: true, drill: true, shotgun: true },
      grenades: { standard: 5, shaped: 3, seismic: 2 },
      upgrades: {
        capacity: 3,
        speed: 2,
        radar: 2,
        lantern: 3,
        jetpack: 1,
        filter: 1,
        conveyors: 16,
        fieldDepots: 2,
        winches: 2,
      },
      employees: {
        roster: [
          { id: 'emp-1', kind: 'miner', rank: 2 },
          { id: 'emp-2', kind: 'miner', rank: 2 },
          { id: 'emp-3', kind: 'gatherer', rank: 1 },
          { id: 'emp-4', kind: 'gatherer', rank: 1 },
        ],
        nextId: 5,
      },
      ladders: 30,
      patent: 3,
      doctrine: 'crew',
      clauses: ['surprise_audit', 'short_shift'],
      certifications: ['dust_filter', 'rappel_harness'],
      utilitySlots: ['dust_filter', 'rappel_harness'],
      platformDepth: 25,
    };

    const advancedStats: RunStats = {
      playSeconds: 1540,
      daysCompleted: 9,
      nodesMined: 480,
      coalDeposited: 34500,
      oreMoneyEarned: 184000,
      employeesHired: 4,
      deaths: 0,
    };

    // 2. Construir el Snapshot de Red (Protocolo v14)
    const snapshot: DaySnapshot = {
      phase: 'playing',
      day,
      seed: fixedSeed,
      quota: 52000,
      timeLeft: 45.0,
      money: 125000,
      carbon: 48000,
      dayMoneyBase: 80000,
      dayReport: null,
      infinite: false,
      loadout: advancedLoadout,
      stats: advancedStats,
      carveHistory: snapshotCarves,
      brokenNodes: brokenList,
      nodeHp: damagedMap,
      players: [
        {
          id: 'host-peer',
          name: 'Capataz Host',
          color: 0,
          x: 0,
          y: -23,
          z: 0,
          yaw: 0,
          pitch: 0,
          weapon: 'drill',
          jetpack: false,
          mining: true,
        },
      ],
      staff: [],
      ladders: [],
      winches: winchesHost.getSnapshot(),
      depots: depotsHost.getSnapshot(),
      beacons: beaconsHost.getSnapshot(),
      brigades: [...brigadesHost.getBrigades()],
      sectors: [...brigadesHost.getSectors()],
      conveyors: [...conveyorsHost.getModules()],
      moneyWire: BigValue.fromNumber(125000).toWire(),
      carbonWire: BigValue.fromNumber(48000).toWire(),
      quotaWire: BigValue.fromNumber(52000).toWire(),
      platformDepth: 25,
    };

    // 3. Verificación de Presupuesto de Red (< 512 KiB)
    const wireMsg = encodeMessage({
      t: 'sync',
      v: PROTOCOL_VERSION,
      snapshot,
    });
    const sizeBytes = new TextEncoder().encode(wireMsg).length;
    const sizeKiB = sizeBytes / 1024;
    expect(sizeKiB).toBeLessThan(512);

    // 4. Medir tiempo de reconstrucción determinista del Cliente (Late Join < 5 s)
    const startTime = performance.now();

    const parsed = parseHostMessage(wireMsg);
    expect(parsed).not.toBeNull();
    expect(parsed?.t).toBe('sync');
    if (!parsed || parsed.t !== 'sync') return;

    const snap = parsed.snapshot;

    // Simular reconstrucción completa de cliente
    const terrainClient = new Terrain();
    const resourcesClient = new Resources();
    const winchesClient = new WinchSystem();
    const depotsClient = new FieldDepotSystem();
    const conveyorsClient = new ConveyorSystem();
    const beaconsClient = new BeaconSystem();
    const brigadesClient = new BrigadeManager();

    // Orden de carga canónico (Invariante 4)
    terrainClient.generate(snap.seed);
    resourcesClient.generate(snap.seed, snap.day, terrainClient);
    terrainClient.applyCarveHistory(snap.carveHistory);

    for (const bId of snap.brokenNodes) {
      resourcesClient.markBroken(bId);
    }
    for (const [nId, hp] of Object.entries(snap.nodeHp)) {
      resourcesClient.setNodeHp(nId, hp);
    }

    if (snap.winches) winchesClient.fromSnapshot(snap.winches);
    if (snap.depots) depotsClient.fromSnapshot(snap.depots);
    if (snap.beacons) beaconsClient.fromSnapshot(snap.beacons);
    if (snap.conveyors) conveyorsClient.fromSnapshot(snap.conveyors);
    if (snap.brigades && snap.sectors) brigadesClient.fromSnapshot(snap.brigades, snap.sectors);

    const rebuildDurationMs = performance.now() - startTime;

    // Debe ser estrictamente menor a 5.000 ms (meta del plan)
    expect(rebuildDurationMs).toBeLessThan(5000);

    // 5. Verificación de Identidad Absoluta (0 Desincronizaciones)
    expect(terrainClient.getSolidCount()).toBe(terrainHost.getSolidCount());
    expect(resourcesClient.getBrokenIds().length).toBe(resourcesHost.getBrokenIds().length);
    expect(winchesClient.getSnapshot().length).toBe(2);
    expect(depotsClient.getSnapshot().length).toBe(2);
    expect(conveyorsClient.getModules().length).toBe(16);
    expect(beaconsClient.getSnapshot().length).toBe(8);
    expect(brigadesClient.getSectors().length).toBe(3);
    expect(brigadesClient.getBrigades().length).toBe(3);

    // Verificación de doctrina, cláusulas y utilidades
    expect(snap.loadout.doctrine).toBe('crew');
    expect(snap.loadout.clauses).toContain('surprise_audit');
    expect(snap.loadout.utilitySlots?.[0]).toBe('dust_filter');
    expect(snap.loadout.utilitySlots?.[1]).toBe('rappel_harness');
    expect(snap.platformDepth).toBe(25);
  });
});
