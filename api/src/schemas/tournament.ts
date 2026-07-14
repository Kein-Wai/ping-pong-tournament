import { z } from 'zod';

export const createTournamentSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  dateStart: z.iso.datetime('Formato de fecha inválido'),
  numPlayers: z.number().int().min(2, 'Debe haber al menos 2 jugadores'),
  numGroup: z.number().int().min(1).optional(),
  numGroupPlayers: z.number().int().min(2).optional(),
  typeTournament: z.string().optional(),
  levelTournament: z.string().optional(),
  rounds: z.string().optional(),
  typeKnockout: z.string().optional(),
  playersKnockout: z.string().optional(),
  sortKnockout: z.string().optional(),
  allPos: z.boolean().optional().default(false),
});

export const registerParticipantSchema = z.object({
  playerId: z.uuid('El ID del jugador debe ser un UUID válido'),
});
