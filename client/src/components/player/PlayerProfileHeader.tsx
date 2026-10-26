import { Avatar, Badge, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { IconEdit, IconTrendingUp, IconUserMinus } from '@tabler/icons-react';
import { getPlayerAvatar } from '../../utils/avatar';
import type { PlayerProfile } from '../../types/playerProfile';

/**
 * Cabecera del perfil de un jugador: avatar, nombre, mote, temporada, ELO, nivel,
 * rasgos de juego, equipos y las acciones permitidas a quien mira el perfil.
 *
 * Migration: extracción de la tarjeta de cabecera de JugadorPerfil.
 */
export interface PlayerProfileHeaderProps {
  player: PlayerProfile;
  season: string;
  elo: number | undefined;
  showEmail: boolean;
  canKick: boolean;
  canEdit: boolean;
  canConsolidate: boolean;
  onKick: () => void;
  onEdit: () => void;
  onConsolidate: () => void;
}

export const PlayerProfileHeader = ({
  player,
  season,
  elo,
  showEmail,
  canKick,
  canEdit,
  canConsolidate,
  onKick,
  onEdit,
  onConsolidate,
}: PlayerProfileHeaderProps) => (
  <Card shadow="sm" padding="xl" radius="md" withBorder>
    <Group align="flex-start" justify="space-between">
      <Group gap="lg">
        <Avatar
          src={getPlayerAvatar(player.name, player.avatarUrl)}
          size={100}
          radius={100}
          color="blue"
        />
        <div>
          <Title order={1}>
            {player.name} {player.surname}
          </Title>
          <Badge color="grape" variant="light" mb="xs">
            {season}
          </Badge>
          {player.nickname && (
            <Text c="dimmed" size="md" fs="italic">
              "{player.nickname}"
            </Text>
          )}
          {showEmail && (
            <Text c="dimmed" size="lg">
              {player.email}
            </Text>
          )}
          <Group gap="xs" mt="sm">
            <Badge
              size="lg"
              color={
                elo && elo >= 1000 ? 'green' : elo && elo >= 750 ? 'blue' : 'gray'
              }
              variant="filled"
            >
              {elo || 500} ELO
            </Badge>
            {player.level && (
              <Badge size="lg" variant="light" color="grape">
                {player.level}
              </Badge>
            )}
          </Group>
          <Group gap="xs" mt="xs">
            {player.dominantHand && (
              <Badge variant="outline" color="gray" tt="none">
                🖐️ {player.dominantHand}
              </Badge>
            )}
            {player.playstyle && (
              <Badge variant="outline" color="orange" tt="none">
                ⚔️ {player.playstyle}
              </Badge>
            )}
            {player.rubberForehand && (
              <Badge variant="outline" color="red" tt="none">
                🔴 Der: {player.rubberForehand.replace('_', ' ')}
              </Badge>
            )}
            {player.rubberBackhand && (
              <Badge variant="outline" color="dark" tt="none">
                ⚫ Rev: {player.rubberBackhand.replace('_', ' ')}
              </Badge>
            )}
          </Group>
          {player.teams && player.teams.length > 0 && (
            <Text size="sm" mt="xs" fw={600} c="dimmed">
              Equipos:{' '}
              <Text span c="blue.4">
                {player.teams.map((t) => t.name).join(' / ')}
              </Text>
            </Text>
          )}
        </div>
      </Group>

      <Stack align="flex-end">
        {canKick && (
          <Button
            variant="light"
            color="red"
            leftSection={<IconUserMinus size={16} />}
            onClick={onKick}
          >
            Dar de Baja
          </Button>
        )}

        {canEdit && (
          <Button
            variant="light"
            color="blue"
            leftSection={<IconEdit size={16} />}
            onClick={onEdit}
          >
            Editar Perfil
          </Button>
        )}

        {canConsolidate && (
          <Button
            color="cyan"
            leftSection={<IconTrendingUp size={16} />}
            onClick={onConsolidate}
            variant="light"
          >
            Consolidar Mejoras
          </Button>
        )}
      </Stack>
    </Group>
  </Card>
);
