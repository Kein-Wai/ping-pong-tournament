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
  Modal,
  TextInput,
  Select,
  ThemeIcon,
  SimpleGrid,
  Badge,
  Checkbox,
  Paper,
  ActionIcon,
  ScrollArea,
  Avatar,
  Box,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconCalendarEvent,
  IconPlus,
  IconTrash,
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconInfoCircle,
} from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { getPlayerAvatar } from '../../utils/avatar';
import { openAppConfirmModal } from '../../utils/modals';

const SKILLS = [
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
  { key: 'experiencia', label: 'Experiencia / Táctica' },
];

const DAYS_OF_WEEK = [
  { label: 'L', value: 1 },
  { label: 'M', value: 2 },
  { label: 'X', value: 3 },
  { label: 'J', value: 4 },
  { label: 'V', value: 5 },
  { label: 'S', value: 6 },
  { label: 'D', value: 0 },
];

export const EntrenamientosGenerales = () => {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);

  // Estados Calendario Visual
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modales
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [trainingModalOpen, setTrainingModalOpen] = useState(false);

  const [viewAttendeesModalOpen, setViewAttendeesModalOpen] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<any[]>([]);

  // Modal de Detalle de un Día (Punto de entrada para pasar lista)
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [selectedDayTrainings, setSelectedDayTrainings] = useState<any[]>([]);
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);

  // Modal de Asistencia
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [checkedPlayers, setCheckedPlayers] = useState<string[]>([]);
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Formularios
  const [schedName, setSchedName] = useState('');
  const [schedStart, setSchedStart] = useState('17:00');
  const [schedEnd, setSchedEnd] = useState('19:00');
  const [schedDays, setSchedDays] = useState<number[]>([]);

  const [trainDesc, setTrainDesc] = useState('');
  const [trainDates, setTrainDates] = useState<[Date | null, Date | null]>([null, null]);
  const [trainScheduleId, setTrainScheduleId] = useState<string | null>(null);
  const [trainSkills, setTrainSkills] = useState<Record<string, boolean>>({});

  // Estados para Editar Horarios
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  // Estados para Ver Detalles del Programa
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [programDetails, setProgramDetails] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, trainRes, playRes] = await Promise.all([
        api.get(ENDPOINTS.GENERAL_TRAININGS.SCHEDULES),
        api.get(ENDPOINTS.GENERAL_TRAININGS.BASE),
        api.get(ENDPOINTS.USERS.BASE),
      ]);
      setSchedules(schedRes.data.data);
      setTrainings(trainRes.data.data);
      const members = Array.isArray(playRes.data.data) ? playRes.data.data : playRes.data;
      setPlayers(members.filter((m: any) => m.clubStatus === 'Aprobado'));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- ACCIONES API ---
  const handleOpenScheduleModal = (sch?: any) => {
    if (sch) {
      setEditingScheduleId(sch.id);
      setSchedName(sch.name);
      setSchedStart(sch.startTime);
      setSchedEnd(sch.endTime);
      setSchedDays(sch.daysOfWeek);
    } else {
      setEditingScheduleId(null);
      setSchedName('');
      setSchedStart('17:00');
      setSchedEnd('19:00');
      setSchedDays([]);
    }
    setScheduleModalOpen(true);
  };

  const handleSaveSchedule = async () => {
    try {
      const payload = {
        name: schedName,
        startTime: schedStart,
        endTime: schedEnd,
        daysOfWeek: schedDays,
      };

      if (editingScheduleId) {
        await api.put(`${ENDPOINTS.GENERAL_TRAININGS.SCHEDULES}/${editingScheduleId}`, payload);
      } else {
        await api.post(ENDPOINTS.GENERAL_TRAININGS.SCHEDULES, payload);
      }

      setScheduleModalOpen(false);
      setSchedDays([]);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleViewProgram = (training: any) => {
    // 1. Buscamos todas las sesiones que pertenecen a este mismo "Bloque"
    const programTrainings = trainings.filter(
      (t) => t.templateId === training.templateId && t.scheduleId === training.scheduleId,
    );
    if (programTrainings.length === 0) return;

    // 2. Calculamos inicio y fin
    const dates = programTrainings.map((t) => new Date(t.date).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // 3. Extraemos las habilidades marcadas como TRUE
    const activeSkills = SKILLS.filter((s) => training.template?.[s.key] === true);

    setProgramDetails({
      description: training.description,
      scheduleName: training.schedule?.name,
      minDate,
      maxDate,
      sessionCount: programTrainings.length,
      activeSkills,
    });
    setProgramModalOpen(true);
  };

  const handleCreateTraining = async () => {
    if (!trainDates[0] || !trainDates[1] || !trainScheduleId) return;
    try {
      await api.post(ENDPOINTS.GENERAL_TRAININGS.BASE, {
        description: trainDesc,
        startDate: new Date(trainDates[0]).toISOString(),
        endDate: new Date(trainDates[1]).toISOString(),
        scheduleId: trainScheduleId,
        skillsToTrain: trainSkills,
      });
      setTrainingModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteSchedule = (id: string, name: string) => {
    openAppConfirmModal({
      title: 'Eliminar Horario Base',
      icon: <IconTrash size={18} />,
      color: 'red',
      description:
        '¿Estás seguro de que deseas eliminar este horario? Las sesiones de entrenamiento que ya estén programadas en el calendario conservarán su asistencia y el progreso de los jugadores de forma intacta.',
      highlightText: name,
      confirmLabel: 'Sí, Eliminar',
      onConfirm: async () => {
        try {
          // Usamos la concatenación para llegar al endpoint correcto
          await api.delete(`${ENDPOINTS.GENERAL_TRAININGS.SCHEDULES}/${id}`);
          fetchData();
        } catch (error) {
          console.error(error);
        }
      },
    });
  };

  const openViewAttendees = (training: any) => {
    // Sacamos los IDs de los que tienen attended: true
    const attendedIds =
      training.attendances?.filter((a: any) => a.attended).map((a: any) => a.playerId) || [];
    // Filtramos la lista global de jugadores que ya tenemos en memoria
    const attendees = players.filter((p) => attendedIds.includes(p.id));

    setSelectedAttendees(attendees);
    setViewAttendeesModalOpen(true);
  };

  const openAttendanceModal = (training: any) => {
    setSelectedTrainingId(training.id);
    setLevelFilter(null);
    const attendedIds = training.attendances?.map((a: any) => a.playerId) || [];
    setCheckedPlayers(attendedIds);
    setDayModalOpen(false);
    setAttendanceModalOpen(true);
  };

  const handleSaveAttendance = async () => {
    if (!selectedTrainingId) return;
    setSavingAttendance(true);
    try {
      await api.put(ENDPOINTS.GENERAL_TRAININGS.BULK_ATTENDANCE(selectedTrainingId), {
        playerIds: checkedPlayers,
      });
      setAttendanceModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setSavingAttendance(false);
    }
  };

  // --- LÓGICA DEL CALENDARIO ---
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  let firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  if (firstDayOfMonth === 0) firstDayOfMonth = 7; // Ajuste para que la semana empiece en Lunes

  const blanks = Array.from({ length: firstDayOfMonth - 1 });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDayClick = (dayNumber: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
    const eventsOnDay = trainings.filter(
      (t) => new Date(t.date).toDateString() === clickedDate.toDateString(),
    );

    setSelectedDateForModal(clickedDate);
    setSelectedDayTrainings(eventsOnDay);
    setDayModalOpen(true);
  };

  const toggleSchedDay = (d: number) =>
    setSchedDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  const toggleSkill = (key: string) => setTrainSkills((prev) => ({ ...prev, [key]: !prev[key] }));
  const togglePlayer = (id: string) =>
    setCheckedPlayers((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const filteredPlayers = players.filter((p) => !levelFilter || p.level === levelFilter);

  if (loading)
    return (
      <Center h={400}>
        <Loader color="blue" />
      </Center>
    );

  return (
    <Stack gap="xl" maw={1000} mx="auto">
      <Group justify="space-between">
        <Group gap="sm">
          <ThemeIcon size={40} radius="md" color="blue" variant="light">
            <IconCalendarEvent size={24} />
          </ThemeIcon>
          <Title order={2}>Planificación y Grupos</Title>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        {/* COLUMNA IZQUIERDA: GESTIÓN DE HORARIOS */}
        <Card shadow="sm" p="md" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>Clases Fijas</Title>
            <ActionIcon color="blue" variant="light" onClick={() => handleOpenScheduleModal(true)}>
              <IconPlus size={18} />
            </ActionIcon>
          </Group>
          <Stack gap="xs">
            {schedules.map((sch) => (
              <Paper
                key={sch.id}
                withBorder
                p="sm"
                radius="md"
                bg="gray.0"
                style={{ darkHidden: true }}
              >
                <Group justify="space-between">
                  <div>
                    <Text fw={600} size="sm">
                      {sch.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {sch.startTime} - {sch.endTime}
                    </Text>
                    <Group gap={4} mt={4}>
                      {DAYS_OF_WEEK.map(
                        (d) =>
                          sch.daysOfWeek.includes(d.value) && (
                            <Badge key={d.value} size="xs" color="gray" variant="outline">
                              {d.label}
                            </Badge>
                          ),
                      )}
                    </Group>
                  </div>
                  <Group gap={4}>
                    <ActionIcon
                      color="blue"
                      variant="subtle"
                      onClick={() => handleOpenScheduleModal(sch)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => handleDeleteSchedule(sch.id, sch.name)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Paper>
            ))}
            {schedules.length === 0 && (
              <Text size="sm" c="dimmed">
                No hay horarios configurados.
              </Text>
            )}
          </Stack>
        </Card>

        {/* COLUMNA DERECHA: EL CALENDARIO GIGANTE */}
        <Card shadow="sm" p="md" radius="md" withBorder style={{ gridColumn: 'span 2' }}>
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
            <Button
              color="blue"
              leftSection={<IconPlus size={16} />}
              disabled={schedules.length === 0}
              onClick={() => setTrainingModalOpen(true)}
            >
              Programar
            </Button>
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
                    minHeight: 80,
                    backgroundColor: 'var(--mantine-color-gray-1)',
                    opacity: 0.5,
                    borderRadius: 8,
                  }}
                />
              ))}

              {days.map((dayNum) => {
                const isToday =
                  new Date().toDateString() ===
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    dayNum,
                  ).toDateString();
                const dayEvents = trainings.filter(
                  (t) =>
                    new Date(t.date).toDateString() ===
                    new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth(),
                      dayNum,
                    ).toDateString(),
                );

                return (
                  <Paper
                    key={dayNum}
                    withBorder
                    p={4}
                    radius="md"
                    style={{
                      minHeight: 80,
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
                          color={new Date(ev.date) < new Date() ? 'gray' : 'blue'}
                          variant="filled"
                          fullWidth
                          style={{ overflow: 'hidden' }}
                        >
                          {ev.schedule ? ev.schedule.startTime : 'Antiguo'}
                        </Badge>
                      ))}
                    </Stack>
                  </Paper>
                );
              })}
            </SimpleGrid>
          </Box>
        </Card>
      </SimpleGrid>

      {/* --- MODAL DE DÍA ESPECÍFICO --- */}
      <Modal
        opened={dayModalOpen}
        onClose={() => setDayModalOpen(false)}
        title={
          <Text size="lg" fw={700}>
            Sesiones del {selectedDateForModal?.toLocaleDateString()}
          </Text>
        }
        centered
      >
        <Stack gap="md">
          {selectedDayTrainings.length === 0 ? (
            <Center py="xl">
              <Text c="dimmed">No hay entrenamientos este día.</Text>
            </Center>
          ) : (
            selectedDayTrainings.map((tr) => {
              const isPast = new Date(tr.date) < new Date();
              return (
                <Paper key={tr.id} withBorder p="md" radius="md">
                  <Group justify="space-between" align="center">
                    <Group gap="xs">
                      <Text fw={700}>{tr.description || 'Entrenamiento Grupal'}</Text>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="blue"
                        onClick={() => handleViewProgram(tr)}
                      >
                        <IconInfoCircle size={16} />
                      </ActionIcon>
                    </Group>
                    {tr.schedule ? (
                      <Text size="sm" c="dimmed">
                        {tr.schedule.name} ({tr.schedule.startTime} - {tr.schedule.endTime})
                      </Text>
                    ) : (
                      <Badge variant="light" color="gray" mt={4}>
                        Horario Antiguo
                      </Badge>
                    )}
                    <Group gap="xs">
                      {isPast && tr.attendances?.length > 0 && (
                        <Button variant="light" color="cyan" onClick={() => openViewAttendees(tr)}>
                          Ver Asistentes ({tr.attendances.length})
                        </Button>
                      )}
                      <Button
                        variant={isPast ? 'filled' : 'light'}
                        color={isPast ? 'green' : 'gray'}
                        onClick={() => openAttendanceModal(tr)}
                      >
                        {isPast
                          ? tr.attendances?.length > 0
                            ? 'Editar Lista'
                            : 'Pasar Lista'
                          : 'Ver Inscritos'}
                      </Button>
                    </Group>
                  </Group>
                </Paper>
              );
            })
          )}
        </Stack>
      </Modal>

      {/* --- MODAL ASISTENCIA --- */}
      <Modal
        opened={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        title={
          <Text size="lg" fw={700}>
            Lista de Asistencia
          </Text>
        }
        size="xl"
        centered
      >
        <Stack gap="md">
          <Select
            label="Filtrar por Nivel"
            placeholder="Selecciona nivel"
            data={['Iniciacion', 'Principiante', 'Intermedio', 'Avanzado', 'Profesional']}
            value={levelFilter}
            onChange={setLevelFilter}
            clearable
          />
          <ScrollArea h={400}>
            <SimpleGrid cols={2} spacing="xs">
              {filteredPlayers.map((p) => (
                <Paper
                  key={p.id}
                  withBorder
                  p="xs"
                  radius="sm"
                  onClick={() => togglePlayer(p.id)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: checkedPlayers.includes(p.id)
                      ? 'var(--mantine-color-blue-light)'
                      : 'transparent',
                  }}
                >
                  <Group wrap="nowrap">
                    <Checkbox
                      checked={checkedPlayers.includes(p.id)}
                      onChange={() => {}}
                      tabIndex={-1}
                    />
                    <Avatar src={getPlayerAvatar(p.name, p.avatarUrl)} size="sm" radius="xl" />
                    <Text size="sm" fw={500}>
                      {p.name} {p.surname}
                    </Text>
                  </Group>
                </Paper>
              ))}
            </SimpleGrid>
          </ScrollArea>
          <Button fullWidth color="blue" onClick={handleSaveAttendance} loading={savingAttendance}>
            Sincronizar Asistencia ({checkedPlayers.length} Jugadores)
          </Button>
        </Stack>
      </Modal>

      {/* --- MODAL NUEVO ENTRENAMIENTO --- */}
      <Modal
        opened={trainingModalOpen}
        onClose={() => setTrainingModalOpen(false)}
        title="Programar Fechas"
        centered
        size="lg"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Selecciona las fechas. El sistema creará los entrenamientos automáticamente los días de
            la semana que tenga asignados la clase seleccionada.
          </Text>
          <TextInput
            label="Descripción (Opcional)"
            placeholder="Ej. Semana de Saques"
            value={trainDesc}
            onChange={(e) => setTrainDesc(e.currentTarget.value)}
          />
          <DatePickerInput
            type="range"
            label="Rango de Fechas"
            minDate={new Date()}
            required
            value={trainDates}
            onChange={(val) => setTrainDates(val as [Date | null, Date | null])}
          />
          <Select
            label="Horario Base"
            required
            data={schedules.map((s) => ({ value: s.id, label: s.name }))}
            value={trainScheduleId}
            onChange={setTrainScheduleId}
          />

          <Text fw={600} size="sm" mt="sm">
            ¿Qué habilidades se entrenarán?
          </Text>
          <SimpleGrid cols={2}>
            {SKILLS.map((s) => (
              <Checkbox
                key={s.key}
                label={s.label}
                checked={!!trainSkills[s.key]}
                onChange={() => toggleSkill(s.key)}
              />
            ))}
          </SimpleGrid>
          <Button
            color="blue"
            onClick={handleCreateTraining}
            mt="md"
            fullWidth
            disabled={!trainDates[0] || !trainDates[1] || !trainScheduleId}
          >
            Agendar Sesiones
          </Button>
        </Stack>
      </Modal>

      {/* --- MODAL NUEVO HORARIO --- */}
      <Modal
        opened={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Crear Horario Base"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Nombre de la Clase"
            placeholder="Ej. Clase Adultos"
            required
            value={schedName}
            onChange={(e) => setSchedName(e.currentTarget.value)}
          />
          <Group grow>
            <TextInput
              label="Hora Inicio"
              placeholder="17:00"
              required
              value={schedStart}
              onChange={(e) => setSchedStart(e.currentTarget.value)}
            />
            <TextInput
              label="Hora Fin"
              placeholder="19:00"
              required
              value={schedEnd}
              onChange={(e) => setSchedEnd(e.currentTarget.value)}
            />
          </Group>
          <Text fw={500} size="sm">
            Días de la semana
          </Text>
          <Group gap="xs">
            {DAYS_OF_WEEK.map((d) => (
              <Badge
                key={d.value}
                component="button"
                onClick={() => toggleSchedDay(d.value)}
                variant={schedDays.includes(d.value) ? 'filled' : 'outline'}
                color={schedDays.includes(d.value) ? 'blue' : 'gray'}
                style={{ cursor: 'pointer' }}
              >
                {d.label}
              </Badge>
            ))}
          </Group>
          <Button
            onClick={handleSaveSchedule}
            color="blue"
            fullWidth
            disabled={schedDays.length === 0}
          >
            Guardar Horario
          </Button>
        </Stack>
      </Modal>
      {/* --- MODAL VER DETALLES DEL PROGRAMA --- */}
      <Modal
        opened={programModalOpen}
        onClose={() => setProgramModalOpen(false)}
        title={
          <Text size="lg" fw={700}>
            Detalles del Programa
          </Text>
        }
        centered
      >
        {programDetails && (
          <Stack gap="md">
            <Paper withBorder p="sm" bg="var(--mantine-color-gray-0)" style={{ darkHidden: true }}>
              <Text fw={600} size="sm">
                Descripción del Bloque
              </Text>
              <Text size="sm" c="dimmed">
                {programDetails.description || 'Sin descripción especial.'}
              </Text>
            </Paper>

            <SimpleGrid cols={2}>
              <Paper withBorder p="sm" ta="center">
                <Text fw={600} size="xs" c="dimmed" tt="uppercase">
                  Fecha de Inicio
                </Text>
                <Text fw={700} size="lg" c="blue.7">
                  {programDetails.minDate.toLocaleDateString('es-ES')}
                </Text>
              </Paper>
              <Paper withBorder p="sm" ta="center">
                <Text fw={600} size="xs" c="dimmed" tt="uppercase">
                  Fecha de Fin
                </Text>
                <Text fw={700} size="lg" c="red.7">
                  {programDetails.maxDate.toLocaleDateString('es-ES')}
                </Text>
              </Paper>
            </SimpleGrid>

            <Group justify="space-between">
              <Text size="sm">
                <b>Horario Base:</b> {programDetails.scheduleName || 'Antiguo/Desconocido'}
              </Text>
              <Badge color="blue" variant="light" size="lg">
                {programDetails.sessionCount} Sesiones Totales
              </Badge>
            </Group>

            <Text fw={600} size="sm" mt="sm">
              Habilidades a entrenar:
            </Text>
            <Group gap="xs">
              {programDetails.activeSkills.length === 0 ? (
                <Text size="sm" c="dimmed">
                  No se seleccionó ninguna habilidad específica.
                </Text>
              ) : (
                programDetails.activeSkills.map((s: any) => (
                  <Badge key={s.key} color="orange" variant="dot">
                    {s.label}
                  </Badge>
                ))
              )}
            </Group>
          </Stack>
        )}
      </Modal>
      {/* --- MODAL VER ASISTENTES --- */}
      <Modal
        opened={viewAttendeesModalOpen}
        onClose={() => setViewAttendeesModalOpen(false)}
        title={
          <Text size="lg" fw={700}>
            Jugadores que asistieron
          </Text>
        }
        centered
      >
        <ScrollArea h={300} offsetScrollbars>
          <Stack gap="sm">
            {selectedAttendees.length === 0 ? (
              <Center py="xl">
                <Text c="dimmed">No hay registros de asistencia.</Text>
              </Center>
            ) : (
              selectedAttendees.map((p) => (
                <Paper key={p.id} withBorder p="xs" radius="md">
                  <Group wrap="nowrap">
                    <Avatar src={getPlayerAvatar(p.name, p.avatarUrl)} radius="xl" size="sm" />
                    <Text size="sm" fw={600}>
                      {p.name} {p.surname}
                    </Text>
                  </Group>
                </Paper>
              ))
            )}
          </Stack>
        </ScrollArea>
      </Modal>
    </Stack>
  );
};
