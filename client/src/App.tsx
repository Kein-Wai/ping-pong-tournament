import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Jugadores } from './pages/Jugadores/Jugadores';
import { JugadorPerfil } from './pages/Jugadores/JugadorPerfil';
import { Torneos } from './pages/Torneos/Torneos';
import { TorneoDetalles } from './pages/Torneos/TorneoDetalles';
import { Partidos } from './pages/Partidos/Partidos';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/torneos" element={<div>{<Torneos />}</div>} />
            <Route path="/torneos/:id" element={<div>{<TorneoDetalles />}</div>} />
            <Route path="/jugadores" element={<Jugadores />} />
            <Route path="/historial" element={<Partidos />} />
            <Route path="/estadisticas" element={<div>Página de Estadísticas</div>} />
            <Route path="/jugadores/:id" element={<JugadorPerfil />} />
            <Route path="/admin" element={<div>Panel de Administración</div>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
