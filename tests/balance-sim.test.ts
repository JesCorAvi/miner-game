import { describe, expect, it } from 'vitest';
import { BIOMES, LAYERS, MINE_DEPTH, layerAtDepth } from '../src/data/biomes';
import {
  DIFFICULTY_MODIFIERS,
  GAME_MODES,
  baseQuotaForDay,
  quotaForDay,
} from '../src/data/modes';
import { PICKAXE_TIERS } from '../src/data/weaponTiers';
import { estimateReturnTime } from '../src/core/ReturnPlanner';
import { BigValue } from '../src/core/BigValue';

describe('Balance de referencia — 12 biomas, 20 niveles y 30 días', () => {
  it('la escala vertical cubre 20 niveles de 12 m y 12 biomas', () => {
    expect(MINE_DEPTH).toBe(240);
    expect(LAYERS).toHaveLength(20);
    expect(BIOMES).toHaveLength(12);
    expect(layerAtDepth(0).index).toBe(1);
    expect(layerAtDepth(0).biomeIndex).toBe(1);
    expect(layerAtDepth(36).index).toBe(4);
    expect(layerAtDepth(36).biomeIndex).toBe(2);
    expect(layerAtDepth(239.9).index).toBe(20);
    expect(layerAtDepth(239.9).biomeIndex).toBe(12);
  });

  it('mantiene la tabla verificada hasta el día 10 y la curva documentada hasta el 30', () => {
    const expected = [40, 80, 160, 320, 580, 900, 1500, 2200, 3000, 5000];
    expected.forEach((quota, index) => {
      expect(baseQuotaForDay(index + 1)).toBe(quota);
    });
    expect(baseQuotaForDay(15)).toBeGreaterThan(50_000);
    expect(baseQuotaForDay(25)).toBeGreaterThan(50_000_000_000);
    expect(baseQuotaForDay(25)).toBeLessThan(60_000_000_000);
    expect(baseQuotaForDay(30)).toBeGreaterThan(1e13);
    expect(baseQuotaForDay(31)).toBe(Math.round((baseQuotaForDay(30) * 4) / 10) * 10);
  });

  it('aplica los 3 modos y el multiplicador cooperativo', () => {
    expect(GAME_MODES.map((mode) => mode.id)).toEqual(['normal', 'tough', 'peaceful']);
    expect(DIFFICULTY_MODIFIERS).toHaveLength(6);
    const normal = quotaForDay(10, 1, 'normal', []);
    expect(quotaForDay(10, 1, 'tough', [])).toBe(Math.floor(normal / 2));
    expect(quotaForDay(10, 1, 'peaceful', [])).toBe(0);
    expect(quotaForDay(10, 2, 'normal', [])).toBe(Math.round(normal * 1.6));
    expect(quotaForDay(10, 4, 'normal', [])).toBe(Math.round(normal * 2.8));
  });

  it('la escalera de picos tiene 15 tiers y llega a la fuerza de Ónice', () => {
    expect(PICKAXE_TIERS).toHaveLength(15);
    expect(PICKAXE_TIERS[0].strength).toBe(30);
    expect(PICKAXE_TIERS[14].strength).toBe(5e24);
    expect(PICKAXE_TIERS[14].buy).toBe(1.65e25);
    for (let index = 0; index < PICKAXE_TIERS.length - 1; index += 1) {
      expect(PICKAXE_TIERS[index + 1].strength).toBeGreaterThan(
        PICKAXE_TIERS[index].strength,
      );
    }
  });

  it('el reloj de retorno mantiene un error <= 20 % en cotas de 240 m', () => {
    const cases = [
      { depth: 20, horiz: 8, ladders: 5, cargoRatio: 0.1, winch: false },
      { depth: 60, horiz: 16, ladders: 12, cargoRatio: 0.5, winch: false },
      { depth: 120, horiz: 22, ladders: 20, cargoRatio: 0.85, winch: false },
      { depth: 180, horiz: 14, ladders: 0, cargoRatio: 0.4, winch: true },
      { depth: 230, horiz: 28, ladders: 35, cargoRatio: 0.95, winch: false },
    ];
    for (const tc of cases) {
      const walkTime = (tc.horiz * 1.2) / 4.5;
      const climbTime = tc.depth / (tc.winch ? 8 : 3.3);
      const transitions = tc.winch ? 0.5 : tc.ladders * 0.8;
      let realTime = walkTime + climbTime + transitions + 1.2;
      if (tc.cargoRatio > 0.8) realTime *= 1.1;
      const estimated = estimateReturnTime(
        tc.horiz,
        tc.depth,
        tc.ladders,
        50 * tc.cargoRatio,
        50,
        tc.winch,
      );
      expect(Math.abs(estimated - realTime) / realTime).toBeLessThanOrEqual(0.2);
    }
  });

  it('formatea las cuotas grandes sin perder legibilidad', () => {
    const day25 = BigValue.fromNumber(baseQuotaForDay(25));
    const day30 = BigValue.fromNumber(baseQuotaForDay(30));
    expect(day25.formatShort()).toMatch(/MM|×10/);
    expect(day30.formatShort()).toMatch(/×10/);
    expect(day25.toNumber()).toBe(baseQuotaForDay(25));
  });
});
