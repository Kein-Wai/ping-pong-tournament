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
  Tabs,
  Group,
  SegmentedControl,
  Box,
  Overlay,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { GoogleLogin } from '@react-oauth/google';
import { IconLock, IconUserPlus } from '@tabler/icons-react';
import DICTIONARY from '../constants/dictionary.json';
const inputStyles = {
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    color: '#000',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    '&::placeholder': {
      color: '#666',
    },
  },
  label: {
    color: '#fff',
    fontWeight: 600,
  },
};

// Imagen HD de tenis de mesa (Unsplash)
const LOGIN_BG =
  'https://images.unsplash.com/photo-1534158914592-062992fbe900?q=80&w=1920&auto=format&fit=crop';

export const Login = () => {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string | null>('login');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [secondSurname, setSecondSurname] = useState('');

  // Estado para el rol (Solo se usa en Registro)
  const [selectedRole, setSelectedRole] = useState<'Player' | 'AdminClub'>('Player');

  const processSuccessfulLogin = (token: string) => {
    const payloadBase64 = token.split('.')[1];
    const decodedPayload = JSON.parse(
      decodeURIComponent(
        atob(payloadBase64)
          .split('')
          .map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join(''),
      ),
    );

    const loggedUser = {
      id: decodedPayload.id,
      email: decodedPayload.email,
      surname: decodedPayload.surname || '',
      nickname: decodedPayload.nickname,
      avatarUrl: decodedPayload.avatarUrl || null,
      name: decodedPayload.name || 'Jugador',
      role: decodedPayload.role,
      clubId: decodedPayload.clubId || null,
      clubStatus: decodedPayload.clubStatus || null,
    };

    login(token, loggedUser);
    navigate('/');
  };

  const handleLoginError = (error: any) => {
    if (error.response && error.response.data.error) {
      setErrorMsg(error.response.data.error);
    } else {
      setErrorMsg('Error de conexión con el servidor');
    }
  };

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

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await api.post(ENDPOINTS.AUTH.REGISTER, {
        email,
        password,
        confirmPassword,
        name,
        surname,
        secondSurname: secondSurname || null,
        role: selectedRole,
      });
      processSuccessfulLogin(response.data.token);
    } catch (error: any) {
      handleLoginError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await api.post(ENDPOINTS.AUTH.GOOGLE, {
        credential: credentialResponse.credential,
        role: activeTab === 'register' ? selectedRole : 'Player',
      });
      processSuccessfulLogin(response.data.token);
    } catch (error: any) {
      handleLoginError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        position: 'relative',
        minHeight: '100vh',
        backgroundImage: `url(${LOGIN_BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      {/* Capa oscura translúcida sobre la imagen */}
      <Overlay color="#000" opacity={0.65} zIndex={1} />

      {/* Tarjeta con efecto Glassmorphism */}
      <Paper
        radius="lg"
        p="xl"
        withBorder
        shadow="2xl"
        data-mantine-color-scheme="dark"
        w={{ base: '100%', sm: 440 }}
        style={{
          position: 'relative',
          zIndex: 2,
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(26, 27, 30, 0.82)',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          color: '#fff',
        }}
      >
        <Title order={2} ta="center" mb="md" style={{ letterSpacing: 1 }}>
          <Text
            component="span"
            inherit
            variant="gradient"
            gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
          >
            {DICTIONARY.app_title}
          </Text>
        </Title>

        <Text size="xs" c="dimmed" ta="center" mb="lg">
          Gestión de torneos y rankings de tenis de mesa
        </Text>

        {errorMsg && (
          <Text c="red" size="sm" ta="center" mb="sm" fw={500}>
            {errorMsg}
          </Text>
        )}

        <Tabs
          value={activeTab}
          onChange={(val) => {
            setActiveTab(val);
            setErrorMsg('');
          }}
          variant="outline"
        >
          <Tabs.List grow mb="md">
            <Tabs.Tab value="login" leftSection={<IconLock size={16} />}>
              Ingresar
            </Tabs.Tab>
            <Tabs.Tab value="register" leftSection={<IconUserPlus size={16} />}>
              Registrarse
            </Tabs.Tab>
          </Tabs.List>

          {/* PANEL DE LOGIN */}
          <Tabs.Panel value="login">
            <form onSubmit={handleRealLogin}>
              <Stack gap="sm">
                <TextInput
                  label="Correo electrónico"
                  placeholder="tu@email.com"
                  required
                  value={email}
                  styles={inputStyles}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />
                <PasswordInput
                  label="Contraseña"
                  placeholder="Tu contraseña"
                  required
                  value={password}
                  styles={inputStyles}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                />
                <Button type="submit" fullWidth mt="xs" loading={loading} color="blue">
                  Iniciar Sesión
                </Button>
              </Stack>
            </form>
          </Tabs.Panel>

          {/* PANEL DE REGISTRO */}
          <Tabs.Panel value="register">
            <form onSubmit={handleRegister}>
              <Stack gap="xs">
                <SegmentedControl
                  fullWidth
                  value={selectedRole}
                  onChange={(val: string) => setSelectedRole(val as 'Player' | 'AdminClub')}
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
                  onChange={(e) => setName(e.currentTarget.value)}
                />
                <Group grow gap="sm">
                  <TextInput
                    label="Primer Apellido"
                    placeholder="Primer apellido"
                    required
                    value={surname}
                    styles={inputStyles}
                    onChange={(e) => setSurname(e.currentTarget.value)}
                  />
                  <TextInput
                    label="Segundo Apellido"
                    placeholder="Opcional"
                    value={secondSurname}
                    styles={inputStyles}
                    onChange={(e) => setSecondSurname(e.currentTarget.value)}
                  />
                </Group>
                <TextInput
                  label="Correo electrónico"
                  placeholder="tu@email.com"
                  required
                  type="email"
                  value={email}
                  styles={inputStyles}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />
                <PasswordInput
                  label="Contraseña"
                  placeholder="Mínimo 8 caracteres"
                  required
                  value={password}
                  styles={inputStyles}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                />
                <PasswordInput
                  label="Confirmar Contraseña"
                  placeholder="Repite tu contraseña"
                  required
                  value={confirmPassword}
                  styles={inputStyles}
                  onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                />
                <Button
                  type="submit"
                  fullWidth
                  color={selectedRole === 'AdminClub' ? 'orange' : 'green'}
                  mt="xs"
                  loading={loading}
                >
                  {selectedRole === 'AdminClub' ? 'Crear Cuenta de Sede' : 'Crear Cuenta Libre'}
                </Button>
              </Stack>
            </form>
          </Tabs.Panel>
        </Tabs>

        {/* GOOGLE LOGIN */}
        <Divider label="O continuar con" labelPosition="center" my="lg" />
        <Center>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setErrorMsg('Error interno al conectar con Google')}
            useOneTap={false}
          />
        </Center>
      </Paper>
    </Box>
  );
};
