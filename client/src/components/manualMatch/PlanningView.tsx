import {
  ActionIcon,
  Button,
  Group,
  Paper,
  Select,
  Stack,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconArrowLeft, IconClipboardList, IconDeviceFloppy, IconEdit } from '@tabler/icons-react';

import type { AnalysisType } from '../../types/enums';

interface PlanningViewProps {
  opponentName: string;
  myServe: string;
  theirServe: string;
  strategy: string;
  analysisType: AnalysisType;
  saving: boolean;
  onMyServeChange: (value: string) => void;
  onTheirServeChange: (value: string) => void;
  onStrategyChange: (value: string) => void;
  onAnalysisTypeChange: (type: AnalysisType) => void;
  onSave: () => void;
  onStart: () => void;
  onEditRival: () => void;
  onBack: () => void;
}

/** Planificación previa al partido: las tres notas del plan y el arranque con el tipo de análisis elegido. */
export const PlanningView = ({
  opponentName,
  myServe,
  theirServe,
  strategy,
  analysisType,
  saving,
  onMyServeChange,
  onTheirServeChange,
  onStrategyChange,
  onAnalysisTypeChange,
  onSave,
  onStart,
  onEditRival,
  onBack,
}: PlanningViewProps) => (
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

    <Paper withBorder p="xl" radius="md">
      <Group gap="sm" mb="lg">
        <ThemeIcon size={40} radius="md" color="orange" variant="light">
          <IconClipboardList size={24} />
        </ThemeIcon>
        <Group gap="xs">
          <Title order={3}>Plan vs {opponentName}</Title>
          <ActionIcon variant="light" color="blue" onClick={onEditRival}>
            <IconEdit size={16} />
          </ActionIcon>
        </Group>
      </Group>

      <Stack gap="md">
        <Textarea
          label="¿Qué voy a hacer cuando saque yo?"
          placeholder="Ej: Saque corto al revés sin efecto..."
          minRows={3}
          value={myServe}
          onChange={(e) => onMyServeChange(e.currentTarget.value)}
        />
        <Textarea
          label="¿Qué voy a hacer cuando saque él?"
          placeholder="Ej: Si saca largo, abrir cruzado..."
          minRows={3}
          value={theirServe}
          onChange={(e) => onTheirServeChange(e.currentTarget.value)}
        />
        <Textarea
          label="¿Cuál será mi estrategia de partido?"
          placeholder="Ej: Mantener la bola en su revés..."
          minRows={4}
          value={strategy}
          onChange={(e) => onStrategyChange(e.currentTarget.value)}
        />

        <Group justify="space-between" align="flex-end" mt="lg">
          <Button
            color="orange"
            variant="light"
            onClick={onSave}
            loading={saving}
            leftSection={<IconDeviceFloppy size={18} />}
          >
            Guardar Notas
          </Button>

          <Group align="flex-end">
            <Select
              label="Tipo de Análisis"
              data={[
                { value: 'Rapido', label: 'Rápido (Rapido)' },
                { value: 'Extenso', label: 'Profundo (Extenso)' },
              ]}
              value={analysisType}
              onChange={(val) => onAnalysisTypeChange(val as AnalysisType)}
              allowDeselect={false}
            />
            <Button color="blue" onClick={onStart}>
              Empezar Partido
            </Button>
          </Group>
        </Group>
      </Stack>
    </Paper>
  </Stack>
);
