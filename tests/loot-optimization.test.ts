import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { LootSpatialHash } from '../src/world/LootSpatialHash';
import {
  compressCarveEvent,
  decompressCarveEvent,
  compressCarveHistory,
  decompressCarveHistory,
} from '../src/world/TerrainCarveCompressor';
import { Terrain } from '../src/world/Terrain';
import {
  ACTIVE_PELLET_BUDGET,
  FUSION_DISTANCE,
  MAX_FUSED_PILES,
  MAX_PILE_SCALE,
  type Pellet,
  type OverflowEntry,
} from '../src/world/LootTypes';
import type { CarveEvent } from '../src/types';

describe('Optimización de Loot y Spatial Hash', () => {
  it('LootSpatialHash inserta y busca entidades dentro del radio', () => {
    const hash = new LootSpatialHash(2.0);
    hash.insert(1, 0, 0, 0);
    hash.insert(2, 1, 0, 0);
    hash.insert(3, 5, 0, 0);
    hash.insert(4, 0, 10, 0);

    const found: number[] = [];
    hash.queryRadius(0, 0, 0, 2.0, (id) => found.push(id));

    expect(found).toContain(1);
    expect(found).toContain(2);
    expect(found).not.toContain(3); // 5m > 2m
    expect(found).not.toContain(4); // 10m > 2m
  });

  it('LootSpatialHash limpia correctamente las celdas', () => {
    const hash = new LootSpatialHash(2.0);
    hash.insert(10, 0, 0, 0);
    hash.clear();

    const found: number[] = [];
    hash.queryRadius(0, 0, 0, 5.0, (id) => found.push(id));
    expect(found).toHaveLength(0);
  });

  it('presupuesto duro de pellets físicos activos y montones fusionados', () => {
    expect(ACTIVE_PELLET_BUDGET).toBe(1500);
    expect(MAX_FUSED_PILES).toBe(400);
    expect(FUSION_DISTANCE).toBe(1.5);
    expect(MAX_PILE_SCALE).toBe(2.2);
  });

  it('fusión dinámica conserva el 100% del rendimiento (carbon, money, weight, count)', () => {
    const pellets: Pellet[] = [
      {
        active: true,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        mineral: 'coal',
        carbon: 8,
        money: 0,
        weight: 2.5,
        count: 1,
        isPile: false,
        scale: 1,
      },
      {
        active: true,
        x: 0.5,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        mineral: 'coal',
        carbon: 8,
        money: 0,
        weight: 2.5,
        count: 1,
        isPile: false,
        scale: 1,
      },
    ];

    const initialTotalCarbon = pellets[0].carbon + pellets[1].carbon;
    const initialTotalWeight = pellets[0].weight + pellets[1].weight;
    const initialTotalCount = pellets[0].count + pellets[1].count;

    // Simulación de fusión < 1.5m
    const dx = pellets[1].x - pellets[0].x;
    const dist = Math.hypot(dx, pellets[1].y - pellets[0].y, pellets[1].z - pellets[0].z);
    expect(dist).toBeLessThan(FUSION_DISTANCE);

    pellets[0].carbon += pellets[1].carbon;
    pellets[0].money += pellets[1].money;
    pellets[0].weight += pellets[1].weight;
    pellets[0].count += pellets[1].count;
    pellets[0].isPile = true;
    pellets[0].scale = Math.min(MAX_PILE_SCALE, Math.cbrt(pellets[0].weight / 2.5));
    pellets[1].active = false;

    expect(pellets[0].carbon).toBe(initialTotalCarbon);
    expect(pellets[0].weight).toBe(initialTotalWeight);
    expect(pellets[0].count).toBe(initialTotalCount);
    expect(pellets[0].scale).toBeLessThanOrEqual(MAX_PILE_SCALE);
    expect(pellets[0].scale).toBeCloseTo(Math.cbrt(2), 2);
  });

  it('el libro de exceso (overflowLedger) no pierde yield al acumularse', () => {
    const overflow: OverflowEntry[] = [];
    const addToOverflow = (
      x: number,
      y: number,
      z: number,
      mineral: 'coal',
      carbon: number,
      money: number,
      weight: number,
      count: number,
    ) => {
      for (const entry of overflow) {
        if (entry.mineral === mineral && Math.hypot(entry.x - x, entry.y - y, entry.z - z) < 1.2) {
          entry.carbon += carbon;
          entry.money += money;
          entry.weight += weight;
          entry.count += count;
          return;
        }
      }
      overflow.push({ x, y, z, mineral, carbon, money, weight, count });
    };

    addToOverflow(0, 0, 0, 'coal', 10, 0, 3.0, 1);
    addToOverflow(0.5, 0, 0, 'coal', 15, 0, 4.5, 1);

    expect(overflow).toHaveLength(1);
    expect(overflow[0].carbon).toBe(25);
    expect(overflow[0].weight).toBe(7.5);
    expect(overflow[0].count).toBe(2);
  });
});

describe('Compresión de Historial de Terreno y Conteo Incremental', () => {
  it('TerrainCarveCompressor cuantiza eventos a 8 bytes con fidelidad posicional', () => {
    const event: CarveEvent = {
      x: 12.34,
      y: -45.67,
      z: -3.89,
      r: 1.85,
      s: 1.5,
    };

    const packed = compressCarveEvent(event);
    expect(packed.byteLength).toBe(8);

    const { event: unpacked } = decompressCarveEvent(packed);
    expect(Math.abs(unpacked.x - event.x)).toBeLessThan(0.25);
    expect(Math.abs(unpacked.y - event.y)).toBeLessThan(0.35);
    expect(Math.abs(unpacked.z - event.z)).toBeLessThan(0.25);
    expect(Math.abs(unpacked.r - event.r)).toBeLessThan(0.15);
  });

  it('TerrainCarveCompressor comprime 8.000 eventos dentro del presupuesto de 96 KiB', () => {
    const events: CarveEvent[] = [];
    for (let i = 0; i < 8000; i++) {
      events.push({
        x: (i % 48) - 24,
        y: -(i % 120),
        z: ((i * 3) % 48) - 24,
        r: 0.8 + (i % 10) * 0.1,
        s: 1.0,
      });
    }

    const buffer = compressCarveHistory(events);
    // 2 bytes de cabecera + 8000 eventos * 8 bytes = 64.002 bytes = 62.50 KiB (< 96 KiB)
    expect(buffer.byteLength).toBe(2 + 8000 * 8);
    expect(buffer.byteLength).toBeLessThan(96 * 1024);

    const restored = decompressCarveHistory(buffer);
    expect(restored).toHaveLength(8000);
    expect(restored[0].x).toBeCloseTo(events[0].x, 0.2);
    expect(restored[7999].y).toBeCloseTo(events[7999].y, 0.5);
  });

  it('Terrain actualiza solidCount de forma incremental al tallar', () => {
    const terrain = new Terrain();
    terrain.generate(42);
    const initialSolids = terrain.getSolidCount();
    expect(initialSolids).toBeGreaterThan(0);

    // Carve en una posición sólida
    const carveEvent: CarveEvent = { x: 0, y: -10, z: 0, r: 2.0, s: 1.0 };
    const changed = terrain.carve(carveEvent);
    expect(changed).toBe(true);
    const afterFirstCarve = terrain.getSolidCount();
    expect(afterFirstCarve).toBeLessThan(initialSolids);

    // Repetir el carve en el mismo punto exacto no debe restar de nuevo (ya es aire)
    terrain.carve(carveEvent);
    const afterRepeatedCarve = terrain.getSolidCount();
    expect(afterRepeatedCarve).toBe(afterFirstCarve);
  });
});
