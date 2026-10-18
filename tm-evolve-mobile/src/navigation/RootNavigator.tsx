// src/navigation/RootNavigator.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../store/authStore";

import LoginScreen from "../screens/LoginScreen";
import MainTabNavigator from "./MainTabNavigator";
import ManualMatchTrackerScreen from "../screens/ManualMatchTrackerScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainApp" component={MainTabNavigator} />
          <Stack.Screen
            name="ManualMatchTracker"
            component={ManualMatchTrackerScreen}
            options={{ presentation: "card" }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
