#!/usr/bin/env node
// Audita cuotas, economía, arsenal, escaleras, jetpack y plantilla de Carbon Magnate.
// Uso: node .claude/skills/balance-and-loop/scripts/audit-balance.mjs [--json]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../..');
const JSON_OUT = process.argv.includes('--json');

const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

function read(relative) {
  const full = path.join(ROOT, relative);
  if (!fs.existsSync(full)) {
    fail(`No existe ${relative}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function extractBlock(source, signature) {
  const start = source.indexOf(signature);
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, index + 1);
    }
  }
  return '';
}

function objectEntries(block) {
  const entries = new Map();
  for (const match of block.matchAll(/(\w+):\s*\{([^}]*)\}/g)) {
    entries.set(match[1], match[2]);
  }
  return entries;
}

function field(entry, name) {
  const match = new RegExp(`\\b${name}:\\s*([^,\\n]+)`).exec(entry);
  if (!match) return null;
  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

const config = read('src/config.ts');
const game = read('src/core/Game.ts');
const shop = read('src/core/Shop.ts');
const shopView = read('src/core/ShopView.ts');
const interaction = read('src/core/Interaction.ts');
const dayCycle = read('src/core/DayCycle.ts');
const shopUi = read('src/ui/shopView.ts');
const player = read('src/player/Player.ts');
const ui = read('src/ui/UI.ts');
const save = read('src/save/SaveManager.ts');

// ---------------------------------------------------------------------------
// 1. Constantes de bucle
// ---------------------------------------------------------------------------
for (const line of [
  'export const MAX_PLAYERS = 4;',
  'export const MAX_EMPLOYEES = 6;',
  'export const MAX_EMPLOYEE_RANK = 3;',
  'export const BASE_DAY_TIME = 90;',
  'export const DAY_TIME_PER_LEVEL = 15;',
  'export const STARTING_LADDERS = 8;',
  'export const LADDER_PACK_SIZE = 4;',
  'export const LADDER_COST = 30;',
  'export const COLLECTOR_CONVERSION_COST = 150;',
  'export const VICTORY_DAY = 15;',
]) {
  if (!config.includes(line)) fail(`src/config.ts: falta «${line}»`);
}

// ---------------------------------------------------------------------------
// 2. Curva de cuotas
// ---------------------------------------------------------------------------
const quotaArray = /const QUOTAS:\s*readonly number\[\]\s*=\s*\[([\s\S]*?)\];/.exec(config);
if (!quotaArray) {
  fail('src/config.ts: no se encuentra el array QUOTAS');
} else {
  const values = quotaArray[1]
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map(Number);
  const expected = [40, 90, 170, 320, 580, 950, 1600, 2600, 3900, 5000, 7200, 10600, 16500, 25800, 40000];
  if (values.length !== expected.length) {
    fail(`QUOTAS: se esperaban ${expected.length} días y hay ${values.length}`);
  }
  expected.forEach((value, index) => {
    if (values[index] !== value) {
      fail(`QUOTAS[día ${index + 1}]: se esperaba ${value} y hay ${values[index]}`);
    }
  });
  for (let index = 1; index < values.length; index += 1) {
    if (!(values[index] > values[index - 1])) {
      warn(`QUOTAS: la cuota del día ${index + 1} no crece respecto al día ${index}`);
    }
  }
}
const quotaForDay = extractBlock(config, 'export function quotaForDay(');
if (!quotaForDay.includes('extraPlayers * 0.6')) {
  fail('quotaForDay(): el multiplicador cooperativo debe ser 1 + 0,6 × (jugadores - 1)');
}
if (!config.includes('if (day <= QUOTAS.length)')) {
  warn('baseQuotaForDay(): revisa el escalado exponencial después del día 15');
}

// ---------------------------------------------------------------------------
// 3. Mejoras, jetpack y pasivas
// ---------------------------------------------------------------------------
const upgradesBlock = extractBlock(config, 'export const UPGRADES');
if (!upgradesBlock) {
  fail('src/config.ts: no se encuentra UPGRADES');
} else {
  for (const id of ['damage', 'speed', 'magnet', 'jetpack', 'dayTime', 'capacity']) {
    if (!upgradesBlock.includes(`${id}:`)) fail(`UPGRADES: falta la mejora «${id}»`);
  }
  if (!/capacity:\s*\{[^}]*\+20 kg/.test(upgradesBlock)) {
    warn('UPGRADES.capacity: revisa la mejora de capacidad (+20 kg/nivel)');
  }
  const jetpackEntry = /jetpack:\s*\{([^}]*)\}/.exec(upgradesBlock);
  if (!jetpackEntry) {
    fail('UPGRADES: no se encuentra la entrada jetpack');
  } else {
    if (!/baseCost:\s*3000/.test(jetpackEntry[1])) {
      fail('UPGRADES.jetpack: el desbloqueo debe costar 3000');
    }
    if (!/max:\s*6/.test(jetpackEntry[1])) {
      warn('UPGRADES.jetpack: se esperaban 6 niveles');
    }
  }
}
const maxFuel = extractBlock(config, 'export function maxJetpackFuel(');
if (!maxFuel.includes('if (loadout.upgrades.jetpack <= 0)') || !maxFuel.includes('return 0;')) {
  fail('maxJetpackFuel(): el nivel 0 debe devolver 0 (jetpack bloqueado)');
}
if (!maxFuel.includes('100 + (loadout.upgrades.jetpack - 1) * 20')) {
  warn('maxJetpackFuel(): revisa la fórmula 100 + 20 por nivel');
}
const maxWeight = extractBlock(config, 'export function maxCarryWeight(');
if (!maxWeight.includes('BASE_CARRY_WEIGHT') || !maxWeight.includes('CARRY_WEIGHT_PER_LEVEL')) {
  fail('maxCarryWeight(): debe usar BASE_CARRY_WEIGHT + nivel × CARRY_WEIGHT_PER_LEVEL');
}
if (!player.includes('this.maxFuel > 0 &&')) {
  fail('Player: el jetpack debe exigir maxFuel > 0');
}
const playerLoadout = extractBlock(player, 'setLoadout(loadout: Loadout): void');
if (!playerLoadout.includes('this.maxFuel <= 0') || !playerLoadout.includes('this.fuel = 0')) {
  fail('Player.setLoadout(): al bloquear el jetpack el combustible debe quedar a 0');
}
const passivesBlock = extractBlock(config, 'export const PASSIVE_ORDER');
if (!passivesBlock) {
  warn('src/config.ts: no se encuentra PASSIVE_ORDER');
}
for (const passive of ['digRadius', 'nodeDamage', 'magnet', 'employeeSpeed', 'jetpackFuel']) {
  if (!config.includes(`${passive}:`)) fail(`PASSIVES: falta «${passive}»`);
}

// ---------------------------------------------------------------------------
// 4. Arsenal
// ---------------------------------------------------------------------------
const weaponOrderMatch = /export const WEAPON_ORDER[^=]*=\s*\[([\s\S]*?)\];/.exec(config);
const expectedWeapons = ['pickaxe', 'tesla', 'drill', 'shotgun'];
if (!weaponOrderMatch) {
  fail('src/config.ts: no se encuentra WEAPON_ORDER');
} else {
  const weapons = [...weaponOrderMatch[1].matchAll(/'([a-z]+)'/g)].map((match) => match[1]);
  if (weapons.join(',') !== expectedWeapons.join(',')) {
    fail(`WEAPON_ORDER: se esperaba ${expectedWeapons.join(', ')} y hay ${weapons.join(', ')}`);
  }
}
const weaponsBlock = extractBlock(config, 'export const WEAPONS');
if (!weaponsBlock) {
  fail('src/config.ts: no se encuentra WEAPONS');
} else {
  const entries = objectEntries(weaponsBlock);
  for (const id of expectedWeapons) {
    const entry = entries.get(id);
    if (!entry) {
      fail(`WEAPONS: falta «${id}»`);
      continue;
    }
    for (const key of ['damage', 'cooldown', 'range', 'carveRadius', 'carveStrength', 'unlockCost']) {
      if (field(entry, key) === null) fail(`WEAPONS.${id}: falta ${key}`);
    }
  }
  const pickaxe = entries.get('pickaxe');
  if (pickaxe && field(pickaxe, 'unlockCost') !== '0') {
    fail('WEAPONS.pickaxe: debe estar desbloqueado de inicio (unlockCost 0)');
  }
}

// ---------------------------------------------------------------------------
// 5. Minerales: carbón vs. mineral y capas
// ---------------------------------------------------------------------------
const mineralsBlock = extractBlock(config, 'export const MINERALS');
if (!mineralsBlock) {
  fail('src/config.ts: no se encuentra MINERALS');
} else {
  const entries = objectEntries(mineralsBlock);
  if (entries.size !== 11) {
    warn(`MINERALS: se esperaban 11 minerales y hay ${entries.size}`);
  }
  let coalCount = 0;
  let oreCount = 0;
  for (const [id, entry] of entries) {
    const family = field(entry, 'family');
    const carbonYield = field(entry, 'carbonYield');
    const moneyYield = field(entry, 'moneyYield');
    const pelletCount = Number(field(entry, 'pelletCount'));
    const hp = Number(field(entry, 'hp'));
    const layer = Number(field(entry, 'layer'));
    if (family === 'coal') {
      coalCount += 1;
      if (carbonYield === '0' || Number(carbonYield) <= 0) {
        fail(`MINERALS.${id}: el carbón debe aportar carbonYield > 0`);
      }
      if (moneyYield === '0' || Number(moneyYield) <= 0) {
        fail(`MINERALS.${id}: el carbón debe aportar moneyYield > 0 además de cuota`);
      }
    } else if (family === 'ore') {
      oreCount += 1;
      if (moneyYield === '0' || Number(moneyYield) <= 0) {
        fail(`MINERALS.${id}: el mineral debe aportar moneyYield > 0`);
      }
      if (carbonYield !== '0') {
        fail(`MINERALS.${id}: el mineral no debe aportar carbón`);
      }
    } else {
      fail(`MINERALS.${id}: family debe ser 'coal' u 'ore'`);
    }
    if (!Number.isFinite(pelletCount) || pelletCount <= 0) {
      fail(`MINERALS.${id}: pelletCount debe ser > 0`);
    }
    if (!Number.isFinite(hp) || hp <= 0) {
      fail(`MINERALS.${id}: hp debe ser > 0`);
    }
    if (![1, 2, 3, 4].includes(layer)) {
      fail(`MINERALS.${id}: layer debe estar entre 1 y 4`);
    }
  }
  if (coalCount !== 4) fail(`MINERALS: se esperaban 4 carbones y hay ${coalCount}`);
  if (oreCount !== 7) fail(`MINERALS: se esperaban 7 minerales y hay ${oreCount}`);
}

if (!config.includes('export const COLLECTOR_CARRY_WEIGHT = BASE_CARRY_WEIGHT / 2;')) {
  fail('config.ts: el recolector debe cargar la mitad del peso inicial del jugador');
}
const staffSource = read('src/entities/Staff.ts');
const lootSource = read('src/world/Loot.ts');
if (!staffSource.includes('collectNearestWithin(') || !staffSource.includes('depositCollectorCargo(')) {
  fail('Staff.ts: el recolector debe recoger pepitas de una en una y depositarlas en la tolva');
}
if (lootSource.includes('collectNear(')) {
  fail('Loot.ts: no debe existir recogida instantánea en área para la plantilla');
}

// ---------------------------------------------------------------------------
// 6. Plantilla individual y rangos
// ---------------------------------------------------------------------------
if (!config.includes("export const EMPLOYEE_KINDS: readonly EmployeeKind[] = ['miner', 'collector'];")) {
  fail('EMPLOYEE_KINDS debe ser exactamente miner/collector');
}
const ranksBlock = /export const EMPLOYEE_RANKS = \[([\s\S]*?)\] as const;/.exec(config);
if (!ranksBlock) {
  fail('src/config.ts: no se encuentra EMPLOYEE_RANKS');
} else {
  const multipliers = [...ranksBlock[1].matchAll(/multiplier:\s*([\d.]+)/g)].map((match) =>
    Number(match[1]),
  );
  if (multipliers.length !== 4) {
    fail(`EMPLOYEE_RANKS: se esperaban 4 rangos y hay ${multipliers.length}`);
  }
  for (let index = 1; index < multipliers.length; index += 1) {
    if (!(multipliers[index] > multipliers[index - 1])) {
      fail('EMPLOYEE_RANKS: los multiplicadores deben crecer con el rango');
    }
  }
}
if (!config.includes('export const HIRE_GROWTH = 1.52;')) {
  warn('src/config.ts: HIRE_GROWTH no es 1.52');
}
const rankMultiplier = extractBlock(config, 'export function employeeRankMultiplier(');
if (!rankMultiplier.includes('employeeSpeedPassive * 0.12')) {
  fail('employeeRankMultiplier(): la pasiva employeeSpeed debe aplicar +12%');
}

// ---------------------------------------------------------------------------
// 7. Loadout inicial
// ---------------------------------------------------------------------------
const defaultLoadout = extractBlock(config, 'export function makeDefaultLoadout(');
if (!defaultLoadout) {
  fail('src/config.ts: no se encuentra makeDefaultLoadout()');
} else {
  if (!/pickaxe:\s*true/.test(defaultLoadout)) fail('makeDefaultLoadout(): el pico debe estar desbloqueado');
  for (const weapon of ['tesla', 'drill', 'shotgun']) {
    if (!new RegExp(`${weapon}:\\s*false`).test(defaultLoadout)) {
      fail(`makeDefaultLoadout(): ${weapon} debe empezar bloqueado`);
    }
  }
  for (const tier of ['frag', 'charge', 'breach', 'seismic']) {
    if (!new RegExp(`${tier}:\\s*0`).test(defaultLoadout)) {
      fail(`makeDefaultLoadout(): ${tier} debe empezar a 0`);
    }
  }
  if (!/jetpack:\s*0/.test(defaultLoadout)) fail('makeDefaultLoadout(): el jetpack debe empezar a nivel 0');
  if (!/capacity:\s*0/.test(defaultLoadout)) fail('makeDefaultLoadout(): la capacidad debe empezar a nivel 0');
  if (!defaultLoadout.includes('ladders: STARTING_LADDERS')) {
    fail('makeDefaultLoadout(): debe empezar con STARTING_LADDERS');
  }
}

// ---------------------------------------------------------------------------
// 8. Bucle de tolva: recoger no acredita, depositar sí
// ---------------------------------------------------------------------------
const onLootCollected = extractBlock(interaction, 'export function onLootCollected(');
if (
  !onLootCollected.includes('game.inventory.addMineral(') ||
  !onLootCollected.includes('game.cargoCoal = updated.carbon')
) {
  fail('onLootCollected(): debe añadir al inventario y sincronizar la mochila');
}
if (onLootCollected.includes('game.run.carbon +=') || onLootCollected.includes('game.run.money +=')) {
  fail('onLootCollected(): recoger no debe acreditar cuota ni dinero');
}
const applyTeamDeposit = extractBlock(interaction, 'export function applyTeamDeposit(');
if (!applyTeamDeposit.includes('game.run.carbon += cleanCoal')) {
  fail('applyTeamDeposit(): debe acreditar el carbón depositado');
}
if (!applyTeamDeposit.includes('game.run.money += cleanMoney')) {
  fail('applyTeamDeposit(): debe acreditar el dinero depositado');
}
const depositCargo = extractBlock(interaction, 'export function depositCargo(');
if (!depositCargo.includes('isNearHopper(game)')) {
  fail('depositCargo(): debe exigir proximidad a la tolva');
}
const isNearHopper = extractBlock(interaction, 'export function isNearHopper(');
if (!isNearHopper.includes('HOPPER_INTERACT_RADIUS')) {
  fail('isNearHopper(): debe usar HOPPER_INTERACT_RADIUS');
}
const finishDay = extractBlock(dayCycle, 'export function finishDay(');
if (!finishDay.includes('discardCargo(game,')) {
  fail('finishDay(): la carga pendiente debe perderse');
}
if (!finishDay.includes('const success = game.run.carbon >= game.run.quota;')) {
  fail('finishDay(): el éxito debe comparar carbón depositado con la cuota');
}
if (!finishDay.includes('game.saves.clear()')) {
  fail('finishDay(): al fracasar debe borrarse el expediente');
}
if (!finishDay.includes('saveRun(game, false)') && !finishDay.includes('game.saveRun(false)')) {
  fail('finishDay(): al tener éxito debe guardarse el siguiente día');
}

// ---------------------------------------------------------------------------
// 9. Tienda y compras
// ---------------------------------------------------------------------------
const buildShopItems = extractBlock(shop, 'export function buildShopItems(');
for (const token of [
  '`weapon:${weapon}`',
  '`upgrade:${id}`',
  'supply:ladders',
  'employee_hire:miner',
  '`employee_rank:${employee.id}`',
  '`employee_convert:${employee.id}`',
]) {
  if (!buildShopItems.includes(token)) {
    fail(`buildShopItems(): falta el ítem ${token}`);
  }
}
const applyPurchase = extractBlock(shop, 'export function applyPurchaseToRun(');
for (const kind of ['weapon', 'upgrade', 'supply', 'employee_hire', 'employee_rank', 'employee_convert']) {
  if (!applyPurchase.includes(`kind === '${kind}'`)) {
    fail(`applyPurchaseToRun(): falta la rama «${kind}»`);
  }
}
if (!applyPurchase.includes('run.money -= cost')) {
  fail('applyPurchaseToRun(): debe descontar el coste');
}
if (!applyPurchase.includes('roster.length >= MAX_EMPLOYEES')) {
  fail('applyPurchaseToRun(): debe respetar MAX_EMPLOYEES');
}
if (!applyPurchase.includes('roster.push({ id, kind: \'miner\', rank: 0 })')) {
  fail('applyPurchaseToRun(): todo contrato nuevo debe ser minero becario (rank 0)');
}
if (!applyPurchase.includes('employee.rank += 1')) {
  fail('applyPurchaseToRun(): el ascenso debe conservar el registro y subir rank');
}
if (!applyPurchase.includes("employee.kind = 'collector'")) {
  fail('applyPurchaseToRun(): la reconversión debe cambiar kind sin crear otro empleado');
}
if (!applyPurchase.includes("if (employee.kind !== 'miner')")) {
  fail('applyPurchaseToRun(): solo se puede reconvertir a recolector desde minero');
}
const applyPurchaseWrapper = extractBlock(shopView, 'export function applyPurchase(');
if (!applyPurchaseWrapper.includes('applyPurchaseToRun(game.run, itemId)')) {
  fail('ShopView.applyPurchase(): debe delegar la validación en applyPurchaseToRun()');
}
if (!applyPurchaseWrapper.includes('game.saveRun(false)')) {
  fail('ShopView.applyPurchase(): debe guardar tras una compra válida');
}
const buildShopView = extractBlock(shopView, 'export function buildShopView(');
if (!buildShopView.includes("canPurchase: game.phase === 'shop' && game.shopSuccess")) {
  fail('buildShopView(): la compra solo debe habilitarse tras un día exitoso');
}

// ---------------------------------------------------------------------------
// 10. Día siguiente, cuota cooperativa y tiempo
// ---------------------------------------------------------------------------
const startNextDay = extractBlock(dayCycle, 'export function startNextDay(');
if (!startNextDay.includes('game.run.day += 1')) {
  fail('startNextDay(): debe avanzar el día');
}
if (!startNextDay.includes('quotaForDay(game.run.day, playerCount)')) {
  fail('startNextDay(): debe recalcular la cuota según jugadores');
}
if (!startNextDay.includes('dayDuration(game.run.loadout)')) {
  fail('startNextDay(): debe reiniciar el reloj con dayDuration()');
}
if (!startNextDay.includes('game.run.carbon = 0')) {
  fail('startNextDay(): el carbón depositado debe reiniciarse');
}
const dayDuration = extractBlock(config, 'export function dayDuration(');
if (!dayDuration.includes('BASE_DAY_TIME + loadout.upgrades.dayTime * DAY_TIME_PER_LEVEL')) {
  fail('dayDuration(): debe ser 90 s + 15 s por nivel de dayTime');
}

// ---------------------------------------------------------------------------
// 11. Guardado del bucle y rangos
// ---------------------------------------------------------------------------
const saveRun = extractBlock(dayCycle, 'export function saveRun(');
if (!saveRun.includes('saveInShop ? game.run.day + 1 : game.run.day')) {
  fail('saveRun(): al terminar el día con éxito debe guardar el día siguiente');
}
if (!saveRun.includes('infinite: game.run.infinite || (saveInShop && game.shopVictory)')) {
  warn('saveRun(): revisa la persistencia de la victoria/infinito');
}
if (!save.includes('ladders: Math.floor(num(record.ladders, STARTING_LADDERS, 0, 999))')) {
  fail('SaveManager: el stock de escaleras debe tener default y cotas');
}

// ---------------------------------------------------------------------------
// 12. HUD y orden de la tienda
// ---------------------------------------------------------------------------
for (const fieldName of [
  'cargoCoal',
  'cargoMoney',
  'ladders',
  'jetpackUnlocked',
  'quota',
  'carbon',
  'money',
]) {
  if (!ui.includes(`${fieldName}:`)) {
    warn(`HudViewData: falta el campo ${fieldName}`);
  }
}
for (const tab of ["'employees'", "'equipment'", "'bonuses'", "'inventory'"]) {
  if (!shopUi.includes(tab)) {
    fail(`shopView: falta la pestaña ${tab}`);
  }
}
if (!shopUi.includes("item.kind === 'weapon' || item.kind === 'supply' || item.kind === 'grenade'")) {
  fail('shopView: EQUIPO debe agrupar armas, suministros y granadas');
}
if (!shopUi.includes("item.kind.startsWith('employee')")) {
  fail('shopView: EMPLEADOS debe agrupar contratación, ascensos y reconversión');
}
if (!shopUi.includes("item.kind === 'upgrade'")) {
  fail('shopView: MEJORAS debe agrupar las mejoras de operario');
}

// ---------------------------------------------------------------------------
// Reporte
// ---------------------------------------------------------------------------
const report = {
  ok: errors.length === 0,
  errors,
  warnings,
};

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('Auditoría de balance y bucle — Carbon Magnate');
  for (const warning of warnings) console.log(`  WARN  ${warning}`);
  for (const error of errors) console.log(`  ERROR ${error}`);
  console.log(`\n${errors.length} error(es), ${warnings.length} warning(s).`);
}

process.exit(errors.length === 0 ? 0 : 1);
