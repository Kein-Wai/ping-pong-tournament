import { z } from 'zod';
import { MatchStatus } from '@prisma/client';
import { isValidTableTennisSet } from '../utils/match';

const scoreSchema = z
  .number()
  .int()
  .min(0, 'La puntuación no puede ser negativa')
  .nullable()
  .optional();

// 1. OBJETO BASE SIN REFINAMIENTOS
export const baseMatchObject = z.object({
  dateStart: z.iso
    .datetime('Formato de fecha inválido. Usa ISO 8601 (ej. 2026-07-15T10:30:00Z)')
    .optional(),
  tournamentId: z.uuid().nullable().optional(),
  groupId: z.uuid().nullable().optional(),
  knockoutId: z.uuid().nullable().optional(),
  leagueId: z.uuid().nullable().optional(),
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
  setsToWin: z.number().int().optional(),
});

// 2. FUNCIÓN CON LAS REGLAS DE NEGOCIO DEL PARTIDO
export const validateMatchBusinessRules = (data: any, ctx: z.RefinementCtx) => {
  const setsToValidate = [
    { p1: 'setOnePlayerOne', p2: 'setOnePlayerTwo', name: 'Set 1' },
    { p1: 'setTwoPlayerOne', p2: 'setTwoPlayerTwo', name: 'Set 2' },
    { p1: 'setThreePlayerOne', p2: 'setThreePlayerTwo', name: 'Set 3' },
    { p1: 'setFourPlayerOne', p2: 'setFourPlayerTwo', name: 'Set 4' },
    { p1: 'setFivePlayerOne', p2: 'setFivePlayerTwo', name: 'Set 5' },
    { p1: 'setSixPlayerOne', p2: 'setSixPlayerTwo', name: 'Set 6' },
    { p1: 'setSevenPlayerOne', p2: 'setSevenPlayerTwo', name: 'Set 7' },
  ] as const;

  let p1SetsWon = 0;
  let p2SetsWon = 0;

  for (const set of setsToValidate) {
    const rawScore1 = data[set.p1];
    const rawScore2 = data[set.p2];

    // Ignorar si ambos están vacíos o a 0
    if (
      (rawScore1 === undefined || rawScore1 === null) &&
      (rawScore2 === undefined || rawScore2 === null)
    )
      continue;
    if (rawScore1 === 0 && rawScore2 === 0) continue;

    // Falla si uno de los dos no se ha enviado
    if (
      rawScore1 === null ||
      rawScore1 === undefined ||
      rawScore2 === null ||
      rawScore2 === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        message: `Falta la puntuación del rival en el ${set.name}.`,
        path: [rawScore1 === null || rawScore1 === undefined ? set.p1 : set.p2],
      });
      continue;
    }

    const score1 = Number(rawScore1);
    const score2 = Number(rawScore2);

    if (!isValidTableTennisSet(score1, score2)) {
      ctx.addIssue({
        code: 'custom',
        message: `El marcador del ${set.name} (${score1}-${score2}) no es válido en tenis de mesa reglamentario.`,
        path: [set.p1],
      });
      continue;
    }

    if (score1 > score2) p1SetsWon++;
    else if (score2 > score1) p2SetsWon++;
  }

  if (data.status === 'Completado' && data.setsToWin) {
    const targetSets = data.setsToWin; // 2, 3 o 4
    const winnerReachedTarget = p1SetsWon === targetSets || p2SetsWon === targetSets;

    if (!winnerReachedTarget) {
      ctx.addIssue({
        code: 'custom',
        message: `Para completar el partido, uno de los dos jugadores debe ganar exactamente ${targetSets} sets (Actual: ${p1SetsWon}-${p2SetsWon}).`,
        path: ['status'],
      });
    }
  }
};

// 3. ESQUEMA COMPLETO PARA CREACIÓN
export const createMatchSchema = baseMatchObject.superRefine(validateMatchBusinessRules);
