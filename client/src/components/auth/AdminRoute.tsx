import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const AdminRoute = () => {
  const user = useAuthStore((state) => state.user);

  if (user && user.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
