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
  Checkbox,
  Accordion,
  Select,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconArrowBackUp,
  IconEdit,
  IconTrophy,
  IconDeviceFloppy,
  IconClipboardList,
} from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { isValidTableTennisSet } from '../../utils/matchValidation';

const SKILLS_LIST = [
  'Derecha plano',
  'Revés plano',
  'TopSpin Derecha',
  'TopSpin Revés',
  'Corte',
  'Bloqueo de Derecha',
  'Bloqueo de Revés',
  'Servicio',
  'Recepción',
  'Movilidad',
];
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

  const [currentSet, setCurrentSet] = useState(1);
  const [mySetsWon, setMySetsWon] = useState<number | string>(0);
  const [oppSetsWon, setOppSetsWon] = useState<number | string>(0);

  const [isWonState, setIsWonState] = useState<boolean | null>(null);
  const [currentNodes, setCurrentNodes] = useState<any[] | null>(null);
  const [pointPath, setPointPath] = useState<any>({});

  const [planMyServe, setPlanMyServe] = useState('');
  const [planTheirServe, setPlanTheirServe] = useState('');
  const [planStrategy, setPlanStrategy] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  const [strChecked, setStrChecked] = useState<string[]>([]);
  const [strDetails, setStrDetails] = useState('');
  const [weakChecked, setWeakChecked] = useState<string[]>([]);
  const [weakDetails, setWeakDetails] = useState('');

  const [deepNotes, setDeepNotes] = useState('');

  // Estados de edición del rival
  const [editRivalModal, setEditRivalModal] = useState(false);
  const [editOppName, setEditOppName] = useState('');
  const [editOppHand, setEditOppHand] = useState<string | null>(null);
  const [editOppStyle, setEditOppStyle] = useState<string | null>(null);
  const [editOppLevel, setEditOppLevel] = useState<string | null>(null);
  const [editOppRubberForehand, setEditOppRubberForehand] = useState<string | null>(null);
  const [editOppRubberBackhand, setEditOppRubberBackhand] = useState<string | null>(null);

  // Selección de tipo de análisis para el botón de Start
  const [startAnalysisType, setStartAnalysisType] = useState<string>('Rapido');

  const [showEndSetModal, setShowEndSetModal] = useState(false);
  const [showEndMatchModal, setShowEndMatchModal] = useState(false);
  const [viewingSetSummary, setViewingSetSummary] = useState<number | null>(null);

  // Estados para el Modo Rápido (Tanteos)
  const [setScores, setSetScores] = useState<{ myScore: number | ''; oppScore: number | '' }[]>([]);

  const totalSetsPlayed = Number(mySetsWon) + Number(oppSetsWon);

  useEffect(() => {
    setSetScores((prev) => {
      if (prev.length === totalSetsPlayed) return prev;
      const newScores = [...prev];
      while (newScores.length < totalSetsPlayed) {
        newScores.push({ myScore: '', oppScore: '' });
      }
      if (newScores.length > totalSetsPlayed) {
        newScores.length = totalSetsPlayed;
      }
      return newScores;
    });
  }, [totalSetsPlayed]);

  const handleScoreChange = (
    index: number,
    field: 'myScore' | 'oppScore',
    value: number | string,
  ) => {
    const updated = [...setScores];
    updated[index] = { ...updated[index], [field]: value };
    setSetScores(updated);
  };

  useEffect(() => {
    api.get(ENDPOINTS.MANUAL_MATCHES.BY_ID(id!)).then((res) => {
      const data = res.data.data;
      setMatch(data);
      setEditOppName(data.opponentName);
      setEditOppHand(data.opponentHand || null);
      setEditOppStyle(data.opponentStyle || null);
      setEditOppLevel(data.opponentLevel || null);
      setStartAnalysisType(data.analysisType || 'Rapido');
      setEditOppRubberForehand(data.opponentRubberForehand || null);
      setEditOppRubberBackhand(data.opponentRubberBackhand || null);

      setMySetsWon(data.mySets || 0);
      setOppSetsWon(data.opponentSets || 0);

      if (data.planningNotes) {
        try {
          const parsed = JSON.parse(data.planningNotes);
          setPlanMyServe(parsed.myServe || '');
          setPlanTheirServe(parsed.theirServe || '');
          setPlanStrategy(parsed.strategy || '');
        } catch {
          setPlanStrategy(data.planningNotes);
        }
      }

      if (data.analysisType === 'Extenso' && data.lightNotes) {
        setDeepNotes(data.lightNotes);
      }

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
    return {
      wonCategories,
      lostCategories,
      myScore: pts.filter((p) => p.isWon).length,
      oppScore: pts.filter((p) => !p.isWon).length,
    };
  };

  const getSortedCategories = (catObj: any) =>
    Object.entries(catObj).sort((a: any, b: any) => b[1] - a[1]);
  const activeSummary = getSetSummary(currentSet);
  const viewSummary = viewingSetSummary ? getSetSummary(viewingSetSummary) : null;

  const handleUpdateRival = async () => {
    try {
      const payload = {
        opponentName: editOppName,
        opponentHand: editOppHand,
        opponentStyle: editOppStyle,
        opponentLevel: editOppLevel,
        opponentRubberForehand: editOppRubberForehand,
        opponentRubberBackhand: editOppRubberBackhand,
      };
      await api.put(ENDPOINTS.MANUAL_MATCHES.UPDATE(id!), payload);
      setMatch({ ...match, ...payload });
      setEditRivalModal(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSavePlan = async () => {
    setSavingPlan(true);
    const planJSON = JSON.stringify({
      myServe: planMyServe,
      theirServe: planTheirServe,
      strategy: planStrategy,
    });
    try {
      await api.put(ENDPOINTS.MANUAL_MATCHES.UPDATE(id!), { planningNotes: planJSON });
      setMatch({ ...match, planningNotes: planJSON });
      navigate(APP_ROUTES.ANALISIS.LIST);
    } catch (error) {
      console.error(error);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleStartMatchNow = async () => {
    try {
      await api.put(ENDPOINTS.MANUAL_MATCHES.UPDATE(id!), {
        status: 'Iniciado',
        analysisType: startAnalysisType,
      });
      setMatch({ ...match, status: 'Iniciado', analysisType: startAnalysisType });
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
    try {
      await api.delete(
        ENDPOINTS.MANUAL_MATCHES.DELETE_POINT(id!, pointHistory[pointHistory.length - 1].id),
      );
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
    if (newMySets === (match.setsToWin || 3) || newOppSets === (match.setsToWin || 3))
      setShowEndMatchModal(true);
    else setCurrentSet(currentSet + 1);
  };

  const executeCompleteMatch = async () => {
    let finalNotes = deepNotes;
    let finalSetScores = undefined;

    if (match.analysisType === 'Rapido') {
      // 1. REGLA DEL PING PONG EN CLIENTE
      const isValidSet = (s1: number, s2: number) => {
        if (s1 === 0 && s2 === 0) return true; // Lo ignoramos si lo dejaron en blanco
        const max = Math.max(s1, s2);
        const min = Math.min(s1, s2);
        if (max < 11) return false;
        if (max === 11 && min > 9) return false;
        return max <= 11 || max - min === 2;
      };

      for (let i = 0; i < setScores.length; i++) {
        const s1 = Number(setScores[i].myScore);
        const s2 = Number(setScores[i].oppScore);
        if (s1 > 0 || s2 > 0) {
          // Si han escrito algo
          if (!isValidSet(s1, s2)) {
            return notifications.show({
              title: 'Marcador Inválido',
              message: `El resultado del Set ${i + 1} (${s1}-${s2}) es imposible en tenis de mesa. Corrígelo.`,
              color: 'red',
            });
          }
        }
      }

      finalNotes = `Fortalezas durante el partido:\n${strChecked.length > 0 ? strChecked.map((s) => `- ${s}`).join('\n') : 'Ninguna'}\nDetalles:\n${strDetails || 'Sin detalles'}\n\nCosas a mejorar:\n${weakChecked.length > 0 ? weakChecked.map((s) => `- ${s}`).join('\n') : 'Ninguna'}\nDetalles:\n${weakDetails || 'Sin detalles'}`;

      finalSetScores = setScores.map((s) => ({
        myScore: Number(s.myScore) || 0,
        oppScore: Number(s.oppScore) || 0,
      }));
    }

    try {
      await api.put(ENDPOINTS.MANUAL_MATCHES.COMPLETE(id!), {
        mySets: Number(mySetsWon),
        opponentSets: Number(oppSetsWon),
        lightNotes: finalNotes,
        setScores: finalSetScores,
      });
      setMatch({
        ...match,
        status: 'Completado',
        mySets: Number(mySetsWon),
        opponentSets: Number(oppSetsWon),
        lightNotes: finalNotes,
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

  // --- 1. REPORTE FINAL ---
  if (match.status === 'Completado') {
    // 👇 Lógica Inteligente para extraer los tanteos según el tipo de partido
    let finalSetScores: { myScore: number; oppScore: number }[] = [];

    if (match.analysisType === 'Rapido' && Array.isArray(match.setScores)) {
      finalSetScores = match.setScores;
    } else if (match.analysisType === 'Extenso' && pointHistory.length > 0) {
      const maxSet = Math.max(...pointHistory.map((p) => p.setNumber), 0);
      for (let i = 1; i <= maxSet; i++) {
        const pts = pointHistory.filter((p) => p.setNumber === i);
        if (pts.length > 0) {
          finalSetScores.push({
            myScore: pts.filter((p) => p.isWon).length,
            oppScore: pts.filter((p) => !p.isWon).length,
          });
        }
      }
    }

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

          {/* 👇 NUEVA SECCIÓN DE TANTEOS POR SET 👇 */}
          {finalSetScores.length > 0 && (
            <Group
              justify="center"
              mt="xl"
              gap="lg"
              style={{ borderTop: '1px solid var(--mantine-color-dark-5)', paddingTop: '20px' }}
            >
              {finalSetScores.map((score, idx) => (
                <Stack key={idx} align="center" gap={4}>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                    SET {idx + 1}
                  </Text>
                  <Badge
                    size="xl"
                    variant="filled"
                    color={score.myScore > score.oppScore ? 'green.8' : 'red.8'}
                  >
                    {score.myScore} - {score.oppScore}
                  </Badge>
                </Stack>
              ))}
            </Group>
          )}
        </Paper>

        {match.lightNotes && (
          <Paper withBorder p="md" radius="md" bg="blue.0" c="blue.9">
            <Text fw={700} mb="xs">
              Conclusiones del Partido:
            </Text>
            <Text style={{ whiteSpace: 'pre-wrap' }}>{match.lightNotes}</Text>
          </Paper>
        )}

        {match.analysisType === 'Extenso' && pointHistory.length > 0 && (
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

  // --- 2. FLUJO PLANIFICACIÓN PRE-PARTIDO ---
  if (match.status === 'Programado') {
    return (
      <Stack gap="xl" style={{ maxWidth: 800, margin: '0 auto' }}>
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(APP_ROUTES.ANALISIS.LIST)}
          w="max-content"
        >
          Volver a Análisis
        </Button>

        <Paper withBorder p="xl" radius="md">
          <Group gap="sm" mb="lg">
            <ThemeIcon size={40} radius="md" color="orange" variant="light">
              <IconClipboardList size={24} />
            </ThemeIcon>
            <Group gap="xs">
              <Title order={3}>Plan vs {match.opponentName}</Title>
              <ActionIcon variant="light" color="blue" onClick={() => setEditRivalModal(true)}>
                <IconEdit size={16} />
              </ActionIcon>
            </Group>
          </Group>

          <Stack gap="md">
            <Textarea
              label="¿Qué voy a hacer cuando saque yo?"
              placeholder="Ej: Saque corto al revés sin efecto..."
              minRows={3}
              value={planMyServe}
              onChange={(e) => setPlanMyServe(e.currentTarget.value)}
            />
            <Textarea
              label="¿Qué voy a hacer cuando saque él?"
              placeholder="Ej: Si saca largo, abrir cruzado..."
              minRows={3}
              value={planTheirServe}
              onChange={(e) => setPlanTheirServe(e.currentTarget.value)}
            />
            <Textarea
              label="¿Cuál será mi estrategia de partido?"
              placeholder="Ej: Mantener la bola en su revés..."
              minRows={4}
              value={planStrategy}
              onChange={(e) => setPlanStrategy(e.currentTarget.value)}
            />

            <Group justify="space-between" align="flex-end" mt="lg">
              <Button
                color="orange"
                variant="light"
                onClick={handleSavePlan}
                loading={savingPlan}
                leftSection={<IconDeviceFloppy size={18} />}
              >
                Guardar Notas
              </Button>

              <Group align="flex-end">
                <Select
                  label="Tipo de Análisis"
                  data={[
                    { value: 'Rapido', label: 'Rápido (Rapido)' },
                    { value: 'Extenso', label: 'Profundo (Extenso)' },
                  ]}
                  value={startAnalysisType}
                  onChange={(val) => setStartAnalysisType(val!)}
                  allowDeselect={false}
                />
                <Button color="blue" onClick={handleStartMatchNow}>
                  Empezar Partido
                </Button>
              </Group>
            </Group>
          </Stack>
        </Paper>

        {/* Modal Editar Integrado Aquí También */}
        <Modal
          opened={editRivalModal}
          onClose={() => setEditRivalModal(false)}
          title="Actualizar Datos del Rival"
          centered
        >
          <Stack gap="md">
            <TextInput
              label="Nombre Real"
              value={editOppName}
              onChange={(e) => setEditOppName(e.currentTarget.value)}
            />
            <SimpleGrid cols={2}>
              <Select
                label="Mano"
                data={['Diestro', 'Zurdo']}
                value={editOppHand}
                onChange={setEditOppHand}
                clearable
              />
              <Select
                label="Estilo"
                data={['Ofensivo', 'Defensivo']}
                value={editOppStyle}
                onChange={setEditOppStyle}
                clearable
              />
              <Select
                label="Nivel"
                data={['Peor', 'Igual', 'Mejor']}
                value={editOppLevel}
                onChange={setEditOppLevel}
                clearable
              />
            </SimpleGrid>
            <Button mt="md" fullWidth color="blue" onClick={handleUpdateRival}>
              Guardar Cambios
            </Button>
          </Stack>
        </Modal>
      </Stack>
    );
  }

  // --- 3. FLUJO LIGHT ---
  if (match.analysisType === 'Rapido') {
    const mySets = Number(mySetsWon);
    const oppSets = Number(oppSetsWon);
    const target = match.setsToWin;
    const isReadyToComplete =
      (mySets === target && oppSets < target) || (oppSets === target && mySets < target);

    return (
      <Stack gap="xl" style={{ maxWidth: 800, margin: '0 auto' }}>
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(APP_ROUTES.ANALISIS.LIST)}
          w="max-content"
        >
          Volver a Análisis
        </Button>

        {match.planningNotes && (
          <Accordion variant="separated">
            <Accordion.Item value="plan">
              <Accordion.Control
                icon={<IconClipboardList size={20} color="var(--mantine-color-orange-6)" />}
              >
                <Text fw={700} c="orange.7">
                  Ver Planificación del Partido
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Text style={{ whiteSpace: 'pre-wrap' }} size="sm">
                  {(() => {
                    try {
                      const p = JSON.parse(match.planningNotes);
                      return `🎯 MI SAQUE:\n${p.myServe || '-'}\n\n🛡️ SU SAQUE:\n${p.theirServe || '-'}\n\n🧠 ESTRATEGIA:\n${p.strategy || '-'}`;
                    } catch {
                      return match.planningNotes;
                    }
                  })()}
                </Text>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        )}

        <Paper withBorder p="xl" radius="md">
          <Group justify="space-between" mb="lg">
            <Group gap="xs">
              <Title order={3}>vs {match.opponentName}</Title>
              <ActionIcon variant="light" color="blue" onClick={() => setEditRivalModal(true)}>
                <IconEdit size={16} />
              </ActionIcon>
            </Group>
            <Badge color="blue" variant="light">
              Al mejor de {match.setsToWin} Sets
            </Badge>
          </Group>

          <SimpleGrid cols={2} mb="xl">
            <NumberInput
              label="Tus Sets Ganados"
              min={0}
              max={match.setsToWin}
              clampBehavior="strict" // 👈 MAGIA DE MANTINE v7
              allowNegative={false}
              value={mySetsWon}
              onChange={setMySetsWon}
              size="md"
            />
            <NumberInput
              label={`Sets de ${match.opponentName}`}
              min={0}
              max={match.setsToWin}
              clampBehavior="strict" // 👈 MAGIA DE MANTINE v7
              allowNegative={false}
              value={oppSetsWon}
              onChange={setOppSetsWon}
              size="md"
            />
          </SimpleGrid>
          {totalSetsPlayed > 0 && (
            <Paper withBorder p="md" bg="var(--mantine-color-gray-0)" mb="xl">
              <Title order={5} mb="xs">
                Tanteo por Set (Opcional)
              </Title>
              {setScores.map((score, idx) => (
                <Group key={idx} grow mb="xs">
                  <NumberInput
                    label={`Set ${idx + 1} (Tú)`}
                    value={score.myScore}
                    onChange={(v) => handleScoreChange(idx, 'myScore', v)}
                    min={0}
                  />
                  <NumberInput
                    label={`Set ${idx + 1} (${match.opponentName})`}
                    value={score.oppScore}
                    onChange={(v) => handleScoreChange(idx, 'oppScore', v)}
                    min={0}
                  />
                </Group>
              ))}
            </Paper>
          )}
          <Title order={5} mb="sm" c="green.7">
            ✅ Qué fortalezas tuve en el partido
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} mb="sm">
            {SKILLS_LIST.map((skill) => (
              <Checkbox
                key={`str-${skill}`}
                label={skill}
                checked={strChecked.includes(skill)}
                onChange={(e) => {
                  const isChecked = e.currentTarget.checked;
                  setStrChecked((prev) =>
                    isChecked ? [...prev, skill] : prev.filter((s) => s !== skill),
                  );
                }}
              />
            ))}
          </SimpleGrid>
          <Textarea
            label="Más Detalles"
            placeholder="Escribe más sobre tus aciertos..."
            minRows={2}
            value={strDetails}
            onChange={(e) => setStrDetails(e.currentTarget.value)}
            mb="xl"
          />

          <Title order={5} mb="sm" c="red.7">
            ❌ Qué fallé durante el partido
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} mb="sm">
            {SKILLS_LIST.map((skill) => (
              <Checkbox
                key={`weak-${skill}`}
                label={skill}
                checked={weakChecked.includes(skill)}
                onChange={(e) => {
                  const isChecked = e.currentTarget.checked;
                  setWeakChecked((prev) =>
                    isChecked ? [...prev, skill] : prev.filter((s) => s !== skill),
                  );
                }}
              />
            ))}
          </SimpleGrid>
          <Textarea
            label="Más Detalles"
            placeholder="Escribe más sobre tus fallos o cosas a mejorar..."
            minRows={2}
            value={weakDetails}
            onChange={(e) => setWeakDetails(e.currentTarget.value)}
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
              Uno de los dos jugadores debe ganar exactamente {match.setsToWin} sets para finalizar
              el partido.
            </Text>
          )}
        </Paper>

        <Modal
          opened={editRivalModal}
          onClose={() => setEditRivalModal(false)}
          title="Actualizar Datos del Rival"
          centered
        >
          <Stack gap="md">
            <TextInput
              label="Nombre Real"
              value={editOppName}
              onChange={(e) => setEditOppName(e.currentTarget.value)}
            />
            <SimpleGrid cols={2}>
              <Select
                label="Mano"
                data={['Diestro', 'Zurdo']}
                value={editOppHand}
                onChange={setEditOppHand}
                clearable
              />
              <Select
                label="Estilo"
                data={['Ofensivo', 'Defensivo']}
                value={editOppStyle}
                onChange={setEditOppStyle}
                clearable
              />
              <Select
                label="Nivel"
                data={['Peor', 'Igual', 'Mejor']}
                value={editOppLevel}
                onChange={setEditOppLevel}
                clearable
              />
            </SimpleGrid>
            <Button mt="md" fullWidth color="blue" onClick={handleUpdateRival}>
              Guardar Cambios
            </Button>
          </Stack>
        </Modal>
      </Stack>
    );
  }

  // --- 4. FLUJO DEEP ---
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

      {match.planningNotes && (
        <Accordion variant="separated" mb="sm">
          <Accordion.Item value="plan">
            <Accordion.Control
              icon={<IconClipboardList size={20} color="var(--mantine-color-orange-6)" />}
            >
              <Text fw={700} c="orange.7">
                Ver Planificación del Partido
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Text style={{ whiteSpace: 'pre-wrap' }} size="sm">
                {(() => {
                  try {
                    const p = JSON.parse(match.planningNotes);
                    return `🎯 MI SAQUE:\n${p.myServe || '-'}\n\n🛡️ SU SAQUE:\n${p.theirServe || '-'}\n\n🧠 ESTRATEGIA:\n${p.strategy || '-'}`;
                  } catch {
                    return match.planningNotes;
                  }
                })()}
              </Text>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}

      <Paper withBorder p="md" radius="md" bg="dark.7">
        <Group justify="space-between" mb="xs">
          <ScrollArea w={{ base: 200, sm: 300 }} type="never">
            <Group gap="xs" wrap="nowrap" pb={4}>
              {Array.from({ length: currentSet }, (_, i) => i + 1).map((setNum) => (
                <Button
                  key={setNum}
                  size="xs"
                  variant={setNum === currentSet ? 'filled' : 'light'}
                  color="blue"
                  onClick={() => setNum !== currentSet && setViewingSetSummary(setNum)}
                  style={{ flexShrink: 0 }}
                >
                  Set {setNum}
                </Button>
              ))}
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
                      {p.category || 'Rapido'}
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

      <Modal
        opened={editRivalModal}
        onClose={() => setEditRivalModal(false)}
        title="Actualizar Datos del Rival"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Nombre Real"
            value={editOppName}
            onChange={(e) => setEditOppName(e.currentTarget.value)}
          />
          <SimpleGrid cols={2}>
            <Select
              label="Mano"
              data={['Diestro', 'Zurdo']}
              value={editOppHand}
              onChange={setEditOppHand}
              clearable
            />
            <Select
              label="Estilo"
              data={['Ofensivo', 'Defensivo']}
              value={editOppStyle}
              onChange={setEditOppStyle}
              clearable
            />
            <Select
              label="Nivel"
              data={['Peor', 'Igual', 'Mejor']}
              value={editOppLevel}
              onChange={setEditOppLevel}
              clearable
            />
          </SimpleGrid>
          <Button mt="md" fullWidth color="blue" onClick={handleUpdateRival}>
            Guardar Cambios
          </Button>
        </Stack>
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
            value={deepNotes}
            onChange={(e) => setDeepNotes(e.currentTarget.value)}
          />
          <Button fullWidth color="blue" mt="md" onClick={executeCompleteMatch}>
            Guardar Conclusiones y Cerrar
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
};
