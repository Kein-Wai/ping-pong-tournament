import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';
import { leaguesService } from './leagues';

// Se mockea el `api` de bajo nivel (la frontera del sistema): el servicio y el
// adaptador http se prueban de verdad. Los contratos salen de
// api/src/routes/league.ts y api/src/schemas/league.ts.
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

describe('leaguesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('consultas', () => {
    it('list pide /leagues', async () => {
      mockedApi.get.mockResolvedValue(envelope([{ id: 'l1' }]));

      const result = await leaguesService.list();

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.BASE, undefined);
      expect(result).toHaveLength(1);
    });

    it('byId pide la liga con sus participantes', async () => {
      mockedApi.get.mockResolvedValue(envelope({ id: 'l1', name: 'Invierno' }));

      const result = await leaguesService.byId('l1');

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.BY_ID('l1'), undefined);
      expect(result).toMatchObject({ name: 'Invierno' });
    });

    it('matches pide el calendario', async () => {
      mockedApi.get.mockResolvedValue(envelope([{ id: 'm1', round: 1 }]));

      const result = await leaguesService.matches('l1');

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.MATCHES('l1'), undefined);
      expect(result[0].round).toBe(1);
    });

    it('standings pide la clasificación y si es la final', async () => {
      mockedApi.get.mockResolvedValue(envelope({ final: true, standings: [] }));

      const result = await leaguesService.standings('l1');

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.STANDINGS('l1'), undefined);
      expect(result.final).toBe(true);
    });
  });

  describe('gestión de la liga', () => {
    it('create envía los datos y devuelve la liga creada', async () => {
      mockedApi.post.mockResolvedValue(envelope({ id: 'l1' }));
      const payload = { name: 'Invierno', dateStart: '2026-11-01T00:00:00.000Z', setsToWin: 2, doubleRound: true };

      const result = await leaguesService.create(payload);

      expect(mockedApi.post).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.BASE, payload, undefined);
      expect(result).toMatchObject({ id: 'l1' });
    });

    it('update envía solo los campos que cambian', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 'l1' }));

      await leaguesService.update('l1', { name: 'Nueva' });

      expect(mockedApi.put).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.BY_ID('l1'), { name: 'Nueva' }, undefined);
    });

    it('remove borra la liga', async () => {
      mockedApi.delete.mockResolvedValue(onlyMessage('Liga eliminada'));

      await leaguesService.remove('l1');

      expect(mockedApi.delete).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.BY_ID('l1'), undefined);
    });

    it.each([
      ['start', ENDPOINTS.LEAGUES.START],
      ['cancel', ENDPOINTS.LEAGUES.CANCEL],
      ['finish', ENDPOINTS.LEAGUES.FINISH],
    ] as const)('%s hace POST a su ruta sin cuerpo', async (action, endpoint) => {
      mockedApi.post.mockResolvedValue(onlyMessage('ok'));

      await leaguesService[action]('l1');

      expect(mockedApi.post).toHaveBeenCalledWith(endpoint('l1'), undefined, undefined);
    });
  });

  describe('participantes', () => {
    it('addParticipants envía los jugadores a añadir', async () => {
      mockedApi.post.mockResolvedValue(onlyMessage('ok'));

      await leaguesService.addParticipants('l1', ['p1', 'p2']);

      expect(mockedApi.post).toHaveBeenCalledWith(
        ENDPOINTS.LEAGUES.PARTICIPANTS('l1'),
        { playerIds: ['p1', 'p2'] },
        undefined,
      );
    });

    it('updateParticipantStatus confirma o deja pendiente a un inscrito', async () => {
      mockedApi.put.mockResolvedValue(onlyMessage('ok'));

      await leaguesService.updateParticipantStatus('l1', 'p1', 'Confirmado');

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.LEAGUES.PARTICIPANT_STATUS('l1', 'p1'),
        { status: 'Confirmado' },
        undefined,
      );
    });

    it('removeParticipant quita a un jugador antes de iniciar', async () => {
      mockedApi.delete.mockResolvedValue(onlyMessage('ok'));

      await leaguesService.removeParticipant('l1', 'p1');

      expect(mockedApi.delete).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.PARTICIPANT('l1', 'p1'), undefined);
    });

    it('withdrawParticipant retira a un jugador de una liga iniciada', async () => {
      mockedApi.post.mockResolvedValue(onlyMessage('ok'));

      await leaguesService.withdrawParticipant('l1', 'p1');

      expect(mockedApi.post).toHaveBeenCalledWith(
        ENDPOINTS.LEAGUES.WITHDRAW('l1', 'p1'),
        undefined,
        undefined,
      );
    });

    it('register inscribe al jugador autenticado y unregister lo da de baja', async () => {
      mockedApi.post.mockResolvedValue(envelope({ id: 'pp1' }));
      mockedApi.delete.mockResolvedValue(onlyMessage('ok'));

      await leaguesService.register('l1');
      await leaguesService.unregister('l1');

      expect(mockedApi.post).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.REGISTER('l1'), undefined, undefined);
      expect(mockedApi.delete).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.REGISTER('l1'), undefined);
    });
  });
});
