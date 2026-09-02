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

export const AnalisisList = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Formulario rápido
  const [opponentName, setOppName] = useState('');
  const [matchType, setMatchType] = useState('Amistoso');
  const [opponentHand, setOpponentHand] = useState<string | null>(null);
  const [opponentStyle, setOpponentStyle] = useState<string | null>(null);
  const [opponentLevel, setOpponentLevel] = useState<string | null>(null);

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
        format: 'Individual',
        opponentHand,
        opponentStyle,
        opponentLevel,
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
                    Formato: {m.format} · {m.matchType}
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
          <TextInput
            label="Nombre del Rival"
            required
            value={opponentName}
            onChange={(e) => setOppName(e.currentTarget.value)}
            data-autofocus
          />
          <Select
            label="Tipo de Partido"
            data={['Amistoso', 'Liga', 'Competicion']}
            value={matchType}
            onChange={(val) => setMatchType(val!)}
            allowDeselect={false}
          />
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
              value={opponentHand}
              onChange={setOpponentLevel}
              clearable
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
