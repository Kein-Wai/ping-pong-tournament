import { Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { IconKey, IconMailFast } from '@tabler/icons-react';

import type { PlayerListItem } from '../../types/players';
import { isGuestEmail } from '../../utils/players';

interface ResetAccountModalProps {
  opened: boolean;
  player: PlayerListItem | null;
  email: string;
  sending: boolean;
  onClose: () => void;
  onEmailChange: (email: string) => void;
  onSubmit: () => void;
}

/**
 * Modal «Resetear Cuenta»: a un invitado sin correo real le pide uno para guardarlo y
 * enviarle el enlace; a un jugador con correo le envía el enlace de recuperación.
 */
export const ResetAccountModal = ({
  opened,
  player,
  email,
  sending,
  onClose,
  onEmailChange,
  onSubmit,
}: ResetAccountModalProps) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={
      <Group>
        <IconKey color="var(--mantine-color-grape-6)" />
        <Text fw={700}>Resetear Cuenta</Text>
      </Group>
    }
    centered
  >
    <Stack gap="md">
      {player && isGuestEmail(player.email) ? (
        <>
          <Text size="sm" c="dimmed">
            Este jugador fue creado por el club y <strong>no tiene un correo real asignado</strong>{' '}
            (Guest). Para que el jugador pueda entrar desde la aplicación móvil y ver sus
            estadísticas, debes introducir su correo electrónico real.
          </Text>
          <TextInput
            label="Asignar Correo Electrónico"
            placeholder="jugador@email.com"
            value={email}
            onChange={(e) => onEmailChange(e.currentTarget.value)}
            required
          />
          <Button
            fullWidth
            color="grape"
            leftSection={<IconMailFast size={18} />}
            loading={sending}
            onClick={onSubmit}
            disabled={!email.includes('@')}
          >
            Guardar Correo y Enviar Link
          </Button>
        </>
      ) : (
        <>
          <Text size="sm" c="dimmed">
            ¿El jugador {player?.name} ha olvidado su contraseña o no puede entrar?
          </Text>
          <TextInput
            label="Correo Electrónico de la Cuenta"
            value={email}
            onChange={(e) => onEmailChange(e.currentTarget.value)}
            required
          />
          <Text size="xs" c="dimmed" mt="-xs">
            Se enviará un enlace de recuperación seguro directamente a esta dirección.
          </Text>
          <Button
            fullWidth
            color="grape"
            leftSection={<IconMailFast size={18} />}
            loading={sending}
            onClick={onSubmit}
          >
            Enviar Enlace de Recuperación
          </Button>
        </>
      )}
    </Stack>
  </Modal>
);
