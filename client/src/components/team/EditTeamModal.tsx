import { Button, Modal, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { TEAM_CATEGORIES, TEAM_LEVELS } from '../../constants/teams';

/**
 * Modal «Editar Información del Equipo»: nombre, categoría de liga y nivel base.
 *
 * Migration: extracción del modal de EquipoDetalles; el estado y el guardado
 * siguen en useEquipoInfo.
 */
export interface EditTeamModalProps {
  opened: boolean;
  onClose: () => void;
  name: string;
  onNameChange: (name: string) => void;
  category: string | null;
  onCategoryChange: (category: string | null) => void;
  level: string | null;
  onLevelChange: (level: string | null) => void;
  onSave: () => void;
  saving: boolean;
}

export const EditTeamModal = ({
  opened,
  onClose,
  name,
  onNameChange,
  category,
  onCategoryChange,
  level,
  onLevelChange,
  onSave,
  saving,
}: EditTeamModalProps) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={<Text fw={700}>Editar Información del Equipo</Text>}
    centered
  >
    <Stack gap="md">
      <TextInput
        label="Nombre del Equipo"
        required
        value={name}
        onChange={(e) => onNameChange(e.currentTarget.value)}
      />

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Select
          label="Categoría de Liga"
          data={TEAM_CATEGORIES}
          value={category}
          onChange={onCategoryChange}
          required
          allowDeselect={false}
          searchable
        />

        <Select
          label="Nivel Base Inicial"
          data={TEAM_LEVELS}
          value={level}
          onChange={onLevelChange}
          required
          allowDeselect={false}
        />
      </SimpleGrid>

      <Button
        fullWidth
        color="blue"
        mt="md"
        onClick={onSave}
        loading={saving}
        disabled={!name || !category || !level}
      >
        Guardar Cambios
      </Button>
    </Stack>
  </Modal>
);
