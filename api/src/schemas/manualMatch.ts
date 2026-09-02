import { z } from 'zod';
import {
  MatchLocation,
  ManualMatchType,
  MatchFormat,
  OpponentLevel,
  DominantHand,
  Playstyle,
} from '@prisma/client';

export const createManualMatchSchema = z.object({
  date: z.iso.datetime().optional(),
  location: z.enum([MatchLocation.Casa, MatchLocation.Fuera]),
  matchType: z.enum([ManualMatchType.Liga, ManualMatchType.Competicion, ManualMatchType.Amistoso]),
  format: z.enum([MatchFormat.Individual, MatchFormat.Equipos]),

  opponentName: z.string().min(1, 'El nombre del rival es obligatorio'),
  opponentHand: z.enum([DominantHand.Diestro, DominantHand.Zurdo]).optional().nullable(),
  opponentStyle: z.enum([Playstyle.Ofensivo, Playstyle.Defensivo]).optional().nullable(),
  opponentLevel: z
    .enum([OpponentLevel.Peor, OpponentLevel.Igual, OpponentLevel.Mejor])
    .optional()
    .nullable(),
});

export const addPointSchema = z.object({
  setNumber: z.number().int().min(1),
  pointOrder: z.number().int().min(1),
  isWon: z.boolean(),

  // Los 4 niveles de tu estructura (pueden ser nulos si es un error no forzado, por ejemplo)
  phase: z.string().optional().nullable(),
  side: z.string().optional().nullable(),
  technique: z.string().optional().nullable(),
  placement: z.string().optional().nullable(),
});

export const completeMatchSchema = z.object({
  mySets: z.number().int().min(0),
  opponentSets: z.number().int().min(0),
});

export const updateManualMatchSchema = z.object({
  opponentName: z.string().min(1, 'El nombre no puede estar vacío').optional(),
  opponentHand: z.enum([DominantHand.Diestro, DominantHand.Zurdo]).optional().nullable(),
  opponentStyle: z.enum([Playstyle.Ofensivo, Playstyle.Defensivo]).optional().nullable(),
  opponentLevel: z
    .enum([OpponentLevel.Peor, OpponentLevel.Igual, OpponentLevel.Mejor])
    .optional()
    .nullable(),
});
