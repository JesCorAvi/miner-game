#!/usr/bin/env node
// Audita el guardado v5 y el roster individual de Carbon Magnate.
// Uso: node .claude/skills/save-and-roster/scripts/audit-save.mjs [--json]

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

function walk(dir, extension, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, extension, out);
    else if (entry.name.endsWith(extension)) out.push(full);
  }
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

const config = read('src/config.ts');
const save = read('src/save/SaveManager.ts');
const types = read('src/types.ts');
const game = read('src/core/Game.ts');
const shop = read('src/core/Shop.ts');
const shopView = read('src/core/ShopView.ts');
const dayCycle = read('src/core/DayCycle.ts');
const constants = read('src/core/GameConstants.ts');
const ui = read('src/ui/UI.ts');

// ---------------------------------------------------------------------------
// 1. Claves y versión
// ---------------------------------------------------------------------------
if (!config.includes("export const SAVE_KEY = 'carbon-magnate.save.v5';")) {
  fail('src/config.ts: SAVE_KEY debe ser carbon-magnate.save.v5');
}
if (!config.includes("export const NAME_KEY = 'carbon-magnate.name';")) {
  fail('src/config.ts: NAME_KEY debe ser carbon-magnate.name');
}
if (
  !save.includes("'carbon-magnate.save.v4'") ||
  !save.includes("'carbon-magnate.save.v3'") ||
  !save.includes("'carbon-magnate.save.v2'")
) {
  fail('SaveManager.ts: faltan las claves heredadas v4, v3 y v2');
}
if (!save.includes('const SAVE_VERSION = 5;')) {
  fail('SaveManager.ts: SAVE_VERSION debe ser 5');
}
if (
  !save.includes('record.version !== 2') ||
  !save.includes('record.version !== 3') ||
  !save.includes('record.version !== 4') ||
  !save.includes('record.version !== SAVE_VERSION')
) {
  fail('SaveManager.load(): debe aceptar v2, v3, v4 y v5, y rechazar el resto');
}
if (!save.includes('version: 5,')) {
  fail('SaveManager.save(): debe escribir version 5');
}
if (!save.includes('for (const key of LEGACY_SAVE_KEYS)') ||
    !save.includes('window.localStorage.removeItem(key)')) {
  fail('SaveManager.save(): debe limpiar las claves heredadas tras migrar');
}
if (!types.includes('version: 5;')) {
  fail('src/types.ts: SaveData.version debe ser el literal 5');
}

// ---------------------------------------------------------------------------
// 2. Normalización del loadout
// ---------------------------------------------------------------------------
if (!save.includes('function normalizeLoadout(value: unknown): Loadout')) {
  fail('SaveManager.ts: falta normalizeLoadout()');
} else {
  for (const token of [
    'const fallback = makeDefaultLoadout();',
    'for (const id of WEAPON_ORDER)',
    "weapons[id] = id === 'pickaxe' ? true : Boolean(weaponsRecord[id]);",
    'UPGRADES[key].max',
    'for (const key of PASSIVE_ORDER)',
    'normalizeEmployees(employeesRecord)',
    'STARTING_LADDERS',
    '0, 999',
  ]) {
    if (!save.includes(token)) fail(`normalizeLoadout(): falta «${token}»`);
  }
}
if (!save.includes("const PASSIVE_ORDER") && !config.includes('export const PASSIVE_ORDER')) {
  fail('Falta PASSIVE_ORDER; el guardado no puede normalizar pasivas');
}

// ---------------------------------------------------------------------------
// 3. Roster individual y migración v2
// ---------------------------------------------------------------------------
if (!save.includes("function normalizeEmployees(record: Record<string, unknown>): Loadout['employees']")) {
  fail('SaveManager.ts: falta normalizeEmployees()');
} else {
  for (const token of [
    'record.roster.slice(0, MAX_EMPLOYEES)',
    "const kind = entry.kind === 'collector' ? 'collector' : 'miner';",
    'rank: Math.floor(num(entry.rank, 0, 0, 3))',
    "id = `emp-${generatedId}`",
    'const nextId = Math.max(',
    'maxNumericId + 1',
  ]) {
    if (!save.includes(token)) fail(`normalizeEmployees(): falta «${token}»`);
  }
  if (!save.includes('record.miners') || !save.includes('record.collectors') || !save.includes('record.rank')) {
    warn('normalizeEmployees(): revisa la migración de contadores v2 (miners/collectors/rank)');
  }
}
if (!types.includes('export interface EmployeeRecord {') ||
    !types.includes('id: string;') ||
    !types.includes("kind: EmployeeKind;") ||
    !types.includes('rank: number;')) {
  fail('src/types.ts: EmployeeRecord debe conservar id, kind y rank');
}
if (!types.includes('roster: EmployeeRecord[];') || !types.includes('nextId: number;')) {
  fail('src/types.ts: EmployeeState debe tener roster y nextId');
}
if (types.includes('miners: number') || types.includes('collectors: number')) {
  fail('src/types.ts: no vuelvas a contadores globales de mineros/recolectores');
}

// ---------------------------------------------------------------------------
// 4. Guardado, borrado y preferencias
// ---------------------------------------------------------------------------
const load = extractBlock(save, 'load(): SaveData | null');
if (!load.includes('[SAVE_KEY, ...LEGACY_SAVE_KEYS]') || !load.includes('LEGACY_SAVE_KEYS')) {
  fail('SaveManager.load(): debe leer v5, v4, v3 y v2 como migración');
}
if (!load.includes('JSON.parse(raw)')) fail('SaveManager.load(): debe parsear JSON');
if (!load.includes('catch {')) warn('SaveManager.load(): debería tolerar almacenamiento corrupto');
const write = extractBlock(save, 'save(data: Omit<SaveData');
if (!write.includes('window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload))')) {
  fail('SaveManager.save(): debe escribir el payload en SAVE_KEY');
}
if (!write.includes('savedAt: Date.now()')) {
  fail('SaveManager.save(): debe registrar savedAt');
}
if (!write.includes('catch {')) warn('SaveManager.save(): debería tolerar cuota/almacenamiento bloqueado');
const clear = extractBlock(save, 'clear(): void');
if (!clear.includes('window.localStorage.removeItem(SAVE_KEY)')) {
  fail('SaveManager.clear(): debe borrar el expediente');
}
if (clear.includes('removeItem(NAME_KEY)')) {
  warn('SaveManager.clear(): el nombre de operario es una preferencia; no debería borrarse');
}
if (!save.includes('loadName(): string') || !save.includes('saveName(name: string): void')) {
  fail('SaveManager.ts: faltan loadName/saveName');
}
if (!save.includes('window.localStorage.getItem(NAME_KEY)') || !save.includes('setItem(NAME_KEY, name)')) {
  fail('SaveManager: el nombre debe persistirse en NAME_KEY');
}

// ---------------------------------------------------------------------------
// 5. Un solo propietario de localStorage
// ---------------------------------------------------------------------------
const tsFiles = [];
walk(path.join(ROOT, 'src'), '.ts', tsFiles);
for (const file of tsFiles) {
  const relative = path.relative(ROOT, file).replace(/\\/g, '/');
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('localStorage') && relative !== 'src/save/SaveManager.ts') {
    fail(`${relative}: localStorage debe estar encapsulado en SaveManager`);
  }
}
for (const forbidden of ['indexedDB', 'sessionStorage']) {
  for (const file of tsFiles) {
    const relative = path.relative(ROOT, file).replace(/\\/g, '/');
    const source = fs.readFileSync(file, 'utf8');
    if (source.includes(forbidden)) {
      warn(`${relative}: se usa ${forbidden}; el expediente vive en localStorage v5`);
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Flujo de guardado en Game
// ---------------------------------------------------------------------------
const saveRun = extractBlock(dayCycle, 'export function saveRun(');
if (!saveRun) {
  fail('DayCycle: falta saveRun()');
} else {
  if (!saveRun.includes("game.role === 'client'")) {
    fail('saveRun(): los clientes online no deben guardar expediente');
  }
  for (const phase of ['menu', 'lobby', 'gameover']) {
    if (!saveRun.includes(`game.phase === '${phase}'`)) {
      fail(`saveRun(): no debe guardar en la fase ${phase}`);
    }
  }
  if (!saveRun.includes('day: saveInShop ? game.run.day + 1 : game.run.day')) {
    fail('saveRun(): al tener éxito debe guardar el día siguiente');
  }
  if (!saveRun.includes('loadout: cloneLoadout(game.run.loadout)') ||
      !saveRun.includes('stats: cloneStats(game.run.stats)')) {
    fail('saveRun(): debe guardar loadout y estadísticas');
  }
  if (!saveRun.includes('playerName: game.ui.getPlayerName()')) {
    warn('saveRun(): no se está guardando el nombre del operario');
  }
}
if (!constants.includes('export const AUTOSAVE_INTERVAL = 12;')) {
  fail('GameConstants: el autoguardado debe ocurrir cada 12 s');
}
if (!game.includes("document.addEventListener('visibilitychange', this.visibilityHandler)")) {
  fail('Game: debe guardar al ocultar la pestaña');
}
if (!game.includes("window.addEventListener('pagehide', this.pageHideHandler)")) {
  fail('Game: debe guardar al cerrar la página');
}
if (!game.includes('if (document.visibilityState === \'hidden\')')) {
  warn('visibilityHandler: revisa que solo guarde al ocultar');
}
const finishDay = extractBlock(dayCycle, 'export function finishDay(');
if (!finishDay.includes('game.saves.clear()')) {
  fail('finishDay(): al fracasar debe borrar el expediente');
}
if (!finishDay.includes('saveRun(game, false)') && !finishDay.includes('game.saveRun(false)')) {
  fail('finishDay(): al tener éxito debe guardar el siguiente día');
}
const applyPurchase = extractBlock(shopView, 'export function applyPurchase(');
if (!applyPurchase.includes('game.saveRun(false)')) {
  fail('ShopView.applyPurchase(): debe guardar tras comprar');
}
const startNextDay = extractBlock(dayCycle, 'export function startNextDay(');
if (!startNextDay.includes('saveRun(game, false)') && !startNextDay.includes('game.saveRun(false)')) {
  fail('startNextDay(): debe guardar al empezar el día');
}
const summarySources = [
  game,
  dayCycle,
  read('src/core/Session.ts'),
  read('src/core/View.ts'),
  read('src/core/NetworkBridge.ts'),
].join('\n');
if (!summarySources.includes('saves.summary()')) {
  warn('Game: el menú debería mostrar el resumen del expediente');
}
if (!ui.includes('setSaved(')) {
  warn('UI: no se encuentra el indicador de guardado');
}

// ---------------------------------------------------------------------------
// 7. Roster en la partida
// ---------------------------------------------------------------------------
const purchaseLogic = extractBlock(shop, 'export function applyPurchaseToRun(');
if (!purchaseLogic.includes('run.loadout.employees.nextId += 1')) {
  fail('applyPurchaseToRun(): cada contrato debe consumir nextId');
}
if (!purchaseLogic.includes('roster.push({ id, kind: \'miner\', rank: 0 })')) {
  fail('applyPurchaseToRun(): todo contrato nuevo debe ser minero becario');
}
if (!purchaseLogic.includes('employee.rank += 1')) {
  fail('applyPurchaseToRun(): el ascenso debe modificar el registro existente');
}
if (!purchaseLogic.includes("employee.kind = 'collector'")) {
  fail('applyPurchaseToRun(): la reconversión debe modificar el registro existente');
}
const applyPurchaseBody = extractBlock(shopView, 'export function applyPurchase(');
if (!applyPurchaseBody.includes('game.saveRun(false)')) {
  fail('ShopView.applyPurchase(): debe guardar después de una compra válida');
}
const staff = read('src/entities/Staff.ts');
const configure = extractBlock(staff, 'configure(');
if (!configure.includes('this.spawnEntities(loadout)')) {
  fail('StaffManager.configure(): debe reconstruir la plantilla desde el loadout');
}
const spawnEntities = extractBlock(staff, 'private spawnEntities(');
if (!spawnEntities.includes('loadout.employees.roster.forEach')) {
  fail('StaffManager.spawnEntities(): debe iterar el roster individual, no contadores');
}
if (
  !spawnEntities.includes('employee.id') ||
  !spawnEntities.includes('employee.kind') ||
  !spawnEntities.includes('employee.rank')
) {
  fail('StaffManager.spawnEntities(): cada empleado debe conservar id, kind y rank');
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
  console.log('Auditoría de guardado y plantilla — Carbon Magnate');
  for (const warning of warnings) console.log(`  WARN  ${warning}`);
  for (const error of errors) console.log(`  ERROR ${error}`);
  console.log(`\n${errors.length} error(es), ${warnings.length} warning(s).`);
}

process.exit(errors.length === 0 ? 0 : 1);
