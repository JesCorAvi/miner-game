import type { EmployeeKind, Loadout, ProfessionId, WeaponStyle } from '../types';
import { WEAPON_FAMILY_ORDER } from './weaponFamilies';

/**
 * 15 profesiones del referente con efectos propios de Carbon Magnate.
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
  shotgunner: ['pickaxe', 'shotgun'],
  wizard: ['pickaxe', 'magicStaff', 'poisonStaff', 'waterStaff', 'orb', 'tesla'],
  barbarian: ['pickaxe', 'axe', 'battleaxe', 'boxingGlove', 'roundhouseKick'],
  martialArtist: ['pickaxe', 'boxingGlove', 'roundhouseKick'],
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

/**
 * Rasgos que no encajan en la ficha de combate: kit inicial, movilidad,
 * afinidad de pasivas y árbol de tienda. Viven separados para que añadir una
 * clase no obligue a tocar las 15 fichas existentes.
 */
export interface ProfessionShopLock {
  /** ID exacto de la tienda o prefijo terminado en `*`. */
  item: string;
  reason: string;
}

export interface ProfessionTraits {
  startingWeapon: string;
  passiveAffinity: readonly string[];
  startingJetpack?: number;
  moveSpeedMultiplier?: number;
  jumpMultiplier?: number;
  jetpackForbidden?: boolean;
  weaponDiscounts?: Readonly<Record<string, number>>;
  shopLocks?: readonly ProfessionShopLock[];
}

export const PROFESSION_TRAITS: Record<string, ProfessionTraits> = {
  internship: {
    startingWeapon: 'pickaxe',
    passiveAffinity: ['pickaxeDamage', 'pickaxeSpeed', 'sprintSpeed', 'jumpVelocity'],
  },
  shaman: {
    startingWeapon: 'poisonGun',
    passiveAffinity: ['fireDamage', 'poisonDamage', 'wetDamage', 'bombDamage'],
    weaponDiscounts: { poisonGun: 0.1, poisonStaff: 0.1 },
  },
  gunslinger: {
    startingWeapon: 'pistol',
    passiveAffinity: ['bulletDamage', 'gunRecoil', 'tankDamage', 'tankRate'],
    weaponDiscounts: { pistol: 0.1, rifle: 0.1, minigun: 0.1 },
  },
  shotgunner: {
    startingWeapon: 'shotgun',
    passiveAffinity: ['bulletDamage', 'gunRecoil', 'pickaxeDamage', 'sprintSpeed'],
    moveSpeedMultiplier: 0.95,
    jetpackForbidden: true,
    weaponDiscounts: { shotgun: 0.15 },
    shopLocks: [
      {
        item: 'upgrade:jetpack',
        reason: 'SIN MOVILIDAD · esta clase no puede comprar ni usar jetpack.',
      },
      {
        item: 'employee_hire:*',
        reason: 'SIN PLANTILLA · esta clase trabaja sola.',
      },
      {
        item: 'employee_rank:*',
        reason: 'SIN PLANTILLA · esta clase trabaja sola.',
      },
      {
        item: 'employee_convert:*',
        reason: 'SIN PLANTILLA · esta clase trabaja sola.',
      },
    ],
  },
  wizard: {
    startingWeapon: 'magicStaff',
    passiveAffinity: ['magicRegen', 'magicMissileDamage', 'orbDamage', 'orbRadius'],
    weaponDiscounts: { magicStaff: 0.1 },
  },
  barbarian: {
    startingWeapon: 'axe',
    passiveAffinity: ['axeDamage', 'punchDamage', 'kickDamage', 'sprintSpeed'],
    weaponDiscounts: { axe: 0.1, battleaxe: 0.1 },
  },
  martialArtist: {
    startingWeapon: 'boxingGlove',
    passiveAffinity: [
      'punchDamage',
      'punchSpeed',
      'kickDamage',
      'kickSpeed',
      'sprintSpeed',
      'jumpVelocity',
    ],
    moveSpeedMultiplier: 1.15,
    jumpMultiplier: 1.12,
    weaponDiscounts: { boxingGlove: 0.2, roundhouseKick: 0.2 },
    shopLocks: [
      {
        item: 'grenade:*',
        reason: 'SIN EXPLOSIVOS · esta clase no compra granadas.',
      },
    ],
  },
  loneRanger: {
    startingWeapon: 'rifle',
    passiveAffinity: ['pickaxeDamage', 'pickaxeSpeed', 'bulletDamage', 'sprintSpeed'],
  },
  demolitionist: {
    startingWeapon: 'shotgun',
    passiveAffinity: ['bombDamage', 'mortarDamage', 'mortarRate', 'airstrikeDamage'],
    weaponDiscounts: { mortar: 0.15, earthquake: 0.15 },
  },
  waterbender: {
    startingWeapon: 'waterGun',
    passiveAffinity: ['wetDamage', 'drillDamage', 'poisonDamage', 'fireDamage'],
    weaponDiscounts: { waterGun: 0.1, waterStaff: 0.1 },
  },
  maverick: {
    startingWeapon: 'jet',
    startingJetpack: 1,
    passiveAffinity: ['airstrikeRate', 'airstrikeDamage', 'jumpVelocity', 'sprintSpeed'],
    weaponDiscounts: { jet: 0.1 },
  },
  lumberjack: {
    startingWeapon: 'axe',
    passiveAffinity: ['axeDamage', 'punchDamage', 'sprintSpeed', 'pickaxeSpeed'],
    weaponDiscounts: { axe: 0.1, battleaxe: 0.1 },
  },
  destructor: {
    startingWeapon: 'drill',
    passiveAffinity: ['drillDamage', 'pickaxeDamage', 'bombDamage', 'punchDamage'],
    weaponDiscounts: { drill: 0.1 },
  },
  mule: {
    startingWeapon: 'drill',
    passiveAffinity: ['collectorCapacity', 'sprintSpeed', 'jumpVelocity', 'minerSpeed'],
  },
  generalist: {
    startingWeapon: 'pistol',
    passiveAffinity: ['pickaxeDamage', 'bulletDamage', 'sprintSpeed', 'bombDamage'],
  },
};

export function professionTraits(
  id: string | null | undefined,
): ProfessionTraits {
  return PROFESSION_TRAITS[id ?? 'internship'] ?? PROFESSION_TRAITS.internship;
}

export function professionStartingWeapon(
  id: string | null | undefined,
): string {
  return professionTraits(id).startingWeapon;
}

export function professionPassiveAffinity(
  id: string | null | undefined,
): readonly string[] {
  return professionTraits(id).passiveAffinity;
}

export function professionMoveSpeedMultiplier(
  id: string | null | undefined,
): number {
  return professionTraits(id).moveSpeedMultiplier ?? 1;
}

export function professionJumpMultiplier(
  id: string | null | undefined,
): number {
  return professionTraits(id).jumpMultiplier ?? 1;
}

export function professionAllowsJetpack(
  id: string | null | undefined,
): boolean {
  return !(professionTraits(id).jetpackForbidden ?? false);
}

export function professionWeaponDiscount(
  id: string | null | undefined,
  weaponId: string,
): number {
  const discount = professionTraits(id).weaponDiscounts?.[weaponId] ?? 0;
  return Math.max(0, Math.min(0.9, discount));
}

export function professionShopLockReason(
  id: string | null | undefined,
  itemId: string,
): string | null {
  for (const lock of professionTraits(id).shopLocks ?? []) {
    const matches = lock.item.endsWith('*')
      ? itemId.startsWith(lock.item.slice(0, -1))
      : itemId === lock.item;
    if (matches) {
      return lock.reason;
    }
  }
  return null;
}

/** Aplica el kit inicial de la clase: arma característica y jetpack de serie. */
export function applyProfessionStartingKit(loadout: Loadout): void {
  const traits = professionTraits(loadout.profession);
  loadout.weapons.pickaxe = true;
  if (!loadout.weaponTiers) {
    loadout.weaponTiers = {};
  }
  loadout.weaponTiers.pickaxe = Math.max(1, loadout.weaponTiers.pickaxe ?? 0);
  loadout.pickaxeTier = Math.max(1, loadout.pickaxeTier ?? 1);
  const weapon = traits.startingWeapon;
  if (weapon && weapon !== 'pickaxe') {
    loadout.weapons[weapon] = true;
    loadout.weaponTiers[weapon] = Math.max(1, loadout.weaponTiers[weapon] ?? 0);
  }
  if ((traits.startingJetpack ?? 0) > 0) {
    loadout.upgrades.jetpack = Math.max(
      loadout.upgrades.jetpack,
      traits.startingJetpack ?? 0,
    );
  }
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
    id: 'shotgunner',
    name: 'Escopetero de Galería',
    shortName: 'ESCOPETERO',
    motto: 'Un cartucho, un túnel.',
    description:
      'Especialista absoluto en escopetas. Renuncia al jetpack y a la plantilla para concentrar todo el capital en potencia de disparo.',
    perks: [
      '+40 % daño de escopeta',
      'Escopetas 15 % más baratas',
      '+10 % capacidad de mochila',
    ],
    prohibitions: [
      'Solo pico y escopeta',
      'Sin jetpack',
      'No puede contratar empleados',
    ],
    capacityMultiplier: 1.1,
    carveMultiplier: 1.05,
    jetpackFuelMultiplier: 1,
    grenadeCostMultiplier: 1,
    styleDamage: { melee: -0.15 },
    familyDamage: { shotgun: 0.4 },
    hireForbidden: ['miner', 'collector'],
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
    id: 'martialArtist',
    name: 'Artista Marcial de Galería',
    shortName: 'MARCIAL',
    motto: 'El túnel se abre a puñetazos.',
    description:
      'Combate cuerpo a cuerpo puro. Guantes y patadas con movilidad superior; renuncia a armas de fuego y explosivos.',
    perks: [
      '+35 % daño melee',
      '+15 % con guantes y patadas',
      '+15 % velocidad a pie y +12 % salto',
      'Guantes y patadas 20 % más baratos',
    ],
    prohibitions: [
      'Solo pico, guantes y patadas',
      'Sin armas de fuego, bastones ni explosivos',
    ],
    capacityMultiplier: 1.05,
    carveMultiplier: 1.1,
    jetpackFuelMultiplier: 1,
    grenadeCostMultiplier: 1,
    styleDamage: { melee: 0.35 },
    familyDamage: { boxingGlove: 0.15, roundhouseKick: 0.15 },
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
