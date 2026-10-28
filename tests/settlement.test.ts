import { describe, expect, it } from 'vitest';
import {
  calculatePunctualityBonus,
  calculateSurplusTrade,
  MINERALS,
} from '../src/config';
import {
  buildDayReport,
  emptyDayLedger,
  recordDeposit,
} from '../src/core/DaySettlement';

describe('Liquidación de Turno, Prima de Puntualidad y Canje de Excedente', () => {
  describe('Depósito sin capital por carbón', () => {
    it('el carbón no genera dinero al registrarse en el ledger', () => {
      const ledger = emptyDayLedger();
      recordDeposit(
        ledger,
        [
          { mineral: 'coal', count: 5, carbon: 40, money: 0 },
          { mineral: 'coalDense', count: 2, carbon: 28, money: 0 },
        ],
        0,
      );

      const report = buildDayReport(ledger, 1, 68, 40, 0, 100);
      expect(report.carbon).toBe(68);
      expect(report.oreValue).toBe(0);
      expect(report.otherValue).toBe(0);
      // El total de ventas directas de mineral es 0
      const totalOreMoney = report.lines.reduce((acc, l) => acc + l.money, 0);
      expect(totalOreMoney).toBe(0);
    });

    it('los minerales de capital sí generan dinero en el ledger', () => {
      const ledger = emptyDayLedger();
      recordDeposit(
        ledger,
        [
          { mineral: 'coal', count: 5, carbon: 40, money: 0 },
          { mineral: 'copper', count: 3, carbon: 0, money: 42 },
        ],
        42,
      );

      const report = buildDayReport(ledger, 1, 40, 40, 42, 142);
      expect(report.carbon).toBe(40);
      expect(report.oreValue).toBe(42);
      expect(report.lines.find((l) => l.mineral === 'copper')?.money).toBe(42);
      expect(report.lines.find((l) => l.mineral === 'coal')?.money).toBe(0);
    });
  });

  describe('Prima de Puntualidad (calculatePunctualityBonus)', () => {
    const dayDuration = 90;

    it('devuelve 0 si la cuota no fue asegurada o el valor de minerales es 0', () => {
      expect(calculatePunctualityBonus(500, null, dayDuration)).toBe(0);
      expect(calculatePunctualityBonus(0, 15, dayDuration)).toBe(0);
    });

    it('otorga el 12 % íntegro de minerales si se cubre en el primer 25 % del turno', () => {
      // 25% de 90s es 22.5s. Si se cubre a los 10s:
      const oreValue = 1000;
      const bonus = calculatePunctualityBonus(oreValue, 10, dayDuration);
      expect(bonus).toBe(120); // 12% de 1000

      // A los 22.5s exactos (25% elapsed):
      const bonusEdge = calculatePunctualityBonus(oreValue, 22.5, dayDuration);
      expect(bonusEdge).toBe(120);
    });

    it('decae linealmente entre el 25 % y el 75 % del turno', () => {
      const oreValue = 1000;
      // Al 50% del turno (45s de 90s): factor = (0.75 - 0.5) / 0.5 = 0.5 (la mitad del 12% = 6%)
      const bonusHalf = calculatePunctualityBonus(oreValue, 45, dayDuration);
      expect(bonusHalf).toBe(60);
    });

    it('otorga 0 % si se cubre en el último 25 % del turno (≥75 % transcurrido)', () => {
      const oreValue = 1000;
      // 75% de 90s es 67.5s
      expect(calculatePunctualityBonus(oreValue, 67.5, dayDuration)).toBe(0);
      expect(calculatePunctualityBonus(oreValue, 85, dayDuration)).toBe(0);
    });
  });

  describe('Canje de Excedente (calculateSurplusTrade)', () => {
    it('devuelve 0 si no hay excedente o no se vendieron minerales', () => {
      // Sin excedente
      expect(calculateSurplusTrade(40, 40, 500)).toEqual({ surplusCarbon: 0, surplusCapital: 0 });
      expect(calculateSurplusTrade(30, 40, 500)).toEqual({ surplusCarbon: 0, surplusCapital: 0 });
      // Sin minerales vendidos (no se puede usar el carbón como granja de dinero sin minar)
      expect(calculateSurplusTrade(100, 40, 0)).toEqual({ surplusCarbon: 60, surplusCapital: 0 });
    });

    it('convierte el excedente a 0,20 $/t respetando el tope del 20 % del valor de mineral', () => {
      const oreValue = 500; // tope del 20% = 100 $
      // Excedente de 100 t a 0,20 $/t = 20 $ (menor que el tope de 100)
      const res1 = calculateSurplusTrade(140, 40, oreValue);
      expect(res1.surplusCarbon).toBe(100);
      expect(res1.surplusCapital).toBe(20);

      // Excedente masivo de 1000 t a 0,20 $/t = 200 $ (topado a 100 $)
      const res2 = calculateSurplusTrade(1040, 40, oreValue);
      expect(res2.surplusCarbon).toBe(1000);
      expect(res2.surplusCapital).toBe(100);
    });
  });

  describe('Acta de Extracción y Reporte Completo', () => {
    it('incluye prima, canje, bonus y total en DayReport si el día termina con éxito', () => {
      const ledger = emptyDayLedger();
      recordDeposit(
        ledger,
        [
          { mineral: 'coal', count: 10, carbon: 80, money: 0 },
          { mineral: 'copper', count: 10, carbon: 0, money: 140 },
        ],
        140,
      );

      // Día 1: cuota 40, carbon entregado 80 (excedente 40), oreValue 140, cubierto a los 10s (de 90s)
      const report = buildDayReport(ledger, 1, 80, 40, 140, 140, 10, 90);

      expect(report.day).toBe(1);
      expect(report.carbon).toBe(80);
      expect(report.quota).toBe(40);
      expect(report.oreValue).toBe(140);

      // Prima de puntualidad: 12% de 140 = 17 $
      expect(report.punctuality).toBe(Math.round(140 * 0.12));

      // Canje de excedente: 40 t surplus a 0.20 = 8 $ (cap: 140 * 0.20 = 28 $)
      expect(report.surplusCarbon).toBe(40);
      expect(report.surplusCapital).toBe(8);

      // Total debe ser oreValue + bonus + punctuality + surplusCapital
      expect(report.total).toBe(
        report.oreValue + report.bonus + report.punctuality + report.surplusCapital,
      );
    });

    it('en caso de fracaso no acredita bonus, ni prima, ni canje', () => {
      const ledger = emptyDayLedger();
      recordDeposit(ledger, [{ mineral: 'coal', count: 2, carbon: 16, money: 0 }], 0);

      const report = buildDayReport(ledger, 1, 16, 40, 0, 0, null, 90);
      expect(report.bonus).toBe(0);
      expect(report.punctuality).toBe(0);
      expect(report.surplusCapital).toBe(0);
      expect(report.total).toBe(0);
    });
  });
});
