import { Button, Modal, Stack, Text, Textarea, Title } from '@mantine/core';
import { IconTrophy } from '@tabler/icons-react';

interface EndMatchModalProps {
  opened: boolean;
  mySets: number | string;
  oppSets: number | string;
  notes: string;
  onClose: () => void;
  onNotesChange: (notes: string) => void;
  onSave: () => void;
}

/** Aviso «¡Partido Finalizado!»: resultado de sets y conclusiones antes de cerrar el partido. */
export const EndMatchModal = ({
  opened,
  mySets,
  oppSets,
  notes,
  onClose,
  onNotesChange,
  onSave,
}: EndMatchModalProps) => (
  <Modal
    opened={opened}
    onClose={onClose}
    withCloseButton={false}
    centered
    closeOnClickOutside={false}
  >
    <Stack align="center">
      <IconTrophy size={60} color="var(--mantine-color-blue-5)" />
      <Title order={2}>¡Partido Finalizado!</Title>
      <Text size="xl" fw={700}>
        Resultado Final: {mySets} - {oppSets}
      </Text>
      <Textarea
        w="100%"
        label="Conclusiones rápidas"
        placeholder="Ej: He sacado mal, me costaba leer el efecto..."
        minRows={3}
        value={notes}
        onChange={(e) => onNotesChange(e.currentTarget.value)}
      />
      <Button fullWidth color="blue" mt="md" onClick={onSave}>
        Guardar Conclusiones y Cerrar
      </Button>
    </Stack>
  </Modal>
);
