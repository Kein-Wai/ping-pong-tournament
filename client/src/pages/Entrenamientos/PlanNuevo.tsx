import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Title,
  Text,
  Textarea,
  NumberInput,
  Button,
  Stack,
  Group,
  SimpleGrid,
  ThemeIcon,
  Center,
  Loader,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconClipboardList, IconDeviceFloppy, IconArrowLeft } from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';

export const PlanNuevo = () => {
  // 1. Extraemos el playerId de la URL mágica de React Router
  const { playerId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [playerData, setPlayerData] = useState<{ name: string; surname: string } | null>(null);

  // Estados del Formulario (Alineados con tus reglas de Zod)
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [objectives, setObjectives] = useState('');
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number | string>(3);
  const [weeks, setWeeks] = useState<number | string>(4); // Un mes por defecto
  const [startDate, setStartDate] = useState<Date | null>(new Date());

  // Al montar la pantalla, buscamos el nombre del jugador para la UX
  useEffect(() => {
    if (!playerId) return;
    api
      .get(ENDPOINTS.USERS.BY_ID(playerId))
      .then((res) => setPlayerData(res.data.data || res.data))
      .catch((err) => console.error('Error al cargar jugador', err));
  }, [playerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId || !startDate) return;

    setLoading(true);
    try {
      const payload = {
        playerId,
        strengths,
        weaknesses,
        objectives,
        sessionsPerWeek: Number(sessionsPerWeek),
        weeks: Number(weeks),
        startDate: startDate.toISOString(),
      };

      // 1. Guardamos la respuesta del backend
      const response = await api.post(ENDPOINTS.TRAININGS.BASE, payload);

      // 3. Extraemos el ID del nuevo plan y navegamos DIRECTAMENTE a sus detalles
      const newPlanId = response.data.data.id;
      navigate(APP_ROUTES.ENTRENAMIENTOS.DETAILS(newPlanId));
    } catch (error) {
      console.error('Error al crear el plan:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!playerData) {
    return (
      <Center h={400}>
        <Loader color="orange" type="bars" />
      </Center>
    );
  }

  return (
    <Stack gap="xl" maw={800} mx="auto">
      <div>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(APP_ROUTES.JUGADORES.PROFILE(playerId || ''))}
        >
          Volver al Perfil
        </Button>
      </div>

      <Group gap="sm">
        <ThemeIcon size={50} radius="md" color="orange" variant="light">
          <IconClipboardList size={28} />
        </ThemeIcon>
        <div>
          <Title order={2}>Planificación (Macrociclo)</Title>
          <Text c="dimmed" size="sm">
            Creando plan para{' '}
            <Text component="span" fw={700} c="blue">
              {playerData.name} {playerData.surname}
            </Text>
          </Text>
        </div>
      </Group>

      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <Title order={4}>Análisis del Jugador</Title>

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Textarea
                label="Fortalezas"
                placeholder="Ej. Muy buen saque lateral corto, derecha muy potente..."
                required
                minRows={3}
                value={strengths}
                onChange={(e) => setStrengths(e.currentTarget.value)}
              />
              <Textarea
                label="Debilidades"
                placeholder="Ej. Desplazamiento lento hacia el revés, problemas restando saques largos..."
                required
                minRows={3}
                value={weaknesses}
                onChange={(e) => setWeaknesses(e.currentTarget.value)}
              />
            </SimpleGrid>

            <Textarea
              label="Objetivos del Macrociclo"
              placeholder="Ej. Mejorar la movilidad de pivot y automatizar el ataque de tercera pelota."
              required
              minRows={2}
              value={objectives}
              onChange={(e) => setObjectives(e.currentTarget.value)}
            />

            <Title order={4} mt="md">
              Estructura del Calendario
            </Title>
            <Group grow align="flex-end">
              <DateInput
                label="Fecha de Inicio"
                placeholder="¿Cuándo empieza?"
                required
                value={startDate}
                onChange={(val) => setStartDate(val ? new Date(val) : null)}
                minDate={new Date()} // No dejamos planear en el pasado
              />
              <NumberInput
                label="Duración (Semanas)"
                description="Mínimo 1, Máximo 12"
                required
                min={1}
                max={12}
                value={weeks}
                onChange={setWeeks}
              />
              <NumberInput
                label="Sesiones por Semana"
                description="Mínimo 1, Máximo 5"
                required
                min={1}
                max={5}
                value={sessionsPerWeek}
                onChange={setSessionsPerWeek}
              />
            </Group>

            <Button
              type="submit"
              color="orange"
              size="md"
              fullWidth
              mt="xl"
              loading={loading}
              leftSection={<IconDeviceFloppy size={18} />}
            >
              Generar Plan y Sesiones
            </Button>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
};
