# Technical debt tracker

Product and design open questions remain in their source documents; this tracker holds only concrete agreed debt.

| ID | Area | Evidence / impact | Status | Links |
|---|---|---|---|---|
| TD-01 | Data retention | Age-based automatic deletion is deliberately not implemented in the MVP, so conversations, rejected receipts and technical attempt details accumulate with no end date. Choosing the periods protects the end customer's data. Suggested values: 12 months for conversations, 90 days for attempt details; none yet for rejected receipts. | Open; resolve before operating with real customers | [UC-03 BR-DAT-06](../product-specs/uc-03/business-rules.md#18-personal-data-and-retention-dat) |

For each concrete unresolved debt item, record a stable identifier, affected area, evidence/impact, current status, and links to relevant work. Preserve entries and mark resolution with its evidence rather than silently deleting history. See [ExecPlan conventions](../PLANS.md).
