import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Button } from '@mantine/core';
import { renderWithProviders } from './utils';

/**
 * Tests de humo: comprueban que el entorno de pruebas (jsdom + React Testing
 * Library + Mantine) esta bien montado. Si fallan, el problema es de
 * infraestructura, no del codigo de la aplicacion.
 */
describe('Entorno de pruebas del cliente', () => {
  it('renderiza un componente de React con Testing Library', () => {
    renderWithProviders(<Button>Hola</Button>);

    expect(screen.getByRole('button', { name: 'Hola' })).toBeInTheDocument();
  });

  it('renderiza un componente de Mantine con los providers de la app', () => {
    renderWithProviders(<Button>Accion</Button>);

    expect(screen.getByRole('button', { name: 'Accion' })).toBeInTheDocument();
  });

  it('expone los matchers de jest-dom', () => {
    const element = document.createElement('div');
    element.textContent = 'contenido';

    expect(element).toHaveTextContent('contenido');
  });

  it('limpia el DOM entre tests', () => {
    renderWithProviders(<Button>Primera</Button>);
    expect(screen.getByRole('button', { name: 'Primera' })).toBeInTheDocument();
  });
});
