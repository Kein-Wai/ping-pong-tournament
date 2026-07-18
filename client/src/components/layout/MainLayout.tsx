import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  Menu,
  Avatar,
  UnstyledButton,
  useMantineColorScheme,
  ActionIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  IconHome,
  IconTrophy,
  IconUsers,
  IconHistory,
  IconChartBar,
  IconLogout,
  IconSettings,
  IconSun,
  IconMoon,
} from '@tabler/icons-react';
import DICTIONARY from '../../constants/dictionary.json';

export const MainLayout = () => {
  // Manejamos el estado de abierto/cerrado del menú en móviles
  const [opened, { toggle }] = useDisclosure();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation(); // Para saber en qué ruta estamos y marcar el menú activo
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Definimos las rutas del menú base (para todos los jugadores)
  const navItems = [
    { label: 'Inicio', icon: IconHome, path: '/' },
    { label: 'Torneos', icon: IconTrophy, path: '/torneos' },
    { label: 'Jugadores', icon: IconUsers, path: '/jugadores' },
    { label: 'Historial', icon: IconHistory, path: '/historial' },
    { label: 'Estadísticas', icon: IconChartBar, path: '/estadisticas' },
  ];

  // Si es Admin, le añadimos opciones extra
  if (user?.role === 'Admin') {
    navItems.push({ label: 'Administración', icon: IconSettings, path: '/admin' });
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      {/* --- HEADER --- */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            {/* Botón hamburguesa: Solo visible en móvil (escondido a partir de 'sm') */}
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text
              fw={900}
              size="xl"
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
            >
              {DICTIONARY.app_title}
            </Text>
          </Group>
          {/* Menú de Usuario en la esquina */}
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <UnstyledButton>
                <Group gap="xs">
                  <Avatar color="blue" radius="xl" size="sm">
                    {user?.name.charAt(0).toUpperCase()}
                  </Avatar>
                  {/* Ocultamos el nombre en móviles muy pequeños para ahorrar espacio */}
                  <Text size="sm" visibleFrom="xs" fw={500}>
                    {user?.name}
                  </Text>
                </Group>
              </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Opciones</Menu.Label>
              <Menu.Item
                leftSection={isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
                onClick={() => toggleColorScheme()}
              >
                Modo {isDark ? 'Claro' : 'Oscuro'}
              </Menu.Item>
              <Menu.Item leftSection={<IconSettings size={14} />}>Mi Perfil</Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={handleLogout}>
                Cerrar Sesión
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      {/* --- MENÚ LATERAL --- */}
      <AppShell.Navbar p="sm">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            label={item.label}
            leftSection={<item.icon size="1.2rem" stroke={1.5} />}
            active={location.pathname === item.path}
            onClick={() => {
              navigate(item.path);
              if (opened) toggle(); // Cierra el menú en móvil tras hacer clic
            }}
            style={{ borderRadius: 8, marginBottom: 4 }}
          />
        ))}
      </AppShell.Navbar>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <AppShell.Main>
        {/* Usamos el fondo ligeramente gris en tema claro para resaltar las tarjetas, 
            y lo ocultamos (darkHidden) para que el tema oscuro fluya natural. */}
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};
