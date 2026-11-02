# UC-03 — Business Rules

> **Status:** In Review
> **Objective:** Turn the agreed product decisions into verifiable business rules: what must hold and who may do it.
> **Scope:** Channels, tenants, roles and delegated privileges, customers, catalog, availability, booking lifecycle, cancellation and rescheduling, deposits, charges and payments, cash register, waitlist, AI and human handoff, notifications and audit.
> **Out of scope:** Tables, enums, endpoints, DTOs and screens (DOM-01, DOM-02, CON-XX). Where each rule is guaranteed (database, transaction, job) is in [invariants.md](./invariants.md).
> **References:** [UC-01 actors](../uc-01/actors.md) and [UC-01 flows](../uc-01/flows.md) (authoritative); [UC-02 use cases](../uc-02/use-cases.md); [MVP definition](../mvp.md) v0.2; [target architecture](../../design-docs/target-architecture.md) v1.1 (proposed direction, not the implemented [`ARCHITECTURE.md`](../../../ARCHITECTURE.md)); `rules.md` (30/10/2026, not stored in the repository, partly superseded — see [§17](#17-differences-with-earlier-documents)).
> **Closing condition:** Team review of this document together with UC-02. No rule here resolves a `P-NN` pending decision on its own; decisions taken in team review are recorded in [§16](#16-pending-decisions) with their source.

## 0. How to Read This Document

- Each rule has an identifier `BR-<AREA>-NN` and an **origin**:
  - `ACT` / `FLW` / `CU-XX`: [actors.md](../uc-01/actors.md), [flows.md](../uc-01/flows.md) or a use case in [use-cases.md](../uc-02/use-cases.md).
  - `MVP §x` / `ARQ §x`: a section of [`mvp.md`](../mvp.md) v0.2 or of the [target architecture](../../design-docs/target-architecture.md) v1.1. `MVP §6.3.n` is item *n* of the invariant list in `mvp.md` §6.3; `ARQ §13.n` is outcome *n* of the target architecture §13. `ARQ` never refers to `ARCHITECTURE.md`, which describes what is implemented today.
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
| BR-IAM-01 | A personnel user is global and joins one or more tenants through **memberships**; role and privileges belong to the membership. | MVP §6.1; ARQ §8.2 |
| BR-IAM-02 | Roles: `Staff` and `Admin`. A tenant may have **several Admins**. Customers have no CRM access. | ACT-01, ACT-05; MVP §5.1 |
| BR-IAM-03 | **Staff** may manage every booking of the tenant (including colleagues'), record completion and no-shows, verify transfers, record payments (including partial and mixed), correct payments while the cash session is open, register cash-in/cash-out with a reason, apply or remove individual customer restrictions, and handle conversations. | ACT-03; actors.md §2; ARQ §6.1 |
| BR-IAM-04 | **Admin only**: services, prices, resources, deposit rules, commercial policies, receiving aliases, personnel and their privileges, the global AI mode, out-of-policy exceptions, price changes on agreed bookings, refunds and post-close adjustments. | ACT-05; actors.md §2; MVP §6.3.13 |
| BR-IAM-05 | **Delegated privileges** (Authorized Staff, ACT-04), each granted separately by an Admin: (a) open/close cash sessions; (b) edit operational hours and availability blocks, and book outside regular hours from the CRM (BR-DISP-06). They do **not** include prices or commercial policy. There is no general permission editor. | ACT-04; MVP §5.1; ARQ §6.1 |
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
| BR-CLI-06 | The requester's **own no-shows** are tracked separately from **incidents in bookings managed for other attendees**. | CU-10, CU-12; MVP §6.3.11 |
| BR-CLI-07 | From **two own no-shows**, the CRM shows the internal **"Problematic customer"** label with reason and count. It is **never shown to the customer** and **does not sanction** on its own. | CU-12; MVP §6.3.12 |
| BR-CLI-08 | Individual restrictions: `NONE` (normal service), `FULL_PREPAYMENT` or `BLOCKED`. **Staff or Admin** apply or remove them with a recorded reason and actor; the general restriction policy belongs to Admin. | CU-12; ARQ §9.4 |
| BR-CLI-09 | The backend enforces restrictions **in every channel**: `BLOCKED` → no new bookings; `FULL_PREPAYMENT` → no new booking is confirmed without **100% verified**. The AI applies them without revealing the label. | CU-12; MVP §6.3.12 (CRM booking for a `BLOCKED` customer: P-16; full prepayment in the CRM: BR-SEN-09, P-17) |
| BR-CLI-10 | A tenant may configure a **limit of simultaneous future bookings** per requester. | actors.md open question 1; RG-17 (values and counting: P-01) |
| BR-CLI-11 | The requester's name is captured when needed, **reused** in later conversations and may be updated. | MVP §5.1 |

**Proposal:** the no-show count is **derived** from the requester's own `NO_SHOW` bookings instead of being stored as an accumulator, so a correction (BR-RES-12) updates it with no extra step. To validate in DOM-01.

## 5. Catalog (`CAT`)

| ID | Rule | Origin |
|---|---|---|
| BR-CAT-01 | A **service** has name, duration and price. A combination such as "haircut + beard" is **one preconfigured service** with its own duration and price. | actors.md §4; MVP §2.2 |
| BR-CAT-02 | A **resource** is what is occupied exclusively: a professional, court, barbecue area, room or booth. A professional is not necessarily a CRM user. | actors.md §1.1; MVP §2.2 |
| BR-CAT-03 | A service is booked only with a resource **compatible** with it. | ARQ §6.1 |
| BR-CAT-04 | Each booking has **one service and one resource**. There is no atomic multi-resource booking; a court and a barbecue area are separate bookings, and the barbecue area may be free. | actors.md §4; MVP §7.3 |
| BR-CAT-05 | An inactive service or resource is not offered for new bookings; existing bookings are not changed automatically. | Proposal |
| BR-CAT-06 | Only an **Admin** creates or modifies services, resources and prices. | BR-IAM-04 |

## 6. Availability (`DISP`)

| ID | Rule | Origin |
|---|---|---|
| BR-DISP-01 | Each resource has **recurring hours** per weekday in the tenant's timezone. | MVP §5.1 |
| BR-DISP-02 | Admins, and Staff with the availability privilege, register **blocks** (absences, maintenance) and one-off exceptions. | BR-IAM-05; RG-19 |
| BR-DISP-03 | A slot is offered only if it is within the resource's hours, outside blocks, compatible with the service, and **not overlapping** any occupying booking or active exclusive offer ([invariants.md §3](./invariants.md#3-availability-and-concurrency)). | MVP §6.3.2; ARQ §9.1 (which states occupy: P-06; how offers occupy: P-18) |
| BR-DISP-04 | An availability query **never reserves** a slot; the final check runs inside the booking transaction. | FLW Shared Rules; ARQ §9.1 |
| BR-DISP-05 | Over WhatsApp the customer may ask for a specific resource or "any compatible one". | ACT-01; CU-01 (assignment criterion: P-03) |
| BR-DISP-06 | From the CRM, **Admins, and Staff with the availability privilege,** may book **outside regular hours** if the resource is free; they can never create an overlap, and the booking records who authorized it. Other Staff book only within regular hours. | ACT-04; CU-02 A9; MVP §5.1; RG-18 (blocks: P-04) |
| BR-DISP-07 | The AI offers only slots **within regular hours**; the exception in BR-DISP-06 is CRM-only. | Proposal, derived from RG-18 |
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
| BR-RES-07 | `PENDING_PAYMENT_REVIEW` → `CONFIRMED` only when Staff/Admin **verify the actual credit**. A rejection releases the slot and the customer is notified. | MVP §6.3.6; ARQ §9.3 (rejected state: P-21) |
| BR-RES-08 | A HOLD with no confirmation (no deposit) or no receipt (deposit) by its deadline becomes `EXPIRED`; the slot is released and the waitlist is considered. | MVP §6.3.6 |
| BR-RES-09 | From the CRM, Staff/Admin may create a booking **directly in `CONFIRMED`**, without a conversational HOLD, using the same occupancy check. When a deposit applies, BR-SEN-09 decides the resulting state. | MVP §5.2; ARQ §6.4; CU-03 (CRM flow) |
| BR-RES-10 | `CONFIRMED` → `COMPLETED` is recorded by Staff/Admin. **Completing does not mean paid**: a booking may be completed with a balance due. | CU-10; MVP §6.3.11 |
| BR-RES-11 | `CONFIRMED` → `NO_SHOW` is recorded by Staff/Admin, identifying **who was absent** when the attendee differs from the requester. | CU-10; MVP §6.3.11 (attribution: P-23) |
| BR-RES-12 | A recorded no-show may be corrected (`NO_SHOW` → `COMPLETED`) by Staff/Admin, **with audit** of who, when and the previous state. | actors.md §2; RG-37 (reverse correction: P-05) |
| BR-RES-13 | **No automatic close**: when its time ends, a `CONFIRMED` booking stays *pending operational close* until personnel record what happened. Time passing never completes it, marks a no-show or proves payment. | FLW Shared Rules; RG-34 |
| BR-RES-14 | CRM quick actions: complete, complete and collect (amount prefilled), complete with balance due, record no-show. | CU-10; RG-35 |
| BR-RES-15 | The booking's origin (`WHATSAPP`, `CRM`) is recorded. There is no `LANDING` origin. | BR-CH-02 |
| BR-RES-16 | An `EXPIRED` HOLD or a valid cancellation **never** counts as a no-show. | CU-10 A4; RG-36 |

**Proposals to validate:**

- *Pending operational close* (BR-RES-13) is a **derived condition** (`CONFIRMED` and end < now), not another state.
- A rejected receipt ends the booking in `CANCELLED` with reason `PAYMENT_REJECTED`, not in a new state (P-21). Every `CANCELLED` booking carries a reason: `CUSTOMER`, `BUSINESS`, `PAYMENT_REJECTED`.
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
| BR-CAN-10 | If the new conditions require **more deposit**, the difference must be **human-verified** before the change is applied. | MVP §6.3.10; ARQ §9.3 |
| BR-CAN-11 | If they require **less**, nothing is refunded automatically: verified funds reduce the remaining balance. An overpayment is resolved manually. | MVP §6.3.10 |
| BR-CAN-12 | A successful reschedule moves the booking and releases the old slot **in one atomic change**; reminders are rescheduled and the waitlist is considered for the old slot. | ARQ §9.1 |

**Proposal:** a reschedule modifies **the same booking** and keeps the history of previous slots (P-15).

## 9. Deposits (`SEN`)

| ID | Rule | Origin |
|---|---|---|
| BR-SEN-01 | A deposit is **optional** per tenant. | MVP §9.1 |
| BR-SEN-02 | The tenant defines a **default rule** and may override or disable it per **service** or **resource**. | MVP §9.1; RG-26 (precedence: P-08) |
| BR-SEN-03 | A deposit is a **fixed amount** or a **percentage** of the price. | MVP §9.1; RG-27 |
| BR-SEN-04 | The `FULL_PREPAYMENT` restriction replaces the deposit rule: **100%** is required. | BR-CLI-09 |
| BR-SEN-05 | The required amount is **computed by the backend**; neither the AI nor the frontend decides it. | ARQ §7 |
| BR-SEN-06 | In the MVP, deposits are paid by **bank/wallet transfer** to a configured alias. A tenant may have several aliases with **one default**; there is no automatic rotation. Aliases are Admin-only. | MVP §9.1; ARQ §9.3 |
| BR-SEN-07 | **Only human verification of the actual credit** settles a deposit. A screenshot, OCR result or AI interpretation never does, and there is no bank API. | MVP §3.8, §9.1 |
| BR-SEN-08 | Mercado Pago and other payment gateways are **not integrated** in the MVP. | EXT-05; MVP §5.3 |
| BR-SEN-09 | From the CRM, a booking that requires a deposit is created **without a HOLD**: (a) cash received, or a transfer whose credit the employee verified → `CONFIRMED`; (b) a transfer receipt not yet verified → `PENDING_PAYMENT_REVIEW`, blocking the slot until human review (BR-RES-06, BR-RES-07); (c) no payment and no receipt → not confirmed and occupying nothing, unless an **Admin** authorizes the exception with a recorded reason. | ACT Confirmed Decisions; CU-03 (CRM flow) (Admin exception for `FULL_PREPAYMENT`: P-17) |

## 10. Charges, Balances and Payments (`COB`)

Three concepts are kept apart (ARQ §6.1): the **booking** (what and when), the **charge** (what is owed) and the **payment** (money recorded as received). The **cash register** (§11) records where physical cash is accounted for.

| ID | Rule | Origin |
|---|---|---|
| BR-COB-01 | In the MVP only charges **linked to bookings** of services or rentals are recorded. No products, bar or shop. | MVP §5.1; RG-29, RG-47 |
| BR-COB-02 | Every payment identifies its **origin**; in the MVP it is always a booking of the same tenant. The design leaves room for a future POS sale origin without duplicating payments or cash. | RG-50; MVP §14 |
| BR-COB-03 | A booking accepts **several payments** (deposit, partial payments, mixed methods). **Balance = charge − verified payments**; the deposit is never counted twice. | CU-11; MVP §9.1 |
| BR-COB-04 | Methods: `CASH` and `TRANSFER` (bank/wallet). The **method** is recorded separately from the **verification status** (`PENDING_REVIEW`, `VERIFIED`, `REJECTED`). | MVP §9.1; RG-30 (status labels: Proposal) |
| BR-COB-05 | A transfer is verified when Staff/Admin **check that the money arrived**; amount, verifier and time are recorded. | ACT-03; RG-31 |
| BR-COB-06 | A cash payment is recorded by the employee who **physically receives** it, and is verified when recorded. | CU-11 step 3 |
| BR-COB-07 | The AI may interpret a receipt and attach it to the booking as a transfer **pending review**. **The AI never verifies a payment.** | SYS-01; RG-32 |
| BR-COB-08 | The CRM may record cash, or a bank-verified transfer, **without an attached image**. | MVP §9.1 |
| BR-COB-09 | Time passing **never** turns a pending payment into a verified one, nor a completed booking into a paid one. | FLW Shared Rules; RG-33 |
| BR-COB-10 | Every payment keeps its responsible employee, amount, method and timestamp. | RG-43 |
| BR-COB-11 | While its cash session is **open**, Staff/Admin may correct a payment with audit; nothing is deleted silently. **After the close**, only an Admin records a new audited adjustment. | actors.md §2 (invariant 3) |
| BR-COB-12 | A transfer that arrives after the slot was released, or cannot be matched, is a **financial incident** for human handling. It never reconfirms a booking automatically. | MVP §6.3.6; ARQ §9.3 |
| BR-COB-13 | Changing an agreed price is **Admin-only**, with a reason, and needs **customer acceptance** when the price increases. | CU-11 A5; CU-15 A2 |
| BR-COB-14 | Refunds are **manual**, recorded by an Admin; there are no automated bank refunds. | CU-11 A6; MVP §5.3 |
| BR-COB-15 | Overpayments are resolved manually, with traceability. | MVP §9.1 |
| BR-COB-16 | A **retry of the same payment operation** (repeated request, repeated verification, duplicated message) never records the payment twice. Two **separate manual entries** that may be the same money cannot be told apart automatically: both are kept and flagged for human review, and corrected through BR-COB-11. | MVP §6.3.14; ARQ §9.3; CU-11 A9 (flagging: Proposal) |

**Proposal:** the **charge** is fixed when the booking is created, from the price in force (snapshot), and does not change if the Admin later edits the service price. It changes only through BR-COB-13 or a reschedule (BR-CAN-09).

## 11. Cash Register (`CAJA`)

| ID | Rule | Origin |
|---|---|---|
| BR-CAJA-01 | Each tenant has **one shared logical register**; several employees record payments in it. | MVP §9.2; RG-40 |
| BR-CAJA-02 | Admins, and Staff with the cash privilege, **open and close** sessions. | BR-IAM-05 |
| BR-CAJA-03 | Opening is **manual** (declared opening cash) or **automatic** (carries the physical cash declared at the previous close), according to the tenant setting. | MVP §9.2; ARQ §9.4 |
| BR-CAJA-04 | **Closing is always manual** and records who closed, when, the period, expected cash, counted cash, difference and totals. | MVP §9.2; RG-42 |
| BR-CAJA-05 | Staff/Admin register **cash-in and cash-out movements** with a reason and responsible person. No product sales. | ACT-03; MVP §9.2 |
| BR-CAJA-06 | A session may close **with a difference** between expected and counted cash, as long as the difference and the responsible person are recorded. | RG-44 |
| BR-CAJA-07 | Transfers are shown **separately** and are never added to physical cash. | MVP §9.2; RG-45 |
| BR-CAJA-08 | Unpaid bookings **do not block** the close, and money not received is never counted. | CU-13 A2; MVP §9.2 |
| BR-CAJA-09 | Closed sessions are **immutable**; only an Admin adds a separate audited adjustment afterwards. | MVP §9.2; RG-46 |
| BR-CAJA-10 | The register covers **only booking income** recorded in Agendoxa, not the business's total revenue. | MVP §5.1; RG-47 |

**Proposal:** expected cash = opening cash + verified cash payments of the session + cash-in − cash-out.

## 12. Waitlist and Exclusive Offers (`WL`)

| ID | Rule | Origin |
|---|---|---|
| BR-WL-01 | The waitlist is **voluntary**. Available alternatives are offered first, unless the customer says the time is non-negotiable. | MVP §6.3.7 |
| BR-WL-02 | Joining needs an **explicit opt-in**; the requested conditions and a **waitlist-specific consent** are recorded under the requester and tenant, with arrival time. | CU-05; MVP §8.3 |
| BR-WL-03 | A waitlist entry **does not reserve or guarantee** a slot. | CU-05; ARQ §9.2 |
| BR-WL-04 | A requester has at most one entry for the same conditions; a repeated request keeps the original arrival order. | FLW CU-05; CU-05 A3 (arrival order: Proposal) |
| BR-WL-05 | An offer starts only when a compatible slot is **actually released**: cancellation, reschedule, expired HOLD, rejected receipt or lifted block. | CU-06 |
| BR-WL-06 | The next eligible entry **in arrival order** receives an **exclusive 5-minute offer**, with its expiry time stated. | MVP §6.3.7; ARQ §9.2 |
| BR-WL-07 | There is **at most one exclusive offer** per released slot at a time; an offer never displaces a confirmed booking. | MVP §6.3.7 |
| BR-WL-08 | Acceptance within 5 minutes creates a standard **HOLD of up to 10 minutes**; it is not a confirmation. Offers are never renewed automatically. | MVP §6.3.7 |
| BR-WL-09 | A declined, unanswered or expired offer moves to the next eligible entry or back to general availability. | CU-06 A1 |
| BR-WL-10 | A failed notice **never blocks the slot indefinitely**. | CU-06 A3; ARQ §9.2 (retries: P-19) |

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
| BR-NOT-01 | By default, **one reminder per confirmed booking**, on the booking day, with configurable lead time, in the tenant's timezone. | MVP §8.3 |
| BR-NOT-02 | Reminders require **explicit, recorded and revocable consent**; having a phone number is not consent. Waitlist notices use their own consent (BR-WL-02). The AI may record consent. | MVP §8.3; actors.md §5 |
| BR-NOT-03 | Before sending, the current state is re-checked. Nothing is sent if the booking was cancelled, expired or moved to another slot, if consent was revoked, if the channel is disabled or if there is no phone. | MVP §8.3; ARQ §10.3 |
| BR-NOT-04 | Attempts, deliveries and failures are recorded; a failure **does not change** the booking or payments. | ARQ §10.3 |
| BR-NOT-05 | The tenant may **disable** the WhatsApp channel during an incident. | MVP §8.1 |
| BR-NOT-06 | Allowed outgoing messages: replies, notices about real bookings (confirmation, HOLD, reminders) and opted-in waitlist offers. **No campaigns or cold contact.** | MVP §8.1 |
| BR-NOT-07 | Notification jobs are durable and idempotent; a late job never invalidates or modifies a confirmed booking. | MVP §6.3.14; ARQ §10.3 |

## 15. Audit (`AUD`)

| ID | Rule | Origin |
|---|---|---|
| BR-AUD-01 | The following record who did it and when: creating or changing a booking slot, verifying or rejecting a deposit, correcting a no-show or a payment, applying or removing a restriction, cash movements, opening and closing the register, approving exceptions, price changes, refunds, conversation takeovers and global AI changes. | actors.md §5; MVP §6.3.13 |
| BR-AUD-02 | Personnel may consult the audit trail of their tenant; customers may not. | actors.md §2 |

## 16. Pending Decisions

None is resolved by this document. P-17 (partly) and P-20 were resolved in the UC-02 review and recorded in UC-01. **Blocking** means it affects the entity model (DOM-01) or how occupancy is guaranteed. Resolved ones keep their number for traceability. The invariants that depend on an open decision are listed in [invariants.md §14](./invariants.md#14-invariants-that-depend-on-pending-decisions).

| ID | Question | Status | Blocks |
|---|---|---|---|
| P-01 | Default notice period and future-booking limit. Which states count toward the limit, and do bookings for third parties count? | Open | No |
| P-02 | Multi-service bookings vs. combined services. | **Resolved** — a combination is one preconfigured service (BR-CAT-01). | — |
| P-03 | With "any compatible resource", how is the resource assigned? | Open | No |
| P-04 | Can a CRM booking outside regular hours fall on a **block**, or only outside the usual hours? | Open | No |
| P-05 | Can `COMPLETED` be corrected to `NO_SHOW`, or only the reverse? | Open | No |
| P-06 | When can `COMPLETED`/`NO_SHOW` be recorded (proposal: after the start)? Do they keep occupying the slot, or does an early no-show free the rest of it? | Open | **Yes** (occupancy) |
| P-07 | Business-caused cancellation outside the notice window: who may do it? Legally required refunds; how a forfeited deposit shows in cash. | **Partly resolved** — no automatic forfeiture; refunds manual by Admin; reschedule uses the new price. | Partial |
| P-08 | Precedence when the **service** and the **resource** have different deposit rules. | Open | **Yes** (deposit calculation) |
| P-09 | Mercado Pago down with a deposit required. | **Obsolete** — no Mercado Pago in the MVP. | — |
| P-10 | Session boundaries and day changes; does a payment require an open session? How does a transfer verified late enter the cash records? | **Partly resolved** — automatic opening carries the previous close; cash-in/out with reason; manual close; Admin-only post-close adjustment. | **Yes** (cash model) |
| P-11 | Corrections after a close. | **Resolved** — Admin-only new audited adjustment (BR-COB-11, BR-CAJA-09). | — |
| P-12 | Is reminder consent per customer or per booking, and when is it asked? Does a CRM booking with a phone send a WhatsApp confirmation? | **Partly resolved** — separate, recorded, revocable; the AI may record it. | No |
| P-13 | Transfer deposit vs. a 10-minute HOLD. | **Resolved** — a timely receipt moves to review with no timeout (BR-RES-06). | — |
| P-14 | Is "recording payments" a separate permission? | **Resolved** — every Staff member records payments and verifies transfers (BR-IAM-03). | — |
| P-15 | Does a reschedule modify the same booking (with history) or create a linked one? | **Proposed** — same booking with history (§8). Confirm in DOM-01. | **Yes** (DOM-01) |
| P-16 | Can Staff create a CRM booking for a `BLOCKED` customer? Proposal: no; Staff lift the restriction first, with a reason. | Open | No |
| P-17 | A `FULL_PREPAYMENT` customer booking from the CRM. Can an Admin exception (BR-SEN-09 c) confirm without the 100%? | **Partly resolved** — paying 100% in cash at the counter verifies it and confirms the booking (BR-SEN-09 a, BR-COB-06). | No |
| P-18 | How does an exclusive 5-minute offer occupy the slot (a kind of HOLD, or its own record in the same exclusion)? Until decided, exclusivity is guaranteed transactionally, without naming the mechanism. | Open | **Yes** (occupancy, DOM-01) |
| P-19 | Waitlist expiry, queue limits, long offer chains, retries after a failed notice. | Open | No |
| P-20 | Must a CRM booking for a service with a deposit rule collect it? | **Resolved** — no HOLD from the CRM; a verified deposit confirms, a pending receipt goes to review, and without payment only an Admin exception confirms (BR-SEN-09). | — |
| P-21 | Final state of a booking whose receipt was rejected. Proposal: `CANCELLED` with reason `PAYMENT_REJECTED`. | **Proposed** | Partial (DOM-01) |
| P-22 | Can Staff cancel or reschedule outside the notice window? | **Resolved** — only an Admin authorizes out-of-policy changes (MVP §6.3.9). | — |
| P-23 | Minimum attendee data; how a third party's no-show is attributed and aggregated. | Open | Partial (DOM-01 needs the attendee) |
| P-24 | Pending review edge cases: the booking start arrives while still pending; the customer cancels while pending; safeguards against abuse of indefinite review (accepted risk, MVP §9.2). | Open | No |
| P-25 | During a reschedule that waits for an extra deposit, is the target slot protected? | Open | **Yes** (occupancy) |
| P-26 | Final resolution of late or unmatched transfers and overpayments (refund, credit to another booking). | Open | No |
| P-27 | Deposit evidence without an image; a receipt for less than the required amount. | Open | No |

**Blocking for DOM-01 or the occupancy model:** P-06, P-08, P-10, P-15, P-18, P-25 (and partly P-21, P-23).

## 17. Differences With Earlier Documents

`mvp.md` v0.2 and the target architecture v1.1 are aligned with UC-01; **no contradiction was found with them**. The remaining differences are with `rules.md` (not in the repository) and with issues written before UC-01:

| Document | Says | Current decision |
|---|---|---|
| `rules.md` RG-21, RG-28 | HOLD only with a deposit; Mercado Pago confirms the deposit. | WhatsApp always starts with a HOLD; deposit by transfer with human verification (BR-RES-03, BR-SEN-06, BR-SEN-07). |
| `rules.md` RG-30 | Methods include Mercado Pago. | `CASH` and `TRANSFER` only (BR-COB-04). |
| `rules.md` RG-08, RG-10, RG-39 | Only Admin applies restrictions to customers. | Staff and Admin apply individual restrictions (BR-CLI-08). |
| `rules.md` RG-09, RG-10 | The cash permission is the only granular permission. | Two delegated privileges: cash and availability (BR-IAM-05). |
| `rules.md` RG-23 | Personnel exceptions to be defined later. | Only an Admin authorizes out-of-policy changes (BR-CAN-03). |
| `rules.md` RG-41 | Mechanics of automatic opening to be defined. | Carries the cash declared at the previous close (BR-CAJA-03). |
| Issue CON-02 (#11) | The public API creates, consults, cancels and reschedules bookings. | Public endpoints are read-only landing information (ARQ §11). |
| Issue UC-02 — Scope | "Contemplar … reservas públicas". | Excluded from the MVP (MVP §5.3); see [use-cases.md §7](../uc-02/use-cases.md#7-excluded-and-deferred-use-cases). |

**Recommendation:** mark `rules.md` as superseded by UC-01 and `mvp.md` v0.2, or update it, so that the team does not work from two sources.
