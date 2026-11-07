import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { manualMatchesRepository } from '../offline/manualMatchesRepository';
import { selectIsSyncBlocked, useSyncStore } from '../store/syncStore';
import { useMatchSession } from './useMatchSession';

vi.mock('../offline/manualMatchesRepository', () => ({
  manualMatchesRepository: { openMatch: vi.fn(), closeMatch: vi.fn().mockResolvedValue(undefined) },
}));

describe('useMatchSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSyncStore.setState({ openMatches: 0 });
  });

  it('mientras el partido está abierto bloquea la sincronización', () => {
    renderHook(() => useMatchSession('m1'));

    expect(selectIsSyncBlocked(useSyncStore.getState())).toBe(true);
    expect(manualMatchesRepository.openMatch).toHaveBeenCalledWith('m1');
  });

  it('al salir libera la sincronización y cierra el partido', () => {
    const { unmount } = renderHook(() => useMatchSession('m1'));

    unmount();

    expect(selectIsSyncBlocked(useSyncStore.getState())).toBe(false);
    expect(manualMatchesRepository.closeMatch).toHaveBeenCalledWith('m1');
  });

  it('sin identificador no hace nada', () => {
    renderHook(() => useMatchSession(undefined));

    expect(manualMatchesRepository.openMatch).not.toHaveBeenCalled();
    expect(selectIsSyncBlocked(useSyncStore.getState())).toBe(false);
  });
});
