import { Modal, Stack, Text, Group, Badge } from '@mantine/core';
import type { BracketMatch } from '../../types/tournament';

export interface MatchResultViewModalProps {
  opened: boolean;
  onClose: () => void;
  selectedMatch: BracketMatch | null;
}

export const MatchResultViewModal = ({
  opened,
  onClose,
  selectedMatch,
}: MatchResultViewModalProps) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={700}>Resultado del Partido</Text>}
      centered
    >
      {selectedMatch && (
        <Stack align="center" gap="md">
          <Group w="100%" justify="space-between">
            <Text fw={600} size="lg">
              {selectedMatch.playerOne?.name} {selectedMatch.playerOne?.surname || ''}
            </Text>
            <Text c="dimmed">vs</Text>
            <Text fw={600} size="lg">
              {selectedMatch.playerTwo?.name} {selectedMatch.playerTwo?.surname || ''}
            </Text>
          </Group>

          <Stack gap="xs" align="center" w="100%">
            {selectedMatch.setOnePlayerOne !== null && (
              <Badge size="lg" variant="light" color="blue">
                Set 1: {selectedMatch.setOnePlayerOne} - {selectedMatch.setOnePlayerTwo}
              </Badge>
            )}
            {selectedMatch.setTwoPlayerOne !== null && (
              <Badge size="lg" variant="light" color="blue">
                Set 2: {selectedMatch.setTwoPlayerOne} - {selectedMatch.setTwoPlayerTwo}
              </Badge>
            )}
            {selectedMatch.setThreePlayerOne !== null && (
              <Badge size="lg" variant="light" color="blue">
                Set 3: {selectedMatch.setThreePlayerOne} - {selectedMatch.setThreePlayerTwo}
              </Badge>
            )}
            {selectedMatch.setFourPlayerOne !== null &&
              selectedMatch.setFourPlayerOne !== 0 && (
                <Badge size="lg" variant="light" color="blue">
                  Set 4: {selectedMatch.setFourPlayerOne} - {selectedMatch.setFourPlayerTwo}
                </Badge>
              )}
            {selectedMatch.setFivePlayerOne !== null &&
              selectedMatch.setFivePlayerOne !== 0 && (
                <Badge size="lg" variant="light" color="blue">
                  Set 5: {selectedMatch.setFivePlayerOne} - {selectedMatch.setFivePlayerTwo}
                </Badge>
              )}
          </Stack>
        </Stack>
      )}
    </Modal>
  );
};

export default MatchResultViewModal;
