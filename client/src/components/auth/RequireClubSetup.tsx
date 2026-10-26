import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { APP_ROUTES } from '../../constants/routes';

export const RequireClubSetup = () => {
  const user = useAuthStore((state) => state.user);
  const { isAdminClub } = usePermissions();

  if (isAdminClub && !user?.clubId) {
    return <Navigate to={APP_ROUTES.SETUP_CLUB} replace />;
  }

  return <Outlet />;
};
