import { Center, Group, Loader, SimpleGrid, Stack, ThemeIcon, Title } from '@mantine/core';
import { IconCalendarEvent } from '@tabler/icons-react';
import { useEntrenamientosGenerales } from '../../hooks/useEntrenamientosGenerales';
import { useEntrenamientoAsistencia } from '../../hooks/useEntrenamientoAsistencia';
import { useEntrenamientoCalendario } from '../../hooks/useEntrenamientoCalendario';
import { useEntrenamientoHorarios } from '../../hooks/useEntrenamientoHorarios';
import { useEntrenamientoProgramacion } from '../../hooks/useEntrenamientoProgramacion';
import { AttendanceListModal } from '../../components/generalTraining/AttendanceListModal';
import { AttendeesModal } from '../../components/generalTraining/AttendeesModal';
import { DaySessionsModal } from '../../components/generalTraining/DaySessionsModal';
import { ProgramDetailsModal } from '../../components/generalTraining/ProgramDetailsModal';
import { ProgramTrainingModal } from '../../components/generalTraining/ProgramTrainingModal';
import { ScheduleFormModal } from '../../components/generalTraining/ScheduleFormModal';
import { ScheduleList } from '../../components/generalTraining/ScheduleList';
import { TrainingCalendar } from '../../components/generalTraining/TrainingCalendar';

export const EntrenamientosGenerales = () => {
  const { loading, schedules, trainings, players, refetch: fetchData } = useEntrenamientosGenerales();

  const {
    currentDate,
    blanks,
    days,
    prevMonth,
    nextMonth,
    getScheduleColor,
    dayModalOpen,
    setDayModalOpen,
    selectedDayTrainings,
    selectedDateForModal,
    handleDayClick,
    programModalOpen,
    setProgramModalOpen,
    programDetails,
    handleViewProgram,
  } = useEntrenamientoCalendario({ trainings, schedules });

  const {
    scheduleModalOpen,
    setScheduleModalOpen,
    schedName,
    setSchedName,
    schedStart,
    setSchedStart,
    schedEnd,
    setSchedEnd,
    schedDays,
    toggleSchedDay,
    handleOpenScheduleModal,
    handleSaveSchedule,
    handleDeleteSchedule,
  } = useEntrenamientoHorarios({ refetch: fetchData });

  const {
    trainingModalOpen,
    setTrainingModalOpen,
    trainDesc,
    setTrainDesc,
    trainDates,
    setTrainDates,
    trainScheduleId,
    setTrainScheduleId,
    trainSkills,
    toggleSkill,
    handleCreateTraining,
  } = useEntrenamientoProgramacion({ refetch: fetchData });

  const {
    viewAttendeesModalOpen,
    setViewAttendeesModalOpen,
    selectedAttendees,
    attendanceModalOpen,
    setAttendanceModalOpen,
    levelFilter,
    setLevelFilter,
    checkedPlayers,
    savingAttendance,
    filteredPlayers,
    openViewAttendees,
    openAttendanceModal,
    handleSaveAttendance,
    togglePlayer,
  } = useEntrenamientoAsistencia({
    players,
    refetch: fetchData,
    onOpenAttendance: () => setDayModalOpen(false),
  });

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
        <ScheduleList
          schedules={schedules}
          getScheduleColor={getScheduleColor}
          onAdd={() => handleOpenScheduleModal()}
          onEdit={handleOpenScheduleModal}
          onDelete={handleDeleteSchedule}
        />

        <TrainingCalendar
          currentDate={currentDate}
          blanks={blanks}
          days={days}
          trainings={trainings}
          getScheduleColor={getScheduleColor}
          canProgram={schedules.length > 0}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          onDayClick={handleDayClick}
          onProgram={() => setTrainingModalOpen(true)}
        />
      </SimpleGrid>

      <DaySessionsModal
        opened={dayModalOpen}
        date={selectedDateForModal}
        sessions={selectedDayTrainings}
        getScheduleColor={getScheduleColor}
        onClose={() => setDayModalOpen(false)}
        onViewProgram={handleViewProgram}
        onViewAttendees={openViewAttendees}
        onAttendance={openAttendanceModal}
      />

      <AttendanceListModal
        opened={attendanceModalOpen}
        players={filteredPlayers}
        checkedPlayers={checkedPlayers}
        levelFilter={levelFilter}
        saving={savingAttendance}
        onClose={() => setAttendanceModalOpen(false)}
        onLevelChange={setLevelFilter}
        onTogglePlayer={togglePlayer}
        onSave={handleSaveAttendance}
      />

      <ProgramTrainingModal
        opened={trainingModalOpen}
        schedules={schedules}
        description={trainDesc}
        dates={trainDates}
        scheduleId={trainScheduleId}
        skills={trainSkills}
        onClose={() => setTrainingModalOpen(false)}
        onDescriptionChange={setTrainDesc}
        onDatesChange={setTrainDates}
        onScheduleChange={setTrainScheduleId}
        onToggleSkill={toggleSkill}
        onSubmit={handleCreateTraining}
      />

      <ScheduleFormModal
        opened={scheduleModalOpen}
        name={schedName}
        start={schedStart}
        end={schedEnd}
        days={schedDays}
        onClose={() => setScheduleModalOpen(false)}
        onNameChange={setSchedName}
        onStartChange={setSchedStart}
        onEndChange={setSchedEnd}
        onToggleDay={toggleSchedDay}
        onSave={handleSaveSchedule}
      />

      <ProgramDetailsModal
        opened={programModalOpen}
        details={programDetails}
        onClose={() => setProgramModalOpen(false)}
      />
      <AttendeesModal
        opened={viewAttendeesModalOpen}
        attendees={selectedAttendees}
        onClose={() => setViewAttendeesModalOpen(false)}
      />
    </Stack>
  );
};
