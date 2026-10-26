# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Monorepo for a table-tennis tournament/training app. The stack, naming, security, testing, React/backend patterns and git rules are in `.clinerules`, imported below; this file only adds what it does not cover.

# Reglas del proyecto

@.clinerules

## Layout notes

- There is no root `package.json`: run npm commands inside `api/` or `client/`.
- `tm-evolve-mobile/` is a separate Expo app with its own `AGENTS.md` (check the Expo docs for the matching SDK version, use `npx expo install`). It is **abandoned**: do not work on it unless asked.
- Day-to-day workflow (branches, commits, PRs, deploy, rollback, troubleshooting) is in `COMANDOS.md`; open work and decisions are in `docs/PENDIENTES.md`.

## Commands not listed in .clinerules

- Single API test: `npx vitest run src/routes/season.test.ts`; by name: `npx vitest run -t "pattern"` (`npm test` runs in watch mode). Seed: `npx prisma db seed`.
- Client has no `test` script, but `vitest.config.ts` exists (jsdom): `npx vitest run src/hooks/useTorneoFormato.test.ts`.
- Full stack: `docker compose up` (db :5432, api :3000, client :5173). Requires a root `.env` copied from `.env.example` (`POSTGRES_PASSWORD`, `JWT_SECRET`, `CRON_SECRET`); the API fails fast on startup if required env vars are missing (`api/src/config.ts`).

## Architecture notes

- **API:** tournament routes are split into `routes/tournament/{queries,commands,bracket,registration}.ts`. `utils/` holds the pure, heavily tested engines (group generation/standings, knockout bracket, match rules, seasons, stats); `services/` holds cron, email and Excel.
- **Client HTTP:** pages and hooks call per-domain modules in `api/services/*`, built on the `http` adapter in `api/client.ts`, which unwraps the `{ success, data }` envelope and returns `data` directly. Declare new URLs in `api/endpoints.ts` first.
- **Tournament detail screen** (`pages/Torneos/TorneoDetalles.tsx`) is a thin composition: data loading comes from `useTournamentDetails`, and each concern lives in its own hook that receives screen effects as callbacks — `useTorneoFormato`, `useTorneoInscripcion`, `useTorneoPartido`, `useTorneoIntercambio`, `useTorneoAcciones` — plus presentational pieces in `components/tournament/*`. Add new behaviour to the matching hook (with a colocated test) rather than back into the page.

## Working agreements

- Refactors are surgical extractions: copy logic and JSX verbatim, don't change them, and add tests for what is created.
- Don't `git add`/commit until the user approves; commit messages are long, descriptive and in Spanish like the history.

### Refactor rules (apply to every refactor/migration task, all session long)

Open refactor work is listed in `docs/PENDIENTES.md` (phases G1-G7) with evidence in `docs/auditoria-final-api-client.md`. While refactoring:

1. **One at a time.** Move logic piece by piece, never several concerns in one step.
2. **JSX golden rule.** Copy the visual code exactly as is: no changes to Mantine props/classes, icons, margins or texts. Only create the new component, pass the needed variables as props and import it in the page it came from.
3. **Re-check every finished file:** no unused variables/imports, and no lint, formatting or type warnings or errors.
4. **Pure surgical extraction.** Don't alter the logic of the functions being moved.
5. **Design vocabulary.** Review `docs/matt/skills/engineering/codebase-design/SKILL.md` first (depth, seam, adapter, deletion test) and apply it.
6. **Types.** If readability needs new types, add them under `client/src/types/`.
7. **Exploration only through the `codebase-memory` MCP server** (index and read the project with it). Shell commands to explore files (`ls`, `find`, `cat`, `grep`, `head`, `tail`) are forbidden and denied in `.claude/settings.json`; `npm`/`npx` stay allowed for lint, build and tests.
8. **Tests for everything created**, colocated as `*.test.ts(x)`.
9. **No `git add` or `git commit` until the user explicitly approves.** Once approved, add and commit with an extensive Spanish description. `git add`/`git commit` are denied in `.claude/settings.json`; the user lifts that when approving.

## Agent skills

### Issue tracker

Issues live in GitHub Issues (`Kein-Wai/ping-pong-tournament`, via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
