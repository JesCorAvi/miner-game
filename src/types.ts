export type MineralId =
  | 'coal'
  | 'coalDense'
  | 'coalPressure'
  | 'coalPure'
  | 'copper'
  | 'iron'
  | 'amethyst'
  | 'gold'
  | 'ruby'
  | 'emerald'
  | 'diamond';

export type MineralFamily = 'coal' | 'ore';

export interface MineralDefinition {
  id: MineralId;
  name: string;
  shortName: string;
  family: MineralFamily;
  layer: 1 | 2 | 3 | 4;
  color: number;
  emissive: number;
  roughness: number;
  metalness: number;
  hp: number;
  radius: number;
  carbonYield: number;
  moneyYield: number;
  pelletCount: number;
  weight: number;
  glow: number;
}

export type WeaponId = 'pickaxe' | 'tesla' | 'drill' | 'shotgun';

export type WeaponStyle = 'melee' | 'chain' | 'continuous' | 'shotgun';

export type GrenadeTierId = 'frag' | 'charge' | 'breach' | 'seismic';

export interface GrenadeDefinition {
  id: GrenadeTierId;
  name: string;
  shortName: string;
  description: string;
  cost: number;
  packSize: number;
  maxLayer: 1 | 2 | 3 | 4;
  carveStrength: number;
  damage: number;
  color: number;
  glow: number;
}

export interface WeaponDefinition {
  id: WeaponId;
  slot: number;
  name: string;
  shortName: string;
  description: string;
  style: WeaponStyle;
  damage: number;
  cooldown: number;
  range: number;
  carveRadius: number;
  carveStrength: number;
  chainCount: number;
  chainRange: number;
  pellets: number;
  spread: number;
  blastRadius: number;
  unlockCost: number;
}

export type UpgradeId =
  | 'damage'
  | 'speed'
  | 'magnet'
  | 'jetpack'
  | 'dayTime'
  | 'capacity';

export type PassiveId =
  | 'digRadius'
  | 'nodeDamage'
  | 'magnet'
  | 'employeeSpeed'
  | 'jetpackFuel';

export type EmployeeKind = 'miner' | 'collector';

export interface UpgradeLevels {
  damage: number;
  speed: number;
  magnet: number;
  jetpack: number;
  dayTime: number;
  capacity: number;
}

export type WeaponUnlocks = Record<WeaponId, boolean>;
export type PassiveLevels = Record<PassiveId, number>;

export interface EmployeeRecord {
  id: string;
  kind: EmployeeKind;
  rank: number;
}

export interface EmployeeState {
  roster: EmployeeRecord[];
  nextId: number;
}

export interface Loadout {
  weapons: WeaponUnlocks;
  upgrades: UpgradeLevels;
  passives: PassiveLevels;
  employees: EmployeeState;
  ladders: number;
  grenades: Record<GrenadeTierId, number>;
}

export interface RunStats {
  coalMined: number;
  moneyEarned: number;
  nodesBroken: number;
  chestsOpened: number;
  daysCompleted: number;
  playSeconds: number;
}

export interface DaySaleLine {
  mineral: MineralId;
  count: number;
  carbon: number;
  money: number;
}

export interface DayReport {
  day: number;
  carbon: number;
  quota: number;
  performance: number;
  lines: DaySaleLine[];
  oreValue: number;
  otherValue: number;
  bonus: number;
  total: number;
  money: number;
}

export type GamePhase = 'menu' | 'lobby' | 'playing' | 'shop' | 'gameover' | 'victory';

export interface RunSnapshot {
  day: number;
  money: number;
  carbon: number;
  quota: number;
  timeLeft: number;
  infinite: boolean;
  loadout: Loadout;
  stats: RunStats;
}

export interface SaveData {
  version: 5;
  savedAt: number;
  day: number;
  money: number;
  infinite: boolean;
  loadout: Loadout;
  stats: RunStats;
  playerName: string;
}

export interface SaveSummary {
  day: number;
  money: number;
  savedAt: number;
  daysCompleted: number;
}

export interface CarveEvent {
  x: number;
  y: number;
  z: number;
  r: number;
  s: number;
}

export interface RosterEntry {
  id: string;
  name: string;
  color: number;
  isHost: boolean;
}

export interface NetworkPlayerState {
  id: string;
  name: string;
  color: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  weapon: WeaponId;
  jetpack: boolean;
  mining: boolean;
}

export type LadderOrientation =
  | 'vertical'
  | 'horizontal'
  | 'diagonal-up'
  | 'diagonal-down';

export interface NetworkLadderState {
  id: string;
  x: number;
  y: number;
  z: number;
  nx: number;
  nz: number;
  height: number;
  orientation: LadderOrientation;
  anchorId?: string;
}

export interface NetworkStaffState {
  id: string;
  kind: EmployeeKind;
  rank: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  active: boolean;
}

export interface ShopItemView {
  id: string;
  kind:
    | 'weapon'
    | 'upgrade'
    | 'supply'
    | 'grenade'
    | 'employee_hire'
    | 'employee_rank'
    | 'employee_convert';
  title: string;
  description: string;
  cost: number;
  level: string;
  owned: boolean;
  maxed: boolean;
  affordable: boolean;
}

export interface LayerDefinition {
  index: 1 | 2 | 3 | 4;
  name: string;
  subtitle: string;
  from: number;
  to: number;
  hardness: number;
  rock: number;
  highlight: number;
  accent: string;
}

export interface ChestReward {
  passive: PassiveId;
  title: string;
  description: string;
}

export type PhaseNoticeTone = 'info' | 'positive' | 'danger';
