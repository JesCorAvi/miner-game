import * as THREE from 'three';

export type ToastTone = 'info' | 'positive' | 'danger';

export interface FloatingText {
  element: HTMLElement;
  position: THREE.Vector3;
  expiresAt: number;
}

export interface FloatingNoticeElements {
  toastStack: HTMLElement;
  floatLayer: HTMLElement;
  banner: HTMLElement;
  bannerKicker: HTMLElement;
  bannerText: HTMLElement;
}

export class FloatingNoticeView {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly toastStack: HTMLElement;
  private readonly floatLayer: HTMLElement;
  private readonly banner: HTMLElement;
  private readonly bannerKicker: HTMLElement;
  private readonly bannerText: HTMLElement;
  private readonly floats: FloatingText[] = [];
  private bannerTimeout = 0;
  private toastCount = 0;

  constructor(camera: THREE.PerspectiveCamera, elements: FloatingNoticeElements) {
    this.camera = camera;
    this.toastStack = elements.toastStack;
    this.floatLayer = elements.floatLayer;
    this.banner = elements.banner;
    this.bannerKicker = elements.bannerKicker;
    this.bannerText = elements.bannerText;
  }

  notify(message: string, tone: ToastTone = 'info'): void {
    const toast = document.createElement('div');
    toast.className = `toast${tone === 'positive' ? ' is-positive' : tone === 'danger' ? ' is-danger' : ''}`;
    toast.textContent = message;
    this.toastStack.appendChild(toast);
    this.toastCount += 1;
    const currentToast = this.toastCount;
    window.setTimeout(() => {
      if (this.toastCount !== currentToast) {
        toast.classList.add('is-leaving');
      }
      window.setTimeout(() => {
        toast.remove();
      }, 220);
    }, 3600);
  }

  showBanner(kicker: string, text: string, duration = 2200): void {
    this.bannerKicker.textContent = kicker;
    this.bannerText.textContent = text;
    this.banner.hidden = false;
    this.banner.style.animation = 'none';
    void this.banner.offsetHeight;
    this.banner.style.animation = '';
    window.clearTimeout(this.bannerTimeout);
    this.bannerTimeout = window.setTimeout(() => {
      this.banner.hidden = true;
    }, duration);
  }

  spawnFloat(position: THREE.Vector3, text: string, tone: 'amber' | 'positive' | 'cyan' = 'amber'): void {
    if (this.floats.length >= 14) {
      const oldest = this.floats.shift();
      oldest?.element.remove();
    }
    const element = document.createElement('div');
    element.className = `float-text${tone === 'positive' ? ' is-positive' : tone === 'cyan' ? ' is-cyan' : ''}`;
    element.textContent = text;
    this.floatLayer.appendChild(element);
    this.floats.push({
      element,
      position: position.clone(),
      expiresAt: performance.now() + 1500,
    });
    this.updateFloats();
  }

  updateFloats(): void {
    const now = performance.now();
    for (let index = this.floats.length - 1; index >= 0; index -= 1) {
      const item = this.floats[index];
      if (now > item.expiresAt) {
        item.element.remove();
        this.floats.splice(index, 1);
        continue;
      }
      const projected = item.position.clone().project(this.camera);
      if (projected.z > 1) {
        item.element.style.display = 'none';
        continue;
      }
      const x = ((projected.x + 1) / 2) * window.innerWidth;
      const y = ((-projected.y + 1) / 2) * window.innerHeight;
      item.element.style.display = 'block';
      item.element.style.left = `${x}px`;
      item.element.style.top = `${y}px`;
    }
  }

  clearFloats(): void {
    for (const item of this.floats) {
      item.element.remove();
    }
    this.floats.length = 0;
  }
}
