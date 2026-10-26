import { Badge, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';

import { DAYS_OF_WEEK } from '../../constants/generalTrainings';

interface ScheduleFormModalProps {
  opened: boolean;
  name: string;
  start: string;
  end: string;
  days: number[];
  onClose: () => void;
  onNameChange: (name: string) => void;
  onStartChange: (start: string) => void;
  onEndChange: (end: string) => void;
  onToggleDay: (day: number) => void;
  onSave: () => void;
}

/** Modal «Crear Horario Base»: nombre, franja y días de la semana de una clase fija. */
export const ScheduleFormModal = ({
  opened,
  name,
  start,
  end,
  days,
  onClose,
  onNameChange,
  onStartChange,
  onEndChange,
  onToggleDay,
  onSave,
}: ScheduleFormModalProps) => (
  <Modal opened={opened} onClose={onClose} title="Crear Horario Base" centered>
    <Stack gap="md">
      <TextInput
        label="Nombre de la Clase"
        placeholder="Ej. Clase Adultos"
        required
        value={name}
        onChange={(e) => onNameChange(e.currentTarget.value)}
      />
      <Group grow>
        <TextInput
          label="Hora Inicio"
          placeholder="17:00"
          required
          value={start}
          onChange={(e) => onStartChange(e.currentTarget.value)}
        />
        <TextInput
          label="Hora Fin"
          placeholder="19:00"
          required
          value={end}
          onChange={(e) => onEndChange(e.currentTarget.value)}
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
            onClick={() => onToggleDay(d.value)}
            variant={days.includes(d.value) ? 'filled' : 'outline'}
            color={days.includes(d.value) ? 'blue' : 'gray'}
            style={{ cursor: 'pointer' }}
          >
            {d.label}
          </Badge>
        ))}
      </Group>
      <Button onClick={onSave} color="blue" fullWidth disabled={days.length === 0}>
        Guardar Horario
      </Button>
    </Stack>
  </Modal>
);
