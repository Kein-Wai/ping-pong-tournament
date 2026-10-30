# Feature Ligas — decisiones y progreso

Documento de relevo: si se corta la sesión, retomar desde la sección "Pasos". Decisiones cerradas en la sesión de `grilling` (2026-10-30).

## Decisiones cerradas

**Modelo y estados**
- Se amplía el `League` existente (`api/prisma/schema.prisma`) y se usa `Match.leagueId`, que ya existe. Hoy no hay rutas ni UI de ligas.
- Nuevo modelo `LeagueParticipant` (como `TournamentParticipant`, con `PlayerTournamentStatus`: Pendiente / Confirmado / NoPresentado).
- `League.status` usa `MatchStatus`, sin enum nuevo:
  - Programado: en preparación; inscripción abierta; el admin añade o quita jugadores.
  - Iniciado: calendario generado; lista bloqueada.
  - Completado: todos los partidos terminados, o cierre manual del admin.
  - Cancelado: lo cancela el admin. Abierto no se usa.
- `League.name` pasa de único global a único por `(clubId, name)`.
- Campo nuevo `Match.walkover` (booleano).

**Configuración**
- Todos contra todos; una vuelta por defecto; opción de ida y vuelta.
- Sets para ganar el partido: 1, 3, 5 o 7, configurable por liga.
- Mínimo 3 jugadores confirmados para iniciar; sin máximo.

**Jugadores**
- El admin los añade ya Confirmados. El jugador se inscribe solo mientras la liga está Programada y queda Pendiente hasta que el admin lo confirma. Puede darse de baja mientras esté Programada.
- Al iniciar solo entran en el calendario los Confirmados.

**Calendario**
- Generador propio, puro, por el método del círculo, en `api/src/utils/`. Con jornadas y descanso (bye) si el número es impar. No se usa `MATCH_MATRIX` (solo cubre grupos de hasta 5).
- Los partidos no tienen fecha. `Match.dateStart` es obligatorio, así que guarda la fecha de inicio de la liga como valor provisional y, al completarse el partido, el día real (editable). La UI muestra "sin fecha" mientras no está completado.

**Resultados y permisos**
- Solo el admin del club registra resultados (reutiliza el modal de resultado de torneos). SuperAdmin puede verlo. Los jugadores ven las ligas de su club en solo lectura.
- Los partidos de liga cuentan para ELO y estadísticas (`handleMatchStatsUpdate` ya lo hace para cualquier Match Completado). Ojo: `processMatchResult` tiene la rama `leagueId` como stub, y `getMatchOwnerClubId` no mira la liga.

**Clasificación**
- Puntos: 2 victoria, 1 derrota jugada, 0 no jugado.
- Desempate: con 2 empatados, enfrentamiento directo (lógica nueva); con 3 o más, diferencia de sets y luego de puntos.
- Mientras la liga está Iniciada, la tabla se calcula al consultar (función pura nueva basada en `computeGroupStandings`). Al pasar a Completada se guarda una foto final en `LeagueClas` con `position` (revisar que encaje; si no, tabla propia).

**Abandono (No presentado)**
- El admin marca al jugador como No presentado.
- Sus partidos pendientes pasan a W.O.: `walkover = true`, Completados, marcador convencional de sets (el rival gana los sets necesarios) y puntos 0 a 0.
- El rival gana 2 puntos y el ELO de una victoria; el que se va pierde el ELO. Los sets convencionales cuentan en el desempate; los puntos 0-0 no pesan.
- Los partidos ya jugados se mantienen.

**Borrado**
- Solo se puede borrar una liga Programada. Después solo se puede Cancelar.

**Pantallas**
- Lista de ligas (botón de nueva liga para el admin), formulario de creación (nombre, sets 1/3/5/7, ida y vuelta, fecha de inicio) y detalle con pestañas Jugadores / Calendario por jornadas / Clasificación.
- Entrada "Ligas" en el menú lateral (`MainLayout.tsx`, debajo de Torneos, todos los roles). Hay que actualizar el snapshot de `MainLayout.test.tsx`.
- Rutas en `client/src/constants/routes.ts` y `App.tsx`; URLs en `api/endpoints.ts`.

**Fuera de alcance (anotar en `docs/PENDIENTES.md`)**
- Excel de ligas, notificaciones por correo, inscripción desde el calendario oficial.

## Pasos

Se avanza un paso por vez; al terminar cada uno se pregunta al usuario antes de seguir (el usuario tiene poco uso disponible).

1. [x] Grilling y decisiones (este documento).
2. [x] `domain-modeling`: `GLOSSARY.md` (Liga reescrita; nuevos Jornada, Clasificación de la liga, Clasificación final, W.O.), `docs/adr/0001` (clasificación al vuelo + foto final) y `docs/adr/0002` (W.O. como Completado con marcador convencional).
3. [x] Prisma (migración `20261030120000_added_leagues_participants_walkover`, aplicada solo en local): `LeagueParticipant`, `Match.walkover`, `League` con `setsToWin` (por defecto 2; el usuario habla de mejor de 1/3/5/7, que equivale a 1/2/3/4 sets para ganar), `doubleRound`, `numPlayers` por defecto 0 y nombre único por `(clubId, name)`, más `@@unique([leagueId, playerId])` en `LeagueClas`. La fecha de inicio es el `dateStart` que ya existía. `tsc` y los tests de la API pasan.
4. [x] `tdd`: `api/src/utils/league-schedule.ts` (`generateLeagueSchedule(playerIds, doubleRound)` → `LeagueRound[]` con `{ round, matches: [{ playerOneId, playerTwoId }] }`) y su test (26 tests). Pura, determinista; la vuelta repite la ida con lados intercambiados. Lint y `tsc` limpios.
5. [x] `tdd`: `api/src/utils/league-standings.ts` (`computeLeagueStandings(playerIds, matches)`; reutiliza `computeGroupStandings`) y su test (14 tests). Descubrimiento: `calculateMatchResults` ignora sets 0-0, así que **un W.O. se guarda con sets 11-0** (no 0-0) y la clasificación ignora los puntos de los partidos con `walkover` y da 0 (no 1) al que se retira. ADR 0002 actualizado. Pendiente para el paso 7: valorar si `Stats` debe excluir los puntos de un W.O.; el desempate cuenta solo partidos Completados (el llamador debe filtrar).
6a. [x] (hecho: `schemas/league.ts`, `routes/league.ts` montado en `/api/leagues`, `routes/league.test.ts` con 59 tests; suite completa 828 verdes, lint y `tsc` limpios. Rutas: GET/POST `/`, GET/PUT/DELETE `/:id`, POST `/:id/participants`, PUT `/:id/participants/:playerId/status`, DELETE `/:id/participants/:playerId`, POST/DELETE `/:id/register`. El jugador solo ve ligas de su club y solo si está Aprobado; los demás casos devuelven 404. Un SuperAdmin sin club no puede crear ligas.) API: `schemas/league.ts` (Zod) y `routes/league.ts` montado en `routes/index.ts` con `verifyToken`: crear, listar y ver el detalle de ligas (jugadores solo las de su club; SuperAdmin todas), editar y borrar una liga Programada, y participantes (admin añade en bloque como Confirmado; el jugador se inscribe como Pendiente y se da de baja; el admin confirma o quita). Con tests de rutas (Prisma mockeado).
6b. [x] (hecho: migración `20261030130000_added_match_round` con `Match.round` (jornada), `utils/league.ts` con `startLeague`, `finalizeLeague(tx, leagueId)`, `cancelLeague`, `withdrawPlayer` (W.O. vía `updateMatch`, así aplica el ELO), `getLeagueStandings` y `buildWalkoverScore`; 26 tests en `utils/league.test.ts`. Rutas nuevas: POST `/:id/start`, `/:id/cancel`, `/:id/finish`, `/:id/participants/:playerId/withdraw`; GET `/:id/matches` y `/:id/standings`. Suite completa 888 verdes, lint y `tsc` limpios. `withdrawPlayer` marca al jugador al final para poder repetirse si falla a mitad.) API: iniciar la liga (mínimo 3 confirmados, descarta pendientes, genera partidos con `generateLeagueSchedule`, bloquea la lista), cancelar, finalizar a mano, marcar No presentado (W.O. en los partidos pendientes) y consulta de calendario y clasificación (`computeLeagueStandings`). Con tests.
7. [x] API: `processMatchResult` completa la liga sola al terminar el último partido (`finalizeLeague` en transacción); `getMatchOwnerClubId` reconoce la liga; `Stats` no suma puntos de un W.O. (`CompletedMatch.walkover`); `PUT /matches/:id` rechaza cambiar resultados si la liga no está Iniciada; `POST /matches` rechaza `leagueId` (los partidos de liga se generan al iniciar). Tests nuevos: `match-access`, `match-processor.league`, `stats.walkover` y `routes/match.league`. Suite 909 verdes, lint y `tsc` limpios. Riesgos conocidos: importación circular `league` → `match-result` → `match-processor` → `league` (solo se usa dentro de funciones) y dos últimos resultados simultáneos podrían cerrar la liga dos veces (el cierre es repetible).
8. [x] Client (capa de datos): `ENDPOINTS.LEAGUES`, `APP_ROUTES.LIGAS` (`/ligas`, `/ligas/nueva`, `/ligas/:id`), `types/league.ts`, `api/services/leagues.ts` (`leaguesService`, exportado en el barrel) y `leagues.test.ts` (15 tests). Suite del client 2287 verdes, `tsc -b` y lint limpios. **Cambio de plan:** la entrada "Ligas" del menú (`MainLayout.tsx` + snapshot) y las `<Route>` de `App.tsx` pasan al paso 9, para no publicar un enlace a una pantalla que aún no existe.
9. [x] Client (pantallas): `pages/Ligas/{Ligas,LigaNueva,LigaDetalles}.tsx`; hooks `useLigaDetalles`, `useLigaAcciones`, `useLigaPartido` (reutiliza `MatchResultModal`); componentes `components/league/{LeagueHeader,LeagueParticipantsTab,LeagueCalendarTab,LeagueStandingsTab,AddLeaguePlayersModal,LeagueStatusBadge}`; helpers puros `utils/leagueView.ts`; rutas en `App.tsx` y entrada "Ligas" en el menú (visible para SuperAdmin, AdminClub y jugador con club aprobado, no para un jugador sin club: vería una lista vacía) con el snapshot de `MainLayout` actualizado (solo cambia ese ítem). Solo el AdminClub gestiona; el SuperAdmin y los jugadores ven. Suite del client 2409 verdes con `--maxWorkers=3`, lint y `npm run build` limpios. Con todos los workers algunos tests de 5 s (los de ESLint y el onboarding de `MainLayout`) caducan por carga de la máquina; pasan solos. **No** se ha comprobado en un Chrome real (ver memoria `visual-check-in-browser`).
10. [ ] Verificación final. Hecho: `simplify` (4 agentes). Aplicado: la regla del W.O. (puntos de juego a 0 y 0 puntos de clasificación al que se retira) vive ahora en un solo sitio (`calculateEffectiveResults` en `utils/match.ts`, usada por `group-standings` y `stats`; `league-standings` ya no deshace nada); `routes/league.ts` pide solo los campos públicos del jugador (`select`) en vez del usuario entero y comparte `parseBody`, `loadViewableLeague` y `loadManagedLeague({ programmedOnly })`; `finalizeLeague` y `loadStandingPlayerIds` consultan solo lo necesario. Omitido a propósito (fuera de alcance o poco valor): clonar menos `EnrollModal` y `useTorneoPartido` (tocaría torneos), tabla común de campos de sets, `useApi` en las pantallas, recarga parcial en `useLigaDetalles`, `Promise.all` en `processLeagueMatch`, capturar P2025/P2002 en vez de `findUnique` previo. API: 913 tests, `tsc` y lint limpios. `code-review` (medium) hecho: corregido `PUT /matches/:id` (no reescribe un W.O., no mueve el partido de liga ni cambia sus jugadores), cierre de liga con reclamo de estado en `finalizeLeague` (sin doble cierre), alta de jugadores sin repetidos y rechazo si la liga no tiene club; API 920 tests verdes, lint y `tsc` limpios. Conocido y no tocado: `withdrawPlayer` no es atómico (repetible) y puede cerrar la liga antes de marcar al jugador; `PUT`/`DELETE` de la liga comprueban el estado antes de escribir (carrera con un `start` simultáneo). `security-review` hecho: sin hallazgos de alta confianza en Ligas; la observación previa (PUT/POST de `/matches` aceptaban `tournamentId`/`groupId`/`knockoutId` sin comprobar a quién pertenecen) se corrigió: `PUT` ya no deja cambiar liga, torneo, grupo ni cuadro de un partido y `POST` exige que grupo y cuadro cuelguen del torneo indicado (`routes/match.association.test.ts`). API 930 tests verdes. Pendiente: PR (el commit solo con aprobación del usuario).

No hacer `git add` / `git commit` sin aprobación del usuario.
