# API — Ping Pong App

Backend REST de la aplicacion de torneos de tenis de mesa (`TT Tournament App`).
Node 24 · Express 5 · TypeScript · Prisma · PostgreSQL 16 · Zod 4 · Vitest.

---

## Que hace esta API

Gestiona la **competicion completa** de un club: usuarios y roles, clubes con
aislamiento multi-tenant, torneos con fase de grupos y eliminatorias, partidos
con ELO, equipos, entrenamientos, eventos y analitica avanzada.

### Dominio

| Area | Descripcion |
|---|---|
| **Identidad** | Registro, login local, OAuth2 con Google, verificacion por correo, recuperacion de contrasena, roles `SuperAdmin` / `AdminClub` / `Player`, **sesiones de 1 hora con refresh token rotatorio y revocable** |
| **Clubes** | Alta (un club nuevo queda `Pendiente` hasta que lo aprueba el SuperAdmin), solicitudes de ingreso, aprobacion de miembros, notificaciones, estados de membresia |
| **Torneos** | Configuracion, inscripciones, reparto en grupos (serpiente), eliminatorias con siembra ITTF, intercambios de jugadores, clasificacion final |
| **Partidos** | Creacion, marcador validado por reglas de tenis de mesa, ELO, actualizacion de clasificaciones de grupo |
| **Entrenamiento** | Macrociclos, sesiones, ejercicios, crecimiento de atributos, clases grupales con horarios recurrentes |
| **Equipos** | Plantillas, calendarios de liga, disponibilidad de jugadores |
| **Analisis** | Partidos manuales con tracker de puntos y habilidades tecnicas |
| **Eventos** | Calendario de club con recordatorios por email |
| **Temporadas** | Temporada vigente, con inicializacion automatica al arrancar |

### Aislamiento por club (multi-tenant)

El alcance de cada usuario se decide en **un solo sitio** (`src/utils/auth.ts`):

- `SuperAdmin` → ve todo el sistema.
- `AdminClub` → solo los recursos de su club.
- Sin club asignado → **no ve datos de club** (alcance `none`); solo recursos sin club.

El AdminClub de un club **`Pendiente`** (o `Inactivo`) solo puede gestionar los
datos de su club (`PUT /clubs/:id`, ver miembros y notificaciones): el guarda
`requireAdminClub` le niega crear torneos, partidos, equipos, eventos o resolver
solicitudes hasta que el SuperAdmin apruebe el club. El estado se lee de la base
de datos en cada peticion (`req.user.clubStatus`), asi que aprobar un club surte
efecto de inmediato. Solo el SuperAdmin puede cambiar el `status` de un club.

Este seam evita que cada ruta reimplemente la regla: las funciones
`resolveClubScope`, `buildClubScope`, `buildNullableClubScope`, `hasClubPermission`,
`canAccessClub` y `resolveResourceAccess` son la unica fuente de verdad.

---

## Arbol de ficheros

```
api/
├── prisma/
│   ├── schema.prisma            # 32 modelos, 33 enums, 35 tablas mapeadas a snake_case
│   ├── baseDataAndDemo.ts       # Datos iniciales de demo
│   └── migrations/              # Migraciones SQL versionadas
├── public/
│   ├── assets/                  # Plantilla maestra de Excel
│   └── .well-known/             # Apple App Site Association (PWA iOS)
├── src/
│   ├── index.ts                 # Bootstrap: helmet, CORS, limites, rutas, Swagger, fail-fast
│   ├── config.ts                # Variables de entorno obligatorias y origenes CORS
│   ├── db.ts                    # Instancia unica de Prisma
│   ├── swagger.ts -> swagger/    # Documentacion OpenAPI
│   ├── http/                    # Contrato de respuesta y middleware de errores
│   ├── middleware/              # Autenticacion, autorizacion y limites de intentos
│   ├── routes/                  # Adaptadores HTTP (un modulo por dominio)
│   ├── schemas/                 # Esquemas Zod (validacion en la puerta)
│   ├── services/                # Efectos externos: email, Excel
│   ├── testing/                 # Arnes de pruebas de seguridad (Prisma simulado + JWT reales)
│   └── utils/                   # Dominio: motores puros y modulos con transacciones
```

Los tests van **colocados junto al codigo** (`*.test.ts`), no en una carpeta
central: `src/utils/knockout-engine.test.ts` testea `src/utils/knockout-engine.ts`.

### `src/http/` — Contrato de respuesta (nuevo)

Un unico formato para toda la API:

```typescript
// Exito
{ success: true, data?, message? }
// Error
{ success: false, error, details? }
```

| Fichero | Que aporta |
|---|---|
| `response.ts` | `ApiError`, `sendData`, `sendMessage`, `sendError` y `asyncHandler` |
| `error-handler.ts` | Middleware central: formatea cualquier error y nunca filtra stack traces |

`asyncHandler` envuelve los handlers asincronos y propaga sus fallos al
middleware central, de modo que **las rutas no necesitan `try/catch`**.

El contrato **lo impone el linter**: una regla `no-restricted-syntax` prohibe
`res.json(...)` y `res.status(n).json(...)` en `src/` (salvo `http/response.ts` y
los tests). Los guardas de autenticacion y el limitador de intentos responden con
el mismo formato (`{ success: false, error }`).

Respuestas de autenticacion:

| Ruta | Respuesta |
|---|---|
| `POST /auth/login`, `POST /auth/google` | `{ success, message, data: { token, refreshToken } }` |
| `POST /auth/refresh` | `{ success, data: { token, refreshToken } }` |
| `POST /auth/logout`, `/register`, `/forgot-password`, `/reset-password` | `{ success, message }` |

### `src/routes/` — Adaptadores HTTP

Cada dominio es un modulo con sub-modulos por caso de uso:

```
routes/
├── index.ts                 # Router central: monta los dominios bajo /api (limite general)
├── auth.ts  club.ts  event.ts  exercise.ts  feedback.ts
├── general-training.ts  manual-match.ts  match.ts  season.ts
├── skill.ts  team.ts  user-type.ts  webhook.ts
├── tournament/              # queries · commands · registration · bracket
├── training/                # plans · sessions · exercises · player
└── user/                    # queries · profile · commands · guest
```

Los sub-modulos de un dominio se montan en un indice que exporta **un unico
Router**. El orden de montaje importa: las rutas literales (`/me`, `/guest`)
deben resolverse antes que las parametricas (`/:id`).

### `src/schemas/` — Validacion (Zod)

Un esquema por dominio. Es la puerta de entrada: la ruta valida **antes** de
tocar Prisma, y los errores de Zod se devuelven en `details`.

### `src/utils/` — Dominio

Los modulos marcados como **puros** no tocan la base de datos y se testean sin
mocks:

| Modulo | Responsabilidad |
|---|---|
| `group-engine.ts` | Reparto de jugadores en grupos (serpiente) |
| `group-standings.ts` | Clasificacion de la fase de grupos y desempates |
| `knockout-engine.ts` | Grafo del cuadro de eliminatorias |
| `knockout-assignment.ts` | Siembra ITTF y reparto sin emparejar del mismo grupo |
| `tournament-positions.ts` | Posiciones finales (ronda → puesto) |
| `tournament-rules.ts` | Reglas de configuracion de un torneo |
| `match-rules.ts` | Reglas de marcador de un partido |
| `tournament-inscriptions.ts` | Reglas de inscripcion a un torneo |
| `tournament-swap.ts` | Reglas del intercambio de jugadores |
| `match.ts` | Agregado de sets y puntos |
| `skills.ts` | Crecimiento de atributos tecnicos |
| `auth.ts` | Politica de alcance y permisos por club |
| `timezone.ts` | Dias de calendario en la zona horaria de los clubes (`zonedDayBounds`) |
| `safe-user.ts` | `toSafeUser`: quita hash, tokens y `googleId` de un usuario antes de responder |
| `match-access.ts`, `training-access.ts` | Quien puede ver o gestionar un partido / un entrenamiento |

Los modulos **adaptador** hablan con Prisma: `knockout.ts`, `group-generator.ts`,
`standings.ts`, `stats.ts`, `match-processor.ts`, `season.ts`.

Los modulos de **operacion con transaccion** agrupan escrituras que deben
ocurrir juntas o no ocurrir. Las rutas validan y autorizan, y delegan aqui:

| Modulo | Interface | Que garantiza |
|---|---|---|
| `session.ts` | `issueToken`, `loadSessionIdentity` | Unico sitio que firma el JWT y que relee rol, club y estado del club de la base de datos en cada peticion |
| `refresh-token.ts` | `startSession`, `rotateRefreshToken`, `revokeRefreshToken`, `revokeAllUserSessions` | Refresh token opaco (solo se guarda su hash SHA-256), rotacion en cada uso, deteccion de reutilizacion (revoca toda la familia) |
| `match-result.ts` | `createMatch`, `updateMatch` | Partido + estadisticas + clasificacion del grupo en una transaccion; el avance del torneo va despues del commit |
| `club-membership.ts` | `createClub`, `requestMembership`, `resolveMembership` | Altas y bajas de miembros atomicas y sin carreras |
| `transaction.ts` | `inTransaction` | Abre una transaccion o se une a la existente (Prisma no anida) |

### `src/swagger/` — Documentacion OpenAPI

La documentacion esta **dividida por dominio** y sus **cuerpos de peticion se
derivan de los esquemas de Zod** (`z.toJSONSchema` de Zod 4), de modo que la
documentacion no puede desviarse de lo que la API valida de verdad.

```
swagger/
├── index.ts          # Definicion OpenAPI: info, tags, security y composicion de paths
├── zod-schema.ts     # Derivacion Zod → OpenAPI 3.0
└── paths/            # 15 sub-modulos, uno por dominio
```

---

## Funciones a destacar

### `assignFirstRound` — siembra ITTF sin emparejar del mismo grupo

`src/utils/knockout-assignment.ts`. Reparte a los clasificados en la primera
ronda cumpliendo tres reglas de tenis de mesa:

1. Las semillas **1 y 2** quedan fijas en **mitades opuestas** (solo se cruzan en la final).
2. Las semillas **3 y 4** se **sortean** entre si, de modo que cada una se cruza
   con el 1 o con el 2 en fase semifinales; el mismo criterio se aplica a los
   bloques 5-8, 9-16, etc.
3. Los **byes** se emparejan con los cabezas de serie mas altos (1, 2, 3...), que
   pasan directos a la siguiente ronda.

El algoritmo es **determinista** (mismos jugadores → mismo cuadro) y la
reparacion de conflictos es **monotona**: cada intercambio reduce el numero de
parejas invalidas, asi que termina y nunca oscila.

### `buildGroupsEngine` + `buildGroupStandings`

`src/utils/group-engine.ts` y `group-standings.ts`. Reparto en serpiente y
clasificacion con los tres desempates oficiales. Ambas son puras: no requieren
base de datos.

### `processMatchResult`

`src/utils/match-processor.ts`. Orquesta el cierre de un torneo: actualiza
clasificaciones, genera el cuadro de eliminatorias cuando corresponde y avanza
rondas. Coordinador de tres seams privados, cada uno con una responsabilidad.
Se ejecuta **despues** del commit de `match-result.ts`: abre sus propias
transacciones y se recalcula desde los partidos guardados.

### Sesiones: `issueToken` + refresh token rotatorio

`src/utils/session.ts` y `src/utils/refresh-token.ts`.

- El **token de acceso dura 1 hora** (`ACCESS_TOKEN_TTL`). Lleva `id`, `role` y
  `clubId` solo para que la interfaz los lea: `verifyToken` **no se fia de ellos**
  y vuelve a leer rol, club y estado del club de la base de datos en cada peticion
  (un usuario degradado, expulsado, borrado o desactivado pierde el acceso de
  inmediato; un club recien aprobado, tambien).
- La sesion larga la sostiene un **refresh token opaco de 30 dias** guardado solo
  como hash. Cada `POST /auth/refresh` lo revoca y emite otro de la misma familia.
  Presentar uno ya usado indica una copia robada y **revoca toda la familia**.
- El canje es condicional (`updateMany ... revokedAt: null`): de dos peticiones
  simultaneas con el mismo token solo una gana.
- Restablecer la contrasena revoca todas las sesiones del usuario.

### `createMatch` / `updateMatch`

`src/utils/match-result.ts`. Guarda el partido, revierte y aplica las
estadisticas de los jugadores (ELO, sets, habilidades) y recalcula la clasificacion
del grupo **en una sola transaccion**. Antes un fallo a mitad dejaba un partido
completado sin estadisticas que un reintento no podia arreglar.

### `resolveCurrentSeason` / `ensureCurrentSeason`

`src/utils/season.ts`. La temporada vigente se **inicializa una sola vez al
arrancar** y el resto de la app solo la lee. Evitar que cada lectura escriba
en la base de datos era una fuente de concurrencia innecesaria.

### `asyncHandler` + `errorHandler`

`src/http/`. Un unico punto donde se decide que se responde cuando algo falla.
El log del servidor conserva el detalle real; el cliente solo recibe un mensaje
seguro. Si el error lanzado ya es un `ApiError`, se respeta su codigo y su
mensaje: un error de dominio no se disfraza de fallo del servidor.

### `getAllowedOrigins`

`src/config.ts`. Origenes CORS: los fijos de desarrollo y de la app nativa
(`localhost`, `capacitor://localhost`) mas `CLIENT_URL` y los de `CORS_ORIGINS`.
No hay dominios de produccion escritos en el codigo.

### `zonedDayBounds`

`src/utils/timezone.ts`. Inicio y fin de un dia de calendario en la zona horaria
de los clubes (`APP_TIMEZONE`, por defecto `Europe/Madrid`), respetando los cambios
de hora. El servidor corre en UTC: el cron de recordatorios lo usa para que
«manana» sea el dia siguiente **en Madrid**.

### `buildTournamentExportData`

`src/services/excel-data.ts`. Calcula **todo** lo que la plantilla de Excel
necesita (jugadores normalizados, grupos, cruces, cuadro) sin leer ficheros ni
generar ningun Excel. `src/services/excel.ts` se limita a volcar esos datos en
las celdas. La logica de exportacion se testea sin mockear la libreria.

---

## Reglas de la casa

- **La validacion va en el schema**, no en la ruta. Zod es el portero.
- **Un solo formato de respuesta**, impuesto por el linter: `sendData`, `sendMessage`, `sendError`.
- **Un solo sitio decide el alcance por club.** `src/utils/auth.ts`.
- **Los secretos no tienen fallback.** Si falta `JWT_SECRET`, `CRON_SECRET` o
  `CLIENT_URL`, la aplicacion no arranca.
- **Rol y club se leen de la base de datos**, nunca del JWT.
- **Las escrituras que deben ir juntas van en una transaccion**, dentro de un modulo de `src/utils/`.
- **Los datos de usuario que acaban en HTML se escapan** (`escapeHtml` en las plantillas de correo).
- **Los motores de dominio son puros** y se testean sin mocks.
- **Las rutas no repiten reglas de negocio**: las delegan en `src/utils/`.

---

## Seguridad

| Capa | Que hay |
|---|---|
| **Cabeceras** | `helmet` en toda la API (con `Cross-Origin-Resource-Policy: cross-origin` para los iconos de los correos) |
| **Limites de intentos** (por IP, `trust proxy` = 1) | login y Google 10 fallidos / 15 min (los aciertos no cuentan), registro 10 / h, recuperar y restablecer contrasena 5 / 15 min, refresh 60 / 15 min, resto de `/api` 1000 / 15 min. Contadores en memoria: con varias instancias habria que usar un almacen compartido |
| **Autenticacion** | JWT de 1 h + refresh token rotatorio; identidad releida de la base de datos; contrasenas con bcrypt; el login no permite enumerar usuarios (mismo mensaje, mismo tiempo de respuesta) |
| **Autorizacion** | `verifyToken` → `requireAdminClub` (club `Aprobado`) / `requireAdminClubAnyStatus` / `requireSuperAdmin`; alcance por club en `utils/auth.ts` |
| **Validacion** | Zod en la puerta de cada ruta |
| **Datos sensibles** | `toSafeUser` en cualquier respuesta que incluya un usuario |
| **Swagger** | `/api-docs` solo existe fuera de `NODE_ENV=production` |
| **Dependencias** | `npm audit` sin vulnerabilidades al cerrar la fase C |
| **Correos** | Datos de usuario escapados en las plantillas |

---

## Pruebas

Los tests van junto al codigo (`*.test.ts`). Hay tres niveles:

- **Motores puros** (`utils/*.test.ts`): sin mocks.
- **Seguridad con el arnes real** (`src/testing/`): `prismaMock` es la unica
  frontera simulada (la base de datos); los guardas (`verifyToken`, `requireAdminClub`…)
  son **los reales** y las identidades (`bearer('adminClub1')`, `'playerClub2'`,
  `'freePlayer'`…) firman JWT de verdad. Detecta un guarda ausente, algo que los
  tests antiguos (que mockean los guardas) no pueden. Ejemplos:
  `club-isolation.test.ts`, `match.authorization.test.ts`, `pending-club.test.ts`,
  `session-identity.test.ts`, `security-perimeter.test.ts`.
- **Rutas con Prisma simulado** (`routes/*.test.ts`): comportamiento de cada endpoint.

Convencion de la casa: RED primero (el test falla por la razon correcta), luego la
implementacion minima, suite completa y commit atomico.

---

## Comandos

```bash
npm run dev     # prisma generate + tsx watch (recarga en caliente)
npm run build   # prisma generate + prisma db push + tsc
npm start       # node dist/src/index.js
npm test        # Vitest en modo watch
npx vitest run  # una pasada (la que usa la verificacion antes de un commit)
npx vitest run src/routes/match.transaction.test.ts   # un fichero
npm run lint    # ESLint (sin avisos)
npm run format  # Prettier (solo en ficheros nuevos)
npx prisma migrate deploy   # aplica las migraciones pendientes
npx prisma db seed          # datos de demo
```

### Con Docker Compose

```bash
docker compose up -d --build --renew-anon-volumes api   # tras anadir dependencias
# Las migraciones dentro del contenedor necesitan DIRECT_URL (el compose solo define DATABASE_URL):
docker compose exec api sh -c 'DIRECT_URL="$DATABASE_URL" npx prisma migrate deploy'
```

### Variables de entorno

| Variable | Obligatoria | Descripcion |
|---|---|---|
| `DATABASE_URL` | si | Conexion a PostgreSQL |
| `DIRECT_URL` | si para migraciones | Conexion directa (Prisma la usa en `migrate`) |
| `JWT_SECRET` | **si** | Firma de los tokens de acceso. Sin ella la app no arranca |
| `CRON_SECRET` | **si** | Protege los endpoints de cron (`x-cron-secret`). Sin ella la app no arranca |
| `CLIENT_URL` | **si** | URL publica del cliente web, sin barra final: enlaces de los correos, redireccion tras verificar y origen CORS. Sin ella la app no arranca |
| `CORS_ORIGINS` | no | Origenes extra para CORS, separados por comas |
| `ADMIN_EMAIL` | no | Destinatario del informe de `/webhooks/health-check`; sin ella solo se comprueba la base de datos |
| `APP_TIMEZONE` | no | Zona horaria de los clubes (por defecto `Europe/Madrid`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_ID_IOS` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` | no | Login con Google y envio de correo por la API de Gmail |
| `GMAIL_USER` | no | Remitente de los correos |
| `API_URL` | no | URL publica de la API (enlaces e iconos de los correos) |
| `PORT` | no | Puerto (3000 por defecto) |
| `NODE_ENV` | no | `production` oculta Swagger; `test` desactiva el arranque del servidor |

---|---|---|
| `DATABASE_URL` | si | Conexion a PostgreSQL |
| `DIRECT_URL` | no | Conexion directa (migraciones) |
| `JWT_SECRET` | **si** | Firma de los tokens. Sin ella la app no arranca |
| `CRON_SECRET` | **si** | Protege los endpoints de cron |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | Login con Google |
| `GMAIL_USER` / `GMAIL_PW` | no | Envio de correos |
| `CLIENT_URL` | no | URL del frontend (enlaces de verificacion) |
| `PORT` | no | Puerto (3000 por defecto) |
| `NODE_ENV` | no | `test` desactiva el arranque del servidor |

---

## Documentacion interactiva

Con la aplicacion en marcha: **`/api-docs`**

