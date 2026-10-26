import { useEffect, useMemo, useState } from 'react';
import { Button, Group, Modal, NumberInput, Select, Stack, Text } from '@mantine/core';
import { IconBarbell } from '@tabler/icons-react';
import { EXERCISE_CATEGORIES } from '../../constants/constants';
import type { Exercise } from '../../types/api';
import type { ExercisePayload } from '../../hooks/useTrainingPlan';

/**
 * Modal para asignar un ejercicio del catalogo a una sesion.
 *
 * El formulario (filtro por categoria, ejercicio, series, repeticiones y
 * duracion) vive dentro del componente: la pagina solo le pasa el catalogo y
 * recibe el ejercicio anadido.
 */

/** Propiedades del modal. */
export interface AddExerciseModalProps {
  opened: boolean;
  onClose: () => void;
  /** Catalogo de ejercicios del club. */
  catalog: Exercise[];
  /** Callback con el ejercicio elegido y sus parametros; devuelve si la accion tuvo exito. */
  onSubmit: (payload: ExercisePayload) => Promise<boolean>;
  /** Si se esta guardando. */
  isSubmitting?: boolean;
}

export const AddExerciseModal = ({
  opened,
  onClose,
  catalog,
  onSubmit,
  isSubmitting = false,
}: AddExerciseModalProps) => {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [sets, setSets] = useState<number | string>('');
  const [reps, setReps] = useState<number | string>('');
  const [duration, setDuration] = useState<number | string>('');

  // Al reabrir el modal se limpian los valores del ejercicio anterior.
  useEffect(() => {
    if (!opened) {
      setExerciseId(null);
      setSets('');
      setReps('');
      setDuration('');
    }
  }, [opened]);

  const options = useMemo(
    () =>
      catalog
        .filter((exercise) => !categoryFilter || exercise.category === categoryFilter)
        .map((exercise) => ({
          value: exercise.id,
          label: `${exercise.code ? `[${exercise.code}] ` : ''}${exercise.name}`,
        })),
    [catalog, categoryFilter],
  );

  const handleSubmit = async () => {
    if (!exerciseId) return;

    const succeeded = await onSubmit({
      exerciseId,
      sets: sets ? Number(sets) : undefined,
      reps: reps ? Number(reps) : undefined,
      durationMinutes: duration ? Number(duration) : undefined,
    });

    if (succeeded) onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconBarbell color="orange" />
          <Text fw={700} size="lg">
            Asignar Ejercicio
          </Text>
        </Group>
      }
      centered
    >
      <Stack gap="md">
        <Select
          label="Filtrar por Categoría"
          placeholder="Todas las categorías"
          data={EXERCISE_CATEGORIES}
          value={categoryFilter}
          onChange={(value) => {
            setCategoryFilter(value);
            setExerciseId(null);
          }}
          clearable
        />

        <Select
          label="Selecciona un ejercicio"
          placeholder="Busca por nombre o código..."
          data={options}
          value={exerciseId}
          onChange={setExerciseId}
          searchable
          required
          nothingFoundMessage="No hay ejercicios en esta categoría"
        />

        <Group grow>
          <NumberInput
            label="Series"
            placeholder="Opcional"
            min={1}
            value={sets}
            onChange={setSets}
          />
          <NumberInput
            label="Repeticiones"
            placeholder="Opcional"
            min={1}
            value={reps}
            onChange={setReps}
          />
        </Group>

        <NumberInput
          label="Duración (Minutos)"
          placeholder="Opcional (Ej. para calentamiento/físico)"
          min={1}
          value={duration}
          onChange={setDuration}
        />

        <Button
          color="orange"
          fullWidth
          mt="md"
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={!exerciseId}
        >
          Añadir a la Sesión
        </Button>
      </Stack>
    </Modal>
  );
};

export default AddExerciseModal;
