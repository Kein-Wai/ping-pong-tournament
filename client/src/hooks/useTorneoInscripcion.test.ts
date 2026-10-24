import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import { openAppConfirmModal } from '../utils/modals';
import { useTorneoInscripcion } from './useTorneoInscripcion';
import type { AxiosResponse } from 'axios';
import type { Tournament, ClubPlayer } from '../types/tournament';
import type { User } from '../store/authStore';

vi.mock('../api/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../utils/modals', () => ({
  openAppConfirmModal: vi.fn(),
}));

const mockTournament = (overrides: Partial<Tournament> = {}): Tournament =>
  ({
    id: 't1',
    name: 'Torneo Test',
    dateStart: '2025-01-01',
    numPlayers: 8,
    rounds: 'GruposKnockout',
    ...overrides,
  } as Tournament);

const mockUser: User = {
  id: 'u1',
  email: 'test@test.com',
  name: 'Test',
  role: 'Player',
};

describe('useTorneoInscripcion', () => {
  const onInscribirseSuccess = vi.fn();
  const onBulkEnrollSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onInscribirseSuccess.mockResolvedValue(undefined);
    onBulkEnrollSuccess.mockResolvedValue(undefined);
  });

  it('inicializa estado por defecto', () => {
    const { result } = renderHook(() =>
      useTorneoInscripcion({
        id: 't1',
        tournament: null,
        user: null,
        onInscribirseSuccess,
        onBulkEnrollSuccess,
      }),
    );

    expect(result.current.enrollModalOpen).toBe(false);
    expect(result.current.clubPlayers).toEqual([]);
    expect(result.current.checkedToEnroll).toEqual([]);
    expect(result.current.enrolling).toBe(false);
    expect(result.current.isRegistering).toBe(false);
  });

  it('handleOpenEnrollModal carga club players y abre modal', async () => {
    const mockPlayers: ClubPlayer[] = [
      { id: 'u1', name: 'Ana', surname: null, avatarUrl: null },
    ];
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockPlayers } } as unknown as AxiosResponse);

    const { result } = renderHook(() =>
      useTorneoInscripcion({
        id: 't1',
        tournament: null,
        user: null,
        onInscribirseSuccess,
        onBulkEnrollSuccess,
      }),
    );

    await act(async () => {
      await result.current.handleOpenEnrollModal();
    });

    expect(api.get).toHaveBeenCalledWith('/users');
    expect(result.current.clubPlayers).toEqual(mockPlayers);
    expect(result.current.checkedToEnroll).toEqual([]);
    expect(result.current.enrollModalOpen).toBe(true);
  });

  it('handleInscribirse abre modal de confirmacion', () => {
    const { result } = renderHook(() =>
      useTorneoInscripcion({
        id: 't1',
        tournament: mockTournament({ name: 'Copa Test' }),
        user: mockUser,
        onInscribirseSuccess,
        onBulkEnrollSuccess,
      }),
    );

    act(() => {
      result.current.handleInscribirse();
    });

    expect(openAppConfirmModal).toHaveBeenCalledTimes(1);
    expect(openAppConfirmModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Inscripción al Torneo',
        confirmLabel: 'Confirmar e Inscribirme',
        onConfirm: expect.any(Function),
      }),
    );
  });

  it('handleInscribirse onConfirm hace api.post y refetch', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } } as unknown as AxiosResponse);

    const { result } = renderHook(() =>
      useTorneoInscripcion({
        id: 't1',
        tournament: mockTournament(),
        user: mockUser,
        onInscribirseSuccess,
        onBulkEnrollSuccess,
      }),
    );

    act(() => {
      result.current.handleInscribirse();
    });

    const modalConfig = vi.mocked(openAppConfirmModal).mock.calls[0][0] as unknown as Record<string, unknown>;
    await act(async () => {
      await (modalConfig.onConfirm as () => Promise<void>)();
    });

    expect(api.post).toHaveBeenCalledWith('/tournaments/t1/register', {
      playerId: 'u1',
      registeredAt: expect.any(String),
      status: 'Pendiente',
    });
    expect(onInscribirseSuccess).toHaveBeenCalled();
    expect(result.current.isRegistering).toBe(false);
  });

  it('handleBulkEnroll hace api.post con playerIds y refetch', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } } as unknown as AxiosResponse);

    const { result } = renderHook(() =>
      useTorneoInscripcion({
        id: 't1',
        tournament: mockTournament(),
        user: mockUser,
        onInscribirseSuccess,
        onBulkEnrollSuccess,
      }),
    );

    act(() => {
      result.current.setCheckedToEnroll(['u1', 'u2']);
    });

    await act(async () => {
      await result.current.handleBulkEnroll();
    });

    expect(api.post).toHaveBeenCalledWith('/tournaments/t1/register-bulk', {
      playerIds: ['u1', 'u2'],
    });
    expect(result.current.enrollModalOpen).toBe(false);
    expect(onBulkEnrollSuccess).toHaveBeenCalled();
    expect(result.current.enrolling).toBe(false);
  });
});
