import {
  Modal,
  Group,
  Text,
  Badge,
  Stack,
  Paper,
  Select,
  ThemeIcon,
  Title,
  NumberInput,
  Button,
} from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';
import type { MatchToEdit } from '../../types/tournament';
import { calculateMatchScore } from '../../utils/matchScore';
import { isValidTableTennisSet } from '../../utils/matchValidation';
import { useMatchScore } from '../../hooks/useMatchScore';

export interface MatchResultModalProps {
  opened: boolean;
  onClose: () => void;
  match: MatchToEdit | null;
  submitting: boolean;
  onSave: () => void;
  onChange: (match: MatchToEdit) => void;
}

export const MatchResultModal = ({
  opened,
  onClose,
  match,
  submitting,
  onSave,
  onChange,
}: MatchResultModalProps) => {
  const stats = useMatchScore(match);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon color="blue" variant="light">
            <IconEdit size={18} />
          </ThemeIcon>
          <Title order={4}>Actualizar Marcador del Partido</Title>
        </Group>
      }
      size="lg"
      centered
    >
      {match && (
        <Stack gap="md">
          <Paper
            withBorder
            p="md"
            radius="md"
            bg="var(--mantine-color-gray-0)"
            style={{ darkHidden: true }}
          >
            <Group justify="space-between" align="center">
              <Stack gap={2} align="center" style={{ flex: 1 }}>
                <Text fw={700} ta="center" size="sm">
                  {match.playerOneName}
                </Text>
                <Badge
                  size="xl"
                  color={stats.p1Sets >= match.setsToWin ? 'green' : 'blue'}
                >
                  {stats.p1Sets} Sets
                </Badge>
              </Stack>

              <Stack gap={0} align="center">
                <Text fw={900} size="xl" c="dimmed">
                  VS
                </Text>
                <Text size="xs" c="dimmed">
                  Gana a los {match.setsToWin} sets
                </Text>
              </Stack>

              <Stack gap={2} align="center" style={{ flex: 1 }}>
                <Text fw={700} ta="center" size="sm">
                  {match.playerTwoName}
                </Text>
                <Badge
                  size="xl"
                  color={stats.p2Sets >= match.setsToWin ? 'green' : 'blue'}
                >
                  {stats.p2Sets} Sets
                </Badge>
              </Stack>
            </Group>
          </Paper>

          <Select
            label="Estado del Partido"
            data={[
              { value: 'Programado', label: 'Programado (Pendiente)' },
              { value: 'Iniciado', label: 'En Juego (Iniciado)' },
              {
                value: 'Completado',
                label: stats.isValidToComplete
                  ? 'Completado (Resultado Final)'
                  : `Completado (Requiere ${match.setsToWin} sets ganados)`,
              },
              { value: 'Cancelado', label: 'Cancelado' },
            ]}
            value={match.status}
            onChange={(val) => onChange({ ...match, status: val || 'Programado' })}
            allowDeselect={false}
          />

          <Text fw={600} size="sm" mt="xs">
            Puntuación Set a Set
          </Text>

          <Stack gap="xs">
            {Array.from({ length: match.setsToWin * 2 - 1 }).map((_, idx) => {
              const setNum = idx + 1;
              const fieldP1 = `set${setNum}P1` as keyof MatchToEdit;
              const fieldP2 = `set${setNum}P2` as keyof MatchToEdit;

              let winnerAlreadyReached = false;
              let p1RunningSets = 0;
              let p2RunningSets = 0;

              for (let prev = 1; prev < setNum; prev++) {
                const s1 = Number(match[`set${prev}P1` as keyof MatchToEdit] || 0);
                const s2 = Number(match[`set${prev}P2` as keyof MatchToEdit] || 0);
                const maxS = Math.max(s1, s2);
                const diffS = Math.abs(s1 - s2);

                if (maxS >= 11 && diffS >= 2) {
                  if (s1 > s2) p1RunningSets++;
                  else if (s2 > s1) p2RunningSets++;
                }
              }

              if (p1RunningSets >= match.setsToWin || p2RunningSets >= match.setsToWin) {
                winnerAlreadyReached = true;
              }

              let previousSetValid = true;
              if (setNum > 1) {
                const prevSetP1 = Number(
                  match[`set${setNum - 1}P1` as keyof MatchToEdit] || 0,
                );
                const prevSetP2 = Number(
                  match[`set${setNum - 1}P2` as keyof MatchToEdit] || 0,
                );

                previousSetValid = isValidTableTennisSet(prevSetP1, prevSetP2);
              }

              const isDisabled = !previousSetValid || winnerAlreadyReached;

              return (
                <Group key={setNum} grow align="center">
                  <Text
                    size="xs"
                    fw={700}
                    c={isDisabled ? 'dimmed' : 'blue'}
                    w={50}
                    style={{ opacity: isDisabled ? 0.5 : 1 }}
                  >
                    Set {setNum}
                    {winnerAlreadyReached && ' 🛑'}
                  </Text>
                  <NumberInput
                    placeholder="0"
                    min={0}
                    max={99}
                    disabled={isDisabled}
                    value={match[fieldP1] as number}
                    onChange={(val) => {
                      const newP1Val = Number(val || 0);

                      const updatedMatchState = { ...match, [fieldP1]: newP1Val };

                      const nextStats = calculateMatchScore(updatedMatchState);
                      onChange({
                        ...updatedMatchState,
                        status: nextStats.isValidToComplete ? 'Completado' : match.status,
                      });
                    }}
                  />
                  <Text ta="center" w={20} fw={700} c="dimmed">
                    -
                  </Text>
                  <NumberInput
                    placeholder="0"
                    min={0}
                    max={99}
                    disabled={isDisabled}
                    value={match[fieldP2] as number}
                    onChange={(val) => {
                      const newP2Val = Number(val || 0);

                      const updatedMatchState = { ...match, [fieldP2]: newP2Val };

                      const nextStats = calculateMatchScore(updatedMatchState);
                      onChange({
                        ...updatedMatchState,
                        status: nextStats.isValidToComplete ? 'Completado' : match.status,
                      });
                    }}
                  />
                </Group>
              );
            })}
          </Stack>

          <Button
            color="blue"
            fullWidth
            mt="md"
            loading={submitting}
            disabled={match.status === 'Completado' && !stats.isValidToComplete}
            onClick={onSave}
          >
            Guardar Marcador
          </Button>
        </Stack>
      )}
    </Modal>
  );
};

export default MatchResultModal;
