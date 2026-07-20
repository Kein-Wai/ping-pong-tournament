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
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { GoogleLogin } from '@react-oauth/google';
import { IconLock, IconUserPlus } from '@tabler/icons-react';
import DICTIONARY from '../constants/dictionary.json';

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
        role: selectedRole, // 👈 Enviamos el rol seleccionado
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
        // 👈 Solo mandamos el rol específico si estaban en la pestaña de Registro.
        // Si estaban en Login, mandamos Player por defecto (el backend lo ignora si ya existen)
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
    <Center style={{ height: '100vh', backgroundColor: 'var(--mantine-color-gray-0)' }}>
      <Paper radius="md" p="xl" withBorder shadow="md" w={420}>
        <Title order={2} ta="center" mb="md">
          {DICTIONARY.app_title}
        </Title>

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
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />
                <PasswordInput
                  label="Contraseña"
                  placeholder="Tu contraseña"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                />
                <Button type="submit" fullWidth mt="xs" loading={loading}>
                  Iniciar Sesión
                </Button>
              </Stack>
            </form>
          </Tabs.Panel>

          {/* PANEL DE REGISTRO */}
          <Tabs.Panel value="register">
            <form onSubmit={handleRegister}>
              <Stack gap="xs">
                {/* 👈 Selector de Rol movido exclusivamente aquí */}
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
                  onChange={(e) => setName(e.currentTarget.value)}
                />
                <Group grow gap="sm">
                  <TextInput
                    label="Primer Apellido"
                    placeholder="Primer apellido"
                    required
                    value={surname}
                    onChange={(e) => setSurname(e.currentTarget.value)}
                  />
                  <TextInput
                    label="Segundo Apellido"
                    placeholder="Opcional"
                    value={secondSurname}
                    onChange={(e) => setSecondSurname(e.currentTarget.value)}
                  />
                </Group>
                <TextInput
                  label="Correo electrónico"
                  placeholder="tu@email.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />
                <PasswordInput
                  label="Contraseña"
                  placeholder="Mínimo 8 caracteres"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                />
                <PasswordInput
                  label="Confirmar Contraseña"
                  placeholder="Repite tu contraseña"
                  required
                  value={confirmPassword}
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

        {/* GOOGLE LOGIN (Compartido, debajo de las pestañas) */}
        <Divider label="O continuar con" labelPosition="center" my="lg" />
        <Center>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setErrorMsg('Error interno al conectar con Google')}
            useOneTap={false}
          />
        </Center>
      </Paper>
    </Center>
  );
};
