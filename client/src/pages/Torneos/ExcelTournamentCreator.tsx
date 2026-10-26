import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stepper,
  Button,
  Group,
  TextInput,
  NumberInput,
  Modal,
  Stack,
  Title,
  Paper,
  Text,
  Center,
  ThemeIcon,
  Select,
  SimpleGrid,
} from '@mantine/core';
import { IconFileExcel, IconCheck, IconArrowLeft, IconTrophy } from '@tabler/icons-react';
import { tournamentsService } from '../../api/services/tournaments';
import { APP_ROUTES } from '../../constants/routes';

export const ExcelTournamentCreator = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // 1. Estado para los datos del torneo
  const [tournamentInfo, setTournamentInfo] = useState({
    name: '',
    dateStart: new Date().toISOString().split('T')[0],
    levelTournament: 'General',
    numPlayers: 8,
    numGroupPlayers: 4,
    playersKnockout: 2,
  });

  // 2. Estado para la lista de jugadores
  const [playerNames, setPlayerNames] = useState<string[]>(Array(8).fill(''));

  // Gestor dinámico del array de jugadores
  const handleNumPlayersChange = (val: number | string) => {
    const value = typeof val === 'string' ? 0 : val;
    setTournamentInfo({ ...tournamentInfo, numPlayers: value });

    setPlayerNames((prev) => {
      const newArray = [...prev];
      if (value > prev.length) {
        newArray.push(...Array(value - prev.length).fill(''));
      } else {
        newArray.length = value;
      }
      return newArray;
    });
  };

  const handlePlayerNameChange = (index: number, value: string) => {
    const newPlayers = [...playerNames];
    newPlayers[index] = value;
    setPlayerNames(newPlayers);
  };

  // 3. API Call y Descarga
  const handleGenerateExcel = async () => {
    setIsGenerating(true);
    try {
      // Mapeamos a la estructura que espera tu backend
      const formattedPlayers = playerNames.map((name) => ({ name: name.trim() || 'Desconocido' }));

      const payload = {
        tournamentInfo,
        players: formattedPlayers,
      };

      const excelFile = await tournamentsService.generateExcel(payload);

      // Forzar la descarga del archivo en el navegador
      const url = window.URL.createObjectURL(new Blob([excelFile]));
      const link = document.createElement('a');
      link.href = url;
      const fileName = tournamentInfo.name ? tournamentInfo.name.replace(/\s+/g, '_') : 'Torneo';
      link.setAttribute('download', `Torneo_${fileName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setIsModalOpen(false);
      navigate(APP_ROUTES.TORNEOS.LIST);
    } catch (error) {
      console.error('Error generando Excel:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const isStep1Valid = tournamentInfo.name.trim() !== '' && tournamentInfo.numPlayers >= 2;
  const isStep2Valid = playerNames.every((name) => name.trim() !== '');

  return (
    <Stack gap="xl" maw={800} mx="auto">
      <div>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(APP_ROUTES.TORNEOS.LIST)}
        >
          Volver a Torneos
        </Button>
      </div>

      <Group gap="sm">
        <ThemeIcon size={50} radius="md" color="green" variant="light">
          <IconFileExcel size={28} />
        </ThemeIcon>
        <div>
          <Title order={2}>Asistente de Torneos Excel</Title>
          <Text c="dimmed" size="sm">
            Crea torneos manuales y obtén los cruces generados en tu plantilla oficial.
          </Text>
        </div>
      </Group>

      <Paper p="xl" radius="md" withBorder shadow="sm">
        <Stepper active={activeStep} onStepClick={setActiveStep} color="green">
          {/* --- PASO 1: CONFIGURACIÓN --- */}
          <Stepper.Step label="Configuración" description="Datos del torneo">
            <Stack mt="xl" gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label="Nombre del Torneo"
                  placeholder="Ej: Open de Invierno"
                  required
                  value={tournamentInfo.name}
                  onChange={(e) =>
                    setTournamentInfo({ ...tournamentInfo, name: e.currentTarget.value })
                  }
                />
                <TextInput
                  label="Fecha"
                  type="date"
                  required
                  value={tournamentInfo.dateStart}
                  onChange={(e) =>
                    setTournamentInfo({ ...tournamentInfo, dateStart: e.currentTarget.value })
                  }
                />
              </SimpleGrid>

              <Select
                label="Categoría / Nivel"
                data={['Iniciación', 'General', 'Avanzado', 'Absoluto', 'Veteranos']}
                value={tournamentInfo.levelTournament}
                onChange={(val) =>
                  setTournamentInfo({ ...tournamentInfo, levelTournament: val || 'General' })
                }
                allowDeselect={false}
              />

              <SimpleGrid cols={{ base: 1, sm: 3 }} mt="sm">
                <NumberInput
                  label="Total de Jugadores"
                  min={2}
                  max={128}
                  required
                  value={tournamentInfo.numPlayers}
                  onChange={handleNumPlayersChange}
                />
                <NumberInput
                  label="Jugadores por Grupo"
                  description="Plantillas: 3, 4 o 5"
                  min={3}
                  max={5}
                  required
                  value={tournamentInfo.numGroupPlayers}
                  onChange={(val) =>
                    setTournamentInfo({
                      ...tournamentInfo,
                      numGroupPlayers: val === '' ? 3 : Number(val),
                    })
                  }
                />
                <NumberInput
                  label="Clasifican al Cuadro"
                  description="Por grupo"
                  min={1}
                  max={4}
                  required
                  value={tournamentInfo.playersKnockout}
                  onChange={(val) =>
                    setTournamentInfo({
                      ...tournamentInfo,
                      playersKnockout: val === '' ? 1 : Number(val),
                    })
                  }
                />
              </SimpleGrid>
            </Stack>
          </Stepper.Step>

          {/* --- PASO 2: INSCRITOS --- */}
          <Stepper.Step label="Participantes" description="Lista por ELO">
            <Stack mt="xl">
              <Paper
                bg="var(--mantine-color-gray-0)"
                p="md"
                radius="md"
                style={{ darkHidden: true }}
              >
                <Group gap="xs" align="flex-start">
                  <IconTrophy size={20} color="var(--mantine-color-orange-6)" />
                  <Text size="sm" style={{ flex: 1 }}>
                    Introduce los nombres de los <strong>{tournamentInfo.numPlayers}</strong>{' '}
                    participantes. <br />
                    <Text span c="dimmed">
                      ⚠️ Es muy importante introducirlos{' '}
                      <strong>ordenados de mayor a menor nivel</strong>. El Jugador 1 será el Cabeza
                      de Serie Absoluto.
                    </Text>
                  </Text>
                </Group>
              </Paper>

              <SimpleGrid cols={{ base: 1, sm: 2 }} mt="sm">
                {playerNames.map((name, index) => (
                  <TextInput
                    key={index}
                    label={`Jugador ${index + 1} ${index === 0 ? '👑' : ''}`}
                    placeholder={`Nombre del jugador`}
                    required
                    value={name}
                    onChange={(e) => handlePlayerNameChange(index, e.currentTarget.value)}
                  />
                ))}
              </SimpleGrid>
            </Stack>
          </Stepper.Step>

          <Stepper.Completed>
            <Center py="xl" style={{ flexDirection: 'column' }}>
              <IconCheck size={60} color="var(--mantine-color-green-6)" />
              <Title order={3} mt="md">
                Todo listo para el Sorteo
              </Title>
              <Text c="dimmed" mt="xs" ta="center">
                El sistema distribuirá a los {tournamentInfo.numPlayers} jugadores en grupos de{' '}
                {tournamentInfo.numGroupPlayers} y generará el cuadro final.
              </Text>
            </Center>
          </Stepper.Completed>
        </Stepper>

        <Group justify="flex-end" mt="xl">
          {activeStep > 0 && (
            <Button variant="default" onClick={() => setActiveStep((current) => current - 1)}>
              Atrás
            </Button>
          )}
          {activeStep === 0 && (
            <Button color="green" onClick={() => setActiveStep(1)} disabled={!isStep1Valid}>
              Siguiente Paso
            </Button>
          )}
          {activeStep === 1 && (
            <Button color="green" onClick={() => setActiveStep(2)} disabled={!isStep2Valid}>
              Revisar Inscripción
            </Button>
          )}
          {activeStep === 2 && (
            <Button
              color="green"
              leftSection={<IconFileExcel size={18} />}
              onClick={() => setIsModalOpen(true)}
            >
              Generar Excel Oficial
            </Button>
          )}
        </Group>
      </Paper>

      {/* MODAL DE CONFIRMACIÓN */}
      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={<Text fw={700}>Confirmar Sorteo</Text>}
        centered
      >
        <Text size="sm" mb="lg">
          Se va a descargar el archivo Excel "<strong>{tournamentInfo.name}</strong>" con las
          pestañas de Grupos y la Llave Final ya calculadas.
        </Text>
        <Group justify="flex-end">
          <Button variant="outline" color="gray" onClick={() => setIsModalOpen(false)}>
            Cancelar
          </Button>
          <Button color="green" loading={isGenerating} onClick={handleGenerateExcel}>
            Sí, Descargar Excel
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
};
