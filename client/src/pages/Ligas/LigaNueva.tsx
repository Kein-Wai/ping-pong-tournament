import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconArrowLeft, IconDeviceFloppy, IconTrophy } from '@tabler/icons-react';
import { leaguesService } from '../../api/services/leagues';
import { APP_ROUTES } from '../../constants/routes';
import { bestOfLabel } from '../../utils/leagueView';
import '@mantine/dates/styles.css';

const SETS_TO_WIN_OPTIONS = [1, 2, 3, 4].map((setsToWin) => ({
  value: String(setsToWin),
  label: bestOfLabel(setsToWin),
}));

export const LigaNueva = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [setsToWin, setSetsToWin] = useState('2');
  const [doubleRound, setDoubleRound] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const created = await leaguesService.create({
        name: name.trim(),
        dateStart: dateStart ? dateStart.toISOString() : new Date().toISOString(),
        setsToWin: Number(setsToWin),
        doubleRound,
      });

      if (created) {
        navigate(APP_ROUTES.LIGAS.DETAILS(created.id));
      }
    } catch (error) {
      console.error('Error al crear la liga', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="lg" maw={800} mx="auto">
      <div>
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(APP_ROUTES.LIGAS.LIST)}
        >
          Volver a Ligas
        </Button>
      </div>

      <Group gap="sm">
        <ThemeIcon size={50} radius="md" color="blue" variant="light">
          <IconTrophy size={28} />
        </ThemeIcon>
        <div>
          <Title order={2}>Crear Nueva Liga</Title>
          <Text c="dimmed" size="sm">
            Todos los jugadores se enfrentan entre sí, sin fechas fijas por partido.
          </Text>
        </div>
      </Group>

      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Nombre de la Liga"
                placeholder="Ej. Liga de invierno"
                required
                minLength={3}
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
              />
              <DateInput
                label="Fecha de Inicio"
                placeholder="Selecciona una fecha"
                value={dateStart}
                onChange={(val) => setDateStart(val ? new Date(val) : null)}
              />
            </SimpleGrid>

            <Select
              label="Formato de los partidos"
              description="Se aplica a todos los partidos de la liga"
              data={SETS_TO_WIN_OPTIONS}
              value={setsToWin}
              onChange={(val) => setSetsToWin(val || '2')}
              allowDeselect={false}
            />

            <Switch
              label="Ida y vuelta"
              description="Cada pareja se enfrenta dos veces en lugar de una."
              checked={doubleRound}
              onChange={(event) => setDoubleRound(event.currentTarget.checked)}
              color="blue"
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
              Guardar y Crear Liga
            </Button>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
};
