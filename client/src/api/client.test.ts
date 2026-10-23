import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http } from './client';
import { api } from './axios';

vi.mock('./axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

describe('Adaptador HTTP (client/src/api/client.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('desenvuelve data de una respuesta con sobre { success, data }', async () => {
    mockedApi.get.mockResolvedValue({ data: { success: true, data: { id: 'torneo-1' } } });

    const result = await http.get<{ id: string }>('/tournaments/1');

    expect(result).toEqual({ id: 'torneo-1' });
  });

  it('devuelve una lista vacia cuando la API no manda data', async () => {
    mockedApi.get.mockResolvedValue({ data: { success: true, data: [] } });

    const result = await http.get<string[]>('/users');

    expect(result).toEqual([]);
  });

  it('sustituye por undefined un data ausente en el sobre', async () => {
    mockedApi.get.mockResolvedValue({ data: { success: true } });

    const result = await http.get('/users/me');

    expect(result).toBeUndefined();
  });

  it('no desenvuelve una respuesta que ya viene sin sobre', async () => {
    mockedApi.get.mockResolvedValue({ data: { id: 'club-1' } });

    const result = await http.get('/clubs/1');

    expect(result).toEqual({ id: 'club-1' });
  });

  it('propaga el error sin transformarlo', async () => {
    const error = new Error('No autorizado');
    mockedApi.get.mockRejectedValue(error);

    await expect(http.get('/users/me')).rejects.toThrow('No autorizado');
  });

  it('envia el cuerpo en un POST y devuelve data', async () => {
    mockedApi.post.mockResolvedValue({ data: { success: true, data: { id: 'partido-1' } } });

    const result = await http.post<{ id: string }>('/matches', { setsToWin: 3 });

    expect(mockedApi.post).toHaveBeenCalledWith('/matches', { setsToWin: 3 }, undefined);
    expect(result).toEqual({ id: 'partido-1' });
  });

  it('envia el cuerpo en un PUT y devuelve data', async () => {
    mockedApi.put.mockResolvedValue({ data: { success: true, data: { name: 'Club' } } });

    const result = await http.put<{ name: string }>('/clubs/1', { name: 'Club' });

    expect(mockedApi.put).toHaveBeenCalledWith('/clubs/1', { name: 'Club' }, undefined);
    expect(result).toEqual({ name: 'Club' });
  });

  it('resuelve un DELETE sin cuerpo', async () => {
    mockedApi.delete.mockResolvedValue({ data: { success: true } });

    await http.delete('/tournaments/1');

    expect(mockedApi.delete).toHaveBeenCalledWith('/tournaments/1', undefined);
  });
});
