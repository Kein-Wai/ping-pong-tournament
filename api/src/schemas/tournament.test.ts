import { describe, it, expect } from 'vitest';
import { createTournamentSchema } from '../../src/schemas/tournament'; // Ajusta la ruta correcta
import { Rounds } from '@prisma/client';

describe('Zod Schema: createTournamentSchema', () => {
  const baseValidData = {
    dateStart: '2026-07-15T10:30:00Z',
    name: 'Torneo de Verano',
  };

  describe('Formato: Todos vs Todos', () => {
    it('1. Debería pasar con datos válidos (ej. 8 jugadores, 1 grupo)', () => {
      const data = {
        ...baseValidData,
        numPlayers: 8,
        numGroup: 1,
        rounds: Rounds.TodosvsTodos,
      };
      const result = createTournamentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('2. Debería fallar si los jugadores no están entre 3 y 10', () => {
      const resultTooFew = createTournamentSchema.safeParse({
        ...baseValidData,
        numPlayers: 2,
        numGroup: 1,
        rounds: Rounds.TodosvsTodos,
      });
      const resultTooMany = createTournamentSchema.safeParse({
        ...baseValidData,
        numPlayers: 11,
        numGroup: 1,
        rounds: Rounds.TodosvsTodos,
      });
      expect(resultTooFew.success).toBe(false);
      expect(resultTooMany.success).toBe(false);

      if (!resultTooFew.success) {
        expect(resultTooFew.error.issues[0].message).toContain('entre 3 y 10 jugadores');
      }
    });

    it('3. Debería fallar si se envían múltiples grupos', () => {
      const result = createTournamentSchema.safeParse({
        ...baseValidData,
        numPlayers: 8,
        numGroup: 2, // Inválido para Todos vs Todos
        rounds: Rounds.TodosvsTodos,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.find((i) => i.path.includes('numGroup'))?.message).toContain(
          'debe tener 1 solo grupo',
        );
      }
    });
  });

  describe('Formato: GruposKnockout', () => {
    it('4. Debería pasar con datos válidos (ej. 16 jugadores, 4 grupos, 4 por grupo)', () => {
      const data = {
        ...baseValidData,
        numPlayers: 16,
        numGroup: 4,
        numGroupPlayers: 4,
        playersKnockout: 2,
        rounds: Rounds.GruposKnockout,
      };
      const result = createTournamentSchema.safeParse(data);
      console.log(result);
      expect(result.success).toBe(true);
    });

    it('5. Debería fallar si los jugadores no están entre 6 y 128', () => {
      const result = createTournamentSchema.safeParse({
        ...baseValidData,
        numPlayers: 5,
        numGroup: 1,
        rounds: Rounds.GruposKnockout,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('entre 6 y 128 jugadores');
      }
    });

    it('6. Debería fallar si los grupos no están entre 2 y 16', () => {
      const result = createTournamentSchema.safeParse({
        ...baseValidData,
        numPlayers: 16,
        numGroup: 1, // Muy pocos
        rounds: Rounds.GruposKnockout,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.find((i) => i.path.includes('numGroup'))?.message).toContain(
          'entre 2 y 16 grupos',
        );
      }
    });

    it('7. Debería fallar si hay menos de 3 jugadores por grupo', () => {
      const result = createTournamentSchema.safeParse({
        ...baseValidData,
        numPlayers: 16,
        numGroup: 8,
        numGroupPlayers: 2, // Muy pocos por grupo
        rounds: Rounds.GruposKnockout,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.find((i) => i.path.includes('numGroupPlayers'))?.message,
        ).toContain('al menos 3 jugadores por grupo');
      }
    });
  });

  describe('Formato: Knockout (Solo Eliminatorias)', () => {
    it('8. Debería pasar con datos válidos (ej. 16 jugadores)', () => {
      const data = {
        ...baseValidData,
        numPlayers: 16,
        rounds: Rounds.Knockout,
      };
      const result = createTournamentSchema.safeParse(data);
      console.log(result);
      expect(result.success).toBe(true);
    });

    it('9. Debería fallar si los jugadores no están entre 4 y 128', () => {
      const result = createTournamentSchema.safeParse({
        ...baseValidData,
        numPlayers: 3,
        rounds: Rounds.Knockout,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('entre 4 y 128 jugadores');
      }
    });

    it('10. Debería fallar si se envían configuraciones de grupos', () => {
      const result = createTournamentSchema.safeParse({
        ...baseValidData,
        numPlayers: 16,
        numGroup: 4, // No tiene sentido en Knockout
        rounds: Rounds.Knockout,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.find((i) => i.path.includes('numGroup'))?.message).toContain(
          'no puede tener configuración de grupos',
        );
      }
    });
  });

  describe('Validaciones Base Compartidas', () => {
    it('11. Debería fallar si el nombre tiene menos de 3 caracteres', () => {
      const result = createTournamentSchema.safeParse({
        ...baseValidData,
        name: 'AB', // Inválido
        numPlayers: 10,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('al menos 3 caracteres');
      }
    });
  });
});
