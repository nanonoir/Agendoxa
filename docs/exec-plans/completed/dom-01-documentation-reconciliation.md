# DOM-01 documentation reconciliation

## Objective

Reconcile the 23 audit findings with the [2026-11-04 product-owner handoff](../../../agendoxa_audit_handoff.md), leaving one coherent, review-ready documentation change targeting `develop`. The expected conceptual inventory is 38 entities. Product-owner agreement is not collective team approval or implemented behavior.

## Context

- Starting branch/commit: `develop`, `e151c7f`; local `origin/develop` matches it. No remote update was performed.
- Working branch: `docs/DOM-01-audit-reconciliation`.
- Initial local work: untracked handoff and `docs/design-docs/erd.md`; no tracked modifications. Both were preserved in task-owned stash `6e1aaa520ae2525ffc49484a9f75a0ebca545028` and restored on the documentation branch before editing.
- Handoff decisions remain unchanged; only four pre-existing trailing-space Markdown breaks were normalized for the required whitespace check. The preserved stash retains the original input. The ERD was refactored from the preserved local document, not reconstructed from an assumed remote copy.
- Sources: [product catalog](../../product-specs/index.md), [design catalog](../../design-docs/index.md), [collaboration agreement](../../../CONTRIBUTING.md). The original audit is in the initiating conversation; F-001–F-023 identifiers are preserved in the handoff and the traceability matrix below.

## Scope

Documentation and conceptual design only: business rules, actors, narrative flows, detailed use cases, invariants, scope, ERD, architecture proposal and indexes. Preserve the handoff as provenance; functional rules belong in UC-03, not this plan. No application/configuration/dependency/migration changes, new infrastructure, full suites, push, PR publication or merge.

## Execution plan

1. Preserve inputs and establish the documentation branch.
2. Reconcile canonical UC-03 rules/invariants with the handoff; align UC-01/UC-02 and MVP descriptions rather than adding contradictory appendices.
3. Reconcile the conceptual ERD (including `Refund` and `NotificationAttempt`), architecture proposal and catalogs.
4. Inspect every F-001–F-023 source change; validate local Markdown paths/anchors, Mermaid, entity inventory, stale assertions, scope and whitespace.
5. Obtain independent review, correct concrete issues, record remaining decisions, then close this plan and prepare local Git delivery without publication.

## Progress

- [x] Read the handoff, operational guidance and catalogs; compare with the original audit in conversation.
- [x] Preserve the two untracked inputs and create the task branch from `develop`.
- [x] Reconcile canonical rules/invariants and dependent functional documents, including a cross-document correction pass.
- [x] Reconcile 38-entity ERD and architecture proposal; include ERD in local versioning and add the catalog entry.
- [x] Complete F-001–F-023 traceability and focused validation.
- [x] Independent review passed; normalize residual no-show terminology and remove browser recording artifacts.
- [x] Archive outcome and prepare local delivery.

## Decisions

The handoff supersedes incompatible earlier proposals within this review iteration. Keep documents `In Review` / `Proposed`, explicitly distinguishing product-owner agreement from team ratification. Do not reopen closed choices. Record genuinely unresolved product questions in the existing UC-03 register and technical choices in the ERD, not as invented defaults or a second product specification.

## Traceability

This execution/review matrix is not a second source of rules. File keys:

- **R:** [UC-03 rules](../../product-specs/uc-03/business-rules.md); **I:** [invariants](../../product-specs/uc-03/invariants.md).
- **A:** [actors](../../product-specs/uc-01/actors.md); **F:** [flows](../../product-specs/uc-01/flows.md); **U:** [use cases](../../product-specs/uc-02/use-cases.md).
- **E:** [ERD](../../design-docs/erd.md); **M:** [MVP](../../product-specs/mvp.md); **T:** [target architecture](../../design-docs/target-architecture.md).
- **DI:** [design index](../../design-docs/index.md); **PI:** [product index](../../product-specs/index.md); **G:** [agent guide](../../../AGENTS.md); **README:** [project entry point](../../../README.md).

**D/T/I** means documented in design, collective team review pending, related product implementation pending. Documentation-only findings do not imply an application feature needs implementation. The verification column gives the exact manual inspection to repeat; final execution evidence is below.

| Finding | Decision applied | Changed sources | Repeatable verification | Status |
|---|---|---|---|---|
| F-001 | Role-only capabilities, protected Admin | R, I, A, F, U, E, M, T | Compare BR-IAM-01–05, INV-AUD-04 and ERD module 1; no direct-member grants or unconditionally fixed Staff capabilities | D/T/I |
| F-002 | Optional rotation and fixed receiving instruction | R, F, U, E, M, T | BR-SEN-06 and receiving-account design allow rotation, retain transaction destination and do not promise a bank API/algorithm | D/T/I |
| F-003 | Verified commercial origin independent of allocations | R, I, F, U, E, M, T | BR-COB-02 / INV-PAY-05: zero allocations permitted, unknown/personal funds excluded, origin/payer links preserved where known | D/T/I |
| F-004 | Manual capped allocations, nonnegative charge balance | R, I, F, U, E, M, T | BR-COB-03/17, INV-PAY-07 and EJ-48: both entries retained, excess unallocated, no automatic distribution | D/T/I |
| F-005 | Evidence review separate from verified Payment | R, I, F, U, E, M, T | Review state diagram and EJ-17 create no Payment from an image; direct CRM payment may omit review | D/T/I |
| F-006 | Eligible partial-deposit move before supplemental collection | R, I, F, U, E, M, T | BR-CAN-10, INV-CAN-05, EJ-27 and CU-09 diagram: confirmed destination; no automatic reversal; FULL_PREPAYMENT preserved | D/T/I |
| F-007 | Private terminal remainder and explicit atomic CRM reuse | R, I, F, U, E, M, T | BR-RES-17 / INV-RES-07 and DM-07 retain private fragments, no waitlist wakeup or walk-in eviction after correction | D/T/I |
| F-008 | Distinct offer and booking claims | R, I, F, U, E, T | BR-WL-08 / INV-WL-08 and Mermaid XOR: close old claim, create new ten-minute HOLD, preserve conversion link | D/T/I |
| F-009 | Optional compatible resource preference | R, I, F, U, E | BR-WL-11 / INV-WL-09 and WaitlistEntry edge: specified resource only; null means any compatible resource | D/T/I |
| F-010 | Field-level policy priority and explicit inheritance | R, F, U, E, M, T | BR-SEN-02/04: resource > service > tenant; inherit/set/disable distinct; FULL_PREPAYMENT and Admin exception preserved | D/T/I |
| F-011 | Inherited schedules and cross-channel authorized openings | R, I, A, F, U, E, T | BR-DISP-01–07 / EJ-12: both channels may use opening; blocks and claims still prevent booking | D/T/I |
| F-012 | Open session for cash, explicit opening and serialized close | R, I, F, U, E, M, T | BR-CAJA-03 / INV-CAJA-08: cash requires open session; verified transfer does not; no late rewrite | D/T/I |
| F-013 | Separate Refund; immutable original; cash-only post-close adjustment | R, I, F, U, E, M, T | BR-COB-18 / INV-PAY-09: executed refund effect only; cash outflow versus bank outflow; no negative Payment | D/T/I |
| F-014 | Cash derived from physical movements once | R, I, F, U, E, M, T | Cash formula and EJ-36/37 count a linked receipt once, never Payment plus its movement | D/T/I |
| F-015 | Current consent plus grant/revocation AuditEvent | R, I, F, U, E, M, T | BR-AUD-03 / INV-AUD-03: transactional grant/revoke, actor/channel/scope, no consent entity or per-send consent audit | D/T/I |
| F-016 | NotificationAttempt per actual attempt | R, I, F, U, E, M, T | BR-NOT-04 / INV-NOT-05 and ERD: notice has zero or more attempts, attempt zero or one Message; retry keeps notice identity | D/T/I |
| F-017 | All no-shows attributed to requester from Booking | R, I, A, F, U, E, M, T | BR-CLI-06 / INV-CLI-01 / EJ-35: third-party absence increases requester count once; CustomerIncident excludes no-shows | D/T/I |
| F-018 | First rejection correction window, guarded second rejection | R, I, F, U, E, M, T | BR-SEN-10 / INV-SEN-10 / CU-03: 15 minutes; timely new review suspends timer; second distinct rejection; started/supplemental safeguards | D/T/I |
| F-019 | Canonical ownership and truthful current review status | R, I, A, F, U, E, M, T, PI, DI, G, README | Follow catalogs; current versions agree; handoff supersedes incompatible earlier text without claiming team approval or implementation | D/T/I |
| F-020 | Independent reminder and waitlist consent | R, I, F, U, E, T | CU-19 → CU-16 edge applies only to reminders; CU-05 opt-in drives offers independently | D/T/I |
| F-021 | Versioned ERD in existing design catalog | E, DI | Verify ERD is included in local Git delivery before retaining index link; no parallel domain tree | D/T/I |
| F-022 | Technical decisions stay in design-docs catalog | T, DI | Architecture §14.1 points to existing catalog, not an active separate ADR tree | D/T/I |
| F-023 | Omit already-due reminders, separate confirmation | R, I, F, U, E, M, T | BR-NOT-08 / INV-NOT-06: due <= confirmation means skipped with zero attempts; reschedule invalidates old slot; timezone/UTC crossings allowed | D/T/I |

## Validation

Focused evidence before independent review:

- Temporary read-only checker outside the repository (`C:/Users/Nahuel/AppData/Local/Temp/opencode/agendoxa-dom01-validation/check-docs.cjs`): 21 Markdown files, 383 local links including 228 fragment links, zero missing targets/anchors; 38 unique candidate entities and exactly F-001–F-023 matrix rows.
- Handoff comparison against the preserved stash's untracked-file tree: identical decisions/content after ignoring trailing whitespace and CRLF/LF differences.
- Mermaid 11.12.1 loaded in a temporary local browser harness, without adding project dependencies: parse and SVG render succeeded for all 26 diagrams (ERD 9, target architecture 3, MVP 1, UC-01 flows 8, UC-02 2, invariants 2, README 1). Re-run changed diagrams after any review corrections. This checks syntax/renderability, not visual polish or transactional runtime behavior.
- `git diff --check HEAD`: passed; LF/CRLF conversion warnings only. The final staged diff must be checked again, including the new plan.
- Excluded-scope diff for apps/packages/manifests/lockfile/infra examples: empty. Targeted search found no stale current-version references or superseded no-rotation/own-versus-third-party/pre-move-extra-deposit assertions in active specifications.
- No application tests/builds/install or full suite ran. There is no business implementation to certify. The temporary harness and browser-generated artifacts are task-owned and must be cleaned up before delivery.

## Independent review

Reviewer session `ses_e5b4dec6bffehABbdgvdPXQsDc` returned **PASS**, no material/blocking defects against all 23 handoff decisions. Suggestions were delivery hygiene (remove the browser recording, include/archive this plan) and three residual "own no-shows" example phrases; the examples were normalized to requester-attributed no-show bookings. Post-review edits are those wording/cleanup changes, role-capability wording and an explicit refund permission row reflecting the already-documented Admin restriction, not new product decisions. Team ratification, physical schema design and implementation remain pending.

## Implementation Outcome

### Implemented

Exclusively documentary refactoring and conceptual reconciliation of the 23 audit findings (F-001–F-023) against the [2026-11-04 product-owner handoff](../../../agendoxa_audit_handoff.md), targeting `develop` from base commit `e151c7f` on branch `docs/DOM-01-audit-reconciliation`:
- Reconciled conceptual domain model to an exact inventory of 38 entities, introducing `Refund` and `NotificationAttempt` without adding consent or custom Job entities.
- Reconciled canonical [UC-03 business rules](../../product-specs/uc-03/business-rules.md) and [invariants](../../product-specs/uc-03/invariants.md), confirming UC-03 as the single source of truth for business logic.
- Aligned dependent product specifications: [UC-01 actors](../../product-specs/uc-01/actors.md), [UC-01 flows](../../product-specs/uc-01/flows.md), [UC-02 use cases](../../product-specs/uc-02/use-cases.md), [MVP scope](../../product-specs/mvp.md), and [product specs catalog index](../../product-specs/index.md).
- Reconciled technical design documents: versioned [ERD](../../design-docs/erd.md), [target architecture](../../design-docs/target-architecture.md), and [design docs catalog index](../../design-docs/index.md).
- Aligned root guidance: repository [agent guide](../../../AGENTS.md) and [README](../../../README.md).
- Maintained all documents with `In Review` / `Proposed` status, explicitly preserving the boundary that product-owner agreement does not represent collective team approval or implemented software behavior.
- Incorporated the independent review suggestions and equivalent clarity fixes: normalized three residual "own no-shows" example phrases, refined role capability descriptions, added an explicit refund permission row matching the existing Admin restriction, cleaned up temporary browser recordings, and archived this ExecPlan for local versioning.

### Deviations from Design

None. The execution conformed strictly to the product-owner handoff decisions F-001–F-023 and the agreed documentation scope without altering product boundaries or introducing unapproved runtime features.

### Validation

- **Final external read-only link and anchor checker:** After archival, checked 21 Markdown files and 398 local links (including 229 fragment links); 0 missing targets or anchor errors. All 38 candidate entity names match the handoff and appear in Mermaid; the matrix contains exactly F-001–F-023. Earlier pre-archival counts above are retained as progress evidence.
- **Handoff integrity comparison:** Decision and content text confirmed identical against the original handoff preserved in task stash `6e1aaa520ae2525ffc49484a9f75a0ebca545028`, modulo 4 trailing-whitespace/CRLF normalizations required for repository whitespace checks.
- **Mermaid diagram validation:** Verified all 26 Mermaid diagrams using Mermaid 11.12.1 in a local temporary browser harness without adding project dependencies (ERD 9, target architecture 3, MVP 1, UC-01 flows 8, UC-02 2, invariants 2, README 1); 26/26 diagrams parsed and rendered SVG successfully.
- **Harness process and artifact cleanup:** Temporary browser instance closed; local static test server (PID 14196) terminated via POST `/shutdown` with native completion confirmation; temporary screen recordings cleaned up.
- **Whitespace and repository scope hygiene:** `git diff --check HEAD` and cached diffs passed without errors or unwanted whitespace; scope inspection confirmed zero diffs in `apps/`, `packages/`, manifests, lockfile, infrastructure examples, or `.github/`.
- **Independent review:** Reviewer session `ses_e5b4dec6bffehABbdgvdPXQsDc` issued **PASS** with zero blocking defects; non-blocking delivery hygiene recommendations and residual phrasing were fully incorporated.
- **Deliberately excluded validation:** No application builds, test suites, package installs, or runtime checks were executed, as this deliverable is purely conceptual and documentary with no executable business logic.

### Follow-up

- **Team ratification:** Specifications and designs remain `In Review` / `Proposed` until formal review and approval by the development team.
- **Physical database design and persistence:** Technical open items T-01 through T-05 documented in [ERD](../../design-docs/erd.md) (private residual fragments, account-rotation algorithm, transactional allocation/refund reservation and correction history, notification/consent retention, and physical schema constraints/indexes in Step 3).
- **Unresolved product decisions:** Only the remaining open/partly resolved entries within the canonical [P-01–P-27 register](../../product-specs/uc-03/business-rules.md#16-pending-decisions) remain pending; resolved identifiers retain their history.
- **Local delivery target:** One documentation-only local commit on `docs/DOM-01-audit-reconciliation`, ready for a future PR to `develop`; Git history is the record of the packaging commit. No remote push, PR publication or merge is in this task. Task stash `6e1aaa520ae2525ffc49484a9f75a0ebca545028` and unrelated stashes are retained.
