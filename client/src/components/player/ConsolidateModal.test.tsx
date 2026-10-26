import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { PlayerSkillValues } from '../../types/playerProfile';
import { ConsolidateModal } from './ConsolidateModal';

const SKILLS = {
  derechaPlano: 70,
  revesPlano: 65,
  topspinDerecha: 0,
  topspinReves: 0,
  corte: 0,
  bloqueoDerecha: 0,
  bloqueoReves: 0,
  servicio: 0,
  recepcion: 0,
  movilidad: 0,
  fortalezaMental: 0,
  experiencia: 0,
} as PlayerSkillValues;

const renderModal = (props: Partial<React.ComponentProps<typeof ConsolidateModal>> = {}) => {
  const handlers = { onClose: vi.fn(), onGainsChange: vi.fn(), onConfirm: vi.fn() };
  const view = renderWithProviders(
    <ConsolidateModal
      opened
      skills={SKILLS}
      approvedGains={{ derechaPlano: 1.5 }}
      consolidating={false}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('ConsolidateModal', () => {
  it('cerrado no pinta nada', () => {
    renderModal({ opened: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lista cada habilidad con su base entera, la mejora y el total estimado', async () => {
    renderModal();

    expect(await screen.findByText('Consolidar Progreso')).toBeInTheDocument();
    const row = screen.getByText('Plano Derecha').closest('tr') as HTMLElement;
    expect(within(row).getByText('70')).toBeInTheDocument();
    expect(within(row).getByRole('textbox')).toHaveValue('1.5');
    expect(within(row).getByText('71.50')).toBeInTheDocument();
  });

  it('oculta las habilidades sin base ni mejora', async () => {
    renderModal();
    await screen.findByRole('dialog');

    expect(screen.getByText('Plano Revés')).toBeInTheDocument();
    expect(screen.queryByText('Servicio')).not.toBeInTheDocument();
  });

  it('muestra una habilidad sin base si tiene mejora', async () => {
    renderModal({ approvedGains: { servicio: 2 } });
    await screen.findByRole('dialog');

    expect(screen.getByText('Servicio')).toBeInTheDocument();
  });

  it('ajustar una mejora avisa con todas las mejoras y el valor nuevo como número', async () => {
    const { onGainsChange } = renderModal();
    await screen.findByRole('dialog');
    const row = screen.getByText('Plano Derecha').closest('tr') as HTMLElement;

    fireEvent.change(within(row).getByRole('textbox'), { target: { value: '2.25' } });

    expect(onGainsChange).toHaveBeenCalledWith({ derechaPlano: 2.25 });
  });

  it('sin habilidades del jugador la base es cero', async () => {
    renderModal({ skills: undefined, approvedGains: { corte: 1 } });
    await screen.findByRole('dialog');

    const row = screen.getByText('Corte').closest('tr') as HTMLElement;
    expect(within(row).getByText('1.00')).toBeInTheDocument();
  });

  it('«Confirmar y Aplicar Subidas» avisa para aplicar', async () => {
    const { onConfirm } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y Aplicar Subidas' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
