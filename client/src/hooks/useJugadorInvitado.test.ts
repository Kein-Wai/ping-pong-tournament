import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import type { GuestFormData } from '../types/players';
import { EMPTY_SKILL_INPUTS } from '../utils/players';
import { useJugadorInvitado } from './useJugadorInvitado';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos cambie de capa.
vi.mock('../api/axios', () => ({
  api: {
    post: vi.fn(),
  },
}));

const envelope = <T,>(data: T) => ({ data: { success: true, data } });

const skillsAll = (value: number) =>
  Object.fromEntries(Object.keys(EMPTY_SKILL_INPUTS).map((key) => [key, value]));

const DEFAULTS: GuestFormData = {
  email: '',
  name: '',
  surname: '',
  level: 'Iniciacion',
  dominantHand: 'Diestro',
  playstyle: 'Ofensivo',
  rubberForehand: 'LISA',
  rubberBackhand: 'LISA',
  elo: 500,
};

describe('useJugadorInvitado', () => {
  const refetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue(envelope({}));
  });

  it('empieza cerrado, con el formulario por defecto y sin consentimiento', () => {
    const { result } = renderHook(() => useJugadorInvitado({ refetch }));

    expect(result.current.guestModal).toBe(false);
    expect(result.current.guestData).toEqual(DEFAULTS);
    expect(result.current.guestSkills).toEqual(EMPTY_SKILL_INPUTS);
    expect(result.current.adminConsentConfirmed).toBe(false);
  });

  it('sin nombre no envía nada', async () => {
    const { result } = renderHook(() => useJugadorInvitado({ refetch }));

    await act(async () => {
      await result.current.handleCreateGuest();
    });

    expect(api.post).not.toHaveBeenCalled();
  });

  it('sin correo crea un invitado con las habilidades base del nivel', async () => {
    const { result } = renderHook(() => useJugadorInvitado({ refetch }));
    act(() => result.current.setGuestData({ ...DEFAULTS, name: 'Nuevo', level: 'Intermedio' } as never));

    await act(async () => {
      await result.current.handleCreateGuest();
    });

    expect(api.post).toHaveBeenCalledWith(
      ENDPOINTS.USERS.CREATE_GUEST,
      { ...DEFAULTS, name: 'Nuevo', level: 'Intermedio', skills: skillsAll(40) },
      undefined,
    );
  });

  it('un correo en blanco cuenta como sin correo', async () => {
    const { result } = renderHook(() => useJugadorInvitado({ refetch }));
    act(() => result.current.setGuestData({ ...DEFAULTS, name: 'Nuevo', email: '   ' } as never));

    await act(async () => {
      await result.current.handleCreateGuest();
    });

    expect(api.post).toHaveBeenCalledWith(
      ENDPOINTS.USERS.CREATE_GUEST,
      expect.anything(),
      undefined,
    );
  });

  it('con correo crea el usuario normal; los apellidos en blanco no se envían', async () => {
    const { result } = renderHook(() => useJugadorInvitado({ refetch }));
    act(() =>
      result.current.setGuestData({
        ...DEFAULTS,
        name: 'Nuevo',
        email: 'nuevo@test.com',
        surname: '  ',
      }),
    );

    await act(async () => {
      await result.current.handleCreateGuest();
    });

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith(
      ENDPOINTS.USERS.BASE,
      {
        email: 'nuevo@test.com',
        name: 'Nuevo',
        surname: undefined,
        level: 'Iniciacion',
        dominantHand: 'Diestro',
        playstyle: 'Ofensivo',
        rubberForehand: 'LISA',
        rubberBackhand: 'LISA',
        elo: 500,
        skills: skillsAll(0),
      },
      undefined,
    );
  });

  it('una habilidad rellenada sustituye a la base solo en esa habilidad', async () => {
    const { result } = renderHook(() => useJugadorInvitado({ refetch }));
    act(() => result.current.setGuestData({ ...DEFAULTS, name: 'Nuevo', level: 'Avanzado' } as never));
    act(() => result.current.setGuestSkills({ ...EMPTY_SKILL_INPUTS, servicio: 85 }));

    await act(async () => {
      await result.current.handleCreateGuest();
    });

    expect(api.post).toHaveBeenCalledWith(
      ENDPOINTS.USERS.CREATE_GUEST,
      expect.objectContaining({ skills: { ...skillsAll(60), servicio: 85 } }),
      undefined,
    );
  });

  it('al crear cierra el modal, vacía el formulario y recarga', async () => {
    const { result } = renderHook(() => useJugadorInvitado({ refetch }));
    act(() => {
      result.current.setGuestModal(true);
      result.current.setAdminConsentConfirmed(true);
      result.current.setGuestData({ ...DEFAULTS, name: 'Nuevo' });
      result.current.setGuestSkills({ ...EMPTY_SKILL_INPUTS, corte: 10 });
    });

    await act(async () => {
      await result.current.handleCreateGuest();
    });

    expect(result.current.guestModal).toBe(false);
    expect(result.current.adminConsentConfirmed).toBe(false);
    expect(result.current.guestData).toEqual(DEFAULTS);
    expect(result.current.guestSkills).toEqual(EMPTY_SKILL_INPUTS);
    expect(result.current.creatingGuest).toBe(false);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('si falla conserva el formulario, no recarga y deja de crear', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('rechazado'));
    const { result } = renderHook(() => useJugadorInvitado({ refetch }));
    act(() => {
      result.current.setGuestModal(true);
      result.current.setGuestData({ ...DEFAULTS, name: 'Nuevo' });
    });

    await act(async () => {
      await result.current.handleCreateGuest();
    });

    expect(result.current.guestModal).toBe(true);
    expect(result.current.guestData.name).toBe('Nuevo');
    expect(result.current.creatingGuest).toBe(false);
    expect(refetch).not.toHaveBeenCalled();
  });
});
