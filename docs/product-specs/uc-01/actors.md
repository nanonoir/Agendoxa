# UC-01 — Actors, Responsibilities, and Use Case Catalog

> **Status:** In Review  
> **Objective:** Identify who interacts with Agendoxa, through which channels, with which responsibilities and authorizations; provide a navigable catalog of the MVP's functional use cases.  
> **Scope:** Barbershops/beauty and sports clubs/courts; client, business personnel, AI agent, external systems, and entry points.  
> **Out of scope:** Database schemas, endpoints, detailed UI, prompts, implementation of state machines, product sales/POS, and public website bookings.  
> **References:** [Functional flows](./flows.md); `rules.md`, [MVP definition](../mvp.md), and `architecture-bootcamp.md`. These documents have not yet been synchronized with the later UC-01 decisions.

## Confirmed Decisions

- **WhatsApp is the MVP's only customer self-service booking channel.** The public landing page is informational and links to WhatsApp; it does not create, cancel, or reschedule bookings.
- Authenticated personnel use a **mobile-first CRM** for the business's day-to-day operations, including walk-in bookings. Personnel may also respond from the business's WhatsApp account, subject to reliable human-intervention detection.
- A **single booking core** enforces availability, business policies, and tenant isolation regardless of the entry channel.
- Deposits, when required, are paid by bank/wallet transfer to the business's configured alias and **verified by a human**. Mercado Pago integration is deferred beyond the MVP.
- Customers may book on behalf of other people without collecting every attendee's phone number. The requester manages the bookings associated with their WhatsApp number.
- The MVP includes voluntary waitlists and **five-minute exclusive offers**; reservation requests use a **ten-minute HOLD** as described in [flows.md](./flows.md).
- The MVP records payments for services and court/resource rentals, with **one shared cash register per tenant**, but does not include a bar/shop POS or inventory system.

## 1. Actor Catalog

### 1.1 Human Actors

| ID | Actor | Goal | Channel / identification | Responsibilities and limits |
|---|---|---|---|---|
| **ACT-01** | **Customer / requester** | Find availability and manage bookings for themselves or others. | Individual WhatsApp conversation; sender number identifies the requester within the business. May discover the business via its landing page or Google Maps. | Ask questions, book, confirm, cancel, reschedule, send payment receipts, join waitlists, and manage reminder consent. May manage only bookings associated with their number **in that tenant**. No CRM access. |
| **ACT-02** | **Attendee / beneficiary** | Receive a service booked by a requester. | May have no direct channel or account; minimal identifying information when operationally necessary. | Can be different from the requester; does **not** acquire booking-management permissions merely by being named on a booking. |
| **ACT-03** | **Staff member** | Run the schedule, serve customers, and register outcomes and payments. | Authenticated CRM; optionally the business's WhatsApp account. | Manage all bookings within their tenant, record attendance/no-shows, verify transfers, register payments, apply individual customer restrictions, and handle conversations. Cannot set prices or general commercial policies. |
| **ACT-04** | **Authorized staff member** | Perform specifically delegated operational actions. | Authenticated CRM; explicit permission assigned by Admin. | Inherits Staff abilities and **only the granted privileges** to open/close cash sessions and/or edit operational schedules and availability. Not a blanket business-administrator role. |
| **ACT-05** | **Business administrator (Admin)** | Configure and oversee the business. | Authenticated CRM; optionally direct business WhatsApp. | Has Staff abilities; manages personnel, services, prices, resources, deposits, policies, receiving aliases, permissions, global AI mode, policy exceptions, and post-close adjustments. Multiple Admins may exist per tenant. |
| **ACT-06** | **Agendoxa technical operator** | Keep pilot installations and integrations operational. | Operational and infrastructure tooling, outside the business CRM role model. | Maintains deployments, connectivity, and technical support. **No default business authorization** to view or alter bookings, customer data, or payments. |

**Important distinctions**

- **Requester ≠ attendee.** A person can book for friends; attendee phone numbers are optional. Only the requester associated with the incoming number can self-manage those bookings via WhatsApp.
- **Professional ≠ necessarily Staff.** A barber or beautician is an assignable professional/resource; they are a human CRM actor only if they also have an authenticated Staff/Admin account.
- A **court, barbecue area, room, workstation, or booth** is a *bookable resource*, **not** an actor. Court and barbecue resources are handled separately in the MVP.
- All permissions, customer records, payment records, restrictions, and history are scoped to an individual **tenant/business**. A person may have different roles in different tenants.

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
| **EXT-03** | **Business bank / wallet account** | Receives deposits via configured bank/wallet alias. | Money is checked **manually by Staff/Admin**; no bank API or automatic proof-of-payment verification in MVP. |
| **EXT-04** | **Google Business Profile / Maps** | Business discovery and optional link to the business's WhatsApp using `https://wa.me/...`. | Manually configured link where supported; Agendoxa may generate the URL in CRM. No Google Business Profile API or direct Google booking integration in MVP. |
| **EXT-05** | **Mercado Pago API** | Potential future automatic payment confirmation. | **Not integrated in this MVP.** |
| **EXT-06** | **Google Calendar, ecommerce/CRM platforms, public third-party API, and POS/inventory systems** | Potential future calendar, external booking, sales, and inventory connections. | **Deferred.** No current booking authority or integration requirement. |

**Not external actors:** The landing page is an informational entry point. NestJS use cases, PostgreSQL/Drizzle, `pg-boss`, availability, billing/payments, cash register, and the AI agent itself are internal system components.

## 2. Permissions Matrix

**Legend:** **Yes** = allowed within the actor's tenant/context; **Cond.** = subject to an applicable policy or delegated privilege; **No** = not authorized. The AI column describes delegated customer-facing actions, not a separate administrator role.

| Action / capability | Customer | Staff | Admin | AI agent | Relevant authorization / restriction |
|---|:---:|:---:|:---:|:---:|---|
| View catalog and availability | Yes | Yes | Yes | Yes | Only configured business information and real availability. |
| View the requester's future bookings | Yes | Yes | Yes | Cond. | Customer/AI: only bookings associated with the sender number within this tenant. |
| View the business's full schedule | No | Yes | Yes | No | Authenticated personnel only, tenant-scoped. |
| Create bookings for oneself or others | Cond. | Yes | Yes | Cond. | Customer/AI: requester number, limits, policies and availability; CRM: authenticated personnel. |
| Cancel or reschedule a booking | Cond. | Yes | Yes | Cond. | Customer/AI: own managed bookings and applicable notice period; Admin alone can authorize exceptions. |
| Authorize exceptions to commercial policies | No | No | Yes | No | Admin decision and recorded reason. |
| Join waitlist / receive exclusive offer | Yes | Cond. | Cond. | Cond. | Voluntary customer opt-in; one eligible exclusive offer at a time. |
| Record service/rental completion | No | Yes | Yes | No | Human operational decision; no time-based inference. |
| Record or correct `NO_SHOW` | No | Yes | Yes | No | Human action with audit trail. |
| Verify bank-transfer receipt | No | Yes | Yes | No | Confirm actual credit in bank/wallet, not merely an image. |
| Record partial or mixed-method payment | No | Yes | Yes | No | Preserve payment method, amount, and responsible user. |
| Correct payment while its cash session is open | No | Yes | Yes | No | Audited correction; no silent deletion. |
| Adjust a transaction after cash close | No | No | Yes | No | New audited adjustment; prior close remains unchanged. |
| Open or close the cash register | No | Cond. | Yes | No | Staff requires a dedicated cash privilege. |
| Register cash-in/cash-out with a reason | No | Yes | Yes | No | No product-sale registration in MVP. |
| View operation audit trail / responsible employee | No | Yes | Yes | No | Within the tenant; customer has no personnel audit access. |
| Apply/remove an individual customer restriction | No | Yes | Yes | No | Record reason and actor; global restriction policy belongs to Admin. |
| Configure catalog, prices, deposits, commercial policies | No | No | Yes | No | Business administrator only. |
| Adjust operational schedules / availability blocks | No | Cond. | Yes | No | Delegated Staff permission; does not include price changes. |
| Manage staff, aliases, and permissions | No | No | Yes | No | Business administrator only. |
| Change global AI mode | No | No | Yes | No | Temporary or indefinite disabling as configured by Admin. |
| Take over / hand back an individual conversation | No | Yes | Yes | No | CRM controls reliably; direct WhatsApp takeover depends on event detection. |

### Authorization Invariants

1. A customer manages only bookings tied to **their WhatsApp sender number** in the relevant tenant, even when another person will attend. Requests from another number require business intervention.
2. Staff can operate **all bookings within their tenant**, including those created by colleagues, but cannot change agreed commercial prices. Staff can record a partial payment.
3. Staff may correct payments while the cash session is open; after close, only Admin may create an **audited adjustment**, without rewriting a closed session.
4. Only Admin authorizes policy exceptions to cancellation/rescheduling; Staff and Admin may apply **individual** customer restrictions. Staff's ability to adjust operational hours is separately delegated.
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
| CU-06 | Receive and accept an exclusive slot offer | System initiates; Customer responds | WhatsApp | [Flow](./flows.md#cu-06) |
| CU-07 | Consult the requester's future bookings | Customer | WhatsApp | [Flow](./flows.md#cu-07) |
| CU-08 | Cancel a booking | Customer; Staff/Admin | WhatsApp / CRM | [Flow](./flows.md#cu-08) |
| CU-09 | Reschedule a booking | Customer; Staff/Admin | WhatsApp / CRM | [Flow](./flows.md#cu-09) |
| CU-10 | Complete a service/rental or record a no-show | Staff/Admin | CRM | [Flow](./flows.md#cu-10) |
| CU-11 | Record, verify, or correct a payment | Staff/Admin | CRM | [Flow](./flows.md#cu-11) |
| CU-12 | Manage customer incidents and restrictions | Staff/Admin | CRM | [Flow](./flows.md#cu-12) |
| CU-13 | Open and close a shared cash register | Admin / authorized Staff | CRM | [Flow](./flows.md#cu-13) |
| CU-14 | Take over and return a conversation | Staff/Admin | CRM / direct WhatsApp | [Flow](./flows.md#cu-14) |
| CU-15 | Configure and supervise business operations | Admin; authorized Staff for availability only | CRM | [Flow](./flows.md#cu-15) |
| CU-16 | Send a consented reminder or waitlist notice | System initiates; Customer receives | WhatsApp | [Flow](./flows.md#cu-16) |

## 4. Differences Between the Two MVP Verticals

| Dimension | Barbershop / beauty / manicure | Sports club / courts |
|---|---|---|
| Booked unit | Service with duration/price, assigned to a compatible professional | Physical resource rental, time slot and duration |
| Combined offering | A **preconfigured single service** (e.g., haircut + beard trim) with its own price/duration | Court and barbecue area are requested/booked **separately**; barbecue area may be free |
| Booking for third parties | One requester arranges successive appointments for friends | One requester organizes the team's court booking |
| Day-to-day payment experience | Fast **Complete and collect payment** action with prefilled amount | Court rental payments and a shared daily cash close |
| Absence accounting | Staff identifies the attendee who did not arrive without requiring their phone | Incidents attributed according to the managed booking and its requester/attendee context |

Both verticals share the **same availability and booking rules**. The MVP does **not** guarantee an atomic multi-resource reservation (e.g., court plus barbecue area), and does not include a bar/shop POS, products, or stock.

## 5. Cross-Cutting Security and Continuity Rules

- **Tenant isolation:** No cross-business access to customers, reservations, payments, customer restrictions, or cash history.
- **Exclusive availability:** An overlapping booking or temporary hold must not be confirmed for the same exclusive resource/time range. Merely querying availability never reserves it.
- **Payment trust:** An uploaded receipt is not proof of settled funds. Staff/Admin verify credits; AI cannot approve them from an image.
- **Channel resilience:** Customer self-service is temporarily unavailable if WhatsApp/Evolution disconnects; the CRM and core continue operating.
- **Consent:** Waitlist availability notices require explicit voluntary opt-in for that wait; reminders require separate, recorded, revocable consent. Having a phone number alone is not consent.
- **Auditability:** Identify who booked/changed slots, verified deposits, corrected no-shows/payments, restricted customers, handled cash, opened/closed the register, or approved exceptions.

## Open Questions — Deferred Beyond UC-01

These do not block identification of actors or main flows, and **must not be interpreted as approved behavior**:

1. Default cancellation lead times, future-booking limits, waitlist expiration and maximum queue sizes, and failed-notice handling.
2. Late or unmatched transfers, legally required refunds, overpayments, and business-initiated cancellations.
3. Exact handling of deposits with no attached image, lengthy human review, and abuse of pending-review holds; **no automatic expiry after timely proof submission** is the confirmed policy.
4. Minimum information needed for attendees without phones; the exact statistical treatment of third-party no-shows and correction rules.
5. Whether barbecue areas require a separate schedulable resource or a commercial request in a given pilot configuration; no mandatory joint multi-resource booking.
6. Cash-session boundary details, day changes, withdrawals, and how late-verified payments affect cash accounting.
7. Reliability and safe fallback for direct WhatsApp human-reply detection using the pilot's Evolution/Baileys version.
8. Reconciliation of earlier `rules.md`, `mvp.md`, and `architecture-bootcamp.md` with the later UC-01 decisions is a **separate task**.

## UC-01 Acceptance Checklist

- [x] Human actors, automated components, and external systems are explicitly classified.
- [x] Each actor has an operational purpose, channel, and authorization boundary.
- [x] Customer, Staff, authorized Staff, Admin, and technical operator remain distinct.
- [x] A stable `CU-XX` catalog links to functional descriptions in `flows.md`.
- [x] Both verticals are covered without duplicating the booking engine.
- [x] Deferred details and future integrations are not presented as MVP functionality.
