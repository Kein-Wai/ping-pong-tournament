import { describe, it, expect } from 'vitest';
import { createTrainingSchema, addExerciseToSessionSchema } from '../../src/schemas/training';

describe('Zod Schemas: Entrenamientos (Trainings)', () => {
  describe('createTrainingSchema', () => {
    const validPlayerId = '11111111-1111-4111-a111-111111111111';

    it('1. Debería pasar con un payload válido', () => {
      // Configuramos una fecha de mañana para asegurarnos de que pasa el refine
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const data = {
        playerId: validPlayerId,
        strengths: 'Buena derecha',
        weaknesses: 'Movilidad lenta',
        objectives: 'Mejorar el pivot',
        sessionsPerWeek: 3,
        weeks: 4,
        startDate: tomorrow.toISOString(),
      };
      const result = createTrainingSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('2. Debería fallar si la fecha está en el pasado', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const data = {
        playerId: validPlayerId,
        strengths: 'Fuerza',
        weaknesses: 'Velocidad',
        objectives: 'Ganar',
        sessionsPerWeek: 3,
        weeks: 4,
        startDate: yesterday.toISOString(),
      };

      const result = createTrainingSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'La fecha de inicio no puede estar en el pasado',
        );
      }
    });

    it('3. Debería fallar si las semanas exceden el límite (12)', () => {
      const data = {
        playerId: validPlayerId,
        strengths: 'Fuerza',
        weaknesses: 'Velocidad',
        objectives: 'Ganar',
        sessionsPerWeek: 3,
        weeks: 15, // Límite es 12
        startDate: new Date().toISOString(),
      };
      const result = createTrainingSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Un plan no debe exceder las 12 semanas');
      }
    });
  });

  describe('addExerciseToSessionSchema', () => {
    const validExerciseId = '22222222-2222-4222-a222-222222222222';

    it('4. Debería pasar enviando solo el UUID (todo lo demás es opcional)', () => {
      const result = addExerciseToSessionSchema.safeParse({ exerciseId: validExerciseId });
      expect(result.success).toBe(true);
    });

    it('5. Debería fallar si se envían series o repeticiones negativas o cero', () => {
      const result = addExerciseToSessionSchema.safeParse({
        exerciseId: validExerciseId,
        sets: 0,
        reps: -5,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.find((i) => i.path.includes('sets'))?.message).toBe(
          'Las series deben ser al menos 1',
        );
        expect(result.error.issues.find((i) => i.path.includes('reps'))?.message).toBe(
          'Las repeticiones deben ser al menos 1',
        );
      }
    });
  });
});
