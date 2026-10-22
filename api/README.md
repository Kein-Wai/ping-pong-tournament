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
| **Identidad** | Registro, login local, OAuth2 con Google, verificacion por correo, recuperacion de contrasena, roles `SuperAdmin` / `AdminClub` / `Player` |
| **Clubes** | Alta, aprobacion de miembros, invitaciones, notificaciones, estados de membresia |
| **Torneos** | Configuracion, inscripciones, reparto en grupos (serpiente), eliminatorias con siembra ITTF, intercambios de jugadores, clasificacion final |
| **Partidos** | Creacion, marcador validado por reglas de tenis de mesa, ELO, actualizacion de clasificaciones de grupo |
| **Entrenamiento** | Macrociclos, sesiones, ejercicios, crecimiento de atributos, clases grupales con horarios recurrentes |
| **Equipos** | Plantillas, calendarios de liga, disponibilidad de jugadores |
| **Analisis** | Partidos manuales con tracker de puntos y habilidades tecnicas |
| **Eventos** | Calendario de club con recordatorios por email |
| **Temporadas** | Temporadas lecturas, con inicializacion automatica al arrancar |

### Aislamiento por club (multi-tenant)

El alcance de cada usuario se decide en **un solo sitio** (`src/utils/auth.ts`):

- `SuperAdmin` → ve todo el sistema.
- `AdminClub` → solo los recursos de su club.
- Sin club asignado → **no ve datos de club** (alcance `none`); solo recursos sin club.

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
│   ├── index.ts                 # Bootstrap: CORS, middleware, rutas, Swagger, fail-fast
│   ├── config.ts                # Lectura obligatoria de variables de entorno
│   ├── db.ts                    # Instancia unica de Prisma
│   ├── swagger.ts -> swagger/    # Documentacion OpenAPI
│   ├── http/                    # Contrato de respuesta y middleware de errores
│   ├── middleware/              # Autenticacion y autorizacion
│   ├── routes/                  # Adaptadores HTTP (un modulo por dominio)
│   ├── schemas/                 # Esquemas Zod (validacion en la puerta)
│   ├── services/                # Efectos externos: email, Excel
│   └── utils/                   # Dominio: motores puros y adaptadores de persistencia
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

### `src/routes/` — Adaptadores HTTP

Cada dominio es un modulo con sub-modulos por caso de uso:

```
routes/
├── index.ts                 # Router central: monta los 16 dominios bajo /api
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

Los modulos **adaptador** Talken de Prisma: `knockout.ts`, `group-generator.ts`,
`standings.ts`, `stats.ts`, `match-processor.ts`, `season.ts`.

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
rondas. Koordinador de tres seams privados, cada uno con una responsabilidad.

### `resolveCurrentSeason` / `ensureCurrentSeason`

`src/utils/season.ts`. La temporada vigente se **inicializa una sola vez al
arrancar** y el resto de la app solo la lee. Evitar que cada lectura escriba
en la base de datos era una fuente de concurrencia innecesaria.

### `asyncHandler` + `errorHandler`

`src/http/`. Un unico punto donde se decide que se responde cuando algo falla.
El log del servidor conserva el detalle real; el cliente solo recibe un mensaje
seguro. Si el error lanzado ya es un `ApiError`, se respeta su codigo y su
mensaje: un error de dominio no se disfraza de fallo del servidor.

### `buildTournamentExportData`

`src/services/excel-data.ts`. Calcula **todo** lo que la plantilla de Excel
necesita (jugadores normalizados, grupos, cruces, cuadro) sin leer ficheros ni
generar ningun Excel. `src/services/excel.ts` se limita a volcar esos datos en
las celdas. La logica de exportacion se testea sin mockear la libreria.

---

## Reglas de la casa

- **La validacion va en el schema**, no en la ruta. Zod es el portero.
- **Un solo formato de respuesta.** `{ success, data, error, details, message }`.
- **Un solo sitio decide el alcance por club.** `src/utils/auth.ts`.
- **Los secretos no tienen fallback.** Si falta `JWT_SECRET` o `CRON_SECRET`, la
  aplicacion no arranca.
- **Los motores de dominio son puros** y se testean sin mocks.
- **Las rutas no repiten reglas de negocio**: las delegan en `src/utils/`.

---

## Comandos

```bash
npm run dev     # prisma generate + tsx watch (recarga en caliente)
npm run build   # prisma generate + prisma db push + tsc
npm start       # node dist/src/index.js
npm test        # Vitest
npm run lint    # ESLint
npm run format  # Prettier
```

### Variables de entorno

| Variable | Obligatoria | Descripcion |
|---|---|---|
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

