import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Title,
  Text,
  Group,
  Button,
  Center,
  Loader,
  Badge,
  Stack,
  Tabs,
  Paper,
  SimpleGrid,
  ThemeIcon,
  Table,
  Avatar,
  ScrollArea,
  Select,
  Modal,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconInfoCircle,
  IconUsers,
  IconTournament,
  IconListNumbers,
  IconCalendar,
  IconMedal,
  IconCheck,
  IconTrophy,
  IconEdit,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../api/axios';

// --- INTERFACES ---

interface Participant {
  id: string;
  registeredAt: string;
  status: string;
  player: {
    id: string;
    name: string;
    surname: string | null;
    stats: { elo: number | null } | null;
  };
}

interface Tournament {
  id: string;
  name: string;
  dateStart: string;
  numPlayers: number;
  typeTournament: string | null;
  levelTournament: string | null;
  rounds: string | null;
  status: string | null;
  typeKnockout: string | null;
  participants: Participant[];
}

interface Participant {
  id: string;
  registeredAt: string;
  status: string;
  player: {
    id: string;
    name: string;
    surname: string | null;
    stats: { elo: number | null } | null;
  };
}

interface TournamentClas {
  id: string;
  position: number | null;
  lastRound: string | null;
  player: { id: string; name: string; surname: string | null };
}

interface TournamentGroupClas {
  id: string;
  position: number;
  pointsClas: number;
  played: number;
  gamesWon: number;
  gamesLost: number;
  setsWon: number;
  setsLost: number;
  player: { id: string; name: string; surname: string | null };
  tournamentGroup: { group: number };
}

interface BracketPlayer {
  id: string;
  name: string;
  surname: string | null;
}

interface BracketMatch {
  id: string;
  status: string;
  playerOne: BracketPlayer | null;
  playerTwo: BracketPlayer | null;
  setOnePlayerOne: number | null;
  setOnePlayerTwo: number | null;
  setTwoPlayerOne: number | null;
  setTwoPlayerTwo: number | null;
  setThreePlayerOne: number | null;
  setThreePlayerTwo: number | null;
  setFourPlayerOne: number | null;
  setFourPlayerTwo: number | null;
  setFivePlayerOne: number | null;
  setFivePlayerTwo: number | null;
}

interface KnockoutRound {
  id: string;
  round: string;
  type: string;
  matches: BracketMatch[];
}

// NUEVAS INTERFACES PARA PARTIDOS DE GRUPOS
interface GroupMatch {
  id: string;
  status: string;
  setOnePlayerOne: number | null;
  setOnePlayerTwo: number | null;
  setTwoPlayerOne: number | null;
  setTwoPlayerTwo: number | null;
  setThreePlayerOne: number | null;
  setThreePlayerTwo: number | null;
  setFourPlayerOne: number | null;
  setFourPlayerTwo: number | null;
  setFivePlayerOne: number | null;
  setFivePlayerTwo: number | null;
  playerOne: BracketPlayer | null;
  playerTwo: BracketPlayer | null;
  group: { id: string; group: number } | null;
}

const KNOCKOUT_STAGES = [
  'R128avos',
  'R64avos',
  'R32avos',
  'R16avos',
  'Octavos',
  'Cuartos',
  'Semifinales',
  'Final',
];

export const TorneoDetalles = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // --- ESTADOS BASE ---
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  // --- ESTADOS DE PESTAÑAS (LAZY LOADING) ---
  const [activeTab, setActiveTab] = useState<string | null>('info');

  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [results, setResults] = useState<TournamentClas[] | null>(null);
  const [bracketA, setBracketA] = useState<KnockoutRound[] | null>(null);

  // Estados para Fase de Grupos
  const [groupsClas, setGroupsClas] = useState<TournamentGroupClas[] | null>(null);
  const [groupMatches, setGroupMatches] = useState<GroupMatch[] | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Partido del bracket seleccionado para ver el modal
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);

  // 1. CARGA INICIAL
  const fetchTournamentInfo = async () => {
    try {
      if (!id) return;
      const res = await api.get(`/tournaments/${id}`);
      const tData = res.data.data || res.data;
      setTournament(tData);

      if (tData.status === 'Completado') {
        setActiveTab('resultados');
      }
    } catch (error) {
      console.error('Error cargando el torneo:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournamentInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 2. EFECTO LAZY LOADING
  useEffect(() => {
    if (!id || !activeTab) return;

    const fetchLazyData = async () => {
      try {
        if (activeTab === 'inscritos' && participants === null) {
          const res = await api.get(`/tournaments/${id}/participants`);
          setParticipants(res.data.data);
        } else if (activeTab === 'resultados' && results === null) {
          const res = await api.get(`/tournaments/${id}/classifications`);
          setResults(res.data.data);
        } else if (activeTab === 'grupos' && (groupsClas === null || groupMatches === null)) {
          // Cargamos clasificaciones Y partidos al mismo tiempo
          const [resClas, resMatches] = await Promise.all([
            api.get(`/tournaments/${id}/groups/classifications`),
            api.get(`/tournaments/${id}/groups/matches`),
          ]);

          const clasData = resClas.data.data;
          setGroupsClas(clasData);
          setGroupMatches(resMatches.data.data);

          // Si hay grupos, seleccionamos el primero (Grupo 1) por defecto
          if (clasData.length > 0) {
            const firstGroupNum = String(clasData[0].tournamentGroup.group);
            setSelectedGroup(firstGroupNum);
          }
        } else if (activeTab === 'bracketA' && bracketA === null) {
          const res = await api.get(`/tournaments/${id}/bracket?type=A`);
          setBracketA(res.data.data);
        }
      } catch (error) {
        console.error(`Error cargando datos para la pestaña ${activeTab}:`, error);
      }
    };

    fetchLazyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id]);

  // --- 3. OPTIMIZACIÓN: CÁLCULOS EN CACHÉ (useMemo) ---

  // A. Procesamos el podio y el resto de resultados
  const { firstPlace, secondPlace, thirdPlace, otherResults } = useMemo<{
    firstPlace: TournamentClas | null;
    secondPlace: TournamentClas | null;
    thirdPlace: TournamentClas | null;
    otherResults: TournamentClas[];
  }>(() => {
    let firstPlace: TournamentClas | null = null;
    let secondPlace: TournamentClas | null = null;
    let thirdPlace: TournamentClas | null = null;
    const otherResults: TournamentClas[] = [];

    if (!results) return { firstPlace, secondPlace, thirdPlace, otherResults };

    results.forEach((p) => {
      if (p.position === 1) {
        firstPlace = p;
      } else if (p.position === 2) {
        secondPlace = p;
      } else if (p.position === 3 && !thirdPlace) {
        thirdPlace = p;
      } else {
        otherResults.push(p);
      }
    });

    otherResults.sort((a, b) => (a.position || 0) - (b.position || 0));
    return { firstPlace, secondPlace, thirdPlace, otherResults };
  }, [results]);

  // B. Opciones del Dropdown de Grupos
  const groupOptions = useMemo(() => {
    if (!groupsClas) return [];
    // Sacamos los números de grupo únicos
    const uniqueGroups = Array.from(new Set(groupsClas.map((c) => c.tournamentGroup.group))).sort(
      (a, b) => a - b,
    );
    return uniqueGroups.map((g) => ({ value: String(g), label: `Grupo ${g}` }));
  }, [groupsClas]);

  // C. Datos del grupo actualmente seleccionado (Clasificación y Partidos)
  const currentGroupClas = useMemo(() => {
    if (!groupsClas || !selectedGroup) return [];
    return groupsClas
      .filter((c) => String(c.tournamentGroup.group) === selectedGroup)
      .sort((a, b) => a.position - b.position);
  }, [groupsClas, selectedGroup]);

  const currentGroupMatches = useMemo(() => {
    if (!groupMatches || !selectedGroup) return [];
    return groupMatches.filter((m) => String(m.group?.group) === selectedGroup);
  }, [groupMatches, selectedGroup]);

  // HELPER: Formatear sets de un partido completado
  const formatSets = (match: GroupMatch) => {
    if (match.status !== 'Completado')
      return (
        <Badge color="gray" variant="light">
          {match.status}
        </Badge>
      );

    const sets = [];
    if (match.setOnePlayerOne !== null || match.setOnePlayerTwo !== null)
      sets.push(`${match.setOnePlayerOne}-${match.setOnePlayerTwo}`);
    if (match.setTwoPlayerOne !== null || match.setTwoPlayerTwo !== null)
      sets.push(`${match.setTwoPlayerOne}-${match.setTwoPlayerTwo}`);
    if (match.setThreePlayerOne !== null || match.setThreePlayerTwo !== null)
      sets.push(`${match.setThreePlayerOne}-${match.setThreePlayerTwo}`);
    if (match.setFourPlayerOne !== null || match.setFourPlayerTwo !== null)
      sets.push(`${match.setFourPlayerOne}-${match.setFourPlayerTwo}`);
    if (match.setFivePlayerOne !== null || match.setFivePlayerTwo !== null)
      sets.push(`${match.setFivePlayerOne}-${match.setFivePlayerTwo}`);

    // Filtramos los 0-0 por si el backend mandó campos vacíos
    return (
      <Text fw={600} size="sm" c="blue.7">
        {sets.filter((s) => s !== '0-0').join(' | ')}
      </Text>
    );
  };

  // --- LÓGICA DE RENDERIZADO ---
  if (loading)
    return (
      <Center h={400}>
        <Loader color="blue" type="bars" />
      </Center>
    );
  if (!tournament)
    return (
      <Center h={400}>
        <Text c="dimmed">Torneo no encontrado.</Text>
      </Center>
    );

  const currentStatus = tournament.status || '';
  const isProgramado = currentStatus === 'Programado';
  const isGrupos = currentStatus === 'Grupos';
  const isKnockoutPhase = KNOCKOUT_STAGES.includes(currentStatus);
  const isCompletado = currentStatus === 'Completado';

  const hasGroupsFormat =
    tournament.rounds === 'GruposKnockout' || tournament.rounds === 'TodosvsTodos';
  const hasKnockoutFormat =
    tournament.rounds === 'GruposKnockout' || tournament.rounds === 'Knockout';

  const currentPlayers = tournament.participants || 0;
  const plazasDisponibles = tournament.numPlayers - currentPlayers.length;
  const isFull = plazasDisponibles <= 0;

  const handleInscribirse = async () => {
    setIsRegistering(true);
    try {
      await api.post(`/tournaments/${id}/register`);
      notifications.show({
        title: '¡Inscrito!',
        message: 'Te has apuntado correctamente.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      await fetchTournamentInfo();
      if (participants !== null) {
        const res = await api.get(`/tournaments/${id}/participants`);
        setParticipants(res.data.data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'No se pudo inscribir',
        color: 'red',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return 'gray';
    if (status === 'Programado') return 'blue';
    if (status === 'Completado') return 'green';
    if (status === 'Cancelado') return 'red';
    return 'orange';
  };

  return (
    <Stack gap="xl">
      <div>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(-1)}
        >
          Volver a Torneos
        </Button>
      </div>

      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={1}>{tournament.name}</Title>
            <Group mt="md" gap="xs">
              <Badge color={getStatusColor(currentStatus)} size="lg" variant="light">
                {currentStatus}
              </Badge>
              <Badge color="gray" size="lg" variant="outline">
                {tournament.typeTournament || 'Interno'}
              </Badge>
              <Badge color="grape" size="lg" variant="outline">
                {tournament.levelTournament || 'Mixto'}
              </Badge>
            </Group>
          </div>

          {isProgramado && (
            <Stack align="flex-end" gap="xs">
              <Button
                color={isFull ? 'gray' : 'blue'}
                size="md"
                disabled={isFull}
                loading={isRegistering}
                onClick={handleInscribirse}
              >
                {isFull ? 'Torneo Completo' : 'Inscribirme'}
              </Button>
              <Text size="xs" c="dimmed">
                {plazasDisponibles > 0 ? `Quedan ${plazasDisponibles} plazas` : 'Lista de espera'}
              </Text>
            </Stack>
          )}
        </Group>
      </Card>

      <Tabs value={activeTab} onChange={setActiveTab} variant="outline" radius="md">
        <Tabs.List>
          <Tabs.Tab value="info" leftSection={<IconInfoCircle size={16} />}>
            Información
          </Tabs.Tab>
          {(isProgramado || isGrupos) && (
            <Tabs.Tab value="inscritos" leftSection={<IconUsers size={16} />}>
              Inscritos ({currentPlayers.length})
            </Tabs.Tab>
          )}
          {isCompletado && (
            <Tabs.Tab value="resultados" leftSection={<IconMedal size={16} />}>
              Resultados Finales
            </Tabs.Tab>
          )}
          {hasGroupsFormat && (isGrupos || isKnockoutPhase || isCompletado) && (
            <Tabs.Tab value="grupos" leftSection={<IconListNumbers size={16} />}>
              Fase de Grupos
            </Tabs.Tab>
          )}
          {hasKnockoutFormat && (isKnockoutPhase || isCompletado) && (
            <Tabs.Tab value="bracketA" leftSection={<IconTournament size={16} />}>
              Cuadro Principal
            </Tabs.Tab>
          )}
        </Tabs.List>

        {/* --- INFO --- */}
        <Tabs.Panel value="info" pt="xl">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            <Paper withBorder p="md" radius="md">
              <Group gap="md">
                <ThemeIcon size={40} radius="md" variant="light" color="blue">
                  <IconCalendar size={20} />
                </ThemeIcon>
                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    Fecha
                  </Text>
                  <Text fw={500}>
                    {new Date(tournament.dateStart).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </div>
              </Group>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Group gap="md">
                <ThemeIcon size={40} radius="md" variant="light" color="teal">
                  <IconUsers size={20} />
                </ThemeIcon>
                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    Plazas
                  </Text>
                  <Text fw={500}>{tournament.numPlayers} Jugadores</Text>
                </div>
              </Group>
            </Paper>
          </SimpleGrid>
        </Tabs.Panel>

        {/* --- INSCRITOS --- */}
        {(isProgramado || isGrupos) && (
          <Tabs.Panel value="inscritos" pt="xl">
            {!participants ? (
              <Center py="xl">
                <Loader color="blue" />
              </Center>
            ) : participants.length === 0 ? (
              <Center py="xl">
                <Text c="dimmed">Aún no hay jugadores inscritos.</Text>
              </Center>
            ) : (
              <Paper withBorder radius="md">
                <Table striped highlightOnHover verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={50}>#</Table.Th>
                      <Table.Th>Jugador</Table.Th>
                      <Table.Th>ELO</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {participants.map((p, index) => (
                      <Table.Tr key={p.id}>
                        <Table.Td>{index + 1}</Table.Td>
                        <Table.Td>
                          <Group gap="sm">
                            <Avatar color="blue" radius="xl" size="sm">
                              {p.player?.name?.charAt(0)}
                            </Avatar>
                            <Text size="sm" fw={500}>
                              {p.player?.name} {p.player?.surname || ''}
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light">{p.player?.stats?.elo || 500}</Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            )}
          </Tabs.Panel>
        )}

        {/* --- RESULTADOS (PODIO) --- */}
        {isCompletado && (
          <Tabs.Panel value="resultados" pt="xl">
            {!results ? (
              <Center py="xl">
                <Loader color="yellow" />
              </Center>
            ) : (
              <Stack gap="xl" mt="md">
                <Group justify="center" align="flex-end" gap="xl" py="xl">
                  {secondPlace && (
                    <Stack align="center" gap="xs">
                      <Avatar size="lg" color="gray" radius="xl" />
                      <Text fw={600} size="sm">
                        {secondPlace.player?.name} {secondPlace.player?.surname || ''}
                      </Text>
                      <Paper
                        w={90}
                        h={90}
                        radius="md"
                        style={{ backgroundColor: 'var(--mantine-color-gray-3)' }}
                      >
                        <Stack align="center" justify="center" h="100%" gap={0}>
                          <IconMedal color="var(--mantine-color-gray-7)" size={28} />
                          <Text fw={900} size="xl" c="gray.7">
                            2º
                          </Text>
                        </Stack>
                      </Paper>
                    </Stack>
                  )}
                  {firstPlace && (
                    <Stack align="center" gap="xs">
                      <IconTrophy
                        size={40}
                        color="var(--mantine-color-yellow-5)"
                        style={{ marginBottom: -10 }}
                      />
                      <Avatar size="xl" color="yellow" radius="xl" />
                      <Text fw={800} size="md">
                        {firstPlace.player?.name} {firstPlace.player?.surname || ''}
                      </Text>
                      <Paper
                        w={100}
                        h={130}
                        radius="md"
                        style={{ backgroundColor: 'var(--mantine-color-yellow-5)' }}
                      >
                        <Stack align="center" justify="center" h="100%" gap={0}>
                          <Text fw={900} size="h1" c="white">
                            1º
                          </Text>
                        </Stack>
                      </Paper>
                    </Stack>
                  )}
                  {thirdPlace && (
                    <Stack align="center" gap="xs">
                      <Avatar size="lg" color="orange" radius="xl" />
                      <Text fw={600} size="sm">
                        {thirdPlace.player?.name} {thirdPlace.player?.surname || ''}
                      </Text>
                      <Paper
                        w={90}
                        h={60}
                        radius="md"
                        style={{ backgroundColor: 'var(--mantine-color-orange-4)' }}
                      >
                        <Stack align="center" justify="center" h="100%" gap={0}>
                          <IconMedal color="var(--mantine-color-orange-8)" size={24} />
                          <Text fw={900} size="lg" c="orange.8">
                            3º
                          </Text>
                        </Stack>
                      </Paper>
                    </Stack>
                  )}
                </Group>

                {otherResults.length > 0 && (
                  <Card withBorder radius="md" shadow="sm">
                    <Title order={4} mb="md">
                      Clasificación General
                    </Title>
                    <Table striped highlightOnHover verticalSpacing="sm">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th w={80}>Puesto</Table.Th>
                          <Table.Th>Jugador</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {otherResults.map((p) => (
                          <Table.Tr key={p.id}>
                            <Table.Td>
                              <Badge color="gray" variant="light" size="lg">
                                {p.position}º
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              {p.player?.name} {p.player?.surname || ''}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Card>
                )}
              </Stack>
            )}
          </Tabs.Panel>
        )}

        {/* --- GRUPOS (NUEVO DISEÑO CON DROPDOWN Y PARTIDOS) --- */}
        {hasGroupsFormat && (isGrupos || isKnockoutPhase || isCompletado) && (
          <Tabs.Panel value="grupos" pt="xl">
            {!groupsClas || !groupMatches ? (
              <Center py="xl">
                <Loader color="blue" />
              </Center>
            ) : (
              <Stack gap="xl">
                {/* Selector de Grupo */}
                <Group>
                  <Select
                    label="Selecciona un grupo"
                    data={groupOptions}
                    value={selectedGroup}
                    onChange={(val) => setSelectedGroup(val)}
                    allowDeselect={false}
                    w={{ base: '100%', sm: 250 }}
                  />
                </Group>

                {/* Tabla de Clasificación del Grupo Seleccionado */}
                <Card withBorder shadow="sm" radius="md" padding="md">
                  <Title order={4} mb="md">
                    Clasificación
                  </Title>
                  <ScrollArea>
                    <Table striped verticalSpacing="sm" miw={400}>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th w={40}>Pos</Table.Th>
                          <Table.Th>Jugador</Table.Th>
                          <Table.Th>Pts</Table.Th>
                          <Table.Th>V-D</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {currentGroupClas.map((clas) => (
                          <Table.Tr key={clas.id}>
                            <Table.Td>
                              <Badge color={clas.position <= 2 ? 'green' : 'gray'} variant="filled">
                                {clas.position}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              {clas.player?.name} {clas.player?.surname || ''}
                            </Table.Td>
                            <Table.Td fw={700}>{clas.pointsClas}</Table.Td>
                            <Table.Td>
                              {clas.gamesWon}-{clas.gamesLost}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                        {currentGroupClas.length === 0 && (
                          <Table.Tr>
                            <Table.Td colSpan={4} ta="center">
                              <Text c="dimmed">No hay datos para este grupo.</Text>
                            </Table.Td>
                          </Table.Tr>
                        )}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                </Card>

                {/* Lista de Partidos del Grupo Seleccionado */}
                <Title order={4} mt="sm">
                  Partidos del Grupo
                </Title>
                <Stack gap="sm">
                  {currentGroupMatches.length === 0 ? (
                    <Text c="dimmed">No hay partidos generados aún.</Text>
                  ) : (
                    currentGroupMatches.map((match) => (
                      <Card key={match.id} withBorder shadow="sm" radius="md" p="md">
                        <Group justify="space-between" align="center" wrap="nowrap">
                          <Stack gap={4}>
                            <Text fw={500} size="sm">
                              {match.playerOne?.name} {match.playerOne?.surname || ''}{' '}
                              <Text span c="dimmed" mx={5}>
                                vs
                              </Text>{' '}
                              {match.playerTwo?.name} {match.playerTwo?.surname || ''}
                            </Text>
                            {formatSets(match)}
                          </Stack>

                          {/* BOTÓN PREPARADO PARA EL FUTURO ROL DE ADMIN */}
                          <Button
                            variant="light"
                            size="xs"
                            leftSection={<IconEdit size={14} />}
                            onClick={() => {
                              console.log(`Abrir modal para actualizar partido ${match.id}`);
                              notifications.show({
                                title: 'En desarrollo',
                                message: 'Pronto podrás editar los resultados desde aquí.',
                                color: 'blue',
                              });
                            }}
                          >
                            Actualizar
                          </Button>
                        </Group>
                      </Card>
                    ))
                  )}
                </Stack>
              </Stack>
            )}
          </Tabs.Panel>
        )}

        {/* --- BRACKET --- */}
        {hasKnockoutFormat && (isKnockoutPhase || isCompletado) && (
          <Tabs.Panel value="bracketA" pt="xl">
            {!bracketA ? (
              <Center py="xl">
                <Loader color="blue" />
              </Center>
            ) : (
              <ScrollArea type="always" offsetScrollbars pb="xl">
                <Group align="center" wrap="nowrap" gap={50} p="md">
                  {bracketA.map((round) => (
                    <Stack key={round.id} gap="xl" justify="space-around" style={{ minWidth: 250 }}>
                      <Title order={5} ta="center" c="dimmed" tt="uppercase" mb="md">
                        {round.round}
                      </Title>
                      {round.matches.map((match) => (
                        <Paper
                          key={match.id}
                          withBorder
                          shadow="sm"
                          radius="md"
                          p={0}
                          style={{
                            overflow: 'hidden',
                            cursor: match.status === 'Completado' ? 'pointer' : 'default',
                          }}
                          onClick={() => {
                            if (match.status === 'Completado') setSelectedMatch(match);
                          }}
                        >
                          <Group
                            justify="space-between"
                            p="xs"
                            style={{
                              borderBottom: '1px solid var(--mantine-color-default-border)',
                            }}
                          >
                            <Text size="sm">
                              {match.playerOne?.name || 'TBD'} {match.playerOne?.surname || ''}
                            </Text>
                          </Group>
                          <Group justify="space-between" p="xs">
                            <Text size="sm">
                              {match.playerTwo?.name || 'TBD'} {match.playerTwo?.surname || ''}
                            </Text>
                          </Group>
                          <Center p={4} bg="gray.1">
                            <Text size="xs" c="dimmed">
                              {match.status}
                            </Text>
                          </Center>
                        </Paper>
                      ))}
                    </Stack>
                  ))}
                </Group>
              </ScrollArea>
            )}
          </Tabs.Panel>
        )}

        <Modal
          opened={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
          title={<Text fw={700}>Resultado del Partido</Text>}
          centered
        >
          {selectedMatch && (
            <Stack align="center" gap="md">
              <Group w="100%" justify="space-between">
                <Text fw={600} size="lg">
                  {selectedMatch.playerOne?.name} {selectedMatch.playerOne?.surname || ''}
                </Text>
                <Text c="dimmed">vs</Text>
                <Text fw={600} size="lg">
                  {selectedMatch.playerTwo?.name} {selectedMatch.playerTwo?.surname || ''}
                </Text>
              </Group>

              <Stack gap="xs" align="center" w="100%">
                {selectedMatch.setOnePlayerOne !== null && (
                  <Badge size="lg" variant="light" color="blue">
                    Set 1: {selectedMatch.setOnePlayerOne} - {selectedMatch.setOnePlayerTwo}
                  </Badge>
                )}
                {selectedMatch.setTwoPlayerOne !== null && (
                  <Badge size="lg" variant="light" color="blue">
                    Set 2: {selectedMatch.setTwoPlayerOne} - {selectedMatch.setTwoPlayerTwo}
                  </Badge>
                )}
                {selectedMatch.setThreePlayerOne !== null && (
                  <Badge size="lg" variant="light" color="blue">
                    Set 3: {selectedMatch.setThreePlayerOne} - {selectedMatch.setThreePlayerTwo}
                  </Badge>
                )}
                {selectedMatch.setFourPlayerOne !== null &&
                  selectedMatch.setFourPlayerOne !== 0 && (
                    <Badge size="lg" variant="light" color="blue">
                      Set 4: {selectedMatch.setFourPlayerOne} - {selectedMatch.setFourPlayerTwo}
                    </Badge>
                  )}
                {selectedMatch.setFivePlayerOne !== null &&
                  selectedMatch.setFivePlayerOne !== 0 && (
                    <Badge size="lg" variant="light" color="blue">
                      Set 5: {selectedMatch.setFivePlayerOne} - {selectedMatch.setFivePlayerTwo}
                    </Badge>
                  )}
              </Stack>
            </Stack>
          )}
        </Modal>
      </Tabs>
    </Stack>
  );
};
