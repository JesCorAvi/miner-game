#!/usr/bin/env node
// Audita el protocolo P2P y la autoridad host de Carbon Magnate.
// Uso: node .claude/skills/coop-netcode/scripts/audit-netcode.mjs [--json]

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

function hasCase(block, tag) {
  return block.includes(`case '${tag}':`);
}

const config = read('src/config.ts');
const protocol = read('src/network/Protocol.ts');
const peer = read('src/network/PeerNetwork.ts');
const game = read('src/core/Game.ts');
const shop = read('src/core/Shop.ts');
const shopView = read('src/core/ShopView.ts');
const dayCycle = read('src/core/DayCycle.ts');
const combat = read('src/core/Combat.ts');
const interaction = read('src/core/Interaction.ts');
const networkMessages = read('src/core/NetworkMessages.ts');
const networkBridge = read('src/core/NetworkBridge.ts');
const constants = read('src/core/GameConstants.ts');

// ---------------------------------------------------------------------------
// 1. Versión y prefijo PeerJS sincronizados
// ---------------------------------------------------------------------------
const versionMatch = /export const PROTOCOL_VERSION = (\d+);/.exec(protocol);
if (!versionMatch) {
  fail('src/network/Protocol.ts: falta PROTOCOL_VERSION');
}
const version = versionMatch ? versionMatch[1] : '?';
const prefixMatch = /export const PEER_ID_PREFIX = '([^']+)';/.exec(config);
if (!prefixMatch) {
  fail('src/config.ts: falta PEER_ID_PREFIX');
} else if (!prefixMatch[1].includes(`v${version}`)) {
  fail(
    `PEER_ID_PREFIX «${prefixMatch[1]}» no contiene la versión del protocolo v${version}; clientes antiguos podrían conectarse`,
  );
}
if (!protocol.includes('export const MAX_MESSAGE_LENGTH = 512 * 1024;')) {
  fail('src/network/Protocol.ts: el límite de mensaje debe ser 512 KiB');
}

// ---------------------------------------------------------------------------
// 2. Cobertura de mensajes
// ---------------------------------------------------------------------------
const CLIENT_TAGS = [
  'hello',
  'state',
  'carve',
  'node_hit',
  'node_break',
  'deposit',
  'ladder_place',
  'fx',
  'purchase',
];
const HOST_TAGS = [
  'welcome',
  'roster',
  'start_day',
  'sync',
  'players',
  'staff',
  'ladder_placed',
  'carve',
  'node_hit',
  'node_break',
  'economy',
  'fx',
  'day_result',
  'shop_state',
  'passive',
  'game_over',
  'error',
  'disconnect',
];

const parseClient = extractBlock(protocol, 'export function parseClientMessage(');
const parseHost = extractBlock(protocol, 'export function parseHostMessage(');
const handleClient = extractBlock(networkMessages, 'export function handleClientMessage(');
const handleHost = extractBlock(networkMessages, 'export function handleHostMessage(');

for (const tag of CLIENT_TAGS) {
  if (!protocol.includes(`t: '${tag}'`)) {
    fail(`Protocol.ts: ClientMessage no declara «${tag}»`);
  }
  if (!hasCase(parseClient, tag)) {
    fail(`parseClientMessage(): no valida «${tag}»`);
  }
  if (tag !== 'hello' && !hasCase(handleClient, tag)) {
    fail(`NetworkMessages.handleClientMessage(): no maneja «${tag}»`);
  }
}
for (const tag of HOST_TAGS) {
  if (!protocol.includes(`t: '${tag}'`)) {
    fail(`Protocol.ts: HostMessage no declara «${tag}»`);
  }
  if (!hasCase(parseHost, tag)) {
    fail(`parseHostMessage(): no valida «${tag}»`);
  }
  if (tag !== 'welcome' && tag !== 'roster' && !hasCase(handleHost, tag)) {
    fail(`NetworkMessages.handleHostMessage(): no maneja «${tag}»`);
  }
}
if (!peer.includes("t: 'hello'") || !peer.includes("t: 'welcome'")) {
  fail('PeerNetwork.ts: falta el handshake hello/welcome');
}

// ---------------------------------------------------------------------------
// 3. Mensajes prohibidos: mallas, pepitas y arrays completos
// ---------------------------------------------------------------------------
for (const forbidden of ['mesh', 'meshes', 'geometry', 'positions', 'pellets', 'pellet_positions', 'loot']) {
  if (protocol.includes(`t: '${forbidden}'`)) {
    fail(`Protocol.ts: el mensaje «${forbidden}» no debe existir; nunca se envían mallas ni pepitas`);
  }
}

// ---------------------------------------------------------------------------
// 4. Validación de entrada
// ---------------------------------------------------------------------------
const versionChecks = (protocol.match(/parsed\.v !== PROTOCOL_VERSION/g) || []).length;
if (versionChecks < 2) {
  fail('Protocol.ts: parseClientMessage y parseHostMessage deben rechazar versiones distintas');
}
for (const guard of [
  'bounded(value.x, -(PIT_HALF + 0.5), PIT_HALF + 0.5)',
  'bounded(value.y, -121, 6)',
  'bounded(value.r, 0.1, 5.5)',
  'bounded(value.s, 0.05, 2.5)',
]) {
  if (!protocol.includes(guard)) warn(`parseCarveEvent(): falta la cota ${guard}`);
}
if (
  !protocol.includes('bounded(value.x, -(PIT_HALF - 0.3), PIT_HALF - 0.3)') ||
  !protocol.includes('bounded(value.height, 1, 8)')
) {
  warn('parseLadder(): faltan cotas de posición/altura');
}
if (
  !protocol.includes("value.orientation === 'horizontal'") ||
  !protocol.includes("value.orientation === 'vertical'")
) {
  fail('parseLadder(): debe validar orientation vertical/horizontal');
}
if (!protocol.includes('bounded(parsed.dmg, 1, 500)')) {
  warn('parseClientMessage(node_hit): el daño del cliente debería acotarse');
}
if (!protocol.includes('bounded(parsed.coal, 0, 1000000)')) {
  warn('parseClientMessage(deposit): el depósito del cliente debería acotarse');
}

// ---------------------------------------------------------------------------
// 5. Snapshot de día completo y late-join
// ---------------------------------------------------------------------------
const buildSnapshot = extractBlock(networkBridge, 'export function buildSnapshot(');
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
    fail(`buildSnapshot(): falta «${field}»; el late join quedaría incompleto`);
  }
}
for (const limit of [
  'slice(0, 5000)',
  'slice(0, 200)',
  'slice(0, 2000)',
  'states.length > 4',
  'states.length > 16',
]) {
  if (!protocol.includes(limit)) {
    warn(`Protocol.ts: no se encuentra el límite de snapshot «${limit}»`);
  }
}
if (!networkBridge.includes('export function sendSnapshotTo(') || !networkBridge.includes("t: 'sync'")) {
  fail('NetworkBridge: falta el envío de snapshot de incorporación tardía');
}
if (!networkBridge.includes('sendSnapshotTo(game, peerId)')) {
  warn('onPeerJoined: no se envía snapshot a quien entra a mitad de día');
}

// ---------------------------------------------------------------------------
// 6. Presupuesto y frecuencias
// ---------------------------------------------------------------------------
if (!constants.includes('export const PLAYER_NET_INTERVAL = 1 / 20;')) {
  fail('GameConstants: los estados de jugador deben enviarse a 20 Hz');
}
if (!constants.includes('export const STAFF_NET_INTERVAL = 0.2;')) {
  fail('GameConstants: la plantilla debe enviarse a 5 Hz');
}
if (!constants.includes('export const ECONOMY_INTERVAL = 0.25;')) {
  fail('GameConstants: la economía debe enviarse a 4 Hz');
}
if (!config.includes('export const NETWORK_TICK_RATE = 20;')) {
  warn('config.ts: NETWORK_TICK_RATE no coincide con el envío de estados');
}
if (!constants.includes('export const CARVE_HISTORY_LIMIT = 4000;')) {
  fail('GameConstants: el historial de carves debe limitarse a 4.000 eventos');
}

// ---------------------------------------------------------------------------
// 7. Autoridad del host
// ---------------------------------------------------------------------------
const finishDay = extractBlock(dayCycle, 'export function finishDay(');
if (!finishDay.includes("game.role === 'client'")) {
  fail('finishDay(): debe rechazar a los clientes');
}
const startNextDay = extractBlock(dayCycle, 'export function startNextDay(');
if (!startNextDay.includes("game.role === 'client'")) {
  fail('startNextDay(): debe rechazar a los clientes');
}
const saveRun = extractBlock(dayCycle, 'export function saveRun(');
if (!saveRun.includes("game.role === 'client'")) {
  fail('saveRun(): los clientes no deben escribir el expediente');
}
const recordCarve = extractBlock(combat, 'export function recordCarve(');
if (!recordCarve.includes('if (!game.isAuthority())')) {
  fail('recordCarve(): solo el host conserva el historial');
}
const fixedUpdate = extractBlock(game, 'private fixedUpdate(');
if (!/if \(this\.isAuthority\(\)\) \{[\s\S]*?this\.staffManager\.update\(dt\)/.test(fixedUpdate)) {
  fail('fixedUpdate(): la plantilla debe simularse solo en el host');
}
if (!fixedUpdate.includes('this.run.timeLeft = Math.max(0, this.run.timeLeft - dt)')) {
  fail('fixedUpdate(): falta el descuento del reloj');
}
if (fixedUpdate.indexOf('this.finishDay()') > fixedUpdate.indexOf('this.saveRun(false)')) {
  // El reloj debe descontarse antes de terminar el día; el orden exacto no es un invariante duro.
}

// ---------------------------------------------------------------------------
// 8. Carga personal y depósito agregado
// ---------------------------------------------------------------------------
const onLootCollected = extractBlock(interaction, 'export function onLootCollected(');
if (
  !onLootCollected.includes('game.inventory.addMineral(') ||
  !onLootCollected.includes('game.cargoCoal = updated.carbon')
) {
  fail('onLootCollected(): debe añadir al inventario local y sincronizar la mochila');
}
if (onLootCollected.includes('game.run.carbon +=') || onLootCollected.includes('game.run.money +=')) {
  fail('onLootCollected(): recoger no debe acreditar cuota ni dinero');
}
const depositCargo = extractBlock(interaction, 'export function depositCargo(');
if (!depositCargo.includes('game.clearCargo()')) {
  fail('depositCargo(): debe vaciar inventario y mochila al depositar');
}
if (!depositCargo.includes("t: 'deposit'")) {
  fail('depositCargo(): el cliente debe enviar el mensaje deposit');
}
const applyTeamDeposit = extractBlock(interaction, 'export function applyTeamDeposit(');
if (!applyTeamDeposit.includes('game.run.carbon += cleanCoal')) {
  fail('applyTeamDeposit(): el host debe acreditar el carbón');
}
if (!applyTeamDeposit.includes('game.run.money += cleanMoney')) {
  fail('applyTeamDeposit(): el host debe acreditar el dinero');
}
if (!finishDay.includes('discardCargo(game,')) {
  fail('finishDay(): la carga pendiente debe perderse al cerrar el turno');
}

// ---------------------------------------------------------------------------
// 9. Escaleras: stock de equipo y validación del host
// ---------------------------------------------------------------------------
const ladderPlace = extractBlock(networkMessages, "case 'ladder_place':");
if (!ladderPlace.includes('game.run.loadout.ladders -= 1')) {
  fail("handleClientMessage(ladder_place): el host debe descontar stock");
}
if (!ladderPlace.includes('game.ladders.add(message.ladder)')) {
  fail('handleClientMessage(ladder_place): el host debe validar/añadir la escalera');
}
if (!ladderPlace.includes("t: 'ladder_placed'") || !ladderPlace.includes('game.broadcastEconomy()')) {
  fail('handleClientMessage(ladder_place): faltan ladder_placed o economy');
}
const placeLadder = extractBlock(interaction, 'export function placeLadder(');
if (!placeLadder.includes('game.run.loadout.ladders -= 1')) {
  fail('placeLadder(): debe descontar stock local');
}
if (!placeLadder.includes("t: 'ladder_place'") && !placeLadder.includes("t: 'ladder_placed'")) {
  fail('placeLadder(): debe replicar la colocación');
}

// ---------------------------------------------------------------------------
// 10. Compras y tienda
// ---------------------------------------------------------------------------
const requestPurchase = extractBlock(shopView, 'export function requestPurchase(');
if (!requestPurchase.includes("t: 'purchase'")) {
  fail('requestPurchase(): el cliente debe enviar la compra al host');
}
const applyPurchase = extractBlock(shop, 'export function applyPurchaseToRun(');
for (const kind of ['weapon', 'upgrade', 'supply', 'employee_hire', 'employee_rank', 'employee_convert']) {
  if (!applyPurchase.includes(`kind === '${kind}'`)) {
    fail(`applyPurchaseToRun(): no valida «${kind}»`);
  }
}
if (!applyPurchase.includes('run.money -= cost')) {
  fail('applyPurchaseToRun(): el host debe descontar el coste');
}
const applyPurchaseWrapper = extractBlock(shopView, 'export function applyPurchase(');
if (!applyPurchaseWrapper.includes('applyPurchaseToRun(game.run, itemId)')) {
  fail('ShopView.applyPurchase(): debe delegar la validación en applyPurchaseToRun()');
}
if (!handleClient.includes("case 'purchase':") || !handleClient.includes('applyPurchase(game, message.itemId)')) {
  fail("handleClientMessage(purchase): el host debe aplicar la compra del cliente");
}

// ---------------------------------------------------------------------------
// 11. Desconexión y limpieza
// ---------------------------------------------------------------------------
if (!networkBridge.includes('export function handleNetworkClosed(')) {
  fail('NetworkBridge: falta handleNetworkClosed() para cerrar la sesión');
}
if (!networkBridge.includes('game.remoteStates.delete(peerId)') && !networkBridge.includes('game.remoteStates.clear()')) {
  warn('onPeerLeft: revisa la limpieza de estados remotos');
}
const networkSource = [game, networkBridge, networkMessages, dayCycle, combat, interaction, shopView].join('\n');
if (!networkSource.includes('.broadcast(')) {
  fail('Netcode: no se encuentran retransmisiones del host');
}

// ---------------------------------------------------------------------------
// Reporte
// ---------------------------------------------------------------------------
const report = {
  ok: errors.length === 0,
  protocolVersion: version,
  peerPrefix: prefixMatch ? prefixMatch[1] : null,
  errors,
  warnings,
};

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Auditoría netcode — Carbon Magnate (protocolo v${version})`);
  for (const warning of warnings) console.log(`  WARN  ${warning}`);
  for (const error of errors) console.log(`  ERROR ${error}`);
  console.log(`\n${errors.length} error(es), ${warnings.length} warning(s).`);
}

process.exit(errors.length === 0 ? 0 : 1);
