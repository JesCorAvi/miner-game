/**
 * TraumaSystem.ts — Sistema de temblor de cámara basado en trauma (Sección 3.5.5).
 * Reemplaza el shake puramente aleatorio por un decaimiento no lineal (trauma²)
 * con topes por tipo de evento y multiplicador de accesibilidad (0%, 50%, 100%).
 */

export class TraumaSystem {
  private trauma = 0;
  private accessibilityMultiplier = 1.0; // 0.0 = 0%, 0.5 = 50%, 1.0 = 100%
  private static readonly DECAY_RATE = 2.5; // unidades / s
  private static readonly MAX_DISTANCE = 40.0; // m

  setAccessibility(ratio: number): void {
    this.accessibilityMultiplier = Math.max(0, Math.min(1, ratio));
  }

  getAccessibility(): number {
    return this.accessibilityMultiplier;
  }

  getTrauma(): number {
    return this.trauma;
  }

  addTrauma(amount: number, cap = 0.8, distance?: number): void {
    if (distance !== undefined && distance > TraumaSystem.MAX_DISTANCE) {
      return;
    }
    const safeCap = Math.min(0.8, cap);
    this.trauma = Math.min(safeCap, this.trauma + amount);
  }

  addMiningTrauma(): void {
    this.addTrauma(0.08, 0.2);
  }

  addExplosionTrauma(distance: number, massive = false): void {
    if (distance > TraumaSystem.MAX_DISTANCE) return;
    const factor = Math.max(0, 1 - distance / TraumaSystem.MAX_DISTANCE);
    const amount = factor * (massive ? 0.7 : 0.45);
    this.addTrauma(amount, massive ? 0.8 : 0.6, distance);
  }

  update(dt: number): void {
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - TraumaSystem.DECAY_RATE * dt);
    }
  }

  getShake(): { x: number; y: number; yaw: number; pitch: number } {
    if (this.trauma <= 0 || this.accessibilityMultiplier <= 0) {
      return { x: 0, y: 0, yaw: 0, pitch: 0 };
    }
    const intensity = this.trauma * this.trauma * this.accessibilityMultiplier;
    return {
      x: (Math.random() - 0.5) * intensity * 0.05,
      y: (Math.random() - 0.5) * intensity * 0.05,
      yaw: (Math.random() - 0.5) * intensity * 0.035,
      pitch: (Math.random() - 0.5) * intensity * 0.03,
    };
  }

  clear(): void {
    this.trauma = 0;
  }
}
