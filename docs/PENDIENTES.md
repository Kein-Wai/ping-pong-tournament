# Pendientes

Estado a 2026-10-26, justo después de llevar a producción el release `2026-10` (PR #1: refactor de `client/` y fases A-F de `api/`). Sirve para retomar el trabajo sin depender de la memoria de ninguna sesión. Lo que ya está hecho no aparece aquí; está en el historial de git y en los READMEs.

Documentos de detalle que siguen vivos:
- [`auditoria-final-api-client.md`](./auditoria-final-api-client.md): hallazgos con evidencia (A1-A15, C1-C12) y plan de fases G1-G7.
- [`plan-regresion-e2e.md`](./plan-regresion-e2e.md): pirámide de pruebas, E2E con Playwright y CI (fases R1-R6).
- [`../COMANDOS.md`](../COMANDOS.md): flujo de trabajo, comandos y despliegue.

---

## 1. Hazlo tú (acciones fuera del código)

| # | Qué | Por qué | Prioridad |
|---|---|---|---|
| T1 | **Revocar la clave de Gemini** que empieza por `AQ.Ab8RN6` (Google AI Studio / Cloud → Credenciales) | Estuvo escrita en `filosofia/blogsucio.md`; GitHub la detectó y bloqueó el primer *push*. No llegó a publicarse, pero estuvo en claro en un fichero | Alta |
| T2 | **Actualizar el `CRON_SECRET` en el programador externo** del cron (si usas uno) con el valor nuevo de Render | Si no, `/api/webhooks/daily-reminders` y `/health-check` darán 401 y no habrá recordatorios | Alta |
| T3 | **Aprobar los clubes reales** que sigan `Pendiente` (como SuperAdmin) | Su AdminClub no puede crear torneos, partidos, equipos ni eventos hasta entonces | Alta |
| T4 | Pasar el smoke test de producción completo (`COMANDOS.md` §9) | Solo se comprobó el login de Google en iPhone | Alta |
| T5 | Comprobar que **llega un correo real** (registro o recuperación) | nodemailer pasó de la 9 a la 10 y no se probó un envío real | Alta |
| T6 | Rotar la contraseña de Postgres de desarrollo y el `CRON_SECRET` que estuvieron en `docker-compose.yaml` (versionados desde el commit `80311a6`) | Siguen en el historial público del repositorio | Media |
| T7 | Purgar los objetos huérfanos locales: `git reflog expire --expire=now --all && git gc --prune=now` | Los commits antiguos con la clave de Gemini siguen en tu copia local (no en GitHub); además existen refs `refs/cline/checkpoints/*` de la extensión Cline con esa clave. No se publican con un `git push` normal | Media |
| T8 | Decidir qué hacer con `tm-evolve-mobile/` (app Expo abandonada) | Sigue en el repositorio con su `codigo_completo.txt`; no se ha tocado | Baja |

## 2. Decisiones abiertas

| # | Pregunta | Contexto |
|---|---|---|
| D1 | ¿`POST /api/auth/register` debe seguir diciendo «El email ya está registrado»? | Es una pista de enumeración de usuarios. Cerrarla implica responder siempre éxito y avisar por correo al dueño de la cuenta, lo que cambia la experiencia del que se equivoca de email |
| D2 | ¿Se mantiene el refresh token en `localStorage` o se mueve a Keychain (iPhone) / cookie httpOnly? | Hoy los dos tokens están en `localStorage`; ver C3 de la auditoría |
| D3 | ¿Se quiere compatibilidad temporal con clientes antiguos (la app de iPhone previa al release)? | El contrato de respuesta cambió: un cliente antiguo no funciona con la API nueva |
| D4 | ¿`docker-compose.yaml` debe leer el `.env` de la raíz (como dice `CLAUDE.md`) en lugar de llevar valores fijos? | No se tocó para no romper la autenticación de la base de datos local (el volumen conserva la contraseña con la que se creó) |

## 3. Configuración de operaciones

- **Render, comando de build de la API:** debe ser `npm install --include=dev && npm run build`. Con `NODE_ENV=production`, `npm install` a secas omite `@types/node` y `typescript` y `tsc` falla. Quien cambie la variable o el comando debe saberlo.
- **Build de la API con `prisma db push`** en lugar de `prisma migrate deploy`: vale mientras los datos sean de prueba. Antes de tener datos reales hay que pasar a `migrate deploy` y baselinar el historial (`COMANDOS.md` §6).
- **`Dockerfile` de la API** arranca en modo desarrollo (`tsx watch`); no hay imagen de producción.
- **Contadores de límite de intentos en memoria:** con más de una instancia de la API habría que moverlos a un almacén compartido.
- **El workflow de iOS** se ejecuta en cada PR que toca `client/**` y **sube un build a TestFlight**; el número de build es `github.run_number`, así que un *Re-run* falla por duplicado (hay que empujar un commit nuevo). Valorar añadir `workflow_dispatch` y que la PR solo compile sin subir.
- **No hay CI de tests** (`tsc`, `lint`, `vitest`, `audit`) para API ni cliente: solo el workflow de iOS. Es la mejora de mayor valor pendiente (R1).

## 4. Deuda de código (resumen de la auditoría)

Prioridad y detalle en [`auditoria-final-api-client.md`](./auditoria-final-api-client.md).

| Fase | Qué | Esfuerzo |
|---|---|---|
| **G1** | Seguridad: Zod en `PUT /users/me` y en los parámetros de consulta del cuadro; revocar sesiones al cambiar la contraseña; limitador más duro en `generate-groups` y Excel; guardar el **hash** de `resetPasswordToken` y `verificationToken` | ~1 sesión |
| **G2** | CI en GitHub Actions; cobertura medida en la API (`@vitest/coverage-v8`); scripts `test` y `test:coverage`; imagen de producción de la API | ~1 sesión |
| **G3** | Transacciones en inscripciones de torneo (con sus contadores), recordatorios de evento y lote de ejercicios de sesión | 1-2 sesiones |
| **G4** | Sustituir las 15 comprobaciones `role === …` por helpers de `utils/auth`; migrar al arnés real los 17 ficheros de test que mockean los guardas | ~1 sesión |
| **G5** | Cliente: `React.lazy` por ruta (bundle de 1,5 MB), CSP, avatares sin enviar el nombre a DiceBear, `RequireRole` | ~1 sesión |
| **G6** | Cliente: descomponer las pantallas «dios» (`MainLayout`, `Estadisticas`, `CalendarioEventos`, `Partidos`, `Login`, `AnalisisList`) con el patrón de `TorneoDetalles`, una por sesión | 1 sesión por pantalla |
| **G7** | Higiene: paquete `fs` del cliente, 54 `console.*`, `capacitor.config.ts` (`cleartext`, IDs comentados), `types/api.ts` por dominios, `routes/auth.ts` por casos de uso, respuestas en Swagger | ~media sesión |

## 5. Pruebas

Plan completo en [`plan-regresion-e2e.md`](./plan-regresion-e2e.md). Orden recomendado: **R1 CI → R2 matriz de autorización → R4 Playwright (E1-E5) → R3 integración con PostgreSQL real → R5 resto de recorridos → R6 extras**.

Hueco principal: Prisma está simulado en todos los tests, así que **ningún test comprueba SQL real ni transacciones reales**.

## 6. Qué no se verificó en esta tanda (para no asumirlo)

- El login de Google **en navegador** (solo se probó el de iPhone).
- El envío de correo con nodemailer 10.
- El cron en producción (`daily-reminders`, `health-check`).
- La renovación de sesión pasada **una hora real** en producción (en local se probó con el TTL reducido).
- La app Expo (abandonada, sin tests).

## 7. Cosas que conviene recordar

- Un **club `Pendiente`** limita a su AdminClub a editar los datos del club; solo el SuperAdmin cambia el `status`.
- El JWT de acceso dura **1 hora**; la sesión larga es un refresh token de 30 días que rota en cada uso.
- **Límites de intentos por IP:** 10 logins fallidos / 15 min (los aciertos no cuentan), registro 10/h, recuperar contraseña 5 / 15 min. En pruebas repetidas puedes bloquearte: reinicia la API.
- `GET /api/clubs` es público a propósito (un jugador nuevo debe ver los clubes para pedir ingreso).
- Registrarse como `AdminClub` es intencional; el club necesita la aprobación del SuperAdmin.
- Las variables de entorno obligatorias de la API son `JWT_SECRET`, `CRON_SECRET` y `CLIENT_URL`.

## 8. Calentamiento (feature en curso)

Rama `feat/calentamiento-sesion`. Hechas las **entregas 1 y 2**: catálogo fijo de 9 ejercicios con animaciones SVG, constructor, sesión guiada con cronómetro, pitidos, vibración y pantalla encendida, y guardado de hasta 5 rutinas por jugador (tabla `warmup_routine`, API `/api/warmup-routines`, panel «Mis rutinas»). Términos en `GLOSSARY.md`.

**Antes de probarlo en local:** aplicar la migración `20261027120000_added_warmup_routines` y regenerar el cliente de Prisma en el contenedor de la API (`COMANDOS.md` §6). Sin eso `/api/warmup-routines` responde 500.

| # | Qué | Notas |
|---|---|---|
| W3 | **Voces** de la cuenta atrás: grabar `3`, `2`, `1`, `ya`, `descanso` (opcional `fin`, `preparado`) en mp3 mono 128 kbps y sustituir los pitidos en `utils/warmupSound.ts` | Sin voz para los nombres de ejercicio (cada cambio obligaría a regrabar) |
| W4 | **Probar en dispositivos reales**: sonido, vibración (no existe en iPhone) y Wake Lock en iPhone y Android; qué pasa con la pantalla bloqueada a mano | Los tests simulan esas APIs |
| W5 | Revisar con ojo humano las frases de los ejercicios y que Movilidad sin raqueta (brazos y piernas en contrafase) se vea bien en movimiento | Las animaciones son esquemáticas, hechas a mano |
| W6 | Las 9 claves de ejercicio y los topes de tiempo están duplicados entre `client/src/constants/warmupExercises.ts` y `api/src/schemas/warmupRoutine.ts` (no hay paquete compartido) | Un test en cada lado fija la lista; hay que cambiar los dos a la vez |
| W7 | Con 8 peticiones simultáneas de un mismo jugador la transacción serializable devuelve 409 «inténtalo de nuevo» a varias (nunca supera el máximo). Un reintento automático en el servidor lo evitaría | Solo afecta a doble clic o peticiones paralelas; el cliente desactiva el botón mientras guarda |

## 9. Juegos de Reflejo (feature en curso)

Rama `feat/juegos-reflejo-base`. Hechas las cinco entregas: menú, selector, récords y armazón común (1), Tejas, Reacción simple, Go / No-Go, Ping Pong y Timing. Sin librerías nuevas. Los récords van en `localStorage` (`reflejo:<userId>:<juego>`). Comprobado en Chrome (escritorio, móvil vertical y apaisado); **sin probar en dispositivos reales** (sonido, vibración y pantalla encendida: ver W4).

| # | Qué | Notas |
|---|---|---|
| J1 | Juegos al backlog: **Flechas**, **Seguimiento de color** y **Secuencia** | Ideas descritas en la conversación de diseño; sin reglas cerradas |
| J2 | **Récords en la API/BD** si se quiere ranking de club | El récord local se pierde al borrar los datos del navegador; el selector lo avisa |
| J3 | Valorar `react-konva` si un juego futuro lo necesita | Su última versión exige React 19.3; hoy el cliente usa `^19.2.7` |
| J6 | Un **0 como primer récord** se guarda y el selector mostraría «Récord: 0 aciertos» | La partida ya muestra «Mala suerte»; decidir si un 0 debe guardarse |
| J7 | **Precisión de Reacción simple**: el tiempo se mide desde el instante lógico de la señal, pero la pantalla se pone verde en el siguiente tick (≤25 ms) más el render; un toque justo tras la señal cuenta como reacción | Valorar medir desde que se pinta (rAF) y tratar reacciones de menos de ~100 ms como anticipación (salida en falso). Cambia reglas acordadas, por eso no se hizo |
| J4 | **Guard de ruta por rol** para `/calentamiento` y `/juegos-reflejo` | Hoy solo se oculta el ítem del menú; la ruta exige solo estar autenticado |

### Deuda de nombres detectada al hacer el glosario

| # | Qué | Notas |
|---|---|---|
| N1 | **Liga**: existen el modelo `League`/`LeagueClas` y el tipo `Liga`, pero la funcionalidad nunca se construyó | Decidir si se borra o se implementa; mientras tanto, no reutilizar «liga» para el formato todos contra todos |
| N2 | Los campos `gamesWon`/`gamesLost` de la clasificación de grupo son **sets** (en tenis de mesa «game» y «set» son lo mismo) | Renombrar exige migración; valorar `@map` o dejarlo documentado |
| N3 | `MatchStatus.Iniciado` y `Abierto`: comprobar si `Iniciado` se usa en algún sitio o se creó «por si acaso» | Si no se usa, retirarlo del enum |
| N4 | Etiquetas de interfaz inconsistentes para el mismo concepto: «Cuadro Final», «Eliminatorias», «Llaves», «Liga (Todos contra Todos)» | Unificar según `GLOSSARY.md` |
| N5 | `CLAUDE.md` dice que `GLOSSARY.md` no existe: ya existe desde el PR de Calentamiento | Corregir esa línea de «Domain docs» |
