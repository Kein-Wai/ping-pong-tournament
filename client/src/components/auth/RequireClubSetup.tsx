import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const RequireClubSetup = () => {
  const user = useAuthStore((state) => state.user);

  if (user?.role === 'AdminClub' && !user.clubId) {
    return <Navigate to="/setup-club" replace />;
  }

  return <Outlet />;
};
