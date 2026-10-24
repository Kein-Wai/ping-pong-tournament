import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { normalizeIds, renderWithProviders } from '../../test/utils';
import { PoliticaPrivacidad } from './PoliticaPrivacidad';

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/anterior" element={<div>Pantalla anterior</div>} />
      <Route path="/politica" element={<PoliticaPrivacidad />} />
    </Routes>,
    { initialEntries: ['/anterior', '/politica'] },
  );

describe('PoliticaPrivacidad', () => {
  beforeEach(() => {
    // Solo se congela Date: la fecha de "última actualización" es la de hoy.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-05T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra el título y la fecha de hoy como última actualización', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'Política de Privacidad y Protección de Datos' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Última actualización: 5/3/2026')).toBeInTheDocument();
  });

  it('muestra las cinco secciones de la política', () => {
    renderPage();

    [
      '1. Responsable del Tratamiento',
      '2. Finalidad y Legitimación',
      '3. Datos de Menores de Edad',
      '4. Almacenamiento y Proveedores (Encargados de Tratamiento)',
      '5. Derechos del Usuario (Derechos ARCO)',
    ].forEach((section) => {
      expect(screen.getByRole('heading', { name: section })).toBeInTheDocument();
    });
  });

  it('"Volver" regresa a la pantalla anterior', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(screen.getByText('Pantalla anterior')).toBeInTheDocument();
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX: si una extraccion cambia
    // el HTML renderizado, este snapshot falla.
    it('la política conserva su estructura', () => {
      const { container } = renderPage();

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });
  });
});
