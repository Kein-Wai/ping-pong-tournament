import { describe, it, expect } from 'vitest';
import { TournamentStatus } from '@prisma/client';
import { resolveTournamentPhase, validateSwap, validateSwapTarget } from './tournament-swap';
import { BYE_USER_ID, TBD_USER_ID } from '../constants';

const PLAYER_A = '11111111-1111-4111-a111-111111111111';
const PLAYER_B = '22222222-2222-4222-a222-222222222222';

const buildTournament = (overrides: Record<string, unknown> = {}) => ({
  id: 'torneo-1',
  clubId: 'club-1',
  status: TournamentStatus.Programado,
  ...overrides,
});

describe('Intercambio de jugadores (api/src/utils/tournament-swap.ts)', () => {
  describe('resolveTournamentPhase', () => {
    it('la fase de grupos se reconoce como "groups"', () => {
      expect(resolveTournamentPhase(TournamentStatus.Grupos)).toBe('groups');
    });

    it('cada ronda de eliminatorias se reconoce como "knockout"', () => {
      [
        TournamentStatus.R128avos,
        TournamentStatus.R64avos,
        TournamentStatus.R32avos,
        TournamentStatus.R16avos,
        TournamentStatus.Octavos,
        TournamentStatus.Cuartos,
        TournamentStatus.Semifinales,
        TournamentStatus.Final,
      ].forEach((status) => {
        expect(resolveTournamentPhase(status)).toBe('knockout');
      });
    });

    it('las demas fases no son ni grupos ni eliminatorias', () => {
      expect(resolveTournamentPhase(TournamentStatus.Programado)).toBe('other');
      expect(resolveTournamentPhase(TournamentStatus.Completado)).toBe('other');
      expect(resolveTournamentPhase(null)).toBe('other');
    });
  });

  describe('validateSwapTarget', () => {
    it('rechaza con 400 un torneo ya finalizado', () => {
      const result = validateSwapTarget(buildTournament({ status: TournamentStatus.Completado }));

      expect(result?.status).toBe(400);
      expect(result?.message).toContain('torneo finalizado');
    });

    it('permite el intercambio en un torneo en curso', () => {
      expect(validateSwapTarget(buildTournament())).toBeNull();
    });
  });

  describe('validateSwap', () => {
    it('rechaza con 400 intercambiar un jugador consigo mismo', () => {
      const result = validateSwap(
        { tournamentId: 'torneo-1', playerAId: PLAYER_A, playerBId: PLAYER_A },
        buildTournament(),
        0,
        0,
      );

      expect(result?.status).toBe(400);
      expect(result?.message).toContain('dos jugadores distintos');
    });

    it('rechaza con 400 intercambiar un comodin BYE', () => {
      const result = validateSwap(
        { tournamentId: 'torneo-1', playerAId: BYE_USER_ID, playerBId: PLAYER_B },
        buildTournament(),
        0,
        0,
      );

      expect(result?.status).toBe(400);
      expect(result?.message).toContain('comodín');
    });

    it('rechaza con 400 intercambiar un comodin TBD', () => {
      const result = validateSwap(
        { tournamentId: 'torneo-1', playerAId: TBD_USER_ID, playerBId: PLAYER_B },
        buildTournament(),
        0,
        0,
      );

      expect(result?.status).toBe(400);
    });

    it('rechaza con 400 si la fase de grupos ya ha comenzado', () => {
      const result = validateSwap(
        { tournamentId: 'torneo-1', playerAId: PLAYER_A, playerBId: PLAYER_B },
        buildTournament({ status: TournamentStatus.Grupos }),
        1,
        0,
      );

      expect(result?.status).toBe(400);
      expect(result?.message).toContain('fase de grupos ya ha comenzado');
    });

    it('rechaza con 400 si las eliminatorias ya han comenzado', () => {
      const result = validateSwap(
        { tournamentId: 'torneo-1', playerAId: PLAYER_A, playerBId: PLAYER_B },
        buildTournament({ status: TournamentStatus.Semifinales }),
        0,
        1,
      );

      expect(result?.status).toBe(400);
      expect(result?.message).toContain('eliminatorias ya han comenzado');
    });

    it('permite el intercambio si ningun partido de la fase ha comenzado', () => {
      const result = validateSwap(
        { tournamentId: 'torneo-1', playerAId: PLAYER_A, playerBId: PLAYER_B },
        buildTournament({ status: TournamentStatus.Grupos }),
        0,
        0,
      );

      expect(result).toBeNull();
    });

    it('el bloqueo de grupos no aplica a las eliminatorias', () => {
      const result = validateSwap(
        { tournamentId: 'torneo-1', playerAId: PLAYER_A, playerBId: PLAYER_B },
        buildTournament({ status: TournamentStatus.Cuartos }),
        5,
        0,
      );

      expect(result).toBeNull();
    });
  });
});
