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
  IconBuildingCommunity,
  IconUser,
} from '@tabler/icons-react';
import DICTIONARY from '../../constants/dictionary.json';
import { APP_ROUTES } from '../../constants/routes'; // 👈 IMPORTADO

export const MainLayout = () => {
  const [opened, { toggle }] = useDisclosure();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const handleLogout = () => {
    logout();
    navigate(APP_ROUTES.LOGIN);
  };

  const isSuperAdmin = user?.role === 'SuperAdmin';
  const isAdminClub = user?.role === 'AdminClub';
  const isPlayer = user?.role === 'Player';
  const hasApprovedClub = user?.clubStatus === 'Aprobado' && user?.clubId;

  // --- CONSTRUCCIÓN DEL MENÚ SEGÚN TU JERARQUÍA ---
  const navItems: { label: string; icon: any; path: string }[] = [
    { label: 'Inicio', icon: IconHome, path: APP_ROUTES.HOME },
  ];

  if (user?.id && isPlayer) {
    navItems.push({
      label: 'Mi Perfil',
      icon: IconUser,
      path: APP_ROUTES.JUGADORES.PROFILE(user.id),
    });
  }

  navItems.push({ label: 'Torneos', icon: IconTrophy, path: APP_ROUTES.TORNEOS.LIST });

  // Restricción: Jugadores y Estadísticas solo si tienes club aprobado o eres Admin
  if (isSuperAdmin || isAdminClub || (isPlayer && hasApprovedClub)) {
    navItems.push(
      { label: 'Jugadores', icon: IconUsers, path: APP_ROUTES.JUGADORES.LIST },
      { label: 'Historial', icon: IconHistory, path: APP_ROUTES.PARTIDOS },
      { label: 'Estadísticas', icon: IconChartBar, path: APP_ROUTES.ESTADISTICAS },
    );
  }

  // Pestaña especial: Si eres Player libre, rechazado o pendiente, ves la lista para aplicar
  if (isPlayer && !hasApprovedClub) {
    navItems.push({
      label: 'Unirse a un Club',
      icon: IconBuildingCommunity,
      path: APP_ROUTES.CLUB_SELECTION,
    });
  }

  // Pestañas de gestión exclusivas
  if (isAdminClub) {
    navItems.push({ label: 'Mi Club', icon: IconBuildingCommunity, path: APP_ROUTES.MI_CLUB });
  }

  if (isSuperAdmin) {
    navItems.push({ label: 'Panel Global', icon: IconSettings, path: APP_ROUTES.ADMIN_PANEL });
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

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <UnstyledButton>
                <Group gap="xs">
                  <Avatar color="blue" radius="xl" size="sm">
                    {user?.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Text size="sm" visibleFrom="xs" fw={500}>
                    {user?.name}
                  </Text>
                </Group>
              </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Opciones</Menu.Label>
              {isPlayer && (
                <Menu.Item
                  leftSection={<IconUser size={16} />}
                  onClick={() => navigate(APP_ROUTES.JUGADORES.PROFILE(user?.id || ''))}
                >
                  Mi Perfil
                </Menu.Item>
              )}
              <Menu.Item
                leftSection={isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
                onClick={() => toggleColorScheme()}
              >
                Modo {isDark ? 'Claro' : 'Oscuro'}
              </Menu.Item>
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
              if (opened) toggle();
            }}
            style={{ borderRadius: 8, marginBottom: 4 }}
          />
        ))}
      </AppShell.Navbar>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};
