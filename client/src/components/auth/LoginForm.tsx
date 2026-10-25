import { Anchor, Button, Group, PasswordInput, Stack, TextInput } from '@mantine/core';
import { inputStyles } from './inputStyles';

interface LoginFormProps {
  email: string;
  password: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onForgotPassword: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const LoginForm = ({
  email,
  password,
  loading,
  onEmailChange,
  onPasswordChange,
  onForgotPassword,
  onSubmit,
}: LoginFormProps) => (
  <form onSubmit={onSubmit}>
    <Stack gap="sm">
      <TextInput
        label="Correo electrónico"
        placeholder="tu@email.com"
        required
        value={email}
        styles={inputStyles}
        onChange={(e) => onEmailChange(e.currentTarget.value)}
      />
      <PasswordInput
        label="Contraseña"
        placeholder="Tu contraseña"
        required
        value={password}
        styles={inputStyles}
        onChange={(e) => onPasswordChange(e.currentTarget.value)}
      />
      <Group justify="space-between" mt="xs">
        <Anchor size="xs" onClick={onForgotPassword}>
          ¿Olvidaste tu contraseña?
        </Anchor>
      </Group>
      <Button type="submit" fullWidth mt="xs" loading={loading} color="blue">
        Iniciar Sesión
      </Button>
    </Stack>
  </form>
);
