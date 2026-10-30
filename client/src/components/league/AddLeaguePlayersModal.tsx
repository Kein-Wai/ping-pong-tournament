import { Avatar, Button, Checkbox, Group, Modal, Paper, ScrollArea, SimpleGrid, Stack, Text } from '@mantine/core';
import { getPlayerAvatar } from '../../utils/avatar';
import { playerFullName } from '../../utils/leagueView';
import type { ClubPlayer } from '../../types/tournament';

interface AddLeaguePlayersModalProps {
  opened: boolean;
  onClose: () => void;
  /** Jugadores del club que todavía no están en la liga. */
  players: ClubPlayer[];
  checked: string[];
  onChange: (checked: string[]) => void;
  onSubmit: () => void;
  submitting: boolean;
}

export const AddLeaguePlayersModal = ({
  opened,
  onClose,
  players,
  checked,
  onChange,
  onSubmit,
  submitting,
}: AddLeaguePlayersModalProps) => {
  const toggle = (id: string) =>
    onChange(checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text size="lg" fw={700}>
          Añadir jugadores a la liga
        </Text>
      }
      size="xl"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Los jugadores que añadas quedan confirmados directamente.
        </Text>

        {players.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            Todos los jugadores del club ya están en la liga.
          </Text>
        ) : (
          <ScrollArea h={400}>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              {players.map((player) => {
                const isChecked = checked.includes(player.id);
                return (
                  <Paper
                    key={player.id}
                    withBorder
                    p="xs"
                    radius="sm"
                    onClick={() => toggle(player.id)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isChecked ? 'var(--mantine-color-blue-light)' : 'transparent',
                    }}
                  >
                    <Group wrap="nowrap">
                      <Checkbox checked={isChecked} onChange={() => {}} tabIndex={-1} />
                      <Avatar src={getPlayerAvatar(player.name, player.avatarUrl)} size="sm" radius="xl" />
                      <Text size="sm" fw={500}>
                        {playerFullName(player)}
                      </Text>
                    </Group>
                  </Paper>
                );
              })}
            </SimpleGrid>
          </ScrollArea>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={submitting} disabled={checked.length === 0}>
            Añadir {checked.length} jugadores
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
