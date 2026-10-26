#!/usr/bin/env node
// Audita el empaquetado Electron y el protocolo seguro carbon:// de Carbon Magnate.
// Uso: node .claude/skills/desktop-packaging/scripts/audit-electron.mjs [--json]

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

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
}

const main = read('electron/main.cjs');
const packageRaw = read('package.json');
const vite = read('vite.config.ts');
const gitignore = read('.gitignore');

let packageJson = null;
try {
  packageJson = JSON.parse(packageRaw);
} catch {
  fail('package.json: JSON inválido');
}

// ---------------------------------------------------------------------------
// 1. Protocolo carbon://
// ---------------------------------------------------------------------------
if (!main.includes("const SCHEME = 'carbon';")) {
  fail('electron/main.cjs: el esquema debe ser carbon://');
}
if (!main.includes('protocol.registerSchemesAsPrivileged([')) {
  fail('electron/main.cjs: falta registerSchemesAsPrivileged');
}
for (const privilege of ['standard: true', 'secure: true', 'supportFetchAPI: true', 'corsEnabled: true', 'stream: true']) {
  if (!main.includes(privilege)) {
    fail(`electron/main.cjs: el esquema carbon:// debe declarar ${privilege}`);
  }
}
if (!main.includes('session.fromPartition(PARTITION)')) {
  fail('electron/main.cjs: el protocolo debe registrarse en la sesión persistente');
}
if (!main.includes('appSession.protocol.handle(SCHEME')) {
  fail('electron/main.cjs: falta el handler del protocolo carbon://');
}
if (!main.includes('const DIST_ROOT = path.resolve(__dirname, \'..\', \'dist\');')) {
  fail('electron/main.cjs: DIST_ROOT debe apuntar a dist/');
}

// ---------------------------------------------------------------------------
// 2. Seguridad del protocolo y de la ventana
// ---------------------------------------------------------------------------
if (!main.includes('path.resolve(DIST_ROOT, `.${pathname}`)')) {
  fail('electron/main.cjs: la ruta solicitada debe resolverse dentro de DIST_ROOT');
}
if (!main.includes('target.startsWith(`${DIST_ROOT}${path.sep}`)')) {
  fail('electron/main.cjs: falta la comprobación contra path traversal');
}
if (!main.includes("return new Response('Forbidden', { status: 403 })")) {
  fail('electron/main.cjs: una ruta fuera de dist/ debe devolver 403');
}
for (const option of [
  'contextIsolation: true',
  'nodeIntegration: false',
  'sandbox: true',
  'webSecurity: true',
  'backgroundThrottling: false',
  'partition: PARTITION',
]) {
  if (!main.includes(option)) {
    fail(`electron/main.cjs: la BrowserWindow debe declarar ${option}`);
  }
}
if (/\bpreload\s*:/.test(main)) {
  warn('electron/main.cjs: se ha añadido un preload; revisa el puente estrecho y la seguridad');
}
if (!main.includes("setWindowOpenHandler(() => ({ action: 'deny' }))")) {
  fail('electron/main.cjs: las ventanas emergentes deben bloquearse');
}
if (!main.includes("mainWindow.webContents.on('will-navigate'")) {
  fail('electron/main.cjs: falta la guarda de navegación');
}
if (!main.includes('Menu.setApplicationMenu(null)')) {
  fail('electron/main.cjs: el menú nativo debe desactivarse');
}
if (!main.includes('app.requestSingleInstanceLock()')) {
  warn('electron/main.cjs: no se encuentra el bloqueo de instancia única');
}
if (!main.includes('app.whenReady().then(')) {
  fail('electron/main.cjs: falta el arranque tras app.whenReady()');
}
if (!main.includes('mainWindow.loadURL(DEV_URL)') || !main.includes('${SCHEME}://app/index.html')) {
  fail('electron/main.cjs: debe cargar VITE_DEV_SERVER_URL en desarrollo y carbon://app/index.html en producción');
}

// ---------------------------------------------------------------------------
// 3. package.json y Vite
// ---------------------------------------------------------------------------
if (!packageJson) {
  // Ya se ha registrado el error de JSON.
} else {
  if (packageJson.main !== 'electron/main.cjs') {
    fail('package.json: main debe ser electron/main.cjs');
  }
  const scripts = packageJson.scripts || {};
  for (const script of ['dev', 'typecheck', 'build:web', 'electron:dev', 'electron:preview', 'build:win']) {
    if (!scripts[script]) fail(`package.json: falta el script «${script}»`);
  }
  if (!/tsc --noEmit/.test(scripts.typecheck || '')) {
    fail('package.json: typecheck debe ejecutar tsc --noEmit');
  }
  if (!/vite build/.test(scripts['build:web'] || '')) {
    fail('package.json: build:web debe ejecutar vite build');
  }
  if (!/electron-builder --win portable/.test(scripts['build:win'] || '')) {
    fail('package.json: build:win debe generar un portable de Windows');
  }
  const build = packageJson.build || {};
  if (build.appId !== 'com.carbonmagnate.game') {
    warn('package.json: appId inesperado');
  }
  if (build.productName !== 'Carbon Magnate') {
    fail('package.json: productName debe ser «Carbon Magnate»');
  }
  if (build.executableName !== 'CarbonMagnate') {
    warn('package.json: executableName no es CarbonMagnate');
  }
  if (build.asar !== true) {
    warn('package.json: se esperaba asar: true');
  }
  const files = build.files || [];
  for (const required of ['dist/**/*', 'electron/**/*', 'package.json']) {
    if (!files.includes(required)) fail(`package.json: build.files debe incluir «${required}»`);
  }
  const win = build.win || {};
  const target = Array.isArray(win.target) ? win.target[0] : null;
  if (!target || target.target !== 'portable') {
    fail('package.json: el objetivo de Windows debe ser portable');
  }
  if (!win.icon) {
    warn('package.json: falta el icono de Windows');
  }
}
if (!vite.includes("base: './'")) {
  fail('vite.config.ts: base debe ser \'./\' para el empaquetado');
}
for (const ignored of ['node_modules/', 'dist/', 'release/']) {
  if (!gitignore.includes(ignored)) {
    warn(`.gitignore: debería ignorar ${ignored}`);
  }
}

// ---------------------------------------------------------------------------
// 4. Sin restos de Steam ni de otro proyecto
// ---------------------------------------------------------------------------
const FORBIDDEN_DESKTOP = /steamworks|steam_appid|steam_api|Steamworks|sendP2P|steamOnline|electronWindow/i;
for (const relative of ['electron/main.cjs', 'package.json']) {
  const source = relative === 'electron/main.cjs' ? main : packageRaw;
  if (FORBIDDEN_DESKTOP.test(source)) {
    fail(`${relative}: contiene restos de Steam u otro puente de escritorio`);
  }
}
const sourceFiles = [];
walk(path.join(ROOT, 'src'), sourceFiles);
for (const file of sourceFiles) {
  if (!file.endsWith('.ts')) continue;
  const relative = path.relative(ROOT, file).replace(/\\/g, '/');
  const source = fs.readFileSync(file, 'utf8');
  if (FORBIDDEN_DESKTOP.test(source)) {
    fail(`${relative}: el runtime web no debe depender de Steam/Escritorio`);
  }
  if (/from\s+'electron'|require\(\s*'electron'\s*\)|window\.electron|window\.steam/.test(source)) {
    fail(`${relative}: el renderer debe ser 100 % compatible con navegador`);
  }
}

// ---------------------------------------------------------------------------
// 5. Artefactos y build
// ---------------------------------------------------------------------------
for (const relative of ['build/icon.svg', 'public/favicon.svg']) {
  if (!fs.existsSync(path.join(ROOT, relative))) {
    warn(`Falta ${relative}`);
  }
}
if (!fs.existsSync(path.join(ROOT, 'electron/main.cjs'))) {
  fail('Falta electron/main.cjs');
}
if (fs.existsSync(path.join(ROOT, 'electron/preload.cjs'))) {
  warn('electron/preload.cjs existe; el proyecto se diseñó sin preload');
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
  console.log('Auditoría de empaquetado de escritorio — Carbon Magnate');
  for (const warning of warnings) console.log(`  WARN  ${warning}`);
  for (const error of errors) console.log(`  ERROR ${error}`);
  console.log(`\n${errors.length} error(es), ${warnings.length} warning(s).`);
}

process.exit(errors.length === 0 ? 0 : 1);
