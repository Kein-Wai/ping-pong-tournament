export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    GOOGLE: '/auth/google',
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`, // Corregido de /user/ a /users/ para coincidir con tus rutas express
    ME: '/users/me',
  },
  PLAYERS: {
    BASE: '/users',
  },
  CLUBS: {
    BASE: '/clubs',
    ADMIN_ALL: '/clubs/admin/all',
    BY_ID: (id: string) => `/clubs/${id}`,
    UPDATE: (id: string) => `/clubs/${id}`,
    JOIN: (clubId: string) => `/clubs/${clubId}/join`,
    MEMBERS: (clubId: string) => `/clubs/${clubId}/members`,
    MEMBER_STATUS: (clubId: string, userId: string) => `/clubs/${clubId}/members/${userId}/status`,
  },
  TOURNAMENTS: {
    BASE: '/tournaments',
    BY_ID: (id: string) => `/tournaments/${id}`,
    UPDATE: (id: string) => `/tournaments/${id}`,
    GENERATE_GROUPS: (id: string) => `/tournaments/${id}/generate-groups`,
    PARTICIPANTES: (id: string) => `/tournaments/${id}/participants`,
    UPDATE_PARTICIPANT_STATUS: (id: string, playerId: string) =>
      `/tournaments/${id}/participants/${playerId}/status`,
    GROUPMATCHES: (id: string) => `/tournaments/${id}/groups/matches`, // Ajustado a tus rutas express reales
    GROUPS: (id: string) => `/tournaments/${id}/groups/classifications`, // Ajustado a tus rutas express reales
    BRACKETS: (id: string) => `/tournaments/${id}/bracket`,
    CLASSIFICATION: (id: string) => `/tournaments/${id}/classifications`,
    REGISTER: (id: string) => `/tournaments/${id}/register`,
  },
  MATCHES: {
    BASE: '/matches',
    BY_ID: (id: string) => `/matches/${id}`,
  },
} as const;
