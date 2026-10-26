import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { SetSummary } from '../../types/manualMatch';
import { SetSummaryModal } from './SetSummaryModal';

const SUMMARY: SetSummary = {
  wonCategories: { Ataque: 8 },
  lostCategories: { FalloSaque: 2 },
  myScore: 11,
  oppScore: 2,
};

const renderModal = (props: Partial<React.ComponentProps<typeof SetSummaryModal>> = {}) => {
  const onClose = vi.fn();
  const view = renderWithProviders(
    <SetSummaryModal setNumber={1} summary={SUMMARY} onClose={onClose} {...props} />,
  );
  return { ...view, onClose };
};

describe('SetSummaryModal', () => {
  it('sin set elegido no pinta nada', () => {
    renderModal({ setNumber: null, summary: null });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('titula con el número del set', async () => {
    renderModal({ setNumber: 3 });

    expect(await screen.findByText('Resumen del Set 3')).toBeInTheDocument();
  });

  it('si gané el set lo dice con el marcador', async () => {
    renderModal();

    expect(await screen.findByText('Resultado: Ganaste (11 - 2)')).toBeInTheDocument();
  });

  it('si lo perdí dice que ganó el rival', async () => {
    renderModal({ summary: { ...SUMMARY, myScore: 4, oppScore: 11 } });

    expect(await screen.findByText('Resultado: Rival ganó (4 - 11)')).toBeInTheDocument();
  });

  it('resume los puntos ganados y perdidos', async () => {
    renderModal();
    await screen.findByRole('dialog');

    expect(screen.getByText('Tus Fortalezas')).toBeInTheDocument();
    expect(screen.getByText('A Mejorar')).toBeInTheDocument();
    expect(screen.getByText('Ataque')).toBeInTheDocument();
    expect(screen.getByText('FalloSaque')).toBeInTheDocument();
  });

  it('«Cerrar Resumen» avisa para cerrar', async () => {
    const { onClose } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar Resumen' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
