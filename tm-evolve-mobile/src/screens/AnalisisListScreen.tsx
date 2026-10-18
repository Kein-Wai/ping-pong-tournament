import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/axios";
import { ENDPOINTS } from "../api/endpoints";

const ITEMS_PER_PAGE = 8;

const RUBBER_OPTIONS = [
  "LISA",
  "PICOS_CORTOS",
  "PICOS_MEDIOS",
  "PICOS_LARGOS",
  "ANTISPIN",
];
const LEVEL_OPTIONS = ["Peor", "Igual", "Mejor"];
const HAND_OPTIONS = ["Diestro", "Zurdo"];
const STYLE_OPTIONS = ["Ofensivo", "Defensivo"];
const MATCH_TYPE_OPTIONS = ["Amistoso", "Liga", "Competicion"];
const FORMAT_OPTIONS = ["Individual", "Equipos"];
const SETS_OPTIONS = [
  { value: "1", label: "1 Set Único (Sube y baja)" },
  { value: "2", label: "Mejor de 3 Sets (2 para ganar)" },
  { value: "3", label: "Mejor de 5 Sets (3 para ganar)" },
  { value: "4", label: "Mejor de 7 Sets (4 para ganar)" },
];

export default function AnalisisListScreen({ navigation }: any) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentSeason, setCurrentSeason] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"analisis" | "planes">("analisis");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Modal Nuevo Registro
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [initialStatus, setInitialStatus] = useState<string>("Programado");
  const [matchDate, setMatchDate] = useState<Date | null>(new Date());
  const [analysisType, setAnalysisType] = useState<string>("Rapido");
  const [opponentName, setOppName] = useState("");
  const [matchType, setMatchType] = useState("Amistoso");
  const [matchFormat, setMatchFormat] = useState("Individual");
  const [setsToWin, setSetsToWin] = useState("3");
  const [opponentLevel, setOpponentLevel] = useState<string | null>(null);
  const [opponentHand, setOpponentHand] = useState<string | null>(null);
  const [opponentStyle, setOpponentStyle] = useState<string | null>(null);
  const [opponentRubberForehand, setOpponentRubberForehand] = useState<
    string | null
  >(null);
  const [opponentRubberBackhand, setOpponentRubberBackhand] = useState<
    string | null
  >(null);

  const fetchMatchesAndSeason = async () => {
    try {
      const [matchesRes, seasonsRes] = await Promise.allSettled([
        api.get(ENDPOINTS.MANUAL_MATCHES.BASE),
        api.get(ENDPOINTS.SEASONS.BASE),
      ]);

      if (matchesRes.status === "fulfilled") {
        setMatches(matchesRes.value.data.data || matchesRes.value.data || []);
      }
      if (seasonsRes.status === "fulfilled") {
        const seasons =
          seasonsRes.value.data.data || seasonsRes.value.data || [];
        const activeS = seasons.find((s: any) => s.isCurrent);
        if (activeS) setCurrentSeason(activeS.name);
      }
    } catch (error) {
      console.error("Error cargando partidos y temporada:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMatchesAndSeason();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatchesAndSeason();
  };

  const handleStartMatch = async () => {
    setCreating(true);
    const finalOpponent =
      opponentName.trim() === "" ? "Rival por determinar" : opponentName.trim();

    try {
      const payload: any = {
        opponentName: finalOpponent,
        matchType,
        location: "Casa",
        format: matchFormat,
        analysisType: initialStatus === "Programado" ? "Rapido" : analysisType,
        opponentHand,
        opponentStyle,
        opponentLevel,
        opponentRubberForehand,
        opponentRubberBackhand,
        status: initialStatus,
        setsToWin: Number(setsToWin),
        date: matchDate ? matchDate.toISOString() : new Date().toISOString(),
      };

      const res = await api.post(ENDPOINTS.MANUAL_MATCHES.BASE, payload);
      const newMatch = res.data.data || res.data;

      setModalOpen(false);
      resetForm();
      await fetchMatchesAndSeason();

      navigation.navigate("ManualMatchTracker", { id: newMatch.id });
    } catch (error: any) {
      console.error(
        "Error creando partido:",
        error.response?.data || error.message,
      );
      console.log(error);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setOppName("");
    setInitialStatus("Programado");
    setMatchDate(new Date());
    setAnalysisType("Rapido");
    setMatchType("Amistoso");
    setMatchFormat("Individual");
    setSetsToWin("3");
    setOpponentLevel(null);
    setOpponentHand(null);
    setOpponentStyle(null);
    setOpponentRubberForehand(null);
    setOpponentRubberBackhand(null);
  };

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      const matchSearch = m.opponentName
        ?.toLowerCase()
        .includes(search.toLowerCase());
      const matchTab =
        activeTab === "planes"
          ? m.status === "Programado"
          : m.status !== "Programado";
      return matchSearch && matchTab;
    });
  }, [matches, search, activeTab]);

  const totalPages = Math.ceil(filteredMatches.length / ITEMS_PER_PAGE);
  const paginatedMatches = useMemo(() => {
    return filteredMatches.slice(
      (page - 1) * ITEMS_PER_PAGE,
      page * ITEMS_PER_PAGE,
    );
  }, [filteredMatches, page]);

  return (
    <SafeAreaView style={styles.container}>
      {/* CABECERA */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="analytics" size={24} color="#3b82f6" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Análisis y Planes</Text>
            {currentSeason ? (
              <View style={styles.seasonBadge}>
                <Text style={styles.seasonBadgeText}>{currentSeason}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={styles.newRegisterBtn}
          activeOpacity={0.8}
          onPress={() => setModalOpen(true)}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newRegisterBtnText}>Nuevo Registro</Text>
        </TouchableOpacity>
      </View>

      {/* TABS DE SELECCIÓN */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "analisis" && styles.activeTabButton,
          ]}
          onPress={() => {
            setActiveTab("analisis");
            setPage(1);
          }}
        >
          <Ionicons
            name="tennisball-outline"
            size={16}
            color={activeTab === "analisis" ? "#3b82f6" : "#9ca3af"}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "analisis" && styles.activeTabButtonText,
            ]}
          >
            Análisis y Resultados
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "planes" && styles.activeTabButtonOrange,
          ]}
          onPress={() => {
            setActiveTab("planes");
            setPage(1);
          }}
        >
          <Ionicons
            name="clipboard-outline"
            size={16}
            color={activeTab === "planes" ? "#f59e0b" : "#9ca3af"}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "planes" && styles.activeTabButtonTextOrange,
            ]}
          >
            Planificaciones Futuras
          </Text>
        </TouchableOpacity>
      </View>

      {/* BUSCADOR */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={18}
          color="#9ca3af"
          style={styles.searchIcon}
        />
        <TextInput
          placeholder="Buscar rival..."
          placeholderTextColor="#6b7280"
          value={search}
          onChangeText={(val) => {
            setSearch(val);
            setPage(1);
          }}
          style={styles.searchInput}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* LISTA DE PARTIDOS */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3b82f6"
            />
          }
        >
          {paginatedMatches.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name={
                  activeTab === "planes"
                    ? "clipboard-outline"
                    : "tennisball-outline"
                }
                size={44}
                color="#4b5563"
              />
              <Text style={styles.emptyText}>
                No hay {activeTab === "planes" ? "planificaciones" : "partidos"}{" "}
                registrados.
              </Text>
            </View>
          ) : (
            paginatedMatches.map((m) => {
              const isPlan = m.status === "Programado";
              const isCompleted = m.status === "Completado";

              const statusBg = isPlan
                ? "rgba(245, 158, 11, 0.15)"
                : isCompleted
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(59, 130, 246, 0.15)";
              const statusColor = isPlan
                ? "#f59e0b"
                : isCompleted
                  ? "#10b981"
                  : "#3b82f6";

              const buttonLabel = isCompleted
                ? "Ver Reporte"
                : isPlan
                  ? "Planificar / Jugar"
                  : "Continuar Arbitraje";

              return (
                <View
                  key={m.id}
                  style={[
                    styles.matchCard,
                    isPlan ? styles.cardBorderOrange : styles.cardBorderBlue,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderTitleRow}>
                      <Text style={styles.opponentTitle}>
                        vs {m.opponentName}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusBg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: statusColor },
                          ]}
                        >
                          {m.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardSubDetails}>
                      {m.date
                        ? new Date(m.date).toLocaleDateString("es-ES")
                        : "Sin fecha"}{" "}
                      · Formato: {m.format} · {m.matchType} ({m.analysisType})
                    </Text>
                  </View>

                  <View style={styles.cardActionRow}>
                    <TouchableOpacity
                      style={[
                        styles.cardActionButton,
                        isPlan ? styles.btnOrangeLight : styles.btnBlueLight,
                      ]}
                      onPress={() =>
                        navigation.navigate("ManualMatchTracker", { id: m.id })
                      }
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.cardActionButtonText,
                          { color: isPlan ? "#f59e0b" : "#3b82f6" },
                        ]}
                      >
                        {buttonLabel}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={isPlan ? "#f59e0b" : "#3b82f6"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          {totalPages > 1 && (
            <View style={styles.paginationRow}>
              <TouchableOpacity
                disabled={page <= 1}
                onPress={() => setPage((prev) => Math.max(prev - 1, 1))}
                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={page <= 1 ? "#4b5563" : "#fff"}
                />
              </TouchableOpacity>
              <Text style={styles.pageIndicator}>
                Página {page} de {totalPages}
              </Text>
              <TouchableOpacity
                disabled={page >= totalPages}
                onPress={() =>
                  setPage((prev) => Math.min(prev + 1, totalPages))
                }
                style={[
                  styles.pageBtn,
                  page >= totalPages && styles.pageBtnDisabled,
                ]}
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={page >= totalPages ? "#4b5563" : "#fff"}
                />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL: CONFIGURAR PARTIDO / PLAN */}
      <Modal visible={modalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTopBar}>
              <Text style={styles.modalTitle}>Configurar Partido / Plan</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScroll}
            >
              {/* SegmentedControl Modo */}
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    initialStatus === "Programado" &&
                      styles.segmentButtonActiveOrange,
                  ]}
                  onPress={() => setInitialStatus("Programado")}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      initialStatus === "Programado" &&
                        styles.segmentTextActive,
                    ]}
                  >
                    Planificar Pre-Partido
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    initialStatus === "Iniciado" &&
                      styles.segmentButtonActiveBlue,
                  ]}
                  onPress={() => setInitialStatus("Iniciado")}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      initialStatus === "Iniciado" && styles.segmentTextActive,
                    ]}
                  >
                    Empezar a Jugar Ya
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Fecha y Detalle */}
              <View style={styles.rowTwoCols}>
                <View style={styles.colHalf}>
                  <Text style={styles.inputLabel}>Fecha del Partido</Text>
                  <View style={styles.datePickerDisplay}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color="#9ca3af"
                    />
                    <Text style={styles.datePickerText}>
                      {matchDate
                        ? matchDate.toLocaleDateString("es-ES")
                        : "Hoy"}
                    </Text>
                  </View>
                </View>

                {initialStatus === "Iniciado" && (
                  <View style={styles.colHalf}>
                    <Text style={styles.inputLabel}>Nivel de Detalle *</Text>
                    <View style={styles.pillCol}>
                      <TouchableOpacity
                        style={[
                          styles.miniPill,
                          analysisType === "Rapido" && styles.pillActive,
                        ]}
                        onPress={() => setAnalysisType("Rapido")}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            analysisType === "Rapido" && styles.pillTextActive,
                          ]}
                        >
                          Rápido (Marcador global)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.miniPill,
                          analysisType === "Extenso" && styles.pillActive,
                        ]}
                        onPress={() => setAnalysisType("Extenso")}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            analysisType === "Extenso" && styles.pillTextActive,
                          ]}
                        >
                          Extenso (Punto a Punto)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Nombre del Rival */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Nombre del Rival {initialStatus === "Iniciado" && "*"}
                </Text>
                {initialStatus === "Programado" && (
                  <Text style={styles.inputDesc}>
                    Déjalo en blanco si aún no sabes contra quién juegas
                  </Text>
                )}
                <TextInput
                  placeholder="Ej: Juan Pérez"
                  placeholderTextColor="#6b7280"
                  value={opponentName}
                  onChangeText={setOppName}
                  style={styles.textInput}
                />
              </View>

              {/* Tipo de Partido y Formato */}
              <View style={styles.rowTwoCols}>
                <View style={styles.colHalf}>
                  <Text style={styles.inputLabel}>Tipo de Partido</Text>
                  <View style={styles.pillCol}>
                    {MATCH_TYPE_OPTIONS.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.miniPill,
                          matchType === t && styles.pillActive,
                        ]}
                        onPress={() => setMatchType(t)}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            matchType === t && styles.pillTextActive,
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.inputLabel}>Formato</Text>
                  <View style={styles.pillCol}>
                    {FORMAT_OPTIONS.map((f) => (
                      <TouchableOpacity
                        key={f}
                        style={[
                          styles.miniPill,
                          matchFormat === f && styles.pillActive,
                        ]}
                        onPress={() => setMatchFormat(f)}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            matchFormat === f && styles.pillTextActive,
                          ]}
                        >
                          {f}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Formato al mejor de... */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Formato al mejor de...</Text>
                <View style={styles.pillCol}>
                  {SETS_OPTIONS.map((s) => (
                    <TouchableOpacity
                      key={s.value}
                      style={[
                        styles.miniPill,
                        setsToWin === s.value && styles.pillActive,
                      ]}
                      onPress={() => setSetsToWin(s.value)}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          setsToWin === s.value && styles.pillTextActive,
                        ]}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Mano y Estilo */}
              <View style={styles.rowTwoCols}>
                <View style={styles.colHalf}>
                  <Text style={styles.inputLabel}>Mano del Rival</Text>
                  <View style={styles.pillRow}>
                    {HAND_OPTIONS.map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={[
                          styles.miniPill,
                          opponentHand === h && styles.pillActive,
                        ]}
                        onPress={() =>
                          setOpponentHand(opponentHand === h ? null : h)
                        }
                      >
                        <Text
                          style={[
                            styles.pillText,
                            opponentHand === h && styles.pillTextActive,
                          ]}
                        >
                          {h}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.inputLabel}>Estilo del Rival</Text>
                  <View style={styles.pillRow}>
                    {STYLE_OPTIONS.map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.miniPill,
                          opponentStyle === st && styles.pillActive,
                        ]}
                        onPress={() =>
                          setOpponentStyle(opponentStyle === st ? null : st)
                        }
                      >
                        <Text
                          style={[
                            styles.pillText,
                            opponentStyle === st && styles.pillTextActive,
                          ]}
                        >
                          {st}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Nivel del Rival */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nivel del Rival</Text>
                <View style={styles.pillRow}>
                  {LEVEL_OPTIONS.map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.miniPill,
                        opponentLevel === lvl && styles.pillActive,
                      ]}
                      onPress={() =>
                        setOpponentLevel(opponentLevel === lvl ? null : lvl)
                      }
                    >
                      <Text
                        style={[
                          styles.pillText,
                          opponentLevel === lvl && styles.pillTextActive,
                        ]}
                      >
                        {lvl}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Goma Derecha */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Goma Derecha</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.rubbersScroll}
                >
                  {RUBBER_OPTIONS.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.miniPill,
                        opponentRubberForehand === g && styles.pillActiveRed,
                      ]}
                      onPress={() =>
                        setOpponentRubberForehand(
                          opponentRubberForehand === g ? null : g,
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.pillText,
                          opponentRubberForehand === g && styles.pillTextActive,
                        ]}
                      >
                        {g.replace("_", " ")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Goma Revés */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Goma Revés</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.rubbersScroll}
                >
                  {RUBBER_OPTIONS.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.miniPill,
                        opponentRubberBackhand === g && styles.pillActiveGray,
                      ]}
                      onPress={() =>
                        setOpponentRubberBackhand(
                          opponentRubberBackhand === g ? null : g,
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.pillText,
                          opponentRubberBackhand === g && styles.pillTextActive,
                        ]}
                      >
                        {g.replace("_", " ")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Botón Acción */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  initialStatus === "Programado"
                    ? styles.btnOrange
                    : styles.btnBlue,
                  initialStatus === "Iniciado" &&
                    !opponentName.trim() &&
                    styles.submitBtnDisabled,
                ]}
                disabled={
                  (initialStatus === "Iniciado" && !opponentName.trim()) ||
                  creating
                }
                onPress={handleStartMatch}
                activeOpacity={0.85}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {initialStatus === "Programado"
                      ? "Crear Plan General"
                      : "Ir a la mesa"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111827" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  seasonBadge: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  seasonBadgeText: { color: "#c084fc", fontSize: 11, fontWeight: "700" },
  newRegisterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  newRegisterBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#1f2937",
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "#374151",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  activeTabButtonOrange: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  tabButtonText: { fontSize: 12, fontWeight: "600", color: "#9ca3af" },
  activeTabButtonText: { color: "#60a5fa", fontWeight: "bold" },
  activeTabButtonTextOrange: { color: "#fbbf24", fontWeight: "bold" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f2937",
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
    height: 42,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollList: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 6 },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  matchCard: {
    backgroundColor: "#1f2937",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#374151",
  },
  cardBorderBlue: { borderLeftWidth: 5, borderLeftColor: "#3b82f6" },
  cardBorderOrange: { borderLeftWidth: 5, borderLeftColor: "#f59e0b" },
  cardHeader: { marginBottom: 12 },
  cardHeaderTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  opponentTitle: { fontSize: 17, fontWeight: "bold", color: "#fff" },
  cardSubDetails: { color: "#9ca3af", fontSize: 12, marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: "bold" },
  cardActionRow: {
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#374151",
    paddingTop: 10,
  },
  cardActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  btnBlueLight: { backgroundColor: "rgba(59, 130, 246, 0.15)" },
  btnOrangeLight: { backgroundColor: "rgba(245, 158, 11, 0.15)" },
  cardActionButtonText: { fontSize: 13, fontWeight: "700" },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 16,
  },
  pageBtn: { backgroundColor: "#374151", padding: 8, borderRadius: 8 },
  pageBtnDisabled: { opacity: 0.3 },
  pageIndicator: { color: "#9ca3af", fontSize: 13, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1f2937",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingBottom: 24,
  },
  modalTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  modalScroll: { padding: 20, gap: 16 },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#111827",
    borderRadius: 10,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentButtonActiveBlue: { backgroundColor: "#3b82f6" },
  segmentButtonActiveOrange: { backgroundColor: "#f59e0b" },
  segmentText: { color: "#9ca3af", fontSize: 13, fontWeight: "600" },
  segmentTextActive: { color: "#fff", fontWeight: "bold" },
  inputGroup: { gap: 6 },
  inputLabel: { color: "#e5e7eb", fontSize: 13, fontWeight: "600" },
  inputDesc: { color: "#9ca3af", fontSize: 11 },
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
  datePickerDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#111827",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  datePickerText: { color: "#fff", fontSize: 14 },
  rowTwoCols: { flexDirection: "row", gap: 12 },
  colHalf: { flex: 1, gap: 6 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pillCol: { gap: 6 },
  miniPill: {
    backgroundColor: "#111827",
    paddingVertical: 7,
    paddingHorizontal: 12,
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
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  btnBlue: { backgroundColor: "#3b82f6" },
  btnOrange: { backgroundColor: "#f59e0b" },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
});
