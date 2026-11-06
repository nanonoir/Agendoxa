# DOM-01 follow-up product-owner decisions

## Objective and context

Consolidate the follow-up conversation after commit `901eab2` into canonical documentation, then create one new local commit on `docs/DOM-01-audit-reconciliation`. Starting working tree is clean. Earlier handoff and completed reconciliation plan remain historical provenance, not current competing specifications. Agreements remain **In Review / Proposed**, not collective team approval or implemented behavior.

## Scope and execution

1. Update [UC-03 rules](../../product-specs/uc-03/business-rules.md) and its decision register; align [invariants](../../product-specs/uc-03/invariants.md).
2. Align actors, flows, detailed cases, MVP, conceptual ERD and architecture/catalog references. Preserve the 38-entity inventory; explicitly distinguish exclusive priority from nonexclusive claim invitations.
3. Check Markdown links/anchors, Mermaid parsing/rendering, decision coverage, stale assertions and whitespace. No code, schema, dependencies, infrastructure or full application suites.
4. Delegate **only independent review**, apply any corrections directly, close this plan directly (explicit user delegation restriction), and commit locally. No push, PR publication or merge.

## Decisions and review coverage

The current conversation is the provenance for these groups. Canonical definitions belong in UC-03, not this execution record.

| Group | Agreed scope | Canonical coverage |
|---|---|---|
| D-01 | Outcome corrections both ways; permission, mandatory reason/history; completion from start, no-show from start + 15 minutes | BR-RES-10–12; INV-RES-02/08; CU-10; EJ-52 |
| D-02 | CRM blocked-customer exception for anyone permitted to create bookings; warning, attribution, restriction unchanged | BR-CLI-09; INV-CLI-03; actors matrix; CU-02 A5 / CU-12 |
| D-03 | Resource preference order or rotation, selected by tenant; minimum attendee name only | BR-DISP-05 / BR-CLI-03; CU-01/04; P-03/23 |
| D-04 | Booking lead time configurable, default zero, never past start; future-booking limit disabled by default, counts occupying future bookings including third parties | BR-DISP-09 / BR-CLI-10; INV-DISP-09; MVP §6.3 |
| D-05 | One consent question, four options, retained preferences changeable in chat; independent scopes, no repeated prompts; CRM confirmation with phone/channel | BR-NOT-09/12 / BR-AUD-03; INV-NOT-07/08; CU-05/19; ERD DM-16 |
| D-06 | Waitlist range expiry; 1–4 eligible people progressive invitations after first exclusive five minutes; 5+ simultaneous; late claims, one atomic HOLD, payment instructions only to winner | BR-WL-06–13; INV-WL-01–10; CU-06; EJ-30/50; ERD DM-08 |
| D-07 | Confirmed send failure gets one retry; then advance, retain entry; clear audience-specific invitation and taken-slot messages | BR-WL-10/13; CU-06/16; INV-WL-07; EJ-32 |
| D-08 | PDF/image evidence first, text only on explicit inability; multiple partial deposits, verified partial occupancy has no automatic release | BR-SEN-09–12; INV-SEN-09–11; CU-03; EJ-51 |
| D-09 | Explicit authorized cancellation releases immediately, financial review continues separately; reusable credit/manual refund, no automatic refund/rebooking; operational business cancellation by cancellation-capable personnel | BR-CAN-04/06; INV-CAN-07/08; CU-08; EJ-24 |
| D-10 | Cash session survives midnight until manual close | BR-CAJA-11; INV-CAJA-09; CU-13; ERD §2.6 |
| D-11 | Sequential business-account rotation; three collection modes, default all professional, business fallback; immutable instructions, no automated commissions/distribution; preserve client credit on professional change | BR-SEN-06 / BR-COB-19/20 / BR-CAN-13; INV-PAY-11; CU-09/15; ERD DM-11; EJ-53 |
| D-12 | Audited financial recording corrections, recomputed balance, no automatic cancellation/refund; closed physical cash Admin-only | BR-COB-21; INV-PAY-12; CU-11; ERD T-03 |
| D-13 | Durable send intentions and attempt tracking; recover unknown outcome before resend, no automatic uncertain resend; sent/delivered/read are not failures; stale offers never freeze slots | BR-NOT-04/10; INV-NOT-05; CU-16; architecture §10.3; ERD T-04 |
| D-14 | Attempt technical details retained 90 days, final notice result retained; other data retention separate | BR-NOT-11; INV-NOT-08; CU-16; ERD §2.8/T-04 |

## Progress

- [x] Inspect Git and read contribution/planning guidance and canonical sources.
- [x] Consolidate canonical rules/register, invariants, actors/flows/cases, MVP, ERD and architecture/catalog references.
- [x] Initial focused checks: links/anchors, inventory, D-01–14 matrix and all Mermaid diagrams.
- [x] Independent review PASS; primary applied the sole nonblocking source-order suggestion in CU-06 Mermaid.
- [x] Close/archive this plan directly and prepare one documentation-only local commit; Git history records the delivery hash.

## Validation and outcome

## Validation evidence

- Read-only checker outside the repository: `node C:/Users/Nahuel/AppData/Local/Temp/opencode/agendoxa-dom01-validation/check-docs.cjs`. Initial pass: 22 Markdown files, 391 local links / 221 fragments, zero missing targets; 38 unique entity names match the original inventory and all appear in Mermaid; original F-001–23 matrix intact and all D-01–14 coverage rows present. No duplicate rule/invariant definitions.
- All 26 Mermaid blocks parsed and rendered to SVG using Mermaid 11.12.1 in a temporary local browser harness; no project dependency installation/change. This proves syntax/renderability, not runtime transaction correctness or visual polish.
- Additional read-only checks: 486 explicit BR/INV references resolve to existing definitions; all 73 Markdown tables in modified tracked documents have consistent column counts. Targeted searches of current product/design documents found no stale assertions that P-05/P-06/P-16 remained pending, automatic deposit forfeiture, or unchosen rotation/attempt-retention policy.
- `git diff --check`: passed. Scope check for apps/packages/dependencies/.github/infra examples: empty; only Markdown changed. Original handoff and completed reconciliation plan match `901eab2` (ignoring line endings); no rewriting historical agreements.
- Only one delegated task: independent read-only reviewer `ses_e578043b5ffeF8cTJ0dYTeJL0Q`, **PASS**, no blocking issues across D-01–D-14. Its only suggestion (declare the winner node label before using it in CU-06) was applied directly. Primary performed all edits, validation, archival and local delivery under the user's explicit restriction.
- Post-review Mermaid check: all 26 diagrams parse/render again under 11.12.1, zero failures. Browser harness is external to the repository; task-owned server/browser and generated recordings are cleaned up before delivery. No application test/build/full suite: documentation-only, product behavior remains unimplemented. Final staged/link/whitespace checks are required as part of local packaging.

## Remaining decisions and outcome

Remaining product portions are UC-03 P-01 (cancellation/reschedule notice defaults, not the now-resolved booking lead time), P-07 (legal/reporting), P-19 (queue-size caps/round detail), P-24 (further abuse controls) and P-26 (legal/financial ledger detail). Physical representation of progressive/broadcast invitations and reusable preferences, financial correction history, concurrent account selection, actual provider reconciliation capabilities and retention of other data remain explicitly bounded in ERD T-01–T-05. No new product defaults were invented for them.

## Final outcome

Consolidated all 14 agreement groups in canonical UC-03 and aligned actors, narrative flows, detailed use cases, invariants, MVP, conceptual ERD, target architecture and catalogs/agent orientation. Preserved 38 entity names, stable BR/INV identifiers, original handoff and prior completed plan. No application/dependency/schema/infra changes, no additional delegate or invented implementation approval. Independent review passed; remaining product/technical portions above are explicit, not hidden blockers to this documentation-only delivery.

Delivery is one new local commit after `901eab2` on the existing task branch, targeting future review toward `develop`. No push/PR/merge authorized or performed; team ratification and physical schema/runtime implementation remain separate work. Preserved original-input and unrelated stashes without modification.
