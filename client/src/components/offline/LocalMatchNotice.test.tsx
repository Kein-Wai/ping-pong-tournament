import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { LocalMatchNotice, LocalStateBadge } from './LocalMatchNotice';

describe('LocalStateBadge', () => {
  it('un partido sin cambios locales no muestra nada', () => {
    renderWithProviders(<LocalStateBadge />);

    expect(screen.queryByText(/pendiente|atención/i)).not.toBeInTheDocument();
  });

  it('pendiente y en conflicto se distinguen', () => {
    const { rerenderWithProviders } = renderWithProviders(<LocalStateBadge state="pendiente" />);
    expect(screen.getByText('Pendiente de enviar')).toBeInTheDocument();

    rerenderWithProviders(<LocalStateBadge state="conflicto" />);
    expect(screen.getByText('Requiere atención')).toBeInTheDocument();
  });
});

describe('LocalMatchNotice', () => {
  it('explica que las estadísticas se acreditarán al sincronizar', () => {
    renderWithProviders(<LocalMatchNotice state="pendiente" />);

    expect(screen.getByText(/se acreditarán cuando se sincronice/)).toBeInTheDocument();
  });

  it('en conflicto indica dónde resolverlo', () => {
    renderWithProviders(<LocalMatchNotice state="conflicto" />);

    expect(screen.getByText(/lista de pendientes/)).toBeInTheDocument();
  });

  it('sin estado local no muestra nada', () => {
    renderWithProviders(<LocalMatchNotice />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
