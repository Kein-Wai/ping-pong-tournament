# Plan de regresión y pruebas de extremo a extremo

Objetivo: que al añadir o cambiar algo sepamos, **sin revisar a mano toda la aplicación**, que no hemos roto nada. Este documento fija qué se prueba, en qué capa, con qué herramienta, cuándo se ejecuta y cómo se monta lo que hoy falta.

Estado a 2026-10-26: existen 658 tests en `api/` y ~1.850 en `client/` (ambos en verde), pero **no hay CI, no hay pruebas de extremo a extremo (E2E) y la cobertura no se mide en la API**. Todo lo que dice «propuesto» está por construir.

---

## 1. Cómo está cubierto hoy

| Capa | Qué comprueba | Herramienta | Estado |
|---|---|---|---|
| Motores de dominio (API) | Siembra, grupos, desempates, reglas de marcador, ELO, alcance por club | Vitest, funciones puras | **Sólida** |
| Seguridad de rutas (API) | Quién puede hacer qué, con JWT y guardas **reales** y solo la base de datos simulada | Vitest + Supertest + arnés `src/testing/` (20 ficheros) | **Sólida** |
| Contrato de respuesta (API) | `{ success, data, message, error }` en auth y guardas; regla de lint que lo impone | Vitest + ESLint | Buena |
| Rutas con Prisma simulado (API) | Comportamiento de cada endpoint | Vitest + Supertest | Buena, pero 17 ficheros mockean los guardas (no detectan un guarda ausente) |
| Perímetro (API) | helmet, límites de intentos, CORS, Swagger fuera de producción | Vitest + Supertest | Buena |
| Servicios y hooks (cliente) | Cada operación de `api/services/*`, cada hook | Vitest + jsdom | **Sólida** |
| Pantallas (cliente) | Montaje, flujos principales, estructura del DOM (instantáneas) | Vitest + Testing Library | Buena |
| Reglas de código | Sin `any`, sin rutas a mano, sin axios fuera de `api/` | ESLint ejecutado en tests | Buena |
| **Base de datos real** | Que las consultas Prisma, las transacciones y las migraciones funcionan de verdad | — | **No hay**: Prisma está siempre simulado |
| **Navegador real extremo a extremo** | Que front + API + base de datos funcionan juntos | — | **No hay** |
| **Móvil (Capacitor/iPhone)** | Login nativo de Google, enlaces universales, sesión en segundo plano | — | Solo a mano |

**El hueco que importa:** como Prisma está simulado en todas partes, **ningún test comprueba SQL real ni transacciones reales**. Los fallos que se nos pueden escapar son los de integración (una consulta que no devuelve lo esperado, un `$transaction` que no hace rollback, una migración incompatible). Por eso el plan añade una capa con base de datos real (nivel 2) además del E2E de navegador (nivel 3).

---

## 2. Pirámide objetivo

```
            ▲   5. Manual en iPhone (checklist, antes de cada release)
           ╱ ╲  4. E2E de navegador, Playwright (5-8 recorridos críticos)
          ╱   ╲ 3. API contra PostgreSQL real (integración, ~30 tests)
         ╱     ╲ 2. Matriz de autorización generada (rol × operación)
        ╱───────╲ 1. Unitarias y de rutas actuales (se mantienen)
```

Regla: **un fallo se prueba en la capa más baja posible**. El E2E solo valida recorridos completos y que las piezas se hablan bien; no repite lo que ya cubre un test unitario.

---

## 3. Nivel 3 — API contra PostgreSQL real (propuesto)

**Qué aporta:** consultas, `$transaction`, restricciones únicas, borrados en cascada y migraciones, todo de verdad.

**Cómo:**
1. Base de datos efímera: servicio `postgres:16-alpine` en el CI y, en local, un segundo contenedor en otro puerto (`docker compose -f docker-compose.test.yaml up -d db-test`).
2. Un setup de Vitest (`api/vitest.integration.config.ts`) que antes de cada fichero ejecuta `prisma migrate deploy` en una base de datos con nombre único y, tras cada test, trunca las tablas (o usa transacciones con rollback).
3. Los tests viven en `api/src/**/*.integration.test.ts`, y se lanzan con `npm run test:integration` (separado del `npm test` rápido).
4. Fixtures reutilizables (`api/src/testing/db-fixtures.ts`): crear club aprobado, club pendiente, SuperAdmin, AdminClub, jugadores, temporada vigente.

**Casos obligatorios (primera tanda):**

| # | Caso | Por qué |
|---|---|---|
| I1 | Login → refresh → refresh con el token antiguo revoca la familia | Rotación real contra la tabla `refresh_token` |
| I2 | Dos `POST /auth/refresh` simultáneos con el mismo token: solo uno gana | Carrera real, no simulada |
| I3 | `POST /matches` completado: estadísticas y clasificación coherentes; fallo forzado a mitad ⇒ **nada** queda guardado | Verifica el rollback de `match-result` |
| I4 | `POST /clubs` por un usuario con club ⇒ 400 y **no queda club huérfano** | Verifica el rollback de `club-membership` |
| I5 | Dos `POST /clubs/:id/join` simultáneos del mismo jugador | `updateMany` condicionado |
| I6 | Generar grupos de un torneo de 8/12/16 jugadores y comprobar posiciones | Motor + consultas reales |
| I7 | Cerrar un round robin: posiciones finales, `tournamentWon` del ganador | `processMatchResult` real |
| I8 | Aislamiento: un AdminClub del club B no ve ni modifica nada del club A (recorrer 10-15 endpoints) | Aislamiento multi-tenant con SQL real |
| I9 | Borrar torneo / usuario / equipo: cascadas correctas | Integridad referencial |
| I10 | `prisma migrate deploy` desde cero y desde el estado de producción anterior | Las migraciones aplican limpias |

---

## 4. Nivel 2 — Matriz de autorización generada (propuesto)

La API tiene unas 100 rutas. En lugar de escribir un test por ruta y rol a mano, un test recorre la lista de rutas y comprueba el **código esperado por identidad**.

- Fuente: una tabla en `api/src/testing/authorization-matrix.ts`: `{ método, ruta, permitidos: ['superAdmin','adminClub1'], denegados: [...] }`.
- Usa el arnés existente (`bearer('playerClub1')`, etc.), así que cuesta casi nada ejecutarla.
- Un segundo test **falla si hay una ruta nueva sin entrada en la matriz** (se compara con `router.stack` / el listado de Express). Así es imposible añadir un endpoint sin decidir quién puede llamarlo.
- Identidades: `superAdmin`, `adminClub1` (club aprobado), `adminClubPendiente`, `adminWithoutClub`, `playerClub1`, `playerClub2`, `freePlayer`, y «sin token».

---

## 5. Nivel 4 — E2E de navegador con Playwright (propuesto)

### 5.1 Infraestructura

```
e2e/                          (carpeta nueva en la raíz del repositorio)
├── playwright.config.ts      baseURL http://localhost:5173, 1 worker, reintentos=1 en CI
├── global-setup.ts           resetea y siembra la base de datos
├── fixtures/                 login(page, 'adminClub') que guarda el estado en caché
├── tests/
│   ├── 01-acceso.spec.ts
│   ├── 02-club.spec.ts
│   ├── 03-torneo.spec.ts
│   └── …
└── seed-e2e.ts               datos deterministas (ver §5.2)
```

- **Pila de pruebas:** `docker compose -f docker-compose.e2e.yaml up -d` levanta `db` (efímera), `api` (con `NODE_ENV=development`, `JWT_SECRET`, `CRON_SECRET`, `CLIENT_URL=http://localhost:5173` de prueba) y `client`. Ninguna credencial real.
- **Datos:** `seed-e2e.ts` crea siempre los mismos usuarios (correo y contraseña fijos): un SuperAdmin, un AdminClub de club **aprobado** con 8 jugadores, un AdminClub de club **pendiente**, un jugador libre y un jugador de club. Se ejecuta antes de cada fichero (`TRUNCATE` + seed).
- **Una pequeña adaptación de la API para poder probar la caducidad:** que `ACCESS_TOKEN_TTL` se pueda fijar por variable de entorno (p. ej. `ACCESS_TOKEN_TTL=5s` en la pila de E2E) con `1h` por defecto. Sin esto el recorrido de «la sesión no se cae» tardaría una hora.
- **Correo:** en E2E la API apunta a un buzón de captura (MailHog) o el envío se desactiva y el token de verificación se lee de la base de datos en el propio test.
- **Selectores:** roles ARIA y textos visibles (`getByRole`, `getByLabel`), nunca clases de Mantine; solo se añade `data-testid` en los pocos sitios que no tengan alternativa.

### 5.2 Recorridos críticos (el catálogo)

Prioridad: **P0** = en cada PR (≈5 min); **P1** = cada noche y antes de cada release; **P2** = antes de cada release.

| ID | Prio. | Recorrido | Pasos clave y resultado esperado |
|---|---|---|---|
| E1 | P0 | Registro y verificación | Registrar jugador → (leer token) → verificar → login → llega al Dashboard |
| E2 | P0 | Login/logout y 401 | Login con contraseña incorrecta: mensaje genérico; login correcto; logout; el refresh token antiguo ya no sirve |
| E3 | P0 | **Sesión que se renueva** | Con TTL de 5 s: iniciar sesión, esperar 8 s, navegar a otra pantalla ⇒ **no** vuelve al login; en la red se ve `401 → POST /auth/refresh 200 → reintento 200` |
| E4 | P0 | Club pendiente | Registrar AdminClub + club ⇒ puede editar el club pero «Crear torneo» devuelve el aviso de club pendiente; el SuperAdmin lo aprueba; ahora el mismo AdminClub crea torneos |
| E5 | P0 | **Torneo completo** | AdminClub crea torneo (8 jugadores, grupos + eliminatoria) → inscribe → genera grupos → anota todos los partidos de grupo → se genera el cuadro → anota semifinales y final → aparece el podio |
| E6 | P1 | Ingreso a club | Jugador libre solicita ingreso → AdminClub aprueba con nivel/ELO/habilidades → el jugador ve su club |
| E7 | P1 | Aislamiento | Jugador del club B abre por URL directa un torneo del club A ⇒ 404/aviso, no datos |
| E8 | P1 | Equipos | Crear equipo, asignar plantilla, crear partido de liga, jugador marca disponibilidad |
| E9 | P1 | Entrenamientos | Crear plan y sesión, finalizar una sesión como jugador ⇒ sube la habilidad |
| E10 | P1 | Entrenamiento grupal | Crear horario recurrente, programar, tomar asistencia |
| E11 | P1 | Análisis manual | Crear partido manual, registrar puntos, cerrar set y partido ⇒ informe |
| E12 | P1 | Calendario | Crear evento con recordatorio, editarlo (cambia la fecha), borrarlo |
| E13 | P2 | Excel | Crear torneo desde Excel; descargar la exportación |
| E14 | P2 | Recuperación de contraseña | Pedir enlace → (leer token) → cambiar contraseña → las sesiones anteriores quedan cerradas |
| E15 | P2 | Feedback | Jugador envía una sugerencia → SuperAdmin la ve en la bandeja |
| E16 | P2 | Administración global | SuperAdmin ve el panel y aprueba/inactiva un club |

Cada recorrido termina comprobando **un efecto observable** (texto en pantalla, fila en la tabla, URL), no solo que «no hubo error».

### 5.3 Ejemplo de recorrido (E3)

```ts
test('la sesión se renueva sin volver al login', async ({ page }) => {
  await loginAs(page, 'jugadorClub');                 // fixture: formulario real
  await page.waitForTimeout(8_000);                   // TTL de acceso de la pila E2E = 5 s
  const refresh = page.waitForResponse(r => r.url().endsWith('/auth/refresh'));
  await page.getByRole('link', { name: 'Torneos' }).click();
  expect((await refresh).status()).toBe(200);
  await expect(page).toHaveURL(/\/torneos/);          // no nos echó al /login
});
```

---

## 6. Nivel 5 — Checklist manual en iPhone (antes de cada release)

Lo que ninguna herramienta automática cubre bien. 10-15 minutos, con la app de TestFlight del *build* candidato:

- [ ] Instala/actualiza desde TestFlight y arranca (pantalla de carga, sin pantalla en blanco).
- [ ] **Login con Google** nativo; después cerrar sesión y entrar con correo y contraseña.
- [ ] Dejar la app **en segundo plano más de una hora** y volver: sigue con sesión (renovación) o pide login limpio (nunca pantalla rota).
- [ ] Modo avión: se muestra «Error de red» y **no** cierra la sesión; al volver la red, funciona.
- [ ] Teclado: los formularios largos (crear torneo, marcador) no quedan tapados; zonas seguras (notch/barra inferior) correctas.
- [ ] Enlaces universales (`appUrlOpen`): abrir un enlace de verificación o de recuperación desde el correo.
- [ ] Rotación de pantalla y modo oscuro del sistema (la app fuerza claro).
- [ ] Anotar un partido completo en el tracker con gestos táctiles.
- [ ] Versión y número de build en la pantalla correcta (el número de build lo pone el CI).

---

## 7. Cuándo se ejecuta cada cosa

| Momento | Qué se ejecuta | Tiempo | Quién |
|---|---|---|---|
| Mientras desarrollas | `npx vitest run <fichero>` del área tocada | segundos | Tú |
| Antes de cada commit | `tsc` + `lint` + `vitest run` del paquete tocado | 1-2 min | Tú (obligatorio por `.clinerules`) |
| En cada Pull Request (CI) | **API:** `tsc`, `lint`, `vitest run`, `npm audit --omit=dev`, integración con PostgreSQL. **Client:** `tsc -b`, `lint`, `vitest run`, `build`, `npm audit --omit=dev`. **E2E P0** (E1-E5) | ~10 min | GitHub Actions |
| Cada noche | E2E P0 + P1 y la matriz de autorización completa | ~20 min | GitHub Actions (`schedule`) |
| Antes de cada release | Todo lo anterior + E2E P2 + checklist del iPhone + smoke de producción (`COMANDOS.md` §9) | ~1 h | Tú |
| Tras cada despliegue | Smoke de producción de 10 minutos | 10 min | Tú |

**Puerta de calidad (no se fusiona a `main` si falla):** `tsc`, `lint`, tests unitarios y de integración, E2E P0, `build` del cliente y `npm audit --omit=dev` sin vulnerabilidades altas o críticas. Umbral de cobertura: 80 % en líneas de `api/src/utils`, `api/src/http`, `api/src/middleware` y `client/src/{hooks,api,utils}` (lo exige `.clinerules`).

Esqueleto del workflow (`.github/workflows/ci.yml`, **separado** del de iOS):

```yaml
name: CI
on:
  pull_request:
  push: { branches: [main] }
jobs:
  api:
    runs-on: ubuntu-latest
    services:
      postgres: { image: "postgres:16-alpine", env: { POSTGRES_PASSWORD: test }, ports: ["5432:5432"] }
    defaults: { run: { working-directory: api } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "24.18.0", cache: npm, cache-dependency-path: api/package-lock.json }
      - run: npm ci
      - run: npx prisma generate
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npx vitest run --coverage
      - run: npm audit --omit=dev --audit-level=high
      - run: npm run test:integration
        env: { DATABASE_URL: "postgresql://postgres:test@localhost:5432/test", DIRECT_URL: "postgresql://postgres:test@localhost:5432/test" }
  client:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: client } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "24.18.0", cache: npm, cache-dependency-path: client/package-lock.json }
      - run: npm ci --legacy-peer-deps
      - run: npx tsc -b
      - run: npm run lint
      - run: npx vitest run --coverage
      - run: npm run build
        env: { VITE_API_URL: "http://localhost:3000/api", VITE_GOOGLE_CLIENT_ID: "ci" }
      - run: npm audit --omit=dev --audit-level=high
  e2e:
    needs: [api, client]
    # levanta docker-compose.e2e.yaml, ejecuta `npx playwright test --grep @p0` y sube el informe como artefacto
```

---

## 8. Qué ejecutar según lo que cambies (guía rápida)

| Si tocas… | Ejecuta como mínimo | Y vigila |
|---|---|---|
| Un motor de `api/src/utils` (grupos, cuadro, reglas, ELO) | Su `*.test.ts` + I6/I7 + E5 | Resultados deterministas |
| Autenticación, sesiones, JWT | `session-identity`, `auth.refresh`, `auth.accounts` + I1/I2 + E2/E3/E14 | Que un usuario degradado pierde el acceso |
| Guardas, roles, aislamiento por club | Matriz de autorización + `club-isolation` + I8 + E7 | **Una ruta nueva sin entrada en la matriz** |
| Esquema de Prisma / migraciones | I10 + toda la suite de integración | Aplicar la migración desde el estado de producción |
| Un endpoint nuevo | Su test de ruta + su fila en la matriz + un caso de integración si escribe en varias tablas | Contrato `{ success, data, message }` (lo comprueba el linter) |
| Respuestas de la API (forma) | Tests de `api/services/*` del cliente + `response-contract.test.ts` | Los dos lados a la vez |
| `api/client.ts`, `axios.ts`, `session.ts` | `src/api/*.test.ts`, `App.test.tsx` + E2/E3 | Bucle de reintentos, renovación única |
| Una pantalla o un hook | Su test + instantánea; si es una pantalla grande, el E2E de su recorrido | Regla de oro del JSX (la instantánea no debe cambiar) |
| Plantillas de correo | `emailtemplate.test.ts` | Escape de HTML |
| Cron / recordatorios | `webhook.test.ts`, `timezone.test.ts` | Zona horaria y cambio de hora |
| Dependencias | `npm audit`, suite completa, `build` | Versiones mayores (nodemailer, Capacitor) |
| Capacitor / iOS | `build` + `cap sync` + **checklist del iPhone** | Login de Google nativo |

---

## 9. Política de regresión (cómo se mantiene esto vivo)

1. **Cada bug se convierte en un test antes de arreglarse** (RED), en la capa más baja que lo reproduzca. El mensaje del commit enlaza el test.
2. **Cada endpoint nuevo** trae su test de ruta, su fila en la matriz de autorización y, si escribe en varias tablas, un módulo con `$transaction` y su caso de integración.
3. **Cada pantalla nueva** trae su test de humo y, si es una pantalla de negocio, su recorrido E2E o una nota justificando por qué no.
4. **Los tests flaky se arreglan o se borran** en la semana: un E2E que falla «a veces» enseña a ignorar al CI.
5. **Los snapshots solo se actualizan con intención** (revisando el diff): son el verificador mecánico del refactor de JSX.
6. **Revisión trimestral** de este documento: ¿hay recorridos que ya no se usan? ¿qué incidencias de producción no habría detectado ninguna capa?

---

## 10. Fases de implantación

| Fase | Entregable | Esfuerzo | Valor |
|---|---|---|---|
| R1 | **CI** (`ci.yml`) con `tsc`, `lint`, `vitest`, `build`, `audit`; scripts `test` y `test:coverage` en ambos paquetes; `@vitest/coverage-v8` en `api/` | 1 sesión | **Máximo** (hoy nada se ejecuta solo) |
| R2 | **Matriz de autorización** + test «ruta sin entrada» | 1 sesión | Alto, coste bajo (reutiliza el arnés) |
| R3 | **Integración con PostgreSQL real** (I1-I5 primero; luego I6-I10) | 2 sesiones | Alto: cubre lo que Prisma simulado no ve |
| R4 | **Playwright**: infraestructura + E1-E5 (P0) | 2 sesiones | Alto |
| R5 | E6-E16 (P1/P2) y ejecución nocturna | 2 sesiones | Medio |
| R6 | Extras: accesibilidad (`@axe-core/playwright`), presupuesto de tamaño del *bundle* (falla si `index.js` supera X kB), capturas visuales de las pantallas clave | 1 sesión | Medio |

Orden recomendado: **R1 → R2 → R4 → R3 → R5 → R6**. R1 y R2 son baratos y dan mucho; R4 sube la confianza en los recorridos críticos antes de refactorizar las pantallas grandes (fase G6 de la auditoría, que se apoya en E2E y en las instantáneas).
