import {
  GRENADE_AREA_RADIUS,
  GRENADE_STACK_MAX,
  GRENADE_TIERS,
  HOTBAR_SLOTS,
  INVENTORY_SLOTS,
  LADDER_STACK_MAX,
  MAX_STACK,
  MINERALS,
  WEAPONS,
} from '../config';
import type { InventoryItem } from '../core/Inventory';
import type { GrenadeTierId, MineralId, WeaponId } from '../types';
import { formatMoney, formatNumber } from './format';
import { cssHex } from './MineralIcon';
import { itemIconUrl, type ItemIconKind } from './ItemIcon';

interface SlotDom {
  root: HTMLElement;
  icon: HTMLElement;
  count: HTMLElement;
}

interface InventoryViewActions {
  moveItem: (from: number, to: number) => void;
  selectHotbar: (index: number) => void;
}

const TOOL_GLOWS: Record<WeaponId, number> = {
  pickaxe: 0xffc66f,
  tesla: 0x79e9e0,
  drill: 0xffb45c,
  shotgun: 0xc6d3cd,
};

const LADDER_GLOW = 0xdca64c;

function iconKind(item: InventoryItem): ItemIconKind {
  if (item.kind === 'tool') {
    return { kind: 'tool', weapon: item.weapon };
  }
  if (item.kind === 'grenade') {
    return { kind: 'grenade', tier: item.tier };
  }
  if (item.kind === 'ladder') {
    return { kind: 'ladder' };
  }
  if (item.kind === 'winch') {
    return { kind: 'winch' };
  }
  if (item.kind === 'field_depot') {
    return { kind: 'field_depot' };
  }
  if (item.kind === 'beacon') {
    return { kind: 'beacon' };
  }
  return { kind: 'mineral', mineral: item.mineral };
}

function glowFor(item: InventoryItem): number {
  if (item.kind === 'mineral') {
    return MINERALS[item.mineral].glow;
  }
  if (item.kind === 'tool') {
    return TOOL_GLOWS[item.weapon];
  }
  if (item.kind === 'grenade') {
    return GRENADE_TIERS[item.tier].glow;
  }
  if (item.kind === 'winch') return 0x94a3b8;
  if (item.kind === 'field_depot') return 0xf59e0b;
  if (item.kind === 'beacon') return 0x38bdf8;
  return LADDER_GLOW;
}

function itemKey(item: InventoryItem): string {
  if (item.kind === 'mineral') {
    return `mineral-${item.mineral}`;
  }
  if (item.kind === 'tool') {
    return `tool-${item.weapon}`;
  }
  if (item.kind === 'grenade') {
    return `grenade-${item.tier}`;
  }
  if (item.kind === 'winch') return 'winch';
  if (item.kind === 'field_depot') return 'field_depot';
  if (item.kind === 'beacon') return 'beacon';
  return 'ladder';
}

function itemCount(item: InventoryItem): number {
  return item.kind === 'tool' ? 0 : item.count;
}

function maxFor(item: InventoryItem, mineralLimit: number): number {
  if (item.kind === 'mineral') {
    return mineralLimit;
  }
  if (item.kind === 'grenade') {
    return GRENADE_STACK_MAX;
  }
  if (item.kind === 'ladder') {
    return LADDER_STACK_MAX;
  }
  if (item.kind === 'winch' || item.kind === 'field_depot' || item.kind === 'beacon') {
    return 99;
  }
  return 1;
}

function tooltipFor(item: InventoryItem, mineralLimit: number): string {
  if (item.kind === 'mineral') {
    const mineral = MINERALS[item.mineral];
    const valueParts = [
      item.carbon > 0 ? `${formatNumber(item.carbon)} t de carbón` : null,
      item.money > 0 ? formatMoney(item.money) : null,
    ].filter((part): part is string => part !== null);
    const value = valueParts.length > 0 ? valueParts.join(' · ') : 'sin valor';
    return `${mineral.name} ×${item.count} / ${mineralLimit}\nPeso del stack: ${item.weight.toFixed(1)} kg\nValor: ${value}`;
  }
  if (item.kind === 'tool') {
    const weapon = WEAPONS[item.weapon];
    return `${weapon.name}\nHerramienta equipable\n${weapon.description}`;
  }
  if (item.kind === 'ladder') {
    return `Escaleras de pared ×${item.count}\nSelecciona su casilla y pulsa E sobre una pared o el suelo.\nR alterna escalera/puente; G muestra u oculta el fantasma.`;
  }
  if (item.kind === 'winch') {
    return `Cabria de contrapeso ×${item.count}\nInstalación vertical rápida. Sube/baja a 8 m/s.\nSelecciona esta casilla y haz clic para instalar en un borde o pared con tiro despejado.`;
  }
  if (item.kind === 'field_depot') {
    return `Tolva de campaña ×${item.count}\nPunto de acopio temporal (30% de carga de mochila).\nSelecciona esta casilla y haz clic para instalar en suelo firme.`;
  }
  if (item.kind === 'beacon') {
    return `Baliza de ruta ×${item.count}\nSeñal luminosa para marcar galerías. Visible en mapa (C).\nSelecciona esta casilla y haz clic o pulsa Q para colocar.`;
  }
  const grenade = GRENADE_TIERS[item.tier];
  return `${grenade.name} ×${item.count}\nÁrea de explosión: ${GRENADE_AREA_RADIUS.toFixed(1)} m\nRompe hasta la capa ${grenade.maxLayer}\nSelecciona esta casilla y haz clic para lanzar.`;
}

export class InventoryView {
  private readonly hotbar: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly weightLabel: HTMLElement;
  private stackLimit = MAX_STACK;
  private readonly summaryLabel: HTMLElement;
  private readonly actions: InventoryViewActions;
  private readonly hotSlots: SlotDom[] = [];
  private readonly gridSlots: SlotDom[] = [];
  private readonly lastCounts = new Array<number>(INVENTORY_SLOTS).fill(0);
  private readonly lastKeys = new Array<string | null>(INVENTORY_SLOTS).fill(null);
  private dumpTimer = 0;

  constructor(
    hotbar: HTMLElement,
    panel: HTMLElement,
    grid: HTMLElement,
    weightLabel: HTMLElement,
    summaryLabel: HTMLElement,
    actions: InventoryViewActions,
  ) {
    this.hotbar = hotbar;
    this.panel = panel;
    this.weightLabel = weightLabel;
    this.summaryLabel = summaryLabel;
    this.actions = actions;
    for (let index = 0; index < HOTBAR_SLOTS; index += 1) {
      const slot = this.makeSlot(index, index + 1);
      this.hotSlots.push(slot);
      hotbar.appendChild(slot.root);
    }
    for (let index = 0; index < INVENTORY_SLOTS; index += 1) {
      const slot = this.makeSlot(index, index < HOTBAR_SLOTS ? index + 1 : 0);
      this.gridSlots.push(slot);
      grid.appendChild(slot.root);
    }
  }

  setOpen(open: boolean): void {
    this.panel.hidden = !open;
    this.panel.classList.toggle('is-open', open);
  }

  render(
    slots: Array<InventoryItem | null>,
    activeHotbarSlot: number,
    weight: number,
    maxWeight: number,
    mineralStackLimit: number,
    fragmentCount: number,
    carbon: number,
    money: number,
  ): void {
    this.stackLimit = mineralStackLimit;
    this.weightLabel.textContent = `PESO: ${weight.toFixed(1)} / ${formatNumber(maxWeight)} kg`;
    this.summaryLabel.textContent = `PIEZAS: ${formatNumber(fragmentCount)} · ${formatNumber(carbon)} t · ${formatMoney(money)}`;
    for (let index = 0; index < INVENTORY_SLOTS; index += 1) {
      const item = slots[index] ?? null;
      const gridSlot = this.gridSlots[index];
      const key = item ? itemKey(item) : null;
      const previousKey = this.lastKeys[index];
      const count = item ? itemCount(item) : 0;
      const isActive = index === activeHotbarSlot;
      this.updateSlot(gridSlot, item, isActive);
      if (index < this.hotSlots.length) {
        this.updateSlot(this.hotSlots[index], item, isActive);
      }
      if (item && (key !== previousKey || count > this.lastCounts[index])) {
        this.pulse(gridSlot, item);
        if (index < this.hotSlots.length) {
          this.pulse(this.hotSlots[index], item);
        }
      }
      this.lastCounts[index] = count;
      this.lastKeys[index] = key;
    }
  }

  flashDump(): void {
    window.clearTimeout(this.dumpTimer);
    this.hotbar.classList.remove('is-dumping');
    this.panel.classList.remove('is-dumping');
    void this.hotbar.offsetWidth;
    this.hotbar.classList.add('is-dumping');
    this.panel.classList.add('is-dumping');
    this.dumpTimer = window.setTimeout(() => {
      this.hotbar.classList.remove('is-dumping');
      this.panel.classList.remove('is-dumping');
    }, 340);
  }

  dispose(): void {
    window.clearTimeout(this.dumpTimer);
  }

  private makeSlot(index: number, hotbarNumber: number): SlotDom {
    const root = document.createElement('div');
    root.className = 'inventory-slot is-empty';
    root.dataset.slot = String(index);
    root.draggable = false;
    const key = document.createElement('span');
    key.className = 'inventory-slot-key';
    key.textContent = hotbarNumber > 0 ? String(hotbarNumber) : '';
    const icon = document.createElement('span');
    icon.className = 'inventory-slot-icon';
    const count = document.createElement('span');
    count.className = 'inventory-slot-count';
    root.append(key, icon, count);

    root.addEventListener('dragstart', (event) => {
      if (!root.draggable) {
        event.preventDefault();
        return;
      }
      event.dataTransfer?.setData('text/plain', String(index));
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
      }
      root.classList.add('is-dragging');
    });
    root.addEventListener('dragend', () => {
      root.classList.remove('is-dragging');
      for (const slot of [...this.hotSlots, ...this.gridSlots]) {
        slot.root.classList.remove('is-drop-target');
      }
    });
    root.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      root.classList.add('is-drop-target');
    });
    root.addEventListener('dragleave', () => {
      root.classList.remove('is-drop-target');
    });
    root.addEventListener('drop', (event) => {
      event.preventDefault();
      root.classList.remove('is-drop-target');
      const source = Number(event.dataTransfer?.getData('text/plain'));
      if (Number.isInteger(source) && source >= 0) {
        this.actions.moveItem(source, index);
      }
    });
    root.addEventListener('click', () => {
      if (index < HOTBAR_SLOTS) {
        this.actions.selectHotbar(index);
      }
    });
    return { root, icon, count };
  }

  private updateSlot(dom: SlotDom, item: InventoryItem | null, isActive: boolean): void {
    dom.root.classList.toggle('is-active', isActive);
    if (!item) {
      dom.root.classList.add('is-empty');
      dom.root.classList.remove('is-full', 'is-tool');
      dom.root.style.removeProperty('--slot-color');
      dom.root.style.removeProperty('--slot-glow');
      dom.icon.style.backgroundImage = '';
      dom.count.textContent = '';
      dom.root.draggable = false;
      dom.root.removeAttribute('title');
      dom.root.removeAttribute('data-tooltip');
      dom.root.removeAttribute('aria-label');
      return;
    }
    const tooltip = tooltipFor(item, this.stackLimit);
    const glow = cssHex(glowFor(item));
    dom.root.classList.remove('is-empty');
    dom.root.classList.toggle('is-tool', item.kind === 'tool');
    dom.root.classList.toggle(
      'is-full',
      item.kind !== 'tool' && itemCount(item) >= maxFor(item, this.stackLimit),
    );
    dom.root.style.setProperty('--slot-color', glow);
    dom.root.style.setProperty('--slot-glow', glow);
    dom.icon.style.backgroundImage = `url("${itemIconUrl(iconKind(item))}")`;
    dom.count.textContent = item.kind === 'tool' ? '' : `x${itemCount(item)}`;
    dom.root.draggable = true;
    dom.root.title = tooltip;
    dom.root.dataset.tooltip = tooltip;
    dom.root.setAttribute('aria-label', tooltip.replace(/\n/g, ' · '));
  }

  private pulse(dom: SlotDom, item: InventoryItem): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const glow = cssHex(glowFor(item));
    dom.root.animate(
      [
        { transform: 'scale(1)', boxShadow: '0 0 0 rgba(0,0,0,0)' },
        {
          transform: 'scale(1.16)',
          boxShadow: `0 0 16px ${glow}`,
          offset: 0.38,
        },
        { transform: 'scale(1)', boxShadow: '0 0 0 rgba(0,0,0,0)' },
      ],
      { duration: 240, easing: 'cubic-bezier(0.22, 0.9, 0.3, 1.2)' },
    );
  }
}

export type { InventoryItem };
export type { MineralId, GrenadeTierId, WeaponId };
