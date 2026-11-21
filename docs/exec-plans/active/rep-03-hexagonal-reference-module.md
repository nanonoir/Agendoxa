# REP-03 — Hexagonal reference module (`catalog` public services)

## Objective

Deliver one minimal, real feature that crosses Next.js → HTTP → NestJS controller → use case → persistence port → Drizzle adapter → PostgreSQL, and document it as the team's reference for building modules ([REP-03 #16](https://github.com/nanonoir/Agendoxa/issues/16)).

Complete when the endpoint serves real seed data to the web, the use case is tested without HTTP or Drizzle, a PostgreSQL integration test covers tenant scoping, the application layer imports no framework or infrastructure code, and the structure is documented.

## Context

- Branch `feat/REP-03-hexagonal-reference-module`, created from `docs/CON-02-api-contracts` and rebased onto `develop` on 2026-11-14, after CON-01, CON-02, CON-03 and DOC-02 were merged.
- Sources: [modules (CON-01)](../../design-docs/modules.md), [API contracts (CON-02)](../../design-docs/api-contracts.md) and its [OpenAPI](../../design-docs/api-contracts.openapi.yaml), [tenancy (DOM-02)](../../design-docs/tenancy.md), [REP-02](../../design-docs/rep-02-core-persistence.md). CON-01, CON-02 (0.4.0), CON-03 and REP-02 are merged into `develop`; their content is still a proposal in review, not collective approval.
- Under review in PR #37 (not in `develop` yet): the CON-02 corrections made during review (the `400` of `listPublicServices`, the `rate_limited` code, the `413`/`415` reasons) and the error-category references in the architecture and integration contracts.
- The Issue cites `docs/architecture/*`; those documents live in `docs/design-docs/`.

## Scope

**Included:** `GET /api/v1/public/businesses/{slug}/services` (`listPublicServices`); shared Zod schemas for it and for problem details; a minimal `tenants` module with the public slug lookup; HTTP platform setup; a web page that lists the services; unit, HTTP-contract and PostgreSQL integration tests; the [backend module reference](../../references/backend-module-reference.md).

**Excluded:** authentication and `identity`, CRM endpoints, `GET /public/businesses/{slug}`, booking, payments, messaging, agent, notifications, schema or migration changes, RLS, rate limiting, and design-document edits beyond the review corrections below.

**Narrow design-document corrections from the review:** CON-02 API-DM-09 and the OpenAPI (`400` of `listPublicServices`, `rate_limited`, `413`/`415` reasons); architecture §11 and the integration contracts now refer to API-DM-09 instead of repeating the categories. They change no functional scope.

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
  - [x] Second review round (2026-11-17, Nahuel's HTTP mapping): `429` is the `rate_limited` code of its own; `413` is `validation` / `payload_too_large` (`file_too_large` stays for identified files); `Retry-After` is no longer reassigned; CON-02, OpenAPI, shared schema and tests are in sync.
  - [x] OpenAPI `listPublicServices` declares the `400` response (`components/responses/ValidationError`).
  - [x] `problemSchema` mirrors the full CON-02 `Problem` (strict; `lateChange`, `currentRevision`, `allocationLimit`), tested from `apps/api` because `packages/shared` has no test runner.
  - [x] `.prettierignore` excludes the OpenAPI contract, now stated in AGENTS.md and DOC-02.
- [x] Final cleanup (2026-11-20): `publicServiceSchema` and `publicServiceListSchema` are strict, like `additionalProperties: false` in the OpenAPI; architecture §11 and `integration-contracts.md` refer to API-DM-09 (`RefusalCode` is documented as the use-case subset without `rate_limited`); PostgreSQL integration rerun.
- [ ] Team review and approval of the module conventions, the CON-02 corrections and the pending point below. No reviewer approval is recorded yet.

## Decisions

| Decision | Rationale |
|---|---|
| Public services as the first use case | Real landing need, read-only, crosses every layer with a tenant filter, and needs no authentication that does not exist yet |
| Use case takes `{ tenantId }`, not `slug` | Entry points resolve the tenant (TEN-DM-07, modules §6.5); the CRM and agent tools can reuse it |
| Minimal `tenants` module for the slug lookup | `Tenant` is owned by `tenants` (MOD-DM-02); `catalog` may not read its table. Agreed with the requester |
| No `catalog/domain/` | The query has no business invariant; see the reference guide §4 |
| Invalid slug returns `400 validation` | API-DM-09 general rule; the OpenAPI now declares it (review round, 2026-11-16) |
| HTTP status of framework `4xx` is kept | Agreed table: `400` `validation`; `413` `validation` / `payload_too_large` (`file_too_large` only for an uploaded file the application identifies, which no endpoint does yet); `415` `validation` / `unsupported_media_type`; `429` `rate_limited` (new code, no reason, optional `Retry-After` left untouched); `500` `internal`. Any other framework `4xx` is `validation` without a reason. `validation` therefore covers `400`, `413` and `415` ([API-DM-09](../../design-docs/api-contracts.md#api-dm-09-one-problem-format-with-stable-codes-and-reasons)) |
| `problemSchema` and the catalog schemas are strict | Mirror `additionalProperties: false` of the OpenAPI `Problem`, `PublicService` and its list; an undeclared field fails instead of being stripped |
| Relational query API in adapters | `apps/api` needs no direct `drizzle-orm` dependency |
| `parseRequest` uses a structural schema type | `apps/api` needs no direct `zod` dependency |

**Resolved in the review rounds:** the `400` response of `listPublicServices`, the complete `Problem` schema in `@agendoxa/shared`, the Prettier handling of the OpenAPI file, and the `413`/`415`/`429` mapping, implemented and part of API-DM-09 and the OpenAPI `Problem.code`. These are the accepted technical direction of the review; team approval is still pending.

**Pending for CON-02 (outside REP-03):** `PublicService` (and `PublicBusinessProfile`) carry no currency, so the landing cannot show a symbol.

**Not delivered on purpose:** rate limiting. `429` is defined in the contract and the filter, but no operation declares it and nothing produces it yet.

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

Rerun on 2026-11-17 for the second review round: `pnpm --filter @agendoxa/api lint` and `typecheck`, `pnpm --filter @agendoxa/shared typecheck` and `build`, `pnpm build` (4/4), `pnpm format:check` and `git diff --check` passed; `pnpm test` (API unit, 5 files, 50 tests) and `pnpm --filter @agendoxa/api test:e2e` (3 files, 9 tests, including `429` with and without `Retry-After` and a hidden `500`) passed. `pnpm --filter @agendoxa/api test:integration` was **not run** in this execution: Docker Desktop was off (`ECONNREFUSED 127.0.0.1:5433`). The author later reported 4 passing integration tests in the PR discussion; that report is not a recorded execution here and is superseded by the 2026-11-20 run. Redocly was not run.

Rerun on 2026-11-20 for the final cleanup (Windows 11, Node.js 24, Docker Desktop, PostgreSQL 18 test service on `127.0.0.1:5433`, `DATABASE_URL_TEST` ending in `_test`):

| Check | Result |
|---|---|
| `pnpm lint` | 6/6 tasks; 0 warnings, 0 errors |
| `pnpm typecheck` | 6/6 tasks |
| `pnpm test` | API unit, 6 files, 54 tests passed (includes the new catalog contract spec, 4 tests) |
| `pnpm --filter @agendoxa/api test:e2e` | 3 files, 9 tests passed; the strict list schema still parses the endpoint response |
| `pnpm --filter @agendoxa/api test:integration` | 2 files, 4 tests passed in a uniquely named child database, dropped afterwards. They cover slug-scoped reads, isolation between two businesses with alternating requests on one reused connection, inactive services excluded and unknown slug `404 not_found` |
| `pnpm format:check`, `pnpm build` (4/4), `git diff --check` | Passed |
| `redocly lint` of the OpenAPI | Valid; 1 warning (`info-license`, no license declared), unrelated to REP-03 |

`pnpm test:db` was not rerun: no database package code changed since 2026-11-14.

Not checked: browser rendering beyond server HTML; `pnpm dev` watch mode (production builds were used instead).

## Final implementation outcome

Implemented and published in [PR #37](https://github.com/nanonoir/Agendoxa/pull/37) to `develop`, after two review rounds and the final cleanup. Every scoped step is done and validated locally (2026-11-20); the GitHub workflow runs only for pull requests to `main`, so no CI check applies to this PR. Kept active until the team approves the PR; the currency of `PublicService` stays a separate CON-02 item.
