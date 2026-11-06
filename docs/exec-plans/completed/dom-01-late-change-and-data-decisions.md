# DOM-01 late-change, waitlist-round and personal-data decisions

## Objective and context

Consolidate the product-owner agreements reached after commit `b407264` into canonical documentation, in one new local commit on `docs/DOM-01-audit-reconciliation`. Agreements remain **In Review / Proposed**, not collective team approval or implemented behavior. Earlier handoff and completed plans stay as historical provenance.

## Scope and execution

1. Update [UC-03 rules](../../product-specs/uc-03/business-rules.md), its decision register and [invariants](../../product-specs/uc-03/invariants.md).
2. Align actors, flows, use cases, MVP, ERD, target architecture and the [debt tracker](../tech-debt-tracker.md). Preserve the 38-entity inventory.
3. Check links/anchors, Mermaid, stale assertions and whitespace. No code, schema, dependencies, infrastructure or application suites.
4. Delegate only an independent review, then commit locally. No push, PR or merge.

## Decisions and coverage

Canonical definitions belong in UC-03, not this record.

| Group | Agreed scope | Canonical coverage |
|---|---|---|
| D-15 | Notice defaults to 10 hours, tenant-configurable; late changes proceed after warning and acceptance without Admin; Admin only for exceptions to consequences | BR-CAN-01/03/14; INV-CAN-09; EJ-23; CU-08/09 |
| D-16 | Separate late-changes count, never a no-show and no automatic sanction | BR-CLI-12; INV-CLI-07 |
| D-17 | Tenant deposit policy: no money back or refund possible; AI communicates, personnel manage money manually | BR-SEN-13; P-07 |
| D-18 | Fixed limit of 10 people per queue in the MVP | BR-WL-14; INV-WL-11; CU-05 |
| D-19 | Round behavior: fixed mode, late enrollment, leaving, expired winner HOLD, unclaimed slot, end at start | BR-WL-15; INV-WL-12; CU-06 |
| D-20 | Human supervision accepted as the abuse control | P-24 |
| D-21 | Deletion request by chat: confirmation, immediate block, 30 days to withdraw, automatic deletion; risk accepted pending legal validation | BR-DAT-01–05; INV-DAT-01–02; EJ-54; P-32 |
| D-22 | Payments and receipts of verified payments retained at least 10 years, no automatic deletion | BR-DAT-04; INV-DAT-03 |
| D-23 | No age-based deletion in the MVP; periods recorded as debt, superseding the 90-day purge as an implemented rule | BR-DAT-06; BR-NOT-11; INV-NOT-08; TD-01 |

## Remaining decisions

Open in UC-03: P-28 (late reschedule and lost deposit), P-29 (full-queue message), P-30 (deleting a restricted customer), P-31 (future bookings and pending money on deletion), P-32 (legal validation), plus the legal/reporting portions of P-07 and the ledger representation in P-26. Technical work stays in ERD T-01–T-05.

## Progress

- [x] Consolidate canonical rules, invariants and dependent documents.
- [x] Focused validation.
- [x] Independent review, findings corrected.
- [x] Close this plan and prepare one local commit.

## Validation and outcome

- Read-only checker outside the repository: 23 Markdown files, 409 local links including 231 fragments before the final wording fixes, no missing targets; 38 entity names unchanged and present in Mermaid; F-001–F-023 and D-01–D-14 matrices intact. Re-run before packaging.
- Mermaid 11.12.1 in a temporary browser harness: 26 of 26 diagrams parsed and rendered, including the changed cancel/reschedule diagram. No project dependency added. This proves syntax only, not runtime behavior.
- `git diff --check` clean. No changes to apps, packages, manifests, infrastructure, the handoff or completed plans.
- Independent reviewer `ses_e57296a85ffeEMszKvoS1JriJf` returned NEEDS FIX with one warning, a stale claim in BR-DISP-09 that notice defaults were not agreed, and one suggestion, the missing `DAT` row in the areas table. Both were corrected directly. The corrections are wording only and were not re-reviewed.
- No application test, build or suite ran; the change is documentation only and the behavior is unimplemented.

Delivery is one local commit on the task branch for future review toward `develop`. No push, PR or merge. Team ratification, legal validation and implementation remain separate work.
