# Plan de refactor y seguridad de `api/`

Análisis hecho el 2026-10-26 con el grafo de `codebase-memory` y lectura directa de las rutas, con el vocabulario de `docs/matt/skills/engineering/codebase-design/SKILL.md` (depth, seam, adapter, leverage, locality). Rama de trabajo: `fix/api-autorizacion`.

## Diagnóstico

- **Lo que está bien:** `utils/auth.ts` es un módulo profundo (una política, `resolveClubScope`, y varios helpers derivados); `asyncHandler` + `errorHandler` es un seam limpio; los motores de torneo están separados y con tests.
- **Por qué no se veía:** los tests de rutas mockeaban los propios guardas (`verifyToken` asignaba siempre un usuario con permisos), así que ninguno podía detectar un guarda ausente. Se creó un arnés (`api/src/testing/`) que firma JWT reales y solo mockea Prisma.
- **Handlers como scripts de transacción:** cada ruta mezcla validación, autorización, Prisma y efectos. Faltan módulos de dominio detrás de las rutas (fase E).
- **`http/response` infrautilizado:** `sendData` en 3 archivos, `sendError` en 1, `sendMessage` en 1; el resto escribe `res.status().json()` a mano (fase D).

## Fases

| Fase | Objetivo | Estado |
|---|---|---|
| **A** | Cerrar agujeros de autorización y fugas de datos | **Hecha** (ver abajo) |
| **B** | Seam de identidad: `verifyToken` lee rol y club vigentes de la base de datos (hoy los claims del JWT duran 30 días); un único `issueToken` | **Hecha** (B1 `2a19d37`; B2 sin commit): `utils/session.ts` (`issueToken`, `loadSessionIdentity`), `verifyToken` lee de la BD; JWT de 1 h + refresh token opaco con hash en BD (tabla `refresh_token`), rotación por familia con detección de reutilización, `POST /auth/refresh` y `/auth/logout`, revocación al restablecer contraseña; cliente web y app Expo renuevan ante un 401 |
| **C** | Perímetro: `helmet`, `express-rate-limit` (login, register, forgot, reset), Swagger fuera de producción, `GET /clubs` público, `npm audit` de `api/` | **Hecha**: helmet, limitadores por ruta + red general, `trust proxy`, Swagger solo fuera de producción, `npm audit` a 0 (nodemailer 9→10.2.1 incluido); `GET /clubs` revisado: sus 5 campos los usa `ClubSelection`, no expone datos personales, se deja igual |
| **D** | Contrato de respuesta único (todas las rutas por `sendData/sendMessage/sendError`, regla de lint, las 4 respuestas fuera del sobre) y adaptar el cliente | **Hecha**: ~290 respuestas migradas (codemod + 13 a mano), regla `no-restricted-syntax` que prohíbe `res.json` / `res.status().json`; las respuestas fuera del sobre (auth, crear torneo, inscribir, `PUT /users/me`, cuadro 404, middleware de auth, webhook) ya usan el sobre; cliente web y app Expo adaptados |
| **E** | Módulos de dominio con `$transaction` (membresía de club, aplicación de resultado de partido); rutas finas | **Hecha**: `utils/match-result.ts` (partido + estadísticas + clasificación en una transacción, avance del torneo después), `utils/club-membership.ts` (crear club, solicitar ingreso, resolver solicitud), `utils/transaction.ts`; además el guarda de club pendiente (decisión del dueño: «solo gestionar su club») y el cierre de la autoaprobación de club |
| **F** | Higiene: 324 errores de lint previos (`any`, variables sin usar), valores fijos a entorno, email en minúsculas en `register`, `select` en el cron, zona horaria, enumeración de usuarios | Pendiente |

## Fase A: lo corregido (cada punto con su test en rojo primero)

| Commit | Hallazgo | Corrección |
|---|---|---|
| `340457e` | **Fuga de credenciales**: `GET /tournaments/:id`, `PUT /teams/:id/players`, `PUT /users/:id` y `POST /users/guest` devolvían el usuario entero (hash de contraseña, `resetPasswordToken`, `verificationToken`, `googleId`) | `toSafeUser` en las cuatro respuestas + arnés de pruebas de seguridad |
| `0c2c539` | `POST /matches` y `PUT /matches/:id` sin rol ni club: cualquier jugador cambiaba marcadores y ELO de cualquier partido | `requireAdminClub` + `hasClubPermission` sobre el club del torneo (o del jugador); `hasClubPermission` ya no concede por `null === null` |
| `063bed9` | Eventos: un AdminClub editaba/borraba eventos de otro club; lectura y avisos sin comprobar club | `resolveResourceAccess` / `canAccessClub` |
| `28b73f7` | Torneos: `generate-groups` sin guarda, `register-bulk` sin validar, lectura de cualquier torneo, AdminClub sin club veía todos | `requireAdminClub` + acceso, `registerBulkSchema`, `router.param('id')` con visibilidad, filtro vacío corregido |
| `d6512d3` | `userTypeId` aceptado de un AdminClub en `POST/PUT /users` (escalada de rol; atenuado porque `/user-types` es solo SuperAdmin) | Solo el SuperAdmin asigna roles |
| `d5edfef` | Planes, sesiones y ejercicios de entrenamiento sin comprobar club ni propietario | `utils/training-access` (`canViewTraining`, `canManageTraining`) |
| `b600444` | Partidos manuales: editar/completar/puntos de partidos ajenos; `complete` suma estadísticas al que llama | `isOwnMatch` (404 igual que el GET) |
| `4a50330` | Un AdminClub sin club administraba jugadores libres (`null === null`) en 5 rutas | `hasClubPermission` en lugar de comparaciones a mano |
| `bc27485` | `GET /general-trainings` sin club devolvía todos los clubes; horario de otro club; plantilla con jugadores de otro club; asistencia a partidos ajenos | Filtros y comprobaciones por club |
| `d41a2cb` | Login con Google sin `email_verified` (vincula por correo) | 401 si no está verificado |

**Verificación tras la fase A:** api 557/557 tests (de 378 al empezar), `tsc` sin errores. Los archivos nuevos no tienen avisos de eslint; los 324 errores previos de `api/` son de la fase F.

## Acciones de despliegue / decisiones para el dueño

- **Invalidar los `resetPasswordToken` vigentes** en producción (por ejemplo `UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL`): hasta este fix cualquier usuario autenticado podía leer los de los participantes de un torneo. Valorar también si hubo contraseñas expuestas (hash bcrypt) y rotar `JWT_SECRET` si hay sospecha de uso.
- **Autorización pendiente de política de negocio:** `GET /tournaments/:id` ahora aplica la misma visibilidad que el listado; un jugador no aprobado en el club ya no ve los torneos internos de ese club por URL directa.
- **Pendiente de decidir:** ¿es intencional que cualquiera se registre como `AdminClub`?; ¿`GET /clubs` debe seguir siendo público?; con la fase B, ¿se mantiene la caducidad de 30 días del JWT?
- **No revisado por dentro:** `utils/tournament-inscriptions` (registro de un jugador por otro), `exercise.ts` (catálogo), `skills`/`stats` (cálculo). El `PUT /users/me` usa `req.body` directo para `secondSurname`.
