import { isLedgerMode, setLedgerMode } from './format';
import type { Game } from '../core/Game';

export class LedgerModeView {
  private readonly toggleBtn: HTMLElement | null;
  private readonly game: Game;

  constructor(game: Game) {
    this.game = game;
    this.toggleBtn = document.getElementById('shop-ledger-mode-btn');

    this.toggleBtn?.addEventListener('click', () => {
      const next = !isLedgerMode();
      setLedgerMode(next);
      this.updateButtonText();
      if (this.game.phase === 'shop') {
        this.game.ui.updateShop(this.game.buildShopView());
      }
    });

    this.updateButtonText();
  }

  updateButtonText(): void {
    if (this.toggleBtn) {
      this.toggleBtn.textContent = `LIBRO MAYOR: ${isLedgerMode() ? 'ON' : 'OFF'}`;
    }
  }
}
