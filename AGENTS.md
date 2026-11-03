# Agent guide

Agendoxa is a modular booking and customer-service platform. This repository currently contains the foundation only: a starter web page, a health API, and a shared contract. Product workflows are not implemented.

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

Existing product and target-architecture documents are proposals/in review, with explicitly confirmed UC-01 decisions and deferred questions inside them. Do not treat a proposal, illustrative directory tree, or conceptual state label as approved or implemented behavior. The indexes identify the authoritative paths for these documents.

## Operational stack and roots

Manifests, lockfile, and configuration are authoritative for dependencies and versions.

| Root | Current stack and role |
|---|---|
| Workspace | Node.js 24 (`.nvmrc`), pnpm **12.16.1**, Turborepo 2, strict TypeScript 6.0.3 |
| `apps/web` (`@agendoxa/web`) | Next.js **16.4.3** App Router, React **19.3.0**, Tailwind 4; routes in `src/app`, assets in `public`; no component library |
| `apps/api` (`@agendoxa/api`) | NestJS 12, ESM/NodeNext; Vitest 4 and Supertest; oxlint with type analysis; local Prettier configuration |
| `packages/shared` (`@agendoxa/shared`) | Portable Zod 4 contracts and inferred types; `src/index.ts` builds to `dist` |
| `packages/database` (`@agendoxa/database`) | Server-only placeholder; no persistence dependencies, schema, client, migrations, or scripts yet |

PostgreSQL/Drizzle, pg-boss, Evolution/Baileys, LangGraph, Compose, CI workflows, and a `ui` package appear in proposals but are not present in the implementation.

## Commands and environment

Run from the repository root:

| Command | Effect |
|---|---|
| `pnpm install` | Install workspace dependencies |
| `pnpm dev` | Build workspace dependencies and start web (3000) and API (3001 by default) |
| `pnpm build` | Build shared, API, and web through Turbo |
| `pnpm lint` | Web ESLint and API type-aware oxlint |
| `pnpm typecheck` | Shared/API TypeScript checks; web also runs `next typegen` |
| `pnpm test` | API unit tests, not E2E |

Turbo tasks depend on `^build`. Direct `pnpm --filter` commands bypass that preparation: run `pnpm --filter @agendoxa/shared build` first when its output is missing or changed.

The API loads the root `.env` when present and listens on `PORT` or 3001. Web variables belong in `apps/web/.env.local`, not the root `.env`. See [the environment example](.env.example); `DATABASE_URL` is not connected to any runtime persistence yet.

## Local conventions and boundaries

- Keep API relative imports suffixed with `.js` for NodeNext/ESM. Web's `@/*` alias resolves to `src/*`.
- Match the affected file: API uses single quotes; web/shared use double quotes. There is no root formatter. API's `format` script rewrites both `src` and `test`.
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
| Documentation only | Verify paths, links, and commands; `git diff --check` (also inspect untracked files, which ordinary diffs omit) |

For build/dependency changes, also run the relevant build, or `pnpm build` for monorepo-wide changes. API unit tests (`*.spec.ts`) and E2E (`*.e2e-spec.ts`) use separate Vitest configurations. Current E2E uses Supertest with an in-memory Nest app, not a browser or external server. Web/shared/database have no test scripts. Future authorization, isolation, and concurrency checks described in the proposal do not exist yet.
