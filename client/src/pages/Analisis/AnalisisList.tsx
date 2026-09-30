import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stack,
  Title,
  Card,
  Button,
  Group,
  Text,
  Center,
  Loader,
  Modal,
  TextInput,
  Select,
  ThemeIcon,
  SimpleGrid,
  Badge,
  Pagination,
  ScrollArea,
  SegmentedControl,
} from '@mantine/core';
import { IconDeviceAnalytics, IconPlus, IconSearch, IconFilter } from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { DateInput } from '@mantine/dates';
import '@mantine/dates/styles.css';

const ITEMS_PER_PAGE = 8;

export const AnalisisList = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [currentSeason, setCurrentSeason] = useState<string>('');

  // Filtros y Paginación
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [page, setPage] = useState(1);

  // Formulario rápido
  const [opponentName, setOppName] = useState('');
  const [matchType, setMatchType] = useState('Amistoso');
  const [matchFormat, setMatchFormat] = useState<string>('Individual');
  const [analysisType, setAnalysisType] = useState<string>('Deep');
  const [initialStatus, setInitialStatus] = useState<string>('Programado'); // 👈 Programar vs Jugar
  const [opponentHand, setOpponentHand] = useState<string | null>(null);
  const [opponentStyle, setOpponentStyle] = useState<string | null>(null);
  const [opponentLevel, setOpponentLevel] = useState<string | null>(null);
  const [setsToWin, setSetsToWin] = useState<string>('3');
  const [matchDate, setMatchDate] = useState<Date | null>(new Date());

  useEffect(() => {
    Promise.all([api.get(ENDPOINTS.MANUAL_MATCHES.BASE), api.get(ENDPOINTS.SEASONS.BASE)])
      .then(([matchesRes, seasonsRes]) => {
        setMatches(matchesRes.data.data);
        const activeS = seasonsRes.data.data.find((s: any) => s.isCurrent);
        if (activeS) setCurrentSeason(activeS.name);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleStartMatch = async () => {
    setCreating(true);
    try {
      const res = await api.post(ENDPOINTS.MANUAL_MATCHES.BASE, {
        opponentName,
        matchType,
        location: 'Casa',
        format: matchFormat,
        analysisType,
        opponentHand,
        opponentStyle,
        opponentLevel,
        status: initialStatus, // 👈 Enviamos el estado elegido
        setsToWin: Number(setsToWin),
        date: matchDate ? matchDate.toISOString() : new Date().toISOString(),
      });
      navigate(APP_ROUTES.ANALISIS.TRACKER(res.data.data.id));
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  // Filtrado y Paginado
  const filteredMatches = matches.filter((m) => {
    const matchSearch = m.opponentName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'Todos' || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filteredMatches.length / ITEMS_PER_PAGE);
  const paginatedMatches = filteredMatches.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center" wrap="wrap">
        <Group gap="sm">
          <ThemeIcon size={40} radius="md" color="blue" variant="light">
            <IconDeviceAnalytics size={24} />
          </ThemeIcon>
          <div>
            <Title order={2}>Mis Análisis Pro</Title>
            <Badge color="grape" variant="light" size="xs">
              {currentSeason || 'Cargando temporada...'}
            </Badge>
          </div>
        </Group>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
          Nuevo Partido
        </Button>
      </Group>

      {/* FILTROS */}
      <Group gap="xs" align="center">
        <TextInput
          placeholder="Buscar rival..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setPage(1);
          }}
          style={{ flexGrow: 1, maxWidth: 300 }}
        />
        <Select
          leftSection={<IconFilter size={16} />}
          data={['Todos', 'Programado', 'Iniciado', 'Completado']}
          value={statusFilter}
          onChange={(val) => {
            setStatusFilter(val!);
            setPage(1);
          }}
          allowDeselect={false}
          style={{ width: 150 }}
        />
      </Group>

      {loading ? (
        <Center h={400}>
          <Loader color="blue" type="bars" />
        </Center>
      ) : matches.length === 0 ? (
        <Card withBorder shadow="sm" radius="md" padding="xl">
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconDeviceAnalytics size={48} color="var(--mantine-color-gray-4)" stroke={1.5} />
              <Text c="dimmed" size="md" fw={500}>
                Aún no hay análisis registrados.
              </Text>
              <Text c="dimmed" size="sm" ta="center" maw={400}>
                Lleva un control exhaustivo de tus partidos externos para descubrir tus puntos
                débiles y fortalezas.
              </Text>
              <Button variant="light" color="blue" mt="sm" onClick={() => setModalOpen(true)}>
                Crear mi primer análisis
              </Button>
            </Stack>
          </Center>
        </Card>
      ) : (
        <>
          <ScrollArea>
            <Stack gap="sm">
              {paginatedMatches.length === 0 ? (
                <Center py="xl">
                  <Text c="dimmed">No hay partidos con estos filtros.</Text>
                </Center>
              ) : (
                paginatedMatches.map((m) => (
                  <Card key={m.id} withBorder shadow="sm" radius="md">
                    <Group justify="space-between">
                      <div>
                        <Group gap="xs">
                          <Text fw={700} size="lg">
                            vs {m.opponentName}
                          </Text>
                          <Badge
                            color={
                              m.status === 'Programado'
                                ? 'orange'
                                : m.status === 'Completado'
                                  ? 'green'
                                  : 'blue'
                            }
                            variant="light"
                          >
                            {m.status}
                          </Badge>
                        </Group>
                        <Text c="dimmed" size="sm">
                          {m.date ? new Date(m.date).toLocaleDateString('es-ES') : 'Sin fecha'} ·
                          Formato: {m.format} · {m.matchType} ({m.analysisType})
                        </Text>
                      </div>
                      <Button
                        variant="light"
                        color={m.status === 'Programado' ? 'orange' : 'blue'}
                        onClick={() => navigate(APP_ROUTES.ANALISIS.TRACKER(m.id))}
                      >
                        {m.status === 'Completado'
                          ? 'Ver Reporte'
                          : m.status === 'Programado'
                            ? 'Planificar / Jugar'
                            : 'Continuar Arbitraje'}
                      </Button>
                    </Group>
                  </Card>
                ))
              )}
            </Stack>
          </ScrollArea>
          {totalPages > 1 && (
            <Center mt="md">
              <Pagination
                total={totalPages}
                value={page}
                onChange={setPage}
                color="blue"
                withEdges
              />
            </Center>
          )}
        </>
      )}

      {/* MODAL CONFIGURACIÓN PARTIDO */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={<Text fw={700}>Configurar Partido</Text>}
        centered
        size="lg"
      >
        <Stack gap="md">
          <SegmentedControl
            data={[
              { label: 'Planificar Pre-Partido', value: 'Programado' },
              { label: 'Empezar a Jugar Ya', value: 'Iniciado' },
            ]}
            value={initialStatus}
            onChange={setInitialStatus}
            color={initialStatus === 'Programado' ? 'orange' : 'blue'}
          />

          <SimpleGrid cols={2}>
            <DateInput
              label="Fecha del Partido"
              value={matchDate}
              onChange={(val) => setMatchDate(val ? new Date(val) : null)}
              maxDate={new Date()}
              clearable
            />
            <Select
              label="Nivel de Detalle"
              description="Light = Marcador | Deep = Puntos y Técnica"
              data={[
                { value: 'Light', label: 'Rápido (Light)' },
                { value: 'Deep', label: 'Profundo (Deep)' },
              ]}
              value={analysisType}
              onChange={(val) => setAnalysisType(val!)}
              allowDeselect={false}
              required
            />
          </SimpleGrid>

          <TextInput
            label="Nombre del Rival"
            required
            value={opponentName}
            onChange={(e) => setOppName(e.currentTarget.value)}
            data-autofocus
          />
          <SimpleGrid cols={2}>
            <Select
              label="Tipo de Partido"
              data={['Amistoso', 'Liga', 'Competicion']}
              value={matchType}
              onChange={(val) => setMatchType(val!)}
              allowDeselect={false}
            />
            <Select
              label="Formato"
              data={['Individual', 'Equipos']}
              value={matchFormat}
              onChange={(val) => setMatchFormat(val!)}
              allowDeselect={false}
            />
          </SimpleGrid>
          <SimpleGrid cols={2}>
            <Select
              label="Mano del Rival"
              data={['Diestro', 'Zurdo']}
              value={opponentHand}
              onChange={setOpponentHand}
              clearable
            />
            <Select
              label="Estilo del Rival"
              data={['Ofensivo', 'Defensivo']}
              value={opponentStyle}
              onChange={setOpponentStyle}
              clearable
            />
          </SimpleGrid>
          <SimpleGrid cols={2}>
            <Select
              label="Nivel del Rival"
              data={['Peor', 'Igual', 'Mejor']}
              value={opponentLevel}
              onChange={setOpponentLevel}
              clearable
            />
            <Select
              label="Formato al mejor de..."
              data={[
                { value: '2', label: 'Mejor de 3 Sets (2 para ganar)' },
                { value: '3', label: 'Mejor de 5 Sets (3 para ganar)' },
                { value: '4', label: 'Mejor de 7 Sets (4 para ganar)' },
              ]}
              value={setsToWin}
              onChange={(val) => setSetsToWin(val!)}
              allowDeselect={false}
            />
          </SimpleGrid>

          <Button
            color="blue"
            fullWidth
            onClick={handleStartMatch}
            loading={creating}
            disabled={!opponentName}
          >
            {initialStatus === 'Programado' ? 'Crear y Planificar' : 'Ir a la mesa'}
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
};
