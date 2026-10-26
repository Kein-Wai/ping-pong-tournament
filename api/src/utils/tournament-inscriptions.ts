import { PrismaClient, PlayerTournamentStatus } from '@prisma/client';

/** Error de negocio de las inscripciones, con el codigo HTTP que corresponde. */
export type InscriptionError = {
  status: 400 | 403 | 404;
  message: string;
};

/** Resultado de intentar inscribir a un jugador en un torneo. */
export type InscriptionResult =
  | { ok: true; participant: { id: string; tournamentId: string; playerId: string; status: string | null } }
  | { ok: false; error: InscriptionError };

export interface InscriptionContext {
  tournamentId: string;
  playerId: string;
  /** Datos del usuario que solicita la inscripcion. */
  user: { id: string; clubId?: string | null; clubStatus?: string | null };
  /** Si el admin de club inscribe, el jugador se confirma al momento. */
  confirmed: boolean;
}

export interface TournamentForInscription {
  id: string;
  clubId: string | null;
  typeTournament: string | null;
  numPlayers: number;
  groupsCreated: boolean | null;
}

/**
 * Comprueba si un jugador puede inscribirse en un torneo concreto.
 *
 * Modulo PURO: recibe el torneo ya cargado y devuelve el motivo del rechazo.
 * No toca la base de datos.
 */
export const canInscribePlayer = (
  tournament: TournamentForInscription,
  user: { clubId?: string | null; clubStatus?: string | null },
): InscriptionError | null => {
  if (tournament.typeTournament === 'Interno') {
    if (user.clubId !== tournament.clubId || user.clubStatus !== 'Aprobado') {
      return {
        status: 403,
        message:
          'Acceso denegado. Este torneo es privado y exclusivo para los miembros del club organizador.',
      };
    }
  }

  if (tournament.groupsCreated) {
    return {
      status: 400,
      message: 'Las inscripciones están cerradas. Los grupos ya se han generado.',
    };
  }

  return null;
};

/**
 * Calcula el estado inicial del participante segun quien lo inscribe.
 * Modulo PURO.
 */
export const resolveParticipantStatus = (confirmed: boolean): PlayerTournamentStatus =>
  confirmed ? PlayerTournamentStatus.Confirmado : PlayerTournamentStatus.Pendiente;

/**
 * Inscribe a un jugador en un torneo aplicando todas las reglas de negocio.
 *
 * Escribe en la base de datos. Devuelve el id del participante creado o el
 * motivo del rechazo, para que la ruta traduzca el resultado a una respuesta
 * HTTP sin repetir reglas.
 */
export const registerParticipant = async (
  prisma: PrismaClient,
  context: InscriptionContext,
  tournament: TournamentForInscription,
  currentParticipantCount: number,
): Promise<InscriptionResult> => {
  const rejection = canInscribePlayer(tournament, context.user);
  if (rejection) return { ok: false, error: rejection };

  if (currentParticipantCount >= tournament.numPlayers) {
    return {
      ok: false,
      error: { status: 400, message: 'El torneo ya ha alcanzado el límite máximo de jugadores' },
    };
  }

  const existingParticipant = await prisma.tournamentParticipant.findUnique({
    where: {
      tournamentId_playerId: {
        tournamentId: context.tournamentId,
        playerId: context.playerId,
      },
    },
  });

  if (existingParticipant) {
    return {
      ok: false,
      error: { status: 400, message: 'El jugador ya está inscrito en este torneo' },
    };
  }

  const newParticipant = await prisma.tournamentParticipant.create({
    data: {
      tournamentId: context.tournamentId,
      playerId: context.playerId,
      status: resolveParticipantStatus(context.confirmed),
    },
  });

  return { ok: true, participant: newParticipant };
};
