# Current architecture

Agendoxa is currently a workspace foundation, not an implemented booking system. This document describes observable code; the [design docs index](docs/design-docs/index.md) catalogs the separate target-architecture proposal.

## Runtime boundaries

The web and API are separate applications. Both depend on `@agendoxa/shared`; neither currently depends on `@agendoxa/database`.

```text
apps/web  ---> packages/shared <--- apps/api

packages/database (unconnected placeholder)
```

- **Web:** `apps/web/src/app/layout.tsx` defines the root layout, fonts, and starter metadata. `page.tsx` renders a Next.js starter page and parses a local sample with the shared health schema. It does **not** fetch the API. `globals.css` supplies Tailwind and global theme styles. There are no CRM features, authentication routes, or business landing implementation yet.
- **API:** `apps/api/src/main.ts` conditionally loads the repository-root `.env`, creates the Nest application, and listens on `PORT` or 3001. `AppModule` registers only `AppController`, with no imported business modules. `GET /health` parses and returns `{ "status": "ok" }` using the shared schema. It is not a database or integration readiness check.
- **Shared contracts:** `packages/shared/src/index.ts` exports `healthResponseSchema` and its inferred `HealthResponse` type. Consumers resolve the package's compiled `dist/index.js` and declarations, not another app's source.
- **Persistence:** `packages/database/src/index.ts` is a comment-only server-side placeholder. There is no database connection, ORM, schema, migration, repository, or durable state. The example `DATABASE_URL` is not consumed.

There are no implemented booking rules, tenant authorization, messaging/AI integrations, payment processing, or background jobs. The starter page's external documentation/deployment links and Google font usage are not product integrations.

## Build and verification boundaries

pnpm discovers `apps/*` and `packages/*`. Turbo orchestrates the root tasks; each task depends on dependency builds through `^build`. Shared emits JavaScript and declarations through TypeScript, API builds through Nest, and web builds through Next.js. Database has no task scripts.

API uses ESM with NodeNext resolution and `.js` relative imports; web uses bundler resolution with `@/*` mapped to `src/*`. Workspace TypeScript strictness comes from `tsconfig.base.json`, with local overrides. No cross-app runtime imports are present.

The API controller unit test checks the health value. Its separate Supertest E2E creates an in-memory Nest app and checks the HTTP status/body. No browser tests, persistence tests, or CI workflows exist. See [AGENTS.md](AGENTS.md) for operational commands.

## Current implementation versus target direction

[The preserved architecture proposal](docs/design-docs/target-architecture.md) describes a modular NestJS monolith, domain/application/adapter boundaries for rule-heavy modules, feature-first web organization, and shared booking use cases for CRM and WhatsApp. It also proposes PostgreSQL/Drizzle, durable jobs, messaging/AI, and deployment infrastructure. These are **target direction under review**, not existing layers or verified controls.

Keep portable contracts separate from server-only code; do not interpret the proposal's illustrative tree as a requirement to create empty packages or layers. Read the [product catalog](docs/product-specs/index.md) for expected behavior and deferred decisions before implementing business features.
