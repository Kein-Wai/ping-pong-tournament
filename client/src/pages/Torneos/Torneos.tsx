import { useEffect, useState } from 'react';
import {
  Card,
  SimpleGrid,
  Title,
  Text,
  Badge,
  Button,
  Group,
  Center,
  Loader,
  Stack,
  TextInput,
  Pagination,
  Select,
} from '@mantine/core';
import {
  IconCalendar,
  IconUsers,
  IconTrophy,
  IconSearch,
  IconFilter,
  IconTournament,
  IconBuildingCommunity,
  IconPlus,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { ENDPOINTS } from '../../api/endpoints';

// Interfaz actualizada con soporte Multi-tenant
interface Tournament {
  id: string;
  name: string;
  dateStart: string;
  numPlayers: number;
  typeTournament: string | null;
  levelTournament: string | null;
  rounds: string | null;
  status: string | null;
  clubId: string | null;
  club?: {
    name: string;
  } | null;
}

const ITEMS_PER_PAGE = 10;

export const Torneos = () => {
  const { user } = useAuthStore();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [page, setPage] = useState(1);

  // Comprobación de rol para permisos de creación
  const canCreateTournament = user?.role === 'SuperAdmin' || user?.role === 'AdminClub';

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await api.get(ENDPOINTS.TOURNAMENTS.BASE);
        const data = response.data.data || response.data;
        if (Array.isArray(data)) {
          setTournaments(data);
        }
      } catch (error) {
        console.error('Error cargando torneos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  // 1. Filtrado Combinado (Búsqueda + Estado)
  const filteredTournaments = tournaments.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 2. Paginación
  const totalPages = Math.ceil(filteredTournaments.length / ITEMS_PER_PAGE);
  const paginatedTournaments = filteredTournaments.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const availableStatuses = [
    'Todos',
    ...Array.from(new Set(tournaments.map((t) => t.status).filter(Boolean))),
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.currentTarget.value);
    setPage(1);
  };

  const handleStatusChange = (value: string | null) => {
    setStatusFilter(value || 'Todos');
    setPage(1);
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="blue" type="bars" />
      </Center>
    );
  }

  const getStatusColor = (status: string | null) => {
    if (!status) return 'gray';
    if (status === 'Programado') return 'blue';
    if (status === 'Completado') return 'green';
    if (status === 'Cancelado') return 'red';
    return 'orange';
  };

  return (
    <Stack gap="lg">
      {/* Cabecera Adaptativa con botón condicional */}
      <Group justify="space-between" align="center">
        <Title order={2}>Torneos</Title>
        {canCreateTournament && (
          <Button
            leftSection={<IconPlus size={16} />}
            color="blue"
            onClick={() => navigate('/torneos/nuevo')}
          >
            Crear Torneo
          </Button>
        )}
      </Group>

      {/* Barra de Búsqueda y Filtros */}
      <Group gap="md" align="flex-end">
        <TextInput
          placeholder="Buscar por nombre..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={handleSearchChange}
          style={{ flexGrow: 1, maxWidth: 400 }}
        />
        <Select
          leftSection={<IconFilter size={16} />}
          data={availableStatuses as string[]}
          value={statusFilter}
          onChange={handleStatusChange}
          style={{ width: 180 }}
        />
      </Group>

      {/* Cuadrícula de Torneos */}
      {paginatedTournaments.length === 0 ? (
        <Center py="xl">
          <Text c="dimmed">No se han encontrado torneos con estos filtros.</Text>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
          {paginatedTournaments.map((t) => (
            <Card
              key={t.id}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              display="flex"
              style={{ flexDirection: 'column' }}
            >
              <Card.Section withBorder inheritPadding py="xs">
                <Group justify="space-between" wrap="nowrap">
                  <Text fw={500} truncate title={t.name} style={{ flex: 1 }}>
                    {t.name}
                  </Text>
                  <Badge color={getStatusColor(t.status)} variant="light">
                    {t.status || 'Desconocido'}
                  </Badge>
                </Group>
              </Card.Section>

              <Stack gap="xs" mt="md" mb="md" style={{ flex: 1 }}>
                {/* Organizado por Club (Inyección Visual Multi-tenant) */}
                <Group gap="xs">
                  <IconBuildingCommunity
                    size={16}
                    stroke={1.5}
                    color="var(--mantine-color-blue-filled)"
                  />
                  <Text size="sm" fw={600} c="blue.6" truncate>
                    {t.club?.name || 'Torneo Global / SaaS'}
                  </Text>
                </Group>

                <Group gap="xs">
                  <IconCalendar size={16} stroke={1.5} color="var(--mantine-color-dimmed)" />
                  <Text size="sm" c="dimmed">
                    {new Date(t.dateStart).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </Group>
                <Group gap="xs">
                  <IconUsers size={16} stroke={1.5} color="var(--mantine-color-dimmed)" />
                  <Text size="sm" c="dimmed">
                    Plazas: {t.numPlayers} max.
                  </Text>
                </Group>
                <Group gap="xs">
                  <IconTrophy size={16} stroke={1.5} color="var(--mantine-color-dimmed)" />
                  <Text size="sm" c="dimmed">
                    {t.levelTournament || 'Mixto'} · {t.typeTournament || 'Interno'}
                  </Text>
                </Group>
                <Group gap="xs">
                  <IconTournament size={16} stroke={1.5} color="var(--mantine-color-dimmed)" />
                  <Text size="sm" c="dimmed">
                    {t.rounds === 'GruposKnockout' ? 'Grupos + Elim.' : t.rounds || 'Por definir'}
                  </Text>
                </Group>
              </Stack>

              <Button
                variant="light"
                color="blue"
                fullWidth
                mt="auto"
                onClick={() => navigate(`/torneos/${t.id}`)}
              >
                Ver Detalles
              </Button>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <Center mt="md">
          <Pagination total={totalPages} value={page} onChange={setPage} color="blue" withEdges />
        </Center>
      )}
    </Stack>
  );
};
