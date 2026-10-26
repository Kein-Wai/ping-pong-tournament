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
  TextInput,
  SimpleGrid,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
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
  IconCalendarStats,
  IconReportAnalytics,
} from '@tabler/icons-react';
import DICTIONARY from '../../constants/dictionary.json';
import { APP_ROUTES } from '../../constants/routes';
import { getPlayerAvatar } from '../../utils/avatar';
import { useState, useEffect, useCallback } from 'react';
import { clubsService } from '../../api/services/clubs';
import { usersService } from '../../api/services/users';
import type { DominantHand, Playstyle, RubberType } from '../../types/enums';
import { DateInput } from '@mantine/dates';
import '@mantine/dates/styles.css';
import { notifications } from '@mantine/notifications';

export const MainLayout = () => {
  const [opened, { toggle }] = useDisclosure();
  const { user, logout, updateUserFields } = useAuthStore();
  const { isSuperAdmin, isAdminClub, isPlayer } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'light';

  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [hand, setHand] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [rubberForehand, setRubberForehand] = useState<string | null>(null);
  const [rubberBackhand, setRubberBackhand] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [notificationsBadge, setNotificationsBadge] = useState({
    pendingMembers: 0,
    pendingTournaments: 0,
  });

  const [forcePasswordOpen, setForcePasswordOpen] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  const clubId = user?.clubId;
  const fetchNotifications = useCallback(() => {
    if (isAdminClub && clubId) {
      clubsService
        .notifications(clubId)
        .then((badge) => setNotificationsBadge(badge))
        .catch(() => {
          // El interceptor de api/axios ya notifica el error.
        });
    }
  }, [isAdminClub, clubId]);

  useEffect(() => {
    fetchNotifications();
    window.addEventListener('refresh-notifications', fetchNotifications);
    return () => window.removeEventListener('refresh-notifications', fetchNotifications);
  }, [user, fetchNotifications]);

  // --- LÓGICA ONBOARDING BLINDADA ---
  useEffect(() => {
    if (!user) return;

    const hasCompletedLocal = localStorage.getItem(`onboarding_done_${user.id}`);

    if (user.forcePasswordChange) {
      setForcePasswordOpen(true);
    } else {
      setForcePasswordOpen(false);
    }

    if (
      isPlayer &&
      !hasCompletedLocal &&
      (!user.dominantHand ||
        !user.playstyle ||
        !user.birthDate ||
        !user.rubberForehand ||
        !user.rubberBackhand)
    ) {
      setOnboardingOpen(true);
    } else {
      setOnboardingOpen(false);
    }
  }, [user, isPlayer]);

  const handleForcePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      return notifications.show({
        title: 'Error',
        message: 'Las contraseñas no coinciden.',
        color: 'red',
      });
    }
    const isStrong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,32}$/.test(passwords.new);
    if (!isStrong) {
      return notifications.show({
        title: 'Contraseña débil',
        message:
          'Debe tener mín. 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial (@$!%*?&).',
        color: 'red',
      });
    }
    setSavingPassword(true);
    try {
      await usersService.updateProfile({
        currentPassword: passwords.current,
        newPassword: passwords.new,
        confirmPassword: passwords.confirm,
      });
      updateUserFields({ forcePasswordChange: false });
      setForcePasswordOpen(false);
    } catch {
      // El interceptor de api/axios ya notifica el error.
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate(APP_ROUTES.LOGIN);
  };

  const handleCompleteOnboarding = async () => {
    if (!hand || !style || !birthDate || !rubberForehand || !rubberBackhand) return;
    setSavingOnboarding(true);
    try {
      await usersService.updateProfile({
        dominantHand: hand as DominantHand,
        playstyle: style as Playstyle,
        birthDate: birthDate.toISOString(),
        rubberForehand: rubberForehand as RubberType,
        rubberBackhand: rubberBackhand as RubberType,
      });

      updateUserFields({
        dominantHand: hand,
        playstyle: style,
        birthDate: birthDate.toISOString(),
        rubberForehand: rubberForehand,
        rubberBackhand: rubberBackhand,
      });

      // BLINDAJE: Marcamos en el navegador que ya lo hizo
      if (user?.id) localStorage.setItem(`onboarding_done_${user.id}`, 'true');
      setOnboardingOpen(false);
    } catch (error) {
      console.error('Error guardando perfil:', error);
      if (user?.id) localStorage.setItem(`onboarding_done_${user.id}`, 'true');
      setOnboardingOpen(false);
    } finally {
      setSavingOnboarding(false);
    }
  };

  // --- VARIABLES DE CONDICIÓN BLINDADAS ---

  // SOLUCIÓN: Condición amplia e insensible a mayúsculas
  const hasApprovedClub =
    !!user?.clubId &&
    user?.clubStatus?.toLowerCase() !== 'pendiente' &&
    user?.clubStatus?.toLowerCase() !== 'rechazado';

  const navItemsDefinition = [
    { label: 'Inicio', icon: IconHome, path: APP_ROUTES.HOME, show: true },
    { label: 'Panel Global', icon: IconSettings, path: APP_ROUTES.ADMIN_PANEL, show: isSuperAdmin },
    {
      label: 'Mi Club',
      icon: IconBuildingCommunity,
      path: APP_ROUTES.MI_CLUB,
      show: isAdminClub || (isPlayer && hasApprovedClub),
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
      badge: notificationsBadge.pendingMembers > 0 ? notificationsBadge.pendingMembers : null,
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
      label: 'Torneos',
      icon: IconTrophy,
      path: APP_ROUTES.TORNEOS.LIST,
      show: true,
      badge:
        notificationsBadge.pendingTournaments > 0 ? notificationsBadge.pendingTournaments : null,
    },
    {
      label: 'Calendario Oficial',
      icon: IconCalendarStats,
      path: APP_ROUTES.CALENDARIO,
      show: isSuperAdmin || isAdminClub || (isPlayer && hasApprovedClub),
    },
    {
      label: 'Entrenamientos Grupales',
      icon: IconCalendarEvent,
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
      label: 'Análisis Pro',
      icon: IconReportAnalytics,
      path: APP_ROUTES.ANALISIS.LIST,
      show: !!user?.id && isPlayer,
    },
    {
      label: isSuperAdmin ? 'Bandeja de Soporte' : 'Sugerencias y Bugs',
      icon: IconBug,
      path: APP_ROUTES.FEEDBACK,
      show: true,
    },
  ];

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
                leftSection={isDark ? <IconMoon size={16} /> : <IconSun size={16} />}
                onClick={() => toggleColorScheme()}
              >
                Modo {isDark ? 'Oscuro' : 'Claro'}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={handleLogout}>
                Cerrar Sesión
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

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

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      {/* MODALES */}
      <Modal
        opened={onboardingOpen}
        onClose={() => {}}
        withCloseButton={false}
        closeOnClickOutside={false}
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
            Para poder generar tus estadísticas avanzadas, necesitamos conocer un poco más sobre tu
            perfil.
          </Text>
          <DateInput
            label="Fecha de Nacimiento"
            value={birthDate}
            onChange={(value) => setBirthDate(value ? new Date(value) : null)}
            required
            maxDate={new Date()}
            defaultLevel="decade"
          />
          <Select
            label="Mano Dominante"
            data={['Diestro', 'Zurdo']}
            value={hand}
            onChange={setHand}
            required
            allowDeselect={false}
          />
          <Select
            label="Estilo de Juego Principal"
            data={['Ofensivo', 'Defensivo']}
            value={style}
            onChange={setStyle}
            required
            allowDeselect={false}
          />
          <SimpleGrid cols={2}>
            <Select
              label="Goma Derecha"
              data={['LISA', 'PICOS_CORTOS', 'PICOS_MEDIOS', 'PICOS_LARGOS', 'ANTISPIN']}
              value={rubberForehand}
              onChange={setRubberForehand}
              required
              allowDeselect={false}
            />
            <Select
              label="Goma Revés"
              data={['LISA', 'PICOS_CORTOS', 'PICOS_MEDIOS', 'PICOS_LARGOS', 'ANTISPIN']}
              value={rubberBackhand}
              onChange={setRubberBackhand}
              required
              allowDeselect={false}
            />
          </SimpleGrid>
          <Button
            color="blue"
            fullWidth
            mt="md"
            onClick={handleCompleteOnboarding}
            loading={savingOnboarding}
            disabled={!hand || !style || !rubberForehand || !rubberBackhand || !birthDate}
          >
            Completar mi Perfil
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={forcePasswordOpen}
        onClose={() => {}}
        withCloseButton={false}
        closeOnClickOutside={false}
        title={
          <Text fw={900} size="lg" c="orange">
            Cambio de Contraseña
          </Text>
        }
        centered
        overlayProps={{ blur: 5, backgroundOpacity: 0.85 }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Debes establecer tu propia contraseña ahora por seguridad.
          </Text>
          <TextInput
            type="password"
            label="Contraseña Temporal"
            required
            value={passwords.current}
            onChange={(e) => setPasswords({ ...passwords, current: e.currentTarget.value })}
          />
          <TextInput
            type="password"
            label="Nueva Contraseña"
            required
            value={passwords.new}
            onChange={(e) => setPasswords({ ...passwords, new: e.currentTarget.value })}
          />
          <TextInput
            type="password"
            label="Confirmar Nueva Contraseña"
            required
            value={passwords.confirm}
            onChange={(e) => setPasswords({ ...passwords, confirm: e.currentTarget.value })}
          />
          <Button
            color="orange"
            fullWidth
            mt="md"
            onClick={handleForcePasswordChange}
            loading={savingPassword}
            disabled={!passwords.current || !passwords.new || passwords.new !== passwords.confirm}
          >
            Actualizar y Entrar
          </Button>
        </Stack>
      </Modal>
    </AppShell>
  );
};
