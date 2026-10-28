import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MINERALS, PIT_HALF, MINE_DEPTH, mapMaxDepth } from '../config';
import { hash3, hashString, mulberry32 } from '../core/Rng';
import type {
  ChestReward,
  DifficultyModifier,
  MapId,
  MineralDefinition,
  MineralId,
} from '../types';
import type { Terrain } from './Terrain';
import { buildResourceSpecs } from './ResourceSpecs';
import { resolveChestReward } from './ChestRewards';

export type ResourceType = MineralId | 'chest';

export interface NodeHitSphere {
  x: number;
  y: number;
  z: number;
  radius: number;
}

export interface ResourceNode {
  id: string;
  type: ResourceType;
  mineral: MineralDefinition | null;
  clusterId: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  scale: number;
  rotation: number;
  tilt: number;
  hp: number;
  maxHp: number;
  broken: boolean;
  pendingBreak: boolean;
  shake: number;
  damagedAt: number;
  slot: number;
  meshType: ResourceType;
  hitSpheres: NodeHitSphere[];
  aimRadius: number;
}

export interface NodeRayHit {
  node: ResourceNode;
  point: THREE.Vector3;
  distance: number;
}

export interface NodeDamageResult {
  node: ResourceNode;
  broke: boolean;
  remaining: number;
}

interface TypeMesh {
  mesh: THREE.InstancedMesh;
  material: THREE.MeshStandardMaterial;
  geometry: THREE.BufferGeometry;
  nodes: ResourceNode[];
}

const RETRY_COUNT = 24;

function makeGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 31);
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.18, 'rgba(255,255,255,0.65)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.16)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function deformGeometry(geometry: THREE.BufferGeometry, seed: number, amount: number): void {
  const position = geometry.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const factor = 1 + (hash3(x * 13.1, y * 17.7, z * 19.3, seed) - 0.5) * amount;
    position.setXYZ(index, x * factor, y * factor, z * factor);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function asNonIndexed(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  if (!geometry.index) {
    return geometry;
  }
  const converted = geometry.toNonIndexed();
  geometry.dispose();
  return converted;
}

/**
 * La silueta visible de una veta es un icosaedro deformado más tres astillas
 * que sobresalen del centro. Un único radio esférico deja fuera las puntas y
 * además queda enterrado cuando la veta asoma desde una pared. Estos proxies
 * siguen la geometría real y se transforman con la rotación/inclinación del nodo.
 */
const NODE_AIM_SURFACE_TOLERANCE = 0.15;
const NODE_AIM_ASSIST_ANGLE = 0.025;
const NODE_AIM_ASSIST_CANDIDATES = 12;

const MINERAL_HIT_PROXIES = [
  { x: 0, y: 0, z: 0, radius: 1.12 },
  { x: -0.48, y: 0.2, z: 0.1, radius: 0.95 },
  { x: 0.5, y: 0.08, z: -0.12, radius: 0.7 },
  { x: 0.12, y: -0.35, z: 0.3, radius: 0.52 },
] as const;

function buildHitSpheres(
  x: number,
  y: number,
  z: number,
  scale: number,
  rotationY: number,
  tilt: number,
  isChest: boolean,
): NodeHitSphere[] {
  if (isChest) {
    return [{ x, y, z, radius: 0.82 * scale }];
  }
  const rotation = new THREE.Euler(tilt, rotationY, 0, 'XYZ');
  const offset = new THREE.Vector3();
  return MINERAL_HIT_PROXIES.map((proxy) => {
    offset.set(proxy.x, proxy.y, proxy.z).applyEuler(rotation).multiplyScalar(scale);
    return {
      x: x + offset.x,
      y: y + offset.y,
      z: z + offset.z,
      radius: proxy.radius * scale,
    };
  });
}

function aimRadiusFor(centerX: number, centerY: number, centerZ: number, spheres: NodeHitSphere[]): number {
  let radius = 0;
  for (const sphere of spheres) {
    const dx = sphere.x - centerX;
    const dy = sphere.y - centerY;
    const dz = sphere.z - centerZ;
    radius = Math.max(radius, Math.hypot(dx, dy, dz) + sphere.radius);
  }
  return radius;
}

function buildCrystalGeometry(type: ResourceType): THREE.BufferGeometry {
  if (type === 'chest') {
    const base = asNonIndexed(new THREE.BoxGeometry(1.05, 0.62, 0.72));
    base.translate(0, -0.06, 0);
    const lid = asNonIndexed(new THREE.BoxGeometry(1.12, 0.25, 0.78));
    lid.translate(0, 0.34, 0);
    const band = asNonIndexed(new THREE.BoxGeometry(0.15, 0.75, 0.82));
    band.translate(0, 0.1, 0);
    const merged = mergeGeometries([base, lid, band], false);
    base.dispose();
    lid.dispose();
    band.dispose();
    return merged ?? new THREE.BoxGeometry(1, 0.8, 0.8);
  }
  const mineral = MINERALS[type];
  const main = asNonIndexed(new THREE.IcosahedronGeometry(0.72, 0));
  deformGeometry(main, hashString(type), 0.36);
  const shardA = asNonIndexed(new THREE.ConeGeometry(0.3, 1.15, 5));
  shardA.rotateZ(0.5);
  shardA.rotateX(0.2);
  shardA.translate(-0.48, 0.2, 0.1);
  const shardB = asNonIndexed(new THREE.ConeGeometry(0.2, 0.8, 4));
  shardB.rotateZ(-0.55);
  shardB.rotateY(0.4);
  shardB.translate(0.5, 0.08, -0.12);
  const shardC = asNonIndexed(new THREE.ConeGeometry(0.16, 0.58, 4));
  shardC.rotateX(-0.7);
  shardC.translate(0.12, -0.35, 0.3);
  const merged = mergeGeometries([main, shardA, shardB, shardC], false);
  main.dispose();
  shardA.dispose();
  shardB.dispose();
  shardC.dispose();
  const result = merged ?? new THREE.IcosahedronGeometry(0.75, 0);
  if (mineral.family === 'coal') {
    result.scale(1, 0.82, 1);
  }
  return result;
}

export class Resources {
  readonly group = new THREE.Group();
  readonly nodes: ResourceNode[] = [];
  readonly byId = new Map<string, ResourceNode>();
  private readonly typeMeshes = new Map<ResourceType, TypeMesh>();
  private readonly dummy = new THREE.Object3D();
  private readonly glowGeometry = new THREE.BufferGeometry();
  private readonly glowMaterial: THREE.PointsMaterial;
  private readonly glowTexture: THREE.CanvasTexture;
  private glowAttribute: THREE.BufferAttribute | null = null;
  private readonly aimRaycaster = new THREE.Raycaster();
  private readonly aimMesh = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
  private readonly aimMatrix = new THREE.Matrix4();
  private seed = 0;
  private anyShaking = false;

  constructor() {
    this.group.name = 'resource-field';
    this.aimMesh.matrixAutoUpdate = false;
    this.aimMesh.frustumCulled = false;
    this.glowTexture = makeGlowTexture();
    this.glowMaterial = new THREE.PointsMaterial({
      map: this.glowTexture,
      size: 1.2,
      transparent: true,
      opacity: 0.95,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
  }

  generate(
    seed: number,
    day: number,
    terrain: Terrain,
    modifiers: readonly DifficultyModifier[] = [],
    mapId: MapId = 'standard',
    exclusions: readonly { x: number; y: number; z: number; radius: number }[] = [],
  ): void {
    this.clear();
    this.seed = seed >>> 0;
    const random = mulberry32(this.seed ^ hashString(`resources-${day}`));
    const depthLimit = mapMaxDepth(mapId);
    const isExcluded = (x: number, y: number, z: number): boolean =>
      exclusions.some(
        (entry) => Math.hypot(x - entry.x, y - entry.y, z - entry.z) < entry.radius,
      );
    const specs = buildResourceSpecs(modifiers)
      .map((spec) => ({
        ...spec,
        depthMax: Math.min(spec.depthMax, depthLimit),
      }))
      .filter((spec) => spec.depthMin < spec.depthMax);

    for (const [specIndex, spec] of specs.entries()) {
      const mineral = MINERALS[spec.type];
      for (let cluster = 0; cluster < spec.clusters; cluster += 1) {
        const clusterId = `${day}-${spec.type}-${specIndex}-${cluster}`;
        const depth = spec.depthMin + random() * (spec.depthMax - spec.depthMin);
        const margin = 1.4;
        const centerX = (random() * 2 - 1) * (PIT_HALF - margin);
        const centerZ = (random() * 2 - 1) * (PIT_HALF - margin);
        const centerY = -depth;
        const nodeCount = spec.minNodes + Math.floor(random() * (spec.maxNodes - spec.minNodes + 1));
        for (let nodeIndex = 0; nodeIndex < nodeCount; nodeIndex += 1) {
          let placed: { x: number; y: number; z: number } | null = null;
          for (let attempt = 0; attempt < RETRY_COUNT; attempt += 1) {
            const offsetAngle = random() * Math.PI * 2;
            const offsetRadius = 0.2 + random() * 3.0;
            const offsetDepth = (random() - 0.5) * 3.4;
            const bound = PIT_HALF - 0.8;
            const x = Math.max(-bound, Math.min(bound, centerX + Math.cos(offsetAngle) * offsetRadius));
            const z = Math.max(-bound, Math.min(bound, centerZ + Math.sin(offsetAngle) * offsetRadius));
            const y = Math.max(-depthLimit + 1, Math.min(-1, centerY + offsetDepth));
            if (!isExcluded(x, y, z) && terrain.getDensityAt(x, y, z) > 0.64) {
              placed = { x, y, z };
              break;
            }
          }
          if (!placed) {
            continue;
          }
          const id = `d${day}-${spec.type}-${specIndex}-${cluster}-${nodeIndex}`;
          const scale = 0.72 + random() * 0.62;
          const maxHp = Math.round(mineral.hp * (0.8 + scale * 0.35));
          const rotation = random() * Math.PI * 2;
          const tilt = (random() - 0.5) * 0.7;
          const hitSpheres = buildHitSpheres(
            placed.x,
            placed.y,
            placed.z,
            scale,
            rotation,
            tilt,
            false,
          );
          const node: ResourceNode = {
            id,
            type: spec.type,
            mineral,
            clusterId,
            x: placed.x,
            y: placed.y,
            z: placed.z,
            radius: mineral.radius * scale,
            scale,
            rotation,
            tilt,
            hp: maxHp,
            maxHp,
            broken: false,
            pendingBreak: false,
            shake: 0,
            damagedAt: 0,
            slot: 0,
            meshType: spec.type,
            hitSpheres,
            aimRadius: aimRadiusFor(placed.x, placed.y, placed.z, hitSpheres),
          };
          this.nodes.push(node);
          this.byId.set(id, node);
        }
      }
    }

    const chestCount = modifiers.includes('no_chests') ? 0 : 24;
    for (let chest = 0; chest < chestCount; chest += 1) {
      const depth = 12 + random() * (Math.min(MINE_DEPTH, depthLimit) - 18);
      let placed: { x: number; y: number; z: number } | null = null;
      for (let attempt = 0; attempt < 32; attempt += 1) {
        const bound = PIT_HALF - 1;
        const x = (random() * 2 - 1) * bound;
        const z = (random() * 2 - 1) * bound;
        const y = -Math.max(3, Math.min(Math.min(MINE_DEPTH, depthLimit) - 2, depth + (random() - 0.5) * 6));
        if (!isExcluded(x, y, z) && terrain.getDensityAt(x, y, z) > 0.64) {
          placed = { x, y, z };
          break;
        }
      }
      if (!placed) {
        continue;
      }
      const id = `d${day}-chest-${chest}`;
      const maxHp = 92;
      const scale = 0.88 + random() * 0.22;
      const rotation = random() * Math.PI * 2;
      const tilt = (random() - 0.5) * 0.2;
      const hitSpheres = buildHitSpheres(
        placed.x,
        placed.y,
        placed.z,
        scale,
        rotation,
        tilt,
        true,
      );
      const node: ResourceNode = {
        id,
        type: 'chest',
        mineral: null,
        clusterId: `chest-${chest}`,
        x: placed.x,
        y: placed.y,
        z: placed.z,
        radius: 0.62,
        scale,
        rotation,
        tilt,
        hp: maxHp,
        maxHp,
        broken: false,
        pendingBreak: false,
        shake: 0,
        damagedAt: 0,
        slot: 0,
        meshType: 'chest',
        hitSpheres,
        aimRadius: aimRadiusFor(placed.x, placed.y, placed.z, hitSpheres),
      };
      this.nodes.push(node);
      this.byId.set(id, node);
    }

    this.createTypeMeshes();
    this.createGlowField(terrain);
  }

  private createTypeMeshes(): void {
    const buckets = new Map<ResourceType, ResourceNode[]>();
    for (const node of this.nodes) {
      if (!buckets.has(node.meshType)) {
        buckets.set(node.meshType, []);
      }
      buckets.get(node.meshType)!.push(node);
    }
    for (const [type, nodes] of buckets) {
      if (nodes.length === 0) {
        continue;
      }
      const geometry = buildCrystalGeometry(type);
      const mineral = type === 'chest' ? null : MINERALS[type];
      const material = new THREE.MeshStandardMaterial({
        color: type === 'chest' ? 0xd4a338 : mineral?.color ?? 0xffffff,
        emissive: type === 'chest' ? 0x8c5c10 : mineral?.emissive ?? 0x000000,
        emissiveIntensity: type === 'chest' ? 1.3 : mineral?.family === 'coal' ? 1.35 : 1.65,
        roughness: type === 'chest' ? 0.34 : mineral?.roughness ?? 0.5,
        metalness: type === 'chest' ? 0.72 : mineral?.metalness ?? 0.4,
        flatShading: true,
      });
      const mesh = new THREE.InstancedMesh(geometry, material, nodes.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.name = `nodes-${type}`;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      const color = new THREE.Color();
      nodes.forEach((node, slot) => {
        node.slot = slot;
        const shade = type === 'chest' ? 1 : 0.84 + hash3(node.x, node.y, node.z, this.seed) * 0.32;
        color.setHex(type === 'chest' ? 0xd4a338 : mineral?.color ?? 0xffffff);
        color.multiplyScalar(shade);
        mesh.setColorAt(slot, color);
        this.writeNodeMatrix(node);
        mesh.setMatrixAt(slot, this.dummy.matrix);
      });
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
      this.group.add(mesh);
      this.typeMeshes.set(type, { mesh, material, geometry, nodes });
    }
  }

  private createGlowField(terrain: Terrain): void {
    const count = this.nodes.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    const glowOffset = new THREE.Vector3();
    this.nodes.forEach((node, index) => {
      terrain.getNormal(node.x, node.y, node.z, glowOffset);
      const glowBound = PIT_HALF - 2.4;
      positions[index * 3] = Math.max(
        -glowBound,
        Math.min(glowBound, node.x + glowOffset.x * node.radius * 1.5),
      );
      positions[index * 3 + 1] = Math.min(
        -0.5,
        node.y + glowOffset.y * node.radius * 1.5,
      );
      positions[index * 3 + 2] = Math.max(
        -glowBound,
        Math.min(glowBound, node.z + glowOffset.z * node.radius * 1.5),
      );
      if (node.type === 'chest') {
        color.setHex(0xffc25d);
      } else {
        color.setHex(node.mineral?.glow ?? 0xffffff);
      }
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    });
    this.glowAttribute = new THREE.BufferAttribute(positions, 3);
    this.glowGeometry.setAttribute('position', this.glowAttribute);
    this.glowGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const glow = new THREE.Points(this.glowGeometry, this.glowMaterial);
    glow.name = 'node-glow';
    glow.frustumCulled = false;
    this.group.add(glow);
  }

  private writeNodeMatrix(node: ResourceNode): void {
    if (node.broken) {
      // Una veta rota no debe volver a escribirse: el shake pendiente de
      // `damage()` o un hp tardío de red la resucitarían como una copia
      // pequeña e inminable en su posición original.
      this.dummy.position.set(node.x, -999, node.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      return;
    }
    const shakeAmount =
      node.shake > 0
        ? Math.sin(node.shake * 82) * 0.07 * Math.min(1, node.shake * 6)
        : 0;
    const hpRatio = node.maxHp > 0 ? node.hp / node.maxHp : 0;
    const shrink = node.pendingBreak ? 0.2 : 0.74 + hpRatio * 0.26;
    this.dummy.position.set(
      node.x + shakeAmount,
      node.y + Math.cos(node.shake * 91) * 0.035,
      node.z - shakeAmount,
    );
    this.dummy.rotation.set(node.tilt, node.rotation, node.shake * 3.2);
    this.dummy.scale.setScalar(node.scale * shrink);
    this.dummy.updateMatrix();
  }

  setInstanceMatrix(node: ResourceNode): void {
    const typeMesh = this.typeMeshes.get(node.meshType);
    if (!typeMesh) {
      return;
    }
    this.writeNodeMatrix(node);
    typeMesh.mesh.setMatrixAt(node.slot, this.dummy.matrix);
    typeMesh.mesh.instanceMatrix.needsUpdate = true;
  }

  update(dt: number): void {
    if (!this.anyShaking) {
      return;
    }
    let shaking = false;
    for (const node of this.nodes) {
      if (node.shake <= 0) {
        continue;
      }
      node.shake = Math.max(0, node.shake - dt);
      this.setInstanceMatrix(node);
      if (node.shake > 0) {
        shaking = true;
      }
    }
    this.anyShaking = shaking;
  }

  /**
   * Lanza el rayo contra la geometría instanciada real de la veta. Así una
   * esfera de aproximación no puede "asomar" a través de un muro y convertir
   * una veta invisible en objetivo. La oclusión se decide con la distancia al
   * primer sólido del terreno; la tolerancia cubre la diferencia entre la
   * malla de Marching Cubes y el campo de densidad.
   */
  private raycastVisibleNode(
    node: ResourceNode,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    terrainHitDistance: number,
  ): NodeRayHit | null {
    const typeMesh = this.typeMeshes.get(node.meshType);
    if (!typeMesh) {
      return null;
    }
    typeMesh.mesh.getMatrixAt(node.slot, this.aimMatrix);
    if (!typeMesh.geometry.boundingSphere) {
      typeMesh.geometry.computeBoundingSphere();
    }
    this.aimMesh.geometry = typeMesh.geometry;
    this.aimMesh.matrix.copy(this.aimMatrix);
    this.aimMesh.matrixWorld.copy(this.aimMatrix);
    this.aimMesh.matrixWorldNeedsUpdate = false;
    this.aimRaycaster.set(origin, direction);
    this.aimRaycaster.near = 0.02;
    this.aimRaycaster.far = maxDistance;
    const hits = this.aimRaycaster.intersectObject(this.aimMesh, false);
    if (hits.length === 0) {
      return null;
    }
    const hit = hits[0];
    if (hit.distance > terrainHitDistance + NODE_AIM_SURFACE_TOLERANCE) {
      return null;
    }
    return {
      node,
      point: hit.point.clone(),
      distance: hit.distance,
    };
  }

  raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    terrainHitDistance: number,
  ): NodeRayHit | null {
    const directionNormalized = direction.clone().normalize();
    let best: NodeRayHit | null = null;
    for (const node of this.nodes) {
      if (node.broken) {
        continue;
      }
      const ocx = node.x - origin.x;
      const ocy = node.y - origin.y;
      const ocz = node.z - origin.z;
      const projection =
        ocx * directionNormalized.x +
        ocy * directionNormalized.y +
        ocz * directionNormalized.z;
      if (projection < -node.aimRadius || projection > maxDistance + node.aimRadius) {
        continue;
      }
      const distanceSq =
        ocx * ocx + ocy * ocy + ocz * ocz - projection * projection;
      if (distanceSq > node.aimRadius * node.aimRadius) {
        continue;
      }
      const hit = this.raycastVisibleNode(
        node,
        origin,
        directionNormalized,
        maxDistance,
        terrainHitDistance,
      );
      if (hit && (!best || hit.distance < best.distance)) {
        best = hit;
      }
    }
    return best;
  }

  /**
   * Asistencia de puntería limitada a vetas visibles. Se prueba la geometría
   * real en la dirección de cada proxy cercano al centro de la mira; si el
   * terreno tapa la veta, el rayo no cuenta. No hay asistencia "a través de
   * paredes".
   */
  raycastAssist(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    terrain: Terrain,
  ): NodeRayHit | null {
    const directionNormalized = direction.clone().normalize();
    const candidates: Array<{
      node: ResourceNode;
      direction: THREE.Vector3;
      angle: number;
    }> = [];
    for (const node of this.nodes) {
      if (node.broken) {
        continue;
      }
      let bestAngle = Number.POSITIVE_INFINITY;
      let bestDirection: THREE.Vector3 | null = null;
      for (const sphere of node.hitSpheres) {
        const ocx = sphere.x - origin.x;
        const ocy = sphere.y - origin.y;
        const ocz = sphere.z - origin.z;
        const distance = Math.hypot(ocx, ocy, ocz);
        if (distance <= 1e-4) {
          continue;
        }
        const cosine =
          (ocx * directionNormalized.x +
            ocy * directionNormalized.y +
            ocz * directionNormalized.z) /
          distance;
        if (cosine <= 0) {
          continue;
        }
        const angle = Math.acos(Math.min(1, cosine));
        // La asistencia solo corrige un error pequeño de mira; no debe
        // "imantar" una veta que está lejos del centro de la pantalla.
        if (angle > NODE_AIM_ASSIST_ANGLE) {
          continue;
        }
        const entry = Math.max(0.06, distance - sphere.radius);
        if (entry > maxDistance + 0.5) {
          continue;
        }
        if (angle < bestAngle) {
          bestAngle = angle;
          bestDirection = new THREE.Vector3(ocx, ocy, ocz).normalize();
        }
      }
      if (bestDirection) {
        candidates.push({
          node,
          direction: bestDirection,
          angle: bestAngle,
        });
      }
    }
    candidates.sort((a, b) => a.angle - b.angle);
    const limit = Math.min(NODE_AIM_ASSIST_CANDIDATES, candidates.length);
    let best: NodeRayHit | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let index = 0; index < limit; index += 1) {
      const candidate = candidates[index];
      const terrainHit = terrain.raycast(origin, candidate.direction, maxDistance + 0.8);
      const hit = this.raycastVisibleNode(
        candidate.node,
        origin,
        candidate.direction,
        maxDistance,
        terrainHit?.distance ?? Number.POSITIVE_INFINITY,
      );
      if (!hit) {
        continue;
      }
      const score = candidate.angle + hit.distance * 0.002;
      if (score < bestScore) {
        bestScore = score;
        best = hit;
      }
    }
    return best;
  }

  damage(id: string, amount: number): NodeDamageResult | null {
    const node = this.byId.get(id);
    if (!node || node.broken) {
      return null;
    }
    const damage = Math.max(0, amount);
    node.hp = Math.max(0, node.hp - damage);
    node.shake = Math.max(node.shake, 0.24);
    node.damagedAt = performance.now();
    if (node.hp <= 0) {
      node.pendingBreak = true;
    }
    this.anyShaking = true;
    this.setInstanceMatrix(node);
    return {
      node,
      broke: node.hp <= 0,
      remaining: node.hp,
    };
  }

  markPendingBreak(node: ResourceNode): void {
    node.pendingBreak = true;
    this.setInstanceMatrix(node);
  }

  markBroken(id: string): ResourceNode | null {
    const node = this.byId.get(id);
    if (!node || node.broken) {
      return null;
    }
    node.broken = true;
    node.pendingBreak = true;
    node.hp = 0;
    node.shake = 0;
    this.setInstanceMatrix(node);
    const index = this.nodes.indexOf(node);
    if (index >= 0 && this.glowAttribute) {
      this.glowAttribute.setY(index, -999);
      this.glowAttribute.needsUpdate = true;
    }
    return node;
  }

  setNodeHp(id: string, hp: number): void {
    const node = this.byId.get(id);
    if (!node) {
      return;
    }
    node.hp = Math.max(0, Math.min(node.maxHp, hp));
    if (node.hp === 0) {
      node.pendingBreak = true;
    }
    this.setInstanceMatrix(node);
  }

  getNode(id: string): ResourceNode | undefined {
    return this.byId.get(id);
  }

  getNearby(
    position: THREE.Vector3,
    radius: number,
    onlyCluster?: string,
    onlyMineral?: MineralId,
  ): ResourceNode[] {
    const radiusSq = radius * radius;
    const result: ResourceNode[] = [];
    for (const node of this.nodes) {
      if (node.broken) {
        continue;
      }
      if (onlyCluster && node.clusterId !== onlyCluster) {
        continue;
      }
      if (onlyMineral && node.type !== onlyMineral) {
        continue;
      }
      const dx = node.x - position.x;
      const dy = node.y - position.y;
      const dz = node.z - position.z;
      if (dx * dx + dy * dy + dz * dz <= radiusSq) {
        result.push(node);
      }
    }
    return result;
  }

  findNearestNode(position: THREE.Vector3, maxDistance: number): ResourceNode | null {
    let best: ResourceNode | null = null;
    let bestDistance = maxDistance * maxDistance;
    for (const node of this.nodes) {
      if (node.broken) {
        continue;
      }
      const dx = node.x - position.x;
      const dy = node.y - position.y;
      const dz = node.z - position.z;
      const distanceSq = dx * dx + dy * dy + dz * dz;
      if (distanceSq < bestDistance) {
        bestDistance = distanceSq;
        best = node;
      }
    }
    return best;
  }

  getChestReward(node: ResourceNode): ChestReward {
    return resolveChestReward(this.seed, node);
  }

  getBrokenIds(): string[] {
    return this.nodes.filter((node) => node.broken).map((node) => node.id);
  }

  getDamagedSnapshot(): Record<string, number> {
    const snapshot: Record<string, number> = {};
    for (const node of this.nodes) {
      if (node.broken || node.hp < node.maxHp) {
        snapshot[node.id] = node.hp;
      }
    }
    return snapshot;
  }

  getActiveCount(): number {
    return this.nodes.reduce((count, node) => (node.broken ? count : count + 1), 0);
  }

  clear(): void {
    this.nodes.length = 0;
    this.byId.clear();
    for (const typeMesh of this.typeMeshes.values()) {
      this.group.remove(typeMesh.mesh);
      typeMesh.mesh.dispose();
      typeMesh.material.dispose();
      typeMesh.geometry.dispose();
    }
    this.typeMeshes.clear();
    for (const child of [...this.group.children]) {
      if (child instanceof THREE.Points) {
        this.group.remove(child);
      }
    }
    this.glowGeometry.deleteAttribute('position');
    this.glowGeometry.deleteAttribute('color');
    this.glowAttribute = null;
    this.anyShaking = false;
  }

  dispose(): void {
    this.clear();
    this.glowGeometry.dispose();
    this.glowMaterial.dispose();
    this.glowTexture.dispose();
    this.group.removeFromParent();
  }
}
