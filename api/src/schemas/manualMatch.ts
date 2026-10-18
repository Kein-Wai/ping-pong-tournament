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
  MatchStatus,
  RubberType,
} from '@prisma/client';

export const createManualMatchSchema = z.object({
  date: z.iso.datetime().optional(),
  location: z.enum(MatchLocation),
  matchType: z.enum(ManualMatchType),
  format: z.enum(MatchFormat),
  analysisType: z.enum([AnalysisType.Rapido, AnalysisType.Extenso]).default(AnalysisType.Extenso),
  status: z.enum([MatchStatus.Programado, MatchStatus.Iniciado]).optional(),
  planningNotes: z.string().optional().nullable(),
  opponentName: z.string().min(1, 'El nombre del rival es obligatorio'),
  opponentHand: z.enum(DominantHand).optional().nullable(),
  opponentStyle: z.enum(Playstyle).optional().nullable(),
  opponentLevel: z.enum(OpponentLevel).optional().nullable(),
  opponentRubberForehand: z
    .enum([
      RubberType.LISA,
      RubberType.PICOS_CORTOS,
      RubberType.PICOS_MEDIOS,
      RubberType.PICOS_LARGOS,
      RubberType.ANTISPIN,
    ])
    .optional()
    .nullable(),
  opponentRubberBackhand: z
    .enum([
      RubberType.LISA,
      RubberType.PICOS_CORTOS,
      RubberType.PICOS_MEDIOS,
      RubberType.PICOS_LARGOS,
      RubberType.ANTISPIN,
    ])
    .optional()
    .nullable(),
  setsToWin: z.number().int().min(1).default(3),
});

export const completeMatchSchema = z.object({
  mySets: z.number().int().min(0),
  opponentSets: z.number().int().min(0),
  lightNotes: z.string().optional().nullable(),
  setScores: z
    .array(
      z.object({
        myScore: z.number().int().min(0),
        oppScore: z.number().int().min(0),
      }),
    )
    .optional()
    .nullable()
    .refine(
      (scores) => {
        // REGLAS DEL PING PONG INYECTADAS DIRECTO EN LA API
        if (!scores) return true;
        for (const s of scores) {
          if (s.myScore === 0 && s.oppScore === 0) continue; // Si lo dejan en blanco
          const max = Math.max(s.myScore, s.oppScore);
          const min = Math.min(s.myScore, s.oppScore);
          if (max < 11) return false; // Nadie llega a 11
          if (max === 11 && min > 9) return false; // 11-10 no existe
          if (max > 11 && max - min !== 2) return false; // Si pasan de 11, debe ser diferencia de 2
        }
        return true;
      },
      { message: 'Hay marcadores de set imposibles (ej. 11-34, 1-2). Revisa las reglas.' },
    ),
});

export const updateManualMatchSchema = z.object({
  opponentName: z.string().min(1).optional(),
  opponentHand: z.enum(DominantHand).optional().nullable(),
  opponentStyle: z.enum(Playstyle).optional().nullable(),
  opponentLevel: z.enum(OpponentLevel).optional().nullable(),
  opponentRubberForehand: z
    .enum([
      RubberType.LISA,
      RubberType.PICOS_CORTOS,
      RubberType.PICOS_MEDIOS,
      RubberType.PICOS_LARGOS,
      RubberType.ANTISPIN,
    ])
    .optional()
    .nullable(),
  opponentRubberBackhand: z
    .enum([
      RubberType.LISA,
      RubberType.PICOS_CORTOS,
      RubberType.PICOS_MEDIOS,
      RubberType.PICOS_LARGOS,
      RubberType.ANTISPIN,
    ])
    .optional()
    .nullable(),
  lightNotes: z.string().optional().nullable(),
  planningNotes: z.string().optional().nullable(),
  status: z.enum(['Programado', 'Iniciado', 'Completado', 'Cancelado']).optional(),
  analysisType: z.enum([AnalysisType.Rapido, AnalysisType.Extenso]).optional(),
});

// El addPointSchema se queda igual...
export const addPointSchema = z.object({
  setNumber: z.number().int().min(1),
  pointOrder: z.number().int().min(1),
  isWon: z.boolean(),
  category: z.enum(PointCategory).optional().nullable(),
  subcategory: z.enum(PointSubcategory).optional().nullable(),
  placement: z.enum(PointPlacement).optional().nullable(),
});
