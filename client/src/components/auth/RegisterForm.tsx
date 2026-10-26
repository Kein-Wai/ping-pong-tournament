import {
  Anchor,
  Button,
  Checkbox,
  Group,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import type { RegisterRole } from '../../types/auth';
import { inputStyles } from './inputStyles';

interface RegisterFormProps {
  selectedRole: RegisterRole;
  name: string;
  surname: string;
  secondSurname: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
  loading: boolean;
  onRoleChange: (role: RegisterRole) => void;
  onNameChange: (value: string) => void;
  onSurnameChange: (value: string) => void;
  onSecondSurnameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onAcceptedTermsChange: (accepted: boolean) => void;
  onOpenPrivacy: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const RegisterForm = ({
  selectedRole,
  name,
  surname,
  secondSurname,
  email,
  password,
  confirmPassword,
  acceptedTerms,
  loading,
  onRoleChange,
  onNameChange,
  onSurnameChange,
  onSecondSurnameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onAcceptedTermsChange,
  onOpenPrivacy,
  onSubmit,
}: RegisterFormProps) => (
  <form onSubmit={onSubmit}>
    <Stack gap="xs">
      <SegmentedControl
        fullWidth
        value={selectedRole}
        onChange={(val: string) => onRoleChange(val as RegisterRole)}
        data={[
          { label: 'Jugador Libre', value: 'Player' },
          { label: 'Fundar Club', value: 'AdminClub' },
        ]}
        color={selectedRole === 'AdminClub' ? 'orange' : 'blue'}
        mb="xs"
      />

      <TextInput
        label="Nombre"
        placeholder="Tu nombre"
        required
        value={name}
        styles={inputStyles}
        onChange={(e) => onNameChange(e.currentTarget.value)}
      />
      <Group grow gap="sm">
        <TextInput
          label="Primer Apellido"
          placeholder="Primer apellido"
          required
          value={surname}
          styles={inputStyles}
          onChange={(e) => onSurnameChange(e.currentTarget.value)}
        />
        <TextInput
          label="Segundo Apellido"
          placeholder="Opcional"
          value={secondSurname}
          styles={inputStyles}
          onChange={(e) => onSecondSurnameChange(e.currentTarget.value)}
        />
      </Group>
      <TextInput
        label="Correo electrónico"
        placeholder="tu@email.com"
        required
        type="email"
        value={email}
        styles={inputStyles}
        onChange={(e) => onEmailChange(e.currentTarget.value)}
      />
      <PasswordInput
        label="Contraseña"
        placeholder="Mínimo 8 caracteres"
        required
        value={password}
        styles={inputStyles}
        onChange={(e) => onPasswordChange(e.currentTarget.value)}
      />
      <PasswordInput
        label="Confirmar Contraseña"
        placeholder="Repite tu contraseña"
        required
        value={confirmPassword}
        styles={inputStyles}
        onChange={(e) => onConfirmPasswordChange(e.currentTarget.value)}
      />
      <Checkbox
        mt="sm"
        checked={acceptedTerms}
        onChange={(e) => onAcceptedTermsChange(e.currentTarget.checked)}
        label={
          <Text size="xs" c="white">
            He leído y acepto la{' '}
            <Anchor onClick={onOpenPrivacy} c="cyan">
              Política de Privacidad
            </Anchor>
            . Declaro ser mayor de 14 años o contar con autorización legal.
          </Text>
        }
      />

      <Button
        type="submit"
        fullWidth
        color={selectedRole === 'AdminClub' ? 'orange' : 'green'}
        mt="xs"
        loading={loading}
        disabled={!acceptedTerms} // 👈 BLOQUEADO SI NO ACEPTA
      >
        {selectedRole === 'AdminClub' ? 'Crear Cuenta de Sede' : 'Crear Cuenta Libre'}
      </Button>
    </Stack>
  </form>
);
