# Análisis del entrenador a un jugador: progreso

Rama: `feat/analisis-entrenador` (cortada de `origin/main`; al hacer push usar `git push -u origin feat/analisis-entrenador`).
Nada está añadido ni commiteado: el usuario debe aprobarlo (ver `CLAUDE.md`).

## Qué se construye (decisiones cerradas)

El AdminClub (entrenador) usa el mismo análisis de partido (`manual-match`, rápido o extenso, página `client/src/pages/Analisis`) pero **sobre un jugador de su club**. Cambia solo a quién pertenece.

- `ManualMatch.userId` = jugador analizado (dueño). `coachId` (nullable) = AdminClub que lo creó; vacío en análisis propios.
- Estadísticas y habilidades **cuentan para el jugador** (`complete` las acredita al dueño, no a quien pulsa finalizar).
- El jugador ve sus análisis (propios y del entrenador) igual, sin distinguirlos.
- Pueden ver, añadir puntos, deshacer, editar y finalizar: el dueño y todo AdminClub con club **Aprobado** del club **actual** del dueño. Si el jugador se va del club, el club pierde el acceso y el jugador lo conserva. No hay borrado.
- Crear con `playerId`: solo AdminClub con club Aprobado; el jugador debe ser de su club (`clubId` del token), con `clubStatus` Aprobado y tipo Player.
- Acceso del club solo si el dueño es un **jugador (tipo Player) Aprobado** en el club actual (un aspirante Pendiente ya tiene `clubId` pero no se ve ni se toca; tampoco el análisis personal de otro AdminClub). El dueño siempre accede.
- El AdminClub ve en el listado los suyos y los de los jugadores (tipo Player) de su club, incluidos los que el jugador se hizo solo. Filtro `?playerId=` que solo reduce el alcance.
- El rival sigue siendo texto libre. SuperAdmin queda fuera. Sin correo, sin vídeo, sin análisis privados.
- UI: sin pantallas nuevas. En `AnalisisList` un filtro "Jugador" (solo AdminClub) y la tarjeta muestra el jugador. Al crear, selector opcional "Analizar a:" (vacío = análisis propio).

## Fases

| Fase | Estado |
|---|---|
| 0. Rama, impacto, migración `20261101120000_added_manual_match_coach` (aplicada en local) | HECHA |
| 1. API: helper de acceso, `POST` con `playerId`, acceso en GET/PUT/puntos/deshacer, `complete` al dueño | HECHA |
| 2. API: `GET /` para AdminClub + `?playerId=` + jugador incluido en cada análisis | HECHA (api: 970 tests, tsc y lint verdes; consulta probada contra la BD local) |
| 3. Cliente: servicio y tipos, filtro "Jugador", selector "Analizar a", tests | HECHA (client: tsc, lint, build y 2418 tests verdes) |
| 4. Cierre | HECHA. swagger; `security-review` (1 hallazgo Medium corregido); `simplify` (regla y `select` unificados); `code-review` (8 hallazgos revisados, 1 corregido: la lista del filtro anterior ya no queda en pantalla). Verificado: api tsc, lint y 980 tests; client tsc, lint, build y 2419 tests. **Pendiente solo: aprobación del usuario para commit y PR.** |

## Archivos tocados (API)

- `api/prisma/schema.prisma` + migración `20261101120000_added_manual_match_coach`
- `api/src/routes/manual-match.ts`, `api/src/schemas/manualMatch.ts`
- `api/src/utils/manual-match-access.ts` (+ test)
- Tests: `manual-match.coach.test.ts` (nuevo), `manual-match.authorization.test.ts` (ajustado: `adminClub1` ya no es extraño)

## Archivos tocados (cliente)

- `client/src/api/services/manualMatches.ts` (+ test): `list({ playerId })` y `playerId` en `CreateManualMatchPayload`
- `client/src/types/api.ts`: `ManualMatchPlayer`, `coachId` y `user` en `ManualMatch`
- `client/src/pages/Analisis/AnalisisList.tsx`: filtro "Jugador", insignia en la tarjeta, selector "Analizar a" (solo AdminClub; el DOM del jugador no cambia, los snapshots existentes siguen iguales)
- `client/src/components/layout/MainLayout.tsx` (+ test): la entrada "Análisis Pro" del menú lateral se muestra también al AdminClub (antes solo al jugador)
- `client/src/pages/Analisis/AnalisisList.entrenador.test.tsx` (nuevo)

## Notas para retomar

- El build de `api` (`npm run build`) hace `prisma db push`: no se ha ejecutado a propósito. Verificado con `npx tsc --noEmit`, `npm run lint` y `npx vitest run`.
- Cambios sin guardar ajenos a este trabajo (no tocar ni commitear): `.codebase-memory/*`, `api/prisma/baseDataAndDemo.ts`, `api/prisma/demo/`, `.claude/`.
- Prisma está mockeado en los tests: ninguno prueba SQL real. Para consultas nuevas, probar contra la BD local.
- Cliente: reutilizar el servicio existente que lista jugadores del club antes de crear nada nuevo. Declarar URLs nuevas en `client/src/api/endpoints.ts` primero; usar los módulos de `api/services/*`.

## Hallazgo conocido fuera de alcance

`PUT /api/manual-matches/:id/complete` no comprueba que el análisis siga abierto: repetirlo (reintento, doble toque) suma otra vez estadísticas y habilidades al dueño. Ya ocurría antes con el propio jugador; ahora también lo puede provocar un AdminClub del club. Arreglo sugerido, en un cambio aparte: `updateMany` condicionado a `status != Completado` dentro de la transacción y responder 409 si no actualiza nada.
