import {
  GRENADE_ORDER,
  MINE_DEPTH,
  PASSIVE_ORDER,
  PIT_HALF,
  ROOM_ALPHABET,
  ROOM_CODE_LENGTH,
  SAFE_ZONE_HALF,
  WEAPON_ORDER,
} from '../config';
import type {
  BrigadeRecord,
  CarveEvent,
  ConveyorModule,
  DayReport,
  DaySaleLine,
  DifficultyModifier,
  GameMode,
  GrenadeTierId,
  Loadout,
  MapId,
  MissionModuleState,
  NetworkBeaconState,
  NetworkFieldDepotState,
  NetworkLadderState,
  NetworkPlayerState,
  NetworkStaffState,
  NetworkWinchState,
  PassiveId,
  RosterEntry,
  RunStats,
  SectorBeacon,
  WeaponId,
} from '../types';
import {
  bounded,
  finite,
  isRecord,
  parseBeacon,
  parseDayReport,
  parseFieldDepot,
  parseFxWire,
  parseGrenadeCounts,
  parsePlayerWire as parsePlayerWireValidator,
  parseSaleLines,
  parseWinch,
} from './ProtocolValidators';

export const PROTOCOL_VERSION = 18;
export const MAX_MESSAGE_LENGTH = 512 * 1024;
/** Tope de validación para magnitudes económicas; no es un límite de diseño. */
export const MAX_ECONOMY_VALUE = 1e100;
const WORLD_BOUND = SAFE_ZONE_HALF + 1;
const FX_BOUND = SAFE_ZONE_HALF + 2;

export interface PlayerWireState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  weapon: WeaponId;
  jetpack: boolean;
  mining: boolean;
}

export type WeaponSound = 'pickaxe' | 'tesla' | 'drill' | 'shotgun';

export type FxWire =
  | {
      kind: 'shot';
      weapon: WeaponSound;
      x: number;
      y: number;
      z: number;
      dx: number;
      dy: number;
      dz: number;
    }
  | { kind: 'lightning'; points: number[] }
  | { kind: 'explosion'; x: number; y: number; z: number; radius: number }
  | { kind: 'hit'; x: number; y: number; z: number; color: number; strong: boolean };

export type ClientMessage =
  | { t: 'hello'; v: number; name: string }
  | { t: 'state'; v: number; state: PlayerWireState }
  | { t: 'carve'; v: number; e: CarveEvent }
  | { t: 'node_hit'; v: number; id: string; dmg: number }
  | { t: 'node_break'; v: number; id: string; dropSeed: number }
  | { t: 'mission_interact'; v: number; moduleId: string; objectiveId: string }
  | { t: 'deposit'; v: number; coal: number; money: number; lines: DaySaleLine[] }
  | { t: 'grenade_use'; v: number; tier: GrenadeTierId }
  | { t: 'ladder_place'; v: number; ladder: NetworkLadderState }
  | { t: 'winch_place'; v: number; winch: NetworkWinchState }
  | { t: 'depot_place'; v: number; depot: NetworkFieldDepotState }
  | { t: 'depot_interact'; v: number; depotId: string; action: 'deposit' | 'withdraw'; depot?: NetworkFieldDepotState }
  | { t: 'beacon_place'; v: number; beacon: NetworkBeaconState }
  | { t: 'sector_place'; v: number; beacon: SectorBeacon }
  | { t: 'belt_place'; v: number; module: ConveyorModule }
  | { t: 'fx'; v: number; fx: FxWire }
  | { t: 'purchase'; v: number; itemId: string };

export interface DaySnapshot {
  phase: 'playing' | 'shop' | 'gameover' | 'victory';
  day: number;
  seed: number;
  quota: number;
  timeLeft: number;
  money: number;
  carbon: number;
  dayMoneyBase: number;
  dayMoneyWire?: string;
  dayReport: DayReport | null;
  infinite: boolean;
  mode?: GameMode;
  modifiers?: DifficultyModifier[];
  map?: MapId;
  loadout: Loadout;
  stats: RunStats;
  carveHistory: CarveEvent[];
  brokenNodes: string[];
  nodeHp: Record<string, number>;
  players: NetworkPlayerState[];
  staff: NetworkStaffState[];
  ladders: NetworkLadderState[];
  winches: NetworkWinchState[];
  depots: NetworkFieldDepotState[];
  beacons: NetworkBeaconState[];
  brigades?: BrigadeRecord[];
  sectors?: SectorBeacon[];
  conveyors?: ConveyorModule[];
  missions?: MissionModuleState[];
  moneyWire?: string;
  carbonWire?: string;
  quotaWire?: string;
  platformDepth?: number;
}

export type HostMessage =
  | {
      t: 'welcome';
      v: number;
      selfId: string;
      hostId: string;
      roster: RosterEntry[];
    }
  | { t: 'roster'; v: number; roster: RosterEntry[] }
  | { t: 'start_day'; v: number; snapshot: DaySnapshot }
  | { t: 'sync'; v: number; snapshot: DaySnapshot }
  | { t: 'players'; v: number; states: NetworkPlayerState[] }
  | { t: 'staff'; v: number; states: NetworkStaffState[] }
  | { t: 'brigade_state'; v: number; brigades: BrigadeRecord[]; sectors: SectorBeacon[] }
  | { t: 'belt_state'; v: number; modules: ConveyorModule[]; isJammed: boolean }
  | { t: 'mission_state'; v: number; modules: MissionModuleState[]; loadout: Loadout }
  | { t: 'ladder_placed'; v: number; ladder: NetworkLadderState }
  | { t: 'winch_placed'; v: number; winch: NetworkWinchState }
  | { t: 'depot_sync'; v: number; depots: NetworkFieldDepotState[] }
  | { t: 'beacon_sync'; v: number; beacons: NetworkBeaconState[] }
  | { t: 'carve'; v: number; e: CarveEvent; by: string }
  | { t: 'node_hit'; v: number; id: string; dmg: number; by: string }
  | { t: 'node_break'; v: number; id: string; dropSeed: number; by: string }
  | {
      t: 'economy';
      v: number;
      money: number;
      moneyWire?: string;
      carbon: number;
      timeLeft: number;
      day: number;
      quota: number;
      ladders: number;
      grenades: Record<GrenadeTierId, number>;
    }
  | { t: 'fx'; v: number; fx: FxWire; by: string }
  | {
      t: 'day_result';
      v: number;
      success: boolean;
      victory: boolean;
      day: number;
      carbon: number;
      quota: number;
      money: number;
      moneyWire?: string;
      loadout: Loadout;
      stats: RunStats;
      report: DayReport;
      infinite: boolean;
      message: string;
    }
  | {
      t: 'shop_state';
      v: number;
      money: number;
      moneyWire?: string;
      loadout: Loadout;
      stats: RunStats;
      quota: number;
      day: number;
      infinite: boolean;
    }
  | {
      t: 'passive';
      v: number;
      passive: PassiveId;
      title: string;
      loadout: Loadout;
      by: string;
    }
  | { t: 'game_over'; v: number; stats: RunStats; message: string }
  | { t: 'error'; v: number; message: string }
  | { t: 'disconnect'; v: number; reason: string };

export type GameHostMessage = Extract<
  HostMessage,
  {
    t:
      | 'start_day'
      | 'sync'
      | 'players'
      | 'staff'
      | 'carve'
      | 'node_hit'
      | 'node_break'
      | 'economy'
      | 'ladder_placed'
      | 'winch_placed'
      | 'depot_sync'
      | 'beacon_sync'
      | 'brigade_state'
      | 'belt_state'
      | 'mission_state'
      | 'fx'
      | 'day_result'
      | 'shop_state'
      | 'passive'
      | 'game_over'
      | 'error'
      | 'disconnect';
  }
>;

export type GameClientMessage = Exclude<ClientMessage, { t: 'hello' }>;

export function randomRoomCode(): string {
  const values = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(values);
  let code = '';
  for (const value of values) {
    code += ROOM_ALPHABET[value % ROOM_ALPHABET.length];
  }
  return code;
}

export function normalizeRoomCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ROOM_CODE_LENGTH);
}

export function sanitizeName(value: string): string {
  const clean = value
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^a-zA-Z0-9 _\-áéíóúÁÉÍÓÚñÑ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
  return clean || 'Operario';
}

export function isWeaponId(value: unknown): value is WeaponId {
  return typeof value === 'string' && (WEAPON_ORDER as readonly string[]).includes(value);
}

function parseCarveEvent(value: unknown): CarveEvent | null {
  if (!isRecord(value)) {
    return null;
  }
  const x = bounded(value.x, -(PIT_HALF + 0.5), PIT_HALF + 0.5);
  const y = bounded(value.y, -121, 6);
  const z = bounded(value.z, -(PIT_HALF + 0.5), PIT_HALF + 0.5);
  const r = bounded(value.r, 0.1, 5.5);
  const s = bounded(value.s, 0.05, 2.5);
  if (x === null || y === null || z === null || r === null || s === null) {
    return null;
  }
  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    z: Number(z.toFixed(3)),
    r: Number(r.toFixed(2)),
    s: Number(s.toFixed(2)),
  };
}

function parseLadder(value: unknown): NetworkLadderState | null {
  if (!isRecord(value)) {
    return null;
  }
  const x = bounded(value.x, -(PIT_HALF - 0.3), PIT_HALF - 0.3);
  const y = bounded(value.y, -MINE_DEPTH + 1, 7);
  const z = bounded(value.z, -(PIT_HALF - 0.3), PIT_HALF - 0.3);
  const nx = bounded(value.nx, -1, 1);
  const nz = bounded(value.nz, -1, 1);
  const height = bounded(value.height, 1, 8);
  const id = typeof value.id === 'string' ? value.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) : '';
  const orientation =
    value.orientation === 'horizontal' ||
    value.orientation === 'vertical' ||
    value.orientation === 'diagonal-up' ||
    value.orientation === 'diagonal-down'
      ? value.orientation
      : null;
  const anchorId =
    typeof value.anchorId === 'string'
      ? value.anchorId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
      : undefined;
  if (
    !id ||
    x === null ||
    y === null ||
    z === null ||
    nx === null ||
    nz === null ||
    height === null ||
    orientation === null
  ) {
    return null;
  }
  return {
    id,
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    z: Number(z.toFixed(3)),
    nx: Number(nx.toFixed(3)),
    nz: Number(nz.toFixed(3)),
    height: Number(height.toFixed(2)),
    orientation,
    anchorId,
  };
}

function parseFx(value: unknown): FxWire | null {
  return parseFxWire(value, FX_BOUND);
}

function parsePlayerWire(value: unknown): PlayerWireState | null {
  return parsePlayerWireValidator(value, WORLD_BOUND, isWeaponId);
}

export function parseClientMessage(raw: string): ClientMessage | null {
  if (raw.length > MAX_MESSAGE_LENGTH) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.v !== PROTOCOL_VERSION || typeof parsed.t !== 'string') {
    return null;
  }
  const v = PROTOCOL_VERSION;
  switch (parsed.t) {
    case 'hello':
      return { t: 'hello', v, name: sanitizeName(String(parsed.name ?? '')) };
    case 'state': {
      const state = parsePlayerWire(parsed.state);
      return state ? { t: 'state', v, state } : null;
    }
    case 'carve': {
      const event = parseCarveEvent(parsed.e);
      return event ? { t: 'carve', v, e: event } : null;
    }
    case 'node_hit': {
      const dmg = bounded(parsed.dmg, 1, 500);
      if (dmg === null || typeof parsed.id !== 'string') {
        return null;
      }
      return { t: 'node_hit', v, id: parsed.id.slice(0, 96), dmg };
    }
    case 'node_break': {
      const seed = bounded(parsed.dropSeed, 0, 0xffffffff);
      if (seed === null || typeof parsed.id !== 'string') {
        return null;
      }
      return { t: 'node_break', v, id: parsed.id.slice(0, 96), dropSeed: seed >>> 0 };
    }
    case 'mission_interact': {
      if (typeof parsed.moduleId !== 'string' || typeof parsed.objectiveId !== 'string') {
        return null;
      }
      return {
        t: 'mission_interact',
        v,
        moduleId: parsed.moduleId.slice(0, 96),
        objectiveId: parsed.objectiveId.slice(0, 96),
      };
    }
    case 'deposit': {
      const coal = bounded(parsed.coal, 0, MAX_ECONOMY_VALUE);
      const money = bounded(parsed.money, 0, MAX_ECONOMY_VALUE);
      const lines = parseSaleLines(parsed.lines);
      if (coal === null || money === null || lines === null) {
        return null;
      }
      return {
        t: 'deposit',
        v,
        coal: Math.floor(coal),
        money: Math.floor(money),
        lines,
      };
    }
    case 'grenade_use': {
      const tier = parsed.tier;
      if (typeof tier !== 'string' || !(GRENADE_ORDER as readonly string[]).includes(tier)) {
        return null;
      }
      return { t: 'grenade_use', v, tier: tier as GrenadeTierId };
    }
    case 'ladder_place': {
      const ladder = parseLadder(parsed.ladder);
      return ladder ? { t: 'ladder_place', v, ladder } : null;
    }
    case 'winch_place': {
      const winch = parseWinch(parsed.winch);
      return winch ? { t: 'winch_place', v, winch } : null;
    }
    case 'depot_place': {
      const depot = parseFieldDepot(parsed.depot);
      return depot ? { t: 'depot_place', v, depot } : null;
    }
    case 'depot_interact': {
      if (
        typeof parsed.depotId !== 'string' ||
        (parsed.action !== 'deposit' && parsed.action !== 'withdraw')
      ) {
        return null;
      }
      const depot = parsed.depot ? parseFieldDepot(parsed.depot) ?? undefined : undefined;
      return {
        t: 'depot_interact',
        v,
        depotId: parsed.depotId.slice(0, 64),
        action: parsed.action,
        depot,
      };
    }
    case 'beacon_place': {
      const beacon = parseBeacon(parsed.beacon);
      return beacon ? { t: 'beacon_place', v, beacon } : null;
    }
    case 'sector_place': {
      if (!isRecord(parsed.beacon)) return null;
      return { t: 'sector_place', v, beacon: parsed.beacon as any };
    }
    case 'belt_place': {
      if (!isRecord(parsed.module)) return null;
      return { t: 'belt_place', v, module: parsed.module as any };
    }
    case 'fx': {
      const fx = parseFx(parsed.fx);
      return fx ? { t: 'fx', v, fx } : null;
    }
    case 'purchase': {
      if (typeof parsed.itemId !== 'string' || parsed.itemId.length > 64) {
        return null;
      }
      return { t: 'purchase', v, itemId: parsed.itemId };
    }
    default:
      return null;
  }
}

function parseLadderState(value: unknown): NetworkLadderState | null {
  if (!isRecord(value)) return null;
  const x = bounded(value.x, -(PIT_HALF - 0.3), PIT_HALF - 0.3);
  const y = bounded(value.y, -MINE_DEPTH + 1, 7);
  const z = bounded(value.z, -(PIT_HALF - 0.3), PIT_HALF - 0.3);
  const nx = bounded(value.nx, -1, 1);
  const nz = bounded(value.nz, -1, 1);
  const height = bounded(value.height, 1, 8);
  const id = typeof value.id === 'string' ? value.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) : '';
  const orientation =
    value.orientation === 'horizontal' ||
    value.orientation === 'vertical' ||
    value.orientation === 'diagonal-up' ||
    value.orientation === 'diagonal-down'
      ? value.orientation
      : null;
  const anchorId =
    typeof value.anchorId === 'string'
      ? value.anchorId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
      : undefined;
  if (!id || x === null || y === null || z === null || nx === null || nz === null || height === null || orientation === null) {
    return null;
  }
  return {
    id,
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    z: Number(z.toFixed(3)),
    nx: Number(nx.toFixed(3)),
    nz: Number(nz.toFixed(3)),
    height: Number(height.toFixed(2)),
    orientation,
    anchorId,
  };
}

function parseHostPlayerState(value: Record<string, unknown>): NetworkPlayerState | null {
  const id = typeof value.id === 'string' ? value.id.slice(0, 96) : null;
  const name = typeof value.name === 'string' ? value.name.slice(0, 16) : null;
  const x = bounded(value.x, -WORLD_BOUND, WORLD_BOUND);
  const y = bounded(value.y, -125, 10);
  const z = bounded(value.z, -WORLD_BOUND, WORLD_BOUND);
  const yaw = finite(value.yaw);
  const pitch = bounded(value.pitch, -1.6, 1.6);
  const weapon = isWeaponId(value.weapon) ? value.weapon : null;
  const color = bounded(value.color, 0, 3);
  if (!id || !name || x === null || y === null || z === null || yaw === null || pitch === null || !weapon || color === null) {
    return null;
  }
  return {
    id,
    name,
    color: Math.floor(color),
    x,
    y,
    z,
    yaw,
    pitch,
    weapon,
    jetpack: Boolean(value.jetpack),
    mining: Boolean(value.mining),
  };
}

function parseHostSnapshot(value: unknown): DaySnapshot | null {
  if (!isRecord(value) || typeof value.phase !== 'string') return null;
  if (!['playing', 'shop', 'gameover', 'victory'].includes(value.phase)) return null;
  const day = bounded(value.day, 1, 9999);
  const seed = bounded(value.seed, 0, 0xffffffff);
  const quota = bounded(value.quota, 0, MAX_ECONOMY_VALUE);
  const timeLeft = bounded(value.timeLeft, 0, 3600);
  const money = bounded(value.money, 0, MAX_ECONOMY_VALUE);
  const carbon = bounded(value.carbon, 0, MAX_ECONOMY_VALUE);
  const dayMoneyBase = bounded(value.dayMoneyBase, 0, MAX_ECONOMY_VALUE);
  const dayReport = value.dayReport == null ? null : parseDayReport(value.dayReport);
  if (value.dayReport != null && dayReport === null) return null;
  if (day === null || seed === null || quota === null || timeLeft === null || money === null || carbon === null || dayMoneyBase === null || !isRecord(value.loadout)) {
    return null;
  }
  if (!Array.isArray(value.players) || !Array.isArray(value.staff)) return null;

  const players: NetworkPlayerState[] = [];
  for (const rawPlayer of value.players) {
    if (!isRecord(rawPlayer)) continue;
    const player = parseHostPlayerState(rawPlayer);
    if (player) players.push(player);
  }

  const ladders: NetworkLadderState[] = [];
  if (Array.isArray(value.ladders)) {
    for (const rawLadder of value.ladders.slice(0, 200)) {
      const ladder = parseLadderState(rawLadder);
      if (ladder) ladders.push(ladder);
    }
  }

  const winches = Array.isArray(value.winches)
    ? value.winches.slice(0, 32).map(parseWinch).filter((w): w is NonNullable<typeof w> => w !== null)
    : [];
  const depots = Array.isArray(value.depots)
    ? value.depots.slice(0, 16).map(parseFieldDepot).filter((d): d is NonNullable<typeof d> => d !== null)
    : [];
  const beacons = Array.isArray(value.beacons)
    ? value.beacons.slice(0, 16).map(parseBeacon).filter((b): b is NonNullable<typeof b> => b !== null)
    : [];

  const staff: NetworkStaffState[] = [];
  for (const rawStaff of value.staff) {
    if (!isRecord(rawStaff) || typeof rawStaff.id !== 'string') continue;
    const x = bounded(rawStaff.x, -WORLD_BOUND, WORLD_BOUND);
    const y = bounded(rawStaff.y, -125, 10);
    const z = bounded(rawStaff.z, -WORLD_BOUND, WORLD_BOUND);
    const yaw = finite(rawStaff.yaw);
    const rank = bounded(rawStaff.rank, 0, 3);
    if (x === null || y === null || z === null || yaw === null || rank === null || (rawStaff.kind !== 'miner' && rawStaff.kind !== 'collector')) continue;
    staff.push({
      id: rawStaff.id.slice(0, 80),
      kind: rawStaff.kind,
      rank: Math.floor(rank),
      x,
      y,
      z,
      yaw,
      active: Boolean(rawStaff.active),
    });
  }

  const carveHistory: CarveEvent[] = [];
  if (Array.isArray(value.carveHistory)) {
    for (const rawEvent of value.carveHistory.slice(0, 5000)) {
      const event = parseCarveEvent(rawEvent);
      if (event) carveHistory.push(event);
    }
  }

  const brokenNodes = Array.isArray(value.brokenNodes)
    ? value.brokenNodes.filter((id): id is string => typeof id === 'string').map((id) => id.slice(0, 96))
    : [];

  const nodeHp: Record<string, number> = {};
  if (isRecord(value.nodeHp)) {
    for (const [rawId, rawHp] of Object.entries(value.nodeHp).slice(0, 2000)) {
      const hp = bounded(rawHp, 0, 1e40);
      if (hp !== null) nodeHp[rawId.slice(0, 96)] = hp;
    }
  }

  return {
    phase: value.phase as DaySnapshot['phase'],
    day,
    seed: seed >>> 0,
    quota,
    timeLeft,
    money,
    carbon,
    dayMoneyBase,
    dayMoneyWire: typeof value.dayMoneyWire === 'string' ? value.dayMoneyWire.slice(0, 64) : undefined,
    dayReport,
    infinite: Boolean(value.infinite),
    mode:
      value.mode === 'tough' || value.mode === 'peaceful' ? value.mode : 'normal',
    modifiers: Array.isArray(value.modifiers)
      ? value.modifiers.filter(
          (m): m is DifficultyModifier =>
            m === 'no_chests' ||
            m === 'only_coal' ||
            m === 'coal_worthless' ||
            m === 'no_bonus_cash' ||
            m === 'no_time_upgrades' ||
            m === 'only_clay',
        )
      : [],
    map: typeof value.map === 'string' ? value.map.slice(0, 32) : 'standard',
    loadout: value.loadout as unknown as Loadout,
    stats: (isRecord(value.stats) ? value.stats : {}) as unknown as RunStats,
    carveHistory,
    brokenNodes,
    nodeHp,
    players,
    staff,
    ladders,
    winches,
    depots,
    beacons,
    brigades: Array.isArray(value.brigades) ? (value.brigades as BrigadeRecord[]) : undefined,
    sectors: Array.isArray(value.sectors) ? (value.sectors as SectorBeacon[]) : undefined,
    conveyors: Array.isArray(value.conveyors) ? (value.conveyors as ConveyorModule[]) : undefined,
    missions: Array.isArray(value.missions) ? (value.missions as MissionModuleState[]) : undefined,
    moneyWire: typeof value.moneyWire === 'string' ? value.moneyWire : undefined,
    carbonWire: typeof value.carbonWire === 'string' ? value.carbonWire : undefined,
    quotaWire: typeof value.quotaWire === 'string' ? value.quotaWire : undefined,
    platformDepth: typeof value.platformDepth === 'number' ? Math.max(0, value.platformDepth) : undefined,
  };
}

export function parseHostMessage(raw: string): HostMessage | null {
  if (raw.length > MAX_MESSAGE_LENGTH) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.v !== PROTOCOL_VERSION || typeof parsed.t !== 'string') return null;
  const v = PROTOCOL_VERSION;
  switch (parsed.t) {
    case 'welcome':
      return {
        t: 'welcome',
        v,
        selfId: String(parsed.selfId ?? ''),
        hostId: String(parsed.hostId ?? ''),
        roster: Array.isArray(parsed.roster) ? (parsed.roster as RosterEntry[]) : [],
      };
    case 'roster':
      return {
        t: 'roster',
        v,
        roster: Array.isArray(parsed.roster) ? (parsed.roster as RosterEntry[]) : [],
      };
    case 'start_day':
    case 'sync': {
      const snapshot = parseHostSnapshot(parsed.snapshot);
      if (!snapshot) return null;
      return parsed.t === 'start_day' ? { t: 'start_day', v, snapshot } : { t: 'sync', v, snapshot };
    }
    case 'players': {
      if (!Array.isArray(parsed.states) || parsed.states.length > 4) return null;
      const states: NetworkPlayerState[] = [];
      for (const rawState of parsed.states) {
        if (!isRecord(rawState)) return null;
        const playerState = parseHostPlayerState(rawState);
        if (!playerState) return null;
        states.push(playerState);
      }
      return { t: 'players', v, states };
    }
    case 'staff': {
      if (!Array.isArray(parsed.states) || parsed.states.length > 16) return null;
      const states: NetworkStaffState[] = [];
      for (const rawState of parsed.states) {
        if (!isRecord(rawState) || typeof rawState.id !== 'string') return null;
        const x = bounded(rawState.x, -WORLD_BOUND, WORLD_BOUND);
        const y = bounded(rawState.y, -125, 10);
        const z = bounded(rawState.z, -WORLD_BOUND, WORLD_BOUND);
        const yaw = finite(rawState.yaw);
        const rank = bounded(rawState.rank, 0, 3);
        if (x === null || y === null || z === null || yaw === null || rank === null || (rawState.kind !== 'miner' && rawState.kind !== 'collector')) {
          return null;
        }
        states.push({
          id: rawState.id.slice(0, 80),
          kind: rawState.kind,
          rank: Math.floor(rank),
          x,
          y,
          z,
          yaw,
          active: Boolean(rawState.active),
        });
      }
      return { t: 'staff', v, states };
    }
    case 'ladder_placed': {
      const ladder = parseLadderState(parsed.ladder);
      return ladder ? { t: 'ladder_placed', v, ladder } : null;
    }
    case 'winch_placed': {
      const winch = parseWinch(parsed.winch);
      return winch ? { t: 'winch_placed', v, winch } : null;
    }
    case 'depot_sync': {
      if (!Array.isArray(parsed.depots)) return null;
      const depots = parsed.depots.slice(0, 16).map(parseFieldDepot).filter((d): d is NonNullable<typeof d> => d !== null);
      return { t: 'depot_sync', v, depots };
    }
    case 'beacon_sync': {
      if (!Array.isArray(parsed.beacons)) return null;
      const beacons = parsed.beacons.slice(0, 16).map(parseBeacon).filter((b): b is NonNullable<typeof b> => b !== null);
      return { t: 'beacon_sync', v, beacons };
    }
    case 'brigade_state': {
      if (!Array.isArray(parsed.brigades) || !Array.isArray(parsed.sectors)) return null;
      return { t: 'brigade_state', v, brigades: parsed.brigades as BrigadeRecord[], sectors: parsed.sectors as SectorBeacon[] };
    }
    case 'belt_state': {
      if (!Array.isArray(parsed.modules)) return null;
      return { t: 'belt_state', v, modules: parsed.modules as ConveyorModule[], isJammed: Boolean(parsed.isJammed) };
    }
    case 'mission_state': {
      if (!Array.isArray(parsed.modules) || !isRecord(parsed.loadout)) return null;
      return {
        t: 'mission_state',
        v,
        modules: parsed.modules as MissionModuleState[],
        loadout: parsed.loadout as unknown as Loadout,
      };
    }
    case 'carve': {
      const e = parseCarveEvent(parsed.e);
      return e ? { t: 'carve', v, e, by: String(parsed.by ?? '').slice(0, 96) } : null;
    }
    case 'node_hit': {
      const dmg = bounded(parsed.dmg, 0, 500);
      if (dmg === null || typeof parsed.id !== 'string') return null;
      return { t: 'node_hit', v, id: parsed.id.slice(0, 96), dmg, by: String(parsed.by ?? '').slice(0, 96) };
    }
    case 'node_break': {
      const seed = bounded(parsed.dropSeed, 0, 0xffffffff);
      if (seed === null || typeof parsed.id !== 'string') return null;
      return { t: 'node_break', v, id: parsed.id.slice(0, 96), dropSeed: seed >>> 0, by: String(parsed.by ?? '').slice(0, 96) };
    }
    case 'economy': {
      const money = bounded(parsed.money, 0, MAX_ECONOMY_VALUE);
      const carbon = bounded(parsed.carbon, 0, MAX_ECONOMY_VALUE);
      const timeLeft = bounded(parsed.timeLeft, 0, 3600);
      const day = bounded(parsed.day, 1, 9999);
      const quota = bounded(parsed.quota, 0, MAX_ECONOMY_VALUE);
      const ladders = bounded(parsed.ladders, 0, 999);
      const grenades = parseGrenadeCounts(parsed.grenades);
      if (money === null || carbon === null || timeLeft === null || day === null || quota === null || ladders === null || grenades === null) {
        return null;
      }
      return {
        t: 'economy',
        v,
        money,
        moneyWire: typeof parsed.moneyWire === 'string' ? parsed.moneyWire.slice(0, 64) : undefined,
        carbon,
        timeLeft,
        day,
        quota,
        ladders: Math.floor(ladders),
        grenades,
      };
    }
    case 'fx': {
      const fx = parseFx(parsed.fx);
      return fx ? { t: 'fx', v, fx, by: String(parsed.by ?? '').slice(0, 96) } : null;
    }
    case 'day_result': {
      const day = bounded(parsed.day, 1, 9999);
      const carbon = bounded(parsed.carbon, 0, MAX_ECONOMY_VALUE);
      const quota = bounded(parsed.quota, 0, MAX_ECONOMY_VALUE);
      const money = bounded(parsed.money, 0, MAX_ECONOMY_VALUE);
      const report = parseDayReport(parsed.report);
      if (day === null || carbon === null || quota === null || money === null || report === null || !isRecord(parsed.loadout) || !isRecord(parsed.stats)) {
        return null;
      }
      return {
        t: 'day_result',
        v,
        success: Boolean(parsed.success),
        victory: Boolean(parsed.victory),
        day,
        carbon,
        quota,
        money,
        moneyWire: typeof parsed.moneyWire === 'string' ? parsed.moneyWire.slice(0, 64) : undefined,
        loadout: parsed.loadout as unknown as Loadout,
        stats: parsed.stats as unknown as RunStats,
        report,
        infinite: Boolean(parsed.infinite),
        message: String(parsed.message ?? '').slice(0, 240),
      };
    }
    case 'shop_state': {
      const money = bounded(parsed.money, 0, MAX_ECONOMY_VALUE);
      const quota = bounded(parsed.quota, 0, MAX_ECONOMY_VALUE);
      const day = bounded(parsed.day, 1, 9999);
      if (money === null || quota === null || day === null || !isRecord(parsed.loadout) || !isRecord(parsed.stats)) return null;
      return {
        t: 'shop_state',
        v,
        money,
        moneyWire: typeof parsed.moneyWire === 'string' ? parsed.moneyWire.slice(0, 64) : undefined,
        loadout: parsed.loadout as unknown as Loadout,
        stats: parsed.stats as unknown as RunStats,
        quota,
        day,
        infinite: Boolean(parsed.infinite),
      };
    }
    case 'passive': {
      if (!isRecord(parsed.loadout) || typeof parsed.passive !== 'string') return null;
      if (!(PASSIVE_ORDER as readonly string[]).includes(parsed.passive)) return null;
      return {
        t: 'passive',
        v,
        passive: parsed.passive as PassiveId,
        title: String(parsed.title ?? 'Mejora de cofre').slice(0, 120),
        loadout: parsed.loadout as unknown as Loadout,
        by: String(parsed.by ?? '').slice(0, 96),
      };
    }
    case 'game_over':
      if (!isRecord(parsed.stats)) return null;
      return { t: 'game_over', v, stats: parsed.stats as unknown as RunStats, message: String(parsed.message ?? 'Cuota incumplida.').slice(0, 240) };
    case 'disconnect':
      return { t: 'disconnect', v, reason: String(parsed.reason ?? 'Desconectado') };
    case 'error':
      return { t: 'error', v, message: String(parsed.message ?? 'Error de red') };
    default:
      return null;
  }
}

export function encodeMessage(message: HostMessage | ClientMessage): string {
  return JSON.stringify(message);
}
