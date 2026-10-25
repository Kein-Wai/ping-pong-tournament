import { Button, Checkbox, Modal, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';

import { SKILL_FIELDS } from '../../constants/skills';
import type { GeneralTrainingSchedule } from '../../types/api';

interface ProgramTrainingModalProps {
  opened: boolean;
  schedules: GeneralTrainingSchedule[];
  description: string;
  dates: [Date | null, Date | null];
  scheduleId: string | null;
  skills: Record<string, boolean>;
  onClose: () => void;
  onDescriptionChange: (description: string) => void;
  onDatesChange: (dates: [Date | null, Date | null]) => void;
  onScheduleChange: (scheduleId: string | null) => void;
  onToggleSkill: (key: string) => void;
  onSubmit: () => void;
}

/** Modal «Programar Fechas»: crea las sesiones de un rango de fechas con un horario y las habilidades a entrenar. */
export const ProgramTrainingModal = ({
  opened,
  schedules,
  description,
  dates,
  scheduleId,
  skills,
  onClose,
  onDescriptionChange,
  onDatesChange,
  onScheduleChange,
  onToggleSkill,
  onSubmit,
}: ProgramTrainingModalProps) => (
  <Modal opened={opened} onClose={onClose} title="Programar Fechas" centered size="lg">
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Selecciona las fechas. El sistema creará los entrenamientos automáticamente los días de la
        semana que tenga asignados la clase seleccionada.
      </Text>
      <TextInput
        label="Descripción (Opcional)"
        placeholder="Ej. Semana de Saques"
        value={description}
        onChange={(e) => onDescriptionChange(e.currentTarget.value)}
      />
      <DatePickerInput
        type="range"
        label="Rango de Fechas"
        minDate={new Date()}
        required
        value={dates}
        onChange={(val) => onDatesChange(val as [Date | null, Date | null])}
      />
      <Select
        label="Horario Base"
        required
        data={schedules.map((s) => ({ value: s.id, label: s.name }))}
        value={scheduleId}
        onChange={onScheduleChange}
      />

      <Text fw={600} size="sm" mt="sm">
        ¿Qué habilidades se entrenarán?
      </Text>
      <SimpleGrid cols={2}>
        {SKILL_FIELDS.map((s) => (
          <Checkbox
            key={s.key}
            label={s.label}
            checked={!!skills[s.key]}
            onChange={() => onToggleSkill(s.key)}
          />
        ))}
      </SimpleGrid>
      <Button
        color="blue"
        onClick={onSubmit}
        mt="md"
        fullWidth
        disabled={!dates[0] || !dates[1] || !scheduleId}
      >
        Agendar Sesiones
      </Button>
    </Stack>
  </Modal>
);
