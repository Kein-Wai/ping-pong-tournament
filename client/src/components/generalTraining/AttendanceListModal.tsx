import {
  Avatar,
  Button,
  Checkbox,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';

import type { User } from '../../types/api';
import { getPlayerAvatar } from '../../utils/avatar';

interface AttendanceListModalProps {
  opened: boolean;
  /** Jugadores a mostrar, ya filtrados por nivel. */
  players: User[];
  checkedPlayers: string[];
  levelFilter: string | null;
  saving: boolean;
  onClose: () => void;
  onLevelChange: (level: string | null) => void;
  onTogglePlayer: (playerId: string) => void;
  onSave: () => void;
}

/** Modal «Lista de Asistencia»: marca a los jugadores presentes en una sesión y la sincroniza. */
export const AttendanceListModal = ({
  opened,
  players,
  checkedPlayers,
  levelFilter,
  saving,
  onClose,
  onLevelChange,
  onTogglePlayer,
  onSave,
}: AttendanceListModalProps) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={
      <Text size="lg" fw={700}>
        Lista de Asistencia
      </Text>
    }
    size="xl"
    centered
  >
    <Stack gap="md">
      <Select
        label="Filtrar por Nivel"
        placeholder="Selecciona nivel"
        data={['Iniciacion', 'Principiante', 'Intermedio', 'Avanzado', 'Profesional']}
        value={levelFilter}
        onChange={onLevelChange}
        clearable
      />
      <ScrollArea h={400}>
        <SimpleGrid cols={2} spacing="xs">
          {players.map((p) => (
            <Paper
              key={p.id}
              withBorder
              p="xs"
              radius="sm"
              onClick={() => onTogglePlayer(p.id)}
              style={{
                cursor: 'pointer',
                backgroundColor: checkedPlayers.includes(p.id)
                  ? 'var(--mantine-color-blue-light)'
                  : 'transparent',
              }}
            >
              <Group wrap="nowrap">
                <Checkbox checked={checkedPlayers.includes(p.id)} onChange={() => {}} tabIndex={-1} />
                <Avatar src={getPlayerAvatar(p.name, p.avatarUrl)} size="sm" radius="xl" />
                <Text size="sm" fw={500}>
                  {p.name} {p.surname}
                </Text>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      </ScrollArea>
      <Button fullWidth color="blue" onClick={onSave} loading={saving}>
        Sincronizar Asistencia ({checkedPlayers.length} Jugadores)
      </Button>
    </Stack>
  </Modal>
);
