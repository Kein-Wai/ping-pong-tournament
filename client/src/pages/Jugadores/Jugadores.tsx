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
} from '@mantine/core';
import {
  IconSearch,
  IconEye,
  IconCheck,
  IconX,
  IconFilter,
  IconUserCheck,
  IconUserMinus,
  IconEdit,
} from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { openAppConfirmModal } from '../../utils/modals';
import { getPlayerAvatar } from '../../utils/avatar';

interface User {
  id: string;
  email: string;
  name: string;
  surname?: string;
  nickname?: string;
  avatarUrl?: string;
  clubStatus: 'Registrado' | 'Pendiente' | 'Aprobado' | 'Rechazado' | null;
  stats?: {
    elo: number;
    matchWon: number;
    matchLost: number;
    setWon: number;
    setLost: number;
  };
}

const ITEMS_PER_PAGE = 10;

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

  const isAdminClub = currentUser?.role === 'AdminClub';

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
    const adminClubId = currentUser?.clubId;

    if (!adminClubId) return;

    openAppConfirmModal({
      title: isApprove ? 'Aprobar Miembro' : 'Rechazar Solicitud',
      icon: isApprove ? <IconUserCheck size={18} /> : <IconUserMinus size={18} />,
      color: isApprove ? 'green' : 'red',
      description: `Estás a punto de procesar la solicitud de membresía para:`,
      highlightText: playerName,
      warningText: isApprove
        ? 'El jugador ganará acceso completo a los rankings internos, estadísticas e historial privado del club.'
        : 'La solicitud será denegada. El jugador volverá al estado de Jugador Libre para poder aplicar a otros clubes.',
      confirmLabel: isApprove ? 'Aprobar Miembro' : 'Rechazar Solicitud',
      onConfirm: async () => {
        try {
          await api.put(ENDPOINTS.CLUBS.MEMBER_STATUS(adminClubId, playerId), { status: action });
          await fetchPlayers();
        } catch (error) {
          console.error('Error al procesar la solicitud del miembro:', error);
        }
      },
    });
  };

  // --- LÓGICA DE EDICIÓN DE ELO ---
  const openEditElo = (player: User) => {
    setNewElo(player.stats?.elo || 500);
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

  const returnEloColor = (elo: number) => {
    if (elo < 500) return 'red';
    if (elo >= 500 && elo < 750) return 'yellow';
    if (elo >= 750 && elo < 1000) return 'blue';
    return 'green';
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

    const totalMatches = (player.stats?.matchWon || 0) + (player.stats?.matchLost || 0);
    const winRate =
      totalMatches > 0 ? Math.round(((player.stats?.matchWon || 0) / totalMatches) * 100) : 0;
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
              <Text c="dimmed" fz="xs" visibleFrom="sm">
                {player?.email || 'Sin correo'}
              </Text>
            </div>
          </Group>
        </Table.Td>

        <Table.Td>
          <Badge
            color={player.stats?.elo ? returnEloColor(player.stats?.elo) : 'gray'}
            variant="light"
          >
            {player.stats?.elo || 500} ELO
          </Badge>
        </Table.Td>

        <Table.Td visibleFrom="sm">
          <Badge color={player.clubStatus === 'Aprobado' ? 'green' : 'yellow'} variant="dot">
            {player.clubStatus || 'Registrado'}
          </Badge>
        </Table.Td>

        <Table.Td visibleFrom="sm">
          <Text fz="sm" fw={500}>
            <Text component="span" c="green">
              {player.stats?.matchWon || 0}V
            </Text>{' '}
            -{' '}
            <Text component="span" c="red">
              {player.stats?.matchLost || 0}D
            </Text>
          </Text>
          <Text fz="xs" c="dimmed">
            {winRate}% Win Rate
          </Text>
        </Table.Td>

        <Table.Td>
          <Group gap="xs">
            {player.clubStatus === 'Pendiente' && isAdminClub && (
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
            {player.clubStatus === 'Aprobado' && isAdminClub && (
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
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
          <Title order={2}>Plantilla de Jugadores</Title>

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

        <ScrollArea>
          <Table verticalSpacing="sm" striped highlightOnHover miw={600}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Jugador</Table.Th>
                <Table.Th>ELO</Table.Th>
                <Table.Th visibleFrom="sm">Estado Club</Table.Th>
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

      {/* MODAL PARA CAMBIO DE ELO MANUAL */}
      <Modal
        opened={editEloModal.opened}
        onClose={() => setEditEloModal({ opened: false, player: null })}
        title={<Title order={4}>Ajuste Manual de ELO</Title>}
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
