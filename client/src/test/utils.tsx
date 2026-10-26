import {
  fireEvent,
  render,
  screen,
  within,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';
import { useAuthStore, type User } from '../store/authStore';

/**
 * Siembra la sesion del store real con un usuario de prueba. El store es una
 * pieza propia de la app, asi que se usa tal cual en vez de mockearlo.
 */
export const loginAs = (overrides: Partial<User> = {}): void => {
  useAuthStore.setState({
    token: 'token-test',
    user: {
      id: 'u1',
      email: 'u1@test.com',
      name: 'Usuario',
      role: 'Player',
      clubId: 'club-1',
      ...overrides,
    },
    isAuthenticated: true,
  });
};

/**
 * Quita del HTML los identificadores que se generan en cada render, para que
 * los snapshots solo cambien cuando cambia la estructura de verdad:
 * - ids de Mantine (`mantine-abc123`, tambien en `for`, `aria-*` y con sufijo
 *   como `-label`);
 * - ids de React (`_r_157_`), que dependen de cuantos componentes se hayan
 *   montado antes en el mismo proceso.
 */
export const normalizeIds = (html: string): string =>
  html
    .replace(
      /(id|for|aria-controls|aria-labelledby|aria-owns)="mantine-[a-z0-9-]+"/g,
      '$1="mantine-id"',
    )
    .replace(/_r_[a-z0-9]+_/g, '_r_id_');

/**
 * Render de test con los mismos providers que monta la aplicacion en
 * main.tsx. Sin ellos, Mantine 9 lanza "MantineProvider was not found in
 * component tree" al renderizar cualquier componente.
 *
 * El Router va incluido porque los componentes de navegacion (useNavigate)
 * fallan fuera de el. `initialEntries` fija la URL inicial para las pantallas
 * que leen parametros de ruta (useParams).
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { initialEntries?: string[] },
): RenderResult & { rerenderWithProviders: (ui: ReactElement) => void } => {
  const { initialEntries, ...renderOptions } = options ?? {};

  const Providers = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <MantineProvider defaultColorScheme="light">
        <ModalsProvider>
          <Notifications position="bottom-right" zIndex={1000} />
          {children}
        </ModalsProvider>
      </MantineProvider>
    </MemoryRouter>
  );

  const result = render(ui, { wrapper: Providers, ...renderOptions });

  return {
    ...result,
    rerenderWithProviders: (nextUi: ReactElement) => result.rerender(nextUi),
  };
};

/**
 * Opciones de un Select de Mantine. Mantine mantiene montada la lista de cada
 * desplegable y varios comparten opciones, asi que se lee la lista que controla
 * el campo (`aria-controls`) y no todo el documento.
 */
export const optionsOf = (label: RegExp): string[] => {
  const field = screen.getByRole('combobox', { name: label });
  fireEvent.click(field);
  const list = document.getElementById(field.getAttribute('aria-controls') as string) as HTMLElement;
  return within(list)
    .getAllByRole('option', { hidden: true })
    .map((option) => option.textContent ?? '');
};

/** Elige una opcion de un Select de Mantine por el texto de su etiqueta. */
export const chooseOption = (label: RegExp, option: string): void => {
  const field = screen.getByRole('combobox', { name: label });
  fireEvent.click(field);
  const list = document.getElementById(field.getAttribute('aria-controls') as string) as HTMLElement;
  fireEvent.click(within(list).getByRole('option', { name: option, hidden: true }));
};
