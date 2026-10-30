// src/constants/routes.ts

export const APP_ROUTES = {
  // Públicas y Setup
  HOME: '/',
  LOGIN: '/login',
  LEGAL: '/privacidad',
  SETUP_CLUB: '/setup-club',

  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  // Paneles Generales
  CLUB_SELECTION: '/club-selection',
  MI_CLUB: '/mi-club',
  ADMIN_PANEL: '/admin',
  PARTIDOS: '/historial',
  ESTADISTICAS: '/estadisticas',
  CALENTAMIENTO: '/calentamiento',
  JUEGOS_REFLEJO: {
    LIST: '/juegos-reflejo',
    PLAY_PATH: '/juegos-reflejo/:juego',
    PLAY: (slug: string) => `/juegos-reflejo/${slug}`,
  },

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
    EXCEL_CREATOR: '/torneos/crear-excel',
    DETAILS_PATH: '/torneos/:id', // 👈 Usado en App.tsx
    DETAILS: (id: string | number) => `/torneos/${id}`, // 👈 Usado en los navigate()
  },
  // Ligas
  LIGAS: {
    LIST: '/ligas',
    NEW: '/ligas/nueva',
    DETAILS_PATH: '/ligas/:id',
    DETAILS: (id: string | number) => `/ligas/${id}`,
  },
  EQUIPOS: {
    LIST: '/equipos',
    NEW: '/equipos/nuevo',
    DETAILS_PATH: '/equipos/:id',
    DETAILS: (id: string) => `/equipos/${id}`,
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
  ENTRENAMIENTOS_GENERALES: '/entrenamientos-generales',
  FEEDBACK: '/sugerencias',
  CALENDARIO: '/calendario',
} as const;
