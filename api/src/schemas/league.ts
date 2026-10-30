import { z } from 'zod';
import { TypeTournament, LevelTournament, PlayerTournamentStatus } from '@prisma/client';

/** Sets que hay que ganar: 1, 2, 3 o 4 (mejor de 1, 3, 5 o 7). */
const setsToWin = z
  .number()
  .int('Los sets para ganar deben ser un número entero')
  .min(1, 'Se necesita ganar al menos 1 set')
  .max(4, 'Se puede ganar como mucho a 4 sets');

const baseLeagueObject = z.object({
  name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(255),
  dateStart: z.iso.datetime('Formato de fecha inválido'),
  setsToWin: setsToWin.optional(),
  doubleRound: z.boolean().optional(),
  typeTournament: z.enum(TypeTournament).optional(),
  levelTournament: z.enum(LevelTournament).optional(),
});

export const createLeagueSchema = baseLeagueObject;

/** Edición parcial: solo se puede mientras la liga está Programada. */
export const updateLeagueSchema = baseLeagueObject
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Indica al menos un campo que cambiar');

/** Alta masiva de jugadores por el admin: al menos uno, todos con UUID válido. */
export const addLeagueParticipantsSchema = z.object({
  playerIds: z
    .array(z.uuid('Cada ID de jugador debe ser un UUID válido'))
    .min(1, 'Indica al menos un jugador'),
});

/**
 * Estado que el admin puede dar a un inscrito antes de iniciar la liga.
 * No presentado se gestiona al retirar a un jugador de una liga iniciada.
 */
export const updateLeagueParticipantStatusSchema = z.object({
  status: z.enum([PlayerTournamentStatus.Pendiente, PlayerTournamentStatus.Confirmado]),
});
