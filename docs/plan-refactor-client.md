# Plan de refactor de `client/`

Resultado del análisis de deuda técnica de `client/` (127 archivos TS/TSX, ~26k líneas), con el vocabulario de `docs/matt/skills/engineering/codebase-design/SKILL.md` (depth, seam, adapter, leverage, locality).

## Diagnóstico resumido

- **Referencia de lo que está bien:** `TorneoDetalles` y los hooks `useTorneo*` son módulos profundos (interfaz pequeña, seam hacia `tournamentsService`, tests).
- **Seam de datos ignorado:** `api/client.ts` (`http`) y los 13 módulos de `api/services/*` solo los usan 5 archivos. Hay ~109 llamadas `api.get/post/put/delete` directas en 25 pantallas.
- **Páginas gigantes (módulos superficiales):** `JugadorPerfil` (1639), `ManualMatchTracker` (1362), `EquipoDetalles` (974), `Jugadores` (954), `EntrenamientosGenerales` (887). Superan el máximo de 800 líneas de `.clinerules`.
- **Duplicación:** 11 definiciones locales de `isAdmin`/`isAdminClub`/`isSuperAdmin` (con criterios distintos), `formatSets` con una copia local en `KnockoutBracket`, 26 `toLocale*` sueltos, listas de habilidades repetidas, tipos `Tournament`/`Club` redeclarados.
- **Higiene:** `any` en las pantallas grandes, 92 `console.*`, 7 rutas `navigate('/...')` escritas a mano, carpeta `client/src/services/` vacía.

## Reglas de ejecución (todas las fases)

1. Se mueve la lógica de una en una.
2. Regla de Oro del JSX: se copia el código visual exactamente igual (clases de Mantine, iconos, márgenes, textos). Solo se crea el componente nuevo, se pasan las variables por props y se importa.
3. Al terminar un archivo se recomprueba: variables sin usar, warnings, formato y tipado.
4. Extracción quirúrgica pura: no se modifica la lógica de las funciones que se migran.
5. Se aplican los conceptos de `codebase-design` (profundidad, seams, prueba de borrado).
6. Los tipos nuevos van en `client/src/types/`.
7. Exploración del código solo con el MCP `codebase-memory`.
8. Cada pieza creada lleva su test.
9. No se hace `git add` ni `git commit` hasta que el usuario dé su aprobado. Entonces el commit es en español, con descripción extensa.

**Done** de cada tarea = lint, build y tests en verde en `client/`, con el diff revisado. Cada tarea toca como máximo 3 archivos, salvo que se indique otra cosa.

---

## Fase 0: red de seguridad de tests de página (incremental)

Objetivo: que cada pantalla tenga tests que pasen hoy y deban seguir pasando tras las migraciones. Se hace de forma incremental: antes de tocar una pantalla, su red de seguridad.

Decisiones:
- **Se mockea `api/axios` (el `api` de bajo nivel), no los servicios.** Los servicios y el adaptador `http` se apoyan en él, así que los tests sobreviven a la Fase 3. Es además la frontera del sistema que piden las reglas de testing.
- **Nivel 1, humo:** la página monta con datos mockeados y muestra sus textos clave.
- **Nivel 2, snapshot del DOM:** verificador mecánico de la regla de oro del JSX; pocos y solo de las pantallas que se van a tocar.
- **Nivel 3, flujos:** acciones concretas en las pantallas grandes.
- Los tests fijan el comportamiento actual, bugs incluidos: sirven para refactorizar, no para validar que la app sea correcta.

| # | Tarea | Done cuando |
|---|---|---|
| 0.1 | Infraestructura: **ya existía** (`setupTests.ts` con los polyfills de jsdom y `test/utils.tsx` con `renderWithProviders`). No hace falta más: el store de auth real se siembra con `useAuthStore.setState` y `api/axios` se mockea en cada test | Hecho, sin cambios |
| 0.2 | Tests de `MainLayout` (nivel 1, 2 y flujos): `components/layout/MainLayout.test.tsx` + snapshot | Hecho: 24 tests, verificados con mutación |
| 0.3 | Tests de `Jugadores` (nivel 1, 2 y flujos): `pages/Jugadores/Jugadores.test.tsx` + snapshot. Añade el stub de `scrollIntoView` a `setupTests.ts` | Hecho: 33 tests, verificados con mutación |
| 0.4 | Tests de `JugadorPerfil` (nivel 1, 2 y flujos): `pages/Jugadores/JugadorPerfil.test.tsx` + snapshot. Añade `initialEntries` a `renderWithProviders` y fija `TZ: 'UTC'` en `vitest.config.ts` | Hecho: 54 tests, verificados con mutación (incluida la regresión del sobre de la API) |
| 0.5 | Tests de `FeedbackPage` (15) y `Dashboard` (24) + snapshots, como red de seguridad de la 1.7. Añade el stub de `document.fonts` a `setupTests.ts` y el helper `normalizeIds` a `test/utils.tsx` (los ids de React `_r_…_` hacían inestables los snapshots) | Hecho |
| 0.x | Resto de pantallas: como primer paso de la fase o pantalla donde se vayan a tocar (nivel 1 en bloques de 2–3 pantallas pequeñas; nivel 2 y 3 en las 5 grandes) | Antes de migrar cada una |

**Incidencia resuelta durante la Fase 0:** `GET /users/:id` devolvía el jugador sin el sobre `{ success, data }` y con credenciales/tokens; se corrigió en la API (`utils/safe-user.ts`, `routes/user/queries.ts` y `profile.ts`, con tests). 

**Pendiente, tras acabar `client/`:** pasada de seguridad y contrato por toda la API (buscar `include` sobre `user` que devuelva el usuario completo y `res.json(` sin `success`). Valorar también invalidar los `resetPasswordToken` vigentes si ese comportamiento llegó a producción.

**Anotado para esa pasada de API (hallado en la 4.11):** `GET /teams/club/:clubId` (`api/src/routes/team.ts`, `players: { select: { id, name, surname, level, stats } }`) no selecciona `avatarUrl`, así que la pestaña Plantilla de `EquipoDetalles` siempre muestra el avatar genérico aunque el jugador tenga foto. Arreglo: añadir `avatarUrl: true` al `select` (con test de la ruta) y `avatarUrl?: string | null` a `TeamPlayer` en `client/src/types/api.ts`; en `TeamRosterTab` pasar `p.avatarUrl` a `getPlayerAvatar`.

---

## Fase 1: `usePermissions` (≈9 tareas) — hecha y commiteada

| # | Tarea | Done cuando |
|---|---|---|
| 1.1 | Decidir la semántica: `isSuperAdmin` = `SuperAdmin`; `isAdminClub` = `AdminClub`; `isAdmin` = `AdminClub` o `SuperAdmin`. `FeedbackPage` hoy usa `isAdmin` para decir solo `SuperAdmin`: decidir si es intencional. | Semántica acordada, incluido `FeedbackPage` |
| 1.2 | Tests de `hooks/usePermissions.test.ts` (RED): `SuperAdmin`, `AdminClub`, `Player` y usuario `null`. Se mockea `useAuthStore`. | Tests fallando por la razón correcta |
| 1.3 | Implementar `hooks/usePermissions.ts` (GREEN). | Tests en verde |
| 1.4 | Migrar `TorneoDetalles.tsx` y `CalendarioEventos.tsx` (valida el patrón). | Ambos usan el hook, sus tests pasan |
| 1.5 | Migrar `MiClub.tsx`, `EquipoDetalles.tsx` y `PlanDetalles.tsx`. | Sin `user?.role === ...` para `isAdmin` |
| 1.6 | Migrar `Jugadores.tsx`, `JugadorPerfil.tsx` y `MainLayout.tsx` (solo las líneas de definición). | Los 3 obtienen sus flags del hook |
| 1.7 | Migrar `Dashboard.tsx` y `FeedbackPage.tsx` (caso especial de 1.1). | Comportamiento de `FeedbackPage` según lo decidido |
| 1.8 | Sustituir las comparaciones sueltas `role === 'AdminClub'` (15), `'SuperAdmin'` (13), `'Player'` (5). Lo que no encaje en un flag se anota y se deja (sin ampliar el hook: YAGNI). | `grep "role === '"` solo devuelve casos justificados |
| 1.9 | Cierre: lint, build, tests, informe de verificación de `.clinerules` y propuesta de mensaje de commit. | Todo en verde; sin commit hasta aprobación |

---

## Fase 2: duplicados sueltos (11 tareas) — hecha (2.10 parcial)

| # | Tarea | Done cuando |
|---|---|---|
| 2.1 | Comparar con diff las copias locales de `formatSets` con `utils/match-format.tsx`. | Hecho: `GroupClassificationsTable` y `GroupMatchesTable` ya importaban la compartida; solo `KnockoutBracket` tenía copia local, idéntica en lógica y JSX (solo difería el tipo del parámetro y `const sets` sin tipar) |
| 2.2 | Sustituir la copia local de `KnockoutBracket` por el import de `utils/match-format`. | Hecho: tests de `components/tournament/` en verde (16 ficheros, 150 tests), eslint y `tsc -b` limpios |
| 2.3 | Tests de `utils/dates.ts` (`formatDate`, `formatDateTime`) con esperados literales y zona horaria controlada (RED). | Hecho: 10 tests, fallaban por módulo inexistente |
| 2.4 | Implementar `utils/dates.ts` con las opciones `es-ES` más repetidas (GREEN). | Hecho: ambas funciones aceptan `options` opcional; 10/10 en verde |
| 2.5 | Migrar los `toLocale*` de `Torneos`, `Partidos` y `ClubSelection`. | Hecho: añadidas aserciones de fecha a `Torneos` y `Partidos` y test nuevo de `ClubSelection` (19 tests + snapshot, verificado con mutación). **Cambio de comportamiento aprobado de facto:** `ClubSelection` pasa de `toLocaleDateString()` (idioma del navegador) a `es-ES` |
| 2.6 | Migrar los `toLocale*` de `EntrenamientosGenerales` y `PoliticaPrivacidad`. | Hecho: ninguna de las dos tenía test; se crearon `EntrenamientosGenerales.test.tsx` (39 tests, 4 snapshots de DOM y modales, verificados con mutación) y `PoliticaPrivacidad.test.tsx` (4 tests + snapshot). `Date` congelado a 15/10/2026. **Bug corregido aparte (con aprobación):** el botón `+` de «Clases Fijas» llamaba a `handleOpenScheduleModal(true)` y rompía la pantalla (`TypeError` en `schedDays.includes`); ahora llama sin argumento y 3 tests lo cubren (41 en total). El día del modal usa `selectedDateForModal && formatDate(...)` para no mostrar `1/1/1970` con `null` |
| 2.7 | Migrar los 5 `toLocale*` de `JugadorPerfil` (si una opción no encaja, se añade como parámetro). | Hecho: los 54 tests solo vigilaban el mes, así que se añadieron 5 aserciones de fecha antes de migrar (próximo compromiso, calendario, tabla de partidos, inicio del plan). Todas las opciones encajaron en `formatDate`/`formatDateTime` sin cambios; 54/54, `tsc -b` limpio. Los 4 errores de eslint de líneas 422-430 son previos |
| 2.8 | Unificar las listas de habilidades (`SKILLS`, `SKILL_FIELDS`, `SKILLS_LIST`) en `constants/`. | Hecho para `EntrenamientosGenerales` y `Jugadores`: `constants/skills.ts` (`SKILL_FIELDS`, 3 tests); 131/131 en `constants/`, `Entrenamientos/` y `Jugadores/`. **Cambio de texto aprobado:** la última etiqueta del modal «Programar Fechas» pasa de «Experiencia / Táctica» a «Experiencia». **`SKILLS_LIST` de `ManualMatchTracker` queda fuera:** son 10 etiquetas libres de análisis con otro vocabulario (`'Derecha plano'`, `'TopSpin Derecha'`…), sin claves, probablemente guardadas como texto, y la pantalla no tiene tests; se aborda en la Fase 4 (4.M1) |
| 2.9 | Eliminar los `Tournament`/`Club` locales y usar `types/`. Revisar los otros tipos locales de `pages/` (12 en total). | Hecho: `Torneos` usa el nuevo `TournamentWithClub` (`types/tournament.ts`), `Partidos` usa `Tournament` y `Pick<Club, …>`, `ClubSelection` usa `Pick<Club, …> & { memberCount, createdAt }`. El tipo compartido es más estricto (enums y `undefined`): obligó a ensanchar un parámetro de tipo en `getStatusColor` de `Torneos` (`status?: string \| null`), sin tocar lógica. `tsc -b` limpio, 587/587 tests del cliente. **Revisión de los otros 8, se quedan locales:** `AdminClubUser`/`ClubAdminData` (AdminPanel) y `ClubDetails` (MiClub) llevan `_count` y `users` anidados que el modelo no tiene; `Exercise` (Ejercicios) exige `category` y el compartido la hace opcional; `Match` (Partidos) tiene `leagueId`/`winnerGoesToMatchId` y estado `string \| null`, y no se importa fuera; `UserProfile` (JugadorPerfil) y `User` (Jugadores) son proyecciones llenas de `any`, van con su página en la Fase 4; `PlayerStats` (Estadisticas) es una fila de jugador con estadísticas, no el modelo. **Hallazgo:** el `PlayerStats` de `types/api.ts` no coincide con Prisma (`matchesWon`/`matchesPlayed` frente a `Stats.matchWon`/`matchLost`) y solo lo usa `User.stats`; corregirlo es una tarea aparte |
| 2.10 | Quitar los `console.*` redundantes (se deja `console.error` en catch de handlers sin interceptor). | **Parcial: hecha solo en las pantallas que ya tienen test** (`FeedbackPage`, `ClubSelection`, `EntrenamientosGenerales`, `Jugadores`, `JugadorPerfil`, `MainLayout`, `useTorneoAcciones`); 587/587 tests, `tsc -b` limpio, sin errores nuevos de eslint. **Criterio aplicado:** el interceptor de `api/axios` ya muestra un toast ante cualquier fallo de red o de API, así que se quitan los `console.error` de los `catch` cuyo `try` solo llama a la API y actualiza estado (se sustituyen por un `catch` con comentario). Se **conservan** los de las cargas que procesan la respuesta, los que rodean cálculos propios (`toISOString`, payloads) y los que rodean callbacks de la pantalla, porque un `TypeError` no lo ve el interceptor y sería la única pista (así se detectó la regresión del sobre en `JugadorPerfil`). Un `console.log(error)` de `ClubSelection` pasó a `console.error`. Los tests que comprobaban el `console.error` de mutaciones ahora comprueban el efecto observable (formulario abierto, sin recarga). **Quedan ~60 `console.*` en `pages/`, la mayoría en pantallas sin test** (`EquipoDetalles`, `PlanDetalles`, `CalendarioEventos`, `SessionDetalles`, `AdminPanel`, `MiClub`, `Login`, `ManualMatchTracker`…): se limpian dentro de la Fase 3/4 al darles su red de seguridad. El objetivo `< 20` no se alcanza antes de eso |
| 2.11 | Borrar `client/src/services/` (vacía) tras comprobar que nada la importa. | Hecho: sin archivos ni importadores, carpeta eliminada (git no versiona carpetas vacías); `npm run build` en verde |

**Limpieza previa a la Fase 3 (hecha, commit aparte tras `8dd6f03`):**
- **Lint:** los 8 errores previos a 0. `PodioHonor` saca `Escalón` y `getS` a nivel de módulo (extracción pura; antes se creaba un componente en cada render y se remontaba), con test nuevo (9 tests + snapshot) porque no tenía. `MainLayout`: se quita un escape inútil `\%` de una regex (mismo significado). `JugadorPerfil`: cuatro ternarios usados como sentencia pasan a `if/else`. Quedan 132 avisos (`no-explicit-any` y dependencias de hooks), que van a las Fases 4 y 5.
- **Bug de sesión en `JugadorPerfil`:** un administrador que editaba a otro jugador sobrescribía su propia sesión (`updateUserFields`); ahora solo se actualiza si el perfil es el propio. Test de regresión (RED antes del arreglo).
- **Tipos:** `PlayerStats` de `types/api.ts` alineado con el modelo `Stats` de Prisma (`matchWon`, `matchLost`, `setWon`, `setLost`, `pointWon`, `pointLost`, `tournamentWon`, `tournamentPart`); ningún código leía los nombres antiguos.
- **Dependencias:** en un clon limpio el build fallaba porque `PlanList.test.tsx` y `PlanSessionCard.test.tsx` importan `@testing-library/user-event`, instalado en local pero sin declarar. Se añade a `devDependencies` (`^14.6.8`, +16 líneas en `package.json` y lockfile). Con eso `npm ci` + build + tests funcionan en un clon limpio.
- **Verificación:** lint 0 errores, `npm run build` correcto, 597/597 tests, y clon limpio con `npm ci` verificado.

---

## Fase 3: migrar al seam de datos (≈24 tareas)

**Preparación**
- 3.0a Auditar `api/services/*` frente a las llamadas directas: tabla endpoint → servicio. **Hecha: ver `docs/fase3-auditoria-servicios.md`.** ≈99 llamadas directas en 33 ficheros = 73 operaciones: 44 ✅ cubiertas, 20 ⚠️ con discrepancia y 9 ❌ sin servicio. Los servicios se escribieron sin pantallas que los ejercieran y no son fiables tal cual: en 4 operaciones el método HTTP del servicio es erróneo y la pantalla tiene razón (verificado en `api/src/routes/*`). La API responde fuera del sobre `{ success, data }` en `/auth/login`, `/auth/google`, `/auth/register` y `POST /tournaments`.
- 3.0b Corregir y completar los servicios **con TDD** (test en rojo → implementación mínima → verde), agrupados por dominio y con máximo 3 servicios por subtarea: (a) auth + users **[hecha, sin commitear]**, (b) clubs + tournaments + manualMatches + skills **[hecha, sin commitear]**, (c) trainings/exercises + generalTrainings **[hecha, sin commitear]**, (d) teams + events **[hecha, sin commitear; con ella la 3.0b está completa]**. Hay que corregir los 20 ⚠️, añadir los 9 ❌, declarar antes en `ENDPOINTS` las URLs que hoy se componen a mano, tipar según la respuesta real de la API (sin cambiarla) y eliminar los métodos huérfanos que ninguna tarea reclame.
- 3.0c Regla de lint `no-restricted-imports` para `api/axios`, en modo `warn`, con `client.ts` y los tests exentos. **Hecha, sin commitear:** `eslint.config.js` + `src/api/axios-import-rule.test.ts` (6 tests, rojo → verde). Línea base: **35 ficheros con aviso** (28 pantallas, 3 hooks, `MainLayout`, los 2 widgets y `authStore`). Cada tarea 3.x debe bajar ese número; el cierre (3.24) exige 0 salvo las pantallas de la Fase 4.

**Migración, una pantalla por tarea** (hook de datos si hace falta, `api.*` → servicio, test del hook)

3.1 `Partidos` · 3.2 `Estadisticas` · 3.3 `Torneos` · 3.4 `Dashboard` · 3.5 `WidgetTorneos` + `WidgetEntrenamientos` + `PodioHonor` · 3.6 `MainLayout` · 3.7 `ResetPassword` · 3.8 `FeedbackPage` · 3.9 `AnalisisList` · 3.10 `AdminPanel` · 3.11 `MiClub` · 3.12 `ClubSelection` · 3.13 `SessionDetalles` · 3.14 `PlanDetalles` · 3.15 `CalendarioEventos` · 3.16 `TorneoNuevo` · 3.17 `ExcelTournamentCreator` · 3.18 `Login`

Las 5 pantallas grandes migran sus datos dentro de la Fase 4, para no tocar dos veces el mismo archivo.

**Progreso de la migración (3.1 a 3.18, hechas, sin commitear a 2026-10-25):** ficheros con aviso del lint **35 → 16**, tests **709 → 944**, lint 0 errores, `tsc -b` limpio. Método por pantalla: red de seguridad primero (casi ninguna tenía test), aserciones de llamada en formato adaptador como RED (`(url, cuerpo, undefined)`), migración mínima, verificación completa.

| Tarea | Resultado |
|---|---|
| 3.1 `Partidos` | `matchesService.list<T = Match>()` (parámetro de tipo para la proyección de la pantalla). Se creó `matches.test.ts` |
| 3.2 `Estadisticas` | Sin test previo: 15 tests + snapshot. `usersService.list<T = User>()` |
| 3.3 `Torneos` | `tournamentsService.list<T = Tournament>()` |
| 3.4 `Dashboard` | Mocks con sobre `{success,data}` (el adaptador solo desenvuelve con `success`). Test del «500 de ELO» reescrito: el bug del sobre ya no se reproduce con el adaptador. Se creó `seasons.test.ts` |
| 3.5 widgets | `WidgetTorneos` y `WidgetEntrenamientos` con tests propios (16). `PodioHonor` no llama a la API |
| 3.6 `MainLayout` | Se añadió el test del guardado del onboarding (no existía). Casts a enums en el payload |
| 3.7 `ResetPassword` | 8 tests. Se quita el `console.error` redundante |
| 3.8 `FeedbackPage` | Solo aserciones de llamada |
| 3.9 `AnalisisList` | 14 tests + 2 snapshots. 8 casts a enums concentrados en `handleStartMatch` |
| 3.10 `AdminPanel` | 13 tests. Adopta `ClubAdminData` compartido |
| 3.11 `MiClub` | 15 tests. Adopta `ClubDetails` compartido (`setCity(data.city ?? '')`) |
| 3.12 `ClubSelection` | Deja de leer `response.data.success`: el éxito es «la llamada no lanza». Adopta `ClubListItem`. Se elimina el test «si el servidor no confirma» (simulaba un 200 con `success:false`, que la API no envía) |
| 3.13 `SessionDetalles` | 14 tests. Quita un `console.log` de depuración |
| 3.14 `PlanDetalles` | **Decisión: adoptar `useTrainingPlan` + `components/training/*`** (prueba de borrado: la lógica reaparecería en la página). 27 tests + snapshot idéntico tras la sustitución; 556 → ~215 líneas. Correcciones en su módulo, test primero: `useApi.refetch` ya no marca `isLoading`; `useTrainingPlan.isLoading` no espera al catálogo; las 3 acciones devuelven `boolean` y no lanzan; `CloneSessionModal` excluye el destino, limpia al cerrar y solo cierra con éxito; `AddExerciseModal` solo cierra con éxito. Se quitó `refetch` del resultado del hook. Helpers `chooseOption` y `optionsOf` en `test/utils.tsx` |
| 3.15 `CalendarioEventos` | 20 tests + snapshot. Quita `console.error` de las 3 mutaciones |
| 3.16 `TorneoNuevo` | 13 tests + snapshot. Respuesta sin sobre (`{message, tournament}`) |
| 3.17 `ExcelTournamentCreator` | 15 tests + snapshot (descarga de blob capturada). Sin RED por adaptador: el RED fue el aviso de lint |
| 3.18 `Login` | 29 tests + snapshot. Mock de `@react-oauth/google`, `Capacitor` y `SocialLogin`. Quita 4 `console.log` |
| 3.19 `Ejercicios` + `EjercicioNuevo` | **Hecha, sin commitear.** 19 tests + 2 snapshots (capturados contra el código antiguo). RED: 4 tests por el formato del adaptador (el filtro pasaba `?category=` en la URL y ahora el servicio manda `{ params }`). `exercisesService.list<T = Exercise>()` (parámetro de tipo para la proyección de la pantalla); `payload: any` de `EjercicioNuevo` pasa a `CreateExercisePayload`. Sin cambios de comportamiento. Ficheros con aviso de seam **16 → 14** |
| 3.20 `Equipos` + `EquipoNuevo` + `ClubSetup` | **Hecha, sin commitear.** `Equipos.test` ya existía: sus mocks pasan al sobre `{success,data}`, aserciones en formato adaptador y 1 snapshot. Tests nuevos: `EquipoNuevo` (7 + snapshot) y `ClubSetup` (5 + snapshot). RED: 4 tests por el formato del adaptador. `Equipos` usa `seasonsService.current()` + `teamsService.byClub()` y tipa `ClubTeam[]` (antes `any[]`). `ClubSetup` deja de leer `response.data.success` (éxito = la llamada no lanza, como en 3.12). Ficheros con aviso de seam **14 → 11** |
| 3.21 `ForgotPassword` + `PlanNuevo` | **Hecha, sin commitear.** Ninguna tenía test: 8 tests + snapshot y 11 tests + snapshot. RED: 3 por el formato del adaptador. `ForgotPassword` usa `authService.forgotPassword`; `PlanNuevo` usa `usersService.byId` y `trainingsService.createPlan` (navega a `newPlan.id`). El estado del jugador pasa a `Pick<User, 'name' | 'surname'>`. Ficheros con aviso de seam **11 → 9** |
| 3.22 hooks `useTorneoFormato` + `useTorneoInscripcion` + `useTorneoPartido` | **Hecha, sin commitear.** Ya tenían tests: aserciones en formato adaptador (RED: 5 tests), mock de lista de usuarios con sobre y `api.put` de `useTorneoFormato` con respuesta (el adaptador lee `response.data`). `tournamentsService.update/register/registerBulk`, `usersService.list<ClubPlayer>()`, `matchesService.update`. `payload` de formato tipado `Partial<CreateTournamentPayload>`; `user?.id as string` en la inscripción (conserva el comportamiento de enviar `undefined` sin usuario). Ficheros con aviso de seam **9 → 6** (quedan 5 pantallas grandes + `authStore`) |
| 3.23 `store/authStore` | **Hecha, sin commitear. Decisión (aprobada): inyectar el logout en axios.** `axios.ts` ya no importa `authStore`: exporta `setUnauthorizedHandler(fn)` y `main.tsx` registra `() => useAuthStore.getState().logout()`; así desaparece el ciclo `axios → authStore → servicio → client → axios`. `authStore.fetchProfile` usa `usersService.me()`. Tests nuevos: 4 del 401 en `axios.test.ts` (manejador, redirección, sin manejador, `/auth/login` y `/auth/google` exentos) y `authStore.test.ts` (9). `main.tsx` queda exento de la regla de lint (con test). Se ejecutó `npm run build` |
| 3.24 Cierre | **Hecha, sin commitear.** La regla `no-restricted-imports` pasa a `error`; las 5 pantallas gigantes quedan en `warn` mediante un bloque propio de `eslint.config.js` (con test por pantalla). Comentario de `api/services/index.ts` corregido. **Llamadas directas que quedan:** 40 en las 5 pantallas de la Fase 4 (EquipoDetalles 9, EntrenamientosGenerales 8, JugadorPerfil 8, Jugadores 8, ManualMatchTracker 7) más las 5 del adaptador `client.ts`. Verificación: 1012/1012 tests, lint 0 errores (125 avisos), `tsc -b` y `npm run build` correctos |

**Fase 3 completa (a 2026-10-25), pendiente solo de commit.** Quedan 5 ficheros con aviso: las 5 pantallas grandes (Fase 4).

**Hallazgos anotados:** un usuario sin club se queda con el spinner para siempre en `MiClub` y `CalendarioEventos` (un test lo fija en cada una; bug a corregir aparte). `Login` nativo muestra con `alert` el error del backend (`'DETALLE DEL ERROR: ...'`): revisar en la pasada de seguridad.

**Ajustes tras la auditoría 3.0a** (consumidores que este listado omitía):
- 3.5 (`WidgetTorneos`, `WidgetEntrenamientos`, `PodioHonor`): **corregido en la 3.0c**, los dos widgets sí llaman a la API (`tournamentsService.enrolledByPlayer` y `trainingsService.upcoming`, ya restaurados con test); `PodioHonor` no llama a nada, así que se queda fuera.
- 3.14 (`PlanDetalles`) no es "migrar a servicios": ya existen `hooks/useTrainingPlan.ts`, `hooks/useApi.ts` y `components/training/*` con tests, sin uso en producción. Decidir entre **adoptarlos** (su límite `MAX_EXERCISES_PER_SESSION = 6` coincide con el que ya impone la API, así que no cambia el resultado final, solo avisa antes) o borrarlos.
- Tareas añadidas, una pantalla cada una: 3.19 `Ejercicios` + `EjercicioNuevo` · 3.20 `Equipos` + `EquipoNuevo` + `ClubSetup` · 3.21 `ForgotPassword` + `PlanNuevo` · 3.22 hooks `useTorneoFormato` + `useTorneoInscripcion` + `useTorneoPartido` · 3.23 `store/authStore` (resolver antes el ciclo de importación `axios → authStore → servicio → client → axios`).
- Antes de migrar cada pantalla, su red de seguridad (Fase 0 incremental): ninguna de estas lista tiene test, salvo las ya cubiertas.

**Cierre**
- 3.24 (antes 3.19) Pasar la regla de lint a `error`, corregir el comentario de `api/services/index.ts` y contar las llamadas directas que quedan (solo deben quedar las de la Fase 4).

---

## Fase 4: páginas gigantes (5 páginas × ~6 tareas ≈ 30)

Orden: `EquipoDetalles` → `JugadorPerfil` → `Jugadores` → `EntrenamientosGenerales` → `ManualMatchTracker`.

Plantilla por página:

| Paso | Contenido |
|---|---|
| a | **Mapa:** listar estados, handlers, modales y bloques de JSX y agruparlos por responsabilidad. Sin código. |
| b | **Hook de datos** (`useXxxDetalles`): carga y llamadas a servicios, con test. Aquí se migra el acceso a datos. |
| c | **Hook de acciones/formularios:** handlers de editar, borrar y guardar, con callbacks de pantalla, con test. |
| d | **Componentes presentacionales:** extraer el JSX por bloque o modal (máx. 2–3 por tarea). |
| e | **Cierre:** tipar los `any` de la página, comprobar que ronda las 300 líneas o menos, revisar `console.*` y rutas. |

**Progreso de la Fase 4 (empezada a 2026-10-25):**

| Tarea | Resultado |
|---|---|
| 4.0 `EquipoDetalles`, pasos a y red de seguridad | Mapa hecho (24 `useState`, 5 responsabilidades, 9 llamadas directas). `EquipoDetalles.test.tsx`: 46 tests + 6 snapshots (pantalla, calendario y 4 modales) capturados contra el código antiguo. El panel «Calendario» solo se monta al activar su pestaña. **Decisión (aprobada por el usuario): en el paso d, una tarjeta de partido unificada** (`NextMatchCard` + filas → un solo componente con variantes), lo que cambia el JSX del destacado y de las filas; el bloque de asistencia se extrae primero porque es idéntico salvo el `disabled` |
| 4.10-4.11 + cierre (pasos d y e) — **`EquipoDetalles` COMPLETA** | `components/team/TeamHeader` (3 tests), `TeamRosterTab` (5), `TeamCalendarTab` (10) y `utils/team-matches.getNextMatch` (6, función pura con `now` inyectado). La página queda en una composición de **244 líneas** (975 al principio), sin `any`, sin `console.*` y sin `api/axios`. Los 6 snapshots de la pantalla coinciden con el golden. Cierre: se aplica el criterio 2.10 a los hooks de mutación (se quita el `console.error` redundante; se conserva el de la carga y el del borrado del equipo, que ejecuta navegación). **Hallazgo (sin tocar): `GET /teams/club/:clubId` no selecciona `avatarUrl` de los jugadores, así que la pestaña Plantilla siempre muestra el avatar genérico** (`api/src/routes/team.ts`, `players.select`); el componente lo documenta. Verificado: 1174/1174 tests (dos ejecuciones), lint 0 errores (105 avisos), `tsc -b` y `npm run build` correctos |
| 4.8-4.9 modales (paso d, parte 2) | `components/team/RosterModal` (5 tests), `EditTeamModal` (7), `NewMatchModal` (7) y `EditMatchModal` (12, la más ancha: 21 props, que vienen tal cual del estado de `useEquipoPartido`). Las listas de categorías y niveles de liga, que `EquipoNuevo` repetía, pasan a `constants/teams.ts` (3 tests) y las usan `EditTeamModal` y `EquipoNuevo`. Los 6 snapshots coinciden con el golden anterior. **Se detectó y corrigió una fragilidad de los snapshots de modales:** capturaban el `style` de la transición de Mantine en la raíz del diálogo, que depende del tiempo y fallaba solo en la suite completa; ahora se quita ese atributo de la etiqueta raíz (`stableDialog`) y se comprobó contra el golden antiguo que el resto del HTML es idéntico. `EquipoDetalles` 613 → 407 líneas. Verificado: 1150/1150 (dos ejecuciones completas), lint 0 errores |
| 4.6-4.7 componentes (paso d, parte 1) | `components/team/AttendanceBlock` (6 tests; el bloque estaba duplicado) y `TeamMatchCard` unificada (19 tests): una sola tarjeta con `featured` para el «Siguiente Compromiso». **Único cambio visible frente al código anterior** (comprobado comparando el snapshot antiguo y el nuevo): el `gap` de la agrupación derecha de la tarjeta destacada pasa de `xs` a `sm`; también deja de pasar `color="blue"` al botón (es el color por defecto) y el `checked` de la asistencia es siempre booleano (antes podía ser `undefined`). El resto de snapshots idénticos. `EquipoDetalles` 844 → 613 líneas. Verificado: 1117/1117 tests, lint 0 errores |
| 4.2-4.5 hooks de acciones (paso c, uno por modal) | `useEquipoInfo` (editar/eliminar equipo, 8 tests), `useEquipoPlantilla` (5), `useEquipoNuevoPartido` (4) y `useEquipoPartido` (actualizar/borrar partido y asistencia, 11). Cada uno con su `saving` (solo hay un modal abierto a la vez) y los efectos de pantalla como callbacks (`refetch`, `onTeamDeleted`). Los 46 tests de la pantalla pasan sin cambios y los 6 snapshots siguen idénticos. `EquipoDetalles` ya no importa `api/axios` (sale del bloque `warn` de eslint, con test): 975 → 844 líneas, 9 llamadas directas → 0. `selectedMatch` pasa de `any` a `TeamMatch` (`ourScore ?? ''` cubre también `undefined`). Verificado: 1094/1094 tests, lint 0 errores |
| 4.1 `useEquipoDetalles` (paso b) | Hook de datos con 8 tests (`team`, `clubPlayers` aprobados, `loading`, `refetch`; sin `id`/club no pide nada y sigue cargando, como antes). La pantalla lo usa y pierde `fetchData`/3 estados. El efecto depende de `user?.clubId` y no del objeto `user` entero. Quedan 7 tests en rojo, los de las mutaciones (paso c) |

**`JugadorPerfil` (1639 líneas, 54 tests previos) — pasos a, b y c hechos, sin commitear:**

| Tarea | Resultado |
|---|---|
| 4.12 `useJugadorPerfil` (paso b) | Hook de datos (10 tests): jugador, temporada vigente, 10 últimos partidos completados y macrociclos solo si `canViewTrainings`. Tipos nuevos en `types/playerProfile.ts` (`PlayerProfile`, `ProfileMatch`, `ProfileEditData`); `usersService.byId<T>()`. Red de seguridad adaptada (mocks con sobre, aserciones en formato adaptador; RED: 3 tests). **Se elimina un test** («responde sin el sobre»): reproducía el bug del sobre de `GET /users/:id`, que ya no se produce con el adaptador (mismo caso que el de `Dashboard` en 3.4). El efecto depende ahora también de `canViewTrainings`, así que recarga si cambian los permisos |
| 4.13 `useJugadorEdicion` | Editar perfil (13 tests): formulario, validación de contraseña y guardado en `/users/me` (`usersService.updateProfile`) o `/users/:id` (`update`); actualiza la sesión solo en el perfil propio. Se quita el `console.error` redundante |
| 4.14 `useJugadorConsolidacion` | Consolidar mejoras (6 tests, `skillsService.consolidate`). `SKILL_KEYS` pasa a `constants/skills.ts` como `PROFILE_SKILL_KEYS` (etiquetas del perfil, distintas de `SKILL_FIELDS`; 2 tests) |
| 4.15 `useJugadorAdministracion` | Dar de baja (`clubsService.updateMemberStatus`) y borrar plan (`trainingsService.deletePlan`), ambas con confirmación (6 tests) |

`JugadorPerfil` ya no importa `api/axios` (sale del bloque `warn` de eslint, con test), 8 llamadas directas → 0; 1639 → 1372 líneas. Verificado: 1209/1209 tests, lint 0 errores. **Siguiente (paso d):** `utils/player-profile.ts` con las funciones puras (recuento de sets, estadísticas contra rivales, datos de eficiencia y de habilidades, partidos de equipo) y luego los componentes en `components/player/` (cabecera, habilidades y radar, estadísticas, calendario de equipos, últimos partidos, macrociclos, análisis técnico y los 2 modales).

| Tarea | Resultado (paso d y cierre) |
|---|---|
| 4.16 `utils/player-profile.ts` | Funciones puras con 24 tests y valores esperados escritos a mano: `getMatchResult` (el recuento de sets estaba duplicado), `getRivalChartData`, `getEfficiencyData`, `getSkillsData`, `getTeamCalendar` y `countAttendances` (la fecha actual se inyecta). 1372 → 1177 líneas |
| 4.17-4.20 componentes en `components/player/` | `PlayerProfileHeader` (7 tests), `SkillsPanel` (5), `BalanceCard`/`RivalsCard` (4), `PlayerStatCards` (6), `TeamCalendarCard` (6, absorbe la paginación), `RecentMatchesTable` (5), `TrainingPlansCard`/`TechnicalAnalysisCard` (8). Se generaron copiando el JSX literal de la página y sustituyendo solo variables por props; los snapshots existentes no cambiaron. `getTeamMatchOutcome` (en `utils/team-matches.ts`, 5 tests) comparte el color de estado y el resultado entre esta pantalla y `TeamMatchCard` |
| 4.21 modales | Antes de extraer se añadieron 3 snapshots (modal de edición de administrador, de edición propia con cuenta local y de consolidación; con la raíz del diálogo sin `style`, ver la lección de los snapshots de modales). `EditProfileModal` (7 tests) y `ConsolidateModal` (7). Los 4 snapshots coinciden con el golden |
| 4.22 cierre | Último `any` fuera: `authProvider?: string` en el `User` del store. Sin `console.*` en la página |

**`JugadorPerfil` COMPLETA: 1639 → 229 líneas**, sin `any` ni `api/axios`. Verificado: 1294/1294 tests (dos ejecuciones), lint 0 errores (89 avisos), `tsc -b` y `npm run build` correctos.

### `Jugadores` (4.23-4.37)

| Tarea | Resultado |
|---|---|
| 4.23 red de seguridad | Los 33 tests existentes cubrían la pantalla; se añadieron 5 snapshots de modales (ajustar ELO, aprobación con nivel elegido, añadir jugador, resetear cuenta de invitado y de jugador con correo), generados contra el código antiguo |
| 4.24 seam de datos | RED con mocks en formato sobre y aserciones `(url, cuerpo, undefined)` (10 fallos por la razón correcta). Migrada a `usersService` / `clubsService` / `authService`; `PlayerListItem`, `GuestFormData` y `SkillInputs` en `types/players.ts` sustituyen al `User` local. `ENDPOINTS.PLAYERS` desaparece (era el mismo `/users`). `Jugadores` sale del bloque `warn` de eslint y de `axios-import-rule.test.ts` |
| 4.25 `useJugadoresLista` | Lista, `loading` y `refetch` (5 tests); cada recarga pasa por `loading`, como antes |
| 4.26 utilidades | `utils/players.ts` (14 tests): `getPlayerStats`, `getWinRate`, `filterPlayers`, `buildFinalSkills` (estaba duplicado), `isGuestEmail`, `EMPTY_SKILL_INPUTS` (el objeto de 12 claves vacías estaba 3 veces) y `constants/players.ts` con `LEVEL_BASE_STATS` |
| 4.27-4.30 hooks de acción | `useJugadorElo` (7 tests), `useJugadorResetCuenta` (8), `useJugadorInvitado` (8), `useJugadorAprobacion` (14; rechazar pasa por `openAppConfirmModal`, mockeado como frontera de UI) |
| 4.31-4.37 componentes en `components/players/` | `PlayerRow` (9), `PlayersTable` (6), `PlayersHeader` (6), `EditEloModal` (4), `ApprovePlayerModal` (8), `GuestPlayerModal` (9), `ResetAccountModal` (8). JSX copiado literal; los 6 snapshots no cambiaron |

**`Jugadores` COMPLETA: 954 → 176 líneas**, sin `any`, `console.*` ni `api/axios`. Verificado: 1405/1405 tests, lint 0 errores (88 avisos), `tsc -b` y `npm run build` correctos.

Anotado para la pasada de cierre: el JSX conserva dos props que Mantine no define (`style={{ darkHidden: true }}` en las tarjetas de habilidades y `justifyRight: 'true'` en el grupo de búsqueda); por la regla de oro del JSX no se tocaron. En `EditEloModal` (4.34) se escribió el test y el componente sin ejecutar antes el rojo.

### `EntrenamientosGenerales` (4.38-4.49)

| Tarea | Resultado |
|---|---|
| 4.38 red de seguridad | Los 41 tests existentes cubrían la pantalla; se añadieron 3 snapshots de modales (horario base, programar fechas, asistentes) contra el código antiguo |
| 4.39 seam de datos | RED con aserciones `(url, cuerpo, undefined)` (6 fallos por la razón correcta). Migrada a `generalTrainingsService` / `usersService`; `generalTrainingsService.list<T>()` admite la proyección con horario, plantilla y asistencias; `types/generalTraining.ts` (`TrainingSession`, `TrainingAttendance`, `ProgramDetails`) sustituye a 17 `any`. Sale del bloque `warn` de eslint y de `axios-import-rule.test.ts` (el último que queda es `ManualMatchTracker`) |
| 4.40 utilidades | `utils/general-trainings.ts` (20 tests con calendarios calculados a mano): `getScheduleColor`, `getMonthGrid`, `shiftMonth`, `getSessionsOnDay`, `getProgramDetails`, `getAttendedPlayers`, `toggleInList` (estaba duplicado 2 veces); `constants/generalTrainings.ts` con `SCHEDULE_COLORS` y `DAYS_OF_WEEK` |
| 4.41-4.45 hooks | `useEntrenamientosGenerales` (carga, 5 tests), `useEntrenamientoHorarios` (11), `useEntrenamientoProgramacion` (7), `useEntrenamientoAsistencia` (8; avisa con `onOpenAttendance` para que la pantalla cierre el modal del día), `useEntrenamientoCalendario` (8) |
| 4.46-4.49 componentes en `components/generalTraining/` | `ScheduleList` y `TrainingCalendar` (13 tests), `DaySessionsModal` y `AttendeesModal` (11), `AttendanceListModal` y `ProgramDetailsModal` (9), `ScheduleFormModal` y `ProgramTrainingModal` (16). JSX copiado literal salvo `blanks`, que pasa de array a número (se recrea con `Array.from` dentro del calendario); los 7 snapshots no cambiaron |

**`EntrenamientosGenerales` COMPLETA: 873 → 194 líneas**, sin `any`, y sin `api/axios`; el único `console.error` que queda está en `useEntrenamientosGenerales` (carga que procesa la respuesta). Verificado: 1516/1516 tests, lint 0 errores (72 avisos), `tsc -b` y `npm run build` correctos.

Anotado para la pasada de cierre: `darkHidden` en `ScheduleList` y `ProgramDetailsModal` (como en `Jugadores`). El test del loader de esta pantalla emite un aviso de `act(...)` porque no espera a que termine la carga.

### `ManualMatchTracker` (4.50-4.M20)

| Tarea | Resultado |
|---|---|
| 4.50 red de seguridad | La pantalla no tenía ningún test. Se escribieron 77 tests y 9 snapshots contra el código antiguo (planificación, modo rápido, modo profundo con el árbol de puntos, final de set y de partido, resumen de un set, reporte en los dos modos). Los snapshots no incluyen el acordeón de planificación porque su contenido en el HTML depende del orden de ejecución; ese acordeón lo cubren tests de comportamiento |
| 4.M1 constantes | `constants/manualMatch.ts` con `PointNode`, `SKILLS_LIST`, `PLACEMENTS`, `RESTO_PLACEMENTS`, `WON_TREE` y `LOST_TREE` (13 tests; toda categoría, subcategoría y colocación se contrasta con los enums de `types/enums.ts`) |
| 4.M2 utilidades | `utils/manual-match.ts` (46 tests con valores calculados a mano): `getPointLabel`, `getSetSummary`, `getSortedCategories`, `getActiveSet`, `getReportSetScores`, `parsePlanningNotes`, `formatPlanningText`, `buildQuickNotes`, `findInvalidQuickSet`, `toSetScorePayload`, `resizeSetScores`, `isReadyToComplete`. Tipos en `types/manualMatch.ts` (`TrackedMatch`, `TrackedPoint`, `SetSummary`…) |
| 4.M3 seam de datos | RED con aserciones `(url, cuerpo, undefined)` (12 fallos por la razón correcta). Migrada a `manualMatchesService` (`byId<T>` y `addPoint<T>` admiten la proyección de la pantalla). **La regla de eslint pasa a `error` sin excepciones**: se elimina el bloque `warn` y `axios-import-rule.test.ts` ya solo tiene el caso de error |
| 4.M4-4.M9 hooks | `useManualMatch` (carga; expone `match` y `loaded`), `useRivalEdicion`, `usePlanificacionPartido`, `useRegistroPuntos` (16 tests), `useSetsPartido` (14), `useCierrePartido` (11). El estado visible del partido cargado (puntos, set actual, sets ganados) se ajusta durante el render y no en un efecto, para no pintar un fotograma vacío |
| 4.M10-4.M20 componentes en `components/manualMatch/` | `RivalEditModal` (sustituye 3 copias), `PlanningAccordion` (2 copias), `SetCategoriesGrid` (4 copias) con `EndSetModal`, `SetSummaryModal` y `EndMatchModal`, `MatchReport`, `PlanningView`, `DeepScoreboard`, `PointSelector`, `SetHistory` y `QuickMatchView`. Los 9 snapshots no cambiaron |

**`ManualMatchTracker` COMPLETA: 1362 → 305 líneas**, sin `any`, `console.*` en la página ni `api/axios`. Verificado: 1788/1788 tests, lint 0 errores (52 avisos), `tsc -b` y `npm run build` correctos.

Anotado para la pasada de cierre y no tocado por la regla de extracción quirúrgica: el modal del rival guarda las gomas (`opponentRubberForehand/Backhand`) y las envía pero no tiene campos para editarlas; al terminar en modo rápido `setMatch` no guarda `setScores`, así que el reporte inmediato no muestra los tanteos por set hasta recargar; `isValidSet` del cierre rápido repite `isValidTableTennisSet` con una regla ligeramente distinta (ahora `findInvalidQuickSet` en `utils/manual-match.ts`); el test del acordeón de planificación y `darkHidden` en varios componentes.

## Fase 4 COMPLETA

Las cinco pantallas gigantes (`EquipoDetalles` 975 → 244, `JugadorPerfil` 1639 → 229, `Jugadores` 954 → 176, `EntrenamientosGenerales` 873 → 194, `ManualMatchTracker` 1362 → 305) están migradas al seam de datos, con hooks por responsabilidad, utilidades puras y componentes presentacionales, todo con tests. Ninguna importa `api/axios`: la regla de eslint es `error` en todo `src/`.

---

## Fase 5: tipos y rutas (≈10 tareas)

- 5.1 Tipar los `any` de `MainLayout`.
- 5.2 Tipar los `any` de `Login`.
- 5.3 Tipar los `any` de `Estadisticas`, `PlanDetalles` y `CalendarioEventos`.
- 5.4 Eliminar los `any` residuales (búsqueda global) y pasar la regla de ESLint a `error`.
- 5.5 Sustituir los 7 `navigate('/...')` por `APP_ROUTES`.
- 5.6 Mover la imagen de `Login` a `assets/` o a una constante.
- 5.7 Extraer de `Login.tsx` el formulario de login/registro y la sección de Google a componentes (máx. 2 por tarea).
- 5.8 Cierre global: build, lint, tests, informe de verificación de `.clinerules` y recuento final de líneas.

---

## Resumen

| Fase | Tareas aprox. |
|---|---|
| 1 | 9 |
| 2 | 11 |
| 3 | 24 |
| 4 | 30 |
| 5 | 10 |
| **Total** | **≈ 85** |

En las fases 3 y 4 los nombres de los hooks y el reparto exacto de componentes salen del paso "mapa", así que esas tareas se afinan al llegar a ellas.
