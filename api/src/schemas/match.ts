import { z } from 'zod';
const scoreSchema = z.number().int().min(0, 'La puntuación no puede ser negativa').optional();
import { MatchStatus } from '@prisma/client';

export const createMatchSchema = z
  .object({
    dateStart: z.iso
      .datetime('Formato de fecha inválido. Usa ISO 8601 (ej. 2026-07-15T10:30:00Z)')
      .optional(),
    tournamentId: z.uuid().optional(),
    groupId: z.uuid().optional(),
    knockoutId: z.uuid().optional(),
    leagueId: z.uuid().optional(),
    playerOneId: z.uuid('El ID del Jugador 1 debe ser un UUID válido'),
    playerTwoId: z.uuid('El ID del Jugador 2 debe ser un UUID válido'),
    setOnePlayerOne: scoreSchema,
    setOnePlayerTwo: scoreSchema,
    setTwoPlayerOne: scoreSchema,
    setTwoPlayerTwo: scoreSchema,
    setThreePlayerOne: scoreSchema,
    setThreePlayerTwo: scoreSchema,
    setFourPlayerOne: scoreSchema,
    setFourPlayerTwo: scoreSchema,
    setFivePlayerOne: scoreSchema,
    setFivePlayerTwo: scoreSchema,
    setSixPlayerOne: scoreSchema,
    setSixPlayerTwo: scoreSchema,
    setSevenPlayerOne: scoreSchema,
    setSevenPlayerTwo: scoreSchema,
    status: z.enum(MatchStatus).optional(),
  })
  .superRefine((data, ctx) => {
    const setsToValidate = [
      { p1: 'setOnePlayerOne', p2: 'setOnePlayerTwo', name: 'Set 1' },
      { p1: 'setTwoPlayerOne', p2: 'setTwoPlayerTwo', name: 'Set 2' },
      { p1: 'setThreePlayerOne', p2: 'setThreePlayerTwo', name: 'Set 3' },
      { p1: 'setFourPlayerOne', p2: 'setFourPlayerTwo', name: 'Set 4' },
      { p1: 'setFivePlayerOne', p2: 'setFivePlayerTwo', name: 'Set 5' },
      { p1: 'setSixPlayerOne', p2: 'setSixPlayerTwo', name: 'Set 6' },
      { p1: 'setSevenPlayerOne', p2: 'setSevenPlayerTwo', name: 'Set 7' },
    ] as const;

    for (const set of setsToValidate) {
      const score1 = data[set.p1];
      const score2 = data[set.p2];

      if ((score1 === undefined && score2 === undefined) || (score1 === 0 && score2 === 0)) {
        continue;
      }

      if (score1 === undefined || score2 === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `Falta la puntuación del rival en el ${set.name}.`,
          path: [score1 === undefined ? set.p1 : set.p2],
        });
        continue;
      }

      const maxScore = Math.max(score1, score2);
      const diff = Math.abs(score1 - score2);

      if (maxScore < 11) {
        ctx.addIssue({
          code: 'custom',
          message: `En el ${set.name}, al menos un jugador debe llegar a 11 puntos.`,
          path: [set.p1],
        });
      }

      if (diff < 2) {
        ctx.addIssue({
          code: 'custom',
          message: `En el ${set.name}, debe haber una diferencia mínima de 2 puntos (hay ${diff}).`,
          path: [set.p2],
        });
      }
    }
  });
