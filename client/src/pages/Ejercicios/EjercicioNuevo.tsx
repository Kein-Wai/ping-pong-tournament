import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Title,
  Text,
  TextInput,
  NumberInput,
  Select,
  Textarea,
  Button,
  Stack,
  Group,
  ThemeIcon,
} from '@mantine/core';
import { IconBook, IconDeviceFloppy, IconArrowLeft } from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { EXERCISE_CATEGORIES } from '../../constants/constants';

export const EjercicioNuevo = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Estados del formulario
  const [name, setName] = useState('');
  const [code, setCode] = useState<number | string>('');
  const [description, setDescription] = useState('');
  // Por defecto, seleccionamos la primera categoría para evitar nulos
  const [category, setCategory] = useState<string>(EXERCISE_CATEGORIES[0].value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        name,
        description,
        category,
      };

      // Regla de negocio: Si el usuario escribió un código, lo enviamos como número
      if (code !== '') {
        payload.code = Number(code);
      }

      await api.post(ENDPOINTS.EXERCISES.BASE, payload);

      // Si va bien, volvemos al catálogo
      navigate(APP_ROUTES.EJERCICIOS.LIST);
    } catch (error) {
      console.error('Error al crear el ejercicio:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="xl" maw={600} mx="auto">
      <div>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(APP_ROUTES.EJERCICIOS.LIST)}
        >
          Volver al Catálogo
        </Button>
      </div>

      <Group gap="sm">
        <ThemeIcon size={50} radius="md" color="blue" variant="light">
          <IconBook size={28} />
        </ThemeIcon>
        <div>
          <Title order={2}>Añadir Ejercicio</Title>
          <Text c="dimmed" size="sm">
            Crea un nuevo ejercicio técnico, táctico o físico para tu club.
          </Text>
        </div>
      </Group>

      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Group grow align="flex-start">
              <TextInput
                label="Nombre del Ejercicio"
                placeholder="Ej. Saque lateral corto"
                required
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
              />
              <NumberInput
                label="Código de Referencia"
                placeholder="Ej. 14 (Opcional)"
                min={1}
                value={code}
                onChange={setCode}
                description="Útil para pizarras"
              />
            </Group>

            <Select
              label="Categoría"
              description="Clasificación principal del ejercicio"
              required
              data={EXERCISE_CATEGORIES}
              value={category}
              onChange={(val) => setCategory(val || EXERCISE_CATEGORIES[0].value)}
              allowDeselect={false}
              searchable
            />

            <Textarea
              label="Descripción detallada"
              placeholder="Explica los pasos, la posición del cuerpo, la rotación de la pelota..."
              required
              minRows={4}
              autosize
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
            />

            <Button
              type="submit"
              color="blue"
              size="md"
              fullWidth
              mt="xl"
              loading={loading}
              leftSection={<IconDeviceFloppy size={18} />}
            >
              Guardar Ejercicio
            </Button>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
};
