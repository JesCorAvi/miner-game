import { describe, expect, it } from 'vitest';
import { BIOMES } from '../src/data/biomes';
import {
  COAL_IDS_BY_BIOME,
  MINERALS,
  MINERAL_IDS,
  ORE_IDS_BY_BIOME,
} from '../src/data/minerals';

describe('Tabla de Minerales y Ley de Doble Divisa (referencia, 12 biomas)', () => {
  it('hay 12 carbones, 24 minerales de capital y 36 minerales en total', () => {
    expect(COAL_IDS_BY_BIOME).toHaveLength(12);
    expect(MINERAL_IDS).toHaveLength(36);
    expect(ORE_IDS_BY_BIOME.flat()).toHaveLength(24);
    for (const id of COAL_IDS_BY_BIOME) {
      expect(MINERALS[id]).toBeDefined();
      expect(MINERALS[id].family).toBe('coal');
    }
    for (const id of ORE_IDS_BY_BIOME.flat()) {
      expect(MINERALS[id]).toBeDefined();
      expect(MINERALS[id].family).toBe('ore');
    }
  });

  it('el carbón paga 1 g por unidad además de la cuota', () => {
    for (const id of COAL_IDS_BY_BIOME) {
      const def = MINERALS[id];
      expect(def.carbonYield).toBeGreaterThan(0);
      expect(def.moneyYield).toBe(def.carbonYield);
    }
  });

  it('el HP y el rendimiento del carbón siguen la ley ×10 / ×5 por bioma', () => {
    COAL_IDS_BY_BIOME.forEach((id, index) => {
      const def = MINERALS[id];
      expect(def.hp).toBe(Math.round(150 * BIOMES[index].hpScale));
      expect(def.carbonYield).toBe(Math.round(4.5 * Math.pow(5, index)));
    });
  });

  it('la ley de carbón por HP decrece estrictamente con la profundidad', () => {
    const rates = COAL_IDS_BY_BIOME.map(
      (id) => MINERALS[id].carbonYield / MINERALS[id].hp,
    );
    for (let index = 0; index < rates.length - 1; index += 1) {
      expect(rates[index]).toBeGreaterThan(rates[index + 1]);
    }
    expect(rates[0]).toBeCloseTo(0.0333, 3);
    expect(rates[3]).toBeCloseTo(0.00375, 5);
  });

  it('ningún carbón supera a un mineral de capital en $/HP', () => {
    for (const coalId of COAL_IDS_BY_BIOME) {
      const coalDef = MINERALS[coalId];
      const coalRate = coalDef.moneyYield / coalDef.hp;
      for (const oreId of ORE_IDS_BY_BIOME[coalDef.layer - 1]) {
        const ore = MINERALS[oreId];
        expect(ore.moneyYield / ore.hp).toBeGreaterThan(coalRate);
      }
    }
  });

  it('los minerales de capital tienen leyes crecientes con la profundidad', () => {
    const firstOreRates = ORE_IDS_BY_BIOME.map((ids) => {
      const ore = MINERALS[ids[0]];
      return ore.moneyYield / ore.hp;
    });
    for (let index = 0; index < firstOreRates.length - 1; index += 1) {
      expect(firstOreRates[index + 1]).toBeGreaterThan(firstOreRates[index]);
    }
    expect(firstOreRates[11]).toBeGreaterThan(firstOreRates[0] * 1000);
  });
});
