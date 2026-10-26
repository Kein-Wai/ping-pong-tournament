import { Button, Modal, NumberInput, Stack, Text } from '@mantine/core';

interface EditEloModalProps {
  opened: boolean;
  /** Nombre del jugador cuyo ELO se ajusta. */
  playerName: string | undefined;
  elo: number | string;
  onClose: () => void;
  onEloChange: (elo: number | string) => void;
  onSave: () => void;
}

/** Modal «Ajustar Nivel ELO»: corrección manual de los puntos de clasificación de un jugador. */
export const EditEloModal = ({
  opened,
  playerName,
  elo,
  onClose,
  onEloChange,
  onSave,
}: EditEloModalProps) => (
  <Modal opened={opened} onClose={onClose} title={<Text fw={700}>Ajustar Nivel ELO</Text>} centered>
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Ajusta manualmente los puntos de clasificación de {playerName}.
      </Text>
      <NumberInput
        label="Puntuación ELO"
        value={elo}
        onChange={onEloChange}
        min={0}
        step={10}
        max={3000}
      />
      <Button fullWidth color="blue" onClick={onSave}>
        Guardar Cambios
      </Button>
    </Stack>
  </Modal>
);
