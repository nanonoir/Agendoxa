# REP-02 — First persistence increment

**Status:** implementation proposal for review; references [Issue #15](https://github.com/nanonoir/Agendoxa/issues/15). This increment does not close the whole issue or ratify the remaining ERD decisions.

## Scope

Implement PostgreSQL, Docker Compose, Drizzle/node-postgres, migrations, development seed, a NestJS connection provider and integration tests. The first schema contains these 17 logical entities from [DOM-01](./erd.md):

| Area | Entities |
|---|---|
| Identity | Tenant, User, TenantMembership, Role, Permission, RolePermission |
| Customers | Customer |
| Catalog | Service, Resource, ServiceResource |
| Availability | AvailabilityCalendar, AvailabilityRule, AvailabilityException, BookingPolicy |
| Bookings | Booking, SlotClaim, BookingEvent |

The schema supports CRM/manual reservations and supplies the persistence foundation for REP-03. No booking, authorization, availability-calculation or payment use case is implemented here. Creating a table does not deliver its product workflow.

## Explicit schema boundaries

| Deferred capability | References deliberately absent in this increment |
|---|---|
| Receiving accounts and collection instructions | Tenant.rotation_cursor, Resource.receiving_account_id, Booking deposit/balance instruction account and text fields |
| Waitlist and priority invitations | SlotClaim.offer_id and OFFER_PRIORITY claims; WaitlistEntry and ExclusiveOffer |
| Authorized change requests | BookingChangeRequest; complete reschedule/late-change workflow |
| Payments, refunds and cash | Charge, ReceivingAccount, PaymentReview, Payment, PaymentAllocation, Refund, CashSession, CashMovement, CashAdjustment |
| Messaging and notices | ChannelConnection, Conversation, Message, StoredAsset, Notification, NotificationAttempt |
| Incidents, restrictions and administrative audit | CustomerIncident, CustomerRestriction, AuditEvent |

No scalar ID substitutes for an omitted foreign key. Later increments introduce their columns and same-tenant relationships together, with explicit backfill/validation where existing data requires it. Additive evolution is the goal, not a promise that future migrations need no data transformation. No application may expose a deferred workflow based on this schema alone.

## Physical decisions

- PostgreSQL 18 Alpine for the reproducible local service; bind its configurable host port to loopback. Development and integration databases are separate.
- UUID v4 via PostgreSQL's built-in gen_random_uuid(), with composite primary keys for RolePermission and ServiceResource. UUIDs remain independent of the installation (TEN-DM-04).
- Snake-case plural table names, explicit constraints and same-tenant composite foreign keys. User and Permission remain installation-global; Tenant is the root.
- timestamptz for instants, time for recurring local times, integer minutes, numeric(12,2) for money. Drizzle represents decimals as strings, avoiding JavaScript floating-point money.
- Deletes are RESTRICT by default. Booking events and occupancy history are append-only; closing an occupancy claim preserves its owner, interval and resource.
- One bounded node-postgres pool per Nest application instance, managed through DI and closed on shutdown. Queues/checkpointers are not coupled to this pool.

## Row checks and application obligations

The review follow-up adds `0003_review-invariants.sql` without changing the published migrations. It enforces these row-local checks on inserts and updates:

- `roles_system_active`: ADMIN and STAFF roles must stay active; custom roles may be deactivated. The existing ADMIN protection check remains in force.
- `bookings_whatsapp_author`: a WHATSAPP booking has no created_by_membership_id. The existing CRM author requirement is preserved; later personnel actions belong in BookingEvent rather than replacing the booking creator.
- `bookings_attendee_phone_e164`: attendee_phone remains optional and, when present, uses the same E.164 representation as Customer.phone. Input normalization belongs to the application.

The following cross-record guarantees are **not enforced by this schema**. They remain required acceptance criteria for the corresponding application use cases; the first tenant-facing mutation must not rely on FK integrity alone.

| Guarantee and owner | Required behavior and verification |
|---|---|
| Service/resource compatibility — booking creation/rescheduling (`ERD-I04` in [DOM-01](./erd.md)) | Validate the same-tenant ServiceResource association when acquiring or replacing occupancy and when changing the booking's service. Coordinate concurrent booking/catalog mutations so an incompatible assignment cannot be accepted. Test an existing resource in the same tenant that is not linked to the chosen service, plus a concurrent compatibility change. Preserve closed-claim history when the catalog evolves; historical claims must not be rewritten to match the current catalog. |
| Last active Admin — personnel management ([BR-IAM-02](../product-specs/uc-03/business-rules.md#3-personnel-roles-and-privileges-iam)) | Reject deactivation, removal or demotion of the last active ADMIN membership. All relevant writers must serialize the check and mutation per tenant, for example by locking the tenant row in the same transaction; an uncoordinated COUNT followed by UPDATE is insufficient. Test each removal path and two concurrent operations against the last two Admins, requiring at least one to remain active. |
| System-role lifecycle — role administration (DOM-01 / BR-IAM-02) | Preserve ADMIN/STAFF identity and reject deletion or clearing/changing their system_key. The active-role CHECK does not enforce those operations. Test unused as well as assigned system roles and preserve historical actor attribution. |

Global User disabling and its interaction with the last Admin remain [TEN-Q1](./tenancy.md#10-open-questions); this increment does not resolve that product decision. State-dependent PRIVATE_REMAINDER validation remains assigned to the reuse use case below. These obligations are explicit deferrals for the partial PR, not completed application safeguards.

Email uniqueness currently distinguishes case; normalization and matching must be decided with authentication before that flow is exposed. Additional FK/query indexes and a HOLD-expiry index will be selected with the first repository/worker queries and their access patterns; neither email normalization nor a worker is introduced by this follow-up.

## T-01: occupancy subset

SlotClaim is the only resource/time occupancy record. This increment has BOOKING and PRIVATE_REMAINDER claims, each owned by a same-tenant Booking. An exclusion constraint protects half-open [start, end) intervals for ACTIVE claims of both kinds. A partial unique index permits at most one ACTIVE BOOKING claim per booking while allowing several non-overlapping private remainder fragments.

An early-terminal booking may retain its original claim. Explicit reuse must close that claim and insert the walk-in claim and private residual fragments in one transaction, never rewrite claim history. Integration tests exercise this representation and rollback on a conflicting replacement. Authorization, full state-dependent cross-table checks, public-availability filtering and the CRM reuse use case remain application work. Waitlist arbitration and its XOR ownership rule are deferred with ExclusiveOffer, so T-01 is only partially addressed.

## T-05: calendar and policy subset

- AvailabilityCalendar has scope TENANT or RESOURCE. A CHECK requires no target for TENANT and exactly one same-tenant resource for RESOURCE. Separate partial unique indexes enforce one tenant calendar and at most one calendar per resource.
- BookingPolicy has scope TENANT, SERVICE or RESOURCE, with exactly the matching target. Separate partial unique indexes enforce one policy per scope target, including the null-target tenant case.
- Null policy fields inherit. DISABLED is an explicit deposit-mode value distinct from null; zero notice is an explicit value. Tenant-only booking lead and future-booking limit cannot be overridden by a service/resource policy.
- Each amount/duration/range is checked independently of the frontend. Policy resolution and booking snapshots belong to future use cases.

Other T-05 fields remain with their deferred capabilities; this increment does not claim to close T-05 globally.

## TEN-Q5: RLS evaluation

RLS is not enabled in this increment. Composite keys protect references, not reads. Future repositories and use cases must always require validated tenant context; no tenant-facing data endpoint is added here.

Adopting RLS requires a non-owner application role without BYPASSRLS, transaction-local context on the same checked-out pool client, and explicit onboarding/worker-recovery paths. Neither identity context nor those operational paths exists yet. Enabling policies with an owner connection or session-global context would provide misleading isolation. Revisit RLS with the first tenant-authorized use case, document the selected roles/policies, and test alternating tenants through reused connections before describing RLS as active. This is a proposed deferral for team review, not a decision for the whole MVP.

## Validation and remaining work

The increment must demonstrate migration from an empty database, idempotent migration/seed commands, same-tenant references (including Tenant.resource_rotation_cursor), per-scope uniqueness, rejection of overlapping concurrent claims, acceptance of adjacent intervals, preservation of closed claims/events, and NestJS pool disposal. The existing /health contract stays a liveness check independent of database readiness.

REP-02 remains open until the team agrees its final scope and assigns the deferred persistence increments. REP-03 also depends on CON-01/CON-02; this increment does not mark those dependencies complete. See the [active ExecPlan](../exec-plans/active/rep-02-core-persistence.md) for evidence and progress.
