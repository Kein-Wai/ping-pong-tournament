import { Badge, Button, Modal, NumberInput, ScrollArea, Stack, Table, Text } from '@mantine/core';
import { PROFILE_SKILL_KEYS } from '../../constants/skills';
import type { PlayerSkillValues } from '../../types/playerProfile';

/**
 * Modal «Consolidar Progreso» del perfil de un jugador: base actual, mejora
 * propuesta (ajustable) y total estimado de cada habilidad.
 *
 * Migration: extracción del modal de JugadorPerfil; el estado y la aplicación
 * siguen en useJugadorConsolidacion.
 */
export interface ConsolidateModalProps {
  opened: boolean;
  onClose: () => void;
  skills: PlayerSkillValues | undefined;
  approvedGains: Record<string, number>;
  onGainsChange: (gains: Record<string, number>) => void;
  consolidating: boolean;
  onConfirm: () => void;
}

export const ConsolidateModal = ({
  opened,
  onClose,
  skills,
  approvedGains,
  onGainsChange,
  consolidating,
  onConfirm,
}: ConsolidateModalProps) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={
      <Text fw={700} size="lg">
        Consolidar Progreso
      </Text>
    }
    size="lg"
    centered
  >
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        El sistema ha calculado estas subidas basándose en la asistencia a entrenamientos.
        Puedes aceptar los valores calculados o ajustarlos manualmente si consideras que el
        rendimiento ha sido distinto.
      </Text>

      <ScrollArea h={400}>
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Habilidad</Table.Th>
              <Table.Th ta="center">Base Actual</Table.Th>
              <Table.Th ta="center">Mejora (+)</Table.Th>
              <Table.Th ta="center">Total Estimado</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {PROFILE_SKILL_KEYS.map((s) => {
              const base = skills?.[s.key as keyof PlayerSkillValues] || 0;
              const gain = approvedGains[s.key] || 0;
              const final = base + gain;

              if (gain === 0 && base === 0) return null;

              return (
                <Table.Tr key={s.key}>
                  <Table.Td fw={500}>{s.label}</Table.Td>
                  <Table.Td ta="center">{Math.floor(base)}</Table.Td>
                  <Table.Td>
                    <NumberInput
                      value={gain}
                      onChange={(val) =>
                        onGainsChange({ ...approvedGains, [s.key]: Number(val) || 0 })
                      }
                      min={0}
                      step={0.1}
                      decimalScale={2}
                      w={100}
                      mx="auto"
                    />
                  </Table.Td>
                  <Table.Td ta="center">
                    <Badge size="lg" color="cyan" variant="light">
                      {final.toFixed(2)}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      <Button
        color="cyan"
        fullWidth
        mt="md"
        loading={consolidating}
        onClick={onConfirm}
      >
        Confirmar y Aplicar Subidas
      </Button>
    </Stack>
  </Modal>
);
