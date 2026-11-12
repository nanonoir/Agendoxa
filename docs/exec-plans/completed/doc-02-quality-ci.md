# DOC-02 — Quality tooling and CI foundation

## Objective

Deliver repeatable root checks (`format:check`, `lint`, `typecheck`, `test`, `build`, PostgreSQL integration) and a GitHub Actions workflow for pull requests to `main`, as one focused PR from `chore/DOC-02-quality-ci` into `develop` for [Issue #19](https://github.com/nanonoir/Agendoxa/issues/19).

Complete when every root command passes locally, each check fails on an intentional violation (restored before committing), PostgreSQL 18 integration tests pass in the isolated test service, docs explain reproduction, and the PR is open with evidence.

## Context

- Design decisions: [DOC-02 quality and CI design](../../design-docs/doc-02-quality-ci.md).
- Branch created from `develop` `af1da44` on 2026-11-12. The local PRD used as input is not versioned by owner decision; requirements and decisions are captured here and in the design.
- Related canonical docs: [README](../../../README.md), [CONTRIBUTING](../../../CONTRIBUTING.md), [AGENTS](../../../AGENTS.md), [REP-02 design](../../design-docs/rep-02-core-persistence.md).

## Scope

**Included:** root Prettier check/writer and ignore rules, `.gitattributes`, shared oxlint, root/Turbo `test:integration`, `.github/workflows/ci.yml`, minimal formatting fixes, README/CONTRIBUTING/AGENTS updates.

**Excluded:** enabling GitHub Actions in repository settings, the test PR to `main`, branch protection, merges, deployments, E2E/browser tests, coverage gates, product code and dependency upgrades.

## Execution plan

1. Audit configuration and baseline commands.
2. Record design decisions and this plan.
3. Add Prettier, `.gitattributes`, shared lint and Turbo/root scripts; fix the minimal formatting drift.
4. Run PostgreSQL 18 integration locally through the isolated test service.
5. Add the CI workflow and validate its structure.
6. Update canonical docs.
7. Run full local verification and intentional-failure checks; independent review.
8. Commit, push and open the PR to `develop`; close this plan.

## Progress

- [x] 1. Audit — baseline `install --frozen-lockfile`, `lint`, `typecheck`, `test`, `build` passed on `af1da44`.
- [x] 2. Design and plan.
- [x] 3. Local tooling — root Prettier, `.gitattributes`, shared oxlint, lint warnings fail, Turbo `test:integration`. Real formatting drift: two missing final newlines.
- [x] 4. PostgreSQL integration — database and API suites pass through `pnpm test:integration`.
- [x] 5. Workflow — `.github/workflows/ci.yml` with `quality` and `database-integration`.
- [x] 6. Docs — README, CONTRIBUTING, AGENTS, ARCHITECTURE and design index.
- [x] 7. Verification and review — the first review's font-download blocker was resolved with D6; the second confirmed the fix and identified plan closure as its only blocker.
- [x] 8. Plan closure — PR #35 is open to `develop`; the implementation and lifecycle rule are ready for team review, with delivery updates pending.

## Decisions

- Lint, formatting, line-ending, Turbo, CI and font decisions: [design D1–D6](../../design-docs/doc-02-quality-ci.md#decisions).
- Owner decisions (2026-11-12): ESLint for web and oxlint for the TypeScript packages; the PRD file stays out of the repository; the agent prepares everything, the owner enables Actions, and the test PR to `main` is coordinated afterwards.
- Full root suites run locally because the root commands are this task's deliverable; the owner explicitly requested local verification including PostgreSQL.
- Audit finding: oxlint and ESLint exit 0 on warning-level violations, so the lint scripts now deny warnings ([design D1](../../design-docs/doc-02-quality-ci.md#d1--lint-policy-keep-eslint-for-web-and-oxlint-for-the-typescript-packages)).
- Review finding resolved (owner decision 2026-11-12): `pnpm build` downloaded the Geist fonts from Google Fonts (`next/font/google`), so a Google outage could fail `quality`. The web now uses the official `geist` package with the same fonts and CSS variables ([design D6](../../design-docs/doc-02-quality-ci.md#d6--web-builds-do-not-download-fonts)).
- Plan closure follows the new [ExecPlan lifecycle rule](../../PLANS.md#location-and-lifecycle); owner-led and post-merge steps are tracked in Issue #19.

## Validation

Local environment: Windows 11, Node 24, pnpm 12.16.1, Docker Desktop 29.6.1, `postgres:18-alpine` test service on `127.0.0.1:5433`, root `.env` copied from `.env.example`.

| Check | Result |
|---|---|
| Baseline on `af1da44`: `install --frozen-lockfile`, `lint`, `typecheck`, `test`, `build` | Pass |
| Final: `format:check`, `lint`, `typecheck`, `test`, `build`, `db:check` | Pass (exit 0) |
| Final: `pnpm test:integration` | Pass: API 1/1, database 90/90; child databases removed |
| `pnpm test:db` | Pass: 90/90 |
| `test:integration` without `.env`, only `DATABASE_URL_TEST` set (CI conditions) | Pass |
| Clean artifacts: removed `dist`/`.next`, `turbo run build --force`, then `lint typecheck test --force` | Pass |
| Intentional failures (probe files removed afterwards): `debugger` in shared, database and API; conditional hook in web; `const  x` format drift; string assigned to `number`; failing unit spec; failing integration spec | Each command exits non-zero (lint 1, format:check 1, typecheck 2, test 1, test:integration 1) |
| `actionlint` (`rhysd/actionlint` Docker image) | 0 errors |
| `git diff --cached --check` | Pass |
| Lockfile | Tooling: only importer entries added; resolved versions unchanged (prettier 3.9.10, oxlint 1.90.0, oxlint-tsgolint 7.0.2005). Fonts: one new package, `geist@1.9.2` (peer `next` resolves to the existing 16.4.3) |
| Font fix: web `lint`, `typecheck`, `format:check`, root `pnpm build` | Pass (exit 0) |
| Font fix: `pnpm build` with `HTTP(S)_PROXY` set to a dead address for that process only | Pass; `.next` contains no `fonts.googleapis.com`/`fonts.gstatic.com` references and no `next/font/google` import remains in source |

GitHub-hosted runs (2026-11-12), through draft test PR [#36](https://github.com/nanonoir/Agendoxa/pull/36) to `main`, closed without merge:

| Run | Commit | `quality` | `database-integration` |
|---|---|---|---|
| [43171874114](https://github.com/nanonoir/Agendoxa/actions/runs/43171874114) | `47842c9` (PR #35 content) | Pass; every step ran | Pass; API 1/1, database 90/90 |
| [43172012430](https://github.com/nanonoir/Agendoxa/actions/runs/43172012430) | Intentional format drift | Fail at `pnpm format:check` (exit 1); later steps skipped; red check visible on the PR | Pass |

## Final implementation outcome

### Implemented

Root formatting, warning-strict lint, LF normalization and uncached PostgreSQL integration checks are in place, along with the two-job PR-to-`main` workflow and updated project documentation. Web builds use locally packaged Geist fonts rather than downloading them from Google.

### Deviations from Design

The original plan was extended after review to remove the build-time Google Fonts dependency (D6), and the lint audit required warning-strict scripts because warnings otherwise exited successfully. The lifecycle rule now closes this plan before team review rather than waiting for downstream delivery steps.

### Validation

The checks and failure probes listed above passed, including PostgreSQL integration (API 1/1, database 90/90), actionlint and a build with a dead proxy. The first independent review's font blocker was fixed; the second confirmed the fix and identified only plan closure as blocking, addressed here. GitHub Actions ran both jobs on a PR to `main` and reported an intentional failure. Team review remains pending.

### Follow-up

Protecting `main` with the `quality` and `database-integration` checks is owner-led and tracked in Issue #19. No new technical debt was identified.
