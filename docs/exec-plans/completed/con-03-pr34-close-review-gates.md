# CON-03 — Close the remaining documentary review gates

## Objective

Resolve the outstanding INT-Q-01, INT-Q-07 and reversal-notice decisions so teammates can review and merge PR #34 without unresolved contract choices from this correction task. Runtime qualification is not required for a documentation merge and remains explicitly separate.

## Context

- Follow-up to the [completed correction plan](con-03-pr34-corrections.md). Its delivery completed at `af49d91`: pushed to PR #34 with a COMMENT review and explanatory comment. The prior archive's delivery checkbox is historical, not a pending delivery.
- Worktree: `C:/Users/Nahuel/AppData/Local/Temp/opencode/agendoxa-con03-pr34`; preserve the original checkout on the CON-02 branch, used by another contributor.
- Baseline: `af49d91a6d0c3ac2eccf89b2407305176182c375`. PR #33 was open at `f3d06e2` when this plan started; it was later updated to `89dbb58` and merged into `develop` by the user as `d838fca`. PR #34 is open on `docs/CON-03-integration-contracts` targeting `develop`.
- Sources: [UC-03 rules](../../product-specs/uc-03/business-rules.md), [invariants](../../product-specs/uc-03/invariants.md), [CON-03](../../design-docs/integration-contracts.md), [CON-01](../../design-docs/modules.md), and CON-02 at the pinned revision above.
- User authorized the follow-up and resolution, retaining the existing delivery sequence: independent review, archival, push to PR #34 and explanatory COMMENT (no automatic approval or merge). Earlier delegated steps used GPT-6.1 Terra high at the user's request; from 2026-11-12 evening the user asked to use default subagent models.

## Agreed decisions

1. A provider send time exactly equal to the deadline counts as timely (`<=`).
2. When the authenticated provider message lacks a valid send timestamp, use trusted ingress arrival time. Authenticated duplicates keep the first recorded time and never count as another evidence attempt. Persisted facts are authoritative on retries; do not invent a timestamp for an intake that never durably committed.
3. A correction moving a valid payment from the wrong booking to the correct booking does not request another receipt from the payer, even if both bookings belong to the same customer. Reversal because approval lacked valid payment verification requests a receipt again; the affected booking retains its existing no-automatic-expiry safeguards. Keep the allocation correction and payment-verification invalidation distinct in the contracts without granting financial authority to the agent.
4. Align normative sources and tool contracts rather than merely deleting gate labels. Preserve genuine external qualification needs as future implementation acceptance checks, not unresolved documentation-merge decisions. At the time, CON-02 had not yet merged; its subsequent merge is recorded below and does not ratify the proposals.

## Scope

Included: canonical rule/invariant reconciliation; deterministic intake timestamp/retry behavior; payment-correction notice semantics; exact accounting of CON-02/CON-03 divergences and any minimal supporting-document alignment needed to make this proposal coherent; focused examples and acceptance scenarios.

Excluded: runtime, database/schema changes, providers, edits in the original checkout, force push, history rewriting, PR approval/merge or Issue closure. The local PRD remains outside Git.

### Authorized cross-PR alignment

The user subsequently authorized minimal changes to PR #33 as well, with explanatory comments on both PRs. CON-02 is isolated in `C:/Users/Nahuel/AppData/Local/Temp/opencode/agendoxa-con02-pr33-alignment`, local delivery branch `docs/con-02-pr33-con03-alignment` based on `f3d06e2`; its commits will be pushed explicitly to the existing remote `docs/CON-02-api-contracts` branch, not a new PR. Preserve the original checkout and published history. Any shared canonical documentation must retain identical meanings and noncolliding identifiers across the two proposals. Check integration in both merge orders without modifying shared branches or claiming either PR merged.

Revised 2026-11-12 (user decision, after a denied file-restore step that was not retried): canonical UC-03 changes stay only in PR #34; PR #33 does not copy them. Recommended merge order is #33 then #34; CON-02 text that relies on rules introduced by #34 states so explicitly. The public-composition change to `modules.md` stays only in PR #33 and CON-03 references it.

### Reviewer feedback from Nuria (2026-11-12)

- PR #33 P2: a service `Charge` is created from the agreed price regardless of deposit policy; replace the "no charge without a deposit" example wording with "no deposit instruction without a deposit".
- PR #34 P2: define confirmed terminal failure after acceptance (`DeliveryUpdate`/`recoverStatus` known `FAILED`, and `unknown` later resolved as definitive failure) as eligible for the same single still-valid retry and second-failure waitlist advancement (BR-WL-10, BR-NOT-10), after rechecking invitation validity, connection and consent; specify which provider evidence makes `FAILED` definitive; uncertain results keep recovery/personnel attention without automatic resend.
- PR #34 minor: the `CORRECTION_WINDOW` example uses `bookingContext.status: PENDING_PAYMENT_REVIEW`, not `HOLD`; the `booking.hold-expiry.v1` example `dueAt` shows the 15 s default margin (`2026-11-11T15:10:15Z`).

## Execution

1. Inspect remaining gates and the pinned CON-02 source for concrete unresolved choices.
2. Reconcile canonical UC-03 agreements and contract semantics, preserving existing identifiers.
3. Update CON-03 and directly affected references/examples; resolve INT-Q-01/07 with evidence and scoped statuses, not blanket claims.
4. Run independent review and focused documentary validation; correct actual findings and re-review.
5. Delegate closure to archiver, then push additive commits to PR #34 and post an explanatory COMMENT/review update. Verify remote head and clean worktree.

## Progress

- [x] Remote heads and clean isolated worktree verified; follow-up plan created before editing.
- [x] Source investigation completed; UC-03 decisions committed as `6b910f5`.
- [x] CON-03 decided semantics committed as `10e48ea`; cross-PR reconciliation still to finalize.
- [x] Nuria's PR #34 feedback committed (`d9d5cb3`); CON-02 repins (`81c6122`, `a6fa67a`).
- [x] CON-02 and OpenAPI alignment delivered in PR #33 (`ed413be`..`89dbb58`, pushed, explanatory comment posted); independent review's last finding fixed directly in `89dbb58`. The user merged PR #33 into `develop` (`d838fca`).
- [x] Merged `origin/develop` (`7e67ad0`): UC-03/index conflicts resolved by hand with the agreed wording, two #33-only phrases preserved in BR-COB-02/04, both catalog entries kept. Interim CON-02 notes removed (`b3ff6d5`); CON-03 references merged CON-02 with relative links and INT-Q-07 lists only API-Q-11, API-Q-12 and team ratification (`fb4d78b`). Margin citation corrected to BR-RES-08/INV-SEN-03 (`2795cb9`).
- [x] Focused validation and independent review passed: final verdict PASS WITH MINOR; both minor findings addressed (this plan's stale status and the margin citation). Pre-existing duplicate `INV-PAY-08`/`INV-PAY-12` identifiers exist on `develop` and are out of scope.
- [x] Plan archived.
- [ ] Delivery recorded in PR and final handoff.

## Validation

Planned: diff whitespace, links/anchors/fences, identifier consistency, actual TypeScript-block extraction with strict no-emit checks, typed JSON examples, and negative authority/send cases. No application suites, live provider execution, migrations or PostgreSQL concurrency runs for this documentation-only change. Future execution checks must remain labeled as such.

## Implementation Outcome

### Implemented

UC-03 and CON-03 now specify inclusive evidence timing, trusted-ingress fallback and durable retry behavior, and distinguish invalid-verification notices from valid-payment reassignment. Nuria's feedback defined definitive post-acceptance failure and the qualified single retry, with uncertain results protected by INT-Q-05, and corrected the status and margin examples. CON-02 alignment was delivered in PR #33, merged by the user, and incorporated into this branch; interim notes were removed and INT-Q-07 narrowed to the remaining decisions and ratification.

### Deviations from Design

The initial scope excluded PR #33 changes and assumed CON-02 remained unmerged. The user authorized isolated cross-PR alignment, later merged #33 into develop, and the branch incorporated that merge with manual UC-03 and index conflict resolution. No runtime implementation was included.

### Validation

Final independent review against develop returned **PASS WITH MINOR**; both minor findings were addressed. Earlier review failures concerning cross-PR conflicts, intermediate states and same-customer wording were resolved. Documentary checks reported a clean merge-tree and diff whitespace, 485 valid links/anchors and valid fences, strict TypeScript checks for nine TS blocks and 21 typed JSON examples, and a parseable OpenAPI document; Redocly reported the existing info-license warning on the #33 side. Application, PostgreSQL and provider tests were not run: these are future implementation acceptance, not documentation-merge checks.

### Follow-up

API-Q-11 (optional CRM display), API-Q-12 (retention policy and product/legal input), and team ratification remain open in the canonical contracts. INT-Q-04/05 require physical implementation and provider qualification, including Evolution timestamp/status mapping and the 15-second margin pilot. Pre-existing ambiguous invariant references are tracked as TD-04. Delivery remains with the parent: push to PR #34, submit a COMMENT review and reply to Nuria with an explanatory comment; no approval or merge is implied.
