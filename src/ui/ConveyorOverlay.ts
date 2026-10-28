import type { Game } from '../core/Game';

export class ConveyorOverlay {
  private readonly banner: HTMLElement | null;
  private readonly game: Game;

  constructor(game: Game) {
    this.game = game;
    this.banner = document.getElementById('conveyor-jam-banner');
  }

  update(): void {
    if (!this.banner) return;
    const isJammed = this.game.conveyors.isAnyJammed();
    if (isJammed && this.banner.hasAttribute('hidden')) {
      this.banner.removeAttribute('hidden');
    } else if (!isJammed && !this.banner.hasAttribute('hidden')) {
      this.banner.setAttribute('hidden', '');
    }
  }

  dispose(): void {
    if (this.banner && !this.banner.hasAttribute('hidden')) {
      this.banner.setAttribute('hidden', '');
    }
  }
}
