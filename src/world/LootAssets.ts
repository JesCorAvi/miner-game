import * as THREE from 'three';

export function makePelletGeometry(): THREE.OctahedronGeometry {
  const geometry = new THREE.OctahedronGeometry(0.13, 0);
  geometry.scale(1, 1.35, 1);
  return geometry;
}

export function makeGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 31);
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.18, 'rgba(255,255,255,0.65)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.16)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function disposeTexture(texture: THREE.Texture): void {
  texture.dispose();
}
