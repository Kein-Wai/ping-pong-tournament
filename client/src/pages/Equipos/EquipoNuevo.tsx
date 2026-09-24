import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Title,
  Text,
  TextInput,
  Button,
  Stack,
  Group,
  ThemeIcon,
  Select,
  SimpleGrid,
} from '@mantine/core';
import { IconShield, IconDeviceFloppy, IconArrowLeft } from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';

export const EquipoNuevo = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string | null>('1ª Autonómica');
  const [level, setLevel] = useState<string | null>('Intermedio');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !level) return;

    setLoading(true);
    try {
      await api.post(ENDPOINTS.TEAMS.BASE, { name, category, level });
      navigate(APP_ROUTES.EQUIPOS.LIST);
    } catch (error) {
      console.error(error);
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
          onClick={() => navigate(APP_ROUTES.EQUIPOS.LIST)}
        >
          Volver a Equipos
        </Button>
      </div>

      <Group gap="sm">
        <ThemeIcon size={50} radius="md" color="blue" variant="light">
          <IconShield size={28} />
        </ThemeIcon>
        <div>
          <Title order={2}>Registrar Equipo</Title>
          <Text c="dimmed" size="sm">
            Añade un nuevo escuadrón para competir en liga oficial.
          </Text>
        </div>
      </Group>

      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Nombre del Equipo"
              placeholder="Ej. TM Castellón Promesas"
              required
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Select
                label="Categoría de Liga"
                description="División en la que compite"
                data={[
                  'Superdivisión',
                  'División de Honor',
                  '1ª Nacional',
                  '2ª Nacional',
                  '3ª Nacional (Superautonomica)',
                  '1ª Autonómica',
                  '2ª Autonómica',
                  'Liga Local',
                ]}
                value={category}
                onChange={setCategory}
                required
                allowDeselect={false}
                searchable
              />

              <Select
                label="Nivel Base Inicial"
                description="Se recalculará al añadir jugadores"
                data={['Iniciacion', 'Principiante', 'Intermedio', 'Avanzado', 'Profesional']}
                value={level}
                onChange={setLevel}
                required
                allowDeselect={false}
              />
            </SimpleGrid>

            <Button
              type="submit"
              color="blue"
              size="md"
              fullWidth
              mt="md"
              loading={loading}
              leftSection={<IconDeviceFloppy size={18} />}
            >
              Guardar Equipo
            </Button>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
};
