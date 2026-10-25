import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { renderWithProviders } from '../../test/utils';
import { GoogleSection } from './GoogleSection';

// SDKs externos: son la frontera con Google y con la plataforma nativa.
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}));
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({
    onSuccess,
    onError,
  }: {
    onSuccess: (response: { credential: string }) => void;
    onError: () => void;
  }) => (
    <div>
      <button onClick={() => onSuccess({ credential: 'google-cred' })}>Google web</button>
      <button onClick={() => onError()}>Google web con error</button>
    </div>
  ),
}));

const renderSection = (overrides: Partial<React.ComponentProps<typeof GoogleSection>> = {}) => {
  const props = {
    loading: false,
    onNativeLogin: vi.fn(),
    onWebSuccess: vi.fn(),
    onWebError: vi.fn(),
    onOpenPrivacy: vi.fn(),
    ...overrides,
  };
  const view = renderWithProviders(<GoogleSection {...props} />);
  return { ...view, props };
};

describe('GoogleSection', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  });

  it('muestra el separador y el aviso de privacidad', () => {
    renderSection();

    expect(screen.getByText('O continuar con')).toBeInTheDocument();
    expect(screen.getByText(/Al iniciar sesión o registrarte con Google/)).toBeInTheDocument();
  });

  it('avisa al pulsar el enlace de la política de privacidad', () => {
    const { props } = renderSection();

    fireEvent.click(screen.getByText('Política de Privacidad'));

    expect(props.onOpenPrivacy).toHaveBeenCalledTimes(1);
  });

  describe('en la web', () => {
    it('muestra el botón oficial de Google y no el nativo', () => {
      renderSection();

      expect(screen.getByText('Google web')).toBeInTheDocument();
      expect(screen.queryByText('Continuar con Google')).not.toBeInTheDocument();
    });

    it('pasa la credencial recibida al éxito', () => {
      const { props } = renderSection();

      fireEvent.click(screen.getByText('Google web'));

      expect(props.onWebSuccess).toHaveBeenCalledWith({ credential: 'google-cred' });
    });

    it('avisa del error de Google', () => {
      const { props } = renderSection();

      fireEvent.click(screen.getByText('Google web con error'));

      expect(props.onWebError).toHaveBeenCalledTimes(1);
    });
  });

  describe('en la plataforma nativa', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    });

    it('muestra el botón nativo y no el de la web', () => {
      renderSection();

      expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument();
      expect(screen.queryByText('Google web')).not.toBeInTheDocument();
    });

    it('avisa al pulsar el botón nativo', () => {
      const { props } = renderSection();

      fireEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));

      expect(props.onNativeLogin).toHaveBeenCalledTimes(1);
    });

    it('desactiva el botón nativo mientras carga', () => {
      renderSection({ loading: true });

      expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeDisabled();
    });
  });
});
