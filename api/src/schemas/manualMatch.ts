import { z } from 'zod';
import {
  MatchLocation,
  ManualMatchType,
  MatchFormat,
  OpponentLevel,
  DominantHand,
  Playstyle,
  PointPhase,
  StrokeSide,
  StrokeTechnique,
  StrokePlacement,
  ErrorModifier,
} from '@prisma/client';

export const createManualMatchSchema = z.object({
  date: z.iso.datetime().optional(),
  location: z.enum(MatchLocation),
  matchType: z.enum(ManualMatchType),
  format: z.enum(MatchFormat),

  opponentName: z.string().min(1, 'El nombre del rival es obligatorio'),
  opponentHand: z.enum(DominantHand).optional().nullable(),
  opponentStyle: z.enum(Playstyle).optional().nullable(),
  opponentLevel: z.enum(OpponentLevel).optional().nullable(),
  setsToWin: z.number().int().min(1).default(3),
});

export const addPointSchema = z.object({
  setNumber: z.number().int().min(1),
  pointOrder: z.number().int().min(1),
  isWon: z.boolean(),

  // Los 4 niveles de tu estructura (pueden ser nulos si es un error no forzado, por ejemplo)
  phase: z.enum(PointPhase).optional().nullable(),
  side: z.enum(StrokeSide).optional().nullable(),
  technique: z.enum(StrokeTechnique).optional().nullable(),
  placement: z.enum(StrokePlacement).optional().nullable(),
  errorModifier: z.enum(ErrorModifier).optional().nullable(),
});

export const completeMatchSchema = z.object({
  mySets: z.number().int().min(0),
  opponentSets: z.number().int().min(0),
});

export const updateManualMatchSchema = z.object({
  opponentName: z.string().min(1, 'El nombre no puede estar vacío').optional(),
  opponentHand: z.enum(DominantHand).optional().nullable(),
  opponentStyle: z.enum(Playstyle).optional().nullable(),
  opponentLevel: z.enum(OpponentLevel).optional().nullable(),
});
