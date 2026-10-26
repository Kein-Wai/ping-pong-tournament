import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { User } from '../../types/api';
import { AttendeesModal } from './AttendeesModal';

const PLAYERS = [
  { id: 'p1', name: 'Ana', surname: 'Gil', avatarUrl: null },
  { id: 'p2', name: 'Luis', surname: 'Pérez', avatarUrl: null },
] as User[];

describe('AttendeesModal', () => {
  it('cerrado no pinta nada', () => {
    renderWithProviders(<AttendeesModal opened={false} attendees={PLAYERS} onClose={() => {}} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lista a cada asistente con su nombre completo', async () => {
    renderWithProviders(<AttendeesModal opened attendees={PLAYERS} onClose={() => {}} />);

    expect(await screen.findByText('Jugadores que asistieron')).toBeInTheDocument();
    expect(screen.getByText('Ana Gil')).toBeInTheDocument();
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
  });

  it('sin asistentes avisa de que no hay registros', async () => {
    renderWithProviders(<AttendeesModal opened attendees={[]} onClose={() => {}} />);

    expect(await screen.findByText('No hay registros de asistencia.')).toBeInTheDocument();
  });
});
