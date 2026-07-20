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

export const baseTournamentObject = z.object({
  dateStart: z.iso.datetime('Formato de fecha inválido'),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  numPlayers: z.number().int().min(2, 'Debe haber al menos 2 jugadores'),
  numGroup: z.number().int().min(1, 'Debe haber al menos 1 grupo').optional(),
  numGroupPlayers: z.number().int().min(2).optional(),
  typeTournament: z.enum(TypeTournament).optional(),
  levelTournament: z.enum(LevelTournament).optional(),
  rounds: z.enum(Rounds).optional(),
  status: z.enum(TournamentStatus).optional(),
  typeKnockout: z.enum(TypeKnockout).optional(),
  playersKnockout: z.number().int().min(1).optional(),
  sortGroups: z.enum(SortGroups).optional(),
  sortKnockout: z.enum(SortKnockout).optional(),
  allPos: z.boolean().optional().default(false),
});

export const validateTournamentBusinessRules = (data: any, ctx: z.RefinementCtx) => {
  const type = data.rounds;
  const players = data.numPlayers;
  const groups = data.numGroup;
  const playersPerGroup = data.numGroupPlayers;
  const playersKnock = data.playersKnockout;

  if (!type) return;

  if (type === Rounds.TodosvsTodos) {
    if (players < 3 || players > 10) {
      ctx.addIssue({
        code: 'custom',
        message: 'Un torneo de Todos vs Todos debe tener entre 3 y 10 jugadores.',
        path: ['numPlayers'],
      });
    }
    if (groups === undefined || groups !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Un torneo de Todos vs Todos es una liga única, debe tener 1 solo grupo.',
        path: ['numGroup'],
      });
    }
  }

  if (type === Rounds.GruposKnockout) {
    if (players < 6 || players > 128) {
      ctx.addIssue({
        code: 'custom',
        message: 'Un torneo de Grupos y Eliminatorias debe tener entre 6 y 128 jugadores.',
        path: ['numPlayers'],
      });
    }
    if (!groups || groups < 2 || groups > 16) {
      ctx.addIssue({
        code: 'custom',
        message: 'Para este formato, debes crear entre 2 y 16 grupos.',
        path: ['numGroup'],
      });
    }
    if (!playersPerGroup || playersPerGroup < 3) {
      ctx.addIssue({
        code: 'custom',
        message: 'Debe haber al menos 3 jugadores por grupo en este formato.',
        path: ['numGroupPlayers'],
      });
    }
    if (!playersKnock) {
      ctx.addIssue({
        code: 'custom',
        message: 'Debe especificarse un número para que se clasifiquen a llave en este formato.',
        path: ['numKnockouts'],
      });
    }
    if (playersKnock && groups && playersKnock > players / groups) {
      ctx.addIssue({
        code: 'custom',
        message: 'No pueden haber más clasificados que jugadores en grupos.',
        path: ['numKnockouts'],
      });
    }
  }

  if (type === Rounds.Knockout) {
    if (players < 4 || players > 128) {
      ctx.addIssue({
        code: 'custom',
        message: 'Un torneo de solo Eliminatorias debe tener entre 4 y 128 jugadores.',
        path: ['numPlayers'],
      });
    }
    if (groups !== undefined || playersPerGroup !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'Un torneo de eliminación directa no puede tener configuración de grupos.',
        path: ['numGroup'],
      });
    }
  }
};

export const createTournamentSchema = baseTournamentObject.superRefine(
  validateTournamentBusinessRules,
);

export const registerParticipantSchema = z.object({
  playerId: z.uuid('El ID del jugador debe ser un UUID válido'),
  registeredAt: z.iso.datetime('Formato de fecha inválido').optional(),
  status: z.enum(PlayerTournamentStatus).optional(),
});
