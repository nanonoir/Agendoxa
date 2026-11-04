# UC-01 — Actors, Responsibilities, and Use Case Catalog

> **Status:** In Review  
> **Objective:** Identify who interacts with Agendoxa, through which channels, with which responsibilities and authorizations; provide a navigable catalog of the MVP's functional use cases.  
> **Scope:** Barbershops/beauty and sports clubs/courts; client, business personnel, AI agent, external systems, and entry points.  
> **Out of scope:** Database schemas, endpoints, detailed UI, prompts, implementation of state machines, product sales/POS, and public website bookings.  
> **References:** [Functional flows](./flows.md), [business rules](../uc-03/business-rules.md), [invariants](../uc-03/invariants.md), and [MVP definition](../mvp.md). Product-owner decisions of 2026-11-04 remain subject to team review; no business functionality is implemented.

## Confirmed Decisions

- **WhatsApp is the MVP's only customer self-service booking channel.** The public landing page is informational and links to WhatsApp; it does not create, cancel, or reschedule bookings.
- Authenticated personnel use a **mobile-first CRM** for the business's day-to-day operations, including walk-in bookings. Personnel may also respond from the business's WhatsApp account, subject to reliable human-intervention detection.
- Authorized roles may manage availability; an exceptional opening is available through CRM and WhatsApp unless blocked or occupied. See [business rules](../uc-03/business-rules.md).
- A **single booking core** enforces availability, business policies, and tenant isolation regardless of the entry channel.
- Deposits are human-verified transfers to the receiver selected by one of three collection modes: all professional (default), business deposit/professional remainder, or all business. A missing professional account falls back to the business; distribution is manual. See [payment rules](../uc-03/business-rules.md#10-charges-balances-and-payments-cob).
- From the CRM, personnel with the applicable role permissions may book a service that requires a deposit **without the conversational HOLD**: cash received or a verified transfer, explicitly manually allocated to its charge to meet the required threshold, confirms the booking; verification alone does not reduce the charge balance. A receipt pending verification blocks the slot until human review; with no payment and no receipt the booking is not confirmed, unless an Admin authorizes the exception, which records that no deposit was paid and the outstanding balance (a reason is optional).
- Customers may book on behalf of other people without collecting every attendee's phone number. The requester manages the bookings associated with their WhatsApp number.
- Waitlists use first-person five-minute exclusive priority followed by progressive competition for 1–4 eligible people, or simultaneous invitations for 5+. Only the atomic winner gets a ten-minute HOLD and payment instructions; an invitation is not a booking guarantee.
- The MVP records payments for services and court/resource rentals, with **one shared cash register per tenant**, but does not include a bar/shop POS or inventory system.

## 1. Actor Catalog

### 1.1 Human Actors

| ID | Actor | Goal | Channel / identification | Responsibilities and limits |
|---|---|---|---|---|
| **ACT-01** | **Customer / requester** | Find availability and manage bookings for themselves or others. | Individual WhatsApp conversation; sender number identifies the requester within the business. May discover the business via its landing page or Google Maps. | Ask questions, book, confirm, cancel, reschedule, send payment receipts, join waitlists, and manage reminder consent. May manage only bookings associated with their number **in that tenant**. No CRM access. |
| **ACT-02** | **Attendee / beneficiary** | Receive a service booked by a requester. | May have no direct channel or account; minimal identifying information when operationally necessary. | Can be different from the requester; does **not** acquire booking-management permissions merely by being named on a booking. |
| **ACT-03** | **Staff member** | Operate the business according to assigned role. | Authenticated CRM; optionally the business's WhatsApp account. | The editable Staff role and custom tenant roles grant operational capabilities through role permissions, not personal exceptions. |
| **ACT-04** | **Personnel with an operational capability** | Perform actions permitted by their tenant role. | Authenticated CRM; role-based permission. | Cash and availability permissions may be assigned to roles; this is a capability-based actor, not a separate fixed role or per-person delegation. |
| **ACT-05** | **Business administrator (Admin)** | Configure and oversee the business. | Authenticated CRM; optionally direct business WhatsApp. | Protected full-access role, neither deletable nor reducible; multiple Admins may exist and the last active Admin is protected. Role management, commercial policy exceptions, post-close adjustments, refunds and changes to agreed prices are non-delegable. |
| **ACT-06** | **Agendoxa technical operator** | Keep pilot installations and integrations operational. | Operational and infrastructure tooling, outside the business CRM role model. | Maintains deployments, connectivity, and technical support. **No default business authorization** to view or alter bookings, customer data, or payments. |

**Important distinctions**

- **Requester ≠ attendee.** A person can book for friends; attendee phone numbers are optional. Only the requester associated with the incoming number can self-manage those bookings via WhatsApp.
- **Professional ≠ necessarily Staff.** A barber or beautician is an assignable professional/resource; they are a human CRM actor only if they also have an authenticated Staff/Admin account.
- A **court, barbecue area, room, workstation, or booth** is a *bookable resource*, **not** an actor. Court and barbecue resources are handled separately in the MVP.
- Effective role permissions, customer records, payment records, restrictions, and history are scoped to an individual **tenant/business**. The system `Permission` catalog and personnel `User` are global; a person may have different roles in different tenants.

### 1.2 Internal Automated Component

| ID | Component | Purpose and channel | Allowed actions | Prohibited actions / boundaries |
|---|---|---|---|---|
| **SYS-01** | **AI booking agent (LangGraph)** | Handles individual WhatsApp conversations via authorized backend tools. | Group consecutive messages after **5 seconds** of inactivity; use conversational context; answer configured business queries; request missing data; offer alternatives; manage authorized booking HOLDs, cancellations, reschedules and waitlists; interpret receipts as **pending review**; record reminder consent; hand off to humans. | Cannot invent slots/prices/discounts/payment status, negotiate unconfigured exceptions, bypass customer restrictions, confirm bank transfers from an image, infer no-shows, modify cash-register records, or obtain Staff/Admin privileges. No group chats or voice notes in MVP. |

**Human handoff:** Staff/Admin can take over through the shared CRM inbox or the business WhatsApp app. AI is paused for that conversation until manual handback or **60 minutes without a human reply**, provided the Admin-controlled global AI mode is enabled. Each human reply restarts that timer. Admin can disable global AI for a configured duration or indefinitely. AI reactivation **never** verifies a pending transfer. Detection of direct WhatsApp human replies requires pilot validation; explicit CRM takeover is the reliable control.

### 1.3 External Systems and Discovery Channels

| ID | System / channel | Interaction in UC-01 | MVP boundary |
|---|---|---|---|
| **EXT-01** | **WhatsApp** | Customer conversations; business personnel may respond directly; consented notifications. | Mandatory communications channel. Does not decide booking availability, authorization, or payment approval. |
| **EXT-02** | **Evolution API + Baileys** | Receives/sends WhatsApp messages and media; provides the operational sender number. | Mandatory messaging integration (unofficial and potentially disconnectable). Does not apply booking rules or verify bank transfers. |
| **EXT-03** | **Designated business/professional bank or wallet account** | Receives the deposit/remainder according to configured collection mode and fallback. | Authorized personnel check actual credit in the indicated account; no bank API, automatic proof verification or inter-account distribution. |
| **EXT-04** | **Google Business Profile / Maps** | Business discovery and optional link to the business's WhatsApp using `https://wa.me/...`. | Manually configured link where supported; Agendoxa may generate the URL in CRM. No Google Business Profile API or direct Google booking integration in MVP. |
| **EXT-05** | **Mercado Pago API** | Potential future automatic payment confirmation. | **Not integrated in this MVP.** |
| **EXT-06** | **Google Calendar, ecommerce/CRM platforms, public third-party API, and POS/inventory systems** | Potential future calendar, external booking, sales, and inventory connections. | **Deferred.** No current booking authority or integration requirement. |

**Not external actors:** The landing page is an informational entry point. NestJS use cases, PostgreSQL/Drizzle, `pg-boss`, availability, billing/payments, cash register, and the AI agent itself are internal system components.

## 2. Permissions Matrix

**Legend:** Staff entries describe possible operational capabilities, **not guaranteed permissions**: every action requires the applicable tenant-role permission. **Cond.** is subject to policy or role permission; Admin is protected and full-access. The backend enforces authorization. Each global user has exactly one role per tenant membership, permissions come only from roles, and custom roles are supported. The AI column describes customer-context actions, not an administrator role. See [business rules](../uc-03/business-rules.md).

| Action / capability | Customer | Staff | Admin | AI agent | Relevant authorization / restriction |
|---|:---:|:---:|:---:|:---:|---|
| View catalog and availability | Yes | Yes | Yes | Yes | Only configured business information and real availability. |
| View the requester's future bookings | Yes | Yes | Yes | Cond. | Customer/AI: only bookings associated with the sender number within this tenant. |
| View the business's full schedule | No | Yes | Yes | No | Authenticated personnel only, tenant-scoped. |
| Create bookings for oneself or others | Cond. | Yes | Yes | Cond. | Customer/AI: requester number, limits, policies and availability; CRM: authenticated personnel. |
| Create an exceptional CRM booking for a blocked customer | No | Yes | Yes | No | Same booking-creation permission, warning and actor attribution; no unblock or extra permission, other policies still apply. |
| Book outside regular hours (CRM) | No | Cond. | Yes | No | Requires role permission and authorized availability; no overlap with claims or explicit blocks. Exceptional openings also apply to WhatsApp. |
| Cancel or reschedule a booking | Cond. | Yes | Yes | Cond. | Own managed bookings and applicable policy; customer commercial exceptions Admin-only. Cancellation-capable personnel may cancel for operational business cause with reason and notice. A customer may proceed after the notice window by accepting the consequences. Financial review never delays an authorized confirmed cancellation. |
| Authorize exceptions to commercial policies | No | No | Yes | No | Admin decision and recorded reason; confirming a CRM booking without its required deposit instead records that no deposit was paid and the outstanding balance, with an optional reason. |
| Join waitlist / receive invitation | Yes | Cond. | Cond. | Cond. | Voluntary enrollment and current waitlist preference; first exclusive priority or nonexclusive invitations per eligible cohort. |
| Request deletion of own data | Yes | No | No | Cond. | From the same WhatsApp number with explicit confirmation; 30 days to withdraw. Verified payments and their receipts remain. See [UC-03 §18](../uc-03/business-rules.md#18-personal-data-and-retention-dat). |
| Record service/rental completion | No | Yes | Yes | No | Manual from start, never automatic. |
| Record or correct `NO_SHOW` | No | Yes | Yes | No | Manual from start + 15 minutes; correction both ways needs correction permission, reason/history, no automatic money effect or walk-in displacement. |
| Verify bank-transfer receipt | No | Yes | Yes | No | Confirm actual credit in bank/wallet, not merely an image. |
| Record partial or mixed-method payment | No | Yes | Yes | No | Preserve payment method, amount, and responsible user. |
| Correct a payment recording error | No | Yes | Yes | No | Correction permission, mandatory reason and linked history; recompute debt without fake refunds/movements or auto-cancellation. Closed physical cash remains Admin-only; exact ledger mechanics pending. |
| Adjust a transaction after cash close | No | No | Yes | No | Physical-cash post-close correction via separate `CashAdjustment`; prior payment and close unchanged, not a general financial log. |
| Authorize and manage a refund | No | No | Yes | No | Separate `Refund` linked to the original payment; only execution reduces retained funds; physical cash outflow requires an open session. |
| Open or close the cash register | No | Cond. | Yes | No | Requires cash permission on the tenant role; closing is manual. |
| Register cash-in/cash-out with a reason | No | Yes | Yes | No | No product-sale registration in MVP. |
| View operation audit trail / responsible employee | No | Yes | Yes | No | Within the tenant; customer has no personnel audit access. |
| Apply/remove an individual customer restriction | No | Yes | Yes | No | Record reason and actor; global restriction policy belongs to Admin. |
| Configure catalog, prices, deposits, commercial policies | No | Cond. | Yes | No | Applicable tenant-role permission; changes to agreed prices and commercial-policy exceptions are non-delegable Admin operations. |
| Adjust operational schedules / availability blocks | No | Cond. | Yes | No | Role-based availability permission; does not include non-delegable commercial exceptions. |
| Manage personnel accounts and receiving aliases | No | Cond. | Yes | No | Applicable tenant-role permission; cannot bypass protected Admin or role-management safeguards. |
| Manage roles and role permissions | No | No | Yes | No | Non-delegable Admin operation; no direct member grants; protect the last active Admin. |
| Change global AI mode | No | No | Yes | No | Temporary or indefinite disabling as configured by Admin. |
| Take over / hand back an individual conversation | No | Yes | Yes | No | CRM controls reliably; direct WhatsApp takeover depends on event detection. |

### Authorization Invariants

1. A customer manages only bookings tied to **their WhatsApp sender number** in the relevant tenant, even when another person will attend. Requests from another number require business intervention.
2. Personnel can operate bookings within their tenant only when their role permits; only Admin can change agreed commercial prices.
3. Recording corrections require permission, mandatory reason and immutable linked financial history, recomputing balances without fictitious refunds/movements or auto-cancellation. Closed physical cash requires Admin CashAdjustment; transfers need no cash session. Exact ledger representation remains technical design; actual refunds use Refund, never negative payments.
4. Only Admin authorizes policy exceptions to cancellation/rescheduling; individual restrictions and availability actions require the applicable role permission.
5. There is **one logical cash register per tenant**. Authorized Staff and Admin may open/close sessions; every operation and close identifies its responsible employee.
6. The AI agent's authorization is **limited to the customer/requester context**. A human joining the chat does not grant the AI any Staff/Admin permissions.

## 3. Use Case Catalog and Index

Each `CU-XX` identifies a **functional use case**. This analysis task is `UC-01`; the two identifier families are distinct. Each entry below links to its independently addressable specification in [flows.md](./flows.md).

| Use case | Observable goal | Primary actor | Channel | Details |
|---|---|---|---|---|
| CU-01 | Consult business information and availability | Customer | WhatsApp | [Flow](./flows.md#cu-01) |
| CU-02 | Create a booking without a deposit | Customer; Staff/Admin on behalf of customer | WhatsApp / CRM | [Flow](./flows.md#cu-02) |
| CU-03 | Create a booking with a deposit | Customer; Staff/Admin on behalf of customer | WhatsApp / CRM | [Flow](./flows.md#cu-03) |
| CU-04 | Create bookings for other attendees | Customer requester; Staff/Admin | WhatsApp / CRM | [Flow](./flows.md#cu-04) |
| CU-05 | Join a voluntary waitlist | Customer | WhatsApp | [Flow](./flows.md#cu-05) |
| CU-06 | Receive a waitlist invitation and claim a slot | System initiates; Customer responds | WhatsApp | [Flow](./flows.md#cu-06) |
| CU-07 | Consult the requester's future bookings | Customer | WhatsApp | [Flow](./flows.md#cu-07) |
| CU-08 | Cancel a booking | Customer; Staff/Admin | WhatsApp / CRM | [Flow](./flows.md#cu-08) |
| CU-09 | Reschedule a booking | Customer; Staff/Admin | WhatsApp / CRM | [Flow](./flows.md#cu-09) |
| CU-10 | Complete a service/rental or record a no-show | Staff/Admin | CRM | [Flow](./flows.md#cu-10) |
| CU-11 | Record, verify, or correct a payment | Staff/Admin | CRM | [Flow](./flows.md#cu-11) |
| CU-12 | Manage customer incidents and restrictions | Staff/Admin | CRM | [Flow](./flows.md#cu-12) |
| CU-13 | Open and close a shared cash register | Admin / authorized Staff | CRM | [Flow](./flows.md#cu-13) |
| CU-14 | Take over and return a conversation | Staff/Admin | CRM / direct WhatsApp | [Flow](./flows.md#cu-14) |
| CU-15 | Configure and supervise business operations | Admin; personnel with applicable configuration/availability role permissions | CRM | [Flow](./flows.md#cu-15) |
| CU-16 | Send a consented reminder or waitlist notice | System initiates; Customer receives | WhatsApp | [Flow](./flows.md#cu-16) |

## 4. Differences Between the Two MVP Verticals

| Dimension | Barbershop / beauty / manicure | Sports club / courts |
|---|---|---|
| Booked unit | Service with duration/price, assigned to a compatible professional | Physical resource rental, time slot and duration |
| Combined offering | A **preconfigured single service** (e.g., haircut + beard trim) with its own price/duration | Court and barbecue area are requested/booked **separately**; barbecue area may be free |
| Booking for third parties | One requester arranges successive appointments for friends | One requester organizes the team's court booking |
| Day-to-day payment experience | Fast **Complete and collect payment** action with prefilled amount | Court rental payments and a shared daily cash close |
| Absence accounting | The booking requester is responsible for each `NO_SHOW`, including another attendee's absence | The same requester-based booking count applies; other incidents remain separate |

Both verticals share the **same availability and booking rules**. The MVP does **not** guarantee an atomic multi-resource reservation (e.g., court plus barbecue area), and does not include a bar/shop POS, products, or stock.

## 5. Cross-Cutting Security and Continuity Rules

- **Tenant isolation:** No cross-business access to customers, reservations, payments, customer restrictions, or cash history.
- **Exclusive availability:** An overlapping booking or temporary hold must not be confirmed for the same exclusive resource/time range. Merely querying availability never reserves it.
- **Payment trust:** An uploaded receipt is not proof of settled funds. Staff/Admin verify credits; AI cannot approve them from an image.
- **Channel resilience:** Customer self-service is temporarily unavailable if WhatsApp/Evolution disconnects; the CRM and core continue operating.
- **Consent:** One four-option question records independent reminder/waitlist preferences, retained per customer and changeable in chat without repeated prompts. Enrollment for specific conditions remains voluntary; a phone is not consent. See BR-NOT-09 in [UC-03](../uc-03/business-rules.md#14-notifications-and-consent-not).
- **Auditability:** Identify who booked/changed slots, verified deposits, corrected no-shows/payments, restricted customers, handled cash, opened/closed the register, or approved exceptions.

## Open Questions — Deferred Beyond UC-01

These do not block identification of actors or main flows, and **must not be interpreted as approved behavior**:

1. Notice defaults, queue limit and its full-queue message, late-reschedule deposit handling, booking lead time, future-limit defaults/counting, requested-range expiry and failed-send behavior are resolved in UC-03.
2. Applicable legal refund obligations, definitive retained-funds reporting and legal validation of data deletion (P-07, P-32); cancellation releases independently of financial review, and operational business cancellation authority is resolved.
3. PDF/image-first text fallback, attendee name-only requirements and human supervision as the abuse control are resolved.
4. Physical storage/concurrency of progressive invitations, reusable consent preferences and financial corrections; see the ERD, not new product defaults.
5. Whether barbecue areas require a separate schedulable resource or a commercial request in a given pilot configuration; no mandatory joint multi-resource booking.
6. Date-based reporting cutoffs/financial correction mechanics; cash sessions persist across midnight until manual close.
7. Reliability and safe fallback for direct WhatsApp human-reply detection using the pilot's Evolution/Baileys version.

## UC-01 Acceptance Checklist

- [x] Human actors, automated components, and external systems are explicitly classified.
- [x] Each actor has an operational purpose, channel, and authorization boundary.
- [x] Customer, personnel capabilities, protected Admin, and technical operator remain distinct.
- [x] A stable `CU-XX` catalog links to functional descriptions in `flows.md`.
- [x] Both verticals are covered without duplicating the booking engine.
- [x] Deferred details and future integrations are not presented as MVP functionality.
