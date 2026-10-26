import {
  COLLECTOR_CONVERSION_COST,
  EMPLOYEE_RANKS,
  GRENADE_ORDER,
  GRENADE_TIERS,
  LADDER_COST,
  LADDER_PACK_SIZE,
  MAX_EMPLOYEES,
  UPGRADES,
  WEAPONS,
  WEAPON_ORDER,
  hireCost,
  rankCost,
  upgradeCost,
} from '../config';
import type { GrenadeTierId, RunSnapshot, ShopItemView, WeaponId } from '../types';

export interface PurchaseResult {
  cost: number;
  label: string;
}

/**
 * Construye el catálogo de la oficina nocturna a partir del estado de la partida.
 * Es una función pura: no toca red, audio, UI ni guardado.
 */
export function buildShopItems(run: RunSnapshot): ShopItemView[] {
  const items: ShopItemView[] = [];
  for (const weapon of WEAPON_ORDER) {
    const definition = WEAPONS[weapon];
    const owned = run.loadout.weapons[weapon];
    items.push({
      id: `weapon:${weapon}`,
      kind: 'weapon',
      title: definition.name,
      description: definition.description,
      cost: definition.unlockCost,
      level: owned ? 'EQUIPADA' : 'BLOQUEADA',
      owned,
      maxed: false,
      affordable: !owned && run.money >= definition.unlockCost,
    });
  }
  for (const id of Object.keys(UPGRADES) as (keyof typeof UPGRADES)[]) {
    const definition = UPGRADES[id];
    const level = run.loadout.upgrades[id];
    const maxed = level >= definition.max;
    const cost = maxed ? 0 : upgradeCost(id, level);
    const isJetpack = id === 'jetpack';
    items.push({
      id: `upgrade:${id}`,
      kind: 'upgrade',
      title: isJetpack && level === 0 ? 'Jetpack Industrial' : definition.name,
      description:
        isJetpack && level === 0
          ? 'Desbloquea el jetpack y su depósito inicial de 100 unidades. Inversión de fase avanzada.'
          : definition.description,
      cost,
      level: `NV ${level} / ${definition.max}`,
      owned: false,
      maxed,
      affordable: !maxed && run.money >= cost,
    });
  }
  items.push({
    id: 'supply:ladders',
    kind: 'supply',
    title: `Escaleras de pared ×${LADDER_PACK_SIZE}`,
    description:
      'Kit barato de escaleras desplegables. Aparecen en el inventario; selecciona su casilla y colócalas con E.',
    cost: LADDER_COST,
    level: `STOCK: ${run.loadout.ladders}`,
    owned: false,
    maxed: false,
    affordable: run.money >= LADDER_COST,
  });
  for (const tier of GRENADE_ORDER) {
    const definition = GRENADE_TIERS[tier];
    items.push({
      id: `grenade:${tier}`,
      kind: 'grenade',
      title: `${definition.name} ×${definition.packSize}`,
      description: definition.description,
      cost: definition.cost,
      level: `CAPA ${definition.maxLayer} · STOCK: ${run.loadout.grenades[tier] ?? 0}`,
      owned: false,
      maxed: false,
      affordable: run.money >= definition.cost,
    });
  }

  const roster = run.loadout.employees.roster;
  const rosterFull = roster.length >= MAX_EMPLOYEES;
  const hirePrice = hireCost('miner', roster.length);
  items.push({
    id: 'employee_hire:miner',
    kind: 'employee_hire',
    title: 'Contratar minero becario',
    description:
      'Todo empleado nuevo empieza como minero. Después puede ascender o reconvertirse a recolector.',
    cost: rosterFull ? 0 : hirePrice,
    level: `${roster.length} / ${MAX_EMPLOYEES} EMPLEADOS`,
    owned: false,
    maxed: rosterFull,
    affordable: !rosterFull && run.money >= hirePrice,
  });

  roster.forEach((employee, index) => {
    const label = employee.kind === 'miner' ? 'MINERO' : 'RECOLECTOR';
    const rank = EMPLOYEE_RANKS[employee.rank];
    const summary = `#${String(index + 1).padStart(2, '0')} · ${label} · ${rank.name.toUpperCase()}`;
    const nextRank = EMPLOYEE_RANKS[Math.min(EMPLOYEE_RANKS.length - 1, employee.rank + 1)];
    const rankMaxed = employee.rank >= EMPLOYEE_RANKS.length - 1;
    const promotionCost = rankMaxed ? 0 : rankCost(employee.rank);
    items.push({
      id: `employee_rank:${employee.id}`,
      kind: 'employee_rank',
      title: `Ascender ${employee.kind === 'miner' ? 'minero' : 'recolector'} ${String(index + 1).padStart(2, '0')}`,
      description: rankMaxed
        ? 'Este empleado ya está en el rango máximo.'
        : `${rank.name} → ${nextRank.name}. Mejora velocidad de trabajo y eficiencia. Se aplica al siguiente turno.`,
      cost: promotionCost,
      level: summary,
      owned: false,
      maxed: rankMaxed,
      affordable: !rankMaxed && run.money >= promotionCost,
    });
    if (employee.kind === 'miner') {
      items.push({
        id: `employee_convert:${employee.id}`,
        kind: 'employee_convert',
        title: `Reasignar minero ${String(index + 1).padStart(2, '0')} a recolector`,
        description:
          'Cambia su rol para rastrear pepitas y entregarlas automáticamente en la tolva. Conserva el rango. Se aplica al siguiente turno.',
        cost: COLLECTOR_CONVERSION_COST,
        level: summary,
        owned: false,
        maxed: false,
        affordable: run.money >= COLLECTOR_CONVERSION_COST,
      });
    }
  });
  return items;
}

/**
 * Valida y aplica una compra sobre el run. No emite sonido, no guarda y no
 * actualiza la UI: eso queda en Game.applyPurchase().
 *
 * Devuelve null si el ítem no existe, ya está al máximo o no hay dinero.
 * En caso contrario muta `run.money` y `run.loadout` como la compra original.
 */
export function applyPurchaseToRun(run: RunSnapshot, itemId: string): PurchaseResult | null {
  const [kind, rawId] = itemId.split(':');
  if (!kind || !rawId) {
    return null;
  }
  let cost = 0;
  let label = '';
  if (kind === 'weapon') {
    const weapon = rawId as WeaponId;
    if (!(WEAPON_ORDER as readonly string[]).includes(weapon) || run.loadout.weapons[weapon]) {
      return null;
    }
    cost = WEAPONS[weapon].unlockCost;
    if (run.money < cost) {
      return null;
    }
    run.loadout.weapons[weapon] = true;
    label = WEAPONS[weapon].name;
  } else if (kind === 'upgrade') {
    const upgrade = rawId as keyof typeof UPGRADES;
    if (!(upgrade in UPGRADES)) {
      return null;
    }
    const level = run.loadout.upgrades[upgrade];
    if (level >= UPGRADES[upgrade].max) {
      return null;
    }
    cost = upgradeCost(upgrade, level);
    if (run.money < cost) {
      return null;
    }
    run.loadout.upgrades[upgrade] += 1;
    label = UPGRADES[upgrade].name;
  } else if (kind === 'supply') {
    if (rawId !== 'ladders') {
      return null;
    }
    cost = LADDER_COST;
    if (run.money < cost) {
      return null;
    }
    run.loadout.ladders += LADDER_PACK_SIZE;
    label = `Kit de ${LADDER_PACK_SIZE} escaleras`;
  } else if (kind === 'grenade') {
    const tier = rawId as GrenadeTierId;
    if (!(GRENADE_ORDER as readonly string[]).includes(tier)) {
      return null;
    }
    const definition = GRENADE_TIERS[tier];
    cost = definition.cost;
    if (run.money < cost) {
      return null;
    }
    run.loadout.grenades[tier] = Math.min(
      999,
      (run.loadout.grenades[tier] ?? 0) + definition.packSize,
    );
    label = `${definition.name} ×${definition.packSize}`;
  } else if (kind === 'employee_hire') {
    if (rawId !== 'miner') {
      return null;
    }
    const roster = run.loadout.employees.roster;
    if (roster.length >= MAX_EMPLOYEES) {
      return null;
    }
    cost = hireCost('miner', roster.length);
    if (run.money < cost) {
      return null;
    }
    const id = `emp-${run.loadout.employees.nextId}`;
    run.loadout.employees.nextId += 1;
    run.loadout.employees.roster.push({ id, kind: 'miner', rank: 0 });
    label = 'Minero becario contratado';
  } else if (kind === 'employee_rank' || kind === 'employee_convert') {
    const employee = run.loadout.employees.roster.find((entry) => entry.id === rawId);
    if (!employee) {
      return null;
    }
    if (kind === 'employee_rank') {
      if (employee.rank >= EMPLOYEE_RANKS.length - 1) {
        return null;
      }
      cost = rankCost(employee.rank);
      if (run.money < cost) {
        return null;
      }
      employee.rank += 1;
      label = `${employee.kind === 'miner' ? 'Minero' : 'Recolector'} ascendido a ${EMPLOYEE_RANKS[employee.rank].name}`;
    } else {
      if (employee.kind !== 'miner') {
        return null;
      }
      cost = COLLECTOR_CONVERSION_COST;
      if (run.money < cost) {
        return null;
      }
      employee.kind = 'collector';
      label = 'Minero reasignado a recolector';
    }
  } else {
    return null;
  }
  run.money -= cost;
  return { cost, label };
}
