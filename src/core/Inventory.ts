import {
  GRENADE_STACK_MAX,
  HOTBAR_SLOTS,
  INVENTORY_SLOTS,
  LADDER_STACK_MAX,
  MAX_STACK,
  maxStackFor,
} from '../config';
import type {
  DaySaleLine,
  GrenadeTierId,
  Loadout,
  MineralId,
  WeaponId,
} from '../types';

export interface MineralStack {
  kind: 'mineral';
  mineral: MineralId;
  count: number;
  carbon: number;
  money: number;
  weight: number;
}

export interface ToolStack {
  kind: 'tool';
  weapon: WeaponId;
}

export interface GrenadeStack {
  kind: 'grenade';
  tier: GrenadeTierId;
  count: number;
}

export interface LadderStack {
  kind: 'ladder';
  count: number;
}

export interface WinchStack {
  kind: 'winch';
  count: number;
}

export interface FieldDepotStack {
  kind: 'field_depot';
  count: number;
}

export interface BeaconStack {
  kind: 'beacon';
  count: number;
}

export type InventoryItem =
  | MineralStack
  | ToolStack
  | GrenadeStack
  | LadderStack
  | WinchStack
  | FieldDepotStack
  | BeaconStack;

export interface InventoryAddResult {
  accepted: boolean;
  slot: number;
  full: boolean;
}

function maxStack(item: InventoryItem, mineralLimit = MAX_STACK): number {
  switch (item.kind) {
    case 'mineral':
      return mineralLimit;
    case 'grenade':
      return GRENADE_STACK_MAX;
    case 'ladder':
      return LADDER_STACK_MAX;
    case 'winch':
    case 'field_depot':
    case 'beacon':
      return 99;
    case 'tool':
      return 1;
  }
}

function sameStack(a: InventoryItem, b: InventoryItem): boolean {
  if (a.kind === 'mineral' && b.kind === 'mineral') {
    return a.mineral === b.mineral;
  }
  if (a.kind === 'grenade' && b.kind === 'grenade') {
    return a.tier === b.tier;
  }
  if (a.kind === 'ladder' && b.kind === 'ladder') return true;
  if (a.kind === 'winch' && b.kind === 'winch') return true;
  if (a.kind === 'field_depot' && b.kind === 'field_depot') return true;
  if (a.kind === 'beacon' && b.kind === 'beacon') return true;
  return false;
}

function itemCount(item: InventoryItem): number {
  return item.kind === 'tool' ? 1 : item.count;
}

export class Inventory {
  private mineralStackLimit = MAX_STACK;

  readonly slots: Array<InventoryItem | null> = Array.from(
    { length: INVENTORY_SLOTS },
    () => null,
  );

  addMineral(
    mineral: MineralId,
    carbon: number,
    money: number,
    weight: number,
  ): InventoryAddResult {
    const existing = this.slots.findIndex(
      (item) =>
        item?.kind === 'mineral' &&
        item.mineral === mineral &&
        item.count < this.mineralStackLimit,
    );
    if (existing >= 0) {
      const item = this.slots[existing];
      if (item?.kind !== 'mineral') {
        return { accepted: false, slot: -1, full: true };
      }
      item.count += 1;
      item.carbon += carbon;
      item.money += money;
      item.weight += weight;
      return { accepted: true, slot: existing, full: false };
    }
    const slot = this.findEmpty(HOTBAR_SLOTS, INVENTORY_SLOTS, 0, HOTBAR_SLOTS);
    if (slot < 0) {
      return { accepted: false, slot: -1, full: true };
    }
    this.slots[slot] = {
      kind: 'mineral',
      mineral,
      count: 1,
      carbon,
      money,
      weight,
    };
    return { accepted: true, slot, full: false };
  }

  addTool(weapon: WeaponId): number {
    const existing = this.findTool(weapon);
    if (existing >= 0) {
      return existing;
    }
    const slot = this.findEmpty(0, HOTBAR_SLOTS, HOTBAR_SLOTS, INVENTORY_SLOTS);
    if (slot < 0) {
      return -1;
    }
    this.slots[slot] = { kind: 'tool', weapon };
    return slot;
  }

  findTool(weapon: WeaponId): number {
    return this.slots.findIndex(
      (item) => item?.kind === 'tool' && item.weapon === weapon,
    );
  }

  syncLoadout(loadout: Loadout): void {
    this.mineralStackLimit = maxStackFor(loadout);
    const owned = new Set<WeaponId>(
      (Object.keys(loadout.weapons) as WeaponId[]).filter(
        (weapon) => loadout.weapons[weapon],
      ),
    );
    for (let index = 0; index < this.slots.length; index += 1) {
      const item = this.slots[index];
      if (item?.kind === 'tool' && !owned.has(item.weapon)) {
        this.slots[index] = null;
      }
    }
    for (const weapon of owned) {
      this.addTool(weapon);
    }

    this.syncLadders(loadout.ladders);
    this.syncEquipmentItem('winch', loadout.winches ?? 0);
    this.syncEquipmentItem('field_depot', loadout.fieldDepots ?? 0);
    this.syncEquipmentItem('beacon', loadout.beacons ?? 0);
    this.syncGrenades(loadout.grenades);
  }

  syncEquipmentItem(kind: 'winch' | 'field_depot' | 'beacon', count: number): void {
    const safeCount = Math.max(0, Math.floor(count));
    const index = this.slots.findIndex((item) => item?.kind === kind);
    if (safeCount <= 0) {
      if (index >= 0) {
        this.slots[index] = null;
      }
      return;
    }
    if (index >= 0) {
      const item = this.slots[index];
      if (item && item.kind === kind) {
        item.count = safeCount;
        return;
      }
    }
    const slot = this.findEmpty(0, HOTBAR_SLOTS, HOTBAR_SLOTS, INVENTORY_SLOTS);
    if (slot >= 0) {
      this.slots[slot] = { kind, count: safeCount };
    }
  }

  syncLadders(count: number): void {
    const safeCount = Math.max(0, Math.floor(count));
    const index = this.slots.findIndex((item) => item?.kind === 'ladder');
    if (safeCount <= 0) {
      if (index >= 0) {
        this.slots[index] = null;
      }
      return;
    }
    if (index >= 0) {
      const item = this.slots[index];
      if (item?.kind === 'ladder') {
        item.count = safeCount;
        return;
      }
    }
    const slot = this.findEmpty(0, HOTBAR_SLOTS, HOTBAR_SLOTS, INVENTORY_SLOTS);
    if (slot >= 0) {
      this.slots[slot] = { kind: 'ladder', count: safeCount };
    }
  }

  syncGrenades(counts: Record<GrenadeTierId, number>): void {
    const tiers = Object.keys(counts) as GrenadeTierId[];
    for (const tier of tiers) {
      const safeCount = Math.max(0, Math.floor(counts[tier] ?? 0));
      let index = this.slots.findIndex(
        (item) => item?.kind === 'grenade' && item.tier === tier,
      );
      if (safeCount <= 0) {
        while (index >= 0) {
          this.slots[index] = null;
          index = this.slots.findIndex(
            (item) => item?.kind === 'grenade' && item.tier === tier,
          );
        }
        continue;
      }
      if (index >= 0) {
        const item = this.slots[index];
        if (item?.kind === 'grenade') {
          item.count = safeCount;
        }
      } else {
        const slot = this.findEmpty(0, HOTBAR_SLOTS, HOTBAR_SLOTS, INVENTORY_SLOTS);
        if (slot >= 0) {
          this.slots[slot] = { kind: 'grenade', tier, count: safeCount };
        }
      }
    }
  }

  move(from: number, to: number): boolean {
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= this.slots.length ||
      to >= this.slots.length
    ) {
      return false;
    }
    const source = this.slots[from];
    if (!source) {
      return false;
    }
    const target = this.slots[to];
    if (!target) {
      this.slots[to] = source;
      this.slots[from] = null;
      return true;
    }
    if (sameStack(source, target)) {
      const room = maxStack(target, this.mineralStackLimit) - itemCount(target);
      if (room <= 0) {
        return false;
      }
      if (source.kind === 'mineral' && target.kind === 'mineral') {
        const moved = Math.min(source.count, room);
        const ratio = moved / source.count;
        target.count += moved;
        target.carbon += source.carbon * ratio;
        target.money += source.money * ratio;
        target.weight += source.weight * ratio;
        source.count -= moved;
        source.carbon -= source.carbon * ratio;
        source.money -= source.money * ratio;
        source.weight -= source.weight * ratio;
        if (source.count <= 0) {
          this.slots[from] = null;
        }
        return true;
      }
      if (source.kind === 'grenade' && target.kind === 'grenade') {
        const moved = Math.min(source.count, room);
        target.count += moved;
        source.count -= moved;
        if (source.count <= 0) {
          this.slots[from] = null;
        }
        return true;
      }
      if (
        (source.kind === 'ladder' && target.kind === 'ladder') ||
        (source.kind === 'winch' && target.kind === 'winch') ||
        (source.kind === 'field_depot' && target.kind === 'field_depot') ||
        (source.kind === 'beacon' && target.kind === 'beacon')
      ) {
        const moved = Math.min(source.count, room);
        target.count += moved;
        source.count -= moved;
        if (source.count <= 0) {
          this.slots[from] = null;
        }
        return true;
      }
    }
    this.slots[from] = target;
    this.slots[to] = source;
    return true;
  }

  consumeGrenade(tier: GrenadeTierId): boolean {
    const index = this.slots.findIndex(
      (item) => item?.kind === 'grenade' && item.tier === tier && item.count > 0,
    );
    if (index < 0) {
      return false;
    }
    const item = this.slots[index];
    if (item?.kind !== 'grenade') {
      return false;
    }
    item.count -= 1;
    if (item.count <= 0) {
      this.slots[index] = null;
    }
    return true;
  }

  clearMinerals(): void {
    for (let index = 0; index < this.slots.length; index += 1) {
      if (this.slots[index]?.kind === 'mineral') {
        this.slots[index] = null;
      }
    }
  }

  getSlots(): ReadonlyArray<InventoryItem | null> {
    return this.slots;
  }

  removeOreFromSlot(slotIndex: number, amount: number): void {
    const item = this.slots[slotIndex];
    if (!item || item.kind !== 'mineral') return;
    const safeAmount = Math.min(item.count, Math.max(0, Math.floor(amount)));
    if (safeAmount <= 0) return;
    const ratio = safeAmount / item.count;
    item.carbon -= Math.round(item.carbon * ratio);
    item.money -= Math.round(item.money * ratio);
    item.weight -= item.weight * ratio;
    item.count -= safeAmount;
    if (item.count <= 0) {
      this.slots[slotIndex] = null;
    }
  }

  clearAll(): void {
    this.slots.fill(null);
  }

  totals(): { count: number; carbon: number; money: number; weight: number } {
    let count = 0;
    let carbon = 0;
    let money = 0;
    let weight = 0;
    for (const item of this.slots) {
      if (item?.kind !== 'mineral') {
        continue;
      }
      count += item.count;
      carbon += item.carbon;
      money += item.money;
      weight += item.weight;
    }
    return { count, carbon, money, weight };
  }

  breakdown(): DaySaleLine[] {
    const byMineral = new Map<MineralId, DaySaleLine>();
    for (const item of this.slots) {
      if (item?.kind !== 'mineral') {
        continue;
      }
      const entry = byMineral.get(item.mineral);
      if (entry) {
        entry.count += item.count;
        entry.carbon += item.carbon;
        entry.money += item.money;
      } else {
        byMineral.set(item.mineral, {
          mineral: item.mineral,
          count: item.count,
          carbon: item.carbon,
          money: item.money,
        });
      }
    }
    return [...byMineral.values()];
  }

  snapshot(): Array<InventoryItem | null> {
    return this.slots.map((item) => {
      if (!item) {
        return null;
      }
      if (item.kind === 'mineral') {
        return {
          kind: 'mineral',
          mineral: item.mineral,
          count: item.count,
          carbon: item.carbon,
          money: item.money,
          weight: item.weight,
        };
      }
      if (item.kind === 'grenade') {
        return { kind: 'grenade', tier: item.tier, count: item.count };
      }
      if (item.kind === 'ladder') {
        return { kind: 'ladder', count: item.count };
      }
      if (item.kind === 'winch') {
        return { kind: 'winch', count: item.count };
      }
      if (item.kind === 'field_depot') {
        return { kind: 'field_depot', count: item.count };
      }
      if (item.kind === 'beacon') {
        return { kind: 'beacon', count: item.count };
      }
      return { kind: 'tool', weapon: item.weapon };
    });
  }

  isEmpty(): boolean {
    return this.slots.every((item) => item === null);
  }

  private findEmpty(
    firstStart: number,
    firstEnd: number,
    secondStart: number,
    secondEnd: number,
  ): number {
    for (let index = firstStart; index < firstEnd; index += 1) {
      if (!this.slots[index]) {
        return index;
      }
    }
    for (let index = secondStart; index < secondEnd; index += 1) {
      if (!this.slots[index]) {
        return index;
      }
    }
    return -1;
  }
}
