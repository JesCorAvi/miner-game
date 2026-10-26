import * as THREE from 'three';
import {
  COLLECTOR_CARRY_WEIGHT,
  HOPPER_POSITION,
  PIT_HALF,
  SAFE_ZONE_HALF,
  SURFACE_DECK_Y,
  employeeRankMultiplier,
} from '../config';
import type {
  CarveEvent,
  DaySaleLine,
  Loadout,
  MineralId,
  NetworkStaffState,
} from '../types';
import type { Terrain } from '../world/Terrain';
import type { CollectedLoot, LootField } from '../world/Loot';
import type { ResourceNode, Resources } from '../world/Resources';

type CollectorPhase = 'seeking' | 'returning';

interface CollectorCargo {
  carbon: number;
  money: number;
  weight: number;
  count: number;
  lines: Map<MineralId, DaySaleLine>;
}

interface StaffEntity {
  id: string;
  kind: 'miner' | 'collector';
  rank: number;
  index: number;
  efficiency: number;
  position: THREE.Vector3;
  yaw: number;
  target: THREE.Vector3 | null;
  targetNodeId: string | null;
  carveCooldown: number;
  attackCooldown: number;
  retargetCooldown: number;
  collectCooldown: number;
  collectorPhase: CollectorPhase;
  seekWithoutCollect: number;
  cargo: CollectorCargo;
  moving: boolean;
}

export interface StaffCallbacks {
  onCarve: (event: CarveEvent) => void;
  onAttackNode: (node: ResourceNode, damage: number) => void;
  onCollect: (loot: CollectedLoot, count: number) => void;
}

const CARVE_INTERVAL = 0.42;
const ATTACK_INTERVAL = 0.62;
const RETARGET_INTERVAL = 0.55;
const MOVE_SPEED = 3.6;
const PIT_LIMIT = 11.1;
const COLLECTOR_LOCAL_RANGE = 12;
const COLLECTOR_SEEK_RANGE = 150;
const COLLECTOR_PICKUP_RADIUS = 0.95;
const COLLECTOR_PICKUP_INTERVAL = 0.28;
const COLLECTOR_HOPPER_RADIUS = 2.4;
const COLLECTOR_FLY_BOUND = SAFE_ZONE_HALF - 0.5;
const COLLECTOR_MAX_Y = SURFACE_DECK_Y + 4;
const COLLECTOR_RETURN_TIMEOUT = 6;
const PIT_OPENING_MARGIN = 1;
const PIT_MOUTH_Y = SURFACE_DECK_Y + 1.6;
const COLLECTOR_DECK_CLEARANCE = SURFACE_DECK_Y + 0.35;
const STAFF_RADIUS = 0.28;
const STAFF_HEIGHT = 1.55;
const HOPPER_APPROACH = new THREE.Vector3(
  HOPPER_POSITION.x,
  SURFACE_DECK_Y + 1.5,
  HOPPER_POSITION.z,
);

export class StaffManager {
  private readonly callbacks: StaffCallbacks;
  private entities: StaffEntity[] = [];
  private terrain: Terrain | null = null;
  private resources: Resources | null = null;
  private loot: LootField | null = null;
  private elapsed = 0;

  constructor(callbacks: StaffCallbacks) {
    this.callbacks = callbacks;
  }

  configure(
    terrain: Terrain,
    resources: Resources,
    loot: LootField,
    loadout: Loadout,
  ): void {
    this.terrain = terrain;
    this.resources = resources;
    this.loot = loot;
    this.spawnEntities(loadout);
  }

  private spawnEntities(loadout: Loadout): void {
    this.entities = [];
    loadout.employees.roster.forEach((employee, index) => {
      this.entities.push(
        this.makeEntity(
          employee.id,
          employee.kind,
          index,
          employee.rank,
          employeeRankMultiplier(employee.rank, loadout.passives.employeeSpeed),
        ),
      );
    });
  }

  private makeEntity(
    id: string,
    kind: 'miner' | 'collector',
    index: number,
    rank: number,
    efficiency: number,
  ): StaffEntity {
    const angle = (index / 6) * Math.PI * 2 + (kind === 'collector' ? 1.7 : 0.2);
    const radius = 0.8 + (index % 3) * 0.4;
    const position =
      kind === 'collector'
        ? new THREE.Vector3(
            HOPPER_POSITION.x + Math.cos(angle) * 1.8,
            SURFACE_DECK_Y + 1.7 + (index % 2) * 0.35,
            HOPPER_POSITION.z + Math.sin(angle) * 1.8,
          )
        : new THREE.Vector3(
            Math.cos(angle) * radius,
            SURFACE_DECK_Y + 0.02,
            Math.sin(angle) * radius,
          );
    return {
      id: `staff-${id}`,
      kind,
      rank,
      index,
      efficiency,
      position,
      yaw: -angle,
      target: null,
      targetNodeId: null,
      carveCooldown: 0.2 + index * 0.05,
      attackCooldown: 0.35 + index * 0.03,
      retargetCooldown: 0,
      collectCooldown: 0,
      collectorPhase: 'seeking',
      seekWithoutCollect: 0,
      cargo: {
        carbon: 0,
        money: 0,
        weight: 0,
        count: 0,
        lines: new Map(),
      },
      moving: false,
    };
  }

  update(dt: number): void {
    if (!this.terrain || !this.resources || !this.loot) {
      return;
    }
    this.elapsed += dt;
    const safeDt = Math.min(0.05, dt);
    const claimedNodes = new Set<string>();
    for (const entity of this.entities) {
      if (entity.kind === 'miner' && entity.targetNodeId) {
        claimedNodes.add(entity.targetNodeId);
      }
    }

    for (const entity of this.entities) {
      entity.carveCooldown = Math.max(0, entity.carveCooldown - safeDt);
      entity.attackCooldown = Math.max(0, entity.attackCooldown - safeDt);
      entity.retargetCooldown = Math.max(0, entity.retargetCooldown - safeDt);
      entity.collectCooldown = Math.max(0, entity.collectCooldown - safeDt);
      if (entity.kind === 'miner') {
        this.updateMiner(entity, safeDt, claimedNodes);
      } else {
        this.updateCollector(entity, safeDt);
      }
    }
  }

  private updateMiner(entity: StaffEntity, dt: number, claimedNodes: Set<string>): void {
    if (!this.resources || !this.terrain) {
      return;
    }
    let node = entity.targetNodeId ? this.resources.getNode(entity.targetNodeId) : undefined;
    if (!node || node.broken) {
      entity.targetNodeId = null;
      entity.target = null;
    }
    if (entity.retargetCooldown <= 0) {
      entity.retargetCooldown = RETARGET_INTERVAL;
      if (!node || node.broken) {
        node = this.findClosestNode(entity, claimedNodes) ?? undefined;
        if (node) {
          entity.targetNodeId = node.id;
          claimedNodes.add(node.id);
        }
      }
    }
    if (!node) {
      this.wander(entity, dt, false);
      return;
    }
    entity.target = new THREE.Vector3(node.x, node.y, node.z);
    const distance = entity.position.distanceTo(entity.target);
    if (distance > 2.9) {
      this.moveToward(entity, entity.target, dt);
    } else {
      entity.moving = false;
      if (entity.attackCooldown <= 0) {
        entity.attackCooldown = ATTACK_INTERVAL;
        this.callbacks.onAttackNode(node, 9.2 * entity.efficiency);
      }
    }
  }

  /**
   * El recolector no pica ni abre túneles: vuela en línea recta hasta cada
   * pepita, la carga en su mochila de equipo (media mochila inicial del
   * jugador) y, al llenarse o quedarse sin objetivos cercanos, regresa
   * volando a la tolva. Nada de succión a distancia ni depósito instantáneo.
   */
  private updateCollector(entity: StaffEntity, dt: number): void {
    if (!this.loot) {
      return;
    }
    const cargo = entity.cargo;
    if (entity.collectorPhase === 'returning') {
      entity.seekWithoutCollect = 0;
      // Si viene de bajo tierra, asciende por la boca del pozo antes de
      // cruzar la plataforma; nunca atraviesa el suelo exterior.
      const needsMouth = entity.position.y < SURFACE_DECK_Y + 0.1;
      this.flyToward(entity, needsMouth ? this.pitMouth() : HOPPER_APPROACH, dt);
      const dx = entity.position.x - HOPPER_POSITION.x;
      const dz = entity.position.z - HOPPER_POSITION.z;
      const atHopper =
        Math.hypot(dx, dz) <= COLLECTOR_HOPPER_RADIUS &&
        entity.position.y >= SURFACE_DECK_Y - 0.4 &&
        entity.position.y <= SURFACE_DECK_Y + 3.4;
      if (atHopper) {
        entity.moving = false;
        this.depositCollectorCargo(entity);
        entity.collectorPhase = 'seeking';
        entity.target = null;
        entity.retargetCooldown = 0;
      }
      return;
    }

    const remaining = COLLECTOR_CARRY_WEIGHT - cargo.weight;
    if (cargo.weight >= COLLECTOR_CARRY_WEIGHT - 1e-6 || remaining <= 1e-6) {
      this.beginCollectorReturn(entity);
      return;
    }

    // Si lleva carga y no encuentra nada recogible en unos segundos, vuelve.
    // Esto evita el bucle de apuntar a pepitas que ya no caben en la mochila.
    entity.seekWithoutCollect += dt;
    if (cargo.count > 0 && entity.seekWithoutCollect >= COLLECTOR_RETURN_TIMEOUT) {
      this.beginCollectorReturn(entity);
      return;
    }

    if (entity.retargetCooldown <= 0) {
      entity.retargetCooldown = RETARGET_INTERVAL;
      // Barre primero el entorno inmediato: cuando el racimo se agota,
      // vuelve a la tolva con la carga parcial. Solo busca en todo el pozo
      // cuando va vacío y necesita encontrar el siguiente objetivo.
      entity.target = this.loot.getNearestPellet(
        entity.position,
        COLLECTOR_LOCAL_RANGE,
        remaining,
      );
      if (!entity.target) {
        if (cargo.count > 0) {
          this.beginCollectorReturn(entity);
          return;
        }
        entity.target = this.loot.getNearestPellet(
          entity.position,
          COLLECTOR_SEEK_RANGE,
          remaining,
        );
      }
    }

    const target = entity.target;
    if (!target) {
      this.wander(entity, dt, true);
      return;
    }

    // Ruta de aproximación: si la pepita está bajo tierra y el recolector
    // aún no está sobre la boca, primero se coloca encima del hueco.
    if (
      target.y < SURFACE_DECK_Y - 0.2 &&
      !this.isOverPitOpening(entity.position.x, entity.position.z)
    ) {
      this.flyToward(entity, this.pitMouth(target), dt);
      return;
    }

    const distance = entity.position.distanceTo(target);
    if (distance > COLLECTOR_PICKUP_RADIUS) {
      this.flyToward(entity, target, dt);
      return;
    }

    entity.moving = false;
    if (entity.collectCooldown > 0) {
      return;
    }
    const collected = this.loot.collectNearestWithin(
      entity.position,
      COLLECTOR_PICKUP_RADIUS,
      remaining,
    );
    if (!collected) {
      entity.target = null;
      if (cargo.count > 0) {
        this.beginCollectorReturn(entity);
      } else {
        entity.retargetCooldown = 0;
      }
      return;
    }
    this.addCollectorCargo(entity, collected);
    entity.collectCooldown = COLLECTOR_PICKUP_INTERVAL;
    entity.target = null;
    entity.retargetCooldown = 0;
    entity.seekWithoutCollect = 0;
    if (cargo.weight >= COLLECTOR_CARRY_WEIGHT - 1e-6) {
      this.beginCollectorReturn(entity);
    }
  }

  private isOverPitOpening(x: number, z: number): boolean {
    const limit = PIT_HALF - PIT_OPENING_MARGIN;
    return Math.abs(x) <= limit && Math.abs(z) <= limit;
  }

  private pitMouth(target?: THREE.Vector3): THREE.Vector3 {
    const limit = PIT_HALF - PIT_OPENING_MARGIN - 0.6;
    return new THREE.Vector3(
      target ? THREE.MathUtils.clamp(target.x, -limit, limit) : 0,
      PIT_MOUTH_Y,
      target ? THREE.MathUtils.clamp(target.z, -limit, limit) : 0,
    );
  }

  private addCollectorCargo(entity: StaffEntity, collected: CollectedLoot): void {
    const cargo = entity.cargo;
    cargo.carbon += collected.carbon;
    cargo.money += collected.money;
    cargo.weight += collected.weight;
    cargo.count += 1;
    const line = collected.lines[0];
    if (!line) {
      return;
    }
    const existing = cargo.lines.get(line.mineral);
    if (existing) {
      existing.count += line.count;
      existing.carbon += line.carbon;
      existing.money += line.money;
    } else {
      cargo.lines.set(line.mineral, { ...line });
    }
  }

  private beginCollectorReturn(entity: StaffEntity): void {
    entity.collectorPhase = 'returning';
    entity.target = HOPPER_APPROACH.clone();
    entity.seekWithoutCollect = 0;
    entity.moving = false;
  }

  private depositCollectorCargo(entity: StaffEntity): void {
    const cargo = entity.cargo;
    if (cargo.count <= 0) {
      return;
    }
    const firstLine = cargo.lines.values().next().value;
    this.callbacks.onCollect(
      {
        carbon: cargo.carbon,
        money: cargo.money,
        weight: cargo.weight,
        mineral: firstLine?.mineral ?? 'coal',
        lines: [...cargo.lines.values()],
        position: HOPPER_APPROACH.clone(),
      },
      cargo.count,
    );
    cargo.carbon = 0;
    cargo.money = 0;
    cargo.weight = 0;
    cargo.count = 0;
    cargo.lines.clear();
    entity.seekWithoutCollect = 0;
  }

  private findClosestNode(entity: StaffEntity, claimedNodes: Set<string>): ResourceNode | null {
    if (!this.resources) {
      return null;
    }
    let best: ResourceNode | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const node of this.resources.nodes) {
      if (node.broken) {
        continue;
      }
      if (claimedNodes.has(node.id) && node.id !== entity.targetNodeId) {
        continue;
      }
      const dx = node.x - entity.position.x;
      const dy = node.y - entity.position.y;
      const dz = node.z - entity.position.z;
      let score = Math.hypot(dx, dy * 0.7, dz);
      if (node.type === 'chest') {
        score += 18;
      }
      if (node.mineral?.family === 'ore') {
        score += 4;
      }
      if (score < bestScore) {
        bestScore = score;
        best = node;
      }
    }
    return best;
  }

  private moveToward(entity: StaffEntity, target: THREE.Vector3, dt: number): void {
    if (!this.terrain) {
      return;
    }
    const direction = new THREE.Vector3().subVectors(target, entity.position);
    const distance = direction.length();
    if (distance < 0.001) {
      return;
    }
    direction.divideScalar(distance);
    const ahead = entity.position.clone().addScaledVector(direction, 1.25);
    const blocked =
      this.terrain.isSolid(ahead.x, ahead.y, ahead.z) ||
      this.terrain.isSolid(ahead.x, ahead.y + 0.95, ahead.z);
    if (blocked) {
      if (entity.carveCooldown <= 0) {
        entity.carveCooldown = CARVE_INTERVAL;
        this.callbacks.onCarve({
          x: ahead.x,
          y: ahead.y + 0.35,
          z: ahead.z,
          r: 0.82,
          s: 0.92,
        });
      }
    }
    const step = Math.min(distance, MOVE_SPEED * entity.efficiency * dt);
    const nextX = THREE.MathUtils.clamp(
      entity.position.x + direction.x * step,
      -PIT_LIMIT,
      PIT_LIMIT,
    );
    const nextY = THREE.MathUtils.clamp(
      entity.position.y + direction.y * step,
      -117,
      1.8,
    );
    const nextZ = THREE.MathUtils.clamp(
      entity.position.z + direction.z * step,
      -PIT_LIMIT,
      PIT_LIMIT,
    );
    const free = (x: number, y: number, z: number): boolean =>
      !this.terrain!.capsuleBlocked(x, y, z, STAFF_RADIUS, STAFF_HEIGHT) &&
      !this.terrain!.isSolid(x, y + 0.08, z);
    if (free(nextX, nextY, nextZ)) {
      entity.position.set(nextX, nextY, nextZ);
    } else if (free(nextX, nextY + 0.55, nextZ)) {
      entity.position.set(nextX, nextY + 0.55, nextZ);
    } else if (free(nextX, nextY + 1.1, nextZ)) {
      entity.position.set(nextX, nextY + 1.1, nextZ);
    }
    this.snapStaffToFloor(entity);
    entity.yaw = Math.atan2(-direction.x, -direction.z);
    entity.moving = true;
  }

  /** Evita que el minero quede enterrado hasta la cintura en el suelo. */
  private snapStaffToFloor(entity: StaffEntity): void {
    if (!this.terrain) {
      return;
    }
    const originY = entity.position.y + 0.35;
    const hit = this.terrain.raycast(
      new THREE.Vector3(entity.position.x, originY, entity.position.z),
      new THREE.Vector3(0, -1, 0),
      0.7,
    );
    if (!hit) {
      return;
    }
    const floorY = originY - hit.distance + 0.02;
    const delta = floorY - entity.position.y;
    if (delta > 0 && delta <= 0.35) {
      entity.position.y = floorY;
    } else if (delta < 0 && delta >= -0.1) {
      entity.position.y = floorY;
    }
  }

  /**
   * Vuelo directo para el recolector: no consulta densidad ni dispara carves,
   * así no abre túneles ni «mina» al desplazarse. Respeta los límites del
   * mundo y no baja de la plataforma fuera de la boca del pozo; la entrada y
   * salida al subsuelo se hacen por `pitMouth()`.
   */
  private flyToward(entity: StaffEntity, target: THREE.Vector3, dt: number): void {
    const direction = new THREE.Vector3().subVectors(target, entity.position);
    const distance = direction.length();
    if (distance < 0.001) {
      entity.moving = false;
      return;
    }
    direction.divideScalar(distance);
    const step = Math.min(distance, MOVE_SPEED * entity.efficiency * dt);
    const nextX = THREE.MathUtils.clamp(
      entity.position.x + direction.x * step,
      -COLLECTOR_FLY_BOUND,
      COLLECTOR_FLY_BOUND,
    );
    const nextZ = THREE.MathUtils.clamp(
      entity.position.z + direction.z * step,
      -COLLECTOR_FLY_BOUND,
      COLLECTOR_FLY_BOUND,
    );
    let nextY = THREE.MathUtils.clamp(
      entity.position.y + direction.y * step,
      -117,
      COLLECTOR_MAX_Y,
    );
    // Frontera dura de la plataforma: fuera de la boca del pozo no se baja
    // del nivel del suelo. La entrada/salida se hace por `pitMouth()`.
    if (!this.isOverPitOpening(nextX, nextZ) && nextY < COLLECTOR_DECK_CLEARANCE) {
      nextY = COLLECTOR_DECK_CLEARANCE;
    }
    entity.position.set(nextX, nextY, nextZ);
    entity.yaw = Math.atan2(-direction.x, -direction.z);
    entity.moving = true;
  }

  private wander(entity: StaffEntity, dt: number, flying: boolean): void {
    const angle = this.elapsed * 0.28 + entity.index * 2.3;
    const target = new THREE.Vector3(
      Math.cos(angle) * 3.2,
      -7 - (entity.index % 4) * 2.8 + Math.sin(this.elapsed * 0.3 + entity.index) * 1.6,
      Math.sin(angle) * 3.2,
    );
    entity.target = target;
    if (flying) {
      this.flyToward(entity, target, dt);
    } else {
      this.moveToward(entity, target, dt);
    }
  }

  getStates(): NetworkStaffState[] {
    return this.entities.map((entity) => ({
      id: entity.id,
      kind: entity.kind,
      rank: entity.rank,
      x: Number(entity.position.x.toFixed(2)),
      y: Number(entity.position.y.toFixed(2)),
      z: Number(entity.position.z.toFixed(2)),
      yaw: Number(entity.yaw.toFixed(3)),
      active: entity.moving,
    }));
  }

  getCount(): number {
    return this.entities.length;
  }

  clear(): void {
    this.entities = [];
  }
}
