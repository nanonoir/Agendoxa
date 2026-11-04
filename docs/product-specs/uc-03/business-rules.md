# UC-03 — Business Rules

> **Status:** In Review — product-owner reconciliation 2026-11-04; not collective team approval and not implemented. The [handoff](../../../agendoxa_audit_handoff.md) supersedes incompatible earlier proposals.
> **Objective:** Turn the agreed product decisions into verifiable business rules: what must hold and who may do it.
> **Scope:** Channels, tenants, role-based permissions, customers, catalog, availability, booking lifecycle, cancellation and rescheduling, deposits, charges and payments, cash register, waitlist, AI and human handoff, notifications and audit.
> **Out of scope:** Tables, enums, endpoints, DTOs and screens (DOM-01, DOM-02, CON-XX). Where each rule is guaranteed (database, transaction, job) is in [invariants.md](./invariants.md).
> **References:** [UC-01 actors](../uc-01/actors.md), [UC-01 flows](../uc-01/flows.md), [UC-02 use cases](../uc-02/use-cases.md), [MVP definition](../mvp.md) and [target architecture](../../design-docs/target-architecture.md) are complementary proposals; incompatible earlier text is superseded by the handoff. The implemented system is described in [`ARCHITECTURE.md`](../../../ARCHITECTURE.md); `rules.md` is not stored here (see [§17](#17-differences-with-earlier-documents)).
> **Closing condition:** Team review of this document together with UC-02; product-owner resolutions and remaining questions are recorded in [§16](#16-pending-decisions).

## 0. How to Read This Document

- Each rule has an identifier `BR-<AREA>-NN` and an **origin**:
  - `ACT` / `FLW` / `CU-XX`: [actors.md](../uc-01/actors.md), [flows.md](../uc-01/flows.md) or a use case in [use-cases.md](../uc-02/use-cases.md).
  - `MVP §x` / `ARQ §x`: a section of [`mvp.md`](../mvp.md) v0.3 or of the [target architecture](../../design-docs/target-architecture.md) v1.2. `MVP §6.3.n` is item *n* of the invariant list in `mvp.md` §6.3; `ARQ §13.n` is outcome *n* of the target architecture §13. `ARQ` never refers to `ARCHITECTURE.md`, which describes what is implemented today.
  - `RG-XX`: a rule from `rules.md` that is still valid. `rules.md` is a team document from 30/10/2026 that is **not stored in the repository**; RG citations are kept only for traceability.
  - **Proposal**: an interpretation needed to make the rule implementable. **It is not an agreed decision** and must be validated in review.
- Pending decisions are `P-NN` in [§16](#16-pending-decisions). Their numbering is kept from the first draft; resolved ones stay listed with their resolution.
- State names (`HOLD`, `PENDING_PAYMENT_REVIEW`, `CONFIRMED`, `EXPIRED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`) are **conceptual** (MVP §6.1, ARQ §9.1), not persisted enums. Their transitions are in [invariants.md §2](./invariants.md#2-booking-lifecycle).

### Areas

| Area | Prefix | Logical module (ARQ §6.1) |
|---|---|---|
| Channels | `CH` | — (cross-cutting) |
| Tenants and isolation | `TEN` | `tenants` |
| Personnel, roles and privileges | `IAM` | `identity` |
| Customers, requesters and attendees | `CLI` | `customers` |
| Catalog | `CAT` | `catalog` |
| Availability | `DISP` | `availability` |
| Booking lifecycle | `RES` | `bookings` |
| Cancellation and rescheduling | `CAN` | `bookings` |
| Deposits | `SEN` | `bookings` + `payments` |
| Charges, balances and payments | `COB` | `payments` / `billing` |
| Cash register | `CAJA` | `cash-register` |
| Waitlist and exclusive offers | `WL` | `waitlist` |
| AI agent | `AGT` | `agent` + `messaging` |
| Human handoff | `HND` | `messaging` |
| Notifications and consent | `NOT` | `notifications` |
| Audit | `AUD` | — (cross-cutting) |

## 1. Channels (`CH`)

| ID | Rule | Origin |
|---|---|---|
| BR-CH-01 | **Individual WhatsApp chats are the only customer self-service channel**: consult, book, confirm, cancel, reschedule, send receipts, join the waitlist and manage consent. | ACT-01; FLW Shared Rules; MVP §5.2 |
| BR-CH-02 | The landing page is **informational**: business identity, services, location, hours and a WhatsApp CTA. It has no availability calendar, booking form, checkout or customer accounts. | MVP §7.2; ARQ §3; RG-02 |
| BR-CH-03 | A Google Business Profile/Maps link to WhatsApp may be configured **manually**; there is no Google API integration. | EXT-04; MVP §5.2 |
| BR-CH-04 | Authenticated personnel operate through the **mobile-first CRM**, including walk-in bookings. | ACT-03; MVP §7.1 |
| BR-CH-05 | CRM and WhatsApp invoke **the same tenant-scoped use cases**. A channel may add its own validation before the use case, but never different availability, state or payment rules. | FLW Shared Rules; ARQ §6.4; RG-05 |
| BR-CH-06 | A WhatsApp/Evolution outage interrupts customer self-service and outgoing messages only; **the CRM and the booking core keep working**. | actors.md §5; MVP §3.5; ARQ §10.2 |
| BR-CH-07 | The AI handles **text and images** in individual chats. Voice notes and group chats are out of the MVP. | SYS-01; MVP §8.1 |

## 2. Tenants and Isolation (`TEN`)

| ID | Rule | Origin |
|---|---|---|
| BR-TEN-01 | Every operational record belongs to **one tenant**: customers, bookings, waitlist entries and offers, charges and payments, receipts, cash sessions and movements, restrictions, consents, conversations, messages, channel connections, jobs and audit records. | MVP §6.2; ARQ §8.2 |
| BR-TEN-02 | The tenant of an operation comes from a **validated context**: the authenticated user's membership or the validated WhatsApp connection. A tenant ID or subdomain sent by a client **selects context; it does not authorize**. | MVP §6.2; ARQ §8.2 |
| BR-TEN-03 | A record may reference only records **of the same tenant** (a booking never points to another tenant's resource, service or customer). | ARQ §8.2 |
| BR-TEN-04 | Each tenant configures its **timezone**; every calendar rule (hours, "booking day", notice periods, reminders) is evaluated in it, and instants are stored unambiguously. | MVP §6.3.1; ARQ §9.1 |
| BR-TEN-05 | Integration credentials and connection settings are never exposed to the browser, the LLM context, logs or the repository. | ARQ §8.2 |
| BR-TEN-06 | Identifiers are stable (preferably UUID) to keep a future tenant export possible. Export/import is **not** built in the MVP. | MVP §6.2; ARQ §8.3 |
| BR-TEN-07 | A person may have **different roles in different tenants**; customer records, incidents and restrictions are per tenant. | actors.md §1.1; ARQ §8.2 |
| BR-TEN-08 | The technical operator has **no default business authorization** to view or change bookings, customers or payments. | ACT-06; ARQ §8.2 |

## 3. Personnel, Roles and Privileges (`IAM`)

| ID | Rule | Origin |
|---|---|---|
| BR-IAM-01 | A global personnel user joins tenants through memberships; each membership has exactly one tenant-local role. Permissions come only from that role, never direct member grants. | Handoff F-001 |
| BR-IAM-02 | Tenants may define custom roles; `Staff` is editable. `Admin` has full access, cannot be deleted or reduced, and the last active Admin is protected. Customers have no CRM access. | Handoff F-001 |
| BR-IAM-03 | Operational permissions, including booking, payment verification, restrictions and conversation handling, are assigned through roles from the system permission catalog; backend authorization checks effective permissions. | Handoff F-001 |
| BR-IAM-04 | Admin-only, non-delegable operations include role administration, commercial-policy exceptions, post-close adjustments, refunds and changes to agreed prices. | Handoff F-001 |
| BR-IAM-05 | Cash and availability permissions may be assigned to tenant roles, not individuals; these do not grant commercial-policy exceptions. | Handoff F-001 |
| BR-IAM-06 | Disabling a member **preserves the historical attribution** of everything they did. | CU-15 |
| BR-IAM-07 | The AI acts **only in the requester's context**. A human joining the conversation grants the AI no Staff/Admin permission. | SYS-01; actors.md §2 (invariant 6) |

## 4. Customers, Requesters and Attendees (`CLI`)

| ID | Rule | Origin |
|---|---|---|
| BR-CLI-01 | Over WhatsApp, the **requester** is identified by the **sender number within the tenant**. A WhatsApp profile name is not assumed to be the full name. | ACT-01; ARQ §8.2; RG-12 |
| BR-CLI-02 | The same number in two tenants is **two independent customers**, each with its own history and restrictions. | actors.md §1.1; RG-15 |
| BR-CLI-03 | A requester may book for **attendees**; an attendee's phone is optional. Being named on a booking grants **no** management rights. | ACT-02; MVP §6.3.8 |
| BR-CLI-04 | A CRM walk-in booking requires the customer's **name**; the phone is **optional**. Without a phone there is no automatic communication with that customer. | CU-02 A7; RG-14 |
| BR-CLI-05 | Customers are **never merged** because their names match. | CU-12; RG-14 |
| BR-CLI-06 | Every `NO_SHOW` is attributed to `Booking.customer_id`, including bookings for another attendee. Current booking outcome is the sole count source; `CustomerIncident` records other incidents, not no-shows. | Handoff F-017 |
| BR-CLI-07 | From **two no-shows**, the CRM shows an internal indicator and count; it does not itself sanction the customer. | Handoff F-017 |
| BR-CLI-08 | Individual restrictions: `NONE`, `FULL_PREPAYMENT` or `BLOCKED`; authorized roles apply or remove them with actor and reason. | Handoff F-001, F-017 |
| BR-CLI-09 | The backend enforces restrictions: `BLOCKED` prevents new WhatsApp bookings; CRM treatment remains P-16. `FULL_PREPAYMENT` requires 100% verified and explicitly manually allocated to the charge unless an Admin authorizes an exception. | Handoff F-004, F-010; P-16, P-17 |
| BR-CLI-10 | A tenant may configure a **limit of simultaneous future bookings** per requester. | actors.md open question 1; RG-17 (values and counting: P-01) |
| BR-CLI-11 | The requester's name is captured when needed, **reused** in later conversations and may be updated. | MVP §5.1 |

Corrections recalculate the count from current bookings; booking events retain the history.

## 5. Catalog (`CAT`)

| ID | Rule | Origin |
|---|---|---|
| BR-CAT-01 | A **service** has name, duration and price. A combination such as "haircut + beard" is **one preconfigured service** with its own duration and price. | actors.md §4; MVP §2.2 |
| BR-CAT-02 | A **resource** is what is occupied exclusively: a professional, court, barbecue area, room or booth. A professional is not necessarily a CRM user. | actors.md §1.1; MVP §2.2 |
| BR-CAT-03 | A service is booked only with a resource **compatible** with it. | ARQ §6.1 |
| BR-CAT-04 | Each booking has **one service and one resource**. There is no atomic multi-resource booking; a court and a barbecue area are separate bookings, and the barbecue area may be free. | actors.md §4; MVP §7.3 |
| BR-CAT-05 | An inactive service or resource is not offered for new bookings; existing bookings are not changed automatically. | Proposal |
| BR-CAT-06 | Catalog operations require the corresponding role permission; changing a price already agreed is Admin-only. | BR-IAM-03, BR-IAM-04 |

## 6. Availability (`DISP`)

| ID | Rule | Origin |
|---|---|---|
| BR-DISP-01 | Resource recurring hours inherit tenant hours when not defined; calendar rules use the tenant timezone. | Handoff F-011 |
| BR-DISP-02 | Roles with availability permission register blocks and authorized extraordinary openings; removing or changing a block requires explicit permitted action. | Handoff F-001, F-011 |
| BR-DISP-03 | A slot must be within effective regular hours or an authorized extraordinary opening, outside blocks, compatible and free of occupying claims ([invariants.md §3](./invariants.md#3-availability-and-concurrency)). | Handoff F-011 |
| BR-DISP-04 | An availability query **never reserves** a slot; the final check runs inside the booking transaction. | FLW Shared Rules; ARQ §9.1 |
| BR-DISP-05 | Over WhatsApp the customer may ask for a specific resource or "any compatible one". | ACT-01; CU-01 (assignment criterion: P-03) |
| BR-DISP-06 | An authorized extraordinary opening can extend regular hours, but cannot override blocks or active claims; its authorization is recorded. | Handoff F-011 |
| BR-DISP-07 | Authorized extraordinary openings are available through CRM and WhatsApp alike. | Handoff F-011 |
| BR-DISP-08 | A change of hours or blocks **preserves confirmed bookings**; the detailed policy for conflicts is deferred. | CU-15 A3 |

## 7. Booking Lifecycle (`RES`)

| ID | Rule | Origin |
|---|---|---|
| BR-RES-01 | Minimum booking data: requester (WhatsApp number, or customer name in the CRM), attendee when different, service, resource, start and end. | CU-02, CU-04; RG-14 |
| BR-RES-02 | A booking covers the range `[start, end)`; the end comes from the service duration. | ARQ §9.1 |
| BR-RES-03 | Over WhatsApp, selecting a concrete slot creates an **exclusive 10-minute HOLD**, whether or not a deposit applies. | MVP §6.3.3; ARQ §6.4 |
| BR-RES-04 | **Without a deposit**, `HOLD` → `CONFIRMED` only with **explicit customer confirmation** before the HOLD expires. No human approval is needed. | MVP §6.3.4 |
| BR-RES-05 | **With a deposit**, the price, deposit amount, receiving alias and holder, and the cancellation policy are shown **before** the transfer. | MVP §6.3.5; ARQ §9.3 |
| BR-RES-06 | A receipt received **within the HOLD** moves the booking to `PENDING_PAYMENT_REVIEW`. The slot stays blocked **with no automatic review timeout**, and the booking is visible in the CRM review queue. | MVP §6.3.5, §9.2 (accepted risk) |
| BR-RES-07 | Actual credit must be verified by authorized personnel. Initial-deposit rejection follows BR-SEN-10; a pending human review has no automatic decision timeout. | Handoff F-005, F-018 |
| BR-RES-08 | A HOLD with no confirmation (no deposit) or no receipt (deposit) by its deadline becomes `EXPIRED`; the slot is released and the waitlist is considered. | MVP §6.3.6 |
| BR-RES-09 | Authorized CRM personnel may create a booking directly in `CONFIRMED` without a conversational HOLD, using the same occupancy check; BR-SEN-09 applies to deposits. | MVP §5.2; Handoff F-001 |
| BR-RES-10 | Authorized personnel record `COMPLETED`; completion does not mean paid. | CU-10; Handoff F-001 |
| BR-RES-11 | Authorized personnel record `NO_SHOW`; the responsible booking customer is counted even when a different attendee was absent. | Handoff F-017 |
| BR-RES-12 | Authorized personnel may correct a no-show (`NO_SHOW` → `COMPLETED`) with audit of actor, time and previous state. | actors.md §2; P-05; Handoff F-001 |
| BR-RES-13 | **No automatic close**: when its time ends, a `CONFIRMED` booking stays *pending operational close* until personnel record what happened. Time passing never completes it, marks a no-show or proves payment. | FLW Shared Rules; RG-34 |
| BR-RES-14 | CRM quick actions: complete, complete and collect (amount prefilled), complete with balance due, record no-show. | CU-10; RG-35 |
| BR-RES-15 | The booking's origin (`WHATSAPP`, `CRM`) is recorded. There is no `LANDING` origin. | BR-CH-02 |
| BR-RES-16 | An `EXPIRED` HOLD or a valid cancellation **never** counts as a no-show. | CU-10 A4; RG-36 |
| BR-RES-17 | Early completion or no-show keeps the remaining time private, not offered automatically. A role permitted to book may atomically adjust the former occupancy and create a CRM walk-in, preserving history and preventing overlap; later no-show correction never displaces that walk-in. No automatic charge recalculation or refund follows early completion. | Handoff F-007, F-017 |

**Proposals to validate:**

- *Pending operational close* (BR-RES-13) is a **derived condition** (`CONFIRMED` and end < now), not another state.
- `COMPLETED` and `NO_SHOW` are recorded only **after the start** of the booking (P-06).

## 8. Cancellation and Rescheduling (`CAN`)

| ID | Rule | Origin |
|---|---|---|
| BR-CAN-01 | Each tenant configures a **minimum notice** for cancelling and rescheduling, with service/resource overrides. | MVP §6.3.9 (values: P-01) |
| BR-CAN-02 | Over WhatsApp, the customer cancels or reschedules only bookings **managed by their sender number** in that tenant; any other number needs business intervention. | MVP §6.3.8; RG-13 |
| BR-CAN-03 | Outside the notice window the AI **declines** and explains the policy. **Only an Admin** may authorize an out-of-policy change, with an auditable reason. | MVP §6.3.9; actors.md §2 |
| BR-CAN-04 | Before a **voluntary cancellation with a verified deposit**, the customer is warned that the deposit is forfeited, and rescheduling is offered when possible. | MVP §6.3.9; RG-25 |
| BR-CAN-05 | Every customer cancellation or reschedule needs **explicit confirmation**. | CU-08, CU-09 |
| BR-CAN-06 | A **business-caused cancellation** does not forfeit the deposit automatically; any refund is handled manually and recorded by an Admin. | CU-08 A6; MVP §6.3.9 |
| BR-CAN-07 | The reschedule limit is configurable and **unlimited by default**. | CU-09 |
| BR-CAN-08 | A reschedule checks the new slot **without releasing the current one**; if anything fails, **the original booking stays intact**. | MVP §6.3.10; ARQ §9.1 |
| BR-CAN-09 | Verified payments are **preserved**; the new price and the balance are recalculated under the new conditions. | CU-09; MVP §6.3.10 |
| BR-CAN-10 | For a permitted reschedule of a booking with an already verified partial deposit, atomically move to the free target and release the old slot; retain verified funds and allocations, then request and verify any additional deposit. It remains `CONFIRMED` if unpaid, for manual handling, without automatic rollback or cancellation. `FULL_PREPAYMENT` and Admin-only exceptions still apply. A change awaiting prior human authorization does not occupy the target. | Handoff F-006, F-010 |
| BR-CAN-11 | If they require **less**, nothing is refunded automatically: retained valid allocations reduce the remaining balance; unallocated verified funds require explicit manual allocation. An overpayment is resolved manually. | MVP §6.3.10; Handoff F-004 |
| BR-CAN-12 | A successful reschedule moves the booking and releases the old slot **in one atomic change**; reminders are rescheduled and the waitlist is considered for the old slot. | ARQ §9.1 |

Rescheduling preserves the booking and records the request, slot history and financial consequence in `BookingChangeRequest` and `BookingEvent` (F-006).

## 9. Deposits (`SEN`)

| ID | Rule | Origin |
|---|---|---|
| BR-SEN-01 | A deposit is **optional** per tenant. | MVP §9.1 |
| BR-SEN-02 | Policy fields distinguish inherit, set and disable; precedence is resource > service > tenant. No default values are implied. | Handoff F-010 |
| BR-SEN-03 | A deposit is a **fixed amount** or a **percentage** of the price. | MVP §9.1; RG-27 |
| BR-SEN-04 | The `FULL_PREPAYMENT` restriction replaces the deposit rule: **100%** is required. | BR-CLI-09 |
| BR-SEN-05 | The required amount is **computed by the backend**; neither the AI nor the frontend decides it. | ARQ §7 |
| BR-SEN-06 | Deposits use a configured receiving account; tenants may have multiple accounts, a default and optional configurable rotation. Each payment instruction fixes its destination; later rotation does not change it. No bank integration or rotation algorithm is implied. | Handoff F-002 |
| BR-SEN-07 | Deposit funds require **human verification of actual credit** and explicit manual allocation to the booking's charge to satisfy its required threshold. Verification alone does not reduce a charge balance. A screenshot, OCR result or AI interpretation never proves credit, and there is no bank API. | MVP §3.8, §9.1; Handoff F-004 |
| BR-SEN-08 | Mercado Pago and other payment gateways are **not integrated** in the MVP. | EXT-05; MVP §5.3 |
| BR-SEN-09 | From the CRM, a booking that requires a deposit is created **without a HOLD**: (a) cash received, or a transfer whose credit the employee verified, explicitly manually allocated to its charge to meet the required threshold → `CONFIRMED`; (b) a transfer receipt not yet verified → `PENDING_PAYMENT_REVIEW`, blocking the slot until human review (BR-RES-06, BR-RES-07); (c) no payment and no receipt → not confirmed and occupying nothing, unless an **Admin** authorizes the exception. The exception records that no deposit was paid and the outstanding balance, so the full charge remains due; a reason is optional. The exception also applies to a `FULL_PREPAYMENT` customer (P-17). | ACT Confirmed Decisions; CU-03 (CRM flow); P-17; Handoff F-004 |
| BR-SEN-10 | On the first rejection of initial-deposit evidence, notify the customer and retain occupancy for 15 minutes for new evidence or valid staff resolution. Timely new evidence creates a separate review and suspends automatic cancellation while pending. A second human rejection of distinct evidence cancels immediately, releases the slot and notifies customer and staff; technical duplicates do not count. Expiry without valid evidence or resolution cancels atomically; no automatic extension. A started appointment is escalated manually, never automatically cancelled or publicly released. Preserve verified partial payments. This mechanism does not apply to F-006 supplemental deposits. | Handoff F-018 |

## 10. Charges, Balances and Payments (`COB`)

Three concepts are kept apart (ARQ §6.1): the **booking** (what and when), the **charge** (what is owed) and the **payment** (money recorded as received). The **cash register** (§11) records where physical cash is accounted for.

| ID | Rule | Origin |
|---|---|---|
| BR-COB-01 | In the MVP only charges **linked to bookings** of services or rentals are recorded. No products, bar or shop. | MVP §5.1; RG-29, RG-47 |
| BR-COB-02 | A `Payment` represents verified money belonging to a known commercial operation of the tenant; personal or wholly unknown transfers are not payments. A verified commercial payment may have zero allocations, including after booking expiry; retain origin, method, verification, dates and reason. | Handoff F-003 |
| BR-COB-03 | Explicit `PaymentAllocation`s distribute verified funds across charges, including partial and cross-booking allocations. Charge balance is max(0, net amount due minus valid allocations); available funds are net verified, unrefunded funds minus valid allocations. No automatic allocation or negative debt. | Handoff F-004 |
| BR-COB-04 | `PaymentReview` is human evidence evaluation (pending, approved, rejected); `Payment` is verified commercial money, with cash or transfer method. Direct CRM verification needs no review; an approved review and a payment have at most one counterpart each. Rejected evidence creates no payment. | Handoff F-005 |
| BR-COB-05 | Authorized personnel verify a transfer by checking actual credit; amount, verifier and time are recorded. | Handoff F-001, F-005 |
| BR-COB-06 | A cash payment is recorded by the employee who **physically receives** it, and is verified when recorded. | CU-11 step 3 |
| BR-COB-07 | The AI may attach evidence for a pending `PaymentReview`; it never verifies money or creates a verified payment. | Handoff F-005 |
| BR-COB-08 | The CRM may record cash, or a bank-verified transfer, **without an attached image**. | MVP §9.1 |
| BR-COB-09 | Time passing **never** approves a pending `PaymentReview`, creates a verified `Payment`, or turns a completed booking into a paid one. | FLW Shared Rules; RG-33; Handoff F-005 |
| BR-COB-10 | Every payment keeps its responsible employee, amount, method and timestamp. | RG-43 |
| BR-COB-11 | Original payments are immutable and never deleted; corrections append linked history. For physical-cash corrections, authorized personnel act while the associated cash session is open; after close only an Admin records a separate audited `CashAdjustment`, leaving the close unchanged. Transfers need no cash session. The technical ledger-correction mechanism for transfers and other non-cash-session corrections remains pending; `CashAdjustment` is not a general financial log and `AuditEvent` does not replace a financial ledger. Refunds use separate `Refund` operations, never negative payments. | Handoff F-001, F-012, F-013 |
| BR-COB-12 | A transfer that arrives after the slot was released, or cannot be matched, is a **financial incident** for human handling. It never reconfirms a booking automatically. | MVP §6.3.6; ARQ §9.3 |
| BR-COB-13 | Changing an agreed price is **Admin-only**, with a reason, and needs **customer acceptance** when the price increases. | CU-11 A5; CU-15 A2 |
| BR-COB-14 | Refunds are **manual**, recorded by an Admin; there are no automated bank refunds. | CU-11 A6; MVP §5.3 |
| BR-COB-15 | Overpayments are resolved manually, with traceability. | MVP §9.1 |
| BR-COB-16 | A **retry of the same payment operation** (repeated request, repeated verification, duplicated message) never records the payment twice. Two **separate manual entries** that may be the same money cannot be told apart automatically: both are kept and flagged for human review, and corrected through BR-COB-11. | MVP §6.3.14; ARQ §9.3; CU-11 A9 (flagging: Proposal) |
| BR-COB-17 | Allocations are atomic and idempotent, capped by both available funds and charge balance; excess remains unallocated for manual application or Admin-authorized refund. Corrections preserve history and account for refunds without double counting. | Handoff F-004 |
| BR-COB-18 | `Refund` is a separate operation linked to the original immutable `Payment`, with amount, method, reason, Admin authorization, execution status, dates and source/destination trace. Only execution reduces retained funds; prevent excess across pending refunds and allocations. Correct allocations historically. Cash refunds create an outgoing cash movement in an open session; transfers are bank outflows, not cash movements. | Handoff F-013 |

**Proposal:** the **charge** is fixed when the booking is created, from the price in force (snapshot), and does not change if the Admin later edits the service price. It changes only through BR-COB-13 or a reschedule (BR-CAN-09).

## 11. Cash Register (`CAJA`)

| ID | Rule | Origin |
|---|---|---|
| BR-CAJA-01 | Each tenant has **one shared logical register**; several employees record payments in it. | MVP §9.2; RG-40 |
| BR-CAJA-02 | Roles with the cash permission open and close sessions. | Handoff F-001 |
| BR-CAJA-03 | Cash requires an open session: configured automatic opening occurs on the first cash payment; otherwise an authorized person opens it first. Opening cash is explicit and auditable, declared on first opening and reconciled to the prior close thereafter. | Handoff F-012 |
| BR-CAJA-04 | **Closing is always manual** and records who closed, when, the period, expected cash, counted cash, difference and totals. | MVP §9.2; RG-42 |
| BR-CAJA-05 | Personnel with the corresponding role permission register cash-in and cash-out with reason and responsible person. No product sales. | Handoff F-001 |
| BR-CAJA-06 | A session may close **with a difference** between expected and counted cash, as long as the difference and the responsible person are recorded. | RG-44 |
| BR-CAJA-07 | Transfers are shown **separately** and are never added to physical cash. | MVP §9.2; RG-45 |
| BR-CAJA-08 | Unpaid bookings **do not block** the close, and money not received is never counted. | CU-13 A2; MVP §9.2 |
| BR-CAJA-09 | Closed sessions are **immutable**; only an Admin adds a separate audited adjustment afterwards. | MVP §9.2; RG-46 |
| BR-CAJA-10 | The register covers **only booking income** recorded in Agendoxa, not the business's total revenue. | MVP §5.1; RG-47 |

Expected cash is opening cash plus signed physical movements. A cash payment and its linked movement represent the same money and must not be summed twice. Cash payment versus close is serialized; verified transfers need no physical session and never alter a closed one (F-012, F-014).

## 12. Waitlist and Exclusive Offers (`WL`)

| ID | Rule | Origin |
|---|---|---|
| BR-WL-01 | The waitlist is **voluntary**. Available alternatives are offered first, unless the customer says the time is non-negotiable. | MVP §6.3.7 |
| BR-WL-02 | Joining needs an **explicit opt-in**; the requested conditions and a **waitlist-specific consent** are recorded under the requester and tenant, with arrival time. | CU-05; MVP §8.3 |
| BR-WL-03 | A waitlist entry **does not reserve or guarantee** a slot. | CU-05; ARQ §9.2 |
| BR-WL-04 | A requester has at most one entry for the same conditions; a repeated request keeps the original arrival order. | FLW CU-05; CU-05 A3 (arrival order: Proposal) |
| BR-WL-05 | An offer starts only when a compatible slot is actually released; early completion or no-show does not release residual time to automatic offers. | Handoff F-007 |
| BR-WL-06 | The next eligible entry **in arrival order** receives an **exclusive 5-minute offer**, with its expiry time stated. | MVP §6.3.7; ARQ §9.2 |
| BR-WL-07 | There is **at most one exclusive offer** per released slot at a time; an offer never displaces a confirmed booking. | MVP §6.3.7 |
| BR-WL-08 | Acceptance of a valid five-minute offer atomically ends its claim and creates a distinct booking claim for a ten-minute HOLD, linking the offer to at most one resulting booking. A claim belongs to exactly one booking or offer, never both. | Handoff F-008 |
| BR-WL-09 | A declined, unanswered or expired offer moves to the next eligible entry or back to general availability. | CU-06 A1 |
| BR-WL-10 | A failed notice **never blocks the slot indefinitely**. | CU-06 A3; ARQ §9.2 (retries: P-19) |
| BR-WL-11 | An optional resource preference restricts eligibility to that same-tenant compatible resource; without one, any compatible resource is eligible. Respect time preferences and arrival priority among eligible entries. | Handoff F-009 |

**Proposals to validate:** a `BLOCKED` customer is not offered the waitlist, and an entry whose requester became `BLOCKED` or reached the future-booking limit is skipped.

## 13. AI Agent (`AGT`) and Human Handoff (`HND`)

| ID | Rule | Origin |
|---|---|---|
| BR-AGT-01 | The AI uses **authorized tools** for services, prices, availability, bookings, payment status, waitlist and consent. It never invents slots, prices, discounts or payment status, nor negotiates unconfigured exceptions. | SYS-01; ARQ §10.1 |
| BR-AGT-02 | Tools call the same use cases as the CRM, with tenant and requester **fixed by the validated connection**. The LLM chooses neither. | ARQ §10.1 |
| BR-AGT-03 | The AI enforces restrictions, notice periods and deposit warnings, and **never reveals internal labels**. | CU-12 step 4 |
| BR-AGT-04 | The AI cannot verify transfers, infer no-shows, modify cash records or obtain Staff/Admin privileges. | SYS-01 |
| BR-AGT-05 | Incoming messages are **persisted before processing** and deduplicated; consecutive messages are grouped after **5 seconds** without another incoming message. Grouping is an optimization over persisted messages, not an in-memory queue. | MVP §8.2; ARQ §10.2 |
| BR-AGT-06 | If a tool, the model or the channel fails, the AI says so safely, invents nothing and offers a human. | CU-01 A5; ARQ §10.1 |
| BR-HND-01 | An escalation goes to the **shared CRM inbox** with history and a summary. | CU-14 |
| BR-HND-02 | A human takeover pauses the AI **only in that conversation**. | CU-14; ARQ §10.2 |
| BR-HND-03 | The AI resumes on **manual handback** or after **60 minutes without a human reply**, and **only if global AI is enabled**. Each human reply restarts the 60 minutes. | MVP §8.2; ARQ §10.2 |
| BR-HND-04 | Only an **Admin** switches global AI off, temporarily or indefinitely. | ACT-05; MVP §8.2 |
| BR-HND-05 | The bot's own messages never count as human replies. Detection of replies sent directly from the WhatsApp app needs pilot validation; **explicit CRM takeover is the reliable control**. | CU-14 A3; ARQ §10.2 |
| BR-HND-06 | AI resumption **never** verifies or clears a payment pending review. | MVP §8.2 |

## 14. Notifications and Consent (`NOT`)

| ID | Rule | Origin |
|---|---|---|
| BR-NOT-01 | By default, **one logical reminder per confirmed booking slot**, at the configured lead time before its start, subject to BR-NOT-08. Use the tenant timezone for calendar rules and UTC instants, including day crossings; the reminder need not fall on the booking day. | MVP §8.3; Handoff F-023 |
| BR-NOT-02 | Reminders require **explicit, recorded and revocable consent**; having a phone number is not consent. Waitlist notices use their own consent (BR-WL-02). The AI may record consent. | MVP §8.3; actors.md §5 |
| BR-NOT-03 | Before each attempt, validate conditions for its notice kind: reminders need a confirmed current slot and reminder consent; offers need a valid unexpired offer and its waitlist opt-in. Customer sends also require an enabled channel and phone; revocation stops queued sends. The required staff alert after a second initial-evidence rejection is tied to that booking/rejection event and authorized tenant personnel, not to customer reminder consent or a still-confirmed booking. Its dispatch mechanism remains technical design. | Handoff F-015, F-016, F-018, F-020 |
| BR-NOT-04 | One logical `Notification` has zero or more `NotificationAttempt`s, each with time, result, error and zero or one `Message` linked to its conversation. Retries do not duplicate the notification; provider acceptance is not delivery. Reconcile uncertain outcomes before retry when possible; operational retention remains to be specified. | Handoff F-016 |
| BR-NOT-05 | The tenant may **disable** the WhatsApp channel during an incident. | MVP §8.1 |
| BR-NOT-06 | Allowed outgoing messages: replies, notices about real bookings (confirmation, HOLD, reminders) and opted-in waitlist offers. **No campaigns or cold contact.** | MVP §8.1 |
| BR-NOT-07 | Notification jobs are durable and idempotent; a late job never invalidates or modifies a confirmed booking. | MVP §6.3.14; ARQ §10.3 |
| BR-NOT-08 | If start minus reminder lead time is at or before confirmation, omit the reminder, not the separate confirmation. Rescheduling invalidates the old reminder and schedules a new one only if due in the future; cancellation prevents sending. Calendar rules use tenant timezone and instants UTC. An omission may have zero attempts. | Handoff F-023 |

## 15. Audit (`AUD`)

| ID | Rule | Origin |
|---|---|---|
| BR-AUD-01 | The following record who did it and when: creating or changing a booking slot, verifying or rejecting a deposit, correcting a no-show or a payment, applying or removing a restriction, cash movements, opening and closing the register, approving exceptions, price changes, refunds, conversation takeovers and global AI changes. | actors.md §5; MVP §6.3.13 |
| BR-AUD-02 | Personnel may consult the audit trail of their tenant; customers may not. | actors.md §2 |
| BR-AUD-03 | Reminder consent on `Customer` and waitlist consent on `WaitlistEntry` are independent. Change of either and its `AuditEvent` for grant or revocation are transactional, recording time, channel, scope and actor. Do not create consent entities or audit every message or retry. | Handoff F-015, F-020 |

## 16. Pending Decisions

The 2026-11-04 handoff resolves the portions marked below with the product owner, subject to team review. Other questions remain open. Resolved IDs remain for traceability; see [invariants.md §14](./invariants.md#14-invariants-that-depend-on-pending-decisions).

| ID | Question | Status | Blocks |
|---|---|---|---|
| P-01 | Default notice period and future-booking limit. Which states count toward the limit, and do bookings for third parties count? | Open | No |
| P-02 | Multi-service bookings vs. combined services. | **Resolved** — a combination is one preconfigured service (BR-CAT-01). | — |
| P-03 | With "any compatible resource", how is the resource assigned? | Open | No |
| P-04 | Can an opening override a block? | Resolved — no; explicit authorized modification or removal is required (F-011). | — |
| P-05 | Can `COMPLETED` be corrected to `NO_SHOW`, or only the reverse? | Open | No |
| P-06 | Earliest time `COMPLETED`/`NO_SHOW` may be recorded? | Partly resolved — early residual occupancy stays private, with explicit CRM reuse (F-007); exact timing open. | No |
| P-07 | Business-caused cancellation outside the notice window: who may do it? Legally required refunds; how a forfeited deposit shows in cash. | **Partly resolved** — no automatic forfeiture; refunds manual by Admin; reschedule uses the new price. | Partial |
| P-08 | Policy precedence and disabling. | Resolved — resource > service > tenant; inherit/set/disable (F-010). | — |
| P-09 | Mercado Pago down with a deposit required. | **Obsolete** — no Mercado Pago in the MVP. | — |
| P-10 | Session boundaries and day changes. | Partly resolved — cash needs an open session; transfers do not; opening, closing and late verification follow F-012. Day boundaries remain open. | No |
| P-11 | Physical-cash corrections after a close. | **Resolved** — Admin-only separate audited `CashAdjustment`, preserving original payment and close (BR-COB-11, BR-CAJA-09); other technical ledger-correction mechanisms remain P-26. | — |
| P-12 | When is reminder consent requested? Does a CRM booking with a phone send confirmation? | Partly resolved — reminder consent is per customer and independent of waitlist consent (F-015, F-020). | No |
| P-13 | Transfer deposit vs. a 10-minute HOLD. | **Resolved** — a timely receipt moves to review with no timeout (BR-RES-06). | — |
| P-14 | Is payment recording assigned to every Staff member? | Resolved — permissions are role-based, including payment operations (F-001). | — |
| P-15 | Reschedule identity and history. | Resolved — same booking, with request and event history (F-006). | — |
| P-16 | Can Staff create a CRM booking for a `BLOCKED` customer? Proposal: no; Staff lift the restriction first, with a reason. | Open | No |
| P-17 | A `FULL_PREPAYMENT` customer booking from the CRM. Can an Admin exception (BR-SEN-09 c) confirm without the 100%? | **Resolved** — receiving 100% in cash at the counter verifies the payment; explicit manual allocation to the charge satisfies the threshold and permits confirmation (BR-SEN-09 a, BR-COB-06); an Admin exception may also confirm without the 100%, recording that it was not paid and the outstanding balance (BR-SEN-09 c). | — |
| P-18 | How does an offer occupy and convert? | Resolved conceptually — its own claim ends and a distinct booking claim starts atomically (F-008). | — |
| P-19 | Waitlist expiry, queue limits, long offer chains, retries after a failed notice. | Open | No |
| P-20 | Must a CRM booking for a service with a deposit rule collect it? | **Resolved** — no HOLD from the CRM; verified funds explicitly manually allocated to meet the deposit threshold permit confirmation, a pending receipt goes to review, and without payment only an Admin exception confirms (BR-SEN-09). | — |
| P-21 | Initial evidence rejection outcome. | Resolved — correction window, then cancellation under F-018, subject to started-appointment safeguard; reason labels remain conceptual. | — |
| P-22 | Can Staff cancel or reschedule outside the notice window? | **Resolved** — only an Admin authorizes out-of-policy changes (MVP §6.3.9). | — |
| P-23 | Minimum attendee data. | Partly resolved — all no-shows count against `Booking.customer_id`, once per booking (F-017); minimum attendee data remains open. | Partial |
| P-24 | Pending review edge cases: the booking start arrives while still pending; the customer cancels while pending; safeguards against abuse of indefinite review (accepted risk, MVP §9.2). | Partly resolved — a started appointment is never automatically cancelled or publicly released and requires manual handling (F-018); customer withdrawal and abuse safeguards remain open. | No |
| P-25 | Occupancy during rescheduling and additional deposit. | Resolved — after permitted move target is confirmed; prior authorization does not hold target (F-006). | — |
| P-26 | Final resolution of late or unmatched transfers and overpayments (refund, credit to another booking). | Partly resolved — verified commercial funds may stay unallocated for explicit manual application to another obligation or Admin-authorized `Refund`; wholly unknown/personal transfers are not `Payment` (F-003, F-004, F-013). Operational choice, applicable legal obligations and the technical ledger-correction mechanism remain pending. | No |
| P-27 | Deposit evidence without an image; a receipt for less than the required amount. | Open | No |

Remaining model questions include minimum attendee data (P-23); exact outcome timing (P-06), P-16 and other open questions remain as listed.

## 17. Differences With Earlier Documents

The handoff supersedes incompatible earlier text, including earlier MVP and architecture proposals; dependent documents require reconciliation. Historical differences include:

| Document | Says | Current decision |
|---|---|---|
| `rules.md` RG-21, RG-28 | HOLD only with a deposit; Mercado Pago confirms the deposit. | WhatsApp always starts with a HOLD; deposit by transfer with human verification (BR-RES-03, BR-SEN-06, BR-SEN-07). |
| `rules.md` RG-30 | Methods include Mercado Pago. | `CASH` and `TRANSFER` only (BR-COB-04). |
| `rules.md` RG-08, RG-10, RG-39 | Only Admin applies restrictions to customers. | Personnel with the applicable role permission apply individual restrictions (BR-CLI-08); Staff membership alone grants none. |
| `rules.md` RG-09, RG-10 | The cash permission is the only granular permission. | Configurable role-based permissions (BR-IAM-05). |
| `rules.md` RG-23 | Personnel exceptions to be defined later. | Only an Admin authorizes out-of-policy changes (BR-CAN-03). |
| `rules.md` RG-41 | Mechanics of automatic opening to be defined. | Opening cash is explicit and auditable: declare it at the first opening, reconcile subsequent openings with the previous close; closing is always manual (BR-CAJA-03, BR-CAJA-04). |
| Issue CON-02 (#11) | The public API creates, consults, cancels and reschedules bookings. | Public endpoints are read-only landing information (ARQ §11). |
| Issue UC-02 — Scope | "Contemplar … reservas públicas". | Excluded from the MVP (MVP §5.3); see [use-cases.md §7](../uc-02/use-cases.md#7-excluded-and-deferred-use-cases). |

**Recommendation:** mark `rules.md` as superseded by UC-03, UC-01 and `mvp.md` v0.3, or update it, so that the team does not work from two sources.
