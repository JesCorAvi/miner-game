import { describe, expect, it } from 'vitest';
import {
  computeBearingArrow,
  estimateReturnTime,
  ReturnPlanner,
} from '../src/core/ReturnPlanner';

describe('Planificador de Regreso (ReturnPlanner)', () => {
  describe('estimateReturnTime (Heurística de retorno)', () => {
    it('el tiempo estimado aumenta con la distancia horizontal', () => {
      const near = estimateReturnTime(5, 0, 0, 0, 40);
      const far = estimateReturnTime(35, 0, 0, 0, 40);
      expect(far).toBeGreaterThan(near);
    });

    it('el tiempo estimado aumenta con el desnivel positivo y las escaleras', () => {
      const flat = estimateReturnTime(10, 0, 0, 0, 40);
      const deep = estimateReturnTime(10, 20, 7, 0, 40);
      expect(deep).toBeGreaterThan(flat);
    });

    it('aplica penalización de lastre cuando el peso supera el 80 % de capacidad', () => {
      const light = estimateReturnTime(20, 10, 3, 10, 40); // 25% de carga
      const heavy = estimateReturnTime(20, 10, 3, 38, 40); // 95% de carga
      expect(heavy).toBeGreaterThan(light);
    });
  });

  describe('computeBearingArrow (Brújula / rumbo a la tolva)', () => {
    it('apunta hacia adelante cuando la diferencia es cercana a 0', () => {
      expect(computeBearingArrow(0)).toBe('▲');
      expect(computeBearingArrow(0.1)).toBe('▲');
      expect(computeBearingArrow(-0.1)).toBe('▲');
    });

    it('apunta a la derecha cuando el ángulo es positivo', () => {
      expect(computeBearingArrow(Math.PI / 2)).toBe('▶');
    });

    it('apunta a la izquierda cuando el ángulo es negativo', () => {
      expect(computeBearingArrow(-Math.PI / 2)).toBe('◀');
    });

    it('apunta hacia atrás cuando la tolva está a la espalda', () => {
      expect(computeBearingArrow(Math.PI)).toBe('▼');
      expect(computeBearingArrow(-Math.PI)).toBe('▼');
    });
  });

  describe('ReturnPlanner y caché a 2 Hz', () => {
    const hopper = { x: 14, y: 0.1, z: 28.5 };

    it('devuelve status no_route si el jugador está en el fondo sin jetpack ni escaleras', () => {
      const planner = new ReturnPlanner();
      const playerPos = { x: 0, y: -25, z: 0 }; // 25m bajo tierra
      const result = planner.calculate(
        1000,
        playerPos,
        0,
        hopper,
        [], // Sin escaleras
        false, // Sin jetpack
        10,
        40,
        60,
      );

      expect(result.hasRoute).toBe(false);
      expect(result.status).toBe('no_route');
      expect(result.statusLabel).toContain('SIN RUTA');
    });

    it('devuelve status safe si hay tiempo de sobra para volver', () => {
      const planner = new ReturnPlanner();
      const playerPos = { x: 10, y: 0, z: 25 }; // muy cerca de la tolva
      const result = planner.calculate(
        1000,
        playerPos,
        0,
        hopper,
        [],
        false,
        5,
        40,
        80, // 80s restantes
      );

      expect(result.hasRoute).toBe(true);
      expect(result.status).toBe('safe');
      expect(result.statusLabel).toContain('REGRESO');
    });

    it('devuelve status danger si el tiempo restante es menor que la estimación', () => {
      const planner = new ReturnPlanner();
      const playerPos = { x: -20, y: -40, z: -20 };
      const ladders = Array.from({ length: 15 }, (_, i) => ({
        x: 0,
        y: -i * 3,
        z: 0,
        height: 3,
      }));

      const result = planner.calculate(
        1000,
        playerPos,
        0,
        hopper,
        ladders,
        false,
        35,
        40,
        5, // solo 5 segundos restantes
        true, // forzar cálculo
      );

      expect(result.hasRoute).toBe(true);
      expect(result.status).toBe('danger');
    });

    it('reutiliza el resultado en llamadas dentro de la ventana de 500 ms (2 Hz)', () => {
      const planner = new ReturnPlanner();
      const pos1 = { x: 0, y: 0, z: 0 };
      const res1 = planner.calculate(1000, pos1, 0, hopper, [], false, 0, 40, 90);

      // Segunda llamada a 200 ms con posición diferente
      const pos2 = { x: 50, y: 50, z: 50 };
      const res2 = planner.calculate(1200, pos2, 0, hopper, [], false, 0, 40, 90);

      // Debe devolver el mismo resultado en caché
      expect(res2).toBe(res1);

      // Tercera llamada a 600 ms (> 500 ms)
      const res3 = planner.calculate(1650, pos2, 0, hopper, [], false, 0, 40, 90);
      expect(res3).not.toBe(res1);
    });
  });
});
