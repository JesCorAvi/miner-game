import {
  MINE_DEPTH,
  PASSIVES,
  PASSIVE_ORDER,
  chestPassivePoints,
  professionPassiveAffinity,
} from '../config';
import { hashString, mulberry32 } from '../core/Rng';
import type { ChestReward, MineralId } from '../types';

interface ChestNodeLike {
  id: string;
  y: number;
}

/**
 * Resuelve el botín determinista de un cofre según su nivel de profundidad.
 * La profesión sesga las pasivas hacia su afinidad, pero nunca cambia gemas,
 * pergaminos ni la cantidad de puntos.
 */
export function resolveChestReward(
  seed: number,
  node: ChestNodeLike,
  profession?: string | null,
): ChestReward {
  const random = mulberry32(hashString(`${seed}:${node.id}:chest`));
  const depth = Math.max(0, -node.y);
  const level = Math.max(1, Math.min(12, Math.ceil(depth / (MINE_DEPTH / 12))));
  const roll = random();
  let kind: ChestReward['kind'] = 'passive';
  if (level <= 4) {
    if (roll >= 0.8) {
      kind = 'scroll';
    } else if (roll >= 0.6) {
      kind = 'gem';
    }
  }

  if (kind === 'gem') {
    const gems: readonly { mineral: MineralId; money: number; name: string }[] = [
      { mineral: 'amethyst', money: 70, name: 'Amatista' },
      { mineral: 'ruby', money: 500, name: 'Rubí' },
      { mineral: 'deepAmethyst', money: 4_000, name: 'Amatista Profunda' },
      { mineral: 'deepAmethyst', money: 7_500, name: 'Cristal de Cofre' },
    ];
    const gem = gems[Math.max(0, Math.min(gems.length - 1, level - 1))];
    return {
      kind: 'gem',
      level,
      mineral: gem.mineral,
      money: gem.money,
      title: `GEMA · ${gem.name}`,
      description: `+${gem.money} de capital directo al depósito.`,
    };
  }

  if (kind === 'scroll') {
    const money = level * 250;
    return {
      kind: 'scroll',
      level,
      money,
      title: 'PERGAMINO DE EQUIPO',
      description: `Vale de ${money} g aplicado al capital (arma temporal en Fase 2).`,
    };
  }

  const affinity = profession
    ? professionPassiveAffinity(profession).filter((id) => PASSIVE_ORDER.includes(id))
    : [];
  const useAffinity = affinity.length > 0 && random() < 0.65;
  const pool = useAffinity ? affinity : PASSIVE_ORDER;
  const passive =
    pool[Math.floor(random() * pool.length)] ?? PASSIVE_ORDER[0];
  const points = chestPassivePoints(level);
  const definition = PASSIVES[passive];
  return {
    kind: 'passive',
    level,
    passive,
    points,
    title: `COFRE Nv.${level} · ${definition?.name ?? passive}`,
    description: `+${points} puntos de ${definition?.shortName ?? passive}. ${definition?.description ?? ''}`,
  };
}
