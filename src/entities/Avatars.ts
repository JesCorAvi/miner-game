import * as THREE from 'three';
import { PLAYER_COLORS } from '../config';
import type {
  NetworkPlayerState,
  NetworkStaffState,
  RosterEntry,
  WeaponId,
} from '../types';

interface ToolRig {
  group: THREE.Group;
  weapon: WeaponId;
}

interface AvatarRig {
  id: string;
  root: THREE.Group;
  nameSprite: THREE.Sprite;
  nameTexture: THREE.CanvasTexture;
  head: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  jetLeft: THREE.Mesh;
  jetRight: THREE.Mesh;
  jetMaterial: THREE.MeshBasicMaterial;
  tools: ToolRig[];
  weapon: WeaponId;
  targetX: number;
  targetY: number;
  targetZ: number;
  targetYaw: number;
  targetPitch: number;
  currentYaw: number;
  moving: boolean;
  mining: boolean;
  jetpack: boolean;
  walkPhase: number;
  miningPhase: number;
  flicker: number;
}

function normalizeAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function makeLabel(name: string, subtitle: string, accent: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 144;
  const context = canvas.getContext('2d');
  if (context) {
    context.clearRect(0, 0, 512, 144);
    context.fillStyle = 'rgba(3, 8, 9, 0.86)';
    context.beginPath();
    context.roundRect(8, 12, 496, 120, 18);
    context.fill();
    context.strokeStyle = `${accent}b8`;
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = accent;
    context.fillRect(22, 30, 7, 84);
    context.fillStyle = '#f1e7d3';
    context.font = '700 38px "Bahnschrift SemiCondensed", "Arial Narrow", sans-serif';
    context.textBaseline = 'middle';
    context.fillText(name.slice(0, 18), 46, 58);
    context.fillStyle = '#859994';
    context.font = '500 20px "Cascadia Mono", "Consolas", monospace';
    context.fillText(subtitle.slice(0, 32), 46, 98);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function buildJetpackFlame(position: THREE.Vector3): THREE.Mesh {
  const geometry = new THREE.ConeGeometry(0.075, 0.32, 7);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff9e43,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.x = Math.PI;
  mesh.visible = false;
  return mesh;
}

function buildToolSet(accent: THREE.MeshStandardMaterial, steel: THREE.MeshStandardMaterial): ToolRig[] {
  const result: ToolRig[] = [];
  const add = (weapon: WeaponId, group: THREE.Group): void => {
    group.visible = false;
    result.push({ group, weapon });
  };

  const pickaxe = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.7, 6), steel);
  handle.position.y = -0.25;
  pickaxe.add(handle);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.11), steel);
  head.position.y = 0.08;
  pickaxe.add(head);
  const tipA = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 4), accent);
  tipA.position.set(-0.25, 0.08, 0);
  tipA.rotation.z = Math.PI / 2;
  pickaxe.add(tipA);
  const tipB = tipA.clone();
  tipB.position.x = 0.25;
  tipB.rotation.z = -Math.PI / 2;
  pickaxe.add(tipB);
  add('pickaxe', pickaxe);

  const tesla = new THREE.Group();
  const tHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.68, 6), steel);
  tHandle.position.y = -0.26;
  tesla.add(tHandle);
  const coil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 5), accent);
  coil.position.y = 0.08;
  tesla.add(coil);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 4, 10), accent);
  ring.position.y = 0.08;
  ring.rotation.x = Math.PI / 2;
  tesla.add(ring);
  add('tesla', tesla);

  const drill = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.2, 0.38), steel);
  body.position.z = -0.14;
  drill.add(body);
  const bit = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.36, 6), accent);
  bit.rotation.x = -Math.PI / 2;
  bit.position.z = -0.46;
  drill.add(bit);
  add('drill', drill);

  const shotgun = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.62, 6), steel);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = -0.3;
  shotgun.add(barrel);
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.2), accent);
  receiver.position.z = -0.02;
  shotgun.add(receiver);
  add('shotgun', shotgun);

  return result;
}

function setAvatarWeapon(rig: AvatarRig, weapon: WeaponId): void {
  rig.weapon = weapon;
  for (const tool of rig.tools) {
    tool.group.visible = tool.weapon === weapon;
  }
}

function buildAvatar(
  scene: THREE.Scene,
  id: string,
  name: string,
  subtitle: string,
  colorIndex: number,
  withLamp: boolean,
  nameHeight: number,
): AvatarRig {
  const accentColor = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  const accent = new THREE.Color(accentColor);
  const root = new THREE.Group();
  root.name = `avatar-${id}`;

  const suit = new THREE.MeshStandardMaterial({
    color: 0x343e3e,
    roughness: 0.82,
    metalness: 0.16,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c2223,
    emissive: accent,
    emissiveIntensity: 0.9,
    roughness: 0.4,
    metalness: 0.45,
  });
  const skin = new THREE.MeshStandardMaterial({
    color: 0xb07a52,
    roughness: 0.82,
    metalness: 0,
  });
  const visorMaterial = new THREE.MeshStandardMaterial({
    color: 0x071011,
    emissive: accent,
    emissiveIntensity: 0.75,
    roughness: 0.2,
    metalness: 0.4,
  });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.32, 0.72, 8), suit);
  torso.position.y = 1.05;
  torso.castShadow = false;
  root.add(torso);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.17, 0.07), accentMaterial);
  chest.position.set(0, 1.2, -0.27);
  root.add(chest);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 8), accentMaterial);
  belt.position.y = 0.72;
  root.add(belt);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.14, 0.72, 0);
  const leftLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.105, 0.64, 6), suit);
  leftLegMesh.position.y = -0.32;
  leftLeg.add(leftLegMesh);
  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.31), accentMaterial);
  leftBoot.position.set(0, -0.64, -0.05);
  leftLeg.add(leftBoot);
  root.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.14, 0.72, 0);
  const rightLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.105, 0.64, 6), suit);
  rightLegMesh.position.y = -0.32;
  rightLeg.add(rightLegMesh);
  const rightBoot = leftBoot.clone();
  rightBoot.position.x = 0;
  rightLeg.add(rightBoot);
  root.add(rightLeg);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.36, 1.32, 0);
  const leftArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.56, 6), suit);
  leftArmMesh.position.y = -0.25;
  leftArm.add(leftArmMesh);
  root.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.36, 1.32, 0);
  const rightArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.56, 6), suit);
  rightArmMesh.position.y = -0.25;
  rightArm.add(rightArmMesh);
  const tools = buildToolSet(accentMaterial, suit);
  for (const tool of tools) {
    tool.group.position.set(0, -0.55, -0.12);
    rightArm.add(tool.group);
  }
  root.add(rightArm);

  const head = new THREE.Group();
  head.position.y = 1.54;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.17, 9, 7), skin);
  head.add(face);
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.62),
    suit,
  );
  helmet.position.y = 0.06;
  head.add(helmet);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.035, 0.22), suit);
  brim.position.set(0, 0.11, -0.13);
  head.add(brim);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.08, 0.035), visorMaterial);
  visor.position.set(0, 0.02, -0.17);
  head.add(visor);
  const lampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.11, 8), accentMaterial);
  lampBody.rotation.x = Math.PI / 2;
  lampBody.position.set(0, 0.1, -0.23);
  head.add(lampBody);
  if (withLamp) {
    const spotlight = new THREE.SpotLight(0xffe3b4, 170, 21, Math.PI * 0.24, 0.6, 1.4);
    spotlight.position.set(0, 0.12, -0.25);
    spotlight.castShadow = false;
    const target = new THREE.Object3D();
    target.position.set(0, -0.25, -6);
    head.add(spotlight, target);
    spotlight.target = target;
  }
  root.add(head);

  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.48, 0.18), accentMaterial);
  backpack.position.set(0, 1.13, 0.34);
  root.add(backpack);
  const jetMaterial = new THREE.MeshBasicMaterial({
    color: 0xffa54e,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const jetLeft = buildJetpackFlame(new THREE.Vector3(-0.13, 0.84, 0.37));
  const jetRight = buildJetpackFlame(new THREE.Vector3(0.13, 0.84, 0.37));
  jetLeft.material = jetMaterial;
  jetRight.material = jetMaterial;
  root.add(jetLeft, jetRight);

  const nameTexture = makeLabel(name, subtitle, accentColor);
  const nameSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: nameTexture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  nameSprite.position.set(0, nameHeight, 0);
  nameSprite.scale.set(1.85, 0.52, 1);
  nameSprite.renderOrder = 4;
  root.add(nameSprite);

  scene.add(root);
  const rig: AvatarRig = {
    id,
    root,
    nameSprite,
    nameTexture,
    head,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    jetLeft,
    jetRight,
    jetMaterial,
    tools,
    weapon: 'pickaxe',
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    targetYaw: 0,
    targetPitch: 0,
    currentYaw: 0,
    moving: false,
    mining: false,
    jetpack: false,
    walkPhase: 0,
    miningPhase: 0,
    flicker: 0,
  };
  setAvatarWeapon(rig, 'pickaxe');
  return rig;
}

function removeRig(scene: THREE.Scene, rig: AvatarRig): void {
  scene.remove(rig.root);
  rig.nameTexture.dispose();
  const spriteMaterial = rig.nameSprite.material as THREE.SpriteMaterial;
  spriteMaterial.dispose();
  rig.root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        material.dispose();
      }
    }
  });
}

function animateRig(rig: AvatarRig, dt: number, elapsed: number): void {
  const horizontalDistance = Math.hypot(
    rig.root.position.x - rig.targetX,
    rig.root.position.z - rig.targetZ,
  );
  const smooth = rig.moving ? 11 : 14;
  rig.root.position.x = THREE.MathUtils.damp(rig.root.position.x, rig.targetX, smooth, dt);
  rig.root.position.y = THREE.MathUtils.damp(rig.root.position.y, rig.targetY, smooth + 4, dt);
  rig.root.position.z = THREE.MathUtils.damp(rig.root.position.z, rig.targetZ, smooth, dt);
  const yawDelta = normalizeAngle(rig.targetYaw - rig.currentYaw);
  rig.currentYaw += yawDelta * Math.min(1, dt * 11);
  rig.root.rotation.y = rig.currentYaw;
  rig.head.rotation.x = THREE.MathUtils.damp(
    rig.head.rotation.x,
    THREE.MathUtils.clamp(rig.targetPitch * 0.65, -0.72, 0.72),
    9,
    dt,
  );
  if (rig.moving || horizontalDistance > 0.04) {
    rig.walkPhase += dt * 9.2;
  } else {
    rig.walkPhase = THREE.MathUtils.damp(rig.walkPhase, 0, 5, dt);
  }
  const swing = Math.sin(rig.walkPhase) * (rig.moving ? 0.58 : 0.02);
  rig.leftLeg.rotation.x = swing;
  rig.rightLeg.rotation.x = -swing;
  rig.leftArm.rotation.x = -swing * 0.75;
  if (rig.mining) {
    rig.miningPhase += dt;
    rig.rightArm.rotation.x = -0.35 + Math.sin(rig.miningPhase * 16) * 0.85;
    rig.rightArm.rotation.z = -0.1 + Math.sin(rig.miningPhase * 8) * 0.15;
  } else {
    rig.miningPhase = 0;
    rig.rightArm.rotation.x = swing * 0.75;
    rig.rightArm.rotation.z = 0;
  }
  rig.jetLeft.visible = rig.jetpack;
  rig.jetRight.visible = rig.jetpack;
  if (rig.jetpack) {
    rig.flicker = 0.65 + Math.sin(elapsed * 29 + rig.walkPhase) * 0.18;
    rig.jetMaterial.opacity = 0.5 + rig.flicker * 0.3;
    rig.jetLeft.scale.y = 0.7 + rig.flicker * 0.8;
    rig.jetRight.scale.y = 0.7 + rig.flicker * 0.8;
  }
}

export class RemotePlayerAvatars {
  private readonly scene: THREE.Scene;
  private readonly rigs = new Map<string, AvatarRig>();
  private readonly rosterById = new Map<string, RosterEntry>();
  private localId = '';
  private elapsed = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setLocalId(id: string): void {
    this.localId = id;
  }

  setRoster(roster: readonly RosterEntry[]): void {
    this.rosterById.clear();
    const active = new Set<string>();
    for (const entry of roster) {
      this.rosterById.set(entry.id, entry);
      if (entry.id === this.localId) {
        continue;
      }
      active.add(entry.id);
      const existing = this.rigs.get(entry.id);
      if (existing) {
        if (existing.root.userData.name !== entry.name) {
          this.remove(entry.id);
        } else {
          continue;
        }
      }
      const subtitle = entry.isHost ? 'ANFITRIÓN · EN LÍNEA' : 'OPERARIO · EN LÍNEA';
      const rig = buildAvatar(
        this.scene,
        entry.id,
        entry.name,
        subtitle,
        entry.color,
        true,
        2.3,
      );
      rig.root.userData.name = entry.name;
      rig.root.position.set(0, -2, 9);
      rig.targetY = -2;
      this.rigs.set(entry.id, rig);
    }
    for (const id of [...this.rigs.keys()]) {
      if (!active.has(id)) {
        this.remove(id);
      }
    }
  }

  applyStates(states: readonly NetworkPlayerState[]): void {
    for (const state of states) {
      if (state.id === this.localId) {
        continue;
      }
      const rig = this.rigs.get(state.id);
      if (!rig) {
        continue;
      }
      rig.targetX = state.x;
      rig.targetY = state.y;
      rig.targetZ = state.z;
      rig.targetYaw = state.yaw;
      rig.targetPitch = state.pitch;
      rig.moving = Math.hypot(state.x - rig.root.position.x, state.z - rig.root.position.z) > 0.08;
      rig.mining = state.mining;
      rig.jetpack = state.jetpack;
      if (rig.weapon !== state.weapon) {
        setAvatarWeapon(rig, state.weapon);
      }
    }
  }

  update(dt: number): void {
    this.elapsed += dt;
    for (const rig of this.rigs.values()) {
      animateRig(rig, Math.min(dt, 0.05), this.elapsed);
    }
  }

  private remove(id: string): void {
    const rig = this.rigs.get(id);
    if (!rig) {
      return;
    }
    removeRig(this.scene, rig);
    this.rigs.delete(id);
  }

  clear(): void {
    for (const id of [...this.rigs.keys()]) {
      this.remove(id);
    }
    this.rosterById.clear();
  }

  getCount(): number {
    return this.rigs.size;
  }

  getRosterEntry(id: string): RosterEntry | undefined {
    return this.rosterById.get(id);
  }
}

const STAFF_COLORS = ['#8a9b92', '#75d5c8', '#e8b05b', '#bfa6ff'] as const;

export class StaffAvatars {
  private readonly scene: THREE.Scene;
  private readonly rigs = new Map<string, AvatarRig>();
  private elapsed = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  applyStates(states: readonly NetworkStaffState[]): void {
    const active = new Set<string>();
    for (const state of states) {
      active.add(state.id);
      let rig = this.rigs.get(state.id);
      if (!rig) {
        const subtitle = state.kind === 'miner' ? 'MINERO AUTOMÁTICO' : 'RECOLECTOR AUTOMÁTICO';
        const colorIndex = state.kind === 'miner' ? 2 : 1;
        rig = buildAvatar(
          this.scene,
          state.id,
          `${state.kind === 'miner' ? 'MINERO' : 'RECOLECTOR'} ${state.rank + 1}`,
          subtitle,
          colorIndex,
          false,
          2.05,
        );
        rig.root.scale.setScalar(0.84);
        rig.targetY = state.y;
        rig.root.position.set(state.x, state.y, state.z);
        rig.root.userData.rank = state.rank;
        rig.root.userData.kind = state.kind;
        this.rigs.set(state.id, rig);
      }
      rig.targetX = state.x;
      rig.targetY = state.y;
      rig.targetZ = state.z;
      rig.targetYaw = state.yaw;
      rig.moving = true;
      rig.mining = state.kind === 'miner' && state.active;
      rig.jetpack = state.active;
      if (rig.root.userData.rank !== state.rank || rig.root.userData.kind !== state.kind) {
        rig.root.userData.rank = state.rank;
        rig.root.userData.kind = state.kind;
        const color = new THREE.Color(STAFF_COLORS[state.rank % STAFF_COLORS.length]);
        const label = makeLabel(
          state.kind === 'miner' ? 'MINERO' : 'RECOLECTOR',
          `${state.kind === 'miner' ? 'EXTRACCIÓN' : 'LOGÍSTICA'} · RANGO ${state.rank + 1}`,
          `#${color.getHexString()}`,
        );
        rig.nameTexture.dispose();
        const spriteMaterial = rig.nameSprite.material as THREE.SpriteMaterial;
        spriteMaterial.map = label;
        spriteMaterial.needsUpdate = true;
        rig.nameTexture = label;
      }
    }
    for (const id of [...this.rigs.keys()]) {
      if (!active.has(id)) {
        const rig = this.rigs.get(id);
        if (rig) {
          removeRig(this.scene, rig);
        }
        this.rigs.delete(id);
      }
    }
  }

  update(dt: number): void {
    this.elapsed += dt;
    for (const rig of this.rigs.values()) {
      animateRig(rig, Math.min(dt, 0.05), this.elapsed);
    }
  }

  clear(): void {
    for (const rig of this.rigs.values()) {
      removeRig(this.scene, rig);
    }
    this.rigs.clear();
  }

  getCount(): number {
    return this.rigs.size;
  }
}
