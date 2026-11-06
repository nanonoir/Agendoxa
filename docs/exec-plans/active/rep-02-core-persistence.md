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

### PR #29 review follow-up

- [x] Reproduce missing system-role activation, WhatsApp-author and attendee-phone constraints with failing PostgreSQL tests.
- [x] Add the three row checks through a new additive migration; preserve all previously published migrations.
- [x] Document transactional service/resource compatibility and last-active-Admin/role-lifecycle obligations for future application use cases, with acceptance checks.
- [x] Validate affected database/API consumers and prepare the review follow-up for the existing PR.

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

Initial-increment results before the review follow-up, on 2026-11-06, Windows, Node 24.15.0, pnpm 12.16.1 and PostgreSQL 18:

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

### Review follow-up validation

Added 15 integration cases covering rejected inserts/updates, valid inactive custom roles, valid WhatsApp attribution and optional/normalized attendee phones. The missing constraints reproduced in red before implementation; after adding the migration, all 72 persistence tests passed.

| Check | Result |
|---|---|
| Database lint / typecheck / build | Passed |
| `pnpm test:db` | 72 passed against real PostgreSQL, including the 15 new cases and migration from an empty database |
| `pnpm db:check` / `pnpm db:generate --name verify-review-no-changes` | Passed; no further schema changes or migration |
| API lint / typecheck / build | Passed with the rebuilt database package |
| API unit / health E2E / NestJS-PostgreSQL | 2 + 1 + 1 passed |
| Populated development database upgrade | Applied migration 0003 twice through the CLI, advancing from 3 to 4 migrations; retained 2 tenants, 4 roles and 0 bookings; all 3 new CHECKs validated |
| Independent read-only follow-up review | No blocking defect found; schema, SQL, snapshot chain and test coverage agree. Not human approval |

The published 0000–0002 SQL and snapshots remain unchanged. No dependency, build configuration or web change was made in this follow-up; checks target database and its API consumer. Service/resource compatibility, last-Admin protection, system-role identity preservation and full PRIVATE_REMAINDER state validation remain explicit application obligations rather than database guarantees.

## Final implementation outcome

The bounded persistence implementation and reproducibility checks are delivered on feat/REP-02-postgres-drizzle in [PR #29](https://github.com/nanonoir/Agendoxa/pull/29), using Refs #15. Local development PostgreSQL is migrated and seeded; the test service remains available for the next focused checks. The parent remains open: the team must review the schema cut, partial T-01/T-05 treatment and RLS deferral, then distribute the remaining persistence increments. REP-03 still depends on CON-01/CON-02. Keep this plan active until that review is resolved; do not report REP-02 as completed.

For the next session: read #29 reviews and #15 scope discussion before changing this branch. Address review observations and repeat only affected checks. Do not add deferred tables/workflows or merge without the required human approval. Once the scope is agreed, record which issue owns each remaining persistence increment so that the next assignee can continue from this schema.
