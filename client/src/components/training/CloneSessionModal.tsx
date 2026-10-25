import { useEffect, useState } from 'react';
import { Button, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { IconCopy } from '@tabler/icons-react';
import type { SourceSessionOption } from '../../hooks/useTrainingPlan';

/**
 * Modal para copiar los ejercicios de una sesion a otra.
 */

/** Propiedades del modal. */
export interface CloneSessionModalProps {
  opened: boolean;
  onClose: () => void;
  /** Sesion de destino (la que va a recibir los ejercicios). */
  targetSession?: { id: string; number: number } | null;
  /** Sesiones que tienen ejercicios y pueden ser origen. */
  sourceSessions: SourceSessionOption[];
  /** Callback con la sesion de origen elegida; devuelve si la accion tuvo exito. */
  onSubmit: (sourceSessionId: string) => Promise<boolean>;
  /** Si se esta guardando. */
  isSubmitting?: boolean;
}

export const CloneSessionModal = ({
  opened,
  onClose,
  targetSession,
  sourceSessions,
  onSubmit,
  isSubmitting = false,
}: CloneSessionModalProps) => {
  const [sourceSessionId, setSourceSessionId] = useState<string | null>(null);

  // Al cerrarse, con o sin enviar, no se arrastra la sesion elegida a la siguiente apertura.
  useEffect(() => {
    if (!opened) setSourceSessionId(null);
  }, [opened]);

  // Una sesion no puede ser origen de su propio clonado.
  const originOptions = sourceSessions.filter((session) => session.value !== targetSession?.id);

  const handleSubmit = async () => {
    if (!sourceSessionId) return;

    const succeeded = await onSubmit(sourceSessionId);
    if (succeeded) onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconCopy color="blue" />
          <Text fw={700} size="lg">
            Clonar Ejercicios a Sesión {targetSession?.number}
          </Text>{' '}
        </Group>
      }
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Selecciona la sesión de la cual deseas copiar todos los ejercicios:
        </Text>

        <Select
          label="Sesión Origen"
          placeholder="Selecciona una sesión con ejercicios..."
          data={originOptions}
          value={sourceSessionId}
          onChange={setSourceSessionId}
          required
        />

        <Button
          color="blue"
          fullWidth
          mt="md"
          disabled={!sourceSessionId}
          loading={isSubmitting}
          onClick={handleSubmit}
        >
          Copiar Ejercicios
        </Button>
      </Stack>
    </Modal>
  );
};

export default CloneSessionModal;
