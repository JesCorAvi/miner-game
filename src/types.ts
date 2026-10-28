/**
 * Los minerales se definen por bioma en `src/data/minerals.ts`. Mantener el
 * tipo como string permite añadir biomas sin tocar cada unión del proyecto.
 */
export type MineralId = string;

export type MineralFamily = 'coal' | 'ore';

export interface MineralDefinition {
  id: MineralId;
  name: string;
  shortName: string;
  family: MineralFamily;
  /** Bioma (1–12) al que pertenece el mineral. */
  layer: number;
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

export type GameMode = 'normal' | 'tough' | 'peaceful';

export type MapId = string;

export type ProfessionId = string;

export type DifficultyModifier =
  | 'no_chests'
  | 'only_coal'
  | 'coal_worthless'
  | 'no_bonus_cash'
  | 'no_time_upgrades'
  | 'only_clay';

export interface BiomeDefinition {
  index: number;
  name: string;
  subtitle: string;
  from: number;
  to: number;
  hpScale: number;
  hardness: number;
  rock: number;
  highlight: number;
  accent: string;
}

export type WeaponId = string;

export type WeaponStyle = 'melee' | 'chain' | 'continuous' | 'shotgun';

export type GrenadeTierId = 'frag' | 'charge' | 'breach' | 'seismic';

export interface GrenadeDefinition {
  id: GrenadeTierId;
  name: string;
  shortName: string;
  description: string;
  cost: number;
  packSize: number;
  /** Bioma máximo 1–12 que la carga puede fracturar. */
  maxLayer: number;
  carveStrength: number;
  damage: number;
  color: number;
  glow: number;
  shape?: 'sphere' | 'capsule' | 'cone';
  length?: number;
}

export type DoctrineId = 'blasting' | 'crew' | 'precision' | 'freight';
export type ClauseId =
  | 'surprise_audit'
  | 'supply_cut'
  | 'sealed_stratum'
  | 'suspended_dust'
  | 'short_shift'
  | 'mirror_mine';

export interface PatentDefinition {
  tier: number;
  name: string;
  shortName: string;
  description: string;
  cost: number;
  /** Bioma mínimo 1–12 que debe haberse picado para desbloquear la patente. */
  requiredLayer: number;
  damageMultiplier: number;
  carveMultiplier: number;
  emissive: number;
  particleColor: number;
  soundPitch: number;
}

export interface DoctrineDefinition {
  id: DoctrineId;
  name: string;
  motto: string;
  description: string;
  perks: string[];
  prohibitions: string[];
}

export interface ClauseDefinition {
  id: ClauseId;
  name: string;
  shortName: string;
  description: string;
}

export type CertificationId =
  | 'dust_filter'
  | 'gallery_map'
  | 'vein_probe'
  | 'rappel_harness';

export interface CertificationDefinition {
  id: CertificationId;
  name: string;
  shortName: string;
  description: string;
  perk: string;
  requiredDays: number;
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

export type PassiveId = string;

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
export type WeaponTierMap = Record<WeaponId, number>;
export type PassiveLevels = Record<PassiveId, number>;

export interface EmployeeRecord {
  id: string;
  kind: EmployeeKind;
  rank: number;
}

export interface BrigadeRecord {
  id: string;
  name: string;
  sectorId: string;
  headcount: number;
  kind: 'miners' | 'gatherers';
  rank: number;
  seed: number;
}

export interface SectorBeacon {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  /** Bioma 1–12 al que pertenece el sector. */
  layer: number;
  density: number;
}

export interface ConveyorModule {
  id: string;
  x: number;
  y: number;
  z: number;
  dirX: number;
  dirZ: number;
  speed: number;
  isJammed: boolean;
}

export interface EmployeeState {
  roster: EmployeeRecord[];
  nextId: number;
}

export interface Loadout {
  weapons: WeaponUnlocks;
  weaponTiers?: WeaponTierMap;
  upgrades: UpgradeLevels;
  passives: PassiveLevels;
  employees: EmployeeState;
  ladders: number;
  grenades: Record<GrenadeTierId, number>;
  winches: number;
  fieldDepots: number;
  beacons: number;
  patent?: number;
  /** Tier 1–15 del pico principal. */
  pickaxeTier?: number;
  /** Profesión de la expedición (13 arquetipos de Coal LLC). */
  profession?: ProfessionId;
  doctrine?: DoctrineId | null;
  clauses?: ClauseId[];
  reserveCarbon?: number;
  maxLayerReached?: number;
  conveyors?: number;
  certifications?: CertificationId[];
  utilitySlots?: [CertificationId | null, CertificationId | null];
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
  carbonWire?: string;
  quota: number;
  quotaWire?: string;
  performance: number;
  lines: DaySaleLine[];
  oreValue: number;
  otherValue: number;
  bonus: number;
  punctuality: number;
  surplusCarbon: number;
  surplusCapital: number;
  securedAt: number | null;
  total: number;
  money: number;
  moneyWire?: string;
  reserveDeposited?: number;
  reserveCovered?: number;
  footprintStage?: number;
}

export type GamePhase = 'menu' | 'lobby' | 'playing' | 'shop' | 'gameover' | 'victory';

export interface RunSnapshot {
  day: number;
  money: number;
  moneyWire?: string;
  carbon: number;
  carbonWire?: string;
  quota: number;
  quotaWire?: string;
  timeLeft: number;
  infinite: boolean;
  mode?: GameMode;
  modifiers?: DifficultyModifier[];
  map?: MapId;
  loadout: Loadout;
  stats: RunStats;
  brigades?: BrigadeRecord[];
  sectors?: SectorBeacon[];
  platformDepth?: number;
}

export interface SaveData {
  version: 9;
  savedAt: number;
  day: number;
  money: number;
  moneyWire?: string;
  infinite: boolean;
  mode?: GameMode;
  modifiers?: DifficultyModifier[];
  map?: MapId;
  loadout: Loadout;
  stats: RunStats;
  playerName: string;
  brigades?: BrigadeRecord[];
  sectors?: SectorBeacon[];
  nextBrigadeId?: number;
  conveyors?: {
    stock: number;
    placed: ConveyorModule[];
  };
  accessibility?: {
    shake: number;
    fov: number;
    bulkLoot: boolean;
    ledgerMode: boolean;
  };
  platformDepth?: number;
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
  shape?: 'sphere' | 'capsule' | 'cone';
  dirX?: number;
  dirY?: number;
  dirZ?: number;
  length?: number;
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
    | 'employee_convert'
    | 'patent'
    | 'pickaxe'
    | 'certification';
  title: string;
  description: string;
  cost: number;
  level: string;
  owned: boolean;
  maxed: boolean;
  affordable: boolean;
}

export interface LayerDefinition {
  /** Nivel de profundidad 1–20. */
  index: number;
  /** Bioma 1–12 al que pertenece este nivel. */
  biomeIndex: number;
  biomeName: string;
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
  kind: 'passive' | 'gem' | 'scroll';
  level: number;
  passive?: PassiveId;
  points?: number;
  mineral?: MineralId;
  money?: number;
  title: string;
  description: string;
}

export type PhaseNoticeTone = 'info' | 'positive' | 'danger';

export interface NetworkWinchState {
  id: string;
  x: number;
  topY: number;
  bottomY: number;
  z: number;
  ownerId?: string;
}

export interface FieldDepotStoredItem {
  mineral: MineralId;
  count: number;
  carbon: number;
  money: number;
  weight: number;
}

export interface NetworkFieldDepotState {
  id: string;
  x: number;
  y: number;
  z: number;
  stored: FieldDepotStoredItem[];
  totalWeight: number;
  maxCapacity: number;
  ownerId?: string;
}

export interface NetworkBeaconState {
  id: string;
  x: number;
  y: number;
  z: number;
  color: number;
  label?: string;
  ownerId?: string;
}

