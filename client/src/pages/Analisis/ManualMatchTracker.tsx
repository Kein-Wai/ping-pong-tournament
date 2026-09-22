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
  TextInput,
  ScrollArea,
  Badge,
  Table,
  Textarea,
  NumberInput,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconArrowBackUp,
  IconEdit,
  IconTrophy,
  IconDeviceFloppy,
} from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { isValidTableTennisSet } from '../../utils/matchValidation';

// --- NUEVA TAXONOMÍA EN ÁRBOL (Categoría -> Subcategoría -> Ubicación) ---
const PLACEMENTS = [
  { label: 'Derecha', placement: 'Derecha' },
  { label: 'Revés', placement: 'Reves' },
  { label: 'Centro/Codo', placement: 'Centro' },
];

const RESTO_PLACEMENTS = [
  { label: 'A Mi Derecha', placement: 'Derecha' },
  { label: 'A Mi Revés', placement: 'Reves' },
];

const WON_TREE = [
  {
    label: 'Servicio',
    category: 'Servicio',
    next: [
      { label: 'Cortado', subcategory: 'Cortado', next: PLACEMENTS },
      { label: 'Topeado', subcategory: 'Topeado', next: PLACEMENTS },
      { label: 'Sin Efecto', subcategory: 'SinEfecto', next: PLACEMENTS },
    ],
  },
  {
    label: 'Ataque',
    category: 'Ataque',
    next: [
      { label: 'Con Derecha', subcategory: 'Derecha', next: PLACEMENTS },
      { label: 'Con Revés', subcategory: 'Reves', next: PLACEMENTS },
    ],
  },
  {
    label: 'Defensa',
    category: 'Defensa',
    next: [
      { label: 'Corte', subcategory: 'Cortado', next: PLACEMENTS },
      { label: 'Bloqueo', subcategory: 'SinEfecto', next: PLACEMENTS },
    ],
  },
  { label: 'Error No Forzado (del Rival)', category: 'ErrorNoForzado' },
  { label: 'Punto Sin Razón', category: 'SinRazon' },
];

const LOST_TREE = [
  { label: 'Fallo Saque', category: 'FalloSaque' },
  {
    label: 'Fallo Resto',
    category: 'Resto',
    next: [
      { label: 'Saque Cortado', subcategory: 'Cortado', next: RESTO_PLACEMENTS },
      { label: 'Saque Topeado', subcategory: 'Topeado', next: RESTO_PLACEMENTS },
      { label: 'Saque Sin Efecto', subcategory: 'SinEfecto', next: RESTO_PLACEMENTS },
    ],
  },
  { label: 'Error No Forzado', category: 'ErrorNoForzado' },
  { label: 'Error Forzado (Buen tiro rival)', category: 'ErrorForzado' },
  { label: 'Mala Movilidad', category: 'Movilidad' },
  { label: 'Punto Sin Razón', category: 'SinRazon' },
];

export const ManualMatchTracker = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState<any>(null);
  const [pointHistory, setPointHistory] = useState<any[]>([]);

  // Scoring State
  const [currentSet, setCurrentSet] = useState(1);
  const [mySetsWon, setMySetsWon] = useState<number | string>(0);
  const [oppSetsWon, setOppSetsWon] = useState<number | string>(0);

  // Tree Flow State
  const [isWonState, setIsWonState] = useState<boolean | null>(null);
  const [currentNodes, setCurrentNodes] = useState<any[] | null>(null);
  const [pointPath, setPointPath] = useState<any>({});
  const [lightNotes, setLightNotes] = useState('');

  const [editRivalModal, setEditRivalModal] = useState(false);
  const [editOppName, setEditOppName] = useState('');

  // Modales
  const [showEndSetModal, setShowEndSetModal] = useState(false);
  const [showEndMatchModal, setShowEndMatchModal] = useState(false);
  const [viewingSetSummary, setViewingSetSummary] = useState<number | null>(null);

  useEffect(() => {
    api.get(ENDPOINTS.MANUAL_MATCHES.BY_ID(id!)).then((res) => {
      const data = res.data.data;
      setMatch(data);
      setEditOppName(data.opponentName);
      setLightNotes(data.lightNotes || '');
      setMySetsWon(data.mySets || 0);
      setOppSetsWon(data.opponentSets || 0);

      const pts = data.points || [];
      setPointHistory(pts);

      let activeSet = 1;
      if (pts.length > 0) {
        const lastPt = pts[pts.length - 1];
        const lastSetPts = pts.filter((p: any) => p.setNumber === lastPt.setNumber);
        const myS = lastSetPts.filter((p: any) => p.isWon).length;
        const oppS = lastSetPts.filter((p: any) => !p.isWon).length;

        if (isValidTableTennisSet(myS, oppS)) {
          activeSet = lastPt.setNumber + 1;
        } else {
          activeSet = lastPt.setNumber;
        }
      }
      setCurrentSet(activeSet);
    });
  }, [id]);

  const currentSetPoints = pointHistory.filter((p) => p.setNumber === currentSet);
  const myScore = currentSetPoints.filter((p) => p.isWon).length;
  const oppScore = currentSetPoints.filter((p) => !p.isWon).length;

  useEffect(() => {
    if (isValidTableTennisSet(myScore, oppScore) && match?.status !== 'Completado') {
      setShowEndSetModal(true);
    }
  }, [myScore, oppScore, match]);

  // 👇 CÁLCULOS DINÁMICOS DE RESUMEN
  const getPointLabel = (p: any) => {
    if (!p.category) return 'Rápido / Sin detalle';
    let label = p.category;
    if (p.subcategory) label += ` > ${p.subcategory}`;
    if (p.placement) label += ` (${p.placement})`;
    return label;
  };

  const getSetSummary = (setNum: number) => {
    const pts = pointHistory.filter((p) => p.setNumber === setNum);
    const wonCategories = pts
      .filter((p) => p.isWon)
      .reduce((acc: any, p) => {
        const label = getPointLabel(p);
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {});
    const lostCategories = pts
      .filter((p) => !p.isWon)
      .reduce((acc: any, p) => {
        const label = getPointLabel(p);
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {});

    const sMyScore = pts.filter((p) => p.isWon).length;
    const sOppScore = pts.filter((p) => !p.isWon).length;

    return { wonCategories, lostCategories, myScore: sMyScore, oppScore: sOppScore };
  };

  const getSortedCategories = (catObj: any) =>
    Object.entries(catObj).sort((a: any, b: any) => b[1] - a[1]);

  const activeSummary = getSetSummary(currentSet);
  const viewSummary = viewingSetSummary ? getSetSummary(viewingSetSummary) : null;

  const handleUpdateRival = async () => {
    try {
      await api.put(ENDPOINTS.MANUAL_MATCHES.UPDATE(id!), { opponentName: editOppName });
      setMatch({ ...match, opponentName: editOppName });
      setEditRivalModal(false);
    } catch (error) {
      console.error(error);
    }
  };

  const resetFlow = () => {
    setIsWonState(null);
    setCurrentNodes(null);
    setPointPath({});
  };

  const handleStartPoint = (isWon: boolean) => {
    setIsWonState(isWon);
    setCurrentNodes(isWon ? WON_TREE : LOST_TREE);
    setPointPath({});
  };

  const handleNodeClick = (node: any) => {
    const newPath = { ...pointPath };
    if (node.category) newPath.category = node.category;
    if (node.subcategory) newPath.subcategory = node.subcategory;
    if (node.placement) newPath.placement = node.placement;

    if (node.next) {
      setPointPath(newPath);
      setCurrentNodes(node.next);
    } else {
      handleRegisterPoint({ ...newPath, isWon: isWonState });
      resetFlow();
    }
  };

  const handleRegisterPoint = async (data: any) => {
    const payload = {
      setNumber: currentSet,
      pointOrder: currentSetPoints.length + 1,
      isWon: data.isWon,
      category: data.category || null,
      subcategory: data.subcategory || null,
      placement: data.placement || null,
    };

    try {
      const res = await api.post(ENDPOINTS.MANUAL_MATCHES.ADD_POINT(id!), payload);
      setPointHistory([...pointHistory, res.data.data]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUndoPoint = async () => {
    if (pointHistory.length === 0) return;
    const lastPoint = pointHistory[pointHistory.length - 1];

    try {
      await api.delete(ENDPOINTS.MANUAL_MATCHES.DELETE_POINT(id!, lastPoint.id));
      setPointHistory(pointHistory.slice(0, -1));
      resetFlow();
    } catch (error) {
      console.error(error);
    }
  };

  const handleConfirmSetEnd = async () => {
    const iWonSet = myScore > oppScore;
    const newMySets = iWonSet ? Number(mySetsWon) + 1 : Number(mySetsWon);
    const newOppSets = !iWonSet ? Number(oppSetsWon) + 1 : Number(oppSetsWon);

    setMySetsWon(newMySets);
    setOppSetsWon(newOppSets);
    setShowEndSetModal(false);

    const requiredSets = match.setsToWin || 3;

    if (newMySets === requiredSets || newOppSets === requiredSets) {
      setShowEndMatchModal(true);
    } else {
      setCurrentSet(currentSet + 1);
    }
  };

  const executeCompleteMatch = async () => {
    try {
      await api.put(ENDPOINTS.MANUAL_MATCHES.COMPLETE(id!), {
        mySets: Number(mySetsWon),
        opponentSets: Number(oppSetsWon),
        lightNotes,
        status: 'Completado',
      });
      setMatch({
        ...match,
        status: 'Completado',
        mySets: Number(mySetsWon),
        opponentSets: Number(oppSetsWon),
        lightNotes,
      });
      setShowEndMatchModal(false);
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

  // --- 1. REPORTE FINAL (Ambos modos) ---
  if (match.status === 'Completado') {
    return (
      <Stack gap="xl" style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Group justify="space-between">
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate(APP_ROUTES.ANALISIS.LIST)}
          >
            Volver a Análisis
          </Button>
          <Title order={3}>Reporte del Partido</Title>
        </Group>

        <Paper withBorder p="xl" radius="md" bg="dark.7">
          <Group justify="center" gap={60}>
            <Stack align="center" gap={0}>
              <Text c="dimmed" size="lg" fw={600}>
                TÚ
              </Text>
              <Text
                fz={80}
                fw={900}
                c={Number(mySetsWon) > Number(oppSetsWon) ? 'green.4' : 'gray.5'}
                style={{ lineHeight: 1 }}
              >
                {mySetsWon}
              </Text>
            </Stack>
            <Text fz={50} fw={900} c="dimmed">
              SETS
            </Text>
            <Stack align="center" gap={0}>
              <Text c="dimmed" size="lg" fw={600}>
                {match.opponentName.toUpperCase()}
              </Text>
              <Text
                fz={80}
                fw={900}
                c={Number(oppSetsWon) > Number(mySetsWon) ? 'red.4' : 'gray.5'}
                style={{ lineHeight: 1 }}
              >
                {oppSetsWon}
              </Text>
            </Stack>
          </Group>
        </Paper>

        {match.lightNotes && (
          <Paper withBorder p="md" radius="md" bg="blue.0" c="blue.9">
            <Text fw={700} mb="xs">
              Sensaciones y Notas:
            </Text>
            <Text style={{ whiteSpace: 'pre-wrap' }}>{match.lightNotes}</Text>
          </Paper>
        )}

        {/* Solo mostramos la tabla si es DEEP y hay puntos */}
        {match.analysisType === 'Deep' && pointHistory.length > 0 && (
          <>
            <Title order={4} mt="md">
              Desglose Punto a Punto
            </Title>
            <Paper withBorder radius="md">
              <ScrollArea h={500}>
                <Table striped highlightOnHover stickyHeader>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Set</Table.Th>
                      <Table.Th>Nº</Table.Th>
                      <Table.Th>Resultado</Table.Th>
                      <Table.Th>Categoría</Table.Th>
                      <Table.Th>Detalle</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {pointHistory.map((p, idx) => (
                      <Table.Tr key={idx}>
                        <Table.Td fw={700}>Set {p.setNumber}</Table.Td>
                        <Table.Td>{p.pointOrder}</Table.Td>
                        <Table.Td>
                          <Badge color={p.isWon ? 'green' : 'red'} variant="light">
                            {p.isWon ? 'Mío' : 'Rival'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {p.category ? (
                            <Badge color="gray" variant="dot">
                              {p.category}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </Table.Td>
                        <Table.Td fw={500}>
                          {p.subcategory || ''} {p.placement ? `(${p.placement})` : ''}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          </>
        )}
      </Stack>
    );
  }

  // --- 2. FLUJO LIGHT (Formulario Rápido) ---
  if (match.analysisType === 'Light') {
    const isReadyToComplete =
      Number(mySetsWon) === match.setsToWin || Number(oppSetsWon) === match.setsToWin;

    return (
      <Stack gap="xl" style={{ maxWidth: 600, margin: '0 auto' }}>
        <Group>
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate(APP_ROUTES.ANALISIS.LIST)}
          >
            Volver a Análisis
          </Button>
        </Group>

        <Paper withBorder p="xl" radius="md">
          <Group justify="space-between" mb="lg">
            <Title order={3}>Resultado (Modo Rápido)</Title>
            <Badge color="blue" variant="light">
              Al mejor de {match.setsToWin} Sets
            </Badge>
          </Group>

          <SimpleGrid cols={2} mb="lg">
            <NumberInput
              label="Tus Sets Ganados"
              min={0}
              max={match.setsToWin}
              value={mySetsWon}
              onChange={setMySetsWon}
              size="md"
            />
            <NumberInput
              label={`Sets de ${match.opponentName}`}
              min={0}
              max={match.setsToWin}
              value={oppSetsWon}
              onChange={setOppSetsWon}
              size="md"
            />
          </SimpleGrid>

          <Textarea
            label="Sensaciones, Conclusiones y Táctica"
            placeholder="¿Qué ha funcionado? ¿Dónde te ha hecho daño? Escribe aquí tus notas para repasarlas en el futuro..."
            minRows={5}
            value={lightNotes}
            onChange={(e) => setLightNotes(e.currentTarget.value)}
            mb="xl"
          />

          <Button
            fullWidth
            color="green"
            size="md"
            leftSection={<IconDeviceFloppy size={20} />}
            onClick={executeCompleteMatch}
            disabled={!isReadyToComplete}
          >
            Guardar y Finalizar Partido
          </Button>
          {!isReadyToComplete && (
            <Text c="red" size="xs" ta="center" mt="sm">
              Uno de los dos jugadores debe ganar {match.setsToWin} sets para finalizar el partido.
            </Text>
          )}
        </Paper>
      </Stack>
    );
  }

  // --- 3. FLUJO DEEP (Árbitro Punto a Punto) ---
  return (
    <Stack gap="md" style={{ maxWidth: 800, margin: '0 auto', touchAction: 'manipulation' }}>
      <Group>
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(APP_ROUTES.ANALISIS.LIST)}
        >
          Salir del Árbitro
        </Button>
      </Group>

      {/* MARCADOR Y BOTONES PRIMERO */}
      <Paper withBorder p="md" radius="md" bg="dark.7">
        <Group justify="space-between" mb="xs">
          <ScrollArea w={{ base: 200, sm: 300 }} type="never">
            <Group gap="xs" wrap="nowrap" pb={4}>
              {Array.from({ length: currentSet }, (_, i) => i + 1).map((setNum) => {
                const isCurrent = setNum === currentSet;
                return (
                  <Button
                    key={setNum}
                    size="xs"
                    variant={isCurrent ? 'filled' : 'light'}
                    color="blue"
                    onClick={() => !isCurrent && setViewingSetSummary(setNum)}
                    style={{ flexShrink: 0 }}
                  >
                    Set {setNum}
                  </Button>
                );
              })}
            </Group>
          </ScrollArea>
          <Group gap="xs">
            <Badge color="gray" variant="outline">
              {mySetsWon} Sets a {oppSetsWon}
            </Badge>
            <ActionIcon color="red" variant="light" size="lg" onClick={handleUndoPoint}>
              <IconArrowBackUp size={20} />
            </ActionIcon>
          </Group>
        </Group>

        <Group justify="center" gap={50} my="sm">
          <Stack align="center" gap={0}>
            <Text c="dimmed" size="md" fw={600}>
              TÚ
            </Text>
            <Text fz={80} fw={900} c="green.4" style={{ lineHeight: 1 }}>
              {myScore}
            </Text>
          </Stack>
          <Text fz={50} fw={900} c="dimmed">
            -
          </Text>
          <Stack align="center" gap={0}>
            <Group gap={4} style={{ cursor: 'pointer' }} onClick={() => setEditRivalModal(true)}>
              <Text c="dimmed" size="md" fw={600}>
                {match.opponentName.substring(0, 10).toUpperCase()}
              </Text>
              <IconEdit size={16} color="var(--mantine-color-dimmed)" />
            </Group>
            <Text fz={80} fw={900} c="red.4" style={{ lineHeight: 1 }}>
              {oppScore}
            </Text>
          </Stack>
        </Group>
      </Paper>

      {/* FLUJO DE BOTONES DE DECISIÓN (TREE) */}
      <Paper withBorder p="md" radius="md">
        {isWonState === null ? (
          <SimpleGrid cols={2}>
            <Button
              h={140}
              color="green"
              radius="md"
              fz={24}
              onClick={() => handleStartPoint(true)}
            >
              PUNTO MÍO
            </Button>
            <Button h={140} color="red" radius="md" fz={24} onClick={() => handleStartPoint(false)}>
              PUNTO RIVAL
            </Button>
          </SimpleGrid>
        ) : (
          <Stack>
            <Title order={3} ta="center" c={isWonState ? 'green' : 'red'}>
              Selecciona Categoría
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              {currentNodes?.map((node, i) => (
                <Button
                  key={i}
                  h={70}
                  variant="outline"
                  color={isWonState ? 'green' : 'red'}
                  onClick={() => handleNodeClick(node)}
                >
                  {node.label}
                </Button>
              ))}
            </SimpleGrid>
            <Button variant="subtle" color="gray" mt="sm" onClick={resetFlow}>
              Cancelar (Volver a Punto Mío/Rival)
            </Button>
          </Stack>
        )}
      </Paper>

      {/* HISTORIAL COMPACTO DEBAJO */}
      <Paper withBorder p="sm" radius="md">
        <Text fw={700} mb="sm">
          Historial del Set {currentSet}
        </Text>
        <ScrollArea h={250} offsetScrollbars>
          <Stack gap="xs">
            {currentSetPoints
              .slice()
              .reverse()
              .map((p, idx) => (
                <Group
                  key={idx}
                  justify="space-between"
                  p="xs"
                  bg={p.isWon ? 'green.9' : 'red.9'}
                  c="white"
                  style={{ borderRadius: 8 }}
                >
                  <Group gap="sm">
                    <Text size="sm" fw={700}>
                      #{p.pointOrder}
                    </Text>
                    <Badge size="xs" color="gray" variant="white">
                      {p.category || 'Light'}
                    </Badge>
                  </Group>
                  <Text size="sm">
                    {p.subcategory || ''} {p.placement ? `(${p.placement})` : ''}
                  </Text>
                </Group>
              ))}
            {currentSetPoints.length === 0 && (
              <Text c="dimmed" size="sm" ta="center">
                El set acaba de empezar.
              </Text>
            )}
          </Stack>
        </ScrollArea>
      </Paper>

      {/* MODALES */}
      <Modal
        opened={editRivalModal}
        onClose={() => setEditRivalModal(false)}
        title="Editar Rival"
        centered
      >
        <TextInput
          label="Nombre"
          value={editOppName}
          onChange={(e) => setEditOppName(e.currentTarget.value)}
        />
        <Button mt="md" fullWidth color="blue" onClick={handleUpdateRival}>
          Guardar
        </Button>
      </Modal>

      <Modal
        opened={showEndSetModal}
        onClose={() => {}}
        withCloseButton={false}
        centered
        closeOnClickOutside={false}
        size="lg"
      >
        <Stack align="center">
          <IconTrophy size={50} color="var(--mantine-color-yellow-5)" />
          <Title order={3}>¡Set Finalizado!</Title>
          <Text size="lg" fw={700}>
            {myScore > oppScore ? 'Has ganado' : 'Rival gana'} ({myScore} - {oppScore})
          </Text>

          <SimpleGrid cols={2} w="100%" mt="md">
            <Paper p="sm" bg="green.0" c="green.9" radius="md">
              <Text fw={700} mb="xs" ta="center">
                Tus Fortalezas (Ganados)
              </Text>
              <ScrollArea h={160} offsetScrollbars>
                <Stack gap={6}>
                  {getSortedCategories(activeSummary.wonCategories).length === 0 ? (
                    <Text size="xs" ta="center" c="dimmed">
                      Ninguno
                    </Text>
                  ) : (
                    getSortedCategories(activeSummary.wonCategories).map(([label, count]: any) => (
                      <Group key={label} justify="space-between" wrap="nowrap" align="flex-start">
                        <Text size="xs" fw={600} lh={1.2} style={{ flex: 1 }}>
                          {label}
                        </Text>
                        <Text size="sm" fw={900}>
                          {count}
                        </Text>
                      </Group>
                    ))
                  )}
                </Stack>
              </ScrollArea>
            </Paper>
            <Paper p="sm" bg="red.0" c="red.9" radius="md">
              <Text fw={700} mb="xs" ta="center">
                A Mejorar (Perdidos)
              </Text>
              <ScrollArea h={160} offsetScrollbars>
                <Stack gap={6}>
                  {getSortedCategories(activeSummary.lostCategories).length === 0 ? (
                    <Text size="xs" ta="center" c="dimmed">
                      Ninguno
                    </Text>
                  ) : (
                    getSortedCategories(activeSummary.lostCategories).map(([label, count]: any) => (
                      <Group key={label} justify="space-between" wrap="nowrap" align="flex-start">
                        <Text size="xs" fw={600} lh={1.2} style={{ flex: 1 }}>
                          {label}
                        </Text>
                        <Text size="sm" fw={900}>
                          {count}
                        </Text>
                      </Group>
                    ))
                  )}
                </Stack>
              </ScrollArea>
            </Paper>
          </SimpleGrid>

          <Group grow w="100%" mt="md">
            <Button
              variant="subtle"
              color="red"
              onClick={() => {
                setShowEndSetModal(false);
                handleUndoPoint();
              }}
            >
              Deshacer Último Punto
            </Button>
            <Button color="blue" onClick={handleConfirmSetEnd}>
              Avanzar al Siguiente Set
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={viewingSetSummary !== null}
        onClose={() => setViewingSetSummary(null)}
        title={
          <Text fw={700} size="lg">
            Resumen del Set {viewingSetSummary}
          </Text>
        }
        centered
        size="lg"
      >
        {viewSummary && (
          <Stack align="center">
            <Text size="lg" fw={700}>
              Resultado: {viewSummary.myScore > viewSummary.oppScore ? 'Ganaste' : 'Rival ganó'} (
              {viewSummary.myScore} - {viewSummary.oppScore})
            </Text>
            <SimpleGrid cols={2} w="100%" mt="sm">
              <Paper p="sm" bg="green.0" c="green.9" radius="md">
                <Text fw={700} mb="xs" ta="center">
                  Tus Fortalezas
                </Text>
                <ScrollArea h={160} offsetScrollbars>
                  <Stack gap={6}>
                    {getSortedCategories(viewSummary.wonCategories).length === 0 ? (
                      <Text size="xs" ta="center" c="dimmed">
                        Ninguno
                      </Text>
                    ) : (
                      getSortedCategories(viewSummary.wonCategories).map(([label, count]: any) => (
                        <Group key={label} justify="space-between" wrap="nowrap" align="flex-start">
                          <Text size="xs" fw={600} lh={1.2} style={{ flex: 1 }}>
                            {label}
                          </Text>
                          <Text size="sm" fw={900}>
                            {count}
                          </Text>
                        </Group>
                      ))
                    )}
                  </Stack>
                </ScrollArea>
              </Paper>
              <Paper p="sm" bg="red.0" c="red.9" radius="md">
                <Text fw={700} mb="xs" ta="center">
                  A Mejorar
                </Text>
                <ScrollArea h={160} offsetScrollbars>
                  <Stack gap={6}>
                    {getSortedCategories(viewSummary.lostCategories).length === 0 ? (
                      <Text size="xs" ta="center" c="dimmed">
                        Ninguno
                      </Text>
                    ) : (
                      getSortedCategories(viewSummary.lostCategories).map(([label, count]: any) => (
                        <Group key={label} justify="space-between" wrap="nowrap" align="flex-start">
                          <Text size="xs" fw={600} lh={1.2} style={{ flex: 1 }}>
                            {label}
                          </Text>
                          <Text size="sm" fw={900}>
                            {count}
                          </Text>
                        </Group>
                      ))
                    )}
                  </Stack>
                </ScrollArea>
              </Paper>
            </SimpleGrid>
            <Button fullWidth mt="md" onClick={() => setViewingSetSummary(null)}>
              Cerrar Resumen
            </Button>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={showEndMatchModal}
        onClose={() => navigate(APP_ROUTES.ANALISIS.LIST)}
        withCloseButton={false}
        centered
        closeOnClickOutside={false}
      >
        <Stack align="center">
          <IconTrophy size={60} color="var(--mantine-color-blue-5)" />
          <Title order={2}>¡Partido Finalizado!</Title>
          <Text size="xl" fw={700}>
            Resultado Final: {mySetsWon} - {oppSetsWon}
          </Text>

          <Textarea
            w="100%"
            label="Conclusiones rápidas"
            placeholder="Ej: He sacado mal, me costaba leer el efecto..."
            minRows={3}
            value={lightNotes}
            onChange={(e) => setLightNotes(e.currentTarget.value)}
          />

          <Button fullWidth color="blue" mt="md" onClick={executeCompleteMatch}>
            Guardar Conclusiones y Cerrar
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
};
