import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Title,
  Card,
  Avatar,
  Group,
  Text,
  Badge,
  Center,
  Loader,
  ScrollArea,
  TextInput,
  Pagination,
  Stack,
  Tooltip,
  ActionIcon,
  Select,
  Modal,
  NumberInput,
  Button,
  ThemeIcon,
  SimpleGrid,
  Checkbox,
  Divider,
} from '@mantine/core';
import {
  IconSearch,
  IconEye,
  IconCheck,
  IconX,
  IconFilter,
  IconUserMinus,
  IconEdit,
  IconUsers,
  IconUserPlus,
  IconKey,
  IconMailFast,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { openAppConfirmModal } from '../../utils/modals';
import { getPlayerAvatar } from '../../utils/avatar';
import { returnEloColor } from '../../utils/helpers';
import { usePermissions } from '../../hooks/usePermissions';

interface User {
  id: string;
  email: string;
  name: string;
  surname?: string;
  nickname?: string;
  avatarUrl?: string;
  clubId?: string;
  clubStatus: 'Registrado' | 'Pendiente' | 'Aprobado' | 'Rechazado' | null;
  stats?: {
    elo: number;
    matchWon: number;
    matchLost: number;
    setWon: number;
    setLost: number;
  };
  club?: { name: string } | null;
}

const ITEMS_PER_PAGE = 10;

// --- DICCIONARIO DE NIVELES Y SUS STATS BASE ---
const LEVEL_BASE_STATS: Record<string, number> = {
  Iniciacion: 0,
  Principiante: 20,
  Intermedio: 40,
  Avanzado: 60,
  Profesional: 80,
};

// --- ESTRUCTURA DE HABILIDADES ---
const SKILL_FIELDS = [
  { key: 'derechaPlano', label: 'Derecha Plano' },
  { key: 'revesPlano', label: 'Revés Plano' },
  { key: 'topspinDerecha', label: 'Topspin Derecha' },
  { key: 'topspinReves', label: 'Topspin Revés' },
  { key: 'corte', label: 'Corte' },
  { key: 'bloqueoDerecha', label: 'Bloqueo Derecha' },
  { key: 'bloqueoReves', label: 'Bloqueo Revés' },
  { key: 'servicio', label: 'Servicio' },
  { key: 'recepcion', label: 'Recepción' },
  { key: 'movilidad', label: 'Movilidad' },
  { key: 'fortalezaMental', label: 'Fortaleza Mental' },
  { key: 'experiencia', label: 'Experiencia' },
] as const;

export const Jugadores = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const [players, setPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Aprobado');
  const [page, setPage] = useState(1);

  // --- ESTADOS PARA EDICIÓN MANUAL DE ELO ---
  const [editEloModal, setEditEloModal] = useState<{ opened: boolean; player: User | null }>({
    opened: false,
    player: null,
  });
  const [newElo, setNewElo] = useState<number | string>(500);

  // --- ESTADOS DE APROBACIÓN DE JUGADOR ---
  const [approveModal, setApproveModal] = useState<{ opened: boolean; player: User | null }>({
    opened: false,
    player: null,
  });
  const [adminConsentConfirmed, setAdminConsentConfirmed] = useState(false);

  // --- ESTADOS DE CREACIÓN DE INVITADO (GUEST) ---
  const [guestModal, setGuestModal] = useState(false);
  const [creatingGuest, setCreatingGuest] = useState(false);
  const [guestData, setGuestData] = useState({
    email: '',
    name: '',
    surname: '',
    level: 'Iniciacion',
    dominantHand: 'Diestro',
    playstyle: 'Ofensivo',
    rubberForehand: 'LISA', // 👈 Nueva prop para goma derecha
    rubberBackhand: 'LISA', // 👈 Nueva prop para goma revés
    elo: 500,
  });
  const [playerLevel, setPlayerLevel] = useState<string | null>(null);
  const [startingElo, setStartingElo] = useState<number | string>(500);
  const [skills, setSkills] = useState<Record<string, number | ''>>({
    derechaPlano: '',
    revesPlano: '',
    topspinDerecha: '',
    topspinReves: '',
    corte: '',
    bloqueoDerecha: '',
    bloqueoReves: '',
    servicio: '',
    recepcion: '',
    movilidad: '',
    fortalezaMental: '',
    experiencia: '',
  });
  const [guestSkills, setGuestSkills] = useState<Record<string, number | ''>>({
    derechaPlano: '',
    revesPlano: '',
    topspinDerecha: '',
    topspinReves: '',
    corte: '',
    bloqueoDerecha: '',
    bloqueoReves: '',
    servicio: '',
    recepcion: '',
    movilidad: '',
    fortalezaMental: '',
    experiencia: '',
  });
  const [approving, setApproving] = useState(false);

  // --- ESTADOS PARA RESETEO DE CUENTA / EMAIL ---
  const [resetAccountModal, setResetAccountModal] = useState<{
    opened: boolean;
    player: User | null;
  }>({ opened: false, player: null });
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);

  const { isAdmin: canManage, isSuperAdmin } = usePermissions();

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const response = await api.get(ENDPOINTS.PLAYERS.BASE);
      const data = response.data.data;
      if (Array.isArray(data)) {
        setPlayers(data);
      }
    } catch (error) {
      console.error('Error cargando jugadores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleCreateGuest = async () => {
    if (!guestData.name) return;
    setCreatingGuest(true);

    const baseStat = LEVEL_BASE_STATS[guestData.level] || 0;
    const finalSkills: Record<string, number> = {};
    SKILL_FIELDS.forEach((field) => {
      const val = guestSkills[field.key];
      finalSkills[field.key] = val !== '' ? Number(val) : baseStat;
    });

    try {
      if (guestData.email && guestData.email.trim() !== '') {
        await api.post(ENDPOINTS.USERS.BASE, {
          email: guestData.email,
          name: guestData.name,
          surname: guestData.surname.trim() !== '' ? guestData.surname : undefined,
          level: guestData.level,
          dominantHand: guestData.dominantHand,
          playstyle: guestData.playstyle,
          rubberForehand: guestData.rubberForehand, // 👈 Enviamos la goma
          rubberBackhand: guestData.rubberBackhand, // 👈 Enviamos la goma
          elo: guestData.elo,
          skills: finalSkills,
        });
      } else {
        await api.post(ENDPOINTS.USERS.CREATE_GUEST, {
          ...guestData,
          skills: finalSkills,
        });
      }

      setGuestModal(false);
      setAdminConsentConfirmed(false);
      setGuestData({
        email: '',
        name: '',
        surname: '',
        level: 'Iniciacion',
        dominantHand: 'Diestro',
        playstyle: 'Ofensivo',
        rubberForehand: 'LISA',
        rubberBackhand: 'LISA',
        elo: 500,
      });
      setGuestSkills({
        derechaPlano: '',
        revesPlano: '',
        topspinDerecha: '',
        topspinReves: '',
        corte: '',
        bloqueoDerecha: '',
        bloqueoReves: '',
        servicio: '',
        recepcion: '',
        movilidad: '',
        fortalezaMental: '',
        experiencia: '',
      });
      await fetchPlayers();
    } catch (error) {
      console.error(error);
    } finally {
      setCreatingGuest(false);
    }
  };

  const handleProcessRequest = (
    playerId: string,
    playerName: string,
    action: 'Aprobado' | 'Rechazado',
  ) => {
    const isApprove = action === 'Aprobado';
    const adminClubId = isSuperAdmin
      ? players.find((p) => p.id === playerId)?.clubId
      : currentUser?.clubId;
    if (!adminClubId) return;

    if (isApprove) {
      const playerToApprove = players.find((p) => p.id === playerId) || null;
      const pStats = Array.isArray(playerToApprove?.stats)
        ? playerToApprove?.stats[0]
        : playerToApprove?.stats;
      setApproveModal({ opened: true, player: playerToApprove });
      setStartingElo(pStats?.elo || 500);
      return;
    }

    openAppConfirmModal({
      title: 'Rechazar Solicitud',
      icon: <IconUserMinus size={18} />,
      color: 'red',
      description: `Estás a punto de procesar la solicitud de membresía para:`,
      highlightText: playerName,
      warningText:
        'La solicitud será denegada. El jugador volverá al estado de Jugador Libre para poder aplicar a otros clubes.',
      confirmLabel: 'Rechazar Solicitud',
      onConfirm: async () => {
        try {
          await api.put(ENDPOINTS.CLUBS.MEMBER_STATUS(adminClubId, playerId), { status: action });
          await fetchPlayers();
          window.dispatchEvent(new CustomEvent('refresh-notifications'));
        } catch (error) {
          console.error('Error al procesar la solicitud del miembro:', error);
        }
      },
    });
  };

  const handleConfirmApproval = async () => {
    const clubIdToApprove = isSuperAdmin ? approveModal.player?.clubId : currentUser?.clubId;
    if (!approveModal.player || !playerLevel || !clubIdToApprove) return;
    setApproving(true);

    const baseStat = LEVEL_BASE_STATS[playerLevel] || 0;
    const finalSkills: Record<string, number> = {};
    SKILL_FIELDS.forEach((field) => {
      const val = skills[field.key];
      finalSkills[field.key] = val !== '' ? Number(val) : baseStat;
    });

    try {
      await api.put(ENDPOINTS.CLUBS.MEMBER_STATUS(clubIdToApprove, approveModal.player.id), {
        status: 'Aprobado',
        level: playerLevel,
        elo: Number(startingElo),
        skills: finalSkills,
      });

      setApproveModal({ opened: false, player: null });
      setPlayerLevel(null);
      setSkills({
        derechaPlano: '',
        revesPlano: '',
        topspinDerecha: '',
        topspinReves: '',
        corte: '',
        bloqueoDerecha: '',
        bloqueoReves: '',
        servicio: '',
        recepcion: '',
        movilidad: '',
        fortalezaMental: '',
        experiencia: '',
      });
      await fetchPlayers();
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
    } catch (error) {
      console.error(error);
    } finally {
      setApproving(false);
    }
  };

  const openEditElo = (player: User) => {
    const pStats = Array.isArray(player.stats) ? player.stats[0] : player.stats;
    setNewElo(pStats?.elo || 500);
    setEditEloModal({ opened: true, player });
  };

  const handleUpdateElo = async () => {
    if (!editEloModal.player) return;
    try {
      await api.put(ENDPOINTS.USERS.BY_ID(editEloModal.player.id), { elo: Number(newElo) });
      setEditEloModal({ opened: false, player: null });
      await fetchPlayers();
    } catch (error) {
      console.error('Error al actualizar ELO', error);
    }
  };

  // --- LÓGICA ENVÍO DE RESET DE EMAIL / CONTRASEÑA ---
  const handleOpenResetAccount = (player: User) => {
    const isGuestWithoutEmail = player.email.endsWith('@guest.pingpong');
    setRecoveryEmail(isGuestWithoutEmail ? '' : player.email);
    setResetAccountModal({ opened: true, player });
  };

  const handleSendResetEmail = async () => {
    if (!recoveryEmail || !resetAccountModal.player) return;
    setSendingReset(true);

    try {
      // 1. Si es un Guest o le han cambiado el correo desde aquí, actualizamos su cuenta primero.
      if (resetAccountModal.player.email !== recoveryEmail) {
        await api.put(ENDPOINTS.USERS.BY_ID(resetAccountModal.player.id), { email: recoveryEmail });
      }

      // 2. Disparamos el correo usando el endpoint público de Auth
      await api.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email: recoveryEmail });

      notifications.show({
        title: 'Correo Enviado',
        message: `Se ha enviado el enlace de recuperación a ${recoveryEmail}.`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setResetAccountModal({ opened: false, player: null });
      await fetchPlayers();
    } catch (error) {
      console.error('Error al enviar recuperación:', error);
    } finally {
      setSendingReset(false);
    }
  };

  const filteredPlayers = players.filter((player) => {
    const fullName = `${player.name} ${player.surname || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase());
    const matchesStatus = player.clubStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE);
  const paginatedPlayers = filteredPlayers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.currentTarget.value);
    setPage(1);
  };

  const handleStatusChange = (value: string | null) => {
    setStatusFilter(value || 'Aprobado');
    setPage(1);
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="blue" type="bars" />
      </Center>
    );
  }

  const rows = paginatedPlayers.map((player) => {
    if (!player) return null;

    const s = Array.isArray(player.stats) ? player.stats[0] : player.stats;
    const totalMatches = (s?.matchWon || 0) + (s?.matchLost || 0);
    const winRate = totalMatches > 0 ? Math.round(((s?.matchWon || 0) / totalMatches) * 100) : 0;
    const fullName = `${player.name} ${player.surname || ''}`;

    return (
      <Table.Tr key={player.id}>
        <Table.Td>
          <Group gap="sm">
            <Avatar src={getPlayerAvatar(player.name, player.avatarUrl)} radius="xl" size="sm" />
            <div>
              <Text fz="sm" fw={500}>
                {fullName}
              </Text>
              <Text fz="xs" c="dimmed">
                {player?.nickname || 'Sin mote'}
              </Text>
            </div>
          </Group>
        </Table.Td>

        <Table.Td>
          <Badge color={s?.elo ? returnEloColor(s?.elo) : 'gray'} variant="light">
            {s?.elo || 500} ELO
          </Badge>
        </Table.Td>

        {canManage && (
          <Table.Td visibleFrom="sm">
            <Badge color={player.clubStatus === 'Aprobado' ? 'green' : 'yellow'} variant="dot">
              {player.clubStatus || 'Registrado'}
            </Badge>
            {isSuperAdmin && player.clubId && (
              <Text size="xs" c="dimmed">
                {player.club?.name || 'Sin club'}
              </Text>
            )}
          </Table.Td>
        )}

        <Table.Td visibleFrom="sm">
          <Text fz="sm" fw={500}>
            <Text component="span" c="green">
              {s?.matchWon || 0}V
            </Text>{' '}
            -{' '}
            <Text component="span" c="red">
              {s?.matchLost || 0}D
            </Text>
          </Text>
          <Text fz="xs" c="dimmed">
            {winRate}% Win Rate
          </Text>
        </Table.Td>

        <Table.Td>
          <Group gap="xs">
            {player.clubStatus === 'Pendiente' && canManage && (
              <>
                <Tooltip label="Aprobar e incorporar al club">
                  <ActionIcon
                    variant="light"
                    color="green"
                    onClick={() => handleProcessRequest(player.id, fullName, 'Aprobado')}
                  >
                    <IconCheck size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Rechazar solicitud">
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => handleProcessRequest(player.id, fullName, 'Rechazado')}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Tooltip>
              </>
            )}

            {player.clubStatus === 'Aprobado' && canManage && (
              <Tooltip label="Ajustar ELO manualmente">
                <ActionIcon variant="light" color="orange" onClick={() => openEditElo(player)}>
                  <IconEdit size={16} />
                </ActionIcon>
              </Tooltip>
            )}

            {player.clubStatus === 'Aprobado' && canManage && (
              <Tooltip label="Resetear Cuenta / Asignar Correo">
                <ActionIcon
                  variant="light"
                  color="grape"
                  onClick={() => handleOpenResetAccount(player)}
                >
                  <IconKey size={16} />
                </ActionIcon>
              </Tooltip>
            )}

            <Tooltip label="Ver perfil completo">
              <ActionIcon
                variant="light"
                color="blue"
                onClick={() => navigate(`/jugadores/${player.id}`)}
              >
                <IconEye size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <Group gap="sm">
          <ThemeIcon size={40} radius="md" color="blue" variant="light">
            <IconUsers size={24} />
          </ThemeIcon>
          <Title order={2}>Plantilla de Jugadores</Title>
          {canManage && (
            <Button
              size="sm"
              variant="light"
              color="blue"
              leftSection={<IconUserPlus size={16} />}
              onClick={() => setGuestModal(true)}
            >
              Añadir Jugador
            </Button>
          )}
        </Group>

        <Group gap="xs" style={{ flexGrow: 1, justifyRight: 'true', maxWidth: 500 }}>
          <TextInput
            placeholder="Buscar jugador..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={handleSearchChange}
            style={{ flexGrow: 1 }}
          />
          <Select
            leftSection={<IconFilter size={16} />}
            data={[
              { value: 'Aprobado', label: 'Plantilla' },
              { value: 'Pendiente', label: 'Solicitudes' },
              { value: 'Rechazado', label: 'Bajas/Rechazos' },
            ]}
            value={statusFilter}
            onChange={handleStatusChange}
            allowDeselect={false}
            w={140}
          />
        </Group>
      </Group>

      <Card withBorder shadow="sm" radius="md" padding="0">
        <ScrollArea>
          <Table striped highlightOnHover verticalSpacing="sm" px="md" miw={600}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Jugador</Table.Th>
                <Table.Th>Nivel (ELO)</Table.Th>
                {canManage && <Table.Th visibleFrom="sm">Estado</Table.Th>}
                <Table.Th visibleFrom="sm">Récord de Partidos</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? (
                rows
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={canManage ? 5 : 4} ta="center" py="xl">
                    <Text c="dimmed">No se encontraron jugadores.</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>

      {totalPages > 1 && (
        <Center mt="md">
          <Pagination total={totalPages} value={page} onChange={setPage} color="blue" withEdges />
        </Center>
      )}

      {/* --- MODAL EDITAR ELO MANUAL --- */}
      <Modal
        opened={editEloModal.opened}
        onClose={() => setEditEloModal({ opened: false, player: null })}
        title={<Text fw={700}>Ajustar Nivel ELO</Text>}
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Ajusta manualmente los puntos de clasificación de {editEloModal.player?.name}.
          </Text>
          <NumberInput
            label="Puntuación ELO"
            value={newElo}
            onChange={setNewElo}
            min={0}
            step={10}
            max={3000}
          />
          <Button fullWidth color="blue" onClick={handleUpdateElo}>
            Guardar Cambios
          </Button>
        </Stack>
      </Modal>

      {/* --- MODAL DE APROBACIÓN (SKILLS) --- */}
      <Modal
        opened={approveModal.opened}
        onClose={() => {
          setApproveModal({ opened: false, player: null });
          setPlayerLevel(null);
        }}
        title={<Text fw={700}>Nivel de Entrada Inicial</Text>}
        centered
        size="lg"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            El sistema calculará las estadísticas iniciales y el crecimiento en los entrenamientos
            en base al nivel táctico/técnico que asignes a este jugador al entrar.
          </Text>
          <Select
            label="Nivel Técnico Base"
            placeholder="Selecciona el nivel del jugador"
            data={['Iniciacion', 'Principiante', 'Intermedio', 'Avanzado', 'Profesional']}
            value={playerLevel}
            onChange={setPlayerLevel}
            required
          />
          <NumberInput
            label="Puntuación ELO Inicial"
            value={startingElo}
            onChange={setStartingElo}
            required
            min={0}
            max={3000}
            description="El ELO Base se puede heredar de competiciones anteriores."
          />

          {playerLevel && (
            <Card
              withBorder
              radius="md"
              p="md"
              bg="var(--mantine-color-gray-0)"
              style={{ darkHidden: true }}
            >
              <Text fw={600} size="sm" mb="xs">
                Asignación Avanzada de Atributos (RGP)
              </Text>
              <Text size="xs" c="dimmed" mb="md">
                Por defecto, todas las habilidades comenzarán con un valor de{' '}
                {LEVEL_BASE_STATS[playerLevel]}. Rellena solo aquellas en las que el jugador
                destaque excepcionalmente o esté más flojo.
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                {SKILL_FIELDS.map((field) => (
                  <NumberInput
                    key={field.key}
                    label={field.label}
                    placeholder={String(LEVEL_BASE_STATS[playerLevel])}
                    value={skills[field.key]}
                    onChange={(val) => setSkills({ ...skills, [field.key]: val as number | '' })}
                    min={0}
                    max={100}
                  />
                ))}
              </SimpleGrid>
            </Card>
          )}

          <Button
            fullWidth
            mt="md"
            color="green"
            disabled={!playerLevel}
            loading={approving}
            onClick={handleConfirmApproval}
          >
            Confirmar y Aprobar
          </Button>
        </Stack>
      </Modal>

      {/* --- MODAL CREAR JUGADOR (GUEST / INVITADO) --- */}
      <Modal
        opened={guestModal}
        onClose={() => setGuestModal(false)}
        title={<Text fw={700}>Añadir Jugador al Club</Text>}
        centered
        size="lg"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Registra a un jugador en tu club de forma instantánea. Si introduces un correo
            electrónico, recibirá un aviso para entrar. Si lo dejas en blanco, el jugador será
            gestionado íntegramente por el club como un usuario invitado ("Guest").
          </Text>

          <SimpleGrid cols={2}>
            <TextInput
              label="Nombre"
              placeholder="Nombre"
              value={guestData.name}
              onChange={(e) => setGuestData({ ...guestData, name: e.currentTarget.value })}
              required
            />
            <TextInput
              label="Apellidos"
              placeholder="Apellidos"
              value={guestData.surname}
              onChange={(e) => setGuestData({ ...guestData, surname: e.currentTarget.value })}
            />
            <TextInput
              style={{ gridColumn: 'span 2' }}
              label="Correo Electrónico (Opcional)"
              placeholder="ejemplo@email.com"
              value={guestData.email}
              onChange={(e) => setGuestData({ ...guestData, email: e.currentTarget.value })}
              description="Si lo dejas en blanco, no podrá hacer login desde el móvil."
            />
          </SimpleGrid>

          <Divider my="sm" />

          <SimpleGrid cols={2}>
            <Select
              label="Mano Dominante"
              data={['Diestro', 'Zurdo']}
              value={guestData.dominantHand}
              onChange={(val) => setGuestData({ ...guestData, dominantHand: val! })}
              allowDeselect={false}
              required
            />
            <Select
              label="Estilo de Juego"
              data={['Ofensivo', 'Defensivo']}
              value={guestData.playstyle}
              onChange={(val) => setGuestData({ ...guestData, playstyle: val! })}
              allowDeselect={false}
              required
            />
          </SimpleGrid>

          <SimpleGrid cols={2}>
            <Select
              label="Goma Derecha"
              data={['LISA', 'PICOS_CORTOS', 'PICOS_MEDIOS', 'PICOS_LARGOS', 'ANTISPIN']}
              value={guestData.rubberForehand}
              onChange={(val) => setGuestData({ ...guestData, rubberForehand: val! })}
              allowDeselect={false}
              required
            />
            <Select
              label="Goma Revés"
              data={['LISA', 'PICOS_CORTOS', 'PICOS_MEDIOS', 'PICOS_LARGOS', 'ANTISPIN']}
              value={guestData.rubberBackhand}
              onChange={(val) => setGuestData({ ...guestData, rubberBackhand: val! })}
              allowDeselect={false}
              required
            />
          </SimpleGrid>

          <Divider my="sm" />

          <SimpleGrid cols={2}>
            <Select
              label="Nivel Técnico Base"
              data={['Iniciacion', 'Principiante', 'Intermedio', 'Avanzado', 'Profesional']}
              value={guestData.level}
              onChange={(val) => setGuestData({ ...guestData, level: val! })}
              allowDeselect={false}
              required
            />
            <NumberInput
              label="Puntuación ELO Inicial"
              value={guestData.elo}
              onChange={(val) => setGuestData({ ...guestData, elo: Number(val) })}
              min={0}
              max={3000}
              required
            />
          </SimpleGrid>

          <Card
            withBorder
            radius="md"
            p="md"
            bg="var(--mantine-color-gray-0)"
            style={{ darkHidden: true }}
          >
            <Text fw={600} size="sm" mb="xs">
              Atributos Especiales (Opcional)
            </Text>
            <Text size="xs" c="dimmed" mb="md">
              Por defecto, todas las habilidades tendrán un valor de{' '}
              {LEVEL_BASE_STATS[guestData.level]}.
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              {SKILL_FIELDS.map((field) => (
                <NumberInput
                  key={field.key}
                  label={field.label}
                  placeholder={String(LEVEL_BASE_STATS[guestData.level])}
                  value={guestSkills[field.key]}
                  onChange={(val) =>
                    setGuestSkills({ ...guestSkills, [field.key]: val as number | '' })
                  }
                  min={0}
                  max={100}
                />
              ))}
            </SimpleGrid>
          </Card>

          <Checkbox
            checked={adminConsentConfirmed}
            onChange={(e) => setAdminConsentConfirmed(e.currentTarget.checked)}
            label="Confirmo que tengo el consentimiento expreso de esta persona para gestionar sus datos deportivos en esta plataforma."
            mt="sm"
          />

          <Button
            fullWidth
            mt="sm"
            color="blue"
            onClick={handleCreateGuest}
            loading={creatingGuest}
            disabled={!guestData.name || !adminConsentConfirmed}
          >
            Añadir Jugador
          </Button>
        </Stack>
      </Modal>

      {/* --- MODAL RECUPERACIÓN / ASIGNACIÓN CORREO --- */}
      <Modal
        opened={resetAccountModal.opened}
        onClose={() => setResetAccountModal({ opened: false, player: null })}
        title={
          <Group>
            <IconKey color="var(--mantine-color-grape-6)" />
            <Text fw={700}>Resetear Cuenta</Text>
          </Group>
        }
        centered
      >
        <Stack gap="md">
          {resetAccountModal.player?.email.endsWith('@guest.pingpong') ? (
            <>
              <Text size="sm" c="dimmed">
                Este jugador fue creado por el club y{' '}
                <strong>no tiene un correo real asignado</strong> (Guest). Para que el jugador pueda
                entrar desde la aplicación móvil y ver sus estadísticas, debes introducir su correo
                electrónico real.
              </Text>
              <TextInput
                label="Asignar Correo Electrónico"
                placeholder="jugador@email.com"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.currentTarget.value)}
                required
              />
              <Button
                fullWidth
                color="grape"
                leftSection={<IconMailFast size={18} />}
                loading={sendingReset}
                onClick={handleSendResetEmail}
                disabled={!recoveryEmail.includes('@')}
              >
                Guardar Correo y Enviar Link
              </Button>
            </>
          ) : (
            <>
              <Text size="sm" c="dimmed">
                ¿El jugador {resetAccountModal.player?.name} ha olvidado su contraseña o no puede
                entrar?
              </Text>
              <TextInput
                label="Correo Electrónico de la Cuenta"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.currentTarget.value)}
                required
              />
              <Text size="xs" c="dimmed" mt="-xs">
                Se enviará un enlace de recuperación seguro directamente a esta dirección.
              </Text>
              <Button
                fullWidth
                color="grape"
                leftSection={<IconMailFast size={18} />}
                loading={sendingReset}
                onClick={handleSendResetEmail}
              >
                Enviar Enlace de Recuperación
              </Button>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
};
