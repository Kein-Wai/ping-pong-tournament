import { Button, Modal, Select, SimpleGrid, Stack, TextInput } from '@mantine/core';

import type { DominantHand, OpponentLevel, Playstyle, RubberType } from '../../types/enums';

interface RivalEditModalProps {
  opened: boolean;
  name: string;
  hand: DominantHand | null;
  style: Playstyle | null;
  level: OpponentLevel | null;
  rubberForehand: RubberType | null;
  rubberBackhand: RubberType | null;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onHandChange: (hand: DominantHand | null) => void;
  onStyleChange: (style: Playstyle | null) => void;
  onLevelChange: (level: OpponentLevel | null) => void;
  onRubberForehandChange: (rubber: RubberType | null) => void;
  onRubberBackhandChange: (rubber: RubberType | null) => void;
  onSave: () => void;
}

const RUBBER_TYPES: RubberType[] = [
  'LISA',
  'PICOS_CORTOS',
  'PICOS_MEDIOS',
  'PICOS_LARGOS',
  'ANTISPIN',
];

/** Modal «Actualizar Datos del Rival»: nombre, mano, estilo, nivel relativo y gomas del rival. */
export const RivalEditModal = ({
  opened,
  name,
  hand,
  style,
  level,
  rubberForehand,
  rubberBackhand,
  onClose,
  onNameChange,
  onHandChange,
  onStyleChange,
  onLevelChange,
  onRubberForehandChange,
  onRubberBackhandChange,
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
        <Select
          label="Goma Derecha"
          data={RUBBER_TYPES}
          value={rubberForehand}
          onChange={onRubberForehandChange}
          clearable
        />
        <Select
          label="Goma Revés"
          data={RUBBER_TYPES}
          value={rubberBackhand}
          onChange={onRubberBackhandChange}
          clearable
        />
      </SimpleGrid>
      <Button mt="md" fullWidth color="blue" onClick={onSave}>
        Guardar Cambios
      </Button>
    </Stack>
  </Modal>
);
