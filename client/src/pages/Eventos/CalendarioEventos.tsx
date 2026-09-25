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
  Tooltip,
  Box,
  ScrollArea,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconCalendarEvent,
  IconMapPin,
  IconPlus,
  IconBell,
  IconBellRinging,
  IconTrash,
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
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

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);

  // Modal Crear/Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Usamos un array de 2 fechas para soportar inicio y fin
  const [eventDates, setEventDates] = useState<[Date | null, Date | null]>([new Date(), null]);
  const [newEvent, setNewEvent] = useState({
    name: '',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleOpenModal = (ev?: any) => {
    if (ev) {
      setEditingId(ev.id);
      setNewEvent({
        name: ev.name,
        location: ev.location || '',
        color: ev.color,
        region: ev.region,
      });
      setEventDates([new Date(ev.date), ev.endDate ? new Date(ev.endDate) : null]);
    } else {
      setEditingId(null);
      setNewEvent({ name: '', location: '', color: 'blue', region: 'Local' });
      setEventDates([new Date(), null]);
    }
    setModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!eventDates[0]) return;
    setSaving(true);
    try {
      const payload = {
        ...newEvent,
        date: eventDates[0].toISOString(),
        endDate: eventDates[1] ? eventDates[1].toISOString() : null,
      };

      if (editingId) {
        await api.put(ENDPOINTS.EVENTS.UPDATE(editingId), payload);
      } else {
        await api.post(ENDPOINTS.EVENTS.BASE, payload);
      }

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

  const toggleReminder = async (eventId: string, hasReminder: boolean) => {
    try {
      if (hasReminder) {
        await api.delete(ENDPOINTS.EVENTS.REMINDERS(eventId));
      } else {
        await api.post(ENDPOINTS.EVENTS.REMINDERS(eventId));
      }
      fetchEvents();
    } catch (error) {
      console.error(error);
    }
  };

  // --- LÓGICA DE DETECCIÓN DE EVENTOS MULTIDÍA ---
  const isDateInRange = (targetDate: Date, startStr: string, endStr: string | null) => {
    const t = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
    ).getTime();

    const startDate = new Date(startStr);
    const s = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
    ).getTime();

    if (!endStr) return t === s;

    const endDate = new Date(endStr);
    const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();

    return t >= s && t <= e;
  };

  // --- CALENDARIO GIGANTE ---
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  let firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  if (firstDayOfMonth === 0) firstDayOfMonth = 7;

  const blanks = Array.from({ length: firstDayOfMonth - 1 });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDayClick = (dayNumber: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
    setSelectedDateForModal(clickedDate);
    setDayModalOpen(true);
  };

  const eventsOnSelectedDate = selectedDateForModal
    ? events.filter((e) => isDateInRange(selectedDateForModal, e.date, e.endDate))
    : [];

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
            onClick={() => handleOpenModal()}
          >
            Añadir Evento
          </Button>
        )}
      </Group>

      {/* CALENDARIO GIGANTE A ANCHO COMPLETO */}
      <Card shadow="sm" p="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Group>
            <ActionIcon variant="light" onClick={prevMonth}>
              <IconChevronLeft size={18} />
            </ActionIcon>
            <Title order={3}>
              {currentDate
                .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                .toUpperCase()}
            </Title>
            <ActionIcon variant="light" onClick={nextMonth}>
              <IconChevronRight size={18} />
            </ActionIcon>
          </Group>
        </Group>

        <Box>
          <SimpleGrid cols={7} spacing={4} mb="xs">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <Text key={day} ta="center" size="sm" fw={700} c="dimmed">
                {day}
              </Text>
            ))}
          </SimpleGrid>

          <SimpleGrid cols={7} spacing={4}>
            {blanks.map((_, i) => (
              <Box
                key={`blank-${i}`}
                style={{
                  minHeight: 100,
                  backgroundColor: 'var(--mantine-color-gray-1)',
                  opacity: 0.5,
                  borderRadius: 8,
                }}
              />
            ))}

            {days.map((dayNum) => {
              const loopDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
              const isToday = new Date().toDateString() === loopDate.toDateString();
              const dayEvents = events.filter((e) => isDateInRange(loopDate, e.date, e.endDate));

              return (
                <Paper
                  key={dayNum}
                  withBorder
                  p={4}
                  radius="md"
                  style={{
                    minHeight: 100,
                    cursor: 'pointer',
                    borderColor: isToday ? 'var(--mantine-color-blue-filled)' : undefined,
                  }}
                  onClick={() => handleDayClick(dayNum)}
                >
                  <Text
                    size="sm"
                    fw={isToday ? 900 : 500}
                    c={isToday ? 'blue' : undefined}
                    ta="right"
                    mb={4}
                  >
                    {dayNum}
                  </Text>
                  <Stack gap={2}>
                    {dayEvents.map((ev) => (
                      <Badge
                        key={ev.id}
                        size="xs"
                        color={ev.color || 'blue'}
                        variant="filled"
                        fullWidth
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
                      >
                        {ev.name}
                      </Badge>
                    ))}
                  </Stack>
                </Paper>
              );
            })}
          </SimpleGrid>
        </Box>
      </Card>

      {/* --- MODAL PARA MOSTRAR EVENTOS DE UN DÍA ESPECÍFICO --- */}
      <Modal
        opened={dayModalOpen}
        onClose={() => setDayModalOpen(false)}
        title={
          <Text size="lg" fw={700}>
            Eventos del {selectedDateForModal?.toLocaleDateString('es-ES')}
          </Text>
        }
        centered
        size="lg"
      >
        <Stack gap="sm">
          {eventsOnSelectedDate.length === 0 ? (
            <Center py="xl">
              <Text c="dimmed">No hay eventos para esta fecha.</Text>
            </Center>
          ) : (
            <ScrollArea h={400} offsetScrollbars>
              <Stack gap="sm">
                {eventsOnSelectedDate.map((ev) => {
                  const hasReminder = ev.reminders && ev.reminders.length > 0;
                  const isPast = ev.endDate
                    ? new Date(ev.endDate) < new Date()
                    : new Date(ev.date) < new Date();

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
                              })}
                              {ev.endDate
                                ? ` - ${new Date(ev.endDate).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}`
                                : ''}
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
                            {ev.endDate && (
                              <Badge size="xs" color="indigo" variant="dot">
                                Multi-día
                              </Badge>
                            )}
                          </Group>
                        </Stack>

                        <Stack align="flex-end" gap="xs">
                          {isAdmin && (
                            <Group gap="xs">
                              <ActionIcon
                                color="blue"
                                variant="light"
                                onClick={() => handleOpenModal(ev)}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                              <ActionIcon
                                color="red"
                                variant="subtle"
                                onClick={() => handleDelete(ev.id, ev.name)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          )}

                          {!isPast && (
                            <Tooltip
                              label={
                                hasReminder ? 'Desactivar recordatorio' : 'Avisarme por correo'
                              }
                            >
                              <ActionIcon
                                color={hasReminder ? 'yellow' : 'gray'}
                                variant={hasReminder ? 'filled' : 'light'}
                                size="lg"
                                onClick={() => toggleReminder(ev.id, hasReminder)}
                              >
                                {hasReminder ? (
                                  <IconBellRinging size={20} />
                                ) : (
                                  <IconBell size={20} />
                                )}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Stack>
                      </Group>
                    </Card>
                  );
                })}
              </Stack>
            </ScrollArea>
          )}
        </Stack>
      </Modal>

      {/* --- MODAL CREAR / EDITAR EVENTO --- */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={<Text fw={700}>{editingId ? 'Editar Evento' : 'Nuevo Evento Oficial'}</Text>}
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
          <DatePickerInput
            type="range"
            label="Fechas del Evento"
            placeholder="Selecciona inicio y (opcional) fin"
            required
            value={eventDates}
            onChange={(val) => {
              const start = val[0] ? new Date(val[0]) : null;
              const end = val[1] ? new Date(val[1]) : null;
              setEventDates([start, end]);
            }}
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
            onClick={handleSaveEvent}
            disabled={!newEvent.name || !eventDates[0]}
          >
            {editingId ? 'Guardar Cambios' : 'Añadir al Calendario'}
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
};
