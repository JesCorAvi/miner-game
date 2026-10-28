import type { BiomeDefinition, LayerDefinition } from '../types';

/**
 * Estructura vertical de Carbon Magnate.
 *
 * 12 biomas repartidos en 20 niveles de 12 m (240 m en total). Los cuatro
 * primeros biomas conservan la escala de HP de referencia (×1, ×10, ×100,
 * ×1.000); a partir de la roca negra la escala se dispara para que cada capa
 * sea un muro de equipo.
 */
export const MINE_DEPTH = 240;
export const LAYER_HEIGHT = 12;
export const LEVEL_COUNT = 20;

export const BIOMES: readonly BiomeDefinition[] = [
  {
    index: 1,
    name: 'ARCILLA OCRE',
    subtitle: 'Terreno blando · carbón y cobre',
    from: 0,
    to: 36,
    hpScale: 1,
    hardness: 1,
    rock: 0x8e5636,
    highlight: 0xc9844b,
    accent: '#d79353',
  },
  {
    index: 2,
    name: 'PIZARRA GRIS',
    subtitle: 'Dureza media · hierro y plata',
    from: 36,
    to: 72,
    hpScale: 10,
    hardness: 1.7,
    rock: 0x535b5b,
    highlight: 0x7d8987,
    accent: '#9aa8a3',
  },
  {
    index: 3,
    name: 'HIELO PROFUNDO',
    subtitle: 'Roca helada · zafiro y esmeralda',
    from: 72,
    to: 108,
    hpScale: 100,
    hardness: 2.2,
    rock: 0x5b7d8a,
    highlight: 0xa8d8e8,
    accent: '#9fe4f2',
  },
  {
    index: 4,
    name: 'BASALTO MAGMÁTICO',
    subtitle: 'Roca dura · oro y rubí',
    from: 108,
    to: 144,
    hpScale: 1_000,
    hardness: 2.8,
    rock: 0x552921,
    highlight: 0x9b4932,
    accent: '#df7150',
  },
  {
    index: 5,
    name: 'ROCA NEGRA',
    subtitle: 'Muro de equipo · obsidiana',
    from: 144,
    to: 156,
    hpScale: 100_000,
    hardness: 3.6,
    rock: 0x1b1b22,
    highlight: 0x3a3a4a,
    accent: '#8f8fb0',
  },
  {
    index: 6,
    name: 'ESTRATO VERDE',
    subtitle: 'Mineralización densa · jade',
    from: 156,
    to: 168,
    hpScale: 10_000_000,
    hardness: 4.2,
    rock: 0x1f3d2b,
    highlight: 0x4f8f5f,
    accent: '#76d68e',
  },
  {
    index: 7,
    name: 'ESTRATO NARANJA',
    subtitle: 'Calor residual · ámbar',
    from: 168,
    to: 180,
    hpScale: 1_000_000_000,
    hardness: 4.8,
    rock: 0x4a2a12,
    highlight: 0xc26a22,
    accent: '#ffa04a',
  },
  {
    index: 8,
    name: 'ESTRATO PÚRPURA',
    subtitle: 'Cristalización extrema · amatista profunda',
    from: 180,
    to: 192,
    hpScale: 100_000_000_000,
    hardness: 5.4,
    rock: 0x2d1b4a,
    highlight: 0x7b4fc2,
    accent: '#c08cff',
  },
  {
    index: 9,
    name: 'VERDE ABISAL',
    subtitle: 'Endgame · esmeralda profunda',
    from: 192,
    to: 204,
    hpScale: 100_000_000_000_000,
    hardness: 6,
    rock: 0x13261a,
    highlight: 0x2f6b3f,
    accent: '#54ff9a',
  },
  {
    index: 10,
    name: 'ESTRATO AMARILLO',
    subtitle: 'Endgame · azufre y citrino',
    from: 204,
    to: 216,
    hpScale: 100_000_000_000_000_000,
    hardness: 6.6,
    rock: 0x4a3d0e,
    highlight: 0xc9b02a,
    accent: '#ffe75a',
  },
  {
    index: 11,
    name: 'MARRÓN ABISAL',
    subtitle: 'Endgame · titanio y cuarzo ahumado',
    from: 216,
    to: 228,
    hpScale: 1e22,
    hardness: 7.2,
    rock: 0x2a1b12,
    highlight: 0x6b4a2f,
    accent: '#d2a06a',
  },
  {
    index: 12,
    name: 'AZUL ABISAL',
    subtitle: 'Fondo del pozo · piedra lunar',
    from: 228,
    to: 240,
    hpScale: 1e29,
    hardness: 8,
    rock: 0x0b1a3a,
    highlight: 0x2a4f9a,
    accent: '#6aa8ff',
  },
] as const;

/** Niveles que ocupa cada bioma. La suma debe ser LEVEL_COUNT. */
const BIOME_LEVELS: readonly number[] = [3, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1];

function buildLayers(): readonly LayerDefinition[] {
  const layers: LayerDefinition[] = [];
  let level = 1;
  for (const biome of BIOMES) {
    const levels = BIOME_LEVELS[biome.index - 1] ?? 1;
    for (let step = 0; step < levels && level <= LEVEL_COUNT; step += 1) {
      const from = (level - 1) * LAYER_HEIGHT;
      const to = from + LAYER_HEIGHT;
      layers.push({
        index: level,
        biomeIndex: biome.index,
        biomeName: biome.name,
        name: `${biome.name} · NIVEL ${level}`,
        subtitle: `${biome.subtitle} · ${from}–${to} m`,
        from,
        to,
        hardness: Number((biome.hardness * (1 + step * 0.06)).toFixed(2)),
        rock: biome.rock,
        highlight: biome.highlight,
        accent: biome.accent,
      });
      level += 1;
    }
  }
  return layers;
}

export const LAYERS: readonly LayerDefinition[] = buildLayers();

export function layerAtDepth(depth: number): LayerDefinition {
  const clamped = Math.max(0, Math.min(MINE_DEPTH - 0.001, depth));
  for (let index = LAYERS.length - 1; index >= 0; index -= 1) {
    if (clamped >= LAYERS[index].from) {
      return LAYERS[index];
    }
  }
  return LAYERS[0];
}

export function biomeAtDepth(depth: number): BiomeDefinition {
  return BIOMES[layerAtDepth(depth).biomeIndex - 1] ?? BIOMES[0];
}

export function levelAtDepth(depth: number): number {
  return layerAtDepth(depth).index;
}

/** Nivel central de un bioma, útil para colocar minerales. */
export function levelsOfBiome(index: number): readonly LayerDefinition[] {
  return LAYERS.filter((layer) => layer.biomeIndex === index);
}
