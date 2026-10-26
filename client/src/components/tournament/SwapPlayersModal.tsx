import type { Dispatch, SetStateAction } from 'react';
import { Modal, Stack, Text, Alert, Select, Center, Button } from '@mantine/core';
import { IconArrowsExchange, IconLock } from '@tabler/icons-react';

export interface SwapPlayersModalProps {
  opened: boolean;
  onClose: () => void;
  swapOptions: { value: string; label: string }[];
  swapPlayerA: string | null;
  setSwapPlayerA: Dispatch<SetStateAction<string | null>>;
  swapPlayerB: string | null;
  setSwapPlayerB: Dispatch<SetStateAction<string | null>>;
  isSwapping: boolean;
  onSwap: () => void;
}

export const SwapPlayersModal = ({
  opened,
  onClose,
  swapOptions,
  swapPlayerA,
  setSwapPlayerA,
  swapPlayerB,
  setSwapPlayerB,
  isSwapping,
  onSwap,
}: SwapPlayersModalProps) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={700}>Intercambiar Jugadores</Text>}
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Selecciona dos jugadores reales inscritos. Sus posiciones y partidos en la fase actual
          se intercambiarán automáticamente.
        </Text>

        <Alert color="orange" title="Bloqueo de Sorteo" icon={<IconLock size={16} />}>
          Esta opción solo es válida <b>antes</b> de que comience el primer partido de la fase
          actual. Una vez rueda la bola, el sorteo queda cerrado.
        </Alert>

        <Select
          label="Jugador A"
          placeholder="Selecciona jugador..."
          data={swapOptions}
          value={swapPlayerA}
          onChange={setSwapPlayerA}
          searchable
        />
        <Center>
          <IconArrowsExchange size={24} color="var(--mantine-color-gray-5)" />
        </Center>
        <Select
          label="Jugador B (Sustituto)"
          placeholder="Selecciona jugador..."
          data={swapOptions}
          value={swapPlayerB}
          onChange={setSwapPlayerB}
          searchable
        />

        <Button
          fullWidth
          color="violet"
          loading={isSwapping}
          onClick={onSwap}
          disabled={!swapPlayerA || !swapPlayerB || swapPlayerA === swapPlayerB}
        >
          Realizar Intercambio
        </Button>
      </Stack>
    </Modal>
  );
};

export default SwapPlayersModal;
