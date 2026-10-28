import {
  BEACON_COST,
  BEACON_PACK_SIZE,
  CLOSURE_ACT_COST,
  COLLECTOR_CONVERSION_COST,
  CONVEYOR_COST,
  CONVEYOR_PACK_SIZE,
  EMPLOYEE_RANKS,
  FIELD_DEPOT_COST,
  GRENADE_ORDER,
  GRENADE_TIERS,
  LADDER_COST,
  LADDER_PACK_SIZE,
  MAX_CONVEYORS,
  MAX_EMPLOYEES,
  MAX_PLATFORM_DEPTH,
  PLATFORM_DEPTH_STEP,
  UPGRADES,
  WEAPON_ORDER,
  WINCH_COST,
  familyTierBuy,
  familyTierDamage,
  familyTierSell,
  hireCost,
  pickaxeTierDefinition,
  professionCanUseWeapon,
  professionDefinition,
  professionGrenadeCostMultiplier,
  rankCost,
  upgradeCost,
  weaponFamily,
} from '../config';
import { formatMoney, formatNumber } from '../ui/format';
import { canAfford, spendMoney } from './Economy';
import {
  FIELD_CERTIFICATIONS,
  PATENTS,
  canHireEmployee,
  canPurchaseSupply,
  canPurchaseUpgrade,
} from './Progression';
import type {
  CertificationId,
  DoctrineId,
  GrenadeTierId,
  ProfessionId,
  RunSnapshot,
  ShopItemView,
  WeaponId,
} from '../types';

export interface PurchaseResult {
  cost: number;
  label: string;
}

export function getSupplyCost(rawId: string, doctrine?: DoctrineId | null): number {
  if (doctrine === 'freight' && (rawId === 'winch' || rawId === 'field_depot')) {
    return Math.round((rawId === 'winch' ? WINCH_COST : FIELD_DEPOT_COST) * 0.7);
  }
  if (rawId === 'ladders') return LADDER_COST;
  if (rawId === 'winch') return WINCH_COST;
  if (rawId === 'field_depot') return FIELD_DEPOT_COST;
  if (rawId === 'beacon') return BEACON_COST;
  if (rawId === 'conveyor') return CONVEYOR_COST;
  if (rawId === 'closure_act') return CLOSURE_ACT_COST;
  return 0;
}

export function getGrenadeCost(
  tier: GrenadeTierId,
  doctrine?: DoctrineId | null,
  profession?: ProfessionId | null,
): number {
  const base = GRENADE_TIERS[tier].cost;
  let multiplier = professionGrenadeCostMultiplier(profession);
  if (doctrine === 'blasting') {
    multiplier *= 0.7;
  }
  return Math.round(base * multiplier);
}

export function getEmployeeHireCost(rosterLength: number, doctrine?: DoctrineId | null): number {
  const base = hireCost('miner', rosterLength);
  if (doctrine === 'crew') {
    return Math.round(base * 0.75);
  }
  return base;
}

/**
 * Construye el catálogo de la oficina nocturna a partir del estado de la partida.
 * Es una función pura: no toca red, audio, UI ni guardado.
 */
export function buildShopItems(run: RunSnapshot): ShopItemView[] {
  const items: ShopItemView[] = [];
  const doctrine = run.loadout.doctrine;
  const clauses = run.loadout.clauses;
  const modifiers = run.modifiers ?? [];
  const profession = run.loadout.profession;

  for (const weapon of WEAPON_ORDER) {
    if (weapon === 'pickaxe') {
      continue;
    }
    const family = weaponFamily(weapon);
    if (!professionCanUseWeapon(profession, weapon)) {
      items.push({
        id: `weapon:${weapon}`,
        kind: 'weapon',
        title: family.name,
        description: `${family.description} [BLOQUEADA POR PROFESIÓN: ${professionDefinition(profession).shortName} no puede usar esta familia.]`,
        cost: 0,
        level: 'BLOQUEADA POR PROFESIÓN',
        owned: false,
        maxed: true,
        affordable: false,
      });
      continue;
    }
    const currentTier = Math.max(
      0,
      run.loadout.weaponTiers?.[weapon] ??
        (run.loadout.weapons[weapon] ? 1 : 0),
    );
    const maxed = currentTier >= family.tierCount;
    const nextTier = Math.min(family.tierCount, currentTier + 1);
    const tradeIn = currentTier > 0 ? familyTierSell(weapon, currentTier) : 0;
    const cost = maxed ? 0 : Math.max(0, familyTierBuy(weapon, nextTier) - tradeIn);
    items.push({
      id: `weapon:${weapon}`,
      kind: 'weapon',
      title:
        currentTier > 0
          ? `${family.name} · T${currentTier}`
          : family.name,
      description: `${family.description} Daño T${nextTier}: ${formatNumber(familyTierDamage(weapon, nextTier))}.${
        currentTier > 0
          ? ` Recompra del tier actual: ${formatMoney(tradeIn)}.`
          : ''
      }`,
      cost,
      level: maxed
        ? `TIER ${family.tierCount} / ${family.tierCount}`
        : `TIER ${nextTier} / ${family.tierCount}`,
      owned: currentTier > 0,
      maxed,
      affordable: !maxed && canAfford(run, cost),
    });
  }

  const currentPickaxe = run.loadout.pickaxeTier ?? 1;
  const nextPickaxe = pickaxeTierDefinition(Math.min(15, currentPickaxe + 1));
  const canUpgradePickaxe = currentPickaxe < 15;
  const tradeIn = currentPickaxe > 1 ? pickaxeTierDefinition(currentPickaxe).sell : 0;
  const pickaxeCost = canUpgradePickaxe ? Math.max(0, nextPickaxe.buy - tradeIn) : 0;
  items.push({
    id: `pickaxe:${Math.min(15, currentPickaxe + 1)}`,
    kind: 'pickaxe',
    title: canUpgradePickaxe
      ? `PICO · ${nextPickaxe.name}`
      : `PICO · ${pickaxeTierDefinition(currentPickaxe).name}`,
    description: canUpgradePickaxe
      ? `Fuerza ${formatNumber(nextPickaxe.strength)} · recompra del pico actual incluida (${formatMoney(tradeIn)}).`
      : 'Pico de máxima potencia homologado.',
    cost: pickaxeCost,
    level: `TIER ${Math.min(15, currentPickaxe + 1)} / 15`,
    owned: false,
    maxed: !canUpgradePickaxe,
    affordable: canUpgradePickaxe && canAfford(run, pickaxeCost),
  });

  // Patentes corporativas I a VI
  const currentPatent = run.loadout.patent ?? 0;
  if (currentPatent >= 6) {
    items.push({
      id: 'patent:max',
      kind: 'patent',
      title: PATENTS[6].name,
      description: 'Homologación de ingeniería de Grado VI. Daño ×191,1, excavación ×34,0.',
      cost: 0,
      level: 'PATENTE VI (MÁXIMA)',
      owned: true,
      maxed: true,
      affordable: false,
    });
  } else {
    const nextTier = currentPatent + 1;
    const patentDef = PATENTS[nextTier];
    const maxLayer = run.loadout.maxLayerReached ?? 1;
    const layerOk = maxLayer >= patentDef.requiredLayer;
    const cost = patentDef.cost;
    const affordable = canAfford(run, cost) && layerOk;
    items.push({
      id: `patent:${nextTier}`,
      kind: 'patent',
      title: patentDef.name,
      description: `${patentDef.description}${!layerOk ? ` [BLOQUEADO: Requiere picar en Capa ${patentDef.requiredLayer}]` : ''}`,
      cost,
      level: `PATENTE ${nextTier} / 6`,
      owned: false,
      maxed: false,
      affordable,
    });
  }

  const certs = Object.values(FIELD_CERTIFICATIONS);
  for (const cert of certs) {
    const isUnlocked = run.loadout.certifications?.includes(cert.id) ?? false;
    const isEquipped = run.loadout.utilitySlots?.includes(cert.id) ?? false;
    items.push({
      id: `certification:${cert.id}`,
      kind: 'certification',
      title: `${cert.name}${isEquipped ? ' · [EQUIPADA EN RANURA]' : isUnlocked ? ' · [DISPONIBLE]' : ''}`,
      description: `${cert.description} Perk: ${cert.perk}.${!isUnlocked ? ' Se obtiene completando su encargo de galería.' : ''}`,
      cost: 0,
      level: isEquipped ? 'RANURA UTILIDAD ACTIVA' : isUnlocked ? 'CLIC PARA EQUIPAR' : 'PENDIENTE DE ENCARGO',
      owned: isEquipped,
      maxed: isEquipped,
      affordable: isUnlocked,
    });
  }

  for (const id of Object.keys(UPGRADES) as (keyof typeof UPGRADES)[]) {
    const definition = UPGRADES[id];
    const level = run.loadout.upgrades[id];
    const blockedByModifier =
      id === 'dayTime' && modifiers.includes('no_time_upgrades');
    const maxed = blockedByModifier || level >= definition.max;
    const cost = maxed ? 0 : upgradeCost(id, level);
    const isJetpack = id === 'jetpack';
    const upgradeCheck = canPurchaseUpgrade(id, level, doctrine);
    let desc =
      isJetpack && level === 0
        ? 'Desbloquea el jetpack y su depósito inicial de 100 unidades. Inversión de fase avanzada.'
        : definition.description;
    if (blockedByModifier) {
      desc = `${desc} [PROHIBIDO POR CLÁUSULA: sin tiempo extra.]`;
    }
    if (!upgradeCheck.allowed && upgradeCheck.reason) {
      desc = `${desc} [${upgradeCheck.reason}]`;
    }
    items.push({
      id: `upgrade:${id}`,
      kind: 'upgrade',
      title: isJetpack && level === 0 ? 'Jetpack Industrial' : definition.name,
      description: desc,
      cost,
      level: `NV ${level} / ${definition.max}`,
      owned: false,
      maxed,
      affordable: !maxed && canAfford(run, cost) && upgradeCheck.allowed,
    });
  }

  const ladderCheck = canPurchaseSupply('ladders', clauses);
  const ladderCost = getSupplyCost('ladders', doctrine);
  items.push({
    id: 'supply:ladders',
    kind: 'supply',
    title: `Escaleras de pared ×${LADDER_PACK_SIZE}`,
    description: `Kit barato de escaleras desplegables. Aparecen en el inventario; selecciona su casilla y colócalas con E.${
      !ladderCheck.allowed && ladderCheck.reason ? ` [${ladderCheck.reason}]` : ''
    }`,
    cost: ladderCost,
    level: `STOCK: ${run.loadout.ladders}`,
    owned: false,
    maxed: false,
    affordable: ladderCheck.allowed && canAfford(run, ladderCost),
  });

  const winchCost = getSupplyCost('winch', doctrine);
  items.push({
    id: 'supply:winch',
    kind: 'supply',
    title: 'Cabria de contrapeso',
    description:
      'Instalación vertical rápida. Permite subir o bajar a 8 m/s por cable en tiros despejados ≥3 m.',
    cost: winchCost,
    level: `STOCK: ${run.loadout.winches ?? 0}`,
    owned: false,
    maxed: false,
    affordable: canAfford(run, winchCost),
  });

  const depotCost = getSupplyCost('field_depot', doctrine);
  items.push({
    id: 'supply:field_depot',
    kind: 'supply',
    title: 'Tolva de campaña',
    description:
      'Punto de acopio temporal en galería. Almacena hasta el 30% de la carga de mochila. Máx 2 por turno.',
    cost: depotCost,
    level: `STOCK: ${run.loadout.fieldDepots ?? 0}`,
    owned: false,
    maxed: false,
    affordable: canAfford(run, depotCost),
  });

  const beaconCost = getSupplyCost('beacon', doctrine);
  items.push({
    id: 'supply:beacon',
    kind: 'supply',
    title: `Balizas de ruta ×${BEACON_PACK_SIZE}`,
    description:
      'Postes luminosos con señal en brújula y plano de galerías. Pulsa Q para desplegar.',
    cost: beaconCost,
    level: `STOCK: ${run.loadout.beacons ?? 0}`,
    owned: false,
    maxed: false,
    affordable: canAfford(run, beaconCost),
  });

  const conveyorCost = getSupplyCost('conveyor', doctrine);
  items.push({
    id: 'supply:conveyor',
    kind: 'supply',
    title: `Cintas de retorno ×${CONVEYOR_PACK_SIZE}`,
    description:
      'Tramos modulares de transporte continuo. Desplazan mineral automáticamente hacia la tolva.',
    cost: conveyorCost,
    level: `STOCK: ${run.loadout.conveyors ?? 0}/${MAX_CONVEYORS}`,
    owned: false,
    maxed: (run.loadout.conveyors ?? 0) >= MAX_CONVEYORS,
    affordable: (run.loadout.conveyors ?? 0) < MAX_CONVEYORS && canAfford(run, conveyorCost),
  });

  const currentDepth = run.platformDepth || 0;
  if (currentDepth < MAX_PLATFORM_DEPTH) {
    const nextDepth = currentDepth + PLATFORM_DEPTH_STEP;
    const canClose = run.day >= Math.floor(currentDepth / 25 + 1) * 3 || run.carbon >= run.quota;
    items.push({
      id: 'supply:closure_act',
      kind: 'supply',
      title: `Acta de cierre · Estrato ${Math.floor(currentDepth / 25) + 1}`,
      description: `Sella túneles superiores con tapón de estéril y desciende la plataforma de servicios a -${nextDepth} m.`,
      cost: CLOSURE_ACT_COST,
      level: `COTA: -${currentDepth}m → -${nextDepth}m`,
      owned: false,
      maxed: false,
      affordable: canClose && canAfford(run, CLOSURE_ACT_COST),
    });
  }

  const grenadeSupplyCheck = canPurchaseSupply('grenade', clauses);
  for (const tier of GRENADE_ORDER) {
    const definition = GRENADE_TIERS[tier];
    const cost = getGrenadeCost(tier, doctrine, profession);
    items.push({
      id: `grenade:${tier}`,
      kind: 'grenade',
      title: `${definition.name} ×${definition.packSize}`,
      description: `${definition.description}${
        !grenadeSupplyCheck.allowed && grenadeSupplyCheck.reason
          ? ` [${grenadeSupplyCheck.reason}]`
          : ''
      }`,
      cost,
      level: `CAPA ${definition.maxLayer} · STOCK: ${run.loadout.grenades[tier] ?? 0}`,
      owned: false,
      maxed: false,
      affordable: grenadeSupplyCheck.allowed && canAfford(run, cost),
    });
  }

  const roster = run.loadout.employees.roster;
  const rosterFull = roster.length >= MAX_EMPLOYEES;
  const hirePrice = getEmployeeHireCost(roster.length, doctrine);
  const hireCheck = canHireEmployee('miner', doctrine, profession);
  let hireDesc =
    'Todo empleado nuevo empieza como minero. Después puede ascender o reconvertirse a recolector.';
  if (!hireCheck.allowed && hireCheck.reason) {
    hireDesc = `${hireDesc} [${hireCheck.reason}]`;
  }
  items.push({
    id: 'employee_hire:miner',
    kind: 'employee_hire',
    title: 'Contratar minero becario',
    description: hireDesc,
    cost: rosterFull ? 0 : hirePrice,
    level: `${roster.length} / ${MAX_EMPLOYEES} EMPLEADOS`,
    owned: false,
    maxed: rosterFull,
    affordable: !rosterFull && hireCheck.allowed && canAfford(run, hirePrice),
  });

  const allowStaffOps = canHireEmployee('miner', doctrine, profession).allowed;
  const allowConvert = canHireEmployee('collector', doctrine, profession).allowed;
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
      affordable: !rankMaxed && allowStaffOps && canAfford(run, promotionCost),
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
        affordable: allowConvert && canAfford(run, COLLECTOR_CONVERSION_COST),
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
  const doctrine = run.loadout.doctrine;
  const clauses = run.loadout.clauses;

  if (kind === 'patent') {
    const tier = parseInt(rawId, 10);
    const currentPatent = run.loadout.patent ?? 0;
    if (tier !== currentPatent + 1 || tier > 6) {
      return null;
    }
    const patentDef = PATENTS[tier];
    if (!patentDef) {
      return null;
    }
    const maxLayer = run.loadout.maxLayerReached ?? 1;
    if (maxLayer < patentDef.requiredLayer) {
      return null;
    }
    cost = patentDef.cost;
    if (!canAfford(run, cost)) {
      return null;
    }
    run.loadout.patent = tier;
    label = patentDef.name;
  } else if (kind === 'weapon') {
    const weapon = rawId as WeaponId;
    if (!(WEAPON_ORDER as readonly string[]).includes(weapon)) {
      return null;
    }
    if (!professionCanUseWeapon(run.loadout.profession, weapon)) {
      return null;
    }
    const family = weaponFamily(weapon);
    const currentTier = Math.max(
      0,
      run.loadout.weaponTiers?.[weapon] ??
        (run.loadout.weapons[weapon] ? 1 : 0),
    );
    if (currentTier >= family.tierCount) {
      return null;
    }
    const nextTier = currentTier + 1;
    const tradeIn = currentTier > 0 ? familyTierSell(weapon, currentTier) : 0;
    cost = Math.max(0, familyTierBuy(weapon, nextTier) - tradeIn);
    if (!canAfford(run, cost)) {
      return null;
    }
    if (!run.loadout.weaponTiers) {
      run.loadout.weaponTiers = {};
    }
    run.loadout.weaponTiers[weapon] = nextTier;
    run.loadout.weapons[weapon] = true;
    if (weapon === 'pickaxe') {
      run.loadout.pickaxeTier = nextTier;
    }    label = `${family.name} T${nextTier} · daño ${formatNumber(familyTierDamage(weapon, nextTier))}`;
  } else if (kind === 'pickaxe') {
    const tier = parseInt(rawId, 10);
    const current = run.loadout.pickaxeTier ?? 1;
    if (tier !== current + 1 || tier > 15) {
      return null;
    }
    const next = pickaxeTierDefinition(tier);
    const previous = pickaxeTierDefinition(current);
    const tradeIn = current > 1 ? previous.sell : 0;
    cost = Math.max(0, next.buy - tradeIn);
    if (!canAfford(run, cost)) {
      return null;
    }
    run.loadout.pickaxeTier = tier;
    if (!run.loadout.weaponTiers) {
      run.loadout.weaponTiers = {};
    }
    run.loadout.weaponTiers.pickaxe = tier;
    label = `${next.name} · fuerza ${formatNumber(next.strength)}`;
  } else if (kind === 'upgrade') {
    const upgrade = rawId as keyof typeof UPGRADES;
    if (!(upgrade in UPGRADES)) {
      return null;
    }
    if (upgrade === 'dayTime' && run.modifiers?.includes('no_time_upgrades')) {
      return null;
    }
    const level = run.loadout.upgrades[upgrade];
    if (level >= UPGRADES[upgrade].max) {
      return null;
    }
    const check = canPurchaseUpgrade(upgrade, level, doctrine);
    if (!check.allowed) {
      return null;
    }
    cost = upgradeCost(upgrade, level);
    if (!canAfford(run, cost)) {
      return null;
    }
    run.loadout.upgrades[upgrade] += 1;
    label = UPGRADES[upgrade].name;
  } else if (kind === 'supply') {
    const check = canPurchaseSupply(rawId, clauses);
    if (!check.allowed) {
      return null;
    }
    cost = getSupplyCost(rawId, doctrine);
    if (cost <= 0 || !canAfford(run, cost)) {
      return null;
    }
    if (rawId === 'ladders') {
      run.loadout.ladders += LADDER_PACK_SIZE;
      label = `Kit de ${LADDER_PACK_SIZE} escaleras`;
    } else if (rawId === 'winch') {
      run.loadout.winches = (run.loadout.winches ?? 0) + 1;
      label = 'Cabria de contrapeso';
    } else if (rawId === 'field_depot') {
      run.loadout.fieldDepots = (run.loadout.fieldDepots ?? 0) + 1;
      label = 'Tolva de campaña';
    } else if (rawId === 'beacon') {
      run.loadout.beacons = (run.loadout.beacons ?? 0) + BEACON_PACK_SIZE;
      label = `Balizas de ruta ×${BEACON_PACK_SIZE}`;
    } else if (rawId === 'conveyor') {
      if ((run.loadout.conveyors ?? 0) >= MAX_CONVEYORS) return null;
      run.loadout.conveyors = Math.min(MAX_CONVEYORS, (run.loadout.conveyors ?? 0) + CONVEYOR_PACK_SIZE);
      label = `Cintas de retorno ×${CONVEYOR_PACK_SIZE}`;
    } else if (rawId === 'closure_act') {
      const currentDepth = run.platformDepth || 0;
      if (currentDepth >= MAX_PLATFORM_DEPTH) return null;
      run.platformDepth = currentDepth + PLATFORM_DEPTH_STEP;
      label = `Acta de Cierre: Plataforma a -${run.platformDepth} m`;
    } else {
      return null;
    }
  } else if (kind === 'grenade') {
    const tier = rawId as GrenadeTierId;
    if (!(GRENADE_ORDER as readonly string[]).includes(tier)) {
      return null;
    }
    const check = canPurchaseSupply('grenade', clauses);
    if (!check.allowed) {
      return null;
    }
    const definition = GRENADE_TIERS[tier];
    cost = getGrenadeCost(tier, doctrine, run.loadout.profession);
    if (!canAfford(run, cost)) {
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
    const check = canHireEmployee('miner', doctrine, run.loadout.profession);
    if (!check.allowed) {
      return null;
    }
    const roster = run.loadout.employees.roster;
    if (roster.length >= MAX_EMPLOYEES) {
      return null;
    }
    cost = getEmployeeHireCost(roster.length, doctrine);
    if (!canAfford(run, cost)) {
      return null;
    }
    const id = `emp-${run.loadout.employees.nextId}`;
    run.loadout.employees.nextId += 1;
    run.loadout.employees.roster.push({ id, kind: 'miner', rank: 0 });
    if (doctrine === 'crew') {
      const hired = run.loadout.employees.roster.find((entry) => entry.id === id);
      if (hired) hired.rank = 1;
    }
    label = doctrine === 'crew' ? 'Minero asociado contratado (Acta de Cuadrilla)' : 'Minero becario contratado';
  } else if (kind === 'employee_rank' || kind === 'employee_convert') {
    const employee = run.loadout.employees.roster.find((entry) => entry.id === rawId);
    if (!employee) {
      return null;
    }
    if (kind === 'employee_rank') {
      const check = canHireEmployee(employee.kind, doctrine, run.loadout.profession);
      if (!check.allowed) {
        return null;
      }
      if (employee.rank >= EMPLOYEE_RANKS.length - 1) {
        return null;
      }
      cost = rankCost(employee.rank);
      if (!canAfford(run, cost)) {
        return null;
      }
      employee.rank += 1;
      label = `${employee.kind === 'miner' ? 'Minero' : 'Recolector'} ascendido a ${EMPLOYEE_RANKS[employee.rank].name}`;
    } else {
      const check = canHireEmployee('collector', doctrine, run.loadout.profession);
      if (!check.allowed) {
        return null;
      }
      if (employee.kind !== 'miner') {
        return null;
      }
      cost = COLLECTOR_CONVERSION_COST;
      if (!canAfford(run, cost)) {
        return null;
      }
      employee.kind = 'collector';
      label = 'Minero reasignado a recolector';
    }
  } else if (kind === 'certification') {
    const certId = rawId as CertificationId;
    const certDef = FIELD_CERTIFICATIONS[certId];
    if (!certDef) {
      return null;
    }
    if (!run.loadout.certifications) {
      run.loadout.certifications = [];
    }
    if (!run.loadout.utilitySlots) {
      run.loadout.utilitySlots = [null, null];
    }
    if (!run.loadout.certifications.includes(certId)) {
      return null;
    }
    const isEquipped = run.loadout.utilitySlots.includes(certId);
    if (isEquipped) {
      if (run.loadout.utilitySlots[0] === certId) run.loadout.utilitySlots[0] = null;
      if (run.loadout.utilitySlots[1] === certId) run.loadout.utilitySlots[1] = null;
      label = `${certDef.shortName} desequipada`;
    } else {
      if (run.loadout.utilitySlots[0] === null) {
        run.loadout.utilitySlots[0] = certId;
      } else if (run.loadout.utilitySlots[1] === null) {
        run.loadout.utilitySlots[1] = certId;
      } else {
        run.loadout.utilitySlots[0] = certId;
      }
      label = `${certDef.shortName} equipada en ranura de utilidad`;
    }
    cost = 0;
  } else {
    return null;
  }
  if (!spendMoney(run, cost)) {
    return null;
  }
  return { cost, label };
}
