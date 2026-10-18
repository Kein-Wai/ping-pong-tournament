import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/axios";
import { ENDPOINTS } from "../api/endpoints";

const SKILLS_LIST = [
  "Derecha plano",
  "Revés plano",
  "TopSpin Derecha",
  "TopSpin Revés",
  "Corte",
  "Bloqueo de Derecha",
  "Bloqueo de Revés",
  "Servicio",
  "Recepción",
  "Movilidad",
];

const PLACEMENTS = [
  { label: "Derecha", placement: "Derecha" },
  { label: "Revés", placement: "Reves" },
  { label: "Centro/Codo", placement: "Centro" },
];

const RESTO_PLACEMENTS = [
  { label: "A Mi Derecha", placement: "Derecha" },
  { label: "A Mi Revés", placement: "Reves" },
];

const WON_TREE = [
  {
    label: "Servicio",
    category: "Servicio",
    next: [
      { label: "Cortado", subcategory: "Cortado", next: PLACEMENTS },
      { label: "Topeado", subcategory: "Topeado", next: PLACEMENTS },
      { label: "Sin Efecto", subcategory: "SinEfecto", next: PLACEMENTS },
    ],
  },
  {
    label: "Ataque",
    category: "Ataque",
    next: [
      { label: "Con Derecha", subcategory: "Derecha", next: PLACEMENTS },
      { label: "Con Revés", subcategory: "Reves", next: PLACEMENTS },
    ],
  },
  {
    label: "Defensa",
    category: "Defensa",
    next: [
      { label: "Corte", subcategory: "Cortado", next: PLACEMENTS },
      { label: "Bloqueo", subcategory: "SinEfecto", next: PLACEMENTS },
    ],
  },
  { label: "Error No Forzado (del Rival)", category: "ErrorNoForzado" },
  { label: "Punto Sin Razón", category: "SinRazon" },
];

const LOST_TREE = [
  { label: "Fallo Saque", category: "FalloSaque" },
  {
    label: "Fallo Resto",
    category: "Resto",
    next: [
      {
        label: "Saque Cortado",
        subcategory: "Cortado",
        next: RESTO_PLACEMENTS,
      },
      {
        label: "Saque Topeado",
        subcategory: "Topeado",
        next: RESTO_PLACEMENTS,
      },
      {
        label: "Saque Sin Efecto",
        subcategory: "SinEfecto",
        next: RESTO_PLACEMENTS,
      },
    ],
  },
  { label: "Error No Forzado", category: "ErrorNoForzado" },
  { label: "Error Forzado (Buen tiro rival)", category: "ErrorForzado" },
  { label: "Mala Movilidad", category: "Movilidad" },
  { label: "Punto Sin Razón", category: "SinRazon" },
];

const isValidTableTennisSet = (s1: number, s2: number) => {
  if (s1 === 0 && s2 === 0) return true;
  const max = Math.max(s1, s2);
  const min = Math.min(s1, s2);
  if (max < 11) return false;
  if (max === 11 && min <= 9) return true;
  return max > 11 && max - min === 2;
};

export default function ManualMatchTrackerScreen({ route, navigation }: any) {
  const { id } = route.params || {};

  const [match, setMatch] = useState<any>(null);
  const [pointHistory, setPointHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentSet, setCurrentSet] = useState(1);
  const [mySetsWon, setMySetsWon] = useState<number>(0);
  const [oppSetsWon, setOppSetsWon] = useState<number>(0);

  // Extenso
  const [isWonState, setIsWonState] = useState<boolean | null>(null);
  const [currentNodes, setCurrentNodes] = useState<any[] | null>(null);
  const [pointPath, setPointPath] = useState<any>({});
  const [showEndSetModal, setShowEndSetModal] = useState(false);
  const [showEndMatchModal, setShowEndMatchModal] = useState(false);
  const [viewingSetSummary, setViewingSetSummary] = useState<number | null>(
    null,
  );

  // Planificación
  const [planMyServe, setPlanMyServe] = useState("");
  const [planTheirServe, setPlanTheirServe] = useState("");
  const [planStrategy, setPlanStrategy] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);
  const [startAnalysisType, setStartAnalysisType] = useState<string>("Rapido");
  const [planAccordionOpen, setPlanAccordionOpen] = useState(false);

  // Rápido
  const [setScores, setSetScores] = useState<
    { myScore: string; oppScore: string }[]
  >([]);
  const [strChecked, setStrChecked] = useState<string[]>([]);
  const [strDetails, setStrDetails] = useState("");
  const [weakChecked, setWeakChecked] = useState<string[]>([]);
  const [weakDetails, setWeakDetails] = useState("");
  const [deepNotes, setDeepNotes] = useState("");

  // Edición del Rival
  const [editRivalModal, setEditRivalModal] = useState(false);
  const [editOppName, setEditOppName] = useState("");
  const [editOppHand, setEditOppHand] = useState<string | null>(null);
  const [editOppStyle, setEditOppStyle] = useState<string | null>(null);
  const [editOppLevel, setEditOppLevel] = useState<string | null>(null);
  const [editOppRubberForehand, setEditOppRubberForehand] = useState<
    string | null
  >(null);
  const [editOppRubberBackhand, setEditOppRubberBackhand] = useState<
    string | null
  >(null);

  const fetchMatchDetails = async () => {
    if (!id) return;
    try {
      const res = await api.get(ENDPOINTS.MANUAL_MATCHES.BY_ID(id));
      const data = res.data.data || res.data;
      setMatch(data);

      setEditOppName(data.opponentName);
      setEditOppHand(data.opponentHand || null);
      setEditOppStyle(data.opponentStyle || null);
      setEditOppLevel(data.opponentLevel || null);
      setEditOppRubberForehand(data.opponentRubberForehand || null);
      setEditOppRubberBackhand(data.opponentRubberBackhand || null);
      setStartAnalysisType(data.analysisType || "Rapido");

      setMySetsWon(data.mySets || 0);
      setOppSetsWon(data.opponentSets || 0);

      if (data.planningNotes) {
        try {
          const parsed = JSON.parse(data.planningNotes);
          setPlanMyServe(parsed.myServe || "");
          setPlanTheirServe(parsed.theirServe || "");
          setPlanStrategy(parsed.strategy || "");
        } catch {
          setPlanStrategy(data.planningNotes);
        }
      }

      if (data.analysisType === "Extenso" && data.lightNotes) {
        setDeepNotes(data.lightNotes);
      }

      const pts = data.points || [];
      setPointHistory(pts);

      let activeSet = 1;
      if (pts.length > 0) {
        const lastPt = pts[pts.length - 1];
        const lastSetPts = pts.filter(
          (p: any) => p.setNumber === lastPt.setNumber,
        );
        const myS = lastSetPts.filter((p: any) => p.isWon).length;
        const oppS = lastSetPts.filter((p: any) => !p.isWon).length;

        if (isValidTableTennisSet(myS, oppS)) {
          activeSet = lastPt.setNumber + 1;
        } else {
          activeSet = lastPt.setNumber;
        }
      }
      setCurrentSet(activeSet);
    } catch (error) {
      console.error("Error al cargar partido:", error);
      Alert.alert("Error", "No se pudo cargar el partido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchDetails();
  }, [id]);

  const totalSetsPlayed = Number(mySetsWon) + Number(oppSetsWon);
  useEffect(() => {
    setSetScores((prev) => {
      if (prev.length === totalSetsPlayed) return prev;
      const newScores = [...prev];
      while (newScores.length < totalSetsPlayed) {
        newScores.push({ myScore: "", oppScore: "" });
      }
      return newScores.slice(0, totalSetsPlayed);
    });
  }, [totalSetsPlayed]);

  const currentSetPoints = pointHistory.filter(
    (p) => p.setNumber === currentSet,
  );
  const myScore = currentSetPoints.filter((p) => p.isWon).length;
  const oppScore = currentSetPoints.filter((p) => !p.isWon).length;

  useEffect(() => {
    if (
      match?.analysisType === "Extenso" &&
      match?.status !== "Completado" &&
      isValidTableTennisSet(myScore, oppScore)
    ) {
      setShowEndSetModal(true);
    }
  }, [myScore, oppScore, match]);

  const getPointLabel = (p: any) => {
    if (!p.category) return "Rápido / Sin detalle";
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
  const viewSummary = viewingSetSummary
    ? getSetSummary(viewingSetSummary)
    : null;

  // Handlers
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
      await api.put(ENDPOINTS.MANUAL_MATCHES.UPDATE(id), payload);
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
      await api.put(ENDPOINTS.MANUAL_MATCHES.UPDATE(id), {
        planningNotes: planJSON,
      });
      setMatch({ ...match, planningNotes: planJSON });
      navigation.goBack();
    } catch (error) {
      console.error(error);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleStartMatchNow = async () => {
    try {
      await api.put(ENDPOINTS.MANUAL_MATCHES.UPDATE(id), {
        status: "Iniciado",
        analysisType: startAnalysisType,
      });
      setMatch({
        ...match,
        status: "Iniciado",
        analysisType: startAnalysisType,
      });
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
      executeRegisterPoint({ ...newPath, isWon: isWonState });
      resetFlow();
    }
  };

  const executeRegisterPoint = async (data: any) => {
    const payload = {
      setNumber: currentSet,
      pointOrder: currentSetPoints.length + 1,
      isWon: data.isWon,
      category: data.category || null,
      subcategory: data.subcategory || null,
      placement: data.placement || null,
    };
    try {
      const res = await api.post(
        ENDPOINTS.MANUAL_MATCHES.ADD_POINT(id),
        payload,
      );
      setPointHistory([...pointHistory, res.data.data]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUndoPoint = async () => {
    if (pointHistory.length === 0) return;
    try {
      await api.delete(
        ENDPOINTS.MANUAL_MATCHES.DELETE_POINT(
          id,
          pointHistory[pointHistory.length - 1].id,
        ),
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

    const target = match.setsToWin || 3;
    if (newMySets === target || newOppSets === target) {
      setShowEndMatchModal(true);
    } else {
      setCurrentSet(currentSet + 1);
    }
  };

  const executeCompleteMatch = async () => {
    let finalNotes = deepNotes;
    let finalSetScores = undefined;

    if (match.analysisType === "Rapido") {
      for (let i = 0; i < setScores.length; i++) {
        const s1 = Number(setScores[i].myScore);
        const s2 = Number(setScores[i].oppScore);
        if (s1 > 0 || s2 > 0) {
          if (!isValidTableTennisSet(s1, s2)) {
            Alert.alert(
              "Marcador Inválido",
              `El resultado del Set ${i + 1} (${s1}-${s2}) es imposible en tenis de mesa. Corrígelo.`,
            );
            return;
          }
        }
      }

      finalNotes = `Fortalezas durante el partido:\n${
        strChecked.length > 0
          ? strChecked.map((s) => `- ${s}`).join("\n")
          : "Ninguna"
      }\nDetalles:\n${strDetails || "Sin detalles"}\n\nCosas a mejorar:\n${
        weakChecked.length > 0
          ? weakChecked.map((s) => `- ${s}`).join("\n")
          : "Ninguna"
      }\nDetalles:\n${weakDetails || "Sin detalles"}`;

      finalSetScores = setScores.map((s) => ({
        myScore: Number(s.myScore) || 0,
        oppScore: Number(s.oppScore) || 0,
      }));
    }

    try {
      await api.put(ENDPOINTS.MANUAL_MATCHES.COMPLETE(id), {
        mySets: Number(mySetsWon),
        opponentSets: Number(oppSetsWon),
        lightNotes: finalNotes,
        setScores: finalSetScores,
      });
      setShowEndMatchModal(false);
      fetchMatchDetails();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading || !match) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  // ==========================================
  // 1. REPORTE FINAL (COMPLETADO)
  // ==========================================
  if (match.status === "Completado") {
    let finalSetScores: { myScore: number; oppScore: number }[] = [];

    if (match.analysisType === "Rapido" && Array.isArray(match.setScores)) {
      finalSetScores = match.setScores;
    } else if (match.analysisType === "Extenso" && pointHistory.length > 0) {
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
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backBtnText}>Volver a Análisis</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Reporte del Partido</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollPad}>
          <View style={styles.card}>
            <View style={styles.bigScoreRow}>
              <View style={styles.scoreCol}>
                <Text style={styles.playerLabel}>TÚ</Text>
                <Text
                  style={[
                    styles.bigScoreNum,
                    Number(mySetsWon) > Number(oppSetsWon)
                      ? styles.textGreen
                      : styles.textGray,
                  ]}
                >
                  {mySetsWon}
                </Text>
              </View>
              <Text style={styles.setsDivider}>SETS</Text>
              <View style={styles.scoreCol}>
                <Text style={styles.playerLabel}>
                  {match.opponentName.toUpperCase()}
                </Text>
                <Text
                  style={[
                    styles.bigScoreNum,
                    Number(oppSetsWon) > Number(mySetsWon)
                      ? styles.textRed
                      : styles.textGray,
                  ]}
                >
                  {oppSetsWon}
                </Text>
              </View>
            </View>

            {finalSetScores.length > 0 && (
              <View style={styles.setScoresRow}>
                {finalSetScores.map((score, idx) => (
                  <View key={idx} style={styles.setScoreBadge}>
                    <Text style={styles.setScoreLabel}>SET {idx + 1}</Text>
                    <View
                      style={[
                        styles.setScorePill,
                        score.myScore > score.oppScore
                          ? styles.bgGreenDark
                          : styles.bgRedDark,
                      ]}
                    >
                      <Text style={styles.setScorePillText}>
                        {score.myScore} - {score.oppScore}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {match.lightNotes && (
            <View style={[styles.card, styles.notesCard]}>
              <Text style={styles.notesTitle}>Conclusiones del Partido:</Text>
              <Text style={styles.notesBody}>{match.lightNotes}</Text>
            </View>
          )}

          {match.analysisType === "Extenso" && pointHistory.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Desglose Punto a Punto</Text>
              {pointHistory.map((p, idx) => (
                <View key={idx} style={styles.pointRow}>
                  <Text style={styles.pointSetText}>Set {p.setNumber}</Text>
                  <Text style={styles.pointOrderText}>#{p.pointOrder}</Text>
                  <View
                    style={[
                      styles.pointWinnerBadge,
                      p.isWon ? styles.bgGreenLight : styles.bgRedLight,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pointWinnerText,
                        p.isWon ? styles.textGreen : styles.textRed,
                      ]}
                    >
                      {p.isWon ? "Mío" : "Rival"}
                    </Text>
                  </View>
                  <Text style={styles.pointDetailText}>
                    {p.category || "-"}{" "}
                    {p.subcategory ? `· ${p.subcategory}` : ""}{" "}
                    {p.placement ? `(${p.placement})` : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==========================================
  // 2. FLUJO PLANIFICACIÓN PRE-PARTIDO
  // ==========================================
  if (match.status === "Programado") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backBtnText}>Volver a Análisis</Text>
          </TouchableOpacity>
          <View style={styles.rivalHeaderTitleRow}>
            <Text style={styles.topBarTitle}>Plan vs {match.opponentName}</Text>
            <TouchableOpacity
              onPress={() => setEditRivalModal(true)}
              style={styles.editIconBtn}
            >
              <Ionicons name="create-outline" size={18} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollPad}>
          <View style={styles.card}>
            <Text style={styles.inputLabel}>
              ¿Qué voy a hacer cuando saque yo?
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Ej: Saque corto al revés sin efecto..."
              placeholderTextColor="#6b7280"
              multiline
              numberOfLines={3}
              value={planMyServe}
              onChangeText={setPlanMyServe}
            />

            <Text style={[styles.inputLabel, { marginTop: 14 }]}>
              ¿Qué voy a hacer cuando saque él?
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Ej: Si saca largo, abrir cruzado..."
              placeholderTextColor="#6b7280"
              multiline
              numberOfLines={3}
              value={planTheirServe}
              onChangeText={setPlanTheirServe}
            />

            <Text style={[styles.inputLabel, { marginTop: 14 }]}>
              ¿Cuál será mi estrategia de partido?
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Ej: Mantener la bola en su revés..."
              placeholderTextColor="#6b7280"
              multiline
              numberOfLines={4}
              value={planStrategy}
              onChangeText={setPlanStrategy}
            />

            <View style={styles.actionRowBetween}>
              <TouchableOpacity
                style={[styles.btn, styles.btnOrangeLight]}
                onPress={handleSavePlan}
                disabled={savingPlan}
              >
                <Ionicons name="save-outline" size={18} color="#f59e0b" />
                <Text style={styles.btnOrangeLightText}>Guardar Notas</Text>
              </TouchableOpacity>

              <View style={styles.rowStartControls}>
                <View style={styles.segmentedMini}>
                  <TouchableOpacity
                    style={[
                      styles.miniSegment,
                      startAnalysisType === "Rapido" &&
                        styles.miniSegmentActive,
                    ]}
                    onPress={() => setStartAnalysisType("Rapido")}
                  >
                    <Text
                      style={[
                        styles.miniSegmentText,
                        startAnalysisType === "Rapido" && styles.textWhite,
                      ]}
                    >
                      Rápido
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.miniSegment,
                      startAnalysisType === "Extenso" &&
                        styles.miniSegmentActive,
                    ]}
                    onPress={() => setStartAnalysisType("Extenso")}
                  >
                    <Text
                      style={[
                        styles.miniSegmentText,
                        startAnalysisType === "Extenso" && styles.textWhite,
                      ]}
                    >
                      Profundo
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.btn, styles.btnBlue]}
                  onPress={handleStartMatchNow}
                >
                  <Text style={styles.btnTextWhite}>Empezar Partido</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {renderEditRivalModal()}
      </SafeAreaView>
    );
  }

  // ==========================================
  // 3. FLUJO RÁPIDO
  // ==========================================
  if (match.analysisType === "Rapido") {
    const mySets = Number(mySetsWon);
    const oppSets = Number(oppSetsWon);
    const target = match.setsToWin;
    const isReadyToComplete =
      (mySets === target && oppSets < target) ||
      (oppSets === target && mySets < target);

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backBtnText}>Volver a Análisis</Text>
          </TouchableOpacity>
          <View style={styles.rivalHeaderTitleRow}>
            <Text style={styles.topBarTitle}>vs {match.opponentName}</Text>
            <TouchableOpacity
              onPress={() => setEditRivalModal(true)}
              style={styles.editIconBtn}
            >
              <Ionicons name="create-outline" size={18} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollPad}>
          {/* Planificación Accordion */}
          {match.planningNotes && (
            <View style={styles.accordionCard}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setPlanAccordionOpen(!planAccordionOpen)}
              >
                <View style={styles.rowAlign}>
                  <Ionicons
                    name="clipboard-outline"
                    size={18}
                    color="#f59e0b"
                  />
                  <Text style={styles.accordionTitle}>
                    Ver Planificación del Partido
                  </Text>
                </View>
                <Ionicons
                  name={planAccordionOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#f59e0b"
                />
              </TouchableOpacity>
              {planAccordionOpen && (
                <View style={styles.accordionContent}>
                  <Text style={styles.planTextFormatted}>
                    {(() => {
                      try {
                        const p = JSON.parse(match.planningNotes);
                        return `🎯 MI SAQUE:\n${p.myServe || "-"}\n\n🛡️ SU SAQUE:\n${
                          p.theirServe || "-"
                        }\n\n🧠 ESTRATEGIA:\n${p.strategy || "-"}`;
                      } catch {
                        return match.planningNotes;
                      }
                    })()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Marcador de Sets */}
          <View style={styles.card}>
            <View style={styles.cardTitleRowBetween}>
              <Text style={styles.cardTitle}>Marcador de Sets</Text>
              <View style={styles.badgeBlue}>
                <Text style={styles.badgeBlueText}>
                  Al mejor de {match.setsToWin} Sets
                </Text>
              </View>
            </View>

            <View style={styles.rowTwoCols}>
              <View style={styles.counterBox}>
                <Text style={styles.counterLabel}>Tus Sets Ganados</Text>
                <View style={styles.incDecRow}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setMySetsWon(Math.max(0, mySetsWon - 1))}
                  >
                    <Text style={styles.stepBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{mySetsWon}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() =>
                      setMySetsWon(Math.min(target, mySetsWon + 1))
                    }
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.counterBox}>
                <Text style={styles.counterLabel}>
                  Sets de {match.opponentName}
                </Text>
                <View style={styles.incDecRow}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setOppSetsWon(Math.max(0, oppSetsWon - 1))}
                  >
                    <Text style={styles.stepBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{oppSetsWon}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() =>
                      setOppSetsWon(Math.min(target, oppSetsWon + 1))
                    }
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Tanteo por Set (Opcional) */}
          {totalSetsPlayed > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Tanteo por Set (Opcional)</Text>
              {setScores.map((score, idx) => (
                <View key={idx} style={styles.tanteoRow}>
                  <Text style={styles.tanteoSetLabel}>Set {idx + 1}</Text>
                  <TextInput
                    style={styles.tanteoInput}
                    placeholder="Tú"
                    placeholderTextColor="#6b7280"
                    keyboardType="number-pad"
                    value={score.myScore}
                    onChangeText={(val) => {
                      const updated = [...setScores];
                      updated[idx].myScore = val;
                      setSetScores(updated);
                    }}
                  />
                  <Text style={{ color: "#9ca3af" }}>-</Text>
                  <TextInput
                    style={styles.tanteoInput}
                    placeholder="Rival"
                    placeholderTextColor="#6b7280"
                    keyboardType="number-pad"
                    value={score.oppScore}
                    onChangeText={(val) => {
                      const updated = [...setScores];
                      updated[idx].oppScore = val;
                      setSetScores(updated);
                    }}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Fortalezas */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, styles.textGreen]}>
              ✅ Qué fortalezas tuve en el partido
            </Text>
            <View style={styles.pillGrid}>
              {SKILLS_LIST.map((skill) => {
                const checked = strChecked.includes(skill);
                return (
                  <TouchableOpacity
                    key={`str-${skill}`}
                    style={[
                      styles.checklistPill,
                      checked && styles.checklistPillGreen,
                    ]}
                    onPress={() =>
                      setStrChecked((prev) =>
                        checked
                          ? prev.filter((s) => s !== skill)
                          : [...prev, skill],
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.checklistText,
                        checked && styles.textWhite,
                      ]}
                    >
                      {skill}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={[styles.textArea, { marginTop: 12 }]}
              placeholder="Escribe más sobre tus aciertos..."
              placeholderTextColor="#6b7280"
              multiline
              numberOfLines={2}
              value={strDetails}
              onChangeText={setStrDetails}
            />
          </View>

          {/* Fallos */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, styles.textRed]}>
              ❌ Qué fallé durante el partido
            </Text>
            <View style={styles.pillGrid}>
              {SKILLS_LIST.map((skill) => {
                const checked = weakChecked.includes(skill);
                return (
                  <TouchableOpacity
                    key={`weak-${skill}`}
                    style={[
                      styles.checklistPill,
                      checked && styles.checklistPillRed,
                    ]}
                    onPress={() =>
                      setWeakChecked((prev) =>
                        checked
                          ? prev.filter((s) => s !== skill)
                          : [...prev, skill],
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.checklistText,
                        checked && styles.textWhite,
                      ]}
                    >
                      {skill}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={[styles.textArea, { marginTop: 12 }]}
              placeholder="Escribe más sobre tus fallos o cosas a mejorar..."
              placeholderTextColor="#6b7280"
              multiline
              numberOfLines={2}
              value={weakDetails}
              onChangeText={setWeakDetails}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.btn,
              styles.btnGreen,
              !isReadyToComplete && styles.btnDisabled,
            ]}
            disabled={!isReadyToComplete}
            onPress={executeCompleteMatch}
          >
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.btnTextWhite}>Guardar y Finalizar Partido</Text>
          </TouchableOpacity>
          {!isReadyToComplete && (
            <Text style={styles.helperText}>
              Uno de los dos jugadores debe ganar exactamente {match.setsToWin}{" "}
              sets para finalizar el partido.
            </Text>
          )}
        </ScrollView>

        {renderEditRivalModal()}
      </SafeAreaView>
    );
  }

  // ==========================================
  // 4. FLUJO EXTENSO (ÁRBITRO EN VIVO)
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backBtnText}>Salir del Árbitro</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollPad}>
        {match.planningNotes && (
          <View style={styles.accordionCard}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setPlanAccordionOpen(!planAccordionOpen)}
            >
              <View style={styles.rowAlign}>
                <Ionicons name="clipboard-outline" size={18} color="#f59e0b" />
                <Text style={styles.accordionTitle}>
                  Ver Planificación del Partido
                </Text>
              </View>
              <Ionicons
                name={planAccordionOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color="#f59e0b"
              />
            </TouchableOpacity>
            {planAccordionOpen && (
              <View style={styles.accordionContent}>
                <Text style={styles.planTextFormatted}>
                  {(() => {
                    try {
                      const p = JSON.parse(match.planningNotes);
                      return `🎯 MI SAQUE:\n${p.myServe || "-"}\n\n🛡️ SU SAQUE:\n${
                        p.theirServe || "-"
                      }\n\n🧠 ESTRATEGIA:\n${p.strategy || "-"}`;
                    } catch {
                      return match.planningNotes;
                    }
                  })()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Panel Marcador */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.setTabsScroll}
            >
              {Array.from({ length: currentSet }, (_, i) => i + 1).map(
                (setNum) => (
                  <TouchableOpacity
                    key={setNum}
                    style={[
                      styles.setNumBtn,
                      setNum === currentSet
                        ? styles.setNumBtnActive
                        : styles.setNumBtnInactive,
                    ]}
                    onPress={() =>
                      setNum !== currentSet && setViewingSetSummary(setNum)
                    }
                  >
                    <Text
                      style={[
                        styles.setNumBtnText,
                        setNum === currentSet && styles.textWhite,
                      ]}
                    >
                      Set {setNum}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </ScrollView>

            <View style={styles.scoreTopActions}>
              <View style={styles.badgeGrayOutline}>
                <Text style={styles.badgeGrayText}>
                  {mySetsWon} Sets a {oppSetsWon}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleUndoPoint}
                style={styles.undoBtn}
              >
                <Ionicons name="arrow-undo" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.liveScoreRow}>
            <View style={styles.scoreCol}>
              <Text style={styles.playerLabel}>TÚ</Text>
              <Text style={[styles.bigLiveNum, styles.textGreen]}>
                {myScore}
              </Text>
            </View>
            <Text style={styles.liveScoreDivider}>-</Text>
            <View style={styles.scoreCol}>
              <TouchableOpacity
                onPress={() => setEditRivalModal(true)}
                style={styles.rowAlign}
              >
                <Text style={styles.playerLabel}>
                  {match.opponentName.substring(0, 10).toUpperCase()}
                </Text>
                <Ionicons
                  name="create-outline"
                  size={14}
                  color="#9ca3af"
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
              <Text style={[styles.bigLiveNum, styles.textRed]}>
                {oppScore}
              </Text>
            </View>
          </View>
        </View>

        {/* Botones de Entrada de Punto */}
        {isWonState === null ? (
          <View style={styles.bigPointButtonsRow}>
            <TouchableOpacity
              style={[styles.giantBtn, styles.bgGreen]}
              onPress={() => handleStartPoint(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.giantBtnText}>PUNTO MÍO</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.giantBtn, styles.bgRed]}
              onPress={() => handleStartPoint(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.giantBtnText}>PUNTO RIVAL</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text
              style={[
                styles.cardTitle,
                isWonState ? styles.textGreen : styles.textRed,
                { textAlign: "center" },
              ]}
            >
              Selecciona Categoría
            </Text>
            <View style={styles.nodesGrid}>
              {currentNodes?.map((node, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.nodeBtn,
                    isWonState ? styles.nodeBtnGreen : styles.nodeBtnRed,
                  ]}
                  onPress={() => handleNodeClick(node)}
                >
                  <Text
                    style={[
                      styles.nodeBtnText,
                      isWonState ? styles.textGreen : styles.textRed,
                    ]}
                  >
                    {node.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.cancelTreeBtn} onPress={resetFlow}>
              <Text style={styles.cancelTreeText}>
                Cancelar (Volver a Punto Mío/Rival)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Historial del Set Actual */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Historial del Set {currentSet}</Text>
          {currentSetPoints.length === 0 ? (
            <Text style={styles.emptySetText}>El set acaba de empezar.</Text>
          ) : (
            currentSetPoints
              .slice()
              .reverse()
              .map((p, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.pointRow,
                    p.isWon ? styles.bgGreenDark : styles.bgRedDark,
                  ]}
                >
                  <View style={styles.rowAlign}>
                    <Text style={styles.pointOrderText}>#{p.pointOrder}</Text>
                    <View style={styles.badgePointType}>
                      <Text style={styles.badgePointTypeText}>
                        {p.category || "Rapido"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.pointDetailTextWhite}>
                    {p.subcategory || ""}{" "}
                    {p.placement ? `(${p.placement})` : ""}
                  </Text>
                </View>
              ))
          )}
        </View>
      </ScrollView>

      {/* Modal Fin de Set */}
      <Modal visible={showEndSetModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalAlertBox}>
            <Ionicons name="trophy" size={48} color="#eab308" />
            <Text style={styles.modalAlertTitle}>¡Set Finalizado!</Text>
            <Text style={styles.modalAlertSub}>
              {myScore > oppScore ? "Has ganado" : "Rival gana"} ({myScore} -{" "}
              {oppScore})
            </Text>

            <View style={styles.rowTwoCols}>
              <View style={[styles.summaryBox, styles.bgGreenLight]}>
                <Text style={[styles.summaryBoxTitle, styles.textGreen]}>
                  Tus Fortalezas
                </Text>
                {getSortedCategories(activeSummary.wonCategories).length ===
                0 ? (
                  <Text style={styles.emptySetText}>Ninguno</Text>
                ) : (
                  getSortedCategories(activeSummary.wonCategories).map(
                    ([lbl, cnt]: any) => (
                      <View key={lbl} style={styles.summaryRowItem}>
                        <Text style={styles.summaryLabel} numberOfLines={1}>
                          {lbl}
                        </Text>
                        <Text style={styles.summaryCount}>{cnt}</Text>
                      </View>
                    ),
                  )
                )}
              </View>

              <View style={[styles.summaryBox, styles.bgRedLight]}>
                <Text style={[styles.summaryBoxTitle, styles.textRed]}>
                  A Mejorar
                </Text>
                {getSortedCategories(activeSummary.lostCategories).length ===
                0 ? (
                  <Text style={styles.emptySetText}>Ninguno</Text>
                ) : (
                  getSortedCategories(activeSummary.lostCategories).map(
                    ([lbl, cnt]: any) => (
                      <View key={lbl} style={styles.summaryRowItem}>
                        <Text style={styles.summaryLabel} numberOfLines={1}>
                          {lbl}
                        </Text>
                        <Text style={styles.summaryCount}>{cnt}</Text>
                      </View>
                    ),
                  )
                )}
              </View>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnRedLight]}
                onPress={() => {
                  setShowEndSetModal(false);
                  handleUndoPoint();
                }}
              >
                <Text style={styles.textRed}>Deshacer Último Punto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnBlue]}
                onPress={handleConfirmSetEnd}
              >
                <Text style={styles.btnTextWhite}>
                  Avanzar al Siguiente Set
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Resumen de Set Anterior */}
      <Modal
        visible={viewingSetSummary !== null}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalAlertBox}>
            <Text style={styles.modalAlertTitle}>
              Resumen del Set {viewingSetSummary}
            </Text>
            {viewSummary && (
              <>
                <Text style={styles.modalAlertSub}>
                  Resultado:{" "}
                  {viewSummary.myScore > viewSummary.oppScore
                    ? "Ganaste"
                    : "Rival ganó"}{" "}
                  ({viewSummary.myScore} - {viewSummary.oppScore})
                </Text>

                <View style={styles.rowTwoCols}>
                  <View style={[styles.summaryBox, styles.bgGreenLight]}>
                    <Text style={[styles.summaryBoxTitle, styles.textGreen]}>
                      Tus Fortalezas
                    </Text>
                    {getSortedCategories(viewSummary.wonCategories).map(
                      ([lbl, cnt]: any) => (
                        <View key={lbl} style={styles.summaryRowItem}>
                          <Text style={styles.summaryLabel} numberOfLines={1}>
                            {lbl}
                          </Text>
                          <Text style={styles.summaryCount}>{cnt}</Text>
                        </View>
                      ),
                    )}
                  </View>

                  <View style={[styles.summaryBox, styles.bgRedLight]}>
                    <Text style={[styles.summaryBoxTitle, styles.textRed]}>
                      A Mejorar
                    </Text>
                    {getSortedCategories(viewSummary.lostCategories).map(
                      ([lbl, cnt]: any) => (
                        <View key={lbl} style={styles.summaryRowItem}>
                          <Text style={styles.summaryLabel} numberOfLines={1}>
                            {lbl}
                          </Text>
                          <Text style={styles.summaryCount}>{cnt}</Text>
                        </View>
                      ),
                    )}
                  </View>
                </View>
              </>
            )}
            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnBlue,
                { width: "100%", marginTop: 14 },
              ]}
              onPress={() => setViewingSetSummary(null)}
            >
              <Text style={styles.btnTextWhite}>Cerrar Resumen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Fin de Partido */}
      <Modal visible={showEndMatchModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalAlertBox}>
            <Ionicons name="trophy" size={54} color="#3b82f6" />
            <Text style={styles.modalAlertTitle}>¡Partido Finalizado!</Text>
            <Text style={styles.modalAlertSub}>
              Resultado Final: {mySetsWon} - {oppSetsWon}
            </Text>
            <TextInput
              style={[styles.textArea, { width: "100%", marginVertical: 14 }]}
              placeholder="Ej: He sacado mal, me costaba leer el efecto..."
              placeholderTextColor="#6b7280"
              value={deepNotes}
              onChangeText={setDeepNotes}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={[styles.btn, styles.btnBlue, { width: "100%" }]}
              onPress={executeCompleteMatch}
            >
              <Text style={styles.btnTextWhite}>
                Guardar Conclusiones y Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {renderEditRivalModal()}
    </SafeAreaView>
  );

  function renderEditRivalModal() {
    return (
      <Modal visible={editRivalModal} transparent animationType="slide">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalAlertBox}>
            <Text style={styles.modalAlertTitle}>
              Actualizar Datos del Rival
            </Text>
            <ScrollView
              style={{ width: "100%", maxHeight: 400 }}
              contentContainerStyle={{ gap: 12, paddingVertical: 10 }}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre Real</Text>
                <TextInput
                  style={styles.textInput}
                  value={editOppName}
                  onChangeText={setEditOppName}
                />
              </View>

              <View style={styles.rowTwoCols}>
                <View style={styles.colHalf}>
                  <Text style={styles.inputLabel}>Mano</Text>
                  <View style={styles.pillRow}>
                    {["Diestro", "Zurdo"].map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={[
                          styles.miniPill,
                          editOppHand === h && styles.pillActive,
                        ]}
                        onPress={() =>
                          setEditOppHand(editOppHand === h ? null : h)
                        }
                      >
                        <Text
                          style={[
                            styles.pillText,
                            editOppHand === h && styles.pillTextActive,
                          ]}
                        >
                          {h}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.inputLabel}>Estilo</Text>
                  <View style={styles.pillRow}>
                    {["Ofensivo", "Defensivo"].map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.miniPill,
                          editOppStyle === st && styles.pillActive,
                        ]}
                        onPress={() =>
                          setEditOppStyle(editOppStyle === st ? null : st)
                        }
                      >
                        <Text
                          style={[
                            styles.pillText,
                            editOppStyle === st && styles.pillTextActive,
                          ]}
                        >
                          {st}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nivel</Text>
                <View style={styles.pillRow}>
                  {["Peor", "Igual", "Mejor"].map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.miniPill,
                        editOppLevel === lvl && styles.pillActive,
                      ]}
                      onPress={() =>
                        setEditOppLevel(editOppLevel === lvl ? null : lvl)
                      }
                    >
                      <Text
                        style={[
                          styles.pillText,
                          editOppLevel === lvl && styles.pillTextActive,
                        ]}
                      >
                        {lvl}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Goma Derecha</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.rubbersScroll}
                >
                  {[
                    "LISA",
                    "PICOS_CORTOS",
                    "PICOS_MEDIOS",
                    "PICOS_LARGOS",
                    "ANTISPIN",
                  ].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.miniPill,
                        editOppRubberForehand === g && styles.pillActiveRed,
                      ]}
                      onPress={() =>
                        setEditOppRubberForehand(
                          editOppRubberForehand === g ? null : g,
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.pillText,
                          editOppRubberForehand === g && styles.pillTextActive,
                        ]}
                      >
                        {g.replace("_", " ")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Goma Revés</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.rubbersScroll}
                >
                  {[
                    "LISA",
                    "PICOS_CORTOS",
                    "PICOS_MEDIOS",
                    "PICOS_LARGOS",
                    "ANTISPIN",
                  ].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.miniPill,
                        editOppRubberBackhand === g && styles.pillActiveGray,
                      ]}
                      onPress={() =>
                        setEditOppRubberBackhand(
                          editOppRubberBackhand === g ? null : g,
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.pillText,
                          editOppRubberBackhand === g && styles.pillTextActive,
                        ]}
                      >
                        {g.replace("_", " ")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>

            <View style={[styles.modalActionsRow, { marginTop: 14 }]}>
              <TouchableOpacity
                style={[styles.btn, styles.btnRedLight]}
                onPress={() => setEditRivalModal(false)}
              >
                <Text style={styles.textRed}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnBlue]}
                onPress={handleUpdateRival}
              >
                <Text style={styles.btnTextWhite}>Guardar Cambios</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111827" },
  center: { justifyContent: "center", alignItems: "center" },
  scrollPad: { padding: 16, paddingBottom: 40, gap: 14 },
  rowAlign: { flexDirection: "row", alignItems: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  topBarTitle: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  backBtnText: { color: "#9ca3af", fontSize: 13, fontWeight: "600" },
  rivalHeaderTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  editIconBtn: { padding: 4 },
  undoBtn: {
    padding: 6,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: 8,
  },
  card: {
    backgroundColor: "#1f2937",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#374151",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  cardTitleRowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  setTabsScroll: { gap: 6 },
  setNumBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  setNumBtnActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  setNumBtnInactive: { backgroundColor: "#111827", borderColor: "#374151" },
  setNumBtnText: { fontSize: 12, fontWeight: "bold", color: "#9ca3af" },
  scoreTopActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  badgeGrayOutline: {
    borderWidth: 1,
    borderColor: "#4b5563",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeGrayText: { color: "#9ca3af", fontSize: 12, fontWeight: "bold" },
  badgeBlue: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeBlueText: { color: "#60a5fa", fontSize: 11, fontWeight: "bold" },
  bigScoreRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 30,
  },
  scoreCol: { alignItems: "center" },
  playerLabel: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  bigScoreNum: { fontSize: 60, fontWeight: "900" },
  setsDivider: { fontSize: 24, fontWeight: "900", color: "#4b5563" },
  setScoresRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#374151",
    paddingTop: 16,
    marginTop: 16,
  },
  setScoreBadge: { alignItems: "center", gap: 4 },
  setScoreLabel: { color: "#9ca3af", fontSize: 10, fontWeight: "bold" },
  setScorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  setScorePillText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  notesCard: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  notesTitle: {
    color: "#60a5fa",
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 6,
  },
  notesBody: { color: "#dbeafe", fontSize: 13, lineHeight: 18 },
  pointRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  pointSetText: { color: "#9ca3af", fontSize: 12, fontWeight: "600" },
  pointOrderText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginRight: 6,
  },
  badgePointType: {
    backgroundColor: "#374151",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePointTypeText: { color: "#d1d5db", fontSize: 11, fontWeight: "bold" },
  pointWinnerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pointWinnerText: { fontSize: 11, fontWeight: "bold" },
  pointDetailText: { color: "#d1d5db", fontSize: 12, flex: 1, marginLeft: 8 },
  pointDetailTextWhite: { color: "#fff", fontSize: 12, fontWeight: "500" },
  accordionCard: {
    backgroundColor: "#1f2937",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f59e0b",
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  accordionTitle: {
    color: "#f59e0b",
    fontWeight: "bold",
    fontSize: 13,
    marginLeft: 8,
  },
  accordionContent: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#374151",
    backgroundColor: "#111827",
  },
  planTextFormatted: { color: "#e5e7eb", fontSize: 13, lineHeight: 18 },
  counterBox: { flex: 1, alignItems: "center" },
  counterLabel: {
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  incDecRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
  },
  stepBtnText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  counterValue: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    minWidth: 24,
    textAlign: "center",
  },
  tanteoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  tanteoSetLabel: {
    color: "#9ca3af",
    width: 50,
    fontSize: 13,
    fontWeight: "600",
  },
  tanteoInput: {
    backgroundColor: "#111827",
    width: 60,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#374151",
    color: "#fff",
    textAlign: "center",
  },
  pillGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  checklistPill: {
    backgroundColor: "#111827",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },
  checklistPillGreen: { backgroundColor: "#065f46", borderColor: "#10b981" },
  checklistPillRed: { backgroundColor: "#7f1d1d", borderColor: "#ef4444" },
  checklistText: { color: "#9ca3af", fontSize: 12 },
  liveScoreRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 40,
  },
  bigLiveNum: { fontSize: 64, fontWeight: "900" },
  liveScoreDivider: { fontSize: 32, fontWeight: "900", color: "#4b5563" },
  bigPointButtonsRow: { flexDirection: "row", gap: 12 },
  giantBtn: {
    flex: 1,
    height: 120,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  giantBtnText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  nodesGrid: { gap: 8 },
  nodeBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  nodeBtnGreen: {
    borderColor: "#10b981",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  nodeBtnRed: {
    borderColor: "#ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  nodeBtnText: { fontWeight: "bold", fontSize: 14 },
  cancelTreeBtn: { alignItems: "center", marginTop: 12 },
  cancelTreeText: { color: "#9ca3af", fontSize: 12, fontWeight: "600" },
  emptySetText: { color: "#6b7280", textAlign: "center", marginVertical: 10 },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalAlertBox: {
    backgroundColor: "#1f2937",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#374151",
  },
  modalAlertTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 8,
  },
  modalAlertSub: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginVertical: 8,
  },
  summaryBox: { flex: 1, padding: 10, borderRadius: 8 },
  summaryBoxTitle: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  summaryRowItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryLabel: { fontSize: 11, color: "#e5e7eb", flex: 1 },
  summaryCount: { fontSize: 12, fontWeight: "bold", color: "#fff" },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 14,
  },
  inputLabel: {
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#111827",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    backgroundColor: "#111827",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
    color: "#fff",
    padding: 10,
    fontSize: 13,
    textAlignVertical: "top",
  },
  rowTwoCols: { flexDirection: "row", gap: 12, width: "100%" },
  colHalf: { flex: 1, gap: 6 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  miniPill: {
    backgroundColor: "#111827",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
    alignItems: "center",
  },
  rubbersScroll: { gap: 6, paddingVertical: 2 },
  pillActive: { backgroundColor: "#2563eb", borderColor: "#3b82f6" },
  pillActiveRed: { backgroundColor: "#991b1b", borderColor: "#ef4444" },
  pillActiveGray: { backgroundColor: "#374151", borderColor: "#9ca3af" },
  pillText: { color: "#9ca3af", fontSize: 12, fontWeight: "500" },
  pillTextActive: { color: "#fff", fontWeight: "bold" },
  actionRowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  rowStartControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  segmentedMini: {
    flexDirection: "row",
    backgroundColor: "#111827",
    borderRadius: 8,
    padding: 2,
  },
  miniSegment: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  miniSegmentActive: { backgroundColor: "#374151" },
  miniSegmentText: { fontSize: 11, color: "#9ca3af", fontWeight: "bold" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  btnBlue: { backgroundColor: "#3b82f6" },
  btnGreen: { backgroundColor: "#10b981" },
  btnOrangeLight: { backgroundColor: "rgba(245, 158, 11, 0.15)" },
  btnOrangeLightText: { color: "#f59e0b", fontWeight: "bold", fontSize: 13 },
  btnRedLight: { backgroundColor: "rgba(239, 68, 68, 0.15)" },
  btnDisabled: { opacity: 0.4 },
  btnTextWhite: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  helperText: {
    color: "#ef4444",
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
  },
  textGreen: { color: "#10b981" },
  textRed: { color: "#ef4444" },
  textGray: { color: "#6b7280" },
  textWhite: { color: "#fff" },
  bgGreen: { backgroundColor: "#10b981" },
  bgRed: { backgroundColor: "#ef4444" },
  bgGreenDark: { backgroundColor: "#065f46" },
  bgRedDark: { backgroundColor: "#7f1d1d" },
  bgGreenLight: { backgroundColor: "rgba(16, 185, 129, 0.15)" },
  bgRedLight: { backgroundColor: "rgba(239, 68, 68, 0.15)" },
  inputGroup: { gap: 6, width: "100%" },
});
