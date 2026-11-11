# CON-03 — Integration contracts

## Objective

Prepare the reviewable integration-contract proposal required by [CON-03 #12](https://github.com/nanonoir/Agendoxa/issues/12), including typed agent tools, failure/recovery behavior, test doubles and acceptance traceability.

## Context

- The user assigned #12 to `gonzaloogv`, moved it to In progress and authorized this work on 2026-11-11.
- The user subsequently requested publication toward develop for team review. Publication and reviewer state are verified on the resulting PR.
- Branch `docs/CON-03-integration-contracts` starts at `develop` `af1da4443d8db8af475ad9cb9abfcbc8220f1cd8`, which includes CON-01 and REP-02.
- CON-02 [PR #33](https://github.com/nanonoir/Agendoxa/pull/33) is open at `d2b7d77769738b118b09241808bfd1edc50cfbcf`. Its error vocabulary, projections and typed-tool ownership remain proposed. References to its document must use that pinned revision until integration.
- Canonical behavior comes from [UC-03](../../product-specs/uc-03/business-rules.md) and [invariants](../../product-specs/uc-03/invariants.md), with [CON-01](../../design-docs/modules.md), [DOM-01](../../design-docs/erd.md) and [DOM-02](../../design-docs/tenancy.md) defining structural constraints.

## Scope

Create `docs/design-docs/integration-contracts.md` and register it in the design index. Cover Evolution intake/sending, LangGraph/tools, receipt screening, private assets and durable jobs. Specify ownership, validated context, representations, inputs/outputs/errors, deduplication, retries, uncertain outcomes, recovery and representative examples.

The deliverable is a design proposal. Runtime implementation, packages, configuration, migrations, provider accounts, production validation and product-policy changes belong to later work. P-40, T-01–T-05, tenancy questions and CON-02 questions retain their existing owners.

## Execution plan

1. Recheck task/dependency state and start the task branch from current develop.
2. Verify the provider capabilities needed by the contracts using primary documentation and record capability limits.
3. Write one coherent contract document following the repository's decision/question/traceability format.
4. Review ownership, tenant/actor authority, business-rule compatibility, retry/crash windows and example consistency.
5. Validate UTF-8, Markdown links/anchors/fences, contract examples and the focused diff. Record actual results and remaining review gates.

## Progress

- [x] Rechecked #12 assignment/status, develop and PR #33; created the task branch from develop.
- [x] Collected primary provider evidence and selected explicitly proposed technical defaults.
- [x] Drafted and registered the integration contracts.
- [x] Reviewed the contracts against domain rules and module boundaries.
- [x] Completed documentary validation and recorded results.

## Decisions

- Use the established `docs/design-docs/` catalog and `docs/exec-plans/` lifecycle.
- Preserve a single source for domain rules. Proposed integration choices will carry `INT-DM-*` IDs and unresolved integration questions `INT-Q-*` IDs.
- Treat the proposed API contract as a pinned dependency, and keep customer-facing tool results separate from personnel projections.
- Research and checking utilities stay in a task-specific temporary directory outside the repository.
- Proposed technical baselines are Evolution 2.3.7, pg-boss 12.38.2 and the stable Gemini model `gemini-3.8-flash`. The document records their primary sources and distinguishes documented capabilities from live acceptance.
- Proposed limits are five seconds for evidence analysis, a 30-second/eight-tool conversation run, and 10 MiB/20 PDF pages/25 megapixels for files. They are integration choices for team review, with no new business deadline or age-based deletion policy.
- Added explicit preparation/confirmation and voluntary waitlist-withdrawal tool contracts, deriving them from current customer workflows and listing reconciliation with CON-02 as a review gate.

## Validation

Documentary checks passed using a temporary Python/Markdown parser and TypeScript 6.0.3 already installed in the shared workspace. Three files, 28 local links including six fragments, strict UTF-8, code fences, 12 decision IDs and 21 acceptance scenarios passed. Nine TypeScript blocks and five JSON examples compile together in strict no-emit mode. Six negative type cases confirm rejection of model-supplied tenant authority, a financial classifier verdict, numeric money, an unknown job version, a staff-only tool and an UNKNOWN send without correlation.

Independent read-only review ended without Critical or Important findings after corrections. The draft now exposes preparation/fallback references, recorded-vs-unrecorded preferences, current waitlist IDs and acquired booking terms. Screening preparation follows workflows-to-assets; neutral task types belong to workflows contracts to avoid an inverse type dependency. `git diff --check` passed. Final checks include the untracked documents directly, not only the tracked diff.

Application lint, typecheck, tests and build are not applicable to the Markdown-only diff. The targeted TypeScript check above validates documented contracts/examples. Provider calls, live performance, PostgreSQL enqueue/locking and runtime behavior have not been exercised by documentary validation.

## Final implementation outcome

Prepared and validated the CON-03 proposal and its design-index entry on `docs/CON-03-integration-contracts`, ready for publication toward develop. The document includes 12 proposed integration decisions, typed contracts, five JSON examples, 21 implementation acceptance scenarios, primary provider references and explicit coordination/implementation gates.

The user's approved scope was followed. Clarifications required by review were added to the same document without changing canonical functional rules or runtime code. CON-02 is still an open pinned dependency. P-40, receipt ambiguity/timestamps, handoff concurrency, provider acceptance, physical metadata and retention/account decisions remain assigned gates in the document.

This completes preparation of the reviewable proposal. Issue #12 remains open and requires team review and integration under CONTRIBUTING. The resulting PR records publication and reviewer requests. No claim of implemented integrations or production acceptance follows from the document.
