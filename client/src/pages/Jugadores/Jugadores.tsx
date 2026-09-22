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
  IconClipboardList,
} from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { openAppConfirmModal } from '../../utils/modals';
import { getPlayerAvatar } from '../../utils/avatar';
import { returnEloColor } from '../../utils/helpers';

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

  // --- ESTADOS DE APROBACIÓN DE JUGADOR (STATS INICIALES) ---
  const [approveModal, setApproveModal] = useState<{ opened: boolean; player: User | null }>({
    opened: false,
    player: null,
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
  const [approving, setApproving] = useState(false);

  const isAdminClub = currentUser?.role === 'AdminClub';
  const isSuperAdmin = currentUser?.role === 'SuperAdmin';
  const canManage = isAdminClub || isSuperAdmin;

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const response = await api.get(ENDPOINTS.PLAYERS.BASE);
      const data = response.data.data || response.data;
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
      setStartingElo(pStats?.elo || 500); // 👈 Modificado
      return;
    }

    // Modal original para Rechazar
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

    // Construimos el payload de Skills usando el baseStat si el input está vacío
    const finalSkills: Record<string, number> = {};
    SKILL_FIELDS.forEach((field) => {
      const val = skills[field.key];
      finalSkills[field.key] = val !== '' ? Number(val) : baseStat;
    });

    try {
      await api.put(ENDPOINTS.CLUBS.MEMBER_STATUS(clubIdToApprove, approveModal.player.id), {
        status: 'Aprobado',
        level: playerLevel, // Enviamos el nivel a la base de datos
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

  // --- LÓGICA DE EDICIÓN DE ELO ---
  const openEditElo = (player: User) => {
    const pStats = Array.isArray(player.stats) ? player.stats[0] : player.stats;
    setNewElo(pStats?.elo || 500); // 👈 Modificado
    setEditEloModal({ opened: true, player });
  };

  const handleUpdateElo = async () => {
    if (!editEloModal.player) return;
    try {
      // Invocación a tu PUT genérico de actualización de usuario que ya soporta "elo"
      await api.put(ENDPOINTS.USERS.BY_ID(editEloModal.player.id), { elo: Number(newElo) });
      setEditEloModal({ opened: false, player: null });
      await fetchPlayers();
    } catch (error) {
      console.error('Error al actualizar ELO', error);
    }
  };

  // --- FILTRADO COMBINADO ---
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

    const s = Array.isArray(player.stats) ? player.stats[0] : player.stats; // 👈 Modificado
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
            {/* Opcional: Mostrar el ID del club o el nombre si lo trajéramos del backend */}
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

            {/* BOTÓN EDICIÓN MANUAL DE ELO (Solo para miembros del club y si eres admin) */}
            {player.clubStatus === 'Aprobado' && canManage && (
              <Tooltip label="Ajustar ELO manualmente">
                <ActionIcon variant="light" color="orange" onClick={() => openEditElo(player)}>
                  <IconEdit size={16} />
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
              { value: 'Aprobado', label: 'Miembros Activos' },
              { value: 'Pendiente', label: 'Solicitudes en Espera' },
              { value: 'Rechazado', label: 'Rechazados' },
            ]}
            value={statusFilter}
            onChange={handleStatusChange}
            allowDeselect={false}
            style={{ width: 190 }}
          />
        </Group>
      </Group>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <ScrollArea>
          <Table verticalSpacing="sm" striped highlightOnHover miw={600}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Jugador</Table.Th>
                <Table.Th>ELO</Table.Th>
                {canManage && <Table.Th visibleFrom="sm">Estado Club</Table.Th>}
                <Table.Th visibleFrom="sm">Récord</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.filter(Boolean).length > 0 ? (
                rows
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Center py="xl">
                      <Text c="dimmed">No se han encontrado jugadores con este estado.</Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        {totalPages > 1 && (
          <Center mt="md">
            <Pagination total={totalPages} value={page} onChange={setPage} color="blue" withEdges />
          </Center>
        )}
      </Card>

      {/* --- MODAL DE APROBACIÓN (EVALUACIÓN DE SKILLS RPG) --- */}
      <Modal
        opened={approveModal.opened}
        onClose={() => setApproveModal({ opened: false, player: null })}
        // 👇 CAMBIADO DE Title A Text
        title={
          <Text fw={700} size="lg">
            Evaluación Inicial de Nivel
          </Text>
        }
        size="xl"
        centered
        overlayProps={{ blur: 3, backgroundOpacity: 0.5 }}
      >
        {approveModal.player && (
          <Stack gap="md">
            <Group wrap="nowrap" align="center">
              <ThemeIcon size="xl" radius="md" color="green" variant="light">
                <IconClipboardList size={28} />
              </ThemeIcon>
              <div>
                <Text size="sm">
                  Estás a punto de admitir a{' '}
                  <strong>
                    {approveModal.player.name} {approveModal.player.surname}
                  </strong>{' '}
                  en el club.
                </Text>
                <Text size="sm" c="dimmed">
                  Por favor, indica su nivel general de juego. Si lo deseas, puedes afinar sus
                  características técnicas (0-100) o dejarlas vacías para que tomen el valor por
                  defecto del nivel seleccionado.
                </Text>
              </div>
            </Group>

            <Divider />

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Select
                label="Nivel General de Juego"
                description="Define la base técnica (Obligatorio)"
                required
                data={Object.keys(LEVEL_BASE_STATS)}
                value={playerLevel}
                onChange={setPlayerLevel}
                allowDeselect={false}
                placeholder="Selecciona el nivel..."
              />
              <NumberInput
                label="Puntuación ELO Inicial"
                description="Ajusta el ELO según su nivel real"
                required
                min={0}
                max={3500}
                value={startingElo}
                onChange={setStartingElo}
              />
            </SimpleGrid>

            {playerLevel && (
              <Card withBorder bg="var(--mantine-color-gray-0)" style={{ darkHidden: true }}>
                <Text fw={600} size="sm" mb="xs">
                  Atributos Técnicos (Base: {LEVEL_BASE_STATS[playerLevel]})
                </Text>
                <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
                  {SKILL_FIELDS.map((field) => (
                    <NumberInput
                      key={field.key}
                      label={field.label}
                      placeholder={`Defecto: ${LEVEL_BASE_STATS[playerLevel]}`}
                      min={0}
                      max={100}
                      value={skills[field.key]}
                      onChange={(val) => setSkills({ ...skills, [field.key]: val as number | '' })}
                    />
                  ))}
                </SimpleGrid>
              </Card>
            )}

            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                color="gray"
                onClick={() => setApproveModal({ opened: false, player: null })}
              >
                Cancelar
              </Button>
              <Button
                color="green"
                onClick={handleConfirmApproval}
                loading={approving}
                disabled={!playerLevel}
              >
                Confirmar y Aprobar Miembro
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* MODAL PARA CAMBIO DE ELO MANUAL */}
      <Modal
        opened={editEloModal.opened}
        onClose={() => setEditEloModal({ opened: false, player: null })}
        title={
          <Text fw={700} size="lg">
            Ajuste Manual de ELO
          </Text>
        }
        centered
        overlayProps={{ blur: 3, backgroundOpacity: 0.5 }}
      >
        {editEloModal.player && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Estás a punto de modificar la puntuación ELO de{' '}
              <strong>
                {editEloModal.player.name} {editEloModal.player.surname || ''}
              </strong>
              . Utiliza esta opción con precaución para emparejar niveles procedentes de otras
              ligas.
            </Text>

            <NumberInput
              label="Nueva Puntuación ELO"
              description="Valor base por defecto: 500"
              min={0}
              max={3500}
              value={newElo}
              onChange={setNewElo}
              data-autofocus
            />

            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                color="gray"
                onClick={() => setEditEloModal({ opened: false, player: null })}
              >
                Cancelar
              </Button>
              <Button color="orange" onClick={handleUpdateElo}>
                Aplicar Nuevo ELO
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};
