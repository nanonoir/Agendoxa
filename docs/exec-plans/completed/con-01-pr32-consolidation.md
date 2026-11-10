# CON-01 — PR #32 consolidation and scope reconciliation

## Objective

Consolidate [PR #32](https://github.com/nanonoir/Agendoxa/pull/32) into one reviewable modular-architecture proposal, register the newly agreed preliminary receipt screening, and align [CON-02 #11](https://github.com/nanonoir/Agendoxa/issues/11) and [CON-03 #12](https://github.com/nanonoir/Agendoxa/issues/12). Deliver additive commits to Agus's existing branch without merging or closing Issues.

## Context

- User approved the full execution and GitHub delivery in this conversation on 2026-11-09, including extending PR #32 and explaining the extension there. Product-owner agreement is not collective team ratification or implementation.
- Worktree: `C:/Users/Nahuel/AppData/Local/Temp/opencode/agendoxa-con01-consolidation`, branch `docs/CON-01-modules-architecture`, original PR head `5317edb6f0124bd81413f3a7730b20595df20f9e`, develop base `fc48ce629fc7f75aa096c13ee05e075552be10c0`. PR head was rechecked before starting; unchanged from the comparative review.
- Original checkout `C:/Users/Nahuel/Desktop/Trabajo/Agendoxa` retains the uncommitted independent proposal and closed investigation record on `docs/CON-01-independent-modules`; do not modify, stash, copy wholesale or commit that work.
- References: [modules proposal](../../design-docs/modules.md), [target architecture](../../design-docs/target-architecture.md), [ERD](../../design-docs/erd.md), [tenancy](../../design-docs/tenancy.md), [current architecture](../../../ARCHITECTURE.md), [product catalog](../../product-specs/index.md), [CONTRIBUTING](../../../CONTRIBUTING.md).
- Two blind comparative reviewers (Sol 6.1 medium and Claude Code Opus 5.5 medium) agreed that PR32's inverse ports do not demonstrate realizable acyclic composition, its concurrency protocol is incomplete, and asynchronous deletion violates immediate/transactional requirements. Both found the independent design stronger technically but needing smaller workflow scope and explicit recovery paths. Module mergers beyond waitlist were recommendations, not unanimous reviewer findings; user approved the consolidated direction below for team review.

## Scope and decisions

### Architecture direction to propose

- Nine functional modules plus `assets` and `audit`; waitlist inside bookings, cash inside payments, calendars and policy configuration/resolution inside catalog. Bookings remains the sole occupancy and transition authority, including applied deposit calculation/snapshots.
- Named application coordinators above owners for multi-owner business operations; standalone owner commands may run locally. Shared technical dependencies alone do not force a central workflow wrapper.
- Narrow public contracts, direct in-process calls, ORM-neutral transaction scope with one commit, explicit participant/lock semantics and a simple tenant-first baseline. Specify compatible row-lock mode, bounded waits and trigger/pool implications; no runtime concurrency claim without future PostgreSQL validation.
- Transactional deletion/consent effects; complete evidence/rejection/reschedule/refund/reuse coordination, calendar-unblock wakeup, second confirmed invitation-send failure advancement, durable batch activation and recovered work ownership.
- Preserve useful PR tables, decision IDs, agent allowlist and collaboration conventions; reconcile incompatible target-architecture sections rather than importing a competing design document.

### New functional agreement

- AI preliminarily screens an image/PDF for relevance as transfer evidence; it never verifies bank credit or authenticity.
- First clearly unrelated file: explain and request a correct file. Second clearly unrelated attempt: explain failed attempts, ask the customer to await human review and create that review. Preliminary discards are not human payment rejections.
- Plausible receipt goes to human verification. A retry never renews the HOLD. Timely second-invalid escalation is human review without inactivity cancellation; preserve the existing late-evidence, partial-funds and supplemental-payment safeguards.
- Gemini Flash is the requested technical direction; up-to-five-second analysis is a latency objective, not a guaranteed provider capability or new business deadline. Failure/uncertainty must not be classified as unrelated content or falsely verify money. CON-03 specifies exact provider/model, technical result and recovery contracts.
- Canonical behavior belongs in UC-03 with coherent UC-01 flows/invariants and only necessary complementary updates; no new schema, counters or AI implementation is delivered.

### GitHub reconciliation

- #11: public landing information only; customer self-service remains WhatsApp and personnel operations remain CRM; both call the same protected core. Update scope, criteria and document destinations without deleting useful API-contract requirements.
- #12: no Mercado Pago/payment gateway/bank API. Preserve configured alias/bank details, manual transfers/cash, human verification and explicit allocation; add preliminary screening handoff, requested Gemini Flash and latency objective, media/storage/jobs/provider recovery and canonical references.
- Edit Issue bodies and add one rationale comment each; retain assignments/state and pending acceptance boxes. Update PR body using its template, explain broadened scope and affected Issues, request Agus/team review, remove automatic closure wording. Do not merge or mark team approval.

## Execution plan

1. Inspect branch, repository guides and latest PR/Issue content; prepare isolated worktree and this plan.
2. Reconcile canonical product rules/invariants and affected flows for preliminary receipt screening, preserving existing payment authority and deadline safeguards.
3. Consolidate modules, target architecture and design index with the approved direction and all identified coordination/recovery gaps.
4. Independently review updated architecture and product coherence; correct concrete findings and run focused documentary checks, including untracked files.
5. Update #11/#12 bodies and rationale comments, verifying current content before replacing it; preserve unrelated changes.
6. Commit coherent product and architecture units, archive this plan through archiver, and push additive commits to PR32's branch after a remote-head check.
7. Update PR scope/verification/review notes, verify remote content and delivery. No merge/Issue closure. Record any genuine blocker rather than claiming completion.

## Progress

- [x] Prepared worktree from unchanged PR head; read repository guides and current #11/#12 bodies; preserved original checkout.
- [x] Created plan before editing product or architecture.
- [x] Product reconciliation: BR-SEN-14–16, INV-SEN-12–13 and examples added; UC-01/02, MVP and product index aligned. P-40 preserves the unagreed carry-over/reset boundary across human reviews/correction windows rather than inventing it.
- [x] Architecture consolidation: original decision IDs/ownership structure retained, nine functional modules/two supports, explicit coordinators/contracts, target reconciliation and technical screening direction. Worker ingress and recovery corrections completed and re-reviewed.
- [x] Independent review and focused validation: product and architecture reviewers ended PASS after focused corrections; consolidated local links/anchors, ownership, complete allowed DAG, fences, whitespace and docs-only scope passed.
- [x] Issue updates and rationale comments: #11/#12 bodies edited after concurrency checks; readback matches the drafts and title/state/assignees are preserved. Comments: [CON-02 rationale](https://github.com/nanonoir/Agendoxa/issues/11#issuecomment-6748681000), [CON-03 rationale](https://github.com/nanonoir/Agendoxa/issues/12#issuecomment-6748682501). Both remain open with pending acceptance checks.
- [x] Product and architecture units committed as `74248f9` and `c49579e`, then pushed additively after a remote-head check; five original commits preserved. Remote branch and PR head verified at `c49579edf65f0dd2c131ca3a78f889569c60afbe`.
- [x] PR title/body updated to explain the scope extension, decisions and actual evidence; removed automatic closure wording, PR remains open. Review requested from `gonzaloogv`; [follow-up for Agus/team](https://github.com/nanonoir/Agendoxa/pull/32#issuecomment-6748824549) posted. Body readback matches.
- [x] Complete the documentary execution and archive this plan.

The parent session delivers this administrative archive as the final Git step. The final commit/head and clean-worktree confirmation are recorded in the PR delivery follow-up and task handoff, rather than embedding a self-referential commit hash here.

## Validation

Product review completed: reviewer found a lost explicit atomicity requirement in BR-SEN-10/INV-SEN-10 and a correction-window path returning to HOLD expiry in the diagram. A focused fix restored atomic check-and-transition and origin-specific diagram paths; re-review verdict PASS, no remaining material findings. Issue #12 draft was checked for functional coherence. Initial product-only local-link/anchor/fence and whitespace checks passed, followed by the consolidated checks below. Product unit committed as `74248f9` after staged-scope and whitespace inspection.

Issue #11/#12 body updates were independently deliverable after the product review and were applied while architecture consolidation continued. No Issue title, assignee, state or acceptance status changed; body readback and rationale comment URLs verified. This overlap does not claim architecture validation is complete.

Final pre-delivery checks: 10 Markdown files (including the new plan), 366 local links, 256 heading anchors, 38 exact unique ERD owners; DAG has 12 nodes and 47 allowed edges (26 diagram edges plus the explicit technical-dependency table), without cycles. Fences, whitespace (preserving intentional Markdown hard breaks), `git diff --check` and docs-only scope passed. Git reports only LF/CRLF conversion warnings. No authored application/config/test code is included (0 authored-code lines; documentation is excluded from the delivery size budget). Issue and PR body readbacks, requested review, branch ancestry and pre-archive pushed head verified. The same checks passed again after moving the plan to completed; final archive-delivery receipt belongs in the PR follow-up and task handoff.

Architecture review identified (1) owner-local expiry jobs unable to call the required higher multi-owner coordinator under the DAG and (2) missing explicit timely-unresolved-screening rechecks in the architecture's expiry contract/test list. Both were corrected. The reviewer withdrew a separate durability warning after checking the general recovery rule; the final path was nevertheless made explicit. A subsequent review caught that direct notice-to-booking writes contradicted the multi-owner coordination rule: invitation dispatch/outcome/recovery now enters workflows and commits notice outcome plus round advancement/intent atomically. Final focal verdict PASS. The technical dependency table is explicit and includes identity-to-audit without same-level cycles. P-40 was editorially narrowed to later human-review/correction boundaries, not the already agreed first/second replacement sequence.

The independent proposal in the original checkout still matches SHA256 `3fbc7aad5d28562770c7df887bcde1183a076bf9535c24facd89619e3831fab8`; all five original PR commits remain ancestors. No working-tree or history rewrite was used.

No runtime code or SQL is changed, so no application test suites, database migrations, provider calls or live receipt processing will run. Future implementation tests are requirements, not evidence from this task. No claim of actual Gemini latency, Nest bootstrap, PostgreSQL concurrency or Mermaid rendering without executing those checks.

## Implementation Outcome

### Implemented

The product rules and modular architecture proposal were consolidated as documentation, delivered in commits `74248f9` and `c49579e`, and pushed to PR #32. Issues #11 and #12 and the PR were reconciled and communicated as recorded above. No application code or SQL was implemented. The PR and Issues remain open; team review, acceptance and integration under the Definition of Done are not complete.

### Deviations from Design

The PR scope was expanded to include the agreed preliminary receipt screening and associated Issue reconciliation. Review-driven corrections made atomicity, worker ingress, timely screening and invitation outcome coordination explicit. GitHub reconciliation and the product/architecture commits were delivered before archival; the parent session will separately commit and push this administrative archive and verify the final head and worktree.

### Validation

Product and architecture independent reviews ended PASS after the corrections described above. Consolidated documentary checks passed for links, anchors, ownership, the acyclic dependency graph, fences, whitespace and docs-only scope; PR and Issue readbacks and the pre-archive pushed head were verified. No runtime, provider, latency, PostgreSQL concurrency or Mermaid rendering validation was performed.

### Follow-up

P-40 remains open only for carry-over after human review or later correction rounds. T-01–05 and tenancy/legal team ratification remain for future resolution. Product and architecture proposals require team review and later implementation; no merge or Issue closure is claimed. The parent handles administrative archive delivery and records its final verification in the PR follow-up and task handoff.
