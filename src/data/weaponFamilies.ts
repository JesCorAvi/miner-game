import type { WeaponStyle } from '../types';
import { PICKAXE_TIERS } from './weaponTiers';

/**
 * 22 familias de armas, agrupadas por comportamiento 3D.
 * Los precios y daños de las familias de 15 tiers siguen una escalera
 * geométrica coherente con la tabla verificada; el pico y el pico eléctrico
 * usan la tabla exacta de `weaponTiers.ts`.
 */
export interface WeaponFamilyDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: string;
  style: WeaponStyle;
  model: 'pickaxe' | 'gun' | 'staff' | 'orb' | 'drill' | 'glove' | 'boot' | 'jet' | 'tank' | 'mortar' | 'quake';
  passive: string;
  tierCount: number;
  baseBuy: number;
  buyGrowth: number;
  baseDamage: number;
  damageGrowth: number;
  cooldown: number;
  range: number;
  carveRadius: number;
  carveStrength: number;
  chainCount: number;
  chainRange: number;
  pellets: number;
  spread: number;
  blastRadius: number;
  color: number;
}

const FAMILIES: readonly WeaponFamilyDefinition[] = [
  {
    id: 'pickaxe', name: 'Pico Industrial', shortName: 'PICO', category: 'Picos',
    description: 'Golpe fiable. Esculpe cráteres pequeños y fractura vetas.',
    style: 'melee', model: 'pickaxe', passive: 'pickaxeDamage',
    tierCount: 15, baseBuy: 100, buyGrowth: 3.2, baseDamage: 30, damageGrowth: 3.2,
    cooldown: 0.34, range: 5, carveRadius: 0.15, carveStrength: 0.9,
    chainCount: 0, chainRange: 0, pellets: 1, spread: 0, blastRadius: 0, color: 0xc9b28a,
  },
  {
    id: 'tesla', name: 'Pico Eléctrico', shortName: 'ELÉCTRICO', category: 'Picos eléctricos',
    description: 'La descarga salta entre nodos del mismo racimo.',
    style: 'chain', model: 'pickaxe', passive: 'pickaxeDamage',
    tierCount: 15, baseBuy: 500, buyGrowth: 3.2, baseDamage: 30, damageGrowth: 3.2,
    cooldown: 0.88, range: 5.9, carveRadius: 0.35, carveStrength: 0.5,
    chainCount: 7, chainRange: 7.5, pellets: 1, spread: 0, blastRadius: 0, color: 0x7dd3fc,
  },
  {
    id: 'drill', name: 'Taladro de Plasma', shortName: 'TALADRO', category: 'Taladros',
    description: 'Mantén el disparo para perforar un túnel continuo.',
    style: 'continuous', model: 'drill', passive: 'drillDamage',
    tierCount: 4, baseBuy: 400, buyGrowth: 5, baseDamage: 24, damageGrowth: 5,
    cooldown: 0.085, range: 5.2, carveRadius: 1.12, carveStrength: 1.25,
    chainCount: 0, chainRange: 0, pellets: 1, spread: 0.015, blastRadius: 0, color: 0xffb36b,
  },
  {
    id: 'shotgun', name: 'Escopeta Minera', shortName: 'ESCOPETA', category: 'Escopetas',
    description: 'Abre un cráter cónico. Disparar hacia abajo impulsa al operario.',
    style: 'shotgun', model: 'gun', passive: 'bulletDamage',
    tierCount: 15, baseBuy: 200, buyGrowth: 3.2, baseDamage: 10, damageGrowth: 3.2,
    cooldown: 0.7, range: 10, carveRadius: 0.55, carveStrength: 0.75,
    chainCount: 0, chainRange: 0, pellets: 10, spread: 0.095, blastRadius: 0, color: 0xc9b28a,
  },
  {
    id: 'pistol', name: 'Pistola Minera', shortName: 'PISTOLA', category: 'Pistolas',
    description: 'Disparo único, preciso y de cadencia media.',
    style: 'shotgun', model: 'gun', passive: 'bulletDamage',
    tierCount: 15, baseBuy: 140, buyGrowth: 3.2, baseDamage: 15, damageGrowth: 3.2,
    cooldown: 0.3, range: 22, carveRadius: 0.08, carveStrength: 0.25,
    chainCount: 0, chainRange: 0, pellets: 1, spread: 0.008, blastRadius: 0, color: 0xffd27b,
  },
  {
    id: 'rifle', name: 'Rifle de Sondeo', shortName: 'RIFLE', category: 'Rifles',
    description: 'Cadencia altísima y bala única de largo alcance.',
    style: 'shotgun', model: 'gun', passive: 'bulletDamage',
    tierCount: 15, baseBuy: 290, buyGrowth: 3.2, baseDamage: 5, damageGrowth: 3.2,
    cooldown: 0.033, range: 25, carveRadius: 0.05, carveStrength: 0.16,
    chainCount: 0, chainRange: 0, pellets: 1, spread: 0.02, blastRadius: 0, color: 0xffd27b,
  },
  {
    id: 'minigun', name: 'Minigun Corporativa', shortName: 'MINIGUN', category: 'Miniguns',
    description: 'Cinco balas por ráfaga a cadencia de 30 disparos por segundo.',
    style: 'shotgun', model: 'gun', passive: 'bulletDamage',
    tierCount: 15, baseBuy: 570, buyGrowth: 3.2, baseDamage: 2, damageGrowth: 3.2,
    cooldown: 0.033, range: 20, carveRadius: 0.04, carveStrength: 0.14,
    chainCount: 0, chainRange: 0, pellets: 5, spread: 0.08, blastRadius: 0, color: 0xffd27b,
  },
  {
    id: 'axe', name: 'Hacha de Tala', shortName: 'HACHA', category: 'Hachas',
    description: 'Golpe pesado de área que sigue al cursor.',
    style: 'melee', model: 'pickaxe', passive: 'axeDamage',
    tierCount: 15, baseBuy: 200, buyGrowth: 3.2, baseDamage: 20, damageGrowth: 3.2,
    cooldown: 0.5, range: 4.5, carveRadius: 0.35, carveStrength: 0.8,
    chainCount: 0, chainRange: 0, pellets: 1, spread: 0, blastRadius: 0, color: 0xff8a8a,
  },
  {
    id: 'battleaxe', name: 'Hacha Orbital', shortName: 'ORBITAL', category: 'Hachas de batalla',
    description: 'Hacha de batalla que gira alrededor del operario.',
    style: 'melee', model: 'pickaxe', passive: 'axeDamage',
    tierCount: 15, baseBuy: 200, buyGrowth: 3.2, baseDamage: 20, damageGrowth: 3.2,
    cooldown: 0.65, range: 4.5, carveRadius: 0.45, carveStrength: 1.0,
    chainCount: 0, chainRange: 0, pellets: 1, spread: 0, blastRadius: 0, color: 0xff8a8a,
  },
  {
    id: 'boxingGlove', name: 'Guante de Boxeo', shortName: 'GUANTE', category: 'Guantes',
    description: 'Impacto rápido y contundente a corta distancia.',
    style: 'melee', model: 'glove', passive: 'punchDamage',
    tierCount: 15, baseBuy: 160, buyGrowth: 3.2, baseDamage: 15, damageGrowth: 3.2,
    cooldown: 0.28, range: 2.8, carveRadius: 0.12, carveStrength: 0.5,
    chainCount: 0, chainRange: 0, pellets: 1, spread: 0, blastRadius: 0, color: 0xff8a8a,
  },
  {
    id: 'roundhouseKick', name: 'Patada Giratoria', shortName: 'PATADA', category: 'Patadas',
    description: 'Barrido circular de corto alcance.',
    style: 'melee', model: 'boot', passive: 'kickDamage',
    tierCount: 15, baseBuy: 290, buyGrowth: 3.2, baseDamage: 10, damageGrowth: 3.2,
    cooldown: 0.4, range: 3.2, carveRadius: 0.2, carveStrength: 0.6,
    chainCount: 0, chainRange: 0, pellets: 1, spread: 0, blastRadius: 0, color: 0xff8a8a,
  },
  {
    id: 'magicStaff', name: 'Bastón de Misiles', shortName: 'BASTÓN', category: 'Bastones mágicos',
    description: 'Lanza una salva de misiles mágicos que buscan vetas.',
    style: 'shotgun', model: 'staff', passive: 'magicMissileDamage',
    tierCount: 15, baseBuy: 150, buyGrowth: 3.2, baseDamage: 15, damageGrowth: 3.2,
    cooldown: 0.6, range: 18, carveRadius: 0.12, carveStrength: 0.3,
    chainCount: 0, chainRange: 0, pellets: 2, spread: 0.03, blastRadius: 0, color: 0xc08cff,
  },
  {
    id: 'orb', name: 'Orbe de Sondeo', shortName: 'ORBE', category: 'Orbes',
    description: 'Orbe que salta entre vetas cercanas.',
    style: 'chain', model: 'orb', passive: 'orbDamage',
    tierCount: 15, baseBuy: 300, buyGrowth: 3.2, baseDamage: 15, damageGrowth: 3.2,
    cooldown: 0.5, range: 6, carveRadius: 0.1, carveStrength: 0.35,
    chainCount: 3, chainRange: 5, pellets: 1, spread: 0, blastRadius: 0, color: 0xd8a8ff,
  },
  {
    id: 'jet', name: 'Jet de Ataque', shortName: 'JET', category: 'Jets',
    description: 'Ráfaga aérea de proyectiles de precisión.',
    style: 'shotgun', model: 'jet', passive: 'airstrikeDamage',
    tierCount: 15, baseBuy: 570, buyGrowth: 3.2, baseDamage: 2, damageGrowth: 3.2,
    cooldown: 0.1, range: 20, carveRadius: 0.08, carveStrength: 0.25,
    chainCount: 0, chainRange: 0, pellets: 3, spread: 0.05, blastRadius: 0, color: 0x7ab7ff,
  },
  {
    id: 'tank', name: 'Tanque de Asedio', shortName: 'TANQUE', category: 'Tanques',
    description: 'Proyectil pesado de largo alcance.',
    style: 'shotgun', model: 'tank', passive: 'tankDamage',
    tierCount: 15, baseBuy: 200, buyGrowth: 3.2, baseDamage: 20, damageGrowth: 3.2,
    cooldown: 0.6, range: 30, carveRadius: 0.4, carveStrength: 1.0,
    chainCount: 0, chainRange: 0, pellets: 1, spread: 0.01, blastRadius: 0, color: 0xffb36b,
  },
  {
    id: 'flamethrower', name: 'Lanzallamas', shortName: 'LLAMA', category: 'Lanzallamas',
    description: 'Chorro continuo de fuego a corta distancia.',
    style: 'continuous', model: 'gun', passive: 'fireDamage',
    tierCount: 15, baseBuy: 400, buyGrowth: 3.2, baseDamage: 15, damageGrowth: 3.2,
    cooldown: 0.1, range: 5, carveRadius: 0.5, carveStrength: 0.6,
    chainCount: 0, chainRange: 0, pellets: 1, spread: 0.04, blastRadius: 0, color: 0xff8a4a,
  },
  {
    id: 'poisonGun', name: 'Pistola de Veneno', shortName: 'VENENO', category: 'Pistolas de veneno',
    description: 'Rocía veneno corrosivo que daña con el tiempo.',
    style: 'continuous', model: 'gun', passive: 'poisonDamage',
    tierCount: 15, baseBuy: 380, buyGrowth: 3.2, baseDamage: 45, damageGrowth: 3.2,
    cooldown: 0.2, range: 8, carveRadius: 0.1, carveStrength: 0.3,
    chainCount: 0, chainRange: 0, pellets: 1, spread: 0.02, blastRadius: 0, color: 0x8aff6a,
  },
  {
    id: 'poisonStaff', name: 'Bastón de Veneno', shortName: 'VENENO+', category: 'Bastones de veneno',
    description: 'Nube de veneno de gran daño por tick.',
    style: 'shotgun', model: 'staff', passive: 'poisonDamage',
    tierCount: 3, baseBuy: 45_000, buyGrowth: 5, baseDamage: 300, damageGrowth: 10,
    cooldown: 1.0, range: 15, carveRadius: 0.2, carveStrength: 0.4,
    chainCount: 0, chainRange: 0, pellets: 1, spread: 0.01, blastRadius: 1.5, color: 0x8aff6a,
  },
  {
    id: 'waterGun', name: 'Pistola de Agua', shortName: 'AGUA', category: 'Pistolas de agua',
    description: 'Moja la roca y multiplica el daño recibido.',
    style: 'continuous', model: 'gun', passive: 'wetDamage',
    tierCount: 4, baseBuy: 1_600, buyGrowth: 5, baseDamage: 10, damageGrowth: 5,
    cooldown: 0.25, range: 8, carveRadius: 0.2, carveStrength: 0.3,
    chainCount: 0, chainRange: 0, pellets: 1, spread: 0.03, blastRadius: 0, color: 0x6ad8ff,
  },
  {
    id: 'waterStaff', name: 'Bastón de Agua', shortName: 'AGUA+', category: 'Bastones de agua',
    description: 'Salpicadura amplia que empapa un estrato entero.',
    style: 'shotgun', model: 'staff', passive: 'wetDamage',
    tierCount: 1, baseBuy: 100_000, buyGrowth: 1, baseDamage: 20, damageGrowth: 1,
    cooldown: 1.5, range: 12, carveRadius: 0.3, carveStrength: 0.4,
    chainCount: 0, chainRange: 0, pellets: 1, spread: 0.02, blastRadius: 3, color: 0x6ad8ff,
  },
  {
    id: 'mortar', name: 'Mortero de Galería', shortName: 'MORTERO', category: 'Morteros',
    description: 'Proyectil explosivo de largo alcance.',
    style: 'shotgun', model: 'mortar', passive: 'mortarDamage',
    tierCount: 5, baseBuy: 2_000, buyGrowth: 6, baseDamage: 40, damageGrowth: 6,
    cooldown: 0.8, range: 30, carveRadius: 0.8, carveStrength: 1.0,
    chainCount: 0, chainRange: 0, pellets: 1, spread: 0.01, blastRadius: 2.5, color: 0xffcf6a,
  },
  {
    id: 'earthquake', name: 'Inductor Sísmico', shortName: 'SÍSMICO', category: 'Earthquake Inducers',
    description: 'Onda de choque que fractura una cámara entera.',
    style: 'shotgun', model: 'quake', passive: 'bombDamage',
    tierCount: 4, baseBuy: 1_200, buyGrowth: 5, baseDamage: 300, damageGrowth: 5,
    cooldown: 1.5, range: 12, carveRadius: 1.4, carveStrength: 1.2,
    chainCount: 0, chainRange: 0, pellets: 1, spread: 0, blastRadius: 3.5, color: 0xff9b6b,
  },
];

export const WEAPON_FAMILIES: Record<string, WeaponFamilyDefinition> = Object.fromEntries(
  FAMILIES.map((family) => [family.id, family]),
);

export const WEAPON_FAMILY_ORDER: readonly string[] = FAMILIES.map((family) => family.id);

function exactPickaxe(familyId: string): boolean {
  return familyId === 'pickaxe' || familyId === 'tesla';
}

function pickaxePriceMultiplier(familyId: string): number {
  return familyId === 'tesla' ? 5 : 1;
}

export function weaponFamily(id: string): WeaponFamilyDefinition {
  return WEAPON_FAMILIES[id] ?? WEAPON_FAMILIES.pickaxe;
}

export function familyTierBuy(familyId: string, tier: number): number {
  const family = weaponFamily(familyId);
  const safe = Math.max(1, Math.min(family.tierCount, Math.floor(tier)));
  if (exactPickaxe(familyId)) {
    return PICKAXE_TIERS[safe - 1].buy * pickaxePriceMultiplier(familyId);
  }
  return Math.round(family.baseBuy * Math.pow(family.buyGrowth, safe - 1));
}

export function familyTierSell(familyId: string, tier: number): number {
  const family = weaponFamily(familyId);
  const safe = Math.max(1, Math.min(family.tierCount, Math.floor(tier)));
  if (exactPickaxe(familyId)) {
    return PICKAXE_TIERS[safe - 1].sell * pickaxePriceMultiplier(familyId);
  }
  return Math.round(familyTierBuy(familyId, safe) * 0.5);
}

export function familyTierDamage(familyId: string, tier: number): number {
  const family = weaponFamily(familyId);
  const safe = Math.max(1, Math.min(family.tierCount, Math.floor(tier)));
  if (exactPickaxe(familyId)) {
    return PICKAXE_TIERS[safe - 1].strength;
  }
  return family.baseDamage * Math.pow(family.damageGrowth, safe - 1);
}

export function familyTierCount(familyId: string): number {
  return weaponFamily(familyId).tierCount;
}
