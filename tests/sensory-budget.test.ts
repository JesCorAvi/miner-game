import { describe, expect, it } from 'vitest';
import { PresentationBudget, EVENT_COSTS } from '../src/core/PresentationBudget';
import { TraumaSystem } from '../src/player/TraumaSystem';

describe('Presupuesto Sensorial (PresentationBudget)', () => {
  it('inicializa y resetea tokens según modo normal (120) o explosión masiva (60)', () => {
    const budget = new PresentationBudget();
    expect(budget.getAvailableTokens()).toBe(120);

    budget.resetFrame(true);
    expect(budget.getAvailableTokens()).toBe(60);
    expect(budget.isMassive()).toBe(true);

    budget.resetFrame(false);
    expect(budget.getAvailableTokens()).toBe(120);
    expect(budget.isMassive()).toBe(false);
  });

  it('consume tokens según el tipo de evento y rechaza cuando se agotan', () => {
    const budget = new PresentationBudget();
    expect(EVENT_COSTS.spark).toBe(1);
    expect(EVENT_COSTS.debris).toBe(2);
    expect(EVENT_COSTS.sound).toBe(3);
    expect(EVENT_COSTS.shake).toBe(4);
    expect(EVENT_COSTS.light).toBe(8);

    // Consumir 10 luces = 80 tokens -> quedan 40
    expect(budget.request('light', 10)).toBe(true);
    expect(budget.getAvailableTokens()).toBe(40);

    // Intentar pedir 6 luces más (48 tokens) cuando solo quedan 40 debe denegarse
    expect(budget.request('light', 6)).toBe(false);
    expect(budget.getAvailableTokens()).toBe(40);

    // Pedir 5 sonidos = 15 tokens -> quedan 25
    expect(budget.request('sound', 5)).toBe(true);
    expect(budget.getAvailableTokens()).toBe(25);
  });

  it('rechaza eventos que superen la distancia máxima (> 60m)', () => {
    const budget = new PresentationBudget();
    expect(budget.request('sound', 1, 30)).toBe(true);
    expect(budget.request('sound', 1, 65)).toBe(false);
  });
});

describe('Sistema de Trauma y Temblor (TraumaSystem)', () => {
  it('aplica decaimiento lineal a razón de 2.5 u/s', () => {
    const trauma = new TraumaSystem();
    trauma.addTrauma(0.5, 0.8);
    expect(trauma.getTrauma()).toBe(0.5);

    trauma.update(0.1); // 0.1s * 2.5 = 0.25 de decaimiento
    expect(trauma.getTrauma()).toBeCloseTo(0.25, 2);

    trauma.update(0.1); // otros 0.25 de decaimiento
    expect(trauma.getTrauma()).toBeCloseTo(0.0, 2);
  });

  it('respeta topes duros para minado (0.2) y explosiones estándar (0.6)', () => {
    const trauma = new TraumaSystem();
    // Golpear 10 veces en minado no debe exceder 0.2
    for (let i = 0; i < 10; i++) {
      trauma.addMiningTrauma();
    }
    expect(trauma.getTrauma()).toBeLessThanOrEqual(0.2);

    // Explosión a corta distancia no debe exceder 0.6
    trauma.addExplosionTrauma(1.0, false);
    expect(trauma.getTrauma()).toBeLessThanOrEqual(0.6);

    // Explosión masiva no debe exceder 0.8
    trauma.addExplosionTrauma(1.0, true);
    expect(trauma.getTrauma()).toBeLessThanOrEqual(0.8);
  });

  it('no añade trauma a distancias superiores a 40 metros', () => {
    const trauma = new TraumaSystem();
    trauma.addExplosionTrauma(45, true);
    expect(trauma.getTrauma()).toBe(0);
  });

  it('el multiplicador de accesibilidad escala el temblor o lo apaga completamente a 0%', () => {
    const trauma = new TraumaSystem();
    trauma.addTrauma(0.5, 0.8);

    // Con 100% de accesibilidad produce shake
    trauma.setAccessibility(1.0);
    const shake100 = trauma.getShake();
    expect(trauma.getAccessibility()).toBe(1.0);

    // Con 0% no produce shake alguno
    trauma.setAccessibility(0.0);
    const shake0 = trauma.getShake();
    expect(shake0.x).toBe(0);
    expect(shake0.y).toBe(0);
    expect(shake0.yaw).toBe(0);
    expect(shake0.pitch).toBe(0);
  });
});
