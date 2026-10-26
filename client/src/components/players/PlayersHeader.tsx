import type { ChangeEvent } from 'react';
import { Button, Group, Select, TextInput, ThemeIcon, Title } from '@mantine/core';
import { IconFilter, IconSearch, IconUserPlus, IconUsers } from '@tabler/icons-react';

interface PlayersHeaderProps {
  /** Administradores: pueden añadir jugadores. */
  canManage: boolean;
  search: string;
  statusFilter: string;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onStatusChange: (value: string | null) => void;
  onAddPlayer: () => void;
}

/** Cabecera de la plantilla: título, alta de jugador, buscador y filtro por estado. */
export const PlayersHeader = ({
  canManage,
  search,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onAddPlayer,
}: PlayersHeaderProps) => (
  <Group justify="space-between" align="center" wrap="wrap" gap="sm">
    <Group gap="sm">
      <ThemeIcon size={40} radius="md" color="blue" variant="light">
        <IconUsers size={24} />
      </ThemeIcon>
      <Title order={2}>Plantilla de Jugadores</Title>
      {canManage && (
        <Button
          size="sm"
          variant="light"
          color="blue"
          leftSection={<IconUserPlus size={16} />}
          onClick={onAddPlayer}
        >
          Añadir Jugador
        </Button>
      )}
    </Group>

    <Group gap="xs" style={{ flexGrow: 1, justifyRight: 'true', maxWidth: 500 }}>
      <TextInput
        placeholder="Buscar jugador..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={onSearchChange}
        style={{ flexGrow: 1 }}
      />
      <Select
        leftSection={<IconFilter size={16} />}
        data={[
          { value: 'Aprobado', label: 'Plantilla' },
          { value: 'Pendiente', label: 'Solicitudes' },
          { value: 'Rechazado', label: 'Bajas/Rechazos' },
        ]}
        value={statusFilter}
        onChange={onStatusChange}
        allowDeselect={false}
        w={140}
      />
    </Group>
  </Group>
);
