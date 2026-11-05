# DOM-01 — Agendoxa MVP Entity–Relationship Model

> **Status:** In Review — product-owner decisions agreed 2026-11-04; **not team-ratified or implemented**.
> **Prepared:** 2026-11-03; reconciled 2026-11-04; tenant-isolation review observations applied 2026-11-05.
> **Scope:** Logical/conceptual ERD for the two MVP verticals: barbershops/beauty businesses and sports clubs/courts.
> **Inventory:** 38 candidate entities in 9 modules: the original 36 plus `Refund` and `NotificationAttempt`.
> **Contents:** Entities, relationships and decisions (§1–§5), logical attributes, keys and constraints (§6), and compatibility checks (§7).
> **Next step:** Team review; architectural validation of the items marked T-01 to T-05.
> **Out of scope here:** SQL/Drizzle schema, physical types, indexes, migrations, repositories, RLS implementation, APIs, and assumptions that the proposed infrastructure already exists.

## 0. How to use this document

This file is intended to live at **`docs/design-docs/erd.md`** in the Agendoxa repository.

1. Treat this as a design proposal, not permission to generate persistence code. The historical [handoff](../../agendoxa_audit_handoff.md) and later 2026-11-04 agreements are reconciled in [canonical UC-03 rules](../product-specs/uc-03/business-rules.md); later rules override incompatible handoff portions. Product-owner agreement and inferred technical representations are not collective team ratification.
2. Consult the existing product references: [MVP](../product-specs/mvp.md), [UC-01 actors](../product-specs/uc-01/actors.md), [UC-01 flows](../product-specs/uc-01/flows.md), [UC-02 use cases](../product-specs/uc-02/use-cases.md), [UC-03 business rules](../product-specs/uc-03/business-rules.md), and [UC-03 invariants](../product-specs/uc-03/invariants.md). Each source has its own declared approval status.
3. Read the [target architecture](./target-architecture.md), the [current implementation architecture](../../ARCHITECTURE.md), and [AGENTS.md](../../AGENTS.md). The present implementation is a starter; PostgreSQL/Drizzle persistence and queues are not implemented yet.
4. `DM-XX` marks a **DOM-01 design proposal**; `REV-XX` preserves reconciliation and review history. Product-owner agreement is not team ratification. Preserve these identifiers in PR discussions.
5. Entity names are conceptual PascalCase identifiers, not finalized SQL table names or enums. Mermaid diagrams illustrate relationships; they do **not** express every conditional, tenant-scoped, or transactional constraint.

**Mermaid notation:** `||` = exactly one, `o|` = zero or one, `o{` = zero or more, `|{` = one or more. Unless explicitly stated, a `1:N` association allows zero children. Optional relationships, conditional uniqueness and cross-table invariants are specified in [§6](#6-logical-specification-by-entity).

## 1. Entity inventory — 38 candidates

| Module | Entity | Responsibility |
|---|---|---|
| Identity (1) | `Tenant` | Business boundary, timezone, tenant-level settings |
| Identity (1) | `User` | Global authenticated CRM personnel identity; **not a customer account** |
| Identity (1) | `TenantMembership` | A user's membership in a tenant, with a tenant-specific role |
| Identity (1) | `Role` | Tenant-specific Admin, Staff, or custom role |
| Identity (1) | `Permission` | Global catalog of capabilities enforced by the backend |
| Identity (1) | `RolePermission` | Assigns catalog permissions to tenant roles |
| Customers (2) | `Customer` | Tenant-local requester/customer; phone optional for walk-ins |
| Catalog (3) | `Service` | Bookable offering, duration, price, or preconfigured service combination |
| Catalog (3) | `Resource` | Exclusive professional or physical capacity (court, chair, room, etc.) |
| Catalog (3) | `ServiceResource` | Service/resource compatibility association |
| Availability (3) | `AvailabilityCalendar` | Tenant-level or resource-level schedule container |
| Availability (3) | `AvailabilityRule` | Recurring business hours or resource schedule |
| Availability (3) | `AvailabilityException` | Blocks, absences, maintenance, or authorized special openings |
| Policies (3) | `BookingPolicy` | Base tenant policy with partial service/resource overrides |
| Bookings (4) | `Booking` | Requester, chosen service, attendee context, and booking lifecycle |
| Bookings (4) | `SlotClaim` | **Single source of truth** for exclusive resource/time occupancy |
| Bookings (4) | `BookingChangeRequest` | Change proposal, pending authorization, application history and financial consequence |
| Bookings (4) | `BookingEvent` | Functional booking history, separate from administrative audit |
| Waitlist (4) | `WaitlistEntry` | Voluntary waiting interest and explicit waitlist consent |
| Waitlist (4) | `ExclusiveOffer` | Legacy conceptual name for a recipient invitation; only first small-cohort priority has an exclusive claim |
| Payments (5) | `Charge` | Amount owed by a booking, separate from money received |
| Payments (5) | `ReceivingAccount` | Same-tenant business or professional bank/wallet destination, with explicit beneficiary |
| Payments (5) | `PaymentReview` | Human review of transfer evidence / claimed transfer |
| Payments (5) | `Payment` | Verified funds of a traceable commercial operation, possibly unallocated |
| Payments (5) | `PaymentAllocation` | Applies part or all of a payment to one or more charges |
| Cash (5) | `CashSession` | Shared register opening/closing session |
| Cash (5) | `CashMovement` | Attributed physical cash movement, potentially linked to a payment |
| Cash (5) | `CashAdjustment` | Audited post-close correction without rewriting a closed session |
| Payments (5) | `Refund` | Independently authorized and tracked return of a payment's funds |
| Messaging (6) | `ChannelConnection` | Tenant WhatsApp connection, including historical connections |
| Messaging (6) | `Conversation` | Continuous sender/channel thread and AI/human handoff state |
| Messaging (6) | `Message` | Incoming or outgoing message with authorship and deduplication |
| Assets (7) | `StoredAsset` | Private tenant-scoped file storage reference, not binary DB contents |
| Notifications (8) | `Notification` | One logical notice and its schedule and outcome |
| Notifications (8) | `NotificationAttempt` | One delivery attempt and its outcome, optionally linked to a message |
| Incidents (9) | `CustomerIncident` | Other booking-related operational incident, not a no-show counter |
| Incidents (9) | `CustomerRestriction` | Manually imposed customer restriction, preserving history |
| Audit (9) | `AuditEvent` | Administrative/security-sensitive action and actor attribution |

**Explicitly deferred:** `CustomerIdentity`, `CustomerAccount` (future tenant-local landing login), `MembershipPermission`, `MessageAttachment`, `PaymentReviewEvidence`, and `DeliveryAttempt`. No `ConsentEvent`, `NotificationConsent`, or custom `Job` entity is introduced.

## 2. Relationships, cardinalities, and decisions by module

### 2.1 Module 1 — Tenants, personnel, roles, and permissions

```mermaid
erDiagram
  TENANT ||--o{ TENANT_MEMBERSHIP : has
  USER ||--o{ TENANT_MEMBERSHIP : joins
  TENANT ||--o{ ROLE : defines
  ROLE ||--o{ TENANT_MEMBERSHIP : assigned_to
  ROLE ||--o{ ROLE_PERMISSION : grants
  PERMISSION ||--o{ ROLE_PERMISSION : referenced_by
```

- Each `TenantMembership` identifies **exactly one** `User`, one `Tenant`, and one role belonging to that same tenant. Enforce at most one membership per `(tenant, user)`; the same `User` can belong to multiple businesses (**DM-01**).
- `Role` belongs to a tenant; `Permission` is a global backend capability catalog; `RolePermission` connects the two. Authorization must always validate the active membership and tenant context.
- Each tenant starts with protected, non-deletable `ADMIN` and `STAFF` roles. `ADMIN` has full tenant authority by backend rule. `STAFF` permissions and additional custom roles can be configured through the CRM (**DM-02**).
- Permissions are granted only through roles, never directly to memberships; the backend checks effective authorization. Admin authority cannot be reduced, and role administration, commercial policy exceptions, post-close adjustments, refunds and changes to agreed prices remain Admin-only. Protect the last active Admin and historical actor attribution (**REV-01**; [personnel rules](../product-specs/uc-03/business-rules.md#3-personnel-roles-and-privileges-iam)).

### 2.2 Module 2 — Customers and requesters

```mermaid
erDiagram
  TENANT ||--o{ CUSTOMER : owns
  CUSTOMER ||--o{ BOOKING : requests
  CUSTOMER ||--o{ WAITLIST_ENTRY : joins
```

- A `Customer` belongs to one tenant. The same phone number in different tenants creates independent customer records (**DM-03**).
- Phone is optional for a CRM walk-in. If present, normalize it (e.g., E.164) and enforce uniqueness **within the tenant**; names are not identifiers, and matching names must never trigger automatic merges.
- `Booking` references the **requester** as a stable `Customer`. An attendee can be another person whose minimal details remain on the booking; do not require a new customer record just to book for someone else.
- The late-changes count derives from executed late customer changes in `BookingChangeRequest`/`BookingEvent`, and a deletion request is a Customer state with its `AuditEvent` trail. Neither adds an entity; exact fields are **T-05**.
- WhatsApp self-management is authorized by the **validated sender associated with that tenant**, not by a phone number typed in a message. Changes to a customer's phone must preserve historical booking links and require safe identity handling.
- **Future:** Tenant-specific `CustomerAccount` credentials for landing-page self-service only after ownership verification. Do not repurpose personnel `User` for customers.

### 2.3 Module 3 — Services, resources, availability, and policies

```mermaid
erDiagram
  TENANT ||--o{ SERVICE : offers
  TENANT ||--o{ RESOURCE : owns
  SERVICE ||--o{ SERVICE_RESOURCE : compatible_with
  RESOURCE ||--o{ SERVICE_RESOURCE : supports
  TENANT ||--o{ AVAILABILITY_CALENDAR : owns
  RESOURCE o|--o| AVAILABILITY_CALENDAR : optional_schedule
  AVAILABILITY_CALENDAR ||--o{ AVAILABILITY_RULE : has
  AVAILABILITY_CALENDAR ||--o{ AVAILABILITY_EXCEPTION : has
  TENANT ||--o{ BOOKING_POLICY : configures
  SERVICE o|--o| BOOKING_POLICY : optional_override
  RESOURCE o|--o| BOOKING_POLICY : optional_override
```

- `Service` and `Resource` are tenant-scoped; `ServiceResource` defines compatibility (N:M). A booking involves **one service and one compatible resource**; professional and physical resources use the same engine.
- A tenant has a general availability calendar; a resource may have its own schedule or inherit the general one (**DM-04**). Resolve effective regular hours with blocks and exceptions; active/scope uniqueness remains technical review.
- Authorized special openings can extend regular hours for CRM and WhatsApp without overriding explicit blocks or claims (**DM-05**).
- `BookingPolicy` resolves **each field** by `resource > service > tenant`, distinguishing inherit, set and disable; `FULL_PREPAYMENT` overrides ordinary deposit rules except for an authorized Admin exception (**DM-06**).
- Existing bookings preserve their agreed financial and commercial conditions when future catalog, availability, or policy settings change. Changes to ordinary hours must not silently cancel existing confirmed bookings.
- **Review:** Scoped cardinalities and policy snapshots remain technical questions (**REV-06**, **REV-12**, **REV-15**); see [availability](../product-specs/uc-03/business-rules.md#6-availability-disp) and [deposits](../product-specs/uc-03/business-rules.md#9-deposits-sen).

### 2.4 Module 4 — Bookings, exclusive occupancy, and waitlist

```mermaid
erDiagram
  CUSTOMER ||--o{ BOOKING : requests
  SERVICE ||--o{ BOOKING : selected
  BOOKING o|--o{ SLOT_CLAIM : historical_claims
  RESOURCE ||--o{ SLOT_CLAIM : occupied_in
  BOOKING ||--o{ BOOKING_CHANGE_REQUEST : requests
  SERVICE o|--o{ BOOKING_CHANGE_REQUEST : target_service
  RESOURCE o|--o{ BOOKING_CHANGE_REQUEST : target_resource
  BOOKING ||--o{ BOOKING_EVENT : history
  CUSTOMER ||--o{ WAITLIST_ENTRY : joins
  SERVICE ||--o{ WAITLIST_ENTRY : awaits
  WAITLIST_ENTRY ||--o{ EXCLUSIVE_OFFER : receives
  EXCLUSIVE_OFFER o|--o| SLOT_CLAIM : initial_priority_only
  RESOURCE ||--o{ EXCLUSIVE_OFFER : released_for
  RESOURCE o|--o{ WAITLIST_ENTRY : preferred_for
  EXCLUSIVE_OFFER o|--o| BOOKING : converts_to
```

- `SlotClaim` is the **single authority** for occupancy. Each claim belongs to exactly one booking XOR one offer, and one resource. An ordinary booking has at most one active claim; an early-terminal booking may instead retain multiple nonoverlapping private remainder fragments (**DM-07**).
- Bookings have zero or more historical claims. An invitation has zero or one priority claim, required only for the first exclusive five-minute window in a small cohort. Conditional constraints enforce occupying bookings' claims and owner XOR; no competing claims for other invitees. Logical fields are in §6; final database semantics are **T-01**.
- **DM-08, updated:** For 1–4 eligible people, first priority creates a five-minute offer claim; then invite another every five minutes while previous recipients remain eligible. For 5+, notify simultaneously without exclusive claims. `ExclusiveOffer` is retained as a legacy name, not a promise that every invitation is exclusive. Winning a valid claim atomically closes any initial priority claim and creates one distinct ten-minute booking HOLD; only then issue transfer instructions. Each invitation links to at most one resulting booking. Late priority expiry never releases a newer HOLD.
- Persist audience, initial priority deadline versus final claim validity, progressive schedule and shared release/round correlation using existing records, not parallel exclusive claims or a new entity. Exact representation/concurrency remains **T-01/T-05**. Only initial priority blocks ordinary availability; later invitations do not freeze it, and all channels share atomic occupancy checks. Round behavior and the fixed limit of 10 per queue are product rules (BR-WL-14–15); how to enforce them is **T-01**.
- In the WhatsApp channel, a concrete slot selection starts a ten-minute `HOLD`. Without a deposit, explicit confirmation during the hold confirms the booking. With a deposit, timely receipt submission enters human payment review; the slot stays occupied with **no automatic payment-review timeout**. Evidence never establishes verified funds by itself.
- A pending authorization in `BookingChangeRequest` **does not lock the destination**; recheck it on approval. With an already verified partial deposit and an allowed move, atomically move the confirmed booking and release the old slot, preserving allocations; request the difference afterward. The destination is `CONFIRMED`, not a HOLD or pending review, and nonpayment is managed manually without automatic cancellation (**DM-09**; [rescheduling](../product-specs/uc-03/business-rules.md#8-cancellation-and-rescheduling-can)).
- `BookingEvent` records booking lifecycle history; `AuditEvent` records sensitive administrative decisions. Some actions may generate both without making the entities interchangeable.
- WaitlistEntry alone never occupies a resource. Optional preferred resource must be compatible/same-tenant; otherwise any compatible resource. Time preferences and current eligibility apply; arrival order controls progressive invitations, not the first successful atomic winner once competition opens. Delayed priority expiry cannot cancel a later HOLD.
- **Hard invariant:** active claims for the same tenant/resource cannot overlap on `[start, end)`. Early `COMPLETED`/`NO_SHOW` does not expose remaining time to ordinary public queries, WhatsApp or waitlist. Authorized explicit CRM walk-in reuse atomically closes the old claim and creates the walk-in claim plus any private restricted residual fragments, preserving the original full interval and claim history. No restricted fragment is automatically offered; correcting a no-show does not displace the walk-in. This fragment representation is an **inferred technical proposal for review**, not a new product decision; no new entity is required (**REV-07**–**REV-11**, **T-01**).
- Initial-evidence rejection without verified partial funds retains the guarded 15-minute/second-distinct-rejection workflow. A verified partial deposit instead keeps occupied/unconfirmed capacity with no automatic missing-remainder/rejection timeout, distinct from a genuinely pending PaymentReview; multiple payments may satisfy the threshold. Workers atomically recheck funds/review/start before releasing. Started/supplemental cases remain manual. Explicit authorized cancellation releases without waiting for financial review/refund and never loses the payment history.
- Completion is manual from start, no-show from start + 15 minutes; outcome correction is allowed both ways with permission, mandatory reason/history and destination timing guard. Recompute no-show counts, not money, and never displace a reused walk-in. BLOCKED CRM booking exception is available to any booking-capable role with warning/attribution, restriction unchanged; other policy/occupancy checks remain.
- Entry expires when its range contains no future slot, or closes on fulfilled booking/customer withdrawal; failed/unanswered notices alone do not delete it. No three-offer cap. Invitations never ask to transfer; clearly distinguish first exclusive priority from later/broadcast competition and first successful atomic winner, not incoming-message order.

### 2.5 Module 5A — Charges, payment reviews, allocations, and receiving accounts

```mermaid
erDiagram
  TENANT ||--o{ RECEIVING_ACCOUNT : configures
  RECEIVING_ACCOUNT o|--o{ RESOURCE : professional_destination
  RECEIVING_ACCOUNT o|--o{ BOOKING : issued_instructions
  BOOKING ||--o{ CHARGE : generates
  BOOKING o|--o{ PAYMENT_REVIEW : may_reference
  BOOKING_CHANGE_REQUEST o|--o{ PAYMENT_REVIEW : supplemental_evidence
  BOOKING_CHANGE_REQUEST o|--o{ CHARGE : financial_consequence
  BOOKING o|--o{ PAYMENT : known_origin_booking
  CUSTOMER o|--o{ PAYMENT : identified_payer
  RECEIVING_ACCOUNT o|--o{ PAYMENT_REVIEW : destination
  PAYMENT_REVIEW o|--o| PAYMENT : verified_as
  RECEIVING_ACCOUNT o|--o{ PAYMENT : receives_transfer
  PAYMENT ||--o{ PAYMENT_ALLOCATION : allocated_by
  CHARGE ||--o{ PAYMENT_ALLOCATION : receives
  PAYMENT ||--o{ REFUND : returned_by
```

- `Charge` is an obligation; `Payment` is actually verified money with a traceable commercial origin, not personal or completely unknown funds. `PaymentAllocation` links payments and charges (**DM-10**).
- Origin and allocation are different associations: a payment's known commercial provenance is mandatory even when a specific origin booking or identified payer is optional. Preserve same-tenant booking/customer links when identifiable, verification actor/time, receipt and reason for zero allocations. A supplemental review/charge references its change request; it cannot be applied to a superseded request by accident. Exact origin binding and correction representation are part of **T-03/T-05**, not a new origin entity.
- Manual allocations may distribute verified funds across charges and bookings of the same tenant, or leave a payment unallocated. Each allocation is capped both by the charge's remaining net debt and the payment's verified, unrefunded, unallocated funds. Charge balance is `max(0, net charge - valid allocations)`. Transactionally coordinate allocations, corrections and pending refunds to prevent overcommitment; preserve correction history and make retries idempotent.
- `PaymentReview` is pending, approved or rejected human evidence review. Verified cash or transfer in CRM may create `Payment` directly. A review and payment are optionally one-to-one; rejected evidence creates no payment. A screenshot alone is not proof of credit.
- **DM-11, updated:** Tenant collection mode is all professional (default), business deposit/professional remainder, or all business. Professional Resource optionally selects one same-tenant ReceivingAccount without requiring a User/membership. Missing professional account uses a business account; absence of business fallback requires personnel, never another professional or automatic deposit waiver. Account beneficiary/business-pool classification and stage instruction snapshots must be explicit in existing data (**T-02/T-05**).
- Business-pool selection uses default or configured sequential active-account rotation at instruction issue, not verification; retries reuse the instruction. Preserve booking modality, each issued instruction/actual receiver and original payment histories despite later configuration. No automatic commissions/payouts/distributions. A professional change preserves client credit and only remaining debt is collected; manual internal compensation cannot block an otherwise permitted move (**T-02/T-03**).
- PDF/image is requested first; text-only evidence is permitted only after explicit inability, with no fabricated attachment and the same evidence deadline. No image/PDF/OCR/text alone proves credit. The original payment remains immutable; recording corrections append permissioned, reasoned financial history and recompute balances without fictional refunds/cash movements or automatic cancellation. Exact ledger mechanism stays **T-03**, not a new entity or an AuditEvent-only ledger.
- A `Payment` has zero or more independent `Refund` records with amount, method, reason, Admin authorization, execution state, dates and origin/destination trace. Only executed refunds reduce retained funds; never mutate the original amount or create negative payments. Corrections to allocations preserve history. Execution cannot exceed available net funds and must coordinate with pending refunds and allocations (**T-03**).

### 2.6 Module 5B — Shared cash register

```mermaid
erDiagram
  TENANT ||--o{ CASH_SESSION : opens
  CASH_SESSION ||--o{ CASH_MOVEMENT : records
  CASH_SESSION ||--o{ CASH_ADJUSTMENT : corrected_by
  PAYMENT o|--o| CASH_MOVEMENT : cash_receipt
  REFUND o|--o| CASH_MOVEMENT : cash_refund
```

- At most one `CashSession` is open per tenant. Cash payments require an open session; configured automatic opening occurs on the first collection, otherwise authorized personnel open it. Opening balance is explicitly declared and audited, reconciled to the previous close where one exists. Closing is authorized, manual and immutable; serialize collection against closure (**REV-04**).
- `CashMovement` represents physical cash only. An executed cash refund requires an outflow in an open session; transfer refunds are bank outflows without a cash movement. A cash payment and its movement represent the same money, never two incomes; physical balance uses opening cash plus signed movements. Verified transfers do not alter a closed register.
- `CashAdjustment` is an append-only Admin-only correction of a **closed physical cash session**, with reason, actor and trace to the affected cash movement/payment when applicable (**DM-12**). It is not a general bank-payment correction or a substitute for `Refund`; financial corrections preserve their own payment/allocation history (**T-03**), and `AuditEvent` is not the financial ledger. Later physical movement belongs to an open session.
- Crossing midnight leaves the same CashSession open until manual close, with original opening time and actual movement timestamps; never block collection or fabricate a daily close. Routing transfers to professionals creates no additional physical register or automatic cash payout.

### 2.7 Module 6 — WhatsApp, conversations, and messages

```mermaid
erDiagram
  TENANT ||--o{ CHANNEL_CONNECTION : owns
  CHANNEL_CONNECTION ||--o{ CONVERSATION : contains
  CUSTOMER o|--o{ CONVERSATION : identifies
  CONVERSATION ||--o{ MESSAGE : contains
```

- Each tenant retains historical WhatsApp connections but has **at most one enabled connection** at a time in the MVP (**DM-13**). A number or provider instance can be enabled for only one tenant across the installation, so a message on an enabled connection always resolves to one tenant. A message on a disabled connection is stored without AI handling only if it resolves to exactly one connection (BR-NOT-05). Temporary Evolution/Baileys disconnection does not create a new connection; a permanent number change may.
- Keep one continuous `Conversation` per `(connection_id, sender_id)`, uniquely scoped to that connection. `customer_id` may be null before identity resolution; linking a customer never authorizes based on untrusted message text.
- `Message` records direction, author/source (customer, AI, human), provider identity, and deduplication. A conversation is under **either** AI or human control at a time; enforce safe takeover and prevent simultaneous responses.
- Authorized Staff/Admin can take over from the CRM. Admin can disable the AI across the tenant. Human inactivity may restore AI after 60 minutes only if global AI is enabled and the chosen handoff rules permit it.
- **Technical validation pending:** reliable detection of messages sent directly from the native WhatsApp client through Evolution/Baileys. Explicit CRM handoff is the trustworthy initial mechanism.

### 2.8 Modules 7–8 — Stored assets and notifications

```mermaid
erDiagram
  TENANT ||--o{ STORED_ASSET : stores
  STORED_ASSET o|--o{ MESSAGE : may_attach
  STORED_ASSET o|--o{ PAYMENT_REVIEW : may_evidence
  TENANT ||--o{ NOTIFICATION : schedules
  CUSTOMER o|--o{ NOTIFICATION : customer_recipient
  BOOKING o|--o{ NOTIFICATION : reminders
  EXCLUSIVE_OFFER o|--o{ NOTIFICATION : offer_notice
  NOTIFICATION ||--o{ NOTIFICATION_ATTEMPT : attempts
  MESSAGE o|--o| NOTIFICATION_ATTEMPT : represents
```

- `StoredAsset` stores the tenant, private storage location, MIME type, size, and retention metadata; bytes live in object storage. `Message` and `PaymentReview` can each reference **at most one** asset, but the **same asset may be reused** by both (**DM-14**). A single asset may be referenced by multiple records where permitted; there is no need for attachment bridge tables in this MVP.
- Enforce tenant-aware asset references, authorized download access, validated MIME/size, and evidence-preserving retention. No permanently public receipt links.
- Each `Notification` is one logical notice tied to either one booking or one offer (`XOR`), with zero or more `NotificationAttempt` records. Each attempt has time, outcome, error and zero or one `Message`; the inverse message link is optional and at most one attempt. Messages remain in conversations. Proposed `pg-boss` execution retries the same notice, not a new notice or custom job entity (**DM-15**).
- Customer-facing reminders/offers have exactly one recipient matching the booking requester or waitlist entry, with the applicable consent. The required staff alert after a second initial-evidence rejection is a personnel-facing booking notice, not a message to the customer and not dependent on customer reminder consent; its Customer link is absent. Recipient audience and dispatch route must be distinguishable in existing Notification/Attempt data (**T-05**); the specific staff-alert transport remains technical design. No personnel WhatsApp conversation or new entity is assumed.
- **DM-16, updated:** Customer retains independent reminder and waitlist-notice preferences, including refusal; one optional four-option question collects them at first confirmation or first enrollment without prior preference. Changeable in chat, no repeated prompt per booking/entry. WaitlistEntry retains specific voluntary interest and scoped consent provenance, but current Customer preference overrides any stale grant. Update preference and scoped grant/revocation AuditEvents atomically; no new consent entity and no per-message consent audit. Exact existing-field binding remains **T-05**.
- Recheck current preference, booking/slot, invitation priority versus claim validity and recipient before dispatch. Reminder omissions/timezone/reschedule rules remain canonical in UC-03; CRM phone/channel bookings also have separate transactional confirmation, not reminder consent.
- Persist notice/intention before send, recover jobs after outage/crash and correlate outcomes. Confirmed failure gets one still-valid retry; sent/delivered/read are not failures. Interrupted unknown outcome requires provider-status recovery where supported; unresolved cases stay visible in CRM without automatic resend. Never send expired opportunities, extend priority or retain occupancy due to connectivity. Provider deduplication/recovery support remains unvalidated (**T-04**), not an exactly-once delivery claim.
- No age-based purge runs in the MVP. Automatic deletion only executes a customer's confirmed request after its 30-day window and never removes Payment, Refund, cash records or evidence of verified payments ([UC-03 §18](../product-specs/uc-03/business-rules.md#18-personal-data-and-retention-dat)). Age-based periods are **TD-01** in the [debt tracker](../exec-plans/tech-debt-tracker.md); suggested 90 days for attempt details keeps the Notification final result. Anonymization and link handling are **T-04/T-05**.

### 2.9 Module 9 — Incidents, restrictions, and administrative audit

```mermaid
erDiagram
  TENANT ||--o{ CUSTOMER_INCIDENT : owns
  CUSTOMER ||--o{ CUSTOMER_INCIDENT : involved
  BOOKING ||--o{ CUSTOMER_INCIDENT : related_to
  TENANT_MEMBERSHIP ||--o{ CUSTOMER_INCIDENT : records
  TENANT ||--o{ CUSTOMER_RESTRICTION : owns
  CUSTOMER ||--o{ CUSTOMER_RESTRICTION : receives
  TENANT_MEMBERSHIP ||--o{ CUSTOMER_RESTRICTION : applies
  TENANT ||--o{ AUDIT_EVENT : owns
  TENANT_MEMBERSHIP o|--o{ AUDIT_EVENT : actor
```

- `CustomerIncident` records other booking-related operational incidents such as damage or conduct, not no-shows (**DM-17**). Every no-show belongs to the booking requester, including a third-party attendee's absence. Count the current `Booking` operational result by requester, never incident rows; `BookingEvent` records corrections and actors.
- Two current no-shows produce an **internal indicator only**, never an automatic restriction. Corrections recalculate the count and do not displace a valid walk-in reuse.
- `CustomerRestriction` preserves history but allows **at most one currently active restriction** for each customer (**DM-18**). Initial effective restrictions are `FULL_PREPAYMENT` and `BLOCKED`; normal service requires no active restriction row. Changes include human actor, reason, and effective dates.
- `AuditEvent` records significant administrative/security-sensitive actions. It is not a second booking-history table, a full message log, or a replacement for `BookingEvent`; one real-world operation can create both kinds of record when justified.
- Historical actor links must survive membership deactivation. Internal incident/restriction labels must never be exposed in customer-facing AI messages.

## 3. Cross-cutting invariants

| ID | Required invariant | Future enforcement/check |
|---|---|---|
| `ERD-I01` | Every operational record belongs to exactly one tenant; `User` and `Permission` are global | Tenant-aware FKs, authorization, negative isolation tests |
| `ERD-I02` | A membership can only select a role owned by its tenant | Tenant-aware referential constraints |
| `ERD-I03` | WhatsApp requesters only manage their own bookings within the tenant | Validated sender/channel context; backend authorization |
| `ERD-I04` | A booking selects a service and compatible resource from the same tenant | Same-tenant and compatibility checks |
| `ERD-I05` | Incompatible active occupancy claims never overlap on a resource | DB-backed transactional exclusion of `[start, end)` ranges |
| `ERD-I06` | Expiry cannot free confirmed, pending-review, verified-partial or started-turn occupancy; no-funds initial rejection follows guarded correction window | Atomic state/review/funds/start recheck; explicit cancellation independent of finances |
| `ERD-I07` | Pending reschedules retain the original slot; target is checked only when applying | Version/state check, one atomic booking update |
| `ERD-I08` | Only initial priority owns an offer claim; winning closes it if any and creates a distinct unique HOLD | Optional claim, atomic arbitration, late invitation eligibility, no payment instructions to losers |
| `ERD-I09` | Transfer evidence is never equivalent to automatic financial accreditation | Human verification, recorded actor/time |
| `ERD-I10` | Allocations cannot exceed either net charge debt or verified, unrefunded available payment funds | Transactional sums, pending-refund coordination and same-tenant references |
| `ERD-I11` | At most one open cash session; closed sessions are immutable | Conditional uniqueness, append-only correction |
| `ERD-I12` | Reminder/offer notices require current consent and current booking/offer validity | Send-time recheck, durable deduplication |
| `ERD-I13` | At most one active customer restriction; an indicator never automatically sanctions | Conditional uniqueness, explicit human authorization |
| `ERD-I14` | Sensitive operations keep actor and timestamp despite staff deactivation | Persistent membership linkage and auditing |
| `ERD-I15` | Early terminal residual intervals remain private; explicit authorized CRM reuse preserves full history without overlap | Atomic close, walk-in and restricted residual claims; availability filtering |
| `ERD-I16` | Refunds are independent; only execution reduces retained funds, never the original payment | Immutable originals, idempotent execution and coordinated allocation/refund limits |
| `ERD-I17` | One notice can have zero attempts; each attempt has at most one message | Optional association and idempotent retries |
| `ERD-I18` | Every no-show counts for the requester from current booking outcome alone | Derive count from bookings; preserve correction events |

## 4. Agreed modeling proposals (team ratification pending)

| ID | Subject | Proposed decision from DOM-01 discussion |
|---|---|---|
| `DM-01` | Memberships | A user may join multiple tenants; exactly one role per membership |
| `DM-02` | Roles | Non-deletable per-tenant Admin/Staff; editable Staff and custom roles; protected full Admin authority |
| `DM-03` | Customers | Tenant-local customer, optional tenant-unique phone; future local landing login |
| `DM-04` | Calendars | One tenant general calendar plus optional resource-specific calendars |
| `DM-05` | Exceptional hours | Only explicitly authorized special openings can extend regular hours |
| `DM-06` | Policy precedence | Per-field override: resource > service > tenant |
| `DM-07` | Occupancy | One active claim for ordinary bookings; early-terminal private residual fragments are an inferred technical representation |
| `DM-08` | Waitlist | Initial exclusive priority only for 1–4; progressive competition or 5+ broadcast, unique HOLD winner and optional historical offer claim |
| `DM-09` | Rescheduling | Prior approval takes no target lock; an eligible partially prepaid move stays confirmed while its difference is collected later |
| `DM-10` | Payment allocations | Payments can be split across charges and temporarily left unallocated |
| `DM-11` | Receiving accounts | Three collection modes, professional account/business fallback; sequential business-pool rotation, immutable issued instructions |
| `DM-12` | Cash corrections | `CashAdjustment` after close; immutable closed session |
| `DM-13` | WhatsApp | One enabled connection per tenant; a number or instance enabled for only one tenant; one continuous thread per sender/connection |
| `DM-14` | Assets | At most one asset per message or payment review; direct optional references |
| `DM-15` | Notifications | One logical notice, zero or more distinct attempts; proposed pg-boss execution |
| `DM-16` | Consent | One question, independent reusable Customer preferences; entry interest/provenance, current preference rechecked, configurable reminder lead time |
| `DM-17` | Incidents | All no-shows count for requester from booking; incidents cover other operational events |
| `DM-18` | Restrictions | One effective restriction per customer, retaining full change history |

## 5. Reconciliation backlog — review history

The following discrepancies are reconciled in this proposal against the product-owner handoff, subject to team review and implementation. Canonical product rules remain in [UC-03](../product-specs/uc-03/business-rules.md); review those rules together with this ERD. Reconciled does not mean team-approved or implemented.

| ID | Topic | Status and remaining review |
|---|---|---|
| `REV-01` | Role permissions | Reconciled: role-only with protected Admin actions. |
| `REV-02` | Receiving accounts | Follow-up: three modes, business fallback and sequential rotation agreed; concurrent instruction binding **T-02**. |
| `REV-03` | Payment origin and allocations | Reconciled: verified commercial origin and manual multi-charge allocations. |
| `REV-04` | Cash and late transfers | Reconciled: open session for cash; transfer independent of physical cash. |
| `REV-05` | Consent audit | Reconciled: independent state and transactional grant/revoke audit; retention **T-04**. |
| `REV-06` | Policy precedence | Reconciled: field-level resource/service/tenant with inherit/set/disable. |
| `REV-07` | Offer claims | Follow-up supersedes universal exclusivity: optional initial priority claim, nonexclusive progressive/broadcast invitations; one distinct winning HOLD, physical enforcement **T-01**. |
| `REV-08` | Reschedule target | Reconciled: pending authorization takes no destination lock. |
| `REV-09` | Early terminal occupancy | Reconciled: private remainder and explicit CRM reuse; inferred fragments **T-01**. |
| `REV-10` | Reschedule history | Reconciled: same booking, claim and event history with preserved verified funds. |
| `REV-11` | Approval | Reconciled: prior human authorization differs from subsequent deposit verification and Admin exceptions. |
| `REV-12` | Effective hours | Reconciled: inheritance and authorized openings across channels, preserving blocks. |
| `REV-13` | No-show attribution | Follow-up: requester count unchanged; name-only attendee data, outcome timing and bidirectional correction resolved. |
| `REV-14` | Late funds | Reconciled: verified commercial funds may be unallocated and resolved manually. |
| `REV-15` | Calendar/policy scope | Conceptual precedence reconciled; physical scope uniqueness remains **T-05**. |
| `REV-16` | Shared assets | Conceptual optional associations retained; physical FK and multiplicity validation remains **T-05**. |

### Technical review register

- **T-01:** Validate private residual fragments, immutable claim history, exclusion/CRM reuse and progressive/broadcast round correlation, initial priority expiry, late claims, mode fixed per round, late enrollment, new rounds excluding an expired winner, and atomic enforcement of the limit of 10 per queue, including overlapping requested ranges. Product rules are agreed; do not recreate exclusive claims for every invitee. Validate races with ordinary bookings and requester cap.
- **T-02:** Sequential rotation is agreed. Specify concurrent business-pool cursor selection/idempotent instruction binding and professional-account/stage snapshots, inactive-account handling and preservation of issued account history. Do not choose another professional's account or silently change collection mode.
- **T-03:** Specify transactional allocation/refund reservation, commercial-origin linkage, financial correction history and idempotency. A lower adjusted charge cannot retain valid allocations above its debt: require an explicit correction plan preserving prior facts and releasing excess as unallocated, without silently reallocating it elsewhere. Define reporting/correction boundaries for transfers independently of physical cash sessions.
- **T-04:** One confirmed-failure retry, no automatic uncertain resend and durable recovery are agreed. Validate actual Evolution/Baileys identity/status/reconciliation/deduplication capabilities. Specify blocking, advance CRM alert timing, idempotent execution and withdrawal of a customer deletion request, including a future booking left without customer identity, plus anonymization that keeps financial links. Age-based periods are TD-01.
- **T-05:** Define scoped calendar/policy uniqueness, professional-account and collection-stage snapshots, Customer preference/entry provenance bindings, actor/recipient audiences, invitation round/priority/validity fields, notification/attempt correlation/purge references, partial-deposit waiting and correction-window timestamps. [§6](#6-logical-specification-by-entity) proposes each of these logically; validate them, then choose physical types, asset MIME/size limits, indexes and storage constraints at implementation.

Remaining product portions (legal validation and legal/reporting duties) stay in [UC-03 §16](../product-specs/uc-03/business-rules.md#16-pending-decisions). Notice defaults, queue limit, round behavior, outcome timing, attendee name-only data, booking-limit defaults/counting, evidence fallback and partial-deposit/cancellation behavior are resolved, not pending schema choices.

## 6. Logical specification by entity

This is a logical proposal, not a physical schema. Names are descriptive, not final columns. The §2 diagrams show the main relationships; this section is the complete list, including actor references to `TenantMembership`. A note marked **[T-0X]** is the simplest proposal for something that still needs architectural validation in the [technical register](#technical-review-register); expect it may change.

### 6.1 Shared conventions

**Identifiers and keys**

- Every entity has an opaque surrogate primary key `id`, except the two join entities with a composite key.
- Tables below omit `id`, `tenant_id` and `created_at`, which every entity has unless its scope line says otherwise. `updated_at` applies to mutable entities only.
- **Tenant-aware foreign keys:** a reference from `Tenant` or a tenant-owned entity to a tenant-owned entity must resolve to the same tenant, so a relationship can never cross businesses (`ERD-I01`). This includes the `Tenant` cursors, whose target's `tenant_id` must equal `Tenant.id`. The only exception is the polymorphic `AuditEvent.target_id`.
- Foreign keys restrict deletion by default. History is preserved by deactivating, anonymizing or closing, not by cascading.

**Conceptual types**

| Type | Meaning |
|---|---|
| Identifier | Stable opaque reference, used for keys; UUID by default for future tenant portability (BR-TEN-06) |
| Text / Bool / Int / Enum | Plain values; Enum values are conceptual. Those UC-03 defines, such as `Booking.status`, are canonical there; the rest are proposals |
| Money | Exact decimal in the tenant's single currency, never floating point; precision is chosen at implementation. Proposal: no multi-currency in the MVP |
| Instant | Unambiguous point in time, stored in UTC and interpreted in the tenant's timezone for calendar rules |
| LocalTime / Weekday | Wall-clock values in the tenant's timezone, for recurring hours |
| Minutes | Duration as a whole number of minutes |
| Phone | Normalized international format (E.164) |

**Deletion rules** (see [UC-03 §18](../product-specs/uc-03/business-rules.md#18-personal-data-and-retention-dat))

| Rule | Meaning |
|---|---|
| Never | Append-only or financial history; not removed by any operation |
| Deactivate | Configuration or actor referenced by history; retired, not removed |
| Replace | Configuration without history value; may be removed when unreferenced |
| On request | Removed or anonymized by an executed customer deletion request. Nothing is removed for its age in the MVP (TD-01) |

**Req column:** Y = required, N = optional, Cond. = required under the stated condition. FK marks a foreign key.

### 6.2 Global versus tenant scope

- **Global (2):** `User`, `Permission`. "Global" means within one installation: a person in two installations has two `User` rows.
- **Tenant root (1):** `Tenant`.
- **Tenant-owned (35):** all others. They carry `tenant_id` and are never shared between businesses.

### 6.3 Module 1 — Identity

#### `Tenant`

**Scope:** root; no `tenant_id`. **Deletion:** Never. Export or migration is deferred (X-10).

| Attribute | Type | Req | Notes |
|---|---|---|---|
| name | Text | Y | |
| slug | Text | Y | Unique; used for routing, never as proof of authorization |
| timezone | Text | Y | IANA name (BR-TEN-04) |
| currency | Text | Y | Proposal: single currency per tenant |
| branding | Text | N | Display settings |
| collection_mode | Enum | Y | ALL_PROFESSIONAL (default), DEPOSIT_BUSINESS_REMAINDER_PROFESSIONAL, ALL_BUSINESS |
| business_account_selection | Enum | Y | DEFAULT, SEQUENTIAL_ROTATION |
| rotation_cursor | Identifier | N | FK → `ReceivingAccount`; last account issued **[T-02]** |
| resource_assignment_mode | Enum | Y | PREFERENCE_ORDER, ROTATION |
| resource_rotation_cursor | Identifier | N | FK → `Resource` **[T-01]** |
| cash_auto_open | Bool | Y | Open a session on the first cash collection |
| ai_enabled | Bool | Y | Global AI switch, Admin only |
| ai_disabled_until | Instant | N | Temporary disable |

#### `User`

**Scope:** global; no `tenant_id`. **Deletion:** Deactivate; actor history must survive.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| email | Text | Y | Unique within the installation |
| full_name | Text | Y | |
| credential_ref | Text | N | Empty until the person establishes access, for example after a tenant move; without it the account cannot sign in. Authentication mechanism is detailed design |
| status | Enum | Y | ACTIVE, DISABLED |

#### `TenantMembership`

**Unique:** (`tenant_id`, `user_id`). **Deletion:** Deactivate.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| user_id | Identifier | Y | FK → `User` |
| role_id | Identifier | Y | FK → `Role` of the same tenant (`ERD-I02`) |
| status | Enum | Y | ACTIVE, DEACTIVATED |
| deactivated_at | Instant | N | |

**Constraint:** the last active Admin membership cannot be removed or demoted.

#### `Role`

**Unique:** (`tenant_id`, `name`); one `system_key` per tenant. **Deletion:** Deactivate for custom roles; system roles never.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| name | Text | Y | |
| system_key | Enum | N | ADMIN, STAFF; absent for custom roles |
| is_protected | Bool | Y | Admin authority cannot be reduced |

#### `Permission`

**Scope:** global; no `tenant_id`. **Unique:** `key`. **Deletion:** Deactivate.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| key | Text | Y | Capability name; the catalog is detailed design |
| description | Text | Y | |
| is_delegable | Bool | Y | False for protected Admin operations (BR-IAM-04) |

#### `RolePermission`

**PK:** (`role_id`, `permission_id`). **Deletion:** Replace.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| role_id | Identifier | Y | FK → `Role` |
| permission_id | Identifier | Y | FK → `Permission`; must be delegable unless the role is Admin |

### 6.4 Module 2 — Customers

#### `Customer`

**Unique:** (`tenant_id`, `phone`) when phone is present. **Deletion:** On request, anonymized; the row stays because bookings and payments reference it.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| full_name | Text | Cond. | Required for a CRM walk-in; captured when needed on WhatsApp |
| phone | Phone | N | Optional for walk-ins |
| reminder_preference | Enum | Y | UNSET, ACCEPTED, REFUSED |
| waitlist_preference | Enum | Y | UNSET, ACCEPTED, REFUSED |
| deletion_status | Enum | Y | NONE, REQUESTED, EXECUTED; a withdrawal returns to NONE |
| deletion_requested_at | Instant | Cond. | When REQUESTED or EXECUTED |
| deletion_due_at | Instant | Cond. | Requested date plus the configured window. Proposal: one platform-wide value, not per tenant **[T-04]** |
| anonymized_at | Instant | N | |

**Derived, not stored:** no-show count from current `Booking` outcomes; late-changes count from `BookingEvent`; current restriction from `CustomerRestriction`.

### 6.5 Module 3 — Catalog, availability and policies

#### `Service`

**Deletion:** Deactivate.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| name | Text | Y | A combination is one preconfigured service (BR-CAT-01) |
| description | Text | N | |
| duration | Minutes | Y | Greater than zero |
| price | Money | Y | Not negative; agreed bookings keep their own snapshot |
| is_active | Bool | Y | |

#### `Resource`

**Deletion:** Deactivate. Works for a barber or a court alike.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| name | Text | Y | |
| kind | Enum | Y | PROFESSIONAL, PHYSICAL |
| is_active | Bool | Y | |
| preference_order | Int | N | Used by PREFERENCE_ORDER assignment |
| receiving_account_id | Identifier | N | FK → `ReceivingAccount`, professional destination; needs no `User` (DM-11) |

#### `ServiceResource`

**PK:** (`service_id`, `resource_id`). **Deletion:** Replace.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| service_id | Identifier | Y | FK → `Service` |
| resource_id | Identifier | Y | FK → `Resource` |

#### `AvailabilityCalendar`

**Unique:** one TENANT calendar per tenant; at most one per resource **[T-05]**. **Deletion:** Replace.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| scope | Enum | Y | TENANT, RESOURCE |
| resource_id | Identifier | Cond. | FK → `Resource`; required only when scope is RESOURCE |

#### `AvailabilityRule`

**Deletion:** Replace.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| calendar_id | Identifier | Y | FK → `AvailabilityCalendar` |
| weekday | Weekday | Y | |
| start_time | LocalTime | Y | Before `end_time` |
| end_time | LocalTime | Y | |

#### `AvailabilityException`

**Deletion:** Never once it affected a booking; otherwise Replace.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| calendar_id | Identifier | Y | FK → `AvailabilityCalendar` |
| kind | Enum | Y | BLOCK, OPENING |
| start_at | Instant | Y | Before `end_at` |
| end_at | Instant | Y | |
| reason | Text | N | |
| created_by_membership_id | Identifier | Y | FK → `TenantMembership`; authorizing actor |

**Constraint:** an OPENING never overrides a BLOCK or an active claim (DM-05).

#### `BookingPolicy`

**Unique:** one row per scope target **[T-05]**. **Deletion:** Replace; bookings keep their snapshot.

An empty field means inherit. An explicit disable is a value of its own, so inherit and disable stay distinct (DM-06).

| Attribute | Type | Req | Notes |
|---|---|---|---|
| scope | Enum | Y | TENANT, SERVICE, RESOURCE |
| service_id | Identifier | Cond. | FK → `Service`, when scope is SERVICE |
| resource_id | Identifier | Cond. | FK → `Resource`, when scope is RESOURCE |
| notice | Minutes | N | Tenant default 600 (10 hours) |
| booking_lead | Minutes | N | Tenant default 0 |
| reminder_lead | Minutes | N | |
| deposit_mode | Enum | N | DISABLED, FIXED, PERCENTAGE |
| deposit_value | Money or Int | Cond. | Amount or percentage, per `deposit_mode` |
| deposit_refund_policy | Enum | N | NO_MONEY_BACK, REFUND_POSSIBLE |
| reschedule_limit | Int | N | Empty at tenant level means unlimited |
| future_booking_limit | Int | N | Tenant scope only; empty means disabled |

### 6.6 Module 4 — Bookings, occupancy and waitlist

#### `Booking`

**Deletion:** Never. Attendee details are anonymized on request.

Current resource and time come from the active `SlotClaim`; `Booking` holds no competing occupancy data.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| customer_id | Identifier | Y | FK → `Customer`; the requester, who bears any no-show |
| service_id | Identifier | Y | FK → `Service`; compatible with the claimed resource (`ERD-I04`) |
| status | Enum | Y | HOLD, PENDING_PAYMENT_REVIEW, CONFIRMED, CANCELLED, EXPIRED, COMPLETED, NO_SHOW |
| origin | Enum | Y | WHATSAPP, CRM |
| attendee_name | Text | Cond. | When booked for someone else |
| attendee_phone | Phone | N | |
| agreed_price | Money | Y | Snapshot; changed only by Admin |
| required_deposit | Money | N | Snapshot; empty when no deposit applies |
| notice_snapshot | Minutes | Y | Applied to this booking |
| deposit_refund_policy_snapshot | Enum | N | Stated to the customer |
| collection_mode_snapshot | Enum | Y | Later configuration changes do not alter it |
| deposit_instruction_account_id | Identifier | N | FK → `ReceivingAccount`; fixed on issue **[T-02]** |
| deposit_instruction_text | Text | N | Exact instruction shown, independent of later edits **[T-02]** |
| balance_instruction_account_id | Identifier | N | FK → `ReceivingAccount` **[T-02]** |
| balance_instruction_text | Text | N | **[T-02]** |
| hold_expires_at | Instant | Cond. | While in HOLD |
| correction_deadline_at | Instant | N | After a first initial-evidence rejection **[T-05]** |
| blocked_exception | Bool | Y | CRM booking created for a BLOCKED customer |
| deposit_exception | Bool | Y | Admin confirmed without the required deposit (BR-SEN-09) |
| created_by_membership_id | Identifier | N | FK → `TenantMembership`; empty when created over WhatsApp |
| cancel_reason | Text | N | Required for an operational business cancellation |

**Derived, not stored:** partial-deposit waiting (unconfirmed occupying booking with verified allocations above zero and below `required_deposit`; at zero, BR-SEN-10 applies instead), rejection count (distinct rejected `PaymentReview` rows), reschedule count, started (start instant has passed).

#### `SlotClaim`

**Deletion:** Never; closed claims are the occupancy history.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| resource_id | Identifier | Y | FK → `Resource` |
| booking_id | Identifier | Cond. | FK → `Booking`; exactly one of `booking_id`, `offer_id` |
| offer_id | Identifier | Cond. | FK → `ExclusiveOffer` |
| kind | Enum | Y | OFFER_PRIORITY, BOOKING, PRIVATE_REMAINDER **[T-01]** |
| start_at | Instant | Y | Half-open interval `[start, end)` |
| end_at | Instant | Y | After `start_at` |
| status | Enum | Y | ACTIVE, CLOSED |
| closed_at | Instant | Cond. | When CLOSED |
| close_reason | Text | N | |

**Constraints:** active claims on the same resource never overlap (`ERD-I05`). An ordinary booking has at most one active claim; only an early-terminal booking may hold several PRIVATE_REMAINDER fragments **[T-01]**. PRIVATE_REMAINDER is excluded from public availability and waitlist.

#### `BookingChangeRequest`

**Deletion:** Never.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| booking_id | Identifier | Y | FK → `Booking` |
| target_service_id | Identifier | N | FK → `Service` |
| target_resource_id | Identifier | N | FK → `Resource` |
| target_start_at | Instant | N | Takes no lock while pending; rechecked on applying |
| target_end_at | Instant | N | |
| status | Enum | Y | PENDING_AUTHORIZATION, APPLIED, REJECTED, CANCELLED, SUPERSEDED |
| requested_via | Enum | Y | WHATSAPP, CRM |
| is_late | Bool | Y | Outside the booking's notice |
| consequence_accepted_at | Instant | Cond. | When late and requested by the customer |
| authorized_by_membership_id | Identifier | N | FK → `TenantMembership` |
| reason | Text | N | |
| applied_at | Instant | N | |

#### `BookingEvent`

**Deletion:** Never; append-only.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| booking_id | Identifier | Y | FK → `Booking` |
| event_type | Text | Y | Conceptual lifecycle event |
| from_status | Enum | N | |
| to_status | Enum | N | |
| actor_kind | Enum | Y | CUSTOMER, MEMBER, AI, SYSTEM |
| actor_membership_id | Identifier | Cond. | FK → `TenantMembership`, when MEMBER |
| reason | Text | Cond. | Required for outcome corrections |
| late_change_kind | Enum | N | LATE_CANCELLATION, LATE_RESCHEDULE; source of the late-changes count |
| occurred_at | Instant | Y | |

#### `WaitlistEntry`

**Unique:** one active entry per requester and conditions, keeping the original arrival. **Deletion:** On request.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| customer_id | Identifier | Y | FK → `Customer` |
| service_id | Identifier | Y | FK → `Service` |
| resource_id | Identifier | N | FK → `Resource`; empty means any compatible resource |
| range_start_at | Instant | Y | Requested range |
| range_end_at | Instant | Y | Entry expires when no future slot remains |
| status | Enum | Y | ACTIVE, EXPIRED, FULFILLED, WITHDRAWN |
| arrival_at | Instant | Y | Orders progressive invitations |
| consent_provenance | Text | Y | How and when interest was expressed; current `Customer` preference still gates sending |

**Constraint:** at most 10 people per queue, checked atomically on enrollment. How overlapping ranges form one queue is **[T-01]**.

#### `ExclusiveOffer`

Legacy name for one recipient's invitation in a release round. **Unique:** (`round_ref`, `waitlist_entry_id`). **Deletion:** Never; link to the customer is anonymized through `Customer`.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| waitlist_entry_id | Identifier | Y | FK → `WaitlistEntry` |
| round_ref | Identifier | Y | Groups one round without a new entity **[T-01]** |
| round_mode | Enum | Y | PROGRESSIVE, SIMULTANEOUS; fixed when the round starts |
| audience | Enum | Y | INITIAL_PRIORITY, PROGRESSIVE, BROADCAST |
| resource_id | Identifier | Y | FK → `Resource` released |
| slot_start_at | Instant | Y | |
| slot_end_at | Instant | Y | |
| invited_at | Instant | N | |
| priority_until | Instant | Cond. | INITIAL_PRIORITY only; five minutes |
| valid_until | Instant | Y | Slot start at the latest |
| status | Enum | Y | PENDING, INVITED, CLAIMED, DECLINED, LOST, CLOSED **[T-01]** |
| resulting_booking_id | Identifier | N | FK → `Booking`; unique, set on winning |

### 6.7 Module 5 — Charges, payments and cash

#### `Charge`

**Deletion:** Never.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| booking_id | Identifier | Y | FK → `Booking` |
| change_request_id | Identifier | N | FK → `BookingChangeRequest`, for a financial consequence |
| kind | Enum | Y | SERVICE, SUPPLEMENT |
| net_amount | Money | Y | Not negative; a lower adjustment needs an explicit correction plan **[T-03]** |
| description | Text | N | |

**Derived:** balance is `max(0, net_amount - valid allocations)`, never negative.

#### `ReceivingAccount`

**Deletion:** Deactivate; issued instructions keep their history.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| label | Text | Y | |
| beneficiary_kind | Enum | Y | BUSINESS, PROFESSIONAL |
| holder_name | Text | Y | Shown to the customer |
| alias_or_number | Text | Y | Bank or wallet destination |
| is_default | Bool | Y | At most one active default per tenant |
| rotation_position | Int | N | Sequential order among active BUSINESS accounts **[T-02]** |
| is_active | Bool | Y | |

#### `PaymentReview`

**Deletion:** Never; the evidence file follows the rule on `StoredAsset`.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| booking_id | Identifier | N | FK → `Booking` |
| change_request_id | Identifier | N | FK → `BookingChangeRequest`, for supplemental evidence |
| receiving_account_id | Identifier | N | FK → `ReceivingAccount`; expected destination |
| evidence_kind | Enum | Y | FILE, TEXT |
| evidence_asset_id | Identifier | Cond. | FK → `StoredAsset`, when FILE |
| evidence_text | Text | Cond. | When TEXT, after explicit inability to send a file |
| evidence_fingerprint | Text | N | So technical duplicates do not count as a second rejection **[T-05]** |
| declared_amount | Money | N | Never proof of credit |
| status | Enum | Y | PENDING, APPROVED, REJECTED |
| submitted_at | Instant | Y | |
| reviewed_by_membership_id | Identifier | Cond. | FK → `TenantMembership`, once decided |
| reviewed_at | Instant | Cond. | |
| rejection_reason | Text | Cond. | When REJECTED |

#### `Payment`

**Unique:** (`tenant_id`, `idempotency_key`) when present. **Deletion:** Never, including under a deletion request; immutable. Kept at least 10 years.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| amount | Money | Y | Greater than zero; no negative payments |
| method | Enum | Y | CASH, TRANSFER |
| commercial_origin | Text | Y | Traceable origin; unknown or personal funds are not payments |
| booking_id | Identifier | N | FK → `Booking`, known origin |
| customer_id | Identifier | N | FK → `Customer`, identified payer |
| receiving_account_id | Identifier | Cond. | FK → `ReceivingAccount`, required for TRANSFER |
| payment_review_id | Identifier | N | FK → `PaymentReview`; unique, so approval cannot duplicate money |
| verified_by_membership_id | Identifier | Y | FK → `TenantMembership` |
| verified_at | Instant | Y | |
| unallocated_reason | Text | N | Why it has no allocations |
| corrects_payment_id | Identifier | N | FK → `Payment`; recording correction as an appended record **[T-03]** |
| correction_reason | Text | Cond. | Required with `corrects_payment_id` |
| idempotency_key | Text | N | Prevents duplicates on retry; who generates it and when is **[T-03]** |

#### `PaymentAllocation`

**Deletion:** Never; reversed, not removed.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| payment_id | Identifier | Y | FK → `Payment` |
| charge_id | Identifier | Y | FK → `Charge`, same tenant, any booking |
| amount | Money | Y | Greater than zero |
| status | Enum | Y | ACTIVE, REVERSED |
| created_by_membership_id | Identifier | Y | FK → `TenantMembership`; allocation is always manual |
| reversed_by_membership_id | Identifier | N | FK → `TenantMembership` |
| reversal_reason | Text | Cond. | When REVERSED |

**Constraint:** capped by the charge's balance and by the payment's verified, unrefunded and unallocated funds (`ERD-I10`) **[T-03]**.

#### `Refund`

**Unique:** (`tenant_id`, `idempotency_key`) when present. **Deletion:** Never.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| payment_id | Identifier | Y | FK → `Payment` |
| amount | Money | Y | Greater than zero, within available funds |
| method | Enum | Y | CASH, TRANSFER |
| status | Enum | Y | PENDING, EXECUTED, CANCELLED; only EXECUTED reduces retained funds |
| reason | Text | Y | |
| authorized_by_membership_id | Identifier | Y | FK → `TenantMembership`; Admin only |
| executed_at | Instant | Cond. | When EXECUTED |
| destination_trace | Text | N | |
| idempotency_key | Text | N | Who generates it and when is **[T-03]** |

#### `CashSession`

**Unique:** at most one OPEN session per tenant (`ERD-I11`). **Deletion:** Never; immutable once closed.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| status | Enum | Y | OPEN, CLOSED |
| open_mode | Enum | Y | MANUAL, AUTOMATIC |
| opened_at | Instant | Y | A session survives midnight |
| opened_by_membership_id | Identifier | N | FK → `TenantMembership`; collector when automatic |
| opening_amount | Money | Y | Declared or reconciled, never fabricated |
| previous_session_id | Identifier | N | FK → `CashSession` |
| closed_at | Instant | Cond. | Always manual |
| closed_by_membership_id | Identifier | Cond. | FK → `TenantMembership` |
| counted_amount | Money | Cond. | |
| expected_amount | Money | Cond. | Fixed at close: opening plus signed movements |
| difference_amount | Money | Cond. | Allowed, recorded |

#### `CashMovement`

**Deletion:** Never.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| session_id | Identifier | Y | FK → `CashSession`; must be OPEN when recorded |
| kind | Enum | Y | PAYMENT, REFUND, CASH_IN, CASH_OUT |
| signed_amount | Money | Y | Not zero; physical cash only |
| payment_id | Identifier | Cond. | FK → `Payment`, unique, when PAYMENT |
| refund_id | Identifier | Cond. | FK → `Refund`, unique, when REFUND |
| reason | Text | Cond. | For CASH_IN and CASH_OUT |
| recorded_by_membership_id | Identifier | Y | FK → `TenantMembership` |
| occurred_at | Instant | Y | Actual time |

#### `CashAdjustment`

**Deletion:** Never; append-only.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| session_id | Identifier | Y | FK → `CashSession`; must be CLOSED |
| signed_amount | Money | Y | Not zero |
| reason | Text | Y | |
| adjusted_by_membership_id | Identifier | Y | FK → `TenantMembership`; Admin only |
| cash_movement_id | Identifier | N | FK → `CashMovement` affected |
| payment_id | Identifier | N | FK → `Payment` affected |

### 6.8 Module 6 — WhatsApp

#### `ChannelConnection`

**Unique:** at most one enabled connection per tenant (DM-13). Among enabled connections across the installation, `phone_number` is unique and so is (`provider`, `provider_instance_ref`). Disabling a connection frees its number for another tenant. **Deletion:** Deactivate; history is retained.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| provider | Enum | Y | Evolution in the MVP; adapter-friendly |
| provider_instance_ref | Text | Cond. | Required while the connection is enabled; may be empty on a disabled connection, for example after a tenant move until it is reconnected |
| phone_number | Phone | Y | |
| is_enabled | Bool | Y | |
| status | Enum | Y | CONNECTED, DISCONNECTED; a temporary drop is not a new connection |
| credential_ref | Text | N | Reference to a secret, never the secret |

#### `Conversation`

**Unique:** (`connection_id`, `sender_id`). **Deletion:** On request.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| connection_id | Identifier | Y | FK → `ChannelConnection` |
| sender_id | Text | Y | Validated provider sender |
| customer_id | Identifier | N | FK → `Customer`; empty before identity resolution |
| control_mode | Enum | Y | AI, HUMAN; one at a time |
| taken_over_by_membership_id | Identifier | N | FK → `TenantMembership` |
| last_human_reply_at | Instant | N | Drives the 60-minute return |

#### `Message`

**Unique:** (`conversation_id`, `provider_message_id`) when present, for deduplication. **Deletion:** On request.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| conversation_id | Identifier | Y | FK → `Conversation` |
| direction | Enum | Y | INBOUND, OUTBOUND |
| author_kind | Enum | Y | CUSTOMER, AI, HUMAN, SYSTEM |
| author_membership_id | Identifier | N | FK → `TenantMembership`, when HUMAN from the CRM |
| provider_message_id | Text | N | **[T-04]** |
| body | Text | N | |
| asset_id | Identifier | N | FK → `StoredAsset` |
| occurred_at | Instant | Y | |

### 6.9 Modules 7–8 — Assets and notifications

#### `StoredAsset`

**Deletion:** On request, unless it evidences a verified payment or an open claim. The bytes live in private object storage.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| storage_key | Text | Y | Private location; no public links |
| mime_type | Text | Y | Validated |
| size_bytes | Int | Y | |
| retention_class | Enum | Y | PAYMENT_EVIDENCE, OTHER |
| deleted_at | Instant | N | Keeps the reference after removal |

#### `Notification`

**Unique:** (`tenant_id`, `dedupe_key`). **Deletion:** Never; final result is retained, identity goes through `Customer`.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| kind | Enum | Y | CONFIRMATION, REMINDER, WAITLIST_INVITATION, HOLD_NOTICE, STAFF_ALERT |
| audience | Enum | Y | CUSTOMER, PERSONNEL **[T-05]** |
| customer_id | Identifier | Cond. | FK → `Customer`, when audience is CUSTOMER |
| booking_id | Identifier | Cond. | FK → `Booking`; exactly one of `booking_id`, `offer_id` |
| offer_id | Identifier | Cond. | FK → `ExclusiveOffer` |
| scheduled_for | Instant | N | |
| status | Enum | Y | PENDING, SENT, FAILED, UNKNOWN, SUPPRESSED, OMITTED |
| dedupe_key | Text | Y | One logical notice; how the key is composed is **[T-04]** |
| omission_reason | Text | N | An omitted notice has zero attempts |

The advance alert for a pending customer deletion needs no `Notification`: the CRM derives it from `Customer.deletion_due_at`.

#### `NotificationAttempt`

**Unique:** (`notification_id`, `attempt_number`); `message_id` when present. **Deletion:** No age-based purge in the MVP (TD-01).

| Attribute | Type | Req | Notes |
|---|---|---|---|
| notification_id | Identifier | Y | FK → `Notification` |
| attempt_number | Int | Y | |
| attempted_at | Instant | Y | |
| outcome | Enum | Y | SENT, DELIVERED, READ, FAILED, UNKNOWN |
| error_detail | Text | N | |
| provider_ref | Text | N | **[T-04]** |
| message_id | Identifier | N | FK → `Message`; cleared if the message is deleted on request |

### 6.10 Module 9 — Incidents, restrictions and audit

#### `CustomerIncident`

**Deletion:** Never; description is anonymized on request.

| Attribute | Type | Req | Notes |
|---|---|---|---|
| customer_id | Identifier | Y | FK → `Customer` |
| booking_id | Identifier | Y | FK → `Booking` |
| kind | Text | Y | Damage, conduct and similar; never a no-show |
| description | Text | N | |
| recorded_by_membership_id | Identifier | Y | FK → `TenantMembership` |
| occurred_at | Instant | Y | |

#### `CustomerRestriction`

**Unique:** at most one active restriction per customer (`ERD-I13`). **Deletion:** Never while the customer exists; on request it follows `Customer` (TD-02).

| Attribute | Type | Req | Notes |
|---|---|---|---|
| customer_id | Identifier | Y | FK → `Customer` |
| kind | Enum | Y | FULL_PREPAYMENT, BLOCKED; normal service has no row |
| reason | Text | Y | |
| applied_by_membership_id | Identifier | Y | FK → `TenantMembership`; always human |
| effective_from | Instant | Y | |
| effective_to | Instant | N | Empty while active |
| removed_by_membership_id | Identifier | N | FK → `TenantMembership` |
| removal_reason | Text | Cond. | When removed |

#### `AuditEvent`

**Deletion:** Never by ordinary operations; final period under customer deletion is pending (BR-DAT-04).

| Attribute | Type | Req | Notes |
|---|---|---|---|
| action | Text | Y | Listed in BR-AUD-01, plus consent and deletion changes |
| actor_kind | Enum | Y | MEMBER, CUSTOMER, SYSTEM |
| actor_membership_id | Identifier | Cond. | FK → `TenantMembership`, when MEMBER |
| target_type | Text | Y | |
| target_id | Identifier | Y | Polymorphic reference, so `ERD-I01` cannot be enforced as a foreign key; the application must verify that the target belongs to the event's tenant |
| channel | Enum | N | WHATSAPP, CRM, SYSTEM |
| reason | Text | N | |
| occurred_at | Instant | Y | |

## 7. Compatibility checks

These are analytical walkthroughs of the documents, not executed tests; nothing is implemented.

### 7.1 Use cases against entities

Every [UC-02 case](../product-specs/uc-02/use-cases.md) is covered by existing entities. `Tenant`, `TenantMembership` and `AuditEvent` apply to nearly all and are omitted unless central.

| Case | Main entities |
|---|---|
| CU-01 Consult information and availability | `Service`, `Resource`, `ServiceResource`, `AvailabilityCalendar`, `AvailabilityRule`, `AvailabilityException`, `SlotClaim`, `Conversation`, `Message` |
| CU-02 Booking without deposit | `Customer`, `Booking`, `SlotClaim`, `BookingPolicy`, `BookingEvent`, `Charge` |
| CU-03 Booking with transfer deposit | CU-02 plus `ReceivingAccount`, `PaymentReview`, `StoredAsset`, `Payment`, `PaymentAllocation` |
| CU-04 Booking for other attendees | `Booking` (attendee fields), `Customer` |
| CU-05 Join waitlist | `WaitlistEntry`, `Customer` |
| CU-06 Invitation and claim | `ExclusiveOffer`, `WaitlistEntry`, `SlotClaim`, `Booking`, `Notification` |
| CU-07 Consult future bookings | `Booking`, `SlotClaim`, `Customer` |
| CU-08 Cancel | `Booking`, `SlotClaim`, `BookingEvent`, `Notification` |
| CU-09 Reschedule | `BookingChangeRequest`, `Booking`, `SlotClaim`, `BookingEvent`, `Charge`, `PaymentReview` |
| CU-10 Complete or no-show | `Booking`, `BookingEvent`, `SlotClaim` |
| CU-11 Record, verify or correct payment | `Payment`, `PaymentReview`, `PaymentAllocation`, `Charge`, `Refund`, `CashMovement` |
| CU-12 Incidents and restrictions | `CustomerIncident`, `CustomerRestriction`, `Customer`, `Booking` |
| CU-13 Cash register | `CashSession`, `CashMovement`, `CashAdjustment` |
| CU-14 Takeover | `Conversation`, `Message`, `Tenant` |
| CU-15 Configure operations | `Service`, `Resource`, `ServiceResource`, `AvailabilityCalendar`, `AvailabilityRule`, `AvailabilityException`, `BookingPolicy`, `ReceivingAccount`, `Role`, `RolePermission`, `Tenant` |
| CU-16 Send notice | `Notification`, `NotificationAttempt`, `Message`, `Customer` |
| CU-17 Sign in | `User`, `TenantMembership`, `Role`, `Permission`, `RolePermission` |
| CU-18 Connect WhatsApp | `ChannelConnection` |
| CU-19 Notice preferences | `Customer`, `WaitlistEntry`, `AuditEvent` |
| CU-20 Onboard a business | `Tenant`, `Role`, `User`, `TenantMembership`, `AvailabilityCalendar`, `BookingPolicy` |
| CU-21 Agenda | `Booking`, `SlotClaim`, `Resource`, `PaymentReview` |
| CU-22 Expire HOLD | `Booking`, `SlotClaim`, `Payment`, `Notification` |
| CU-23 Request data deletion | `Customer`, `Conversation`, `Message`, `StoredAsset`, `Notification`, `AuditEvent` |

### 7.2 Both verticals on the same model

The same entities serve both verticals; differences are configuration values, with no vertical-specific entity.

| Need | Barbershop or beauty | Court or club |
|---|---|---|
| Exclusive capacity | `Resource` kind PROFESSIONAL, one per barber | `Resource` kind PHYSICAL, one per court |
| What is booked | `Service`: cut, color, a preconfigured combination | `Service`: one-hour rental, two-hour rental |
| Compatibility | `ServiceResource`: which barber does which service | `ServiceResource`: which court fits which sport |
| “Any” resource | `Tenant.resource_assignment_mode`, order or rotation | Same field |
| Schedule | Resource calendar for each barber, inheriting the tenant's | Often the tenant calendar alone; a resource calendar when a court differs |
| Blocks | `AvailabilityException`: absence | `AvailabilityException`: maintenance |
| Third parties | `Booking.attendee_name`: someone booking for a relative | Same field, usually for a player |
| Where money goes | `Tenant.collection_mode` ALL_PROFESSIONAL, `Resource.receiving_account_id` | ALL_BUSINESS, with default or rotating `ReceivingAccount` |
| Early finish | `SlotClaim` PRIVATE_REMAINDER, reusable for a walk-in | Same mechanism |

**Not modeled, per the MVP:** atomic multi-resource bookings, recurring bookings, group capacity and product sales.

### 7.3 Pending architectural validation

The items needing validation are in the [technical register](#technical-review-register) (T-01 to T-05) and marked in §6. Product and legal questions are in [UC-03 §16](../product-specs/uc-03/business-rules.md#16-pending-decisions). None adds an entity to this proposal so far.

The team's tenant-isolation review left two questions that do not block this proposal: who may disable a global `User` without leaving a tenant with no Admin, and how technical-operator actions are attributed in `AuditEvent`, which depends on the open question in CU-20. DOM-02 tracks them as `TEN-Q1` and `TEN-Q2`.

## 8. DOM-01 completion checklist

- [x] 38 candidate entities inventoried.
- [x] Relationships across nine modules documented.
- [x] Relevant cross-cutting invariants documented.
- [x] Modeling decisions explicitly separated from team approval.
- [x] Attributes, conceptual types and identifiers specified for every entity (§6).
- [x] Primary keys, foreign keys, optionality, uniqueness and delete rules specified logically (§6).
- [x] Compatibility with use cases and both verticals checked analytically (§7).
- [x] Observations from the [team's tenant-isolation review](https://github.com/nanonoir/Agendoxa/pull/26#issuecomment-6664473184) applied. That review covers isolation and portability only and is not approval.
- [ ] Items marked T-01 to T-05 architecturally validated.
- [ ] Team approval recorded.

**Exit criterion:** This file is a reviewable logical ERD proposal. It does not authorize creating tables, migrations or endpoints until the team approves it and the marked items are validated.
