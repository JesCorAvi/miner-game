/**
 * 31 pasivas de referencia con nombres propios de Carbon Magnate.
 *
 * `base` es la fracción que aporta cada punto de pasiva. Un cofre de nivel L
 * entrega `L` puntos en niveles 1–4 y `L²` en niveles 5–12. Los topes se
 * expresan en porcentaje acumulado; el exceso se convierte según `overflow`.
 */
export interface PassiveDefinition {
  id: string;
  name: string;
  shortName: string;
  group: string;
  base: number;
  capPercent?: number;
  overflow?: 'damage' | 'none';
  description: string;
  color: string;
}

export const PASSIVES: Record<string, PassiveDefinition> = {
  collectorSpeed: {
    id: 'collectorSpeed',
    name: 'Velocidad de Recolectores',
    shortName: 'RECOLECTOR VEL.',
    group: 'Plantilla',
    base: 0.02,
    capPercent: 700,
    overflow: 'none',
    description: '+2 % de velocidad de viaje de los recolectores.',
    color: '#7be5d8',
  },
  collectorCapacity: {
    id: 'collectorCapacity',
    name: 'Capacidad de Recolectores',
    shortName: 'RECOLECTOR CAP.',
    group: 'Plantilla',
    base: 0.02,
    description: '+2 % de capacidad de carga de los recolectores.',
    color: '#7be5d8',
  },
  minerDamage: {
    id: 'minerDamage',
    name: 'Daño de Mineros',
    shortName: 'MINERO DAÑO',
    group: 'Plantilla',
    base: 0.02,
    description: '+2 % de daño de los mineros.',
    color: '#ff9a76',
  },
  minerSpeed: {
    id: 'minerSpeed',
    name: 'Velocidad de Mineros',
    shortName: 'MINERO VEL.',
    group: 'Plantilla',
    base: 0.05,
    capPercent: 900,
    overflow: 'none',
    description: '+5 % de desplazamiento de los mineros (no acelera el golpeo).',
    color: '#c5aaff',
  },
  pickaxeSpeed: {
    id: 'pickaxeSpeed',
    name: 'Velocidad del Pico',
    shortName: 'PICO VEL.',
    group: 'Minería',
    base: 0.05,
    capPercent: 2400,
    overflow: 'damage',
    description: '+5 % de cadencia del pico. El exceso se convierte en daño.',
    color: '#ffd27b',
  },
  pickaxeDamage: {
    id: 'pickaxeDamage',
    name: 'Daño del Pico',
    shortName: 'PICO DAÑO',
    group: 'Minería',
    base: 0.05,
    description: '+5 % de daño del pico.',
    color: '#ff9a76',
  },
  sprintSpeed: {
    id: 'sprintSpeed',
    name: 'Velocidad de Carrera',
    shortName: 'CARRERA',
    group: 'Movilidad',
    base: 0.05,
    description: '+5 % de velocidad al correr.',
    color: '#7ab7ff',
  },
  climbSpeed: {
    id: 'climbSpeed',
    name: 'Velocidad de Escalada',
    shortName: 'ESCALADA',
    group: 'Movilidad',
    base: 0.15,
    description: '+15 % de velocidad al subir escaleras.',
    color: '#7ab7ff',
  },
  jumpVelocity: {
    id: 'jumpVelocity',
    name: 'Impulso de Salto',
    shortName: 'SALTO',
    group: 'Movilidad',
    base: 0.1,
    description: '+10 % de altura de salto.',
    color: '#7ab7ff',
  },
  drillDamage: {
    id: 'drillDamage',
    name: 'Daño de Taladro',
    shortName: 'TALADRO',
    group: 'Estructura',
    base: 0.05,
    description: '+5 % de daño del taladro de plasma.',
    color: '#ffb36b',
  },
  tankDamage: {
    id: 'tankDamage',
    name: 'Daño de Tanque',
    shortName: 'TANQUE DAÑO',
    group: 'Estructura',
    base: 0.05,
    description: '+5 % de daño de tanques.',
    color: '#ffb36b',
  },
  tankRate: {
    id: 'tankRate',
    name: 'Cadencia de Tanque',
    shortName: 'TANQUE CAD.',
    group: 'Estructura',
    base: 0.05,
    description: '+5 % de cadencia de tanques.',
    color: '#ffb36b',
  },
  poisonDamage: {
    id: 'poisonDamage',
    name: 'Daño de Veneno',
    shortName: 'VENENO',
    group: 'Elemental',
    base: 0.05,
    description: '+5 % de daño de veneno.',
    color: '#8aff6a',
  },
  wetDamage: {
    id: 'wetDamage',
    name: 'Daño en Mojado',
    shortName: 'MOJADO',
    group: 'Elemental',
    base: 0.01,
    description: '+1 % al multiplicador del estado Mojado.',
    color: '#6ad8ff',
  },
  fireDamage: {
    id: 'fireDamage',
    name: 'Daño de Fuego',
    shortName: 'FUEGO',
    group: 'Elemental',
    base: 0.05,
    description: '+5 % de daño de lanzallamas y fuego.',
    color: '#ff8a4a',
  },
  mortarDamage: {
    id: 'mortarDamage',
    name: 'Daño de Mortero',
    shortName: 'MORTERO DAÑO',
    group: 'Pesado',
    base: 0.05,
    description: '+5 % de daño de morteros.',
    color: '#ffcf6a',
  },
  mortarRate: {
    id: 'mortarRate',
    name: 'Cadencia de Mortero',
    shortName: 'MORTERO CAD.',
    group: 'Pesado',
    base: 0.05,
    description: '+5 % de cadencia de morteros.',
    color: '#ffcf6a',
  },
  bombDamage: {
    id: 'bombDamage',
    name: 'Daño de Bombas',
    shortName: 'BOMBAS',
    group: 'Pesado',
    base: 0.05,
    description: '+5 % de daño de todas las bombas y granadas.',
    color: '#ffcf6a',
  },
  airstrikeRate: {
    id: 'airstrikeRate',
    name: 'Cadencia de Ataque Aéreo',
    shortName: 'AÉREO CAD.',
    group: 'Pesado',
    base: 0.05,
    description: '+5 % de frecuencia de ataques aéreos.',
    color: '#ffcf6a',
  },
  airstrikeDamage: {
    id: 'airstrikeDamage',
    name: 'Daño de Ataque Aéreo',
    shortName: 'AÉREO DAÑO',
    group: 'Pesado',
    base: 0.05,
    description: '+5 % de daño de ataques aéreos.',
    color: '#ffcf6a',
  },
  magicRegen: {
    id: 'magicRegen',
    name: 'Regeneración Mágica',
    shortName: 'MAGIA REG.',
    group: 'Magia',
    base: 0.05,
    description: '+5 % de regeneración de energía mágica.',
    color: '#c08cff',
  },
  magicMissileDamage: {
    id: 'magicMissileDamage',
    name: 'Daño de Misiles Mágicos',
    shortName: 'MISIL MÁGICO',
    group: 'Magia',
    base: 0.05,
    description: '+5 % de daño de los misiles de bastón.',
    color: '#c08cff',
  },
  axeDamage: {
    id: 'axeDamage',
    name: 'Daño de Hachas',
    shortName: 'HACHAS',
    group: 'Cuerpo a cuerpo',
    base: 0.05,
    description: '+5 % de daño de hachas y hachas de batalla.',
    color: '#ff8a8a',
  },
  punchDamage: {
    id: 'punchDamage',
    name: 'Daño de Puños',
    shortName: 'PUÑOS DAÑO',
    group: 'Cuerpo a cuerpo',
    base: 0.05,
    description: '+5 % de daño de guantes de boxeo.',
    color: '#ff8a8a',
  },
  punchSpeed: {
    id: 'punchSpeed',
    name: 'Cadencia de Puños',
    shortName: 'PUÑOS CAD.',
    group: 'Cuerpo a cuerpo',
    base: 0.05,
    description: '+5 % de cadencia de guantes de boxeo.',
    color: '#ff8a8a',
  },
  kickDamage: {
    id: 'kickDamage',
    name: 'Daño de Patadas',
    shortName: 'PATADAS DAÑO',
    group: 'Cuerpo a cuerpo',
    base: 0.05,
    description: '+5 % de daño de patadas giratorias.',
    color: '#ff8a8a',
  },
  kickSpeed: {
    id: 'kickSpeed',
    name: 'Cadencia de Patadas',
    shortName: 'PATADAS CAD.',
    group: 'Cuerpo a cuerpo',
    base: 0.05,
    description: '+5 % de cadencia de patadas giratorias.',
    color: '#ff8a8a',
  },
  orbRadius: {
    id: 'orbRadius',
    name: 'Radio de Orbes',
    shortName: 'ORBE RADIO',
    group: 'Orbes',
    base: 0.01,
    capPercent: 2400,
    overflow: 'none',
    description: '+1 % de radio de los orbes. El exceso no aporta.',
    color: '#d8a8ff',
  },
  orbDamage: {
    id: 'orbDamage',
    name: 'Daño de Orbes',
    shortName: 'ORBE DAÑO',
    group: 'Orbes',
    base: 0.05,
    description: '+5 % de daño de orbes.',
    color: '#d8a8ff',
  },
  bulletDamage: {
    id: 'bulletDamage',
    name: 'Daño de Balas',
    shortName: 'BALAS',
    group: 'A distancia',
    base: 0.05,
    description: '+5 % de daño de pistolas, escopetas, rifles y miniguns.',
    color: '#ffd27b',
  },
  gunRecoil: {
    id: 'gunRecoil',
    name: 'Retroceso de Armas',
    shortName: 'RETROCESO',
    group: 'A distancia',
    base: 0.1,
    description: '+10 % de retroceso; se usa para impulsarse con disparos.',
    color: '#ffd27b',
  },
};

export const PASSIVE_ORDER: readonly string[] = Object.keys(PASSIVES);

/** Pasivas heredadas que el motor 3D usa para radio, imán, jetpack y personal. */
export const LEGACY_PASSIVE_IDS: readonly string[] = [
  'digRadius',
  'nodeDamage',
  'magnet',
  'employeeSpeed',
  'jetpackFuel',
];

export const LEGACY_PASSIVES: Record<string, PassiveDefinition> = {
  digRadius: {
    id: 'digRadius',
    name: 'Frenesí de Taladro',
    shortName: 'RADIO',
    group: 'Minería',
    base: 0.08,
    description: '+8 % de radio de excavación.',
    color: '#ffd27b',
  },
  nodeDamage: {
    id: 'nodeDamage',
    name: 'Fractura Dirigida',
    shortName: 'FRACTURA',
    group: 'Minería',
    base: 0.1,
    description: '+10 % de daño a nodos.',
    color: '#ff9a76',
  },
  magnet: {
    id: 'magnet',
    name: 'Campo Magnético',
    shortName: 'IMÁN',
    group: 'Minería',
    base: 0.4,
    description: '+0,4 m de imán de pepitas.',
    color: '#7be5d8',
  },
  employeeSpeed: {
    id: 'employeeSpeed',
    name: 'Productividad Ejecutiva',
    shortName: 'PLANTILLA',
    group: 'Plantilla',
    base: 0.12,
    description: '+12 % de velocidad de empleados.',
    color: '#c5aaff',
  },
  jetpackFuel: {
    id: 'jetpackFuel',
    name: 'Inyector Auxiliar',
    shortName: 'JETPACK',
    group: 'Movilidad',
    base: 0.2,
    description: '+20 de combustible de jetpack.',
    color: '#7ab7ff',
  },
};

export function createDefaultPassives(): Record<string, number> {
  const values: Record<string, number> = {};
  for (const id of [...PASSIVE_ORDER, ...LEGACY_PASSIVE_IDS]) {
    values[id] = 0;
  }
  return values;
}

/** Multiplicador de la pasiva según los puntos acumulados en cofres. */
export function passiveMultiplier(id: string, points: number): number {
  const definition = PASSIVES[id];
  if (!definition) {
    return 1;
  }
  const capPoints =
    definition.capPercent !== undefined
      ? Math.floor(definition.capPercent / (definition.base * 100))
      : Number.POSITIVE_INFINITY;
  const effectivePoints = Math.min(points, capPoints);
  return 1 + definition.base * effectivePoints;
}

export function passiveCapPoints(id: string): number {
  const definition = PASSIVES[id];
  if (!definition || definition.capPercent === undefined) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.floor(definition.capPercent / (definition.base * 100));
}

export function passiveOverflowPoints(id: string, points: number): number {
  return Math.max(0, points - passiveCapPoints(id));
}

/** Multiplicador que entrega un cofre de nivel L a una pasiva. */
export function chestPassivePoints(level: number): number {
  const safe = Math.max(1, Math.min(12, Math.floor(level)));
  return safe <= 4 ? safe : safe * safe;
}
