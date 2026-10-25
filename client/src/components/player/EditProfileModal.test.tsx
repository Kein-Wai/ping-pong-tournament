import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { chooseOption, renderWithProviders } from '../../test/utils';
import type { ProfileEditData } from '../../types/playerProfile';
import { EditProfileModal } from './EditProfileModal';

const DATA: ProfileEditData = {
  name: 'Luis',
  surname: 'Pérez',
  nickname: 'Luchi',
  avatarUrl: '',
  dominantHand: 'Diestro',
  playstyle: 'Ofensivo',
  rubberForehand: 'PICOS_CORTOS',
  rubberBackhand: 'LISA',
  birthDate: null,
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  skills: { derechaPlano: 70, revesPlano: 65 },
};

const renderModal = (props: Partial<React.ComponentProps<typeof EditProfileModal>> = {}) => {
  const handlers = { onClose: vi.fn(), onEditDataChange: vi.fn(), onSave: vi.fn() };
  const view = renderWithProviders(
    <EditProfileModal
      opened
      editData={DATA}
      showSkills={false}
      showPasswordSection={false}
      saving={false}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('EditProfileModal', () => {
  it('cerrado no pinta nada', () => {
    renderModal({ opened: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abierto muestra los datos actuales', async () => {
    renderModal();

    expect(await screen.findByText('Editar Mis Datos')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nombre/)).toHaveValue('Luis');
    expect(screen.getByLabelText('Apellidos')).toHaveValue('Pérez');
    expect(screen.getByLabelText(/^Nickname/)).toHaveValue('Luchi');
    expect(screen.getByRole('combobox', { name: 'Mano Dominante' })).toHaveValue('Diestro');
  });

  it('editar un campo avisa con el formulario completo y solo ese campo cambiado', async () => {
    const { onEditDataChange } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByLabelText(/^Nickname/), { target: { value: 'El Muro' } });

    expect(onEditDataChange).toHaveBeenCalledWith({ ...DATA, nickname: 'El Muro' });
  });

  it('elegir mano dominante y goma avisa con la opción elegida', async () => {
    const { onEditDataChange } = renderModal();
    await screen.findByRole('dialog');

    chooseOption(/Mano Dominante/, 'Zurdo');
    chooseOption(/Goma Derecha/, 'ANTISPIN');

    expect(onEditDataChange).toHaveBeenCalledWith({ ...DATA, dominantHand: 'Zurdo' });
    expect(onEditDataChange).toHaveBeenCalledWith({ ...DATA, rubberForehand: 'ANTISPIN' });
  });

  it('«Guardar Cambios» avisa para guardar', async () => {
    const { onSave } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('los atributos técnicos base solo se ven con showSkills y se editan como números', async () => {
    const { onEditDataChange, unmount } = renderModal({ showSkills: true });
    await screen.findByRole('dialog');
    expect(screen.getByText('Atributos Técnicos Base (Modificación Manual)')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Plano Derecha'), { target: { value: '80' } });

    expect(onEditDataChange).toHaveBeenCalledWith({
      ...DATA,
      skills: { derechaPlano: 80, revesPlano: 65 },
    });
    unmount();

    renderModal();
    await screen.findByRole('dialog');
    expect(screen.queryByText('Atributos Técnicos Base (Modificación Manual)')).not.toBeInTheDocument();
  });

  it('el cambio de contraseña solo se ve con showPasswordSection', async () => {
    const { onEditDataChange, unmount } = renderModal({ showPasswordSection: true });
    await screen.findByRole('dialog');
    expect(screen.getByText('Cambiar Contraseña (Opcional)')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Contraseña Actual'), { target: { value: 'Vieja123@' } });
    fireEvent.change(screen.getByLabelText(/^Nueva Contraseña/), { target: { value: 'Abcdef1@' } });
    fireEvent.change(screen.getByLabelText(/^Confirmar Nueva/), { target: { value: 'Abcdef1@' } });

    expect(onEditDataChange).toHaveBeenCalledWith({ ...DATA, currentPassword: 'Vieja123@' });
    expect(onEditDataChange).toHaveBeenCalledWith({ ...DATA, newPassword: 'Abcdef1@' });
    expect(onEditDataChange).toHaveBeenCalledWith({ ...DATA, confirmPassword: 'Abcdef1@' });
    unmount();

    renderModal();
    await screen.findByRole('dialog');
    expect(screen.queryByText('Cambiar Contraseña (Opcional)')).not.toBeInTheDocument();
  });
});
