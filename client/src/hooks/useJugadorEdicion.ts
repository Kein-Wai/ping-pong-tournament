import { useState } from 'react';
import { notifications } from '@mantine/notifications';

import {
  usersService,
  type UpdateProfilePayload,
  type UpdateUserPayload,
} from '../api/services/users';
import { useAuthStore } from '../store/authStore';
import type { PlayerProfile, ProfileEditData } from '../types/playerProfile';

/**
 * useJugadorEdicion — Edición del perfil de un jugador.
 *
 * Gestiona el modal «Editar Mis Datos»: el formulario, su validación de
 * contraseña y el guardado. El propio jugador guarda en /users/me y además
 * actualiza su sesión; un administrador guarda en /users/:id sin tocar la suya.
 * `refetch` recarga el perfil tras guardar.
 *
 * Migration: extracción quirúrgica de handleOpenEdit / handleSaveProfile de
 * JugadorPerfil.
 */
export interface UseJugadorEdicionProps {
  id: string | undefined;
  player: PlayerProfile | null;
  isOwnProfile: boolean;
  refetch: () => void | Promise<void>;
}

const EMPTY_FORM: ProfileEditData = {
  name: '',
  surname: '',
  nickname: '',
  avatarUrl: '',
  dominantHand: '',
  playstyle: '',
  rubberForehand: '',
  rubberBackhand: '',
  birthDate: null,
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  skills: {},
};

export const useJugadorEdicion = ({ id, player, isOwnProfile, refetch }: UseJugadorEdicionProps) => {
  const { updateUserFields } = useAuthStore();

  const [editModalOpened, setEditModalOpened] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<ProfileEditData>(EMPTY_FORM);

  const handleOpenEdit = () => {
    if (player) {
      const currentSkills = Array.isArray(player.skills) ? player.skills[0] : player.skills;
      setEditData({
        name: player.name || '',
        surname: player.surname || '',
        nickname: player.nickname || '',
        avatarUrl: player.avatarUrl || '',
        dominantHand: player.dominantHand || '',
        playstyle: player.playstyle || '',
        birthDate: player.birthDate ? new Date(player.birthDate) : null,
        rubberForehand: player.rubberForehand || '',
        rubberBackhand: player.rubberBackhand || '',
        skills: currentSkills ? { ...currentSkills } : {},
      });
      setEditModalOpened(true);
    }
  };

  const handleSaveProfile = async () => {
    if (editData.newPassword && editData.newPassword !== editData.confirmPassword) {
      return notifications.show({
        title: 'Error',
        message: 'Las contraseñas nuevas no coinciden.',
        color: 'red',
      });
    }
    if (editData.newPassword) {
      const isStrong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,32}$/.test(
        editData.newPassword,
      );
      if (!isStrong) {
        return notifications.show({
          title: 'Contraseña débil',
          message:
            'Debe tener mín. 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial (@$!%*?&).',
          color: 'red',
        });
      }
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...editData };
      if (!payload.newPassword) {
        delete payload.currentPassword;
        delete payload.newPassword;
        delete payload.confirmPassword;
      }
      payload.birthDate = editData.birthDate ? editData.birthDate.toISOString() : null;

      // El cuerpo se envía tal cual: la API descarta lo que no está en su esquema.
      if (isOwnProfile) {
        await usersService.updateProfile(payload as UpdateProfilePayload);
      } else {
        await usersService.update(id!, payload as UpdateUserPayload);
      }
      setEditModalOpened(false);
      // La sesión solo refleja el perfil propio: un administrador que edita a otro no debe sobrescribirla.
      if (isOwnProfile) {
        updateUserFields({
          name: editData.name,
          surname: editData.surname,
          nickname: editData.nickname,
          avatarUrl: editData.avatarUrl,
        });
      }
      await refetch();
    } catch {
      // El interceptor de api/axios ya avisa al usuario del error.
    } finally {
      setSaving(false);
    }
  };

  return {
    editModalOpened,
    setEditModalOpened,
    saving,
    editData,
    setEditData,
    handleOpenEdit,
    handleSaveProfile,
  };
};
