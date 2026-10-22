import { PrismaClient, TournamentStatus } from '@prisma/client';
import { BYE_USER_ID, TBD_USER_ID } from '../constants';

/** Fases de torneo en las que los participantes ya estan congelados. */
const KNOCKOUT_PHASES: readonly TournamentStatus[] = [
  TournamentStatus.R128avos,
  TournamentStatus.R64avos,
  TournamentStatus.R32avos,
  TournamentStatus.R16avos,
  TournamentStatus.Octavos,
  TournamentStatus.Cuartos,
  TournamentStatus.Semifinales,
  TournamentStatus.Final,
];

/** Error de negocio del intercambio de jugadores, con su codigo HTTP. */
export type SwapError = {
  status: 400 | 403 | 404;
  message: string;
};

export interface SwapPlayersInput {
  tournamentId: string;
  playerAId: string;
  playerBId: string;
}

export interface SwapableTournament {
  id: string;
  clubId: string | null;
  status: TournamentStatus | null;
}

/**
 * Fase del torneo: determina que datos se pueden mover.
 *
 * Modulo PURO: no toca la base de datos.
 */
export const resolveTournamentPhase = (
  status: TournamentStatus | null,
): 'groups' | 'knockout' | 'other' => {
  if (status === TournamentStatus.Grupos) return 'groups';
  if (status && KNOCKOUT_PHASES.includes(status)) return 'knockout';

  return 'other';
};

/**
 * Comprueba si el torneo admite intercambios.
 *
 * Modulo PURO: no toca la base de datos. Esta comprobacion se hace ANTES de
 * validar el cuerpo de la peticion, igual que en el flujo original.
 */
export const validateSwapTarget = (tournament: SwapableTournament): SwapError | null => {
  if (tournament.status === TournamentStatus.Completado) {
    return {
      status: 400,
      message: 'No se pueden intercambiar jugadores en un torneo finalizado',
    };
  }

  return null;
};

/**
 * Comprueba las bloqueos de negocio del intercambio de jugadores.
 *
 * Modulo PURO: recibe los conteos de partidos ya iniciados y devuelve el
 * motivo del rechazo, si lo hay.
 */
export const validateSwap = (
  input: SwapPlayersInput,
  tournament: SwapableTournament,
  startedGroupMatches: number,
  startedKnockoutMatches: number,
): SwapError | null => {
  if (input.playerAId === input.playerBId) {
    return { status: 400, message: 'Debes seleccionar dos jugadores distintos' };
  }

  const selected = [input.playerAId, input.playerBId];
  if (selected.includes(BYE_USER_ID) || selected.includes(TBD_USER_ID)) {
    return {
      status: 400,
      message:
        'No puedes intercambiar jugadores comodín (Exentos o TBD). Selecciona dos jugadores reales.',
    };
  }

  const phase = resolveTournamentPhase(tournament.status);

  if (phase === 'groups' && startedGroupMatches > 0) {
    return {
      status: 400,
      message: 'La fase de grupos ya ha comenzado. No se admiten cambios de posiciones.',
    };
  }

  if (phase === 'knockout' && startedKnockoutMatches > 0) {
    return {
      status: 400,
      message: 'Las eliminatorias ya han comenzado. No se admiten cambios en el cuadro.',
    };
  }

  return null;
};

/**
 * Intercambia dos jugadores en todas las fases del torneo.
 *
 * Escribe en la base de datos dentro de una transaccion: grupo, clasificacion
 * final y partidos. Aislar la operacion aqui mantiene la transaccion atomica y
 * deja la ruta con una sola responsabilidad.
 */
export const swapPlayers = async (
  prisma: PrismaClient,
  input: SwapPlayersInput,
  tournament: SwapableTournament,
): Promise<void> => {
  const { tournamentId, playerAId, playerBId } = input;
  const phase = resolveTournamentPhase(tournament.status);

  await prisma.$transaction(async (tx) => {
    if (phase === 'groups') {
      const groupClasA = await tx.tournamentGroupClas.findFirst({
        where: { playerId: playerAId, tournamentGroup: { tournamentId } },
      });
      const groupClasB = await tx.tournamentGroupClas.findFirst({
        where: { playerId: playerBId, tournamentGroup: { tournamentId } },
      });

      if (groupClasA)
        await tx.tournamentGroupClas.update({
          where: { id: groupClasA.id },
          data: { playerId: playerBId },
        });
      if (groupClasB)
        await tx.tournamentGroupClas.update({
          where: { id: groupClasB.id },
          data: { playerId: playerAId },
        });
    }

    const clasA = await tx.tournamentClas.findFirst({
      where: { playerId: playerAId, tournamentId },
    });
    const clasB = await tx.tournamentClas.findFirst({
      where: { playerId: playerBId, tournamentId },
    });

    if (clasA)
      await tx.tournamentClas.update({
        where: { id: clasA.id },
        data: { playerId: playerBId },
      });
    if (clasB)
      await tx.tournamentClas.update({
        where: { id: clasB.id },
        data: { playerId: playerAId },
      });

    const matchWhere: Record<string, unknown> = {
      tournamentId,
      OR: [
        { playerOneId: playerAId },
        { playerTwoId: playerAId },
        { playerOneId: playerBId },
        { playerTwoId: playerBId },
      ],
    };

    if (phase === 'groups') matchWhere.groupId = { not: null };
    else if (phase === 'knockout') matchWhere.knockoutId = { not: null };

    const matchesToSwap = await tx.match.findMany({ where: matchWhere });

    for (const match of matchesToSwap) {
      let newPlayerOneId = match.playerOneId;
      let newPlayerTwoId = match.playerTwoId;

      if (match.playerOneId === playerAId) newPlayerOneId = playerBId;
      else if (match.playerOneId === playerBId) newPlayerOneId = playerAId;

      if (match.playerTwoId === playerAId) newPlayerTwoId = playerBId;
      else if (match.playerTwoId === playerBId) newPlayerTwoId = playerAId;

      await tx.match.update({
        where: { id: match.id },
        data: { playerOneId: newPlayerOneId, playerTwoId: newPlayerTwoId },
      });
    }
  });
};
