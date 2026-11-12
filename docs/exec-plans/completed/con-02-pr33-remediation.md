# CON-02 — PR #33 contract remediation

## Objective

Correct the verifiable inconsistencies of the CON-02 API contract proposal in [PR #33](https://github.com/nanonoir/Agendoxa/pull/33), record the product-owner agreements of 2026-11-12 in their canonical sources, and return the PR to a reviewable state with real validation evidence. Deliver additive commits to Agus's existing branch without merging, approving or closing [Issue #11](https://github.com/nanonoir/Agendoxa/issues/11).

Completion criteria:

- FIX-01 to FIX-08 resolved, or explicitly blocked with a recorded reason.
- `api-contracts.md` and `api-contracts.openapi.yaml` express the same contract with consistent examples.
- New business rules are in UC-03 before CON-02 cites them; no other product rule changes.
- Validation actually executed on the final content and reported truthfully.
- Commits pushed to `docs/CON-02-api-contracts`; one PR review (event `COMMENT`, not `APPROVE`) and one explanatory PR comment posted. Agus re-reviews and merges.

## Context

- Branch `docs/CON-02-api-contracts` → `develop`, PR author AgustindelosReyes. Head at start `d2b7d77769738b118b09241808bfd1edc50cfbcf`, unchanged since [Gonzalo's review](https://github.com/nanonoir/Agendoxa/pull/33#issuecomment-6806679879); the branch already contains the CON-01 consolidation (`c49579e`).
- User authorized on 2026-11-12: editing and committing on this branch, pushing after a passing independent review and archive, and posting the review and comment.
- Working reference (untracked, never committed): `docs/CON-02-PR33-REMEDIATION.md`.
- Sources: [api-contracts.md](../../design-docs/api-contracts.md), [OpenAPI](../../design-docs/api-contracts.openapi.yaml), [UC-03 rules](../../product-specs/uc-03/business-rules.md), [UC-03 invariants](../../product-specs/uc-03/invariants.md), [ERD](../../design-docs/erd.md), [tenancy](../../design-docs/tenancy.md), [CON-01 modules](../../design-docs/modules.md), [CONTRIBUTING](../../../CONTRIBUTING.md).
- Related: PR #34 (CON-03) pins CON-02 at `d2b7d77`; its INT-Q-07 already lists these reconciliation items (`2188cb2`). Repinning PR #34 is a later, separate step.

## Scope

### Included

- FIX-01: separate current required deposit, historical initial requirement, verified funds, allocated funds and requested supplement; remove the `requiredDeposit = initial + supplement` equation.
- FIX-02: first cash opening (decision below).
- FIX-03: audit every operation returning cross-owner projections; per case either reduce the DTO to owner data or declare post-command read composition above owners per CON-01, without a multi-owner mutation or false atomicity.
- FIX-04: `DepositInput` requires `evidence` or non-empty `allocations`; `declaredAmount` only with `evidence`.
- FIX-05: `DepositRule` discriminated by `mode` (`DISABLED` / `FIXED` / `PERCENTAGE` 0.00–100.00); keep `null` = inherit in overrides.
- FIX-06: per-operation response matrix; add `403` only where a permission is checked, `409` idempotency conflicts on POSTs with `Idempotency-Key`.
- FIX-07: `RescheduleResult.supplementalDeposit` required and nullable; check analogous response DTOs changed by the PR.
- FIX-08: correct §15 claims (lines ~1306 vs ~1314 contradict) to state only executed checks.
- D-4: short per-operation table for multi-owner commands (participants, preconditions, result, errors); code-level participant contracts delegated to [#31](https://github.com/nanonoir/Agendoxa/issues/31).
- UC-03 updates for the new rules; ERD proposed public address field.

### Excluded

Runtime code, `packages/shared` Zod, migrations, CON-03 edits, PR #34, the 77-endpoint implementation, other open API-Q items, the `modules.md` status label, Issue/Project changes.

## Decisions (product owner, 2026-11-12)

1. **Cash first opening.** The first session of a tenant is opened manually with an explicit `openingAmount`. A cash `POST /payments` with no open session and no prior close returns `409 cash_session_not_open`. Afterwards configured automatic opening uses the prior counted close. Already implied by BR-CAJA-03; no UC-03 change.
2. **Verification allocates.** When personnel verify money for a booking (approving its receipt or recording a transfer directly in the CRM), the funds are allocated to that booking's charge in the same human action, up to the amount owed. Excess or unknown-origin money stays unallocated for manual resolution (BR-COB-15/17). An active booking never holds verified-but-unallocated funds; `AWAITING_ALLOCATION` leaves `depositState`; API-Q-13 closes.
3. **Customer reports a transfer without evidence.** The agent cannot detect out-of-band money and never messages first. When the customer writes, it looks up their bookings: none → normal booking flow with receipt request; a personnel-created booking → asks for the receipt, links it to that booking and sends it to human verification; several awaiting a deposit → asks which. It never treats money as received.
4. **Non-collected supplement.** Personnel with the payments permission may decide not to collect a reschedule supplement; reason optional. Recorded immutably with actor, time and waived amount; idempotent, cannot be applied twice. Paid deposit, price and `CONFIRMED` status unchanged; it creates or alters no payment; the remainder is price minus valid allocations, paid at the appointment. Closes API-Q-16.
5. **Multi-owner contracts (D-4).** Minimal table in CON-02; implementation detail in #31.
6. **Landing location (D-7 / API-Q-01).** Public business address text plus optional Maps link in the tenant public profile; proposed ERD addition, not migrated.
7. **WhatsApp link (D-6 part).** Built from the tenant's connected WhatsApp number (`wa.me`).

8. **Supplement closure permission.** `closeSupplementalDepositWithoutCollection` (BR-CAN-15) requires `payments.allocate`; no longer a placeholder for this operation (API-Q-02 stays open for the general catalog).
9. **API-Q-18 closed.** A supplemental request whose evidence is under human review cannot be closed without collection; the review is resolved first (`409 state_changed`). Reflected in BR-CAN-15, INV-CAN-10, CON-02 and OpenAPI.
10. **Cash allocates like a transfer.** Cash recorded for a specific active booking is allocated to that booking's charge in the same human action, up to the amount owed; excess stays unallocated (BR-COB-15/17). The first-cash `409 cash_session_not_open` (decision 1) is unchanged. Applied in BR-SEN-07, INV-SEN-14, CU-11 step 4, CON-02 §7.8 and OpenAPI `recordPayment`/`RecordPaymentRequest`.
11. **Deposit above zero.** A configured deposit is always greater than zero; "no deposit" is only `DISABLED` (BR-SEN-03). OpenAPI `DepositRule`: FIXED > 0.00, PERCENTAGE 0.01–100.00; `null` = inherit unchanged. The persisted `deposit_value >= 0` check is not changed; the gap is TD-03 in the tech-debt tracker. Also recorded: new open question API-Q-19 (`createCustomerIncident` `bookingId` ownership), no change in this PR.

12. **Reversal below the deposit threshold (closes API-Q-14).** When personnel reverse an allocation and a `CONFIRMED` booking that has not started drops below its initial-deposit threshold (fully or partially, e.g. a deposit approved by mistake), the booking returns to `PENDING_PAYMENT_REVIEW` (unconfirmed, still occupying) and the customer receives a system notice, triggered by the personnel action and not detected by the AI, asking them to send the receipt again. Unlike a first human rejection there is no 15-minute window, no expiry and no automatic release: the slot is held until personnel resolve it manually (re-confirm, collect, or cancel). If the money arrived but was allocated to the wrong booking, the fix is reversal plus a normal allocation to the right booking; nothing is rejected and the paying customer is told nothing. A started or completed booking keeps its status; Admin exceptions and the supplemental deposit are unaffected. New allowed transition `CONFIRMED → PENDING_PAYMENT_REVIEW` by personnel reversal; seven statuses preserved. Applied (fix-agent, 2026-11-12) in UC-03 BR-SEN-18, INV-SEN-15 and INV §2.1 (diagram, table, prohibitions, occupying states); CON-02 API-DM-12/13/18/24/25, §7.7, §7.8, §10, §13, §16; OpenAPI `reversePaymentAllocation` (now `workflows`: `payments`, `bookings`, `notifications`; returns `AllocationResult`; `409 state_changed`) and `DepositState`. `depositState` mapping: `PARTIAL` while a valid allocation remains (existing definition fits); new additive value `UNALLOCATED` when none remains, no evidence is in review and there is no Admin exception (`AWAITING_EVIDENCE` is a HOLD with a deadline and `CORRECTION_WINDOW` a timer, so neither fits). Refined after re-review (technical direction, no product change): `depositState` describes allocations against the threshold and the evidence, not booking status, so `PARTIAL` is status-neutral and a started or completed booking whose status a reversal keeps shows `PARTIAL` or `UNALLOCATED`, never a stale `MET`; the first name `AWAITING_RESEND` was dropped because it would be false for a started booking (no resend is sent once started). `rejectPaymentReview` excludes evidence resent after a reversal from the correction window and cancellation. Proposed for team review, not ratified.

Not reopened: no public web booking, human-only credit verification, seven `booking_status` values, no Mercado Pago/bank API, P-40 open.

## Execution plan

1. Verify branch/head; create this plan. *(done)*
2. `specs-writer`: decisions 2–4 in UC-03 business rules/invariants with minimal change and provenance.
3. `implementer`: FIX-01–08 and decisions 1, 4–7 in CON-02 MD + OpenAPI; ERD address proposal; bump `info.version`; reconciliation log; validation run.
4. `reviewer`: independent requirement/design and quality review.
5. `fix-agent` for concrete findings, then re-review until PASS or a recorded blocker (blocker → stop, no push).
6. `archiver`: outcome, move plan to `completed/`.
7. Commits, remote-head check, push, PR review (`COMMENT`) and comment; readback.

## Progress

- [x] Branch `docs/CON-02-api-contracts` checked out, fast-forward up to date at `d2b7d77`; plan created.
- [x] UC-03 updates and UC-01/UC-02 alignment applied.
- [x] Decisions 8–11 applied (fix-agent, 2026-11-12) in UC-03 (BR-SEN-03, BR-SEN-07, BR-CAN-15, INV-SEN-14, INV-CAN-10), UC-02 CU-11 step 4, `api-contracts.md`, OpenAPI and TD-03; revalidated (see Validation).
- [x] CON-02 / OpenAPI / ERD corrections and validation (implementer, 2026-11-12): FIX-01 to FIX-08 and decisions 1, 4–7 applied in `api-contracts.md` (API-DM-21 to API-DM-26, §13–§16), `api-contracts.openapi.yaml` (`0.4.0-proposal`, 78 operations) and the proposed `public_address`/`public_maps_url` in `erd.md`; `design-docs/index.md` rows refreshed. Open items recorded in the document: API-Q-18 and placeholder permission `payments.allocate`. The UC-03 ID collision (new allocation invariant also numbered INV-SEN-12) was fixed by the orchestrator: the allocation invariant is now INV-SEN-14 and its CON-02/OpenAPI citations were updated; screening citations keep INV-SEN-12.
- [x] Independent-review findings fixed (fix-agent, 2026-11-12): (1) `api-contracts.md` §7.10 Opening now says `409 cash_session_not_open` applies only with no open session and no earlier counted close; once the first session is opened manually, cash is accepted in it (matches Decision 1 and OpenAPI `recordPayment`). (2) UC-03 INV-SEN-14 reworded: the verification action allocates the amount applicable to the outstanding charge; excess, unmatched money and funds freed by an allocation reversal stay unallocated (BR-COB-15/17); CON-02 API-DM-13 `depositState` note and API-Q-13 row aligned (no absolute "never holds"); deposit states follow allocations only, so a reversal lowers `deposit.allocated` and no new state is needed. BR-SEN-07 and the OpenAPI already carried no absolute wording.
- [x] Decision 12 applied (fix-agent, 2026-11-12) after an independent-review finding: API-Q-14 closed; UC-03, CON-02 and OpenAPI updated as listed in the decision; revalidated (see Validation).
- [x] Decision 12 re-review findings fixed (fix-agent, 2026-11-12): (1) OpenAPI `rejectPaymentReview` description now carries the reversal-origin exception (no window, no cancellation, `bookingEffect: NONE`); (2) `depositState` made status-neutral: `PARTIAL` redefined, `AWAITING_RESEND` replaced by `UNALLOCATED` in CON-02 and OpenAPI, claim that every reversal lowers `deposit.allocated` qualified, `InitialDeposit.allocated` and §10 projection text aligned; revalidated.
- [x] Decision 12 second re-review finding fixed (fix-agent, 2026-11-12): `depositState` now has one explicit first-match precedence (`NOT_REQUIRED`, `ADMIN_EXCEPTION`, `MET`, `UNDER_REVIEW`, `CORRECTION_WINDOW`, `PARTIAL`, `UNALLOCATED`, `AWAITING_EVIDENCE`) in API-DM-13 and the OpenAPI `DepositState` description, checked pair by pair with no adjustment needed; `deposit.allocated` stays visible whatever state is selected; the "in every case" sentence qualified. Technical decision, no product change.
- [x] Independent review PASS WITH MINOR; the remaining minor was corrected afterward by the orchestrator.
- [x] Archive remediation plan; proposal remains subject to team review.
- [ ] Delivery by orchestrator: commit, push, PR review and comment. Evidence belongs in the PR comment/handoff, not a self-referential commit hash in this plan.

## Validation

Executed 2026-11-12 on the final OpenAPI/MD content (scripts kept outside the repository): Redocly CLI 2.77.0 via `pnpm dlx --package=@redocly/cli@latest redocly lint docs/design-docs/api-contracts.openapi.yaml` (pnpm 12.16.1) — valid, 0 errors, 1 warning (`info-license`, left on purpose). Ajv 8.20.0 (2020-12) + ajv-formats 3.0.1: 135 component schemas compile; 259 example attachments (27 component examples, all used) and 26 §8 examples valid and identical; 84 fixtures (34 valid accepted, 50 invalid rejected). Structure: 989 `$ref`, 78 unique `operationId`, path params, tags, CSRF via `security` (41), `Idempotency-Key` and `409` on 25 keyed POSTs, `403` coverage — all pass. Links: 381 local links in 3 files, 0 broken. `git diff --check` clean (tracked changes). FIX-07 audit: no nullable-but-optional property in 99 response-reachable schemas. Not run: application/E2E/DB tests, Zod conversion.

Re-run after decisions 8–11 (2026-11-12, final content): Redocly CLI valid, 0 errors, 1 warning (`info-license`). Ajv: 135 schemas compile; 259 example attachments and 26 §8 examples valid; 91 fixtures (37 valid accepted, 54 invalid rejected) including `DepositRule` FIXED 0.00 and PERCENTAGE 0.00 rejected, PERCENTAGE 0.01 and 100.00 accepted. Structure checks (989 `$ref`, 78 operations, 41 CSRF, 25 keyed POSTs) pass. Links: 388 in `api-contracts.md`, `erd.md`, `index.md` and 589 across 8 changed files, 0 broken. `git diff --check` clean.

Re-run after Decision 12 (2026-11-12, final content): Redocly CLI valid, 0 errors, 1 warning (`info-license`). `validate2.mjs` (invoked as `node validate2.mjs <openapi.yaml> <api-contracts.md>` from the scripts directory): ALL CHECKS PASSED — 989 `$ref`, 78 operations, 135 schemas compile, 259 example attachments valid, 91 fixtures (37 valid accepted, 54 invalid rejected). Superseded by the re-run below on the status-neutral `UNALLOCATED` content (fixtures 98: 41 valid accepted, 57 invalid rejected, including `UNALLOCATED`/`PARTIAL`, the discarded `AWAITING_RESEND` and the `AllocationResult` of `reversePaymentAllocation`; Redocly valid, 0 errors, 1 `info-license` warning; Ajv ALL CHECKS PASSED). Links: 446 in 6 changed files (CON-02, ERD, index, UC-03 rules and invariants, this plan), 0 broken. `git diff --check` exit 0 (CRLF warnings only).

Re-run after the precedence fix: see the results recorded in §15 of `api-contracts.md` (Redocly, `validate2.mjs`, links and `git diff --check`, run on the final content; fixtures 100: 43 valid accepted, 57 invalid rejected).

After the orchestrator's final Markdown correction, 2026-11-12: `node %TEMP%\con02val\links.mjs <repoRoot> docs/design-docs/api-contracts.md` checked 361 local links, 0 broken; `git diff --check` passed with CRLF warnings only. The external scripts reside in `%TEMP%\con02val`.

Originally planned: Redocly CLI lint on final OpenAPI (record version); Ajv 2020-12 with `ajv-formats` over all examples plus negative fixtures for FIX-04/05/07 and money formats (scripts kept outside the repository); `$ref`, unique `operationId`, path parameters, tags, CSRF and `Idempotency-Key` checks; local Markdown links/anchors; `git diff --check` including untracked files. No application, E2E or database tests: documentation-only change.

## Final implementation outcome

### Implemented

FIX-01–FIX-08 and product-owner Decisions 1–12 are reflected in the CON-02 Markdown and OpenAPI `0.4.0-proposal` (78 operations). The proposal adds `closeSupplementalDepositWithoutCollection`, makes `reversePaymentAllocation` a `workflows` command, and defines status-neutral `depositState` with `UNALLOCATED`, without `AWAITING_ALLOCATION`, and explicit first-match precedence. API-Q-13, API-Q-14, API-Q-16 and API-Q-18 were closed.

UC-03 BR-SEN-03/07/17/18, BR-CAN-15, INV-SEN-14/15, INV-CAN-10 and the personnel-reversal transition `CONFIRMED → PENDING_PAYMENT_REVIEW` were reconciled, along with UC-01/UC-02 and proposed ERD `public_address`/`public_maps_url` fields. These are proposals incorporating product-owner agreements of 2026-11-12, not team ratification or runtime implementation.

### Deviations from design

Independent review led to Decision 12 and the status-neutral reversal state and precedence rules beyond the original plan; these resolve the discovered ambiguity without changing the seven booking statuses. The allocation invariant was renumbered INV-SEN-14 to resolve an ID collision. Delivery was sequenced after archiving and remains pending rather than being claimed as completed here.

### Validation

Independent review initially failed on first cash session wording and the INV-SEN-14 contradiction; subsequent reviews identified the undefined reversal deposit state, rejection-after-reversal and stale `MET` for started bookings, then state precedence. Each was corrected. Final verdict: PASS WITH MINOR; the orchestrator subsequently corrected the supplemental-deposit row that incorrectly implied `PARTIAL`/`UNDER_REVIEW` meant unconfirmed.

Final recorded validation: Redocly CLI 2.77.0 valid, zero errors and one intentional `info-license` warning; Ajv 8.20.0 with ajv-formats 3.0.1 compiled 135 schemas, validated 259 example attachments and passed 100 fixtures (43 valid accepted, 57 invalid rejected). The 989 `$ref` and structure checks passed; 446 local links in changed files had zero broken. Post-correction link and diff checks are recorded above. No application, E2E or database tests were run for this documentation-only change.

### Follow-up

API-Q-19 (cross-owner `bookingId` verification), API-Q-02 (general permission catalog) and API-Q-10 (composition placement) remain open. BR-SEN-18 resend notice wording and channel are deferred to CON-03/notifications. TD-03 tracks the database's zero-deposit allowance against the proposed API contract. PR #34 must repin CON-02 references to the final PR #33 revision and reflect these agreements; its INT-Q-07 already lists them. The orchestrator will deliver the commits and PR comments; Agus's re-review and team approval/merge of PR #33 remain pending.
