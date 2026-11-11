# REP-03 — Hexagonal reference module (`catalog` public services)

## Objective

Deliver one minimal, real feature that crosses Next.js → HTTP → NestJS controller → use case → persistence port → Drizzle adapter → PostgreSQL, and document it as the team's reference for building modules ([REP-03 #16](https://github.com/nanonoir/Agendoxa/issues/16)).

Complete when the endpoint serves real seed data to the web, the use case is tested without HTTP or Drizzle, a PostgreSQL integration test covers tenant scoping, the application layer imports no framework or infrastructure code, and the structure is documented.

## Context

- Branch `feat/REP-03-hexagonal-reference-module`, created from `docs/CON-02-api-contracts` because the CON-02 contracts are not merged yet.
- Sources: [modules (CON-01)](../../design-docs/modules.md), [API contracts (CON-02)](../../design-docs/api-contracts.md) and its [OpenAPI](../../design-docs/api-contracts.openapi.yaml), [tenancy (DOM-02)](../../design-docs/tenancy.md), [REP-02](../../design-docs/rep-02-core-persistence.md). All are proposals in review.
- The Issue cites `docs/architecture/*`; those documents live in `docs/design-docs/`.

## Scope

**Included:** `GET /api/v1/public/businesses/{slug}/services` (`listPublicServices`); shared Zod schemas for it and for problem details; a minimal `tenants` module with the public slug lookup; HTTP platform setup; a web page that lists the services; unit, HTTP-contract and PostgreSQL integration tests; the [backend module reference](../../references/backend-module-reference.md).

**Excluded:** authentication and `identity`, CRM endpoints, `GET /public/businesses/{slug}`, booking, payments, messaging, agent, notifications, schema or migration changes, design-document edits.

## Execution plan

1. Shared contract schemas (`common`, `catalog`, `problem`).
2. HTTP platform: `/api/v1` prefix, problem-details filter, request validation.
3. `tenants` public slug lookup.
4. `catalog` use case and persistence port.
5. Drizzle adapter for `services`.
6. Controller and Nest composition.
7. Tests: use case, HTTP contract, PostgreSQL integration.
8. Web view.
9. Documentation.

## Progress

- [x] Steps 1–9.
- [x] `.gitignore` rule `out/` (Next.js export) also ignored `adapters/out/`; scoped to `/out/` and `/apps/*/out/`.
- [x] Problem responses inherited the endpoint's `Cache-Control: public` because Nest applies `@Header` before the handler; the filter now sends `no-store`.
- [ ] Team review of the module conventions and of the pending CON-02 corrections below.

## Decisions

| Decision | Rationale |
|---|---|
| Public services as the first use case | Real landing need, read-only, crosses every layer with a tenant filter, and needs no authentication that does not exist yet |
| Use case takes `{ tenantId }`, not `slug` | Entry points resolve the tenant (TEN-DM-07, modules §6.5); the CRM and agent tools can reuse it |
| Minimal `tenants` module for the slug lookup | `Tenant` is owned by `tenants` (MOD-DM-02); `catalog` may not read its table. Agreed with the requester |
| No `catalog/domain/` | The query has no business invariant; see the reference guide §4 |
| Invalid slug returns `400 validation` | API-DM-09 general rule; the OpenAPI omits it. Agreed with the requester |
| Relational query API in adapters | `apps/api` needs no direct `drizzle-orm` dependency |
| `parseRequest` uses a structural schema type | `apps/api` needs no direct `zod` dependency |

**Pending for CON-02 (not edited here):** the OpenAPI of `listPublicServices` lacks the `400` response; `PublicService` (and `PublicBusinessProfile`) carry no currency, so the landing cannot show a symbol.

## Validation

Run on 2026-11-10 with Docker Desktop, PostgreSQL 18 (development and test services):

| Check | Result |
|---|---|
| `pnpm build` | 4/4 tasks successful; web route `ƒ /businesses/[slug]` |
| `pnpm lint` | 5/5 tasks; API and database 0 warnings, 0 errors |
| `pnpm typecheck` | 6/6 tasks |
| `pnpm test` | API unit 3 files, 6 tests passed |
| `pnpm --filter @agendoxa/api test:e2e` | 2 files, 5 tests passed |
| `pnpm --filter @agendoxa/api test:integration` | 2 files, 4 tests passed; no child database left |
| `pnpm test:db` | 1 file, 90 tests passed |
| `pnpm db:check` | No metadata issues |
| Tenant-filter mutation | Removing the `tenant_id` condition made 2 integration tests fail; restored |
| Boundary grep over `modules/*/application` and `modules/*/contracts` | No Nest, Drizzle, database, Express or Zod imports |
| Full flow | Seeded database, built API (`node dist/src/main.js`) and web (`next start`). `curl` returned the seeded services of `demo-barber` and `demo-club`, a `404` problem for an unknown slug and a `400` for `Bad_Slug`. `/businesses/demo-barber` rendered "Corte · 30 min · 7.500,00". Editing the row in PostgreSQL (description, price, then `is_active = false`) changed the page on reload; the seed values were restored |

Not checked: browser rendering beyond server HTML; `pnpm dev` watch mode (production builds were used instead).

## Final implementation outcome

Delivered on the branch, not pushed. Kept active until the team reviews the conventions and the pending CON-02 corrections.
