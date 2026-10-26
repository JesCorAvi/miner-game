import * as THREE from 'three';
import { WEAPONS, layerAtDepth, maxCarryWeight } from '../config';
import type { AimViewData, HudViewData } from '../ui/UI';
import { formatMoney, formatNumber } from '../ui/format';
import type { Game } from './Game';
import { SIGN_READ_DISTANCE } from './GameConstants';

export function updateHud(game: Game): void {
  if (game.phase !== 'playing') {
    return;
  }
  game.updateInteractionState();
  const layer = layerAtDepth(game.player.getDepth());
  const employees = game.run.loadout.employees.roster.length;
  const inventoryTotals = game.inventory.totals();
  const data: HudViewData = {
    day: game.run.day,
    timeLeft: game.run.timeLeft,
    quota: game.run.quota,
    carbon: game.run.carbon,
    money: game.run.money,
    depth: game.player.getDepth(),
    layerName: layer.name,
    fuel: game.player.getJetpackFuel(),
    maxFuel: game.player.getMaxFuel(),
    onlineActive: game.online,
    onlinePlayers: Math.max(1, game.roster.length),
    onlineIsHost: game.role === 'host',
    muted: game.audio.isMuted(),
    employees,
    cargoCoal: game.cargoCoal,
    cargoMoney: game.cargoMoney,
    cargoWeight: game.cargoWeight,
    maxCargoWeight: maxCarryWeight(game.run.loadout),
    inventorySlots: game.inventory.snapshot(),
    inventoryCount: inventoryTotals.count,
    inventoryOpen: game.inventoryOpen,
    activeHotbarSlot: game.activeHotbarSlot,
    ladders: game.run.loadout.ladders,
    ladderPlacementEnabled: game.ladderPlacementEnabled,
    jetpackUnlocked: game.run.loadout.upgrades.jetpack > 0,
    prompt: game.interactionPrompt,
  };
  const signature = [
    data.day,
    Math.ceil(data.timeLeft),
    Math.ceil(data.carbon),
    Math.ceil(data.quota),
    Math.ceil(data.money),
    Math.ceil(data.depth),
    Math.ceil(data.fuel),
    data.onlineActive,
    data.onlinePlayers,
    data.muted,
    data.employees,
    data.cargoCoal,
    data.cargoMoney,
    data.cargoWeight.toFixed(1),
    data.maxCargoWeight,
    data.inventorySlots
      .map((item) => {
        if (!item) {
          return '-';
        }
        if (item.kind === 'mineral') {
          return `m${item.mineral}:${item.count}`;
        }
        if (item.kind === 'tool') {
          return `t${item.weapon}`;
        }
        if (item.kind === 'grenade') {
          return `g${item.tier}:${item.count}`;
        }
        return `l${item.count}`;
      })
      .join(','),
    data.inventoryCount,
    data.inventoryOpen ? '1' : '0',
    data.activeHotbarSlot,
    data.ladders,
    data.ladderPlacementEnabled,
    data.jetpackUnlocked,
    data.prompt?.key ?? '',
    data.prompt?.text ?? '',
  ].join('|');
  if (signature === game.lastHudSignature) {
    return;
  }
  game.lastHudSignature = signature;
  game.ui.updateHud(data);
}

export function updateAim(game: Game, forceUi: boolean): void {
  if (game.phase !== 'playing' || !game.input.isLocked()) {
    game.aim = null;
    if (forceUi) {
      game.ui.updateAim(null);
    }
    return;
  }
  const weapon = WEAPONS[game.activeWeapon];
  const origin = game.player.getEyePosition();
  const direction = game.player.getAimDirection();
  const signHit = game.environment.raycastSign(origin, direction, SIGN_READ_DISTANCE);
  if (signHit && !game.terrain.raycast(origin, direction, signHit.distance)) {
    game.aim = null;
    if (forceUi) {
      game.ui.updateAim({
        kind: 'sign',
        title: signHit.title,
        status: `CARTEL · ${Math.round(signHit.distance)} M`,
        detail: signHit.subtitle,
        ratio: 1,
      });
    }
    return;
  }
  const terrainHit = game.terrain.raycast(origin, direction, weapon.range + 1);
  const terrainDistance = terrainHit?.distance ?? Number.POSITIVE_INFINITY;
  const nodeHit = game.resources.raycast(
    origin,
    direction,
    weapon.range,
    terrainDistance,
  );
  const assistHit = nodeHit
    ? null
    : game.resources.raycastAssist(origin, direction, weapon.range, game.terrain);
  const resolvedHit = nodeHit ?? assistHit;
  if (resolvedHit) {
    game.aim = {
      node: resolvedHit.node,
      point: resolvedHit.point,
      distance: resolvedHit.distance,
      terrainDistance,
      depth: Math.max(0, -resolvedHit.node.y),
    };
  } else if (terrainHit) {
    game.aim = {
      node: null,
      point: new THREE.Vector3(terrainHit.x, terrainHit.y, terrainHit.z),
      distance: terrainHit.distance,
      terrainDistance,
      depth: terrainHit.depth,
    };
  } else {
    game.aim = null;
  }
  if (forceUi) {
    game.ui.updateAim(buildAimView(game));
  }
}

export function buildAimView(game: Game): AimViewData | null {
  if (!game.aim) {
    return null;
  }
  if (game.aim.node) {
    const node = game.aim.node;
    if (node.type === 'chest') {
      return {
        kind: 'chest',
        title: 'COFRE CORPORATIVO',
        status: 'ESTRUCTURA FRÁGIL',
        detail: `${Math.ceil(node.hp)} / ${node.maxHp} · recompensa pasiva`,
        ratio: node.maxHp > 0 ? node.hp / node.maxHp : 0,
      };
    }
    const mineral = node.mineral;
    if (!mineral) {
      return null;
    }
    const reward = [
      mineral.carbonYield > 0 ? `+${formatNumber(mineral.carbonYield)} CARBÓN` : null,
      mineral.moneyYield > 0 ? `+${formatMoney(mineral.moneyYield)}` : null,
    ]
      .filter((part): part is string => part !== null)
      .join(' · ');
    return {
      kind: 'node',
      title: mineral.name.toUpperCase(),
      status: `VETA · ${Math.ceil(node.hp)} / ${node.maxHp}`,
      detail: `${reward} · CAPA ${mineral.layer}`,
      ratio: node.maxHp > 0 ? node.hp / node.maxHp : 0,
    };
  }
  const layer = layerAtDepth(game.aim.depth);
  return {
    kind: 'terrain',
    title: layer.name,
    status: `ROCA · DUREZA ×${layer.hardness.toFixed(1)}`,
    detail: `PROFUNDIDAD ${Math.round(game.aim.depth)} M`,
    ratio: 1,
  };
}

export function computeObjective(game: Game): string {
  if (game.phase !== 'playing') {
    return '';
  }
  if (!game.input.isLocked()) {
    return 'Haz clic en la escena para capturar el ratón y controlar al operario.';
  }
  const remaining = game.run.quota - game.run.carbon;
  if (game.nearHopper) {
    return 'Pulsa E para depositar la carga en la tolva. Solo aquí cuenta para la cuota y el dinero.';
  }
  if (game.cargoCoal > 0 || game.cargoMoney > 0) {
    if (game.run.timeLeft <= 20) {
      return `CIERRE INMINENTE · vuelve a la tolva con tu carga (${formatNumber(game.cargoCoal)} t).`;
    }
    return 'Lleva la carga a la tolva de la superficie. Si termina el turno abajo, la pierdes.';
  }
  if (remaining <= 0) {
    return 'Cuota cubierta. Extrae mineral precioso y deposítalo para financiar la próxima mejora.';
  }
  if (game.run.timeLeft <= 20) {
    return `CIERRE INMINENTE · faltan ${formatNumber(remaining)} t de carbón depositado.`;
  }
  if (game.player.getDepth() < 2.5) {
    if (game.cargoCoal > 0 || game.cargoMoney > 0) {
      return 'La tolva está a tu derecha, en la zona segura. Pulsa E junto a ella para depositar.';
    }
    return 'Desciende por el pozo central. Compra el jetpack más adelante; por ahora vuelve con escaleras (CLIC IZQ).';
  }
  if (game.aim?.node) {
    return `Veta detectada: ${game.aim.node.mineral?.name ?? 'cofre'}. Fractúrala, recoge la carga y vuelve arriba.`;
  }
  const layer = layerAtDepth(game.player.getDepth());
  return `Capa ${layer.index} · ${layer.name}. Busca vetas incrustadas; el jetpack se desbloquea más adelante.`;
}
