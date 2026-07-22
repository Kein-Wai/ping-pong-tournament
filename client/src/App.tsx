import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

import { APP_ROUTES } from './constants/routes'; // 👈 IMPORTADO

function App() {
  return (
    <BrowserRouter>
      <ModalsProvider>
        <Routes>
          {/* Ruta pública */}
          <Route path={APP_ROUTES.LOGIN} element={<Login />} />

          {/* Bloque de seguridad de Rutas Protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path={APP_ROUTES.SETUP_CLUB} element={<ClubSetup />} />

            <Route element={<RequireClubSetup />}>
              <Route element={<MainLayout />}>
                {/* Todas las páginas cuelgan del layout base sin colisiones */}
                <Route path={APP_ROUTES.HOME} element={<Dashboard />} />
                <Route path={APP_ROUTES.CLUB_SELECTION} element={<ClubSelection />} />

                <Route path={APP_ROUTES.TORNEOS.LIST} element={<Torneos />} />
                <Route path={APP_ROUTES.TORNEOS.NEW} element={<TorneoNuevo />} />
                <Route path={APP_ROUTES.TORNEOS.DETAILS_PATH} element={<TorneoDetalles />} />

                <Route path={APP_ROUTES.JUGADORES.LIST} element={<Jugadores />} />
                <Route path={APP_ROUTES.JUGADORES.PROFILE_PATH} element={<JugadorPerfil />} />

                <Route path={APP_ROUTES.PARTIDOS} element={<Partidos />} />
                <Route path={APP_ROUTES.ESTADISTICAS} element={<Estadisticas />} />

                {/* Paneles de Control */}
                <Route path={APP_ROUTES.MI_CLUB} element={<MiClub />} />
                <Route path={APP_ROUTES.ADMIN_PANEL} element={<AdminPanel />} />
              </Route>
            </Route>
          </Route>

          {/* Comodín de Redirección Segura */}
          <Route path="*" element={<Navigate to={APP_ROUTES.HOME} replace />} />
        </Routes>
      </ModalsProvider>
    </BrowserRouter>
  );
}

export default App;
