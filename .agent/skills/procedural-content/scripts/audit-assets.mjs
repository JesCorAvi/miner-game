#!/usr/bin/env node
// Audita geometría procedural, texturas canvas, instancing y liberación de VRAM.
// Uso: node .claude/skills/procedural-content/scripts/audit-assets.mjs [--json]

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

const tsFiles = [];
walk(path.join(ROOT, 'src'), '.ts', tsFiles);
const sources = new Map();
for (const file of tsFiles) {
  sources.set(path.relative(ROOT, file).replace(/\\/g, '/'), fs.readFileSync(file, 'utf8'));
}
const indexHtml = read('index.html');
const packageJson = read('package.json');
const config = read('src/config.ts');

// ---------------------------------------------------------------------------
// 1. Cero activos externos
// ---------------------------------------------------------------------------
const FORBIDDEN_EXTENSION =
  /\.(png|jpe?g|gif|webp|bmp|tga|dds|hdr|glb|gltf|obj|fbx|mp3|wav|ogg|m4a|aac|flac|woff2?|ttf|otf)\b/i;

for (const [relative, source] of sources) {
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
    if (FORBIDDEN_EXTENSION.test(line) && !/data:|mimeType|MIME/i.test(line)) {
      fail(`${relative}:${index + 1}: referencia a un activo externo (${trimmed.slice(0, 120)})`);
    }
  });
  for (const loader of ['TextureLoader', 'GLTFLoader', 'FBXLoader', 'OBJLoader', 'AudioLoader']) {
    if (new RegExp(`\\b${loader}\\b`).test(source)) {
      fail(`${relative}: ${loader} no está permitido; todo debe generarse por código`);
    }
  }
  if (/\bnew Audio\s*\(/.test(source)) {
    fail(`${relative}: new Audio() no está permitido; usa WebAudio procedural`);
  }
  if (/\bnew Image\s*\(/.test(source)) {
    warn(`${relative}: new Image() sugiere una imagen externa; verifica que se genere en canvas`);
  }
}

for (const match of indexHtml.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)) {
  const reference = match[1];
  if (reference.startsWith('#') || reference.startsWith('data:')) continue;
  if (reference === './favicon.svg' || reference.startsWith('/src/')) continue;
  fail(`index.html: recurso externo «${reference}»; solo se permiten el favicon SVG y la entrada de Vite`);
}
if (!indexHtml.includes('href="./favicon.svg"')) {
  warn('index.html: no se encuentra el favicon SVG del proyecto');
}
if (!packageJson.includes('build/icon.svg')) {
  warn('package.json: el icono del ejecutable debería ser build/icon.svg');
}

// ---------------------------------------------------------------------------
// 2. Texturas canvas y filtros
// ---------------------------------------------------------------------------
let canvasTextures = 0;
let nearestTextures = 0;
for (const [relative, source] of sources) {
  const count = (source.match(/new\s+THREE\.CanvasTexture\s*\(/g) || []).length;
  if (count === 0) continue;
  canvasTextures += count;
  const hasNearest = /NearestFilter/.test(source);
  const isSoft = /createRadialGradient/.test(source) || relative.endsWith('/Avatars.ts');
  if (hasNearest) {
    nearestTextures += 1;
    if (!/generateMipmaps\s*=\s*false/.test(source)) {
      warn(`${relative}: CanvasTexture con NearestFilter sin generateMipmaps = false`);
    }
  } else if (!isSoft) {
    warn(
      `${relative}: CanvasTexture sin NearestFilter; si es pixel-art, la textura se verá borrosa`,
    );
  }
  if (!/\.dispose\(\)/.test(source)) {
    warn(`${relative}: crea CanvasTexture pero no se ve una liberación con dispose()`);
  }
}

// ---------------------------------------------------------------------------
// 3. Instancing y presupuesto de memoria
// ---------------------------------------------------------------------------
const loot = sources.get('src/world/Loot.ts') || '';
if (!config.includes('export const MAX_PELLETS = 6000;')) {
  fail('src/config.ts: MAX_PELLETS debe ser 6000');
}
if (!loot.includes('new THREE.InstancedMesh(this.geometry, this.material, MAX_PELLETS)')) {
  fail('src/world/Loot.ts: las pepitas deben usar un InstancedMesh de MAX_PELLETS');
}
const resources = sources.get('src/world/Resources.ts') || '';
if (!resources.includes('new THREE.InstancedMesh(geometry, material, nodes.length)')) {
  warn('src/world/Resources.ts: los nodos deberían dibujarse con InstancedMesh por tipo');
}
const hopper = sources.get('src/world/Hopper.ts') || '';
if (!hopper.includes('new THREE.InstancedMesh(chunkGeometry, this.chunkMaterial, 72)')) {
  warn('src/world/Hopper.ts: se esperaban 72 chunks instanciados');
}
const effects = sources.get('src/core/Effects.ts') || '';
if (!/new THREE\.InstancedMesh\(debrisGeometry, this\.debrisMaterial, MAX_DEBRIS\)/.test(effects)) {
  warn('src/core/Effects.ts: los escombros deberían usar InstancedMesh');
}

// ---------------------------------------------------------------------------
// 4. Ciclo de vida y dispose
// ---------------------------------------------------------------------------
const DYNAMIC_FILES = [
  'src/world/Terrain.ts',
  'src/world/Resources.ts',
  'src/world/Loot.ts',
  'src/world/Hopper.ts',
  'src/world/Ladders.ts',
  'src/world/Environment.ts',
  'src/core/Effects.ts',
  'src/core/Audio.ts',
  'src/core/Input.ts',
  'src/ui/UI.ts',
];
for (const relative of DYNAMIC_FILES) {
  const source = sources.get(relative);
  if (!source) {
    fail(`Falta ${relative}`);
    continue;
  }
  if (!/\bdispose\(\)\s*:\s*void/.test(source) && !/\bdispose\(\)\s*\{/.test(source)) {
    fail(`${relative}: falta un método dispose()`);
  }
}
const avatars = sources.get('src/entities/Avatars.ts') || '';
if (!/function disposeRig\(|disposeRig\s*:\s*\(/.test(avatars) && !/\.dispose\(\)/.test(avatars)) {
  warn('src/entities/Avatars.ts: revisa la liberación de rigs, etiquetas y materiales');
}

const game = sources.get('src/core/Game.ts') || '';
for (const call of [
  'this.terrain.dispose()',
  'this.resources.dispose()',
  'this.loot.dispose()',
  'this.hopper.dispose()',
  'this.ladders.dispose()',
  'this.environment.dispose()',
  'this.effects.dispose()',
  'this.audio.dispose()',
  'this.input.dispose()',
  'this.ui.dispose()',
  'this.renderer.dispose()',
  'this.grenadeGeometry.dispose()',
  'this.grenadeMaterial.dispose()',
]) {
  if (!game.includes(call)) {
    fail(`Game.dispose(): falta ${call}`);
  }
}
if (!/group\.removeFromParent\(\)/.test(sources.get('src/world/Terrain.ts') || '')) {
  warn('Terrain.dispose(): la escena debería desacoplar el grupo');
}

// ---------------------------------------------------------------------------
// 5. Marching Cubes: orientación y presentación
// ---------------------------------------------------------------------------
const marching = sources.get('src/world/MarchingCubes.ts') || '';
if (!marching.includes('const ISO_LEVEL = 0.5;')) {
  fail('MarchingCubes: ISO_LEVEL debe ser 0.5');
}
if (!marching.includes('outwardX = -gradientX')) {
  fail('MarchingCubes: la normal debe orientarse contra el gradiente de densidad');
}
if (!marching.includes('nx * outwardX + ny * outwardY + nz * outwardZ < 0')) {
  fail('MarchingCubes: falta el intercambio de vértices para corregir el winding');
}
if (!marching.includes('vertexColors: true') || !marching.includes('flatShading: true')) {
  fail('MarchingCubes: el material debe usar vertexColors y flatShading');
}
if (!marching.includes('customProgramCacheKey')) {
  warn('MarchingCubes: el shader de ruido pixelado debería fijar customProgramCacheKey');
}
if (!marching.includes('vPixelRockWorld')) {
  warn('MarchingCubes: no se encuentra el shader de ruido pixelado del terreno');
}

// ---------------------------------------------------------------------------
// 6. Materiales sin iluminación del viewmodel
// ---------------------------------------------------------------------------
const tools = sources.get('src/player/ToolView.ts') || '';
const pickaxeModel = sources.get('src/player/PickaxeModel.ts') || '';
if (!/MeshBasicMaterial/.test(tools)) {
  fail('ToolView.ts: las armas no pico deben conservar MeshBasicMaterial para no sobreexponerse con la linterna');
}
if (!pickaxeModel.includes('MeshStandardMaterial')) {
  fail('PickaxeModel.ts: el pico iluminado debe usar MeshStandardMaterial');
}
if (!tools.includes('viewScene') || !tools.includes('clearDepth(')) {
  fail('ToolView.ts: el pico iluminado debe renderizarse en una escena/pass propios (viewScene + clearDepth)');
}
if (!tools.includes('buildPickaxeModel') || !tools.includes('createPickaxeMaterials')) {
  fail('ToolView.ts: debe consumir el modelo y los materiales de PickaxeModel.ts');
}

// ---------------------------------------------------------------------------
// Reporte
// ---------------------------------------------------------------------------
const report = {
  ok: errors.length === 0,
  tsFiles: tsFiles.length,
  canvasTextures,
  nearestTextures,
  errors,
  warnings,
};

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('Auditoría de contenido procedural — Carbon Magnate');
  console.log(
    `Archivos TS: ${tsFiles.length} · CanvasTextures: ${canvasTextures} · Con NearestFilter: ${nearestTextures}`,
  );
  for (const warning of warnings) console.log(`  WARN  ${warning}`);
  for (const error of errors) console.log(`  ERROR ${error}`);
  console.log(`\n${errors.length} error(es), ${warnings.length} warning(s).`);
}

process.exit(errors.length === 0 ? 0 : 1);
