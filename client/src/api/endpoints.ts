export const ENDPOINTS = {
  SEASONS: {
    BASE: '/seasons',
  },
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    GOOGLE: '/auth/google',

    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    ME: '/users/me',
    CREATE_GUEST: '/users/guest',
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
    NOTIFICATIONS: (id: string) => `/clubs/${id}/notifications`,
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
    REGISTER_BULK: (id: string) => `/tournaments/${id}/register-bulk`,
    ENROLLED: (playerId: string) => `/tournaments/player/${playerId}/enrolled`,
    SWAP_PLAYERS: (id: string) => `/tournaments/${id}/swap-players`,
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
  GENERAL_TRAININGS: {
    BASE: '/general-trainings',
    SCHEDULES: '/general-trainings/schedules',
    BULK_ATTENDANCE: (id: string) => `/general-trainings/${id}/attendance/bulk`,
  },
  MANUAL_MATCHES: {
    BASE: '/manual-matches',
    BY_ID: (id: string) => `/manual-matches/${id}`,
    UPDATE: (id: string) => `/manual-matches/${id}`,
    ADD_POINT: (id: string) => `/manual-matches/${id}/points`,
    DELETE_POINT: (id: string, pointId: string) => `/manual-matches/${id}/points/${pointId}`,
    COMPLETE: (id: string) => `/manual-matches/${id}/complete`,
  },
  SKILLS: {
    BASE: '/skills',
    CONSOLIDATE: (playerId: string) => `/skills/${playerId}/consolidate`,
  },
  TEAMS: {
    BASE: '/teams',
    BY_CLUB: (clubId: string) => `/teams/club/${clubId}`,
    UPDATE: (teamId: string) => `/teams/${teamId}`,
    UPDATE_PLAYERS: (teamId: string) => `/teams/${teamId}/players`,
    MATCHES: (teamId: string) => `/teams/${teamId}/matches`,
    DELETE: (teamId: string) => `/teams/${teamId}`,
    UPDATE_MATCH: (matchId: string) => `/teams/matches/${matchId}`,
    DELETE_MATCH: (matchId: string) => `/teams/matches/${matchId}`,
    TOGGLE_AVAILABILITY: (matchId: string) => `/teams/matches/${matchId}/availability`,
  },
  FEEDBACK: {
    BASE: '/feedback',
    UPDATE_STATUS: (id: string) => `/feedback/${id}/status`,
  },
  EVENTS: {
    BASE: '/events',
    BY_CLUB: (clubId: string) => `/events/club/${clubId}`,
    UPDATE: (id: string) => `/events/${id}`,
    REMINDERS: (id: string) => `/events/${id}/reminders`,
  },
} as const;
