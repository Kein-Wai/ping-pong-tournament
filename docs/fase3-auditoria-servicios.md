# Fase 3 · Tarea 3.0a: auditoría de `api/services/*` frente a las llamadas directas

Auditoría del 2026-10-25 sobre el commit `a70bd78`. No cambia código: es la base de las tareas 3.0b a 3.19 de `docs/plan-refactor-client.md`.

Método: lectura de los 13 módulos de `client/src/api/services/*`, de `endpoints.ts` y de cada llamada `api.get/post/put/delete` del cliente (método, URL, cuerpo y cómo se lee la respuesta). Los contratos de la API se han comprobado en `api/src/routes/auth.ts` y `api/src/routes/tournament/commands.ts`. El recuento es manual y aproximado en las cifras globales; cada tarea 3.x lo vuelve a confirmar con su propio test.

## 1. Resumen

- **≈99 llamadas directas** a `api` en **33 ficheros**: 28 pantallas, `MainLayout`, `store/authStore` y 3 hooks (`useTorneoFormato`, `useTorneoInscripcion`, `useTorneoPartido`).
- Equivalen a **73 operaciones distintas** (método + endpoint). Frente a los servicios actuales:
  - **44 ✅ cubiertas** por un método de servicio que coincide con lo que hace la pantalla.
  - **20 ⚠️ con discrepancia**: el servicio existe, pero difiere en método, cuerpo o tipo de respuesta.
  - **9 ❌ sin servicio**.
- **Solo `tournamentsService` y `trainingsService`/`exercisesService` tienen consumidores reales**: `useTournamentDetails`, `useTorneoAcciones`, `useTorneoIntercambio` y `useTrainingPlan`. Los otros 11 módulos no los importa ningún código de producción. Han sido escritos sin una pantalla que los ejerza, y por eso 20 de sus operaciones no coinciden con la realidad.

## 2. Hallazgos que cambian el plan

1. **Los servicios no son fiables tal cual.** Migrar una pantalla a un método que "parece el mismo" rompería la pantalla (ver sección 4). Cada servicio se corrige con test antes de usarlo.
2. **Contrato de la API con excepciones al sobre `{ success, data }`** (sección 5): `POST /tournaments` devuelve `{ message, tournament }`, `POST /auth/login` y `/auth/google` devuelven `{ message, token }` y `POST /auth/register` solo `{ message }`. El adaptador `http` solo funciona con ellas porque no incluyen la clave `success`.
3. **`PlanDetalles` tiene una implementación paralela sin uso.** Existen `hooks/useTrainingPlan.ts` (con test), `hooks/useApi.ts` (con test) y `components/training/{AddExerciseModal,CloneSessionModal,PlanSessionCard}.tsx`, pero `pages/Entrenamientos/PlanDetalles.tsx` no los usa: repite la misma lógica con `api.*`. La 3.14 no es "migrar a servicios", sino **adoptar esos módulos o borrarlos**.
4. **El plan omite consumidores**: `Ejercicios`, `EjercicioNuevo`, `Equipos`, `EquipoNuevo`, `ClubSetup`, `ForgotPassword`, `PlanNuevo`, `store/authStore` y los hooks `useTorneoFormato`, `useTorneoInscripcion` y `useTorneoPartido`. Sin tareas, el cierre 3.19 (solo quedan las de la Fase 4) no se cumpliría.
5. **La 3.5 no tiene nada que migrar**: `WidgetTorneos`, `WidgetEntrenamientos` y `PodioHonor` no llaman a `api`.
6. **Riesgo de ciclo de importación** al migrar `authStore.fetchProfile`: `api/axios` importa `authStore`, así que si `authStore` importa un servicio (`client.ts` → `axios`) se cierra el ciclo `axios → authStore → servicio → client → axios`.
7. **`ENDPOINTS` incompleto**: varias URLs se componen a mano (`${SCHEDULES}/${id}`, `${EVENTS.BASE}/${id}`, `${TRAININGS.BASE}/${planId}`, `?category=`) y `PLAYERS.BASE` duplica `USERS.BASE`. La regla del proyecto es declarar la URL primero.

## 3. Operaciones por dominio

Estado: ✅ el servicio coincide · ⚠️ existe pero difiere · ❌ falta. "Consumidores" son los ficheros que llaman hoy directamente. Los métodos HTTP de `bulkAttendance`, `consolidate`, `toggleAvailability` y los recordatorios de eventos están contrastados con las rutas de la API (ver sección 6).

### Autenticación

| Operación | Consumidores | Servicio | Estado |
|---|---|---|---|
| `POST /auth/login` `{email,password}` | Login | `authService.login` | ✅ lee `token` sin sobre |
| `POST /auth/register` | Login | `authService.register` | ⚠️ la pantalla envía además `confirmPassword`, `secondSurname` y `role`; la API responde solo `{message}` y el servicio promete `AuthResult` |
| `POST /auth/google` `{credential, role}` | Login (web y nativo) | `loginWithGoogle(credential)` | ⚠️ falta `role` |
| `POST /auth/forgot-password` | ForgotPassword, Jugadores | `forgotPassword` | ✅ |
| `POST /auth/reset-password` | ResetPassword | `resetPassword(token, password)` | ⚠️ envía `{token,password}`; la pantalla envía `{token,newPassword,confirmPassword}` |

### Usuarios

| Operación | Consumidores | Servicio | Estado |
|---|---|---|---|
| `GET /users` | Jugadores (vía `PLAYERS.BASE`), Estadisticas, EquipoDetalles, EntrenamientosGenerales, useTorneoInscripcion | `usersService.list` | ✅ |
| `GET /users/:id` | JugadorPerfil, Dashboard | `byId` | ✅ |
| `GET /users/me` | authStore | `me` | ✅ (ver ciclo, hallazgo 6) |
| `POST /users` | Jugadores | `create` | ⚠️ falta `rubberForehand/Backhand`, `elo`, `skills` |
| `POST /users/guest` | Jugadores | `createGuest` | ⚠️ la pantalla envía `level`, mano, estilo, gomas, `elo` y `skills` |
| `PUT /users/:id` | Jugadores (`{elo}`, `{email}`), JugadorPerfil (perfil completo) | `update` | ⚠️ el tipo no admite `elo`, `email` ni `skills` |
| `PUT /users/me` | JugadorPerfil, MainLayout ×2 | `updateProfile` | ⚠️ faltan contraseñas (`currentPassword`, `newPassword`, `confirmPassword`) y `skills` |

### Clubes

| Operación | Consumidores | Servicio | Estado |
|---|---|---|---|
| `GET /clubs` | ClubSelection | `list` | ✅ |
| `GET /clubs/admin/all` | AdminPanel | `adminList` | ✅ |
| `GET /clubs/:id` | MiClub, Dashboard | `byId` | ✅ |
| `POST /clubs` | ClubSetup (lee `success` y `data.id`) | `create` | ✅ |
| `PUT /clubs/:id` | AdminPanel (`{status}`), MiClub | `update` | ⚠️ `ClubPayload` no admite `null` en `address/foundedAt/logoUrl` |
| `POST /clubs/:id/join` | ClubSelection (lee `success`) | `join` | ✅ (el éxito pasa a ser "no lanza", no `success`) |
| `PUT /clubs/:id/members/:uid/status` | Jugadores ×2, JugadorPerfil | `updateMemberStatus` | ⚠️ la aprobación envía además `level`, `elo` y `skills` |
| `GET /clubs/:id/notifications` | MainLayout | `notifications` | ⚠️ tipado `unknown[]`; la pantalla recibe un objeto `{pendingPlayers, pendingTournaments}` |

### Torneos y partidos

| Operación | Consumidores | Servicio | Estado |
|---|---|---|---|
| `GET /tournaments` | Torneos | `list` | ✅ |
| `POST /tournaments` | TorneoNuevo (lee `response.data.tournament`) | `create` | ⚠️ la API devuelve `{message, tournament}` y el servicio promete `Tournament` (sección 5) |
| `PUT /tournaments/:id` | useTorneoFormato | `update` | ✅ |
| `POST /tournaments/generate-excel` (blob) | ExcelTournamentCreator | `generateExcel` | ✅ |
| `POST /tournaments/:id/register` | useTorneoInscripcion | `register` | ⚠️ la pantalla envía además `registeredAt` y `status` |
| `POST /tournaments/:id/register-bulk` | useTorneoInscripcion | `registerBulk` | ✅ |
| `GET /matches` | Partidos, JugadorPerfil, Estadisticas | `matchesService.list` | ✅ |
| `PUT /matches/:id` | useTorneoPartido | `matchesService.update` | ✅ |
| `GET /seasons` | Dashboard, JugadorPerfil, Equipos, AnalisisList | `seasonsService.list` / `current` | ✅ |

### Entrenamientos y ejercicios

| Operación | Consumidores | Servicio | Estado |
|---|---|---|---|
| `GET /trainings/player/:id` | JugadorPerfil | `byPlayer` | ✅ |
| `GET /trainings/:id` | PlanDetalles | `planById` | ✅ (usa `DELETE_PLAN`: nombre engañoso) |
| `POST /trainings` | PlanNuevo (lee `data.id`) | `createPlan` | ✅ |
| `DELETE /trainings/:id` | JugadorPerfil | `deletePlan` | ✅ |
| `GET /trainings/sessions/:id` | SessionDetalles | `sessionDetails` | ✅ |
| `PUT /trainings/sessions/exercises/:id` | SessionDetalles (`{completed}`, `{notes}`) | `updateExercise` | ⚠️ el tipo no admite `completed` |
| `POST /trainings/sessions/:id/exercises` | PlanDetalles | `addExercise` | ✅ |
| `POST /trainings/sessions/:t/clone-from/:s` | PlanDetalles | `cloneSession` | ✅ |
| `DELETE /trainings/sessions/exercises/:id` | PlanDetalles | `deleteExercise` | ✅ |
| `GET /exercises` (`?category=`) | Ejercicios, PlanDetalles | `exercisesService.list` | ⚠️ sin filtro de categoría |
| `POST /exercises` | EjercicioNuevo | `exercisesService.create` | ⚠️ falta `code` |
| `GET /general-trainings` | EntrenamientosGenerales, Estadisticas | `list` | ✅ |
| `GET /general-trainings/schedules` | EntrenamientosGenerales | `schedules` | ✅ |
| `POST /general-trainings` | EntrenamientosGenerales | `create` | ✅ |
| `PUT /general-trainings/:id/attendance/bulk` | EntrenamientosGenerales | `bulkAttendance` | ⚠️ el servicio usa **POST**, la pantalla **PUT** |
| `POST /general-trainings/schedules` | EntrenamientosGenerales | — | ❌ |
| `PUT /general-trainings/schedules/:id` | EntrenamientosGenerales | — | ❌ (URL compuesta a mano) |
| `DELETE /general-trainings/schedules/:id` | EntrenamientosGenerales | — | ❌ (URL compuesta a mano) |

### Análisis manual y habilidades

| Operación | Consumidores | Servicio | Estado |
|---|---|---|---|
| `GET /manual-matches` | AnalisisList | `list` | ✅ |
| `GET /manual-matches/:id` | ManualMatchTracker | `byId` | ✅ |
| `POST /manual-matches` | AnalisisList (lee `data.id`) | `create` | ✅ (el tipo `Partial<ManualMatch>` no incluye `analysisType`) |
| `PUT /manual-matches/:id` | ManualMatchTracker ×3 | `update` | ✅ |
| `POST /manual-matches/:id/points` | ManualMatchTracker (lee `data` del punto) | `addPoint` | ⚠️ la pantalla envía `setNumber`, `pointOrder`, `isWon`…; el payload tipado no los tiene |
| `DELETE /manual-matches/:id/points/:pid` | ManualMatchTracker | `deletePoint` | ✅ |
| `PUT /manual-matches/:id/complete` | ManualMatchTracker | `complete(id)` | ⚠️ la pantalla envía `{mySets, opponentSets, lightNotes, setScores}` |
| `PUT /skills/:playerId/consolidate` | JugadorPerfil (cuerpo: las habilidades) | `skillsService.consolidate` | ⚠️ el servicio usa **POST sin cuerpo** |

### Equipos, eventos y feedback

| Operación | Consumidores | Servicio | Estado |
|---|---|---|---|
| `GET /teams/club/:clubId` | Dashboard, Equipos, EquipoDetalles | `byClub` | ✅ |
| `POST /teams` | EquipoNuevo | — | ❌ |
| `PUT /teams/:id` | EquipoDetalles | `update` | ✅ |
| `PUT /teams/:id/players` | EquipoDetalles | `updatePlayers` | ✅ |
| `POST /teams/:id/matches` | EquipoDetalles | — | ❌ (`teamsService.matches` es un GET) |
| `DELETE /teams/:id` | EquipoDetalles | `remove` | ✅ |
| `PUT /teams/matches/:id` | EquipoDetalles | `updateMatch` | ✅ |
| `DELETE /teams/matches/:id` | EquipoDetalles | `deleteMatch` | ✅ |
| `POST /teams/matches/:id/availability` | EquipoDetalles | `toggleAvailability` | ⚠️ el servicio usa **PUT**, la pantalla **POST** |
| `GET /events/club/:clubId` | CalendarioEventos | `byClub` | ✅ |
| `POST /events` | CalendarioEventos | — | ❌ |
| `PUT /events/:id` | CalendarioEventos | `update` | ✅ |
| `DELETE /events/:id` | CalendarioEventos | — | ❌ (URL compuesta a mano) |
| `POST /events/:id/reminders` | CalendarioEventos | — | ❌ (`eventsService.reminders` es un GET) |
| `DELETE /events/:id/reminders` | CalendarioEventos | — | ❌ |
| `GET/POST/PUT /feedback` | FeedbackPage | `feedbackService` | ✅ |

## 4. Defectos de los servicios actuales (sin consumidor)

- `trainingsService.createSession` hace `POST /trainings`, la misma URL que `createPlan`: casi seguro un error.
- `teamsService.players(teamId)` llama a `TEAMS.BY_CLUB(teamId)`: pasa un id de equipo donde va un id de club.
- `usersService.resetPassword` envía `{ password: '' }`: la pantalla real usa `POST /auth/forgot-password`.
- Sin ningún uso: `trainingsService.upcoming`, `tournamentsService.enrolledByPlayer`, `clubsService.members`, `matchesService.byId`. Por la prueba de borrado, son candidatas a eliminarse si ninguna tarea posterior las necesita.

## 5. Excepciones al contrato de la API

`.clinerules` (sección 7) fija `{ success, data?, error?, details?, message? }` y prohíbe un cuarto formato. Hoy hay respuestas fuera del sobre:

| Endpoint | Respuesta real | Cómo la lee la pantalla |
|---|---|---|
| `POST /auth/login` | `{ message, token }` | `response.data.token` |
| `POST /auth/google` | `{ message?, token }` | `response.data.token` |
| `POST /auth/register` | `{ message }` | no la lee |
| `POST /tournaments` | `{ message, tournament }` | `response.data.tournament.id` |

`http.unwrap` devuelve el cuerpo entero cuando no existe la clave `success`, así que estos casos funcionan **por casualidad**. Si algún día la API añade `success: true` sin `data`, `unwrap` devolverá `undefined`.

**Decisión propuesta:** no cambiar la API ahora (queda para la pasada de seguridad y contrato de toda la API ya anotada) y tipar los servicios según la respuesta real (`AuthResult` solo con `token`, `CreateTournamentResult = { message, tournament }`), con un test de contrato que fije cada forma.

## Seguimiento de la 3.0b

| Subtarea | Estado | Resultado |
|---|---|---|
| 3.0b(a) auth + users | **Hecha** (sin commitear) | 7 ⚠️ corregidos: `register`, `loginWithGoogle`, `resetPassword`, `create`, `createGuest`, `update`, `updateProfile`. Tests nuevos `auth.test.ts` (7) y `users.test.ts` (12), escritos en rojo antes de la implementación. Los tipos reflejan los esquemas Zod de la API y las respuestas reales sin sobre (`AuthResult = { message, token }`, `MessageResult = { message }`). Eliminado `usersService.resetPassword` (huérfano y erróneo: el reseteo es de `authService`). Se quita `clubId` de `CreateGuestPayload`: la API lo toma del token. |
| 3.0b(b) clubs + tournaments + manualMatches + skills | **Hecha** (sin commitear) | 8 ⚠️ corregidos: `clubs.update`, `updateMemberStatus` (ahora recibe un payload con nivel, ELO y habilidades), `notifications`; `tournaments.create` y `register` (devuelven `{message, tournament}` y `{message, participant}`, sin sobre); `manualMatches.addPoint` y `complete` (con cuerpo); `skills.consolidate` (ahora **PUT** con las habilidades). Además se corrigieron tipos de respuesta que la tabla daba por buenos: `clubs.list` devuelve `ClubListItem[]`, `adminList` `ClubAdminData[]`, `byId` `ClubDetails`; `join`, `updateMemberStatus`, `registerBulk` y `updateParticipantStatus` no devuelven datos. Nuevos tipos en `types/api.ts` (`ClubListItem`, `ClubAdminData`, `ClubDetails`, `ClubNotifications`, `SkillValues`); `ClubSelection`, `AdminPanel` y `MiClub` los adoptarán en sus tareas 3.12, 3.10 y 3.11. Eliminados los huérfanos `clubsService.members` y `tournamentsService.enrolledByPlayer`. Tests nuevos: `clubs.test.ts` (13), `tournaments.test.ts` (16), `manualMatches.test.ts` (12) y `skills.test.ts` (2), todos escritos en rojo antes. `CreateTournamentPayload` pierde `clubId` (la API lo toma del token). |
| 3.0b(c) trainings/exercises + generalTrainings | **Hecha** (sin commitear) | 4 ⚠️ corregidos y 3 ❌ cubiertos: `trainings.updateExercise` (el cuerpo real es `{completed?, notes?}`), `exercises.list(category?)` (filtra con `?category=`), `exercises.create` (con `category` obligatoria y `code`), `generalTrainings.bulkAttendance` (ahora **PUT**), y `createSchedule`, `updateSchedule`, `deleteSchedule` (nuevos). Además: `createPlan` exige `strengths`, `weaknesses` y `objectives` (la API los pide con mínimo de 3 caracteres); `cloneSession` y `generalTrainings.create` no devuelven datos (la API solo manda un mensaje); `GeneralTrainingSchedule` en `types/api.ts` tenía un campo `dayOfWeek` que no existe y ahora refleja `name` y `daysOfWeek`. Eliminados `trainingsService.createSession` (apuntaba a `POST /trainings`, que crea un plan; la ruta real es `POST /trainings/sessions`, sin uso) y `upcoming` (sin uso). Nuevas rutas en `ENDPOINTS`: `TRAININGS.PLAN_BY_ID` y `GENERAL_TRAININGS.SCHEDULE_BY_ID` (`DELETE_PLAN` se mantiene como alias hasta que las pantallas migren). Tests nuevos: `trainings.test.ts` (16, incluye `exercisesService`) y `generalTrainings.test.ts` (7), escritos en rojo antes. |
| 3.0b(d) teams + events | **Hecha** (sin commitear) | 1 ⚠️ corregido y 6 ❌ cubiertos: `teams.toggleAvailability` (ahora **POST**), `teams.create`, `teams.createMatch`, `events.create`, `events.remove`, `events.addReminder` y `events.removeReminder` (reemplaza a `reminders`, un GET que la API no tiene). Eliminados `teamsService.matches` (la API no tiene `GET /teams/:id/matches`) y `teamsService.players` (pasaba un id de equipo donde va un id de club). `teams.byClub` devuelve ahora `ClubTeam[]` (plantilla y calendario con asistencias); nuevos tipos `ClubTeam`, `TeamMatch`, `TeamMatchAvailability`, `TeamPlayer` y `TeamMatchStatus` en `types/api.ts`, y `ClubEvent.region` usa el enum `EventRegion`. Nueva ruta `ENDPOINTS.EVENTS.DELETE`. Tests nuevos: `teams.test.ts` (11) y `events.test.ts` (9), escritos en rojo antes. |

**3.0b completa:** las 20 operaciones ⚠️ están corregidas y las 9 ❌ tienen servicio. Las 73 operaciones que usan las pantallas están ahora cubiertas por un método de servicio cuyo método HTTP, URL, cuerpo y tipo de respuesta coinciden con la API y con lo que hace cada pantalla, y lo fijan 12 ficheros de test nuevos (`src/api/services/*.test.ts`, 98 tests en total contando `auth` y `users`). Se eliminaron 8 métodos huérfanos o erróneos (`users.resetPassword`, `clubs.members`, `tournaments.enrolledByPlayer`, `trainings.createSession`, `trainings.upcoming`, `teams.matches`, `teams.players`, `events.reminders`). Ninguna pantalla usa todavía estos servicios: el comportamiento de la app no ha cambiado. Siguiente: 3.0c y las tareas 3.1 en adelante, cada una con la red de seguridad de la pantalla antes de migrarla.

## 6. Consecuencias para las tareas siguientes

- **3.0b** (servicios, con TDD: test en rojo, implementación mínima, verde): corregir los 20 ⚠️ y añadir los 9 ❌, por dominio y con máximo 3 servicios por subtarea: (a) auth + users, (b) clubs + tournaments + manualMatches + skills, (c) trainings/exercises + generalTrainings, (d) teams + events. Declarar antes en `ENDPOINTS` las URLs que hoy se componen a mano. Eliminar los métodos huérfanos de la sección 4 salvo que una tarea los reclame.
- **3.0c**: la regla de lint `no-restricted-imports` sobre `api/axios` debe eximir también a `api/client.ts` y a los tests, y avisar de que `store/authStore` exige resolver antes el ciclo.
- **Tareas nuevas a añadir al plan**: `Ejercicios` + `EjercicioNuevo`, `Equipos` + `EquipoNuevo`, `ClubSetup`, `ForgotPassword`, `PlanNuevo`, `store/authStore` y los hooks `useTorneoFormato` / `useTorneoInscripcion` / `useTorneoPartido`.
- **3.5**: sin trabajo de migración; se elimina o se reduce a comprobarlo.
- **3.14 (`PlanDetalles`)**: decidir entre adoptar `useTrainingPlan` y `components/training/*` o borrarlos. El límite `MAX_EXERCISES_PER_SESSION = 6` de esa implementación coincide con la API, que ya rechaza el séptimo ejercicio con un 400 (`routes/training/exercises.ts`); lo único que cambiaría es que el cliente lo avisa antes de llamar.
- **Adaptador `http`**: una operación que hoy lee `response.data.success` (ClubSelection, ClubSetup) pasa a basarse en que la llamada no lance.
- **Métodos HTTP, verificados en la API** (`api/src/routes/*`): `PUT /general-trainings/:id/attendance/bulk`, `PUT /skills/:playerId/consolidate`, `POST /teams/matches/:matchId/availability`, `POST` y `DELETE /events/:id/reminders`. **En los cuatro casos la pantalla tiene razón y el servicio está equivocado**, así que se corrige el servicio y la pantalla no cambia.
- **Orden recomendado**: primero los servicios con más consumidores y menos riesgo (auth/users → clubs → seasons/matches → tournaments), después las pantallas pequeñas por dominio y, al final, las que tienen más operaciones (`EquipoDetalles`, `EntrenamientosGenerales`, `ManualMatchTracker`, `JugadorPerfil`, `Jugadores`), que ya pertenecen a la Fase 4.
