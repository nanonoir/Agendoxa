# REP-02 — Core persistence implementation

## Objective

Deliver a reviewable first increment of [REP-02 / #15](https://github.com/nanonoir/Agendoxa/issues/15): PostgreSQL/Drizzle infrastructure, the bounded core schema, NestJS connection lifecycle and reproducible integrity tests. Keep the parent issue open.

## Context and scope

- Base: develop at 7f27c38; task branch feat/REP-02-postgres-drizzle.
- Current database package was a placeholder; the API only exposed /health.
- References: [ERD](../../design-docs/erd.md), [tenancy](../../design-docs/tenancy.md), [invariants](../../product-specs/uc-03/invariants.md), [current architecture](../../../ARCHITECTURE.md).
- Exact included/deferred fields and T-01/T-05/RLS decisions: [first persistence increment](../../design-docs/rep-02-core-persistence.md). No changes to product approval status.

## Execution plan

- [x] Verify the existing shared/API tests and build before implementation.
- [x] Record the incremental scope in #15 and register the design in its catalog.
- [x] Configure the database package, Compose and distinct development/test databases.
- [x] Write a failing integration check for the absent 17-table schema.
- [x] Implement identity/customer/catalog/availability/booking schema and generated migration.
- [x] Add SQL-only exclusion/history safeguards and verify them against PostgreSQL.
- [x] Add repeatable migrate/seed commands and a two-tenant development seed.
- [x] Test and implement NestJS provider creation/shutdown while preserving /health.
- [ ] Verify clean-clone initialization and documentation paths/encoding.
- [x] Run focused database/API checks and affected builds.
- [ ] Review the diff and present the partial increment for team review with Refs #15.

## Decisions

Use the bounded implementation proposal linked above. In particular, the candidate set is 17 logical entities, with omitted cross-cut references listed explicitly; T-01/T-05 are addressed only for included mechanisms. No payment, messaging, queue, public booking or CRM use case is added.

## Progress

- Repository located; clean branch created from origin/develop after fetching.
- Issue #15 remains assigned to gonzaloogv. No open PR overlapped this work at start. The [scope notice](https://github.com/nanonoir/Agendoxa/issues/15#issuecomment-6696761599) records this partial delivery and the remaining decisions.
- Installed with pinned pnpm 12.16.1 and Node 24.15.0. Only esbuild was added to the workspace's existing allowed build-script list, as required by Drizzle Kit/tsx.
- Implemented 17 tables, generated schema SQL, SQL-only occupancy/history safeguards and a follow-up finite-money check. Future migrations must preserve custom SQL; existing migrations are immutable after publication.
- Development seed is insert-only/repeatable, requires NODE_ENV=development and creates no login credentials. Integration tests create and drop only their uniquely named child database on the separate test service.
- Incremental red/green checks exposed missing schema, occupancy/history/concurrency safeguards, connection lifecycle, seed behavior and PostgreSQL numeric NaN handling before the corresponding implementation.
- Independent read-only review identified an unhandled idle pool error. A failing regression reproduced it; the fix handles the event with a sanitized warning, and the full suite passes. The follow-up review found no remaining blocking defect within the documented scope; this does not replace human PR approval.

## Validation

Results on 2026-11-06, Windows, Node 24.15.0, pnpm 12.16.1 and PostgreSQL 18:

| Check | Result |
|---|---|
| Baseline shared build, API unit/health tests and API build | Passed before implementation |
| `pnpm --filter @agendoxa/database lint` / `typecheck` / `build` | Passed |
| `pnpm db:check` | Passed; migration metadata consistent |
| `pnpm test:db` | 57 passed against real PostgreSQL; includes empty-database migrations, repeat application/seed, 11 cross-tenant FK scenarios, scope checks, overlap/concurrency, private fragments/rollback and immutable history |
| `pnpm --filter @agendoxa/api lint` / `typecheck` | Passed |
| `pnpm --filter @agendoxa/api test` | 2 passed: existing health controller and provider lifecycle |
| `pnpm --filter @agendoxa/api test:e2e` | 1 passed; HTTP health with overridden database provider |
| `pnpm --filter @agendoxa/api test:integration` | 1 passed; actual PostgreSQL query and NestJS pool shutdown |
| `pnpm build` | All 4 workspace builds passed, including web |

The test service is `agendoxa-postgres-test-1` on loopback 5433. Existing unrelated containers are not test targets. Tenant-authorized reads, full booking/payment workflows, deployment and production infrastructure were not validated because they are outside this increment.

## Final implementation outcome

The bounded persistence implementation is ready for final reproducibility checks and a partial PR to develop with Refs #15. The parent remains open: the team must review the schema cut, partial T-01/T-05 treatment and RLS deferral, then distribute the remaining persistence increments. REP-03 still depends on CON-01/CON-02. Keep this plan active until that review is resolved; do not report REP-02 as completed.
