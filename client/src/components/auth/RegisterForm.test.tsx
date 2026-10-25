import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { RegisterForm } from './RegisterForm';

const renderForm = (overrides: Partial<React.ComponentProps<typeof RegisterForm>> = {}) => {
  const props = {
    selectedRole: 'Player' as const,
    name: '',
    surname: '',
    secondSurname: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: true,
    loading: false,
    onRoleChange: vi.fn(),
    onNameChange: vi.fn(),
    onSurnameChange: vi.fn(),
    onSecondSurnameChange: vi.fn(),
    onEmailChange: vi.fn(),
    onPasswordChange: vi.fn(),
    onConfirmPasswordChange: vi.fn(),
    onAcceptedTermsChange: vi.fn(),
    onOpenPrivacy: vi.fn(),
    onSubmit: vi.fn((e: React.FormEvent<HTMLFormElement>) => e.preventDefault()),
    ...overrides,
  };
  const view = renderWithProviders(<RegisterForm {...props} />);
  return { ...view, props };
};

describe('RegisterForm', () => {
  it('muestra todos los campos y el selector de tipo de cuenta', () => {
    renderForm();

    expect(screen.getByLabelText(/^Nombre/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Primer Apellido/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Segundo Apellido/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Correo electrónico/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Contraseña/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirmar Contraseña/)).toBeInTheDocument();
    expect(screen.getByLabelText('Jugador Libre')).toBeInTheDocument();
    expect(screen.getByLabelText('Fundar Club')).toBeInTheDocument();
  });

  it('rotula el botón según el tipo de cuenta', () => {
    const { unmount } = renderForm({ selectedRole: 'Player' });
    expect(screen.getByRole('button', { name: 'Crear Cuenta Libre' })).toBeInTheDocument();
    unmount();

    renderForm({ selectedRole: 'AdminClub' });
    expect(screen.getByRole('button', { name: 'Crear Cuenta de Sede' })).toBeInTheDocument();
  });

  it('avisa del tipo de cuenta elegido', () => {
    const { props } = renderForm({ selectedRole: 'Player' });

    fireEvent.click(screen.getByLabelText('Fundar Club'));

    expect(props.onRoleChange).toHaveBeenCalledWith('AdminClub');
  });

  it('avisa del texto escrito en cada campo', () => {
    const { props } = renderForm();
    const type = (label: RegExp, value: string) =>
      fireEvent.change(screen.getByLabelText(label), { target: { value } });

    type(/^Nombre/, 'Ana');
    type(/^Primer Apellido/, 'Gil');
    type(/^Segundo Apellido/, 'Ruiz');
    type(/^Correo electrónico/, 'ana@test.com');
    type(/^Contraseña/, 'Secreto1@');
    type(/^Confirmar Contraseña/, 'Secreto1@');

    expect(props.onNameChange).toHaveBeenCalledWith('Ana');
    expect(props.onSurnameChange).toHaveBeenCalledWith('Gil');
    expect(props.onSecondSurnameChange).toHaveBeenCalledWith('Ruiz');
    expect(props.onEmailChange).toHaveBeenCalledWith('ana@test.com');
    expect(props.onPasswordChange).toHaveBeenCalledWith('Secreto1@');
    expect(props.onConfirmPasswordChange).toHaveBeenCalledWith('Secreto1@');
  });

  it('refleja los valores recibidos', () => {
    renderForm({ name: 'Ana', surname: 'Gil', secondSurname: 'Ruiz', email: 'ana@test.com' });

    expect(screen.getByLabelText(/^Nombre/)).toHaveValue('Ana');
    expect(screen.getByLabelText(/^Primer Apellido/)).toHaveValue('Gil');
    expect(screen.getByLabelText(/^Segundo Apellido/)).toHaveValue('Ruiz');
    expect(screen.getByLabelText(/^Correo electrónico/)).toHaveValue('ana@test.com');
  });

  it('bloquea el botón hasta aceptar la política de privacidad', () => {
    const { unmount } = renderForm({ acceptedTerms: false });
    expect(screen.getByRole('button', { name: 'Crear Cuenta Libre' })).toBeDisabled();
    unmount();

    renderForm({ acceptedTerms: true });
    expect(screen.getByRole('button', { name: 'Crear Cuenta Libre' })).toBeEnabled();
  });

  it('avisa al marcar la casilla de aceptación', () => {
    const { props } = renderForm({ acceptedTerms: false });

    fireEvent.click(screen.getByRole('checkbox'));

    expect(props.onAcceptedTermsChange).toHaveBeenCalledWith(true);
  });

  it('avisa al pulsar el enlace de la política de privacidad', () => {
    const { props } = renderForm();

    fireEvent.click(screen.getByText('Política de Privacidad'));

    expect(props.onOpenPrivacy).toHaveBeenCalledTimes(1);
  });

  it('envía el formulario', () => {
    const { container, props } = renderForm();

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('desactiva el botón mientras carga', () => {
    renderForm({ loading: true });

    expect(screen.getByRole('button', { name: 'Crear Cuenta Libre' })).toBeDisabled();
  });
});
