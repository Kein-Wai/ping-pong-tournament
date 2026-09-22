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
  Modal,
  Select,
  Button,
  Stack,
  Badge,
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
  IconBook,
  IconCalendarEvent,
  IconShield,
  IconBug,
} from '@tabler/icons-react';
import DICTIONARY from '../../constants/dictionary.json';
import { APP_ROUTES } from '../../constants/routes';
import { getPlayerAvatar } from '../../utils/avatar';
import { useState, useEffect } from 'react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';

export const MainLayout = () => {
  const [opened, { toggle }] = useDisclosure();
  const { user, logout, updateUserFields } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [hand, setHand] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [notificationsBadge, setNotificationsBadge] = useState({
    pendingMembers: 0,
    pendingTournaments: 0,
  });

  const fetchNotifications = () => {
    if (user?.role === 'AdminClub' && user?.clubId) {
      api
        .get(ENDPOINTS.CLUBS.NOTIFICATIONS(user.clubId))
        .then((res) => setNotificationsBadge(res.data.data))
        .catch(console.error);
    }
  };

  // Llamada para obtener notificaciones si es Entrenador
  useEffect(() => {
    fetchNotifications(); // Carga inicial

    // 👇 Queda a la escucha de cualquier aviso del resto de la app
    window.addEventListener('refresh-notifications', fetchNotifications);
    return () => window.removeEventListener('refresh-notifications', fetchNotifications);
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'Player' && (!user.dominantHand || !user.playstyle)) {
      setOnboardingOpen(true);
    } else {
      setOnboardingOpen(false);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate(APP_ROUTES.LOGIN);
  };

  const handleCompleteOnboarding = async () => {
    if (!hand || !style) return;
    setSavingOnboarding(true);
    try {
      await api.put(ENDPOINTS.USERS.ME, {
        dominantHand: hand,
        playstyle: style,
      });
      updateUserFields({ dominantHand: hand as any, playstyle: style as any });
      setOnboardingOpen(false);
    } catch (error) {
      console.error('Error guardando perfil:', error);
    } finally {
      setSavingOnboarding(false);
    }
  };

  // --- VARIABLES DE CONDICIÓN ---
  const isSuperAdmin = user?.role === 'SuperAdmin';
  const isAdminClub = user?.role === 'AdminClub';
  const isPlayer = user?.role === 'Player';
  const hasApprovedClub = user?.clubStatus === 'Aprobado' && !!user?.clubId;

  // --- ESTRUCTURA DECLARATIVA DEL MENÚ ---
  // Aquí defines el ORDEN EXACTO. El array se filtrará dejando solo las que cumplan "show: true"
  const navItemsDefinition = [
    {
      label: 'Inicio',
      icon: IconHome,
      path: APP_ROUTES.HOME,
      show: true,
    },
    {
      label: 'Panel Global',
      icon: IconSettings,
      path: APP_ROUTES.ADMIN_PANEL,
      show: isSuperAdmin,
    },
    {
      label: 'Mi Club',
      icon: IconBuildingCommunity,
      path: APP_ROUTES.MI_CLUB,
      show: isAdminClub,
    },
    {
      label: 'Equipos',
      icon: IconShield,
      path: APP_ROUTES.EQUIPOS.LIST,
      show: isAdminClub || (isPlayer && hasApprovedClub),
    },
    {
      label: 'Unirse a un Club',
      icon: IconBuildingCommunity,
      path: APP_ROUTES.CLUB_SELECTION,
      show: isPlayer && !hasApprovedClub,
    },
    {
      label: 'Mi Perfil',
      icon: IconUser,
      path: APP_ROUTES.JUGADORES.PROFILE(user?.id || ''),
      show: !!user?.id && isPlayer,
    },
    {
      label: 'Jugadores',
      icon: IconUsers,
      path: APP_ROUTES.JUGADORES.LIST,
      show: isSuperAdmin || isAdminClub || (isPlayer && hasApprovedClub),
      badge: notificationsBadge.pendingMembers > 0 ? notificationsBadge.pendingMembers : null, // 👈 AÑADIDO
    },
    {
      label: 'Torneos',
      icon: IconTrophy,
      path: APP_ROUTES.TORNEOS.LIST,
      show: true,
      badge:
        notificationsBadge.pendingTournaments > 0 ? notificationsBadge.pendingTournaments : null, // 👈 AÑADIDO
    },
    {
      label: 'Entrenamientos Grupales',
      icon: IconCalendarEvent,
      // @ts-ignore - Ignoramos temporalmente si TypeScript no encuentra la ruta, asumiendo que la has creado en constants
      path: APP_ROUTES.ENTRENAMIENTOS_GENERALES || '/entrenamientos-generales',
      show: isAdminClub,
    },
    {
      label: 'Ejercicios',
      icon: IconBook,
      path: APP_ROUTES.EJERCICIOS.LIST,
      show: isAdminClub || isSuperAdmin,
    },
    {
      label: 'Análisis Pro',
      icon: IconChartBar,
      path: APP_ROUTES.ANALISIS.LIST,
      show: !!user?.id && isPlayer,
    },
    {
      label: 'Historial',
      icon: IconHistory,
      path: APP_ROUTES.PARTIDOS,
      show: isSuperAdmin || isAdminClub || (isPlayer && hasApprovedClub),
    },
    {
      label: 'Estadísticas',
      icon: IconChartBar,
      path: APP_ROUTES.ESTADISTICAS,
      show: isSuperAdmin || isAdminClub || (isPlayer && hasApprovedClub),
    },
    {
      label: isSuperAdmin ? 'Bandeja de Soporte' : 'Sugerencias y Bugs',
      icon: IconBug,
      path: APP_ROUTES.FEEDBACK,
      show: true,
    },
  ];

  // Filtramos la lista eliminando todo lo que tenga show: false
  const navItems = navItemsDefinition.filter((item) => item.show);

  return (
    <AppShell
      header={{ height: 'calc(60px + env(safe-area-inset-top))' }}
      navbar={{ width: 250, breakpoint: 'md', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />
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
                  <Avatar
                    src={getPlayerAvatar(user?.name || 'U', user?.avatarUrl)}
                    radius="xl"
                    size="sm"
                  />
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
            rightSection={
              item.badge ? (
                <Badge color="red" variant="filled" size="sm" circle>
                  {item.badge}
                </Badge>
              ) : null
            }
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

      {/* --- MODAL ONBOARDING JUGADOR --- */}
      <Modal
        opened={onboardingOpen}
        onClose={() => {}} // Vacío para que no se pueda cerrar con ESC
        withCloseButton={false} // Quitamos la "X"
        closeOnClickOutside={false} // No se cierra al hacer clic fuera
        title={
          <Text fw={900} size="lg">
            ¡Último paso, {user?.name}!
          </Text>
        }
        centered
        overlayProps={{ blur: 5, backgroundOpacity: 0.85 }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Para poder generar tus estadísticas avanzadas y emparejamientos, necesitamos conocer un
            poco más sobre tu perfil de jugador.
          </Text>

          <Select
            label="Mano Dominante"
            placeholder="¿Con qué mano juegas?"
            data={[
              { value: 'Diestro', label: 'Diestro (Derecha)' },
              { value: 'Zurdo', label: 'Zurdo (Izquierda)' },
            ]}
            value={hand}
            onChange={setHand}
            required
            allowDeselect={false}
          />

          <Select
            label="Estilo de Juego Principal"
            placeholder="¿Cómo te defines en la mesa?"
            data={[
              { value: 'Ofensivo', label: 'Ofensivo (Ataque, Top Spin)' },
              { value: 'Defensivo', label: 'Defensivo (Bloqueo, Corte)' },
            ]}
            value={style}
            onChange={setStyle}
            required
            allowDeselect={false}
          />

          <Button
            color="blue"
            fullWidth
            mt="md"
            onClick={handleCompleteOnboarding}
            loading={savingOnboarding}
            disabled={!hand || !style}
          >
            Completar mi Perfil
          </Button>
        </Stack>
      </Modal>
    </AppShell>
  );
};
