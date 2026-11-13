# Agent guide

Agendoxa is a modular booking and customer-service platform. This repository contains a starter web page, health API, shared contract and first PostgreSQL/Drizzle persistence increment. Product workflows are not implemented.

## Start here

Read [README.md](README.md) for installation and environment setup, then follow the relevant reference:

Read and follow [CONTRIBUTING.md](CONTRIBUTING.md) before making changes. It is the shared source for Issues/Projects, branches, commits, PRs, review, coordination, and the Definition of Done. Its proposal status and team approval apply equally to assistants and human contributors.

| Question | Source |
|---|---|
| How is the system structured today? | [ARCHITECTURE.md](ARCHITECTURE.md) |
| What behavior is specified, and with what status? | [Product specs index](docs/product-specs/index.md) |
| What technical direction is proposed? | [Design docs index](docs/design-docs/index.md) |
| How should implementation plans be maintained? | [ExecPlan conventions](docs/PLANS.md) |
| What unresolved technical debt is recorded? | [Debt tracker](docs/exec-plans/tech-debt-tracker.md) |

Existing product and target-architecture documents remain proposals/in review. The 2026-11-04 handoff is historical provenance; later product-owner agreements in canonical UC-03 supersede incompatible portions (progressive/broadcast invitations, partial-deposit protection, reusable consent choices and professional/business collection modes). Current rules/unresolved questions are in UC-03, with complementary sources under their indexes. Product-owner agreement is not collective approval or implementation; illustrative trees/conceptual labels are not physical schema.

## Operational stack and roots

Manifests, lockfile, and configuration are authoritative for dependencies and versions.

| Root | Current stack and role |
|---|---|
| Workspace | Node.js 24 (`.nvmrc`), pnpm **12.16.1**, Turborepo 2, strict TypeScript 6.0.3 |
| `apps/web` (`@agendoxa/web`) | Next.js **16.4.3** App Router, React **19.3.0**, Tailwind 4; routes in `src/app`, assets in `public`; no component library |
| `apps/api` (`@agendoxa/api`) | NestJS 12, ESM/NodeNext; Vitest 4 and Supertest; oxlint with type analysis; local Prettier configuration |
| `packages/shared` (`@agendoxa/shared`) | Portable Zod 4 contracts and inferred types; `src/index.ts` builds to `dist`; oxlint with type analysis |
| `packages/database` (`@agendoxa/database`) | Server-only Drizzle 0.45.4/node-postgres 8.23.1, 17-entity core schema, versioned SQL, migration/seed scripts and Vitest integration tests |

Compose provides PostgreSQL 18 for local development and a separate test profile. `.github/workflows/ci.yml` runs jobs `quality` and `database-integration` on pull requests to `main` only ([DOC-02 design](docs/design-docs/doc-02-quality-ci.md)). pg-boss, Evolution/Baileys, LangGraph, deployment and a `ui` package remain unimplemented. See [the bounded persistence design](docs/design-docs/rep-02-core-persistence.md); RLS, authorization and full reservation workflows are not delivered by the schema.

## Commands and environment

Run from the repository root:

| Command | Effect |
|---|---|
| `pnpm install` | Install workspace dependencies |
| `pnpm dev` | Build workspace dependencies and start web (3000) and API (3001 by default) |
| `pnpm build` | Build shared, database, API, and web through Turbo |
| `pnpm lint` | Web ESLint and API/database/shared type-aware oxlint; warnings fail |
| `pnpm format:check` / `pnpm format` | Read-only Prettier check of the repository / local rewrite |
| `pnpm typecheck` | Shared/database/API TypeScript checks; web also runs `next typegen` |
| `pnpm test` | API unit tests, not E2E |
| `pnpm test:integration` | Database and API PostgreSQL suites through Turbo; requires DATABASE_URL_TEST |
| `pnpm db:up` / `pnpm db:test:up` | Start local development/test PostgreSQL; requires root `.env` |
| `pnpm db:migrate` / `pnpm db:seed` | Apply versioned SQL / load development fixtures |
| `pnpm db:generate` / `pnpm db:check` | Generate schema migrations / check metadata consistency |
| `pnpm test:db` | Isolated PostgreSQL integration tests; requires DATABASE_URL_TEST |

Turbo tasks depend on `^build`. Direct `pnpm --filter` commands bypass that preparation: run `pnpm --filter @agendoxa/shared build` first when its output is missing or changed.

The API loads root `.env`, requires DATABASE_URL and listens on PORT or 3001. Its database pool is lazy; /health is liveness, not database readiness. Web variables belong in `apps/web/.env.local`. See [the environment example](.env.example). The database package must also be built before direct filtered API commands.

## Local conventions and boundaries

- Keep API relative imports suffixed with `.js` for NodeNext/ESM. Web's `@/*` alias resolves to `src/*`.
- Match the affected file: API/database use single quotes; web/shared use double quotes. Root Prettier applies each workspace's configuration; `.prettierignore` excludes Markdown, the lockfile, build outputs and Drizzle migrations. Git normalizes line endings to LF.
- Import portable contracts from `@agendoxa/shared`; do not import another app's internals. Shared is not a second booking engine and must not contain secrets. Web must not import NestJS internals or server-only database code.
- Read the relevant product references before business work: UC-01 specifies an informational landing without web booking, human transfer verification, and one tenant-authorized booking core. Do not infer public booking, Mercado Pago, or other deferred integrations.
- Keep technical identifiers in English and preserve the language of existing documents. Add modules, packages, and layers only when needed, not to reproduce proposed trees.

## Focused validation

Choose checks for the affected workspace; do not run full suites by default on feature/develop branches.

| Change | Commands |
|---|---|
| API | `pnpm --filter @agendoxa/api lint` and `pnpm --filter @agendoxa/api typecheck` |
| API unit behavior | `pnpm --filter @agendoxa/api test src/app.controller.spec.ts` (replace with relevant file) |
| Health HTTP contract | `pnpm --filter @agendoxa/api test:e2e test/app.e2e-spec.ts` |
| Web | `pnpm --filter @agendoxa/web lint` and `pnpm --filter @agendoxa/web typecheck` |
| Shared | `pnpm --filter @agendoxa/shared typecheck` and `pnpm --filter @agendoxa/shared build`; check affected consumers |
| Database | `pnpm --filter @agendoxa/database lint`, `typecheck` and `build`; `pnpm db:check` |
| Database integrity | `pnpm db:test:up` then `pnpm test:db`; creates/drops a uniquely named child database only |
| NestJS/PostgreSQL | `pnpm --filter @agendoxa/api test:integration` with DATABASE_URL_TEST |
| Formatting or tooling | `pnpm format:check`; for workflow changes also run the README full verification |
| Documentation only | Verify paths, links, and commands; `git diff --check` (also inspect untracked files, which ordinary diffs omit) |

For build/dependency changes, also run the relevant build, or `pnpm build` for monorepo-wide changes. API unit, E2E and PostgreSQL integration tests have separate configurations. E2E uses Supertest with an in-memory Nest app and overridden database provider. Web/shared have no test scripts. Database tests verify reference integrity and concurrency, not tenant authorization or complete use cases. SQL-only constraints/triggers are in custom migrations; do not replace them with drizzle-kit push.
