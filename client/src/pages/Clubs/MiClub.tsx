import { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Button,
  Group,
  Stack,
  ThemeIcon,
  Badge,
  Center,
  Loader,
  TextInput,
  Autocomplete,
  SimpleGrid,
  Paper,
  ActionIcon,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconBuildingCommunity,
  IconMapPin,
  IconCalendar,
  IconUsers,
  IconEdit,
  IconDeviceFloppy,
  IconX,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { LOCALIZACIONES_ESPANA } from '../../constants/localizaciones';
import '@mantine/dates/styles.css';

interface ClubDetails {
  id: string;
  name: string;
  city: string;
  address: string | null;
  foundedAt: string | null;
  status: string;
  _count: {
    users: number;
  };
}

export const MiClub = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [club, setClub] = useState<ClubDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Estados del formulario
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [foundedAt, setFoundedAt] = useState<Date | null>(null);

  const fetchClubDetails = async () => {
    if (!user?.clubId) return;
    try {
      setLoading(true);
      const res = await api.get(ENDPOINTS.CLUBS.BY_ID(user.clubId));
      const data = res.data.data;
      setClub(data);

      // Sincronizar formulario
      setName(data.name);
      setCity(data.city);
      setAddress(data.address || '');
      setFoundedAt(data.foundedAt ? new Date(data.foundedAt) : null);
    } catch (error) {
      console.error('Error cargando los detalles del club:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.clubId]);

  const handleSave = async () => {
    if (!user?.clubId) return;
    setSaving(true);
    try {
      const payload = {
        name,
        city,
        address: address || null,
        foundedAt: foundedAt ? foundedAt.toISOString() : null,
      };

      await api.put(ENDPOINTS.CLUBS.UPDATE(user.clubId), payload);
      setIsEditing(false);
      await fetchClubDetails();
    } catch (error) {
      console.error('Error actualizando la sede:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="orange" type="bars" />
      </Center>
    );
  }

  if (!club) {
    return (
      <Center h={400}>
        <Text c="dimmed">No se pudo cargar la información del club.</Text>
      </Center>
    );
  }

  return (
    <Stack gap="xl" maw={800} mx="auto">
      <Group justify="space-between" align="center">
        <Title order={2}>Panel de Administración de Sede</Title>
        {!isEditing ? (
          <Button
            leftSection={<IconEdit size={16} />}
            color="orange"
            variant="light"
            onClick={() => setIsEditing(true)}
          >
            Editar Datos
          </Button>
        ) : (
          <Group gap="xs">
            <ActionIcon color="gray" variant="subtle" size="lg" onClick={() => setIsEditing(false)}>
              <IconX size={20} />
            </ActionIcon>
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              color="green"
              onClick={handleSave}
              loading={saving}
            >
              Guardar Cambios
            </Button>
          </Group>
        )}
      </Group>

      <Card shadow="sm" padding="xl" radius="md" withBorder>
        {!isEditing ? (
          <Stack gap="lg">
            <Group wrap="nowrap" align="flex-start">
              <ThemeIcon size={80} radius="md" color="orange" variant="light">
                <IconBuildingCommunity size={40} />
              </ThemeIcon>
              <div>
                <Title order={1}>{club.name}</Title>
                <Badge mt="xs" size="lg" color={club.status === 'Aprobado' ? 'green' : 'yellow'}>
                  Estado: {club.status}
                </Badge>
              </div>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" mt="md">
              <Paper
                withBorder
                p="md"
                radius="md"
                bg="var(--mantine-color-gray-0)"
                style={{ darkHidden: true }}
              >
                <Group gap="sm" mb="xs">
                  <IconMapPin size={20} color="var(--mantine-color-blue-6)" />
                  <Text fw={700}>Ubicación</Text>
                </Group>
                <Text size="sm">{club.city}</Text>
                <Text size="sm" c="dimmed">
                  {club.address || 'Sin dirección exacta registrada'}
                </Text>
              </Paper>

              <Paper
                withBorder
                p="md"
                radius="md"
                bg="var(--mantine-color-gray-0)"
                style={{ darkHidden: true }}
              >
                <Group gap="sm" mb="xs">
                  <IconCalendar size={20} color="var(--mantine-color-teal-6)" />
                  <Text fw={700}>Fundación</Text>
                </Group>
                <Text size="sm">
                  {club.foundedAt
                    ? new Date(club.foundedAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Fecha no registrada'}
                </Text>
              </Paper>
            </SimpleGrid>
          </Stack>
        ) : (
          <Stack gap="md">
            <TextInput
              label="Nombre Oficial del Club"
              required
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Autocomplete
                label="Ciudad base"
                required
                value={city}
                onChange={setCity}
                data={LOCALIZACIONES_ESPANA}
                limit={6}
                maxDropdownHeight={200}
              />
              <TextInput
                label="Dirección Completa"
                placeholder="Ej. Pabellón Municipal, Calle Mayor 12"
                value={address}
                onChange={(e) => setAddress(e.currentTarget.value)}
              />
            </SimpleGrid>
            <DateInput
              label="Fecha de Fundación"
              placeholder="¿Cuándo se fundó el club?"
              value={foundedAt}
              onChange={(val) => setFoundedAt(val ? new Date(val) : null)}
              clearable
              maxDate={new Date()}
            />
          </Stack>
        )}
      </Card>

      <Title order={3} mt="md">
        Resumen Operativo
      </Title>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        <Card withBorder padding="lg" radius="md" shadow="sm">
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
              Plantilla de Jugadores
            </Text>
            <ThemeIcon color="blue" variant="light" size={38} radius="md">
              <IconUsers size={24} />
            </ThemeIcon>
          </Group>
          <Group align="flex-end" gap="xs" mt={25}>
            <Text size="xl" fw={700}>
              {club._count.users}
            </Text>
          </Group>
          <Text size="sm" c="dimmed" mt={7}>
            Miembros totales asociados a la sede
          </Text>
          <Button
            variant="light"
            color="blue"
            fullWidth
            mt="md"
            onClick={() => navigate('/jugadores')}
          >
            Gestionar Solicitudes y Plantilla
          </Button>
        </Card>
      </SimpleGrid>
    </Stack>
  );
};
