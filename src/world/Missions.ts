import * as THREE from 'three';
import { PIT_HALF, mapMaxDepth } from '../config';
import { hashString, mulberry32 } from '../core/Rng';
import { unlockCertification } from '../core/Progression';
import { PROTOCOL_VERSION } from '../network/Protocol';
import type {
  CertificationId,
  Loadout,
  MapId,
  MissionModuleState,
  MissionObjectiveState,
  MissionType,
} from '../types';
import type { Terrain } from './Terrain';
import type { Resources } from './Resources';
import type { Game } from '../core/Game';
import { cloneLoadout } from '../core/RunState';

const MISSION_TYPES: readonly MissionType[] = ['seal', 'probe', 'sample', 'anchor'];
const MISSION_NAMES: Record<MissionType, string> = {
  seal: 'SELLADO DE FUGA',
  probe: 'RESCATE DE SONDA',
  sample: 'TESTIGO DE SONDEO',
  anchor: 'ANCLAJE DE EMERGENCIA',
};
const MISSION_REWARDS: Record<MissionType, CertificationId> = {
  seal: 'dust_filter',
  probe: 'gallery_map',
  sample: 'vein_probe',
  anchor: 'rappel_harness',
};
const MODULE_RADIUS = 4.8;
const INTERACT_RADIUS = 5.2;

function objective(
  id: string,
  kind: MissionObjectiveState['kind'],
  x: number,
  y: number,
  z: number,
): MissionObjectiveState {
  return { id, kind, x, y, z, done: false };
}

export class MissionSystem {
  readonly group = new THREE.Group();
  modules: MissionModuleState[] = [];
  private meshes = new Map<string, THREE.Group>();
  private objectiveMeshes = new Map<string, THREE.Mesh>();

  constructor() {
    this.group.name = 'service-modules';
  }

  clear(): void {
    for (const mesh of this.meshes.values()) {
      this.group.remove(mesh);
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          const material = child.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material.dispose();
        }
      });
    }
    this.meshes.clear();
    this.objectiveMeshes.clear();
    this.modules = [];
  }

  generate(seed: number, day: number, mapId: MapId, terrain: Terrain): void {
    this.clear();
    const random = mulberry32(hashString(`${seed}:${day}:missions`));
    const depthLimit = mapMaxDepth(mapId);
    const chosen = [0, 1, 2].map((index) => MISSION_TYPES[(day + index) % MISSION_TYPES.length]);

    for (let index = 0; index < 3; index += 1) {
      const type = chosen[index];
      const targetDepth = depthLimit * (0.24 + index * 0.25);
      let placed: { x: number; y: number; z: number } | null = null;
      for (let attempt = 0; attempt < 90; attempt += 1) {
        const x = (random() * 2 - 1) * (PIT_HALF - 5);
        const z = (random() * 2 - 1) * (PIT_HALF - 5);
        const y = -Math.max(10, Math.min(depthLimit - 8, targetDepth + (random() - 0.5) * 18));
        if (terrain.getDensityAt(x, y, z) <= 0.64) continue;
        const tooClose = this.modules.some(
          (module) => Math.hypot(module.x - x, module.y - y, module.z - z) < 14,
        );
        if (tooClose) continue;
        placed = { x, y, z };
        break;
      }
      if (!placed) {
        placed = {
          x: (index - 1) * 8,
          y: -Math.max(10, Math.min(depthLimit - 8, targetDepth)),
          z: 8,
        };
      }
      const id = `d${day}-module-${index}`;
      const objectives = this.makeObjectives(id, type, placed);
      const module: MissionModuleState = {
        id,
        type,
        name: MISSION_NAMES[type],
        x: placed.x,
        y: placed.y,
        z: placed.z,
        depth: Math.max(0, -placed.y),
        reward: MISSION_REWARDS[type],
        status: 'active',
        objectives,
      };
      this.modules.push(module);
      this.createVisual(module);
    }
    this.refreshVisuals();
  }

  private makeObjectives(
    moduleId: string,
    type: MissionType,
    at: { x: number; y: number; z: number },
  ): MissionObjectiveState[] {
    if (type === 'probe') {
      return [objective(`${moduleId}-core`, 'core', at.x, at.y, at.z + 1.5)];
    }
    if (type === 'sample') {
      return [0, 1, 2].map((index) =>
        objective(
          `${moduleId}-sample-${index}`,
          'node',
          at.x + (index - 1) * 3.2,
          at.y + (index % 2 === 0 ? 1.2 : -0.8),
          at.z + (index === 1 ? -3 : 2.4),
        ),
      );
    }
    const kind = type === 'seal' ? 'vent' : 'anchor';
    return [0, 1, 2].map((index) =>
      objective(
        `${moduleId}-${kind}-${index}`,
        kind,
        at.x + Math.cos((index / 3) * Math.PI * 2) * 2.6,
        at.y + 0.6,
        at.z + Math.sin((index / 3) * Math.PI * 2) * 2.6,
      ),
    );
  }

  private createVisual(module: MissionModuleState): void {
    const group = new THREE.Group();
    group.position.set(module.x, module.y, module.z);
    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(6, 4, 6),
      new THREE.MeshStandardMaterial({
        color: 0x252c32,
        emissive: module.status === 'complete' ? 0x0f4a3a : 0x0a3040,
        emissiveIntensity: 0.55,
        roughness: 0.42,
        metalness: 0.7,
        flatShading: true,
      }),
    );
    group.add(shell);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(6.05, 4.05, 6.05)),
      new THREE.LineBasicMaterial({ color: 0x5ff0d0 }),
    );
    group.add(edges);
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 2.5),
      new THREE.MeshBasicMaterial({ color: 0x59e5ff, transparent: true, opacity: 0.7 }),
    );
    door.position.set(0, -0.5, 3.03);
    group.add(door);
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffc45f }),
    );
    beacon.position.set(0, 2.35, 0);
    group.add(beacon);
    group.userData.shell = shell;
    group.userData.beacon = beacon;
    this.group.add(group);
    this.meshes.set(module.id, group);

    for (const objectiveState of module.objectives) {
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        new THREE.MeshBasicMaterial({ color: 0x7dffc8 }),
      );
      marker.position.set(objectiveState.x, objectiveState.y, objectiveState.z);
      this.group.add(marker);
      this.objectiveMeshes.set(objectiveState.id, marker);
    }
  }

  private refreshVisuals(): void {
    for (const module of this.modules) {
      const group = this.meshes.get(module.id);
      if (!group) continue;
      const shell = group.userData.shell as THREE.Mesh | undefined;
      if (shell) {
        const material = shell.material as THREE.MeshStandardMaterial;
        material.emissive.setHex(module.status === 'complete' ? 0x0f4a3a : 0x0a3040);
      }
      for (const objectiveState of module.objectives) {
        const marker = this.objectiveMeshes.get(objectiveState.id);
        if (marker) marker.visible = !objectiveState.done;
      }
    }
  }

  bindSampleNodes(resources: Resources): void {
    const used = new Set<string>();
    for (const module of this.modules) {
      if (module.type !== 'sample') continue;
      for (const objectiveState of module.objectives) {
        if (objectiveState.done) continue;
        let best: { id: string; x: number; y: number; z: number } | null = null;
        let bestDistance = 18;
        for (const node of resources.nodes) {
          if (!node.mineral || node.broken || used.has(node.id)) continue;
          const distance = Math.hypot(node.x - objectiveState.x, node.y - objectiveState.y, node.z - objectiveState.z);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = { id: node.id, x: node.x, y: node.y, z: node.z };
          }
        }
        if (best) {
          used.add(best.id);
          objectiveState.nodeId = best.id;
          objectiveState.x = best.x;
          objectiveState.y = best.y;
          objectiveState.z = best.z;
          const marker = this.objectiveMeshes.get(objectiveState.id);
          if (marker) marker.position.set(best.x, best.y, best.z);
        } else {
          objectiveState.kind = 'vent';
        }
      }
    }
  }

  getExclusions(): readonly { x: number; y: number; z: number; radius: number }[] {
    return this.modules.map((module) => ({
      x: module.x,
      y: module.y,
      z: module.z,
      radius: MODULE_RADIUS,
    }));
  }

  getSnapshot(): MissionModuleState[] {
    return this.modules.map((module) => ({
      ...module,
      objectives: module.objectives.map((objectiveState) => ({ ...objectiveState })),
    }));
  }

  fromSnapshot(states: readonly MissionModuleState[] | undefined): void {
    if (!states) return;
    this.clear();
    this.modules = states.map((module) => ({
      ...module,
      objectives: module.objectives.map((objectiveState) => ({ ...objectiveState })),
    }));
    for (const module of this.modules) {
      this.createVisual(module);
    }
    this.refreshVisuals();
  }

  getPrompt(position: THREE.Vector3): string | null {
    const target = this.findTarget(position);
    if (!target) return null;
    if (target.kind === 'core') return 'RECUPERAR NÚCLEO DE SONDA';
    if (target.kind === 'node') return null;
    return target.kind === 'vent' ? 'SELLAR RESPIRADERO' : 'INSTALAR ANCLAJE';
  }

  getTracker(): { text: string; detail: string } {
    const pending = this.modules.find((module) => module.status !== 'complete');
    if (!pending) {
      return this.modules.length > 0
        ? { text: 'ENCARGOS COMPLETADOS', detail: 'Todos los módulos de servicio están asegurados.' }
        : { text: 'CUOTA OBLIGATORIA', detail: 'OBJETIVO DEL EQUIPO' };
    }
    const done = pending.objectives.filter((objectiveState) => objectiveState.done).length;
    return {
      text: `ENCARGO · ${pending.name}`,
      detail: `${done} / ${pending.objectives.length} OBJETIVOS · PROFUNDIDAD ${Math.round(pending.depth)} M`,
    };
  }

  private findTarget(position: THREE.Vector3): MissionObjectiveState | null {
    let best: MissionObjectiveState | null = null;
    let bestDistance = INTERACT_RADIUS;
    for (const module of this.modules) {
      if (module.status === 'complete') continue;
      for (const objectiveState of module.objectives) {
        if (objectiveState.done || objectiveState.kind === 'node') continue;
        const distance = Math.hypot(
          objectiveState.x - position.x,
          objectiveState.y - position.y,
          objectiveState.z - position.z,
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          best = objectiveState;
        }
      }
      const moduleDistance = Math.hypot(module.x - position.x, module.y - position.y, module.z - position.z);
      if (module.type === 'probe' && module.status === 'active' && moduleDistance < INTERACT_RADIUS) {
        return module.objectives[0] ?? null;
      }
    }
    return best;
  }

  tryInteract(game: Game): boolean {
    const target = this.findTarget(game.player.getPosition());
    if (!target) return false;
    if (!game.isAuthority()) {
      if (game.online && game.role === 'client' && game.network) {
        game.network.sendToHost({
          t: 'mission_interact',
          v: PROTOCOL_VERSION,
          moduleId: this.moduleForObjective(target.id)?.id ?? '',
          objectiveId: target.id,
        });
      }
      return true;
    }
    const module = this.moduleForObjective(target.id);
    if (!module) return false;
    return this.applyObjective(game, module, target);
  }

  interactRemote(
    game: Game,
    moduleId: string,
    objectiveId: string,
    position: { x: number; y: number; z: number },
  ): boolean {
    const module = this.modules.find((entry) => entry.id === moduleId);
    if (!module) return false;
    const target = module.objectives.find((entry) => entry.id === objectiveId);
    if (!target || target.done) return false;
    if (
      Math.hypot(target.x - position.x, target.y - position.y, target.z - position.z) >
      INTERACT_RADIUS + 2
    ) {
      return false;
    }
    return this.applyObjective(game, module, target);
  }

  private applyObjective(
    game: Game,
    module: MissionModuleState,
    target: MissionObjectiveState,
  ): boolean {
    if (target.done) return false;
    target.done = true;
    this.refreshVisuals();
    if (module.objectives.every((objectiveState) => objectiveState.done)) {
      this.completeModule(game, module);
    } else {
      this.broadcast(game);
    }
    return true;
  }

  onNodeBroken(nodeId: string, game: Game): void {
    let changed = false;
    for (const module of this.modules) {
      let moduleChanged = false;
      for (const objectiveState of module.objectives) {
        if (objectiveState.nodeId === nodeId && !objectiveState.done) {
          objectiveState.done = true;
          changed = true;
          moduleChanged = true;
        }
      }
      if (moduleChanged && module.objectives.every((objectiveState) => objectiveState.done)) {
        this.completeModule(game, module);
      }
    }
    if (changed) this.refreshVisuals();
  }

  onHopperDeposit(game: Game): void {
    const module = this.modules.find((entry) => entry.status === 'carrying');
    if (!module) return;
    module.status = 'complete';
    this.completeModule(game, module);
  }

  private completeModule(game: Game, module: MissionModuleState): void {
    module.status = 'complete';
    const reward = module.reward;
    unlockCertification(game.run.loadout, reward);
    game.player.setLoadout(game.run.loadout);
    game.ui.notify(`ENCARGO COMPLETADO · ${module.name}. Certificación desbloqueada: ${reward}.`, 'positive');
    game.audio.playVictory();
    this.refreshVisuals();
    this.broadcast(game);
  }

  broadcast(game: Game): void {
    if (!game.online || game.role !== 'host' || !game.network) return;
    game.network.broadcast({
      t: 'mission_state',
      v: PROTOCOL_VERSION,
      modules: this.getSnapshot(),
      loadout: cloneLoadout(game.run.loadout),
    });
  }

  applyRemote(states: readonly MissionModuleState[] | undefined, loadout?: Loadout): void {
    if (states) {
      this.modules = states.map((module) => ({
        ...module,
        objectives: module.objectives.map((objectiveState) => ({ ...objectiveState })),
      }));
      this.refreshVisuals();
    }
    if (loadout) {
      // El llamador aplica el loadout al Game; aquí solo se conserva el estado.
    }
  }

  private moduleForObjective(objectiveId: string): MissionModuleState | undefined {
    return this.modules.find((module) =>
      module.objectives.some((objectiveState) => objectiveState.id === objectiveId),
    );
  }

  dispose(): void {
    this.clear();
    this.group.removeFromParent();
  }
}
