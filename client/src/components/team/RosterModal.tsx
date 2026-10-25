import type { Dispatch, SetStateAction } from 'react';
import {
  Avatar,
  Button,
  Checkbox,
  Group,
  Modal,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { getPlayerAvatar } from '../../utils/avatar';
import type { User } from '../../types/api';

/**
 * Modal «Ajustar Plantilla»: los jugadores aprobados del club, con la plantilla
 * actual marcada, para sincronizarla con el equipo.
 *
 * Migration: extracción del modal de EquipoDetalles; el estado y el guardado
 * siguen en useEquipoPlantilla.
 */
export interface RosterModalProps {
  opened: boolean;
  onClose: () => void;
  players: User[];
  checkedPlayers: string[];
  onCheckedChange: Dispatch<SetStateAction<string[]>>;
  onSave: () => void;
  saving: boolean;
}

export const RosterModal = ({
  opened,
  onClose,
  players,
  checkedPlayers,
  onCheckedChange,
  onSave,
  saving,
}: RosterModalProps) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={<Text fw={700}>Ajustar Plantilla</Text>}
    size="xl"
    centered
  >
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        El nivel del equipo se recalculará en base al jugador con el nivel más bajo seleccionado.
      </Text>
      <ScrollArea h={400}>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          {players.map((p) => {
            const isChecked = checkedPlayers.includes(p.id);
            return (
              <Paper
                key={p.id}
                withBorder
                p="xs"
                radius="sm"
                onClick={() =>
                  onCheckedChange((prev) =>
                    isChecked ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                  )
                }
                style={{
                  cursor: 'pointer',
                  backgroundColor: isChecked ? 'var(--mantine-color-blue-light)' : 'transparent',
                }}
              >
                <Group wrap="nowrap">
                  <Checkbox checked={isChecked} onChange={() => {}} tabIndex={-1} />
                  <Avatar src={getPlayerAvatar(p.name, p.avatarUrl)} size="sm" radius="xl" />
                  <div>
                    <Text size="sm" fw={500}>
                      {p.name} {p.surname}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {p.level}
                    </Text>
                  </div>
                </Group>
              </Paper>
            );
          })}
        </SimpleGrid>
      </ScrollArea>
      <Button fullWidth color="blue" onClick={onSave} loading={saving}>
        Sincronizar Plantilla
      </Button>
    </Stack>
  </Modal>
);
