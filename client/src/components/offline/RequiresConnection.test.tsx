import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../test/utils';
import { RequiresConnection } from './RequiresConnection';

describe('RequiresConnection', () => {
  it('explica que la sección necesita conexión y qué sí se puede usar', () => {
    renderWithProviders(<RequiresConnection />);

    expect(screen.getByText('Requiere conexión')).toBeInTheDocument();
    expect(screen.getByText(/Calentamiento/)).toBeInTheDocument();
  });

  it('admite un mensaje propio', () => {
    renderWithProviders(<RequiresConnection message="Abre la app con conexión una vez." />);

    expect(screen.getByText('Abre la app con conexión una vez.')).toBeInTheDocument();
  });

  it('«Ir al inicio» lleva a la pantalla de inicio', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<div>Inicio</div>} />
        <Route path="/torneos" element={<RequiresConnection />} />
      </Routes>,
      { initialEntries: ['/torneos'] },
    );

    await userEvent.click(screen.getByRole('button', { name: 'Ir al inicio' }));

    expect(screen.getByText('Inicio')).toBeInTheDocument();
  });
});
