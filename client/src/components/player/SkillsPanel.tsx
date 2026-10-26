import { Box, Card, Center, Group, Progress, ScrollArea, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconSwords, IconTarget } from '@tabler/icons-react';
import { RadarChart } from '@mantine/charts';
import type { SkillChartRow } from '../../utils/player-profile';

const getSkillColor = (val: number) => {
  if (val < 30) return 'red';
  if (val < 60) return 'yellow';
  if (val < 80) return 'blue';
  return 'green';
};

/**
 * Perfil técnico de un jugador: desglose de habilidades (con la mejora pendiente) y
 * radar de juego.
 *
 * Migration: extracción de las dos tarjetas de habilidades de JugadorPerfil.
 */
export interface SkillsPanelProps {
  skillsData: SkillChartRow[];
}

export const SkillsPanel = ({ skillsData }: SkillsPanelProps) => (
  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
    <Card withBorder radius="md" shadow="sm" p="lg">
      <Group gap="xs" mb="md">
        <ThemeIcon color="orange" variant="light">
          <IconSwords size={18} />
        </ThemeIcon>
        <Title order={4}>Desglose de Habilidades</Title>
      </Group>

      {skillsData.length > 0 ? (
        <ScrollArea h={320} offsetScrollbars>
          <Stack gap="xs" pr="sm">
            {skillsData.map((skill) => (
              <Box key={skill.attribute}>
                <Group justify="space-between" mb={2}>
                  <Text size="sm" fw={600}>
                    {skill.attribute}
                  </Text>
                  <Text size="sm" fw={700} c={getSkillColor(skill.value)}>
                    {Math.floor(skill.value)}
                    {skill.pending > 0 && (
                      <Text component="span" c="cyan.5" fz="xs" ml={4}>
                        (+{skill.pending.toFixed(2)})
                      </Text>
                    )}
                    <Text component="span" c="dimmed" fz="xs" ml={4}>
                      / 100
                    </Text>
                  </Text>
                </Group>

                <Progress.Root size="md" radius="xl">
                  <Progress.Section value={skill.value} color={getSkillColor(skill.value)} />
                  {skill.pending > 0 && (
                    <Progress.Section value={skill.pending} color="cyan.4" striped animated />
                  )}
                </Progress.Root>
              </Box>
            ))}
          </Stack>
        </ScrollArea>
      ) : (
        <Center
          h={200}
          bg="var(--mantine-color-gray-0)"
          style={{ borderRadius: 8, darkHidden: true }}
        >
          <Text c="dimmed" size="sm" ta="center">
            Sin habilidades registradas.
          </Text>
        </Center>
      )}
    </Card>

    <Card withBorder radius="md" shadow="sm" p="lg">
      <Group gap="xs" mb="lg">
        <ThemeIcon color="grape" variant="light">
          <IconTarget size={18} />
        </ThemeIcon>
        <Title order={4}>Radar de Juego</Title>
      </Group>
      {skillsData.length > 0 ? (
        <Center h={320}>
          <RadarChart
            h={300}
            w="100%"
            data={skillsData}
            dataKey="attribute"
            withPolarGrid
            withPolarAngleAxis
            withPolarRadiusAxis
            polarRadiusAxisProps={{ domain: [0, 100] }}
            series={[
              { name: 'potential', color: 'cyan.5', opacity: 0.3 },
              { name: 'value', color: 'grape.5', opacity: 0.7 },
            ]}
          />
        </Center>
      ) : (
        <Center
          h={200}
          bg="var(--mantine-color-gray-0)"
          style={{ borderRadius: 8, darkHidden: true }}
        >
          <Text c="dimmed" size="sm" ta="center">
            Sin habilidades registradas.
          </Text>
        </Center>
      )}
    </Card>
  </SimpleGrid>
);
