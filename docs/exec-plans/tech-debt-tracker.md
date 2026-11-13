# Technical debt tracker

Product and design open questions remain in their source documents; this tracker holds only concrete agreed debt.

| ID | Area | Evidence / impact | Status | Links |
|---|---|---|---|---|
| TD-01 | Data retention | Age-based automatic deletion is deliberately not implemented in the MVP, so conversations, rejected receipts and technical attempt details accumulate with no end date. Choosing the periods protects the end customer's data. Suggested values: 12 months for conversations, 90 days for attempt details; none yet for rejected receipts. | Open; resolve before operating with real customers | [UC-03 BR-DAT-06](../product-specs/uc-03/business-rules.md#18-personal-data-and-retention-dat) |
| TD-02 | Restrictions and data deletion | A customer who deletes their data and writes again starts with no restriction, no-show or late-change history, so a block can be avoided this way. Accepted edge case for the MVP; keeping the phone to prevent it would need legal support. | Open; review with the legal validation in P-32 | [UC-03 BR-DAT-07](../product-specs/uc-03/business-rules.md#18-personal-data-and-retention-dat) |
| TD-03 | Deposit configuration | The proposed CON-02 API contract requires a configured deposit to be greater than zero (a fixed amount above 0.00, a percentage from 0.01 to 100.00; "no deposit" is only `DISABLED`). The persisted `deposit_value` check in `packages/database` still allows `>= 0`, so the database accepts a zero deposit the proposed API contract rejects. Tighten it in a future migration. | Open; API contract proposed, database allows zero | [UC-03 BR-SEN-03](../product-specs/uc-03/business-rules.md#9-deposits-sen), [CON-02 `DepositRule`](../design-docs/api-contracts.md#73-catalog-services-resources-compatibility-and-policies) |

For each concrete unresolved debt item, record a stable identifier, affected area, evidence/impact, current status, and links to relevant work. Preserve entries and mark resolution with its evidence rather than silently deleting history. See [ExecPlan conventions](../PLANS.md).
