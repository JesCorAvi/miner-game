import { GRENADE_TIERS, UPGRADES, WEAPONS } from '../config';
import type {
  GrenadeTierId,
  Loadout,
  RunStats,
  ShopItemView,
  UpgradeId,
  WeaponId,
} from '../types';
import { formatMoney } from './format';
import { itemIconUrl, type ItemIconKind } from './ItemIcon';

export interface ShopViewData {
  success: boolean;
  victory: boolean;
  infinite: boolean;
  day: number;
  carbon: number;
  quota: number;
  nextQuota: number;
  money: number;
  loadout: Loadout;
  stats: RunStats;
  items: ShopItemView[];
  canPurchase: boolean;
  isHost: boolean;
  online: boolean;
}

export type ShopTab = 'employees' | 'equipment' | 'bonuses' | 'inventory';

const TAB_META: Record<Exclude<ShopTab, 'inventory'>, { title: string; note: string }> = {
  employees: {
    title: 'ORGANIGRAMA DE PLANTILLA',
    note: 'Contrata becarios, asciende rangos y reconvierte mineros en recolectores.',
  },
  equipment: {
    title: 'EQUIPO DE EXTRACCIÓN',
    note: 'Herramientas permanentes, escaleras y cargas de ruptura.',
  },
  bonuses: {
    title: 'MEJORAS DE OPERARIO',
    note: 'Sistemas pasivos que afectan a todo el escuadrón.',
  },
};

function iconForItem(item: ShopItemView): ItemIconKind | null {
  const separator = item.id.indexOf(':');
  const key = separator >= 0 ? item.id.slice(separator + 1) : '';
  if (item.kind === 'weapon') {
    return { kind: 'tool', weapon: key as WeaponId };
  }
  if (item.kind === 'supply') {
    return { kind: 'ladder' };
  }
  if (item.kind === 'grenade') {
    return { kind: 'grenade', tier: key as GrenadeTierId };
  }
  if (item.kind === 'upgrade') {
    return { kind: 'upgrade', upgrade: key as UpgradeId };
  }
  if (item.kind.startsWith('employee')) {
    return {
      kind: 'employee',
      role: item.kind === 'employee_convert' ? 'collector' : 'miner',
    };
  }
  return null;
}

function itemKindLabel(item: ShopItemView): string {
  switch (item.kind) {
    case 'weapon':
      return 'HERRAMIENTA';
    case 'upgrade':
      return 'SISTEMA';
    case 'supply':
      return 'SUMINISTRO';
    case 'grenade':
      return 'EXPLOSIVO';
    case 'employee_hire':
      return 'CONTRATACIÓN';
    case 'employee_convert':
      return 'RECONVERSIÓN';
    case 'employee_rank':
      return 'ASCENSO';
  }
}

export function renderShopItems(
  container: HTMLElement,
  data: ShopViewData,
  tab: ShopTab = 'equipment',
): void {
  container.replaceChildren();
  if (tab === 'inventory') {
    renderInventoryTab(container, data);
    return;
  }
  const meta = TAB_META[tab];
  const items = data.items.filter((item) => {
    if (tab === 'employees') {
      return item.kind.startsWith('employee');
    }
    if (tab === 'equipment') {
      return item.kind === 'weapon' || item.kind === 'supply' || item.kind === 'grenade';
    }
    return item.kind === 'upgrade';
  });
  const section = document.createElement('section');
  section.className = 'shop-section shop-section-tab';
  const head = document.createElement('div');
  head.className = 'shop-section-head';
  const title = document.createElement('h3');
  title.textContent = meta.title;
  const note = document.createElement('span');
  note.textContent = meta.note;
  head.append(title, note);
  const grid = document.createElement('div');
  grid.className = 'shop-grid shop-grid-tab';
  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'shop-empty';
    empty.textContent = 'No hay artículos disponibles en esta sección.';
    grid.appendChild(empty);
  } else {
    for (const item of items) {
      grid.appendChild(makeShopCard(item, data));
    }
  }
  section.append(head, grid);
  container.appendChild(section);
}

export function makeShopCard(item: ShopItemView, data: ShopViewData): HTMLElement {
  const card = document.createElement('article');
  card.className = `shop-card${item.owned ? ' is-owned' : ''}${item.maxed ? ' is-maxed' : ''}${
    !item.affordable && !item.owned && !item.maxed ? ' is-expensive' : ''
  }`;
  const top = document.createElement('div');
  top.className = 'shop-card-top';
  const icon = document.createElement('span');
  icon.className = 'shop-card-icon';
  const iconKind = iconForItem(item);
  if (iconKind) {
    icon.style.backgroundImage = `url("${itemIconUrl(iconKind)}")`;
  }
  const cost = document.createElement('span');
  cost.className = 'shop-card-price';
  cost.textContent =
    item.maxed || item.owned
      ? item.owned
        ? 'EQUIPADO'
        : 'MÁXIMO'
      : formatMoney(item.cost);
  top.append(icon, cost);

  const kind = document.createElement('span');
  kind.className = 'shop-card-kind';
  kind.textContent = itemKindLabel(item);
  const title = document.createElement('h4');
  title.className = 'shop-card-title';
  title.textContent = item.title;
  const desc = document.createElement('p');
  desc.className = 'shop-card-desc';
  desc.textContent = item.description;
  const footer = document.createElement('div');
  footer.className = 'shop-card-footer';
  const level = document.createElement('span');
  level.className = 'shop-card-level';
  level.textContent = item.level;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button small';
  button.dataset.itemId = item.id;
  button.textContent = item.maxed
    ? 'AL MÁXIMO'
    : item.owned
      ? 'ADQUIRIDO'
      : item.affordable
        ? 'COMPRAR'
        : 'FONDOS INSUFICIENTES';
  button.disabled =
    item.owned || item.maxed || !data.canPurchase || !item.affordable;
  footer.append(level, button);
  card.append(top, kind, title, desc, footer);
  return card;
}

function inventoryCard(
  iconKind: ItemIconKind,
  title: string,
  detail: string,
  badge: string,
): HTMLElement {
  const card = document.createElement('article');
  card.className = 'shop-card inventory-card';
  const top = document.createElement('div');
  top.className = 'shop-card-top';
  const icon = document.createElement('span');
  icon.className = 'shop-card-icon';
  icon.style.backgroundImage = `url("${itemIconUrl(iconKind)}")`;
  const badgeElement = document.createElement('span');
  badgeElement.className = 'shop-card-price';
  badgeElement.textContent = badge;
  top.append(icon, badgeElement);
  const heading = document.createElement('h4');
  heading.className = 'shop-card-title';
  heading.textContent = title;
  const description = document.createElement('p');
  description.className = 'shop-card-desc';
  description.textContent = detail;
  card.append(top, heading, description);
  return card;
}

function renderInventoryTab(container: HTMLElement, data: ShopViewData): void {
  const section = document.createElement('section');
  section.className = 'shop-section shop-section-tab';
  const head = document.createElement('div');
  head.className = 'shop-section-head';
  const title = document.createElement('h3');
  title.textContent = 'INVENTARIO PERMANENTE';
  const note = document.createElement('span');
  note.textContent = 'Equipo que conservas al cambiar de día.';
  head.append(title, note);
  const grid = document.createElement('div');
  grid.className = 'shop-grid shop-grid-tab';
  const loadout = data.loadout;

  for (const weapon of Object.keys(WEAPONS) as WeaponId[]) {
    if (!loadout.weapons[weapon]) {
      continue;
    }
    const definition = WEAPONS[weapon];
    grid.appendChild(
      inventoryCard(
        { kind: 'tool', weapon },
        definition.name,
        definition.description,
        'EQUIPADA',
      ),
    );
  }
  if (loadout.ladders > 0) {
    grid.appendChild(
      inventoryCard(
        { kind: 'ladder' },
        'Escaleras de pared',
        'Selecciona su casilla en la hotbar y colócalas con E sobre una pared o el suelo.',
        `×${loadout.ladders}`,
      ),
    );
  }
  for (const tier of Object.keys(GRENADE_TIERS) as GrenadeTierId[]) {
    const count = loadout.grenades[tier] ?? 0;
    if (count <= 0) {
      continue;
    }
    const definition = GRENADE_TIERS[tier];
    grid.appendChild(
      inventoryCard(
        { kind: 'grenade', tier },
        definition.name,
        definition.description,
        `×${count}`,
      ),
    );
  }
  for (const upgrade of Object.keys(UPGRADES) as UpgradeId[]) {
    const level = loadout.upgrades[upgrade];
    const definition = UPGRADES[upgrade];
    grid.appendChild(
      inventoryCard(
        { kind: 'upgrade', upgrade },
        definition.name,
        definition.description,
        `NV ${level} / ${definition.max}`,
      ),
    );
  }
  if (grid.childElementCount === 0) {
    const empty = document.createElement('p');
    empty.className = 'shop-empty';
    empty.textContent = 'Sin equipo permanente. Compra en Equipo o Mejoras.';
    grid.appendChild(empty);
  }
  section.append(head, grid);
  container.appendChild(section);
}
