import { z } from 'zod';
import {
  TypeTournament,
  LevelTournament,
  Rounds,
  TournamentStatus,
  TypeKnockout,
  SortGroups,
  SortKnockout,
  PlayerTournamentStatus,
} from '@prisma/client';
import { validateTournamentRules } from '../utils/tournament-rules';

export const baseTournamentObject = z.object({
  dateStart: z.iso.datetime('Formato de fecha inválido'),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  numPlayers: z.number().int().min(2, 'Debe haber al menos 2 jugadores'),
  numGroup: z.number().int().min(1, 'Debe haber al menos 1 grupo').nullable().optional(),
  numGroupPlayers: z.number().int().min(2).nullable().optional(),
  typeTournament: z.enum(TypeTournament).optional(),
  levelTournament: z.enum(LevelTournament).optional(),
  rounds: z.enum(Rounds).optional(),
  status: z.enum(TournamentStatus).optional(),
  typeKnockout: z.enum(TypeKnockout).nullable().optional(),
  playersKnockout: z.number().int().min(1).nullable().optional(),
  sortGroups: z.enum(SortGroups).nullable().optional(),
  sortKnockout: z.enum(SortKnockout).nullable().optional(),
  allPos: z.boolean().nullable().optional().default(false),
  setsToWinGroup: z
    .number()
    .int()
    .refine((val) => [2, 3, 4].includes(val), {
      message:
        'Los sets para ganar en grupos deben ser 2 (al mejor de 3), 3 (al mejor de 5) o 4 (al mejor de 7)',
    })
    .nullable()
    .optional()
    .default(2),
  setsToWinKnockout: z
    .number()
    .int()
    .refine((val) => [2, 3, 4].includes(val), {
      message:
        'Los sets para ganar en eliminatorias deben ser 2 (al mejor de 3), 3 (al mejor de 5) o 4 (al mejor de 7)',
    })
    .nullable()
    .optional()
    .default(3),
});

/**
 * Adaptador de Zod: vuelca en el contexto los incumplimientos que detecta el
 * modulo puro de reglas de torneo.
 */
export const validateTournamentBusinessRules = (data: z.infer<typeof baseTournamentObject>, ctx: z.RefinementCtx) => {
  validateTournamentRules({
    rounds: data.rounds,
    numPlayers: data.numPlayers,
    numGroup: data.numGroup,
    numGroupPlayers: data.numGroupPlayers,
    playersKnockout: data.playersKnockout,
  }).forEach((issue) => {
    ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path });
  });
};

export const createTournamentSchema = baseTournamentObject.superRefine(
  validateTournamentBusinessRules,
);

export const registerParticipantSchema = z.object({
  playerId: z.uuid('El ID del jugador debe ser un UUID válido'),
  registeredAt: z.iso.datetime('Formato de fecha inválido').optional(),
  status: z.enum(PlayerTournamentStatus).optional(),
});

/** Inscripción masiva: al menos un jugador, todos con UUID válido. */
export const registerBulkSchema = z.object({
  playerIds: z
    .array(z.uuid('Cada ID de jugador debe ser un UUID válido'))
    .min(1, 'Indica al menos un jugador'),
});

export const swapPlayersSchema = z.object({
  playerAId: z.uuid('El ID del Jugador A debe ser un UUID válido'),
  playerBId: z.uuid('El ID del Jugador B debe ser un UUID válido'),
});
