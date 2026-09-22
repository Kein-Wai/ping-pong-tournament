import { useState } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  Button,
  Group,
  Anchor,
  Center,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconMail } from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { notifications } from '@mantine/notifications';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await api.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
      setSubmitted(true);
    } catch (error: any) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={460} my={80}>
      <Title ta="center" order={2}>
        ¿Has olvidado tu contraseña?
      </Title>
      <Text c="dimmed" fz="sm" ta="center" mt="sm">
        Introduce tu correo electrónico para recibir un enlace de recuperación.
      </Text>

      <Paper withBorder shadow="md" p={30} radius="md" mt="xl">
        {submitted ? (
          <Center style={{ flexDirection: 'column', textAlign: 'center' }}>
            <IconMail size={50} color="var(--mantine-color-blue-6)" />
            <Text fw={500} mt="md" size="lg">
              Revisa tu bandeja de entrada
            </Text>
            <Text c="dimmed" size="sm" mt="sm">
              Si tu correo está registrado, te hemos enviado instrucciones para restablecer tu
              contraseña.
            </Text>
            <Button fullWidth mt="xl" onClick={() => navigate(APP_ROUTES.LOGIN)}>
              Volver al Login
            </Button>
          </Center>
        ) : (
          <form onSubmit={handleSubmit}>
            <TextInput
              label="Correo electrónico"
              placeholder="tu@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <Group justify="space-between" mt="lg">
              <Anchor c="dimmed" size="sm" onClick={() => navigate(APP_ROUTES.LOGIN)}>
                <Center inline>
                  <IconArrowLeft size={12} stroke={1.5} />
                  <span style={{ marginLeft: 5 }}>Volver al Login</span>
                </Center>
              </Anchor>
              <Button type="submit" loading={loading}>
                Restablecer
              </Button>
            </Group>
          </form>
        )}
      </Paper>
    </Container>
  );
};
