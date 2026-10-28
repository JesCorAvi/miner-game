import * as THREE from 'three';
import { MINE_DEPTH, PIT_HALF } from '../config';
import { mulberry32 } from '../core/Rng';
import { globalPresentationBudget } from './PresentationBudget';

const MAX_SPARKS = 900;
const MAX_DEBRIS = 220;
const ARC_POOL_SIZE = 12;
const ARC_POINTS = 11;

interface Spark {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

interface DebrisPiece {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
  sz: number;
  life: number;
  scale: number;
}

interface DebrisOptions {
  normal?: THREE.Vector3;
  speed?: number;
  spread?: number;
  size?: number;
  life?: number;
}

interface SparkOptions {
  direction?: THREE.Vector3 | null;
  sizeScale?: number;
  lifeScale?: number;
}

interface ArcSlot {
  line: THREE.Line;
  geometry: THREE.BufferGeometry;
  material: THREE.LineBasicMaterial;
  points: Float32Array;
  life: number;
  maxLife: number;
}

interface Shockwave {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  radius: number;
}

function makeDustTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 15);
    gradient.addColorStop(0, 'rgba(255,244,221,0.7)');
    gradient.addColorStop(1, 'rgba(255,244,221,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class Effects {
  readonly group = new THREE.Group();
  private readonly sparks: Spark[] = [];
  private readonly sparkGeometry = new THREE.BufferGeometry();
  private readonly sparkPositions = new Float32Array(MAX_SPARKS * 3);
  private readonly sparkColors = new Float32Array(MAX_SPARKS * 3);
  private readonly sparkSizes = new Float32Array(MAX_SPARKS);
  private readonly sparkAlphas = new Float32Array(MAX_SPARKS);
  private readonly sparkMaterial: THREE.ShaderMaterial;
  private sparkCursor = 0;
  private sparksActive = 0;

  private readonly debrisMesh: THREE.InstancedMesh;
  private readonly debrisMaterial: THREE.MeshStandardMaterial;
  private readonly debrisPieces: DebrisPiece[] = [];
  private readonly debrisDummy = new THREE.Object3D();
  private debrisCursor = 0;

  private readonly arcs: ArcSlot[] = [];
  private arcCursor = 0;

  private readonly shockwaves: Shockwave[] = [];
  private readonly explosionLights: THREE.PointLight[] = [];
  private explosionLightCursor = 0;

  private readonly impactLight: THREE.PointLight;
  private impactFlashLife = 0;
  private impactFlashDuration = 0.08;
  private impactFlashIntensity = 0;

  private readonly dust: THREE.Points;
  private readonly dustTexture: THREE.CanvasTexture;
  private readonly dustBase: Float32Array;
  private readonly dustPositions: Float32Array;
  private dustElapsed = 0;

  private readonly beamGeometry = new THREE.BufferGeometry();
  private readonly beamMaterial: THREE.LineBasicMaterial;
  private readonly beamLine: THREE.Line;
  private beamLife = 0;
  private beamUpdated = false;

  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group.name = 'procedural-effects';
    this.group.frustumCulled = false;
    scene.add(this.group);
    this.sparkMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: false,
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(aSize * (240.0 / max(0.6, -mvPosition.z)), 1.0, 24.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 centered = gl_PointCoord - vec2(0.5);
          float radius = length(centered);
          if (radius > 0.5) discard;
          float strength = smoothstep(0.5, 0.0, radius);
          gl_FragColor = vec4(vColor, vAlpha * strength);
        }
      `,
    });
    this.sparkGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.sparkPositions, 3),
    );
    this.sparkGeometry.setAttribute('aColor', new THREE.BufferAttribute(this.sparkColors, 3));
    this.sparkGeometry.setAttribute('aSize', new THREE.BufferAttribute(this.sparkSizes, 1));
    this.sparkGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.sparkAlphas, 1));
    const sparkPoints = new THREE.Points(this.sparkGeometry, this.sparkMaterial);
    sparkPoints.frustumCulled = false;
    this.group.add(sparkPoints);
    for (let index = 0; index < MAX_SPARKS; index += 1) {
      this.sparks.push({
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 1,
        color: new THREE.Color(),
      });
      this.sparkPositions[index * 3 + 1] = -999;
      this.sparkAlphas[index] = 0;
    }

    const debrisGeometry = new THREE.TetrahedronGeometry(0.09, 0);
    this.debrisMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.06,
      flatShading: true,
      vertexColors: false,
    });
    this.debrisMesh = new THREE.InstancedMesh(debrisGeometry, this.debrisMaterial, MAX_DEBRIS);
    this.debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.debrisMesh.frustumCulled = false;
    const hiddenColor = new THREE.Color(0x111111);
    for (let index = 0; index < MAX_DEBRIS; index += 1) {
      this.debrisPieces.push({
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        sx: 0,
        sy: 0,
        sz: 0,
        life: 0,
        scale: 1,
      });
      this.debrisDummy.position.set(0, -999, 0);
      this.debrisDummy.scale.setScalar(0);
      this.debrisDummy.updateMatrix();
      this.debrisMesh.setMatrixAt(index, this.debrisDummy.matrix);
      this.debrisMesh.setColorAt(index, hiddenColor);
    }
    if (this.debrisMesh.instanceColor) {
      this.debrisMesh.instanceColor.needsUpdate = true;
    }
    this.group.add(this.debrisMesh);

    for (let index = 0; index < ARC_POOL_SIZE; index += 1) {
      const points = new Float32Array(ARC_POINTS * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
      const material = new THREE.LineBasicMaterial({
        color: 0x8deeff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const line = new THREE.Line(geometry, material);
      line.visible = false;
      line.frustumCulled = false;
      this.group.add(line);
      this.arcs.push({
        line,
        geometry,
        material,
        points,
        life: 0,
        maxLife: 1,
      });
    }

    for (let index = 0; index < 2; index += 1) {
      const light = new THREE.PointLight(0xffa04a, 0, 18, 1.5);
      this.group.add(light);
      this.explosionLights.push(light);
    }
    this.impactLight = new THREE.PointLight(0xffcf8a, 0, 3.2, 2);
    this.group.add(this.impactLight);

    this.beamMaterial = new THREE.LineBasicMaterial({
      color: 0x7eeaff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.beamGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(6), 3),
    );
    this.beamLine = new THREE.Line(this.beamGeometry, this.beamMaterial);
    this.beamLine.frustumCulled = false;
    this.beamLine.visible = false;
    this.group.add(this.beamLine);

    const dustRandom = mulberry32(0x8f91a3);
    const dustCount = 420;
    this.dustBase = new Float32Array(dustCount * 3);
    this.dustPositions = new Float32Array(dustCount * 3);
    for (let index = 0; index < dustCount; index += 1) {
      const x = (dustRandom() - 0.5) * PIT_HALF * 2;
      const y = -2 - dustRandom() * 116;
      const z = (dustRandom() - 0.5) * PIT_HALF * 2;
      this.dustBase[index * 3] = x;
      this.dustBase[index * 3 + 1] = y;
      this.dustBase[index * 3 + 2] = z;
      this.dustPositions[index * 3] = x;
      this.dustPositions[index * 3 + 1] = y;
      this.dustPositions[index * 3 + 2] = z;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));
    this.dustTexture = makeDustTexture();
    const dustMaterial = new THREE.PointsMaterial({
      map: this.dustTexture,
      color: 0xcdbfa8,
      size: 0.075,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.dust = new THREE.Points(dustGeometry, dustMaterial);
    this.dust.frustumCulled = false;
    this.group.add(this.dust);
  }

  spawnHit(position: THREE.Vector3, color: number, power = 1): void {
    const count = Math.floor(8 + power * 10);
    this.spawnSparks(position, color, count, power);
    this.spawnDebris(position, color, Math.floor(2 + power * 3));
  }

  /**
   * Impacto de pico: pocos fragmentos direccionales, chispas cortas y una luz
   * de 80 ms. No usa el estallido radial de `spawnHit` para no tapar la vista.
   */
  spawnImpact(
    position: THREE.Vector3,
    color: number,
    power = 1,
    normal?: THREE.Vector3 | null,
    options: { metalSparks?: boolean } = {},
  ): void {
    const direction = normal
      ? normal.clone().normalize()
      : new THREE.Vector3(0, 1, 0);
    const count = 6 + Math.floor(Math.random() * 4) + Math.min(2, Math.round(power * 2));
    this.spawnDebris(position, color, count, {
      normal: direction,
      speed: 2.1 + power * 2.3,
      spread: 0.78,
      size: 0.44 + power * 0.2,
      life: 0.34 + power * 0.14,
    });
    this.spawnSparks(position, color, 3 + Math.floor(Math.random() * 3), 0.5 + power * 0.25, {
      direction,
      sizeScale: 0.6,
      lifeScale: 0.72,
    });
    if (options.metalSparks) {
      this.spawnSparks(position, 0xfff0b5, 3 + Math.floor(Math.random() * 3), 1.1, {
        direction,
        sizeScale: 0.66,
        lifeScale: 0.5,
      });
    }
    this.flashImpact(position, color, power, direction);
  }

  private flashImpact(
    position: THREE.Vector3,
    color: number,
    power: number,
    normal: THREE.Vector3,
  ): void {
    this.impactLight.position.copy(position).addScaledVector(normal, 0.18);
    this.impactLight.color.setHex(color);
    this.impactFlashIntensity = 3.4 + power * 2.6;
    this.impactLight.intensity = this.impactFlashIntensity;
    this.impactLight.distance = 2.4 + power * 0.8;
    this.impactFlashDuration = 0.08;
    this.impactFlashLife = this.impactFlashDuration;
  }

  spawnNodeBreak(position: THREE.Vector3, color: number, power = 1.4): void {
    this.spawnSparks(position, color, Math.floor(24 + power * 18), power * 1.4);
    this.spawnDebris(position, color, Math.floor(8 + power * 8));
  }

  spawnMuzzle(position: THREE.Vector3, color = 0xffd08b, count = 6): void {
    this.spawnSparks(position, color, count, 0.55);
  }

  spawnExplosion(position: THREE.Vector3, radius: number, color = 0xff8243): void {
    this.spawnSparks(position, color, 75, 2.4);
    this.spawnSparks(position, 0xfff0c4, 28, 1.5);
    this.spawnDebris(position, 0x5a3929, 34);

    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.42,
      wireframe: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 9), material);
    mesh.position.copy(position);
    mesh.scale.setScalar(0.2);
    this.group.add(mesh);
    this.shockwaves.push({
      mesh,
      material,
      life: 0.48,
      maxLife: 0.48,
      radius,
    });

    if (globalPresentationBudget.request('light', 1)) {
      const light = this.explosionLights[this.explosionLightCursor % this.explosionLights.length];
      this.explosionLightCursor += 1;
      light.position.copy(position);
      light.intensity = 110 + radius * 36;
      light.distance = radius * 9;
    }
  }

  spawnLightning(
    start: THREE.Vector3,
    end: THREE.Vector3,
    color = 0x8fefff,
    jitter = 0.42,
  ): void {
    if (start.distanceToSquared(end) < 0.01) {
      return;
    }
    const slot = this.arcs[this.arcCursor % this.arcs.length];
    this.arcCursor += 1;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dy, dz);
    const halfX = -dz / Math.max(0.001, length);
    const halfZ = dx / Math.max(0.001, length);
    for (let index = 0; index < ARC_POINTS; index += 1) {
      const t = index / (ARC_POINTS - 1);
      const envelope = Math.sin(t * Math.PI);
      const jitterX = (Math.random() - 0.5) * jitter * envelope;
      const jitterY = (Math.random() - 0.5) * jitter * envelope;
      const jitterZ = (Math.random() - 0.5) * jitter * envelope;
      this.setArcPoint(slot, index, {
        x: start.x + dx * t + halfX * jitterX,
        y: start.y + dy * t + jitterY,
        z: start.z + dz * t + halfZ * jitterZ,
      });
    }
    slot.material.color.setHex(color);
    slot.material.opacity = 1;
    slot.line.visible = true;
    slot.life = 0.15;
    slot.maxLife = 0.15;
    (slot.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  private setArcPoint(
    slot: ArcSlot,
    index: number,
    position: { x: number; y: number; z: number },
  ): void {
    slot.points[index * 3] = position.x;
    slot.points[index * 3 + 1] = position.y;
    slot.points[index * 3 + 2] = position.z;
  }

  setDrillBeam(start: THREE.Vector3, end: THREE.Vector3, active: boolean): void {
    if (!active) {
      this.beamUpdated = false;
      return;
    }
    const attribute = this.beamGeometry.getAttribute('position') as THREE.BufferAttribute;
    attribute.setXYZ(0, start.x, start.y, start.z);
    attribute.setXYZ(1, end.x, end.y, end.z);
    attribute.needsUpdate = true;
    this.beamGeometry.computeBoundingSphere();
    this.beamMaterial.opacity = 0.8;
    this.beamLine.visible = true;
    this.beamLife = 0.11;
    this.beamUpdated = true;
  }

  getDebrisMaterial(): THREE.MeshStandardMaterial {
    return this.debrisMaterial;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  private spawnSparks(
    position: THREE.Vector3,
    color: number,
    count: number,
    power: number,
    options: SparkOptions = {},
  ): void {
    const baseColor = new THREE.Color(color);
    const direction = options.direction ?? null;
    for (let index = 0; index < count; index += 1) {
      const slot = this.sparkCursor % MAX_SPARKS;
      this.sparkCursor += 1;
      const spark = this.sparks[slot];
      spark.active = true;
      spark.x = position.x + (Math.random() - 0.5) * 0.18;
      spark.y = position.y + (Math.random() - 0.5) * 0.18;
      spark.z = position.z + (Math.random() - 0.5) * 0.18;
      if (direction) {
        const speed = (1.5 + Math.random() * 4.2) * power;
        const spread = 0.9;
        const vx = direction.x + (Math.random() - 0.5) * spread;
        const vy = direction.y + (Math.random() - 0.5) * spread + 0.16;
        const vz = direction.z + (Math.random() - 0.5) * spread;
        const length = Math.hypot(vx, vy, vz) || 1;
        spark.vx = (vx / length) * speed;
        spark.vy = (vy / length) * speed;
        spark.vz = (vz / length) * speed;
      } else {
        const angle = Math.random() * Math.PI * 2;
        const speed = (1.6 + Math.random() * 5) * power;
        const vertical = (0.8 + Math.random() * 4.5) * power;
        spark.vx = Math.cos(angle) * speed;
        spark.vy = vertical;
        spark.vz = Math.sin(angle) * speed;
      }
      spark.maxLife = (0.24 + Math.random() * 0.55) * (options.lifeScale ?? 1);
      spark.life = spark.maxLife;
      spark.size =
        (0.65 + Math.random() * 1.45) *
        Math.min(2.4, power) *
        (options.sizeScale ?? 1);
      spark.color.copy(baseColor).multiplyScalar(0.82 + Math.random() * 0.5);
    }
    this.sparksActive = Math.min(MAX_SPARKS, this.sparksActive + count);
  }

  private spawnDebris(
    position: THREE.Vector3,
    color: number,
    count: number,
    options: DebrisOptions = {},
  ): void {
    const baseColor = new THREE.Color(color);
    const normal = options.normal;
    for (let index = 0; index < count; index += 1) {
      const slot = this.debrisCursor % MAX_DEBRIS;
      this.debrisCursor += 1;
      const piece = this.debrisPieces[slot];
      piece.active = true;
      const offset = normal ? 0.045 : 0.2;
      piece.x = position.x + (Math.random() - 0.5) * offset + (normal?.x ?? 0) * 0.05;
      piece.y = position.y + (Math.random() - 0.5) * offset + (normal?.y ?? 0) * 0.05;
      piece.z = position.z + (Math.random() - 0.5) * offset + (normal?.z ?? 0) * 0.05;
      if (normal) {
        const speed = (options.speed ?? 3) * (0.55 + Math.random() * 0.75);
        const spread = options.spread ?? 0.78;
        piece.vx = normal.x * speed + (Math.random() - 0.5) * spread * speed;
        piece.vy =
          normal.y * speed +
          (Math.random() - 0.5) * spread * speed +
          1 + Math.random() * 1.8;
        piece.vz = normal.z * speed + (Math.random() - 0.5) * spread * speed;
      } else {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 4.5;
        piece.vx = Math.cos(angle) * speed;
        piece.vy = 1.5 + Math.random() * 4.2;
        piece.vz = Math.sin(angle) * speed;
      }
      piece.rx = Math.random() * 3;
      piece.ry = Math.random() * 3;
      piece.rz = Math.random() * 3;
      piece.sx = (Math.random() - 0.5) * 11;
      piece.sy = (Math.random() - 0.5) * 11;
      piece.sz = (Math.random() - 0.5) * 11;
      piece.life =
        options.life !== undefined
          ? options.life * (0.7 + Math.random() * 0.6)
          : 0.55 + Math.random() * 0.8;
      piece.scale =
        options.size !== undefined
          ? options.size * (0.65 + Math.random() * 0.7)
          : 0.5 + Math.random() * 1.4;
      this.debrisMesh.setColorAt(slot, baseColor.clone().multiplyScalar(0.55 + Math.random() * 0.5));
    }
    if (this.debrisMesh.instanceColor) {
      this.debrisMesh.instanceColor.needsUpdate = true;
    }
  }

  update(dt: number): void {
    const safeDt = Math.min(dt, 0.05);
    this.updateSparks(safeDt);
    this.updateDebris(safeDt);
    this.updateArcs(safeDt);
    this.updateShockwaves(safeDt);
    this.updateDust(safeDt);

    if (this.beamLife > 0) {
      this.beamLife = Math.max(0, this.beamLife - safeDt);
      this.beamMaterial.opacity = this.beamLife > 0 ? Math.min(0.8, this.beamLife * 7) : 0;
    } else if (this.beamLine.visible && !this.beamUpdated) {
      this.beamLine.visible = false;
    }
    for (const light of this.explosionLights) {
      if (light.intensity > 0) {
        light.intensity = Math.max(0, light.intensity - safeDt * 380);
      }
    }
    if (this.impactFlashLife > 0) {
      this.impactFlashLife = Math.max(0, this.impactFlashLife - safeDt);
      const ratio = this.impactFlashLife / this.impactFlashDuration;
      this.impactLight.intensity = this.impactFlashIntensity * ratio * ratio;
      if (this.impactFlashLife === 0) {
        this.impactLight.intensity = 0;
      }
    }
    this.beamUpdated = false;
  }

  private updateSparks(dt: number): void {
    if (this.sparksActive === 0) {
      return;
    }
    let active = 0;
    for (let index = 0; index < MAX_SPARKS; index += 1) {
      const spark = this.sparks[index];
      if (!spark.active) {
        this.sparkAlphas[index] = 0;
        this.sparkPositions[index * 3 + 1] = -999;
        continue;
      }
      spark.life -= dt;
      if (spark.life <= 0) {
        spark.active = false;
        this.sparkAlphas[index] = 0;
        this.sparkPositions[index * 3 + 1] = -999;
        continue;
      }
      active += 1;
      spark.vy -= 9.5 * dt;
      spark.vx *= 0.985;
      spark.vz *= 0.985;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.z += spark.vz * dt;
      const ratio = spark.life / spark.maxLife;
      this.sparkPositions[index * 3] = spark.x;
      this.sparkPositions[index * 3 + 1] = spark.y;
      this.sparkPositions[index * 3 + 2] = spark.z;
      this.sparkColors[index * 3] = spark.color.r;
      this.sparkColors[index * 3 + 1] = spark.color.g;
      this.sparkColors[index * 3 + 2] = spark.color.b;
      this.sparkSizes[index] = spark.size * (0.7 + ratio * 0.3);
      this.sparkAlphas[index] = Math.min(1, ratio * 1.6);
    }
    this.sparksActive = active;
    (this.sparkGeometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.sparkGeometry.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true;
    (this.sparkGeometry.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true;
    (this.sparkGeometry.getAttribute('aAlpha') as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateDebris(dt: number): void {
    let any = false;
    for (let index = 0; index < MAX_DEBRIS; index += 1) {
      const piece = this.debrisPieces[index];
      if (!piece.active) {
        continue;
      }
      piece.life -= dt;
      if (piece.life <= 0) {
        piece.active = false;
        this.debrisDummy.position.set(0, -999, 0);
        this.debrisDummy.scale.setScalar(0);
        this.debrisDummy.updateMatrix();
        this.debrisMesh.setMatrixAt(index, this.debrisDummy.matrix);
        any = true;
        continue;
      }
      piece.vy -= 14 * dt;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.z += piece.vz * dt;
      if (piece.y < -MINE_DEPTH + 0.2) {
        piece.y = -MINE_DEPTH + 0.2;
        piece.vy *= -0.25;
        piece.vx *= 0.7;
        piece.vz *= 0.7;
      }
      piece.rx += piece.sx * dt;
      piece.ry += piece.sy * dt;
      piece.rz += piece.sz * dt;
      this.debrisDummy.position.set(piece.x, piece.y, piece.z);
      this.debrisDummy.rotation.set(piece.rx, piece.ry, piece.rz);
      this.debrisDummy.scale.setScalar(piece.scale * Math.min(1, piece.life * 3));
      this.debrisDummy.updateMatrix();
      this.debrisMesh.setMatrixAt(index, this.debrisDummy.matrix);
      any = true;
    }
    if (any) {
      this.debrisMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateArcs(dt: number): void {
    for (const slot of this.arcs) {
      if (slot.life <= 0) {
        continue;
      }
      slot.life = Math.max(0, slot.life - dt);
      const ratio = slot.life / slot.maxLife;
      slot.material.opacity = ratio * 0.95;
      if (slot.life === 0) {
        slot.line.visible = false;
      }
    }
  }

  private updateShockwaves(dt: number): void {
    for (let index = this.shockwaves.length - 1; index >= 0; index -= 1) {
      const wave = this.shockwaves[index];
      wave.life -= dt;
      const progress = 1 - Math.max(0, wave.life) / wave.maxLife;
      wave.mesh.scale.setScalar(0.2 + progress * wave.radius);
      wave.material.opacity = Math.max(0, (1 - progress) * 0.42);
      if (wave.life <= 0) {
        this.group.remove(wave.mesh);
        wave.mesh.geometry.dispose();
        wave.material.dispose();
        this.shockwaves.splice(index, 1);
      }
    }
  }

  private updateDust(dt: number): void {
    this.dustElapsed += dt;
    const count = this.dustPositions.length / 3;
    for (let index = 0; index < count; index += 1) {
      const yIndex = index * 3 + 1;
      this.dustPositions[yIndex] += dt * (0.05 + (index % 7) * 0.008);
      if (this.dustPositions[yIndex] > 1) {
        this.dustPositions[yIndex] = -MINE_DEPTH + 1;
      }
      this.dustPositions[index * 3] =
        this.dustBase[index * 3] +
        Math.sin(this.dustElapsed * 0.09 + index * 1.7) * 0.4;
      this.dustPositions[index * 3 + 2] =
        this.dustBase[index * 3 + 2] +
        Math.cos(this.dustElapsed * 0.07 + index * 2.1) * 0.4;
    }
    (this.dust.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.sparkGeometry.dispose();
    this.sparkMaterial.dispose();
    this.debrisMesh.dispose();
    this.debrisMesh.geometry.dispose();
    this.debrisMaterial.dispose();
    for (const arc of this.arcs) {
      arc.geometry.dispose();
      arc.material.dispose();
    }
    for (const wave of this.shockwaves) {
      wave.mesh.geometry.dispose();
      wave.material.dispose();
    }
    for (const light of this.explosionLights) {
      light.dispose();
    }
    this.impactLight.dispose();
    this.beamGeometry.dispose();
    this.beamMaterial.dispose();
    this.dust.geometry.dispose();
    (this.dust.material as THREE.PointsMaterial).map?.dispose();
    (this.dust.material as THREE.PointsMaterial).dispose();
    this.dustTexture.dispose();
  }
}
