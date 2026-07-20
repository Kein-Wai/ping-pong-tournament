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
} as const;
