import { tournamentsService as tournaments } from '../api/services/tournaments';
import { matchesService } from '../api/services/matches';
import { usersService } from '../api/services/users';
import type {
  GroupMatch,
  KnockoutRound,
  MatchToEdit,
  Participant,
  Tournament,
  TournamentClas,
  TournamentGroupClas,
  TournamentFormat,
} from '../types/tournament';

/**
 * TournamentService - Capa de servicio para la logica de negocio de torneos.
 *
 * Encapsula toda la orquestacion de llamadas a la API:
 * - Carga de datos (torneo, participantes, brackets, grupos, clasificaciones)
 * - Mutaciones (inscripcion, generacion de grupos, cambio de formato, guardado de resultados,
 *   intercambio de jugadores, inscripcion en bloque, eliminacion)
 *
 * Diseñado para ser inyectado en hooks y testable sin renderizar componentes.
 */
export class TournamentService {
  private tournamentId: string | null = null;

  constructor(tournamentId: string | null = null) {
    this.tournamentId = tournamentId;
  }

  setTournamentId(id: string | null) {
    this.tournamentId = id;
  }

  private getId(): string {
    if (!this.tournamentId) {
      throw new Error('Tournament ID not set');
    }
    return this.tournamentId;
  }

  /** Carga la informacion basica del torneo. */
  async fetchTournament(): Promise<Tournament | null> {
    const id = this.getId();
    return tournaments.byId(id);
  }

  /** Carga los participantes del torneo. */
  async fetchParticipants(): Promise<Participant[] | null> {
    const id = this.getId();
    return tournaments.participants(id);
  }

  /** Carga los brackets A y B. */
  async fetchBrackets(): Promise<{ bracketA: KnockoutRound[] | null; bracketB: KnockoutRound[] | null }> {
    const id = this.getId();
    const [bracketA, bracketB] = await Promise.all([
      tournaments.bracket(id, 'A'),
      tournaments.bracket(id, 'B'),
    ]);
    return { bracketA, bracketB };
  }

  /** Carga clasificaciones de grupos. */
  async fetchGroupClassifications(): Promise<TournamentGroupClas[] | null> {
    const id = this.getId();
    return tournaments.groupClassifications(id);
  }

  /** Carga partidos de grupos. */
  async fetchGroupMatches(): Promise<GroupMatch[] | null> {
    const id = this.getId();
    return tournaments.groupMatches(id);
  }

  /** Carga clasificaciones generales. */
  async fetchClassifications(): Promise<TournamentClas[] | null> {
    const id = this.getId();
    return tournaments.classifications(id);
  }

  /** Carga todos los datos perezosos (clasificaciones, brackets, grupos, resultados). */
  async fetchLazyData(): Promise<{
    groupsClas: TournamentGroupClas[] | null;
    groupMatches: GroupMatch[] | null;
    bracketA: KnockoutRound[] | null;
    bracketB: KnockoutRound[] | null;
    results: TournamentClas[] | null;
  }> {
    const id = this.getId();
    const [
      groupsClas,
      groupMatches,
      bracketA,
      bracketB,
      results,
    ] = await Promise.all([
      tournaments.groupClassifications(id),
      tournaments.groupMatches(id),
      tournaments.bracket(id, 'A'),
      tournaments.bracket(id, 'B'),
      tournaments.classifications(id),
    ]);
    return { groupsClas, groupMatches, bracketA, bracketB, results };
  }

  /** Inscribe al jugador actual en el torneo. */
  async registerSelf(playerId: string): Promise<void> {
    const id = this.getId();
    await tournaments.register(id, { playerId });
  }

  /** Actualiza el estado de un participante. */
  async updateParticipantStatus(playerId: string, status: string): Promise<void> {
    const id = this.getId();
    await tournaments.updateParticipantStatus(id, playerId, status);
  }

  /** Genera los grupos del torneo. */
  async generateGroups(): Promise<void> {
    const id = this.getId();
    await tournaments.generateGroups(id);
  }

  /** Guarda el formato del torneo. */
  async saveFormat(format: TournamentFormat): Promise<void> {
    const id = this.getId();
    await tournaments.update(id, {
      numGroup: Number(format.numGroup),
      numGroupPlayers: Number(format.numGroupPlayers),
      playersKnockout: Number(format.playersKnockout),
      setsToWinGroup: Number(format.setsToWinGroup),
      setsToWinKnockout: Number(format.setsToWinKnockout),
    });
  }

  /** Guarda el resultado de un partido. */
  async saveMatch(match: MatchToEdit): Promise<void> {
    const payload = {
      setsToWin: match.setsToWin,
      playerOneId: match.playerOneId,
      playerTwoId: match.playerTwoId,
      setOnePlayerOne: Number(match.set1P1),
      setOnePlayerTwo: Number(match.set1P2),
      setTwoPlayerOne: Number(match.set2P1),
      setTwoPlayerTwo: Number(match.set2P2),
      setThreePlayerOne: Number(match.set3P1),
      setThreePlayerTwo: Number(match.set3P2),
      setFourPlayerOne: Number(match.set4P1),
      setFourPlayerTwo: Number(match.set4P2),
      setFivePlayerOne: Number(match.set5P1),
      setFivePlayerTwo: Number(match.set5P2),
      setSixPlayerOne: Number(match.set6P1),
      setSixPlayerTwo: Number(match.set6P2),
      setSevenPlayerOne: Number(match.set7P1),
      setSevenPlayerTwo: Number(match.set7P2),
      status: match.status,
    };
    await matchesService.update(match.id, payload);
  }

  /** Inscribe a varios jugadores de una vez. */
  async bulkEnroll(playerIds: string[]): Promise<void> {
    const id = this.getId();
    await tournaments.registerBulk(id, { playerIds });
  }

  /** Intercambia dos jugadores. */
  async swapPlayers(playerAId: string, playerBId: string): Promise<void> {
    const id = this.getId();
    await tournaments.swapPlayers(id, {
      groupId: '',
      playerOneId: playerAId,
      playerTwoId: playerBId,
    });
  }

  /** Elimina el torneo. */
  async removeTournament(): Promise<void> {
    const id = this.getId();
    await tournaments.remove(id);
  }

  /** Carga jugadores del club para inscripcion en bloque. */
  async loadClubPlayers(): Promise<unknown[]> {
    return usersService.list();
  }
}

/** Factory para crear instancias del servicio (permite testing con mocks). */
export function createTournamentService(tournamentId: string | null = null): TournamentService {
  return new TournamentService(tournamentId);
}

export default TournamentService;
