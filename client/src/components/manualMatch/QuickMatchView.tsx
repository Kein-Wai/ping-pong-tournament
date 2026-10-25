import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { IconArrowLeft, IconDeviceFloppy, IconEdit } from '@tabler/icons-react';

import { SKILLS_LIST } from '../../constants/manualMatch';
import type { QuickSetScore, TrackedMatch } from '../../types/manualMatch';
import { isReadyToComplete } from '../../utils/manual-match';
import { PlanningAccordion } from './PlanningAccordion';

interface QuickMatchViewProps {
  match: TrackedMatch;
  mySets: number | string;
  oppSets: number | string;
  totalSetsPlayed: number;
  setScores: QuickSetScore[];
  strChecked: string[];
  strDetails: string;
  weakChecked: string[];
  weakDetails: string;
  onMySetsChange: (value: number | string) => void;
  onOppSetsChange: (value: number | string) => void;
  onScoreChange: (index: number, field: 'myScore' | 'oppScore', value: number | string) => void;
  onToggleStrength: (skill: string, isChecked: boolean) => void;
  onStrDetailsChange: (value: string) => void;
  onToggleWeakness: (skill: string, isChecked: boolean) => void;
  onWeakDetailsChange: (value: string) => void;
  onComplete: () => void;
  onEditRival: () => void;
  onBack: () => void;
}

/** Análisis rápido: sets ganados, tanteo por set opcional, fortalezas y fallos, y cierre del partido. */
export const QuickMatchView = ({
  match,
  mySets,
  oppSets,
  totalSetsPlayed,
  setScores,
  strChecked,
  strDetails,
  weakChecked,
  weakDetails,
  onMySetsChange,
  onOppSetsChange,
  onScoreChange,
  onToggleStrength,
  onStrDetailsChange,
  onToggleWeakness,
  onWeakDetailsChange,
  onComplete,
  onEditRival,
  onBack,
}: QuickMatchViewProps) => {
  const target = match.setsToWin;
  const ready = isReadyToComplete(Number(mySets), Number(oppSets), target);

  return (
    <Stack gap="xl" style={{ maxWidth: 800, margin: '0 auto' }}>
      <Button
        variant="subtle"
        color="gray"
        leftSection={<IconArrowLeft size={16} />}
        onClick={onBack}
        w="max-content"
      >
        Volver a Análisis
      </Button>

      {match.planningNotes && <PlanningAccordion planningNotes={match.planningNotes} />}

      <Paper withBorder p="xl" radius="md">
        <Group justify="space-between" mb="lg">
          <Group gap="xs">
            <Title order={3}>vs {match.opponentName}</Title>
            <ActionIcon variant="light" color="blue" onClick={onEditRival}>
              <IconEdit size={16} />
            </ActionIcon>
          </Group>
          <Badge color="blue" variant="light">
            Al mejor de {match.setsToWin} Sets
          </Badge>
        </Group>

        <SimpleGrid cols={2} mb="xl">
          <NumberInput
            label="Tus Sets Ganados"
            min={0}
            max={match.setsToWin}
            clampBehavior="strict" // 👈 MAGIA DE MANTINE v7
            allowNegative={false}
            value={mySets}
            onChange={onMySetsChange}
            size="md"
          />
          <NumberInput
            label={`Sets de ${match.opponentName}`}
            min={0}
            max={match.setsToWin}
            clampBehavior="strict" // 👈 MAGIA DE MANTINE v7
            allowNegative={false}
            value={oppSets}
            onChange={onOppSetsChange}
            size="md"
          />
        </SimpleGrid>
        {totalSetsPlayed > 0 && (
          <Paper withBorder p="md" bg="var(--mantine-color-gray-0)" mb="xl">
            <Title order={5} mb="xs">
              Tanteo por Set (Opcional)
            </Title>
            {setScores.map((score, idx) => (
              <Group key={idx} grow mb="xs">
                <NumberInput
                  label={`Set ${idx + 1} (Tú)`}
                  value={score.myScore}
                  onChange={(v) => onScoreChange(idx, 'myScore', v)}
                  min={0}
                />
                <NumberInput
                  label={`Set ${idx + 1} (${match.opponentName})`}
                  value={score.oppScore}
                  onChange={(v) => onScoreChange(idx, 'oppScore', v)}
                  min={0}
                />
              </Group>
            ))}
          </Paper>
        )}
        <Title order={5} mb="sm" c="green.7">
          ✅ Qué fortalezas tuve en el partido
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} mb="sm">
          {SKILLS_LIST.map((skill) => (
            <Checkbox
              key={`str-${skill}`}
              label={skill}
              checked={strChecked.includes(skill)}
              onChange={(e) => onToggleStrength(skill, e.currentTarget.checked)}
            />
          ))}
        </SimpleGrid>
        <Textarea
          label="Más Detalles"
          placeholder="Escribe más sobre tus aciertos..."
          minRows={2}
          value={strDetails}
          onChange={(e) => onStrDetailsChange(e.currentTarget.value)}
          mb="xl"
        />

        <Title order={5} mb="sm" c="red.7">
          ❌ Qué fallé durante el partido
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} mb="sm">
          {SKILLS_LIST.map((skill) => (
            <Checkbox
              key={`weak-${skill}`}
              label={skill}
              checked={weakChecked.includes(skill)}
              onChange={(e) => onToggleWeakness(skill, e.currentTarget.checked)}
            />
          ))}
        </SimpleGrid>
        <Textarea
          label="Más Detalles"
          placeholder="Escribe más sobre tus fallos o cosas a mejorar..."
          minRows={2}
          value={weakDetails}
          onChange={(e) => onWeakDetailsChange(e.currentTarget.value)}
          mb="xl"
        />

        <Button
          fullWidth
          color="green"
          size="md"
          leftSection={<IconDeviceFloppy size={20} />}
          onClick={onComplete}
          disabled={!ready}
        >
          Guardar y Finalizar Partido
        </Button>
        {!ready && (
          <Text c="red" size="xs" ta="center" mt="sm">
            Uno de los dos jugadores debe ganar exactamente {match.setsToWin} sets para finalizar el
            partido.
          </Text>
        )}
      </Paper>
    </Stack>
  );
};
