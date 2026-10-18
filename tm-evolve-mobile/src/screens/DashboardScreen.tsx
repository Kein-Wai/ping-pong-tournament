import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../store/authStore";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Polygon, Line, Circle, Text as SvgText } from "react-native-svg";

const { width } = Dimensions.get("window");
const RADAR_SIZE = width - 64;
const CENTER = RADAR_SIZE / 2;
const RADIUS = CENTER - 35;

interface SkillItem {
  key: string;
  label: string;
  value: number;
}

// Mapeo de las 12 habilidades (JugadorPerfil.tsx)
const SKILL_KEYS = [
  { key: "topspinDerecha", label: "Top Der.", fullLabel: "Topspin Derecha" },
  { key: "topspinReves", label: "Top Rev.", fullLabel: "Topspin Revés" },
  { key: "derechaPlano", label: "Plano Der.", fullLabel: "Derecha Plana" },
  { key: "revesPlano", label: "Plano Rev.", fullLabel: "Revés Plano" },
  { key: "corte", label: "Corte", fullLabel: "Corte / Juego Corto" },
  { key: "bloqueoDerecha", label: "Bloq. Der.", fullLabel: "Bloqueo Derecha" },
  { key: "bloqueoReves", label: "Bloq. Rev.", fullLabel: "Bloqueo Revés" },
  { key: "servicio", label: "Servicio", fullLabel: "Servicio / Saque" },
  { key: "recepcion", label: "Recepción", fullLabel: "Resto / Recepción" },
  { key: "movilidad", label: "Movilidad", fullLabel: "Movilidad / Pies" },
  { key: "fortalezaMental", label: "Mental", fullLabel: "Fortaleza Mental" },
  {
    key: "experiencia",
    label: "Experiencia",
    fullLabel: "Experiencia Táctica",
  },
];

// Helper para embellecer los nombres del enum de gomas RubberType
const formatRubberName = (rubberType?: string | null) => {
  if (!rubberType) return null;
  const map: Record<string, string> = {
    LISA: "Lisa",
    PICOS_CORTOS: "Picos Cortos",
    PICOS_MEDIOS: "Picos Medios",
    PICOS_LARGOS: "Picos Largos",
    ANTISPIN: "Antispin",
  };
  return map[rubberType] || rubberType;
};

export default function DashboardScreen() {
  const { user, logout } = useAuthStore();

  const stats = Array.isArray(user?.stats) ? user.stats[0] : user?.stats;
  const skills = Array.isArray(user?.skills) ? user.skills[0] : user?.skills;

  const totalMatches =
    (stats?.matchWon || 0) +
    (stats?.matchLost || 0) +
    (stats?.manualMatchWon || 0) +
    (stats?.manualMatchLost || 0);
  const totalWins = (stats?.matchWon || 0) + (stats?.manualMatchWon || 0);
  const winRate =
    totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  const forehandRubber = formatRubberName(user?.rubberForehand);
  const backhandRubber = formatRubberName(user?.rubberBackhand);

  // Lista para las barras de progreso
  const skillList: SkillItem[] = SKILL_KEYS.map((item) => ({
    key: item.key,
    label: item.fullLabel,
    value: skills?.[item.key] || 0,
  }));

  const getSkillColor = (val: number) => {
    if (val >= 80) return "#10b981";
    if (val >= 60) return "#3b82f6";
    if (val >= 40) return "#8b5cf6";
    if (val >= 20) return "#f59e0b";
    return "#ef4444";
  };

  // Geometría del Radar SVG
  const radarGeometry = useMemo(() => {
    const angleStep = (Math.PI * 2) / SKILL_KEYS.length;

    const playerPoints = SKILL_KEYS.map((item, i) => {
      const val = Math.min(Math.max(skills?.[item.key] || 0, 0), 100);
      const r = (val / 100) * RADIUS;
      const angle = i * angleStep - Math.PI / 2;
      const x = CENTER + r * Math.cos(angle);
      const y = CENTER + r * Math.sin(angle);
      return { x, y, val };
    });

    const gridLevels = [0.25, 0.5, 0.75, 1].map((level) => {
      return SKILL_KEYS.map((_, i) => {
        const r = RADIUS * level;
        const angle = i * angleStep - Math.PI / 2;
        return `${CENTER + r * Math.cos(angle)},${CENTER + r * Math.sin(angle)}`;
      }).join(" ");
    });

    const labels = SKILL_KEYS.map((item, i) => {
      const r = RADIUS + 18;
      const angle = i * angleStep - Math.PI / 2;
      const x = CENTER + r * Math.cos(angle);
      const y = CENTER + r * Math.sin(angle);
      return { label: item.label, x, y };
    });

    const axes = SKILL_KEYS.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return {
        x2: CENTER + RADIUS * Math.cos(angle),
        y2: CENTER + RADIUS * Math.sin(angle),
      };
    });

    const polygonPoints = playerPoints.map((p) => `${p.x},${p.y}`).join(" ");

    return { playerPoints, gridLevels, labels, axes, polygonPoints };
  }, [skills]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. CABECERA Y TARJETA DEL USUARIO */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <Image
            source={{
              uri:
                user?.avatarUrl ||
                `https://api.dicebear.com/7.x/avataaars-neutral/png?seed=${user?.name || "PingPong"}`,
            }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>
              {user?.name} {user?.surname}
            </Text>
            <Text style={styles.level}>{user?.level || "Sin Clasificar"}</Text>

            {/* Badges de ELO y Estilo */}
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: "rgba(16, 185, 129, 0.2)",
                    borderColor: "#10b981",
                  },
                ]}
              >
                <Text style={[styles.badgeText, { color: "#10b981" }]}>
                  {stats?.elo || 500} ELO
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: "rgba(59, 130, 246, 0.2)",
                    borderColor: "#3b82f6",
                  },
                ]}
              >
                <Text style={[styles.badgeText, { color: "#3b82f6" }]}>
                  {user?.playstyle || "Ofensivo"}
                </Text>
              </View>
              {user?.dominantHand && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: "rgba(156, 163, 175, 0.2)",
                      borderColor: "#9ca3af",
                    },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: "#e5e7eb" }]}>
                    {user.dominantHand}
                  </Text>
                </View>
              )}
            </View>

            {/* Fila de Gomas de la Raqueta */}
            {(forehandRubber || backhandRubber) && (
              <View style={styles.rubbersRow}>
                {forehandRubber && (
                  <View style={styles.rubberTag}>
                    <View
                      style={[styles.colorDot, { backgroundColor: "#ef4444" }]}
                    />
                    <Text style={styles.rubberText}>Der: {forehandRubber}</Text>
                  </View>
                )}
                {backhandRubber && (
                  <View style={styles.rubberTag}>
                    <View
                      style={[
                        styles.colorDot,
                        {
                          backgroundColor: "#4b5563",
                          borderWidth: 1,
                          borderColor: "#9ca3af",
                        },
                      ]}
                    />
                    <Text style={styles.rubberText}>Rev: {backhandRubber}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* 2. KPIs GLOBALES */}
        <View style={styles.sectionHeader}>
          <Ionicons name="stats-chart" size={20} color="#3b82f6" />
          <Text style={styles.sectionTitle}>Rendimiento Global</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiContainer}
        >
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Win Rate</Text>
            <Text style={styles.kpiValue}>{winRate}%</Text>
            <Text style={styles.kpiSub}>Partidos totales</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Partidos</Text>
            <Text style={[styles.kpiValue, { color: "#10b981" }]}>
              {totalWins}{" "}
              <Text style={{ color: "#6b7280", fontSize: 16 }}>V</Text>
            </Text>
            <Text style={styles.kpiSub}>{totalMatches} Jugados</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Entrenos</Text>
            <Text style={[styles.kpiValue, { color: "#f59e0b" }]}>
              {stats?.manualMatchWon || 0}
            </Text>
            <Text style={styles.kpiSub}>Partidos manuales</Text>
          </View>
        </ScrollView>

        {/* 3. RADAR DE HABILIDADES */}
        <View style={styles.sectionHeader}>
          <Ionicons name="analytics" size={20} color="#8b5cf6" />
          <Text style={styles.sectionTitle}>Radar de Juego (12 Atributos)</Text>
        </View>

        <View style={styles.radarCard}>
          <Svg width={RADAR_SIZE} height={RADAR_SIZE}>
            {radarGeometry.gridLevels.map((points, idx) => (
              <Polygon
                key={idx}
                points={points}
                fill="none"
                stroke="#374151"
                strokeWidth={idx === 3 ? "1.5" : "0.8"}
              />
            ))}

            {radarGeometry.axes.map((axis, idx) => (
              <Line
                key={idx}
                x1={CENTER}
                y1={CENTER}
                x2={axis.x2}
                y2={axis.y2}
                stroke="#374151"
                strokeWidth="0.8"
              />
            ))}

            <Polygon
              points={radarGeometry.polygonPoints}
              fill="rgba(139, 92, 246, 0.35)"
              stroke="#8b5cf6"
              strokeWidth="2.5"
            />

            {radarGeometry.playerPoints.map((pt, idx) => (
              <Circle key={idx} cx={pt.x} cy={pt.y} r="3" fill="#a78bfa" />
            ))}

            {radarGeometry.labels.map((lbl, idx) => (
              <SvgText
                key={idx}
                x={lbl.x}
                y={lbl.y}
                fill="#9ca3af"
                fontSize="9"
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="central"
              >
                {lbl.label}
              </SvgText>
            ))}
          </Svg>
        </View>

        {/* 4. DESGLOSE EN BARRAS DE PROGRESO */}
        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <Ionicons name="fitness-outline" size={20} color="#8b5cf6" />
          <Text style={styles.sectionTitle}>Atributos en Detalle</Text>
        </View>

        <View style={styles.skillsCard}>
          {skillList.map((skill) => {
            const color = getSkillColor(skill.value);
            return (
              <View key={skill.key} style={styles.skillRow}>
                <View style={styles.skillHeader}>
                  <Text style={styles.skillLabel}>{skill.label}</Text>
                  <Text style={[styles.skillValue, { color }]}>
                    {Math.round(skill.value)}{" "}
                    <Text style={styles.skillMax}>/ 100</Text>
                  </Text>
                </View>

                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(Math.max(skill.value, 2), 100)}%`,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111827" },
  scrollContent: { padding: 24, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  logoutBtn: {
    padding: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 8,
  },

  profileCard: {
    flexDirection: "row",
    backgroundColor: "#1f2937",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#374151",
    marginBottom: 32,
    alignItems: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#374151",
  },
  profileInfo: { marginLeft: 16, flex: 1 },
  name: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  level: { fontSize: 14, color: "#9ca3af", marginBottom: 8 },
  badgeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "bold" },

  // Gomas de la raqueta
  rubbersRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    flexWrap: "wrap",
  },
  rubberTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111827",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  rubberText: { fontSize: 11, color: "#d1d5db", fontWeight: "500" },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 8,
  },

  kpiContainer: { gap: 12, marginBottom: 32 },
  kpiCard: {
    backgroundColor: "#1f2937",
    padding: 16,
    borderRadius: 12,
    width: 130,
    borderWidth: 1,
    borderColor: "#374151",
  },
  kpiLabel: {
    fontSize: 12,
    color: "#9ca3af",
    textTransform: "uppercase",
    fontWeight: "bold",
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  kpiSub: { fontSize: 12, color: "#6b7280" },

  radarCard: {
    backgroundColor: "#1f2937",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },

  skillsCard: {
    backgroundColor: "#1f2937",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#374151",
    gap: 16,
  },
  skillRow: { gap: 6 },
  skillHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skillLabel: { fontSize: 14, fontWeight: "600", color: "#e5e7eb" },
  skillValue: { fontSize: 14, fontWeight: "bold" },
  skillMax: { fontSize: 11, color: "#6b7280", fontWeight: "normal" },
  progressBarBackground: {
    height: 8,
    backgroundColor: "#374151",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 4 },
});
