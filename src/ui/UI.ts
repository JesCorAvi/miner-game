import * as THREE from 'three';
import { EMPLOYEE_RANKS } from '../config';
import type { BigValue } from '../core/BigValue';
import type { InventoryItem } from '../core/Inventory';
import type {
  DayReport,
  DifficultyModifier,
  GameMode,
  LadderOrientation,
  ProfessionId,
  RunStats,
  SaveSummary,
} from '../types';
import { formatDepth, formatMoney, formatNumber, formatTime } from './format';
import { InventoryView } from './InventoryView';
import { DaySummaryView } from './DaySummaryView';
import { renderPixelLogo } from './PixelLogo';
import { renderShopItems } from './shopView';
import type { ShopTab, ShopViewData } from './shopView';
import { renderShopLoadoutSummary, renderShopPassives } from './ShopSideView';
import type { ReturnRouteStatus } from '../core/ReturnPlanner';
import { FloatingNoticeView, type ToastTone } from './FloatingNoticeView';
import { LobbyView, type LobbyViewData } from './LobbyView';
import { bindProfessionMenu } from './ProfessionMenuView';
export type { ShopViewData } from './shopView';
export type { ToastTone } from './FloatingNoticeView';
const LADDER_DIAL_CORES: Record<LadderOrientation, string> = {
  vertical: 'V',
  'diagonal-up': '↗',
  horizontal: '—',
  'diagonal-down': '↘',
};

export interface UIActions {
  startSolo: () => void;
  continueRun: () => void;
  createRoom: (name: string) => void;
  joinRoom: (name: string, code: string) => void;
  startOnline: () => void;
  leaveLobby: () => void;
  resumeGame: () => void;
  leaveGame: () => void;
  toggleMute: () => void;
  purchase: (itemId: string) => void;
  nextDay: () => void;
  continueFromSummary: () => void;
  returnToMenu: () => void;
  moveInventoryItem: (from: number, to: number) => void;
  selectHotbarSlot: (index: number) => void;
  openDoctrineModal?: () => void;
}

export interface HudViewData {
  day: number;
  timeLeft: number;
  quota: number;
  carbon: number;
  money: BigValue;
  depth: number;
  layerName: string;
  fuel: number;
  maxFuel: number;
  onlineActive: boolean;
  onlinePlayers: number;
  onlineIsHost: boolean;
  muted: boolean;
  employees: number;
  cargoCoal: number;
  cargoMoney: number;
  cargoWeight: number;
  maxCargoWeight: number;
  maxStack: number;
  inventorySlots: Array<InventoryItem | null>;
  inventoryCount: number;
  inventoryOpen: boolean;
  activeHotbarSlot: number;
  ladders: number;
  ladderPlacementEnabled: boolean;
  jetpackUnlocked: boolean;
  jetpackLockedHint: string;
  returnStatus: ReturnRouteStatus;
  returnText: string;
  missionText: string;
  hopperBearingText: string;
  hopperVerticalText: string;
  prompt: HudPrompt | null;
}

export interface HudPrompt {
  key: string;
  text: string;
}

export type AimKind = 'node' | 'chest' | 'terrain' | 'sign';

export interface AimViewData {
  kind: AimKind;
  title: string;
  status: string;
  detail: string;
  ratio: number;
}

export type { LobbyViewData } from './LobbyView';

export interface GameOverViewData {
  victory: boolean;
  message: string;
  stats: RunStats;
  title?: string;
}

function required<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`No se encontró el elemento de interfaz #${id}`);
  }
  return element as T;
}

function setText(element: HTMLElement, value: string): void {
  if (element.textContent !== value) {
    element.textContent = value;
  }
}

export class UI {
  private readonly actions: UIActions;
  private readonly menuOverlay = required<HTMLElement>('menu-overlay');
  private readonly shopOverlay = required<HTMLElement>('shop-overlay');
  private readonly daySummaryOverlay = required<HTMLElement>('day-summary-overlay');
  private readonly pauseOverlay = required<HTMLElement>('pause-overlay');
  private readonly gameOverOverlay = required<HTMLElement>('gameover-overlay');
  private readonly networkOverlay = required<HTMLElement>('network-overlay');
  private readonly loadingOverlay = required<HTMLElement>('loading-overlay');
  private readonly hud = required<HTMLElement>('hud');
  private readonly startNew = required<HTMLButtonElement>('start-new');
  private readonly startContinue = required<HTMLButtonElement>('start-continue');
  private readonly saveSummary = required<HTMLElement>('save-summary');
  private readonly playerNameInput = required<HTMLInputElement>('player-name');
  private readonly menuMode = required<HTMLSelectElement>('menu-mode');
  private readonly menuMap = required<HTMLSelectElement>('menu-map');
  private readonly menuProfession = required<HTMLSelectElement>('menu-profession');
  private readonly menuModifiers = required<HTMLElement>('menu-modifiers');
  private readonly createRoomButton = required<HTMLButtonElement>('create-room');
  private readonly joinRoomButton = required<HTMLButtonElement>('join-room');
  private readonly joinCodeInput = required<HTMLInputElement>('join-code');
  private readonly menuError = required<HTMLElement>('menu-error');
  private readonly shopTitle = required<HTMLElement>('shop-title');
  private readonly shopSubtitle = required<HTMLElement>('shop-subtitle');
  private readonly shopMoney = required<HTMLElement>('shop-money');
  private readonly shopVictoryChip = required<HTMLElement>('shop-victory-chip');
  private readonly shopCarbon = required<HTMLElement>('shop-carbon');
  private readonly shopCarbonDetail = required<HTMLElement>('shop-carbon-detail');
  private readonly shopProfileDay = required<HTMLElement>('shop-profile-day');
  private readonly shopProfileMode = required<HTMLElement>('shop-profile-mode');
  private readonly shopPayroll = required<HTMLElement>('shop-payroll');
  private readonly shopDays = required<HTMLElement>('shop-days');
  private readonly shopNodes = required<HTMLElement>('shop-nodes');
  private readonly shopChests = required<HTMLElement>('shop-chests');
  private readonly shopPassives = required<HTMLElement>('shop-passives');
  private readonly shopLoadoutSummary = required<HTMLElement>('shop-loadout-summary');
  private readonly shopContent = required<HTMLElement>('shop-content');
  private readonly shopConnection = required<HTMLElement>('shop-connection');
  private readonly shopNext = required<HTMLButtonElement>('shop-next');
  private readonly shopWaitHost = required<HTMLElement>('shop-wait-host');
  private readonly shopMenu = required<HTMLButtonElement>('shop-menu');
  private readonly daySummaryView: DaySummaryView;
  private readonly daySummaryContinue = required<HTMLButtonElement>('day-summary-continue');
  private readonly shopTabs: HTMLButtonElement[] = [];
  private readonly shopTabCounts = new Map<string, HTMLElement>();
  private activeShopTab: ShopTab = 'equipment';
  private readonly pauseDetail = required<HTMLElement>('pause-detail');
  private readonly pauseLeave = required<HTMLButtonElement>('pause-leave');
  private readonly gameOverKicker = required<HTMLElement>('gameover-kicker');
  private readonly gameOverTitle = required<HTMLElement>('gameover-title');
  private readonly gameOverMessage = required<HTMLElement>('gameover-message');
  private readonly gameOverAction = required<HTMLButtonElement>('gameover-action');
  private readonly networkMessage = required<HTMLElement>('network-message');
  private readonly networkAction = required<HTMLButtonElement>('network-action');
  private readonly loadingText = required<HTMLElement>('loading-text');
  private readonly hudDay = required<HTMLElement>('hud-day');
  private readonly hudObjectiveKind = required<HTMLElement>('hud-objective-kind');
  private readonly hudTime = required<HTMLElement>('hud-time');
  private readonly hudReturnBadge = required<HTMLElement>('hud-return');
  private readonly hudReturnTime = required<HTMLElement>('hud-return-time');
  private readonly hudHopperBearing = required<HTMLElement>('hud-hopper-bearing');
  private readonly hudHopperVertical = required<HTMLElement>('hud-hopper-vertical');
  private readonly hudCarbon = required<HTMLElement>('hud-carbon');
  private readonly hudMoney = required<HTMLElement>('hud-money');
  private readonly hudQuotaFill = required<HTMLElement>('hud-quota-fill');
  private readonly quotaCard = required<HTMLElement>('quota-card');
  private readonly hudQuotaStatus = required<HTMLElement>('hud-quota-status');
  private readonly hudQuotaHint = required<HTMLElement>('hud-quota-hint');
  private readonly hudDepth = required<HTMLElement>('hud-depth');
  private readonly hudLayer = required<HTMLElement>('hud-layer');
  private readonly hudFuel = required<HTMLElement>('hud-fuel-fill');
  private readonly hudFuelValue = required<HTMLElement>('hud-fuel-value');
  private readonly hudOnline = required<HTMLElement>('hud-online');
  private readonly hudMute = required<HTMLButtonElement>('hud-mute');
  private readonly hudSave = required<HTMLElement>('hud-save');
  private readonly hudIncome = required<HTMLElement>('hud-income');
  private readonly objectiveText = required<HTMLElement>('objective-text');
  private readonly aimPanel = required<HTMLElement>('aim-panel');
  private readonly aimType = required<HTMLElement>('aim-type');
  private readonly aimStatus = required<HTMLElement>('aim-status');
  private readonly aimFill = required<HTMLElement>('aim-fill');
  private readonly aimDetail = required<HTMLElement>('aim-detail');
  private readonly crosshair = required<HTMLElement>('crosshair');
  private readonly interactionPrompt = required<HTMLElement>('interaction-prompt');
  private readonly interactionKey = required<HTMLElement>('interaction-key');
  private readonly interactionText = required<HTMLElement>('interaction-text');
  private readonly ladderDial = required<HTMLElement>('ladder-dial');
  private readonly ladderDialCore = required<HTMLElement>('ladder-dial-core');
  private readonly ladderDialCursor = required<HTMLElement>('ladder-dial-cursor');
  private readonly ladderDialOptions =
    this.ladderDial.querySelectorAll<HTMLElement>('[data-ladder-orientation]');
  private readonly cargoCard = required<HTMLElement>('cargo-card');
  private readonly cargoWeight = required<HTMLElement>('hud-cargo-weight');
  private readonly cargoWeightFill = required<HTMLElement>('hud-cargo-weight-fill');
  private readonly cargoUnbanked = required<HTMLElement>('hud-cargo-unbanked');
  private readonly cargoHopper = required<HTMLElement>('hud-hopper');
  private readonly jetCard = required<HTMLElement>('jet-card');
  private readonly jetHint = required<HTMLElement>('hud-jet-hint');
  private readonly inventoryView: InventoryView;
  private readonly notices: FloatingNoticeView;
  private readonly lobbyView: LobbyView;
  private readonly menuClock = required<HTMLElement>('menu-clock');
  private savedTime = -1;
  private purchasedIds = new Set<string>();
  private currentShop: ShopViewData | null = null;
  private readonly clockTimer: number;

  constructor(camera: THREE.PerspectiveCamera, actions: UIActions) {
    this.actions = actions;
    this.notices = new FloatingNoticeView(camera, {
      toastStack: required<HTMLElement>('toast-stack'),
      floatLayer: required<HTMLElement>('float-layer'),
      banner: required<HTMLElement>('hud-banner'),
      bannerKicker: required<HTMLElement>('hud-banner-kicker'),
      bannerText: required<HTMLElement>('hud-banner-text'),
    });
    this.lobbyView = new LobbyView();
    this.inventoryView = new InventoryView(
      required<HTMLElement>('inventory-hotbar'),
      required<HTMLElement>('inventory-panel'),
      required<HTMLElement>('inventory-grid'),
      required<HTMLElement>('inventory-weight'),
      required<HTMLElement>('inventory-summary'),
      {
        moveItem: (from, to) => this.actions.moveInventoryItem(from, to),
        selectHotbar: (index) => this.actions.selectHotbarSlot(index),
      },
    );
    this.daySummaryView = new DaySummaryView({
      overlay: this.daySummaryOverlay,
      title: required<HTMLElement>('day-summary-title'),
      subtitle: required<HTMLElement>('day-summary-subtitle'),
      lines: required<HTMLElement>('day-summary-lines'),
      carbon: required<HTMLElement>('day-summary-carbon'),
      performance: required<HTMLElement>('day-summary-performance'),
      bonus: required<HTMLElement>('day-summary-bonus'),
      punctuality: required<HTMLElement>('day-summary-punctuality'),
      surplus: required<HTMLElement>('day-summary-surplus'),
      total: required<HTMLElement>('day-summary-total'),
      money: required<HTMLElement>('day-summary-money'),
    });
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-shop-tab]')) {
      this.shopTabs.push(button);
    }
    for (const badge of document.querySelectorAll<HTMLElement>('[data-shop-count]')) {
      const tab = badge.dataset.shopCount;
      if (tab) {
        this.shopTabCounts.set(tab, badge);
      }
    }
    this.bind();
    renderPixelLogo(required<HTMLCanvasElement>('pixel-logo'));
    this.updateClock();
    this.clockTimer = window.setInterval(() => this.updateClock(), 30_000);
  }

  private bind(): void {
    bindProfessionMenu(this.menuProfession, required<HTMLElement>('menu-profession-info'));
    this.startNew.addEventListener('click', () => this.actions.startSolo());
    this.startContinue.addEventListener('click', () => this.actions.continueRun());
    this.createRoomButton.addEventListener('click', () => {
      this.clearMenuError();
      this.actions.createRoom(this.getPlayerName());
    });
    this.joinRoomButton.addEventListener('click', () => {
      this.clearMenuError();
      this.actions.joinRoom(this.getPlayerName(), this.joinCodeInput.value);
    });
    this.joinCodeInput.addEventListener('input', () => {
      this.joinCodeInput.value = this.joinCodeInput.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6);
    });
    this.joinCodeInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.actions.joinRoom(this.getPlayerName(), this.joinCodeInput.value);
      }
    });
    this.lobbyView.bind({
      start: () => this.actions.startOnline(),
      leave: () => this.actions.leaveLobby(),
    });
    required<HTMLButtonElement>('pause-resume').addEventListener('click', () => this.actions.resumeGame());
    this.pauseLeave.addEventListener('click', () => this.actions.leaveGame());
    this.shopNext.addEventListener('click', () => this.actions.nextDay());
    this.shopMenu.addEventListener('click', () => this.actions.leaveGame());
    document.getElementById('shop-doctrine-btn')?.addEventListener('click', () => this.actions.openDoctrineModal?.());
    this.daySummaryContinue.addEventListener('click', () => this.actions.continueFromSummary());
    for (const button of this.shopTabs) {
      button.addEventListener('click', () => {
        const tab = button.dataset.shopTab;
        if (tab === 'employees' || tab === 'equipment' || tab === 'bonuses' || tab === 'inventory') {
          this.selectShopTab(tab);
        }
      });
    }
    this.shopContent.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest<HTMLButtonElement>('button[data-item-id]');
      if (!button || button.disabled) {
        return;
      }
      const itemId = button.dataset.itemId;
      if (itemId) {
        this.actions.purchase(itemId);
      }
    });
    this.gameOverAction.addEventListener('click', () => this.actions.returnToMenu());
    this.networkAction.addEventListener('click', () => this.actions.returnToMenu());
    this.hudMute.addEventListener('click', () => this.actions.toggleMute());
    required<HTMLButtonElement>('fatal-reload').addEventListener('click', () => window.location.reload());
    this.playerNameInput.addEventListener('change', () => {
      this.playerNameInput.value = this.playerNameInput.value.trim().slice(0, 16) || 'Operario';
    });
  }

  private updateClock(): void {
    const now = new Date();
    setText(this.menuClock, `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
  }

  getPlayerName(): string {
    const name = this.playerNameInput.value.trim().replace(/\s+/g, ' ').slice(0, 16);
    return name || 'Operario';
  }

  setPlayerName(name: string): void {
    this.playerNameInput.value = name;
  }

  getRunConfig(): {
    mode: GameMode;
    modifiers: DifficultyModifier[];
    profession: ProfessionId;
    map: string;
  } {
    const rawMode = this.menuMode.value;
    const mode: GameMode =
      rawMode === 'tough' || rawMode === 'peaceful' ? rawMode : 'normal';
    const modifiers: DifficultyModifier[] = [];
    const inputs = this.menuModifiers.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    inputs.forEach((input) => {
      if (input.checked) {
        modifiers.push(input.value as DifficultyModifier);
      }
    });
    return {
      mode,
      modifiers,
      profession: this.menuProfession.value || 'internship',
      map: this.menuMap.value || 'standard',
    };
  }

  setJoinCode(code: string): void {
    this.joinCodeInput.value = code
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
  }

  showMenu(save: SaveSummary | null): void {
    this.setMenuBusy(false);
    this.clearMenuError();
    this.hideHud();
    this.hideLobby();
    this.hideShop();
    this.hidePause();
    this.hideGameOver();
    this.hideNetworkError();
    this.menuOverlay.hidden = false;
    this.startContinue.hidden = !save;
    if (save) {
      const date = new Date(save.savedAt);
      const formatted = Number.isFinite(date.getTime())
        ? date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
        : 'fecha desconocida';
      setText(
        this.saveSummary,
        `Expediente activo · Día ${save.day} · ${formatMoney(save.money)} · ${save.daysCompleted} turnos · ${formatted}`,
      );
      this.startNew.textContent = 'NUEVO EXPEDIENTE';
    } else {
      setText(this.saveSummary, 'Sin expediente activo. La primera cuota abre el contrato.');
      this.startNew.textContent = 'NUEVA OPERACIÓN';
    }
  }

  hideMenu(): void {
    this.menuOverlay.hidden = true;
  }

  setMenuError(message: string): void {
    setText(this.menuError, message);
  }

  clearMenuError(): void {
    setText(this.menuError, '');
  }

  setMenuBusy(busy: boolean, label = 'CONECTANDO…'): void {
    this.createRoomButton.disabled = busy;
    this.joinRoomButton.disabled = busy;
    this.startNew.disabled = busy;
    this.startContinue.disabled = busy;
    if (busy) {
      this.createRoomButton.textContent = label;
    } else {
      this.createRoomButton.textContent = 'CREAR SALA';
    }
  }

  showLobby(data: LobbyViewData): void {
    this.hideMenu();
    this.hideHud();
    this.setMenuBusy(false);
    this.lobbyView.show(data);
  }

  updateLobby(data: LobbyViewData): void {
    this.lobbyView.show(data);
  }

  hideLobby(): void {
    this.lobbyView.hide();
  }

  setLobbyStatus(status: string, error = ''): void {
    this.lobbyView.setStatus(status, error);
  }

  showHud(): void {
    this.hud.classList.remove('is-hidden');
  }

  hideHud(): void {
    this.hud.classList.add('is-hidden');
    this.hideLadderDial();
  }

  updateHud(data: HudViewData): void {
    setText(this.hudDay, `DÍA ${String(data.day).padStart(2, '0')}`);
    setText(this.hudObjectiveKind, data.missionText || 'CUOTA OBLIGATORIA');
    setText(this.hudTime, formatTime(data.timeLeft));
    setText(this.hudReturnTime, data.returnText);
    this.hudReturnBadge.className = `return-chip status-${data.returnStatus}`;
    setText(this.hudHopperBearing, data.hopperBearingText);
    setText(this.hudHopperVertical, data.hopperVerticalText);
    setText(this.hudCarbon, `${formatNumber(data.carbon)} / ${formatNumber(data.quota)} t`);
    setText(this.hudMoney, formatMoney(data.money));
    setText(this.hudIncome, `${data.employees} empleado${data.employees === 1 ? '' : 's'} activo${data.employees === 1 ? '' : 's'}`);
    setText(this.hudDepth, formatDepth(data.depth));
    setText(this.hudLayer, data.layerName);
    if (data.jetpackUnlocked) {
      setText(this.hudFuelValue, `${Math.round(data.fuel)} / ${Math.round(data.maxFuel)}`);
      this.hudFuel.style.width = `${Math.max(0, Math.min(1, data.fuel / Math.max(1, data.maxFuel))) * 100}%`;
      setText(this.jetHint, 'ESPACIO: propulsión · recarga al tocar suelo');
      this.jetCard.classList.remove('is-locked');
    } else {
      setText(this.hudFuelValue, 'BLOQUEADO');
      this.hudFuel.style.width = '0%';
      setText(this.jetHint, data.jetpackLockedHint || 'SE DESBLOQUEA EN LA OFICINA NOCTURNA');
      this.jetCard.classList.add('is-locked');
    }
    const progress = Math.max(0, Math.min(1, data.carbon / Math.max(1, data.quota)));
    this.hudQuotaFill.style.width = `${progress * 100}%`;
    const remaining = data.quota - data.carbon;
    const covered = remaining <= 0;
    const warning = !covered && data.timeLeft <= 20;
    this.quotaCard.classList.toggle('is-covered', covered);
    this.quotaCard.classList.toggle('is-warning', warning);
    setText(
      this.hudQuotaStatus,
      covered ? 'CUOTA CUBIERTA' : warning ? 'CIERRE INMINENTE' : 'EN EXTRACCIÓN',
    );
    setText(
      this.hudQuotaHint,
      covered ? 'MARGEN EXTRA PARA LA EMPRESA' : `${formatNumber(Math.max(0, remaining))} t RESTANTES`,
    );
    setText(
      this.hudOnline,
      data.onlineActive
        ? `EN RED · ${data.onlinePlayers}/4${data.onlineIsHost ? ' · HOST' : ''}`
        : '',
    );
    this.hudOnline.hidden = !data.onlineActive;
    this.hudMute.textContent = data.muted ? 'SONIDO: OFF' : 'SONIDO: ON';
    const loadRatio = data.maxCargoWeight > 0 ? data.cargoWeight / data.maxCargoWeight : 0;
    const isCritical = loadRatio > 0.8;
    const isOverloaded = data.cargoWeight >= data.maxCargoWeight;
    const weightLabel = isCritical
      ? `CARGA CRÍTICA · ${Math.round(loadRatio * 100)}% (${data.cargoWeight.toFixed(1)}/${formatNumber(data.maxCargoWeight)} kg)`
      : `PESO: ${data.cargoWeight.toFixed(1)} / ${formatNumber(data.maxCargoWeight)} kg`;
    setText(this.cargoWeight, weightLabel);
    this.cargoCard.classList.toggle('is-overloaded', isOverloaded || isCritical);
    this.cargoWeightFill.style.width = `${Math.min(
      100,
      (data.cargoWeight / Math.max(1, data.maxCargoWeight)) * 100,
    )}%`;
    setText(
      this.cargoUnbanked,
      `MOCHILA: ${formatNumber(data.cargoCoal)} t · ${formatMoney(data.cargoMoney)}`,
    );
    setText(
      this.cargoHopper,
      `TOLVA: ${formatNumber(data.carbon)} / ${formatNumber(data.quota)} t`,
    );
    this.cargoCard.classList.toggle(
      'has-cargo',
      data.cargoCoal > 0 || data.cargoMoney > 0 || data.cargoWeight > 0,
    );
    this.inventoryView.setOpen(data.inventoryOpen);
    this.inventoryView.render(
      data.inventorySlots,
      data.activeHotbarSlot,
      data.cargoWeight,
      data.maxCargoWeight,
      data.maxStack,
      data.inventoryCount,
      data.cargoCoal,
      data.cargoMoney,
    );
    if (data.prompt) {
      this.interactionPrompt.hidden = false;
      setText(this.interactionKey, data.prompt.key);
      setText(this.interactionText, data.prompt.text);
    } else {
      this.interactionPrompt.hidden = true;
    }
  }

  updateAim(aim: AimViewData | null): void {
    if (!aim) {
      this.aimPanel.hidden = true;
      this.crosshair.classList.remove('is-target', 'is-chest', 'is-sign');
      return;
    }
    this.aimPanel.hidden = false;
    this.aimPanel.classList.toggle('is-chest', aim.kind === 'chest');
    this.aimPanel.classList.toggle('is-terrain', aim.kind === 'terrain');
    this.aimPanel.classList.toggle('is-sign', aim.kind === 'sign');
    this.crosshair.classList.toggle('is-target', aim.kind !== 'terrain');
    this.crosshair.classList.toggle('is-chest', aim.kind === 'chest');
    this.crosshair.classList.toggle('is-sign', aim.kind === 'sign');
    setText(this.aimType, aim.title);
    setText(this.aimStatus, aim.status);
    setText(this.aimDetail, aim.detail);
    this.aimFill.style.width = `${Math.max(0, Math.min(1, aim.ratio)) * 100}%`;
  }

  showLadderDial(orientation: LadderOrientation, x = 0, y = 0): void {
    this.ladderDial.hidden = false;
    document.body.classList.add('is-ladder-dial');
    this.updateLadderDial(orientation, x, y);
  }

  updateLadderDial(orientation: LadderOrientation, x: number, y: number): void {
    setText(this.ladderDialCore, LADDER_DIAL_CORES[orientation]);
    this.ladderDialOptions.forEach((option) => {
      const active = option.dataset.ladderOrientation === orientation;
      option.classList.toggle('is-active', active);
      option.setAttribute('aria-current', active ? 'true' : 'false');
    });
    this.ladderDialCursor.style.setProperty('--dial-x', `${x}px`);
    this.ladderDialCursor.style.setProperty('--dial-y', `${y}px`);
  }

  hideLadderDial(): void {
    this.ladderDial.hidden = true;
    document.body.classList.remove('is-ladder-dial');
  }

  setObjective(text: string): void {
    setText(this.objectiveText, text);
  }

  setInventoryOpen(open: boolean): void {
    this.inventoryView.setOpen(open);
  }

  flashInventoryDump(): void {
    this.inventoryView.flashDump();
  }

  setSaved(label = 'GUARDADO'): void {
    this.hudSave.classList.add('is-saved');
    setText(this.hudSave, label);
    window.clearTimeout(this.savedTime);
    this.savedTime = window.setTimeout(() => {
      this.hudSave.classList.remove('is-saved');
      setText(this.hudSave, 'AUTOGUARDADO');
    }, 1800);
  }

  setSaveStatus(label: string): void {
    this.hudSave.classList.remove('is-saved');
    setText(this.hudSave, label);
  }

  notify(message: string, tone: ToastTone = 'info'): void {
    this.notices.notify(message, tone);
  }

  showBanner(kicker: string, text: string, duration = 2200): void {
    this.notices.showBanner(kicker, text, duration);
  }

  spawnFloat(position: THREE.Vector3, text: string, tone: 'amber' | 'positive' | 'cyan' = 'amber'): void {
    this.notices.spawnFloat(position, text, tone);
  }

  updateFloats(): void {
    this.notices.updateFloats();
  }

  showShop(data: ShopViewData): void {
    this.currentShop = data;
    this.hideDaySummary();
    this.hideMenu();
    this.hideLobby();
    this.hideHud();
    this.hidePause();
    this.hideGameOver();
    this.shopOverlay.hidden = false;
    this.renderShop(data);
  }

  updateShop(data: ShopViewData): void {
    this.currentShop = data;
    if (this.daySummaryOverlay.hidden) {
      this.shopOverlay.hidden = false;
    }
    const catalog = this.shopOverlay.querySelector<HTMLElement>('.shop-content');
    const scrollTop = catalog?.scrollTop ?? 0;
    const side = this.shopOverlay.querySelector<HTMLElement>('.shop-side');
    const sideScroll = side?.scrollTop ?? 0;
    this.renderShop(data);
    if (catalog) {
      catalog.scrollTop = scrollTop;
    }
    if (side) {
      side.scrollTop = sideScroll;
    }
  }

  hideShop(): void {
    this.shopOverlay.hidden = true;
    this.currentShop = null;
  }

  showDaySummary(report: DayReport): void {
    this.hideMenu();
    this.hideLobby();
    this.hideHud();
    this.hidePause();
    this.hideGameOver();
    this.hideShop();
    this.renderDaySummary(report);
    this.daySummaryOverlay.hidden = false;
  }

  hideDaySummary(): void {
    this.daySummaryOverlay.hidden = true;
    this.daySummaryView.hide();
  }

  private renderDaySummary(report: DayReport): void {
    // BONUS DE RENDIMIENTO // ACTA DE EXTRACCIÓN
    this.daySummaryView.render(report);
  }

  private selectShopTab(tab: ShopTab): void {
    this.activeShopTab = tab;
    if (this.currentShop) {
      renderShopItems(this.shopContent, this.currentShop, tab);
      this.updateShopTabState(this.currentShop);
    }
  }

  private updateShopTabState(data: ShopViewData): void {
    const counts: Record<ShopTab, number> = {
      employees: data.items.filter((item) => item.kind.startsWith('employee')).length,
      equipment: data.items.filter(
        (item) =>
          item.kind === 'weapon' || item.kind === 'supply' || item.kind === 'grenade',
      ).length,
      bonuses: data.items.filter((item) => item.kind === 'upgrade').length,
      inventory:
        Object.values(data.loadout.weapons).filter(Boolean).length +
        (data.loadout.ladders > 0 ? 1 : 0) +
        Object.values(data.loadout.grenades).filter((count) => count > 0).length,
    };
    for (const button of this.shopTabs) {
      const tab = button.dataset.shopTab as ShopTab | undefined;
      const active = tab === this.activeShopTab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      if (tab) {
        const badge = this.shopTabCounts.get(tab);
        if (badge) {
          badge.textContent = String(counts[tab] ?? 0);
        }
      }
    }
    this.shopContent.setAttribute('aria-labelledby', `shop-tab-${this.activeShopTab}`);
  }

  private renderShop(data: ShopViewData): void {
    const roster = data.loadout.employees.roster;
    const employees = roster.length;
    setText(
      this.shopTitle,
      data.victory
        ? 'VICTORIA CORPORATIVA'
        : data.success
          ? `TURNO ${String(data.day).padStart(2, '0')} COMPLETADO`
          : 'CUOTA INCUMPLIDA',
    );
    setText(
      this.shopSubtitle,
      data.victory
        ? 'La junta aprueba el expediente. Puedes continuar en modo infinito.'
        : data.success
          ? 'La cuota está cubierta. La oficina nocturna abre sus catálogos.'
          : 'La junta revisa la producción. No hay margen para otra oportunidad.',
    );
    setText(this.shopMoney, formatMoney(data.money));
    this.shopVictoryChip.hidden = !data.victory;
    setText(this.shopCarbon, `${formatNumber(data.nextQuota)} t`);
    setText(
      this.shopCarbonDetail,
      `ENTREGADO ${formatNumber(data.carbon)} / ${formatNumber(data.quota)} t`,
    );
    setText(this.shopProfileDay, `DÍA ${String(data.day).padStart(2, '0')}`);
    setText(
      this.shopProfileMode,
      data.online
        ? data.isHost
          ? 'COOPERATIVO · ANFITRIÓN'
          : 'COOPERATIVO · CLIENTE'
        : 'MODO LOCAL',
    );
    const highestRank = roster.reduce((rank, employee) => Math.max(rank, employee.rank), 0);
    setText(
      this.shopPayroll,
      `${employees} · ${employees > 0 ? EMPLOYEE_RANKS[highestRank].short : '—'}`,
    );
    setText(this.shopDays, formatNumber(data.stats.daysCompleted));
    setText(this.shopNodes, formatNumber(data.stats.nodesBroken));
    setText(this.shopChests, formatNumber(data.stats.chestsOpened));
    setText(
      this.shopConnection,
      data.online ? (data.isHost ? 'ANFITRIÓN · SINCRO' : 'CLIENTE · COMPRA VALIDADA') : 'LOCAL',
    );

    renderShopPassives(this.shopPassives, data.loadout);
    renderShopLoadoutSummary(this.shopLoadoutSummary, data.loadout);

    renderShopItems(this.shopContent, data, this.activeShopTab);
    this.updateShopTabState(data);
    const hostControls = !data.online || data.isHost;
    this.shopNext.hidden = !hostControls;
    this.shopWaitHost.hidden = hostControls;
    this.shopNext.disabled = !data.success;
    this.shopNext.textContent = data.victory && !data.infinite
      ? 'ACTIVAR MODO INFINITO'
      : `INICIAR DÍA ${String(data.day + 1).padStart(2, '0')}`;
    this.shopMenu.textContent = data.online ? 'ABANDONAR SALA' : 'ABANDONAR EXPEDIENTE';
    if (!data.success) {
      this.shopNext.hidden = true;
      this.shopWaitHost.hidden = true;
    }
  }

  showPause(online: boolean, isHost: boolean): void {
    setText(
      this.pauseDetail,
      online
        ? isHost
          ? 'La simulación del anfitrión continúa en red. La cuota no se detiene.'
          : 'La simulación compartida sigue activa. Vuelve antes de que cierre el turno.'
        : 'El turno está congelado. Vuelve al túnel cuando estés listo.',
    );
    this.pauseLeave.textContent = online ? 'ABANDONAR SALA' : 'ABANDONAR EXPEDIENTE';
    this.pauseOverlay.hidden = false;
  }

  hidePause(): void {
    this.pauseOverlay.hidden = true;
  }

  showGameOver(data: GameOverViewData): void {
    this.hideShop();
    this.hidePause();
    this.hideMenu();
    this.hideLobby();
    this.gameOverOverlay.hidden = false;
    setText(
      this.gameOverKicker,
      data.victory ? 'EXPEDIENTE DE ÉLITE' : 'OPERACIÓN CLAUSURADA',
    );
    setText(this.gameOverTitle, data.title ?? (data.victory ? 'VICTORIA CORPORATIVA' : 'CUOTA INCUMPLIDA'));
    setText(this.gameOverMessage, data.message);
    setText(required<HTMLElement>('result-days'), formatNumber(data.stats.daysCompleted));
    setText(required<HTMLElement>('result-coal'), `${formatNumber(data.stats.coalMined)} t`);
    setText(required<HTMLElement>('result-money'), formatMoney(data.stats.moneyEarned));
    setText(required<HTMLElement>('result-nodes'), formatNumber(data.stats.nodesBroken));
    this.gameOverAction.textContent = data.victory ? 'VOLVER AL MENÚ' : 'VOLVER AL MENÚ';
  }

  hideGameOver(): void {
    this.gameOverOverlay.hidden = true;
  }

  showNetworkError(message: string): void {
    setText(this.networkMessage, message);
    this.networkOverlay.hidden = false;
  }

  hideNetworkError(): void {
    this.networkOverlay.hidden = true;
  }

  showLoading(text = 'GENERANDO POZO…'): void {
    setText(this.loadingText, text);
    this.loadingOverlay.hidden = false;
  }

  hideLoading(): void {
    this.loadingOverlay.hidden = true;
  }

  getCurrentShop(): ShopViewData | null {
    return this.currentShop;
  }

  getCurrentLobby(): LobbyViewData | null {
    return this.lobbyView.getCurrentLobby();
  }

  markPurchased(itemId: string): void {
    this.purchasedIds.add(itemId);
  }

  isPurchased(itemId: string): boolean {
    return this.purchasedIds.has(itemId);
  }

  clearPurchased(): void {
    this.purchasedIds.clear();
  }

  isAnyShopVisible(): boolean {
    return !this.shopOverlay.hidden;
  }

  isPauseVisible(): boolean {
    return !this.pauseOverlay.hidden;
  }

  dispose(): void {
    window.clearInterval(this.clockTimer);
    document.body.classList.remove('is-ladder-dial');
    this.inventoryView.dispose();
    this.notices.clearFloats();
  }
}
