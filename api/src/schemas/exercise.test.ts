import { describe, it, expect } from 'vitest';
import { createExerciseSchema } from '../../src/schemas/exercise';

describe('Zod Schemas: Ejercicios', () => {
  it('Debería pasar con un ejercicio válido', () => {
    const data = {
      name: 'Saque lateral corto',
      description: 'Saque cortado al revés del oponente con efecto lateral.',
      category: 'Saques_Largos', // Prisma Enum string
      code: 14,
    };
    const result = createExerciseSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('Debería fallar si el nombre o la descripción son muy cortos', () => {
    const result = createExerciseSchema.safeParse({
      name: 'Sa', // Falla min 3
      description: 'Corto', // Falla min 5
      category: 'Individuales',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.find((i) => i.path.includes('name'))?.message).toBe(
        'El nombre debe tener al menos 3 caracteres',
      );
    }
  });
});
