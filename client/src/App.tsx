import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RequireClubSetup } from './components/auth/RequireClubSetup';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Jugadores } from './pages/Jugadores/Jugadores';
import { JugadorPerfil } from './pages/Jugadores/JugadorPerfil';
import { Torneos } from './pages/Torneos/Torneos';
import { TorneoDetalles } from './pages/Torneos/TorneoDetalles';
import { TorneoNuevo } from './pages/Torneos/TorneoNuevo';
import { Partidos } from './pages/Partidos/Partidos';
import { ClubSelection } from './pages/Clubs/ClubSelection';
import { ModalsProvider } from '@mantine/modals';
import { ClubSetup } from './pages/Clubs/ClubSetup';
import { MiClub } from './pages/Clubs/MiClub';
import { AdminPanel } from './pages/Admin/AdminPanel';
import { Estadisticas } from './pages/Estadisticas/Estadisticas';
import { Ejercicios } from './pages/Ejercicios/Ejercicios';
import { EjercicioNuevo } from './pages/Ejercicios/EjercicioNuevo';
import { PlanNuevo } from './pages/Entrenamientos/PlanNuevo';
import { PlanDetalles } from './pages/Entrenamientos/PlanDetalles';
import { SessionDetalles } from './pages/Entrenamientos/SessionDetalles';
import { AnalisisList } from './pages/Analisis/AnalisisList';
import { ManualMatchTracker } from './pages/Analisis/ManualMatchTracker';
import { EntrenamientosGenerales } from './pages/Entrenamientos/EntrenamientosGenerales';
import { FeedbackPage } from './pages/Feedback/FeedbackPage';
import { ForgotPassword } from './pages/Auth/ForgotPassword';
import { ResetPassword } from './pages/Auth/ResetPassword';

import { Equipos } from './pages/Equipos/Equipos';
import { EquipoNuevo } from './pages/Equipos/EquipoNuevo';
import { EquipoDetalles } from './pages/Equipos/EquipoDetalles';
import { App as CapApp } from '@capacitor/app';
import { APP_ROUTES } from './constants/routes';
import { useAuthStore } from './store/authStore';

const isNativeApp = () => {
  return (
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'ionic:' ||
    (window.location.hostname === 'localhost' && window.location.port === '')
  );
};

const CustomSplashScreen = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (!isNativeApp()) {
      setIsVisible(false);
      return;
    }
    const fadeOutTimer = setTimeout(() => {
      setOpacity(0);
    }, 2000);

    const removeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 2500);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        opacity: opacity,
        transition: 'opacity 0.5s ease-out',
      }}
    >
      <img
        src="/splash.png"
        alt="Cargando..."
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
};

// Componente interno que ya vive dentro de BrowserRouter
function AppContent() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (token) {
      try {
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadBase64));

        const currentTime = Math.floor(Date.now() / 1000);

        if (decodedPayload.exp && decodedPayload.exp < currentTime) {
          console.warn('Token caducado, cerrando sesión...');
          logout();
          navigate('/login');
        }
      } catch (e) {
        console.error('Token inválido', e);
        logout();
      }
    }
  }, [token, navigate, logout]);

  useEffect(() => {
    const listener = CapApp.addListener('appUrlOpen', (data) => {
      const url = new URL(data.url);
      const pathAndQuery = url.pathname + url.search;

      if (pathAndQuery) {
        navigate(pathAndQuery);
      }
    });

    return () => {
      listener.then((h) => h.remove());
    };
  }, [navigate]);

  return (
    <>
      <CustomSplashScreen />
      <ModalsProvider>
        <Routes>
          {/* Ruta pública */}
          <Route path={APP_ROUTES.LOGIN} element={<Login />} />
          <Route path={APP_ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
          <Route path={APP_ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
          {/* Bloque de seguridad de Rutas Protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path={APP_ROUTES.SETUP_CLUB} element={<ClubSetup />} />

            <Route element={<RequireClubSetup />}>
              <Route element={<MainLayout />}>
                <Route path={APP_ROUTES.HOME} element={<Dashboard />} />
                <Route path={APP_ROUTES.CLUB_SELECTION} element={<ClubSelection />} />

                <Route path={APP_ROUTES.TORNEOS.LIST} element={<Torneos />} />
                <Route path={APP_ROUTES.TORNEOS.NEW} element={<TorneoNuevo />} />
                <Route path={APP_ROUTES.TORNEOS.DETAILS_PATH} element={<TorneoDetalles />} />

                <Route path={APP_ROUTES.JUGADORES.LIST} element={<Jugadores />} />
                <Route path={APP_ROUTES.JUGADORES.PROFILE_PATH} element={<JugadorPerfil />} />

                <Route path={APP_ROUTES.PARTIDOS} element={<Partidos />} />
                <Route path={APP_ROUTES.ESTADISTICAS} element={<Estadisticas />} />

                <Route path={APP_ROUTES.MI_CLUB} element={<MiClub />} />
                <Route path={APP_ROUTES.ADMIN_PANEL} element={<AdminPanel />} />

                <Route path={APP_ROUTES.EJERCICIOS.LIST} element={<Ejercicios />} />
                <Route path={APP_ROUTES.EJERCICIOS.NEW} element={<EjercicioNuevo />} />
                <Route path={APP_ROUTES.ENTRENAMIENTOS.NEW_PATH} element={<PlanNuevo />} />
                <Route path={APP_ROUTES.ENTRENAMIENTOS.DETAILS_PATH} element={<PlanDetalles />} />
                <Route
                  path={APP_ROUTES.ENTRENAMIENTOS_GENERALES}
                  element={<EntrenamientosGenerales />}
                />
                <Route
                  path={APP_ROUTES.ENTRENAMIENTOS.SESSION_PATH}
                  element={<SessionDetalles />}
                />
                <Route path={APP_ROUTES.ANALISIS.LIST} element={<AnalisisList />} />
                <Route path={APP_ROUTES.ANALISIS.TRACKER_PATH} element={<ManualMatchTracker />} />
                <Route path={APP_ROUTES.EQUIPOS.LIST} element={<Equipos />} />
                <Route path={APP_ROUTES.EQUIPOS.NEW} element={<EquipoNuevo />} />
                <Route path={APP_ROUTES.EQUIPOS.DETAILS_PATH} element={<EquipoDetalles />} />
                <Route path={APP_ROUTES.FEEDBACK} element={<FeedbackPage />} />
              </Route>
            </Route>
          </Route>

          {/* Comodín de Redirección Segura */}
          <Route path="*" element={<Navigate to={APP_ROUTES.HOME} replace />} />
        </Routes>
      </ModalsProvider>
    </>
  );
}

// Componente principal que envuelve el Router
export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
