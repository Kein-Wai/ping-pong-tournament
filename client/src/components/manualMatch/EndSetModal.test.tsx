import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { SetSummary } from '../../types/manualMatch';
import { EndSetModal } from './EndSetModal';

const SUMMARY: SetSummary = {
  wonCategories: { Ataque: 11 },
  lostCategories: { FalloSaque: 4 },
  myScore: 11,
  oppScore: 4,
};

const renderModal = (props: Partial<React.ComponentProps<typeof EndSetModal>> = {}) => {
  const handlers = { onUndo: vi.fn(), onConfirm: vi.fn() };
  const view = renderWithProviders(
    <EndSetModal opened summary={SUMMARY} {...handlers} {...props} />,
  );
  return { ...view, ...handlers };
};

describe('EndSetModal', () => {
  it('cerrado no pinta nada', () => {
    renderModal({ opened: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('si gano el set lo dice con el marcador', async () => {
    renderModal();

    expect(await screen.findByText('¡Set Finalizado!')).toBeInTheDocument();
    expect(screen.getByText('Has ganado (11 - 4)')).toBeInTheDocument();
  });

  it('si lo pierdo dice que gana el rival', async () => {
    renderModal({ summary: { ...SUMMARY, myScore: 5, oppScore: 11 } });

    expect(await screen.findByText('Rival gana (5 - 11)')).toBeInTheDocument();
  });

  it('resume los puntos ganados y perdidos del set', async () => {
    renderModal();
    await screen.findByRole('dialog');

    expect(screen.getByText('Tus Fortalezas (Ganados)')).toBeInTheDocument();
    expect(screen.getByText('A Mejorar (Perdidos)')).toBeInTheDocument();
    expect(screen.getByText('Ataque')).toBeInTheDocument();
    expect(screen.getByText('FalloSaque')).toBeInTheDocument();
  });

  it('no se puede cerrar sin elegir: no tiene botón de cierre', async () => {
    renderModal();
    await screen.findByRole('dialog');

    expect(document.querySelector('.mantine-Modal-close')).toBeNull();
  });

  it('los botones avisan de deshacer y de avanzar', async () => {
    const { onUndo, onConfirm } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Deshacer Último Punto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Avanzar al Siguiente Set' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
