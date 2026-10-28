import type { EmployeeKind, ProfessionId, WeaponStyle } from '../types';

/**
 * 13 profesiones del referente con efectos propios de Carbon Magnate.
 * La profesión se elige al iniciar la expedición y se comparte con el equipo.
 */
export interface ProfessionDefinition {
  id: ProfessionId;
  name: string;
  shortName: string;
  motto: string;
  description: string;
  perks: string[];
  prohibitions: string[];
  capacityMultiplier: number;
  carveMultiplier: number;
  jetpackFuelMultiplier: number;
  grenadeCostMultiplier: number;
  styleDamage: Partial<Record<WeaponStyle, number>>;
  familyDamage: Record<string, number>;
  hireForbidden: readonly EmployeeKind[];
}

const PROFESSION_LIST: readonly ProfessionDefinition[] = [
  {
    id: 'internship',
    name: 'Becario Corporativo',
    shortName: 'BECARIO',
    motto: 'Todo el organigrama, ningún privilegio.',
    description: 'Clase base equilibrada. Acceso a todas las armas y a toda la plantilla.',
    perks: ['Sin penalizaciones', 'Acceso completo a la tienda'],
    prohibitions: [],
    capacityMultiplier: 1,
    carveMultiplier: 1,
    jetpackFuelMultiplier: 1,
    grenadeCostMultiplier: 1,
    styleDamage: {},
    familyDamage: {},
    hireForbidden: [],
  },
  {
    id: 'shaman',
    name: 'Chamán de Estrato',
    shortName: 'CHAMÁN',
    motto: 'La roca también respira veneno.',
    description: 'Especialista elemental. Sus armas de veneno y fuego corrompen la veta.',
    perks: ['+25 % daño de veneno y fuego', '+15 % daño de estado'],
    prohibitions: ['-10 % daño de pico'],
    capacityMultiplier: 1,
    carveMultiplier: 1,
    jetpackFuelMultiplier: 1,
    grenadeCostMultiplier: 1,
    styleDamage: { melee: -0.1 },
    familyDamage: { poisonGun: 0.25, poisonStaff: 0.25, flamethrower: 0.25 },
    hireForbidden: [],
  },
  {
    id: 'gunslinger',
    name: 'Pistolero de Galería',
    shortName: 'PISTOLERO',
    motto: 'Un disparo, una veta.',
    description: 'Maestro de las armas de fuego y del impulso por retroceso.',
    perks: ['+20 % daño de armas de fuego', '+15 % cadencia de pistolas'],
    prohibitions: ['-10 % daño cuerpo a cuerpo'],
    capacityMultiplier: 1,
    carveMultiplier: 1,
    jetpackFuelMultiplier: 1,
    grenadeCostMultiplier: 1,
    styleDamage: { shotgun: 0.2, melee: -0.1 },
    familyDamage: { pistol: 0.1, rifle: 0.1, minigun: 0.1, shotgun: 0.1 },
    hireForbidden: [],
  },
  {
    id: 'wizard',
    name: 'Ingeniero Arcano',
    shortName: 'ARCANO',
    motto: 'La física es una sugerencia.',
    description: 'Bastones de misiles y regeneración mágica.',
    perks: ['+25 % daño de bastones', '+40 % regeneración mágica'],
    prohibitions: ['-10 % daño de explosivos'],
    capacityMultiplier: 1,
    carveMultiplier: 1,
    jetpackFuelMultiplier: 1,
    grenadeCostMultiplier: 1.1,
    styleDamage: {},
    familyDamage: { magicStaff: 0.25, poisonStaff: 0.15, waterStaff: 0.15 },
    hireForbidden: [],
  },
  {
    id: 'barbarian',
    name: 'Bárbaro de Túnel',
    shortName: 'BÁRBARO',
    motto: 'La roca cede ante el acero.',
    description: 'Hachas giratorias y de batalla orbitales.',
    perks: ['+25 % daño de hachas', '+20 % radio de excavación'],
    prohibitions: ['-15 % daño de armas de fuego'],
    capacityMultiplier: 1,
    carveMultiplier: 1.2,
    jetpackFuelMultiplier: 1,
    grenadeCostMultiplier: 1,
    styleDamage: { shotgun: -0.15 },
    familyDamage: { axe: 0.25, battleaxe: 0.25 },
    hireForbidden: [],
  },
  {
    id: 'loneRanger',
    name: 'Operario Solitario',
    shortName: 'SOLITARIO',
    motto: 'Nadie más baja al pozo.',
    description: 'Sin plantilla. Todo el minado y el transporte recaen en el operario.',
    perks: ['+30 % daño de todas las armas', '+25 % capacidad de mochila'],
    prohibitions: ['No puede contratar empleados'],
    capacityMultiplier: 1.25,
    carveMultiplier: 1,
    jetpackFuelMultiplier: 1.1,
    grenadeCostMultiplier: 1,
    styleDamage: { melee: 0.3, chain: 0.3, continuous: 0.3, shotgun: 0.3 },
    familyDamage: {},
    hireForbidden: ['miner', 'collector'],
  },
  {
    id: 'demolitionist',
    name: 'Demoledor de Contrato',
    shortName: 'DEMOLEDOR',
    motto: 'Si no se puede picar, se detona.',
    description: 'Explosivos, morteros y cargas sísmicas.',
    perks: ['+30 % daño de explosivos', '-25 % coste de granadas'],
    prohibitions: ['-10 % daño de pico'],
    capacityMultiplier: 1,
    carveMultiplier: 1.1,
    jetpackFuelMultiplier: 1,
    grenadeCostMultiplier: 0.75,
    styleDamage: { melee: -0.1 },
    familyDamage: { mortar: 0.3, earthquake: 0.3 },
    hireForbidden: [],
  },
  {
    id: 'waterbender',
    name: 'Hidrógrafo de Mina',
    shortName: 'HIDRÓGRAFO',
    motto: 'El agua encuentra la grieta.',
    description: 'Armas de agua y el estado Mojado.',
    perks: ['+50 % bonus de Mojado', '+20 % daño de armas de agua'],
    prohibitions: ['-10 % daño de fuego'],
    capacityMultiplier: 1,
    carveMultiplier: 1,
    jetpackFuelMultiplier: 1,
    grenadeCostMultiplier: 1,
    styleDamage: {},
    familyDamage: { waterGun: 0.2, waterStaff: 0.2, flamethrower: -0.1 },
    hireForbidden: [],
  },
  {
    id: 'maverick',
    name: 'Piloto de Ascenso',
    shortName: 'PILOTO',
    motto: 'El suelo es solo una sugerencia.',
    description: 'Movilidad aérea y ataques desde el aire.',
    perks: ['+50 % combustible de jetpack', '+10 % daño aéreo'],
    prohibitions: ['-10 % capacidad de mochila'],
    capacityMultiplier: 0.9,
    carveMultiplier: 1,
    jetpackFuelMultiplier: 1.5,
    grenadeCostMultiplier: 1,
    styleDamage: {},
    familyDamage: { jet: 0.2 },
    hireForbidden: [],
  },
  {
    id: 'lumberjack',
    name: 'Leñador de Estrato',
    shortName: 'LEÑADOR',
    motto: 'Un golpe, un estrato.',
    description: 'Hachas pesadas y equipo dual.',
    perks: ['+30 % daño de hachas', '+10 % capacidad de mochila'],
    prohibitions: ['-10 % cadencia de armas de fuego'],
    capacityMultiplier: 1.1,
    carveMultiplier: 1.15,
    jetpackFuelMultiplier: 1,
    grenadeCostMultiplier: 1,
    styleDamage: { shotgun: -0.1 },
    familyDamage: { axe: 0.3, battleaxe: 0.3 },
    hireForbidden: [],
  },
  {
    id: 'destructor',
    name: 'Destructor de Frente',
    shortName: 'DESTRUCTOR',
    motto: 'No extrae: borra.',
    description: 'Abre túneles a un ritmo brutal, pero el mineral cobrable lo saca la plantilla.',
    perks: ['+60 % radio y potencia de excavación', '+20 % daño de pico'],
    prohibitions: ['-20 % valor del mineral que recoge el operario'],
    capacityMultiplier: 0.9,
    carveMultiplier: 1.6,
    jetpackFuelMultiplier: 1,
    grenadeCostMultiplier: 1,
    styleDamage: { melee: 0.2 },
    familyDamage: {},
    hireForbidden: [],
  },
  {
    id: 'mule',
    name: 'Mula de Carga',
    shortName: 'MULA',
    motto: 'Nada se queda abajo.',
    description: 'Sin recolectores. El operario o la cinta llevan todo a la tolva.',
    perks: ['+50 % capacidad de mochila', '+10 % velocidad con carga'],
    prohibitions: ['No puede contratar recolectores'],
    capacityMultiplier: 1.5,
    carveMultiplier: 1,
    jetpackFuelMultiplier: 1,
    grenadeCostMultiplier: 1,
    styleDamage: {},
    familyDamage: {},
    hireForbidden: ['collector'],
  },
  {
    id: 'generalist',
    name: 'Generalista de Operaciones',
    shortName: 'GENERALISTA',
    motto: 'Todo sirve si se usa a tiempo.',
    description: 'Acceso versátil a varias ramas de armas y pasivas.',
    perks: ['+10 % daño de todas las armas', '+10 % capacidad de mochila'],
    prohibitions: ['Sin bonus de especialista'],
    capacityMultiplier: 1.1,
    carveMultiplier: 1.05,
    jetpackFuelMultiplier: 1,
    grenadeCostMultiplier: 1,
    styleDamage: { melee: 0.1, chain: 0.1, continuous: 0.1, shotgun: 0.1 },
    familyDamage: {},
    hireForbidden: [],
  },
];

export const PROFESSIONS: Record<string, ProfessionDefinition> = Object.fromEntries(
  PROFESSION_LIST.map((profession) => [profession.id, profession]),
);

export const PROFESSION_ORDER: readonly string[] = PROFESSION_LIST.map(
  (profession) => profession.id,
);

export function professionDefinition(id: string | null | undefined): ProfessionDefinition {
  return PROFESSIONS[id ?? 'internship'] ?? PROFESSIONS.internship;
}

export function professionCapacityMultiplier(id: string | null | undefined): number {
  return professionDefinition(id).capacityMultiplier;
}

export function professionCarveMultiplier(id: string | null | undefined): number {
  return professionDefinition(id).carveMultiplier;
}

export function professionJetpackFuelMultiplier(id: string | null | undefined): number {
  return professionDefinition(id).jetpackFuelMultiplier;
}

export function professionGrenadeCostMultiplier(id: string | null | undefined): number {
  return professionDefinition(id).grenadeCostMultiplier;
}

export function professionDamageMultiplier(
  id: string | null | undefined,
  style: WeaponStyle,
  weaponId?: string,
): number {
  const profession = professionDefinition(id);
  const styleBonus = profession.styleDamage[style] ?? 0;
  const familyBonus = weaponId ? profession.familyDamage[weaponId] ?? 0 : 0;
  return Math.max(0.1, 1 + styleBonus + familyBonus);
}

export function professionCanHire(
  id: string | null | undefined,
  kind: EmployeeKind,
): boolean {
  return !professionDefinition(id).hireForbidden.includes(kind);
}

export function professionGrenadeDamageMultiplier(
  id: string | null | undefined,
): number {
  return id === 'demolitionist' ? 1.3 : 1;
}
