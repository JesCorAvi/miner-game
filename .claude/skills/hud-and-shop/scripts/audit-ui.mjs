#!/usr/bin/env node
// Audita el contrato de IDs, overlays, HUD, tienda y pixel mode de Carbon Magnate.
// Uso: node .claude/skills/hud-and-shop/scripts/audit-ui.mjs [--json]

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

const indexHtml = read('index.html');
const cssFiles = [];
walk(path.join(ROOT, 'src'), '.css', cssFiles);
const css = cssFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const ui = read('src/ui/UI.ts');
const shopView = read('src/ui/shopView.ts');
const game = read('src/core/Game.ts');
const view = read('src/core/View.ts');
const config = read('src/config.ts');

// ---------------------------------------------------------------------------
// 1. IDs únicos en index.html
// ---------------------------------------------------------------------------
const htmlIds = new Map();
for (const match of indexHtml.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)) {
  const id = match[1];
  htmlIds.set(id, (htmlIds.get(id) || 0) + 1);
}
for (const [id, count] of htmlIds) {
  if (count > 1) fail(`index.html: id duplicado «${id}» (${count} veces)`);
}

// ---------------------------------------------------------------------------
// 2. Toda referencia estática debe existir en el HTML
// ---------------------------------------------------------------------------
const tsFiles = [];
walk(path.join(ROOT, 'src'), '.ts', tsFiles);

const references = [];
for (const file of tsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const relative = path.relative(ROOT, file).replace(/\\/g, '/');
  for (const match of source.matchAll(/\brequired(?:Element)?(?:<[^>]*>)?\(\s*'([^']+)'\s*\)/g)) {
    references.push({ id: match[1], file: relative, api: 'required' });
  }
  for (const match of source.matchAll(/getElementById\(\s*'([^']+)'\s*\)/g)) {
    references.push({ id: match[1], file: relative, api: 'getElementById' });
  }
  for (const match of source.matchAll(/querySelector(?:All)?\(\s*'#([A-Za-z0-9_-]+)'\s*\)/g)) {
    references.push({ id: match[1], file: relative, api: 'querySelector' });
  }
}
const missing = references.filter((reference) => !htmlIds.has(reference.id));
for (const reference of missing) {
  fail(
    `${reference.file}: ${reference.api}("${reference.id}") no existe en index.html; el arranque o el panel fallaría`,
  );
}

// ---------------------------------------------------------------------------
// 3. Overlays: solo el menú principal arranca visible
// ---------------------------------------------------------------------------
for (const match of indexHtml.matchAll(/<([a-zA-Z][\w-]*)\b([^>]*)>/g)) {
  const attributes = match[2];
  const classMatch = /\bclass\s*=\s*["']([^"']*)["']/.exec(attributes);
  if (!classMatch) continue;
  const classes = classMatch[1].split(/\s+/).filter(Boolean);
  if (!classes.includes('overlay')) continue;
  const idMatch = /\bid\s*=\s*["']([^"']+)["']/.exec(attributes);
  const id = idMatch ? idMatch[1] : '(sin id)';
  const hidden = /\bhidden(?:\s|=|>)/.test(attributes);
  if (id === 'menu-overlay') {
    if (hidden) warn('index.html: menu-overlay arranca oculto; el jugador vería una pantalla vacía');
  } else if (!hidden) {
    fail(`index.html: el overlay «${id}» debe arrancar con el atributo hidden`);
  }
}

// ---------------------------------------------------------------------------
// 4. HUD y prompt contextual
// ---------------------------------------------------------------------------
if (!/<section[^>]*id="hud"[^>]*class="[^"]*is-hidden/.test(indexHtml)) {
  warn('index.html: el HUD debería arrancar con is-hidden');
}
for (const id of [
  'interaction-prompt',
  'interaction-key',
  'interaction-text',
  'hud-cargo-weight',
  'hud-cargo-weight-fill',
  'hud-hopper',
  'hud-jet-hint',
  'jet-card',
  'hud-quota-fill',
  'hud-fuel-fill',
  'hud-objective-kind',
  'inventory-hotbar',
  'inventory-panel',
  'inventory-grid',
  'inventory-weight',
  'inventory-summary',
]) {
  if (!htmlIds.has(id)) fail(`index.html: falta el elemento de HUD «${id}»`);
}

const hudFields = [
  'day',
  'timeLeft',
  'quota',
  'carbon',
  'money',
  'depth',
  'layerName',
  'fuel',
  'maxFuel',
  'onlineActive',
  'onlinePlayers',
  'onlineIsHost',
  'muted',
  'employees',
  'cargoCoal',
  'cargoMoney',
  'cargoWeight',
  'maxCargoWeight',
  'inventorySlots',
  'inventoryCount',
  'inventoryOpen',
  'activeHotbarSlot',
  'ladders',
  'ladderPlacementEnabled',
  'jetpackUnlocked',
  'prompt',
];
const hudView = /export interface HudViewData \{([\s\S]*?)\n\}/.exec(ui);
if (!hudView) {
  fail('src/ui/UI.ts: no se encuentra HudViewData');
} else {
  for (const fieldName of hudFields) {
    if (!new RegExp(`\\b${fieldName}\\s*:`).test(hudView[1])) {
      fail(`HudViewData: falta «${fieldName}»`);
    }
  }
}
if (!ui.includes("this.hud.classList.remove('is-hidden')")) {
  fail('UI.showHud(): debe quitar is-hidden del HUD');
}
if (!ui.includes("this.hud.classList.add('is-hidden')")) {
  fail('UI.hideHud(): debe ocultar el HUD');
}

// ---------------------------------------------------------------------------
// 5. Hotbar de 9 + inventario de 36
// ---------------------------------------------------------------------------
if (!/export const HOTBAR_SLOTS = 9;/.test(config)) {
  fail('src/config.ts: HOTBAR_SLOTS debe ser 9');
}
if (!/export const INVENTORY_SLOTS = 36;/.test(config)) {
  fail('src/config.ts: INVENTORY_SLOTS debe ser 36');
}
if (!ui.includes("required<HTMLElement>('inventory-hotbar')")) {
  fail('UI.ts: debe montar la hotbar desde #inventory-hotbar');
}
if (!ui.includes('InventoryView')) {
  fail('UI.ts: debe usar InventoryView para la hotbar/inventario');
}

// ---------------------------------------------------------------------------
// 6. Tienda: grupos, tipos y estados
// ---------------------------------------------------------------------------
for (const tab of ['employees', 'equipment', 'bonuses', 'inventory']) {
  if (!shopView.includes(`'${tab}'`)) {
    fail(`shopView: falta la pestaña «${tab}»`);
  }
}
if (!shopView.includes('TAB_META')) {
  fail('shopView: faltan los títulos de pestaña');
}
if (!shopView.includes("item.kind === 'weapon' || item.kind === 'pickaxe' || item.kind === 'supply' || item.kind === 'grenade'")) {
  fail('shopView: EQUIPO debe agrupar armas, picos, suministros y granadas');
}
if (!shopView.includes("item.kind.startsWith('employee')")) {
  fail('shopView: EMPLEADOS debe agrupar contratación, ascensos y reconversión');
}
for (const kind of [
  'weapon',
  'upgrade',
  'supply',
  'grenade',
  'employee_hire',
  'employee_rank',
  'employee_convert',
]) {
  if (!shopView.includes(`case '${kind}':`)) {
    fail(`shopView.itemKindLabel(): no hay etiqueta para el tipo «${kind}»`);
  }
}
if (!shopView.includes("item.kind === 'employee_convert' ? 'collector' : 'miner'")) {
  fail('shopView.iconForItem(): los empleados deben usar icono de minero/recolector');
}
if (!shopView.includes("button.dataset.itemId = item.id")) {
  fail('shopView.makeShopCard(): el botón debe transportar item.id');
}
if (!shopView.includes('button.disabled =')) {
  fail('shopView.makeShopCard(): el botón debe deshabilitarse si no se puede comprar');
}
if (!ui.includes('renderShopItems(this.shopContent, data, this.activeShopTab)')) {
  fail('UI.renderShop(): debe renderizar la pestaña activa con renderShopItems()');
}
if (!ui.includes('this.shopContent.addEventListener')) {
  fail('UI: la tienda debe delegar los clics en shop-content');
}
for (const id of ['shop-tab-employees', 'shop-tab-equipment', 'shop-tab-bonuses', 'shop-tab-inventory']) {
  if (!indexHtml.includes(`id="${id}"`)) {
    fail(`index.html: falta la pestaña #${id}`);
  }
}
for (const id of [
  'day-summary-overlay',
  'day-summary-lines',
  'day-summary-bonus',
  'day-summary-total',
  'day-summary-continue',
]) {
  if (!indexHtml.includes(`id="${id}"`)) {
    fail(`index.html: falta la liquidación #${id}`);
  }
}
if (!ui.includes('showDaySummary') || !ui.includes('renderDaySummary')) {
  fail('UI: falta la vista de liquidación de fin de día');
}

// ---------------------------------------------------------------------------
// 7. Pixel mode exterior
// ---------------------------------------------------------------------------
if (!htmlIds.has('pixel-quantize')) {
  fail('index.html: falta el filtro SVG #pixel-quantize');
}
if (!css.includes('url(#pixel-quantize)')) {
  fail('src/styles/*.css: el filtro #pixel-quantize no se aplica');
}
if (!css.includes('#game-canvas.is-pixelated')) {
  fail('src/styles/*.css: falta la regla #game-canvas.is-pixelated');
}
if (!view.includes("game.canvas.classList.toggle('is-pixelated', usePixel)")) {
  fail('View.updatePixelMode(): debe conmutar is-pixelated en el canvas');
}
if (!view.includes("document.body.classList.toggle('is-outside-pixel', usePixel)")) {
  fail('View.updatePixelMode(): debe conmutar is-outside-pixel en body');
}
if (!view.includes('applyRenderResolution(game)')) {
  fail('View.updatePixelMode(): debe recalcular la resolución interna');
}

// ---------------------------------------------------------------------------
// 8. Sin recursos externos en la UI
// ---------------------------------------------------------------------------
for (const [name, source] of [
  ['index.html', indexHtml],
  ['src/style.css', css],
]) {
  if (/@font-face/i.test(source)) {
    fail(`${name}: no se permiten fuentes externas`);
  }
  for (const match of source.matchAll(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g)) {
    const url = match[2].trim();
    if (url.startsWith('#') || url.startsWith('data:')) continue;
    fail(`${name}: referencia externa «${url}»; usa canvas/geometría procedural`);
  }
  for (const match of source.matchAll(/https?:\/\/[^\s"'<>]+/g)) {
    warn(`${name}: URL externa «${match[0]}»; revisa que no sea un activo`);
  }
}

// ---------------------------------------------------------------------------
// 9. Formato español y textos clave
// ---------------------------------------------------------------------------
if (!fs.existsSync(path.join(ROOT, 'src/ui/format.ts'))) {
  fail('Falta src/ui/format.ts');
}
for (const label of [
  'ORGANIGRAMA DE PLANTILLA',
  'EQUIPO DE EXTRACCIÓN',
  'MEJORAS DE OPERARIO',
  'INVENTARIO PERMANENTE',
  'BONUS DE RENDIMIENTO',
]) {
  if (!shopView.includes(label) && !ui.includes(label)) {
    warn(`shopView/UI: falta la sección «${label}»`);
  }
}

// ---------------------------------------------------------------------------
// Reporte
// ---------------------------------------------------------------------------
const report = {
  ok: errors.length === 0,
  htmlIds: htmlIds.size,
  tsFiles: tsFiles.length,
  references: references.length,
  missingReferences: missing.length,
  errors,
  warnings,
};

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('Auditoría de HUD y tienda — Carbon Magnate');
  console.log(
    `IDs en index.html: ${htmlIds.size} · Archivos TS: ${tsFiles.length} · Referencias: ${references.length}`,
  );
  for (const warning of warnings) console.log(`  WARN  ${warning}`);
  for (const error of errors) console.log(`  ERROR ${error}`);
  console.log(`\n${errors.length} error(es), ${warnings.length} warning(s).`);
}

process.exit(errors.length === 0 ? 0 : 1);
