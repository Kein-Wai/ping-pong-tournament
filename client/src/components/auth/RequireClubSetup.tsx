import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';

export const RequireClubSetup = () => {
  const user = useAuthStore((state) => state.user);
  const { isAdminClub } = usePermissions();

  if (isAdminClub && !user?.clubId) {
    return <Navigate to="/setup-club" replace />;
  }

  return <Outlet />;
};
