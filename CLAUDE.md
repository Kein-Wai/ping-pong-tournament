# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Monorepo for a table-tennis tournament/training app. The stack, naming, security, testing, React/backend patterns and git rules are in `.clinerules`, imported below; this file only adds what it does not cover.

# Reglas del proyecto

@.clinerules

## Layout notes

- There is no root `package.json`: run npm commands inside `api/` or `client/`.
- `tm-evolve-mobile/` is a separate Expo app with its own `AGENTS.md` (check the Expo docs for the matching SDK version, use `npx expo install`). It is **abandoned**: do not work on it unless asked.
- `docs/everything/` and `docs/matt/` are reference material that `.clinerules` was distilled from. Do not treat them as project code and do not edit them.
- Day-to-day workflow (branches, commits, PRs, deploy, rollback, troubleshooting) is in `COMANDOS.md`; open work and decisions are in `docs/PENDIENTES.md`.

## Commands not listed in .clinerules

- Single API test: `npx vitest run src/routes/season.test.ts`; by name: `npx vitest run -t "pattern"` (`npm test` runs in watch mode). Seed: `npx prisma db seed`.
- Client has no `test` script, but `vitest.config.ts` exists (jsdom): `npx vitest run src/hooks/useTorneoFormato.test.ts`.
- Full stack: `docker compose up` (db :5432, api :3000, client :5173). Needs a root `.env` copied from `.env.example`. The API fails fast on startup if `JWT_SECRET`, `CRON_SECRET` or `CLIENT_URL` are missing (`api/src/config.ts`). `docker-compose.yaml` still carries some fixed values instead of reading the root `.env` (open decision D4 in `docs/PENDIENTES.md`).

## Architecture notes

- **API:** tournament routes are split into `routes/tournament/{queries,commands,bracket,registration}.ts`. `utils/` holds the pure, heavily tested engines (group generation/standings, knockout bracket, match rules, seasons, stats); `services/` holds cron, email and Excel.
- **API tests:** Prisma is mocked in every test, so no test checks real SQL or transactions. Keep that in mind before trusting a green run on query or transaction changes.
- **Client HTTP:** pages and hooks call per-domain modules in `api/services/*`, built on the `http` adapter in `api/client.ts`, which unwraps the `{ success, data }` envelope and returns `data` directly. Declare new URLs in `api/endpoints.ts` first.
- **Tournament detail screen** (`pages/Torneos/TorneoDetalles.tsx`) is a thin composition: data loading comes from `useTournamentDetails`, and each concern lives in its own hook that receives screen effects as callbacks — `useTorneoFormato`, `useTorneoInscripcion`, `useTorneoPartido`, `useTorneoIntercambio`, `useTorneoAcciones` — plus presentational pieces in `components/tournament/*`. Add new behaviour to the matching hook (with a colocated test) rather than back into the page. This is the model for decomposing other large screens (phase G6).
- **Warm-up feature** (`/calentamiento`, Player only; terms in `GLOSSARY.md`): the pure phase engine is `utils/warmupEngine.ts` (functions take `now`, no timers), driven by `hooks/useWarmupSession`; `utils/warmupCues` + `utils/warmupSound` + `hooks/useWarmupAlerts` turn phase changes into beeps/vibration (voices plug in at `warmupSound`); `hooks/useWakeLock` keeps the screen on; `utils/warmupRoutine` + `hooks/useWarmupBuilder` hold the routine being built; the 9 fixed exercises live in `constants/warmupExercises.ts` with their SVG animations in `components/warmup/animations/`. The page only composes these.

## Working agreements

- **Git:** do not `git add`/`git commit` until the user explicitly approves. Once approved, commit with a long, descriptive Spanish message, using the `type: description` format from `.clinerules`. One branch per change, cut from an up-to-date `main` (see `COMANDOS.md`).
- **Exploration:** for code, use the `codebase-memory` MCP first (`search_graph`, `trace_path`, `get_code_snippet`). Use `Read` for docs and config, which the graph does not index. Avoid shell `ls`/`find`/`cat`/`grep`/`head`/`tail`; `npm`/`npx` stay allowed for lint, build and tests.
- **Tests:** every new piece of logic gets a colocated `*.test.ts(x)`, written test-first when it is new behaviour (`tdd` skill).
- **Done means verified:** build, lint and tests pass in the package you touched (`.clinerules` §14). Say so explicitly, or say what was not run.
- **Enforcement:** `.claude/settings.json` currently has its deny rules commented out, so the git and shell restrictions above are agreements, not blocks.

### Refactor rules

Open refactor work is phases G1-G7 in `docs/PENDIENTES.md`, with evidence in `docs/auditoria-final-api-client.md`. The refactor of `client/` and phases A-F of `api/` are finished and in production. Apply these to any refactor or extraction task:

1. **One at a time.** Move logic piece by piece, never several concerns in one step.
2. **JSX golden rule.** Copy the visual code exactly as is: no changes to Mantine props/classes, icons, margins or texts. Only create the new component, pass the needed variables as props and import it in the page it came from.
3. **Surgical extraction.** Do not alter the logic of the functions being moved.
4. **Re-check every finished file:** no unused variables/imports, and no lint, formatting or type warnings or errors.
5. **Design vocabulary.** Apply the `codebase-design` skill (depth, seam, adapter, deletion test) before deciding where a piece goes.
6. **Types.** If readability needs new types, add them under `client/src/types/`.
7. **Tests for everything created**, colocated.

## Which skill to use

Skills from the `mattpocock-skills` plugin need the prefix when invoked by hand (`/mattpocock-skills:tdd`). The built-in ones do not.

| Situation | Skills, in order |
|---|---|
| New project from scratch | `grilling` → `research` → `domain-modeling` → `prototype` (if a design doubt remains) → `codebase-design` → `init` → `tdd` |
| New feature | `grilling` (if the idea is vague) → `domain-modeling` (new terms) → `codebase-memory` (impact) → `tdd` → `simplify` → `code-review` → `security-review` → `pr` |
| Bug or fix | `diagnosing-bugs` → `codebase-memory` (`trace_path`) → `tdd` (regression test first) → `code-review` |
| Security check | `security-review` (pending changes) · `codebase-memory-auditor` agent (whole areas: auth, `clubId` filters, rate limits, secrets) · `code-review high` · `npm audit` in `api/` and `client/` |
| Refactor or design cleanup | `codebase-memory` → `codebase-design` → surgical extraction (rules above) → `simplify` |
| Understand code or impact analysis | `codebase-memory` |
| See a change working in the real app | `run` |
| Steps only the user can perform (CI secrets, OAuth, deploy) | `wizard` |
| Recurring checks | `loop` (this session) · `schedule` (cloud, cron) |
| Fewer permission prompts / hooks / settings | `fewer-permission-prompts` · `update-config` |
| Writing or editing `CLAUDE.md` or a skill | `writing-for-agents` |
| Calling the Claude API from the app | `claude-api` |

## Agent skills

### Issue tracker

Issues live in GitHub Issues (`Kein-Wai/ping-pong-tournament`, via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`. Neither exists yet: `domain-modeling` creates them when the first term or decision needs recording.
