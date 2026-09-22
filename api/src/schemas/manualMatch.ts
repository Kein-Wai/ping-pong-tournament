import { z } from 'zod';
import {
  MatchLocation,
  ManualMatchType,
  MatchFormat,
  OpponentLevel,
  DominantHand,
  Playstyle,
  AnalysisType,
  PointCategory,
  PointSubcategory,
  PointPlacement,
} from '@prisma/client';

export const createManualMatchSchema = z.object({
  date: z.iso.datetime().optional(),
  location: z.enum(MatchLocation),
  matchType: z.enum(ManualMatchType),
  format: z.enum(MatchFormat),
  analysisType: z.enum(AnalysisType).default('Deep'), // 👈 Añadido

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

  // 👇 Nueva taxonomía opcional para soportar tanto puntos completos como rápidos
  category: z.enum(PointCategory).optional().nullable(),
  subcategory: z.enum(PointSubcategory).optional().nullable(),
  placement: z.enum(PointPlacement).optional().nullable(),
});

export const completeMatchSchema = z.object({
  mySets: z.number().int().min(0),
  opponentSets: z.number().int().min(0),
  lightNotes: z.string().optional().nullable(), // 👈 Añadido para el modo Light
});

export const updateManualMatchSchema = z.object({
  opponentName: z.string().min(1, 'El nombre no puede estar vacío').optional(),
  opponentHand: z.enum(DominantHand).optional().nullable(),
  opponentStyle: z.enum(Playstyle).optional().nullable(),
  opponentLevel: z.enum(OpponentLevel).optional().nullable(),
  lightNotes: z.string().optional().nullable(),
});
