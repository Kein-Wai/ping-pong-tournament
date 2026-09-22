import { useState } from 'react';
import { Container, Paper, Title, Text, PasswordInput, Button, Stack } from '@mantine/core';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { notifications } from '@mantine/notifications';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      return notifications.show({
        title: 'Error',
        message: 'El enlace no es válido',
        color: 'red',
      });
    }

    if (newPassword !== confirmPassword) {
      return notifications.show({
        title: 'Error',
        message: 'Las contraseñas no coinciden',
        color: 'red',
      });
    }

    setLoading(true);
    try {
      await api.post(ENDPOINTS.AUTH.RESET_PASSWORD, {
        token,
        newPassword,
        confirmPassword,
      });

      navigate(APP_ROUTES.LOGIN);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Container size={460} my={80}>
        <Paper withBorder shadow="md" p={30} radius="md" ta="center">
          <Title order={3} c="red">
            Enlace Inválido
          </Title>
          <Text c="dimmed" mt="sm">
            No se ha encontrado el token de recuperación en la URL.
          </Text>
          <Button mt="xl" fullWidth onClick={() => navigate(APP_ROUTES.FORGOT_PASSWORD)}>
            Solicitar nuevo enlace
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size={460} my={80}>
      <Title ta="center" order={2}>
        Crea tu nueva contraseña
      </Title>
      <Text c="dimmed" fz="sm" ta="center" mt="sm">
        Introduce una contraseña segura (mínimo 8 caracteres, mayúscula, número y símbolo).
      </Text>

      <Paper withBorder shadow="md" p={30} radius="md" mt="xl">
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <PasswordInput
              label="Nueva contraseña"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.currentTarget.value)}
            />
            <PasswordInput
              label="Confirmar contraseña"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            />
            <Button fullWidth mt="xl" type="submit" loading={loading}>
              Guardar Contraseña
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};
