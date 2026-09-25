import { Card, Group, Stack, Avatar, Text, ThemeIcon, Badge } from '@mantine/core';
import { IconTrophy, IconMedal } from '@tabler/icons-react';
import { getPlayerAvatar } from '../../utils/avatar'; // 👈 1. Importamos la función
import { returnEloColor } from '../../utils/helpers';

interface PlayerProps {
  name: string;
  surname?: string;
  avatarUrl?: string;
  stats?: { elo: number; tournamentWon?: number };
}

export const PodioHonor = ({ players }: { players: any[] }) => {
  const getS = (p: any) => (Array.isArray(p?.stats) ? p.stats[0] : p?.stats);
  const sortedPlayers = [...players].sort((a, b) => (getS(b)?.elo || 0) - (getS(a)?.elo || 0));
  const oro = sortedPlayers[0];
  const plata = sortedPlayers[1];
  const bronce = sortedPlayers[2];

  if (!oro) return null;

  const Escalón = ({
    player,
    puesto,
    color,
    altura,
    icono,
  }: {
    player: PlayerProps;
    puesto: number;
    color: string;
    altura: number;
    icono: any;
  }) => {
    if (!player) return <div style={{ width: 150 }} />;
    const s = getS(player); // 👈 Usamos el helper aquí

    return (
      <Stack align="center" gap="xs" style={{ zIndex: puesto === 1 ? 2 : 1 }}>
        <Avatar
          src={getPlayerAvatar(player.name, player.avatarUrl)}
          size={puesto === 1 ? 80 : 60}
          radius="100%"
          style={{ border: `3px solid var(--mantine-color-${color})`, backgroundColor: 'white' }}
        />
        <Card
          shadow="md"
          radius="md"
          p="sm"
          bg={`var(--mantine-color-${color})`}
          w={{ base: 95, sm: 110, lg: 130 }}
          h={altura}
          style={{
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <ThemeIcon size="lg" radius="xl" color="white" variant="transparent" c="dark.9">
            {icono}
          </ThemeIcon>
          <Text
            fw={800}
            size={puesto === 1 ? 'lg' : 'md'}
            c="dark.9"
            mt="xs"
            ta="center"
            truncate
            w="100%"
          >
            {player.name}
          </Text>
          <Badge color={s?.elo ? returnEloColor(s?.elo) : 'gray'} variant="filled" mt="auto">
            {s?.elo || 500} ELO
          </Badge>
          {(s?.tournamentWon || 0) > 0 && (
            <Text size="xs" c="dark.7" fw={600} mt={4}>
              🏆 {s?.tournamentWon} Torneos
            </Text>
          )}
        </Card>
      </Stack>
    );
  };

  return (
    <Stack align="center" mb="xl">
      <Group
        align="flex-end"
        justify="center"
        gap="xs"
        wrap="nowrap"
        style={{ paddingBottom: 10, borderBottom: '2px solid var(--mantine-color-gray-3)' }}
      >
        <Escalón
          player={plata}
          puesto={2}
          color="gray.4"
          altura={130}
          icono={<IconMedal size={24} />}
        />
        <Escalón
          player={oro}
          puesto={1}
          color="yellow.5"
          altura={170}
          icono={<IconTrophy size={32} />}
        />
        <Escalón
          player={bronce}
          puesto={3}
          color="orange.4"
          altura={100}
          icono={<IconMedal size={24} />}
        />
      </Group>
    </Stack>
  );
};
