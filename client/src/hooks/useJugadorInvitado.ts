import { useState } from 'react';

import { usersService } from '../api/services/users';
import type { GuestFormData, SkillInputs } from '../types/players';
import { EMPTY_SKILL_INPUTS, buildFinalSkills } from '../utils/players';

/**
 * useJugadorInvitado — Alta de un jugador desde el club.
 *
 * Gestiona el modal «Añadir Jugador al Club»: con correo crea un usuario normal
 * y sin correo un invitado (Guest) que gestiona íntegramente el club. `refetch`
 * recarga la plantilla tras crear.
 *
 * Migration: extracción quirúrgica de handleCreateGuest de Jugadores.
 */
export interface UseJugadorInvitadoProps {
  refetch: () => void | Promise<void>;
}

const INITIAL_GUEST_DATA: GuestFormData = {
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

export const useJugadorInvitado = ({ refetch }: UseJugadorInvitadoProps) => {
  const [guestModal, setGuestModal] = useState(false);
  const [creatingGuest, setCreatingGuest] = useState(false);
  const [adminConsentConfirmed, setAdminConsentConfirmed] = useState(false);
  const [guestData, setGuestData] = useState<GuestFormData>(INITIAL_GUEST_DATA);
  const [guestSkills, setGuestSkills] = useState<SkillInputs>(EMPTY_SKILL_INPUTS);

  const handleCreateGuest = async () => {
    if (!guestData.name) return;
    setCreatingGuest(true);

    const finalSkills = buildFinalSkills(guestData.level, guestSkills);

    try {
      if (guestData.email && guestData.email.trim() !== '') {
        await usersService.create({
          email: guestData.email,
          name: guestData.name,
          surname: guestData.surname.trim() !== '' ? guestData.surname : undefined,
          level: guestData.level,
          dominantHand: guestData.dominantHand,
          playstyle: guestData.playstyle,
          rubberForehand: guestData.rubberForehand,
          rubberBackhand: guestData.rubberBackhand,
          elo: guestData.elo,
          skills: finalSkills,
        });
      } else {
        await usersService.createGuest({
          ...guestData,
          skills: finalSkills,
        });
      }

      setGuestModal(false);
      setAdminConsentConfirmed(false);
      setGuestData(INITIAL_GUEST_DATA);
      setGuestSkills(EMPTY_SKILL_INPUTS);
      await refetch();
    } catch {
      // El interceptor de api/axios ya notifica el error.
    } finally {
      setCreatingGuest(false);
    }
  };

  return {
    guestModal,
    setGuestModal,
    creatingGuest,
    adminConsentConfirmed,
    setAdminConsentConfirmed,
    guestData,
    setGuestData,
    guestSkills,
    setGuestSkills,
    handleCreateGuest,
  };
};
