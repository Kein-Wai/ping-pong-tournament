import { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Center,
  Loader,
  Select,
  Textarea,
  Badge,
  Table,
  ScrollArea,
  Modal,
  ThemeIcon,
  ActionIcon,
  Paper,
} from '@mantine/core';
import { IconBug, IconMessageCircle, IconCheck, IconEye } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';

export const FeedbackPage = () => {
  const { user } = useAuthStore();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Formulario
  const [type, setType] = useState<string>('Sugerencia');
  const [content, setContent] = useState('');

  // Modal Admin
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const isAdmin = user?.role === 'SuperAdmin';

  const fetchData = async () => {
    try {
      const res = await api.get(ENDPOINTS.FEEDBACK.BASE);
      setFeedbacks(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(ENDPOINTS.FEEDBACK.BASE, { type, content });
      setContent('');
      fetchData(); // Recargamos para que aparezca abajo en su historial
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedItem) return;
    try {
      await api.put(ENDPOINTS.FEEDBACK.UPDATE_STATUS(selectedItem.id), { status });
      setSelectedItem(null);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading)
    return (
      <Center h={400}>
        <Loader color="blue" />
      </Center>
    );

  const getStatusColor = (status: string) => {
    if (status === 'Pendiente') return 'yellow';
    if (status === 'Revisado') return 'blue';
    return 'green';
  };

  return (
    <Stack gap="xl" maw={900} mx="auto">
      <Group gap="sm">
        <ThemeIcon size={50} radius="md" color={isAdmin ? 'grape' : 'teal'} variant="light">
          {isAdmin ? <IconBug size={28} /> : <IconMessageCircle size={28} />}
        </ThemeIcon>
        <div>
          <Title order={2}>
            {isAdmin ? 'Bandeja de Soporte y Feedback' : 'Sugerencias y Reportes'}
          </Title>
          <Text c="dimmed" size="sm">
            {isAdmin
              ? 'Gestiona los errores y las mejoras sugeridas por la comunidad.'
              : 'Ayúdanos a mejorar la plataforma enviando tus ideas o reportando problemas.'}
          </Text>
        </div>
      </Group>

      {/* FORMULARIO DE ENVÍO (Para usuarios normales y para admins si quieren auto-reportar) */}
      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Select
              label="Tipo de reporte"
              data={['Sugerencia', 'Bug']}
              value={type}
              onChange={(val) => setType(val!)}
              allowDeselect={false}
              required
            />
            <Textarea
              label="Detalles"
              placeholder={
                type === 'Bug'
                  ? '¿Qué ha fallado y cómo llegaste a ese error?'
                  : '¿Qué nueva funcionalidad te gustaría ver?'
              }
              minRows={4}
              autosize
              value={content}
              onChange={(e) => setContent(e.currentTarget.value)}
              required
            />
            <Group justify="flex-end">
              <Button type="submit" color="teal" loading={saving} disabled={content.length < 10}>
                Enviar Reporte
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      {/* LISTADO DE REPORTES */}
      <Title order={4} mt="md">
        {isAdmin ? 'Bandeja de Entrada' : 'Mi Historial de Reportes'}
      </Title>
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <ScrollArea>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Tipo</Table.Th>
                {isAdmin && <Table.Th>Usuario</Table.Th>}
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {feedbacks.map((f) => (
                <Table.Tr key={f.id}>
                  <Table.Td>
                    <Badge color={f.type === 'Bug' ? 'red' : 'blue'} variant="light">
                      {f.type}
                    </Badge>
                  </Table.Td>
                  {isAdmin && (
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {f.user?.name} {f.user?.surname}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {f.user?.email}
                      </Text>
                    </Table.Td>
                  )}
                  <Table.Td>{new Date(f.createdAt).toLocaleDateString('es-ES')}</Table.Td>
                  <Table.Td>
                    <Badge color={getStatusColor(f.status)} variant="dot">
                      {f.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon color="blue" variant="light" onClick={() => setSelectedItem(f)}>
                      <IconEye size={18} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
              {feedbacks.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={isAdmin ? 5 : 4} ta="center" py="xl">
                    <Text c="dimmed">No hay registros en la bandeja.</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>

      {/* MODAL DETALLES DEL REPORTE */}
      <Modal
        opened={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={<Text fw={700}>Detalles del Reporte</Text>}
        centered
        size="lg"
      >
        {selectedItem && (
          <Stack gap="md">
            <Group justify="space-between">
              <Badge color={selectedItem.type === 'Bug' ? 'red' : 'blue'} size="lg">
                {selectedItem.type}
              </Badge>
              <Badge color={getStatusColor(selectedItem.status)} variant="outline">
                {selectedItem.status}
              </Badge>
            </Group>

            {isAdmin && (
              <Text size="sm" c="dimmed">
                Reportado por:{' '}
                <strong>
                  {selectedItem.user?.name} {selectedItem.user?.surname}
                </strong>{' '}
                ({selectedItem.user?.email})
              </Text>
            )}

            <Paper p="md" withBorder bg="var(--mantine-color-gray-0)" style={{ darkHidden: true }}>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {selectedItem.content}
              </Text>
            </Paper>

            {isAdmin && selectedItem.status !== 'Resuelto' && (
              <Group grow mt="md">
                {selectedItem.status === 'Pendiente' && (
                  <Button
                    color="blue"
                    variant="light"
                    onClick={() => handleUpdateStatus('Revisado')}
                  >
                    Marcar como Revisado
                  </Button>
                )}
                <Button
                  color="green"
                  leftSection={<IconCheck size={16} />}
                  onClick={() => handleUpdateStatus('Resuelto')}
                >
                  Marcar como Resuelto
                </Button>
              </Group>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};
