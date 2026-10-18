// src/navigation/MainTabNavigator.tsx
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import DashboardScreen from "../screens/DashboardScreen";
import TrainingsScreen from "../screens/TrainingsScreen";
import AnalisisListScreen from "../screens/AnalisisListScreen";
import GamesScreen from "../screens/GamesScreen";

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1f2937",
          borderTopColor: "#374151",
          paddingBottom: 5,
          height: 60,
        },
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "help-circle";

          if (route.name === "Inicio") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Entrenos") {
            iconName = focused ? "barbell" : "barbell-outline";
          } else if (route.name === "Tracker") {
            iconName = focused ? "analytics" : "analytics-outline";
          } else if (route.name === "Juegos") {
            iconName = focused ? "game-controller" : "game-controller-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={DashboardScreen} />
      <Tab.Screen name="Entrenos" component={TrainingsScreen} />
      <Tab.Screen name="Tracker" component={AnalisisListScreen} />
      <Tab.Screen name="Juegos" component={GamesScreen} />
    </Tab.Navigator>
  );
}
