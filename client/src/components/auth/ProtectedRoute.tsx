import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { APP_ROUTES } from '../../constants/routes';

export const ProtectedRoute = () => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to={APP_ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
};
