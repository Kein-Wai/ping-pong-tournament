import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { notifications } from '@mantine/notifications';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { loginAs } from '../test/utils';
import type { PlayerProfile } from '../types/playerProfile';
import { useJugadorEdicion } from './useJugadorEdicion';

// Se mockean las fronteras del sistema: la API de bajo nivel y las notificaciones.
vi.mock('../api/axios', () => ({
  api: {
    put: vi.fn(),
  },
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

const SKILLS = { derechaPlano: 70, revesPlano: 65 };

const PLAYER = {
  id: 'p1',
  email: 'luis@test.com',
  name: 'Luis',
  surname: 'Pérez',
  nickname: 'Luchi',
  avatarUrl: null,
  dominantHand: 'Diestro',
  playstyle: 'Ofensivo',
  rubberForehand: 'PICOS_CORTOS',
  rubberBackhand: 'LISA',
  birthDate: '2000-05-20',
  skills: SKILLS,
} as unknown as PlayerProfile;

const BASE_PAYLOAD = {
  name: 'Luis',
  surname: 'Pérez',
  nickname: 'Luchi',
  avatarUrl: '',
  dominantHand: 'Diestro',
  playstyle: 'Ofensivo',
  rubberForehand: 'PICOS_CORTOS',
  rubberBackhand: 'LISA',
  birthDate: '2000-05-20T00:00:00.000Z',
  skills: SKILLS,
};

const setup = (props: { isOwnProfile?: boolean; player?: PlayerProfile | null } = {}) => {
  const refetch = vi.fn().mockResolvedValue(undefined);
  const hook = renderHook(() =>
    useJugadorEdicion({
      id: 'p1',
      player: props.player === undefined ? PLAYER : props.player,
      isOwnProfile: props.isOwnProfile ?? true,
      refetch,
    }),
  );
  return { ...hook, refetch };
};

const open = (result: ReturnType<typeof setup>['result']) => {
  act(() => {
    result.current.handleOpenEdit();
  });
};

describe('useJugadorEdicion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    loginAs({ id: 'p1', name: 'Luis' });
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } } as never);
  });

  describe('abrir el modal', () => {
    it('arranca cerrado, sin guardar y con el formulario vacío', () => {
      const { result } = setup();

      expect(result.current.editModalOpened).toBe(false);
      expect(result.current.saving).toBe(false);
      expect(result.current.editData).toMatchObject({ name: '', birthDate: null, skills: {} });
    });

    it('handleOpenEdit precarga los datos del jugador y abre el modal', () => {
      const { result } = setup();

      open(result);

      expect(result.current.editModalOpened).toBe(true);
      expect(result.current.editData).toMatchObject({
        name: 'Luis',
        surname: 'Pérez',
        nickname: 'Luchi',
        avatarUrl: '',
        dominantHand: 'Diestro',
        playstyle: 'Ofensivo',
        rubberForehand: 'PICOS_CORTOS',
        rubberBackhand: 'LISA',
        skills: SKILLS,
      });
      expect(result.current.editData.birthDate?.toISOString()).toBe('2000-05-20T00:00:00.000Z');
    });

    it('si las habilidades llegan como lista usa el primer elemento', () => {
      const { result } = setup({
        player: { ...PLAYER, skills: [SKILLS] } as unknown as PlayerProfile,
      });

      open(result);

      expect(result.current.editData.skills).toEqual(SKILLS);
    });

    it('sin jugador no abre el modal', () => {
      const { result } = setup({ player: null });

      open(result);

      expect(result.current.editModalOpened).toBe(false);
    });
  });

  describe('handleSaveProfile', () => {
    it('el propio perfil se guarda en /users/me, actualiza la sesión, cierra y recarga', async () => {
      const { result, refetch } = setup();
      open(result);
      act(() => {
        result.current.setEditData({ ...result.current.editData, nickname: 'El Muro' });
      });

      await act(async () => {
        await result.current.handleSaveProfile();
      });

      expect(api.put).toHaveBeenCalledWith(
        ENDPOINTS.USERS.ME,
        { ...BASE_PAYLOAD, nickname: 'El Muro' },
        undefined,
      );
      expect(useAuthStore.getState().user).toMatchObject({ nickname: 'El Muro', name: 'Luis' });
      expect(result.current.editModalOpened).toBe(false);
      expect(result.current.saving).toBe(false);
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('el perfil de otro jugador se guarda en /users/:id sin tocar la sesión', async () => {
      loginAs({ id: 'admin-1', name: 'Admin' });
      const { result } = setup({ isOwnProfile: false });
      open(result);
      act(() => {
        result.current.setEditData({ ...result.current.editData, nickname: 'El Muro' });
      });

      await act(async () => {
        await result.current.handleSaveProfile();
      });

      expect(api.put).toHaveBeenCalledWith(
        ENDPOINTS.USERS.BY_ID('p1'),
        { ...BASE_PAYLOAD, nickname: 'El Muro' },
        undefined,
      );
      expect(useAuthStore.getState().user).toMatchObject({ id: 'admin-1', name: 'Admin' });
      expect(useAuthStore.getState().user?.nickname).toBeUndefined();
    });

    it('sin fecha de nacimiento envía null', async () => {
      const { result } = setup({
        player: { ...PLAYER, birthDate: null } as unknown as PlayerProfile,
      });
      open(result);

      await act(async () => {
        await result.current.handleSaveProfile();
      });

      expect(vi.mocked(api.put).mock.calls[0][1]).toMatchObject({ birthDate: null });
    });

    describe('contraseña', () => {
      const withPasswords = (
        result: ReturnType<typeof setup>['result'],
        newPassword: string,
        confirmPassword: string,
      ) => {
        open(result);
        act(() => {
          result.current.setEditData({
            ...result.current.editData,
            currentPassword: 'Vieja123@',
            newPassword,
            confirmPassword,
          });
        });
      };

      it('rechaza contraseñas que no coinciden sin llamar a la API', async () => {
        const { result } = setup();
        withPasswords(result, 'Abcdef1@', 'Otra1234@');

        await act(async () => {
          await result.current.handleSaveProfile();
        });

        expect(notifications.show).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Error', message: 'Las contraseñas nuevas no coinciden.' }),
        );
        expect(api.put).not.toHaveBeenCalled();
        expect(result.current.saving).toBe(false);
      });

      it('rechaza una contraseña débil sin llamar a la API', async () => {
        const { result } = setup();
        withPasswords(result, 'abc', 'abc');

        await act(async () => {
          await result.current.handleSaveProfile();
        });

        expect(notifications.show).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Contraseña débil' }),
        );
        expect(api.put).not.toHaveBeenCalled();
      });

      it('envía las tres contraseñas cuando son válidas', async () => {
        const { result } = setup();
        withPasswords(result, 'Abcdef1@', 'Abcdef1@');

        await act(async () => {
          await result.current.handleSaveProfile();
        });

        expect(vi.mocked(api.put).mock.calls[0][1]).toMatchObject({
          currentPassword: 'Vieja123@',
          newPassword: 'Abcdef1@',
          confirmPassword: 'Abcdef1@',
        });
      });

      it('sin contraseña nueva no envía ninguna de las tres', async () => {
        const { result } = setup();
        open(result);

        await act(async () => {
          await result.current.handleSaveProfile();
        });

        const sent = vi.mocked(api.put).mock.calls[0][1] as Record<string, unknown>;
        expect(sent).not.toHaveProperty('currentPassword');
        expect(sent).not.toHaveProperty('newPassword');
        expect(sent).not.toHaveProperty('confirmPassword');
      });
    });

    it('si el guardado falla el modal sigue abierto y no recarga', async () => {
      vi.mocked(api.put).mockRejectedValue(new Error('400'));
      const { result, refetch } = setup();
      open(result);

      await act(async () => {
        await result.current.handleSaveProfile();
      });

      expect(result.current.editModalOpened).toBe(true);
      expect(result.current.saving).toBe(false);
      expect(refetch).not.toHaveBeenCalled();
    });
  });
});
