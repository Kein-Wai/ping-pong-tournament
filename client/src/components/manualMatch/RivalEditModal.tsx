import { Button, Modal, Select, SimpleGrid, Stack, TextInput } from '@mantine/core';

import type { DominantHand, OpponentLevel, Playstyle } from '../../types/enums';

interface RivalEditModalProps {
  opened: boolean;
  name: string;
  hand: DominantHand | null;
  style: Playstyle | null;
  level: OpponentLevel | null;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onHandChange: (hand: DominantHand | null) => void;
  onStyleChange: (style: Playstyle | null) => void;
  onLevelChange: (level: OpponentLevel | null) => void;
  onSave: () => void;
}

/** Modal «Actualizar Datos del Rival»: nombre, mano, estilo y nivel relativo del rival. */
export const RivalEditModal = ({
  opened,
  name,
  hand,
  style,
  level,
  onClose,
  onNameChange,
  onHandChange,
  onStyleChange,
  onLevelChange,
  onSave,
}: RivalEditModalProps) => (
  <Modal opened={opened} onClose={onClose} title="Actualizar Datos del Rival" centered>
    <Stack gap="md">
      <TextInput
        label="Nombre Real"
        value={name}
        onChange={(e) => onNameChange(e.currentTarget.value)}
      />
      <SimpleGrid cols={2}>
        <Select
          label="Mano"
          data={['Diestro', 'Zurdo']}
          value={hand}
          onChange={onHandChange}
          clearable
        />
        <Select
          label="Estilo"
          data={['Ofensivo', 'Defensivo']}
          value={style}
          onChange={onStyleChange}
          clearable
        />
        <Select
          label="Nivel"
          data={['Peor', 'Igual', 'Mejor']}
          value={level}
          onChange={onLevelChange}
          clearable
        />
      </SimpleGrid>
      <Button mt="md" fullWidth color="blue" onClick={onSave}>
        Guardar Cambios
      </Button>
    </Stack>
  </Modal>
);
