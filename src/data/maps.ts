import type { MapId } from '../types';

/**
 * Topologías de pozo de Coal LLC adaptadas al cubo 3D de 240 m.
 * No son “skins”: cambian la densidad base del terreno y la distribución
 * de recursos. La Mina Celeste se implementa como pozo abierto vertical
 * (gravedad normal) para no romper el controlador FPS.
 */
export interface MapDefinition {
  id: MapId;
  name: string;
  shortName: string;
  description: string;
  funnelFactor?: number;
  openShaftRadius?: number;
  sparseThreshold?: number;
  maxDepth?: number;
}

export const MAPS: readonly MapDefinition[] = [
  {
    id: 'standard',
    name: 'POZO ESTÁNDAR',
    shortName: 'ESTÁNDAR',
    description: 'Cubo macizo clásico con estratos horizontales y vetas embebidas.',
  },
  {
    id: 'funnel',
    name: 'EMBUDO DE EXTRACCIÓN',
    shortName: 'EMBUDO',
    description: 'Un embudo central guía la caída y deja las vetas en las paredes inclinadas.',
    funnelFactor: 0.82,
  },
  {
    id: 'tightFunnel',
    name: 'EMBUDO ESTRECHO',
    shortName: 'EMBUDO ESTRECHO',
    description: 'Embudo de paredes casi verticales: menos maniobra y más caída.',
    funnelFactor: 0.38,
  },
  {
    id: 'skyMine',
    name: 'MINA CELESTE',
    shortName: 'CELESTE',
    description: 'Pozo abierto de gran diámetro con islas de roca colgadas en las paredes. La gravedad sigue siendo normal.',
    openShaftRadius: 14,
  },
  {
    id: 'shallow',
    name: 'ESTRATO SUPERFICIAL',
    shortName: 'SUPERFICIAL',
    description: 'La mina solo baja 120 m; los estratos son más accesibles y la aspiradora rinde más.',
    maxDepth: 120,
  },
  {
    id: 'sparse',
    name: 'MINA DISPERSA',
    shortName: 'DISPERSA',
    description: 'Grandes bolsas de aire separan islas de roca; hay que saltar o volar entre vetas.',
    sparseThreshold: 0.58,
  },
  {
    id: 'sparseSky',
    name: 'CIELO DISPERSO',
    shortName: 'CIELO DISPERSO',
    description: 'Pozo abierto con islas dispersas. El mapa más exigente para la movilidad aérea.',
    openShaftRadius: 10,
    sparseThreshold: 0.54,
  },
];

export const MAP_ORDER: readonly string[] = MAPS.map((map) => map.id);

export function mapDefinition(id: string | null | undefined): MapDefinition {
  return MAPS.find((map) => map.id === id) ?? MAPS[0];
}

export function mapMaxDepth(id: string | null | undefined): number {
  return mapDefinition(id).maxDepth ?? 240;
}
