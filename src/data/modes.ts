import type { DifficultyModifier, GameMode } from '../types';

/**
 * Cuotas de la campaña. Los días 1–10 salen del GDD verificado; a partir del
 * 11 se acelera la curva hasta los ~5,4×10¹⁰ del día 25 y se mantiene la
 * fórmula ×4 después del 30. Al no existir tabla oficial completa, los días
 * 11–30 son una interpolación documentada y ajustable.
 */
const QUOTAS: readonly number[] = [
  40,
  80,
  160,
  320,
  580,
  900,
  1_500,
  2_200,
  3_000,
  5_000,
  8_000,
  13_200,
  22_440,
  39_270,
  70_686,
  141_372,
  296_881,
  653_138,
  1_502_217,
  3_605_321,
  18_000_000,
  108_000_000,
  756_000_000,
  6_048_000_000,
  54_432_000_000,
  190_512_000_000,
  666_792_000_000,
  2_333_772_000_000,
  8_168_202_000_000,
  28_588_707_000_000,
];

export interface GameModeDefinition {
  id: GameMode;
  name: string;
  description: string;
}

export const GAME_MODES: readonly GameModeDefinition[] = [
  {
    id: 'normal',
    name: 'JORNADA NORMAL',
    description: 'Cuota completa. La experiencia de referencia.',
  },
  {
    id: 'tough',
    name: 'ARRANQUE DURO',
    description: 'Cuota a la mitad, redondeada hacia abajo. Menos presión inicial.',
  },
  {
    id: 'peaceful',
    name: 'OPERACIÓN EN PAZ',
    description: 'Cuota 0 todos los días. Sandbox sin derrota; no cuenta para la victoria.',
  },
] as const;

export interface DifficultyModifierDefinition {
  id: DifficultyModifier;
  name: string;
  shortName: string;
  description: string;
}

export const DIFFICULTY_MODIFIERS: readonly DifficultyModifierDefinition[] = [
  {
    id: 'no_chests',
    name: 'SIN COFRES',
    shortName: 'NOCHESTS',
    description: 'No aparecen cofres: sin pasivas, gemas ni pergaminos.',
  },
  {
    id: 'only_coal',
    name: 'SOLO CARBÓN',
    shortName: 'ONLYCOAL',
    description: 'Todas las vetas son carbón. Los ingresos vienen del carbón y del bonus.',
  },
  {
    id: 'coal_worthless',
    name: 'CARBÓN SIN VALOR',
    shortName: 'COALWORTHLESS',
    description: 'El carbón vale 0 g, pero la cuota sigue en pie.',
  },
  {
    id: 'no_bonus_cash',
    name: 'SIN BONUS',
    shortName: 'NOBONUSCASH',
    description: 'No se paga bonus de cierre; todo el capital sale del mineral.',
  },
  {
    id: 'no_time_upgrades',
    name: 'SIN TIEMPO EXTRA',
    shortName: 'NOTIMEUPGRADES',
    description: 'No se puede comprar Turno Ampliado en la oficina.',
  },
  {
    id: 'only_clay',
    name: 'SOLO ARCILLA',
    shortName: 'ONLYCLAY',
    description: 'Solo aparecen minerales de arcilla, a cualquier profundidad.',
  },
] as const;

export const MAX_PLAYERS = 4;

export function baseQuotaForDay(day: number): number {
  if (day <= QUOTAS.length) {
    return QUOTAS[Math.max(0, day - 1)];
  }
  const last = QUOTAS[QUOTAS.length - 1];
  return Math.round((last * Math.pow(4, day - QUOTAS.length)) / 10) * 10;
}

export function quotaForDay(
  day: number,
  playerCount: number,
  mode: GameMode = 'normal',
  _modifiers: readonly DifficultyModifier[] = [],
): number {
  if (mode === 'peaceful') {
    return 0;
  }
  const extraPlayers = Math.max(0, Math.min(MAX_PLAYERS, playerCount) - 1);
  const multiplayer = baseQuotaForDay(day) * (1 + extraPlayers * 0.6);
  const value = mode === 'tough' ? Math.floor(multiplayer / 2) : multiplayer;
  return Math.max(0, Math.round(value));
}

export function isVictoryDay(day: number): boolean {
  return day === 15 || day === 25;
}
