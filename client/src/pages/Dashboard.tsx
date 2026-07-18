import { Title, Text, Button } from '@mantine/core';
import { useAuthStore } from '../store/authStore';

export const Dashboard = () => {
  const { user, logout } = useAuthStore();

  return (
    <div>
      <Title order={2}>¡Bienvenido, {user?.name}!</Title>
      <Text>Tu rol es: {user?.role}</Text>

      <Button mt="md" color="red" onClick={logout}>
        Cerrar Sesión
      </Button>
    </div>
  );
};
