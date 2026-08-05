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
import { App as CapApp } from '@capacitor/app';
import { APP_ROUTES } from './constants/routes';

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
