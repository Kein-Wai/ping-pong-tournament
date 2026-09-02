// src/constants/routes.ts

export const APP_ROUTES = {
  // Públicas y Setup
  HOME: '/',
  LOGIN: '/login',
  SETUP_CLUB: '/setup-club',

  // Paneles Generales
  CLUB_SELECTION: '/club-selection',
  MI_CLUB: '/mi-club',
  ADMIN_PANEL: '/admin',
  PARTIDOS: '/historial',
  ESTADISTICAS: '/estadisticas',

  // Jugadores
  JUGADORES: {
    LIST: '/jugadores',
    PROFILE_PATH: '/jugadores/:id', // 👈 Usado en App.tsx
    PROFILE: (id: string | number) => `/jugadores/${id}`, // 👈 Usado en los navigate()
  },

  // Torneos
  TORNEOS: {
    LIST: '/torneos',
    NEW: '/torneos/nuevo',
    DETAILS_PATH: '/torneos/:id', // 👈 Usado en App.tsx
    DETAILS: (id: string | number) => `/torneos/${id}`, // 👈 Usado en los navigate()
  },
  EJERCICIOS: {
    LIST: '/ejercicios',
    NEW: '/ejercicios/nuevo',
  },
  ENTRENAMIENTOS: {
    NEW_PATH: '/jugadores/:playerId/plan-nuevo',
    NEW: (playerId: string) => `/jugadores/${playerId}/plan-nuevo`,

    DETAILS_PATH: '/entrenamientos/:planId',
    DETAILS: (planId: string) => `/entrenamientos/${planId}`,

    SESSION_PATH: '/entrenamientos/sesion/:sessionId',
    SESSION: (sessionId: string) => `/entrenamientos/sesion/${sessionId}`,
  },
  ANALISIS: {
    LIST: '/analisis',
    NEW: '/analisis/nuevo',
    TRACKER_PATH: '/analisis/tracker/:id',
    TRACKER: (id: string) => `/analisis/tracker/${id}`,
  },
} as const;
