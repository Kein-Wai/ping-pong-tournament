import { useEffect, useState } from 'react';
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
  Avatar,
  Modal,
  Checkbox,
  ScrollArea,
  TextInput,
  Tooltip,
  ActionIcon,
  NumberInput,
  Select,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import {
  IconArrowLeft,
  IconUsers,
  IconCalendarEvent,
  IconShield,
  IconMapPin,
  IconPlus,
  IconTrash,
  IconEdit,
} from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { getPlayerAvatar } from '../../utils/avatar';
import { openAppConfirmModal } from '../../utils/modals';

export const EquipoDetalles = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clubPlayers, setClubPlayers] = useState<any[]>([]);

  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [checkedPlayers, setCheckedPlayers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Formulario Partido
  const [rivalName, setRivalName] = useState('');
  const [matchDate, setMatchDate] = useState<Date | null>(new Date());
  const [isHome, setIsHome] = useState(true);
  const [location, setLocation] = useState('');
  // ... debajo de tus otros estados ...
  const [editMatchModalOpen, setEditMatchModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  // Formulario Actualizar Partido
  const [editStatus, setEditStatus] = useState<string>('Programado');
  const [ourScore, setOurScore] = useState<number | string>('');
  const [rivalScore, setRivalScore] = useState<number | string>('');

  const [editRivalName, setEditRivalName] = useState('');
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editIsHome, setEditIsHome] = useState(true);
  const [editLocation, setEditLocation] = useState('');

  const isAdmin = user?.role === 'AdminClub' || user?.role === 'SuperAdmin';

  // Comprobar si el usuario logueado es parte de la plantilla
  const isTeamMember = team?.players?.some((p: any) => p.id === user?.id);
  const canEditMatch = isAdmin || isTeamMember;

  const fetchData = async () => {
    if (!id || !user?.clubId) return;
    try {
      const [teamRes, playersRes] = await Promise.all([
        api.get(ENDPOINTS.TEAMS.BY_CLUB(user.clubId)),
        api.get(ENDPOINTS.USERS.BASE), // Trae los jugadores del club
      ]);
      const currentTeam = teamRes.data.data.find((t: any) => t.id === id);
      setTeam(currentTeam);

      const approvedPlayers = (playersRes.data.data || playersRes.data).filter(
        (p: any) => p.clubStatus === 'Aprobado',
      );
      setClubPlayers(approvedPlayers);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, user]);

  const handleOpenRoster = () => {
    setCheckedPlayers(team.players.map((p: any) => p.id));
    setRosterModalOpen(true);
  };

  const handleSaveRoster = async () => {
    setSaving(true);
    try {
      await api.put(ENDPOINTS.TEAMS.UPDATE_PLAYERS(id!), { playerIds: checkedPlayers });
      setRosterModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMatch = async () => {
    if (!matchDate) return;
    setSaving(true);
    try {
      await api.post(ENDPOINTS.TEAMS.MATCHES(id!), {
        rivalName,
        date: matchDate.toISOString(),
        isHome,
        location,
      });
      setMatchModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = () => {
    openAppConfirmModal({
      title: 'Eliminar Equipo',
      icon: <IconTrash size={18} />,
      color: 'red',
      description: '¿Estás seguro de que deseas eliminar este equipo de competición?',
      highlightText: team.name, // 👈 AÑADIDO: El texto central destacado
      warningText:
        'Se borrarán todos los partidos programados en su calendario. Los jugadores quedarán desvinculados del equipo, pero seguirán formando parte de la plantilla del club.',
      confirmLabel: 'Sí, Eliminar Equipo',
      onConfirm: async () => {
        try {
          await api.delete(ENDPOINTS.TEAMS.DELETE(id!));
          navigate(APP_ROUTES.EQUIPOS.LIST);
        } catch (error) {
          console.error('Error eliminando equipo:', error);
        }
      },
    });
  };

  const handleUpdateMatchResult = async () => {
    if (!selectedMatch || !editDate) return;
    setSaving(true);
    try {
      await api.put(ENDPOINTS.TEAMS.UPDATE_MATCH(selectedMatch.id), {
        status: editStatus,
        ourScore: editStatus === 'Completado' ? Number(ourScore) : null,
        rivalScore: editStatus === 'Completado' ? Number(rivalScore) : null,
        rivalName: editRivalName,
        date: editDate.toISOString(),
        isHome: editIsHome,
        location: editLocation,
      });
      setEditMatchModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const openEditMatchModal = (match: any) => {
    setSelectedMatch(match);
    setEditStatus(match.status);
    setOurScore(match.ourScore !== null ? match.ourScore : '');
    setRivalScore(match.rivalScore !== null ? match.rivalScore : '');
    setEditRivalName(match.rivalName);
    setEditDate(new Date(match.date));
    setEditIsHome(match.isHome);
    setEditLocation(match.location || '');
    setEditMatchModalOpen(true);
  };

  const handleDeleteMatch = (matchId: string) => {
    openAppConfirmModal({
      title: 'Eliminar Partido',
      icon: <IconTrash size={18} />,
      color: 'red',
      description: '¿Estás seguro de que deseas eliminar este partido del calendario?',
      highlightText: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, Eliminar Partido',
      onConfirm: async () => {
        try {
          await api.delete(ENDPOINTS.TEAMS.DELETE_MATCH(matchId));
          fetchData();
          setEditMatchModalOpen(false);
        } catch (error) {
          console.error(error);
        }
      },
    });
  };

  if (loading)
    return (
      <Center h={400}>
        <Loader color="blue" />
      </Center>
    );
  if (!team)
    return (
      <Center h={400}>
        <Text>Equipo no encontrado</Text>
      </Center>
    );

  return (
    <Stack gap="xl">
      <div>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(APP_ROUTES.EQUIPOS.LIST)}
        >
          Volver a Equipos
        </Button>
      </div>

      {/* CABECERA PRINCIPAL CON BOTONES ESTILO TORNEO */}
      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <Group justify="space-between" align="flex-start">
          {/* Lado Izquierdo: Info del Equipo */}
          <Group gap="md">
            <ThemeIcon size={60} radius="md" color="blue" variant="light">
              <IconShield size={32} />
            </ThemeIcon>
            <div>
              <Title order={1}>{team.name}</Title>
              <Group gap="xs" mt="xs">
                <Badge color="blue" size="lg" variant="light">
                  {team.category}
                </Badge>
                <Badge color="orange" size="lg" variant="dot">
                  Nivel: {team.level}
                </Badge>
              </Group>
            </div>
          </Group>

          {/* Lado Derecho: Acciones de Admin */}
          <Stack align="flex-end" gap="xs">
            <Group>
              {isAdmin && (
                <>
                  <Tooltip label="Eliminar este equipo">
                    <ActionIcon
                      color="red"
                      variant="light"
                      size="input-sm"
                      onClick={handleDeleteTeam}
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Tooltip>

                  <Button
                    color="gray"
                    variant="light"
                    size="md"
                    onClick={handleOpenRoster}
                    leftSection={<IconEdit size={18} />}
                  >
                    Ajustar Plantilla
                  </Button>

                  <Button
                    color="green"
                    variant="light"
                    size="md"
                    onClick={() => setMatchModalOpen(true)}
                    leftSection={<IconPlus size={18} />}
                  >
                    Añadir Partido
                  </Button>
                </>
              )}
            </Group>

            <Text size="xs" c="dimmed">
              Plantilla actual: {team.players?.length || 0} Jugadores
            </Text>
          </Stack>
        </Group>
      </Card>

      <Tabs defaultValue="plantilla" variant="outline" radius="md">
        <Tabs.List>
          <Tabs.Tab value="plantilla" leftSection={<IconUsers size={16} />}>
            Plantilla ({team.players.length})
          </Tabs.Tab>
          <Tabs.Tab value="calendario" leftSection={<IconCalendarEvent size={16} />}>
            Calendario y Resultados
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="plantilla" pt="xl">
          <Stack gap="md">
            {team.players.length === 0 ? (
              <Center py="xl">
                <Text c="dimmed">No hay jugadores asignados a este equipo.</Text>
              </Center>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {team.players.map((p: any) => {
                  const s = Array.isArray(p.stats) ? p.stats[0] : p.stats; // 👈 Modificado
                  return (
                    <Paper
                      key={p.id}
                      withBorder
                      p="md"
                      radius="md"
                      className="hover-card" // 👈 AÑADIDO: Efecto visual
                      onClick={() => navigate(APP_ROUTES.JUGADORES.PROFILE(p.id))} // 👈 AÑADIDO: Navegación
                    >
                      <Group wrap="nowrap">
                        <Avatar src={getPlayerAvatar(p.name, p.avatarUrl)} radius="xl" size="md" />
                        <div style={{ flex: 1 }}>
                          <Text fw={600} size="sm" truncate>
                            {p.name} {p.surname}
                          </Text>
                          <Group gap="xs" mt={4}>
                            <Badge size="xs" color="gray" variant="light">
                              {p.level}
                            </Badge>
                            <Text size="xs" c="dimmed" fw={700}>
                              {s?.elo || 500} ELO
                            </Text>
                          </Group>
                        </div>
                      </Group>
                    </Paper>
                  );
                })}
              </SimpleGrid>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="calendario" pt="xl">
          <Stack gap="md">
            {isAdmin && (
              <Group justify="flex-end">
                <Button
                  leftSection={<IconPlus size={16} />}
                  variant="light"
                  color="green"
                  onClick={() => setMatchModalOpen(true)}
                >
                  Añadir Partido
                </Button>
              </Group>
            )}

            {team.matches.length === 0 ? (
              <Center py="xl">
                <Text c="dimmed">No hay partidos en el calendario.</Text>
              </Center>
            ) : (
              <Stack gap="sm">
                {team.matches.map((m: any) => (
                  <Card key={m.id} withBorder shadow="sm" radius="md">
                    <Group justify="space-between" align="center" wrap="nowrap">
                      <Stack gap={4}>
                        <Text fw={700} size="lg">
                          {m.isHome ? team.name : m.rivalName}
                          <Text span c="dimmed" mx="sm">
                            vs
                          </Text>
                          {m.isHome ? m.rivalName : team.name}
                        </Text>
                        <Group gap="sm">
                          <Text size="sm" c="dimmed" fw={600}>
                            {new Date(m.date).toLocaleString('es-ES', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </Text>
                          {m.location && (
                            <Text size="sm" c="dimmed">
                              <IconMapPin
                                size={14}
                                style={{ verticalAlign: 'middle', marginRight: 4 }}
                              />
                              {m.location}
                            </Text>
                          )}
                        </Group>
                      </Stack>

                      <Group gap="sm" align="center">
                        {/* Si hay marcador, lo enseñamos grande */}
                        {m.status === 'Completado' &&
                          m.ourScore !== null &&
                          m.rivalScore !== null && (
                            <Group gap="xs">
                              <Badge
                                size="lg"
                                variant="filled"
                                color={
                                  m.ourScore > m.rivalScore
                                    ? 'green'
                                    : m.ourScore < m.rivalScore
                                      ? 'red'
                                      : 'yellow'
                                }
                              >
                                {m.ourScore > m.rivalScore
                                  ? '🏆 VICTORIA'
                                  : m.ourScore < m.rivalScore
                                    ? '❌ DERROTA'
                                    : '🤝 EMPATE'}
                              </Badge>

                              <Badge
                                size="xl"
                                variant="outline"
                                color={
                                  m.ourScore > m.rivalScore
                                    ? 'green'
                                    : m.ourScore < m.rivalScore
                                      ? 'red'
                                      : 'yellow'
                                }
                              >
                                {m.isHome
                                  ? `${m.ourScore} - ${m.rivalScore}`
                                  : `${m.rivalScore} - ${m.ourScore}`}
                              </Badge>
                            </Group>
                          )}

                        <Badge
                          color={
                            m.status === 'Completado'
                              ? 'green'
                              : m.status === 'Cancelado'
                                ? 'red'
                                : 'blue'
                          }
                          variant={m.status === 'Completado' ? 'filled' : 'light'}
                          size="lg"
                        >
                          {m.status}
                        </Badge>

                        {/* Botón de actualizar (Solo Admins o Miembros de ESTE equipo) */}
                        {canEditMatch && (
                          <Button variant="light" size="xs" onClick={() => openEditMatchModal(m)}>
                            Actualizar
                          </Button>
                        )}
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* MODAL PLANTILLA */}
      <Modal
        opened={rosterModalOpen}
        onClose={() => setRosterModalOpen(false)}
        title={<Text fw={700}>Ajustar Plantilla</Text>}
        size="xl"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            El nivel del equipo se recalculará en base al jugador con el nivel más bajo
            seleccionado.
          </Text>
          <ScrollArea h={400}>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              {clubPlayers.map((p) => {
                const isChecked = checkedPlayers.includes(p.id);
                return (
                  <Paper
                    key={p.id}
                    withBorder
                    p="xs"
                    radius="sm"

                    onClick={() =>
                      setCheckedPlayers((prev) =>
                        isChecked ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                      )
                    }
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isChecked
                        ? 'var(--mantine-color-blue-light)'
                        : 'transparent',
                    }}
                  >
                    <Group wrap="nowrap">
                      <Checkbox checked={isChecked} onChange={() => {}} tabIndex={-1} />
                      <Avatar src={getPlayerAvatar(p.name, p.avatarUrl)} size="sm" radius="xl" />
                      <div>
                        <Text size="sm" fw={500}>
                          {p.name} {p.surname}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {p.level}
                        </Text>
                      </div>
                    </Group>
                  </Paper>
                );
              })}
            </SimpleGrid>
          </ScrollArea>
          <Button fullWidth color="blue" onClick={handleSaveRoster} loading={saving}>
            Sincronizar Plantilla
          </Button>
        </Stack>
      </Modal>

      {/* MODAL PARTIDO */}
      <Modal
        opened={matchModalOpen}
        onClose={() => setMatchModalOpen(false)}
        title={<Text fw={700}>Programar Partido de Liga</Text>}
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Nombre del Club Rival"
            required
            value={rivalName}
            onChange={(e) => setRivalName(e.currentTarget.value)}
          />
          <DateTimePicker
            label="Fecha y Hora"
            placeholder="Selecciona el día y la hora exacta"
            required
            value={matchDate}
            onChange={(val) => setMatchDate(val ? new Date(val) : null)}
            valueFormat="DD MMM YYYY HH:mm" // 👈 Formato visual claro
          />
          <Group grow>
            <Button
              variant={isHome ? 'filled' : 'outline'}
              color="blue"
              onClick={() => setIsHome(true)}
            >
              Jugamos en Casa
            </Button>
            <Button
              variant={!isHome ? 'filled' : 'outline'}
              color="blue"
              onClick={() => setIsHome(false)}
            >
              Jugamos Fuera
            </Button>
          </Group>
          <TextInput
            label="Dirección del local (Opcional)"
            placeholder="Pabellón, Calle..."
            value={location}
            onChange={(e) => setLocation(e.currentTarget.value)}
          />
          <Button
            fullWidth
            color="green"
            mt="md"
            onClick={handleSaveMatch}
            loading={saving}
            disabled={!rivalName || !matchDate}
          >
            Añadir al Calendario
          </Button>
        </Stack>
      </Modal>
      {/* MODAL EDITAR RESULTADO / PARTIDO */}
      <Modal
        opened={editMatchModalOpen}
        onClose={() => setEditMatchModalOpen(false)}
        title={<Text fw={700}>Actualizar Partido</Text>}
        centered
      >
        <Stack gap="md">
          {/* Metadatos del partido */}
          <TextInput
            label="Rival"
            value={editRivalName}
            onChange={(e) => setEditRivalName(e.currentTarget.value)}
          />
          <DateTimePicker
            label="Fecha y Hora"
            value={editDate}
            onChange={(val) => setEditDate(val ? new Date(val) : null)}
            valueFormat="DD MMM YYYY HH:mm"
          />
          <Group grow>
            <Button
              variant={editIsHome ? 'filled' : 'outline'}
              color="blue"
              onClick={() => setEditIsHome(true)}
            >
              Jugamos en Casa
            </Button>
            <Button
              variant={!editIsHome ? 'filled' : 'outline'}
              color="blue"
              onClick={() => setEditIsHome(false)}
            >
              Jugamos Fuera
            </Button>
          </Group>
          <TextInput
            label="Localización"
            value={editLocation}
            onChange={(e) => setEditLocation(e.currentTarget.value)}
          />

          {/* Estado y Puntuación */}
          <Select
            label="Estado del Encuentro"
            data={['Programado', 'Completado', 'Cancelado']}
            value={editStatus}
            onChange={(val) => setEditStatus(val!)}
            allowDeselect={false}
            mt="sm"
          />

          {editStatus === 'Completado' && (
            <SimpleGrid cols={2}>
              <NumberInput
                label={`Puntos: ${team.name}`}
                description="(Nosotros)"
                value={ourScore}
                onChange={setOurScore}
                min={0}
                max={10}
              />
              <NumberInput
                label={`Puntos: ${selectedMatch?.rivalName}`}
                description="(Rival)"
                value={rivalScore}
                onChange={setRivalScore}
                min={0}
                max={10}
              />
            </SimpleGrid>
          )}

          <Group grow mt="md">
            {isAdmin && (
              <Button
                variant="light"
                color="red"
                onClick={() => handleDeleteMatch(selectedMatch.id)}
              >
                Eliminar
              </Button>
            )}
            <Button
              color="blue"
              onClick={handleUpdateMatchResult}
              loading={saving}
              disabled={editStatus === 'Completado' && (ourScore === '' || rivalScore === '')}
            >
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
