import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { chooseOption, renderWithProviders } from '../../test/utils';
import { EMPTY_SKILL_INPUTS } from '../../utils/players';
import { ApprovePlayerModal } from './ApprovePlayerModal';

const renderModal = (props: Partial<React.ComponentProps<typeof ApprovePlayerModal>> = {}) => {
  const handlers = {
    onClose: vi.fn(),
    onLevelChange: vi.fn(),
    onEloChange: vi.fn(),
    onSkillsChange: vi.fn(),
    onConfirm: vi.fn(),
  };
  const view = renderWithProviders(
    <ApprovePlayerModal
      opened
      level={null}
      elo={500}
      skills={EMPTY_SKILL_INPUTS}
      approving={false}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('ApprovePlayerModal', () => {
  it('cerrado no pinta nada', () => {
    renderModal({ opened: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abierto sin nivel no ofrece las habilidades y desactiva la confirmación', async () => {
    renderModal();

    expect(await screen.findByText('Nivel de Entrada Inicial')).toBeInTheDocument();
    expect(screen.queryByText('Asignación Avanzada de Atributos (RGP)')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar y Aprobar' })).toBeDisabled();
  });

  it('muestra el ELO inicial propuesto', async () => {
    renderModal({ elo: 900 });
    await screen.findByRole('dialog');

    expect(screen.getByLabelText(/Puntuación ELO Inicial/)).toHaveValue('900');
  });

  it('elegir un nivel avisa con el nivel', async () => {
    const { onLevelChange } = renderModal();
    await screen.findByRole('dialog');

    chooseOption(/Nivel Técnico Base/, 'Avanzado');

    expect(onLevelChange).toHaveBeenCalledWith('Avanzado', expect.anything());
  });

  it('cambiar el ELO avisa con el número nuevo', async () => {
    const { onEloChange } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByLabelText(/Puntuación ELO Inicial/), { target: { value: '700' } });

    expect(onEloChange).toHaveBeenCalledWith(700);
  });

  it('con nivel muestra las doce habilidades con el valor base del nivel como sugerencia', async () => {
    renderModal({ level: 'Intermedio' });
    await screen.findByRole('dialog');

    expect(screen.getByText('Asignación Avanzada de Atributos (RGP)')).toBeInTheDocument();
    expect(screen.getByText(/comenzarán con un valor de\s+40\./)).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('40')).toHaveLength(12);
    expect(screen.getByRole('button', { name: 'Confirmar y Aprobar' })).toBeEnabled();
  });

  it('rellenar una habilidad avisa con todas las habilidades y el valor nuevo', async () => {
    const { onSkillsChange } = renderModal({ level: 'Intermedio' });
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByLabelText('Derecha Plano'), { target: { value: '90' } });

    expect(onSkillsChange).toHaveBeenCalledWith({ ...EMPTY_SKILL_INPUTS, derechaPlano: 90 });
  });

  it('«Confirmar y Aprobar» avisa para confirmar', async () => {
    const { onConfirm } = renderModal({ level: 'Intermedio' });
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y Aprobar' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
