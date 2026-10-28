import type { MineralDefinition } from '../types';
import { BIOMES } from './biomes';

/**
 * Catálogo de minerales de Carbon Magnate.
 *
 * La escala de HP y de rendimiento sigue la ley de merma de referencia: el HP
 * se multiplica por 10 en los cuatro primeros biomas y el carbón solo por 5,
 * de modo que el carbón profundo rinde menos cuota por golpe. Los minerales
 * de capital se multiplican por la misma escala de bioma para que la
 * profundidad siga siendo la fuente principal de progreso.
 */
interface CoalTemplate {
  id: string;
  name: string;
  shortName: string;
  color: number;
  emissive: number;
  glow: number;
  weight: number;
  pelletCount: number;
}

interface OreTemplate {
  id: string;
  name: string;
  shortName: string;
  biome: number;
  baseHp: number;
  baseMoney: number;
  color: number;
  emissive: number;
  glow: number;
  weight: number;
  pelletCount: number;
  metalness: number;
  roughness: number;
}

const COAL_TEMPLATES: readonly CoalTemplate[] = [
  { id: 'coal', name: 'Carbón Común', shortName: 'CARBÓN', color: 0x20282b, emissive: 0x22383d, glow: 0x4f9aa1, weight: 0.12, pelletCount: 8 },
  { id: 'coalDense', name: 'Carbón Denso', shortName: 'DENSO', color: 0x101617, emissive: 0x3e6c73, glow: 0x69d8df, weight: 0.14, pelletCount: 8 },
  { id: 'coalPressure', name: 'Carbón Presurizado', shortName: 'PRESURIZADO', color: 0x22140f, emissive: 0xe05c24, glow: 0xff8b45, weight: 0.16, pelletCount: 9 },
  { id: 'coalPure', name: 'Carbón Puro', shortName: 'PURO', color: 0x1d1730, emissive: 0xc58cff, glow: 0xd8a8ff, weight: 0.18, pelletCount: 10 },
  { id: 'coalBlack', name: 'Carbón Negro', shortName: 'NEGRO', color: 0x0c0c10, emissive: 0x4a4a6a, glow: 0x8f8fb0, weight: 0.2, pelletCount: 10 },
  { id: 'coalGreen', name: 'Carbón Verde', shortName: 'VERDE', color: 0x102418, emissive: 0x2f8f4f, glow: 0x76d68e, weight: 0.22, pelletCount: 10 },
  { id: 'coalOrange', name: 'Carbón Naranja', shortName: 'NARANJA', color: 0x2a1508, emissive: 0xff7a18, glow: 0xffa04a, weight: 0.24, pelletCount: 11 },
  { id: 'coalPurple', name: 'Carbón Púrpura', shortName: 'PÚRPURA', color: 0x241238, emissive: 0x9a4cff, glow: 0xc08cff, weight: 0.26, pelletCount: 11 },
  { id: 'coalJade', name: 'Carbón de Jade', shortName: 'JADE', color: 0x0b2014, emissive: 0x18ff7a, glow: 0x54ff9a, weight: 0.28, pelletCount: 11 },
  { id: 'coalYellow', name: 'Carbón Amarillo', shortName: 'AMARILLO', color: 0x2a2408, emissive: 0xffe000, glow: 0xfff06a, weight: 0.3, pelletCount: 12 },
  { id: 'coalBrown', name: 'Carbón Marrón', shortName: 'MARRÓN', color: 0x1a100a, emissive: 0x8f5a2a, glow: 0xd2a06a, weight: 0.32, pelletCount: 12 },
  { id: 'coalAbyss', name: 'Carbón Abisal', shortName: 'ABISAL', color: 0x081226, emissive: 0x2a6aff, glow: 0x6aa8ff, weight: 0.34, pelletCount: 12 },
];

const ORE_TEMPLATES: readonly OreTemplate[] = [
  { id: 'copper', name: 'Cobre', shortName: 'COBRE', biome: 1, baseHp: 160, baseMoney: 10, color: 0xa96131, emissive: 0x6a250b, glow: 0xe8894e, weight: 0.14, pelletCount: 7, metalness: 0.62, roughness: 0.5 },
  { id: 'iron', name: 'Hierro', shortName: 'HIERRO', biome: 1, baseHp: 200, baseMoney: 14, color: 0x9fa6a4, emissive: 0x293232, glow: 0xc3d0cf, weight: 0.16, pelletCount: 8, metalness: 0.78, roughness: 0.38 },
  { id: 'silver', name: 'Plata', shortName: 'PLATA', biome: 2, baseHp: 300, baseMoney: 30, color: 0xd8e0e6, emissive: 0x46525c, glow: 0xf2fbff, weight: 0.16, pelletCount: 8, metalness: 0.86, roughness: 0.28 },
  { id: 'amethyst', name: 'Amatista', shortName: 'AMATISTA', biome: 2, baseHp: 400, baseMoney: 140, color: 0x8a53db, emissive: 0x5e27b3, glow: 0xba8cff, weight: 0.14, pelletCount: 8, metalness: 0.3, roughness: 0.2 },
  { id: 'sapphire', name: 'Zafiro', shortName: 'ZAFIRO', biome: 3, baseHp: 270, baseMoney: 55, color: 0x2a5cff, emissive: 0x0b2a9a, glow: 0x6a9cff, weight: 0.14, pelletCount: 8, metalness: 0.35, roughness: 0.16 },
  { id: 'emerald', name: 'Esmeralda', shortName: 'ESMERALDA', biome: 3, baseHp: 300, baseMoney: 90, color: 0x1eb86b, emissive: 0x08713a, glow: 0x63ffc2, weight: 0.2, pelletCount: 10, metalness: 0.28, roughness: 0.18 },
  { id: 'gold', name: 'Oro', shortName: 'ORO', biome: 4, baseHp: 112, baseMoney: 135, color: 0xd9ac3e, emissive: 0x7a4b05, glow: 0xffda73, weight: 0.18, pelletCount: 9, metalness: 0.92, roughness: 0.22 },
  { id: 'ruby', name: 'Rubí', shortName: 'RUBÍ', biome: 4, baseHp: 140, baseMoney: 225, color: 0xc62e48, emissive: 0x8e0d2c, glow: 0xff6a7d, weight: 0.16, pelletCount: 9, metalness: 0.24, roughness: 0.16 },
  { id: 'obsidian', name: 'Obsidiana', shortName: 'OBSIDIANA', biome: 5, baseHp: 180, baseMoney: 400, color: 0x17131f, emissive: 0x3a2a5a, glow: 0x8f6aff, weight: 0.22, pelletCount: 10, metalness: 0.2, roughness: 0.08 },
  { id: 'onyx', name: 'Ónice', shortName: 'ÓNICE', biome: 5, baseHp: 260, baseMoney: 900, color: 0x0b0b0d, emissive: 0x2a2a4a, glow: 0x9a9aff, weight: 0.24, pelletCount: 10, metalness: 0.4, roughness: 0.06 },
  { id: 'jade', name: 'Jade', shortName: 'JADE', biome: 6, baseHp: 220, baseMoney: 1200, color: 0x2fbf7a, emissive: 0x0e6b3a, glow: 0x7dffc0, weight: 0.18, pelletCount: 10, metalness: 0.2, roughness: 0.14 },
  { id: 'malachite', name: 'Malaquita', shortName: 'MALAQUITA', biome: 6, baseHp: 320, baseMoney: 2400, color: 0x1f8f6a, emissive: 0x064a34, glow: 0x54ffd2, weight: 0.2, pelletCount: 10, metalness: 0.26, roughness: 0.2 },
  { id: 'amber', name: 'Ámbar', shortName: 'ÁMBAR', biome: 7, baseHp: 260, baseMoney: 5000, color: 0xff9a1f, emissive: 0x8a3a00, glow: 0xffc46a, weight: 0.18, pelletCount: 10, metalness: 0.12, roughness: 0.25 },
  { id: 'topaz', name: 'Topacio', shortName: 'TOPACIO', biome: 7, baseHp: 360, baseMoney: 9000, color: 0xffc21f, emissive: 0x9a5a00, glow: 0xffe88a, weight: 0.16, pelletCount: 10, metalness: 0.2, roughness: 0.14 },
  { id: 'deepAmethyst', name: 'Amatista Profunda', shortName: 'AMATISTA+', biome: 8, baseHp: 300, baseMoney: 20000, color: 0x6a2aff, emissive: 0x3a0a9a, glow: 0xb08aff, weight: 0.18, pelletCount: 10, metalness: 0.32, roughness: 0.1 },
  { id: 'violetCrystal', name: 'Cristal Violeta', shortName: 'VIOLETA', biome: 8, baseHp: 420, baseMoney: 36000, color: 0xc26aff, emissive: 0x6a1a9a, glow: 0xe8b4ff, weight: 0.2, pelletCount: 11, metalness: 0.28, roughness: 0.08 },
  { id: 'deepEmerald', name: 'Esmeralda Abisal', shortName: 'ESMERALDA+', biome: 9, baseHp: 340, baseMoney: 80000, color: 0x0aff8a, emissive: 0x007a3a, glow: 0x7dffc0, weight: 0.2, pelletCount: 11, metalness: 0.24, roughness: 0.1 },
  { id: 'serpentine', name: 'Serpentina', shortName: 'SERPENTINA', biome: 9, baseHp: 480, baseMoney: 150000, color: 0x2a8a5a, emissive: 0x0a3a1a, glow: 0x8affb4, weight: 0.22, pelletCount: 11, metalness: 0.18, roughness: 0.22 },
  { id: 'sulfur', name: 'Azufre', shortName: 'AZUFRE', biome: 10, baseHp: 380, baseMoney: 320000, color: 0xe8d82a, emissive: 0x8a7a00, glow: 0xfff06a, weight: 0.18, pelletCount: 11, metalness: 0.1, roughness: 0.32 },
  { id: 'citrine', name: 'Citrino', shortName: 'CITRINO', biome: 10, baseHp: 540, baseMoney: 600000, color: 0xffb01f, emissive: 0x9a5a00, glow: 0xffd27a, weight: 0.2, pelletCount: 12, metalness: 0.22, roughness: 0.1 },
  { id: 'titanium', name: 'Titanio', shortName: 'TITANIO', biome: 11, baseHp: 420, baseMoney: 1_300_000, color: 0x9aa8b8, emissive: 0x2a3a4a, glow: 0xd8e8ff, weight: 0.22, pelletCount: 12, metalness: 0.9, roughness: 0.24 },
  { id: 'smokyQuartz', name: 'Cuarzo Ahumado', shortName: 'CUARZO', biome: 11, baseHp: 600, baseMoney: 2_400_000, color: 0x6a5a4a, emissive: 0x2a1a0a, glow: 0xd2b48a, weight: 0.24, pelletCount: 12, metalness: 0.3, roughness: 0.14 },
  { id: 'moonstone', name: 'Piedra Lunar', shortName: 'LUNAR', biome: 12, baseHp: 460, baseMoney: 5_000_000, color: 0xb8d8ff, emissive: 0x2a5a9a, glow: 0xe8f4ff, weight: 0.22, pelletCount: 12, metalness: 0.34, roughness: 0.08 },
  { id: 'voidCrystal', name: 'Cristal del Vacío', shortName: 'VACÍO', biome: 12, baseHp: 700, baseMoney: 9_000_000, color: 0x3a1a6a, emissive: 0x0a003a, glow: 0x9a6aff, weight: 0.26, pelletCount: 12, metalness: 0.4, roughness: 0.05 },
];

function makeCoal(template: CoalTemplate, biomeIndex: number): MineralDefinition {
  const biome = BIOMES[biomeIndex - 1];
  const carbonYield = Math.round(4.5 * Math.pow(5, biomeIndex - 1));
  return {
    id: template.id,
    name: template.name,
    shortName: template.shortName,
    family: 'coal',
    layer: biomeIndex,
    color: template.color,
    emissive: template.emissive,
    roughness: 0.68 - biomeIndex * 0.025,
    metalness: 0.12 + biomeIndex * 0.02,
    hp: Math.round(150 * biome.hpScale),
    radius: 0.62 + biomeIndex * 0.035,
    carbonYield,
    moneyYield: carbonYield,
    pelletCount: template.pelletCount,
    weight: template.weight,
    glow: template.glow,
  };
}

function makeOre(template: OreTemplate): MineralDefinition {
  const biome = BIOMES[template.biome - 1];
  return {
    id: template.id,
    name: template.name,
    shortName: template.shortName,
    family: 'ore',
    layer: template.biome,
    color: template.color,
    emissive: template.emissive,
    roughness: template.roughness,
    metalness: template.metalness,
    hp: Math.round(template.baseHp * biome.hpScale),
    radius: 0.55 + template.biome * 0.035,
    carbonYield: 0,
    // El mineral de capital escala con el HP del bioma: su ley ($/HP) crece
    // con la profundidad, mientras la del carbón cae.
    moneyYield: Math.round(template.baseMoney * biome.hpScale),
    pelletCount: template.pelletCount,
    weight: template.weight,
    glow: template.glow,
  };
}

const mineralList: MineralDefinition[] = [
  ...COAL_TEMPLATES.map((template, index) => makeCoal(template, index + 1)),
  ...ORE_TEMPLATES.map(makeOre),
];

export const MINERALS: Record<string, MineralDefinition> = Object.fromEntries(
  mineralList.map((mineral) => [mineral.id, mineral]),
);

export const MINERAL_IDS: readonly string[] = mineralList.map((mineral) => mineral.id);

export const COAL_IDS_BY_BIOME: readonly string[] = COAL_TEMPLATES.map((coal) => coal.id);

export const ORE_IDS_BY_BIOME: readonly (readonly string[])[] = BIOMES.map((biome) =>
  ORE_TEMPLATES.filter((ore) => ore.biome === biome.index).map((ore) => ore.id),
);

export function coalForBiome(biomeIndex: number): MineralDefinition {
  return MINERALS[COAL_IDS_BY_BIOME[Math.max(0, Math.min(11, biomeIndex - 1))]];
}
