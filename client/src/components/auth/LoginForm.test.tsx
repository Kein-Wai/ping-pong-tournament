import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { LoginForm } from './LoginForm';

const renderForm = (overrides: Partial<React.ComponentProps<typeof LoginForm>> = {}) => {
  const props = {
    email: '',
    password: '',
    loading: false,
    onEmailChange: vi.fn(),
    onPasswordChange: vi.fn(),
    onForgotPassword: vi.fn(),
    onSubmit: vi.fn((e: React.FormEvent<HTMLFormElement>) => e.preventDefault()),
    ...overrides,
  };
  const view = renderWithProviders(<LoginForm {...props} />);
  return { ...view, props };
};

describe('LoginForm', () => {
  it('muestra los campos, el enlace de recuperación y el botón de acceso', () => {
    renderForm();

    expect(screen.getByLabelText(/^Correo electrónico/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Contraseña/)).toBeInTheDocument();
    expect(screen.getByText('¿Olvidaste tu contraseña?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar Sesión' })).toBeInTheDocument();
  });

  it('refleja el correo y la contraseña recibidos', () => {
    renderForm({ email: 'ana@test.com', password: 'Secreto1@' });

    expect(screen.getByLabelText(/^Correo electrónico/)).toHaveValue('ana@test.com');
    expect(screen.getByLabelText(/^Contraseña/)).toHaveValue('Secreto1@');
  });

  it('avisa del texto escrito en el correo y en la contraseña', () => {
    const { props } = renderForm();

    fireEvent.change(screen.getByLabelText(/^Correo electrónico/), {
      target: { value: 'b@t.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: 'Clave1@' } });

    expect(props.onEmailChange).toHaveBeenCalledWith('b@t.com');
    expect(props.onPasswordChange).toHaveBeenCalledWith('Clave1@');
  });

  it('avisa al pulsar «¿Olvidaste tu contraseña?»', () => {
    const { props } = renderForm();

    fireEvent.click(screen.getByText('¿Olvidaste tu contraseña?'));

    expect(props.onForgotPassword).toHaveBeenCalledTimes(1);
  });

  it('envía el formulario', () => {
    const { container, props } = renderForm({ email: 'ana@test.com', password: 'Secreto1@' });

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('desactiva el botón mientras carga', () => {
    renderForm({ loading: true });

    expect(screen.getByRole('button', { name: 'Iniciar Sesión' })).toBeDisabled();
  });
});
