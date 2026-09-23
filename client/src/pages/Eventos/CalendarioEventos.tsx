import { useEffect, useState } from 'react';
import {
  Stack,
  Title,
  Text,
  Group,
  Button,
  Card,
  Badge,
  ThemeIcon,
  ActionIcon,
  SimpleGrid,
  Modal,
  TextInput,
  Select,
  Center,
  Loader,
  Paper,
  Indicator,
  Tooltip,
} from '@mantine/core';
import { DatePicker, DateTimePicker } from '@mantine/dates';
import {
  IconCalendarEvent,
  IconMapPin,
  IconPlus,
  IconBell,
  IconBellRinging,
  IconTrash,
} from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { openAppConfirmModal } from '../../utils/modals';
import '@mantine/dates/styles.css';

const REGIONES = [
  'Club',
  'Local',
  'Regional',
  'Provincial',
  'Autonomico',
  'Nacional',
  'Internacional',
];
const COLORES_MANTINE = [
  { value: 'blue', label: 'Azul (Por defecto)' },
  { value: 'red', label: 'Rojo (Importante)' },
  { value: 'orange', label: 'Naranja (Torneo)' },
  { value: 'grape', label: 'Morado (Liga)' },
  { value: 'teal', label: 'Verde (Amistoso)' },
  { value: 'gray', label: 'Gris (Reunión)' },
];

export const CalendarioEventos = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'AdminClub' || user?.role === 'SuperAdmin';

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados visuales del Calendario
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Modal Crear Evento
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: '',
    date: new Date(),
    location: '',
    color: 'blue',
    region: 'Local',
  });

  const fetchEvents = async () => {
    if (!user?.clubId) return;
    try {
      setLoading(true);
      const res = await api.get(ENDPOINTS.EVENTS.BY_CLUB(user.clubId));
      setEvents(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  // --- ACCIONES ADMIN ---
  const handleCreateEvent = async () => {
    setSaving(true);
    try {
      await api.post(ENDPOINTS.EVENTS.BASE, {
        ...newEvent,
        date: newEvent.date.toISOString(),
      });
      setModalOpen(false);
      fetchEvents();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    openAppConfirmModal({
      title: 'Eliminar Evento',
      icon: <IconTrash size={18} />,
      color: 'red',
      description: '¿Estás seguro de que deseas cancelar este evento del calendario del club?',
      highlightText: name,
      confirmLabel: 'Sí, eliminar',
      onConfirm: async () => {
        try {
          await api.delete(`${ENDPOINTS.EVENTS.BASE}/${id}`);
          fetchEvents();
        } catch (error) {
          console.error(error);
        }
      },
    });
  };

  // --- ACCIONES JUGADOR (RECORDATORIOS) ---
  const toggleReminder = async (eventId: string, hasReminder: boolean) => {
    try {
      if (hasReminder) {
        await api.delete(ENDPOINTS.EVENTS.REMINDERS(eventId));
      } else {
        await api.post(ENDPOINTS.EVENTS.REMINDERS(eventId));
      }
      fetchEvents(); // Recargamos para actualizar la campanita
    } catch (error) {
      console.error(error);
    }
  };

  // --- FILTROS Y RENDERIZADO ---
  const eventsOnSelectedDate = selectedDate
    ? events.filter((e) => new Date(e.date).toDateString() === selectedDate.toDateString())
    : events.filter((e) => new Date(e.date).getTime() >= new Date().getTime() - 86400000); // Si no hay fecha, mostramos próximos

  const renderDayWithEvent = (dateParam: string | Date | any) => {
    const date = new Date(dateParam);
    const dayEvents = events.filter((e) => new Date(e.date).toDateString() === date.toDateString());
    if (dayEvents.length > 0) {
      return (
        <Indicator size={6} color={dayEvents[0].color} offset={-2}>
          <div>{date.getDate()}</div>
        </Indicator>
      );
    }
    return <div>{date.getDate()}</div>;
  };

  if (loading)
    return (
      <Center h={400}>
        <Loader color="blue" />
      </Center>
    );

  return (
    <Stack gap="xl" maw={1000} mx="auto">
      <Group justify="space-between" align="center">
        <Group gap="sm">
          <ThemeIcon size={50} radius="md" color="indigo" variant="light">
            <IconCalendarEvent size={28} />
          </ThemeIcon>
          <div>
            <Title order={2}>Calendario de Eventos</Title>
            <Text c="dimmed" size="sm">
              Sigue la actividad del club, torneos externos y competiciones.
            </Text>
          </div>
        </Group>
        {isAdmin && (
          <Button
            color="indigo"
            leftSection={<IconPlus size={16} />}
            onClick={() => setModalOpen(true)}
          >
            Añadir Evento
          </Button>
        )}
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* COLUMNA IZQUIERDA: CALENDARIO VISUAL */}
        <Card withBorder shadow="sm" radius="md" p="md">
          <Center>
            <DatePicker
              value={selectedDate}
              onChange={(val) => setSelectedDate(val ? new Date(val) : null)} // 👈 Modificado
              date={currentMonth}
              onDateChange={(val) => setCurrentMonth(new Date(val))} // 👈 Modificado
              renderDay={renderDayWithEvent}
              size="md"
            />
          </Center>
          {selectedDate && (
            <Button
              variant="subtle"
              color="gray"
              fullWidth
              mt="sm"
              onClick={() => setSelectedDate(null)}
            >
              Mostrar todos los próximos
            </Button>
          )}
        </Card>

        {/* COLUMNA DERECHA: LISTA DE EVENTOS */}
        <Stack gap="sm">
          <Title order={4} mb="xs">
            {selectedDate
              ? `Eventos del ${selectedDate.toLocaleDateString('es-ES')}`
              : 'Próximos Eventos'}
          </Title>

          {eventsOnSelectedDate.length === 0 ? (
            <Paper
              withBorder
              p="xl"
              radius="md"
              bg="var(--mantine-color-gray-0)"
              style={{ darkHidden: true }}
            >
              <Center>
                <Text c="dimmed">No hay eventos para esta fecha.</Text>
              </Center>
            </Paper>
          ) : (
            eventsOnSelectedDate.map((ev) => {
              const hasReminder = ev.reminders && ev.reminders.length > 0;
              const isPast = new Date(ev.date) < new Date();

              return (
                <Card
                  key={ev.id}
                  withBorder
                  shadow="sm"
                  radius="md"
                  style={{ borderLeft: `6px solid var(--mantine-color-${ev.color}-5)` }}
                >
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Text fw={700} size="lg">
                        {ev.name}
                      </Text>
                      <Group gap="sm">
                        <Text size="sm" c="dimmed" fw={600}>
                          {new Date(ev.date).toLocaleString('es-ES', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        {ev.location && (
                          <Text size="sm" c="dimmed">
                            <IconMapPin
                              size={14}
                              style={{ verticalAlign: 'middle', marginRight: 4 }}
                            />
                            {ev.location}
                          </Text>
                        )}
                      </Group>
                      <Group gap="xs" mt={4}>
                        <Badge size="xs" variant="light" color={ev.color}>
                          {ev.region}
                        </Badge>
                        {isPast && (
                          <Badge size="xs" color="gray">
                            Finalizado
                          </Badge>
                        )}
                      </Group>
                    </Stack>

                    <Stack align="flex-end" gap="xs">
                      {isAdmin && (
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => handleDelete(ev.id, ev.name)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      )}

                      {!isPast && (
                        <Tooltip
                          label={hasReminder ? 'Desactivar recordatorios' : 'Avisarme por correo'}
                        >
                          <ActionIcon
                            color={hasReminder ? 'yellow' : 'gray'}
                            variant={hasReminder ? 'filled' : 'light'}
                            size="lg"
                            onClick={() => toggleReminder(ev.id, hasReminder)}
                          >
                            {hasReminder ? <IconBellRinging size={20} /> : <IconBell size={20} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Stack>
                  </Group>
                </Card>
              );
            })
          )}
        </Stack>
      </SimpleGrid>

      {/* MODAL CREAR EVENTO */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={<Text fw={700}>Nuevo Evento Oficial</Text>}
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Nombre del Evento"
            placeholder="Ej. Top Estatal"
            required
            value={newEvent.name}
            onChange={(e) => setNewEvent({ ...newEvent, name: e.currentTarget.value })}
          />
          <DateTimePicker
            label="Fecha y Hora"
            required
            value={newEvent.date}
            onChange={(val) => val && setNewEvent({ ...newEvent, date: new Date(val) })} // 👈 Modificado
            minDate={new Date()}
          />
          <TextInput
            label="Ubicación"
            placeholder="Ciudad, Pabellón..."
            value={newEvent.location}
            onChange={(e) => setNewEvent({ ...newEvent, location: e.currentTarget.value })}
          />
          <SimpleGrid cols={2}>
            <Select
              label="Ámbito / Región"
              data={REGIONES}
              value={newEvent.region}
              onChange={(val) => setNewEvent({ ...newEvent, region: val! })}
              allowDeselect={false}
            />
            <Select
              label="Color identificativo"
              data={COLORES_MANTINE}
              value={newEvent.color}
              onChange={(val) => setNewEvent({ ...newEvent, color: val! })}
              allowDeselect={false}
            />
          </SimpleGrid>
          <Button
            fullWidth
            color="indigo"
            mt="md"
            loading={saving}
            onClick={handleCreateEvent}
            disabled={!newEvent.name}
          >
            Añadir al Calendario
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
};
