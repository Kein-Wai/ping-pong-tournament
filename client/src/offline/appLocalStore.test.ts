import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isNativeApp } from '../utils/platform';
import { getAppLocalStore, resetAppLocalStore, setAppLocalStore } from './appLocalStore';
import { createMemoryLocalStore } from './memoryLocalStore';
import { openLocalStore } from './openLocalStore';

vi.mock('../utils/platform', () => ({ isNativeApp: vi.fn() }));
vi.mock('./openLocalStore', () => ({ openLocalStore: vi.fn() }));

describe('getAppLocalStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAppLocalStore();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(isNativeApp).mockReturnValue(true);
    vi.mocked(openLocalStore).mockResolvedValue(createMemoryLocalStore());
  });

  it('en el navegador no hay almacén local', async () => {
    vi.mocked(isNativeApp).mockReturnValue(false);

    expect(await getAppLocalStore()).toBeNull();
    expect(openLocalStore).not.toHaveBeenCalled();
  });

  it('en nativo abre el almacén', async () => {
    const store = createMemoryLocalStore();
    vi.mocked(openLocalStore).mockResolvedValue(store);

    expect(await getAppLocalStore()).toBe(store);
  });

  it('abre la base una sola vez aunque se pida muchas', async () => {
    const [a, b] = await Promise.all([getAppLocalStore(), getAppLocalStore()]);
    const c = await getAppLocalStore();

    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(openLocalStore).toHaveBeenCalledTimes(1);
  });

  it('si no se puede abrir devuelve null y lo vuelve a intentar la próxima vez', async () => {
    vi.mocked(openLocalStore).mockRejectedValueOnce(new Error('sin espacio'));

    expect(await getAppLocalStore()).toBeNull();
    expect(await getAppLocalStore()).not.toBeNull();
    expect(openLocalStore).toHaveBeenCalledTimes(2);
  });

  it('setAppLocalStore fija el almacén que se usará', async () => {
    const store = createMemoryLocalStore();

    setAppLocalStore(store);

    expect(await getAppLocalStore()).toBe(store);
    expect(openLocalStore).not.toHaveBeenCalled();
  });
});
