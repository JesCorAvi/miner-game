import * as THREE from 'three';
import {
  GRENADE_COOLDOWN,
  HOTBAR_SLOTS,
  dayDuration,
  magnetRadius,
  WEAPON_ORDER,
} from '../config';
import { AudioEngine } from './Audio';
import { Effects } from './Effects';
import { InputController } from './Input';
import { Inventory, type InventoryItem } from './Inventory';
import { RemotePlayerAvatars, StaffAvatars } from '../entities/Avatars';
import { StaffManager } from '../entities/Staff';
import type { NetworkCallbacks, PeerNetwork } from '../network/PeerNetwork';
import { PROTOCOL_VERSION, type DaySnapshot } from '../network/Protocol';
import { Player } from '../player/Player';
import { ToolView } from '../player/ToolView';
import { SaveManager } from '../save/SaveManager';
import type {
  CarveEvent,
  DayReport,
  DaySaleLine,
  GamePhase,
  GrenadeTierId,
  LadderOrientation,
  NetworkPlayerState,
  RosterEntry,
  RunSnapshot,
  WeaponId,
} from '../types';
import { UI, type LobbyViewData } from '../ui/UI';
import { Environment } from '../world/Environment';
import { Hopper } from '../world/Hopper';
import { Ladders } from '../world/Ladders';
import { LootField, type CollectedLoot } from '../world/Loot';
import { Resources, type ResourceNode } from '../world/Resources';
import { Terrain } from '../world/Terrain';
import {
  AIM_INTERVAL,
  AUTOSAVE_INTERVAL,
  FIXED_STEP,
  HUD_INTERVAL,
  MAX_FIXED_STEPS,
} from './GameConstants';
import { emptyDayLedger, recordDeposit, type DayLedger } from './DaySettlement';
import type { ActiveRole, AimTarget, GrenadeProjectile } from './GameTypes';
import { defaultRun } from './RunState';
import * as Combat from './Combat';
import * as DayCycle from './DayCycle';
import * as Hud from './Hud';
import * as Interaction from './Interaction';
import * as NetworkBridge from './NetworkBridge';
import * as Session from './Session';
import * as ShopView from './ShopView';
import * as View from './View';

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`No se encontró el elemento #${id}`);
  }
  return element as T;
}

export class Game {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly environment: Environment;
  readonly hopper = new Hopper();
  readonly ladders = new Ladders();
  readonly terrain = new Terrain();
  readonly resources = new Resources();
  readonly loot = new LootField();
  readonly effects: Effects;
  readonly audio = new AudioEngine();
  readonly input: InputController;
  readonly inventory = new Inventory();
  readonly player: Player;
  readonly tools: ToolView;
  readonly remoteAvatars: RemotePlayerAvatars;
  readonly staffAvatars: StaffAvatars;
  readonly staffManager: StaffManager;
  readonly saves = new SaveManager();
  readonly ui: UI;
  readonly resizeHandler: () => void;
  readonly visibilityHandler: () => void;
  readonly pageHideHandler: () => void;
  readonly audioUnlockHandler: () => void;

  phase: GamePhase = 'menu';
  role: ActiveRole = 'solo';
  online = false;
  network: PeerNetwork | null = null;
  networkCloseIntentional = false;
  selfPeerId = '';
  roster: RosterEntry[] = [];
  readonly remoteStates = new Map<string, NetworkPlayerState>();
  run: RunSnapshot = defaultRun();
  seed = 0;
  carveHistory: CarveEvent[] = [];
  activeWeapon: WeaponId = 'pickaxe';
  activeHotbarSlot = 0;
  grenadeCooldown = 0;
  readonly cooldowns: Record<WeaponId, number> = {
    pickaxe: 0,
    tesla: 0,
    drill: 0,
    shotgun: 0,
  };
  aim: AimTarget | null = null;
  aimAccumulator = 0;
  hudAccumulator = 0;
  objectiveAccumulator = 0;
  playerSendAccumulator = 0;
  staffSendAccumulator = 0;
  economySendAccumulator = 0;
  drillFxAccumulator = 0;
  saveAccumulator = 0;
  pendingPickaxeStrike = 0;
  cargoCoal = 0;
  cargoMoney = 0;
  cargoWeight = 0;
  lastCargoFullToast = 0;
  lastCollectFloat = 0;
  inventoryOpen = false;
  ladderCounter = 0;
  ladderOrientation: LadderOrientation = 'vertical';
  ladderPlacementEnabled = false;
  dayMoneyBase = 0;
  dayLedger: DayLedger = emptyDayLedger();
  dayReport: DayReport | null = null;
  nearHopper = false;
  interactionPrompt: { key: string; text: string } | null = null;
  staffVisualAccumulator = 0;
  readonly rewardedChests = new Set<string>();
  paused = false;
  hasLockedOnce = false;
  finishing = false;
  shopSuccess = false;
  shopVictory = false;
  readonly projectiles: GrenadeProjectile[] = [];
  readonly grenadeGeometry = new THREE.SphereGeometry(0.17, 8, 6);
  readonly grenadeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffa652,
    toneMapped: false,
  });
  visualTime = 0;
  lastTimestamp = performance.now();
  accumulator = 0;
  frameHandle = 0;
  pixelMode = false;
  lastHudSignature = '';

  constructor() {
    this.canvas = requiredElement<HTMLCanvasElement>('game-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.94;
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.camera = new THREE.PerspectiveCamera(
      73,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.05,
      220,
    );
    this.camera.rotation.order = 'YXZ';

    this.environment = new Environment(this.scene, this.camera);
    this.scene.add(
      this.terrain.group,
      this.resources.group,
      this.loot.group,
      this.hopper.group,
      this.ladders.group,
    );
    this.effects = new Effects(this.scene);

    this.input = new InputController(this.canvas, {
      onLockChange: (locked) => this.handleLockChange(locked),
      onWeaponSelect: (slot) => this.selectWeaponSlot(slot),
      onCycleWeapon: (direction) => this.cycleWeapon(direction),
      onMute: () => this.toggleMute(),
      onPauseRequest: () => this.pauseGame(),
      onInteract: () => this.handleInteract(),
      onToggleLadder: () => this.toggleLadderOrientation(),
      onToggleLadderPlacement: () => this.toggleLadderPlacement(),
      onToggleInventory: () => this.toggleInventory(),
    });

    this.player = new Player(
      this.scene,
      this.camera,
      this.input,
      this.terrain,
      this.ladders,
      {
        onFootstep: (running, layer) => {
          this.audio.playFootstep(this.player.getPosition(), running, layer);
        },
      },
    );
    this.player.setLoadout(this.run.loadout);
    this.tools = new ToolView(this.camera);
    this.remoteAvatars = new RemotePlayerAvatars(this.scene);
    this.staffAvatars = new StaffAvatars(this.scene);
    this.staffManager = new StaffManager({
      onCarve: (event) => this.carveFromStaff(event),
      onAttackNode: (node, damage) => this.staffAttackNode(node, damage),
      onCollect: (collected, count) => this.staffCollect(collected, count),
    });

    this.ui = new UI(this.camera, {
      startSolo: () => this.startSolo(),
      continueRun: () => this.continueRun(),
      createRoom: (name) => void this.createRoom(name),
      joinRoom: (name, code) => void this.joinRoom(name, code),
      startOnline: () => this.startOnlineMatch(),
      leaveLobby: () => this.leaveLobby(),
      resumeGame: () => this.resumeGame(),
      leaveGame: () => this.leaveGame(),
      toggleMute: () => this.toggleMute(),
      purchase: (itemId) => this.requestPurchase(itemId),
      nextDay: () => this.startNextDay(),
      continueFromSummary: () => this.openShopAfterSummary(),
      returnToMenu: () => this.returnToMenu(),
      moveInventoryItem: (from, to) => this.moveInventoryItem(from, to),
      selectHotbarSlot: (index) => this.selectHotbarSlot(index),
    });

    this.resizeHandler = () => this.handleResize();
    this.visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        this.saveRun(false);
      }
    };
    this.pageHideHandler = () => this.saveRun(false);
    this.audioUnlockHandler = () => {
      void this.audio.init();
    };
    window.addEventListener('resize', this.resizeHandler);
    document.addEventListener('visibilitychange', this.visibilityHandler);
    window.addEventListener('pagehide', this.pageHideHandler);
    document.addEventListener('pointerdown', this.audioUnlockHandler, { once: true });
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Enter' && this.phase === 'playing' && !this.input.isLocked()) {
        void this.input.requestLock();
      }
    });

    this.prepareMenuWorld();
    const urlCode = new URLSearchParams(window.location.search).get('room');
    if (urlCode) {
      this.ui.setJoinCode(urlCode);
    }
    this.applyPixelMode(true);
  }

  start(): void {
    if (this.frameHandle !== 0) {
      return;
    }
    this.lastTimestamp = performance.now();
    this.frameHandle = requestAnimationFrame(this.frame);
  }

  private frame = (): void => {
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0, (now - this.lastTimestamp) / 1000));
    this.lastTimestamp = now;
    this.visualTime += dt;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.tools.render(this.renderer);
    this.frameHandle = requestAnimationFrame(this.frame);
  };

  private update(dt: number): void {
    const dayLength = Math.max(1, dayDuration(this.run.loadout));
    const dayProgress =
      this.phase === 'playing'
        ? 1 - this.run.timeLeft / dayLength
        : this.phase === 'shop' || this.phase === 'gameover'
          ? 1
          : 0.15;
    this.environment.update(dt, THREE.MathUtils.clamp(dayProgress, 0, 1));
    this.resources.group.visible =
      this.phase === 'playing' && this.camera.position.y < 1;
    const dailyMoney = Math.max(0, this.run.money - this.dayMoneyBase);
    this.hopper.update(dt, this.run.carbon + dailyMoney * 0.025, this.run.quota);
    this.updatePixelMode();
    if (this.phase !== 'playing' || !this.input.isLocked()) {
      this.ladders.clearGhost();
    }

    if (this.phase === 'playing') {
      const frozenSolo = !this.online && this.paused;
      if (!frozenSolo) {
        this.accumulator += dt;
        let steps = 0;
        while (this.accumulator >= FIXED_STEP && steps < MAX_FIXED_STEPS) {
          this.fixedUpdate(FIXED_STEP);
          this.accumulator -= FIXED_STEP;
          steps += 1;
          if (this.phase !== 'playing') {
            break;
          }
        }
        if (steps === MAX_FIXED_STEPS) {
          this.accumulator = 0;
        }
      }
      this.aimAccumulator += dt;
      if (this.aimAccumulator >= AIM_INTERVAL) {
        this.aimAccumulator = 0;
        this.updateAim(true);
      }
      this.hudAccumulator += dt;
      if (this.hudAccumulator >= HUD_INTERVAL) {
        this.hudAccumulator = 0;
        this.updateHud();
      }
      this.objectiveAccumulator += dt;
      if (this.objectiveAccumulator >= 0.9) {
        this.objectiveAccumulator = 0;
        this.ui.setObjective(this.computeObjective());
      }
    } else if (this.phase === 'menu' || this.phase === 'lobby') {
      this.updateMenuCamera();
    }

    this.remoteAvatars.update(dt);
    this.staffAvatars.update(dt);
    this.effects.update(dt);
    const activeItem = this.getActiveHotbarItem();
    const hasTool = activeItem?.kind === 'tool';
    this.tools.update(
      dt,
      this.player.isMoving(),
      this.player.getSpeed(),
      this.visualTime,
      this.player.isJetpackActive(),
    );
    this.tools.setVisible(
      this.phase === 'playing' && this.input.isLocked() && hasTool,
    );
    this.tools.setFiringHeld(
      this.phase === 'playing' &&
        this.input.isLocked() &&
        this.input.isAttacking() &&
        hasTool &&
        this.activeWeapon === 'drill',
    );
    this.player.headlamp.visible =
      this.phase === 'playing' && this.input.isLocked();
    this.audio.updateListener(this.camera);
    this.audio.setJetpackActive(
      this.phase === 'playing' && this.input.isLocked() && this.player.isJetpackActive(),
    );
    this.audio.setDrillActive(
      this.phase === 'playing' &&
        this.input.isLocked() &&
        this.input.isAttacking() &&
        hasTool &&
        this.activeWeapon === 'drill',
    );
    this.ui.updateFloats();
  }

  private fixedUpdate(dt: number): void {
    if (this.phase !== 'playing') {
      return;
    }
    this.run.stats.playSeconds += dt;

    for (const weapon of WEAPON_ORDER) {
      this.cooldowns[weapon] = Math.max(0, this.cooldowns[weapon] - dt);
    }
    this.grenadeCooldown = Math.max(0, this.grenadeCooldown - dt);

    if (this.input.isLocked()) {
      this.player.update(dt);
      if (this.input.isAttacking() && !this.player.isClimbing()) {
        this.tryUseActiveItem();
      }
    }

    this.updatePendingPickaxeStrike(dt);
    this.updateProjectiles(dt);
    this.terrain.update();
    this.resources.update(dt);

    if (this.isAuthority()) {
      this.staffManager.update(dt);
      this.staffVisualAccumulator += dt;
      if (this.staffVisualAccumulator >= 0.2) {
        this.staffVisualAccumulator = 0;
        this.staffAvatars.applyStates(this.staffManager.getStates());
      }
      this.run.timeLeft = Math.max(0, this.run.timeLeft - dt);
      this.saveAccumulator += dt;
      if (this.saveAccumulator >= AUTOSAVE_INTERVAL) {
        this.saveAccumulator = 0;
        this.saveRun(false);
      }
      if (this.run.timeLeft <= 0) {
        this.finishDay();
        return;
      }
    } else {
      this.run.timeLeft = Math.max(0, this.run.timeLeft - dt);
    }

    const magnetCenter = this.player.getPosition().clone();
    magnetCenter.y += 1;
    this.loot.update(
      dt,
      this.terrain,
      magnetCenter,
      magnetRadius(this.run.loadout),
      (collected) => this.onLootCollected(collected),
    );

    if (this.online && this.network) {
      if (this.role === 'client') {
        this.clientNetworkTick(dt);
      } else if (this.role === 'host') {
        this.hostNetworkTick(dt);
      }
    }
  }

  isAuthority(): boolean {
    return this.role !== 'client';
  }

  updateMenuCamera(): void {
    View.updateMenuCamera(this);
  }

  updateOfficeCamera(): void {
    View.updateOfficeCamera(this);
  }

  updatePixelMode(force = false): void {
    View.updatePixelMode(this, force);
  }

  applyRenderResolution(): void {
    View.applyRenderResolution(this);
  }

  applyPixelMode(force = true): void {
    View.applyPixelMode(this, force);
  }

  handleResize(): void {
    View.handleResize(this);
  }

  prepareMenuWorld(): void {
    View.prepareMenuWorld(this);
  }

  startSolo(): void {
    Session.startSolo(this);
  }

  continueRun(): void {
    Session.continueRun(this);
  }

  leaveLobby(): void {
    Session.leaveLobby(this);
  }

  leaveGame(): void {
    Session.leaveGame(this);
  }

  createRoom(name: string): Promise<void> {
    return Session.createRoom(this, name);
  }

  joinRoom(name: string, code: string): Promise<void> {
    return Session.joinRoom(this, name, code);
  }

  startOnlineMatch(): void {
    Session.startOnlineMatch(this);
  }

  returnToMenu(): void {
    Session.returnToMenu(this);
  }

  toggleMute(): void {
    Session.toggleMute(this);
  }

  pauseGame(): void {
    Session.pauseGame(this);
  }

  resumeGame(): void {
    Session.resumeGame(this);
  }

  handleLockChange(locked: boolean): void {
    Session.handleLockChange(this, locked);
  }

  selectWeaponSlot(slot: number): void {
    this.selectHotbarSlot(slot - 1);
  }

  cycleWeapon(direction: number): void {
    const step = direction >= 0 ? 1 : -1;
    this.selectHotbarSlot((this.activeHotbarSlot + step + HOTBAR_SLOTS) % HOTBAR_SLOTS);
  }

  closeNetwork(sendBye: boolean): void {
    Session.closeNetwork(this, sendBye);
  }

  beginAuthorityDay(broadcastStart = false): void {
    DayCycle.beginAuthorityDay(this, broadcastStart);
  }

  loadSnapshot(snapshot: DaySnapshot, authority: boolean): void {
    DayCycle.loadSnapshot(this, snapshot, authority);
  }

  finishDay(): void {
    DayCycle.finishDay(this);
  }

  startNextDay(): void {
    DayCycle.startNextDay(this);
  }

  saveRun(showUi = true): boolean {
    return DayCycle.saveRun(this, showUi);
  }

  updateHud(): void {
    Hud.updateHud(this);
  }

  updateAim(forceUi: boolean): void {
    Hud.updateAim(this, forceUi);
  }

  computeObjective(): string {
    return Hud.computeObjective(this);
  }

  tryUseWeapon(): void {
    Combat.tryUseWeapon(this);
  }

  getActiveHotbarItem(): InventoryItem | null {
    return this.inventory.slots[this.activeHotbarSlot] ?? null;
  }

  selectHotbarSlot(index: number, announce = true): void {
    if (index < 0 || index >= HOTBAR_SLOTS) {
      return;
    }
    this.activeHotbarSlot = index;
    this.pendingPickaxeStrike = 0;
    this.applyActiveHotbarItem(announce);
    this.lastHudSignature = '';
    this.updateHud();
  }

  private applyActiveHotbarItem(announce: boolean): void {
    const item = this.getActiveHotbarItem();
    if (item?.kind === 'tool') {
      this.activeWeapon = item.weapon;
      this.ladderPlacementEnabled = false;
      this.tools.setActive(item.weapon, true);
    } else if (item?.kind === 'ladder') {
      this.ladderPlacementEnabled = true;
    } else {
      this.ladderPlacementEnabled = false;
    }
    if (announce) {
      this.audio.playUi();
    }
  }

  private tryUseActiveItem(): void {
    const item = this.getActiveHotbarItem();
    if (!item) {
      return;
    }
    if (item.kind === 'tool') {
      Combat.tryUseWeapon(this);
    } else if (item.kind === 'grenade') {
      this.throwGrenade(item.tier);
    }
  }

  throwGrenade(tier: GrenadeTierId): void {
    if (this.grenadeCooldown > 0) {
      return;
    }
    const item = this.getActiveHotbarItem();
    if (item?.kind !== 'grenade' || item.tier !== tier || item.count <= 0) {
      return;
    }
    if (!Combat.throwGrenade(this, tier)) {
      return;
    }
    this.grenadeCooldown = GRENADE_COOLDOWN;
    this.run.loadout.grenades[tier] = Math.max(
      0,
      (this.run.loadout.grenades[tier] ?? 0) - 1,
    );
    this.syncEquipmentInventory();
    if (this.online && this.network) {
      if (this.role === 'client') {
        this.network.sendToHost({
          t: 'grenade_use',
          v: PROTOCOL_VERSION,
          tier,
        });
      } else {
        this.broadcastEconomy();
      }
    }
    this.lastHudSignature = '';
    this.updateHud();
  }

  moveInventoryItem(from: number, to: number): void {
    const wasActive = from === this.activeHotbarSlot;
    if (!this.inventory.move(from, to)) {
      return;
    }
    if (wasActive && to < HOTBAR_SLOTS) {
      this.activeHotbarSlot = to;
    }
    if (from === this.activeHotbarSlot || to === this.activeHotbarSlot || wasActive) {
      this.applyActiveHotbarItem(false);
    }
    this.lastHudSignature = '';
    this.updateHud();
  }

  syncEquipmentInventory(): void {
    this.inventory.syncLoadout(this.run.loadout);
    if (!this.getActiveHotbarItem()) {
      const toolSlot = this.inventory.slots.findIndex(
        (item, index) => index < HOTBAR_SLOTS && item?.kind === 'tool',
      );
      if (toolSlot >= 0) {
        this.activeHotbarSlot = toolSlot;
      }
    }
    this.applyActiveHotbarItem(false);
    this.lastHudSignature = '';
  }

  resetInventory(): void {
    this.inventory.clearAll();
    this.inventory.syncLoadout(this.run.loadout);
    this.activeHotbarSlot = 0;
    this.applyActiveHotbarItem(false);
    this.lastHudSignature = '';
  }

  resetDaySettlement(): void {
    this.dayLedger = emptyDayLedger();
    this.dayReport = null;
  }

  recordDayDeposit(lines: readonly DaySaleLine[], money: number): void {
    if (!this.isAuthority()) {
      return;
    }
    recordDeposit(this.dayLedger, lines, money);
  }

  openShopAfterSummary(): void {
    if (this.phase !== 'shop' || !this.shopSuccess) {
      this.ui.hideDaySummary();
      return;
    }
    this.ui.hideDaySummary();
    this.ui.showShop(ShopView.buildShopView(this));
  }

  updatePendingPickaxeStrike(dt: number): void {
    Combat.updatePendingPickaxeStrike(this, dt);
  }

  updateProjectiles(dt: number): void {
    Combat.updateProjectiles(this, dt);
  }

  clearProjectiles(): void {
    Combat.clearProjectiles(this);
  }

  onLootCollected(collected: CollectedLoot): boolean {
    return Interaction.onLootCollected(this, collected);
  }

  staffCollect(collected: CollectedLoot, count: number): void {
    Interaction.staffCollect(this, collected, count);
  }

  carveFromStaff(event: CarveEvent): void {
    Combat.carveFromStaff(this, event);
  }

  staffAttackNode(node: ResourceNode, damage: number): void {
    Combat.staffAttackNode(this, node, damage);
  }

  updateInteractionState(): void {
    Interaction.updateInteractionState(this);
  }

  handleInteract(): void {
    Interaction.handleInteract(this);
  }

  toggleLadderOrientation(): void {
    Session.toggleLadderOrientation(this);
  }

  toggleLadderPlacement(): void {
    Session.toggleLadderPlacement(this);
  }

  toggleInventory(): void {
    if (this.phase !== 'playing') {
      return;
    }
    if (this.inventoryOpen) {
      this.closeInventory();
      this.paused = false;
      void this.input.requestLock();
    } else {
      this.inventoryOpen = true;
      this.input.setInventoryOpen(true);
      this.ui.setInventoryOpen(true);
      this.paused = true;
      this.lastHudSignature = '';
      this.updateHud();
      if (this.input.isLocked()) {
        this.input.unlock();
      }
    }
    this.audio.playUi();
  }

  closeInventory(): void {
    if (!this.inventoryOpen) {
      return;
    }
    this.inventoryOpen = false;
    this.input.setInventoryOpen(false);
    this.ui.setInventoryOpen(false);
  }

  clearCargo(): void {
    this.cargoCoal = 0;
    this.cargoMoney = 0;
    this.cargoWeight = 0;
    this.inventory.clearMinerals();
    this.lastHudSignature = '';
  }

  buildShopView(): ReturnType<typeof ShopView.buildShopView> {
    return ShopView.buildShopView(this);
  }

  requestPurchase(itemId: string): void {
    ShopView.requestPurchase(this, itemId);
  }

  applyPurchase(itemId: string): boolean {
    return ShopView.applyPurchase(this, itemId);
  }

  broadcastShopState(): void {
    ShopView.broadcastShopState(this);
  }

  networkCallbacks(): NetworkCallbacks {
    return NetworkBridge.networkCallbacks(this);
  }

  buildLobbyView(roomCode: string, role: 'host' | 'client'): LobbyViewData {
    return NetworkBridge.buildLobbyView(this, roomCode, role);
  }

  handleNetworkClosed(reason: string): void {
    NetworkBridge.handleNetworkClosed(this, reason);
  }

  buildSnapshot(): DaySnapshot {
    return NetworkBridge.buildSnapshot(this);
  }

  getAllHostStates(): NetworkPlayerState[] {
    return NetworkBridge.getAllHostStates(this);
  }

  hostNetworkTick(dt: number): void {
    NetworkBridge.hostNetworkTick(this, dt);
  }

  clientNetworkTick(dt: number): void {
    NetworkBridge.clientNetworkTick(this, dt);
  }

  broadcastEconomy(): void {
    NetworkBridge.broadcastEconomy(this);
  }

  dispose(): void {
    this.frameHandle = 0;
    this.closeNetwork(false);
    this.input.dispose();
    this.audio.dispose();
    this.ui.dispose();
    this.remoteAvatars.clear();
    this.staffAvatars.clear();
    this.effects.dispose();
    this.tools.dispose();
    this.resources.dispose();
    this.loot.dispose();
    this.hopper.dispose();
    this.ladders.dispose();
    this.terrain.dispose();
    this.environment.dispose();
    this.clearProjectiles();
    this.grenadeGeometry.dispose();
    this.grenadeMaterial.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.resizeHandler);
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    window.removeEventListener('pagehide', this.pageHideHandler);
    document.removeEventListener('pointerdown', this.audioUnlockHandler);
  }
}
