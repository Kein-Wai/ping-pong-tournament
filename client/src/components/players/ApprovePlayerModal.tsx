import { Button, Card, Modal, NumberInput, Select, SimpleGrid, Stack, Text } from '@mantine/core';

import { LEVEL_BASE_STATS } from '../../constants/players';
import { SKILL_FIELDS } from '../../constants/skills';
import type { PlayerLevel } from '../../types/enums';
import type { SkillInputs } from '../../types/players';

interface ApprovePlayerModalProps {
  opened: boolean;
  level: PlayerLevel | null;
  elo: number | string;
  skills: SkillInputs;
  approving: boolean;
  onClose: () => void;
  onLevelChange: (level: PlayerLevel | null) => void;
  onEloChange: (elo: number | string) => void;
  onSkillsChange: (skills: SkillInputs) => void;
  onConfirm: () => void;
}

/** Modal «Nivel de Entrada Inicial»: nivel, ELO y habilidades con que entra el jugador aprobado. */
export const ApprovePlayerModal = ({
  opened,
  level,
  elo,
  skills,
  approving,
  onClose,
  onLevelChange,
  onEloChange,
  onSkillsChange,
  onConfirm,
}: ApprovePlayerModalProps) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={<Text fw={700}>Nivel de Entrada Inicial</Text>}
    centered
    size="lg"
  >
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        El sistema calculará las estadísticas iniciales y el crecimiento en los entrenamientos en
        base al nivel táctico/técnico que asignes a este jugador al entrar.
      </Text>
      <Select
        label="Nivel Técnico Base"
        placeholder="Selecciona el nivel del jugador"
        data={['Iniciacion', 'Principiante', 'Intermedio', 'Avanzado', 'Profesional']}
        value={level}
        onChange={onLevelChange}
        required
      />
      <NumberInput
        label="Puntuación ELO Inicial"
        value={elo}
        onChange={onEloChange}
        required
        min={0}
        max={3000}
        description="El ELO Base se puede heredar de competiciones anteriores."
      />

      {level && (
        <Card
          withBorder
          radius="md"
          p="md"
          bg="var(--mantine-color-gray-0)"
          style={{ darkHidden: true }}
        >
          <Text fw={600} size="sm" mb="xs">
            Asignación Avanzada de Atributos (RGP)
          </Text>
          <Text size="xs" c="dimmed" mb="md">
            Por defecto, todas las habilidades comenzarán con un valor de{' '}
            {LEVEL_BASE_STATS[level]}. Rellena solo aquellas en las que el jugador destaque
            excepcionalmente o esté más flojo.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
            {SKILL_FIELDS.map((field) => (
              <NumberInput
                key={field.key}
                label={field.label}
                placeholder={String(LEVEL_BASE_STATS[level])}
                value={skills[field.key]}
                onChange={(val) => onSkillsChange({ ...skills, [field.key]: val as number | '' })}
                min={0}
                max={100}
              />
            ))}
          </SimpleGrid>
        </Card>
      )}

      <Button
        fullWidth
        mt="md"
        color="green"
        disabled={!level}
        loading={approving}
        onClick={onConfirm}
      >
        Confirmar y Aprobar
      </Button>
    </Stack>
  </Modal>
);
