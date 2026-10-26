#!/usr/bin/env node
// Audita el audio 100 % procedural de Carbon Magnate.
// Uso: node .claude/skills/procedural-audio/scripts/audit-audio.mjs [--json]

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

const audio = sources.get('src/core/Audio.ts') || '';
const game = sources.get('src/core/Game.ts') || '';
const session = sources.get('src/core/Session.ts') || '';
const input = sources.get('src/core/Input.ts') || '';
const indexHtml = read('index.html');
const css = read('src/style.css');

// ---------------------------------------------------------------------------
// 1. Cero archivos de audio externos
// ---------------------------------------------------------------------------
const AUDIO_EXTENSION = /\.(mp3|wav|ogg|m4a|aac|flac)(?:[?#"')\s]|$)/i;
for (const [relative, source] of sources) {
  if (AUDIO_EXTENSION.test(source)) {
    fail(`${relative}: referencia a un archivo de audio externo; usa WebAudio`);
  }
  if (/\bnew Audio\s*\(/.test(source)) {
    fail(`${relative}: new Audio() no está permitido; usa AudioEngine`);
  }
}
if (AUDIO_EXTENSION.test(indexHtml) || AUDIO_EXTENSION.test(css)) {
  fail('index.html/style.css: referencia a un archivo de audio externo');
}

// ---------------------------------------------------------------------------
// 2. Un único AudioContext y un único AudioEngine
// ---------------------------------------------------------------------------
for (const [relative, source] of sources) {
  if (relative === 'src/core/Audio.ts') continue;
  if (/new\s+(window\.)?(AudioContext|webkitAudioContext)\s*\(/.test(source)) {
    fail(`${relative}: crea su propio AudioContext; usa AudioEngine.init()`);
  }
  if (/new\s+AudioEngine\s*\(/.test(source) && relative !== 'src/core/Game.ts') {
    warn(`${relative}: instancia AudioEngine fuera de Game`);
  }
}
if (!audio.includes('const MIN_GAIN = 0.0001;')) {
  fail('Audio.ts: MIN_GAIN debe ser 0.0001 para rampas exponenciales seguras');
}
if (!audio.includes('new AudioContext()')) {
  fail('Audio.ts: no se encuentra la creación del AudioContext');
}
if (!audio.includes('compressor.connect(context.destination)')) {
  fail('Audio.ts: la mezcla debe pasar por master → compresor → destination');
}
if (audio.includes('connect(this.context.destination)') || audio.includes('connect(context.destination)') && !audio.includes('compressor.connect(context.destination)')) {
  fail('Audio.ts: no conectes fuentes directamente al destination');
}

// ---------------------------------------------------------------------------
// 3. Inicialización tras gesto de usuario
// ---------------------------------------------------------------------------
if (!game.includes("document.addEventListener('pointerdown', this.audioUnlockHandler, { once: true })")) {
  fail('Game: el audio debe desbloquearse con el primer pointerdown');
}
if (!game.includes('void this.audio.init()')) {
  fail('Game: el gesto de usuario debe llamar a audio.init()');
}
if (!audio.includes('async init(): Promise<void>')) {
  fail('Audio.ts: falta el método init()');
}
if (!/if \(this\.context\.state === 'suspended'\)[\s\S]*?await this\.context\.resume\(\)/.test(audio)) {
  fail('Audio.ts: init() debe reanudar un contexto suspendido');
}

// ---------------------------------------------------------------------------
// 4. Mezcla, muteo y volumen
// ---------------------------------------------------------------------------
if (!audio.includes('setMuted(muted: boolean): void')) {
  fail('Audio.ts: falta setMuted()');
}
if (!audio.includes('this.master.gain.setTargetAtTime(muted ? 0 : 0.64')) {
  warn('Audio.ts: revisa la ganancia maestra y el muteo');
}
if (!input.includes("event.code === 'KeyM'")) {
  fail('Input.ts: la tecla M debe silenciar');
}
if (!session.includes('game.audio.toggleMuted()')) {
  fail('Session.toggleMute(): debe delegar en AudioEngine.toggleMuted()');
}
if (!audio.includes('private muted = false;') || !audio.includes('isMuted(): boolean')) {
  fail('Audio.ts: falta el estado de muteo');
}

// ---------------------------------------------------------------------------
// 5. Paneo posicional
// ---------------------------------------------------------------------------
if (!audio.includes('private panner(position: THREE.Vector3): PannerNode | null')) {
  fail('Audio.ts: falta el helper de paneo posicional');
}
for (const method of [
  'playPickaxe(position: THREE.Vector3',
  'playNodeBreak(position: THREE.Vector3',
  'playShot(position: THREE.Vector3',
  'playExplosion(position: THREE.Vector3',
  'playDeposit(position: THREE.Vector3',
  'playLadder(position: THREE.Vector3',
  'playPickup(position: THREE.Vector3',
  'playChest(position: THREE.Vector3',
  'playFootstep(position: THREE.Vector3',
]) {
  if (!audio.includes(method)) {
    fail(`Audio.ts: falta el método posicional ${method.split('(')[0]}`);
  }
}
if (!audio.includes('panner.connect(this.master as AudioNode)')) {
  fail('Audio.ts: el panner debe conectarse a master, no al destination');
}
if (!game.includes('this.audio.updateListener(this.camera)')) {
  fail('Game.update(): debe actualizar el listener de audio por frame');
}

// ---------------------------------------------------------------------------
// 6. Bucles largos con referencia y parada
// ---------------------------------------------------------------------------
for (const token of [
  'private jetpackGain: GainNode | null = null;',
  'private drillGain: GainNode | null = null;',
  'setJetpackActive(active: boolean): void',
  'setDrillActive(active: boolean): void',
]) {
  if (!audio.includes(token)) fail(`Audio.ts: falta «${token}»`);
}
if (!game.includes('this.audio.setJetpackActive(') || !game.includes('this.audio.setDrillActive(')) {
  fail('Game.update(): debe activar/desactivar los bucles de jetpack y taladro');
}
if (!audio.includes('this.jetpackGain.gain.setTargetAtTime(active ? 0.18 : 0') ||
    !audio.includes('this.drillGain.gain.setTargetAtTime(active ? 0.11 : 0')) {
  warn('Audio.ts: revisa las ganancias de los bucles de jetpack/taladro');
}
if (!audio.includes('source.stop(') || !audio.includes('oscillator.stop(')) {
  fail('Audio.ts: los one-shots deben detener sus nodos');
}
if (!audio.includes('oscillator.onended') || !audio.includes('source.onended')) {
  warn('Audio.ts: los panners de one-shots deberían desconectarse al terminar');
}
const rampToZero = audio.match(/exponentialRampToValueAtTime\(\s*0(?:[.,)\s]|$)/g) || [];
if (rampToZero.length > 0) {
  fail('Audio.ts: exponentialRampToValueAtTime no puede terminar en 0; usa MIN_GAIN');
}
if (!audio.includes('gain.gain.setValueAtTime(MIN_GAIN') && !audio.includes('gain.gain.setValueAtTime(MIN_GAIN, start)')) {
  warn('Audio.ts: revisa el arranque de las rampas de ganancia');
}

// ---------------------------------------------------------------------------
// 7. Throttle de sonidos repetidos
// ---------------------------------------------------------------------------
if (!audio.includes('this.pickupWindowStart') || !audio.includes('now - this.pickupWindowStart > 220')) {
  warn('Audio.ts: playPickup() debería agrupar las recogidas en ráfagas');
}
if (!audio.includes('this.lastFootstepAt') || !audio.includes('now - this.lastFootstepAt < 100')) {
  warn('Audio.ts: playFootstep() debería limitar la frecuencia de pasos');
}

// ---------------------------------------------------------------------------
// 8. Ciclo de vida
// ---------------------------------------------------------------------------
if (!audio.includes('dispose(): void')) {
  fail('Audio.ts: falta dispose()');
}
if (!audio.includes('void this.context.close()')) {
  warn('Audio.ts: dispose() debería cerrar el AudioContext');
}
if (!audio.includes('this.jetpackGain = null') || !audio.includes('this.drillGain = null')) {
  fail('Audio.ts: dispose() debe soltar las referencias a los bucles');
}
if (!game.includes('this.audio.dispose()')) {
  fail('Game.dispose(): debe liberar AudioEngine');
}

// ---------------------------------------------------------------------------
// 9. Catálogo y uso
// ---------------------------------------------------------------------------
const METHODS = [
  'playPickaxe',
  'playNodeBreak',
  'playShot',
  'playExplosion',
  'playDeposit',
  'playLadder',
  'playPickup',
  'playChest',
  'playFootstep',
  'playError',
  'playUi',
  'playPurchase',
  'playQuotaWarning',
  'playDayComplete',
  'playVictory',
  'playDisconnect',
];
for (const method of METHODS) {
  if (!audio.includes(`${method}(`)) fail(`Audio.ts: falta el sonido ${method}()`);
  const usedOutside = [...sources.values()].some((source) => source.includes(`audio.${method}(`));
  if (!usedOutside) warn(`Audio.ts: ${method}() no se usa fuera de AudioEngine`);
}

// ---------------------------------------------------------------------------
// Reporte
// ---------------------------------------------------------------------------
const report = {
  ok: errors.length === 0,
  tsFiles: tsFiles.length,
  errors,
  warnings,
};

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('Auditoría de audio procedural — Carbon Magnate');
  console.log(`Archivos TS: ${tsFiles.length}`);
  for (const warning of warnings) console.log(`  WARN  ${warning}`);
  for (const error of errors) console.log(`  ERROR ${error}`);
  console.log(`\n${errors.length} error(es), ${warnings.length} warning(s).`);
}

process.exit(errors.length === 0 ? 0 : 1);
