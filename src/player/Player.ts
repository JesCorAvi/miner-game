import * as THREE from 'three';
import {
  CRITICAL_LOAD_PENALTY,
  CRITICAL_LOAD_RATIO,
  EYE_HEIGHT,
  MINE_DEPTH,
  MIN_FALL_SPILL_DISTANCE,
  PIT_HALF,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  SAFE_ZONE_HALF,
  SURFACE_DECK_Y,
  SURFACE_SPAWN,
  layerAtDepth,
  maxJetpackFuel,
  passiveMultiplier,
  professionJumpMultiplier,
  professionMoveSpeedMultiplier,
} from '../config';
import type { Loadout, NetworkLadderState } from '../types';
import type { InputController } from '../core/Input';
import type { Ladders } from '../world/Ladders';
import type { Terrain } from '../world/Terrain';
import { TraumaSystem } from './TraumaSystem';
import { hasUtilityActive } from '../core/Progression';

const WALK_SPEED = 4.5;
const SPRINT_SPEED = 6.6;
const GRAVITY = 25.5;
const JUMP_SPEED = 5.6;
const JET_THRUST = 42;
const JET_MAX_UP = 6.2;
const JET_DRAIN = 26;
const JET_RECHARGE = 31;
const STEP_HEIGHT = 0.34;
const LOOK_SENSITIVITY = 0.00215;
const MAX_FALL_SPEED = -26;
const CLIMB_SPEED = 3.3;
const LADDER_OFFSET = PLAYER_RADIUS + 0.18;
const SAFE_FLOOR_Y = SURFACE_DECK_Y + 0.04;
const SAFE_BOUND = SAFE_ZONE_HALF - 0.25;
const MAX_SAFE_Y = 8;

export interface PlayerCallbacks {
  onFootstep: (running: boolean, layer: number) => void;
  onHardLanding?: (fallDistance: number) => void;
}

export class Player {
  readonly camera: THREE.PerspectiveCamera;
  readonly headlamp: THREE.SpotLight;
  private readonly scene: THREE.Scene;
  private readonly input: InputController;
  private readonly callbacks: PlayerCallbacks;
  private readonly ladders: Ladders;
  private terrain: Terrain;
  private readonly position = new THREE.Vector3(
    SURFACE_SPAWN.x,
    SAFE_FLOOR_Y,
    SURFACE_SPAWN.z,
  );
  private readonly horizontalVelocity = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private yaw = 0;
  private pitch = -0.03;
  private grounded = false;
  private jetpackActive = false;
  private fuel = 0;
  private maxFuel = 0;
  private loadout: Loadout | null = null;
  private bobTime = 0;
  private stepDistance = 0;
  private currentSpeed = 0;
  readonly trauma = new TraumaSystem();
  private lastLandingTime = -10;
  private elapsed = 0;
  private activeLadderId: string | null = null;
  private activeLadderSide: 1 | -1 = 1;
  private ladderCooldown = 0;
  private jumpSuppressUntil = 0;
  private weightRatio = 0;
  private fallStartY: number | null = null;
  private activeWinchId: string | null = null;
  private platformDepth = 0;

  setPlatformDepth(depth: number): void {
    this.platformDepth = Math.max(0, depth);
  }

  private getSafeFloorY(): number {
    return (SURFACE_DECK_Y - this.platformDepth) + 0.04;
  }

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    input: InputController,
    terrain: Terrain,
    ladders: Ladders,
    callbacks: PlayerCallbacks,
  ) {
    this.scene = scene;
    this.camera = camera;
    this.input = input;
    this.terrain = terrain;
    this.ladders = ladders;
    this.callbacks = callbacks;
    this.camera.rotation.order = 'YXZ';
    this.camera.near = 0.05;
    this.camera.far = 220;
    this.scene.add(this.camera);

    this.headlamp = new THREE.SpotLight(0xffdfb0, 34, 27, Math.PI * 0.25, 0.62, 1.42);
    this.headlamp.position.set(0.06, -0.08, 0.1);
    this.headlamp.castShadow = false;
    const target = new THREE.Object3D();
    target.position.set(0, -0.2, -1.2);
    this.camera.add(this.headlamp, target);
    this.headlamp.target = target;

    const fill = new THREE.PointLight(0xffcf9a, 0.7, 6.5, 2);
    fill.position.set(0, -0.1, 0.2);
    this.camera.add(fill);
    this.teleportToSpawn();
  }

  setTerrain(terrain: Terrain): void { this.terrain = terrain; }

  setLoadout(loadout: Loadout): void {
    const previousMax = this.maxFuel;
    this.loadout = loadout;
    this.maxFuel = maxJetpackFuel(loadout);
    if (this.maxFuel <= 0) {
      this.fuel = 0;
    } else if (previousMax <= 0) {
      this.fuel = this.maxFuel;
    } else {
      this.fuel = Math.min(this.maxFuel, this.fuel + Math.max(0, this.maxFuel - previousMax));
    }
  }

  teleport(position: THREE.Vector3, yaw = this.yaw, pitch = this.pitch): void {
    this.position.copy(position);
    this.yaw = yaw;
    this.pitch = pitch;
    this.velocity.set(0, 0, 0);
    this.horizontalVelocity.set(0, 0, 0);
    this.grounded = false;
    this.jetpackActive = false;
    this.activeLadderId = null;
    this.activeLadderSide = 1;
    this.ladderCooldown = 0;
    this.updateCamera();
  }

  spawnAtSurface(): void {
    this.fuel = this.maxFuel;
    this.teleportToSpawn();
  }

  private teleportToSpawn(): void {
    this.position.set(SURFACE_SPAWN.x, this.getSafeFloorY(), SURFACE_SPAWN.z);
    this.yaw = 0;
    this.pitch = -0.03;
    this.velocity.set(0, 0, 0);
    this.horizontalVelocity.set(0, 0, 0);
    this.grounded = true;
    this.jetpackActive = false;
    this.activeLadderId = null;
    this.activeLadderSide = 1;
    this.updateCamera();
  }

  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) {
      return;
    }
    this.elapsed += dt;
    this.ladderCooldown = Math.max(0, this.ladderCooldown - dt);
    const look = this.input.consumeLook();
    this.yaw -= look.x * LOOK_SENSITIVITY;
    this.pitch -= look.y * LOOK_SENSITIVITY;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.52, 1.52);
    this.yaw = Math.atan2(Math.sin(this.yaw), Math.cos(this.yaw));

    if (this.activeWinchId !== null) {
      this.fallStartY = null;
      this.grounded = false;
      this.velocity.set(0, 0, 0);
      this.horizontalVelocity.set(0, 0, 0);
      if (this.input.isJetpackHeld()) {
        this.activeWinchId = null;
      }
      this.updateCamera();
      this.trauma.update(dt);
      return;
    }

    if (this.updateLadderClimb(dt)) {
      this.fallStartY = null;
      this.currentSpeed = 0;
      this.bobTime += dt * 4;
      this.stepDistance = 0;
      this.updateCamera();
      this.trauma.update(dt);
      return;
    }

    const movement = this.input.getMovement();
    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    let desiredX = forwardX * movement.forward + rightX * movement.right;
    let desiredZ = forwardZ * movement.forward + rightZ * movement.right;
    const hasInput = desiredX !== 0 || desiredZ !== 0;
    if (hasInput) {
      const length = Math.hypot(desiredX, desiredZ);
      desiredX /= length;
      desiredZ /= length;
    }
    const sprinting = this.input.isSprinting() && hasInput;
    const isCritical = this.weightRatio > CRITICAL_LOAD_RATIO;
    const hasRappel = hasUtilityActive(this.loadout, 'rappel_harness');
    const loadPenalty = isCritical && sprinting && !hasRappel ? 1 - CRITICAL_LOAD_PENALTY : 1;
    const sprintBonus = sprinting
      ? passiveMultiplier('sprintSpeed', this.loadout?.passives.sprintSpeed ?? 0)
      : 1;
    const professionSpeed = professionMoveSpeedMultiplier(this.loadout?.profession);
    const targetSpeed =
      (sprinting ? SPRINT_SPEED : WALK_SPEED) * loadPenalty * sprintBonus * professionSpeed;
    const airControl = this.grounded ? 1 : 0.52;
    const acceleration = (this.grounded ? 18 : 7.5) * airControl;
    this.horizontalVelocity.x = THREE.MathUtils.damp(
      this.horizontalVelocity.x,
      desiredX * targetSpeed,
      hasInput ? acceleration : 15 * airControl,
      dt,
    );
    this.horizontalVelocity.z = THREE.MathUtils.damp(
      this.horizontalVelocity.z,
      desiredZ * targetSpeed,
      hasInput ? acceleration : 15 * airControl,
      dt,
    );

    const oldX = this.position.x;
    const oldZ = this.position.z;
    this.moveHorizontal(this.horizontalVelocity.x * dt, this.horizontalVelocity.z * dt);
    const movedDistance = Math.hypot(this.position.x - oldX, this.position.z - oldZ);
    this.currentSpeed = dt > 0 ? movedDistance / dt : 0;
    const moving = this.currentSpeed > 0.18;
    if (moving) {
      this.bobTime += dt * (sprinting ? 12.8 : 9.4);
      this.stepDistance += movedDistance;
      const stride = sprinting ? 2.1 : 1.72;
      if (this.stepDistance >= stride) {
        this.stepDistance = 0;
        this.callbacks.onFootstep(sprinting, layerAtDepth(this.getDepth()).index);
      }
    } else {
      this.bobTime += dt * 1.8;
      this.stepDistance = Math.min(this.stepDistance, 0.7);
    }

    const wantsJetpack = this.input.isJetpackHeld();
    const wasGrounded = this.grounded;
    if (
      wasGrounded &&
      wantsJetpack &&
      this.elapsed >= this.jumpSuppressUntil
    ) {
      this.velocity.y =
        JUMP_SPEED *
        passiveMultiplier('jumpVelocity', this.loadout?.passives.jumpVelocity ?? 0) *
        professionJumpMultiplier(this.loadout?.profession);
      this.grounded = false;
      if (this.maxFuel > 0) {
        this.fuel = Math.max(0, this.fuel - 2.5);
      }
    }

    this.jetpackActive =
      this.maxFuel > 0 &&
      wantsJetpack &&
      !this.grounded &&
      this.fuel > 0 &&
      this.input.isLocked();
    if (this.jetpackActive) {
      this.velocity.y = Math.min(JET_MAX_UP, this.velocity.y + JET_THRUST * dt);
      this.fuel = Math.max(0, this.fuel - JET_DRAIN * dt);
    } else {
      this.velocity.y -= GRAVITY * dt;
      if (this.velocity.y < MAX_FALL_SPEED) {
        this.velocity.y = MAX_FALL_SPEED;
      }
    }

    if (this.grounded && this.velocity.y <= 0 && this.maxFuel > 0) {
      this.fuel = Math.min(this.maxFuel, this.fuel + JET_RECHARGE * dt);
    }

    const oldY = this.position.y;
    const nextY = oldY + this.velocity.y * dt;
    this.position.y = nextY;
    const outsidePit = this.isOutsidePit(this.position.x, this.position.z);
    if (
      !outsidePit &&
      this.terrain.capsuleBlocked(
        this.position.x,
        this.position.y,
        this.position.z,
        PLAYER_RADIUS,
        PLAYER_HEIGHT,
      )
    ) {
      this.resolveVerticalBoundary(oldY, nextY);
    }

    this.grounded = false;
    const floorY = this.getSafeFloorY();
    if ((outsidePit || (this.platformDepth > 0 && Math.abs(this.position.y - floorY) < 0.45)) && this.position.y <= floorY && this.velocity.y <= 0) {
      this.position.y = floorY;
      this.velocity.y = 0;
      this.grounded = true;
    }
    if (this.velocity.y <= 0.2 && !this.grounded) {
      if (
        this.terrain.isGrounded(
          this.position.x,
          this.position.y,
          this.position.z,
          PLAYER_RADIUS,
        )
      ) {
        this.grounded = true;
        if (this.velocity.y < -7) {
          this.lastLandingTime = this.elapsed;
        }
        this.velocity.y = 0;
        this.snapToTerrainSurface();
        if (!wasGrounded) {
          this.stepDistance = 0.6;
        }
      }
    }

    if (this.velocity.y <= 0.2) {
      const stepTop = this.ladders.findHorizontalTop(
        this.position.x,
        this.position.z,
        this.position.y,
        PLAYER_RADIUS,
        0.45,
      );
      if (stepTop !== null && stepTop > this.position.y + 0.005) {
        this.position.y = stepTop;
        this.velocity.y = 0;
        this.grounded = true;
      }
    }

    if (!this.grounded && this.velocity.y <= 0.2) {
      const horizontalSupport = this.ladders.findHorizontalSupport(
        this.position.x,
        oldY,
        nextY,
        this.position.z,
        PLAYER_RADIUS,
      );
      if (horizontalSupport !== null) {
        this.position.y = horizontalSupport;
        this.velocity.y = 0;
        this.grounded = true;
        if (!wasGrounded) {
          this.stepDistance = 0.6;
        }
      }
    }

    if (!this.grounded && this.velocity.y < 0 && !outsidePit) {
      this.stickToGround();
    }

    if (!wasGrounded && this.grounded) {
      if (this.fallStartY !== null) {
        const fallDistance = this.fallStartY - this.position.y;
        this.fallStartY = null;
        if (fallDistance >= MIN_FALL_SPILL_DISTANCE && this.weightRatio >= CRITICAL_LOAD_RATIO) {
          this.callbacks.onHardLanding?.(fallDistance);
        }
      }
    } else if (!wasGrounded && !this.grounded && this.velocity.y < 0) {
      if (this.fallStartY === null) {
        this.fallStartY = this.position.y;
      }
    }

    this.checkBounds();
    this.updateCamera();
    this.trauma.update(dt);
  }

  private updateLadderClimb(dt: number): boolean {
    const movement = this.input.getMovement();
    const jumping = this.input.isJetpackHeld();
    const wantsUp = movement.forward > 0.1;
    const wantsDown = movement.forward < -0.1;
    const strafing = Math.abs(movement.right) > 0.1;

    if (!this.activeLadderId) {
      if (this.ladderCooldown > 0 || strafing || jumping || (!wantsUp && !wantsDown)) {
        return false;
      }
      const nearest = this.ladders.findNearest(this.position, wantsDown);
      if (!nearest) {
        return false;
      }
      this.activeLadderId = nearest.id;
      this.activeLadderSide = this.getLadderSide(nearest);
      this.setLadderAttachment(nearest, true, dt, this.activeLadderSide);
      return true;
    }

    const ladder = this.ladders.getById(this.activeLadderId);
    if (!ladder || ladder.orientation !== 'vertical') {
      this.activeLadderId = null;
      return false;
    }
    const ladderTop = ladder.y + ladder.height;
    const horizontal = Math.hypot(this.position.x - ladder.x, this.position.z - ladder.z);
    if (
      strafing ||
      horizontal > 1.35 ||
      this.position.y < ladder.y - 0.9 ||
      this.position.y > ladderTop + 0.35
    ) {
      this.activeLadderId = null;
      this.ladderCooldown = 0.25;
      return false;
    }

    // Space suelta la escalera y salta desde cualquier altura.
    if (jumping) {
      this.jumpOffLadder(ladder);
      return false;
    }

    this.setLadderAttachment(ladder, false, dt, this.activeLadderSide);
    const climbPenalty = this.weightRatio > CRITICAL_LOAD_RATIO ? 1 - CRITICAL_LOAD_PENALTY : 1;
    const speed = CLIMB_SPEED * climbPenalty * passiveMultiplier('climbSpeed', this.loadout?.passives.climbSpeed ?? 0);
    if (wantsUp) {
      this.position.y = Math.min(ladderTop, this.position.y + speed * dt);
    } else if (wantsDown) {
      this.position.y = Math.max(ladder.y - 0.12, this.position.y - speed * dt);
    }
    this.velocity.set(0, 0, 0);
    this.horizontalVelocity.set(0, 0, 0);
    this.jetpackActive = false;
    this.grounded = false;

    if (wantsUp && this.position.y >= ladderTop - 0.02) {
      const bridgeTop = this.ladders.findHorizontalTop(
        this.position.x,
        this.position.z,
        this.position.y,
        PLAYER_RADIUS,
        0.45,
      );
      if (bridgeTop !== null && bridgeTop >= this.position.y - 0.1) {
        this.standOnTopSupport(bridgeTop);
        return true;
      }
      if (this.tryMantle(ladder)) {
        this.standOnTopSupport(this.position.y);
        return true;
      }
      const above = this.ladders.findNearest(
        this.position.clone().setY(this.position.y + 0.1),
      );
      if (above && above.id !== ladder.id) {
        this.activeLadderId = above.id;
        this.activeLadderSide = this.getLadderSide(above);
        this.setLadderAttachment(above, true, dt, this.activeLadderSide);
        return true;
      }
    }
    if (wantsDown && this.position.y <= ladder.y + 0.03) {
      const below = this.ladders.findBelow(this.position, ladder);
      if (below) {
        this.activeLadderId = below.id;
        this.activeLadderSide = this.getLadderSide(below);
        this.setLadderAttachment(below, true, dt, this.activeLadderSide);
        return true;
      }
      this.activeLadderId = null;
      this.ladderCooldown = 0.2;
      return false;
    }

    this.clampSafeHorizontal();
    return true;
  }
  private getLadderSide(ladder: NetworkLadderState): 1 | -1 {
    return (this.position.x - ladder.x) * ladder.nx + (this.position.z - ladder.z) * ladder.nz < 0 ? -1 : 1;
  }
  private setLadderAttachment(
    ladder: NetworkLadderState,
    immediate: boolean,
    dt: number,
    side: 1 | -1,
  ): void {
    const targetX = ladder.x + ladder.nx * LADDER_OFFSET * side;
    const targetZ = ladder.z + ladder.nz * LADDER_OFFSET * side;
    if (immediate) {
      this.position.x = targetX;
      this.position.z = targetZ;
    } else {
      this.position.x = THREE.MathUtils.damp(this.position.x, targetX, 18, dt);
      this.position.z = THREE.MathUtils.damp(this.position.z, targetZ, 18, dt);
    }
  }
  private standOnTopSupport(top: number): void {
    this.position.y = top;
    this.velocity.set(0, 0, 0);
    this.horizontalVelocity.set(0, 0, 0);
    this.grounded = true;
    this.activeLadderId = null;
    this.ladderCooldown = 0.25;
    this.jumpSuppressUntil = this.elapsed + 0.25;
  }
  private jumpOffLadder(ladder: NetworkLadderState): void {
    this.activeLadderId = null;
    this.ladderCooldown = 0.3;
    this.velocity.set(0, JUMP_SPEED * passiveMultiplier('jumpVelocity', this.loadout?.passives.jumpVelocity ?? 0), 0);
    this.horizontalVelocity.set(ladder.nx * 2.4 * this.activeLadderSide, 0, ladder.nz * 2.4 * this.activeLadderSide);
    this.grounded = false;
    this.jetpackActive = false;
    this.jumpSuppressUntil = this.elapsed + 0.25;
  }
  private tryMantle(ladder: NetworkLadderState): boolean {
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const inward = new THREE.Vector3(-ladder.nx, 0, -ladder.nz);
    const directions: THREE.Vector3[] = [
      forward,
      inward,
      new THREE.Vector3(ladder.nx, 0, ladder.nz),
      new THREE.Vector3(-inward.z, 0, inward.x),
      new THREE.Vector3(inward.z, 0, -inward.x),
    ];
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      directions.push(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
    }

    for (const direction of directions) {
      if (direction.lengthSq() < 0.01) {
        continue;
      }
      const dir = direction.clone().normalize();
      for (const distance of [0.75, 1.15]) {
        const candidateX = this.position.x + dir.x * distance;
        const candidateZ = this.position.z + dir.z * distance;
        if (Math.abs(candidateX) > SAFE_BOUND || Math.abs(candidateZ) > SAFE_BOUND) {
          continue;
        }
        let supportY: number | null = null;
        if (this.isOutsidePit(candidateX, candidateZ)) {
          supportY = this.getSafeFloorY();
        } else {
          const hit = this.terrain.raycast(
            new THREE.Vector3(candidateX, this.position.y + 0.5, candidateZ),
            new THREE.Vector3(0, -1, 0),
            2.8,
          );
          if (hit) {
            supportY = hit.y + 0.03;
          }
        }
        if (supportY === null) {
          continue;
        }
        if (
          supportY > this.position.y + 0.45 ||
          supportY < this.position.y - 0.35
        ) {
          continue;
        }
        if (
          !this.isOutsidePit(candidateX, candidateZ) &&
          this.terrain.capsuleBlocked(
            candidateX,
            supportY + 0.02,
            candidateZ,
            PLAYER_RADIUS,
            PLAYER_HEIGHT,
          )
        ) {
          continue;
        }
        this.position.set(candidateX, supportY + 0.02, candidateZ);
        this.velocity.set(0, 0, 0);
        this.grounded = true;
        return true;
      }
    }
    return false;
  }

  private isOutsidePit(x: number, z: number): boolean {
    return Math.abs(x) > PIT_HALF || Math.abs(z) > PIT_HALF;
  }

  private clampSafeHorizontal(): void {
    this.position.x = THREE.MathUtils.clamp(this.position.x, -SAFE_BOUND, SAFE_BOUND);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -SAFE_BOUND, SAFE_BOUND);
  }

  private resolveVerticalBoundary(oldY: number, candidateY: number): void {
    let freeY = oldY;
    let blockedY = candidateY;
    for (let iteration = 0; iteration < 8; iteration += 1) {
      const middle = (freeY + blockedY) * 0.5;
      if (
        this.terrain.capsuleBlocked(
          this.position.x,
          middle,
          this.position.z,
          PLAYER_RADIUS,
          PLAYER_HEIGHT,
        )
      ) {
        blockedY = middle;
      } else {
        freeY = middle;
      }
    }
    this.position.y = freeY;
    if (candidateY < oldY) {
      this.grounded = true;
      this.velocity.y = 0;
    } else {
      this.velocity.y = 0;
    }
  }

  // Corrige la penetración del suelo; sin esto la gravedad hunde al jugador.
  private snapToTerrainSurface(): void {
    const originY = this.position.y + STEP_HEIGHT;
    const hit = this.terrain.raycast(
      new THREE.Vector3(this.position.x, originY, this.position.z),
      new THREE.Vector3(0, -1, 0),
      STEP_HEIGHT + 0.45,
    );
    if (!hit) {
      return;
    }
    const targetY = originY - hit.distance + 0.01;
    if (targetY >= this.position.y - 0.35 && targetY <= this.position.y + STEP_HEIGHT) {
      this.position.y = targetY;
      this.velocity.y = 0;
    }
  }

  private stickToGround(): void {
    if (this.jetpackActive || this.velocity.y > 0.3) {
      return;
    }
    const originY = this.position.y + 0.3;
    const hit = this.terrain.raycast(
      new THREE.Vector3(this.position.x, originY, this.position.z),
      new THREE.Vector3(0, -1, 0),
      0.55,
    );
    if (hit) {
      const targetY = originY - hit.distance + 0.01;
      if (targetY > this.position.y - 0.25 && targetY <= this.position.y + 0.22) {
        this.position.y = targetY;
        this.grounded = true;
        this.velocity.y = 0;
      }
    }
  }

  private moveHorizontal(dx: number, dz: number): void {
    const distance = Math.hypot(dx, dz);
    if (distance < 0.00001) {
      return;
    }
    const steps = Math.max(1, Math.ceil(distance / 0.14));
    const stepX = dx / steps;
    const stepZ = dz / steps;
    for (let step = 0; step < steps; step += 1) {
      this.tryHorizontalAxis(stepX, 0);
      this.tryHorizontalAxis(0, stepZ);
    }
  }

  private tryHorizontalAxis(dx: number, dz: number): void {
    if (dx === 0 && dz === 0) return;
    const candidateX = this.position.x + dx;
    const candidateZ = this.position.z + dz;
    if (Math.abs(candidateX) > SAFE_BOUND || Math.abs(candidateZ) > SAFE_BOUND) {
      if (dx !== 0) this.horizontalVelocity.x *= 0.15;
      if (dz !== 0) this.horizontalVelocity.z *= 0.15;
      return;
    }
    const outside = this.isOutsidePit(candidateX, candidateZ);
    const safeFloor = this.getSafeFloorY();
    const stepToSafeFloor = safeFloor - this.position.y;
    if (outside && stepToSafeFloor > STEP_HEIGHT) {
      if (dx !== 0) this.horizontalVelocity.x *= 0.15;
      if (dz !== 0) this.horizontalVelocity.z *= 0.15;
      return;
    }
    if (
      !this.terrain.capsuleBlocked(
        candidateX,
        this.position.y,
        candidateZ,
        PLAYER_RADIUS,
        PLAYER_HEIGHT,
      ) ||
      outside
    ) {
      this.position.x = candidateX;
      this.position.z = candidateZ;
      if (outside && this.position.y < safeFloor) {
        this.position.y = safeFloor;
        this.velocity.y = Math.max(0, this.velocity.y);
        this.grounded = true;
      }
      return;
    }
    if (!this.grounded && this.velocity.y > 0.5) {
      this.horizontalVelocity.x *= 0.7;
      this.horizontalVelocity.z *= 0.7;
      return;
    }
    for (const stepUp of [STEP_HEIGHT * 0.5, STEP_HEIGHT, STEP_HEIGHT * 1.5]) {
      if (
        !this.terrain.capsuleBlocked(
          candidateX,
          this.position.y + stepUp,
          candidateZ,
          PLAYER_RADIUS,
          PLAYER_HEIGHT,
        )
      ) {
        this.position.x = candidateX;
        this.position.z = candidateZ;
        this.position.y += stepUp;
        this.velocity.y = Math.max(0, this.velocity.y);
        this.grounded = true;
        return;
      }
    }
    if (dx !== 0) this.horizontalVelocity.x *= 0.18;
    if (dz !== 0) this.horizontalVelocity.z *= 0.18;
  }

  private checkBounds(): void {
    if (
      !Number.isFinite(this.position.x) ||
      !Number.isFinite(this.position.y) ||
      !Number.isFinite(this.position.z)
    ) {
      this.spawnAtSurface();
      return;
    }
    const clampedX = THREE.MathUtils.clamp(this.position.x, -SAFE_BOUND, SAFE_BOUND);
    const clampedZ = THREE.MathUtils.clamp(this.position.z, -SAFE_BOUND, SAFE_BOUND);
    if (clampedX !== this.position.x) this.horizontalVelocity.x = 0;
    if (clampedZ !== this.position.z) this.horizontalVelocity.z = 0;
    this.position.x = clampedX;
    this.position.z = clampedZ;
    if (this.position.y < -0.6) {
      const mineBound = PIT_HALF - PLAYER_RADIUS;
      if (Math.abs(this.position.x) > mineBound) {
        this.position.x = Math.sign(this.position.x) * mineBound;
        this.horizontalVelocity.x = 0;
      }
      if (Math.abs(this.position.z) > mineBound) {
        this.position.z = Math.sign(this.position.z) * mineBound;
        this.horizontalVelocity.z = 0;
      }
    }
    if (this.position.y < -MINE_DEPTH + 0.05) {
      this.position.y = -MINE_DEPTH + 0.05;
      if (this.velocity.y < 0) this.velocity.y = 0;
      this.grounded = true;
    }
    if (this.position.y > MAX_SAFE_Y) {
      this.position.y = MAX_SAFE_Y;
      this.velocity.y = Math.min(0, this.velocity.y);
    }
    if (this.position.y < -MINE_DEPTH + 1.5) {
      const below = this.terrain.getDensityAt(this.position.x, this.position.y - 0.6, this.position.z);
      if (below < 0.5) {
        this.spawnAtSurface();
      }
    }
  }

  private updateCamera(): void {
    const speedRatio = Math.min(1, this.currentSpeed / SPRINT_SPEED);
    const bob = Math.sin(this.bobTime) * (this.grounded ? 0.032 + speedRatio * 0.025 : 0.006);
    const sway = Math.cos(this.bobTime * 0.5) * (this.grounded ? 0.014 * speedRatio : 0.003);
    const shake = this.trauma.getShake();
    this.camera.position.set(
      this.position.x + sway + shake.x,
      this.position.y + EYE_HEIGHT + bob + shake.y,
      this.position.z,
    );
    this.camera.rotation.set(
      this.pitch + shake.pitch,
      this.yaw + shake.yaw,
      sway * 0.7,
      'YXZ',
    );
  }

  addShake(amount: number): void {
    this.trauma.addTrauma(amount * 0.5);
  }

  /** Micro-temblor corto para el impacto del pico mediante trauma controlado. */
  addImpactShake(_strength = 0.6): void {
    this.trauma.addMiningTrauma();
  }

  addImpulse(impulse: THREE.Vector3): void {
    this.velocity.x += impulse.x;
    this.velocity.z += impulse.z;
    this.velocity.y += impulse.y;
    if (impulse.y > 0.2) {
      this.grounded = false;
    }
  }

  switchClimbingLadder(id: string): void {
    if (!this.activeLadderId) {
      return;
    }
    const ladder = this.ladders.getById(id);
    if (!ladder) {
      return;
    }
    this.activeLadderId = id;
    this.activeLadderSide = this.getLadderSide(ladder);
    this.setLadderAttachment(ladder, true, 0, this.activeLadderSide);
  }

  setWeightRatio(ratio: number): void {
    this.weightRatio = ratio;
  }

  getWeightRatio(): number {
    return this.weightRatio;
  }

  rideWinch(winchId: string): void {
    this.activeWinchId = winchId;
    this.fallStartY = null;
    this.velocity.set(0, 0, 0);
    this.horizontalVelocity.set(0, 0, 0);
  }

  stopRidingWinch(): void {
    this.activeWinchId = null;
  }

  isRidingWinch(): boolean {
    return this.activeWinchId !== null;
  }

  getPosition(): THREE.Vector3 { return this.position; }
  getEyePosition(): THREE.Vector3 { return this.camera.position; }
  getAimDirection(): THREE.Vector3 { return this.camera.getWorldDirection(new THREE.Vector3()); }
  getLookAngles(): { yaw: number; pitch: number } { return { yaw: this.yaw, pitch: this.pitch }; }
  getDepth(): number { return Math.max(0, Math.min(120, -this.position.y)); }
  getLayer(): number { return layerAtDepth(this.getDepth()).index; }
  getSpeed(): number { return this.currentSpeed; }
  isMoving(): boolean { return this.currentSpeed > 0.18; }
  isSprinting(): boolean { return this.input.isSprinting() && this.isMoving(); }
  isGrounded(): boolean { return this.grounded; }
  isJetpackActive(): boolean { return this.jetpackActive; }
  isClimbing(): boolean { return this.activeLadderId !== null; }
  getJetpackFuel(): number { return this.fuel; }
  getMaxFuel(): number { return this.maxFuel; }
  getVelocity(): THREE.Vector3 { return this.velocity; }
  getLastLandingTime(): number { return this.lastLandingTime; }
  syncNetworkPosition(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.updateCamera();
  }
  getLoadout(): Loadout | null { return this.loadout; }
}
