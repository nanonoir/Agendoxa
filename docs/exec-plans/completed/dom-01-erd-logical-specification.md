# DOM-01 ERD logical specification

## Objective and context

Complete the DOM-01 ticket scope still missing from [the ERD](../../design-docs/erd.md): attributes, conceptual types, identifiers, keys and integrity constraints for the 38 entities, global versus tenant scope, and explicit compatibility checks against use cases and both verticals. Starting point: commit `36142e0`, independent branch review passed.

Remains **In Review / Proposed**; team approval is a ticket criterion only the team can satisfy.

## Scope and execution

1. Replace the ERD's unstarted Step 3 with a logical specification per entity plus shared conventions.
2. Add the use-case and vertical compatibility checks.
3. Add the missing data-deletion use case (CU-23) to UC-02 and fix the register span in the product index.
4. Validate links, entity inventory, Mermaid, whitespace; obtain one independent review; commit locally. No push, PR or merge without authorization.

Excluded per the ticket: SQL, Drizzle, migrations, repositories, RLS implementation, physical types and indexes. No new entity.

## Decisions

- Keep `docs/design-docs/erd.md` rather than the ticket's `docs/domain/erd.md`: the handoff (F-021) rejected a parallel tree. To be stated in the PR.
- Representations depending on T-01 to T-05 are written as the simplest proposal and marked for architectural validation.

## Progress

- [x] Read the ERD, UC-02 and UC-03 sources.
- [x] Write the specification and checks.
- [x] Validate and review.
- [x] Close this plan and prepare one local commit.

## Validation and outcome

- Read-only checker outside the repository: links and anchors without errors; 38 entity names unchanged, each with one §6 section; every §6 foreign key targets an inventoried entity; F-001–F-023 matrix intact.
- Mermaid 11.12.1 in a temporary browser harness: all diagrams parsed and rendered after the corrections below. No project dependency added.
- `git diff --check` clean. Only Markdown changed.
- Independent reviewer `ses_e570b9b0effeWzkkvaa4bDhXlh` returned PASS WITH FINDINGS, no blockers. All findings were applied directly: precise partial-deposit derivation, policy override cardinality, missing Mermaid relationships, removal of an unsupported tenant status, proposal markers on unsettled values, a deposit-exception attribute and the deletion-window scope. These corrections were not re-reviewed.
- §7 checks are analytical walkthroughs, not executed tests. No application test, build or suite ran.

Ticket coverage: all scope items are addressed except team approval, which only the team can give. T-01 to T-05 stay open for architectural validation. No push, PR or merge performed.
