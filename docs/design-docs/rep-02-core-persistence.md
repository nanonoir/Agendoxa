# REP-02 — First persistence increment

**Status:** first increment merged into `develop` in [PR #29](https://github.com/nanonoir/Agendoxa/pull/29); [Issue #15](https://github.com/nanonoir/Agendoxa/issues/15) was manually closed. Neither event ratifies the remaining ERD decisions.

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

### Transactional guards

`0004_review-transactional-guards.sql` adds two checks at transaction completion, with direct PostgreSQL integration tests:

- **Last active Admin.** Deactivating, deleting or reassigning an active ADMIN membership requires an active membership in the same ADMIN role to remain in that tenant. A replacement in the same transaction satisfies the check. The ADMIN role preserves its ID, tenant and system key and is protected from deletion. The guard covers loss of an established ADMIN membership. Creating the tenant and its initial dedicated ADMIN role and membership is part of onboarding in [#30](https://github.com/nanonoir/Agendoxa/issues/30).
- **Released booking.** A booking in CANCELLED or EXPIRED must have zero ACTIVE claims at commit. The check runs on status changes and insertion of active occupancy. Closing claims and changing status can occur in one transaction, with closed history retained. The migration checks for conflicting existing claims and aborts the upgrade if any exist.

The membership check writes the tenant guard row, and active claim insertion writes the same booking row used for status updates. Both writes preserve updated_at. In READ COMMITTED the check sees the result of the preceding writer. In REPEATABLE READ a stale writer aborts with a serialization failure. Integration tests cover both isolation levels. Callers must treat a rejected commit as a failed operation and re-evaluate the complete transaction before a retry. [PostgreSQL transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html)

### Application acceptance criteria

| Follow-up | Required behavior and verification |
|---|---|
| Personnel management in [#30](https://github.com/nanonoir/Agendoxa/issues/30) | Create the business, its dedicated ADMIN role and its first active membership atomically. Verify authorized membership changes, concurrent attempts to remove the last two Admins and preservation of actor history and STAFF role identity. A flow that promotes an existing custom role to ADMIN would need to coordinate with membership changes during initialization. Resolve global User disabling with Product under [TEN-Q1](./tenancy.md#10-open-questions) before exposing it. |
| Service/resource compatibility in [#31](https://github.com/nanonoir/Agendoxa/issues/31), ERD-I04 | Validate the same-tenant ServiceResource association when acquiring or replacing occupancy or changing a booking's service. Agree on retiring links used by existing bookings and share a locking protocol between catalog and booking writes. Test rejection of an unlinked same-tenant resource and a concurrent association removal. Preserve closed-claim history. |
| Booking transitions in [#31](https://github.com/nanonoir/Agendoxa/issues/31), T-01 and INV-RES-04 | Recheck the current state and write Booking, claim changes and BookingEvent in one transaction. Verify rollback, competing writes and the private remainder cases below. Apply payment-dependent transitions once the required financial records are available. |

Email uniqueness currently distinguishes case; normalization and matching must be decided with authentication before that flow is exposed. Additional FK/query indexes and a HOLD-expiry index will be selected with the first repository/worker queries and their access patterns; neither email normalization nor a worker is introduced by this follow-up.

## T-01: occupancy subset

SlotClaim is the only resource/time occupancy record. This increment has BOOKING and PRIVATE_REMAINDER claims, each owned by a same-tenant Booking. An exclusion constraint protects half-open [start, end) intervals for ACTIVE claims of both kinds. A partial unique index permits at most one ACTIVE BOOKING claim per booking while allowing several non-overlapping private remainder fragments.

An early-terminal booking may retain its original claim. Explicit reuse closes that claim and inserts the walk-in claim and private residual fragments in one transaction while preserving the original history. Integration tests exercise this representation, the released-booking checks and rollback on a conflicting replacement. [#31](https://github.com/nanonoir/Agendoxa/issues/31) owns the [allowed transitions](../product-specs/uc-03/invariants.md#21-allowed-transitions), authorization, state-dependent private-remainder validation and CRM reuse. Waitlist arbitration and its XOR ownership rule remain with ExclusiveOffer under T-01.

## T-05: calendar and policy subset

- AvailabilityCalendar has scope TENANT or RESOURCE. A CHECK requires no target for TENANT and exactly one same-tenant resource for RESOURCE. Separate partial unique indexes enforce one tenant calendar and at most one calendar per resource.
- BookingPolicy has scope TENANT, SERVICE or RESOURCE, with exactly the matching target. Separate partial unique indexes enforce one policy per scope target, including the null-target tenant case.
- Null policy fields inherit. DISABLED is an explicit deposit-mode value distinct from null; zero notice is an explicit value. Tenant-only booking lead and future-booking limit cannot be overridden by a service/resource policy.
- Each amount/duration/range is checked independently of the frontend. Policy resolution and booking snapshots belong to future use cases.

Other T-05 fields remain with their deferred capabilities; this increment does not claim to close T-05 globally.

## TEN-Q5: RLS evaluation

The proposed first read strategy in [REP-03 #16](https://github.com/nanonoir/Agendoxa/issues/16) is mandatory tenant scoping in the reference use case and repository. Resolve context through the entry point defined in TEN-DM-07, such as an authenticated active CRM membership or the server-resolved tenant for a public catalog. Pass that validated context to the adapter and scope reads and joins by tenant_id. Reject a missing context and exercise the supported routes with two tenants, alternating A and B on reused connections. For protected lookups, a foreign-tenant identifier must return not_found. Include reuse after rollback in the connection tests.

The current PostgreSQL safeguards cover tenant-aware references. RLS adoption remains under TEN-Q5 for team review with that first use case. A policy implementation requires a non-owner runtime role without BYPASSRLS, transaction-local context on the checked-out client and a separate migration role. Sign-in, webhook resolution, onboarding and worker recovery need explicit restricted paths for their initial lookups. Queue tables retain their own operational access. Exercise the read tests with the runtime role before treating RLS as an active safeguard.

## Validation and remaining work

The increment must demonstrate migration from an empty database, idempotent migration/seed commands, same-tenant references (including Tenant.resource_rotation_cursor), per-scope uniqueness, rejection of overlapping concurrent claims, acceptance of adjacent intervals, preservation of closed claims/events, and NestJS pool disposal. The existing /health contract stays a liveness check independent of database readiness.

Deferred tables are listed in the explicit schema boundaries above and are introduced with the feature work that needs them. REP-03 also depends on CON-01/CON-02; this increment does not mark those dependencies complete. See the [completed ExecPlan](../exec-plans/completed/rep-02-core-persistence.md) for evidence and follow-up links.
