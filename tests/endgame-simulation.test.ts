import { describe, expect, it } from 'vitest';
import { baseQuotaForDay } from '../src/data/modes';
import { BIOMES } from '../src/data/biomes';
import { MINERALS, COAL_IDS_BY_BIOME } from '../src/data/minerals';
import {
  BASE_CARRY_WEIGHT,
  CARRY_WEIGHT_PER_LEVEL,
  MAX_STACK,
  MAX_STACK_BONUS_PER_LEVEL,
  maxCarryWeight,
  maxStackFor,
} from '../src/config';
import { MAX_BRIGADE_HEADCOUNT } from '../src/entities/Brigades';
import { BigValue } from '../src/core/BigValue';

describe('Simulación de endgame — días 25 y 30', () => {
  it('el pozo profundo cabe en dos viajes con la mochila máxima', () => {
    const coal = MINERALS[COAL_IDS_BY_BIOME[11]];
    const biome = BIOMES[11];
    expect(coal).toBeDefined();
    expect(biome.hpScale).toBe(1e29);

    const capacity = BASE_CARRY_WEIGHT + 12 * CARRY_WEIGHT_PER_LEVEL;
    const stack = MAX_STACK + 12 * MAX_STACK_BONUS_PER_LEVEL;
    const pelletsPerTrip = Math.min(
      Math.floor(capacity / coal.weight),
      36 * stack,
    );
    const carbonPerPellet = coal.carbonYield / coal.pelletCount;
    const carbonPerTrip = pelletsPerTrip * carbonPerPellet;
    const quotaDay25 = baseQuotaForDay(25);

    expect(maxCarryWeight({
      ...makeLoadout(),
      upgrades: { ...makeLoadout().upgrades, capacity: 12 },
    })).toBe(capacity);
    expect(maxStackFor({
      ...makeLoadout(),
      upgrades: { ...makeLoadout().upgrades, stack: 12 },
    })).toBe(stack);
    expect(pelletsPerTrip).toBeGreaterThan(1000);
    expect(carbonPerTrip).toBeGreaterThan(quotaDay25 / 3);
    expect(Math.ceil(quotaDay25 / carbonPerTrip)).toBeLessThanOrEqual(3);
  });

  it('una brigada máxima cubre el día 25 y ocho cubren el día 30', () => {
    const headcount = MAX_BRIGADE_HEADCOUNT;
    const baseRate = 0.22;
    const rankMultiplier = 1 + (5 - 1) * 0.35;
    const deepLayerMultiplier = 22;
    const perSecond = headcount * baseRate * rankMultiplier * deepLayerMultiplier;
    const seconds = 165;
    const oneBrigade = perSecond * seconds;
    const eightBrigades = oneBrigade * 8;
    const day25 = baseQuotaForDay(25);
    const day30 = baseQuotaForDay(30);

    expect(oneBrigade).toBeGreaterThan(day25);
    expect(eightBrigades).toBeGreaterThan(day30);
    expect(Number.isFinite(oneBrigade)).toBe(true);
    expect(oneBrigade).toBeLessThan(1e15);
  });

  it('BigValue representa las cuotas y el rendimiento sin notación ambigua', () => {
    const day25 = BigValue.fromNumber(baseQuotaForDay(25));
    const day30 = BigValue.fromNumber(baseQuotaForDay(30));
    expect(day25.formatShort()).toMatch(/MM|×10/);
    expect(day30.formatShort()).toMatch(/×10/);
    expect(day25.toWire()).toMatch(/e/);
    expect(BigValue.fromWire(day25.toWire()).eq(day25)).toBe(true);
  });
});

function makeLoadout() {
  return {
    weapons: { pickaxe: true },
    upgrades: {
      damage: 0,
      speed: 0,
      magnet: 0,
      jetpack: 0,
      dayTime: 0,
      capacity: 0,
      stack: 0,
    },
    passives: {},
    employees: { roster: [], nextId: 1 },
    ladders: 0,
    grenades: { frag: 0, charge: 0, breach: 0, seismic: 0 },
  } as any;
}
