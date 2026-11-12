# CON-03 — PR #34 targeted contract corrections

## Objective

Correct three findings in [PR #34](https://github.com/nanonoir/Agendoxa/pull/34) (H1 uncertain sends, H2 intake-versus-expiry race, H3 customer payment projection) and record the product-owner agreements they depend on in UC-03. Deliver additive commits to the existing PR branch, then post a COMMENT review explaining the changes. No merge, approval or Issue closure.

Documentary correction completion criteria: H1–H3 are reconciled with UC-03; independent review and focused documentary checks pass; plan archived. Push, COMMENT review and explanatory PR comment are subsequent administrative delivery, still pending; team approval and merge are not implied.

## Context

- User authorized on 2026-11-12: this plan, the delegation flow, push to `docs/CON-03-integration-contracts` after a passing review and archive, and a COMMENT (not APPROVE) review on PR #34. The PR author (`gonzaloogv`) authorized the user to push commits to the PR.
- Worktree: `C:/Users/Nahuel/AppData/Local/Temp/opencode/agendoxa-con03-pr34`, branch head `2188cb2` at start (equal to origin). The original checkout is on `docs/CON-02-api-contracts`, where another agent works; do not modify it.
- Working reference: an untracked local PRD outside the repository's tracked content (`docs/con03-pr34-correction.md` in the original checkout). It is not committed; the decisions it contributes are restated here.
- CON-02 comparison source: [PR #33](https://github.com/nanonoir/Agendoxa/pull/33) at `f3d06e2774cc129aab0503ed3aac67710d727257`, an open proposal, not a merged or collectively approved contract. The initial comparison used `d2b7d77769738b118b09241808bfd1edc50cfbcf`; the final revision was subsequently supplied and pinned.
- References: [integration contracts](../../design-docs/integration-contracts.md), [modules](../../design-docs/modules.md), [ERD](../../design-docs/erd.md), [tenancy](../../design-docs/tenancy.md), [UC-03 business rules](../../product-specs/uc-03/business-rules.md), [UC-03 invariants](../../product-specs/uc-03/invariants.md), [CONTRIBUTING](../../../CONTRIBUTING.md).

## Scope

Included: UC-03 product rules for the agreements below; CON-03 types, prose, examples, scenarios, open questions and traceability for H1–H3; minimal supporting-doc updates only if existing content becomes misleading.

Excluded: runtime code, schema/migrations, PostgreSQL or provider execution, edits to PR #33, CON-01 ownership/dependency changes, new endpoints, P-40 and unrelated INT-Q/TEN-Q/API-Q items. No force push, rebase, squash, attribution change or co-author trailer.

## Decisions

### Product-owner agreements (2026-11-12) to record in UC-03

1. **Verification allocates.** When personnel verify money for a booking (approving its receipt or recording a transfer in the CRM), the funds are allocated to that booking's charge in the same human action, up to the amount owed. Excess or unknown-origin money stays unallocated for manual resolution (BR-COB-15/17). An active booking never holds verified-but-unallocated funds; `AWAITING_ALLOCATION` leaves the booking deposit states and API-Q-13 closes on the product side.
2. **Out-of-band transfers.** The system cannot detect a transfer the customer did not report; only personnel can, by checking the bank. The agent never initiates about it. When reported, the agent correlates the receipt with eligible bookings, asks which one when ambiguous, and routes unbound evidence to personnel when appropriate (BR-SEN-17; INT-Q-02). The money is never treated as received merely because it was reported.
3. **Non-collected supplement.** Personnel with the payments permission may decide not to collect a reschedule supplement, with an optional reason. Paid deposit, price and `CONFIRMED` status are unchanged. The agent says nothing more is owed in advance and the remainder is paid at the appointment, never that the amount was forgiven.
4. **Late receipt and re-booking.** Evidence sent after the deadline is retained for personnel (BR-SEN-16, BR-COB-12); it does not revive the old booking. If verified, it remains unallocated until personnel decide. When available under normal checks, a new booking with a new HOLD and current terms may be offered and the evidence relinked for human verification (BR-SEN-19). Evidence sent in time but arriving after release follows the distinct, guarded reactivation rule in BR-SEN-20 and INV-SEN-16.

### Technical decisions for CON-03

- **H1.** Split `SendOutcome` into `accepted`, `rejected` (provider explicitly refused before acceptance, with a narrow `SendRejectionCode`; only this authorizes the single still-valid retry) and `unknown` (timeout, broken stream, crash, missing correlation; recovery or personnel attention, never automatic resend, including on job redelivery). Do not narrow the general `IntegrationFailure`: screening and media reads keep `timeout`. Provider acceptance is not delivery.
- **H2.** Timeliness uses trusted WhatsApp provider send time (BR-SEN-16). Bound intake and expiry serialize and revalidate under the booking lock, without external I/O inside the transaction. A configurable 15-second expiry-processing margin is not extra customer time. Safe re-blocking after release applies only to expiry closures, subject to availability safeguards; see the reconciliation log. INT-Q-01 remains an implementation gate. INT-E03 describes future concurrency tests, not executed evidence.
- **H3.** Separate customer-safe initial and supplemental projections in `getOwnPaymentStatus`, including `NOT_COLLECTED`, `UNALLOCATED` and reversal handling; unsupported or ambiguous cases fall back to personnel. Align `rescheduleOwnBooking.additionalDeposit`, reported-transfer correlation and late-evidence relinking. Amounts are backend-calculated decimal strings; internal decisions and personnel-only information are not exposed. INT-Q-07 remains an implementation gate.

## Execution plan

1. Create this plan (orchestrator).
2. `specs-writer`: record agreements 1–4 in UC-03 → commit `docs(uc-03): record payment allocation, out-of-band transfer, supplement and late-receipt agreements`.
3. `implementer`: CON-03 H1, H2, H3 in that order → commits `docs(con-03): clarify uncertain messaging outcomes`, `docs(con-03): specify receipt intake concurrency safeguards`, `docs(con-03): reconcile agent financial projections`.
4. `reviewer`: independent review of UC-03 and CON-03 changes; `fix-agent` for concrete findings, then re-review.
5. `archiver`: close and move this plan to `completed/` (own commit).
6. Remote-head check, then push to `docs/CON-03-integration-contracts`.
7. Post COMMENT review on PR #34 summarizing changes, validation, not-run tests and open gates.

## Progress

- [x] Worktree prepared at `2188cb2`; plan created.
- [x] UC-03 agreements recorded and committed (`ddfa1db`). Two pending cases surfaced by the spec step were resolved by the product owner the same day and committed (`fffe471`): payments permission may waive a reschedule supplement in every case, including `FULL_PREPAYMENT` (BR-CAN-10/15); a reported transfer with no booking awaiting a deposit follows the normal flow if a new booking is wanted, otherwise the receipt goes to personnel review without booking changes (BR-AGT-07).
- [x] H1 committed (`c4aa1fb`).
- [x] H2 committed (`7304d6c`).
- [x] H3 committed (`23e2b18`). Proposed names for CON-02 reconciliation (INT-Q-07): `NOT_COLLECTED`, `PERSONNEL_REQUIRED` fallback, `amountOwed`, optional `submitReceiptEvidence.bookingId`, late-receipt relink.
- [x] Final independent review passed (`ses_e30c9ca73ffeM1fAQJmTfU8Frt`), with no material findings.
- [x] Documentary correction plan finalized and archived.
- [ ] Administrative delivery: push, COMMENT review and explanatory PR comment (parent session).

## Validation

Final independent reviewer checked the docs-only range `2188cb2..d678eda`: `git diff --check` clean; nine extracted TypeScript blocks and 20 parsed typed JSON examples passed strict no-emit checking, including the negative ambiguous-send case; 50 local links/anchors, fences, stale IDs and rule-identifier uniqueness checked. Review passed without material findings after the earlier failures and fixes recorded below. Application suites, runtime/provider execution, PostgreSQL concurrency tests and migrations were deliberately not run; future acceptance scenarios are not evidence of execution.

## Reconciliation and review log

- Initial independent reviews rejected the bounded-margin guarantee and ambiguous receipt routing. Corrections `84c8e7a` and `d9d57a8` introduced an explicit relink operation and correlation/fallback handling.
- Product owner subsequently chose WhatsApp provider send time as the timeliness authority and a configurable 15-second expiry processing margin (not additional customer time), replacing the initial trusted-ingress-time proposal. Timely-sent evidence arriving after release may reactivate only deadline-expired bookings, never explicitly cancelled ones; screening precedes reactivation for files, while authorized text evidence goes directly to human review. Unclaimed exclusive waitlist claims may be atomically withdrawn, preserving entry priority. No other occupying or unavailable state may be displaced.
- Product changes: `0a18c78`, `60deae9`, `04bf27a`, `97ccc28`. Contract alignment: `bd8dd92`; occupancy/waitlist review fixes: `eddc0c8`.
- User supplied final CON-02 comparison revision `f3d06e2` and requested reconciliation, including allocation reversal and `UNALLOCATED`, superseding the original deferral of repinning. Exact source links were pinned without assuming merge or collective approval.
- Canonical reconciliation `598e310`: CON-02 identifiers retained for reversal/allocation. PR34 identifiers remapped: BR-AGT-07 → BR-SEN-17 (reported transfers), prior BR-SEN-17 → BR-SEN-19 (late evidence/new booking), prior BR-SEN-18 → BR-SEN-20 (timely late-arrival reactivation), prior INV-SEN-14 → INV-SEN-16 (reactivation safeguards). BR-SEN-18 and INV-SEN-14/15 retain CON-02 meanings. BR-SEN-21 records deposit-condition precedence. Contract/projection reconciliation followed at `d678eda` and passed final independent review.
- Source ambiguity retained, not resolved by invention: wrong-booking reversal says not to request anything from the paying customer, but a qualifying affected booking requires a resend notice; same-person handling remains explicitly open.

## Implementation Outcome

### Implemented

Documentary corrections to UC-03 business rules and invariants and CON-03 integration contracts cover narrow rejected versus unknown sends, receipt/expiry safeguards, and customer-safe payment projections, correlation and relinking. CON-02 references are pinned to its supplied open-proposal revision. No runtime or product workflow was implemented.

### Deviations from Design

The initial ingress-time and unmeasured-margin proposal was replaced by the product owner's provider-send-time choice and configurable 15-second processing margin, with guarded post-release re-blocking. CON-02 repinning, initially deferred, was completed after its final comparison revision was supplied; rule IDs were reconciled as recorded above. Earlier reviews failed and prompted corrections before the final pass.

### Validation

Final independent review passed with no material findings; the documentary checks and deliberate runtime exclusions are listed in Validation above. This is not team approval, a PR merge, or proof of runtime behavior.

### Follow-up

INT-Q-01 and INT-Q-07 remain implementation gates; the same-person wrong-booking reversal notice ambiguity remains open. Runtime/provider/PostgreSQL validation belongs to future implementation. Push and the COMMENT review plus explanatory PR comment remain pending administrative delivery by the parent session.
