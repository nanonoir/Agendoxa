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

**Owner-led after this PR:** enable/configure GitHub Actions, then coordinate a test PR to `main` to observe `quality` and `database-integration`, confirm a failing check is visible, and protect `main`.

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
- [x] 7. Verification and review — independent review: one blocking finding (below), plan evidence updated.
- [ ] 8. Delivery — PR to `develop`; GitHub run and plan closure pending.

## Decisions

- Lint, formatting, line-ending, Turbo and CI decisions: [design D1–D5](../../design-docs/doc-02-quality-ci.md#decisions).
- Owner decisions (2026-11-12): ESLint for web and oxlint for the TypeScript packages; the PRD file stays out of the repository; the agent prepares everything, the owner enables Actions, and the test PR to `main` is coordinated afterwards.
- Full root suites run locally because the root commands are this task's deliverable; the owner explicitly requested local verification including PostgreSQL.
- Audit finding: oxlint and ESLint exit 0 on warning-level violations, so the lint scripts now deny warnings ([design D1](../../design-docs/doc-02-quality-ci.md#d1--lint-policy-keep-eslint-for-web-and-oxlint-for-the-typescript-packages)).

**Pending owner decision:** the independent review flagged as blocking that `pnpm build` downloads the Geist fonts from Google Fonts (`next/font/google` in `apps/web/src/app/layout.tsx`), so a Google outage can fail the `quality` job. Removing that network access means self-hosting the font files or adding a dependency, which changes web presentation assets beyond this task's agreed scope. It is not resolved here; the PR reports it.

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
| Lockfile | Only importer entries added; resolved versions unchanged (prettier 3.9.10, oxlint 1.90.0, oxlint-tsgolint 7.0.2005) |

Not checked: a GitHub-hosted run, because Actions is not enabled yet; the owner will enable it and coordinate a test PR to `main`.

## Final implementation outcome

Pending.
