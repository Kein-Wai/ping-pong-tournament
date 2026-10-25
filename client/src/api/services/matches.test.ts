import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';
import { matchesService } from './matches';

// Se mockea el `api` de bajo nivel (la frontera del sistema): el servicio y el
// adaptador http se prueban de verdad. Contrato: GET /matches y PUT /matches/:id
// responden con el sobre { success, data } (api/src/routes/match.ts).
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

describe('matchesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('pide GET /matches y devuelve los partidos sin el sobre', async () => {
      mockedApi.get.mockResolvedValue({
        data: { success: true, data: [{ id: 'm1' }, { id: 'm2' }] },
      });

      const result = await matchesService.list();

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.MATCHES.BASE, undefined);
      expect(result.map((match) => match.id)).toEqual(['m1', 'm2']);
    });

    it('permite a la pantalla tipar el partido con su propia proyección', async () => {
      interface FilaPartido {
        id: string;
        tournament?: { name: string };
      }
      mockedApi.get.mockResolvedValue({
        data: { success: true, data: [{ id: 'm1', tournament: { name: 'Liga Local' } }] },
      });

      const result = await matchesService.list<FilaPartido>();

      expect(result[0].tournament?.name).toBe('Liga Local');
    });

    it('propaga el error si falla la red', async () => {
      mockedApi.get.mockRejectedValue(new Error('red caida'));

      await expect(matchesService.list()).rejects.toThrow('red caida');
    });
  });

  describe('byId', () => {
    it('pide GET /matches/:id y devuelve el partido sin el sobre', async () => {
      mockedApi.get.mockResolvedValue({ data: { success: true, data: { id: 'm1' } } });

      const result = await matchesService.byId('m1');

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.MATCHES.BY_ID('m1'), undefined);
      expect(result.id).toBe('m1');
    });
  });

  describe('update', () => {
    it('envía el resultado por PUT /matches/:id', async () => {
      mockedApi.put.mockResolvedValue({ data: { success: true, data: { id: 'm1' } } });
      const payload = { setOnePlayerOne: 11, setOnePlayerTwo: 5, status: 'Completado' };

      const result = await matchesService.update('m1', payload);

      expect(mockedApi.put).toHaveBeenCalledWith(ENDPOINTS.MATCHES.BY_ID('m1'), payload, undefined);
      expect(result.id).toBe('m1');
    });
  });
});
