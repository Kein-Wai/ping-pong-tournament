import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { SavedWarmupRoutine } from '../../types/warmupRoutine';
import { WarmupRoutinesPanel } from './WarmupRoutinesPanel';

const routine = (overrides: Partial<SavedWarmupRoutine> = {}): SavedWarmupRoutine => ({
  id: 'r1',
  name: 'Torneo',
  items: [{ exerciseKey: 'estiramientos', durationSec: 60, restSec: 10 }],
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
  ...overrides,
});

const renderPanel = (selected: SavedWarmupRoutine) =>
  renderWithProviders(
    <WarmupRoutinesPanel
      routines={[selected]}
      selectedId={selected.id}
      isLoading={false}
      isSaving={false}
      isDirty={false}
      hasEntries
      canCreate
      onSelect={vi.fn()}
      onSave={vi.fn()}
      onSaveAsNew={vi.fn()}
      onRename={vi.fn()}
      onRemove={vi.fn()}
    />,
  );

describe('WarmupRoutinesPanel: rutina que no se pudo sincronizar', () => {
  it('avisa del motivo y de que la rutina sigue en el móvil', () => {
    renderPanel(routine({ syncError: 'No se pudo sincronizar: has alcanzado el máximo de 5 rutinas.' }));

    expect(screen.getByText(/No se pudo sincronizar: has alcanzado el máximo/)).toBeInTheDocument();
    expect(screen.getByText(/sigue guardada en este móvil/)).toBeInTheDocument();
  });

  it('sin error no muestra ningún aviso', () => {
    renderPanel(routine({ syncError: null }));

    expect(screen.queryByText(/No se pudo sincronizar/)).not.toBeInTheDocument();
  });
});
