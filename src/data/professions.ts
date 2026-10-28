import type { EmployeeKind, ProfessionId, WeaponStyle } from '../types';
import { WEAPON_FAMILY_ORDER } from './weaponFamilies';

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

/**
 * Acceso de cada profesión a las familias de armas. El pico es universal.
 * Solitario, Mula y Generalista conservan todo el catálogo; su identidad está
 * en las restricciones de plantilla y en sus bonus.
 */
export const PROFESSION_WEAPON_POOLS: Record<string, readonly string[]> = {
  internship: [
    'pickaxe',
    'tesla',
    'drill',
    'shotgun',
    'pistol',
    'rifle',
    'axe',
    'magicStaff',
    'flamethrower',
    'waterGun',
  ],
  shaman: ['pickaxe', 'poisonGun', 'poisonStaff', 'flamethrower', 'magicStaff'],
  gunslinger: ['pickaxe', 'pistol', 'rifle', 'minigun', 'shotgun', 'tank'],
  wizard: ['pickaxe', 'magicStaff', 'poisonStaff', 'waterStaff', 'orb', 'tesla'],
  barbarian: ['pickaxe', 'axe', 'battleaxe', 'boxingGlove', 'roundhouseKick'],
  loneRanger: [...WEAPON_FAMILY_ORDER],
  demolitionist: ['pickaxe', 'drill', 'shotgun', 'mortar', 'earthquake'],
  waterbender: ['pickaxe', 'drill', 'waterGun', 'waterStaff'],
  maverick: ['pickaxe', 'jet', 'tank', 'shotgun', 'rifle', 'pistol'],
  lumberjack: ['pickaxe', 'axe', 'battleaxe', 'boxingGlove', 'roundhouseKick'],
  destructor: [
    'pickaxe',
    'drill',
    'tesla',
    'shotgun',
    'mortar',
    'earthquake',
    'axe',
    'battleaxe',
  ],
  mule: [...WEAPON_FAMILY_ORDER],
  generalist: [...WEAPON_FAMILY_ORDER],
};

export function professionWeaponPool(
  id: string | null | undefined,
): readonly string[] {
  return PROFESSION_WEAPON_POOLS[id ?? 'internship'] ?? PROFESSION_WEAPON_POOLS.internship;
}

export function professionCanUseWeapon(
  id: string | null | undefined,
  weaponId: string,
): boolean {
  if (weaponId === 'pickaxe') {
    return true;
  }
  return professionWeaponPool(id).includes(weaponId);
}

const PROFESSION_LIST: readonly ProfessionDefinition[] = [  {
    id: 'internship',
    name: 'Becario Corporativo',
    shortName: 'BECARIO',
    motto: 'Todo el organigrama, ningún privilegio.',
    description: 'Clase base equilibrada. Acceso a las ramas básicas de arma y a toda la plantilla.',
    perks: ['Ramas básicas de arma', 'Sin bonus de especialista'],
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
    perks: ['+25 % daño de veneno y fuego', 'Bastón mágico y lanzallamas'],
    prohibitions: ['-10 % daño de pico', 'Solo pico, veneno, fuego y bastón mágico'],
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
    perks: ['+20 % daño de estilo de disparo', '+10 % extra con pistol, rifle, minigun y escopeta'],
    prohibitions: ['-10 % daño melee', 'Solo pico, pistolas, rifles, miniguns, escopetas y tanques'],
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
    description: 'Bastones, orbes y arma eléctrica.',
    perks: ['+25 % daño de bastón mágico', '+15 % con bastones de veneno y agua'],
    prohibitions: ['Granadas 10 % más caras', 'Solo pico, bastones, orbe y arma eléctrica'],
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
    description: 'Armas de agua y perforación húmeda. El estado Mojado aún no está activo.',
    perks: ['+20 % daño de armas de agua'],
    prohibitions: ['-10 % daño de lanzallamas', 'Solo pico, taladro y armas de agua'],
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
    perks: ['+50 % combustible de jetpack', '+20 % daño de jets'],
    prohibitions: ['-10 % capacidad de mochila', 'Solo pico, jet, tanque y armas de disparo'],
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
    perks: ['+30 % daño de hachas', '+10 % capacidad de mochila', '+15 % excavación'],
    prohibitions: ['-10 % daño con armas de disparo', 'Solo pico y armas melee'],
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
    description: 'Abre túneles a un ritmo brutal con pico, taladro y explosivos.',
    perks: ['+60 % radio y potencia de excavación', '+20 % daño melee'],
    prohibitions: ['-10 % capacidad de mochila', 'Solo pico, taladro, eléctrico, escopeta, mortero, sísmico y hachas'],
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
    perks: ['+50 % capacidad de mochila'],
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
