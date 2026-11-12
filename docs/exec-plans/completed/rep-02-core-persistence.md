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

### Maintainer review on e6f32cb

- [x] Reproduce loss of the last Admin and active claims on released bookings with real PostgreSQL tests.
- [x] Add deferred guards in migration 0004 and verify races with two connections.
- [x] Define the first read isolation tests for [REP-03 #16](https://github.com/nanonoir/Agendoxa/issues/16) and link [personnel #30](https://github.com/nanonoir/Agendoxa/issues/30) and [booking/catalog #31](https://github.com/nanonoir/Agendoxa/issues/31).
- [x] Verify the migration against existing records and prepare the validated follow-up for PR #29.

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

This section records the scope of e6f32cb. The maintainer review adds the transactional safeguards and follow-up links described above.

### Maintainer review validation on 2026-11-07

Fifteen regressions reproduced before migration 0004. The read-only review identified a sequence that removed the last ADMIN membership and changed the role ID before the deferred check. A sixteenth regression reproduced that sequence, and the migration now preserves the ADMIN role ID along with tenant and system key. The existing overlap test now starts the competing insert against an already inserted claim in an open transaction, which makes the exclusion violation reproducible. Concurrent acquisition of test clients also releases a client if acquiring the second one fails.

| Check | Result |
|---|---|
| `pnpm test:db` | 90 passed against PostgreSQL. Includes 18 new cases and races under READ COMMITTED and REPEATABLE READ |
| Database and API lint, typecheck and build | Passed |
| `pnpm db:check` and `pnpm db:generate --name verify-transactional-guards` | Passed with no further migration generated |
| API unit, health E2E and PostgreSQL integration | 2 + 1 + 1 passed. The unit and integration runs timed out alongside concurrent checks and passed when run separately with the existing timeout |
| Legacy database upgrade | On an isolated database with 0000–0003, a cancelled booking with an active claim caused 0004 to roll back. After closing that claim, applying the chain twice retained the membership, booking and closed history with five migrations recorded |
| Independent review | The Admin role ID issue and test client cleanup were addressed. The future onboarding must create the dedicated ADMIN role and first membership atomically |

## Final implementation outcome

### Implemented

The bounded 17-entity persistence increment, PostgreSQL/Drizzle infrastructure, NestJS connection lifecycle and reproducibility checks were delivered in [PR #29](https://github.com/nanonoir/Agendoxa/pull/29), merged into `develop` on 2026-11-08 at 00:06:01 UTC. The PR used `Refs #15`; [#15](https://github.com/nanonoir/Agendoxa/issues/15) was manually closed at 00:06:10 UTC, without a closing comment recording a scope agreement. These statuses were verified on 2026-11-12.

### Deviations from Design

The original plan expected #15 to remain open and this plan to stay active until scope review. The issue was instead closed manually, and the owner approved closing this plan under the current lifecycle rule. Neither event establishes team ratification of the ERD or deferred decisions.

### Validation

The maintainer review validation above records 90 PostgreSQL tests passing, database and API lint/typecheck/build, migration checks, API unit/E2E/integration tests and an isolated legacy upgrade. Independent review identified issues that were addressed; its results do not replace human approval or ratify the broader design.

### Follow-up

Open follow-ups are [#16 REP-03](https://github.com/nanonoir/Agendoxa/issues/16), dependent on CON-01/CON-02; [#30 IAM](https://github.com/nanonoir/Agendoxa/issues/30), for first Admin and memberships; and [#31 RES](https://github.com/nanonoir/Agendoxa/issues/31), for atomic booking writes and catalog compatibility. Deferred tables are listed in the [design's explicit schema boundaries](../../design-docs/rep-02-core-persistence.md#explicit-schema-boundaries) and are introduced with the feature work that needs them. This plan's closure does not complete those dependencies or deferred decisions.
