/**
 * Escalera de picos de Carbon Magnate. Los 15 tiers y sus precios/fuerzas
 * siguen la tabla verificada de Coal LLC; los nombres son propios.
 */
export interface PickaxeTierDefinition {
  tier: number;
  name: string;
  shortName: string;
  buy: number;
  sell: number;
  strength: number;
  emissive: number;
  particleColor: number;
  soundPitch: number;
}

export const PICKAXE_TIERS: readonly PickaxeTierDefinition[] = [
  { tier: 1, name: 'Pico Deficiente', shortName: 'DEFICIENTE', buy: 100, sell: 20, strength: 30, emissive: 0x8a8a8a, particleColor: 0xb0b0b0, soundPitch: 1 },
  { tier: 2, name: 'Pico de Cobre', shortName: 'COBRE', buy: 230, sell: 115, strength: 70, emissive: 0xc26a2a, particleColor: 0xe8894e, soundPitch: 1.02 },
  { tier: 3, name: 'Pico de Hierro', shortName: 'HIERRO', buy: 330, sell: 165, strength: 100, emissive: 0x7a8a8a, particleColor: 0xc3d0cf, soundPitch: 1.04 },
  { tier: 4, name: 'Pico de Zafiro', shortName: 'ZAFIRO', buy: 670, sell: 335, strength: 200, emissive: 0x2a5cff, particleColor: 0x6a9cff, soundPitch: 1.06 },
  { tier: 5, name: 'Pico de Esmeralda', shortName: 'ESMERALDA', buy: 1_000, sell: 500, strength: 300, emissive: 0x1eb86b, particleColor: 0x63ffc2, soundPitch: 1.08 },
  { tier: 6, name: 'Pico de Plata', shortName: 'PLATA', buy: 3_300, sell: 1_700, strength: 1_000, emissive: 0xd8e0e6, particleColor: 0xf2fbff, soundPitch: 1.1 },
  { tier: 7, name: 'Pico de Amatista', shortName: 'AMATISTA', buy: 10_000, sell: 5_000, strength: 3_000, emissive: 0x8a53db, particleColor: 0xba8cff, soundPitch: 1.12 },
  { tier: 8, name: 'Pico de Oro', shortName: 'ORO', buy: 33_000, sell: 16_500, strength: 10_000, emissive: 0xd9ac3e, particleColor: 0xffda73, soundPitch: 1.14 },
  { tier: 9, name: 'Pico de Rubí', shortName: 'RUBÍ', buy: 100_000, sell: 50_000, strength: 30_000, emissive: 0xc62e48, particleColor: 0xff6a7d, soundPitch: 1.16 },
  { tier: 10, name: 'Pico de Diamante', shortName: 'DIAMANTE', buy: 650_000, sell: 325_000, strength: 200_000, emissive: 0x9fe8ff, particleColor: 0xd8f6ff, soundPitch: 1.18 },
  { tier: 11, name: 'Pico de Diamante Rosa', shortName: 'DIAMANTE ROSA', buy: 1_650_000, sell: 825_000, strength: 500_000, emissive: 0xff8fcf, particleColor: 0xffbde4, soundPitch: 1.2 },
  { tier: 12, name: 'Pico de Espinela', shortName: 'ESPINELA', buy: 165_000_000, sell: 82_500_000, strength: 50_000_000, emissive: 0xff3a6a, particleColor: 0xff8aa8, soundPitch: 1.22 },
  { tier: 13, name: 'Pico de Uranio', shortName: 'URANIO', buy: 1_650_000_000_000, sell: 825_000_000_000, strength: 500_000_000_000, emissive: 0x3aff6a, particleColor: 0x9affb4, soundPitch: 1.24 },
  { tier: 14, name: 'Pico de Piedra Lunar', shortName: 'PIEDRA LUNAR', buy: 165_000_000_000_000_000, sell: 82_500_000_000_000_000, strength: 50_000_000_000_000_000, emissive: 0xb8d8ff, particleColor: 0xe8f4ff, soundPitch: 1.26 },
  { tier: 15, name: 'Pico de Ónice', shortName: 'ÓNICE', buy: 1.65e25, sell: 8.25e24, strength: 5e24, emissive: 0x9a9aff, particleColor: 0xe8e8ff, soundPitch: 1.3 },
];

export function pickaxeTierDefinition(tier: number): PickaxeTierDefinition {
  return PICKAXE_TIERS[Math.max(0, Math.min(PICKAXE_TIERS.length - 1, Math.floor(tier) - 1))];
}

export function pickaxeStrength(tier: number): number {
  return pickaxeTierDefinition(tier).strength;
}
