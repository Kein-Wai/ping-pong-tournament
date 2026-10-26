import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  refreshSession,
  setTokenRefreshedHandler,
} from './session';

vi.mock('axios', () => ({ default: { post: vi.fn(), isAxiosError: vi.fn() } }));

const mockedPost = vi.mocked(axios.post);
const mockedIsAxiosError = vi.mocked(axios.isAxiosError);

const rejectedByServer = (status: number) => ({ isAxiosError: true, response: { status } });

describe('refreshSession', () => {
  const onRefreshed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setTokenRefreshedHandler(onRefreshed);
    mockedIsAxiosError.mockImplementation((error) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError));
  });

  it('canjea el refresh token guardado, guarda el par nuevo y avisa del token de acceso', async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-viejo');
    mockedPost.mockResolvedValue({
      data: { success: true, data: { token: 'acceso-nuevo', refreshToken: 'refresh-nuevo' } },
    });

    const token = await refreshSession();

    expect(mockedPost).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh'), {
      refreshToken: 'refresh-viejo',
    });
    expect(token).toBe('acceso-nuevo');
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('acceso-nuevo');
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-nuevo');
    expect(onRefreshed).toHaveBeenCalledWith('acceso-nuevo');
  });

  it('sin refresh token devuelve null sin llamar a la API', async () => {
    const token = await refreshSession();

    expect(token).toBeNull();
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('si la API rechaza el refresh token (401) devuelve null y lo descarta', async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-revocado');
    mockedPost.mockRejectedValue(rejectedByServer(401));

    const token = await refreshSession();

    expect(token).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(onRefreshed).not.toHaveBeenCalled();
  });

  it('un fallo de red no descarta el refresh token y se propaga', async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-viejo');
    mockedPost.mockRejectedValue(new Error('Network Error'));

    await expect(refreshSession()).rejects.toThrow('Network Error');

    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-viejo');
  });

  it('dos renovaciones simultáneas comparten una sola petición', async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-viejo');
    mockedPost.mockResolvedValue({
      data: { success: true, data: { token: 'acceso-nuevo', refreshToken: 'refresh-nuevo' } },
    });

    const [first, second] = await Promise.all([refreshSession(), refreshSession()]);

    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(first).toBe('acceso-nuevo');
    expect(second).toBe('acceso-nuevo');
  });
});
