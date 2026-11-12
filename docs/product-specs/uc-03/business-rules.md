# UC-03 — Business Rules

> **Status:** In Review — product-owner reconciliation and follow-up decisions through 2026-11-12; not collective team approval and not implemented. The [handoff](../../../agendoxa_audit_handoff.md) is historical provenance; later agreements supersede incompatible portions.
> **Objective:** Turn the agreed product decisions into verifiable business rules: what must hold and who may do it.
> **Scope:** Channels, tenants, role-based permissions, customers, catalog, availability, booking lifecycle, cancellation and rescheduling, deposits, charges and payments, cash register, waitlist, AI and human handoff, notifications, audit, personal data and retention.
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
- **Follow-up** in an origin means the product-owner agreements in the subsequent conversation on 2026-11-04. The [execution record](../../exec-plans/completed/dom-01-follow-up-decisions.md) maps their coverage; this document remains the canonical rule source.
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
| Personal data and retention | `DAT` | — (cross-cutting) |

## 1. Channels (`CH`)

| ID | Rule | Origin |
|---|---|---|
| BR-CH-01 | **Individual WhatsApp chats are the only customer self-service channel**: consult, book, confirm, cancel, reschedule, send receipts, join the waitlist and manage consent. | ACT-01; FLW Shared Rules; MVP §5.2 |
| BR-CH-02 | The landing page is **informational**: business identity, services, location, hours and a WhatsApp CTA. It has no availability calendar, booking form, checkout or customer accounts. | MVP §7.2; ARQ §3; RG-02 |
| BR-CH-03 | A Google Business Profile/Maps link to WhatsApp may be configured **manually**; there is no Google API integration. | EXT-04; MVP §5.2 |
| BR-CH-04 | Authenticated personnel operate through the **mobile-first CRM**, including walk-in bookings. | ACT-03; MVP §7.1 |
| BR-CH-05 | CRM and WhatsApp invoke **the same tenant-scoped use cases**. A channel may add its own validation before the use case, but never different availability, state or payment rules. | FLW Shared Rules; ARQ §6.4; RG-05 |
| BR-CH-06 | A WhatsApp/Evolution outage interrupts customer self-service and outgoing messages only; **the CRM and the booking core keep working**. | actors.md §5; MVP §3.5; ARQ §10.2 |
| BR-CH-07 | Individual chats support text, images and PDF transfer evidence. PDF/image is requested first; text-only transfer reporting is available only on explicit inability to attach evidence (BR-SEN-12). Voice notes and group chats remain out of scope. | Follow-up; SYS-01 |

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
| BR-CLI-03 | A requester may book for another attendee; only the attendee's name is mandatory, phone is optional and no separate account is required. Being named grants no booking-management rights. | Follow-up P-23 |
| BR-CLI-04 | A CRM walk-in booking requires the customer's **name**; the phone is **optional**. Without a phone there is no automatic communication with that customer. | CU-02 A7; RG-14 |
| BR-CLI-05 | Customers are **never merged** because their names match. | CU-12; RG-14 |
| BR-CLI-06 | Every `NO_SHOW` is attributed to `Booking.customer_id`, including bookings for another attendee. Current booking outcome is the sole count source; `CustomerIncident` records other incidents, not no-shows. | Handoff F-017 |
| BR-CLI-07 | From **two no-shows**, the CRM shows an internal indicator and count; it does not itself sanction the customer. | Handoff F-017 |
| BR-CLI-08 | Individual restrictions: `NONE`, `FULL_PREPAYMENT` or `BLOCKED`; authorized roles apply or remove them with actor and reason. | Handoff F-001, F-017 |
| BR-CLI-09 | `BLOCKED` prevents new WhatsApp bookings. Any CRM actor with booking-creation permission may create an exceptional booking after a clear internal warning; record the actor and exception, without lifting the restriction or requiring an additional exception permission. Other policies, required payments and availability still apply. `FULL_PREPAYMENT` requires 100% verified and allocated under BR-COB-03 unless Admin authorizes its existing exception. | Follow-up P-16; F-004, F-010; product-owner agreement 2026-11-12 |
| BR-CLI-10 | The future-booking limit is tenant-configurable and disabled by default. If enabled, count future occupying bookings of that requester in that tenant: HOLD, confirmed, pending review/correction and partial-deposit waiting bookings, including third-party bookings. Exclude cancelled, expired, completed and no-show bookings. Enforce the count atomically on creation/claim; a reschedule must not count its same booking twice. | Follow-up P-01 |
| BR-CLI-11 | The requester's name is captured when needed, **reused** in later conversations and may be updated. | MVP §5.1 |
| BR-CLI-12 | The CRM shows a **late-changes** count separate from no-shows, with its history and split into late cancellations and late reschedules. It increases once when a customer-requested change is confirmed and executed after the applicable notice window (BR-CAN-14), not for inquiries, declined confirmations, technical repeats or business-caused changes. It is attributed to the requester within the tenant, is never a `NO_SHOW`, is not added to the no-show count and applies no automatic sanction. | Follow-up P-01 |

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
| BR-DISP-05 | A customer may select a resource or any compatible one. For the latter, the tenant selects preference-order assignment or rotation among available compatible resources. Recheck selection and occupancy atomically; a query never advances into an actual reservation by itself. Exact concurrent rotation implementation remains technical design. | Follow-up P-03 |
| BR-DISP-06 | An authorized extraordinary opening can extend regular hours, but cannot override blocks or active claims; its authorization is recorded. | Handoff F-011 |
| BR-DISP-07 | Authorized extraordinary openings are available through CRM and WhatsApp alike. | Handoff F-011 |
| BR-DISP-08 | A change of hours or blocks **preserves confirmed bookings**; the detailed policy for conflicts is deferred. | CU-15 A3 |
| BR-DISP-09 | Booking lead time is configurable per tenant, default 0 minutes; never create a reservation for a slot whose start has passed. This is distinct from cancellation/reschedule notice periods, which default to 10 hours (BR-CAN-01). | Follow-up |

## 7. Booking Lifecycle (`RES`)

| ID | Rule | Origin |
|---|---|---|
| BR-RES-01 | Minimum booking data: requester (WhatsApp number, or customer name in the CRM), attendee when different, service, resource, start and end. | CU-02, CU-04; RG-14 |
| BR-RES-02 | A booking covers the range `[start, end)`; the end comes from the service duration. | ARQ §9.1 |
| BR-RES-03 | Over WhatsApp, selecting a concrete slot creates an **exclusive 10-minute HOLD**, whether or not a deposit applies. | MVP §6.3.3; ARQ §6.4 |
| BR-RES-04 | **Without a deposit**, `HOLD` → `CONFIRMED` only with **explicit customer confirmation** before the HOLD expires. No human approval is needed. | MVP §6.3.4 |
| BR-RES-05 | **With a deposit**, the price, deposit amount, receiving alias and holder, and the cancellation policy are shown **before** the transfer. | MVP §6.3.5; ARQ §9.3 |
| BR-RES-06 | Timely evidence is handled under BR-SEN-12 and BR-SEN-14–16: plausible evidence, a second clearly unrelated file, or an uncertain/failed screening enters human review; a first clearly unrelated file instead prompts replacement. While actually pending human review the slot stays blocked, with no automatic review timeout, and the booking is visible in the CRM review queue. | MVP §6.3.5; product-owner agreement 2026-11-09 |
| BR-RES-07 | Actual credit must be verified by authorized personnel. Initial-deposit rejection follows BR-SEN-10; a pending human review has no automatic decision timeout. | Handoff F-005, F-018 |
| BR-RES-08 | An unconfirmed HOLD expires at its deadline if no evidence is awaiting preliminary screening or human review and no verified partial deposit protects it; it may wake the waitlist. Check known timely evidence and current state/funds first; BR-SEN-16 governs evidence timing and screening, BR-SEN-18 governs timely evidence delivered after release, and BR-SEN-11 protects partial funds. | Follow-up; product-owner agreements 2026-11-09, 2026-11-12 |
| BR-RES-09 | Authorized CRM personnel may create a booking directly in `CONFIRMED` without a conversational HOLD, using the same occupancy check; BR-SEN-09 applies to deposits. | MVP §5.2; Handoff F-001 |
| BR-RES-10 | Authorized personnel may manually record `COMPLETED` from the booking start instant, never earlier; completion does not mean paid. | Follow-up P-06 |
| BR-RES-11 | Authorized personnel may manually record `NO_SHOW` from start + 15 minutes, never earlier; the requester bears the count even for another attendee. No automatic no-show. | Follow-up P-06; F-017 |
| BR-RES-12 | Personnel with outcome-correction permission may correct `NO_SHOW` ↔ `COMPLETED`, respecting the destination outcome's timing guard, with mandatory reason, actor, time and prior/new state history. Recalculate the requester count; do not automatically alter payments, refund money or displace a reused walk-in. | Follow-up P-05 |
| BR-RES-13 | **No automatic close**: when its time ends, a `CONFIRMED` booking stays *pending operational close* until personnel record what happened. Time passing never completes it, marks a no-show or proves payment. | FLW Shared Rules; RG-34 |
| BR-RES-14 | CRM quick actions: complete, complete and collect (amount prefilled), complete with balance due, record no-show. | CU-10; RG-35 |
| BR-RES-15 | The booking's origin (`WHATSAPP`, `CRM`) is recorded. There is no `LANDING` origin. | BR-CH-02 |
| BR-RES-16 | An `EXPIRED` HOLD or a valid cancellation **never** counts as a no-show. | CU-10 A4; RG-36 |
| BR-RES-17 | Early completion or no-show keeps the remaining time private, not offered automatically. A role permitted to book may atomically adjust the former occupancy and create a CRM walk-in, preserving history and preventing overlap; later no-show correction never displaces that walk-in. No automatic charge recalculation or refund follows early completion. | Handoff F-007, F-017 |

**Proposals to validate:**

- *Pending operational close* (BR-RES-13) is a **derived condition** (`CONFIRMED` and end < now), not another state.
- Outcome timing and corrections are agreed in BR-RES-10–12, not pending proposals.

## 8. Cancellation and Rescheduling (`CAN`)

| ID | Rule | Origin |
|---|---|---|
| BR-CAN-01 | Each tenant configures a **minimum notice** for cancelling and rescheduling, **10 hours before start by default**, with service/resource overrides. It defines when a change is free of late consequences, not an absolute prohibition (BR-CAN-14). | MVP §6.3.9; follow-up P-01 |
| BR-CAN-02 | Over WhatsApp, the customer cancels or reschedules only bookings **managed by their sender number** in that tenant; any other number needs business intervention. | MVP §6.3.8; RG-13 |
| BR-CAN-03 | Outside the notice window the customer may still proceed by accepting the configured consequences (BR-CAN-14), without Admin intervention. **Only an Admin** may authorize an exception to those consequences, with an auditable reason. | Follow-up P-01; supersedes MVP §6.3.9 refusal |
| BR-CAN-04 | Explain applicable cancellation conditions, including the tenant's deposit policy (BR-SEN-13), and request explicit confirmation to cancel and release the slot; nothing is forfeited or refunded automatically. An authorized confirmed cancellation releases immediately, including during review or partial-deposit collection. Financial verification/resolution continues separately: verified funds may be manually applied to another booking or resolved by personnel, including an Admin-managed refund. Neither review nor refund completion may freeze a cancelled slot; timely evidence delivered after an explicit cancellation follows human financial handling, not re-blocking (BR-SEN-18). | Follow-up P-24, P-26; product-owner agreement 2026-11-12 |
| BR-CAN-05 | Every customer cancellation or reschedule needs **explicit confirmation**. | CU-08, CU-09 |
| BR-CAN-06 | Personnel with cancellation permission may cancel for an operational business cause, including near the appointment, recording reason, releasing occupancy, notifying the customer and offering another date. This is not authority to grant customer commercial-policy exceptions. Review and any Admin-managed refund remain separate; no automatic forfeiture or refund. | Follow-up P-07 |
| BR-CAN-07 | The reschedule limit is configurable and **unlimited by default**. | CU-09 |
| BR-CAN-08 | A reschedule checks the new slot **without releasing the current one**; if anything fails, **the original booking stays intact**. | MVP §6.3.10; ARQ §9.1 |
| BR-CAN-09 | Verified payments are **preserved**; the new price and the balance are recalculated under the new conditions. | CU-09; MVP §6.3.10 |
| BR-CAN-10 | For a permitted reschedule of a `CONFIRMED` booking whose verified deposit does not cover the destination's requirement, atomically move to the free target and release the old slot; retain verified funds and allocations, then request and verify any additional deposit, unless personnel decide not to collect the supplement under BR-CAN-15. It remains `CONFIRMED` if unpaid, for manual handling, without automatic rollback or cancellation. `FULL_PREPAYMENT` and Admin-only exceptions otherwise still apply; non-collection of this supplement is not Admin-only. A change awaiting prior human authorization does not occupy the target. A late reschedule whose deposit is lost under tenant policy follows BR-CAN-14. This is not the partial-deposit waiting of BR-SEN-11: a reschedule never confirms a booking that is still unconfirmed. | Handoff F-006, F-010; product-owner agreement 2026-11-12 |
| BR-CAN-11 | If they require **less**, nothing is refunded automatically: retained valid allocations reduce the remaining balance; any excess or other available unallocated verified funds require manual resolution. An overpayment is resolved manually. | MVP §6.3.10; Handoff F-004; product-owner agreement 2026-11-12 |
| BR-CAN-12 | A successful reschedule moves the booking and releases the old slot **in one atomic change**; reminders are rescheduled and the waitlist is considered for the old slot. | ARQ §9.1 |
| BR-CAN-13 | On a change of professional, preserve the customer's verified deposit credit and actual receiving-account history; collect only the remaining amount under the booking's collection modality. Internal compensation is manual and must not block an otherwise permitted move or require the customer to pay the credited amount twice. No automatic bank transfer, refund or commission calculation. | Follow-up |
| BR-CAN-14 | A customer may cancel or reschedule after the notice window. Before confirming, the AI states that the change is late and its consequence under the tenant's policy, for example: “Estás dentro de las 10 horas previas al turno. Podés cancelar o reprogramar, pero según la política del negocio perderías la seña de esta reserva. ¿Querés continuar?”, adapting hours and consequence to the configuration. Explicit acceptance needs no Admin. The executed change records a late change (BR-CLI-12), never a `NO_SHOW`. Any money consequence is managed manually by personnel. If the deposit is lost under tenant policy, personnel resolve whether another deposit applies; the system neither requires it automatically nor cancels the moved booking, and the AI only communicates the policy and the next steps. | Follow-up P-01, P-28 |
| BR-CAN-15 | For the reschedule supplement in BR-CAN-10, personnel with payments permission may decide not to collect it in every case, including when `FULL_PREPAYMENT` applies, with an optional reason; this decision is not Admin-only. The paid deposit, price and `CONFIRMED` status do not change. The AI tells the customer that nothing more is owed in advance and the remainder is paid at the appointment; it never says the amount was forgiven. | Product-owner agreement 2026-11-12 |

Rescheduling preserves the booking and records the request, slot history and financial consequence in `BookingChangeRequest` and `BookingEvent` (F-006).

## 9. Deposits (`SEN`)

| ID | Rule | Origin |
|---|---|---|
| BR-SEN-01 | A deposit is **optional** per tenant. | MVP §9.1 |
| BR-SEN-02 | Policy fields distinguish inherit, set and disable; precedence is resource > service > tenant. No default values are implied. | Handoff F-010 |
| BR-SEN-03 | A deposit is a **fixed amount** or a **percentage** of the price. | MVP §9.1; RG-27 |
| BR-SEN-04 | The `FULL_PREPAYMENT` restriction replaces the deposit rule: **100%** is required. | BR-CLI-09 |
| BR-SEN-05 | The required amount is **computed by the backend**; neither the AI nor the frontend decides it. | ARQ §7 |
| BR-SEN-06 | Resolve the receiving account by the booking's collection modality (BR-COB-19). Business collection uses its default account or optional sequential rotation through active business accounts in configured order (A → B → C → A), selecting when instructions are issued, not on verification. Persist the instruction/account before showing it; retries reuse it rather than rotate again. Later account/configuration changes never rewrite issued instructions or received payments. | Follow-up; F-002 |
| BR-SEN-07 | Deposit funds require **human verification of actual credit** and allocation to the booking's charge to satisfy its required threshold. Verification for a booking allocates in the same human action under BR-COB-03; a screenshot, OCR result or AI interpretation never proves credit, and there is no bank API. | MVP §3.8, §9.1; Handoff F-004; product-owner agreement 2026-11-12 |
| BR-SEN-08 | Mercado Pago and other payment gateways are **not integrated** in the MVP. | EXT-05; MVP §5.3 |
| BR-SEN-09 | CRM bookings have no conversational HOLD: verified funds allocated under BR-COB-03 to meet the required threshold confirm; unverified evidence occupies under review; a verified but insufficient deposit occupies under BR-SEN-11 without confirmation. With neither funds nor evidence the slot stays free unless Admin confirms the existing no-deposit exception, recording unpaid deposit and full balance (reason optional). The existing FULL_PREPAYMENT exception remains Admin-only. | Follow-up; P-17, P-20; product-owner agreement 2026-11-12 |
| BR-SEN-10 | With no verified partial deposit, first human rejection of initial evidence retains occupancy for a 15-minute correction window; timely distinct evidence is handled under BR-SEN-14–16, with pending screening or human review preventing timeout against that evidence. A second distinct human rejection or correction-window expiry cancels before start only through an atomic check-and-transition that rechecks current evidence, screening, review, verified funds, deadline, ownership and start; technical duplicates and preliminary AI discards do not count as human rejections. Started appointments, supplemental reschedule collection and BR-SEN-11 verified partial deposits never auto-cancel through this mechanism. Notify customer/staff of a permitted second-rejection cancellation. | F-018; follow-up P-27; product-owner agreement 2026-11-09 |
| BR-SEN-11 | The initial deposit may be completed through multiple payments. Any verified partial deposit associated with the booking retains occupancy without automatic release for a missing remainder, rejected subsequent evidence or elapsed time. Until the required threshold is verified and allocated under BR-COB-03, the booking stays unconfirmed in an occupying partial-deposit waiting condition, distinct from an actually pending review. Show missing amount and contact action in CRM. Authorized personnel may cancel/release manually subject to applicable permissions/policy; explicit authorized customer cancellation also releases under BR-CAN-04. Preserve received money/history and resolve manually; no automatic forfeiture/refund. | Follow-up P-27; product-owner agreement 2026-11-12 |
| BR-SEN-12 | Ask first for PDF/image transfer evidence. Only when the customer explicitly says they cannot provide it, accept transfer details by text within the same evidence deadline; create a human PaymentReview, not verified money. Never demand a new image after that explicit fallback or reset the HOLD by retrying. Securely retain any file in StoredAsset; no AI/image/PDF/text proves bank credit. | Follow-up P-27 |
| BR-SEN-13 | Each tenant configures its deposit policy: **no money back**, with rescheduling or a change of service as the alternatives, or **refund possible**. The AI only communicates the configured policy; authorized personnel always manage the money manually, refunds keep their Admin boundary (BR-COB-18) and nothing is forfeited or returned automatically. Configuration cannot replace applicable legal duties (P-07). | Follow-up P-07, P-26 |
| BR-SEN-14 | AI preliminarily screens submitted image/PDF evidence for relevance as a transfer receipt, not authenticity or bank credit. A plausible file goes to human review. For the first clearly unrelated file, explain that it does not appear to be a receipt and ask for a replacement; for the second clearly unrelated attempt, explain the failed attempts, ask the customer to await human review and create that review. Neither discard is a human financial rejection; duplicate delivery of the same attempt is not another attempt. Timely evidence delivered after a deadline-based release follows BR-SEN-18. | Product-owner agreements 2026-11-09, 2026-11-12 |
| BR-SEN-15 | If screening fails or its result is uncertain, do not label the file unrelated, claim it is authentic or credit money. Preserve it and route it conservatively to human review, without claiming that the human has already checked the bank. Explicit inability to attach still permits the text fallback in BR-SEN-12. | Product-owner agreement 2026-11-09 |
| BR-SEN-16 | Record WhatsApp evidence and its provider-assigned message send time before processing. Judge timeliness against the HOLD or correction-window deadline by that WhatsApp timestamp, not the customer's device clock, system arrival or screening completion. Evidence sent after the applicable deadline is late even if delivered soon after. Expiry or correction timeout must not release occupancy against known timely evidence while its preliminary analysis is unresolved; BR-SEN-18 governs timely evidence delivered after release. Apply the result against current booking and funds: a first unrelated file requests replacement within the existing deadline, without renewing the HOLD or correction window; if that deadline has passed, the applicable expiry/correction rule may proceed after rechecks. A timely second unrelated attempt enters human review without an inactivity timeout, even if screening finishes after the deadline, except for evidence delivered after deadline-based release under BR-SEN-18. Preserve late evidence for human financial handling under BR-SEN-17. No retry or delivery delay grants additional customer time. | Product-owner agreements 2026-11-09, 2026-11-12 |
| BR-SEN-17 | For evidence sent after the applicable deadline when the HOLD expired and its slot was released, retain the evidence for personnel; never discard it, revive the old booking or reclaim its slot. If verified as late evidence for the expired booking, record the money without allocation until personnel decide on a new booking, credit or refund. Tell the customer the booking expired and the business will review the payment, never that it was received or accepted. If the released slot remains available under the normal availability check, including waitlist priority, the AI may offer to book it again through the normal flow: a new HOLD, current terms and explicit customer confirmation. The late receipt may be linked to the new booking for human verification under BR-COB-03; otherwise the late-evidence handling applies. Timeliness follows BR-SEN-16; timely evidence delivered after release follows BR-SEN-18 instead. | Product-owner agreement 2026-11-12 |
| BR-SEN-18 | When WhatsApp evidence sent within the applicable HOLD or correction-window deadline reaches the system after release due to HOLD expiry or correction-window timeout, screen it first. If plausible, uncertain or screening fails, re-block a free slot for the same original booking, reactivate it with its original terms, record and audit the reactivation, and enter human review with personnel notified to verify the receipt. Browsing or selection without a HOLD does not prevent re-blocking; tell that customer the slot is no longer available if they later try to book it. Withdraw sent unclaimed waitlist invitations, including exclusive priority, and tell invitees the slot was taken; their entries retain their original priority for future openings (BR-WL-06–08). If another customer already holds a HOLD or confirmed booking, never take it from them: send the case to priority personnel review for a decision, such as offering the original customer another time. If screening finds the file clearly unrelated, do not re-block; tell the customer it does not look like a receipt and the booking expired, and the AI may offer a new booking using the availability check and normal flow in BR-SEN-17. Count the evidence attempt only under the existing rules, never as an extra attempt, and grant no extra time. Evidence delivered after explicit customer or business cancellation, or any other terminal cause, does not re-block: personnel handle it as a late financial matter, deciding credit or refund. This deadline-expiry case with timely provider-stamped WhatsApp evidence and the stated screening result is the only re-blocking of a released slot for its original booking; evidence never proves payment. **Pending:** how the screening prerequisite applies to the text-only fallback in BR-SEN-12, which is not an image/PDF under BR-SEN-14. | Product-owner agreement 2026-11-12 |

## 10. Charges, Balances and Payments (`COB`)

Three concepts are kept apart (ARQ §6.1): the **booking** (what and when), the **charge** (what is owed) and the **payment** (money recorded as received). The **cash register** (§11) records where physical cash is accounted for.

| ID | Rule | Origin |
|---|---|---|
| BR-COB-01 | In the MVP only charges **linked to bookings** of services or rentals are recorded. No products, bar or shop. | MVP §5.1; RG-29, RG-47 |
| BR-COB-02 | A `Payment` represents verified money belonging to a known commercial operation of the tenant; personal or wholly unknown transfers are not payments. A verified commercial payment may have zero allocations, including after booking expiry; retain origin, method, verification, dates and reason. | Handoff F-003 |
| BR-COB-03 | `PaymentAllocation`s distribute verified funds across charges, including partial and cross-booking allocations. When personnel verify money for an active booking, including by approving its receipt or recording a transfer in the CRM, allocate it to that booking's charge in the same human action, up to the amount owed; an active booking never holds verified-but-unallocated funds. Excess and unknown-origin money remain unallocated for manual resolution (BR-COB-15, BR-COB-17); unknown or personal transfers are not payments (BR-COB-02). Late evidence follows BR-SEN-17. Other allocation of available verified funds is a manual personnel decision. Charge balance is max(0, net amount due minus valid allocations); available funds are net verified, unrefunded funds minus valid allocations. No negative debt. | Handoff F-004; product-owner agreement 2026-11-12 |
| BR-COB-04 | `PaymentReview` is human evidence evaluation (pending, approved, rejected); `Payment` is verified commercial money, with cash or transfer method. Direct CRM verification needs no review; an approved review and a payment have at most one counterpart each. Rejected evidence creates no payment. | Handoff F-005 |
| BR-COB-05 | Authorized personnel verify a transfer by checking actual credit; amount, verifier and time are recorded. | Handoff F-001, F-005 |
| BR-COB-06 | A cash payment is recorded by the employee who **physically receives** it, and is verified when recorded. | CU-11 step 3 |
| BR-COB-07 | The AI may attach evidence for a pending `PaymentReview`; it never verifies money or creates a verified payment. | Handoff F-005 |
| BR-COB-08 | The CRM may record cash, or a bank-verified transfer, **without an attached image**. | MVP §9.1 |
| BR-COB-09 | Time passing **never** approves a pending `PaymentReview`, creates a verified `Payment`, or turns a completed booking into a paid one. | FLW Shared Rules; RG-33; Handoff F-005 |
| BR-COB-10 | Every payment keeps its responsible employee, amount, method and timestamp. | RG-43 |
| BR-COB-11 | Original payments are immutable and never deleted; corrections append linked history. For physical-cash corrections, authorized personnel act while the associated cash session is open; after close only an Admin records a separate audited `CashAdjustment`, leaving the close unchanged. Transfers need no cash session. The technical ledger-correction mechanism for transfers and other non-cash-session corrections remains pending; `CashAdjustment` is not a general financial log and `AuditEvent` does not replace a financial ledger. Refunds use separate `Refund` operations, never negative payments. | Handoff F-001, F-012, F-013 |
| BR-COB-12 | A transfer that arrives after the slot was released, or cannot be matched, is a **financial incident** for human handling. It never reconfirms a booking automatically. Evidence sent late follows BR-SEN-17; timely WhatsApp evidence delivered after release follows BR-SEN-18. | MVP §6.3.6; ARQ §9.3; product-owner agreement 2026-11-12 |
| BR-COB-13 | Changing an agreed price is **Admin-only**, with a reason, and needs **customer acceptance** when the price increases. | CU-11 A5; CU-15 A2 |
| BR-COB-14 | Refunds are **manual**, recorded by an Admin; there are no automated bank refunds. | CU-11 A6; MVP §5.3 |
| BR-COB-15 | Overpayments are resolved manually, with traceability. | MVP §9.1 |
| BR-COB-16 | A **retry of the same payment operation** (repeated request, repeated verification, duplicated message) never records the payment twice. Two **separate manual entries** that may be the same money cannot be told apart automatically: both are kept and flagged for human review, and corrected through BR-COB-11. | MVP §6.3.14; ARQ §9.3; CU-11 A9 (flagging: Proposal) |
| BR-COB-17 | Allocations are atomic and idempotent, capped by both available funds and charge balance; excess remains unallocated for manual application or Admin-authorized refund. Corrections preserve history and account for refunds without double counting. | Handoff F-004 |
| BR-COB-18 | `Refund` is a separate operation linked to the original immutable `Payment`, with amount, method, reason, Admin authorization, execution status, dates and source/destination trace. Only execution reduces retained funds; prevent excess across pending refunds and allocations. Correct allocations historically. Cash refunds create an outgoing cash movement in an open session; transfers are bank outflows, not cash movements. | Handoff F-013 |
| BR-COB-19 | Each tenant configures one collection modality: **all to professional** (default), **deposit to business / remainder to professional**, or **all to business**. A professional Resource may have a receiving account without being a CRM user. Missing professional account falls back to a business account using its default/rotation, never another professional's account. If no business fallback exists, involve personnel rather than invent an account or waive a required deposit. These are transfer-routing choices, not extra physical cash registers. | Follow-up |
| BR-COB-20 | Preserve the collection modality with booking conditions and each stage's actual receiver/account instruction. Identify the payee clearly; verified deposit allocations reduce the total once, never an additional fee for split collection. Configuration changes are not retroactive. Distributions/compensations between business and professionals are manual; no automated payouts, commissions or internal bank transfers. | Follow-up |
| BR-COB-21 | Recording mistakes (e.g. $10,000 entered instead of $1,000 received) require correction permission, mandatory reason, actor/time and linked immutable original/correction history. Recompute valid funds, allocations and debt without inventing a refund or physical movement for money never received, and without automatically cancelling the booking. Closed physical-cash corrections remain Admin-only; ledger representation remains technical work. | Follow-up; BR-COB-11 |

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
| BR-CAJA-11 | Crossing midnight does not close or replace an open cash session, nor block new collections. It remains open until manual close; preserve actual movement instants and show the session opening time in CRM. Reporting date cutoffs are distinct from session lifetime. | Follow-up P-10 |

Expected cash is opening cash plus signed physical movements. A cash payment and its linked movement represent the same money and must not be summed twice. Cash payment versus close is serialized; verified transfers need no physical session and never alter a closed one (F-012, F-014).

## 12. Waitlist and Exclusive Offers (`WL`)

| ID | Rule | Origin |
|---|---|---|
| BR-WL-01 | The waitlist is **voluntary**. Available alternatives are offered first, unless the customer says the time is non-negotiable. | MVP §6.3.7 |
| BR-WL-02 | Joining requires the customer's explicit request for those conditions and current waitlist-notice consent, independent of reminder consent. Reuse the recorded four-option preference (BR-NOT-09); do not ask the same consent question on each entry. Record entry conditions, arrival time and applicable consent provenance, rechecking current customer preference before sending. | Follow-up; F-020 |
| BR-WL-03 | A waitlist entry **does not reserve or guarantee** a slot. | CU-05; ARQ §9.2 |
| BR-WL-04 | A requester has at most one entry for the same conditions; a repeated request keeps the original arrival order. | FLW CU-05; CU-05 A3 (arrival order: Proposal) |
| BR-WL-05 | An offer starts only when a compatible slot is actually released; early completion or no-show does not release residual time to automatic offers. | Handoff F-007 |
| BR-WL-06 | For a released slot with **1–4 eligible people**, notify the first in arrival order with five minutes of exclusive priority. If unclaimed, invite the next every five minutes; previously notified people may still claim. Later invitees have no exclusive five-minute window. With **5 or more eligible people**, notify all simultaneously without exclusive priority. Eligibility is specific to the released slot, tenant and preferences. An unclaimed exclusive invitation is withdrawn under BR-SEN-18; the entry retains its original priority for future openings. | Follow-up P-19; replaces incompatible earlier exclusive-per-person chain; product-owner agreement 2026-11-12 |
| BR-WL-07 | At most one active exclusive-priority claim exists per released slot; only the first small-cohort priority window creates it. Later progressive or simultaneous notices are nonexclusive invitations and create no occupancy claims. They never displace a booking, HOLD or another protected claim; after priority ends, remaining invitations do not freeze public availability. Under BR-SEN-18, withdrawal ends the unclaimed exclusive priority for that slot before re-blocking; it does not change the entry's priority for future openings. | Follow-up; product-owner agreement 2026-11-12 |
| BR-WL-08 | A permitted claim atomically rechecks eligibility, current slot/start and occupancy, closes any first-priority offer claim and creates exactly one distinct booking-owned ten-minute HOLD claim, linking the winning invitation to at most one booking. Concurrent replies produce one winner, not multiple HOLDs; claims never change owners. Only the successful HOLD winner receives payment instructions. An invitation itself never asks for a transfer or guarantees a booking. A HOLD or confirmed booking already claimed is not displaced by BR-SEN-18. | Follow-up; retains F-008 distinct-claim invariant; product-owner agreement 2026-11-12 |
| BR-WL-09 | End of five-minute priority is not loss of invitation eligibility. Previously notified customers may claim later while the opportunity remains valid and no protected claim/booking has taken it. If unavailable, explain that priority ended and someone else took it, and offer another slot or continued waiting; never displace the winner. Late acceptance cannot recover an expired booking or bypass a newer HOLD. An unclaimed invitation is withdrawn and the invitee told the slot was taken in the BR-SEN-18 case. | Follow-up; product-owner agreement 2026-11-12 |
| BR-WL-10 | On a confirmed send failure, retry that same notice once while still valid. If the retry fails, advance to the next eligible person without deleting the failed recipient's entry. No renewal of priority or extra offer is created by retry. Unknown outcomes follow BR-NOT-10, not blind retransmission; no communication failure extends priority or freezes a slot. | Follow-up P-19 |
| BR-WL-11 | An optional resource preference restricts eligibility to that same-tenant compatible resource; without one, any compatible resource is eligible. Respect time preferences; arrival order controls progressive invitation, not first-claim winner once competition is open. | F-009; follow-up |
| BR-WL-12 | An entry expires when no future slot remains in its requested date/time range. Keep unanswered/failed-send entries for later opportunities while in range; close the fulfilled entry on successful booking or when the customer asks to leave. Do not add an arbitrary fixed-day expiry or the rejected three-offer cap. Never continue inviting for a slot whose start has passed. Exact round/progression persistence remains technical design. | Follow-up P-19 |
| BR-WL-13 | First-person notice states the five-minute exclusive priority and subsequent competition. Later-person notice says others were already notified and first successful claim wins. A simultaneous notice makes the same competition clear. Every invitation says not to transfer until HOLD acquisition is confirmed and payment instructions are given. | Follow-up |
| BR-WL-14 | In the MVP a waitlist queue holds at most **10 people**, a fixed value. A queue is per service or resource and requested range, not one list for the whole tenant. Tenant configuration is deferred to later versions. When a queue is full, the next person is told so and offered other times, with no reserve list. | Follow-up P-19, P-29 |
| BR-WL-15 | One release round corresponds to one released slot. Its mode (BR-WL-06) is fixed at the start from the people then eligible and does not change if the queue grows or shrinks. Someone enrolling during a round joins last: progressive rounds invite them in turn, simultaneous rounds notify them at once if the slot is still free. If the priority holder declines or leaves the queue, priority ends and the next person is invited without waiting out the five minutes. Anyone else leaving gets no further invitations and can no longer claim. If the winner's HOLD expires, a new round starts with the current queue, excluding that person from that round, though they may still book the slot normally if it stays free. If everyone was invited and nobody claimed, the slot stays in general availability and invited people may claim while it is free. The round ends when the slot starts. When BR-SEN-18 re-blocks the slot, withdraw unclaimed invitations and preserve their entries' original priority for future openings. | Follow-up P-19; product-owner agreement 2026-11-12 |
| BR-WL-16 | A `BLOCKED` customer cannot win an invitation, because BR-CLI-09 prevents the WhatsApp booking. So a `BLOCKED` customer is not enrolled: the AI replies as it does when they cannot book, without revealing the label. An entry whose requester becomes `BLOCKED` keeps its place and counts toward the queue limit, but is not eligible or invited while the restriction lasts. Removing the restriction makes it eligible again. | Follow-up P-39 |

**Proposal to validate:** an entry whose requester reached the future-booking limit is skipped.

## 13. AI Agent (`AGT`) and Human Handoff (`HND`)

| ID | Rule | Origin |
|---|---|---|
| BR-AGT-01 | The AI uses **authorized tools** for services, prices, availability, bookings, payment status, waitlist and consent. It never invents slots, prices, discounts or payment status, nor negotiates unconfigured exceptions. | SYS-01; ARQ §10.1 |
| BR-AGT-02 | Tools call the same use cases as the CRM, with tenant and requester **fixed by the validated connection**. The LLM chooses neither. | ARQ §10.1 |
| BR-AGT-03 | The AI enforces restrictions, notice periods and deposit warnings, and **never reveals internal labels**. | CU-12 step 4 |
| BR-AGT-04 | The AI cannot verify transfers, infer no-shows, modify cash records or obtain Staff/Admin privileges. | SYS-01 |
| BR-AGT-05 | Incoming messages are **persisted before processing** and deduplicated; consecutive messages are grouped after **5 seconds** without another incoming message. Grouping is an optimization over persisted messages, not an in-memory queue. | MVP §8.2; ARQ §10.2 |
| BR-AGT-06 | If a tool, the model or the channel fails, the AI says so safely, invents nothing and offers a human. | CU-01 A5; ARQ §10.1 |
| BR-AGT-07 | The system cannot detect a transfer the customer did not report; only personnel checking the bank can detect it. The AI never initiates a message about such a transfer. If the customer says they already transferred, the AI looks up their bookings: with none, follow the normal service, date, HOLD and receipt-request flow; with one awaiting a deposit, including one created manually by personnel, request and link the receipt to it for the usual human verification; with several awaiting a deposit, ask which booking. If bookings exist but none awaits a deposit, follow the normal flow if the customer wants to book something else; otherwise request the receipt and send it to personnel as a payment to review, telling the customer the business will review it and confirm. This review changes no booking; personnel decide whether to apply verified money to a balance, keep it as credit or refund it, subject to applicable permissions. The transfer is never treated as received on the customer's statement; only personnel verify it. | Product-owner agreement 2026-11-12 |
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
| BR-NOT-02 | Reminder and waitlist-notice consent remain independent, explicit, recorded and revocable. A phone number is not consent. One combined question collects both preferences without forcing acceptance of both (BR-NOT-09). | Follow-up; F-015, F-020 |
| BR-NOT-03 | Before each attempt, validate conditions for its notice kind: reminders need a confirmed current slot and reminder consent; offers need a valid unexpired offer and its waitlist opt-in. Customer sends also require an ACTIVE connection and phone; revocation stops queued sends. The required staff alert after a second initial-evidence rejection is tied to that booking/rejection event and authorized tenant personnel, not to customer reminder consent or a still-confirmed booking. Its dispatch mechanism remains technical design. | Handoff F-015, F-016, F-018, F-020 |
| BR-NOT-04 | One logical Notification has zero or more NotificationAttempts with time, outcome, error and optional conversation Message. Persist the send intention before dispatch; restarts do not lose it. Retry the same notice, recording a separate actual attempt, not duplicate notices. Provider acceptance is not delivery; apply BR-NOT-10–11. | Follow-up; F-016 |
| BR-NOT-05 | The tenant may **pause** the WhatsApp channel during an incident. A paused connection keeps its number and instance; no automatic notices are sent and the AI does not reply. Incoming messages are still stored in the tenant's shared CRM inbox, the CRM shows that the channel is paused, and personnel reply from the business phone, not from the CRM. **Retiring** a connection is different: it frees the number and instance for another tenant. A message that does not resolve to an active or paused connection is not processed. | MVP §8.1; P-33, P-35 |
| BR-NOT-06 | Allowed outgoing messages: replies, notices about real bookings (confirmation, HOLD, reminders) and opted-in waitlist offers. **No campaigns or cold contact.** | MVP §8.1 |
| BR-NOT-07 | Notification jobs are durable and idempotent; a late job never invalidates or modifies a confirmed booking. | MVP §6.3.14; ARQ §10.3 |
| BR-NOT-08 | If start minus reminder lead time is at or before confirmation, omit the reminder, not the separate confirmation. Rescheduling invalidates the old reminder and schedules a new one only if due in the future; cancellation prevents sending. Calendar rules use tenant timezone and instants UTC. An omission may have zero attempts. | Handoff F-023 |
| BR-NOT-09 | At first booking confirmation, if preferences are not yet recorded, ask one optional question: “¿Querés recibir avisos por WhatsApp sobre tus turnos y oportunidades de la lista de espera? Podés cambiar tus preferencias en cualquier momento desde el chat.” Choices: **Sí, ambos / Solo recordatorios de turnos / Solo lista de espera / No recibir avisos**. Retain both choices per customer/tenant, including refusal, without re-prompting on each booking or entry. A first waitlist flow with no prior choice uses this same question; joining for specific conditions is not blanket consent. Preferences may be changed in chat; refusal never prevents booking. | Follow-up P-12 |
| BR-NOT-10 | Confirmed send failure permits one retry while still authorized/valid. Sent, delivered or read are not failures and absence of delivery/read acknowledgement does not trigger resend. For an interrupted/unknown send outcome, recover provider status/correlation when supported; if still unknown, show it in CRM without automatic resend. Work not yet dispatched can resume on recovery, after validity checks. Outages never prolong offer priority or cause expired offers to be sent. Provider deduplication capabilities must be validated, not assumed. | Follow-up |
| BR-NOT-11 | The MVP implements no age-based purge of per-attempt technical details. When [TD-01](../../exec-plans/tech-debt-tracker.md) is resolved, the suggested value is 90 days from the attempt, keeping the logical notice's final result. Retention of other data is in [§18](#18-personal-data-and-retention-dat). Do not claim end-to-end exactly-once delivery. | Follow-up |
| BR-NOT-12 | CRM-origin reservations send a separate transactional WhatsApp confirmation when confirmed, if a customer phone and available channel exist. This is neither a reminder nor consent for other messages; no phone does not prevent booking. Dispatch remains state-aware and does not block booking success on channel failure. | Follow-up P-12 |

## 15. Audit (`AUD`)

| ID | Rule | Origin |
|---|---|---|
| BR-AUD-01 | The following record who did it and when: creating or changing a booking slot, verifying or rejecting a deposit, correcting a no-show or a payment, applying or removing a restriction, cash movements, opening and closing the register, approving exceptions, price changes, refunds, conversation takeovers and global AI changes. | actors.md §5; MVP §6.3.13 |
| BR-AUD-02 | Personnel may consult the audit trail of their tenant; customers may not. | actors.md §2 |
| BR-AUD-03 | Customer retains independent reminder/waitlist preferences; WaitlistEntry records the relevant enrollment/consent provenance and consumes current preference, not an irrevocable snapshot. A preference change and its scope-specific grant/revocation AuditEvent are atomic, with channel, actor and time, including changes applied to active entries. One combined answer can change both scopes without a second question; do not create consent entities or audit every delivery/retry. | Follow-up; supersedes earlier entry-only storage, preserves F-015/F-020 independence |

## 16. Pending Decisions

The handoff and the product-owner agreements of 2026-11-04 and 2026-11-05 (P-33 to P-39, from the team's review of PR #26) resolve the portions below, subject to team review. Later agreements take precedence; resolved IDs remain for traceability. See [invariants.md §14](./invariants.md#14-invariants-that-depend-on-pending-decisions). “Resolved” never means implemented or collectively approved.

| ID | Question | Status | Blocks |
|---|---|---|---|
| P-01 | Booking lead time, cancellation/reschedule notice defaults and future-booking limit/counting. | **Resolved** — booking lead time defaults to 0; future limit configurable and disabled by default, counting future occupying bookings including third parties (BR-DISP-09, BR-CLI-10). Cancellation/reschedule notice defaults to 10 hours, tenant-configurable; later changes proceed with warning/acceptance and a separate late-changes count (BR-CAN-01, BR-CAN-14, BR-CLI-12). Deposit effect of a late reschedule is resolved by personnel (P-28). | — |
| P-02 | Multi-service bookings vs. combined services. | **Resolved** — a combination is one preconfigured service (BR-CAT-01). | — |
| P-03 | With "any compatible resource", how is the resource assigned? | **Resolved** — tenant chooses configured preference order or rotation among free compatible resources (BR-DISP-05); concurrency mechanics remain technical design. | — |
| P-04 | Can an opening override a block? | Resolved — no; explicit authorized modification or removal is required (F-011). | — |
| P-05 | Can `COMPLETED` be corrected to `NO_SHOW`, or only the reverse? | **Resolved** — both directions with correction permission, mandatory reason/history and destination timing guards; no automatic financial effect or walk-in displacement (BR-RES-12). | — |
| P-06 | Earliest time `COMPLETED`/`NO_SHOW` may be recorded? | **Resolved** — manually from start for completion and start + 15 minutes for no-show; early remainder stays private (BR-RES-10–12, BR-RES-17). | — |
| P-07 | Business-caused cancellation, refund obligations and financial reporting. | **Partly resolved** — cancellation-capable personnel may cancel for operational business causes with reason/notification, without waiting for financial resolution (BR-CAN-06). No automatic forfeiture/refund; actual refunds remain manual/Admin-authorized. Tenants configure a no-money-back or refund-possible policy, communicated by the AI and managed by personnel (BR-SEN-13); no default policy was agreed. Applicable legal duties and reporting treatment of definitively retained funds still require professional review. | Partial |
| P-08 | Policy precedence and disabling. | Resolved — resource > service > tenant; inherit/set/disable (F-010). | — |
| P-09 | Mercado Pago down with a deposit required. | **Obsolete** — no Mercado Pago in the MVP. | — |
| P-10 | Session boundaries and day changes. | **Resolved operationally** — same session remains open across midnight until manual close; collections continue with actual timestamps (BR-CAJA-11). Date-based reporting cutoffs remain technical/reporting design, not an automatic close. | — |
| P-11 | Physical-cash corrections after a close. | **Resolved** — Admin-only separate audited `CashAdjustment`, preserving original payment and close (BR-COB-11, BR-CAJA-09); other technical ledger-correction mechanisms remain P-26. | — |
| P-12 | Consent question timing/scopes and CRM booking confirmation. | **Resolved** — one four-option question at first confirmation (or first waitlist enrollment without preferences); retain independent choices, no repeated prompts, changeable in chat. CRM confirmed bookings send transactional confirmation with phone/available channel (BR-NOT-09, BR-NOT-12). | — |
| P-13 | Transfer deposit vs. a 10-minute HOLD. | **Resolved, updated** — timely evidence follows screening and review safeguards without extending the HOLD; active human review has no inactivity timeout (BR-RES-06, BR-SEN-14–16). | — |
| P-14 | Is payment recording assigned to every Staff member? | Resolved — permissions are role-based, including payment operations (F-001). | — |
| P-15 | Reschedule identity and history. | Resolved — same booking, with request and event history (F-006). | — |
| P-16 | Can personnel create a CRM booking for a `BLOCKED` customer? | **Resolved** — anyone with booking-creation permission may create an exceptional CRM booking with warning and actor attribution, without lifting the block (BR-CLI-09). | — |
| P-17 | A `FULL_PREPAYMENT` customer booking from the CRM. Can an Admin exception (BR-SEN-09 c) confirm without the 100%? | **Resolved** — receiving 100% in cash at the counter verifies the payment; allocation to the charge in the same human action satisfies the threshold and permits confirmation (BR-SEN-09, BR-COB-03, BR-COB-06); an Admin exception may also confirm without the 100%, recording that it was not paid and the outstanding balance. | — |
| P-18 | How does an offer occupy and convert? | **Resolved conceptually, updated** — only initial exclusive priority owns a claim; progressive/broadcast invitations have none. On a valid claim close any initial offer claim and create a distinct unique booking HOLD, never mutate ownership (BR-WL-07–09). Physical round/invitation representation remains T-01/T-05 in ERD. | — |
| P-19 | Waitlist expiry, queue limits, progression and delivery failure. | **Resolved** — requested-range expiry, 1–4 progressive versus 5+ simultaneous invitations, late claims, one confirmed-failure retry then advance/retain entry; no three-offer cap (BR-WL-06–13). Fixed MVP limit of 10 per queue and round behavior agreed (BR-WL-14–15). Exact persistence remains ERD T-01/T-05. | — |
| P-20 | Must a CRM booking for a service with a deposit rule collect it? | **Resolved** — no HOLD from the CRM; verified funds allocated under BR-COB-03 to meet the deposit threshold permit confirmation, a pending receipt goes to review, and without payment only an Admin exception confirms (BR-SEN-09). | — |
| P-21 | Initial evidence rejection outcome. | **Resolved, updated** — F-018 correction window/cancellation applies only without a verified partial deposit; partial funds invoke manual release only (BR-SEN-10–11). Started/supplemental safeguards remain; reason labels are conceptual. | — |
| P-22 | Can Staff cancel or reschedule outside the notice window? | **Resolved, updated** — the customer may proceed by accepting the consequences; only an Admin authorizes an exception to those consequences (BR-CAN-03, BR-CAN-14). | — |
| P-23 | Minimum attendee data. | **Resolved** — attendee name only is mandatory; no phone/account requirement. Requester responsibility remains unchanged (BR-CLI-03). | — |
| P-24 | Review at start, customer cancellation and indefinite occupancy risk. | **Resolved** — started slots require manual handling; explicit authorized cancellation releases without waiting for review/refund, which continue separately (BR-CAN-04). Verified partial deposits also have no automatic timeout; show missing amount in CRM. The MVP accepts human supervision as the abuse control; no automatic deadline. | — |
| P-25 | Occupancy during rescheduling and additional deposit. | Resolved — after permitted move target is confirmed; prior authorization does not hold target (F-006). | — |
| P-26 | Financial incidents and recording corrections. | **Partly resolved** — offer verified credit for another booking, or manual personnel resolution/Admin refund on definitive cancellation; never automatic refund or rebooking. Recording mistakes append reasoned corrections, recalculate debt and do not auto-cancel (BR-COB-21). Unknown/personal funds remain excluded. Applicable legal obligations and exact immutable ledger-correction representation remain pending. | No |
| P-27 | Deposit evidence without an image; insufficient amount. | **Resolved** — PDF/image first, text fallback only on explicit inability, human verification; multiple partial payments allowed, verified partial deposit retains occupied unconfirmed slot without automatic release (BR-SEN-11–12). | — |
| P-28 | Does a late reschedule whose deposit is lost under tenant policy need a new deposit before confirmation? | **Resolved** — personnel resolve the case; the AI only communicates the policy and the next steps (BR-CAN-14). | — |
| P-29 | What is the next person told when a queue already has 10 people? | **Resolved** — tell them it is full and offer other times, without a reserve list (BR-WL-14). | — |
| P-30 | A `BLOCKED` customer or one with no-shows deletes their data and returns with no restriction or history. | **Resolved for the MVP** — accepted and recorded as debt [TD-02](../../exec-plans/tech-debt-tracker.md) (BR-DAT-07). | — |
| P-31 | What happens to future bookings and pending money when a customer requests deletion? | **Resolved** — the request does not cancel bookings automatically; personnel resolve bookings and money before day 30, alerted in the CRM, and deletion runs on day 30 regardless, keeping payments (BR-DAT-08). | — |
| P-32 | Legal validation of the 30-day deletion window, retention periods, the payer's name kept with payments and handling of deletion requests. | **Risk accepted for the MVP, validation pending** — see BR-DAT-05. | **Yes** (real customers) |
| P-33 | What happens to incoming messages while the WhatsApp channel is paused? | **Resolved** — product-owner agreement of 2026-11-05: they are stored and shown in the CRM without AI replies or automatic notices; personnel reply from the business phone (BR-NOT-05). | — |
| P-34 | What keeps a receipt from deletion when its review is unfinished? | **Resolved** — product-owner agreement of 2026-11-05: a pending `PaymentReview` keeps its receipt until decided. Disputes outside a payment review are not modeled in the MVP (BR-DAT-03). | — |
| P-35 | Does disabling a WhatsApp connection free its number? | **Resolved** — product-owner agreement of 2026-11-05: pausing keeps the number and instance; only retiring frees them (BR-NOT-05). | — |
| P-36 | Can personnel use a customer's data during the deletion window? | **Resolved** — product-owner agreement of 2026-11-05: only to resolve that customer's bookings and pending money; no reminders are sent (BR-DAT-01, BR-DAT-08). | — |
| P-37 | Does a customer in the deletion window keep their waitlist places? | **Resolved** — product-owner agreement of 2026-11-05: entries close on confirmation and withdrawing does not restore them (BR-DAT-09). | — |
| P-38 | What stays with a payment after deletion? | **Resolved** — product-owner agreement of 2026-11-05: with verified payments the name stays and the phone is removed; without them, both are removed (BR-DAT-03). Legal validation is in P-32. | — |
| P-39 | What happens on the waitlist with a `BLOCKED` customer? | **Resolved** — product-owner agreement of 2026-11-05: they are not enrolled; an entry whose requester becomes `BLOCKED` keeps its place but is skipped until the restriction is removed (BR-WL-16). | — |
| P-40 | Does the clearly unrelated-file count carry over after a human review decision or into a later correction/review round? | **Pending** — the initial submission/replacement sequence already follows BR-SEN-14–16. Only the reset or carry-over boundary between later human review/correction rounds remains unagreed; do not infer a reset. | Applying the count across later review/correction boundaries, not the agreed first/second replacement sequence |

Remaining product questions include the unresolved portions of P-07 and P-26, P-32 and P-40, and the text-only fallback boundary in BR-SEN-18. Technical schema/concurrency and provider capabilities remain in the [ERD register](../../design-docs/erd.md#technical-review-register); age-based retention periods are in the [debt tracker](../../exec-plans/tech-debt-tracker.md). No additional product defaults are inferred.

## 17. Differences With Earlier Documents

The handoff supersedes incompatible earlier text, including earlier MVP and architecture proposals; dependent documents require reconciliation. Historical differences include:

| Document | Says | Current decision |
|---|---|---|
| `rules.md` RG-21, RG-28 | HOLD only with a deposit; Mercado Pago confirms the deposit. | WhatsApp always starts with a HOLD; deposit by transfer with human verification (BR-RES-03, BR-SEN-06, BR-SEN-07). |
| `rules.md` RG-30 | Methods include Mercado Pago. | `CASH` and `TRANSFER` only (BR-COB-04). |
| `rules.md` RG-08, RG-10, RG-39 | Only Admin applies restrictions to customers. | Personnel with the applicable role permission apply individual restrictions (BR-CLI-08); Staff membership alone grants none. |
| `rules.md` RG-09, RG-10 | The cash permission is the only granular permission. | Configurable role-based permissions (BR-IAM-05). |
| `rules.md` RG-23 | Personnel exceptions to be defined later. | Only an Admin authorizes exceptions to the consequences of a late change (BR-CAN-03). |
| `rules.md` RG-41 | Mechanics of automatic opening to be defined. | Opening cash is explicit and auditable: declare it at the first opening, reconcile subsequent openings with the previous close; closing is always manual (BR-CAJA-03, BR-CAJA-04). |
| Issue CON-02 (#11) | The public API creates, consults, cancels and reschedules bookings. | Public endpoints are read-only landing information (ARQ §11). |
| Issue UC-02 — Scope | "Contemplar … reservas públicas". | Excluded from the MVP (MVP §5.3); see [use-cases.md §7](../uc-02/use-cases.md#7-excluded-and-deferred-use-cases). |

**Recommendation:** mark `rules.md` as superseded by UC-03, UC-01 and `mvp.md` v0.3, or update it, so that the team does not work from two sources.

## 18. Personal Data and Retention (`DAT`)

Product-owner decisions for the MVP. They are not legal advice and need validation before use with real customers (BR-DAT-05).

| ID | Rule | Origin |
|---|---|---|
| BR-DAT-01 | A customer may request deletion of their data by chat, from the same WhatsApp number, and must confirm it explicitly. On confirmation their data is blocked: no more notices and no operational use. It is kept only to execute or revert the deletion and for personnel to resolve that customer's bookings and pending money (BR-DAT-08). | Follow-up; P-36 |
| BR-DAT-02 | The customer may withdraw the request for **30 days** and recover their profile. If they do not, deletion runs automatically on day 30. There is no immediate-deletion option. The window is a configurable value. | Follow-up |
| BR-DAT-03 | Deletion removes conversations, rejected receipts and receipts with no payment. A receipt whose `PaymentReview` is still pending is kept until it is decided, and then follows this rule or BR-DAT-04. Phone and preferences are always removed. The name is kept only if the customer has verified payments, to keep those records traceable, and is removed otherwise. The customer is told what was deleted, what is kept and why. | Follow-up; P-34, P-38 |
| BR-DAT-04 | Payments, refunds, cash records and receipts of verified payments are never removed by a deletion request and are kept for at least **10 years**, with no automatic deletion. Audit and consent records are kept only as needed to show what happened; their final period is to be validated. | Follow-up; CCyC art. 328 |
| BR-DAT-05 | Risk accepted for the MVP: Ley 25.326 art. 16 sets a maximum of five business days for suppression, except where the law requires keeping the data, and the 30-day window may not satisfy it. A lawyer must validate this and the retention periods **before use with real customers** (P-32). | Follow-up |
| BR-DAT-06 | Only what the customer asked to delete is deleted automatically; nothing is deleted just for its age. Age-based periods are technical debt ([TD-01](../../exec-plans/tech-debt-tracker.md)), with suggested values of 12 months for conversations and 90 days for technical attempt details. The period for rejected receipts is to be chosen. Storing them must not be documented as indefinite retention policy. | Follow-up |
| BR-DAT-07 | Accepted for the MVP: a `BLOCKED` customer, or one with no-shows or late changes, who deletes their data and writes again starts with no restriction or history. Nothing is kept to prevent it. Recorded as [TD-02](../../exec-plans/tech-debt-tracker.md). | Follow-up P-30 |
| BR-DAT-08 | A deletion request does not cancel future bookings automatically. Personnel resolve the requester's bookings and pending money before day 30, with an advance alert in the CRM, and no reminders are sent for those bookings. Deletion runs on day 30 even if something remains unresolved: payments are kept, and a future booking still active stays without the customer's phone, and without their name unless BR-DAT-03 keeps it. | Follow-up P-31, P-36 |
| BR-DAT-09 | On confirmation, the customer's active waitlist entries close and stop counting toward the queue limit (BR-WL-14), and any invitation still pending for them ends. Withdrawing the request recovers the profile but not those entries; the customer can join again at the end of the queue. | Follow-up P-37 |
