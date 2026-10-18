import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { useAuthStore } from "../store/authStore";

export default function DashboardScreen() {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Hola, {user?.name}</Text>
      <Text style={styles.subtitle}>
        Aquí irá tu radar de skills y estadísticas
      </Text>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff", marginBottom: 10 },
  subtitle: { fontSize: 16, color: "#9ca3af", marginBottom: 30 },
  logoutBtn: {
    borderColor: "#ef4444",
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
  },
  logoutText: { color: "#ef4444", fontWeight: "bold" },
});
