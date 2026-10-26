import { ActionIcon, Badge, Button, Card, Group, Stack, Text, ThemeIcon, Title, Tooltip } from '@mantine/core';
import { IconEdit, IconPlus, IconShield, IconTrash, IconUsers } from '@tabler/icons-react';
import type { ClubTeam } from '../../types/api';

/**
 * Cabecera del detalle de un equipo: nombre, categoría, nivel, tamaño de la
 * plantilla y, para los administradores, las acciones de gestión.
 *
 * Migration: extracción de la tarjeta de cabecera de EquipoDetalles.
 */
export interface TeamHeaderProps {
  team: ClubTeam;
  isAdmin: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onOpenRoster: () => void;
  onAddMatch: () => void;
}

export const TeamHeader = ({
  team,
  isAdmin,
  onDelete,
  onEdit,
  onOpenRoster,
  onAddMatch,
}: TeamHeaderProps) => (
  <Card shadow="sm" padding="xl" radius="md" withBorder>
    <Group justify="space-between" align="flex-start">
      <Group gap="md">
        <ThemeIcon size={60} radius="md" color="blue" variant="light">
          <IconShield size={32} />
        </ThemeIcon>
        <div>
          <Title order={1}>{team.name}</Title>
          <Group gap="xs" mt="xs">
            <Badge color="blue" size="lg" variant="light">
              {team.category}
            </Badge>
            <Badge color="orange" size="lg" variant="dot">
              Nivel: {team.level}
            </Badge>
          </Group>
        </div>
      </Group>

      <Stack align="flex-end" gap="xs">
        <Group>
          {isAdmin && (
            <>
              <Tooltip label="Eliminar este equipo">
                <ActionIcon color="red" variant="light" size="input-sm" onClick={onDelete}>
                  <IconTrash size={18} />
                </ActionIcon>
              </Tooltip>

              <Button
                color="blue"
                variant="light"
                size="md"
                onClick={onEdit}
                leftSection={<IconEdit size={18} />}
              >
                Editar Info
              </Button>

              <Button
                color="gray"
                variant="light"
                size="md"
                onClick={onOpenRoster}
                leftSection={<IconUsers size={18} />}
              >
                Ajustar Plantilla
              </Button>

              <Button
                color="green"
                variant="light"
                size="md"
                onClick={onAddMatch}
                leftSection={<IconPlus size={18} />}
              >
                Añadir Partido
              </Button>
            </>
          )}
        </Group>

        <Text size="xs" c="dimmed">
          Plantilla actual: {team.players?.length || 0} Jugadores
        </Text>
      </Stack>
    </Group>
  </Card>
);
