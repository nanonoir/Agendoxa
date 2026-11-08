# CON-01 — Module Boundaries and Dependencies

> **Status:** In Review — proposal; **not team-ratified or implemented**.
> **Prepared:** 2026-11-08, on top of the [DOM-01 ERD](./erd.md), [DOM-02 tenancy](./tenancy.md), [UC-03 rules](../product-specs/uc-03/business-rules.md) and [invariants](../product-specs/uc-03/invariants.md), and the [architecture proposal](./target-architecture.md) v1.2.
> **Scope:** The functional modules of the NestJS modular monolith: responsibilities, data and operation ownership, allowed and prohibited dependencies, communication between modules, internal hexagonal structure, and the integration points that CON-02 and CON-03 must specify.
> **Out of scope:** NestJS modules, endpoints, services or repositories as code; detailed API contracts ([CON-02 #11](https://github.com/nanonoir/Agendoxa/issues/11)); provider contracts ([CON-03 #12](https://github.com/nanonoir/Agendoxa/issues/12)); microservices or distributed infrastructure.
> **Next step:** Team review. Decisions are `MOD-DM-XX`, all **Proposed**; open questions are `MOD-Q-XX` in [§10](#10-decisions-and-open-questions).

## 1. How to use this document

- **Sources keep their roles.** Business rules and guarantees stay in [UC-03](../product-specs/uc-03/business-rules.md); entities and attributes in the [ERD](./erd.md); tenant context in [DOM-02](./tenancy.md). This file assigns them to modules and adds only the structural decisions they leave open. If it disagrees with them, they win and this file is corrected.
- **It extends the architecture proposal.** The capability table ([§6.1](./target-architecture.md#61-business-capability-boundaries)), layer rules ([§6.2–§6.3](./target-architecture.md#62-example-internal-structure-for-a-rule-heavy-module)) and reviewable dependency rules ([§13.1](./target-architecture.md#131-reviewable-dependency-rules)) are linked, not repeated.
- **Nothing here is implemented.** Today `apps/api` has `AppController` (`GET /health`) and `DatabaseModule`, and `packages/database` holds 17 of the 38 entities ([REP-02](./rep-02-core-persistence.md)). The structure in [§7](#7-internal-structure-and-hexagonal-separation) applies when the first business module is created, for example in [REP-03 #16](https://github.com/nanonoir/Agendoxa/issues/16), [#30](https://github.com/nanonoir/Agendoxa/issues/30) or [#31](https://github.com/nanonoir/Agendoxa/issues/31).
- **Terms used below:**

| Term | Meaning |
|---|---|
| Module | One NestJS module under `apps/api/src/modules/<module>/` that owns a business capability |
| Owner | The only module that may change a record, and the only one whose persistence adapter reads or writes its tables |
| Public API | What a module exports to other modules from its `index.ts`: use-case facades, query functions, contract types, events and the ports others implement |
| Platform code | Cross-cutting technical support with no business rules: tenant and actor context, transactions, event dispatch, error categories, clock, database connection |

## 2. Module catalog

### MOD-DM-01: Twelve business modules and two platform modules

- **What:** The final module list after evaluating the ticket's initial ten.
- **Rule:** Each module below owns the responsibilities listed and nothing else. "Must not" repeats only the boundary that is easiest to break.

| Module | Responsibility | Must not | Rules |
|---|---|---|---|
| `tenants` | Business profile (name, slug, timezone, currency, branding), the `Tenant` row and typed access to the settings stored on it ([MOD-DM-06](#mod-dm-06-shared-rows-have-one-row-owner-and-named-field-owners)); public business information for the landing | Authorize from a slug or tenant ID; interpret settings that another module owns | BR-TEN |
| `identity` | Personnel sign-in, global `User`, memberships, tenant roles, role permissions and the permission catalog; effective-permission checks; last-Admin protection | Grant permissions directly to memberships; give customers CRM access; decide the business rule behind a permission | BR-IAM |
| `customers` | Tenant-local customers (requesters), notice preferences and their consent changes, deletion requests, incidents and restrictions | Count no-shows from incidents; merge customers by name; expose internal labels to customers | BR-CLI, BR-NOT-09, BR-DAT |
| `catalog` | Services (including preconfigured combinations), professional and physical resources, service–resource compatibility, booking policies and their per-field resolution ([MOD-DM-03](#mod-dm-03-booking-policies-belong-to-catalog)) | Build vertical-specific engines; decide occupancy | BR-CAT, BR-SEN-02 |
| `availability` | Calendars, recurring hours, blocks and authorized openings; effective open windows per resource in the tenant timezone ([MOD-DM-05](#mod-dm-05-availability-supplies-windows-bookings-finds-free-slots)) | Read or create occupancy; treat a query as a lock | BR-DISP-01–03, 06–08 |
| `bookings` | Booking lifecycle and transitions; occupancy through `SlotClaim`, its single authority ([MOD-DM-04](#mod-dm-04-bookings-owns-all-occupancy)); HOLDs; free-slot search; change requests; outcomes and walk-in reuse; booking history; required-deposit snapshot | Depend on WhatsApp, Next.js or an LLM; record money; send messages itself | BR-RES, BR-CAN, BR-DISP-04/05/09, BR-CLI-10, lifecycle part of BR-SEN |
| `waitlist` | Entries and consent provenance, release rounds, invitations, initial priority, queue limit and claim arbitration | Create claims or HOLDs itself; promise exclusivity to later invitees; ask anyone to transfer | BR-WL |
| `payments` | Charges, receiving accounts and collection modes, payment instructions, evidence review, verified payments, manual allocations, refunds and recording corrections | Credit evidence automatically; mutate an original payment; change booking status directly | BR-COB, financial part of BR-SEN |
| `cash-register` | The tenant's shared register: sessions, physical cash movements and post-close adjustments | Count transfers as cash; rewrite a closed session; sell products | BR-CAJA |
| `notifications` | Logical notices and attempts, scheduling, send-time revalidation, retry and unknown-outcome handling | Duplicate a notice on retry; send without current consent and validity; change booking state | BR-NOT |
| `messaging` | WhatsApp connections, webhook intake, persisted and deduplicated messages, conversations, AI/human control, the global AI switch, outbound sending | Grant business privileges; decide commercial policy | BR-HND, BR-AGT-05, BR-NOT-05, BR-CH-06–07 |
| `agent` | Conversation orchestration, tool schemas that map to other modules' public use cases, escalation summaries | Persist business data except through public use cases; choose the tenant or requester; become a second booking core | BR-AGT |
| `audit` *(platform)* | Appending `AuditEvent` inside the caller's transaction; tenant audit queries | Act as booking history or as a financial ledger | BR-AUD |
| `assets` *(platform)* | `StoredAsset` metadata, private storage and authorized download | Decide on its own whether evidence may be deleted | DM-14, BR-DAT-03 |

- **Reference:** [architecture §6.1](./target-architecture.md#61-business-capability-boundaries), [UC-03 areas](../product-specs/uc-03/business-rules.md#areas), [ERD §1](./erd.md#1-entity-inventory--38-candidates).

### Changes to the ticket's initial list

| Change | Reason |
|---|---|
| `waitlist` added | Its own rules (BR-WL), entities, jobs and concurrency (T-01). The architecture proposal and UC-03 already treat it as a capability; folding it into `bookings` would mix arbitration rounds with the booking lifecycle |
| `cash-register` added | Physical cash has its own lifecycle (open, collect, close, adjust) and permissions (BR-CAJA). Keeping it apart preserves the rule that a verified payment is not the same as cash in the register |
| `payments` keeps its name, with a narrower scope | The ticket describes it as payment signals; in the MVP there is no gateway and every credit is verified by a person (BR-SEN-07, BR-SEN-08). The proposal's `billing` alias is not used |
| `audit` and `assets` are platform modules | Each is used by three or more modules and holds no business rules. Making them business modules would invite rules into them |
| Incidents and restrictions live in `customers` | As in the architecture proposal. The ERD's "Incidents" module is a data grouping, not a capability |
| Not modules | The existing `DatabaseModule` (connection provider), the job scheduler adapter (CON-03), platform code, `packages/shared` and the web features. They support modules; none owns business data |

## 3. Data ownership

### MOD-DM-02: Every entity has one owner; only the owner touches its tables

- **What:** Applies "no module accesses another module's private persistence" to a repository where every table lives in one package.
- **Rule:**
  - Each of the 38 ERD entities has exactly one owner module, listed below.
  - The physical schema and the single migration history stay in `packages/database`. Same-tenant composite foreign keys ([TEN-DM-02](./tenancy.md#ten-dm-02-same-tenant-references-are-enforced-by-the-database)) cross module lines, so splitting the schema per module would lose them.
  - A foreign key is a data reference, not access permission. Only the owner's `adapters/out/persistence` imports its tables from `@agendoxa/database`, including for reads and joins. Other modules use the owner's public API.
  - The owner is the only module that changes a record's state. Another module that needs a change calls the owner's use case.
- **Example:** `payments` needs the booking's required deposit. It calls a `bookings` query; it does not select from `bookings`. If it joined `slot_claims` directly, a change to the private-remainder representation (T-01) would silently break payments.

| Owner | ERD entities | Physical tables today ([REP-02](./rep-02-core-persistence.md)) |
|---|---|---|
| `tenants` | `Tenant` | `tenants` |
| `identity` | `User`, `TenantMembership`, `Role`, `Permission`, `RolePermission` | `users`, `tenant_memberships`, `roles`, `permissions`, `role_permissions` |
| `customers` | `Customer`, `CustomerIncident`, `CustomerRestriction` | `customers`; the others are deferred |
| `catalog` | `Service`, `Resource`, `ServiceResource`, `BookingPolicy` | `services`, `resources`, `service_resources`, `booking_policies` |
| `availability` | `AvailabilityCalendar`, `AvailabilityRule`, `AvailabilityException` | `availability_calendars`, `availability_rules`, `availability_exceptions` |
| `bookings` | `Booking`, `SlotClaim`, `BookingChangeRequest`, `BookingEvent` | `bookings`, `slot_claims`, `booking_events`; change requests are deferred |
| `waitlist` | `WaitlistEntry`, `ExclusiveOffer` | Deferred |
| `payments` | `Charge`, `ReceivingAccount`, `PaymentReview`, `Payment`, `PaymentAllocation`, `Refund` | Deferred |
| `cash-register` | `CashSession`, `CashMovement`, `CashAdjustment` | Deferred |
| `notifications` | `Notification`, `NotificationAttempt` | Deferred |
| `messaging` | `ChannelConnection`, `Conversation`, `Message` | Deferred |
| `agent` | None. Conversation state is in `messaging`; any orchestration checkpoint storage is infrastructure, decided in CON-03 | — |
| `audit` | `AuditEvent` | Deferred |
| `assets` | `StoredAsset` | Deferred |

The 38 entities are each listed once. Derived values have no owner table: the no-show and late-change counts come from `bookings` queries, and the current restriction from `customers` ([ERD §6.4](./erd.md#64-module-2--customers)).

- **Physical grouping is not ownership.** `packages/database/src/schema/` groups tables by ERD area: `Tenant` is in `identity.ts`, and `BookingPolicy` is in `availability.ts`. The table above is authoritative. Moving schema files is not required by this decision; do it only when a change already touches them.
- **Reference:** [ERD §1](./erd.md#1-entity-inventory--38-candidates), [architecture §5](./target-architecture.md#5-monorepo-organization) ("not an excuse for modules to query another module's private tables").

### MOD-DM-03: Booking policies belong to `catalog`

- **What:** `BookingPolicy` resolves each field by resource > service > tenant ([DM-06](./erd.md#4-agreed-modeling-proposals-team-ratification-pending)). The ERD groups it with availability and the schema stores it in `availability.ts`; neither assigns an owner.
- **Rule:** `catalog` owns `BookingPolicy` and exposes one query that returns the effective policy for a service and resource, with inherit, set and disable already resolved. `bookings` snapshots what it needs at booking time (`notice_snapshot`, `required_deposit`, refund policy). `notifications` reads `reminder_lead`; `payments` reads deposit settings only through that query or the booking snapshot.
- **Alternatives:** In `bookings`, which would put configuration CRUD in the busiest module; or in `tenants`, which does not own services and resources.
- **Example:** An Admin sets a 20% deposit on the court service and disables it for one court. `catalog` resolves "disabled" for that court and "20%" for the rest; no other module reimplements the precedence.

### MOD-DM-04: `bookings` owns all occupancy

- **What:** `SlotClaim` is the single occupancy authority ([ERD §2.4](./erd.md#24-module-4--bookings-exclusive-occupancy-and-waitlist)), and its claims are owned by a booking or by an invitation's initial priority.
- **Rule:** `bookings` owns every `SlotClaim`, including the `OFFER_PRIORITY` claims that `waitlist` needs. `waitlist` asks `bookings` to acquire, close or convert a priority claim through public use cases, inside the same transaction as its own changes. No other module inserts, closes or reads claims directly.
- **Example:** A released court slot has three eligible people. `waitlist` asks `bookings` for an initial priority claim for the first one. When someone claims, `waitlist` calls the `bookings` use case that closes the priority claim and creates the booking HOLD atomically (BR-WL-08), then marks its invitation `CLAIMED`.
- **Reference:** INV-DISP-01, INV-WL-01, INV-WL-08, [REP-02 T-01](./rep-02-core-persistence.md#t-01-occupancy-subset).

### MOD-DM-05: `availability` supplies windows; `bookings` finds free slots

- **What:** Avoids a cycle: free slots need both schedules (`availability`) and active claims (`bookings`), and creating a booking needs both too.
- **Rule:** `availability` returns effective open windows for a resource and range: regular hours or inherited tenant hours, plus authorized openings, minus blocks (BR-DISP-01–03, 06). It knows nothing about claims. `bookings` owns the free-slot search: windows from `availability`, compatibility and duration from `catalog`, minus active claims, filtered by lead time and policy. The same check runs again inside the booking transaction (BR-DISP-04).
- **Example:** The agent asks for courts at 19:00. `bookings` gets Court 1's windows, sees an active HOLD at 19:00 and offers 20:00. `availability` never sees the HOLD and never reserves anything.

### MOD-DM-06: Shared rows have one row owner and named field owners

- **What:** Some rows carry settings or references whose meaning belongs to another module. Without a rule, two modules would write the same row.
- **Rule:** The row owner persists the row and its migrations. The field owner defines the meaning and is the only module that changes the value, by calling the row owner's narrow API inside its own transaction. The row owner never interprets those fields.

| Row (owner) | Field | Field owner | Why |
|---|---|---|---|
| `Tenant` (`tenants`) | `collection_mode`, `business_account_selection`, `rotation_cursor` | `payments` | Instruction issue and business-pool rotation (BR-COB-19, BR-SEN-06, T-02) |
| `Tenant` (`tenants`) | `resource_assignment_mode`, `resource_rotation_cursor` | `bookings` | Any-resource selection happens while acquiring the claim (BR-DISP-05, T-01) |
| `Tenant` (`tenants`) | `cash_auto_open` | `cash-register` | Automatic opening on first collection (BR-CAJA-03) |
| `Tenant` (`tenants`) | `ai_enabled`, `ai_disabled_until` | `messaging` | Global AI switch and routing (BR-HND-04) |
| `Resource` (`catalog`) | `receiving_account_id` | `payments` | Professional destination account (DM-11) |
| `Booking` (`bookings`) | `deposit_instruction_*`, `balance_instruction_*`, `collection_mode_snapshot` | `payments` | Issued instructions are frozen when shown (BR-SEN-06, INV-PAY-11) |
| `SlotClaim` (`bookings`) | `offer_id` and `OFFER_PRIORITY` kind | `waitlist` decides; `bookings` writes | Initial priority only ([MOD-DM-04](#mod-dm-04-bookings-owns-all-occupancy)) |

- **Example:** Sequential rotation picks the next business account. `payments` asks `tenants` to read and advance `rotation_cursor` under a row lock inside the instruction transaction; a retry reuses the instruction already stored on the booking and does not rotate again.
- **Open:** Whether these fields should move to tables of their field owners is [MOD-Q-01](#10-decisions-and-open-questions). It changes the ERD, so it is not decided here.

### Who guarantees each invariant area

The [invariants](../product-specs/uc-03/invariants.md) state where each guarantee holds (`DB`, `TX`, `UC`, `JOB`). This table states which module answers for it. Database constraints live in `packages/database`, but the owner of the table is still the one who must keep them.

| Invariant area | Responsible module | Cross-module part |
|---|---|---|
| INV-TEN-01–04 tenant isolation | Every owner for its tables; `identity` and messaging resolve the context | Context resolution per entry point ([TEN-DM-07](./tenancy.md#ten-dm-07-every-entry-point-has-one-source-of-tenant-context)) |
| INV-RES-01–08 lifecycle | `bookings` | Payment facts come from `payments` |
| INV-DISP-01, 02, 06, 07, 09 occupancy and concurrency | `bookings` | Windows from `availability` |
| INV-DISP-04, 08 openings and blocks | `availability` | — |
| INV-DISP-05 compatibility | `bookings` validates, `catalog` owns the links | Locking protocol with catalog changes ([#31](https://github.com/nanonoir/Agendoxa/issues/31)) |
| INV-SEN-01–04, 06–11 HOLDs and deposit-dependent transitions | `bookings` | Verified and allocated amounts from `payments` |
| INV-SEN-05 human verification | `payments` | — |
| INV-PAY-01–12 payments | `payments` | Cash parts with `cash-register` |
| INV-CAN-01–09 cancellation and rescheduling | `bookings` | Reminder suppression with `notifications`; ownership check uses the requester from `messaging` |
| INV-WL-01–13 waitlist | `waitlist` | Claims through `bookings` |
| INV-CLI-01–07 customers | `customers`; counts in `bookings` | INV-CLI-06 also binds `agent` |
| INV-CAJA-01–09 cash | `cash-register` | Collection is started by `payments` |
| INV-MSG-01, 02, 04–07 messaging | `messaging` | — |
| INV-MSG-03 tool context | `agent` | Context supplied by `messaging` |
| INV-NOT-01–08 notices | `notifications` | Validity rechecked by `bookings` and `waitlist` ([§5.3](#53-needs-against-the-direction)) |
| INV-AUD-01–03 audit | `audit` for storage; each caller writes in its own transaction | — |
| INV-AUD-04 roles | `identity` | — |
| INV-DAT-01–04 personal data | `customers` coordinates | Each owner deletes or keeps its own data ([§6.3](#63-events-and-durable-intents)) |

## 4. Operations by module

Each [UC-02 use case](../product-specs/uc-02/use-cases.md) has one module that owns the operation and decides its outcome. Collaborators are called through their public APIs.

| Use case | Owner | Collaborators |
|---|---|---|
| CU-01 Consult information and availability | `bookings` (free slots); `tenants`, `catalog` (information) | `availability`, `catalog` |
| CU-02 Booking without deposit | `bookings` | `customers`, `catalog`, `availability`, `payments` (charge), `notifications`, `audit` |
| CU-03 Booking with transfer deposit | `bookings` (lifecycle); `payments` (instruction, review, allocation) | `assets`, `notifications` |
| CU-04 Booking for other attendees | `bookings` | `customers` |
| CU-05 Join waitlist | `waitlist` | `customers` (consent, restriction), `catalog` |
| CU-06 Invitation and claim | `waitlist` | `bookings` (claims, HOLD), `notifications` |
| CU-07 Consult future bookings | `bookings` | — |
| CU-08 Cancel | `bookings` | `notifications`; `waitlist` reacts to the released slot |
| CU-09 Reschedule | `bookings` | `payments` (coverage, supplemental charge), `catalog`, `availability`, `notifications` |
| CU-10 Complete or no-show | `bookings` | `audit` |
| CU-11 Record, verify or correct payment | `payments` | `bookings` (confirmation), `cash-register`, `audit` |
| CU-12 Incidents and restrictions | `customers` | `audit` |
| CU-13 Cash register | `cash-register` | `audit` |
| CU-14 Takeover | `messaging` | `audit` |
| CU-15 Configure operations | `catalog`, `availability`, `payments` (accounts), `identity` (roles), `tenants` (settings) | Field owners of [MOD-DM-06](#mod-dm-06-shared-rows-have-one-row-owner-and-named-field-owners) |
| CU-16 Send notice | `notifications` | `messaging`, `customers` |
| CU-17 Sign in | `identity` | `tenants` |
| CU-18 Connect WhatsApp | `messaging` | — |
| CU-19 Notice preferences | `customers` | `waitlist` (entry provenance), `audit` |
| CU-20 Onboard a business | `tenants` | `identity`, `availability`, `catalog` ([MOD-Q-02](#10-decisions-and-open-questions)) |
| CU-21 Agenda | `bookings` | `payments` (review status) |
| CU-22 Expire HOLD | `bookings` | `payments` (funds recheck), `notifications`; `waitlist` reacts |
| CU-23 Request data deletion | `customers` | `messaging`, `waitlist`, `notifications`, `payments`, `assets` |

An operation that changes another module's state always does it through that module's use case, inside one transaction when the invariants require it ([§6.2](#62-transactions)).
