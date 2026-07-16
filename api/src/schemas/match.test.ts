import { describe, it, expect } from 'vitest';
import { createMatchSchema } from '../../src/schemas/match';

describe('Zod Schema: createMatchSchema (Reglas de Ping Pong)', () => {
  const validPlayerOneId = '11111111-1111-4111-a111-111111111111';
  const validPlayerTwoId = '22222222-2222-4222-a222-222222222222';

  it('1. Debería pasar todos los filtros con un resultado válido (11-8, 12-10)', () => {
    const data = {
      playerOneId: validPlayerOneId,
      playerTwoId: validPlayerTwoId,
      setOnePlayerOne: 11,
      setOnePlayerTwo: 8,
      setTwoPlayerOne: 12,
      setTwoPlayerTwo: 10,
    };

    const result = createMatchSchema.safeParse(data);

    expect(result.success).toBe(true);
  });

  it('2. Debería pasar si los sets se envían a 0 o no se envían (Regla 0)', () => {
    const data = {
      playerOneId: validPlayerOneId,
      playerTwoId: validPlayerTwoId,
      setOnePlayerOne: 0,
      setOnePlayerTwo: 0,
    };

    const result = createMatchSchema.safeParse(data);

    expect(result.success).toBe(true);
  });

  it('3. Debería fallar si falta la puntuación del rival (Regla 1)', () => {
    const data = {
      playerOneId: validPlayerOneId,
      playerTwoId: validPlayerTwoId,
      setOnePlayerOne: 11,
    };

    const result = createMatchSchema.safeParse(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.message.includes('Falta la puntuación del rival'),
      );
      expect(issue).toBeDefined();
      expect(issue?.path).toContain('setOnePlayerTwo');
    }
  });

  it('4. Debería fallar si nadie llega a 11 puntos (Regla 2)', () => {
    const data = {
      playerOneId: validPlayerOneId,
      playerTwoId: validPlayerTwoId,
      setOnePlayerOne: 10,
      setOnePlayerTwo: 8,
    };

    const result = createMatchSchema.safeParse(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.message.includes('al menos un jugador debe llegar a 11 puntos'),
      );
      expect(issue).toBeDefined();
    }
  });

  it('5. Debería fallar si la diferencia es menor a 2 puntos (Regla 3)', () => {
    const data = {
      playerOneId: validPlayerOneId,
      playerTwoId: validPlayerTwoId,
      setOnePlayerOne: 11,
      setOnePlayerTwo: 10,
    };

    const result = createMatchSchema.safeParse(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.message.includes('diferencia mínima de 2 puntos'),
      );
      expect(issue).toBeDefined();
    }
  });

  it('6. Debería evaluar las reglas en sets avanzados de forma independiente', () => {
    const data = {
      playerOneId: validPlayerOneId,
      playerTwoId: validPlayerTwoId,
      setOnePlayerOne: 11,
      setOnePlayerTwo: 5,
      setTwoPlayerOne: 13,
      setTwoPlayerTwo: 12,
    };

    const result = createMatchSchema.safeParse(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.message.includes('En el Set 2'));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('diferencia mínima de 2 puntos');
    }
  });
});
