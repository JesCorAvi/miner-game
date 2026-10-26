import * as THREE from 'three';
import {
  EMPLOYEE_RANKS,
  MINERALS,
  PASSIVES,
  PASSIVE_ORDER,
  magnetRadius,
  maxCarryWeight,
  maxJetpackFuel,
} from '../config';
import type { InventoryItem } from '../core/Inventory';
import type { DayReport, RosterEntry, RunStats, SaveSummary } from '../types';
import { formatDepth, formatMoney, formatNumber, formatPercent, formatTime } from './format';
import { itemIconUrl } from './ItemIcon';
import { InventoryView } from './InventoryView';
import { renderPixelLogo } from './PixelLogo';
import { renderShopItems } from './shopView';
import type { ShopTab, ShopViewData } from './shopView';

export type { ShopViewData } from './shopView';

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
}

export interface HudViewData {
  day: number;
  timeLeft: number;
  quota: number;
  carbon: number;
  money: number;
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
  inventorySlots: Array<InventoryItem | null>;
  inventoryCount: number;
  inventoryOpen: boolean;
  activeHotbarSlot: number;
  ladders: number;
  ladderPlacementEnabled: boolean;
  jetpackUnlocked: boolean;
  prompt: HudPrompt | null;
}

export interface HudPrompt {
  key: string;
  text: string;
}

export type AimKind = 'node' | 'chest' | 'terrain';

export interface AimViewData {
  kind: AimKind;
  title: string;
  status: string;
  detail: string;
  ratio: number;
}

export interface LobbyViewData {
  code: string;
  role: 'host' | 'client';
  roster: RosterEntry[];
  status: string;
  error: string;
  canStart: boolean;
}

export interface GameOverViewData {
  victory: boolean;
  message: string;
  stats: RunStats;
  title?: string;
}

interface FloatingText {
  element: HTMLDivElement;
  position: THREE.Vector3;
  expiresAt: number;
}

type ToastTone = 'info' | 'positive' | 'danger';

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
  private readonly camera: THREE.PerspectiveCamera;
  private readonly menuOverlay = required<HTMLElement>('menu-overlay');
  private readonly lobbyOverlay = required<HTMLElement>('lobby-overlay');
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
  private readonly createRoomButton = required<HTMLButtonElement>('create-room');
  private readonly joinRoomButton = required<HTMLButtonElement>('join-room');
  private readonly joinCodeInput = required<HTMLInputElement>('join-code');
  private readonly menuError = required<HTMLElement>('menu-error');
  private readonly lobbyCode = required<HTMLElement>('lobby-code');
  private readonly lobbyRole = required<HTMLElement>('lobby-role');
  private readonly lobbyStatus = required<HTMLElement>('lobby-status');
  private readonly lobbyCount = required<HTMLElement>('lobby-count');
  private readonly lobbyRoster = required<HTMLElement>('lobby-roster');
  private readonly lobbyError = required<HTMLElement>('lobby-error');
  private readonly lobbyStart = required<HTMLButtonElement>('lobby-start');
  private readonly lobbyLeave = required<HTMLButtonElement>('lobby-leave');
  private readonly lobbyWaiting = required<HTMLElement>('lobby-waiting');
  private readonly copyCodeButton = required<HTMLButtonElement>('copy-code');
  private readonly copyLinkButton = required<HTMLButtonElement>('copy-link');
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
  private readonly daySummaryTitle = required<HTMLElement>('day-summary-title');
  private readonly daySummarySubtitle = required<HTMLElement>('day-summary-subtitle');
  private readonly daySummaryLines = required<HTMLElement>('day-summary-lines');
  private readonly daySummaryCarbon = required<HTMLElement>('day-summary-carbon');
  private readonly daySummaryPerformance = required<HTMLElement>('day-summary-performance');
  private readonly daySummaryBonus = required<HTMLElement>('day-summary-bonus');
  private readonly daySummaryTotal = required<HTMLElement>('day-summary-total');
  private readonly daySummaryMoney = required<HTMLElement>('day-summary-money');
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
  private readonly hudTime = required<HTMLElement>('hud-time');
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
  private readonly cargoCard = required<HTMLElement>('cargo-card');
  private readonly cargoWeight = required<HTMLElement>('hud-cargo-weight');
  private readonly cargoWeightFill = required<HTMLElement>('hud-cargo-weight-fill');
  private readonly cargoHopper = required<HTMLElement>('hud-hopper');
  private readonly jetCard = required<HTMLElement>('jet-card');
  private readonly jetHint = required<HTMLElement>('hud-jet-hint');
  private readonly inventoryView: InventoryView;
  private readonly toastStack = required<HTMLElement>('toast-stack');
  private readonly floatLayer = required<HTMLElement>('float-layer');
  private readonly banner = required<HTMLElement>('hud-banner');
  private readonly bannerKicker = required<HTMLElement>('hud-banner-kicker');
  private readonly bannerText = required<HTMLElement>('hud-banner-text');
  private readonly menuClock = required<HTMLElement>('menu-clock');
  private readonly floats: FloatingText[] = [];
  private bannerTimeout = 0;
  private toastCount = 0;
  private savedTime = -1;
  private purchasedIds = new Set<string>();
  private currentLobby: LobbyViewData | null = null;
  private currentShop: ShopViewData | null = null;
  private readonly clockTimer: number;

  constructor(camera: THREE.PerspectiveCamera, actions: UIActions) {
    this.camera = camera;
    this.actions = actions;
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
    this.lobbyStart.addEventListener('click', () => this.actions.startOnline());
    this.lobbyLeave.addEventListener('click', () => this.actions.leaveLobby());
    this.copyCodeButton.addEventListener('click', () => {
      void this.copyText(this.lobbyCode.textContent ?? '', this.copyCodeButton);
    });
    this.copyLinkButton.addEventListener('click', () => {
      const code = this.lobbyCode.textContent ?? '';
      const url = new URL(window.location.href);
      url.searchParams.set('room', code);
      void this.copyText(url.toString(), this.copyLinkButton);
    });
    required<HTMLButtonElement>('pause-resume').addEventListener('click', () => this.actions.resumeGame());
    this.pauseLeave.addEventListener('click', () => this.actions.leaveGame());
    this.shopNext.addEventListener('click', () => this.actions.nextDay());
    this.shopMenu.addEventListener('click', () => this.actions.leaveGame());
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
    const protocol = window.location.protocol;
    this.copyLinkButton.hidden = protocol !== 'http:' && protocol !== 'https:';
  }

  private updateClock(): void {
    const now = new Date();
    setText(
      this.menuClock,
      `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
    );
  }

  private async copyText(text: string, button: HTMLButtonElement): Promise<void> {
    const oldLabel = button.textContent ?? '';
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'COPIADO';
    } catch {
      button.textContent = text;
    }
    window.setTimeout(() => {
      button.textContent = oldLabel;
    }, 1400);
  }

  getPlayerName(): string {
    const name = this.playerNameInput.value.trim().replace(/\s+/g, ' ').slice(0, 16);
    return name || 'Operario';
  }

  setPlayerName(name: string): void {
    this.playerNameInput.value = name;
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
    this.lobbyOverlay.hidden = false;
    this.currentLobby = data;
    this.renderLobby(data);
  }

  updateLobby(data: LobbyViewData): void {
    this.currentLobby = data;
    this.lobbyOverlay.hidden = false;
    this.renderLobby(data);
  }

  private renderLobby(data: LobbyViewData): void {
    setText(this.lobbyCode, data.code || '------');
    setText(this.lobbyRole, data.role === 'host' ? 'ANFITRIÓN' : 'CLIENTE');
    setText(this.lobbyStatus, data.status);
    this.lobbyStatus.classList.toggle('is-error', Boolean(data.error));
    setText(this.lobbyError, data.error);
    setText(this.lobbyCount, `${data.roster.length}/4`);
    this.lobbyRoster.replaceChildren();
    for (const entry of data.roster) {
      const row = document.createElement('div');
      row.className = 'roster-entry';
      const swatch = document.createElement('span');
      swatch.className = 'roster-swatch';
      swatch.style.setProperty('--slot-color', this.rosterColor(entry.color));
      const name = document.createElement('span');
      name.className = 'roster-name';
      name.textContent = entry.name;
      const tag = document.createElement('span');
      tag.className = 'roster-tag';
      tag.textContent = entry.isHost ? 'HOST' : 'OPERARIO';
      row.append(swatch, name, tag);
      this.lobbyRoster.appendChild(row);
    }
    const host = data.role === 'host';
    this.lobbyStart.hidden = !host;
    this.lobbyWaiting.hidden = host;
    this.lobbyStart.disabled = !data.canStart;
    this.lobbyStart.textContent = data.canStart ? 'INICIAR TURNO' : 'SIN CONEXIONES';
  }

  private rosterColor(index: number): string {
    return ['#e6a449', '#6fdcd2', '#c8a8ff', '#ff8065'][index % 4];
  }

  hideLobby(): void {
    this.lobbyOverlay.hidden = true;
    this.currentLobby = null;
  }

  setLobbyStatus(status: string, error = ''): void {
    if (!this.currentLobby) {
      return;
    }
    this.currentLobby = { ...this.currentLobby, status, error };
    this.renderLobby(this.currentLobby);
  }

  showHud(): void {
    this.hud.classList.remove('is-hidden');
  }

  hideHud(): void {
    this.hud.classList.add('is-hidden');
  }

  updateHud(data: HudViewData): void {
    setText(this.hudDay, `DÍA ${String(data.day).padStart(2, '0')}`);
    setText(this.hudTime, formatTime(data.timeLeft));
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
      setText(this.jetHint, 'SE DESBLOQUEA EN LA OFICINA NOCTURNA');
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
    setText(
      this.cargoWeight,
      `PESO: ${data.cargoWeight.toFixed(1)} / ${formatNumber(data.maxCargoWeight)} kg`,
    );
    this.cargoCard.classList.toggle(
      'is-overloaded',
      data.cargoWeight >= data.maxCargoWeight,
    );
    this.cargoWeightFill.style.width = `${Math.min(
      100,
      (data.cargoWeight / Math.max(1, data.maxCargoWeight)) * 100,
    )}%`;
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
      this.crosshair.classList.remove('is-target', 'is-chest');
      return;
    }
    this.aimPanel.hidden = false;
    this.aimPanel.classList.toggle('is-chest', aim.kind === 'chest');
    this.aimPanel.classList.toggle('is-terrain', aim.kind === 'terrain');
    this.crosshair.classList.toggle('is-target', aim.kind !== 'terrain');
    this.crosshair.classList.toggle('is-chest', aim.kind === 'chest');
    setText(this.aimType, aim.title);
    setText(this.aimStatus, aim.status);
    setText(this.aimDetail, aim.detail);
    this.aimFill.style.width = `${Math.max(0, Math.min(1, aim.ratio)) * 100}%`;
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
    const toast = document.createElement('div');
    toast.className = `toast${tone === 'positive' ? ' is-positive' : tone === 'danger' ? ' is-danger' : ''}`;
    toast.textContent = message;
    this.toastStack.appendChild(toast);
    this.toastCount += 1;
    while (this.toastStack.children.length > 4) {
      this.toastStack.firstElementChild?.remove();
    }
    window.setTimeout(() => {
      toast.classList.add('is-leaving');
      window.setTimeout(() => {
        toast.remove();
        this.toastCount = Math.max(0, this.toastCount - 1);
      }, 220);
    }, 3400);
  }

  showBanner(kicker: string, text: string, duration = 2200): void {
    setText(this.bannerKicker, kicker);
    setText(this.bannerText, text);
    this.banner.hidden = false;
    this.banner.style.animation = 'none';
    void this.banner.offsetHeight;
    this.banner.style.animation = '';
    window.clearTimeout(this.bannerTimeout);
    this.bannerTimeout = window.setTimeout(() => {
      this.banner.hidden = true;
    }, duration);
  }

  spawnFloat(position: THREE.Vector3, text: string, tone: 'amber' | 'positive' | 'cyan' = 'amber'): void {
    if (this.floats.length >= 14) {
      const oldest = this.floats.shift();
      oldest?.element.remove();
    }
    const element = document.createElement('div');
    element.className = `float-text${tone === 'positive' ? ' is-positive' : tone === 'cyan' ? ' is-cyan' : ''}`;
    element.textContent = text;
    this.floatLayer.appendChild(element);
    this.floats.push({
      element,
      position: position.clone(),
      expiresAt: performance.now() + 1500,
    });
  }

  updateFloats(): void {
    const now = performance.now();
    for (let index = this.floats.length - 1; index >= 0; index -= 1) {
      const item = this.floats[index];
      if (now > item.expiresAt) {
        item.element.remove();
        this.floats.splice(index, 1);
        continue;
      }
      const projected = item.position.clone().project(this.camera);
      const visible =
        projected.z > -1 &&
        projected.z < 1 &&
        Math.abs(projected.x) < 1.2 &&
        Math.abs(projected.y) < 1.2;
      if (!visible) {
        item.element.style.display = 'none';
        continue;
      }
      item.element.style.display = '';
      item.element.style.left = `${(projected.x * 0.5 + 0.5) * window.innerWidth}px`;
      item.element.style.top = `${(-projected.y * 0.5 + 0.5) * window.innerHeight}px`;
    }
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
  }

  private renderDaySummary(report: DayReport): void {
    setText(
      this.daySummaryTitle,
      `DÍA ${String(report.day).padStart(2, '0')} COMPLETADO`,
    );
    const success = report.carbon >= report.quota;
    setText(
      this.daySummarySubtitle,
      success
        ? report.carbon > report.quota
          ? `Cuota superada por ${formatNumber(report.carbon - report.quota)} t. La junta mejora el bonus por rendimiento.`
          : 'Cuota cubierta al cierre del turno. La oficina nocturna ya está abierta.'
        : 'La cuota no se ha cubierto. El expediente queda pendiente de revisión.',
    );
    this.daySummaryLines.replaceChildren();

    const coalLines = report.lines.filter((line) => line.carbon > 0);
    const coalTotal = coalLines.reduce((total, line) => total + line.carbon, 0);
    if (coalTotal > 0) {
      const row = document.createElement('div');
      row.className = 'summary-line is-quota';
      const icon = document.createElement('span');
      icon.className = 'summary-line-icon';
      icon.style.backgroundImage = `url("${itemIconUrl({ kind: 'mineral', mineral: 'coal' })}")`;
      const label = document.createElement('span');
      label.className = 'summary-line-label';
      label.textContent = 'CARBÓN ENTREGADO A CUOTA';
      const amount = document.createElement('strong');
      amount.className = 'summary-line-amount';
      amount.textContent = `${formatNumber(coalTotal)} t`;
      row.append(icon, label, amount);
      this.daySummaryLines.appendChild(row);
    }

    for (const line of report.lines) {
      if (line.money <= 0) {
        continue;
      }
      const row = document.createElement('div');
      row.className = 'summary-line';
      const icon = document.createElement('span');
      icon.className = 'summary-line-icon';
      icon.style.backgroundImage = `url("${itemIconUrl({ kind: 'mineral', mineral: line.mineral })}")`;
      const label = document.createElement('span');
      label.className = 'summary-line-label';
      label.textContent = `${MINERALS[line.mineral].name.toUpperCase()} ×${formatNumber(line.count)}`;
      const amount = document.createElement('strong');
      amount.className = 'summary-line-amount';
      amount.textContent = formatMoney(line.money);
      row.append(icon, label, amount);
      this.daySummaryLines.appendChild(row);
    }

    if (report.otherValue > 0) {
      const row = document.createElement('div');
      row.className = 'summary-line is-text-only';
      const label = document.createElement('span');
      label.className = 'summary-line-label';
      label.textContent = 'MINERALES VARIOS';
      const amount = document.createElement('strong');
      amount.className = 'summary-line-amount';
      amount.textContent = formatMoney(report.otherValue);
      row.append(label, amount);
      this.daySummaryLines.appendChild(row);
    }

    if (report.oreValue <= 0 && report.otherValue <= 0) {
      const empty = document.createElement('p');
      empty.className = 'summary-empty';
      empty.textContent = 'No se vendieron minerales este turno. El carbón ha ido íntegro a la cuota.';
      this.daySummaryLines.appendChild(empty);
    }

    const bonusRow = document.createElement('div');
    bonusRow.className = 'summary-line is-bonus is-text-only';
    const bonusLabel = document.createElement('span');
    bonusLabel.className = 'summary-line-label';
    bonusLabel.textContent = `BONUS DE RENDIMIENTO · ${formatPercent(report.performance)}`;
    const bonusAmount = document.createElement('strong');
    bonusAmount.className = 'summary-line-amount';
    bonusAmount.textContent = `+${formatMoney(report.bonus)}`;
    bonusRow.append(bonusLabel, bonusAmount);
    this.daySummaryLines.appendChild(bonusRow);

    const totalRow = document.createElement('div');
    totalRow.className = 'summary-line is-total is-text-only';
    const totalLabel = document.createElement('span');
    totalLabel.className = 'summary-line-label';
    totalLabel.textContent = 'TOTAL DEL TURNO';
    const totalAmount = document.createElement('strong');
    totalAmount.className = 'summary-line-amount';
    totalAmount.textContent = formatMoney(report.total);
    totalRow.append(totalLabel, totalAmount);
    this.daySummaryLines.appendChild(totalRow);

    setText(
      this.daySummaryCarbon,
      `${formatNumber(report.carbon)} / ${formatNumber(report.quota)} t`,
    );
    setText(this.daySummaryPerformance, formatPercent(report.performance));
    setText(this.daySummaryBonus, formatMoney(report.bonus));
    setText(this.daySummaryTotal, formatMoney(report.total));
    setText(this.daySummaryMoney, formatMoney(report.money));
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

    this.shopPassives.replaceChildren();
    for (const passive of PASSIVE_ORDER) {
      const level = data.loadout.passives[passive];
      const row = document.createElement('div');
      row.className = 'passive-entry';
      row.style.setProperty('--passive-color', PASSIVES[passive].color);
      const name = document.createElement('strong');
      name.textContent = PASSIVES[passive].name;
      const value = document.createElement('span');
      value.textContent = level > 0 ? `NV ${level}` : '—';
      row.append(name, value);
      this.shopPassives.appendChild(row);
    }

    const loadout = data.loadout;
    const summaryLines = [
      `DAÑO VETAS: +${Math.round(loadout.upgrades.damage * 12)}%`,
      `CADENCIA: +${Math.round(loadout.upgrades.speed * 6)}%`,
      `IMÁN: ${magnetRadius(loadout).toFixed(1)} m`,
      `JETPACK: ${loadout.upgrades.jetpack > 0 ? `${Math.round(maxJetpackFuel(loadout))} u.` : 'BLOQUEADO'}`,
      `CAPACIDAD: ${maxCarryWeight(loadout)} kg`,
      `ESCALERAS: ${loadout.ladders}`,
      `TURNO BASE: ${90 + loadout.upgrades.dayTime * 15} s`,
      `EMPLEADOS: ${loadout.employees.roster.length} en plantilla`,
    ];
    this.shopLoadoutSummary.replaceChildren();
    for (const line of summaryLines) {
      const span = document.createElement('span');
      span.textContent = line;
      this.shopLoadoutSummary.appendChild(span);
    }

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
    return this.currentLobby;
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
    window.clearTimeout(this.bannerTimeout);
    this.inventoryView.dispose();
    for (const item of this.floats) {
      item.element.remove();
    }
    this.floats.length = 0;
  }
}
