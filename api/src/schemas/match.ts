import { z } from 'zod';
import { MatchStatus } from '@prisma/client';
import { validateMatchRules } from '../utils/match-rules';

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
/**
 * Adaptador de Zod: vuelca en el contexto los incumplimientos que detecta el
 * modulo puro de reglas de partido.
 */
export const validateMatchBusinessRules = (data: z.infer<typeof baseMatchObject>, ctx: z.RefinementCtx) => {
  validateMatchRules({
    scores: data,
    status: data.status,
    setsToWin: data.setsToWin,
  }).forEach((issue) => {
    ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path });
  });
};

// 3. ESQUEMA COMPLETO PARA CREACIÓN
export const createMatchSchema = baseMatchObject.superRefine(validateMatchBusinessRules);
