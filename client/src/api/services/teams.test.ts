import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';
import { teamsService } from './teams';

// Se mockea el `api` de bajo nivel (la frontera del sistema): el servicio y el
// adaptador http se prueban de verdad. Los contratos salen de
// api/src/routes/team.ts y api/src/schemas/team.ts.
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

describe('teamsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('equipos', () => {
    it('byClub devuelve los equipos con su plantilla y su calendario', async () => {
      mockedApi.get.mockResolvedValue(
        envelope([
          {
            id: 't1',
            name: 'Equipo A',
            category: 'Senior',
            level: 'Avanzado',
            _count: { players: 1 },
            players: [{ id: 'p1', name: 'Ana', surname: null, level: 'Avanzado', stats: null }],
            matches: [
              {
                id: 'm1',
                rivalName: 'Rival',
                status: 'Programado',
                availabilities: [{ id: 'a1', playerId: 'p1' }],
              },
            ],
          },
        ]),
      );

      const result = await teamsService.byClub('c1');

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.TEAMS.BY_CLUB('c1'), undefined);
      expect(result[0].players[0].name).toBe('Ana');
      expect(result[0].matches[0].availabilities?.[0].playerId).toBe('p1');
    });

    it('create envía nombre, categoría y nivel por POST /teams', async () => {
      mockedApi.post.mockResolvedValue(envelope({ id: 't9' }));
      const payload = { name: 'Equipo B', category: '1ª Autonómica', level: 'Intermedio' };

      const result = await teamsService.create(payload);

      expect(mockedApi.post).toHaveBeenCalledWith(ENDPOINTS.TEAMS.BASE, payload, undefined);
      expect(result.id).toBe('t9');
    });

    it('update edita los datos básicos del equipo', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 't1' }));

      await teamsService.update('t1', { name: 'Equipo A+' });

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.TEAMS.UPDATE('t1'),
        { name: 'Equipo A+' },
        undefined,
      );
    });

    it('updatePlayers sustituye la plantilla', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 't1' }));

      await teamsService.updatePlayers('t1', ['p1', 'p2']);

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.TEAMS.UPDATE_PLAYERS('t1'),
        { playerIds: ['p1', 'p2'] },
        undefined,
      );
    });

    it('remove borra el equipo y no devuelve datos', async () => {
      mockedApi.delete.mockResolvedValue(onlyMessage('Equipo eliminado con éxito'));

      const result = await teamsService.remove('t1');

      expect(mockedApi.delete).toHaveBeenCalledWith(ENDPOINTS.TEAMS.DELETE('t1'), undefined);
      expect(result).toBeUndefined();
    });

    it('propaga el error si el club es de otro', async () => {
      mockedApi.get.mockRejectedValue(new Error('403'));

      await expect(teamsService.byClub('otro')).rejects.toThrow('403');
    });
  });

  describe('partidos del equipo', () => {
    it('createMatch añade un partido al calendario por POST /teams/:id/matches', async () => {
      mockedApi.post.mockResolvedValue(envelope({ id: 'm9' }));
      const payload = {
        rivalName: 'Rival',
        date: '2026-11-20T18:00:00.000Z',
        isHome: true,
        location: 'Pabellón Norte',
      };

      const result = await teamsService.createMatch('t1', payload);

      expect(mockedApi.post).toHaveBeenCalledWith(ENDPOINTS.TEAMS.MATCHES('t1'), payload, undefined);
      expect(result.id).toBe('m9');
    });

    it('updateMatch registra el resultado de un partido', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 'm1' }));
      const payload = {
        status: 'Completado' as const,
        ourScore: 4,
        rivalScore: 2,
        rivalName: 'Rival',
        date: '2026-11-20T18:00:00.000Z',
        isHome: false,
        location: null,
      };

      await teamsService.updateMatch('m1', payload);

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.TEAMS.UPDATE_MATCH('m1'),
        payload,
        undefined,
      );
    });

    it('updateMatch admite un partido pendiente sin marcador', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 'm1' }));
      const payload = { status: 'Programado' as const, ourScore: null, rivalScore: null };

      await teamsService.updateMatch('m1', payload);

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.TEAMS.UPDATE_MATCH('m1'),
        payload,
        undefined,
      );
    });

    it('deleteMatch borra el partido y no devuelve datos', async () => {
      mockedApi.delete.mockResolvedValue(onlyMessage('Partido eliminado del calendario'));

      const result = await teamsService.deleteMatch('m1');

      expect(mockedApi.delete).toHaveBeenCalledWith(ENDPOINTS.TEAMS.DELETE_MATCH('m1'), undefined);
      expect(result).toBeUndefined();
    });

    it('toggleAvailability confirma o cancela la asistencia por POST, sin cuerpo', async () => {
      mockedApi.post.mockResolvedValue(onlyMessage('Asistencia confirmada'));

      const result = await teamsService.toggleAvailability('m1');

      expect(mockedApi.post).toHaveBeenCalledWith(
        ENDPOINTS.TEAMS.TOGGLE_AVAILABILITY('m1'),
        undefined,
        undefined,
      );
      expect(mockedApi.put).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  it('no expone matches ni players: la API no tiene esas rutas de lectura', () => {
    expect(teamsService).not.toHaveProperty('matches');
    expect(teamsService).not.toHaveProperty('players');
  });
});
