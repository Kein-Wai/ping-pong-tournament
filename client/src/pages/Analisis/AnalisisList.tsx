import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stack,
  Title,
  Card,
  Button,
  Group,
  Text,
  Center,
  Loader,
  Modal,
  TextInput,
  Select,
  ThemeIcon,
  SimpleGrid,
} from '@mantine/core';
import { IconDeviceAnalytics, IconPlus } from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { DateInput } from '@mantine/dates';
import '@mantine/dates/styles.css';

export const AnalisisList = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Formulario rápido
  const [opponentName, setOppName] = useState('');
  const [matchType, setMatchType] = useState('Amistoso');
  const [matchFormat, setMatchFormat] = useState<string>('Individual');
  const [opponentHand, setOpponentHand] = useState<string | null>(null);
  const [opponentStyle, setOpponentStyle] = useState<string | null>(null);
  const [opponentLevel, setOpponentLevel] = useState<string | null>(null);
  const [setsToWin, setSetsToWin] = useState<string>('3');
  const [matchDate, setMatchDate] = useState<Date | null>(new Date());

  useEffect(() => {
    api
      .get(ENDPOINTS.MANUAL_MATCHES.BASE)
      .then((res) => setMatches(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleStartMatch = async () => {
    setCreating(true);
    try {
      const res = await api.post(ENDPOINTS.MANUAL_MATCHES.BASE, {
        opponentName,
        matchType,
        location: 'Casa', // Valores por defecto para ir rápido
        format: matchFormat,
        opponentHand,
        opponentStyle,
        opponentLevel,
        setsToWin: Number(setsToWin),
        date: matchDate ? matchDate.toISOString() : new Date().toISOString(),
      });
      navigate(APP_ROUTES.ANALISIS.TRACKER(res.data.data.id));
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Stack gap="lg">
      {/* 👇 1. CABECERA ESTANDARIZADA (Icono con fondo + Botón) */}
      <Group justify="space-between" align="center" mb="sm">
        <Group gap="sm">
          <ThemeIcon size={40} radius="md" color="blue" variant="light">
            <IconDeviceAnalytics size={24} />
          </ThemeIcon>
          <Title order={2}>Mis Análisis Pro</Title>
        </Group>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
          Nuevo Partido
        </Button>
      </Group>

      {/* 👇 2. RENDERIZADO CONDICIONAL CON ESTADO VACÍO */}
      {loading ? (
        <Center h={400}>
          <Loader color="blue" type="bars" />
        </Center>
      ) : matches.length === 0 ? (
        <Card withBorder shadow="sm" radius="md" padding="xl">
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconDeviceAnalytics size={48} color="var(--mantine-color-gray-4)" stroke={1.5} />
              <Text c="dimmed" size="md" fw={500}>
                Aún no hay análisis registrados.
              </Text>
              <Text c="dimmed" size="sm" ta="center" maw={400}>
                Lleva un control exhaustivo de tus partidos externos para descubrir tus puntos
                débiles y fortalezas.
              </Text>
              <Button variant="light" color="blue" mt="sm" onClick={() => setModalOpen(true)}>
                Crear mi primer análisis
              </Button>
            </Stack>
          </Center>
        </Card>
      ) : (
        <Stack gap="sm">
          {matches.map((m) => (
            <Card key={m.id} withBorder shadow="sm" radius="md">
              <Group justify="space-between">
                <div>
                  <Text fw={700} size="lg">
                    vs {m.opponentName}
                  </Text>

                  <Text c="dimmed" size="sm">
                    {m.date ? new Date(m.date).toLocaleDateString('es-ES') : 'Sin fecha'} · Formato:{' '}
                    {m.format} · {m.matchType}
                  </Text>
                </div>
                <Group>
                  <Text c="dimmed" fw={500} size="sm">
                    {m.status}
                  </Text>
                  <Button
                    variant="light"
                    onClick={() => navigate(APP_ROUTES.ANALISIS.TRACKER(m.id))}
                  >
                    {m.status === 'Completado' ? 'Ver Reporte' : 'Continuar Arbitraje'}
                  </Button>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      {/* MODAL CONFIGURACIÓN PARTIDO */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={<Text fw={700}>Configurar Partido</Text>}
        centered
      >
        <Stack gap="md">
          <DateInput
            label="Fecha del Partido"
            value={matchDate}
            onChange={(val) => setMatchDate(val ? new Date(val) : null)}
            maxDate={new Date()} // No permitir fechas futuras
            clearable
          />
          <TextInput
            label="Nombre del Rival"
            required
            value={opponentName}
            onChange={(e) => setOppName(e.currentTarget.value)}
            data-autofocus
          />
          <SimpleGrid cols={2}>
            <Select
              label="Tipo de Partido"
              data={['Amistoso', 'Liga', 'Competicion']}
              value={matchType}
              onChange={(val) => setMatchType(val!)}
              allowDeselect={false}
            />
            <Select
              label="Formato"
              data={['Individual', 'Equipos']}
              value={matchFormat}
              onChange={(val) => setMatchFormat(val!)}
              allowDeselect={false}
            />
          </SimpleGrid>
          <SimpleGrid cols={2}>
            <Select
              label="Mano del Rival"
              placeholder="Opcional"
              data={['Diestro', 'Zurdo']}
              value={opponentHand}
              onChange={setOpponentHand}
              clearable
            />
            <Select
              label="Estilo del Rival"
              placeholder="Opcional"
              data={['Ofensivo', 'Defensivo']}
              value={opponentStyle}
              onChange={setOpponentStyle}
              clearable
            />
          </SimpleGrid>
          <SimpleGrid cols={2}>
            <Select
              label="Nivel del Rival"
              placeholder="Opcional"
              data={['Peor', 'Igual', 'Mejor']}
              value={opponentLevel}
              onChange={setOpponentLevel}
              clearable
            />
            <Select
              label="Formato al mejor de..."
              data={[
                { value: '2', label: 'Mejor de 3 Sets (2 para ganar)' },
                { value: '3', label: 'Mejor de 5 Sets (3 para ganar)' },
                { value: '4', label: 'Mejor de 7 Sets (4 para ganar)' },
              ]}
              value={setsToWin}
              onChange={(val) => setSetsToWin(val!)}
              allowDeselect={false}
            />
          </SimpleGrid>

          <Button
            color="blue"
            fullWidth
            onClick={handleStartMatch}
            loading={creating}
            disabled={!opponentName}
          >
            Ir a la mesa
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
};
