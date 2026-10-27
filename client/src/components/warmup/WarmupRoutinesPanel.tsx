import { useState } from 'react';
import { Alert, Badge, Button, Group, Modal, Paper, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { SavedWarmupRoutine } from '../../types/warmupRoutine';
import { openAppConfirmModal } from '../../utils/modals';
import { MAX_SAVED_ROUTINES } from '../../utils/warmupRoutine';

export interface WarmupRoutinesPanelProps {
  routines: SavedWarmupRoutine[];
  selectedId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  /** La rutina del constructor tiene cambios que no están guardados en la rutina activa. */
  isDirty: boolean;
  /** El constructor tiene al menos un ejercicio: sin ellos no hay nada que guardar. */
  hasEntries: boolean;
  canCreate: boolean;
  onSelect: (id: string) => void;
  onSave: () => void;
  /** Resuelve a true si se guardó: así la ventana se cierra solo cuando ha ido bien y, si el nombre choca, se puede corregir. */
  onSaveAsNew: (name: string) => Promise<boolean>;
  onRename: (name: string) => Promise<boolean>;
  onRemove: () => void;
}

type NameDialog = 'new' | 'rename' | null;

const MAX_NAME_LENGTH = 40;

export const WarmupRoutinesPanel = ({
  routines,
  selectedId,
  isLoading,
  isSaving,
  isDirty,
  hasEntries,
  canCreate,
  onSelect,
  onSave,
  onSaveAsNew,
  onRename,
  onRemove,
}: WarmupRoutinesPanelProps) => {
  const [dialog, setDialog] = useState<NameDialog>(null);
  const [name, setName] = useState('');
  const selected = routines.find((routine) => routine.id === selectedId) ?? null;

  const openDialog = (kind: Exclude<NameDialog, null>) => {
    setName(kind === 'rename' ? (selected?.name ?? '') : '');
    setDialog(kind);
  };

  const submitName = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const saved = dialog === 'rename' ? await onRename(trimmed) : await onSaveAsNew(trimmed);
    if (saved) setDialog(null);
  };

  const confirmRemove = () => {
    if (!selected) return;
    openAppConfirmModal({
      title: 'Borrar rutina',
      icon: <IconTrash size={16} />,
      color: 'red',
      description: 'Se borrará de tus rutinas guardadas. Esta acción no se puede deshacer.',
      highlightText: selected.name,
      confirmLabel: 'Borrar',
      onConfirm: onRemove,
    });
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="baseline">
          <Title order={4}>Mis rutinas</Title>
          <Text size="sm" c="dimmed">
            {routines.length} de {MAX_SAVED_ROUTINES} rutinas guardadas
          </Text>
        </Group>

        {isLoading && (
          <Text size="sm" c="dimmed">
            Cargando tus rutinas…
          </Text>
        )}
        {!isLoading && routines.length === 0 && (
          <Text size="sm" c="dimmed">
            Aún no tienes rutinas guardadas.
          </Text>
        )}

        {routines.length > 0 && (
          <Select
            label="Rutina guardada"
            data={routines.map((routine) => ({ value: routine.id, label: routine.name }))}
            value={selectedId}
            onChange={(id) => id && onSelect(id)}
            allowDeselect={false}
            placeholder="Elige una rutina"
          />
        )}

        {isDirty && (
          <Badge color="yellow" variant="light" w="fit-content">
            Cambios sin guardar
          </Badge>
        )}

        <Group gap="xs">
          <Button size="xs" disabled={!selected || !isDirty || isSaving} onClick={onSave}>
            Guardar
          </Button>
          <Button
            size="xs"
            variant="light"
            disabled={!hasEntries || !canCreate || isSaving}
            onClick={() => openDialog('new')}
          >
            Guardar como nueva
          </Button>
          <Button size="xs" variant="default" disabled={!selected || isSaving} onClick={() => openDialog('rename')}>
            Renombrar
          </Button>
          <Button size="xs" variant="subtle" color="red" disabled={!selected || isSaving} onClick={confirmRemove}>
            Borrar rutina
          </Button>
        </Group>

        {!canCreate && (
          <Alert color="yellow" variant="light" p="xs">
            Has alcanzado el máximo de {MAX_SAVED_ROUTINES} rutinas. Borra una para guardar otra.
          </Alert>
        )}
      </Stack>

      <Modal
        opened={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog === 'rename' ? 'Renombrar rutina' : 'Guardar rutina nueva'}
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Nombre de la rutina"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            data-autofocus
            onChange={(event) => setName(event.currentTarget.value)}
            onKeyDown={(event) => event.key === 'Enter' && void submitName()}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDialog(null)}>
              Cancelar
            </Button>
            <Button disabled={!name.trim() || isSaving} loading={isSaving} onClick={() => void submitName()}>
              {dialog === 'rename' ? 'Renombrar' : 'Guardar'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
};
