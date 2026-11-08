# Technical design documents

This catalog distinguishes proposed technical direction from the [observable architecture](../../ARCHITECTURE.md).

| Reference | Responsibility | Declared status |
|---|---|---|
| [Architecture proposal](./target-architecture.md) | Component boundaries, transactional safeguards, tenant isolation, integrations and operational/testing direction | v1.2; reconciled proposal, team review pending, not implemented |
| [DOM-01 ERD](./erd.md) | 38 candidate entities, relationships, logical attributes and keys, occupancy/financial invariants, compatibility checks and remaining technical choices | In Review; product-owner reconciliation 2026-11-04, team ratification and implementation pending; included in this versioned documentation change |
| [DOM-02 tenancy](./tenancy.md) | Data scopes, same-tenant integrity, users and memberships, tenant context, isolation mechanisms and conditions for a future tenant move | In Review; proposal, team ratification and implementation pending; the ERD changes it needed are applied in DOM-01 |
| [REP-02 persistence increment](./rep-02-core-persistence.md) | Physical core schema, deferred references, T-01/T-05 subset, RLS evaluation and verification boundaries | First increment implemented in the task branch; team review pending; parent issue remains open |
| [CON-01 module boundaries](./modules.md) | Module catalog, data and operation ownership, dependency levels, inter-module communication, NestJS internal structure and integration points for CON-02/CON-03 | In Review; proposal, team ratification pending; no modules implemented |

The [2026-11-04 handoff](../../agendoxa_audit_handoff.md) is historical provenance; later product-owner agreements now in [UC-03](../product-specs/uc-03/business-rules.md) supersede incompatible portions. ERD registers separate agreed behavior from pending physical/provider validation. Neither this reconciliation nor independent review is collective approval, an approved schema or implementation.

## Reading the proposal safely

- Its module trees, infrastructure, and integration diagrams are target designs, not an inventory of implemented code.
- Its behavioral references resolve through the [product catalog](../product-specs/index.md).
- Use `docs/design-docs/` and this catalog for durable technical decisions; do not establish a parallel active collection.
- Preserve context, status, rationale, alternatives, and consequences when recording a significant decision. Do not reconstruct a historical rationale from code alone or resolve a pending product decision in a technical document.

Add future design documents here with their scope and explicit proposal/decision status. [ExecPlans](../PLANS.md) track implementation progress and link to the relevant specifications and designs instead of duplicating them.
