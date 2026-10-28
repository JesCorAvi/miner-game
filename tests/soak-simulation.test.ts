import { describe, expect, it } from 'vitest';
import { MAX_CONVEYORS, MAX_EMPLOYEES, quotaForDay } from '../src/config';
import { BigValue } from '../src/core/BigValue';
import { BrigadeManager, type SectorBeacon } from '../src/entities/Brigades';
import { ConveyorSystem } from '../src/world/Conveyors';
import { PROTOCOL_VERSION, encodeMessage } from '../src/network/Protocol';

describe('Prueba de Remojo y Límite de Payload (10 Días de Simulación)', () => {
  it('ejecuta 10 días de progresión sin desbordar cotas ni límites de snapshot', () => {
    const brigadeManager = new BrigadeManager();
    const conveyorSystem = new ConveyorSystem();

    // 4 balizas de sector (máximo permitido)
    for (let s = 1; s <= 4; s++) {
      const sector: SectorBeacon = {
        id: `sec-${s}`,
        name: `Sector Profundo ${s}`,
        x: (s - 2.5) * 10,
        y: -15 * s,
        z: 0,
        radius: 8.0,
        layer: Math.min(4, s),
        density: 1.0 + s * 0.2,
      };
      expect(brigadeManager.addSector(sector)).toBe(true);
      // Contratar brigada para cada sector
      const brigade = brigadeManager.hireBrigade('miners', sector.id, 1000 + s);
      expect(brigade).not.toBeNull();
    }

    // 32 módulos de cinta (máximo permitido)
    for (let c = 0; c < MAX_CONVEYORS; c++) {
      const placed = conveyorSystem.placeModule((c % 8) * 3, -10 - Math.floor(c / 8) * 5, 0, 1, 0);
      expect(placed).not.toBeNull();
    }
    expect(conveyorSystem.getModules().length).toBe(MAX_CONVEYORS);

    // Simulación de 10 días consecutivos
    let totalCarbonMined = 0;
    let accumulatedCapital = BigValue.fromNumber(500);

    for (let day = 1; day <= 10; day++) {
      const quota = quotaForDay(day, 1);
      expect(quota).toBeGreaterThan(0);

      // Simular throughput de brigadas
      const brigadeReport = brigadeManager.update(1.0, true, 1000 + day);
      expect(brigadeReport.carbon).toBeGreaterThan(0);
      totalCarbonMined += brigadeReport.carbon;

      // Actualizar capital simulado con BigValue
      accumulatedCapital = accumulatedCapital.add(BigValue.fromNumber(brigadeReport.money));

      // Simular carves acumulados del día (hasta 200 carves en el turno)
      const carves: Array<[number, number, number, number, number, number, number]> = [];
      for (let k = 0; k < 200; k++) {
        carves.push([k * 0.1, -10 - (k % 20), k * 0.05, 1.5, 2, 1, k]);
      }

      // Construir snapshot de estado equivalente al de NetworkBridge
      const snapshot = {
        v: PROTOCOL_VERSION,
        t: 'snapshot' as const,
        day,
        quota,
        quotaSecured: true,
        money: accumulatedCapital.toNumber(),
        carbon: totalCarbonMined,
        carbonWire: BigValue.fromNumber(totalCarbonMined).toWire(),
        quotaWire: BigValue.fromNumber(quota).toWire(),
        moneyWire: accumulatedCapital.toWire(),
        carves,
        nodes: Array.from({ length: 50 }, (_, i) => ({ id: `node-${i}`, hp: 100 })),
        winches: [
          { id: 'w-1', x: 0, topY: 0, bottomY: -30, z: 0 },
          { id: 'w-2', x: 10, topY: 0, bottomY: -60, z: 5 },
        ],
        depots: [
          { id: 'd-1', x: 2, y: -20, z: 2, carbon: 150, money: 300, weight: 80, count: 25 },
        ],
        beacons: [
          { id: 'b-1', x: 0, y: -10, z: 0, color: 0x3b82f6, label: 'Entrada' },
        ],
        brigades: brigadeManager.getBrigades(),
        sectors: brigadeManager.getSectors(),
        conveyors: conveyorSystem.getModules(),
      };

      const serialized = encodeMessage(snapshot as any);

      // La invariante de red WebRTC exige que ningún mensaje supere MAX_MESSAGE_LENGTH (512 KiB)
      const sizeBytes = new TextEncoder().encode(serialized).length;
      expect(sizeBytes).toBeLessThan(512 * 1024);
      // En la práctica un snapshot de 200 carves + entidades debe ocupar < 64 KiB
      expect(sizeBytes).toBeLessThan(64 * 1024);
    }

    // Comprobaciones de integridad
    expect(brigadeManager.getSectors().length).toBeLessThanOrEqual(4);
    expect(conveyorSystem.getModules().length).toBeLessThanOrEqual(MAX_CONVEYORS);
    expect(accumulatedCapital.cmp(BigValue.fromNumber(0))).toBe(1);
  });
});
