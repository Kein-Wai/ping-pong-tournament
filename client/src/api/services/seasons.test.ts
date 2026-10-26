import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';
import { seasonsService } from './seasons';

// Se mockea el `api` de bajo nivel (la frontera del sistema): el servicio y el
// adaptador http se prueban de verdad. GET /seasons responde con el sobre { success, data }.
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

const SEASONS = [
  { id: 's1', name: 'Temporada 2025/2026', isCurrent: false },
  { id: 's2', name: 'Temporada 2026/2027', isCurrent: true },
];

describe('seasonsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list pide GET /seasons y devuelve las temporadas sin el sobre', async () => {
    mockedApi.get.mockResolvedValue({ data: { success: true, data: SEASONS } });

    const result = await seasonsService.list();

    expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.SEASONS.BASE, undefined);
    expect(result).toHaveLength(2);
  });

  it('current devuelve la temporada vigente', async () => {
    mockedApi.get.mockResolvedValue({ data: { success: true, data: SEASONS } });

    const result = await seasonsService.current();

    expect(result?.name).toBe('Temporada 2026/2027');
  });

  it('current devuelve undefined si ninguna temporada está vigente', async () => {
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: [{ id: 's1', name: 'Antigua', isCurrent: false }] },
    });

    await expect(seasonsService.current()).resolves.toBeUndefined();
  });

  it('current propaga el error si falla la red', async () => {
    mockedApi.get.mockRejectedValue(new Error('red caida'));

    await expect(seasonsService.current()).rejects.toThrow('red caida');
  });
});
