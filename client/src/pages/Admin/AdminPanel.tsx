import { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Table,
  Badge,
  Group,
  Center,
  Loader,
  Stack,
  ActionIcon,
  Tooltip,
  ThemeIcon,
  ScrollArea,
} from '@mantine/core';
import { IconCheck, IconX, IconShieldCheck, IconBuildingCommunity } from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { openAppConfirmModal } from '../../utils/modals';

interface AdminClubUser {
  name: string;
  surname: string | null;
  email: string;
}

interface ClubAdminData {
  id: string;
  name: string;
  city: string;
  status: 'Pendiente' | 'Aprobado' | 'Inactivo';
  createdAt: string;
  _count: { users: number };
  users: AdminClubUser[];
}

export const AdminPanel = () => {
  const [clubs, setClubs] = useState<ClubAdminData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllClubs = async () => {
    try {
      setLoading(true);
      const response = await api.get(ENDPOINTS.CLUBS.ADMIN_ALL);
      setClubs(response.data.data);
    } catch (error) {
      console.error('Error al cargar la lista de clubes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllClubs();
  }, []);

  const handleStatusChange = (
    clubId: string,
    clubName: string,
    newStatus: 'Aprobado' | 'Inactivo',
  ) => {
    const isApprove = newStatus === 'Aprobado';

    openAppConfirmModal({
      title: isApprove ? 'Aprobar Nueva Sede' : 'Rechazar / Suspender Sede',
      icon: isApprove ? <IconCheck size={18} /> : <IconX size={18} />,
      color: isApprove ? 'green' : 'red',
      description: isApprove
        ? 'El club será validado y aparecerá de inmediato en el listado público para que los jugadores puedan unirse.'
        : 'El club será suspendido. Sus administradores no podrán crear torneos y los jugadores no podrán unirse.',
      highlightText: clubName,
      confirmLabel: isApprove ? 'Sí, Aprobar Club' : 'Suspender Club',
      onConfirm: async () => {
        try {
          await api.put(ENDPOINTS.CLUBS.UPDATE(clubId), { status: newStatus });
          await fetchAllClubs();
        } catch (error) {
          console.error('Error cambiando el estado del club', error);
        }
      },
    });
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="blue" type="bars" />
      </Center>
    );
  }

  const rows = clubs.map((club) => {
    const admin = club.users[0]; // Extraemos al presidente (el primero que lo creó)

    return (
      <Table.Tr key={club.id}>
        <Table.Td>
          <Group gap="sm">
            <ThemeIcon
              color={club.status === 'Pendiente' ? 'yellow' : 'blue'}
              variant="light"
              size="lg"
            >
              <IconBuildingCommunity size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600} size="sm">
                {club.name}
              </Text>
              <Text size="xs" c="dimmed">
                📍 {club.city}
              </Text>
            </div>
          </Group>
        </Table.Td>

        <Table.Td>
          {admin ? (
            <div>
              <Text size="sm" fw={500}>
                {admin.name} {admin.surname || ''}
              </Text>
              <Text size="xs" c="dimmed">
                {admin.email}
              </Text>
            </div>
          ) : (
            <Text size="sm" c="dimmed" fs="italic">
              Sin asignar
            </Text>
          )}
        </Table.Td>

        <Table.Td>
          <Badge
            color={
              club.status === 'Aprobado' ? 'green' : club.status === 'Pendiente' ? 'yellow' : 'red'
            }
            variant="dot"
          >
            {club.status}
          </Badge>
        </Table.Td>

        <Table.Td ta="center">
          <Text fw={600}>{club._count.users}</Text>
        </Table.Td>

        <Table.Td>
          <Group gap="xs">
            {club.status === 'Pendiente' && (
              <Tooltip label="Aprobar Sede">
                <ActionIcon
                  color="green"
                  variant="light"
                  onClick={() => handleStatusChange(club.id, club.name, 'Aprobado')}
                >
                  <IconCheck size={18} />
                </ActionIcon>
              </Tooltip>
            )}
            {club.status !== 'Inactivo' && (
              <Tooltip label="Suspender / Rechazar Sede">
                <ActionIcon
                  color="red"
                  variant="light"
                  onClick={() => handleStatusChange(club.id, club.name, 'Inactivo')}
                >
                  <IconX size={18} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Stack gap="lg">
      <Group gap="sm" align="center">
        <ThemeIcon size={50} radius="md" color="grape" variant="light">
          <IconShieldCheck size={28} />
        </ThemeIcon>
        <div>
          <Title order={2}>Panel de Sistema Global</Title>
          <Text c="dimmed" size="sm">
            Gestión y auditoría de todas las sedes de la plataforma.
          </Text>
        </div>
      </Group>

      <Card withBorder shadow="sm" radius="md" padding="lg">
        <Title order={4} mb="md">
          Auditoría de Clubes
        </Title>
        <ScrollArea>
          <Table striped highlightOnHover verticalSpacing="sm" miw={800}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Sede</Table.Th>
                <Table.Th>Presidente / Creador</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th ta="center">Miembros</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? (
                rows
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={5} ta="center" py="xl">
                    <Text c="dimmed">No hay clubes registrados en el sistema.</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
    </Stack>
  );
};
