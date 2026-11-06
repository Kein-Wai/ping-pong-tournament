import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { SetSummary } from '../../types/manualMatch';
import { MatchSummaryModal } from './MatchSummaryModal';

const SUMMARY: SetSummary = {
  wonCategories: { Ataque: 3 },
  lostCategories: { FalloSaque: 1 },
  myScore: 3,
  oppScore: 1,
};

const renderModal = (props: Partial<React.ComponentProps<typeof MatchSummaryModal>> = {}) => {
  const onClose = vi.fn();
  const view = renderWithProviders(
    <MatchSummaryModal opened summary={SUMMARY} onClose={onClose} {...props} />,
  );
  return { ...view, onClose };
};

describe('MatchSummaryModal', () => {
  it('cerrado no pinta nada', () => {
    renderModal({ opened: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('se titula «Total del partido» y suma los puntos de todos los sets', async () => {
    renderModal();

    expect(await screen.findByText('Total del partido')).toBeInTheDocument();
    expect(screen.getByText('Puntos del partido: 3 - 1')).toBeInTheDocument();
  });

  it('resume los puntos ganados y perdidos con sus porcentajes', async () => {
    renderModal();
    await screen.findByRole('dialog');

    expect(screen.getByText('Tus Fortalezas')).toBeInTheDocument();
    expect(screen.getByText('A Mejorar')).toBeInTheDocument();
    // 3 de 3 ganados = 100 %, 3 de 4 puntos = 75 %.
    expect(screen.getByText('100% · 75%')).toBeInTheDocument();
    // 1 de 1 perdido = 100 %, 1 de 4 puntos = 25 %.
    expect(screen.getByText('100% · 25%')).toBeInTheDocument();
  });

  it('«Cerrar Resumen» avisa para cerrar', async () => {
    const { onClose } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar Resumen' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
