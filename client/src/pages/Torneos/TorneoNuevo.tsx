import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Title,
  Text,
  TextInput,
  NumberInput,
  Select,
  Button,
  Stack,
  Group,
  SimpleGrid,
  Switch,
  ThemeIcon,
  Divider,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconTrophy, IconDeviceFloppy, IconArrowLeft } from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import '@mantine/dates/styles.css';

export const TorneoNuevo = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // --- ESTADOS DEL FORMULARIO ---
  const [name, setName] = useState('');
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [typeTournament, setTypeTournament] = useState<string>('Interno');
  const [levelTournament, setLevelTournament] = useState<string>('Mixto');
  const [numPlayers, setNumPlayers] = useState<number | string>(16);
  const [rounds, setRounds] = useState<string>('GruposKnockout');

  // Estados condicionales (Grupos)
  const [numGroup, setNumGroup] = useState<number | string>(4);
  const [numGroupPlayers, setNumGroupPlayers] = useState<number | string>(4);

  // Estados condicionales (Eliminatorias)
  const [typeKnockout, setTypeKnockout] = useState<string>('LlaveA');
  const [playersKnockout, setPlayersKnockout] = useState<number | string>(2);
  const [sortKnockout, setSortKnockout] = useState<string>('Siembra');
  const [allPos, setAllPos] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Preparamos el payload base
      const payload: any = {
        name,
        dateStart: dateStart ? dateStart.toISOString() : new Date().toISOString(),
        numPlayers: Number(numPlayers),
        typeTournament,
        levelTournament,
        rounds,
      };

      // 2. Inyectamos variables según el formato elegido para cumplir con tu Zod Schema
      if (rounds === 'TodosvsTodos') {
        payload.numGroup = 1;
        payload.numGroupPlayers = Number(numPlayers);
      } else if (rounds === 'GruposKnockout') {
        payload.numGroup = Number(numGroup);
        payload.numGroupPlayers = Number(numGroupPlayers);
        payload.playersKnockout = Number(playersKnockout);
        payload.typeKnockout = typeKnockout;
        payload.sortKnockout = sortKnockout;
        payload.allPos = allPos;
        payload.sortGroups = 'Snake'; // Algoritmo por defecto para grupos
      } else if (rounds === 'Knockout') {
        payload.typeKnockout = typeKnockout;
        payload.sortKnockout = sortKnockout;
        payload.allPos = allPos;
      }

      // 3. Enviamos al backend
      const response = await api.post(ENDPOINTS.TOURNAMENTS.BASE, payload);

      if (response.data.tournament) {
        // Redirigimos directamente a la vista de detalles del nuevo torneo
        navigate(APP_ROUTES.TORNEOS.DETAILS(response.data.tournament.id));
      }
    } catch (error) {
      console.error('Error al crear el torneo', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="xl" maw={800} mx="auto">
      <div>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate('/torneos')}
        >
          Volver a Torneos
        </Button>
      </div>

      <Group gap="sm">
        <ThemeIcon size={50} radius="md" color="blue" variant="light">
          <IconTrophy size={28} />
        </ThemeIcon>
        <div>
          <Title order={2}>Crear Nuevo Torneo</Title>
          <Text c="dimmed" size="sm">
            Configura las reglas y el formato de la competición.
          </Text>
        </div>
      </Group>

      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            {/* SECCIÓN 1: DATOS BÁSICOS */}
            <Title order={4}>Datos Básicos</Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Nombre del Torneo"
                placeholder="Ej. Open de Primavera"
                required
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
              />
              <DateInput
                label="Fecha de Inicio"
                placeholder="Selecciona una fecha"
                required
                value={dateStart}
                onChange={(val) => setDateStart(val ? new Date(val) : null)}
                minDate={new Date()}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <Select
                label="Nivel"
                data={['Principiante', 'Intermedio', 'Avanzado', 'Federado', 'Mixto']}
                value={levelTournament}
                onChange={(val) => setLevelTournament(val || 'Mixto')}
                allowDeselect={false}
              />
              <Select
                label="Acceso"
                data={['Interno', 'Abierto', 'Oficial']}
                value={typeTournament}
                onChange={(val) => setTypeTournament(val || 'Interno')}
                allowDeselect={false}
              />
              <NumberInput
                label="Total Jugadores Máx."
                required
                min={2}
                max={128}
                value={numPlayers}
                onChange={setNumPlayers}
              />
            </SimpleGrid>

            <Divider my="sm" />

            {/* SECCIÓN 2: FORMATO DEL TORNEO */}
            <Title order={4}>Formato de Competición</Title>
            <Select
              label="Estructura de Rondas"
              description="Determina cómo se cruzarán los jugadores"
              data={[
                { value: 'GruposKnockout', label: 'Fase de Grupos + Eliminatorias (Recomendado)' },
                { value: 'TodosvsTodos', label: 'Liga (Todos contra Todos)' },
                { value: 'Knockout', label: 'Eliminatoria Directa (Knockout)' },
              ]}
              value={rounds}
              onChange={(val) => setRounds(val || 'GruposKnockout')}
              allowDeselect={false}
              required
            />

            {/* CAMPOS CONDICIONALES: FASE DE GRUPOS */}
            {rounds === 'GruposKnockout' && (
              <Card withBorder bg="var(--mantine-color-gray-0)" style={{ darkHidden: true }}>
                <Title order={5} mb="sm">
                  Configuración de Grupos
                </Title>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <NumberInput
                    label="Cantidad de Grupos"
                    description="Entre 2 y 16 grupos"
                    required
                    min={2}
                    max={16}
                    value={numGroup}
                    onChange={setNumGroup}
                  />
                  <NumberInput
                    label="Jugadores por Grupo"
                    description="Mínimo 3 jugadores"
                    required
                    min={3}
                    value={numGroupPlayers}
                    onChange={setNumGroupPlayers}
                  />
                </SimpleGrid>
              </Card>
            )}

            {/* CAMPOS CONDICIONALES: ELIMINATORIAS (Aplica a Grupos+Knockout y Knockout puro) */}
            {(rounds === 'GruposKnockout' || rounds === 'Knockout') && (
              <Card withBorder bg="var(--mantine-color-gray-0)" style={{ darkHidden: true }}>
                <Title order={5} mb="sm">
                  Configuración de Llaves (Cuadro)
                </Title>
                <SimpleGrid cols={{ base: 1, sm: 2 }} mb="md">
                  {rounds === 'GruposKnockout' && (
                    <NumberInput
                      label="Clasificados por grupo"
                      description="¿Cuántos pasan al cuadro principal?"
                      required
                      min={1}
                      value={playersKnockout}
                      onChange={setPlayersKnockout}
                    />
                  )}
                  <Select
                    label="Tipo de Llaves"
                    data={[
                      { value: 'LlaveA', label: 'Solo Llave A (Principal)' },
                      { value: 'LlaveAB', label: 'Llave A y B (Consolación)' },
                    ]}
                    value={typeKnockout}
                    onChange={(val) => setTypeKnockout(val || 'LlaveA')}
                    allowDeselect={false}
                  />
                  <Select
                    label="Ordenamiento en el Cuadro"
                    description="Cómo se cruzan los jugadores"
                    data={[
                      { value: 'Siembra', label: 'Cabezas de Serie (Siembra)' },
                      { value: 'Aleatorio', label: 'Sorteo Aleatorio' },
                    ]}
                    value={sortKnockout}
                    onChange={(val) => setSortKnockout(val || 'Siembra')}
                    allowDeselect={false}
                  />
                </SimpleGrid>

                <Switch
                  label="Jugar todos los puestos (Full Bracket)"
                  description="Si está activo, los perdedores seguirán jugando para definir su posición final exacta (ej. 3º, 5º, 9º)."
                  checked={allPos}
                  onChange={(event) => setAllPos(event.currentTarget.checked)}
                  color="blue"
                  mt="sm"
                />
              </Card>
            )}

            <Button
              type="submit"
              color="blue"
              size="md"
              fullWidth
              mt="xl"
              loading={loading}
              leftSection={<IconDeviceFloppy size={18} />}
            >
              Guardar y Crear Torneo
            </Button>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
};
