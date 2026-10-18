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
  Tabs,
} from '@mantine/core';
import {
  IconDeviceAnalytics,
  IconPlus,
  IconSearch,
  IconClipboardList,
  IconPingPong,
} from '@tabler/icons-react';
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

  const [activeTab, setActiveTab] = useState<string | null>('analisis');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [opponentName, setOppName] = useState('');
  const [matchType, setMatchType] = useState('Amistoso');
  const [matchFormat, setMatchFormat] = useState<string>('Individual');
  const [analysisType, setAnalysisType] = useState<string>('Rapido');
  const [initialStatus, setInitialStatus] = useState<string>('Programado');
  const [opponentHand, setOpponentHand] = useState<string | null>(null);
  const [opponentStyle, setOpponentStyle] = useState<string | null>(null);
  const [opponentLevel, setOpponentLevel] = useState<string | null>(null);
  const [opponentRubberForehand, setOpponentRubberForehand] = useState<string | null>(null);
  const [opponentRubberBackhand, setOpponentRubberBackhand] = useState<string | null>(null);
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
    const finalOpponent = opponentName.trim() === '' ? 'Rival por determinar' : opponentName;

    try {
      const res = await api.post(ENDPOINTS.MANUAL_MATCHES.BASE, {
        opponentName: finalOpponent,
        matchType,
        location: 'Casa',
        format: matchFormat,
        analysisType: initialStatus === 'Programado' ? 'Rapido' : analysisType,
        opponentHand,
        opponentStyle,
        opponentLevel,
        opponentRubberForehand,
        opponentRubberBackhand,
        status: initialStatus,
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

  const filteredMatches = matches.filter((m) => {
    const matchSearch = m.opponentName?.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'planes' ? m.status === 'Programado' : m.status !== 'Programado';
    return matchSearch && matchTab;
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
            <Title order={2}>Análisis y Planes</Title>
            <Badge color="grape" variant="light" size="xs">
              {currentSeason || 'Cargando...'}
            </Badge>
          </div>
        </Group>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
          Nuevo Registro
        </Button>
      </Group>

      <Group justify="space-between" align="center" wrap="wrap">
        <Tabs
          value={activeTab}
          onChange={(val) => {
            setActiveTab(val);
            setPage(1);
          }}
          variant="outline"
          radius="md"
        >
          <Tabs.List>
            <Tabs.Tab value="analisis" leftSection={<IconPingPong size={16} />}>
              Análisis y Resultados
            </Tabs.Tab>
            <Tabs.Tab value="planes" leftSection={<IconClipboardList size={16} />}>
              Planificaciones Futuras
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
        <TextInput
          placeholder="Buscar rival..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setPage(1);
          }}
          style={{ width: 250 }}
        />
      </Group>

      {loading ? (
        <Center h={400}>
          <Loader color="blue" type="bars" />
        </Center>
      ) : (
        <>
          <ScrollArea>
            <Stack gap="sm">
              {paginatedMatches.length === 0 ? (
                <Center py="xl">
                  <Text c="dimmed">
                    No hay {activeTab === 'planes' ? 'planificaciones' : 'partidos'} registrados.
                  </Text>
                </Center>
              ) : (
                paginatedMatches.map((m) => (
                  <Card
                    key={m.id}
                    withBorder
                    shadow="sm"
                    radius="md"
                    style={{
                      borderLeft:
                        activeTab === 'planes'
                          ? '4px solid var(--mantine-color-orange-5)'
                          : '4px solid var(--mantine-color-blue-5)',
                    }}
                  >
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

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={<Text fw={700}>Configurar Partido / Plan</Text>}
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
              clearable
            />
            {initialStatus === 'Iniciado' && (
              <Select
                label="Nivel de Detalle"
                data={[
                  { value: 'Rapido', label: 'Rápido (Marcador global)' },
                  { value: 'Extenso', label: 'Extenso (Punto a Punto)' },
                ]}
                value={analysisType}
                onChange={(val) => setAnalysisType(val!)}
                allowDeselect={false}
                required
              />
            )}
          </SimpleGrid>

          <TextInput
            label="Nombre del Rival"
            description={
              initialStatus === 'Programado'
                ? 'Déjalo en blanco si aún no sabes contra quién juegas'
                : ''
            }
            required={initialStatus === 'Iniciado'}
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
            <Select
              label="Formato al mejor de..."
              data={[
                { value: '1', label: '1 Set Único (Sube y baja)' },
                { value: '2', label: 'Mejor de 3 Sets (2 para ganar)' },
                { value: '3', label: 'Mejor de 5 Sets (3 para ganar)' },
                { value: '4', label: 'Mejor de 7 Sets (4 para ganar)' },
              ]}
              value={setsToWin}
              onChange={(val) => setSetsToWin(val!)}
              allowDeselect={false}
            />
            <Select
              label="Nivel del Rival"
              data={['Peor', 'Igual', 'Mejor']}
              value={opponentLevel}
              onChange={setOpponentLevel}
              clearable
            />
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
            <Select
              label="Goma Derecha"
              data={['LISA', 'PICOS_CORTOS', 'PICOS_MEDIOS', 'PICOS_LARGOS', 'ANTISPIN']}
              value={opponentRubberForehand}
              onChange={setOpponentRubberForehand}
              clearable
            />
            <Select
              label="Goma Revés"
              data={['LISA', 'PICOS_CORTOS', 'PICOS_MEDIOS', 'PICOS_LARGOS', 'ANTISPIN']}
              value={opponentRubberBackhand}
              onChange={setOpponentRubberBackhand}
              clearable
            />
          </SimpleGrid>

          <Button
            color={initialStatus === 'Programado' ? 'orange' : 'blue'}
            fullWidth
            onClick={handleStartMatch}
            loading={creating}
            disabled={initialStatus === 'Iniciado' && !opponentName}
          >
            {initialStatus === 'Programado' ? 'Crear Plan General' : 'Ir a la mesa'}
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
};
