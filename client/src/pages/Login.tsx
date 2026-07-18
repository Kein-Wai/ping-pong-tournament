import { useState } from 'react';
import {
  Button,
  Title,
  Center,
  Stack,
  TextInput,
  PasswordInput,
  Paper,
  Text,
  Divider,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { GoogleLogin } from '@react-oauth/google';
import DICTIONARY from '../constants/dictionary.json';

export const Login = () => {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // --- LÓGICA DE LOGIN CLÁSICO ---
  const handleRealLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await api.post(ENDPOINTS.AUTH.LOGIN, { email, password });
      processSuccessfulLogin(response.data.token);
    } catch (error: any) {
      handleLoginError(error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE LOGIN CON GOOGLE ---
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setErrorMsg('');

    try {
      // Le enviamos el "credential" (token de Google) a TU backend
      const response = await api.post(ENDPOINTS.AUTH.GOOGLE, {
        credential: credentialResponse.credential,
      });
      processSuccessfulLogin(response.data.token);
    } catch (error: any) {
      handleLoginError(error);
    } finally {
      setLoading(false);
    }
  };

  // --- FUNCIONES AUXILIARES PARA NO REPETIR CÓDIGO ---
  const processSuccessfulLogin = (token: string) => {
    const payloadBase64 = token.split('.')[1];
    const decodedPayload = JSON.parse(atob(payloadBase64));

    login(token, {
      id: decodedPayload.id,
      email: decodedPayload.email,
      name: decodedPayload.name || 'Jugador',
      role: decodedPayload.role,
    });

    navigate('/');
  };

  const handleLoginError = (error: any) => {
    if (error.response && error.response.data.error) {
      setErrorMsg(error.response.data.error);
    } else {
      setErrorMsg('Error de conexión con el servidor');
    }
  };

  return (
    <Center style={{ height: '100vh', backgroundColor: 'var(--mantine-color-gray-0)' }}>
      <Paper radius="md" p="xl" withBorder shadow="md" w={400}>
        <Title order={2} ta="center" mb="md">
          {DICTIONARY.app_title}
        </Title>

        {errorMsg && (
          <Text c="red" size="sm" ta="center" mb="sm">
            {errorMsg}
          </Text>
        )}

        <form onSubmit={handleRealLogin}>
          <Stack>
            <TextInput
              label="Correo electrónico"
              placeholder="tu@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />

            <PasswordInput
              label="Contraseña"
              placeholder="Tu contraseña"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />

            <Button type="submit" fullWidth mt="md" loading={loading}>
              Iniciar Sesión
            </Button>
          </Stack>
        </form>

        <Divider label="O continuar con" labelPosition="center" my="lg" />

        <Center>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setErrorMsg('Error interno al conectar con Google')}
            useOneTap={false} // Opcional: cámbialo a true si quieres el pop-up rápido superior
          />
        </Center>
      </Paper>
    </Center>
  );
};
