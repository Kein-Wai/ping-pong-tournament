import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';
import { tournamentsService } from './tournaments';

// Se mockea el `api` de bajo nivel (la frontera del sistema): el servicio y el
// adaptador http se prueban de verdad. Los contratos salen de
// api/src/routes/tournament/* y api/src/schemas/tournament.ts.
vi.mock('../axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

const envelope = <T>(data: T) => ({ data: { success: true, data } });
const onlyMessage = (message: string) => ({ data: { success: true, message } });

describe('tournamentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('consultas', () => {
    it('list pide /tournaments', async () => {
      mockedApi.get.mockResolvedValue(envelope([{ id: 't1' }]));

      const result = await tournamentsService.list();

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.TOURNAMENTS.BASE, undefined);
      expect(result).toHaveLength(1);
    });

    it('list permite a la pantalla tipar el torneo con su propia proyección', async () => {
      interface FilaTorneo {
        id: string;
        club: { name: string } | null;
      }
      mockedApi.get.mockResolvedValue(envelope([{ id: 't1', club: { name: 'Club Norte' } }]));

      const result = await tournamentsService.list<FilaTorneo>();

      expect(result[0].club?.name).toBe('Club Norte');
    });

    it('byId pide el torneo', async () => {
      mockedApi.get.mockResolvedValue(envelope({ id: 't1', name: 'Open' }));

      const result = await tournamentsService.byId('t1');

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.TOURNAMENTS.BY_ID('t1'), undefined);
      expect(result).toMatchObject({ name: 'Open' });
    });

    it('participants pide los inscritos', async () => {
      mockedApi.get.mockResolvedValue(envelope([{ id: 'pp1' }]));

      await tournamentsService.participants('t1');

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.TOURNAMENTS.PARTICIPANTES('t1'), undefined);
    });

    it('groupClassifications, groupMatches y classifications piden su ruta', async () => {
      mockedApi.get.mockResolvedValue(envelope([]));

      await tournamentsService.groupClassifications('t1');
      await tournamentsService.groupMatches('t1');
      await tournamentsService.classifications('t1');

      expect(mockedApi.get).toHaveBeenNthCalledWith(1, ENDPOINTS.TOURNAMENTS.GROUPS('t1'), undefined);
      expect(mockedApi.get).toHaveBeenNthCalledWith(
        2,
        ENDPOINTS.TOURNAMENTS.GROUPMATCHES('t1'),
        undefined,
      );
      expect(mockedApi.get).toHaveBeenNthCalledWith(
        3,
        ENDPOINTS.TOURNAMENTS.CLASSIFICATION('t1'),
        undefined,
      );
    });

    it('bracket pide el cuadro A por defecto y admite el B', async () => {
      mockedApi.get.mockResolvedValue(envelope([]));

      await tournamentsService.bracket('t1');
      await tournamentsService.bracket('t1', 'B');

      expect(mockedApi.get).toHaveBeenNthCalledWith(
        1,
        `${ENDPOINTS.TOURNAMENTS.BRACKETS('t1')}?type=A`,
        undefined,
      );
      expect(mockedApi.get).toHaveBeenNthCalledWith(
        2,
        `${ENDPOINTS.TOURNAMENTS.BRACKETS('t1')}?type=B`,
        undefined,
      );
    });

    it('propaga el error de la API', async () => {
      mockedApi.get.mockRejectedValue(new Error('404'));

      await expect(tournamentsService.byId('t1')).rejects.toThrow('404');
    });
  });

  describe('create', () => {
    it('envía el torneo y devuelve el torneo creado que viene en data', async () => {
      mockedApi.post.mockResolvedValue({
        data: { success: true, message: 'Torneo creado con éxito', data: { id: 't9', name: 'Open' } },
      });
      const payload = {
        name: 'Open',
        dateStart: '2026-11-20T10:00:00.000Z',
        numPlayers: 16,
        typeTournament: 'Interno' as const,
        levelTournament: 'Mixto' as const,
        rounds: 'GruposKnockout' as const,
        typeKnockout: 'LlaveA' as const,
        sortGroups: 'Snake' as const,
        sortKnockout: 'Siembra' as const,
        playersKnockout: 8,
        numGroup: 4,
        numGroupPlayers: 4,
        allPos: false,
        setsToWinGroup: 2,
        setsToWinKnockout: 3,
      };

      const result = await tournamentsService.create(payload);

      expect(mockedApi.post).toHaveBeenCalledWith(ENDPOINTS.TOURNAMENTS.BASE, payload, undefined);
      expect(result.id).toBe('t9');
    });
  });

  describe('update y remove', () => {
    it('update envía solo los campos cambiados', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 't1' }));

      await tournamentsService.update('t1', { setsToWinGroup: 3, numGroup: null });

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.TOURNAMENTS.UPDATE('t1'),
        { setsToWinGroup: 3, numGroup: null },
        undefined,
      );
    });

    it('remove borra por DELETE y no devuelve datos', async () => {
      mockedApi.delete.mockResolvedValue(onlyMessage('Torneo eliminado con éxito'));

      const result = await tournamentsService.remove('t1');

      expect(mockedApi.delete).toHaveBeenCalledWith(ENDPOINTS.TOURNAMENTS.DELETE('t1'), undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('inscripciones', () => {
    it('register envía jugador, fecha y estado, y devuelve el participante que viene en data', async () => {
      mockedApi.post.mockResolvedValue({
        data: { success: true, message: 'Jugador inscrito con éxito', data: { id: 'pp1' } },
      });
      const payload = {
        playerId: 'p1',
        registeredAt: '2026-10-25T10:00:00.000Z',
        status: 'Pendiente' as const,
      };

      const result = await tournamentsService.register('t1', payload);

      expect(mockedApi.post).toHaveBeenCalledWith(ENDPOINTS.TOURNAMENTS.REGISTER('t1'), payload, undefined);
      expect(result.id).toBe('pp1');
    });

    it('registerBulk envía los jugadores y no devuelve datos', async () => {
      mockedApi.post.mockResolvedValue(onlyMessage('Jugadores inscritos con éxito'));

      const result = await tournamentsService.registerBulk('t1', { playerIds: ['p1', 'p2'] });

      expect(mockedApi.post).toHaveBeenCalledWith(
        ENDPOINTS.TOURNAMENTS.REGISTER_BULK('t1'),
        { playerIds: ['p1', 'p2'] },
        undefined,
      );
      expect(result).toBeUndefined();
    });

    it('updateParticipantStatus envía el estado y no devuelve datos', async () => {
      mockedApi.put.mockResolvedValue(onlyMessage('Jugador marcado como Confirmado'));

      const result = await tournamentsService.updateParticipantStatus('t1', 'p1', 'Confirmado');

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.TOURNAMENTS.UPDATE_PARTICIPANT_STATUS('t1', 'p1'),
        { status: 'Confirmado' },
        undefined,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('acciones del torneo', () => {
    it('generateGroups lanza la generación por POST sin cuerpo', async () => {
      mockedApi.post.mockResolvedValue(onlyMessage('Grupos generados'));

      await tournamentsService.generateGroups('t1');

      expect(mockedApi.post).toHaveBeenCalledWith(
        ENDPOINTS.TOURNAMENTS.GENERATE_GROUPS('t1'),
        undefined,
        undefined,
      );
    });

    it('swapPlayers envía los dos jugadores por PUT', async () => {
      mockedApi.put.mockResolvedValue(onlyMessage('Jugadores intercambiados'));

      await tournamentsService.swapPlayers('t1', { playerAId: 'a', playerBId: 'b' });

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.TOURNAMENTS.SWAP_PLAYERS('t1'),
        { playerAId: 'a', playerBId: 'b' },
        undefined,
      );
    });

    it('generateExcel pide el archivo como blob', async () => {
      const blob = new Blob(['xlsx']);
      mockedApi.post.mockResolvedValue({ data: blob });
      const payload = { tournamentInfo: { name: 'Open' }, players: [{ name: 'Ana' }] };

      const result = await tournamentsService.generateExcel(payload);

      expect(mockedApi.post).toHaveBeenCalledWith(ENDPOINTS.TOURNAMENTS.GENERATE_EXCEL, payload, {
        responseType: 'blob',
      });
      expect(result).toBe(blob);
    });
  });

  it('enrolledByPlayer pide los torneos activos en los que está inscrito el jugador', async () => {
    mockedApi.get.mockResolvedValue(envelope([{ id: 't1', name: 'Open', status: 'Programado' }]));

    const result = await tournamentsService.enrolledByPlayer('p1');

    expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.TOURNAMENTS.ENROLLED('p1'), undefined);
    expect(result[0].name).toBe('Open');
  });
});
