import * as THREE from 'three';
import { HOPPER_POSITION, SURFACE_DECK_Y } from '../config';
import { mulberry32 } from '../core/Rng';

function makeSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#080d0e';
    context.fillRect(0, 0, 512, 192);
    context.strokeStyle = '#d9a24d';
    context.lineWidth = 6;
    context.strokeRect(8, 8, 496, 176);
    context.fillStyle = '#ffc66f';
    context.font = '800 58px "Bahnschrift SemiCondensed", "Arial Narrow", sans-serif';
    context.fillText('TOLVA', 30, 82);
    context.fillStyle = '#f2e7d3';
    context.font = '600 25px "Cascadia Mono", "Consolas", monospace';
    context.fillText('DEPÓSITO DE CARBÓN', 32, 120);
    context.fillStyle = '#6edfd5';
    context.font = '500 20px "Cascadia Mono", "Consolas", monospace';
    context.fillText('CARGA · $ · CUOTA', 32, 154);
    context.fillStyle = '#d9a24d';
    for (let index = 0; index < 8; index += 1) {
      context.fillRect(340 + index * 18, 144, 8, 3);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 1;
  return texture;
}

export class Hopper {
  readonly group = new THREE.Group();
  private readonly pile: THREE.Mesh;
  private readonly pileMaterial: THREE.MeshStandardMaterial;
  private readonly chunks: THREE.InstancedMesh;
  private readonly chunkMaterial: THREE.MeshStandardMaterial;
  private readonly rimMaterial: THREE.MeshStandardMaterial;
  private readonly light: THREE.PointLight;
  private readonly signTexture: THREE.CanvasTexture;
  private readonly dummy = new THREE.Object3D();
  private readonly chunkData: Array<{
    angle: number;
    radius: number;
    phase: number;
    tint: THREE.Color;
    isOverflow: boolean;
  }> = [];
  private fill = 0;
  private targetFill = 0;
  private pulse = 0;
  private elapsed = 0;

  constructor() {
    this.group.name = 'carbon-hopper';
    this.group.position.set(HOPPER_POSITION.x, SURFACE_DECK_Y, HOPPER_POSITION.z);
    this.group.scale.setScalar(0.62);
    const metal = new THREE.MeshStandardMaterial({
      color: 0x525b57,
      roughness: 0.5,
      metalness: 0.65,
      flatShading: true,
    });
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x171d1c,
      roughness: 0.7,
      metalness: 0.42,
      flatShading: true,
    });
    this.rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b2418,
      emissive: 0xffb653,
      emissiveIntensity: 0.7,
      roughness: 0.38,
      metalness: 0.45,
    });
    this.pileMaterial = new THREE.MeshStandardMaterial({
      color: 0x121a1b,
      emissive: 0x183236,
      emissiveIntensity: 0.35,
      roughness: 0.72,
      metalness: 0.2,
      flatShading: true,
    });
    this.chunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e4547,
      emissive: 0x4e969a,
      emissiveIntensity: 0.75,
      roughness: 0.54,
      metalness: 0.36,
      flatShading: true,
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.35, 0.2, 12), darkMetal);
    base.position.y = 0.1;
    base.receiveShadow = false;
    this.group.add(base);

    const hazardTexture = this.makeHazardTexture();
    const hazard = new THREE.Mesh(
      new THREE.CylinderGeometry(2.76, 2.82, 0.2, 20, 1, true),
      new THREE.MeshStandardMaterial({
        map: hazardTexture,
        roughness: 0.8,
        metalness: 0.08,
        side: THREE.DoubleSide,
      }),
    );
    hazard.position.y = 0.3;
    this.group.add(hazard);

    const bin = new THREE.Mesh(
      new THREE.CylinderGeometry(2.55, 1.25, 2.15, 10, 1, true),
      metal,
    );
    bin.position.y = 1.5;
    this.group.add(bin);

    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(2.42, 1.12, 2.1, 10, 1, true),
      darkMetal,
    );
    inner.position.y = 1.52;
    this.group.add(inner);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.56, 0.11, 6, 32), this.rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 2.58;
    this.group.add(rim);

    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.25, 0.16), metal);
      leg.position.set(Math.cos(angle) * 2.15, 0.72, Math.sin(angle) * 2.15);
      this.group.add(leg);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.12, 6), darkMetal);
      foot.position.set(leg.position.x, 0.12, leg.position.z);
      this.group.add(foot);
    }

    for (const side of [-1, 1]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.15, 0.16), this.rimMaterial);
      band.position.set(0, 1.5, side * 2.48);
      band.rotation.x = side * 0.22;
      this.group.add(band);
    }

    const chute = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.65, 1.0, 8), metal);
    chute.position.set(0, 1.0, 1.5);
    chute.rotation.x = Math.PI / 2.9;
    this.group.add(chute);

    this.pile = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1, 12, 1), this.pileMaterial);
    this.pile.position.y = 0.55;
    this.pile.visible = false;
    this.group.add(this.pile);

    const chunkGeometry = new THREE.DodecahedronGeometry(0.22, 0);
    const chunkRandom = mulberry32(0x51a7c0de);
    this.chunks = new THREE.InstancedMesh(chunkGeometry, this.chunkMaterial, 72);
    this.chunks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.chunks.frustumCulled = false;
    this.chunks.count = 0;
    this.chunks.setColorAt(0, new THREE.Color(0xffffff));
    for (let index = 0; index < 72; index += 1) {
      const isOverflow = index >= 52;
      this.chunkData.push({
        angle: chunkRandom() * Math.PI * 2,
        radius: isOverflow ? 2.25 + chunkRandom() * 0.45 : Math.sqrt(chunkRandom()),
        phase: chunkRandom(),
        tint: new THREE.Color().setHex(
          chunkRandom() > 0.8 ? 0x70dfe2 : chunkRandom() > 0.45 ? 0x9d7137 : 0x334b4c,
        ),
        isOverflow,
      });
      this.chunks.setColorAt(index, this.chunkData[index].tint);
    }
    if (this.chunks.instanceColor) {
      this.chunks.instanceColor.needsUpdate = true;
    }
    this.group.add(this.chunks);

    const signTexture = makeSignTexture();
    this.signTexture = signTexture;
    const signMaterial = new THREE.MeshBasicMaterial({
      map: signTexture,
      toneMapped: false,
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.05, 1.14), signMaterial);
    sign.position.set(0, 3.72, -1.4);
    sign.rotation.y = -1.2;
    this.group.add(sign);

    for (const offset of [-1.05, 1.05]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.1, 0.1), metal);
      post.position.set(offset, 2.35, -1.4);
      this.group.add(post);
    }

    this.light = new THREE.PointLight(0xffc16a, 18, 12, 1.8);
    this.light.position.set(0, 2.2, 0);
    this.group.add(this.light);

    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
  }

  private makeHazardTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#181714';
      context.fillRect(0, 0, 128, 32);
      context.strokeStyle = '#d8a044';
      context.lineWidth = 10;
      for (let x = -32; x < 160; x += 34) {
        context.beginPath();
        context.moveTo(x, 32);
        context.lineTo(x + 32, 0);
        context.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.set(5, 1);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  update(dt: number, carbon: number, quota: number): void {
    this.elapsed += dt;
    this.pulse = Math.max(0, this.pulse - dt * 1.8);
    this.targetFill = THREE.MathUtils.clamp(carbon / Math.max(1, quota), 0, 1.7);
    this.fill = THREE.MathUtils.damp(this.fill, this.targetFill, 3.6 + this.pulse * 5, dt);
    const visibleFill = this.fill > 0.005;
    this.pile.visible = visibleFill;
    const pileHeight = 0.15 + Math.pow(Math.min(1, this.fill), 1.2) * 1.8;
    const radiusScale = 0.55 + Math.min(1, this.fill) * 0.45;
    if (visibleFill) {
      this.pile.scale.set(radiusScale, pileHeight, radiusScale);
      this.pile.position.y = 0.55 + pileHeight * 0.5;
      this.pile.rotation.y = this.elapsed * 0.06;
      this.pileMaterial.emissiveIntensity = 0.35 + Math.min(1.2, this.fill) * 0.5;
    }

    const baseChunks = Math.floor(Math.min(1, this.fill) * 52);
    const overflowChunks =
      this.fill > 1
        ? Math.floor(Math.min(1, (this.fill - 1) / 0.7) * 20)
        : 0;
    this.chunks.count = Math.min(this.chunkData.length, baseChunks + overflowChunks);
    for (let index = 0; index < this.chunks.count; index += 1) {
      const data = this.chunkData[index];
      let y: number;
      let radius: number;
      if (data.isOverflow && this.fill > 1) {
        radius = data.radius;
        y = 2.56 + data.phase * 0.2;
      } else {
        const normalized = data.phase;
        const maxRadius = 1.9 * (1 - normalized) * radiusScale;
        radius = data.radius * maxRadius;
        y = 0.58 + normalized * pileHeight;
      }
      this.dummy.position.set(
        Math.cos(data.angle) * radius,
        y,
        Math.sin(data.angle) * radius,
      );
      this.dummy.rotation.set(data.angle * 1.7, data.angle, data.phase * 6);
      this.dummy.scale.setScalar((data.isOverflow ? 0.9 : 0.7) + (this.pulse * 0.2));
      this.dummy.updateMatrix();
      this.chunks.setMatrixAt(index, this.dummy.matrix);
    }
    this.chunks.instanceMatrix.needsUpdate = true;
    this.chunks.visible = this.fill > 0.04;

    this.rimMaterial.emissiveIntensity = 0.55 + Math.min(1.4, this.fill) * 1.1 + this.pulse * 0.8;
    this.light.intensity = 14 + Math.min(1.6, this.fill) * 20 + this.pulse * 36;
  }

  triggerPulse(): void {
    this.pulse = 1;
  }

  getPosition(): THREE.Vector3 {
    return this.group.position;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial) {
            material.map?.dispose();
          }
          material.dispose();
        }
      }
    });
    this.signTexture.dispose();
  }
}
