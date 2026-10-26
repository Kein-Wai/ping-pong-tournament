# Arquitectura del cliente

Descripción completa de `client/`: qué hace, cómo está construido, por qué está así y dónde
tocar cuando hay que cambiar algo. Está escrito para quien se incorpore al proyecto o vuelva a
él después de un tiempo. Para arrancar el proyecto, ver [README.md](./README.md).

## 1. Qué es

**TM Evolve** es el cliente de la *TT Tournament App*: una aplicación de **gestión de clubes de
tenis de mesa**. Se entrega de tres formas con el mismo código:

| Forma | Cómo | Notas |
|---|---|---|
| Web | `vite build` → `dist/` | Es la que se prueba en el navegador y en Docker |
| iOS | Capacitor 8 (`ios/`) | Workflow de GitHub → TestFlight |
| Android | Capacitor 8 (`android/`) | Proyecto presente; sin pipeline propio |

Pila: **React 19 + TypeScript 6 + Vite 8**, interfaz con **Mantine 9** (core, dates, charts,
modals, notifications) e iconos Tabler, estado global con **Zustand 5**, rutas con **React Router 7**,
gráficos con **Recharts**, fechas con **dayjs**, login nativo de Google con
`@capgo/capacitor-social-login` y, en navegador, `@react-oauth/google`.

## 2. Funcionalidades

El cliente muestra u oculta cada pantalla según el **rol** (`SuperAdmin`, `AdminClub`, `Player`)
y la situación del usuario (con club aprobado, sin club, club pendiente). La autorización real la
hace siempre el servidor; la interfaz solo decide qué enseñar.

| Área | Pantallas (`src/pages/`) | Qué permite |
|---|---|---|
| **Acceso** | `Login`, `Auth/ForgotPassword`, `Auth/ResetPassword` | Inicio de sesión con correo o Google, registro (como jugador o como administrador de club), verificación por correo, recuperación de contraseña, cambio forzado de contraseña para cuentas creadas por un coach |
| **Inicio** | `Dashboard` | Resumen del club y del jugador: temporada, próximos torneos y entrenamientos, próximos partidos de equipo, podio de honor |
| **Clubes** | `Clubs/ClubSetup`, `ClubSelection`, `MiClub`; `Admin/AdminPanel` | Crear un club (queda pendiente de aprobación), solicitar ingreso a uno existente, editar los datos del club, y — para el SuperAdmin — aprobar clubes en el panel global |
| **Jugadores** | `Jugadores/Jugadores`, `JugadorPerfil` | Listado y búsqueda, aprobar o rechazar solicitudes (con nivel, ELO y habilidades iniciales), crear jugadores invitados, editar ELO, resetear cuenta; perfil con estadísticas, habilidades (radar), rivales, balance, partidos recientes y planes de entrenamiento |
| **Torneos** | `Torneos/Torneos`, `TorneoNuevo`, `ExcelTournamentCreator`, `TorneoDetalles` | Crear torneos (manual o desde Excel), inscribir jugadores, generar grupos (serpiente) y cuadro de eliminatorias con siembra ITTF, anotar resultados, intercambiar jugadores, ver clasificaciones y podio, exportar a Excel |
| **Partidos** | `Partidos/Partidos` | Historial de partidos con filtros |
| **Estadísticas** | `Estadisticas/Estadisticas` | Rankings y gráficos de la temporada |
| **Análisis Pro** | `Analisis/AnalisisList`, `ManualMatchTracker` | Seguimiento de partidos manuales punto a punto (vista rápida y vista profunda), informe del partido, planificación táctica, habilidades técnicas |
| **Entrenamiento** | `Entrenamientos/PlanNuevo`, `PlanDetalles`, `SessionDetalles`, `EntrenamientosGenerales`; `Ejercicios/*` | Planes por jugador (macrociclos y sesiones), catálogo de ejercicios, crecimiento de habilidades, clases grupales con horarios recurrentes, calendario y asistencia |
| **Equipos** | `Equipos/Equipos`, `EquipoNuevo`, `EquipoDetalles` | Plantillas, calendario de liga, disponibilidad de jugadores por partido |
| **Calendario** | `Eventos/CalendarioEventos` | Calendario del club con eventos y recordatorios por correo |
| **Soporte** | `Feedback/FeedbackPage` | Los usuarios envían bugs o sugerencias; el SuperAdmin los ve como bandeja |
| **Legal** | `Legal/PoliticaPrivacidad` | Política de privacidad (pública) |

## 3. Estructura de carpetas

```
src/
├── api/
│   ├── axios.ts          Instancia de axios + interceptores (token, errores, 401)
│   ├── client.ts         Adapter `http`: desenvuelve el sobre { success, data }
│   ├── endpoints.ts      Contrato de URLs (ENDPOINTS). Toda URL nueva se declara aquí
│   ├── session.ts        Renovación de sesión (refresh token) y claves de almacenamiento
│   ├── errors.ts / notify.ts   Mensajes de error y deduplicación de avisos
│   └── services/         Un módulo por dominio (auth, users, clubs, tournaments, matches,
│                         teams, trainings, generalTrainings, manualMatches, events, skills,
│                         seasons, feedback) + su test
├── components/           Piezas reutilizables por dominio
│   ├── auth/             LoginForm, RegisterForm, GoogleSection, ProtectedRoute, RequireClubSetup
│   ├── layout/           MainLayout (barra lateral, notificaciones, onboarding)
│   ├── tournament/       Cabecera, pestañas, clasificaciones de grupo, cuadro, modales de resultado…
│   ├── player/ players/  Perfil de jugador y tabla/acciones del listado
│   ├── team/ training/ generalTraining/ manualMatch/ common/
├── constants/            routes.ts (APP_ROUTES), dictionary.json, localizaciones, habilidades, equipos
├── hooks/                35 hooks, uno por responsabilidad (ver §5)
├── pages/                Una carpeta por dominio; cada pantalla compone hooks y componentes
├── store/authStore.ts    Estado global de sesión
├── types/                api.ts, enums.ts, tournament.ts, players.ts, playerProfile.ts, …
├── utils/                Funciones puras: dates, avatar, matchScore, matchValidation, player-profile…
├── test/utils.tsx        renderWithProviders, loginAs, normalizeIds
├── setupTests.ts         Polyfills de jsdom (matchMedia, scrollIntoView, document.fonts…)
├── App.tsx               Árbol de rutas y arranque de sesión
└── main.tsx              Proveedores y enlaces entre módulos
```

Raíz de `client/`: `capacitor.config.ts`, `ios/`, `android/`, `vitest.config.ts` (jsdom, `TZ=UTC`),
`eslint.config.js`, `Dockerfile` (Vite con `--host`).

## 4. Arquitectura por capas

```
        pages/  ──────────────►  hooks/  ──────────────►  api/services/*  ──►  api/client.ts (http)  ──►  api/axios.ts
   (composición fina)         (lógica de pantalla)        (una operación,         (desenvuelve el          (token, errores,
        │                          │                       un tipo de entrada      sobre de la API)          401 → renovar)
        ▼                          ▼                       y de salida)
   components/                  utils/ (puras)
   (presentación)               types/
```

Vocabulario del repositorio (`docs/matt/skills/engineering/codebase-design`): cada capa es un
**módulo** con una **interface** pequeña y un **seam** en el que se puede sustituir lo que hay
detrás. Los seams reales de este cliente son:

| Seam | Interface | Qué hay detrás | Por qué importa |
|---|---|---|---|
| **Datos** | `api/services/*` + `api/client.ts` (`http`) | axios, el sobre `{ success, data }`, la URL base | Las pantallas no conocen URLs ni el formato del sobre; si el contrato de la API cambia, se toca **un** sitio (así se absorbió el contrato único de respuesta de la API con pocos cambios) |
| **Sesión** | `api/session.ts` (`refreshSession`) | refresh token, almacenamiento, petición de renovación | Todas las peticiones que reciben un 401 comparten **una sola** renovación |
| **Permisos de UI** | `hooks/usePermissions` | rol del usuario | Un único criterio de `isAdmin`/`isSuperAdmin`…; sustituyó 11 definiciones locales distintas |
| **Pantalla de torneo** | `TorneoDetalles` + 5 hooks | `useTorneoFormato`, `…Inscripcion`, `…Partido`, `…Intercambio`, `…Acciones` | Patrón de referencia: página fina, hooks profundos, cada uno con su test |

### Reglas que impone el linter

- `no-restricted-imports`: páginas, hooks y componentes **no pueden importar `api/axios`**; solo `api/services` o `api/client`.
- Cero `any` en `src/` (test `no-explicit-any-rule.test.ts`).
- Las rutas de navegación salen de `APP_ROUTES` (test `hardcoded-routes-rule.test.ts`).

## 5. Piezas clave

### 5.1 Sesión y autenticación (`store/authStore.ts`, `api/session.ts`, `api/axios.ts`, `App.tsx`)

- Al iniciar sesión, la API devuelve un **token de acceso de 1 hora** y un **refresh token**
  (`{ token, refreshToken }`). Ambos se guardan en `localStorage` (`pingpong_token`,
  `pingpong_refresh_token`) y el token de acceso se decodifica para leer id, rol y club.
- El interceptor de **petición** añade `Authorization: Bearer <token>`.
- El interceptor de **respuesta**, ante un **401** en una ruta que no sea de `/auth/*`:
  1. llama a `refreshSession()` (una sola vez aunque haya muchas peticiones a la vez);
  2. si obtiene token nuevo, **repite la petición original una vez** (marca `_retried` para no entrar en bucle);
  3. si la API rechaza el refresh token, cierra la sesión y redirige a `/login`;
  4. si no hay red, rechaza la petición **sin cerrar la sesión**.
- Al **arrancar** (`App.tsx`), si el token guardado está caducado, intenta renovar antes de echar al usuario.
- Al **cerrar sesión**, borra ambos tokens y revoca el refresh token en el servidor (sin bloquear el cierre local).
- `main.tsx` conecta `api/session` con el store (`setTokenRefreshedHandler`, `setUnauthorizedHandler`) para evitar un ciclo de importaciones.
- Limitación conocida: los tokens están en `localStorage` (expuestos a XSS). No hay `dangerouslySetInnerHTML` en el código y los tokens son cortos.

### 5.2 Rutas (`App.tsx`, `constants/routes.ts`)

```
públicas:    /login  /forgot-password  /reset-password  /privacidad
protegidas:  <ProtectedRoute>            exige sesión y usuario cargado
               /setup-club (ClubSetup)
               <RequireClubSetup>        el usuario debe tener club resuelto
                 <MainLayout>            barra lateral + cabecera + onboarding
                   / (Dashboard), /torneos…, /jugadores…, /equipos…, /entrenamientos…,
                   /analisis…, /calendario, /feedback, /mi-club, /admin, …
comodín:     cualquier otra ruta → /
```

Las 30 pantallas se importan de forma **estática** (no hay `React.lazy`): el build es un único `index.js` de ~1,5 MB. Está identificado como mejora (ver `docs/auditoria-final-api-client.md`).

### 5.3 Estado

- **Global (Zustand):** solo la sesión (`token`, `user`, `isAuthenticated`, `login`, `logout`, `fetchProfile`, `updateUserFields`). `fetchProfile` trae el perfil fresco de `/users/me` y deriva el rol de `userType.name`.
- **De pantalla:** `useState` y hooks. No hay caché de servidor (React Query, SWR): cada pantalla pide sus datos al montarse.

### 5.4 Hooks (`src/hooks/`)

Cada hook es una responsabilidad con su test. Ejemplos por dominio:

| Dominio | Hooks |
|---|---|
| Torneo | `useTournamentDetails`, `useTorneoFormato`, `useTorneoInscripcion`, `useTorneoPartido`, `useTorneoIntercambio`, `useTorneoAcciones` |
| Jugador | `useJugadoresLista`, `useJugadorPerfil`, `useJugadorEdicion`, `useJugadorAprobacion`, `useJugadorAdministracion`, `useJugadorElo`, `useJugadorInvitado`, `useJugadorConsolidacion`, `useJugadorResetCuenta` |
| Equipo | `useEquipoDetalles`, `useEquipoInfo`, `useEquipoPlantilla`, `useEquipoPartido`, `useEquipoNuevoPartido` |
| Entrenamiento | `useTrainingPlan`, `useEntrenamientosGenerales`, `useEntrenamientoCalendario`, `useEntrenamientoHorarios`, `useEntrenamientoAsistencia`, `useEntrenamientoProgramacion` |
| Análisis | `useManualMatch`, `useRegistroPuntos`, `useSetsPartido`, `useMatchScore`, `useCierrePartido`, `usePlanificacionPartido`, `useRivalEdicion` |
| Transversales | `usePermissions`, `useApi` |

**Dónde añadir comportamiento nuevo:** en el hook que corresponda (con su test colocado), no de vuelta en la página.

### 5.5 Interfaz (Mantine)

- Mantine es la única biblioteca de UI. El tema se declara en `main.tsx` (`MantineProvider defaultColorScheme="light"`); hay también `Notifications` (avisos) y `ModalsProvider` (confirmaciones con `utils/modals.tsx`).
- Los **errores de red** los notifica el interceptor de axios (toast rojo, deduplicado por mensaje) y las **mutaciones correctas** muestran un toast verde con el `message` de la API. Los componentes no deben repetir esos avisos.
- Los avatares salen de `utils/avatar.ts` (hoy generados con DiceBear a partir del nombre).

### 5.6 Capacitor (app nativa)

`capacitor.config.ts`: `appId com.keinwaicheung.tttournamentapp`, `appName TM Evolve`, `webDir dist`. El login con Google en el móvil usa el plugin nativo; en la web, `@react-oauth/google`. La pantalla de arranque (`CustomSplashScreen` en `App.tsx`) y el listener `appUrlOpen` (enlaces universales) viven en `App.tsx`.

## 6. Contrato con la API

La API responde siempre con el sobre `{ success, data?, message?, error?, details? }`. `api/client.ts` lo **desenvuelve** y devuelve `data` directamente; si una respuesta no trae `success` (204, redirecciones) la deja pasar tal cual.

- Las operaciones que solo devuelven `{ success, message }` (borrar, inscripción en lote, cambio de estado…) devuelven `void` desde el servicio; el mensaje lo muestra el interceptor.
- Los servicios de autenticación devuelven `{ token, refreshToken }` (login/Google).
- Crear un torneo devuelve el `Tournament` y registrar un participante, el `TournamentParticipant`.

## 7. Pruebas

| Nivel | Qué | Dónde |
|---|---|---|
| Unitarias | Utilidades puras, servicios, hooks | `*.test.ts` junto al código |
| Componentes | Montaje con datos simulados y flujos | `*.test.tsx` |
| Instantáneas | Estructura del DOM de las pantallas grandes (verificador mecánico del refactor del JSX) | `__snapshots__/` |
| Reglas de código | Reglas de ESLint ejecutadas sobre código de ejemplo | `api/axios-import-rule.test.ts`, `no-explicit-any-rule.test.ts`, `hardcoded-routes-rule.test.ts` |

~200 ficheros de test y ~1.850 casos. Convenciones:

- Se **mockea `api/axios`** (el `api` de bajo nivel, la frontera del sistema) y no los servicios, de modo que los tests siguen valiendo si el acceso a datos cambia.
- El **store real** se siembra con `loginAs(...)` o `useAuthStore.setState(...)`; no se mockea.
- `renderWithProviders` (en `test/utils.tsx`) monta Mantine, modales, notificaciones y un `MemoryRouter`.
- `TZ=UTC` está fijado en `vitest.config.ts` para que las fechas y los snapshots no dependan de la máquina.
- Los tests fijan el **comportamiento actual**, bugs incluidos: sirven para refactorizar con red, no para decidir qué es correcto.

El plan de regresión y de pruebas de extremo a extremo está en [`../docs/plan-regresion-e2e.md`](../docs/plan-regresion-e2e.md).

## 8. Cómo se trabaja aquí (refactor)

El cliente se reestructuró en fases (`docs/plan-refactor-client.md`): red de seguridad de tests → seam de datos (`api/services`) → permisos únicos → extracción de pantallas gigantes a hooks y componentes. Las reglas que siguen vigentes para cualquier cambio:

1. **Una cosa a la vez**: se mueve la lógica pieza a pieza.
2. **Regla de oro del JSX**: al extraer un componente se copia el código visual tal cual (props de Mantine, clases, iconos, textos); solo se pasan las variables por props.
3. **Extracción quirúrgica**: no se altera la lógica de lo que se mueve.
4. **Cada pieza nueva lleva su test**, colocado al lado.
5. Antes de dar nada por terminado: `npx tsc -b`, `npm run lint`, `npx vitest run` y `npm run build` en verde.

## 9. Deuda conocida (resumen)

Detalle y plan en [`../docs/auditoria-final-api-client.md`](../docs/auditoria-final-api-client.md):

- Cuatro pantallas con una función de 450-530 líneas (`MainLayout`, `Estadisticas`, `CalendarioEventos`, `Partidos`).
- Sin *code splitting*; sin Content-Security-Policy; tokens en `localStorage`.
- Los avatares envían el nombre del jugador a un servicio externo.
- Sin guarda de rol por ruta (solo en el servidor) y sin pruebas de extremo a extremo.
