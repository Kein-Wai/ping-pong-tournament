import { describe, it, expect } from 'vitest';
import { PlayerTournamentStatus } from '@prisma/client';
import { canInscribePlayer, resolveParticipantStatus } from './tournament-inscriptions';

const buildTournament = (overrides: Record<string, unknown> = {}) => ({
  id: 'torneo-1',
  clubId: 'club-1',
  typeTournament: 'Abierto',
  numPlayers: 8,
  groupsCreated: false,
  ...overrides,
});

describe('Reglas de inscripcion (api/src/utils/tournament-inscriptions.ts)', () => {
  describe('canInscribePlayer', () => {
    it('permitetoiscribirse en un torneo abierto', () => {
      expect(canInscribePlayer(buildTournament(), { clubId: null, clubStatus: null })).toBeNull();
    });

    it('rechaza con 403 un torneo interno de otro club', () => {
      const result = canInscribePlayer(buildTournament({ typeTournament: 'Interno' }), {
        clubId: 'club-rival',
        clubStatus: 'Aprobado',
      });

      expect(result?.status).toBe(403);
      expect(result?.message).toContain('Acceso denegado');
    });

    it('rechaza con 403 a un miembro del club que no esta aprobado', () => {
      const result = canInscribePlayer(buildTournament({ typeTournament: 'Interno' }), {
        clubId: 'club-1',
        clubStatus: 'Pendiente',
      });

      expect(result?.status).toBe(403);
    });

    it('permite la inscripcion de un miembro aprobado del club organizador', () => {
      const result = canInscribePlayer(buildTournament({ typeTournament: 'Interno' }), {
        clubId: 'club-1',
        clubStatus: 'Aprobado',
      });

      expect(result).toBeNull();
    });

    it('rechaza con 400 si los grupos ya se han generado', () => {
      const result = canInscribePlayer(buildTournament({ groupsCreated: true }), {
        clubId: 'club-1',
        clubStatus: 'Aprobado',
      });

      expect(result?.status).toBe(400);
      expect(result?.message).toContain('Las inscripciones est\u00e1n cerradas');
    });

    it('el bloqueo de un torneo interno se evalua antes que el de grupos generados', () => {
      const result = canInscribePlayer(
        buildTournament({ typeTournament: 'Interno', groupsCreated: true }),
        { clubId: 'club-rival', clubStatus: 'Aprobado' },
      );

      expect(result?.status).toBe(403);
    });
  });

  describe('resolveParticipantStatus', () => {
    it('deja al jugador en Pendiente cuando lo inscribe un jugador', () => {
      expect(resolveParticipantStatus(false)).toBe(PlayerTournamentStatus.Pendiente);
    });

    it('confirma al jugador cuando lo inscribe un admin de club', () => {
      expect(resolveParticipantStatus(true)).toBe(PlayerTournamentStatus.Confirmado);
    });
  });
});
