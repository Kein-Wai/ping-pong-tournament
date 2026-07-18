export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    GOOGLE: '/auth/google',
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/user/${id}`,
  },
  PLAYERS: {
    BASE: '/users',
  },
  TOURNAMENTS: {
    BASE: '/tournaments',
    BY_ID: (id: string) => `/tournaments/${id}`,
    GENERATE_GROUPS: (id: string) => `/tournaments/${id}/generate-groups`,
    PARTICIPANTES: (id: string) => `/tournaments/${id}/participants`,
    GROUPMATCHES: (id: string) => `/tournaments/${id}/group/matches`,
    GROUPS: (id: string) => `/tournaments/${id}/group/classifications`,
    BRACKETS: (id: string) => `/tournaments/${id}/bracket`,
    CLASSIFICATION: (id: string) => `/tournaments/${id}/classifications`,
  },
  MATCHES: {
    BASE: '/matches',
  },
} as const;
