# Reparto de los seeds en tres: progreso

Rama: `feat/analisis-entrenador` (trabajo ajeno a los análisis; conviene separarlo en su propio commit/PR).
Nada está añadido ni commiteado: el usuario debe aprobarlo (ver `CLAUDE.md`).

## Objetivo y decisiones cerradas

Antes había `prisma/seed.ts` (club real CTM Costa Azahar) y `prisma/baseDataAndDemo.ts` + `prisma/demo/` (base + demo mezclados, borra TODA la base). Ahora tres seeds independientes en `api/prisma/seeds/`:

| Seed | Script npm | Qué hace |
|---|---|---|
| `base.ts` | `seed:base` | **Destructivo**: vacía la base entera y crea roles, temporada vigente, SuperAdmin y usuarios del sistema (EXENTO y TBD). Solo para formatear del todo. |
| `demo.ts` | `seed:demo` | Refresca el club demo **en su sitio**, sin borrar la base. Seguro de repetir. |
| `ctm.ts` | `seed:ctm` | Club real CTM Costa Azahar (el antiguo `seed.ts`). `npx prisma db seed` ejecuta solo este, como hoy. |

Orden tras formatear: `seed:base` → `seed:demo` y/o `seed:ctm`.

- **Seed base protegido**: se niega a ejecutarse sin `SEED_CONFIRM_WIPE=yes` y muestra antes a qué base apunta (sin credenciales).
- **Contraseña del SuperAdmin** de la variable `SEED_SUPERADMIN_PASSWORD` (falla si no está). Ya no está en el código.
- **Demo en producción**: el club demo, su admin (`admin@castellon.local`) y los 2 jugadores con login (`keinwaiplayer@hotmail.com`, `jlevin@hotmail.com`) se **actualizan en su sitio** y conservan su id (no se cierran sesiones). Se borra y regenera solo el contenido demo (torneos, ligas, equipos, eventos, entrenamientos, análisis, estadísticas) y los 60 jugadores aleatorios (`demo.jugadorNN@pingpong.local`). Las contraseñas existentes no se tocan.
- Los ejercicios demo pasan a pertenecer al club demo (antes eran globales). Las plantillas de habilidad (`SkillUpdateTemplate`) son globales: se reutilizan por nombre y nunca se borran.
- `seed.ts` (CTM): el email del AdminClub pasa a `ctmcostaazar@gmail.com` (tal como lo escribió el usuario; el club se llama "Costa Azahar", posible errata). HECHO.
- Las contraseñas de las cuentas demo siguen en el código (son cuentas demo conocidas a propósito); la del SuperAdmin ya no.

## Fases

| Fase | Estado |
|---|---|
| 0. Email del admin CTM en `seed.ts` | HECHA |
| 1. Estructura `prisma/seeds/` | HECHA: `safety.ts` y `baseData.ts` con tests (19 verdes), `base.ts`, `ctm.ts` (antes `seed.ts`, ya borrado), ayudantes movidos a `seeds/demo/`, scripts npm y `prisma.seed` apuntando a `ctm.ts`. Queda `baseDataAndDemo.ts` (se borra al terminar `demo.ts`). |
| 2. `demo.ts` | HECHA: `seeds/demo.ts`, `seeds/demo/cleanup.ts` (borrado acotado en transacción), `seeds/demo/ownerData.ts`, `createPlayer` con upsert por email. `baseDataAndDemo.ts` borrado. |
| 3. Verificación en base temporal `seedtest` (ya eliminada) | HECHA: guardas del seed base, base → demo → demo otra vez (1 club, 66 usuarios, 4 ejercicios y 5 plantillas, sin duplicados; ids de admin y cuentas con login estables), ctm → demo → ctm (CTM intacto, 80 usuarios, admin `ctmcostaazar@gmail.com`). |
| 4. Documentación (`COMANDOS.md`, `api/README.md`, `CLAUDE.md`) | HECHA |

## Límite conocido

El demo no es 100 % reproducible: el sorteo de cuadros del motor real de la API usa `Math.random` (`utils/knockout-engine.ts`, `knockout-assignment.ts`), que el seed no controla, así que resultados y asistencias varían ligeramente entre ejecuciones (la estructura y los conteos de torneos, partidos y equipos no). Arreglarlo exige tocar código de producción.

## Notas para retomar

- `tsc --noEmit` ya comprueba `prisma/**`; los `*.test.ts` colocados junto a los seeds los ejecuta `npx vitest run`.
- Verificar siempre en una base temporal (p. ej. `CREATE DATABASE seedtest` + `prisma migrate deploy` con `DATABASE_URL` cambiada). **No** lanzar `seed:base` contra la base local del usuario sin que lo pida.
- Cambios sin guardar ajenos (no tocar): `.codebase-memory/*`, `.claude/`.
