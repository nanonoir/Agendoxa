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
- [x] Verify clean-clone initialization and documentation paths/encoding.
- [x] Run focused database/API checks and affected builds.
- [x] Review the diff and present the partial increment for team review with Refs #15.

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
- Opened [PR #29](https://github.com/nanonoir/Agendoxa/pull/29) toward develop and requested review from nanonoir. #15 remains open and no merge was performed. Moving the Project item to In review failed because the current token lacks the project write scope; its actual status remains In progress. The [issue progress comment](https://github.com/nanonoir/Agendoxa/issues/15#issuecomment-6697335055) records this limitation and corrects the initial status claim. A collaborator with Project write access must apply the transition.

## Validation

Results on 2026-11-06, Windows, Node 24.15.0, pnpm 12.16.1 and PostgreSQL 18:

| Check | Result |
|---|---|
| Baseline shared build, API unit/health tests and API build | Passed before implementation |
| `pnpm --filter @agendoxa/database lint` / `typecheck` / `build` | Passed |
| `pnpm db:check` | Passed; migration metadata consistent |
| `pnpm db:generate --name verify-no-changes` | Passed; no schema changes or new migration |
| `pnpm test:db` | 57 passed against real PostgreSQL; includes empty-database migrations, repeat application/seed, 11 cross-tenant FK scenarios, scope checks, overlap/concurrency, private fragments/rollback and immutable history |
| `pnpm --filter @agendoxa/api lint` / `typecheck` | Passed |
| `pnpm --filter @agendoxa/api test` | 2 passed: existing health controller and provider lifecycle |
| `pnpm --filter @agendoxa/api test:e2e` | 1 passed; HTTP health with overridden database provider |
| `pnpm --filter @agendoxa/api test:integration` | 1 passed; actual PostgreSQL query and NestJS pool shutdown |
| `pnpm build` | All 4 workspace builds passed, including web |
| Clean clone of implementation commit ac090eb | Frozen-lockfile install passed; copied .env.example; migrated an empty development database twice and seeded twice; 17 tables, exactly demo-barber/demo-club, 3 applied migrations and no login credentials; all 4 builds passed without inherited dist/cache files |
| `pnpm db:up` / separate test Compose service | PostgreSQL 18 services healthy on loopback 5432/5433; development volume initialized empty |
| Documentation and diff | Strict UTF-8 decode passed for all 44 changed files, no detected mojibake, 44 local Markdown links resolve; git diff --cached --check passed |

In the clean clone, an auxiliary `pnpm exec turbo run build --filter=@agendoxa/api` invocation could not resolve the package-manager binary in the local Windows environment. The documented `pnpm build` command succeeded for all four packages. No unrelated toolchain change was introduced. An additional temporary compiled-API HTTP smoke process was blocked by automatic execution policy before launch, with no more specific reason supplied; it is not counted as validation. The separate health E2E and actual PostgreSQL/NestJS integration checks above did run successfully.

The test service is `agendoxa-postgres-test-1` on loopback 5433. Existing unrelated containers are not test targets. Tenant-authorized reads, full booking/payment workflows, deployment and production infrastructure were not validated because they are outside this increment.

## Final implementation outcome

The bounded persistence implementation and reproducibility checks are delivered on feat/REP-02-postgres-drizzle in [PR #29](https://github.com/nanonoir/Agendoxa/pull/29), using Refs #15. Local development PostgreSQL is migrated and seeded; the test service remains available for the next focused checks. The parent remains open: the team must review the schema cut, partial T-01/T-05 treatment and RLS deferral, then distribute the remaining persistence increments. REP-03 still depends on CON-01/CON-02. Keep this plan active until that review is resolved; do not report REP-02 as completed.

For the next session: read #29 reviews and #15 scope discussion before changing this branch. Address review observations and repeat only affected checks. Do not add deferred tables/workflows or merge without the required human approval. Once the scope is agreed, record which issue owns each remaining persistence increment so that the next assignee can continue from this schema.
