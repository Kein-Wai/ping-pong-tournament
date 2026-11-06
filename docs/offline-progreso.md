# Modo sin conexión (offline) — decisiones, plan y progreso

Documento de relevo: si se corta la sesión, retomar desde «Fases». Decisiones cerradas en la sesión de `grilling` (2026-11-06). Términos en `GLOSSARY.md` (sección «Uso sin conexión»); decisiones de arquitectura en [`adr/0003`](./adr/0003-analisis-sin-conexion-local-first-con-version.md) y [`adr/0004`](./adr/0004-sqlite-como-almacen-local-solo-en-nativo.md).

Rama de este documento: `docs/offline-plan` (solo documentación; al no tocar `client/**` su PR no dispara el build de iOS). Las ramas de código salen después, una por fase.

## Objetivo

Poder usar sin internet las partes de la app que no lo necesitan de verdad, guardar lo hecho en el móvil y enviarlo al servidor cuando vuelva la conexión o el usuario lo pida. El usuario no sabe cuándo se quedará sin red, así que la sesión no puede depender de ella.

## Decisiones cerradas

**Alcance**
- Solo apps nativas (iOS y Android, Capacitor). La web en navegador sigue siendo online, sin service worker ni caché del navegador.
- Funciona sin conexión: **Calentamiento**, **Análisis Pro** (rápido y extenso, para Jugador y para Admin de club) y **Juegos de reflejo**.
- Todo lo demás (torneos, ligas, ranking, clubes, equipos, eventos…) queda como «Requiere conexión». Torneos y ligas se dejan fuera a propósito: varias personas editan lo mismo y habría conflictos.

**Sesión**
- Se mantiene el refresh token de 30 días (rota en cada uso) y el access token de 1 hora. No se alarga nada.
- Hueco real a cerrar: el perfil (`user`) arranca en `null` y solo lo rellena `fetchProfile()`, que necesita red. Se guarda el perfil en local para que, sin red, la app conozca el rol, el club y el `userId`.
- Hoy, al abrir sin red con el access token caducado, `App.tsx` no cierra la sesión (`refreshSession` lanza y se trata como «sin red»), pero tampoco carga el perfil.
- Mover los tokens a almacenamiento seguro (D2 de `PENDIENTES.md`) queda como tarea aparte.

**Almacenamiento**
- SQLite (`@capacitor-community/sqlite` 8.1.1, acepta Capacitor ≥ 8) detrás de una interfaz `LocalStore`, con un adaptador SQLite y otro en memoria para los tests. Base con su propio número de versión y migraciones.
- Sin cifrado de la base local en esta primera versión. Es una tarea aparte, junto a la de los tokens.

**Sincronización**
- Se dispara sola al recuperar la red y al abrir la app, y a mano con un botón «Sincronizar» que muestra el contador de pendientes.
- Interruptor **«Trabajar offline»**: no se intenta ninguna petición; se recuerda tras cerrar la app hasta que se apague.
- **Nunca se sincroniza mientras hay un partido abierto en pantalla.** Que vuelva la conexión no interrumpe un análisis.
- Fallo de red: reintento con espera creciente, sin contar como error. Rechazo del servidor (400, 403, 409): no se reintenta solo; pasa a «Requiere atención» con su motivo y decide el usuario.

**Análisis Pro** (ver ADR 0003)
- Local-first uniforme en nativo, con o sin red: desde que se empieza a analizar, puntos, deshacer y rival se guardan solo en el móvil. Se envía el partido **entero** al finalizar o al salir.
- Cubre también crear, planificar, editar el rival y pasar de Programado a Iniciado sin red: todo es el mismo documento.
- Control de versión: columna `version` en `ManualMatch` (migración aditiva, 0 por defecto). El móvil envía la versión con la que descargó el partido; si el servidor tiene otra, responde 409. Un partido creado offline no tiene versión y se inserta.
- Los UUID de partido y puntos los genera el móvil, así que repetir el envío no duplica nada.
- Un partido se analiza desde un solo dispositivo. Ante un rechazo, la copia local queda intacta como «No sincronizado»: el usuario elige entre reintentar o guardarlo como partido nuevo. Nunca se mezclan puntos de forma automática.
- Se arregla el hallazgo conocido de `PUT /manual-matches/:id/complete` (repetirlo suma otra vez estadísticas y habilidades): `updateMany` condicionado a `status != Completado` dentro de la transacción y 409 si no actualiza nada. Con reintentos de sincronización ya no es un caso raro.
- Datos que se descargan al abrir con red: la lista completa de partidos, el detalle de los 20 más recientes (más los que se abran después) y, para el Admin de club, la lista de jugadores de su club.
- Al sincronizar se vuelve a comprobar el acceso (el jugador pudo irse del club): si falla, 403 → «Requiere atención».

**Calentamiento y Reflejos**
- Rutinas: crear, editar y borrar quedan en cola. Gana la última modificación. El máximo de 5 se comprueba en local; si el servidor lo rechaza, la rutina sobrante queda en el móvil marcada «No se pudo sincronizar» y se pide borrar otra.
- `@@unique([userId, name])`: si dos dispositivos crean el mismo nombre, el móvil renombra añadiendo « (2)» y avisa.
- Nota de implementación: «gana la última modificación» se resuelve por **orden de llegada al servidor** (el servidor pone `updatedAt`), no por el reloj del móvil, que puede estar desfasado.
- Juegos de reflejo: ya funcionan al 100 % en el cliente (no llaman a la API). Solo hay que dejarlos accesibles sin red. Los récords siguen en `localStorage` por usuario, sin servidor; dependen del perfil guardado para conocer el `userId`.

**Interfaz**
- Menú: las secciones que requieren conexión llevan candado; al pulsarlas aparece una pantalla «Requiere conexión» con botón para volver.
- Inicio sin red: solo los accesos disponibles (Análisis Pro, Calentamiento, Juegos de reflejo) y el contador de pendientes.
- Barra fina arriba: «Sin conexión» o «Modo offline activado».
- Lista de pendientes con estados y acciones (reintentar, descartar, guardar como partido nuevo).

**Cerrar sesión**
- Con pendientes, un aviso lo explica y ofrece sincronizar antes (si hay red). Si se cierra igualmente, **no se borra nada**: los datos quedan ligados a ese `userId` y se reanudan cuando ese mismo usuario vuelva a entrar. Otro usuario en el mismo móvil nunca los ve ni los envía. Solo «Descartar pendientes» los borra.
- Si la sesión caduca (más de 30 días sin conexión), los datos siguen ahí hasta el siguiente inicio de sesión de ese usuario.

## Fases

Tamaño aproximado en sesiones, como en `PENDIENTES.md`. Todas empiezan en PENDIENTE.

| Fase | Qué | Rama | Estado |
|---|---|---|---|
| 1 | Base | `feat/offline-base` | PENDIENTE |
| 2 | Calentamiento + Reflejos | `feat/offline-calentamiento` | PENDIENTE |
| 3 | API de sincronización | `feat/offline-api-sync` | PENDIENTE |
| 4 | Análisis Pro offline | `feat/offline-analisis` | PENDIENTE |

Orden: 1 → 2 → 3 → 4. La fase 3 es independiente del cliente y aditiva (las apps antiguas siguen funcionando), así que puede desplegarse sola.

**Consecuencia para las builds:** SQLite y el plugin de red son nativos, así que cada fase con código de cliente exige una **nueva build en TestFlight y Play Store**, y las funciones sin conexión solo existen en quien tenga la app actualizada. Un PR sobre `client/**` dispara el build de iOS.

**Requisito previo de la fase 4:** que el PR `feat/analisis-porcentajes` (porcentajes, total del partido y avisos de punto silenciosos) esté fusionado, porque toca `ManualMatchTracker`, `useRegistroPuntos` y `addPoint`/`deletePoint`.

### Fase 1 — Base (~3 sesiones)

| # | Tarea | Tamaño |
|---|---|---|
| 1.1 | Añadir `@capacitor/network` y `@capacitor-community/sqlite`; `npx cap sync` y comprobar que compilan iOS y Android | S |
| 1.2 | Interfaz `LocalStore`, adaptador SQLite, adaptador en memoria y migraciones versionadas de la base local | M |
| 1.3 | `useConnectivity`: estado de red + interruptor «Trabajar offline» persistente; detección de «es nativo» para que la web no cambie | S |
| 1.4 | Perfil local: guardarlo al cargar el perfil y usarlo al arrancar sin red; ajuste de `initializeAuth` en `App.tsx` | M |
| 1.5 | Cola de salida (outbox): tabla, motor con disparadores y espera creciente, estados (pendiente, enviando, requiere atención), un manejador por tipo de elemento, regla de «no sincronizar con partido abierto» | M-L |
| 1.6 | UI: barra de estado, contador y botón «Sincronizar», lista de pendientes, pantalla «Requiere conexión», candado en el menú, inicio reducido | M |
| 1.7 | Cerrar sesión con pendientes y «Descartar pendientes» | S |

### Fase 2 — Calentamiento + Reflejos (~1-2 sesiones)

| # | Tarea | Tamaño |
|---|---|---|
| 2.1 | Rutinas en el almacén local: leer del caché, crear/editar/borrar en cola, tope de 5 en local, renombrado « (2)» | M |
| 2.2 | Manejador de sincronización de rutinas (usa los endpoints existentes `GET/POST/PUT/DELETE /api/warmup-routines`) y estado «No se pudo sincronizar» | S-M |
| 2.3 | Marcar Calentamiento y Reflejos como disponibles sin red; de paso decidir el guard de ruta por rol (J4) | S |

### Fase 3 — API de sincronización (~1-2 sesiones)

| # | Tarea | Tamaño |
|---|---|---|
| 3.1 | Migración aditiva: `ManualMatch.version Int @default(0)` | S |
| 3.2 | Endpoint de sincronización por partido: esquema Zod, documento entero con UUID del cliente, `upsert` transaccional, `baseVersion`, 409 por desajuste, acceso comprobado al sincronizar, estadísticas y habilidades solo la primera vez que se completa | M-L |
| 3.3 | `complete` idempotente (`updateMany` condicionado + 409) con test de regresión | S |
| 3.4 | Probar contra la base local con SQL real (Prisma está mockeado en los tests) | S |
| 3.5 | Swagger y `security-review` | S |

### Fase 4 — Análisis Pro offline (~3 sesiones)

| # | Tarea | Tamaño |
|---|---|---|
| 4.1 | Descarga y caché: lista completa, 20 detalles recientes, jugadores del club (Admin) | M |
| 4.2 | Partido local: crear con UUID, planificar, editar rival, iniciar | M |
| 4.3 | Registro local-first: `useRegistroPuntos` y los hooks vecinos escriben en el `LocalStore` en nativo; la web queda como hoy | L |
| 4.4 | Finalizar/salir envía el documento; 409, 403 y validación pasan a «Requiere atención» | M |
| 4.5 | Resolución de conflictos: reintentar o guardar como partido nuevo | M |
| 4.6 | Reporte y estadísticas de un partido pendiente: se acreditan en el servidor al sincronizar; la interfaz lo indica | S |

## Riesgos y lo que no se cubre

- **Los tests no prueban SQL real**, ni el de SQLite en el móvil ni el de Prisma en el servidor. Cada fase lleva una lista de comprobación manual en un móvil real (iOS y Android), y la fase 3 se prueba contra la base local.
- Durante un partido el servidor no tiene los puntos: si el móvil se pierde o se borra la app, se pierde ese partido. SQLite sobrevive a cerrar la app y a apagar el móvil; el contador de pendientes siempre visible y sincronizar en cuanto se pueda reducen la ventana.
- Los tokens siguen en `localStorage` y la base local sin cifrar (D2 y tarea aparte).
- Un partido analizado por el jugador y el entrenador a la vez en dos móviles acaba en 409 para el segundo en sincronizar; no hay edición simultánea.
- Verificar en dispositivo real el comportamiento del almacenamiento ante poco espacio y tras actualizar la app.

## Notas para retomar

- Hechos comprobados al planificar: access token 1 h; refresh token 30 días, rotativo (`api/src/utils/refresh-token.ts`); `WarmupRoutine` ya tiene `updatedAt` y `@@unique([userId, name])`; `ManualMatch` no tiene `updatedAt` ni versión; los juegos de reflejo no llaman a la API.
- Cliente: declarar URLs nuevas en `client/src/api/endpoints.ts` primero y usar los módulos de `api/services/*`.
- Antes de cada fase: rama cortada de un `main` actualizado, `tdd` para la lógica nueva, y al terminar `simplify`, `code-review` y `security-review`.
