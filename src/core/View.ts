import * as THREE from 'three';
import { randomSeed } from './Rng';
import type { Game } from './Game';

export function updateMenuCamera(game: Game): void {
  const angle = game.visualTime * 0.032 + 0.7;
  const radius = 62;
  game.camera.position.set(
    Math.cos(angle) * radius,
    27 + Math.sin(game.visualTime * 0.22) * 1.3,
    Math.sin(angle) * radius,
  );
  game.camera.lookAt(0, 6.5 + Math.sin(game.visualTime * 0.17) * 0.8, 0);
}

export function updateOfficeCamera(game: Game): void {
  game.camera.position.set(-25, 3.1, 22);
  game.camera.lookAt(-31, 2.2, 12);
}

export function updatePixelMode(game: Game, force = false): void {
  const usePixel =
    game.phase !== 'playing' || game.player.getEyePosition().y > -1.25;
  if (!force && usePixel === game.pixelMode) {
    return;
  }
  game.pixelMode = usePixel;
  game.canvas.classList.toggle('is-pixelated', usePixel);
  document.body.classList.toggle('is-outside-pixel', usePixel);
  applyRenderResolution(game);
}

// 900 px internos conservan el aspecto pixelado pero dan detalle suficiente a
// los carteles lejanos. El tope de 0,75 evita perder el efecto en ventanas
// pequeñas; el mínimo mantiene un suelo de definición en pantallas enormes.
const PIXEL_MODE_WIDTH = 900;
const PIXEL_MODE_MIN_RATIO = 0.19;
const PIXEL_MODE_MAX_RATIO = 0.75;

export function applyRenderResolution(game: Game): void {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  const ratio = game.pixelMode
    ? THREE.MathUtils.clamp(PIXEL_MODE_WIDTH / width, PIXEL_MODE_MIN_RATIO, PIXEL_MODE_MAX_RATIO)
    : Math.min(window.devicePixelRatio || 1, 1.75);
  game.renderer.setPixelRatio(ratio);
  game.renderer.setSize(width, height, false);
}

export function applyPixelMode(game: Game, force = true): void {
  updatePixelMode(game, force);
}

export function handleResize(game: Game): void {
  game.camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
  game.camera.updateProjectionMatrix();
  applyRenderResolution(game);
}

export function prepareMenuWorld(game: Game): void {
  game.phase = 'menu';
  game.role = 'solo';
  game.online = false;
  game.paused = false;
  game.input.setEnabled(false);
  game.tools.setVisible(false);
  game.player.headlamp.visible = false;
  game.seed = randomSeed();
  game.terrain.generate(game.seed);
  game.resources.generate(game.seed, 1, game.terrain);
  game.loot.clear();
  game.clearCargo();
  game.closeInventory();
  game.ladders.clear();
  game.player.spawnAtSurface();
  game.hopper.update(0, 0, game.run.quota);
  game.ui.setPlayerName(game.saves.loadName());
  game.ui.showMenu(game.saves.summary());
  updateMenuCamera(game);
}
