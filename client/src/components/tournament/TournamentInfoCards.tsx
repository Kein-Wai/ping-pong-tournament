import { Stack, SimpleGrid, Paper, Group, ThemeIcon, Text, Title } from '@mantine/core';
import {
  IconCalendar,
  IconUsers,
  IconTrophy,
  IconTournament,
  IconListNumbers,
  IconMedal,
} from '@tabler/icons-react';
import type { Tournament } from '../../types/tournament';

interface TournamentInfoCardsProps {
  tournament: Tournament | null;
}

const getRoundsLabel = (rounds: Tournament['rounds']) => {
  if (rounds === 'GruposKnockout') return 'Grupos + Eliminatorias';
  if (rounds === 'TodosvsTodos') return 'Liga (Todos contra Todos)';
  return 'Eliminatoria Directa';
};

const getKnockoutTypeLabel = (typeKnockout: Tournament['typeKnockout'], playersKnockout: Tournament['playersKnockout']) => {
  const base = typeKnockout === 'LlaveAB' ? 'Llave A y B' : 'Solo Llave A';
  const qualifier = playersKnockout ? ` (${playersKnockout} pasan)` : '';
  return `${base}${qualifier}`;
};

export const TournamentInfoCards = ({ tournament }: TournamentInfoCardsProps) => {
  if (!tournament) return null;

  return (
    <Stack gap="xl">
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
        <Paper withBorder p="md" radius="md">
          <Group gap="md">
            <ThemeIcon size={40} radius="md" variant="light" color="blue">
              <IconCalendar size={20} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                Fecha
              </Text>
              <Text fw={500}>
                {new Date(tournament.dateStart).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group gap="md">
            <ThemeIcon size={40} radius="md" variant="light" color="teal">
              <IconUsers size={20} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                Plazas Totales
              </Text>
              <Text fw={500}>{tournament.numPlayers} Jugadores máx.</Text>
            </div>
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group gap="md">
            <ThemeIcon size={40} radius="md" variant="light" color="grape">
              <IconTrophy size={20} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                Nivel / Acceso
              </Text>
              <Text fw={500}>
                {tournament.levelTournament || 'Mixto'} ·{' '}
                {tournament.typeTournament || 'Interno'}
              </Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      <Title order={4} mt="md">
        Formato de Competición
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
        <Paper withBorder p="md" radius="md">
          <Group gap="md">
            <ThemeIcon size={40} radius="md" variant="light" color="orange">
              <IconTournament size={20} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                Estructura
              </Text>
              <Text fw={500}>{getRoundsLabel(tournament.rounds)}</Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      {(tournament.rounds === 'GruposKnockout' || tournament.rounds === 'TodosvsTodos') && (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            <Paper withBorder p="md" radius="md">
              <Group gap="md">
                <ThemeIcon size={40} radius="md" variant="light" color="yellow">
                  <IconListNumbers size={20} />
                </ThemeIcon>
                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    Fase de Grupos
                  </Text>
                  <Text fw={500}>
                    {tournament.numGroup || '?'} Grupos de {tournament.numGroupPlayers || '?'} jug.
                  </Text>
                </div>
              </Group>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Group gap="md">
                <ThemeIcon size={40} radius="md" variant="light" color="yellow">
                  <IconListNumbers size={20} />
                </ThemeIcon>
                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    Sets Partidos Grupos
                  </Text>
                  <Text fw={500}>{tournament.setsToWinGroup || 2} sets para ganar</Text>
                </div>
              </Group>
            </Paper>
          </SimpleGrid>
        </>
      )}

      {(tournament.rounds === 'GruposKnockout' || tournament.rounds === 'Knockout') && (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            <Paper withBorder p="md" radius="md">
              <Group gap="md">
                <ThemeIcon size={40} radius="md" variant="light" color="red">
                  <IconMedal size={20} />
                </ThemeIcon>
                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    Cuadro Final (Llaves)
                  </Text>
                  <Text fw={500}>{getKnockoutTypeLabel(tournament.typeKnockout, tournament.playersKnockout)}</Text>
                </div>
              </Group>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Group gap="md">
                <ThemeIcon size={40} radius="md" variant="light" color="yellow">
                  <IconListNumbers size={20} />
                </ThemeIcon>
                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    Sets Partidos Knockout
                  </Text>
                  <Text fw={500}>{tournament.setsToWinKnockout || 3} sets para ganar</Text>
                </div>
              </Group>
            </Paper>
          </SimpleGrid>
        </>
      )}
    </Stack>
  );
};

export default TournamentInfoCards;
