import { useState, useEffect } from 'react';
import { Title, Paper, Text, Tabs, Box, Overlay } from '@mantine/core';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../api/services/auth';
import type { CredentialResponse } from '@react-oauth/google';
import { IconLock, IconUserPlus } from '@tabler/icons-react';
import DICTIONARY from '../constants/dictionary.json';
import { notifications } from '@mantine/notifications';
import { APP_ROUTES } from '../constants/routes';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { GoogleSection } from '../components/auth/GoogleSection';
import type { ApiErrorLike, NativeGoogleResult, RegisterRole } from '../types/auth';

// 1. GOOGLE AUTH NATIVO (Plugin moderno)
import { SocialLogin } from '@capgo/capacitor-social-login';

import styles from './Login.module.css';
import LOGIN_BG from '../assets/login-bg.jpg';

export const Login = () => {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string | null>('login');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [secondSurname, setSecondSurname] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedRole, setSelectedRole] = useState<RegisterRole>('Player');
  const [isSlowLoad, setIsSlowLoad] = useState(false);

  useEffect(() => {
    // Inicialización limpia multiplataforma con el nuevo plugin
    SocialLogin.initialize({
      google: {
        webClientId: '867880972431-ttqe2fdhj8nj1bu000f7h60ipnoa283i.apps.googleusercontent.com',
        iOSClientId: '867880972431-o7c0k6l2b782gc4h2e97uu073erff8rr.apps.googleusercontent.com',
      },
    });
  }, []);

  useEffect(() => {
    // Inicialización limpia multiplataforma con el nuevo plugin
    const verified = searchParams.get('verified');
    if (verified) {
      notifications.show({
        title: 'Verificado con éxito',
        message: '¡Cuenta verificada con éxito! Ya puedes iniciar sesión',
        color: 'green',
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (isLoginLoading || isRegisterLoading) {
      // Si empezamos a cargar, armamos la bomba de relojería a 5 segundos (5000 ms)
      timeoutId = setTimeout(() => {
        setIsSlowLoad(true);
      }, 5000);
    } else {
      // Si termina de cargar antes de tiempo, desactivamos el modo lento
      setIsSlowLoad(false);
    }

    // La limpieza: si el componente se desmonta o el estado cambia, cancelamos el timer
    return () => clearTimeout(timeoutId);
  }, [isLoginLoading, isRegisterLoading]);

  const processSuccessfulLogin = (token: string, refreshToken: string) => {
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
      dominantHand: decodedPayload.dominantHand || null,
      playstyle: decodedPayload.playstyle || null,
      birthDate: decodedPayload.birthDate || null,
      authProvider: decodedPayload.authProvider,
      forcePasswordChange: decodedPayload.forcePasswordChange,
    };

    login(token, loggedUser, refreshToken);
    navigate(APP_ROUTES.HOME);
  };

  const handleLoginError = (error: unknown) => {
    const apiError = error as ApiErrorLike;
    if (apiError.response && apiError.response.data.error) {
      setErrorMsg(apiError.response.data.error);
    } else {
      setErrorMsg('Error de conexión con el servidor');
    }
  };

  const handleRealLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoginLoading(true);
    setErrorMsg('');
    try {
      const { token, refreshToken } = await authService.login({ email, password });
      processSuccessfulLogin(token, refreshToken);
    } catch (error) {
      handleLoginError(error);
    } finally {
      setIsLoginLoading(false);
    }
  };
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setSurname('');
    setSecondSurname('');
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden');
      return;
    }

    setIsRegisterLoading(true);
    setErrorMsg('');

    try {
      await authService.register({
        email,
        password,
        confirmPassword,
        name,
        surname,
        secondSurname: secondSurname || null,
        role: selectedRole,
      });

      // 1. Limpiamos campos y apagamos el botón inmediatamente
      resetForm();
      setIsRegisterLoading(false);

      // 2. Le damos a React 100ms para repintar la pantalla antes de cambiar la pestaña
      setTimeout(() => {
        setActiveTab('login');
      }, 100);
    } catch (error) {
      handleLoginError(error);
      setIsRegisterLoading(false);
    } finally {
      setIsRegisterLoading(false);
    }
  };

  // Handler para la versión Web
  const handleGoogleSuccessWeb = async (credentialResponse: CredentialResponse) => {
    setIsLoginLoading(true);
    setErrorMsg('');
    try {
      const { token, refreshToken } = await authService.loginWithGoogle(
        credentialResponse.credential as string,
        activeTab === 'register' ? selectedRole : 'Player',
      );
      processSuccessfulLogin(token, refreshToken);
    } catch (error) {
      handleLoginError(error);
    } finally {
      setIsLoginLoading(false);
    }
  };

  // 3. HANDLER PARA LA VERSIÓN NATIVA (iOS / Android) CORREGIDO
  const handleGoogleNativeLogin = async () => {
    setIsLoginLoading(true);
    setErrorMsg('');
    try {
      // Sin 'scopes' para que use el login estándar de Google
      const res = await SocialLogin.login({
        provider: 'google',
        options: {},
      });

      const resultData = res.result as NativeGoogleResult;
      const idToken = resultData.idToken || resultData.authentication?.idToken;

      if (!idToken) {
        throw new Error('No se recibió el token de Google');
      }

      // Enviamos el token al backend
      const { token, refreshToken } = await authService.loginWithGoogle(
        idToken,
        activeTab === 'register' ? selectedRole : 'Player',
      );
      processSuccessfulLogin(token, refreshToken);
    } catch (error) {
      const apiError = error as ApiErrorLike;
      if (apiError?.message !== 'user canceled' && apiError?.message !== 'User cancelled login') {
        console.error('ERROR GOOGLE NATIVO:', error);

        const backendError =
          apiError.response?.data?.error || apiError.response?.data?.message || apiError.message;
        alert('DETALLE DEL ERROR: ' + JSON.stringify(backendError));
        setErrorMsg('Error al iniciar sesión con Google');
      }
    } finally {
      setIsLoginLoading(false);
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
      <Overlay color="#000" opacity={0.65} zIndex={1} />

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

          <Tabs.Panel value="login">
            <LoginForm
              email={email}
              password={password}
              loading={isLoginLoading}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onForgotPassword={() => navigate(APP_ROUTES.FORGOT_PASSWORD)}
              onSubmit={handleRealLogin}
            />
          </Tabs.Panel>

          <Tabs.Panel value="register">
            <RegisterForm
              selectedRole={selectedRole}
              name={name}
              surname={surname}
              secondSurname={secondSurname}
              email={email}
              password={password}
              confirmPassword={confirmPassword}
              acceptedTerms={acceptedTerms}
              loading={isRegisterLoading}
              onRoleChange={setSelectedRole}
              onNameChange={setName}
              onSurnameChange={setSurname}
              onSecondSurnameChange={setSecondSurname}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onAcceptedTermsChange={setAcceptedTerms}
              onOpenPrivacy={() => navigate(APP_ROUTES.LEGAL)}
              onSubmit={handleRegister}
            />
          </Tabs.Panel>
        </Tabs>

        <GoogleSection
          loading={isLoginLoading}
          onNativeLogin={handleGoogleNativeLogin}
          onWebSuccess={handleGoogleSuccessWeb}
          onWebError={() => setErrorMsg('Error interno al conectar con Google')}
          onOpenPrivacy={() => navigate(APP_ROUTES.LEGAL)}
        />
        {isSlowLoad && (
          <Text c="orange" size="sm" ta="center" mt="md" fw={500} className={styles.animacionLenta}>
            Despertando al servidor de la capa gratuita... <br />
            Esto puede tardar unos 40 segundos, ¡gracias por la paciencia! ☕
          </Text>
        )}
      </Paper>
    </Box>
  );
};
