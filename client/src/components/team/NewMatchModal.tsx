import { Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';

/**
 * Modal «Programar Partido de Liga»: formulario para añadir un partido al
 * calendario del equipo.
 *
 * Migration: extracción del modal de EquipoDetalles; el estado y el guardado
 * siguen en useEquipoNuevoPartido.
 */
export interface NewMatchModalProps {
  opened: boolean;
  onClose: () => void;
  rivalName: string;
  onRivalNameChange: (rivalName: string) => void;
  date: Date | null;
  onDateChange: (date: Date | null) => void;
  isHome: boolean;
  onIsHomeChange: (isHome: boolean) => void;
  location: string;
  onLocationChange: (location: string) => void;
  onSave: () => void;
  saving: boolean;
}

export const NewMatchModal = ({
  opened,
  onClose,
  rivalName,
  onRivalNameChange,
  date,
  onDateChange,
  isHome,
  onIsHomeChange,
  location,
  onLocationChange,
  onSave,
  saving,
}: NewMatchModalProps) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={<Text fw={700}>Programar Partido de Liga</Text>}
    centered
  >
    <Stack gap="md">
      <TextInput
        label="Nombre del Club Rival"
        required
        value={rivalName}
        onChange={(e) => onRivalNameChange(e.currentTarget.value)}
      />
      <DateTimePicker
        label="Fecha y Hora"
        placeholder="Selecciona el día y la hora exacta"
        required
        value={date}
        onChange={(val) => onDateChange(val ? new Date(val) : null)}
        valueFormat="DD MMM YYYY HH:mm"
      />
      <Group grow>
        <Button
          variant={isHome ? 'filled' : 'outline'}
          color="blue"
          onClick={() => onIsHomeChange(true)}
        >
          Jugamos en Casa
        </Button>
        <Button
          variant={!isHome ? 'filled' : 'outline'}
          color="blue"
          onClick={() => onIsHomeChange(false)}
        >
          Jugamos Fuera
        </Button>
      </Group>
      <TextInput
        label="Dirección del local (Opcional)"
        placeholder="Pabellón, Calle..."
        value={location}
        onChange={(e) => onLocationChange(e.currentTarget.value)}
      />
      <Button
        fullWidth
        color="green"
        mt="md"
        onClick={onSave}
        loading={saving}
        disabled={!rivalName || !date}
      >
        Añadir al Calendario
      </Button>
    </Stack>
  </Modal>
);
