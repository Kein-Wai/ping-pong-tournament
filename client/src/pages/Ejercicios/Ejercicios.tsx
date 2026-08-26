import { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Button,
  Group,
  Center,
  Loader,
  Stack,
  Select,
  SimpleGrid,
  Badge,
} from '@mantine/core';
import { IconPlus, IconBook, IconFilter } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { EXERCISE_CATEGORIES } from '../../constants/constants';

interface Exercise {
  id: string;
  name: string;
  code?: number | null;
  description: string;
  category: string;
  clubId: string | null;
}

export const Ejercicios = () => {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchExercises = async () => {
      setLoading(true);
      try {
        // Si hay categoría seleccionada, la mandamos en la URL (?category=...)
        const url = categoryFilter
          ? `${ENDPOINTS.EXERCISES.BASE}?category=${categoryFilter}`
          : ENDPOINTS.EXERCISES.BASE;

        const response = await api.get(url);
        setExercises(response.data.data);
      } catch (error) {
        console.error('Error cargando catálogo:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, [categoryFilter]); // 👈 El useEffect se vuelve a ejecutar si cambia el filtro

  // Función para obtener el nombre bonito de la categoría
  const getCategoryLabel = (val: string) => {
    return EXERCISE_CATEGORIES.find((c) => c.value === val)?.label || val;
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Group gap="sm">
          <IconBook size={28} color="var(--mantine-color-blue-filled)" />
          <Title order={2}>Catálogo de Ejercicios</Title>
        </Group>
        <Button
          leftSection={<IconPlus size={16} />}
          color="blue"
          onClick={() => navigate(APP_ROUTES.EJERCICIOS.NEW)}
        >
          Crear Ejercicio
        </Button>
      </Group>

      {/* FILTRO */}
      <Group align="flex-end" mb="md">
        <Select
          label="Filtrar por Categoría"
          placeholder="Todas las categorías"
          leftSection={<IconFilter size={16} />}
          data={EXERCISE_CATEGORIES}
          value={categoryFilter}
          onChange={setCategoryFilter}
          clearable // Permite borrar el filtro para ver todos
          style={{ width: 300 }}
        />
      </Group>

      {/* CATÁLOGO (GRID) */}
      {loading ? (
        <Center h={200}>
          <Loader color="blue" />
        </Center>
      ) : exercises.length === 0 ? (
        <Center py="xl">
          <Text c="dimmed">No se encontraron ejercicios.</Text>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {exercises.map((ex) => (
            <Card key={ex.id} shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text fw={700} truncate style={{ flex: 1 }}>
                  {ex.name}
                </Text>
                {ex.code && (
                  <Badge color="orange" variant="light">
                    Ref: {ex.code}
                  </Badge>
                )}
              </Group>

              <Badge color="blue" mb="sm" size="sm" variant="dot">
                {getCategoryLabel(ex.category)}
              </Badge>

              <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                {ex.description}
              </Text>

              {/* Distintivo para saber si es global del sistema o propio del club */}
              {!ex.clubId && (
                <Text size="xs" c="teal" fw={600} mt="md" ta="right">
                  🌐 Ejercicio Global Oficial
                </Text>
              )}
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
};
