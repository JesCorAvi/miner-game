import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BrigadeManager, brigadeUpgradeCost, type SectorBeacon } from '../src/entities/Brigades';
import { ConveyorSystem } from '../src/world/Conveyors';
import { computeFootprintStage } from '../src/core/DayCycle';

describe('Simulación Híbrida de Brigadas y Sectores', () => {
  it('delimitación de sectores valida cotas y calcula capa', () => {
    const manager = new BrigadeManager();

    const s1: SectorBeacon = {
      id: 'sec-1',
      name: 'Sector A',
      x: 0,
      y: -20,
      z: 0,
      radius: 8.0,
      layer: 1,
      density: 1.0,
    };
    expect(manager.addSector(s1)).toBe(true);
    expect(manager.getSectors()).toHaveLength(1);
    expect(manager.getSectors()[0].layer).toBe(1);

    // Cota profunda (-75 m) asigna bioma 4
    const s2: SectorBeacon = {
      id: 'sec-2',
      name: 'Sector B',
      x: 5,
      y: -75,
      z: 5,
      radius: 8.0,
      layer: 1,
      density: 1.2,
    };
    expect(manager.addSector(s2)).toBe(true);
    expect(manager.getSectors()[1].layer).toBe(4);

    // No permite más de 4 sectores
    manager.addSector({ id: 'sec-3', name: 'C', x: -5, y: -40, z: 0, radius: 8, layer: 2, density: 1 });
    manager.addSector({ id: 'sec-4', name: 'D', x: 0, y: -100, z: 0, radius: 8, layer: 4, density: 1 });
    const s5: SectorBeacon = { id: 'sec-5', name: 'E', x: 0, y: -50, z: 0, radius: 8, layer: 2, density: 1 };
    expect(manager.addSector(s5)).toBe(false);
  });

  it('contratación y ascenso de brigadas con headcount escalonado', () => {
    const manager = new BrigadeManager();
    const b1 = manager.hireBrigade('miners', 'sec-1', 42);
    expect(b1).not.toBeNull();
    expect(b1?.headcount).toBe(10);
    expect(b1?.rank).toBe(1);

    // Ascenso
    if (b1) {
      expect(manager.promoteBrigade(b1.id)).toBe(true);
      expect(b1.rank).toBe(2);
      expect(b1.headcount).toBe(15);
    }
  });

  it('la ampliación de brigada multiplica por diez la plantilla', () => {
    const manager = new BrigadeManager();
    const brigade = manager.hireBrigade('miners', '', 42);
    expect(brigade).not.toBeNull();
    if (!brigade) return;
    const firstCost = brigadeUpgradeCost(brigade);
    expect(manager.upgradeBrigade(brigade.id)).toBe(true);
    expect(brigade.headcount).toBe(100);
    expect(brigadeUpgradeCost(brigade)).toBeGreaterThan(firstCost);
    manager.upgradeBrigade(brigade.id);
    expect(brigade.headcount).toBe(1_000);
  });

  it('cálculo de rendimiento estadístico en host es determinista y no nulo', () => {
    const manager = new BrigadeManager();
    manager.addSector({ id: 'sec-1', name: 'Capa 2', x: 0, y: -45, z: 0, radius: 8, layer: 2, density: 1.1 });
    manager.hireBrigade('miners', 'sec-1', 12345);

    // 1 segundo de simulación en host
    const yieldResult = manager.update(1.0, true, 9999);
    expect(yieldResult.carbon).toBeGreaterThan(0);
  });
});

describe('Cintas de Retorno (Conveyors)', () => {
  it('colocación y stock de módulos de cinta (máx 32)', () => {
    const conveyors = new ConveyorSystem();
    const m = conveyors.placeModule(0, -10, 0, 0, -1);
    expect(m).not.toBeNull();
    expect(m?.speed).toBe(3.5);
    expect(conveyors.getModules()).toHaveLength(1);
    expect(conveyors.getAvailableStock(10)).toBe(9);

    conveyors.removeModule(m!.id);
    expect(conveyors.getModules()).toHaveLength(0);
    expect(conveyors.getAvailableStock(10)).toBe(10);
  });

  it('detecta atasco cuando un módulo queda obstruido por terreno', () => {
    const conveyors = new ConveyorSystem();
    conveyors.placeModule(0, -10, 0, 0, -1);

    const mockTerrain = {
      isSolid: (x: number, y: number, z: number) => y >= -9.8,
    } as any;

    conveyors.update(0.6, { queryNear: () => {} } as any, mockTerrain);
    expect(conveyors.isAnyJammed()).toBe(true);
  });
});

describe('Etapas de Huella de Explotación en la Superficie', () => {
  it('determina correctamente la etapa según el día de la operación', () => {
    // Etapa 0 (Días 1–3): operación inicial
    expect(computeFootprintStage(1)).toBe(0);
    expect(computeFootprintStage(3)).toBe(0);

    // Etapa 1 (Días 4–7): montón de estéril
    expect(computeFootprintStage(4)).toBe(1);
    expect(computeFootprintStage(7)).toBe(1);

    // Etapa 2 (Días 8–12): árboles muertos
    expect(computeFootprintStage(8)).toBe(2);
    expect(computeFootprintStage(12)).toBe(2);

    // Etapa 3 (Días 13–15): cráter visible
    expect(computeFootprintStage(13)).toBe(3);
    expect(computeFootprintStage(15)).toBe(3);

    // Etapa 4 (Día 16+): paisaje industrial ilimitado
    expect(computeFootprintStage(16)).toBe(4);
    expect(computeFootprintStage(25)).toBe(4);
  });
});
