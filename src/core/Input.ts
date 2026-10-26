export interface InputActions {
  onLockChange: (locked: boolean) => void;
  onWeaponSelect: (slot: number) => void;
  onCycleWeapon: (direction: number) => void;
  onMute: () => void;
  onPauseRequest: () => void;
  onInteract: () => void;
  onToggleLadder: () => void;
  onToggleLadderPlacement: () => void;
  onToggleInventory: () => void;
}

const MOVEMENT_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

export class InputController {
  private readonly canvas: HTMLCanvasElement;
  private readonly actions: InputActions;
  private readonly keys = new Set<string>();
  private enabled = false;
  private locked = false;
  private inventoryOpen = false;
  private attackHeld = false;
  private lookX = 0;
  private lookY = 0;
  private readonly handleKeyDown: (event: KeyboardEvent) => void;
  private readonly handleKeyUp: (event: KeyboardEvent) => void;
  private readonly handleMouseMove: (event: MouseEvent) => void;
  private readonly handleMouseDown: (event: MouseEvent) => void;
  private readonly handleMouseUp: (event: MouseEvent) => void;
  private readonly handleWheel: (event: WheelEvent) => void;
  private readonly handleCanvasClick: (event: MouseEvent) => void;
  private readonly handlePointerLockChange: () => void;
  private readonly handlePointerLockError: () => void;
  private readonly handleContextMenu: (event: MouseEvent) => void;
  private readonly handleBlur: () => void;

  constructor(canvas: HTMLCanvasElement, actions: InputActions) {
    this.canvas = canvas;
    this.actions = actions;

    this.handleKeyDown = (event) => {
      if (!this.enabled) {
        return;
      }
      if (
        (event.code === 'Tab' || event.code === 'KeyI') &&
        (this.locked || this.inventoryOpen)
      ) {
        event.preventDefault();
        if (!event.repeat) {
          this.actions.onToggleInventory();
        }
        return;
      }
      if (event.code === 'Escape' && this.inventoryOpen) {
        event.preventDefault();
        if (!event.repeat) {
          this.actions.onPauseRequest();
        }
        return;
      }
      if (MOVEMENT_KEYS.has(event.code) || event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        this.keys.add(event.code);
        if (this.locked) {
          event.preventDefault();
        }
        return;
      }
      if (event.code === 'Space') {
        this.keys.add(event.code);
        if (this.locked) {
          event.preventDefault();
        }
        return;
      }
      if (!this.locked) {
        return;
      }
      if (event.repeat) {
        return;
      }
      if (event.code.startsWith('Digit')) {
        const slot = Number(event.code.slice(5));
        if (slot >= 1 && slot <= 9) {
          event.preventDefault();
          this.actions.onWeaponSelect(slot);
        }
      } else if (event.code === 'KeyE') {
        event.preventDefault();
        this.actions.onInteract();
      } else if (event.code === 'KeyR') {
        event.preventDefault();
        this.actions.onToggleLadder();
      } else if (event.code === 'KeyG') {
        event.preventDefault();
        this.actions.onToggleLadderPlacement();
      } else if (event.code === 'KeyM') {
        event.preventDefault();
        this.actions.onMute();
      } else if (event.code === 'Escape') {
        event.preventDefault();
        this.actions.onPauseRequest();
      }
    };
    this.handleKeyUp = (event) => {
      this.keys.delete(event.code);
    };
    this.handleMouseMove = (event) => {
      if (!this.enabled || !this.locked) {
        return;
      }
      this.lookX += event.movementX;
      this.lookY += event.movementY;
    };
    this.handleMouseDown = (event) => {
      if (!this.enabled || !this.locked) {
        return;
      }
      if (event.button === 0) {
        this.attackHeld = true;
      }
    };
    this.handleMouseUp = (event) => {
      if (event.button === 0) {
        this.attackHeld = false;
      }
    };
    this.handleWheel = (event) => {
      if (!this.enabled || !this.locked) {
        return;
      }
      event.preventDefault();
      const direction = Math.sign(event.deltaY);
      if (direction !== 0) {
        this.actions.onCycleWeapon(direction);
      }
    };
    this.handleCanvasClick = (event) => {
      if (!this.enabled) {
        return;
      }
      if (event.button !== 0) {
        return;
      }
      if (!this.locked) {
        void this.requestLock();
      }
    };
    this.handlePointerLockChange = () => {
      const locked = document.pointerLockElement === this.canvas;
      if (locked === this.locked) {
        return;
      }
      this.locked = locked;
      if (!locked) {
        this.keys.clear();
        this.attackHeld = false;
        this.lookX = 0;
        this.lookY = 0;
      }
      this.actions.onLockChange(locked);
    };
    this.handlePointerLockError = () => {
      this.actions.onLockChange(false);
    };
    this.handleContextMenu = (event) => {
      if (this.enabled) {
        event.preventDefault();
      }
    };
    this.handleBlur = () => {
      this.keys.clear();
      this.attackHeld = false;
    };

    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    document.addEventListener('pointerlockerror', this.handlePointerLockError);
    document.addEventListener('contextmenu', this.handleContextMenu);
    this.canvas.addEventListener('click', this.handleCanvasClick);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    window.addEventListener('blur', this.handleBlur);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.keys.clear();
      this.attackHeld = false;
      this.inventoryOpen = false;
      if (this.locked) {
        document.exitPointerLock();
      }
    }
  }

  setInventoryOpen(open: boolean): void {
    this.inventoryOpen = open;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isLocked(): boolean {
    return this.locked;
  }

  async requestLock(): Promise<void> {
    if (!this.enabled || this.locked) {
      return;
    }
    try {
      await this.canvas.requestPointerLock();
    } catch {
      this.actions.onLockChange(false);
    }
  }

  unlock(): void {
    if (this.locked) {
      document.exitPointerLock();
    }
  }

  consumeLook(): { x: number; y: number } {
    const result = { x: this.lookX, y: this.lookY };
    this.lookX = 0;
    this.lookY = 0;
    return result;
  }

  getMovement(): { forward: number; right: number } {
    if (!this.enabled) {
      return { forward: 0, right: 0 };
    }
    let forward = 0;
    let right = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
      forward += 1;
    }
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
      forward -= 1;
    }
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
      right += 1;
    }
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
      right -= 1;
    }
    return { forward, right };
  }

  isAttacking(): boolean {
    return this.enabled && this.locked && this.attackHeld;
  }

  isJetpackHeld(): boolean {
    return this.enabled && this.locked && this.keys.has('Space');
  }

  isSprinting(): boolean {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    document.removeEventListener('pointerlockerror', this.handlePointerLockError);
    document.removeEventListener('contextmenu', this.handleContextMenu);
    this.canvas.removeEventListener('click', this.handleCanvasClick);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('blur', this.handleBlur);
  }
}
