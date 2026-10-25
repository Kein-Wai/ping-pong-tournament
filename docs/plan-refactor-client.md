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
- 3.0a Auditar `api/services/*` frente a las llamadas directas: tabla endpoint → servicio.
- 3.0b Añadir a los servicios los métodos que falten, con tests, agrupados por dominio (máx. 3 servicios por tarea; se puede dividir en 2–3 subtareas).
- 3.0c Regla de lint `no-restricted-imports` para `api/axios`, en modo `warn`, con `client.ts` y los tests exentos.

**Migración, una pantalla por tarea** (hook de datos si hace falta, `api.*` → servicio, test del hook)

3.1 `Partidos` · 3.2 `Estadisticas` · 3.3 `Torneos` · 3.4 `Dashboard` · 3.5 `WidgetTorneos` + `WidgetEntrenamientos` + `PodioHonor` · 3.6 `MainLayout` · 3.7 `ResetPassword` · 3.8 `FeedbackPage` · 3.9 `AnalisisList` · 3.10 `AdminPanel` · 3.11 `MiClub` · 3.12 `ClubSelection` · 3.13 `SessionDetalles` · 3.14 `PlanDetalles` · 3.15 `CalendarioEventos` · 3.16 `TorneoNuevo` · 3.17 `ExcelTournamentCreator` · 3.18 `Login`

Las 5 pantallas grandes migran sus datos dentro de la Fase 4, para no tocar dos veces el mismo archivo.

**Cierre**
- 3.19 Pasar la regla de lint a `error`, corregir el comentario de `api/services/index.ts` y contar las llamadas directas que quedan (solo deben quedar las de la Fase 4).

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

Extra para `ManualMatchTracker`, antes de la plantilla:
- 4.M1 Extraer `WON_TREE`, `LOST_TREE` y `PLACEMENTS` a `utils/` o `constants/`.
- 4.M2 Extraer `getSetSummary` y el cálculo de sets a funciones puras, con tests.

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
