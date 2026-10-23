import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';

/**
 * Render de test con los mismos providers que monta la aplicacion en
 * main.tsx. Sin ellos, Mantine 9 lanza "MantineProvider was not found in
 * component tree" al renderizar cualquier componente.
 *
 * El Router va incluido porque los componentes de navegacion (useNavigate)
 * fallan fuera de el.
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult & { rerenderWithProviders: (ui: ReactElement) => void } => {
  const Providers = ({ children }: { children: ReactNode }) => (
    <MemoryRouter>
      <MantineProvider defaultColorScheme="light">
        <ModalsProvider>
          <Notifications position="bottom-right" zIndex={1000} />
          {children}
        </ModalsProvider>
      </MantineProvider>
    </MemoryRouter>
  );

  const result = render(ui, { wrapper: Providers, ...options });

  return {
    ...result,
    rerenderWithProviders: (nextUi: ReactElement) => result.rerender(nextUi),
  };
};
