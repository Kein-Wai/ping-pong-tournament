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
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';

// Interfaz sincronizada con tu modelo Tournament de Prisma
interface Tournament {
  id: string;
  name: string;
  dateStart: string;
  numPlayers: number;
  typeTournament: string | null;
  levelTournament: string | null;
  rounds: string | null;
  status: string | null;
}

const ITEMS_PER_PAGE = 10;

export const Torneos = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await api.get('/tournaments');
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

  // Extraer los estados únicos que existen actualmente en la base de datos para el Select
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

  // Soporte para los nuevos Enum de tu base de datos (Grupos, Final, R16avos, etc.)
  const getStatusColor = (status: string | null) => {
    if (!status) return 'gray';
    if (status === 'Programado') return 'blue';
    if (status === 'Completado') return 'green';
    if (status === 'Cancelado') return 'red';
    return 'orange'; // Cualquier estado en juego (Iniciado, Grupos, Cuartos, etc.)
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Torneos</Title>
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
