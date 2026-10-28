import type * as THREE from 'three';
import type { DaySaleLine, MineralId } from '../types';

export const ACTIVE_PELLET_BUDGET = 1500;
export const VISIBLE_PELLET_BUDGET = 1500;
export const MAX_FUSED_PILES = 400;
export const FUSION_DISTANCE = 1.5;
export const MAX_PILE_SCALE = 2.2;

export interface Pellet {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
  age: number;
  carbon: number;
  money: number;
  weight: number;
  count: number;
  mineral: MineralId;
  color: THREE.Color;
  blockedUntil: number;
  isPile?: boolean;
}

export interface CollectedLoot {
  carbon: number;
  money: number;
  weight: number;
  mineral: MineralId;
  lines: DaySaleLine[];
  position: THREE.Vector3;
}

export type LootCollectFn = (loot: CollectedLoot) => boolean;

export interface OverflowEntry {
  mineral: MineralId;
  x: number;
  y: number;
  z: number;
  carbon: number;
  money: number;
  weight: number;
  count: number;
}
