#!/usr/bin/env node
// Audita el determinismo del mundo de Carbon Magnate.
// Uso: node .claude/skills/world-determinism/scripts/audit-world.mjs [--json]

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

const config = read('src/config.ts');
const rng = read('src/core/Rng.ts');
const terrain = read('src/world/Terrain.ts');
const resources = read('src/world/Resources.ts');
const game = read('src/core/Game.ts');
const dayCycle = read('src/core/DayCycle.ts');
const combat = read('src/core/Combat.ts');
const networkBridge = read('src/core/NetworkBridge.ts');
const constants = read('src/core/GameConstants.ts');
const player = read('src/player/Player.ts');

// ---------------------------------------------------------------------------
// 1. PRNG determinista compartido
// ---------------------------------------------------------------------------
for (const name of [
  'mulberry32',
  'hash2',
  'hash3',
  'hashString',
  'valueNoise3',
  'fbm3',
  'randomSeed',
]) {
  if (!rng.includes(`export function ${name}(`)) {
    fail(`src/core/Rng.ts: falta la función determinista ${name}()`);
  }
}

// ---------------------------------------------------------------------------
// 2. Nada de Math.random en la generación del mundo
// ---------------------------------------------------------------------------
for (const relative of [
  'src/world/Terrain.ts',
  'src/world/Resources.ts',
  'src/world/MarchingCubes.ts',
]) {
  const source = read(relative);
  if (/Math\.random\s*\(/.test(source)) {
    fail(`${relative}: Math.random() en generación; usa mulberry32/hash de src/core/Rng.ts`);
  }
}

// ---------------------------------------------------------------------------
// 3. Rejilla, profundidad y zona segura
// ---------------------------------------------------------------------------
for (const line of [
  'export const PIT_SIZE = 48;',
  'export const MINE_DEPTH = 120;',
  'export const SAFE_ZONE_HALF = 30.5;',
  'export const SURFACE_SPAWN = { x: 0, z: 29 } as const;',
  'export const MAX_PELLETS = 6000;',
]) {
  if (!config.includes(line)) fail(`src/config.ts: falta «${line}»`);
}
for (const line of [
  'export const GRID_X = PIT_SIZE + 1;',
  'export const GRID_Y = 129;',
  'export const GRID_Z = PIT_SIZE + 1;',
  'export const GRID_ORIGIN_X = -PIT_HALF;',
  'export const GRID_ORIGIN_Y = -MINE_DEPTH;',
  'export const GRID_ORIGIN_Z = -PIT_HALF;',
]) {
  if (!terrain.includes(line)) fail(`src/world/Terrain.ts: falta «${line}»`);
}

// ---------------------------------------------------------------------------
// 4. El terreno base no excava cuevas ni geodas
// ---------------------------------------------------------------------------
const terrainGenerate = extractBlock(terrain, 'generate(seed: number): void');
if (!terrainGenerate) {
  fail('src/world/Terrain.ts: no se encuentra generate(seed)');
} else {
  if (/\.carve\s*\(/.test(terrainGenerate)) {
    fail('src/world/Terrain.ts: generate() llama a carve(); el subsuelo base debe ser macizo');
  }
  if (terrainGenerate.includes('shaftRadius') || terrainGenerate.includes('surfaceShift')) {
    fail('src/world/Terrain.ts: el mundo debe ser un cubo macizo, sin pozo central ni superficie irregular');
  }
}

// ---------------------------------------------------------------------------
// 5. Recursos: PRNG ligado a semilla y día, nodos embebidos en roca
// ---------------------------------------------------------------------------
const resourcesGenerate = extractBlock(
  resources,
  'generate(seed: number, day: number, terrain: Terrain): void',
);
if (!resourcesGenerate) {
  fail('src/world/Resources.ts: no se encuentra generate(seed, day, terrain)');
} else {
  if (!resourcesGenerate.includes('mulberry32(')) {
    fail('src/world/Resources.ts: generate() no usa mulberry32()');
  }
  if (!resourcesGenerate.includes('hashString(`resources-${day}`)')) {
    fail('src/world/Resources.ts: la semilla de recursos debe mezclarse con el día');
  }
  if (!resourcesGenerate.includes('terrain.getDensityAt(x, y, z) > 0.64')) {
    warn('src/world/Resources.ts: los nodos deben colocarse dentro de roca maciza (densidad > 0.64)');
  }
  if (/this\.carve\s*\(/.test(resourcesGenerate)) {
    fail('src/world/Resources.ts: generate() abre cavidades; los nodos deben quedar embebidos');
  }
}

// ---------------------------------------------------------------------------
// 6. IDs de nodo con día y sin posiciones de red
// ---------------------------------------------------------------------------
if (
  !resources.includes(
    'const id = `d${day}-${spec.type}-${specIndex}-${cluster}-${nodeIndex}`;',
  )
) {
  fail('src/world/Resources.ts: el nodeId de mineral debe incluir el día y un contador estable');
}
if (!resources.includes('const id = `d${day}-chest-${chest}`;')) {
  fail('src/world/Resources.ts: el nodeId de cofre debe incluir el día');
}
if (!resources.includes('const clusterId = `${day}-${spec.type}-${specIndex}-${cluster}`;')) {
  warn('src/world/Resources.ts: el clusterId debería incluir el día');
}
if (/const id = `[^`]*\$\{[^}]*\.(x|y|z)[^}]*\}/.test(resources)) {
  fail('src/world/Resources.ts: un nodeId parece derivarse de coordenadas; usa contadores estables');
}

// ---------------------------------------------------------------------------
// 7. Orden crítico de carga del snapshot
// ---------------------------------------------------------------------------
const loadSnapshot = extractBlock(dayCycle, 'export function loadSnapshot(');
if (!loadSnapshot) {
  fail('src/core/Game.ts: no se encuentra loadSnapshot()');
} else {
  const sequence = [
    'game.terrain.generate(game.seed)',
    'game.resources.generate(game.seed, game.run.day, game.terrain)',
    'game.terrain.applyCarveHistory(snapshot.carveHistory)',
    'game.resources.markBroken(nodeId)',
    'game.resources.setNodeHp(nodeId, hp)',
  ];
  const positions = sequence.map((needle) => loadSnapshot.indexOf(needle));
  positions.forEach((position, index) => {
    if (position < 0) fail(`loadSnapshot(): falta el paso «${sequence[index]}»`);
  });
  for (let index = 1; index < positions.length; index += 1) {
    if (positions[index - 1] >= 0 && positions[index] >= 0 && positions[index] < positions[index - 1]) {
      fail(
        `loadSnapshot(): orden incorrecto; «${sequence[index]}» ocurre antes de «${sequence[index - 1]}»`,
      );
    }
  }
  if (!loadSnapshot.includes('game.ladders.fromSnapshot(snapshot.ladders)')) {
    fail('loadSnapshot(): no restaura las escaleras del snapshot');
  }
}

// ---------------------------------------------------------------------------
// 8. Historial de carves acotado y solo autoritativo
// ---------------------------------------------------------------------------
if (!constants.includes('export const CARVE_HISTORY_LIMIT = 4000;')) {
  fail('src/core/GameConstants.ts: falta CARVE_HISTORY_LIMIT = 4000');
}
if (
  !combat.includes(
    'game.carveHistory.splice(0, game.carveHistory.length - CARVE_HISTORY_LIMIT)',
  )
) {
  fail('recordCarve(): no se recorta el historial al límite');
}
const recordCarve = extractBlock(combat, 'export function recordCarve(');
if (!recordCarve.includes('if (!game.isAuthority())')) {
  fail('recordCarve(): el cliente no debe conservar historial autoritativo');
}
const applyLocalCarve = extractBlock(combat, 'export function applyLocalCarve(');
if (!applyLocalCarve.includes('game.isAuthority()')) {
  fail('applyLocalCarve(): el cliente debe enviar el carve al host, no registrarlo');
}

// ---------------------------------------------------------------------------
// 9. Drops y cofres derivados de semilla + nodeId
// ---------------------------------------------------------------------------
if (!combat.includes('hashString(`${game.seed}:${node.id}:drop`)')) {
  fail('getDropSeed(): debe derivarse de semilla + nodeId + “drop”');
}
if (!resources.includes('hashString(`${this.seed}:${node.id}:chest`)')) {
  fail('getChestReward(): debe derivarse de semilla + nodeId + “chest”');
}

// ---------------------------------------------------------------------------
// 10. Snapshot determinista completo
// ---------------------------------------------------------------------------
const buildSnapshot = extractBlock(networkBridge, 'export function buildSnapshot(');
if (!buildSnapshot) {
  fail('src/core/Game.ts: no se encuentra buildSnapshot()');
} else {
  for (const field of [
    'phase:',
    'day:',
    'seed:',
    'quota:',
    'timeLeft:',
    'money:',
    'carbon:',
    'dayMoneyBase:',
    'infinite:',
    'loadout:',
    'stats:',
    'carveHistory:',
    'brokenNodes:',
    'nodeHp:',
    'players:',
    'staff:',
    'ladders:',
  ]) {
    if (!buildSnapshot.includes(field)) {
      fail(`buildSnapshot(): falta el campo ${field}`);
    }
  }
  if (!buildSnapshot.includes("carveHistory: game.phase === 'playing' ? [...game.carveHistory] : []")) {
    warn('buildSnapshot(): el historial solo debería enviarse durante la fase playing');
  }
  for (const call of [
    'game.resources.getBrokenIds()',
    'game.resources.getDamagedSnapshot()',
    'game.staffManager.getStates()',
    'game.ladders.getSnapshot()',
  ]) {
    if (!buildSnapshot.includes(call)) fail(`buildSnapshot(): falta ${call}`);
  }
}

// ---------------------------------------------------------------------------
// 11. El historial se reaplica en lote antes de reconstruir mallas
// ---------------------------------------------------------------------------
const applyHistory = extractBlock(
  terrain,
  'applyCarveHistory(events: readonly CarveEvent[]): void',
);
if (!applyHistory.includes('this.carve(event, true)')) {
  fail('applyCarveHistory(): debe aplicar los carves con deferRebuild = true');
}
if (!applyHistory.includes('this.rebuildDirty(Number.MAX_SAFE_INTEGER)')) {
  fail('applyCarveHistory(): debe reconstruir las mallas una sola vez al final');
}

// ---------------------------------------------------------------------------
// 12. Zona segura fuera del dominio minable
// ---------------------------------------------------------------------------
const outsidePit = extractBlock(player, 'private isOutsidePit(');
if (!outsidePit.includes('Math.abs(x) > PIT_HALF') || !outsidePit.includes('Math.abs(z) > PIT_HALF')) {
  fail('Player.isOutsidePit(): la zona segura debe empezar en ±PIT_HALF');
}
if (!player.includes('SAFE_FLOOR_Y')) {
  warn('Player: no se encuentra el suelo seguro de la superficie');
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
  console.log('Auditoría de determinismo — Carbon Magnate');
  for (const warning of warnings) console.log(`  WARN  ${warning}`);
  for (const error of errors) console.log(`  ERROR ${error}`);
  console.log(`\n${errors.length} error(es), ${warnings.length} warning(s).`);
}

process.exit(errors.length === 0 ? 0 : 1);
