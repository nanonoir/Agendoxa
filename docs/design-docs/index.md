# Technical design documents

This catalog distinguishes proposed technical direction from the [observable architecture](../../ARCHITECTURE.md).

| Reference | Responsibility | Declared status |
|---|---|---|
| [Architecture proposal](./target-architecture.md) | Target component boundaries, dependency direction, transactional safeguards, tenant isolation, integrations, and operational/testing direction | v1.1; updated architecture proposal for team review |

The proposal is preserved in this catalog. Its internal “adopted” wording and final summary are not independent evidence of team approval; this harness does not promote them to approved decisions. No separate approved ADRs or historical decision records were found.

## Reading the proposal safely

- Its module trees, infrastructure, and integration diagrams are target designs, not an inventory of implemented code.
- Its behavioral references resolve through the [product catalog](../product-specs/index.md).
- Its suggested `docs/adr/` location is part of the preserved proposal, not an existing ADR collection. Use `docs/design-docs/` for new durable technical decisions under this harness; do not establish a parallel active catalog.
- Preserve context, status, rationale, alternatives, and consequences when recording a significant decision. Do not reconstruct a historical rationale from code alone or resolve a pending product decision in a technical document.

Add future design documents here with their scope and explicit proposal/decision status. [ExecPlans](../PLANS.md) track implementation progress and link to the relevant specifications and designs instead of duplicating them.
