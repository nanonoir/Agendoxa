# DOC-02 — Quality tooling and continuous integration

**Status:** implementation proposal for review; references [Issue #19](https://github.com/nanonoir/Agendoxa/issues/19). Implemented in the task branch; team review pending. GitHub Actions has not run this workflow yet, and `main` protection remains a separate owner-led step.

## Context

REP-01 and REP-02 already delivered working ESLint (web), type-aware oxlint (API and database), API Prettier configuration, Vitest 4 unit/E2E/integration configurations and an isolated PostgreSQL 18 test service. DOC-02 makes these checks repeatable from the repository root and enforces them on pull requests to `main`, without replacing functional tools or adding a second test framework.

Audit baseline on `develop` `af1da44` (2026-11-12): `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` passed. Gaps: no root formatter or `format:check`, no lint in `packages/shared`, no `.gitattributes` while Windows checkouts use `core.autocrlf=true`, no root command running both PostgreSQL suites and no workflow.

## Decisions

### D1 — Lint policy: keep ESLint for web and oxlint for the TypeScript packages

| Workspace | Linter | Reason |
|---|---|---|
| `apps/web` | ESLint 9 with `eslint-config-next` (unchanged) | Next.js, React Hooks and Core Web Vitals rules have no oxlint equivalent configured here |
| `apps/api` | oxlint `--type-aware` (unchanged) | Already passing; its type-aware rules (for example `no-floating-promises`) cover the NodeNext/Nest code |
| `packages/database` | oxlint `--type-aware` (unchanged) | Same as API; covers `src`, `test`, `scripts` and `drizzle.config.ts` |
| `packages/shared` | oxlint `--type-aware` (new) | Reuses versions already in the lockfile, so no new package is resolved |

**Alternative rejected:** a shared ESLint configuration for every TypeScript workspace while retiring oxlint. It would add `typescript-eslint` and plugin dependencies, slow type-aware linting and duplicate rules that oxlint already enforces, without catching a demonstrated class of defects. Issue #19 asks for "ESLint in the corresponding workspaces"; this decision interprets the corresponding workspace as the web and satisfies lint coverage for the rest with oxlint. No rule set runs twice on the same file.

**Warnings fail.** The audit showed that oxlint reports most default rules (for example `no-debugger`, and `no-floating-promises` outside the API) as warnings and exits 0, and ESLint behaves the same for warning-level rules. Every lint script therefore runs with `--deny-warnings` (oxlint) or `--max-warnings=0` (ESLint). The existing code had no warnings, so no source changed.

oxlint configuration stays per workspace. Only the API customizes rules, so a shared configuration would not reduce meaningful duplication yet.

### D2 — One central, read-only Prettier check

- Prettier runs once from the root (`pnpm format:check` = `prettier --check .`), not through Turbo, because it is fast and workspace-independent. `pnpm format` is the opt-in writer; CI never writes.
- Prettier becomes a root dev dependency with the API's existing range, so it resolves to the version already in the lockfile. The API keeps its own dependency and `format` script.
- Existing quote styles are preserved: the API and the database keep single quotes and trailing commas through package-local configuration, while the root defaults (double quotes) apply to web, shared and root files. The audit showed that the database already follows the API style and only three JSON files lacked a final newline, so there is no baseline exclusion of application source.
- `.prettierignore` excludes dependencies, build and cache outputs, the lockfile, generated Drizzle migrations/metadata, `next-env.d.ts` and Markdown. Markdown is excluded because the documentation set is authored by hand and reformatting it would create review churn unrelated to code quality.

### D3 — LF line endings in Git

`.gitattributes` sets `* text=auto eol=lf`. Prettier checks LF (its default), and without this rule Windows checkouts with `core.autocrlf=true` contain CRLF, so `format:check` would fail locally but pass in CI. Files already stored with LF are unaffected; existing Windows checkouts may need to re-checkout their files once (see [README](../../README.md)).

### D4 — Turbo tasks and caching

- `lint`, `typecheck` and `test` keep `dependsOn: ["^build"]`: type-aware lint, TypeScript and Vitest resolve `@agendoxa/shared` and `@agendoxa/database` through their emitted `dist`, so removing it breaks a clean checkout.
- These tasks emit no files and keep Turbo's default log-only caching. `dev` stays uncached and persistent.
- A new `test:integration` task runs the existing database and API PostgreSQL suites. It is uncached, because its result depends on an external database, and passes through only `DATABASE_URL_TEST` under Turbo's strict environment mode. No remote cache or credentials are used.
- `pnpm test` keeps running only API unit tests; workspaces without unit tests get no placeholder suite. `pnpm test:db` remains as the database-only command.

### D5 — One workflow with two jobs

`.github/workflows/ci.yml` runs on `pull_request` targeting `main`, with `contents: read` permissions and cancellation of superseded runs for the same PR.

| Job ID | Checks |
|---|---|
| `quality` | `format:check`, `lint`, `typecheck`, `test`, `build`, `db:check` |
| `database-integration` | `test:integration` against a PostgreSQL 18 service container with throwaway credentials and a `pg_isready` health check |

- Node.js comes from `.nvmrc` and pnpm from `packageManager`; actions are pinned to exact release tags and the pnpm store cache is keyed by the lockfile, so a cache miss only slows installation.
- The service mirrors the local `postgres-test` service (`agendoxa_test` user, password and database on port 5433), so `DATABASE_URL_TEST` is identical locally and in CI. The database suite applies the versioned migrations inside a uniquely named child database; the API suite only connects. No repository secrets are required.
- PRs to `develop` and `staging` do not trigger CI. Contributors run focused local checks there ([CONTRIBUTING](../../CONTRIBUTING.md)); extending triggers needs a separate decision.
- E2E (`test:e2e`), browser suites, coverage thresholds and deployments are excluded.

## Consequences

- Green CI proves formatting, lint, types, unit tests, builds, migration metadata and current persistence integration tests. It does not imply that RLS, authorization, booking rules, product workflows or deployment exist.
- `quality` and `database-integration` are the status-check names that the owner can require on `main` after observing a real run.
- A future ESLint requirement for API/packages, or new test suites, can be added per workspace without changing the workflow shape.
