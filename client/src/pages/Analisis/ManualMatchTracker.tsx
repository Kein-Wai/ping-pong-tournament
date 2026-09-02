import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Stack,
  Title,
  Group,
  Button,
  Text,
  ActionIcon,
  Paper,
  SimpleGrid,
  Center,
  Loader,
  Modal,
  Select,
  TextInput,
} from '@mantine/core';
import { IconArrowLeft, IconArrowBackUp, IconEdit } from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';

// --- CATÁLOGO DE PUNTOS GANADOS (BOTÓN VERDE) ---
const ACTIONS_WON: Record<string, any[]> = {
  Servicio: [
    { label: 'Largo Cruzado', technique: 'Largo', side: 'Derecha' },
    { label: 'Largo Paralelo', technique: 'Largo', side: 'Reves' },
    { label: 'Corto Derecha', technique: 'Corto', side: 'Derecha' },
    { label: 'Corto Revés', technique: 'Corto', side: 'Reves' },
  ],
  Resto: [
    {
      label: 'Ataque Cruzado de Derecha',
      side: 'Derecha',
      technique: 'Ataque',
      placement: 'Cruzado',
    },
    { label: 'Ataque Cruzado de Reves', side: 'Reves', technique: 'Ataque', placement: 'Cruzado' },
    {
      label: 'Ataque Paralelo de Derecha',
      side: 'Derecha',
      technique: 'Ataque',
      placement: 'Paralelo',
    },
    {
      label: 'Ataque Paralelo de Reves',
      side: 'Reves',
      technique: 'Ataque',
      placement: 'Paralelo',
    },
    { label: 'Push Cruzado de Derecha', side: 'Derecha', technique: 'Push', placement: 'Cruzado' },
    { label: 'Push Cruzado de Reves', side: 'Reves', technique: 'Push', placement: 'Cruzado' },
    {
      label: 'Push Paralelo de Derecha',
      side: 'Derecha',
      technique: 'Push',
      placement: 'Paralelo',
    },
    { label: 'Push Paralelo de Reves', side: 'Reves', technique: 'Push', placement: 'Paralelo' },
    { label: 'Flip Cruzado de Derecha', side: 'Derecha', technique: 'Flip', placement: 'Cruzado' },
    { label: 'Flip Cruzado de Reves', side: 'Reves', technique: 'Flip', placement: 'Cruzado' },
    {
      label: 'Flip Paralelo de Derecha',
      side: 'Derecha',
      technique: 'Flip',
      placement: 'Paralelo',
    },
    { label: 'Flip Paralelo de Reves', side: 'Reves', technique: 'Flip', placement: 'Paralelo' },
    {
      label: 'Corto Cruzado de Derecha',
      side: 'Derecha',
      technique: 'Corto',
      placement: 'Cruzado',
    },
    { label: 'Corto Cruzado de Reves', side: 'Reves', technique: 'Corto', placement: 'Cruzado' },
    {
      label: 'Corto Paralelo de Derecha',
      side: 'Derecha',
      technique: 'Corto',
      placement: 'Paralelo',
    },
    { label: 'Corto Paralelo de Reves', side: 'Reves', technique: 'Corto', placement: 'Paralelo' },
  ],
  '3ra Bola': [
    {
      label: 'Ataque Cruzado de Derecha',
      side: 'Derecha',
      technique: 'Ataque',
      placement: 'Cruzado',
    },
    { label: 'Ataque Cruzado de Reves', side: 'Reves', technique: 'Ataque', placement: 'Cruzado' },
    {
      label: 'Ataque Paralelo de Derecha',
      side: 'Derecha',
      technique: 'Ataque',
      placement: 'Paralelo',
    },
    {
      label: 'Ataque Paralelo de Reves',
      side: 'Reves',
      technique: 'Ataque',
      placement: 'Paralelo',
    },
    { label: 'Push Cruzado de Derecha', side: 'Derecha', technique: 'Push', placement: 'Cruzado' },
    { label: 'Push Cruzado de Reves', side: 'Reves', technique: 'Push', placement: 'Cruzado' },
    {
      label: 'Push Paralelo de Derecha',
      side: 'Derecha',
      technique: 'Push',
      placement: 'Paralelo',
    },
    { label: 'Push Paralelo de Reves', side: 'Reves', technique: 'Push', placement: 'Paralelo' },
    { label: 'Flip Cruzado de Derecha', side: 'Derecha', technique: 'Flip', placement: 'Cruzado' },
    { label: 'Flip Cruzado de Reves', side: 'Reves', technique: 'Flip', placement: 'Cruzado' },
    {
      label: 'Flip Paralelo de Derecha',
      side: 'Derecha',
      technique: 'Flip',
      placement: 'Paralelo',
    },
    { label: 'Flip Paralelo de Reves', side: 'Reves', technique: 'Flip', placement: 'Paralelo' },
    {
      label: 'Corto Cruzado de Derecha',
      side: 'Derecha',
      technique: 'Corto',
      placement: 'Cruzado',
    },
    { label: 'Corto Cruzado de Reves', side: 'Reves', technique: 'Corto', placement: 'Cruzado' },
    {
      label: 'Corto Paralelo de Derecha',
      side: 'Derecha',
      technique: 'Corto',
      placement: 'Paralelo',
    },
    { label: 'Corto Paralelo de Reves', side: 'Reves', technique: 'Corto', placement: 'Paralelo' },
  ],
  Rally: [
    {
      label: 'Ataque Cruzado de Derecha',
      side: 'Derecha',
      technique: 'Ataque',
      placement: 'Cruzado',
    },
    { label: 'Ataque Cruzado de Reves', side: 'Reves', technique: 'Ataque', placement: 'Cruzado' },
    {
      label: 'Ataque Paralelo de Derecha',
      side: 'Derecha',
      technique: 'Ataque',
      placement: 'Paralelo',
    },
    {
      label: 'Ataque Paralelo de Reves',
      side: 'Reves',
      technique: 'Ataque',
      placement: 'Paralelo',
    },
    { label: 'Push Cruzado de Derecha', side: 'Derecha', technique: 'Push', placement: 'Cruzado' },
    { label: 'Push Cruzado de Reves', side: 'Reves', technique: 'Push', placement: 'Cruzado' },
    {
      label: 'Push Paralelo de Derecha',
      side: 'Derecha',
      technique: 'Push',
      placement: 'Paralelo',
    },
    { label: 'Push Paralelo de Reves', side: 'Reves', technique: 'Push', placement: 'Paralelo' },
    {
      label: 'Corto Cruzado de Derecha',
      side: 'Derecha',
      technique: 'Corto',
      placement: 'Cruzado',
    },
    { label: 'Corto Cruzado de Reves', side: 'Reves', technique: 'Corto', placement: 'Cruzado' },
    {
      label: 'Corto Paralelo de Derecha',
      side: 'Derecha',
      technique: 'Corto',
      placement: 'Paralelo',
    },
    { label: 'Corto Paralelo de Reves', side: 'Reves', technique: 'Corto', placement: 'Paralelo' },
  ],
  Defensa: [
    {
      label: 'Bloqueo Derecha Cruzado',
      side: 'Derecha',
      technique: 'Bloqueo',
      placement: 'Cruzado',
    },
    {
      label: 'Bloqueo Derecha Paralelo',
      side: 'Derecha',
      technique: 'Bloqueo',
      placement: 'Paralelo',
    },
    { label: 'Bloqueo Reves Cruzado', side: 'Reves', technique: 'Bloqueo', placement: 'Cruzado' },
    { label: 'Bloqueo Reves Paralelo', side: 'Reves', technique: 'Bloqueo', placement: 'Paralelo' },
    { label: 'Corte Derecha Cruzado', side: 'Derecha', technique: 'Corte', placement: 'Cruzado' },
    { label: 'Corte Derecha Paralelo', side: 'Derecha', technique: 'Corte', placement: 'Paralelo' },
    { label: 'Corte Reves Cruzado', side: 'Reves', technique: 'Corte', placement: 'Cruzado' },
    { label: 'Corte Reves Paralelo', side: 'Reves', technique: 'Corte', placement: 'Paralelo' },
  ],
  'Error del Rival': [
    { label: 'Fallo Saque', phase: 'Servicio', technique: 'Error' },
    { label: 'Resto Fuera/Red', phase: 'Resto', technique: 'Error' },
    { label: 'Ataque Fuera/Red', phase: 'Ataque', technique: 'Error' },
  ],
};

// --- CATÁLOGO DE PUNTOS PERDIDOS (BOTÓN ROJO) ---
const ACTIONS_LOST: Record<string, any[]> = {
  Servicio: [
    { label: 'Saque a la Red', technique: 'Error', placement: 'Red' },
    { label: 'Saque Fuera', technique: 'Error', placement: 'Fuera' },
    { label: 'Saque Alto (Castigado)', technique: 'Error', placement: 'Alto' },
  ],
  Resto: [
    { label: 'Resto a la Red', technique: 'Error', placement: 'Red' },
    { label: 'Resto Fuera (Largo)', technique: 'Error', placement: 'Fuera' },
    { label: 'Resto Alto (Castigado)', technique: 'Error', placement: 'Alto' },
    { label: 'Corte a la Red', technique: 'Corte', placement: 'Red' },
  ],
  '3ra Bola': [
    { label: 'Top Derecha a la Red', side: 'Derecha', technique: 'Ataque', placement: 'Red' },
    { label: 'Top Derecha Fuera', side: 'Derecha', technique: 'Ataque', placement: 'Fuera' },
    { label: 'Top Revés a la Red', side: 'Reves', technique: 'Ataque', placement: 'Red' },
    { label: 'Top Revés Fuera', side: 'Reves', technique: 'Ataque', placement: 'Fuera' },
  ],
  Rally: [
    { label: 'Ataque a la Red', technique: 'Ataque', placement: 'Red' },
    { label: 'Ataque Fuera', technique: 'Ataque', placement: 'Fuera' },
    { label: 'Pifia / Canto Mesa', placement: 'Canto Mesa' },
  ],
  Defensa: [
    { label: 'Bloqueo Sale Largo', technique: 'Bloqueo', placement: 'Fuera' },
    { label: 'Bloqueo a la Red', technique: 'Bloqueo', placement: 'Red' },
    { label: 'Globo Fuera', technique: 'Globo', placement: 'Fuera' },
  ],
  'Juego de Pies': [
    { label: 'Mal Posicionamiento', technique: 'Juego Pies', placement: 'Posicionamiento' },
    { label: 'Mal Movimiento / Lento', technique: 'Juego Pies', placement: 'Movimiento' },
  ],
  'Winner Rival': [
    { label: 'Saque Directo (Ace)', phase: 'Servicio', technique: 'Ace' },
    { label: 'Resto Ganador', phase: 'Resto', technique: 'Winner' },
    { label: 'Ataque Imparable', phase: 'Ataque', technique: 'Winner' },
  ],
};

export const ManualMatchTracker = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState<any>(null);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [setNumber, setSetNumber] = useState(1);
  const [pointHistory, setPointHistory] = useState<any[]>([]);

  // Estado del flujo de 2 Toques
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [isWonState, setIsWonState] = useState<boolean | null>(null); // Verde o Rojo

  // Modal de edición del rival
  const [editRivalModal, setEditRivalModal] = useState(false);
  const [editOppName, setEditOppName] = useState('');
  const [editOppHand, setEditOppHand] = useState<string | null>(null);
  const [editOppStyle, setEditOppStyle] = useState<string | null>(null);

  useEffect(() => {
    api.get(ENDPOINTS.MANUAL_MATCHES.BY_ID(id!)).then((res) => {
      const data = res.data.data;
      setMatch(data);
      setEditOppName(data.opponentName);
      setEditOppHand(data.opponentHand);
      setEditOppStyle(data.opponentStyle);
      setSetNumber(1);
      // Calcular marcador base según historial
      let myPts = 0;
      let oppPts = 0;
      data.points?.forEach((p: any) => {
        if (p.isWon) myPts++;
        else oppPts++;
      });
      setMyScore(myPts);
      setOppScore(oppPts);
      setPointHistory(data.points || []);
    });
  }, [id]);

  const handleUpdateRival = async () => {
    try {
      await api.put(ENDPOINTS.MANUAL_MATCHES.UPDATE(id!), {
        opponentName: editOppName,
        opponentHand: editOppHand,
        opponentStyle: editOppStyle,
      });
      setMatch({
        ...match,
        opponentName: editOppName,
        opponentHand: editOppHand,
        opponentStyle: editOppStyle,
      });
      setEditRivalModal(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRegisterPoint = async (actionDef: any) => {
    if (isWonState === null || activePhase === null) return;

    const payload = {
      setNumber,
      pointOrder: pointHistory.length + 1,
      isWon: isWonState,
      // Si la acción tiene una fase sobrescrita (ej: Winner Rival -> Saque Directo), la usamos.
      // Si no, usamos la categoría que el usuario seleccionó.
      phase: actionDef.phase || activePhase,
      side: actionDef.side,
      technique: actionDef.technique,
      placement: actionDef.placement,
    };

    try {
      const res = await api.post(ENDPOINTS.MANUAL_MATCHES.ADD_POINT(id!), payload);
      setPointHistory([...pointHistory, res.data.data]);

      // Actualizamos Marcador Visual Inmediatamente
      if (isWonState) setMyScore((s) => s + 1);
      else setOppScore((s) => s + 1);

      // Limpiamos pantalla para el siguiente punto
      setActivePhase(null);
      setIsWonState(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUndoPoint = async () => {
    if (pointHistory.length === 0) return;
    const lastPoint = pointHistory[pointHistory.length - 1];

    try {
      await api.delete(ENDPOINTS.MANUAL_MATCHES.DELETE_POINT(id!, lastPoint.id));

      // Actualizamos estado local
      const newHistory = pointHistory.slice(0, -1);
      setPointHistory(newHistory);

      if (lastPoint.isWon) setMyScore((s) => Math.max(0, s - 1));
      else setOppScore((s) => Math.max(0, s - 1));

      // Resetear la pantalla de botones por si estaba a medias
      setActivePhase(null);
      setIsWonState(null);
    } catch (error) {
      console.error(error);
    }
  };

  if (!match)
    return (
      <Center h="100vh">
        <Loader color="blue" />
      </Center>
    );

  // Seleccionamos el catálogo y las fases activas dependiendo de si ganó o perdió
  const activeCatalog = isWonState ? ACTIONS_WON : ACTIONS_LOST;
  const activePhaseList = Object.keys(activeCatalog);

  return (
    <Stack gap="md" style={{ maxWidth: 800, margin: '0 auto', touchAction: 'manipulation' }}>
      {/* CABECERA Y MARCADOR GIGANTE */}
      <Paper withBorder p="md" radius="md" bg="dark.7">
        <Group justify="space-between" mb="xs">
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate(APP_ROUTES.ANALISIS.LIST)}
          >
            Salir
          </Button>
          <Text fw={700} c="white">
            Set {setNumber}
          </Text>
          <ActionIcon color="red" variant="light" size="lg" onClick={handleUndoPoint}>
            <IconArrowBackUp size={20} />
          </ActionIcon>
        </Group>

        <Group justify="center" gap={40}>
          <Stack align="center" gap={0}>
            <Text c="dimmed" size="sm" fw={600}>
              TÚ
            </Text>
            <Text fz={70} fw={900} c="green.4" style={{ lineHeight: 1 }}>
              {myScore}
            </Text>
          </Stack>
          <Text fz={40} fw={900} c="dimmed">
            -
          </Text>
          <Stack align="center" gap={0}>
            <Group gap={4} style={{ cursor: 'pointer' }} onClick={() => setEditRivalModal(true)}>
              <Text c="dimmed" size="sm" fw={600}>
                {match.opponentName.substring(0, 8).toUpperCase()}
              </Text>
              <IconEdit size={14} color="var(--mantine-color-dimmed)" />
            </Group>
            <Text fz={70} fw={900} c="red.4" style={{ lineHeight: 1 }}>
              {oppScore}
            </Text>
          </Stack>
        </Group>
      </Paper>

      {/* FLUJO DE 2 TOQUES (UX) */}
      {isWonState === null ? (
        // PANTALLA 1: ¿Gané o Perdí?
        <SimpleGrid cols={2} mt="xl">
          <Button h={140} color="green" radius="md" fz={24} onClick={() => setIsWonState(true)}>
            PUNTO MÍO
          </Button>
          <Button h={140} color="red" radius="md" fz={24} onClick={() => setIsWonState(false)}>
            PUNTO RIVAL
          </Button>
        </SimpleGrid>
      ) : activePhase === null ? (
        // PANTALLA 2: Seleccionar FASE
        <Stack mt="sm">
          <Title order={3} ta="center" c={isWonState ? 'green' : 'red'}>
            ¿En qué fase ocurrió?
          </Title>
          <SimpleGrid cols={{ base: 2, sm: 3 }}>
            {activePhaseList.map((phase) => (
              <Button
                key={phase}
                h={80}
                variant="light"
                color={isWonState ? 'green' : 'red'}
                onClick={() => setActivePhase(phase)}
              >
                {phase}
              </Button>
            ))}
          </SimpleGrid>
          <Button variant="subtle" color="gray" mt="md" onClick={() => setIsWonState(null)}>
            Atrás (Me he equivocado)
          </Button>
        </Stack>
      ) : (
        // PANTALLA 3: Acción Específica
        <Stack mt="sm">
          <Title order={3} ta="center">
            {activePhase}
          </Title>

          {/* Lógica de Agrupación Visual */}
          {(() => {
            const currentActions = activeCatalog[activePhase] || [];

            // 1. Extraemos todas las "técnicas" únicas (Ej: Ataque, Push, Flip)
            const techniques = Array.from(
              new Set(currentActions.map((a) => a.technique).filter(Boolean)),
            );

            // Si no hay técnicas claras (ej: "Error del Rival"), usamos el Grid normal
            if (techniques.length <= 1) {
              return (
                <SimpleGrid cols={{ base: 2, sm: 3 }}>
                  {currentActions.map((action, i) => (
                    <Button
                      key={i}
                      color={isWonState ? 'green' : 'red'}
                      variant="outline"
                      styles={{
                        root: { height: 'auto', minHeight: 80, padding: '8px' },
                        label: {
                          whiteSpace: 'normal', // 👈 La magia para que salte de línea
                          textAlign: 'center', // 👈 Lo centramos para que quede bonito
                          lineHeight: 1.2, // 👈 Juntamos un pelín las líneas
                        },
                      }}
                      onClick={() => handleRegisterPoint(action)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </SimpleGrid>
              );
            }

            // 2. Si hay múltiples técnicas, creamos una cuadrícula donde cada COLUMNA es una Técnica
            return (
              <SimpleGrid
                cols={{ base: 2, sm: techniques.length > 2 ? techniques.length : 2 }}
                spacing="md"
              >
                {techniques.map((tech) => {
                  const actionsForTech = currentActions.filter((a) => a.technique === tech);
                  return (
                    <Stack key={tech} gap="xs">
                      {/* Título de la Columna (Ej: "Ataque", "Push") */}
                      <Text ta="center" fw={700} size="sm" c="dimmed" tt="uppercase">
                        {tech}
                      </Text>

                      {actionsForTech.map((action, i) => (
                        <Button
                          key={i}
                          color={isWonState ? 'green' : 'red'}
                          variant="outline"
                          styles={{
                            root: { height: 'auto', minHeight: 80, padding: '8px' },
                            label: {
                              whiteSpace: 'normal', // 👈 La magia para que salte de línea
                              textAlign: 'center', // 👈 Lo centramos para que quede bonito
                              lineHeight: 1.2, // 👈 Juntamos un pelín las líneas
                            },
                          }}
                          onClick={() => handleRegisterPoint(action)}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </Stack>
                  );
                })}
              </SimpleGrid>
            );
          })()}

          <Button variant="subtle" color="gray" mt="md" onClick={() => setActivePhase(null)}>
            Atrás (Elegir otra fase)
          </Button>
        </Stack>
      )}

      {/* MODAL DE EDICIÓN DEL RIVAL */}
      <Modal
        opened={editRivalModal}
        onClose={() => setEditRivalModal(false)}
        title={<Text fw={700}>Detalles del Rival</Text>}
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Nombre del Rival"
            value={editOppName}
            onChange={(e) => setEditOppName(e.currentTarget.value)}
          />
          <SimpleGrid cols={2}>
            <Select
              label="Mano Dominante"
              data={['Diestro', 'Zurdo']}
              value={editOppHand}
              onChange={setEditOppHand}
              clearable
            />
            <Select
              label="Estilo de Juego"
              data={['Ofensivo', 'Defensivo']}
              value={editOppStyle}
              onChange={setEditOppStyle}
              clearable
            />
          </SimpleGrid>
          <Button color="blue" onClick={handleUpdateRival}>
            Guardar Cambios
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
};
