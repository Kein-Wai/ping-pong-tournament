import { Avatar, Badge, Center, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { getPlayerAvatar } from '../../utils/avatar';
import type { TeamPlayer } from '../../types/api';

/**
 * Pestaña «Plantilla» del detalle de un equipo: una tarjeta por jugador con su
 * nivel y ELO. Pulsar una tarjeta avisa para abrir el perfil del jugador.
 *
 * El listado de equipos de la API no incluye el avatar de los jugadores, así
 * que se muestra el genérico generado a partir del nombre.
 *
 * Migration: extracción del panel «plantilla» de EquipoDetalles.
 */
export interface TeamRosterTabProps {
  players: TeamPlayer[];
  onPlayerClick: (playerId: string) => void;
}

export const TeamRosterTab = ({ players, onPlayerClick }: TeamRosterTabProps) => (
  <Stack gap="md">
    {players.length === 0 ? (
      <Center py="xl">
        <Text c="dimmed">No hay jugadores asignados a este equipo.</Text>
      </Center>
    ) : (
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {players.map((p) => {
          const s = Array.isArray(p.stats) ? p.stats[0] : p.stats;
          return (
            <Paper
              key={p.id}
              withBorder
              p="md"
              radius="md"
              className="hover-card"
              onClick={() => onPlayerClick(p.id)}
            >
              <Group wrap="nowrap">
                <Avatar src={getPlayerAvatar(p.name)} radius="xl" size="md" />
                <div style={{ flex: 1 }}>
                  <Text fw={600} size="sm" truncate>
                    {p.name} {p.surname}
                  </Text>
                  <Group gap="xs" mt={4}>
                    <Badge size="xs" color="gray" variant="light">
                      {p.level}
                    </Badge>
                    <Text size="xs" c="dimmed" fw={700}>
                      {s?.elo || 500} ELO
                    </Text>
                  </Group>
                </div>
              </Group>
            </Paper>
          );
        })}
      </SimpleGrid>
    )}
  </Stack>
);
