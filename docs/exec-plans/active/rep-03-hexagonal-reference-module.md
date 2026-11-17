# REP-03 — Hexagonal reference module (`catalog` public services)

## Objective

Deliver one minimal, real feature that crosses Next.js → HTTP → NestJS controller → use case → persistence port → Drizzle adapter → PostgreSQL, and document it as the team's reference for building modules ([REP-03 #16](https://github.com/nanonoir/Agendoxa/issues/16)).

Complete when the endpoint serves real seed data to the web, the use case is tested without HTTP or Drizzle, a PostgreSQL integration test covers tenant scoping, the application layer imports no framework or infrastructure code, and the structure is documented.

## Context

- Branch `feat/REP-03-hexagonal-reference-module`, created from `docs/CON-02-api-contracts` and rebased onto `develop` on 2026-11-14, after CON-01, CON-02, CON-03 and DOC-02 were merged.
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
- [x] Review round on PR #37 (2026-11-16, additional commits, no change of functional scope):
  - [x] The problem filter keeps the HTTP status of framework client errors (`413`, `415`, `429`, `405`, `406`, any other `4xx`) as `application/problem+json`; unlisted `5xx` and unexpected errors stay a generic `500 internal`.
  - [x] OpenAPI `listPublicServices` declares the `400` response (`components/responses/ValidationError`).
  - [x] `problemSchema` mirrors the full CON-02 `Problem` (strict; `lateChange`, `currentRevision`, `allocationLimit`), tested from `apps/api` because `packages/shared` has no test runner.
  - [x] `.prettierignore` excludes the OpenAPI contract, now stated in AGENTS.md and DOC-02.
- [ ] Team review of the module conventions and of the pending CON-02 points below.

## Decisions

| Decision | Rationale |
|---|---|
| Public services as the first use case | Real landing need, read-only, crosses every layer with a tenant filter, and needs no authentication that does not exist yet |
| Use case takes `{ tenantId }`, not `slug` | Entry points resolve the tenant (TEN-DM-07, modules §6.5); the CRM and agent tools can reuse it |
| Minimal `tenants` module for the slug lookup | `Tenant` is owned by `tenants` (MOD-DM-02); `catalog` may not read its table. Agreed with the requester |
| No `catalog/domain/` | The query has no business invariant; see the reference guide §4 |
| Invalid slug returns `400 validation` | API-DM-09 general rule; the OpenAPI now declares it (review round, 2026-11-16) |
| Framework `4xx` keep their HTTP status | `413` → `validation`/`file_too_large`, `415` → `validation`/`unsupported_media_type`, `429` → `conflict`/`rate_limited` with `Retry-After`, other `4xx` → `validation` without a reason. Only the eight CON-02 codes are used; the status does not follow the usual one of the code |
| `problemSchema` is strict | Mirrors `additionalProperties: false` of the OpenAPI `Problem` |
| Relational query API in adapters | `apps/api` needs no direct `drizzle-orm` dependency |
| `parseRequest` uses a structural schema type | `apps/api` needs no direct `zod` dependency |

**Resolved in the review round:** the `400` response of `listPublicServices`, the complete `Problem` schema in `@agendoxa/shared`, and the Prettier handling of the OpenAPI file.

**Pending for CON-02 (not edited here):** `PublicService` (and `PublicBusinessProfile`) carry no currency, so the landing cannot show a symbol; CON-02 defines no category for `413` and `429` (the mapping above is a stopgap, and `rate_limited` is not among the documented reasons).

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

Rerun on 2026-11-14 after the rebase onto `develop`: `pnpm lint` (6/6), `pnpm typecheck` (6/6), `pnpm test` (6 tests), `pnpm build` (4/4), `pnpm db:check`, `pnpm test:integration` (database 90 tests, API 4 tests) and API E2E (5 tests) passed. `pnpm format:check` passed for every REP-03 file; it then reported `docs/design-docs/api-contracts.openapi.yaml`, since excluded in `.prettierignore`. The endpoint was compared with the merged CON-02 0.4.0 contract: path, `PublicService`, problem format, `404` and cache header match; the two pending corrections above remain.

Rerun on 2026-11-16 for the review round (PostgreSQL 18 test service running): `pnpm --filter @agendoxa/api lint` and `typecheck`, `pnpm --filter @agendoxa/shared typecheck` and `build`, `pnpm build` (4/4), `pnpm format:check` and `git diff --check` passed; `pnpm test` (API unit, 5 files, 45 tests), `pnpm --filter @agendoxa/api test:e2e` (2 files, 6 tests, including a framework `413` problem) and `pnpm --filter @agendoxa/api test:integration` (2 files, 4 tests) passed. The slug `400` (`errors[].path` `/slug`) matches the new OpenAPI response. Redocly was not run here; the contract lint is left to a maintainer: `pnpm dlx --package=@redocly/cli redocly lint docs/design-docs/api-contracts.openapi.yaml`.

Not checked: browser rendering beyond server HTML; `pnpm dev` watch mode (production builds were used instead).

## Final implementation outcome

Delivered on the branch, not pushed. Kept active until the team reviews the conventions and the pending CON-02 corrections.
