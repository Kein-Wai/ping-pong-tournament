import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from './usePermissions';

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

const loginAs = (role: string | null) => {
  vi.mocked(useAuthStore).mockReturnValue({
    user: role === null ? null : { id: 'u1', role },
  } as ReturnType<typeof useAuthStore>);
};

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('SuperAdmin es isSuperAdmin e isAdmin, pero no isAdminClub ni isPlayer', () => {
    loginAs('SuperAdmin');

    const { result } = renderHook(() => usePermissions());

    expect(result.current).toEqual({
      isAdmin: true,
      isAdminClub: false,
      isSuperAdmin: true,
      isPlayer: false,
    });
  });

  it('AdminClub es isAdminClub e isAdmin, pero no isSuperAdmin ni isPlayer', () => {
    loginAs('AdminClub');

    const { result } = renderHook(() => usePermissions());

    expect(result.current).toEqual({
      isAdmin: true,
      isAdminClub: true,
      isSuperAdmin: false,
      isPlayer: false,
    });
  });

  it('Player es isPlayer y no tiene ningún permiso de administración', () => {
    loginAs('Player');

    const { result } = renderHook(() => usePermissions());

    expect(result.current).toEqual({
      isAdmin: false,
      isAdminClub: false,
      isSuperAdmin: false,
      isPlayer: true,
    });
  });

  it('un rol desconocido no tiene ningún permiso ni es Player', () => {
    loginAs('Invitado');

    const { result } = renderHook(() => usePermissions());

    expect(result.current).toEqual({
      isAdmin: false,
      isAdminClub: false,
      isSuperAdmin: false,
      isPlayer: false,
    });
  });

  it('sin usuario cargado todos los permisos son false y no lanza error', () => {
    loginAs(null);

    const { result } = renderHook(() => usePermissions());

    expect(result.current).toEqual({
      isAdmin: false,
      isAdminClub: false,
      isSuperAdmin: false,
      isPlayer: false,
    });
  });
});
