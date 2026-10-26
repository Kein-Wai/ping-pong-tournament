import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { User } from '../../types/api';
import { RosterModal } from './RosterModal';

const PLAYERS = [
  { id: 'p1', name: 'Ana', surname: 'López', level: 'Avanzado', avatarUrl: null },
  { id: 'p2', name: 'Luis', surname: 'Gil', level: 'Intermedio', avatarUrl: null },
] as unknown as User[];

// El modal recibe el setter del estado del hook: se prueba con un estado real.
const Harness = ({
  initial,
  onSave,
  saving = false,
  opened = true,
}: {
  initial: string[];
  onSave: () => void;
  saving?: boolean;
  opened?: boolean;
}) => {
  const [checked, setChecked] = useState(initial);
  return (
    <>
      <RosterModal
        opened={opened}
        onClose={vi.fn()}
        players={PLAYERS}
        checkedPlayers={checked}
        onCheckedChange={setChecked}
        onSave={onSave}
        saving={saving}
      />
      <output data-testid="checked">{checked.join(',')}</output>
    </>
  );
};

describe('RosterModal', () => {
  it('cerrado no pinta nada', () => {
    renderWithProviders(<Harness initial={[]} onSave={vi.fn()} opened={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lista a los jugadores con su nivel y marca a los seleccionados', async () => {
    renderWithProviders(<Harness initial={['p1']} onSave={vi.fn()} />);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Ana López')).toBeInTheDocument();
    expect(within(dialog).getByText('Avanzado')).toBeInTheDocument();
    expect(within(dialog).getByText('Luis Gil')).toBeInTheDocument();
    const [ana, luis] = within(dialog).getAllByRole('checkbox');
    expect(ana).toBeChecked();
    expect(luis).not.toBeChecked();
  });

  it('pulsar una fila marca o desmarca al jugador', async () => {
    renderWithProviders(<Harness initial={['p1']} onSave={vi.fn()} />);
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByText('Luis Gil'));
    expect(screen.getByTestId('checked')).toHaveTextContent('p1,p2');

    fireEvent.click(screen.getByText('Ana López'));
    expect(screen.getByTestId('checked')).toHaveTextContent('p2');
  });

  it('«Sincronizar Plantilla» avisa para guardar', async () => {
    const onSave = vi.fn();
    renderWithProviders(<Harness initial={[]} onSave={onSave} />);
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Sincronizar Plantilla' }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('avisa de que el nivel del equipo se recalcula', async () => {
    renderWithProviders(<Harness initial={[]} onSave={vi.fn()} />);

    expect(await screen.findByText(/nivel más bajo/)).toBeInTheDocument();
  });
});
