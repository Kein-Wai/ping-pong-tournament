import { describe, it, expect } from 'vitest';
import {
  startSession,
  advance,
  pause,
  resume,
  holdRest,
  skipRest,
  next,
  previous,
  finish,
  getView,
  type WarmupItem,
} from './warmupEngine';

const RUTINA: WarmupItem[] = [
  { exerciseKey: 'estiramientos', durationSec: 60, restSec: 10 },
  { exerciseKey: 'derecha-derecha', durationSec: 90, restSec: 30 },
];

describe('Motor de calentamiento (warmupEngine)', () => {
  describe('startSession', () => {
    it('Debería empezar en cuenta atrás de 5 s sin pausa', () => {
      const state = startSession(RUTINA, 1_000);

      expect(getView(state, 1_000)).toMatchObject({
        phase: 'countdown',
        index: 0,
        remainingSec: 5,
        paused: false,
      });
    });
  });

  describe('paso del tiempo', () => {
    it('Debería descontar de la cuenta atrás el tiempo transcurrido', () => {
      const state = startSession(RUTINA, 1_000);

      expect(getView(state, 3_000)).toMatchObject({ phase: 'countdown', remainingSec: 3 });
    });

    it('Debería pasar de la cuenta atrás al descanso del primer ejercicio', () => {
      const state = startSession(RUTINA, 1_000);

      expect(getView(state, 6_000)).toMatchObject({ phase: 'rest', index: 0, remainingSec: 10 });
    });

    it('Debería recorrer descanso, ejercicio y descanso del siguiente con la duración de cada uno', () => {
      const state = startSession(RUTINA, 0);

      expect(getView(state, 15_000)).toMatchObject({ phase: 'exercise', index: 0, remainingSec: 60 });
      expect(getView(state, 75_000)).toMatchObject({ phase: 'rest', index: 1, remainingSec: 30 });
      expect(getView(state, 105_000)).toMatchObject({ phase: 'exercise', index: 1, remainingSec: 90 });
    });

    it('Debería terminar al acabar el último ejercicio y seguir terminada después', () => {
      const state = startSession(RUTINA, 0);

      expect(getView(state, 195_000)).toMatchObject({ phase: 'finished', remainingSec: 0 });
      expect(getView(state, 900_000)).toMatchObject({ phase: 'finished', remainingSec: 0 });
    });

    it('Debería caer en la fase correcta tras un salto grande de reloj y seguir contando desde ahí', () => {
      const state = startSession(RUTINA, 0);

      const despuesDelSalto = advance(state, 80_000);

      expect(getView(despuesDelSalto, 80_000)).toMatchObject({ phase: 'rest', index: 1, remainingSec: 25 });
      expect(getView(despuesDelSalto, 85_000)).toMatchObject({ phase: 'rest', index: 1, remainingSec: 20 });
    });

    it('Debería pasar directo al ejercicio cuando el descanso es de 0 s', () => {
      const state = startSession([{ exerciseKey: 'estiramientos', durationSec: 60, restSec: 0 }], 0);

      expect(getView(state, 5_000)).toMatchObject({ phase: 'exercise', index: 0, remainingSec: 60 });
    });

    it('Debería terminar directamente si la rutina no tiene ejercicios', () => {
      const state = startSession([], 0);

      expect(getView(state, 5_000)).toMatchObject({ phase: 'finished', remainingSec: 0 });
    });
  });

  describe('pausa', () => {
    it('Debería congelar el tiempo mientras está en pausa', () => {
      const pausada = pause(startSession(RUTINA, 0), 2_000);

      expect(getView(pausada, 100_000)).toMatchObject({ phase: 'countdown', remainingSec: 3, paused: true });
    });

    it('Debería seguir contando desde donde se quedó al reanudar', () => {
      const pausada = pause(startSession(RUTINA, 0), 2_000);

      const reanudada = resume(pausada, 100_000);

      expect(getView(reanudada, 101_000)).toMatchObject({ remainingSec: 2, paused: false });
    });

    it('Debería pausar en la fase correcta si el reloj ya había cruzado fases', () => {
      const pausada = pause(startSession(RUTINA, 0), 20_000);

      expect(getView(pausada, 500_000)).toMatchObject({ phase: 'exercise', index: 0, remainingSec: 55, paused: true });
    });

    it('Debería ignorar la pausa cuando la sesión ya terminó', () => {
      const terminada = pause(startSession(RUTINA, 0), 900_000);

      expect(getView(terminada, 900_000)).toMatchObject({ phase: 'finished', paused: false });
    });

    it('Debería ignorar reanudar si no estaba en pausa', () => {
      const state = startSession(RUTINA, 0);

      expect(resume(state, 2_000)).toEqual(state);
    });
  });

  describe('descanso', () => {
    it('Debería mantener el descanso indefinidamente mientras el jugador espera', () => {
      const esperando = holdRest(startSession(RUTINA, 0), 6_000);

      expect(getView(esperando, 500_000)).toMatchObject({
        phase: 'rest',
        index: 0,
        remainingSec: 9,
        waiting: true,
      });
    });

    it('Debería pasar al ejercicio con su duración completa al decir «Ya estoy listo» tras esperar', () => {
      const esperando = holdRest(startSession(RUTINA, 0), 6_000);

      const listo = skipRest(esperando, 500_000);

      expect(getView(listo, 500_000)).toMatchObject({ phase: 'exercise', index: 0, remainingSec: 60, waiting: false });
      expect(getView(listo, 501_000)).toMatchObject({ phase: 'exercise', remainingSec: 59 });
    });

    it('Debería saltar el descanso sin haber esperado', () => {
      const listo = skipRest(startSession(RUTINA, 0), 7_000);

      expect(getView(listo, 7_000)).toMatchObject({ phase: 'exercise', index: 0, remainingSec: 60 });
    });

    it('Debería seguir esperando tras pausar y reanudar durante la espera', () => {
      const esperando = holdRest(startSession(RUTINA, 0), 6_000);

      const reanudada = resume(pause(esperando, 7_000), 8_000);

      expect(getView(reanudada, 900_000)).toMatchObject({ phase: 'rest', remainingSec: 9, waiting: true });
    });

    it('Debería ignorar «Esperar» y «Ya estoy listo» fuera del descanso', () => {
      const enEjercicio = startSession(RUTINA, 0);

      expect(getView(holdRest(enEjercicio, 20_000), 20_000)).toMatchObject({ phase: 'exercise', waiting: false });
      expect(getView(skipRest(enEjercicio, 20_000), 20_000)).toMatchObject({ phase: 'exercise', remainingSec: 55 });
    });
  });

  describe('tiempo total restante', () => {
    it('Debería sumar cuenta atrás, descansos y ejercicios al empezar', () => {
      const state = startSession(RUTINA, 0);

      expect(getView(state, 0).totalRemainingSec).toBe(195);
    });

    it('Debería descontar lo ya transcurrido a mitad de un ejercicio', () => {
      const state = startSession(RUTINA, 0);

      expect(getView(state, 20_000).totalRemainingSec).toBe(175);
    });

    it('Debería incluir el ejercicio del descanso actual y no avanzar mientras se espera', () => {
      const esperando = holdRest(startSession(RUTINA, 0), 6_000);

      expect(getView(esperando, 500_000).totalRemainingSec).toBe(189);
    });

    it('Debería ser 0 cuando la sesión terminó', () => {
      const state = startSession(RUTINA, 0);

      expect(getView(state, 900_000).totalRemainingSec).toBe(0);
    });
  });

  describe('navegación', () => {
    it('Debería saltar al descanso del ejercicio siguiente', () => {
      const state = startSession(RUTINA, 0);

      expect(getView(next(state, 20_000), 20_000)).toMatchObject({ phase: 'rest', index: 1, remainingSec: 30 });
    });

    it('Debería saltar la cuenta atrás hacia el descanso del primer ejercicio', () => {
      const state = startSession(RUTINA, 0);

      expect(getView(next(state, 2_000), 2_000)).toMatchObject({ phase: 'rest', index: 0, remainingSec: 10 });
    });

    it('Debería terminar al pedir el siguiente desde el último ejercicio', () => {
      const state = startSession(RUTINA, 0);

      expect(getView(next(state, 120_000), 120_000)).toMatchObject({ phase: 'finished', remainingSec: 0 });
    });

    it('Debería volver al descanso del ejercicio anterior', () => {
      const state = startSession(RUTINA, 0);

      expect(getView(previous(state, 120_000), 120_000)).toMatchObject({ phase: 'rest', index: 0, remainingSec: 10 });
    });

    it('Debería reiniciar el descanso del primer ejercicio si no hay anterior', () => {
      const state = startSession(RUTINA, 0);

      expect(getView(previous(state, 20_000), 20_000)).toMatchObject({ phase: 'rest', index: 0, remainingSec: 10 });
    });

    it('Debería ignorar anterior durante la cuenta atrás inicial', () => {
      const state = startSession(RUTINA, 0);

      expect(getView(previous(state, 2_000), 2_000)).toMatchObject({ phase: 'countdown', remainingSec: 3 });
    });

    it('Debería conservar la pausa y quitar la espera al saltar', () => {
      const esperando = pause(holdRest(startSession(RUTINA, 0), 6_000), 7_000);

      const saltada = next(esperando, 8_000);

      expect(getView(saltada, 900_000)).toMatchObject({
        phase: 'rest',
        index: 1,
        remainingSec: 30,
        paused: true,
        waiting: false,
      });
    });

    it('Debería ignorar siguiente y anterior cuando la sesión ya terminó', () => {
      const terminada = finish(startSession(RUTINA, 0), 3_000);

      expect(getView(next(terminada, 4_000), 4_000)).toMatchObject({ phase: 'finished' });
      expect(getView(previous(terminada, 4_000), 4_000)).toMatchObject({ phase: 'finished' });
    });

    it('Debería terminar al pulsar «Terminar» desde cualquier fase', () => {
      const state = startSession(RUTINA, 0);

      expect(getView(finish(state, 20_000), 20_000)).toMatchObject({ phase: 'finished', remainingSec: 0 });
    });
  });
});
