import './style.css';
import { Game } from './core/Game';

function showFatalError(error: unknown): void {
  console.error('Carbon Magnate no pudo iniciarse:', error);
  const start = document.getElementById('menu-overlay');
  const fatal = document.getElementById('fatal-overlay');
  const message = document.getElementById('fatal-message');
  if (start) {
    start.hidden = true;
  }
  if (message) {
    message.textContent =
      error instanceof Error
        ? `El motor no pudo arrancar: ${error.message}`
        : 'El motor no pudo arrancar. Comprueba la compatibilidad WebGL y vuelve a intentarlo.';
  }
  if (fatal) {
    fatal.hidden = false;
  }
}

try {
  const game = new Game();
  game.start();
  (window as unknown as Record<string, unknown>).__carbonMagnateGame = game;
} catch (error) {
  showFatalError(error);
}
