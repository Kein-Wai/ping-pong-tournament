# Comandos y flujo de trabajo

Guía práctica para trabajar en el repositorio a partir de ahora: cómo arrancar, cómo hacer un `fix` o un `feat`, cómo verificar, subir, desplegar y volver atrás. Las reglas de código están en `.clinerules` y `CLAUDE.md`; los pendientes en [`docs/PENDIENTES.md`](./docs/PENDIENTES.md).

Producción: API en Render (`https://tt-backend-0570.onrender.com`), cliente web, y app iOS por TestFlight. Base de datos PostgreSQL (Supabase).

---

## 1. Arranque local

```bash
cd ~/Documentos/ping-pong-app
docker compose up                 # db :5432, api :3000, client :5173
docker compose up -d              # lo mismo en segundo plano
docker compose logs -f api        # logs de la API (busca «Servidor corriendo en…»)
docker compose down               # parar
```

Hay un `.env` en la raíz (secretos del compose) y otro en `api/` (variables de la API) y `client/` (variables `VITE_*`); ninguno se sube a git.

**Tras añadir o actualizar dependencias** (el contenedor guarda `node_modules` en un volumen):

```bash
docker compose up -d --build --renew-anon-volumes api      # o: client
# alternativa rápida sin reconstruir:
docker compose exec api npm install && docker compose restart api
```

**Sin Docker** (cada paquete por separado): `cd api && npm run dev` · `cd client && npm run dev`. No hay `package.json` en la raíz: los comandos de npm se ejecutan dentro de `api/` o `client/`.

---

## 2. Empezar un cambio

Una rama por cambio, siempre desde `main` actualizado:

```bash
git switch main
git pull --ff-only
git switch -c fix/descripcion-corta        # ver prefijos abajo
```

| Prefijo de rama | Cuándo | Prefijo del commit |
|---|---|---|
| `fix/…` | Arreglar un bug | `fix:` / `fix(api):` / `fix(client):` |
| `feat/…` | Funcionalidad nueva | `feat:` |
| `refactor/…` | Reestructurar sin cambiar comportamiento | `refactor:` |
| `chore/…` | Dependencias, configuración, limpieza | `chore:` |
| `docs/…` | Solo documentación | `docs:` |
| `test/…` | Solo tests | `test:` |
| `perf/…` · `ci/…` | Rendimiento · pipelines | `perf:` · `ci:` |

Nunca se trabaja directamente sobre `main`.

---

## 3. Desarrollar (TDD)

Regla de la casa: **RED → GREEN → REFACTOR**, en rebanadas verticales (un test, una implementación mínima, repetir).

1. Escribe el test que falla y **comprueba que falla por la razón correcta**.
2. Implementa lo mínimo para que pase.
3. Refactoriza con el test en verde.

Para un **bug**: primero el test que lo reproduce (en la capa más baja posible), luego el arreglo.

### Tests de la API (`cd api`)

```bash
npx vitest run                                        # todo, una pasada
npx vitest run src/routes/match.transaction.test.ts   # un fichero
npx vitest run -t "texto del test"                    # por nombre
npm test                                              # modo watch
```

Para un test de **autorización**, usa el arnés real (`api/src/testing/`): `bearer('adminClub1')`, `'playerClub2'`, `'freePlayer'`…, con `prismaMock` como única frontera simulada. No mockees los guardas.

### Tests del cliente (`cd client`)

```bash
npx vitest run                                        # todo
npx vitest run src/hooks/useTorneoFormato.test.ts     # un fichero
npx vitest run -t "texto del test"
npx vitest run --coverage                             # cobertura
```

(No existe `npm test` en el cliente.) Si un snapshot cambia **sin que lo esperes**, es un fallo; si cambia a propósito, revisa el diff y actualiza con `npx vitest run -u <fichero>`.

---

## 4. Verificar antes de commitear

No se da nada por terminado sin esto en verde.

```bash
# API
cd api
npx tsc --noEmit && npm run lint && npx vitest run && npm audit --omit=dev

# Cliente
cd ../client
npx tsc -b && npm run lint && npx vitest run && npm run build && npm audit --omit=dev
```

Notas:
- No pases `prettier` a ficheros antiguos de `api/` (reformatea todo y ensucia el diff); solo a los nuevos.
- Si tocas el **contrato de la API** (forma de las respuestas), cambia a la vez el servicio del cliente y sus tests.
- Una URL nueva del cliente se declara primero en `client/src/api/endpoints.ts`; una ruta de navegación, en `client/src/constants/routes.ts`.

---

## 5. Commit

Formato `<tipo>: <descripción>`; el cuerpo es largo, en español, y explica **por qué** (qué falla, qué se cambia, qué se verificó). Commits atómicos: un cambio lógico por commit.

```bash
git status
git add api/src/ruta/fichero.ts api/src/ruta/fichero.test.ts      # añade ficheros concretos, no `git add .`
git commit -F mensaje.txt          # o: git commit   (abre el editor para el mensaje largo)
```

Nunca se commitean `.env`, `node_modules`, `dist`, claves ni tokens (ver §10).

---

## 6. Base de datos (Prisma)

**Cambiar el esquema** (`api/prisma/schema.prisma`):

```bash
cd api
npx prisma migrate dev --name descripcion_corta      # crea y aplica la migración en local
npx prisma generate
```

Dentro de Docker (el compose solo define `DATABASE_URL`; la migración necesita `DIRECT_URL`):

```bash
docker compose exec api sh -c 'DIRECT_URL="$DATABASE_URL" npx prisma migrate dev --name descripcion_corta'
docker compose exec api sh -c 'DIRECT_URL="$DATABASE_URL" npx prisma migrate deploy'   # aplicar las existentes
```

**Datos de demo:** `npx prisma db seed` (en la API). **Estado:** `npx prisma migrate status`.

**En producción:** el build de la API en Render ejecuta `prisma db push`, que sincroniza el esquema (vale mientras los datos sean de prueba; antes de tener datos reales hay que pasar a `prisma migrate deploy`). Una migración nueva debe ser **aditiva** siempre que sea posible (tablas o columnas nuevas, no borrados) para poder volver atrás sin tocar la base de datos.

> Si añades un modelo, lleva el nombre en `PascalCase`, la tabla en `snake_case` con `@@map`, y los ids son UUID.

---

## 7. Subir y abrir la Pull Request

```bash
git push -u origin fix/descripcion-corta
```

GitHub imprime un enlace `https://github.com/Kein-Wai/ping-pong-tournament/pull/new/<rama>`: ábrelo y crea la PR contra `main` (no hay `gh` instalado). Cuerpo recomendado:

```markdown
## Resumen
Qué cambia y por qué (1-3 frases).

## Cambios
- …

## Riesgos / cambios de contrato
- Qué puede romper algo, variables de entorno nuevas, migraciones.

## Verificación
API: tsc / lint / vitest / audit · Cliente: tsc / lint / vitest / build · qué se probó a mano.
```

Cosas que pasan al abrir la PR:
- **Si toca `client/**`, se ejecuta el workflow de iOS y sube un build a TestFlight.** Cada ejecución consume un número de build (`github.run_number`).
- **No uses «Re-run» en ese workflow**: reintentaría subir el mismo número de build y Apple lo rechaza (`The bundle version must be higher…`). Para repetirlo, empuja un commit nuevo (`git commit --allow-empty -m "ci: relanza el build de iOS" && git push`).
- Si falta un secreto de GitHub (`VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_IOS_CLIENT_ID`, firmas de Apple), el build sale mal: créalo y empuja un commit nuevo.

**Fusionar:** botón *Merge pull request* con **Create a merge commit** (no squash: se conservan los commits atómicos). Después:

```bash
git switch main
git pull --ff-only
git branch -d fix/descripcion-corta            # borra la rama local
git push origin --delete fix/descripcion-corta # y la remota (GitHub también ofrece el botón)
```

---

## 8. Despliegue

Al fusionar en `main`:

| Qué | Cómo |
|---|---|
| **API (Render)** | Auto-deploy al fusionar (o *Manual Deploy → Deploy latest commit*). Build: `npm install --include=dev && npm run build` (el `--include=dev` es necesario porque `NODE_ENV=production`); arranque: `npm start`. En los logs: `prisma db push` → «Your database is now in sync» → `Servidor corriendo en http://localhost:…` |
| **Cliente web** | Se despliega con `main` (variables `VITE_API_URL` y `VITE_GOOGLE_CLIENT_ID` en el hosting) |
| **App iOS** | El push a `main` lanza el workflow y sube otro build a TestFlight; actualiza la app desde TestFlight |

**Orden si el cambio toca a la vez base de datos, API y cliente:** base de datos (migración aditiva) → API → cliente web → iOS. Si cambias el **contrato de respuesta**, API y clientes se despliegan juntos: un cliente antiguo no entiende la API nueva.

**Variables de entorno de la API en Render:** `NODE_ENV=production`, `CLIENT_URL` (sin barra final), `JWT_SECRET`, `CRON_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_ID_IOS`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GMAIL_USER`, `API_URL`; opcionales `ADMIN_EMAIL`, `APP_TIMEZONE`, `CORS_ORIGINS`. Sin `JWT_SECRET`, `CRON_SECRET` o `CLIENT_URL` la API **no arranca**. Cambiar `JWT_SECRET` cierra todas las sesiones.

### Volver atrás

| Qué falla | Cómo volver |
|---|---|
| La API no arranca o da 500 | Render → *Rollback* al deploy anterior. Las tablas nuevas pueden quedarse |
| Un cambio concreto está mal | `git revert <hash>` (o el *Revert* de la PR en GitHub), nueva PR y despliegue |
| Cambio de contrato roto | Revertir API y cliente **juntos** |
| El build de iOS falla | Mira el paso que falla en Actions; recuerda no usar *Re-run* |

---

## 9. Smoke test de producción (10 minutos)

Desde tu terminal (sustituye la URL si cambia):

```bash
U=https://tt-backend-0570.onrender.com
curl -s -o /dev/null -w "raíz:            %{http_code}  (200)\n" $U/
curl -s -o /dev/null -w "api-docs:        %{http_code}  (404)\n" $U/api-docs/
curl -s -o /dev/null -w "seasons sin tk:  %{http_code}  (401)\n" $U/api/seasons
curl -s -o /dev/null -w "refresh falso:   %{http_code}  (401)\n" -X POST $U/api/auth/refresh -H 'Content-Type: application/json' -d '{"refreshToken":"x"}'
curl -s -o /dev/null -w "cron sin secreto:%{http_code}  (401)\n" -X POST $U/api/webhooks/daily-reminders
curl -sI $U/api/clubs | grep -iE "x-powered-by|x-content-type-options|strict-transport-security"   # nosniff + HSTS, sin x-powered-by
```

Y a mano:
1. Registro con correo nuevo → llega el correo → verificar → login.
2. Login con Google (web e iPhone).
3. Como AdminClub de un club **aprobado**: crear torneo, inscribir, generar grupos, anotar un partido.
4. Como SuperAdmin: aprobar un club.
5. Cerrar sesión; el refresh token anterior da 401.
6. En el iPhone, dejar la app un rato y volver: no debe pedir login hasta pasada la hora, y entonces renovarse sola.

---

## 10. Secretos y protección de GitHub

- **Nunca** pegues claves, tokens ni contraseñas en código, comentarios, `docs/`, notas ni mensajes de commit. Van en variables de entorno (`.env` está en `.gitignore`).
- GitHub **bloquea el push** si detecta un secreto (`GH013: Push cannot contain secrets`). No uses el enlace «allow secret». Haz esto:
  1. **Revoca la clave** en su proveedor (ya se considera comprometida).
  2. Quítala del código/ficheros y **reescribe los commits locales** que la contienen, p. ej. para una rama aún no subida:
     ```bash
     git stash                                   # si tienes cambios sin commitear
     FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --tree-filter \
       "sed -i -E 's/PATRON_DE_LA_CLAVE/CLAVE_ELIMINADA/g' ruta/del/fichero" origin/main..HEAD
     git update-ref -d refs/original/refs/heads/<rama>     # borra la copia de seguridad de filter-branch
     git stash pop
     ```
  3. Vuelve a empujar.
- Si un secreto **ya llegó a GitHub**, reescribir no basta: hay que revocarlo siempre.
- La extensión Cline guarda copias en `refs/cline/checkpoints/*` dentro de tu `.git` local; no se publican con un `git push` normal, pero conviene saber que existen si un secreto estuvo en un fichero.

---

## 11. Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| Render: `error TS2688: Cannot find type definition file for 'node'` | `NODE_ENV=production` hace que `npm install` omita las `devDependencies`. Build Command: `npm install --include=dev && npm run build` |
| `prisma migrate` en Docker: `Can't reach database server at localhost:5432` | Falta `DIRECT_URL` dentro del contenedor: `docker compose exec api sh -c 'DIRECT_URL="$DATABASE_URL" npx prisma migrate deploy'` |
| `Cannot find module 'helmet'` (o similar) en Docker | Dependencia nueva sin instalar en el contenedor: `docker compose up -d --build --renew-anon-volumes api` |
| La API local no arranca: `Faltan variables de entorno obligatorias` | Define `JWT_SECRET`, `CRON_SECRET` y `CLIENT_URL` en `api/.env` |
| `429 Demasiados intentos` en local | Límite por IP (10 logins fallidos / 15 min): reinicia la API (`docker compose restart api`) |
| Login da 500 tras actualizar | Falta la tabla `refresh_token`: aplica la migración (§6) |
| iOS: `The bundle version must be higher than the previously uploaded version` | Se hizo *Re-run*; empuja un commit nuevo (§7) |
| Login de Google en iPhone falla con 401 | Falta `GOOGLE_CLIENT_ID_IOS` en Render o `VITE_GOOGLE_IOS_CLIENT_ID` en los secretos de GitHub |
| `npm install` del cliente falla por peer dependencies | Usa `npm install --legacy-peer-deps` (también lo usan el Dockerfile y el CI) |
| El navegador muestra el login en bucle tras desplegar | Sesión antigua: cierra sesión o borra `pingpong_token` y `pingpong_refresh_token` del `localStorage` |
| Un AdminClub recibe «Tu club está pendiente de aprobación» | Aprueba el club como SuperAdmin |

---

## 12. Atajos

```bash
# Ver qué cambió respecto a main antes de abrir la PR
git log --oneline main..HEAD
git diff main...HEAD --stat

# Deshacer cambios sin commitear en un fichero
git restore ruta/fichero

# Cambiar el mensaje del último commit (solo si NO se ha subido)
git commit --amend

# Sincronizar tu rama con main (si main avanzó)
git fetch origin && git merge origin/main

# Dependencias con vulnerabilidades
cd api && npm audit --omit=dev       # idem en client/
```
