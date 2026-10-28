import type { Game } from '../core/Game';

export class AccessibilityModal {
  private readonly container: HTMLElement | null;
  private readonly closeBtn: HTMLElement | null;
  private readonly shakeSelect: HTMLSelectElement | null;
  private readonly fovInput: HTMLInputElement | null;
  private readonly fovVal: HTMLElement | null;
  private readonly bulkSelect: HTMLSelectElement | null;
  private readonly game: Game;

  constructor(game: Game) {
    this.game = game;
    this.container = document.getElementById('accessibility-overlay');
    this.closeBtn = document.getElementById('accessibility-close-btn');
    this.shakeSelect = document.getElementById('setting-shake') as HTMLSelectElement | null;
    this.fovInput = document.getElementById('setting-fov') as HTMLInputElement | null;
    this.fovVal = document.getElementById('setting-fov-val');
    this.bulkSelect = document.getElementById('setting-bulk-loot') as HTMLSelectElement | null;

    this.bindEvents();
    this.loadSavedSettings();
  }

  private bindEvents(): void {
    this.closeBtn?.addEventListener('click', () => this.hide());
    document.getElementById('shop-accessibility-btn')?.addEventListener('click', () => this.show());
    document.getElementById('pause-accessibility-btn')?.addEventListener('click', () => this.show());

    this.shakeSelect?.addEventListener('change', () => {
      const val = parseFloat(this.shakeSelect?.value ?? '1');
      this.game.saves.saveShake(val);
      this.game.player.trauma.setAccessibility(val);
    });

    this.fovInput?.addEventListener('input', () => {
      const val = parseInt(this.fovInput?.value ?? '75', 10);
      if (this.fovVal) this.fovVal.textContent = `${val}°`;
      this.game.saves.saveFov(val);
      this.game.camera.fov = val;
      this.game.camera.updateProjectionMatrix();
    });

    this.bulkSelect?.addEventListener('change', () => {
      const val = this.bulkSelect?.value === 'true';
      this.game.saves.saveBulkLoot(val);
      this.game.loot.setBulkMode(val);
    });
  }

  private loadSavedSettings(): void {
    const settings = this.game.saves.loadSettings();
    if (this.shakeSelect) this.shakeSelect.value = String(settings.shake);
    this.game.player.trauma.setAccessibility(settings.shake);

    if (this.fovInput) this.fovInput.value = String(settings.fov);
    if (this.fovVal) this.fovVal.textContent = `${settings.fov}°`;
    this.game.camera.fov = settings.fov;
    this.game.camera.updateProjectionMatrix();

    if (this.bulkSelect) this.bulkSelect.value = String(settings.bulkLoot);
    this.game.loot.setBulkMode(settings.bulkLoot);
  }

  show(): void {
    if (this.container) {
      this.container.removeAttribute('hidden');
      this.container.style.display = 'flex';
    }
  }

  hide(): void {
    if (this.container) {
      this.container.setAttribute('hidden', '');
      this.container.style.display = 'none';
    }
  }
}
