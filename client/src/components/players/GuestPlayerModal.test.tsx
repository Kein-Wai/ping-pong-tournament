import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { chooseOption, renderWithProviders } from '../../test/utils';
import type { GuestFormData } from '../../types/players';
import { EMPTY_SKILL_INPUTS } from '../../utils/players';
import { GuestPlayerModal } from './GuestPlayerModal';

const DATA: GuestFormData = {
  email: '',
  name: 'Nuevo',
  surname: '',
  level: 'Intermedio',
  dominantHand: 'Diestro',
  playstyle: 'Ofensivo',
  rubberForehand: 'LISA',
  rubberBackhand: 'LISA',
  elo: 500,
};

const renderModal = (props: Partial<React.ComponentProps<typeof GuestPlayerModal>> = {}) => {
  const handlers = {
    onClose: vi.fn(),
    onDataChange: vi.fn(),
    onSkillsChange: vi.fn(),
    onConsentChange: vi.fn(),
    onSubmit: vi.fn(),
  };
  const view = renderWithProviders(
    <GuestPlayerModal
      opened
      data={DATA}
      skills={EMPTY_SKILL_INPUTS}
      consentConfirmed={false}
      creating={false}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('GuestPlayerModal', () => {
  it('cerrado no pinta nada', () => {
    renderModal({ opened: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abierto muestra los datos del formulario', async () => {
    renderModal();

    expect(await screen.findByText('Añadir Jugador al Club')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nombre/)).toHaveValue('Nuevo');
    expect(screen.getByRole('combobox', { name: /Nivel Técnico Base/ })).toHaveValue('Intermedio');
    expect(screen.getByText(/todas las habilidades tendrán un valor de\s+40\./)).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('40')).toHaveLength(12);
  });

  it('escribir en un campo avisa con el formulario completo y solo ese campo cambiado', async () => {
    const { onDataChange } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: 'Otro' } });
    fireEvent.change(screen.getByLabelText(/^Apellidos/), { target: { value: 'Gil' } });
    fireEvent.change(screen.getByLabelText('Correo Electrónico (Opcional)'), {
      target: { value: 'a@b.com' },
    });

    expect(onDataChange).toHaveBeenCalledWith({ ...DATA, name: 'Otro' });
    expect(onDataChange).toHaveBeenCalledWith({ ...DATA, surname: 'Gil' });
    expect(onDataChange).toHaveBeenCalledWith({ ...DATA, email: 'a@b.com' });
  });

  it('elegir mano, estilo, gomas y nivel avisa con la opción elegida', async () => {
    const { onDataChange } = renderModal();
    await screen.findByRole('dialog');

    chooseOption(/Mano Dominante/, 'Zurdo');
    chooseOption(/Estilo de Juego/, 'Defensivo');
    chooseOption(/Goma Derecha/, 'ANTISPIN');
    chooseOption(/Goma Revés/, 'PICOS_LARGOS');
    chooseOption(/Nivel Técnico Base/, 'Avanzado');

    expect(onDataChange).toHaveBeenCalledWith({ ...DATA, dominantHand: 'Zurdo' });
    expect(onDataChange).toHaveBeenCalledWith({ ...DATA, playstyle: 'Defensivo' });
    expect(onDataChange).toHaveBeenCalledWith({ ...DATA, rubberForehand: 'ANTISPIN' });
    expect(onDataChange).toHaveBeenCalledWith({ ...DATA, rubberBackhand: 'PICOS_LARGOS' });
    expect(onDataChange).toHaveBeenCalledWith({ ...DATA, level: 'Avanzado' });
  });

  it('el ELO inicial avisa como número', async () => {
    const { onDataChange } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByLabelText(/Puntuación ELO Inicial/), { target: { value: '800' } });

    expect(onDataChange).toHaveBeenCalledWith({ ...DATA, elo: 800 });
  });

  it('rellenar una habilidad avisa con todas las habilidades y el valor nuevo', async () => {
    const { onSkillsChange } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByLabelText('Servicio'), { target: { value: '70' } });

    expect(onSkillsChange).toHaveBeenCalledWith({ ...EMPTY_SKILL_INPUTS, servicio: 70 });
  });

  it('marcar el consentimiento avisa con el nuevo valor', async () => {
    const { onConsentChange } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByLabelText(/Confirmo que tengo el consentimiento/));

    expect(onConsentChange).toHaveBeenCalledWith(true);
  });

  it('el botón exige nombre y consentimiento', async () => {
    const { unmount } = renderModal({ data: { ...DATA, name: '' }, consentConfirmed: true });
    await screen.findByRole('dialog');
    expect(screen.getByRole('button', { name: 'Añadir Jugador' })).toBeDisabled();
    unmount();

    const second = renderModal({ consentConfirmed: false });
    await screen.findByRole('dialog');
    expect(screen.getByRole('button', { name: 'Añadir Jugador' })).toBeDisabled();
    second.unmount();

    renderModal({ consentConfirmed: true });
    await screen.findByRole('dialog');
    expect(screen.getByRole('button', { name: 'Añadir Jugador' })).toBeEnabled();
  });

  it('«Añadir Jugador» avisa para crear', async () => {
    const { onSubmit } = renderModal({ consentConfirmed: true });
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Añadir Jugador' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
