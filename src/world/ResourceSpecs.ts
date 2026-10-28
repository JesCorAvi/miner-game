import { MINE_DEPTH, MINERALS } from '../config';
import { BIOMES } from '../data/biomes';
import { COAL_IDS_BY_BIOME, ORE_IDS_BY_BIOME } from '../data/minerals';
import type { DifficultyModifier, MineralId } from '../types';

export interface ResourceSpec {
  type: MineralId;
  clusters: number;
  minNodes: number;
  maxNodes: number;
  depthMin: number;
  depthMax: number;
}

function buildBaseSpecs(): ResourceSpec[] {
  const specs: ResourceSpec[] = [];
  for (const biome of BIOMES) {
    const span = biome.to - biome.from;
    const clusters = span >= 36 ? 90 : 60;
    const coalId = COAL_IDS_BY_BIOME[biome.index - 1];
    if (coalId) {
      specs.push({
        type: coalId,
        clusters,
        minNodes: 5,
        maxNodes: 9,
        depthMin: biome.from + 1,
        depthMax: biome.to - 1,
      });
    }
    for (const oreId of ORE_IDS_BY_BIOME[biome.index - 1] ?? []) {
      specs.push({
        type: oreId,
        clusters: Math.max(12, Math.round(clusters * 0.55)),
        minNodes: 4,
        maxNodes: 7,
        depthMin: biome.from + 2,
        depthMax: biome.to - 2,
      });
    }
  }
  return specs;
}

/**
 * Distribución por bioma. SOLO ARCILLA reutiliza los minerales de arcilla a
 * cualquier profundidad; SOLO CARBÓN elimina los minerales de capital.
 */
export function buildResourceSpecs(
  modifiers: readonly DifficultyModifier[],
): ResourceSpec[] {
  if (modifiers.includes('only_clay')) {
    const clayCoal = COAL_IDS_BY_BIOME[0];
    const clayOres = ORE_IDS_BY_BIOME[0] ?? [];
    const specs: ResourceSpec[] = [
      {
        type: clayCoal,
        clusters: 220,
        minNodes: 5,
        maxNodes: 9,
        depthMin: 1,
        depthMax: MINE_DEPTH - 1,
      },
      ...clayOres.map((type) => ({
        type,
        clusters: 120,
        minNodes: 4,
        maxNodes: 7,
        depthMin: 2,
        depthMax: MINE_DEPTH - 2,
      })),
    ];
    return modifiers.includes('only_coal')
      ? specs.filter((spec) => MINERALS[spec.type]?.family === 'coal')
      : specs;
  }
  const base = buildBaseSpecs();
  return modifiers.includes('only_coal')
    ? base.filter((spec) => MINERALS[spec.type]?.family === 'coal')
    : base;
}
