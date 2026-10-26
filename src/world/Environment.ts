import * as THREE from 'three';
import {
  PIT_HALF,
  SURFACE_DECK_HALF,
  SURFACE_DECK_Y,
  SURFACE_SPAWN,
} from '../config';
import { mulberry32 } from '../core/Rng';
import { buildLandscape } from './Landscape';
import { SkyCycle } from './SkyCycle';

function makeTextTexture(
  title: string,
  subtitle: string,
  accent = '#e1a54a',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 384;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#060b0d';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(225,165,74,0.6)';
    context.lineWidth = 5;
    context.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
    context.fillStyle = accent;
    context.fillRect(34, 54, 10, 92);
    context.fillStyle = '#f1e4cb';
    context.font = '800 92px "Bahnschrift SemiCondensed", "Arial Narrow", sans-serif';
    context.fillText(title, 70, 132);
    context.fillStyle = '#9aaba7';
    context.font = '500 28px "Cascadia Mono", "Consolas", monospace';
    context.fillText(subtitle, 72, 192);
    context.fillStyle = 'rgba(225,165,74,0.18)';
    for (let x = 40; x < canvas.width - 40; x += 32) {
      context.fillRect(x, 248, 14, 2);
    }
    context.fillStyle = '#e1a54a';
    context.font = '600 23px "Cascadia Mono", "Consolas", monospace';
    context.fillText('MAGNATE // DIVISION DE EXTRACCION PROFUNDA', 72, 300);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 1;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

function makePanelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#5b6e66';
    context.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 16) {
      context.fillStyle = 'rgba(18,28,25,0.32)';
      context.fillRect(0, y, 128, 3);
      context.fillStyle = 'rgba(236,246,232,0.07)';
      context.fillRect(0, y + 3, 128, 1);
    }
    for (let x = 0; x < 128; x += 32) {
      context.fillStyle = 'rgba(18,28,25,0.24)';
      context.fillRect(x, 0, 2, 128);
      context.fillStyle = 'rgba(236,246,232,0.055)';
      context.fillRect(x + 2, 0, 1, 128);
    }
    context.fillStyle = 'rgba(210,220,204,0.28)';
    for (let y = 8; y < 128; y += 16) {
      for (let x = 16; x < 128; x += 32) {
        context.fillRect(x, y, 2, 2);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

function makeCrateTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#8a6b46';
    context.fillRect(0, 0, 64, 64);
    context.fillStyle = 'rgba(55,38,22,0.35)';
    for (let y = 15; y < 64; y += 16) {
      context.fillRect(0, y, 64, 2);
    }
    context.fillStyle = 'rgba(236,214,172,0.12)';
    for (let y = 17; y < 64; y += 16) {
      context.fillRect(0, y, 64, 1);
    }
    context.fillStyle = '#413d32';
    context.fillRect(0, 26, 64, 8);
    context.fillStyle = '#6e6652';
    context.fillRect(0, 29, 64, 2);
    context.fillStyle = 'rgba(20,18,14,0.5)';
    context.fillRect(0, 0, 3, 64);
    context.fillRect(61, 0, 3, 64);
    context.fillStyle = 'rgba(236,214,172,0.22)';
    for (let x = 7; x < 64; x += 12) {
      context.fillRect(x, 28, 2, 2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function makePixelSurfaceTexture(
  base: number,
  accent: number,
  seed: number,
  repeat = 10,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    const baseColor = new THREE.Color(base);
    const accentColor = new THREE.Color(accent);
    const random = mulberry32(seed);
    const lattice = new Float32Array(33 * 33);
    for (let index = 0; index < lattice.length; index += 1) {
      lattice[index] = random();
    }
    const smooth = (value: number): number => {
      const t = Math.max(0, Math.min(1, value));
      return t * t * (3 - 2 * t);
    };
    const sample = (x: number, y: number): number => {
      const gx = (x / 128) * 32;
      const gy = (y / 128) * 32;
      const ix = Math.min(31, Math.floor(gx));
      const iy = Math.min(31, Math.floor(gy));
      const fx = smooth(gx - ix);
      const fy = smooth(gy - iy);
      const at = (px: number, py: number): number => lattice[py * 33 + px];
      const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * fx;
      const bottom = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * fx;
      return top + (bottom - top) * fy;
    };

    const tinted = baseColor.clone();
    for (let y = 0; y < 128; y += 4) {
      for (let x = 0; x < 128; x += 4) {
        const mottle = sample(x + 2, y + 2);
        const grain = (random() - 0.5) * 0.03;
        tinted
          .copy(baseColor)
          .lerp(accentColor, 0.06 + mottle * 0.24)
          .multiplyScalar(0.94 + mottle * 0.09 + grain);
        context.fillStyle = '#' + tinted.getHexString();
        context.fillRect(x, y, 4, 4);
      }
    }

    for (let index = 0; index < 360; index += 1) {
      context.fillStyle =
        random() > 0.5 ? 'rgba(255,246,224,0.035)' : 'rgba(27,20,14,0.045)';
      context.fillRect(
        Math.floor(random() * 128),
        Math.floor(random() * 128),
        random() > 0.86 ? 2 : 1,
        1,
      );
    }

    context.strokeStyle = 'rgba(34,24,16,0.08)';
    context.lineWidth = 1;
    for (let index = 0; index < 8; index += 1) {
      const x = Math.floor(random() * 128);
      const y = Math.floor(random() * 128);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + 5, y + 3);
      context.lineTo(x + 8, y + 7);
      context.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.needsUpdate = true;
  return texture;
}

export class Environment {
  readonly group = new THREE.Group();
  private readonly meshes: THREE.Mesh[] = [];
  private readonly textures: THREE.Texture[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly warningLights: THREE.MeshStandardMaterial[] = [];
  private readonly skyCycle: SkyCycle;
  private readonly camera: THREE.PerspectiveCamera;
  private elapsed = 0;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.group.name = 'surface-environment';
    scene.add(this.group);
    this.skyCycle = new SkyCycle(scene, this.group);
    this.buildSurfaceYard();
    this.buildSafeZoneProps();
    this.buildOffice();
    buildLandscape(this.group, this.meshes, this.materials);
    this.buildDescentSign();
  }

  private buildSurfaceYard(): void {
    const shape = new THREE.Shape();
    const outer = SURFACE_DECK_HALF;
    shape.moveTo(-outer, -outer);
    shape.lineTo(outer, -outer);
    shape.lineTo(outer, outer);
    shape.lineTo(-outer, outer);
    shape.lineTo(-outer, -outer);
    const deckHole = PIT_HALF - 0.5;
    const hole = new THREE.Path();
    hole.moveTo(-deckHole, -deckHole);
    hole.lineTo(-deckHole, deckHole);
    hole.lineTo(deckHole, deckHole);
    hole.lineTo(deckHole, -deckHole);
    hole.lineTo(-deckHole, -deckHole);
    shape.holes.push(hole);
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    const deckTexture = makePixelSurfaceTexture(0x9a7852, 0xba9668, 0xd00d, 8);
    this.textures.push(deckTexture);
    const material = new THREE.MeshStandardMaterial({
      map: deckTexture,
      color: 0xffffff,
      roughness: 0.96,
      metalness: 0.05,
    });
    const deck = new THREE.Mesh(geometry, material);
    deck.position.y = SURFACE_DECK_Y;
    deck.receiveShadow = false;
    this.group.add(deck);
    this.meshes.push(deck);
    this.materials.push(material);

  }

  private buildOffice(): void {
    const concreteTexture = makePixelSurfaceTexture(0x686a5e, 0x44483f, 0x0ff1ce, 3);
    const metalTexture = makePixelSurfaceTexture(0x6d7a73, 0x414d49, 0x5caff01, 4);
    const panelTexture = makePanelTexture();
    const crateTexture = makeCrateTexture();
    this.textures.push(concreteTexture, metalTexture, panelTexture, crateTexture);
    const concrete = new THREE.MeshStandardMaterial({
      map: concreteTexture,
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.06,
    });
    const metal = new THREE.MeshStandardMaterial({
      map: metalTexture,
      color: 0xffffff,
      roughness: 0.62,
      metalness: 0.3,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x55635e,
      emissive: 0x0b100e,
      emissiveIntensity: 0.4,
      roughness: 0.72,
      metalness: 0.16,
    });
    const officeWall = new THREE.MeshStandardMaterial({
      map: panelTexture,
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.24,
      emissive: 0x060b09,
      emissiveIntensity: 0.25,
    });
    const crateMaterial = new THREE.MeshStandardMaterial({
      map: crateTexture,
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.04,
    });
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f2425,
      emissive: 0xe1a54a,
      emissiveIntensity: 1.1,
      roughness: 0.2,
      metalness: 0.1,
    });
    this.materials.push(concrete, metal, dark, officeWall, crateMaterial, windowMaterial);

    const office = new THREE.Group();
    office.position.set(-31, SURFACE_DECK_Y, 12);
    office.rotation.y = 0.16;
    this.group.add(office);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.25, 8), concrete);
    floor.position.y = 0.12;
    office.add(floor);
    this.meshes.push(floor);

    const building = new THREE.Mesh(new THREE.BoxGeometry(9.5, 3.8, 6.4), officeWall);
    building.position.set(-0.7, 2.145, 0);
    office.add(building);
    this.meshes.push(building);

    for (let index = 0; index < 3; index += 1) {
      const window = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.25, 0.08), windowMaterial);
      window.position.set(-3.4 + index * 2.9, 2.45, 3.23);
      office.add(window);
      this.meshes.push(window);
    }

    for (let index = 0; index < 2; index += 1) {
      const sideWindow = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.25, 2.1),
        windowMaterial,
      );
      sideWindow.position.set(4.08, 2.45, -1.4 + index * 2.8);
      office.add(sideWindow);
      this.meshes.push(sideWindow);
    }

    const roof = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.22, 7.2), dark);
    roof.position.set(-0.7, 4.14, 0);
    office.add(roof);
    this.meshes.push(roof);

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.15, 1.35), dark);
    door.position.set(4.09, 1.34, 0);
    office.add(door);
    this.meshes.push(door);
    const doorLight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 1.0), windowMaterial);
    doorLight.position.set(4.11, 2.46, 0);
    office.add(doorLight);
    this.meshes.push(doorLight);

    const signTexture = makeTextTexture('OFICINA', 'CONTROL DE CUOTA // TURNO NOCTURNO');
    this.textures.push(signTexture);
    const signMaterial = new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false });
    this.materials.push(signMaterial);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 3.08), signMaterial);
    sign.position.set(-0.7, 4.85, 0.05);
    office.add(sign);
    this.meshes.push(sign);

    const antennaMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a2020,
      emissive: 0x89d7cc,
      emissiveIntensity: 0.55,
      roughness: 0.4,
    });
    this.materials.push(antennaMaterial);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.6, 6), metal);
    mast.position.set(3.8, 6.1, -1.2);
    office.add(mast);
    this.meshes.push(mast);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), antennaMaterial);
    beacon.position.set(3.8, 8.45, -1.2);
    office.add(beacon);
    this.meshes.push(beacon);

    const officeLight = new THREE.PointLight(0xffbd72, 26, 24, 1.7);
    officeLight.position.set(-28, 3.2, 13);
    this.group.add(officeLight);

    for (let index = 0; index < 7; index += 1) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), crateMaterial);
      crate.position.set(
        -36 + (index % 4) * 1.4,
        SURFACE_DECK_Y + 0.6,
        6 + Math.floor(index / 4) * 1.5,
      );
      crate.rotation.y = index * 0.3;
      this.group.add(crate);
      this.meshes.push(crate);
    }
  }

  private buildSafeZoneProps(): void {
    const plateTexture = makePixelSurfaceTexture(0x8d8270, 0x6e6557, 0x5afe01, 8);
    this.textures.push(plateTexture);
    const plateMaterial = new THREE.MeshStandardMaterial({
      map: plateTexture,
      color: 0xffe6c8,
      roughness: 0.9,
      metalness: 0.08,
    });
    const glowMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d2414,
      emissive: 0xe8a344,
      emissiveIntensity: 0.85,
      roughness: 0.5,
      metalness: 0.25,
    });
    const railMaterial = new THREE.MeshStandardMaterial({
      color: 0x586460,
      roughness: 0.5,
      metalness: 0.64,
    });
    this.materials.push(plateMaterial, glowMaterial, railMaterial);

    const spawnPad = new THREE.Mesh(
      new THREE.CylinderGeometry(2.7, 2.85, 0.11, 18),
      plateMaterial,
    );
    spawnPad.position.set(SURFACE_SPAWN.x, SURFACE_DECK_Y + 0.05, SURFACE_SPAWN.z);
    this.group.add(spawnPad);
    this.meshes.push(spawnPad);

    const spawnRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.25, 0.055, 5, 32),
      glowMaterial,
    );
    spawnRing.rotation.x = Math.PI / 2;
    spawnRing.position.set(SURFACE_SPAWN.x, SURFACE_DECK_Y + 0.13, SURFACE_SPAWN.z);
    this.group.add(spawnRing);
    this.meshes.push(spawnRing);

    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xe2a247 });
    this.materials.push(arrowMaterial);
    for (let index = 0; index < 3; index += 1) {
      const chevron = new THREE.Mesh(new THREE.PlaneGeometry(0.9 - index * 0.2, 0.16), arrowMaterial);
      chevron.rotation.x = -Math.PI / 2;
      chevron.position.set(
        SURFACE_SPAWN.x,
        SURFACE_DECK_Y + 0.14,
        SURFACE_SPAWN.z - 1.25 - index * 0.28,
      );
      this.group.add(chevron);
      this.meshes.push(chevron);
    }

    const safeSign = makeTextTexture('ZONA SEGURA', 'NO MINABLE · TOLVA CORPORATIVA', '#6edfd5');
    safeSign.magFilter = THREE.NearestFilter;
    safeSign.minFilter = THREE.NearestFilter;
    this.textures.push(safeSign);
    const safeSignMaterial = new THREE.MeshBasicMaterial({ map: safeSign, toneMapped: false });
    this.materials.push(safeSignMaterial);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.95), safeSignMaterial);
    sign.position.set(-5.8, 2.65, SURFACE_SPAWN.z + 2.0);
    sign.rotation.y = 1.9;
    this.group.add(sign);
    this.meshes.push(sign);
    for (const offset of [-2.4, 2.4]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 0.12), railMaterial);
      post.position.set(-5.8 + offset, SURFACE_DECK_Y + 1.25, SURFACE_SPAWN.z + 1.94);
      this.group.add(post);
      this.meshes.push(post);
    }

    const pointerMaterial = new THREE.MeshBasicMaterial({ color: 0xe2a247 });
    this.materials.push(pointerMaterial);
    for (let index = 0; index < 3; index += 1) {
      const pointer = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.14), pointerMaterial);
      pointer.rotation.x = -Math.PI / 2;
      pointer.rotation.z = -Math.PI / 2;
      pointer.position.set(3.0 + index * 0.6, SURFACE_DECK_Y + 0.14, SURFACE_SPAWN.z);
      this.group.add(pointer);
      this.meshes.push(pointer);
    }

    const beaconMaterial = new THREE.MeshStandardMaterial({
      color: 0x282013,
      emissive: 0xffae4f,
      emissiveIntensity: 1.1,
      roughness: 0.35,
    });
    this.materials.push(beaconMaterial);
    this.warningLights.push(beaconMaterial);
    for (const x of [-3.2, 3.2]) {
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.55, 6), beaconMaterial);
      beacon.position.set(x, SURFACE_DECK_Y + 0.3, PIT_HALF + 1.1);
      this.group.add(beacon);
      this.meshes.push(beacon);
    }
  }

  private buildDescentSign(): void {
    const signTexture = makeTextTexture('DESCENSO', 'CUBO MINERO · 120 M');
    signTexture.magFilter = THREE.NearestFilter;
    signTexture.minFilter = THREE.NearestFilter;
    this.textures.push(signTexture);
    const signMaterial = new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false });
    this.materials.push(signMaterial);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.4), signMaterial);
    sign.position.set(0, 2.8, -PIT_HALF - 0.9);
    this.group.add(sign);
    this.meshes.push(sign);

    const postMaterial = new THREE.MeshStandardMaterial({
      color: 0x4d554f,
      roughness: 0.55,
      metalness: 0.6,
    });
    this.materials.push(postMaterial);
    for (const offset of [-3.1, 3.1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.6, 0.16), postMaterial);
      post.position.set(offset, 1.3, -PIT_HALF - 0.98);
      this.group.add(post);
      this.meshes.push(post);
    }
    const lampMaterial = new THREE.MeshStandardMaterial({
      color: 0x21180d,
      emissive: 0xffb054,
      emissiveIntensity: 1.4,
      roughness: 0.4,
    });
    this.materials.push(lampMaterial);
    this.warningLights.push(lampMaterial);
    for (const offset of [-3.1, 3.1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.14), lampMaterial);
      lamp.position.set(offset, 4.08, -PIT_HALF - 0.9);
      this.group.add(lamp);
      this.meshes.push(lamp);
    }
  }

  update(dt: number, dayProgress = 0.15): void {
    this.elapsed += dt;
    this.skyCycle.update(dayProgress, this.camera.position, dt);
    const pulse = 0.75 + Math.sin(this.elapsed * 2.2) * 0.25;
    for (let index = 0; index < this.warningLights.length; index += 1) {
      this.warningLights[index].emissiveIntensity = 0.72 + pulse * 0.5;
    }
  }

  dispose(): void {
    this.skyCycle.dispose();
    this.group.removeFromParent();
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
        child.geometry.dispose();
        const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of childMaterials) {
          material.dispose();
        }
      }
    });
    for (const texture of this.textures) {
      texture.dispose();
    }
  }
}
