import { Badge, Button, Group, Paper, ScrollArea, Stack, Table, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';

import type { SetScore, TrackedMatch, TrackedPoint } from '../../types/manualMatch';

interface MatchReportProps {
  match: TrackedMatch;
  mySets: number | string;
  oppSets: number | string;
  /** Tanteo de cada set: guardados (modo rápido) o deducidos de los puntos (modo profundo). */
  setScores: SetScore[];
  points: TrackedPoint[];
  onBack: () => void;
}

/** Reporte de un partido completado: marcador, tanteos por set, conclusiones y desglose punto a punto. */
export const MatchReport = ({
  match,
  mySets,
  oppSets,
  setScores,
  points,
  onBack,
}: MatchReportProps) => (
  <Stack gap="xl" style={{ maxWidth: 1000, margin: '0 auto' }}>
    <Group justify="space-between">
      <Button
        variant="subtle"
        color="gray"
        leftSection={<IconArrowLeft size={16} />}
        onClick={onBack}
      >
        Volver a Análisis
      </Button>
      <Title order={3}>Reporte del Partido</Title>
    </Group>

    <Paper withBorder p="xl" radius="md" bg="dark.7">
      <Group justify="center" gap={60}>
        <Stack align="center" gap={0}>
          <Text c="dimmed" size="lg" fw={600}>
            TÚ
          </Text>
          <Text
            fz={80}
            fw={900}
            c={Number(mySets) > Number(oppSets) ? 'green.4' : 'gray.5'}
            style={{ lineHeight: 1 }}
          >
            {mySets}
          </Text>
        </Stack>
        <Text fz={50} fw={900} c="dimmed">
          SETS
        </Text>
        <Stack align="center" gap={0}>
          <Text c="dimmed" size="lg" fw={600}>
            {match.opponentName.toUpperCase()}
          </Text>
          <Text
            fz={80}
            fw={900}
            c={Number(oppSets) > Number(mySets) ? 'red.4' : 'gray.5'}
            style={{ lineHeight: 1 }}
          >
            {oppSets}
          </Text>
        </Stack>
      </Group>

      {/* 👇 NUEVA SECCIÓN DE TANTEOS POR SET 👇 */}
      {setScores.length > 0 && (
        <Group
          justify="center"
          mt="xl"
          gap="lg"
          style={{ borderTop: '1px solid var(--mantine-color-dark-5)', paddingTop: '20px' }}
        >
          {setScores.map((score, idx) => (
            <Stack key={idx} align="center" gap={4}>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                SET {idx + 1}
              </Text>
              <Badge
                size="xl"
                variant="filled"
                color={score.myScore > score.oppScore ? 'green.8' : 'red.8'}
              >
                {score.myScore} - {score.oppScore}
              </Badge>
            </Stack>
          ))}
        </Group>
      )}
    </Paper>

    {match.lightNotes && (
      <Paper withBorder p="md" radius="md" bg="blue.0" c="blue.9">
        <Text fw={700} mb="xs">
          Conclusiones del Partido:
        </Text>
        <Text style={{ whiteSpace: 'pre-wrap' }}>{match.lightNotes}</Text>
      </Paper>
    )}

    {match.analysisType === 'Extenso' && points.length > 0 && (
      <>
        <Title order={4} mt="md">
          Desglose Punto a Punto
        </Title>
        <Paper withBorder radius="md">
          <ScrollArea h={500}>
            <Table striped highlightOnHover stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Set</Table.Th>
                  <Table.Th>Nº</Table.Th>
                  <Table.Th>Resultado</Table.Th>
                  <Table.Th>Categoría</Table.Th>
                  <Table.Th>Detalle</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {points.map((p, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td fw={700}>Set {p.setNumber}</Table.Td>
                    <Table.Td>{p.pointOrder}</Table.Td>
                    <Table.Td>
                      <Badge color={p.isWon ? 'green' : 'red'} variant="light">
                        {p.isWon ? 'Mío' : 'Rival'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {p.category ? (
                        <Badge color="gray" variant="dot">
                          {p.category}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </Table.Td>
                    <Table.Td fw={500}>
                      {p.subcategory || ''} {p.placement ? `(${p.placement})` : ''}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>
      </>
    )}
  </Stack>
);
