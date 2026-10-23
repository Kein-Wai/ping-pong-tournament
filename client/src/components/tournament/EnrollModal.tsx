import type { Dispatch, SetStateAction } from 'react';
import {
  Modal,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  ScrollArea,
  SimpleGrid,
  Paper,
  Checkbox,
  Avatar,
} from '@mantine/core';
import { getPlayerAvatar } from '../../utils/avatar';
import type { Tournament, TournamentParticipant, ClubPlayer } from '../../types/tournament';

export interface EnrollModalProps {
  opened: boolean;
  onClose: () => void;
  tournament: Tournament | null;
  participants: TournamentParticipant[] | null;
  clubPlayers: ClubPlayer[];
  checkedToEnroll: string[];
  setCheckedToEnroll: Dispatch<SetStateAction<string[]>>;
  onEnroll: () => void;
  enrolling: boolean;
}

export const EnrollModal = ({
  opened,
  onClose,
  tournament,
  participants,
  clubPlayers,
  checkedToEnroll,
  setCheckedToEnroll,
  onEnroll,
  enrolling,
}: EnrollModalProps) => {
  const availableSpots = (tournament?.numPlayers || 0) - (participants?.length || 0);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text size="lg" fw={700}>
          Inscripción Manual (Entrenador)
        </Text>
      }
      size="xl"
      centered
    >
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Selecciona los jugadores que deseas inscribir directamente al torneo.
          </Text>
          <Badge
            color={checkedToEnroll.length === availableSpots ? 'red' : 'blue'}
            variant="light"
          >
            {checkedToEnroll.length} / {availableSpots} Plazas
          </Badge>
        </Group>

        <ScrollArea h={400}>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
            {clubPlayers
              .filter((p) => !participants?.some((part) => part.player.id === p.id))
              .map((p) => {
                const isChecked = checkedToEnroll.includes(p.id);
                const isMaxedOut = !isChecked && checkedToEnroll.length >= availableSpots;

                return (
                  <Paper
                    key={p.id}
                    withBorder
                    p="xs"
                    radius="sm"
                    onClick={() => {
                      if (isChecked) {
                        setCheckedToEnroll((prev) => prev.filter((x) => x !== p.id));
                      } else if (!isMaxedOut) {
                        setCheckedToEnroll((prev) => [...prev, p.id]);
                      }
                    }}
                    style={{
                      cursor: isMaxedOut ? 'not-allowed' : 'pointer',
                      backgroundColor: isChecked
                        ? 'var(--mantine-color-blue-light)'
                        : 'transparent',
                      opacity: isMaxedOut ? 0.4 : 1,
                    }}
                  >
                    <Group wrap="nowrap">
                      <Checkbox
                        checked={isChecked}
                        onChange={() => {}}
                        tabIndex={-1}
                        disabled={isMaxedOut}
                      />
                      <Avatar
                        src={getPlayerAvatar(p.name, p.avatarUrl)}
                        size="sm"
                        radius="xl"
                      />
                      <Text size="sm" fw={500} c={isMaxedOut ? 'dimmed' : ''}>
                        {p.name} {p.surname}
                      </Text>
                    </Group>
                  </Paper>
                );
              })}

            {clubPlayers.filter(
              (p) => !participants?.some((part) => part.player.id === p.id),
            ).length === 0 && (
              <Text c="dimmed" size="sm">
                No hay más jugadores disponibles en el club para inscribir.
              </Text>
            )}
          </SimpleGrid>
        </ScrollArea>

        <Button
          fullWidth
          color="blue"
          onClick={onEnroll}
          loading={enrolling}
          disabled={checkedToEnroll.length === 0}
        >
          Inscribir {checkedToEnroll.length} Jugadores
        </Button>
      </Stack>
    </Modal>
  );
};

export default EnrollModal;
