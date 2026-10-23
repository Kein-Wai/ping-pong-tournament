import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import { MatchResultModal } from './MatchResultModal';
import type { MatchToEdit } from '../../types/tournament';

const buildMatch = (overrides: Partial<MatchToEdit> = {}): MatchToEdit =>
  ({
    id: 'partido-1',
    playerOneName: 'Ana García',
    playerTwoName: 'Luis Pérez',
    playerOneId: 'p1',
    playerTwoId: 'p2',
    setsToWin: 2,
    status: 'Programado',
    isKnockout: false,
    set1P1: 0, set1P2: 0,
    set2P1: 0, set2P2: 0,
    set3P1: 0, set3P2: 0,
    set4P1: 0, set4P2: 0,
    set5P1: 0, set5P2: 0,
    set6P1: 0, set6P2: 0,
    set7P1: 0, set7P2: 0,
    ...overrides,
  }) as MatchToEdit;

describe('MatchResultModal', () => {
  it('muestra el titulo con IconEdit y ThemeIcon', () => {
    const match = buildMatch({ playerOneName: 'Ana', playerTwoName: 'Luis' });
    const { getByText } = renderWithProviders(
      <MatchResultModal
        opened
        onClose={vi.fn()}
        match={match}
        submitting={false}
        onSave={vi.fn()}
        onChange={vi.fn()}
      />,
    );
    expect(getByText('Actualizar Marcador del Partido')).toBeInTheDocument();
    expect(getByText('Ana')).toBeInTheDocument();
    expect(getByText('Luis')).toBeInTheDocument();
  });

  it('llama a onSave al hacer click en Guardar Marcador', async () => {
    const onSave = vi.fn();
    const match = buildMatch({ status: 'Iniciado' });
    const { getByRole } = renderWithProviders(
      <MatchResultModal
        opened
        onClose={vi.fn()}
        match={match}
        submitting={false}
        onSave={onSave}
        onChange={vi.fn()}
      />,
    );
    const button = getByRole('button', { name: 'Guardar Marcador' });
    await button.click();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('deshabilita el boton al completar con sets insuficientes', () => {
    const match = buildMatch({
      status: 'Completado',
      setsToWin: 3,
      set1P1: 11, set1P2: 5,
      set2P1: 11, set2P2: 7,
    });
    const { getByRole } = renderWithProviders(
      <MatchResultModal
        opened
        onClose={vi.fn()}
        match={match}
        submitting={false}
        onSave={vi.fn()}
        onChange={vi.fn()}
      />,
    );
    const button = getByRole('button', { name: 'Guardar Marcador' });
    expect(button).toBeDisabled();
  });

  it('cambia el estado del partido al seleccionar una opcion', () => {
    const onChange = vi.fn();
    const match = buildMatch();
    const { getByDisplayValue } = renderWithProviders(
      <MatchResultModal
        opened
        onClose={vi.fn()}
        match={match}
        submitting={false}
        onSave={vi.fn()}
        onChange={onChange}
      />,
    );
    expect(getByDisplayValue('Programado')).toBeInTheDocument();
  });
});