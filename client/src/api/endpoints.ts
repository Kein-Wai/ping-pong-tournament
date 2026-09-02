export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    GOOGLE: '/auth/google',
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
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
    DELETE: (id: string) => `/tournaments/${id}`,
    GENERATE_GROUPS: (id: string) => `/tournaments/${id}/generate-groups`,
    PARTICIPANTES: (id: string) => `/tournaments/${id}/participants`,
    UPDATE_PARTICIPANT_STATUS: (id: string, playerId: string) =>
      `/tournaments/${id}/participants/${playerId}/status`,
    GROUPMATCHES: (id: string) => `/tournaments/${id}/groups/matches`,
    GROUPS: (id: string) => `/tournaments/${id}/groups/classifications`,
    BRACKETS: (id: string) => `/tournaments/${id}/bracket`,
    CLASSIFICATION: (id: string) => `/tournaments/${id}/classifications`,
    REGISTER: (id: string) => `/tournaments/${id}/register`,
    ENROLLED: (playerId: string) => `/tournaments/player/${playerId}/enrolled`,
  },
  MATCHES: {
    BASE: '/matches',
    BY_ID: (id: string) => `/matches/${id}`,
  },
  EXERCISES: {
    BASE: '/exercises',
  },
  TRAININGS: {
    BASE: '/trainings',
    SESSIONS: (sessionId: string) => `/trainings/sessions/${sessionId}/exercises`,
    DELETE_EXERCISE: (sessionExerciseId: string) =>
      `/trainings/sessions/exercises/${sessionExerciseId}`,
    CLONE_SESSION: (targetId: string, sourceId: string) =>
      `/trainings/sessions/${targetId}/clone-from/${sourceId}`,
    BY_PLAYER: (playerId: string) => `/trainings/player/${playerId}`,
    UPDATE_EXERCISE: (sessionExerciseId: string) =>
      `/trainings/sessions/exercises/${sessionExerciseId}`,
    DELETE_PLAN: (planId: string) => `/trainings/${planId}`,
    SESSION_DETAILS: (sessionId: string) => `/trainings/sessions/${sessionId}`,
    UPCOMING: (playerId: string) => `/trainings/player/${playerId}/upcoming`,
  },
  MANUAL_MATCHES: {
    BASE: '/manual-matches',
    BY_ID: (id: string) => `/manual-matches/${id}`,
    UPDATE: (id: string) => `/manual-matches/${id}`,
    ADD_POINT: (id: string) => `/manual-matches/${id}/points`,
    DELETE_POINT: (id: string, pointId: string) => `/manual-matches/${id}/points/${pointId}`,
    COMPLETE: (id: string) => `/manual-matches/${id}/complete`,
  },
} as const;
