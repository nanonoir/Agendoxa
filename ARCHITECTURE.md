# Current architecture

Agendoxa is a workspace foundation with a first core-persistence increment, not an implemented booking system. This document describes observable code; the [design docs index](docs/design-docs/index.md) catalogs the target direction and persistence boundaries.

## Runtime boundaries

The web and API are separate applications. Both depend on `@agendoxa/shared`; only the API depends on the server-only `@agendoxa/database`.

```text
apps/web  ---> packages/shared <--- apps/api

apps/api  ---> packages/database ---> PostgreSQL
```

- **Web:** `apps/web/src/app/layout.tsx` defines the root layout, fonts, and starter metadata. `page.tsx` renders a Next.js starter page and parses a local sample with the shared health schema. It does **not** fetch the API. `globals.css` supplies Tailwind and global theme styles. There are no CRM features, authentication routes, or business landing implementation yet.
- **API:** `main.ts` loads the repository-root `.env` when present and enables shutdown hooks. `AppModule` imports `DatabaseModule`, which supplies one lazy connection per application and closes its pool on shutdown. There are no business modules. `GET /health` still returns `{ "status": "ok" }` without querying PostgreSQL; it is a liveness check.
- **Shared contracts:** `packages/shared/src/index.ts` exports `healthResponseSchema` and its inferred `HealthResponse` type. Consumers resolve the package's compiled `dist/index.js` and declarations, not another app's source.
- **Persistence:** `packages/database` exports the Drizzle/node-postgres connection and 17-entity core schema. Versioned migrations enforce same-tenant references, scope uniqueness, monetary/range checks, active-occupancy GiST exclusion and history safeguards. Migration/seed scripts are explicit. [The increment design](docs/design-docs/rep-02-core-persistence.md) lists deferred fields, partial T-01/T-05 coverage and the RLS evaluation. Repositories, authorization, policy resolution and full lifecycle use cases are not implemented.
- **Local PostgreSQL:** Compose provides a persistent development service and a separate tmpfs integration profile, with loopback ports. Database integration tests create unique child databases, not development tables.

There are no implemented booking use cases, tenant authorization, messaging/AI integrations, payment processing or background jobs. Database integrity is not authorization or RLS; constraints do not filter reads. The starter page's external links are not product integrations; its Geist fonts are bundled from the `geist` package, so the web build does not download fonts.

## Build and verification boundaries

pnpm discovers `apps/*` and `packages/*`. Turbo tasks depend on dependency builds through `^build`. Shared and database emit JavaScript/declarations through TypeScript, API builds through Nest, and web through Next.js. Database also supplies migration, seed and integration commands.

API uses ESM with NodeNext resolution and `.js` relative imports; web uses bundler resolution with `@/*` mapped to `src/*`. Workspace TypeScript strictness comes from `tsconfig.base.json`, with local overrides. No cross-app runtime imports are present.

API unit tests check health and provider disposal without PostgreSQL. Supertest E2E overrides the database provider and checks the unchanged HTTP response. Dedicated database/API integration configurations test real PostgreSQL constraints, migrations, seed, concurrency and Nest connection/shutdown. No browser tests exist. `.github/workflows/ci.yml` runs the root checks (`quality`) and both PostgreSQL suites against an ephemeral PostgreSQL 18 service (`database-integration`) on pull requests to `main`; see the [DOC-02 design](docs/design-docs/doc-02-quality-ci.md). See [AGENTS.md](AGENTS.md) for commands.

## Current implementation versus target direction

[The preserved architecture proposal](docs/design-docs/target-architecture.md) describes the modular monolith, domain/application/adapter boundaries, feature-first web and shared booking use cases. Durable jobs, messaging/AI and production deployment remain target direction under review. The bounded persistence increment is documented separately and does not implement the complete architecture.

Keep portable contracts separate from server-only code; do not interpret the proposal's illustrative tree as a requirement to create empty packages or layers. Read the [product catalog](docs/product-specs/index.md) for expected behavior and deferred decisions before implementing business features.
