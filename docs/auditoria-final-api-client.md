# Auditoría final de `api/` y `client/`

Fecha: 2026-10-26, tras cerrar las fases A-F de la API y el refactor de `client/`.
Método: grafo de `codebase-memory` reindexado (6.796 nodos, 16.679 aristas; 0 ciclos de llamadas en `api/src` y en `client/src`), complementado con lectura directa y búsquedas de texto para lo que el grafo no mide (tamaños, literales, patrones de seguridad). Vocabulario: `docs/matt/skills/engineering/codebase-design/SKILL.md` (depth, seam, adapter, leverage, locality, prueba de borrado).

**Conclusión corta:** no queda deuda estructural grave ni nada crítico en el código. Lo que queda es de prioridad media y baja: endurecimiento puntual de seguridad, tres sitios donde faltan transacciones, la política de permisos aún duplicada en 15 comprobaciones sueltas, y en el cliente cuatro pantallas «dios» y la ausencia de *code splitting*. **Ningún hallazgo bloquea el paso a producción**; los más baratos (G1) conviene hacerlos antes.

---

## 1. Lo que está bien (módulos profundos y seams reales)

| Módulo | Interface | Por qué es profundo | Evidencia |
|---|---|---|---|
| `api/src/http/response.ts` | `sendData / sendMessage / sendError / asyncHandler` | Un contrato de respuesta detrás de 4 funciones; el lint lo impone | Fan-in 29 / 21 / 17 / 25 (los 4 mayores del grafo de la API) |
| `api/src/utils/auth.ts` | `resolveClubScope`, `hasClubPermission`, `canAccessClub`, `resolveResourceAccess` | Toda la política multi-tenant en un sitio | `hasClubPermission` 31 usos, `resolveResourceAccess` 11 |
| `utils/session.ts` + `refresh-token.ts` | `issueToken`, `loadSessionIdentity`, `startSession`, `rotateRefreshToken` | Rotación, reutilización y revocación escondidas tras 5 funciones | Lo usan login, Google, refresh, logout y `verifyToken` |
| `utils/match-result.ts` | `createMatch`, `updateMatch` | Atomicidad de partido + estadísticas + clasificación | Dos llamadas en la ruta en lugar de cinco pasos sueltos |
| `utils/club-membership.ts` | `createClub`, `requestMembership`, `resolveMembership` | Altas/bajas atómicas, sin carreras | Idem |
| Motores puros (`knockout-engine`, `group-engine`, `group-standings`, `match-rules`…) | Funciones puras | Se prueban sin mocks | Tests propios |
| `client/src/api/client.ts` (adapter `http`) | `get/post/put/patch/delete` | Es el **único** sitio que conoce el sobre de la API | Fan-in 31 / 30 / 19 / 9 |
| `client/src/hooks/usePermissions.ts` | `{ isAdmin, isAdminClub, isSuperAdmin, isPlayer }` | Un único criterio de permisos de interfaz | Fan-in 16 |
| `client/src/api/session.ts` | `refreshSession` | Renovación única compartida entre peticiones concurrentes | 5 tests que fallan si se rompe cualquiera de sus reglas |
| Arnés `api/src/testing/` | `prismaMock`, `bearer(...)` | Adapter que sustituye la base de datos y deja reales los guardas | 20 ficheros de test lo usan |

La fusión `TorneoDetalles` + 5 hooks (`useTorneoFormato`, `…Inscripcion`, `…Partido`, `…Intercambio`, `…Acciones`) es el patrón de referencia del cliente: página fina, hooks profundos.

---

## 2. Hallazgos

Severidad: **Alta** = arreglar antes de producción · **Media** = próximo ciclo · **Baja** = higiene.

### API

| # | Sev. | Tipo | Hallazgo | Dónde | Vocabulario |
|---|---|---|---|---|---|
| A1 | Media | Seguridad | Los tokens de un solo uso (`resetPasswordToken`, `verificationToken`) se guardan **en claro**: quien lea la base de datos (copia de seguridad, SQL inyectado futuro, un `include` olvidado) puede restablecer cualquier cuenta | `routes/auth.ts`, columnas de `user` | Falta un adapter «token de un solo uso» con hash, como el de `refresh-token` |
| A2 | Media | Seguridad | `PUT /users/me` lee `secondSurname`, `nickname` y `avatarUrl` de `req.body` **sin pasar por Zod** (sin longitud máxima ni validación de URL) | `routes/user/profile.ts:77-79` | Salta el seam de validación: el portero no está en la puerta |
| A3 | Media | Seguridad | Cambiar la contraseña desde el perfil **no revoca las sesiones** abiertas (solo `reset-password` llama a `revokeAllUserSessions`) | `routes/user/profile.ts` | Locality: la regla «cambiar credencial ⇒ cerrar sesiones» vive en un solo caller |
| A4 | Media | Seguridad | Los endpoints caros (`generate-groups`, exportación y creación desde Excel) solo están bajo el límite general (1000/15 min) | `routes/tournament/bracket.ts` | El plan de la fase C pedía límites más agresivos para estos |
| A5 | Baja | Seguridad | Parámetros de consulta sin validar: `type` (cuadro A/B) se castea y `groupId` se pasa tal cual | `routes/tournament/queries.ts:161,175,185` | Idem A2 |
| A6 | Media | Integridad | Secuencias de escritura **sin transacción**: inscribir en lote (`createMany` + contadores de estadísticas), cambio de estado de un participante (4 ramas de `stats.updateMany`), editar eventos (`deleteMany` + `createMany` de recordatorios), crear ejercicios de sesión en lote | `tournament/registration.ts`, `event.ts`, `training/exercises.ts` | Faltan módulos con el mismo patrón que `match-result` y `club-membership` |
| A7 | Media | Acoplamiento | **15 comprobaciones de rol a mano** (`role === 'SuperAdmin'`…) en 8 rutas conviviendo con el seam de `utils/auth` | `club`, `match`, `team`, `feedback`, `exercise`, `tournament/queries`, `tournament/commands`, `user/commands` | Prueba de borrado: la política reaparece repartida en 8 callers; el seam no es todavía la única fuente de verdad |
| A8 | Baja | Estructura | `routes/auth.ts` (307 líneas) mezcla registro, login, Google, refresh, logout, verificación y recuperación; el alta de usuario de Google se hace inline | `routes/auth.ts` | Módulo ancho: candidato a `routes/auth/*` + un módulo de credenciales |
| A9 | Baja | Tests | 17 ficheros de test antiguos **mockean los propios guardas** (`auth.middleware`): no pueden detectar un guarda ausente. Solo 20 ficheros usan el arnés real | `routes/*.test.ts` | Seam falso: el adapter del test sustituye justo lo que habría que probar |
| A10 | Media | Calidad | **Cobertura sin medir en la API**: falta `@vitest/coverage-v8`; la regla del repo exige 80 % | `api/package.json` | — |
| A11 | Media | Operaciones | No hay **CI** para API ni cliente (el único workflow es el de iOS). Los 658 + 1846 tests solo se ejecutan si alguien se acuerda | `.github/workflows/` | — |
| A12 | Baja | Operaciones | `Dockerfile` de la API arranca en modo desarrollo (`tsx watch`); el build de producción usa `prisma db push` en lugar de `migrate deploy` | `api/Dockerfile`, `package.json` | — |
| A13 | Media | Seguridad | `docker-compose.yaml` lleva `CRON_SECRET` y la contraseña de Postgres en claro y versionados; no lee el `.env` de la raíz (contra lo que dice `CLAUDE.md`) | `docker-compose.yaml` | — |
| A14 | Baja | Higiene | `prisma/oldseeds.ts` y `baseDataAndDemo.ts` sin uso claro | `api/prisma/` | Prueba de borrado: si se borra `oldseeds.ts` no desaparece nada |
| A15 | Baja | Documentación | Swagger documenta peticiones (derivadas de Zod) pero no las respuestas | `swagger/` | — |

### Client

| # | Sev. | Tipo | Hallazgo | Dónde | Vocabulario |
|---|---|---|---|---|---|
| C1 | Media | Estructura | **Cuatro pantallas «dios»**: una sola función de 531 líneas (`Estadisticas`), 480 (`CalendarioEventos`), 448 (`MainLayout`: navegación + notificaciones + onboarding + cambio forzado de contraseña) y `Partidos` 459; además `AnalisisList` 386 y `Login` 365 (login + registro + Google) | `pages/`, `components/layout/` | Módulos **poco profundos**: interface (props/ruta) simple pero la implementación mezcla carga de datos, estado, manejadores y JSX. El patrón de `TorneoDetalles` está sin aplicar aquí |
| C2 | Media | Rendimiento | **Sin *code splitting***: `App.tsx` importa las 30 páginas de forma estática (0 `React.lazy`) y el build es **un solo `index.js` de 1,5 MB** | `App.tsx` | `.clinerules` pide `lazy` + `Suspense` |
| C3 | Media | Seguridad | Token de acceso **y** refresh token en `localStorage`: si hubiese XSS se roban ambos. Mitigado: 0 `dangerouslySetInnerHTML`, React escapa por defecto, tokens de 1 h | `api/session.ts`, `store/authStore.ts` | Seam de almacenamiento: solo hay un adapter (`localStorage`). En iPhone cabe un segundo (Keychain) → ahí el seam sería real |
| C4 | Media | Seguridad | Sin cabecera/`<meta>` de **Content-Security-Policy**; la app habla con la API, Google y DiceBear | `index.html`, hosting | — |
| C5 | Media | Privacidad | `getPlayerAvatar` envía **el nombre real del jugador** como `seed` a `api.dicebear.com` (tercero) para generar el avatar | `utils/avatar.ts:6` | Un cambio de adapter (generar iniciales en local o usar un identificador opaco) lo elimina |
| C6 | Baja | Higiene | Dependencia **`fs`** (`^0.0.1-security`) en `package.json`: es el paquete señuelo de npm, no sirve para nada | `client/package.json` | Prueba de borrado: borrarla no cambia nada |
| C7 | Baja | Higiene | 54 `console.*` en producción y 4 avisos `exhaustive-deps` en esta rama (los arregla `chore/seguridad-client`) | `src/` | — |
| C8 | Baja | Seguridad | `capacitor.config.ts` con `server.cleartext: true` y `androidScheme: 'http'`, más un bloque comentado con IDs de Google | `capacitor.config.ts` | — |
| C9 | Baja | UX/Seguridad | Sin guarda de **rol por ruta**: `/admin` y similares se renderizan para cualquiera (el servidor sí deniega con 403, así que es cosmético/ruido de errores) | `App.tsx` | Un `RequireRole` basado en `usePermissions` sería un módulo profundo de 10 líneas |
| C10 | Baja | Estructura | `types/api.ts` (423 líneas) concentra los tipos de todos los dominios | `types/` | Locality: dividir como `api/services/*` |
| C11 | Media | Calidad | No hay script `test` ni `test:coverage` en `package.json` (los tests se lanzan con `npx vitest run`); no hay E2E; la cobertura no se publica | `client/package.json` | — |
| C12 | Baja | Seguridad | `npm audit` en esta rama: 6 vulnerabilidades (2 críticas de `@capacitor/*`, `axios`, `xmldom`…). **Las corrige la rama `chore/seguridad-client`** | — | Se cierran con la fusión |

### Duplicación

- **API:** el patrón «buscar → 404 → `hasClubPermission` → 403 → actuar» aparece en decenas de handlers; `resolveResourceAccess` lo cubre en 11, el resto lo reescribe (relacionado con A7).
- **Client:** sin duplicación relevante en utilidades (`formatDate`, `getPlayerAvatar`, `openAppConfirmModal` están centralizadas con fan-in 10-15). Los *snapshots* son abundantes pero son tests, no lógica.

---

## 3. Plan de acción por fases (de mayor a menor prioridad)

Todas las fases siguen las reglas del repo: un cambio por vez, RED primero, commit atómico, suite completa en verde.

### Fase G1 — Endurecimiento de seguridad (pequeña, **recomendable antes de producción**) · ~1 sesión

1. **A2 + A5** Esquemas Zod para los campos sueltos de `PUT /users/me` y los parámetros de consulta del cuadro (`type`, `groupId`).
2. **A3** Revocar todas las sesiones al cambiar la contraseña desde el perfil (reutiliza `revokeAllUserSessions`).
3. **A4** Limitador específico y más duro para `generate-groups` y las rutas de Excel.
4. **A1** Guardar el hash (SHA-256) de `resetPasswordToken` y `verificationToken`; comparar con el hash. No requiere migración (mismas columnas); los tokens pendientes dejan de valer, lo cual es aceptable.
5. **A13** Pasar `docker-compose.yaml` a leer el `.env` de la raíz (decisión tuya por el volumen de la base de datos local).

### Fase G2 — Puertas de calidad (CI) · ~1 sesión

1. **A11** Workflow de GitHub Actions: en cada PR, `api` (`tsc`, `lint`, `vitest`, `npm audit --omit=dev`) y `client` (`tsc -b`, `lint`, `vitest`, `build`, `npm audit --omit=dev`). Separado del de iOS.
2. **A10 + C11** Instalar `@vitest/coverage-v8` en `api/`; añadir scripts `test` y `test:coverage` en ambos; fijar el umbral (80 %) y publicar el informe.
3. **A12** Imagen de producción para la API (build + `node dist`) y `prisma migrate deploy` como paso de despliegue.

### Fase G3 — Integridad de datos · ~1-2 sesiones

1. **A6** Módulo `utils/tournament-registration.ts` (inscripción individual/en lote y cambio de estado con sus contadores) dentro de `$transaction`, con el mismo patrón y tests que `match-result`.
2. Módulo de recordatorios de evento (borrar + recrear atómico).
3. Lote de ejercicios de sesión en una transacción.

### Fase G4 — Cerrar el seam de permisos · ~1 sesión

1. **A7** Sustituir las 15 comprobaciones `role === …` por helpers de `utils/auth` (p. ej. `isSuperAdmin(user)`), con tests de identidades reales.
2. **A9** Migrar de mocks de guardas al arnés real las baterías antiguas, empezando por `club`, `team` y `user`.

### Fase G5 — Cliente: carga y endurecimiento · ~1 sesión

1. **C2** `React.lazy` + `Suspense` por ruta (objetivo: el bundle inicial por debajo de ~500 kB).
2. **C4** CSP en el hosting y/o `<meta>`; revisar `connect-src` (API, Google) e `img-src` (DiceBear si se mantiene).
3. **C5** Avatares sin enviar el nombre a un tercero.
4. **C9** `RequireRole` para las rutas de administración.
5. **C3** (iPhone) Valorar guardar el refresh token en Keychain (plugin de almacenamiento seguro de Capacitor); la web sigue con `localStorage`.

### Fase G6 — Cliente: pantallas «dios» · ~1 sesión por pantalla

Aplicar el patrón de `TorneoDetalles` (página fina + hooks con test + componentes presentacionales), **una pantalla cada vez y copiando el JSX tal cual**, en este orden por tamaño y riesgo: `MainLayout` → `Estadisticas` → `CalendarioEventos` → `Partidos` → `Login` → `AnalisisList`.

### Fase G7 — Higiene · ~media sesión

`fs` (C6), 54 `console.*` (C7), `capacitor.config.ts` (C8), `types/api.ts` por dominios (C10), `oldseeds.ts` (A14), `routes/auth.ts` por casos de uso (A8), respuestas en Swagger (A15).

---

## 4. Qué haría yo antes de producción

Solo **G1** (1-3 horas de trabajo real): son los hallazgos que alguien podría explotar y los arreglos son pequeños y localizados. **G2** conviene hacerlo justo después: sin CI, la próxima regresión depende de memoria humana. El resto puede esperar a después del despliegue sin riesgo.
