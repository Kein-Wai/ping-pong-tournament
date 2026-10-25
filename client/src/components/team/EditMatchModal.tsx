import { Button, Group, Modal, NumberInput, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';

/**
 * Modal «Actualizar Partido»: datos del encuentro, estado y, si está
 * completado, el marcador. Un administrador puede además eliminarlo.
 *
 * Migration: extracción del modal de EquipoDetalles; el estado y las acciones
 * siguen en useEquipoPartido.
 */
export interface EditMatchModalProps {
  opened: boolean;
  onClose: () => void;
  teamName: string;
  /** Rival del partido tal como está guardado: rotula los puntos aunque se esté editando el nombre. */
  matchRivalName: string | undefined;
  rivalName: string;
  onRivalNameChange: (rivalName: string) => void;
  date: Date | null;
  onDateChange: (date: Date | null) => void;
  isHome: boolean;
  onIsHomeChange: (isHome: boolean) => void;
  location: string;
  onLocationChange: (location: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  ourScore: number | string;
  onOurScoreChange: (score: number | string) => void;
  rivalScore: number | string;
  onRivalScoreChange: (score: number | string) => void;
  canDelete: boolean;
  onDelete: () => void;
  onSave: () => void;
  saving: boolean;
}

export const EditMatchModal = ({
  opened,
  onClose,
  teamName,
  matchRivalName,
  rivalName,
  onRivalNameChange,
  date,
  onDateChange,
  isHome,
  onIsHomeChange,
  location,
  onLocationChange,
  status,
  onStatusChange,
  ourScore,
  onOurScoreChange,
  rivalScore,
  onRivalScoreChange,
  canDelete,
  onDelete,
  onSave,
  saving,
}: EditMatchModalProps) => (
  <Modal opened={opened} onClose={onClose} title={<Text fw={700}>Actualizar Partido</Text>} centered>
    <Stack gap="md">
      <TextInput
        label="Rival"
        value={rivalName}
        onChange={(e) => onRivalNameChange(e.currentTarget.value)}
      />
      <DateTimePicker
        label="Fecha y Hora"
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
        label="Localización"
        value={location}
        onChange={(e) => onLocationChange(e.currentTarget.value)}
      />

      <Select
        label="Estado del Encuentro"
        data={['Programado', 'Completado', 'Cancelado']}
        value={status}
        onChange={(val) => onStatusChange(val!)}
        allowDeselect={false}
        mt="sm"
      />

      {status === 'Completado' && (
        <SimpleGrid cols={2}>
          <NumberInput
            label={`Puntos: ${teamName}`}
            description="(Nosotros)"
            value={ourScore}
            onChange={onOurScoreChange}
            min={0}
            max={10}
          />
          <NumberInput
            label={`Puntos: ${matchRivalName}`}
            description="(Rival)"
            value={rivalScore}
            onChange={onRivalScoreChange}
            min={0}
            max={10}
          />
        </SimpleGrid>
      )}

      <Group grow mt="md">
        {canDelete && (
          <Button variant="light" color="red" onClick={onDelete}>
            Eliminar
          </Button>
        )}
        <Button
          color="blue"
          onClick={onSave}
          loading={saving}
          disabled={status === 'Completado' && (ourScore === '' || rivalScore === '')}
        >
          Guardar
        </Button>
      </Group>
    </Stack>
  </Modal>
);
