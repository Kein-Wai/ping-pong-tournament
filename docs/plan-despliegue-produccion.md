# Plan de paso a producción

Estado a 2026-10-26. Cubre **todo** lo hecho en las sesiones de refactor: la refactorización de `client/` (Fases 0-5), la seguridad de `client/` y las fases A-F de `api/`.

## 1. Dónde está cada cosa hoy

| Rama | Commits sobre `main` local | Contenido | ¿Subida? |
|---|---|---|---|
| `main` (local) | **41 por delante de `origin/main`** | Refactor de `client/` (hooks, servicios, tests), arreglos de bugs, y parte de `api/src` | No |
| `chore/seguridad-client` | 5 | Capacitor 8.5.3 exacto, IDs de Google a variables de entorno, axios/react-router, `exhaustive-deps` | No |
| `fix/api-autorizacion` (rama actual) | 20 | Fases A-F de la API + renovación de sesión en el cliente + contrato de respuesta único | No |

Las dos ramas salen del mismo punto (`aa3cec1`) y **tocan los mismos 3 ficheros** del cliente: `App.tsx`, `Login.tsx` y `Login.test.tsx`. Una prueba de fusión (`git merge-tree`) da **un conflicto real en `client/src/App.tsx`**; los otros dos se auto-fusionan.

Producción (`origin/main`) lleva 710 ficheros de diferencia respecto a `main` local. **Se despliega todo de golpe**: no hay un estado intermedio sano que se pueda subir por partes (el contrato de la API cambió y el cliente nuevo depende de él).

## 2. Qué cambia de cara a producción (lo que puede romper algo)

| Cambio | Efecto en producción | Acción |
|---|---|---|
| JWT de 30 días → **1 hora** + refresh token | Todos los usuarios tendrán que volver a iniciar sesión | Ninguna; avisar si hay más usuarios que tú |
| Contrato de respuesta único (`{success, data, message}`) | Un cliente antiguo (web cacheada, app de iPhone ya instalada) **deja de funcionar** contra la API nueva | Desplegar API y clientes juntos; actualizar la app de iPhone antes de usarla |
| Tabla nueva `refresh_token` | Sin ella el login da 500 | Aplicar la migración **antes** de arrancar la API nueva |
| `CLIENT_URL` obligatoria | La API **no arranca** si falta | Definirla en Render antes del deploy |
| `NODE_ENV=production` | Swagger deja de montarse | Definirla (si no, `/api-docs` sigue expuesto) |
| Límite de intentos por IP | 10 logins fallidos / 15 min bloquean la IP | Nada; conocerlo para las pruebas |
| `ADMIN_EMAIL` | Sin ella el health-check no envía correo | Definirla si quieres el informe |
| `APP_TIMEZONE` | Por defecto `Europe/Madrid` | Opcional |
| nodemailer 9 → 10 | Cambio mayor de dependencia | Comprobar un correo real tras el deploy |
| Club `Pendiente` | Un AdminClub de club no aprobado ya no puede crear torneos/partidos/equipos/eventos | Aprobar tus clubes reales antes (SuperAdmin) |

## 3. Plan paso a paso

### Fase 0 — Antes de tocar nada (15 min)

- [ ] **Copia de seguridad de la base de datos de producción** (`pg_dump` o snapshot del proveedor). Es la única red de seguridad real si algo sale mal con datos.
- [ ] Anota los valores actuales de las variables de entorno de producción (API y cliente) para poder volver atrás.
- [ ] Comprueba qué despliega Render al hacer *push* a `main` (auto-deploy sí/no) y **qué comandos de build y de arranque** usa la API. Con el `package.json` actual el build es `prisma generate && prisma db push && tsc`; vale, pero ver la Fase 4.
- [ ] Comprueba el estado de las migraciones de producción **sin cambiar nada**:
  ```bash
  cd api && DIRECT_URL="<url de producción>" DATABASE_URL="<url de producción>" npx prisma migrate status
  ```
  - Si dice que todo está aplicado salvo `20261026150000_added_refresh_tokens`: perfecto.
  - Si dice que no existe la tabla `_prisma_migrations` (producción se construyó con `db push`): hay que **marcar las migraciones antiguas como aplicadas** (`npx prisma migrate resolve --applied <nombre>` para cada una anterior a la nueva) y solo entonces aplicar la nueva. No lo hagas sin copia de seguridad.

### Fase 1 — Integrar las ramas en una sola (30-45 min)

1. Crear la rama de publicación desde la actual:
   ```bash
   git switch fix/api-autorizacion
   git switch -c release/2026-10
   git merge chore/seguridad-client
   ```
2. **Resolver el conflicto de `client/src/App.tsx`.** Hay que conservar **las dos** ideas:
   - de `chore/seguridad-client`: no leer `user` del hook (`const { logout, token, fetchProfile } = useAuthStore();`) y comprobar con `useAuthStore.getState().user`;
   - de `fix/api-autorizacion`: al estar el token caducado, intentar `refreshSession()` antes de cerrar la sesión (import de `./api/session`).
   El resultado esperado del bloque es:
   ```ts
   if (decodedPayload.exp && decodedPayload.exp < currentTime) {
     const renewed = await refreshSession().catch(() => 'sin-red');
     if (!renewed) { /* logout + navigate al login */ }
   } else if (!useAuthStore.getState().user) {
     await fetchProfile();
   }
   ```
3. Verificación completa tras la fusión (todo debe estar en verde):
   ```bash
   cd api    && npx tsc --noEmit && npm run lint && npx vitest run && npm audit
   cd client && npx tsc -b && npm run lint && npx vitest run && npm audit && npm run build
   ```
   - `npm audit` del cliente debe pasar de 6 vulnerabilidades (2 críticas de Capacitor, axios, xmldom...) a 0 o casi 0: eso lo trae la rama de seguridad.
   - `npm run build` del cliente **no se ha ejecutado nunca en esta sesión**: es el paso que más puede sorprender (tipos estrictos de `tsc -b`).
4. Probar localmente (Docker) una pasada corta con el *smoke test* del [plan de regresión](./plan-regresion-e2e.md).

### Fase 2 — Preparar el entorno de producción (antes de subir código)

**Variables de entorno de la API (Render):**

| Variable | Acción |
|---|---|
| `NODE_ENV` | `production` |
| `CLIENT_URL` | URL pública del cliente web, sin barra final (**nueva, obligatoria**) |
| `JWT_SECRET` | **Rotar** (valor largo y aleatorio). Ver nota abajo |
| `CRON_SECRET` | **Rotar** y actualizar el programador de cron externo que llama a `/api/webhooks/*` (el valor antiguo estuvo versionado en `docker-compose.yaml`) |
| `ADMIN_EMAIL` | Tu correo para el informe del health-check |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_ID_IOS`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GMAIL_USER`, `API_URL` | Comprobar que siguen definidas |
| `DATABASE_URL`, `DIRECT_URL` | Comprobar |
| `APP_TIMEZONE`, `CORS_ORIGINS` | Opcionales |

> **Por qué rotar `JWT_SECRET` ahora:** con el código nuevo, un token antiguo de 30 días sigue siendo válido (la firma coincide y el usuario existe) y **no tiene refresh token**, así que seguiría funcionando hasta 30 días. Rotar el secreto mata todos los tokens viejos de golpe y obliga a la migración limpia a sesiones de 1 hora.

**Variables del cliente web y secretos de GitHub:**

| Dónde | Variable | Acción |
|---|---|---|
| Hosting del cliente | `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID` | Comprobar |
| GitHub Actions (Secrets) | `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID` | Comprobar |
| GitHub Actions (Secrets) | **`VITE_GOOGLE_IOS_CLIENT_ID`** | **Crear** (nueva; la rama de seguridad la usa y sin ella el login de Google en iPhone falla) |

**Base de datos:**

- [ ] Invalidar los tokens de recuperación de contraseña vigentes (estuvieron expuestos en `GET /tournaments/:id`):
  ```sql
  UPDATE "user" SET reset_password_token = NULL, reset_password_expires = NULL;
  ```
- [ ] Aprobar (como SuperAdmin) los clubes reales que sigan en `Pendiente`, o los AdminClub de esos clubes quedarán limitados a editar los datos del club.

### Fase 3 — Subir y probar en iPhone (antes de fusionar)

1. `git push -u origin release/2026-10` y abrir el **Pull Request contra `main`**.
2. **Atención al workflow de iOS** (`.github/workflows/ios-build.yml`): se ejecuta también en las PR que tocan `client/**` y **sube el .ipa a TestFlight** (no tiene condición para `push` frente a `pull_request`). Esto es lo que te permite probar en el iPhone, pero cada ejecución consume un número de build y un hueco en TestFlight. Revisa que los secretos de firma de Apple siguen vigentes.
3. Para que el iPhone hable con la API **nueva** hace falta desplegarla; no hay entorno de pruebas separado. Opciones:
   - **A (recomendada si hay pocos usuarios):** desplegar la API de la rama en producción en una ventana tranquila (ver Fase 4) y probar contra ella con la app de TestFlight.
   - **B:** crear en Render un servicio *staging* con una copia de la base de datos y apuntar `VITE_API_URL` del build de la PR a él. Más seguro, más trabajo.
4. En la app de TestFlight comprueba como mínimo: login con correo, **login con Google**, que la sesión sobrevive a más de una hora (ver prueba en el plan de regresión), crear un torneo, anotar un partido y cerrar sesión.

### Fase 4 — Despliegue (ventana corta)

Orden estricto: **base de datos → API → cliente web → app iOS**.

1. Avisar a los usuarios si los hay (verán el login de nuevo).
2. Aplicar la migración a producción (con copia hecha en la Fase 0):
   ```bash
   cd api && npx prisma migrate deploy      # con DATABASE_URL/DIRECT_URL de producción
   ```
   Es **aditiva** (una tabla nueva): la API antigua seguiría funcionando con ella presente, así que este paso es seguro de hacer primero.
3. Fusionar la PR en `main` (squash o merge; commit de fusión con el resumen de las fases). Render despliega la API con las variables ya configuradas.
4. Esperar a ver en los logs de Render `Servidor corriendo en ...`. Si arranca con el error `Faltan variables de entorno obligatorias`, falta `CLIENT_URL`, `JWT_SECRET` o `CRON_SECRET`.
5. Desplegar el cliente web (si no es automático).
6. El *push* a `main` dispara otra vez el build de iOS: es la versión que irá a TestFlight/App Store.
7. Pasar el **smoke test de producción** (sección 5).

> Recomendación: cambiar el comando de build de la API de `prisma db push` a `prisma migrate deploy` (solo si la Fase 0 confirma que el historial de migraciones está al día). `db push` aplica el esquema sin historial y puede comportarse distinto en producción que en tus migraciones versionadas.

### Fase 5 — Después del despliegue

- [ ] Smoke test de producción (sección 5) y revisar los logs de Render durante unas horas (busca 401 en `/api/auth/refresh`, 500 y `Error no controlado`).
- [ ] Comprobar que llega **un correo real** (registro o recuperación de contraseña): nodemailer cambió de versión mayor.
- [ ] Lanzar a mano el cron una vez: `POST /api/webhooks/daily-reminders` y `GET /api/webhooks/health-check` con el nuevo `x-cron-secret`; actualizar el programador externo.
- [ ] Comprobar que `/api-docs` ya no existe (404).
- [ ] Etiquetar la versión: `git tag v2026.10.0` y empujar la etiqueta (te da un punto de vuelta atrás nombrado).
- [ ] Borrar las ramas ya fusionadas y actualizar `docs/plan-refactor-*.md` con la fecha de despliegue.

## 4. Plan de vuelta atrás

| Qué falla | Cómo volver |
|---|---|
| La API no arranca o da 500 generalizados | Render → *Rollback* al deploy anterior. La tabla `refresh_token` puede quedarse (no estorba). **No** restaures la copia de la base de datos salvo corrupción de datos |
| El cliente web no funciona | Redesplegar el build anterior del hosting. Ojo: el cliente antiguo **no** funciona con la API nueva, así que el rollback del cliente exige rollback de la API |
| Login de Google falla en iPhone | Casi seguro falta `VITE_GOOGLE_IOS_CLIENT_ID` o `GOOGLE_CLIENT_ID_IOS`: corregir la variable y relanzar el build de iOS |
| Datos mal tras la migración | Restaurar la copia de la Fase 0 (último recurso; se pierden los datos escritos desde entonces) |
| Una sola funcionalidad rota | `git revert <commit>` del commit concreto (los commits son atómicos y con mensaje largo) y nuevo despliegue |

## 5. Smoke test de producción (10 minutos)

1. `GET /` de la API responde; `/api-docs` da 404.
2. Registro con un correo nuevo → llega el correo → verificar → login.
3. Login con Google (web y iPhone).
4. Quedarse en la app > 1 hora (o bajar el TTL en staging) y comprobar que no te echa.
5. Como AdminClub de club aprobado: crear torneo, inscribir jugadores, generar grupos, anotar un partido, ver clasificación.
6. Como Player: ver torneos de tu club, solicitar ingreso a un club.
7. Como SuperAdmin: aprobar un club.
8. Cerrar sesión y comprobar que el refresh token anterior da 401 en `/auth/refresh`.

## 6. Riesgos abiertos (decisiones tuyas)

1. **App de iPhone ya instalada desde la App Store/TestFlight con la versión antigua:** dejará de funcionar contra la API nueva. Si hay otros usuarios, planifica publicar la versión nueva antes de desplegar la API, o añadir temporalmente una capa de compatibilidad.
2. **Una sola migración de golpe:** 710 ficheros de diferencia es mucho para una única subida. Es inevitable por cómo se acumularon las ramas, y es la razón de la copia de seguridad y de la ventana de despliegue.
3. **`docker-compose.yaml` con secretos versionados** (`CRON_SECRET`, contraseña de Postgres de desarrollo): rota el de producción y, cuando quieras, pasamos el compose a leer el `.env` de la raíz.
