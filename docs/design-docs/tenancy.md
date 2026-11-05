# DOM-02 — Tenant Isolation, Ownership and Portability

> **Status:** In Review — proposal; **not team-ratified or implemented**.
> **Prepared:** 2026-11-05, on top of the [DOM-01 ERD](./erd.md), itself in review ([PR #26](https://github.com/nanonoir/Agendoxa/pull/26)).
> **Scope:** How data ownership, isolation and future single-tenant moves work on the logical model, for shared and dedicated installations.
> **Out of scope:** RLS, guards and authorization policies as implementation; Drizzle schema and migrations; export/import tooling; moves between servers; dedicated infrastructure setup.
> **Next step:** Team review. The [ERD changes this design needed](#ten-dm-05-uniqueness-has-an-explicit-scope) are already applied in PR #26.

## 1. How to use this document

- **Product rules stay where they are.** [BR-TEN](../product-specs/uc-03/business-rules.md#2-tenants-and-isolation-ten) and [INV-TEN](../product-specs/uc-03/invariants.md#1-tenant-isolation) are canonical; entities and attributes live in the [ERD](./erd.md). This file links them and adds only the design decisions they leave open.
- **Nothing here authorizes persistence code.** REP-02 and REP-03 apply it once the team approves it. Mechanisms named below, such as `pg-boss` or PostgreSQL features, are proposals.
- **Tenant moves stay deferred.** This document keeps a move possible; it builds nothing for it ([X-10](../product-specs/uc-02/use-cases.md#7-excluded-and-deferred-use-cases), [MVP §6.2](../product-specs/mvp.md#62-tenant-isolation-and-future-portability)).
- **Each decision answers the same questions:** what it is, its status, the rule, an example including what happens if it fails, and its references. All `TEN-DM-XX` items are **Proposed**.

## 2. Data scope

### TEN-DM-01: Global means installation-wide

- **What:** The ERD's "global" scope is bounded by one installation, not by the whole product.
- **Rule:** Every record belongs to one of these scopes.

| Scope | Records | Moves with a tenant? |
|---|---|---|
| Installation-global | `User`, `Permission` | Reconciled or matched ([§7](#7-portability)) |
| Tenant root | `Tenant` | Yes |
| Tenant-owned | The 35 remaining entities ([ERD §6.2](./erd.md#62-global-versus-tenant-scope)) | Yes |
| Installation infrastructure, not entities | Domains, webhook endpoints, secrets, Evolution service and instances, storage location, queued jobs, sessions, logs, backups | No |

- **Example:** A person who works in a shared installation and in a dedicated one has two `User` rows and two credentials. There is no identity shared between installations.
- **Reference:** [ERD §6.2](./erd.md#62-global-versus-tenant-scope), [architecture §8.1](./target-architecture.md#81-deployment-modes).

## 3. Ownership and integrity

### TEN-DM-02: Same-tenant references are enforced by the database

- **What:** Applies [BR-TEN-03](../product-specs/uc-03/business-rules.md#2-tenants-and-isolation-ten) and the [ERD's tenant-aware foreign keys](./erd.md#61-shared-conventions).
- **Rule:** Each tenant-owned record has a required, immutable `tenant_id`. A reference between tenant-owned records includes `tenant_id` on both sides, so each parent also needs a unique (`tenant_id`, `id`). A record never changes tenant.
- **Root references:** `Tenant.rotation_cursor` and `Tenant.resource_rotation_cursor` follow the same rule, with `Tenant.id` playing the part of `tenant_id`, as [ERD §6.1](./erd.md#61-shared-conventions) states.
- **Example:** A booking that combines tenant A's service with tenant B's resource claim is rejected even if a use case skips its validation ([EJ-02](../product-specs/uc-03/invariants.md#1-tenant-isolation)). If tenant A's rotation cursor points to tenant B's account, the write fails instead of issuing payment instructions for the wrong business.
- **Implementation note for REP-02:** `NotificationAttempt.message_id` is cleared when a message is deleted on request. A plain `SET NULL` on a composite foreign key would also try to clear `tenant_id`, so it must target that column only or be an explicit update.
- **Reference:** [INV-TEN-02](../product-specs/uc-03/invariants.md#1-tenant-isolation), [`ERD-I01`](./erd.md#3-cross-cutting-invariants).

### TEN-DM-03: References outside tenant-aware foreign keys are listed and guarded

- **What:** A tenant-aware foreign key cannot protect every reference. These are all the cases found in [ERD §6](./erd.md#6-logical-specification-by-entity).
- **Rule:**

| Reference | Why it is an exception | Guard |
|---|---|---|
| `TenantMembership.user_id` → `User` | Target is global | Plain foreign key; membership is the only path from a tenant to a person |
| `RolePermission.permission_id` → `Permission` | Target is global | Plain foreign key; delegable check from the ERD |
| `AuditEvent.target_id` | Polymorphic, not a foreign key | The application writes it only from the validated context; a negative test covers it |

  Actor references always use `TenantMembership`, never `User`, so history never reaches across tenants.

- **Example:** An audit event in tenant A that names a booking of tenant B is a defect, and no constraint would catch it. That is why [§9](#9-future-verification) includes a specific test.
- **Reference:** [ERD §6.10](./erd.md#610-module-9--incidents-restrictions-and-audit), [INV-TEN-04](../product-specs/uc-03/invariants.md#1-tenant-isolation).

### TEN-DM-04: Identifiers are UUIDs, not derived from the installation

- **What:** Details the ERD's `Identifier` type, a UUID by default, following [BR-TEN-06](../product-specs/uc-03/business-rules.md#2-tenants-and-isolation-ten).
- **Rule:** Primary keys are UUIDs that do not depend on a sequence or installation. They carry no meaning and are kept when a tenant moves. The UUID version is chosen in REP-02. Natural values (`slug`, `email`, `phone`, `key`) are never used as foreign keys.
- **Alternatives:** Sequences would collide between installations and force every reference to be rewritten on a move. A per-tenant prefix would add meaning without adding protection.
- **Example:** A booking keeps its ID in a dedicated installation, so its links and any `dedupe_key` built from it remain valid. If a UUID ever collided at the destination, the import fails rather than overwriting.
- **Reference:** [ERD §6.1](./erd.md#61-shared-conventions), [architecture §8.3](./target-architecture.md#83-portability-preparation).

### TEN-DM-05: Uniqueness has an explicit scope

- **What:** A constraint that is wider than the tenant can leak or block across businesses; one that is narrower can leave tenant resolution ambiguous.
- **Rule:**

| Scope | Values | In the ERD |
|---|---|---|
| Installation | `Tenant.slug`, `User.email`, `Permission.key` | Yes |
| Installation, among enabled connections | `ChannelConnection.phone_number`, (`provider`, `provider_instance_ref`) | Yes, since PR #26 |
| Tenant | `Notification.dedupe_key` | Yes, since PR #26 |
| Tenant | `Payment.idempotency_key`, `Refund.idempotency_key`, when present | Yes, since PR #26 |
| Parent record, already inside a tenant | `Message.provider_message_id`, `Conversation.sender_id`, and the other constraints in the ERD | Yes |

- **ERD changes:** The rows marked "since PR #26", the [root references](#ten-dm-02-same-tenant-references-are-enforced-by-the-database), the [identifier type](#ten-dm-04-identifiers-are-uuids-not-derived-from-the-installation) and the meaning of ["global"](#ten-dm-01-global-means-installation-wide) came from the [tenant-isolation review of PR #26](https://github.com/nanonoir/Agendoxa/pull/26#issuecomment-6664473184) and are applied there. The ERD remains their only source.
- **Comparison limit:** `PaymentReview.evidence_fingerprint` is compared only inside its tenant. A receipt seen in one business says nothing about another.
- **Example:** If two tenants could enable the same number, an incoming message would match two connections and the requester could act on the wrong business. With this rule the second connection is rejected ([CU-18 A4](../product-specs/uc-02/use-cases.md#cu-18), still a proposal) and the first keeps working.
- **Reference:** [BR-TEN-02](../product-specs/uc-03/business-rules.md#2-tenants-and-isolation-ten), [T-02 to T-05](./erd.md#technical-review-register).

## 4. Users and memberships

### TEN-DM-06: A person is global; everything they can do is per tenant

- **What:** Details [BR-TEN-07](../product-specs/uc-03/business-rules.md#2-tenants-and-isolation-ten) and [BR-IAM-01](../product-specs/uc-03/business-rules.md#3-personnel-roles-and-privileges-iam) for people in several businesses.
- **Rule:**
  - `User` holds identity only: email, name, credential reference and status. Roles, permissions and history hang from `TenantMembership`.
  - A tenant Admin acts on the membership in their tenant, never on the global `User`, and cannot change another business's access.
  - Personnel of a tenant see no information about a person's other memberships.
  - Adding someone by email does not reveal whether the account already exists, in line with [CU-17 A1](../product-specs/uc-02/use-cases.md#cu-17).
  - Authorization reads the active membership on each request. Choosing another business re-establishes the context; it never carries the previous role over.
- **Example:** A person is Admin of a barbershop and Staff of a club. If the club deactivates that membership, only access to the club ends, past actions keep their attribution ([BR-IAM-06](../product-specs/uc-03/business-rules.md#3-personnel-roles-and-privileges-iam)), and the barbershop role is unchanged.
- **Open:** Who can disable a `User`, given that it affects every tenant ([TEN-Q1](#10-open-questions)).
- **Reference:** [ERD §6.3](./erd.md#63-module-1--identity), [BR-TEN-08](../product-specs/uc-03/business-rules.md#2-tenants-and-isolation-ten).

## 5. Tenant context

### TEN-DM-07: Every entry point has one source of tenant context

- **What:** Applies [BR-TEN-02](../product-specs/uc-03/business-rules.md#2-tenants-and-isolation-ten) and [INV-TEN-03](../product-specs/uc-03/invariants.md#1-tenant-isolation) per entry point.
- **Rule:**

| Entry point | Tenant comes from | Identity comes from |
|---|---|---|
| CRM ([CU-17](../product-specs/uc-02/use-cases.md#cu-17)) | Business selected among the user's active memberships, revalidated on each request | Authenticated `User` and its membership |
| WhatsApp message | The `ChannelConnection` a verified webhook resolves to. An enabled connection prevails; a message that resolves only to one disabled connection is stored there with no AI reply or automatic notices ([BR-NOT-05](../product-specs/uc-03/business-rules.md#14-notifications-and-consent-not)) | Validated sender, inside that tenant |
| AI agent tools | Fixed by the enabled connection; the model does not choose it ([BR-AGT-02](../product-specs/uc-03/business-rules.md#13-ai-agent-agt-and-human-handoff-hnd)) | The conversation's requester |
| Background job | Job payload, checked against the current record ([TEN-DM-08](#ten-dm-08-jobs-carry-and-recheck-their-tenant)) | System |
| Operational tooling | Not a business context: no default access ([ACT-06](../product-specs/uc-01/actors.md#11-human-actors)) | Operator |

  **Allowed lookups before a tenant is known**, each returning the minimum needed:

| Lookup | Key | Returns |
|---|---|---|
| Sign-in | `User.email` | The user and their active memberships |
| Incoming webhook | (`provider`, `provider_instance_ref`) | The connection it resolves to and its tenant: an enabled one, otherwise exactly one disabled one |
| Public routing, if used | `Tenant.slug` | Public display data only; never authorization |
| Permission catalog | `Permission.key` | Global catalog |

  Any other query without a tenant is a defect.

- **Example:** A Staff member of tenant A who requests a booking of tenant B gets `not_found`, so its existence is not confirmed ([EJ-01](../product-specs/uc-03/invariants.md#1-tenant-isolation)). A message that matches no connection, or several disabled ones, resolves no tenant and is not processed. One that matches a single disabled connection is stored in that tenant's CRM inbox, with no AI reply.
- **Reference:** [architecture §8.2](./target-architecture.md#82-tenant-boundary-and-authentication), [EJ-03](../product-specs/uc-03/invariants.md#1-tenant-isolation).

### TEN-DM-08: Jobs carry and recheck their tenant

- **What:** The ERD has no job entity ([DM-15](./erd.md#4-agreed-modeling-proposals-team-ratification-pending)), but [INV-TEN-04](../product-specs/uc-03/invariants.md#1-tenant-isolation) requires jobs to carry their tenant.
- **Rule:** A job payload holds at least `tenant_id` and the target record's ID. The worker loads the record under that tenant and rechecks the current state before acting. A job's data is never the source of truth: pending work can be rebuilt from `Notification.status` and `scheduled_for`, `Booking.hold_expires_at` and `correction_deadline_at`, `ExclusiveOffer.priority_until` and `valid_until`, and `Customer.deletion_due_at`.
- **Example:** A job whose `tenant_id` does not match the record finds nothing, does nothing and is reported as a defect. Waitlist progression timing is still under [T-01](./erd.md#technical-review-register), so that case must be confirmed when T-01 closes.
- **Reference:** [architecture §10.3](./target-architecture.md#103-durable-jobs-and-notifications).

## 6. Isolation mechanisms

### TEN-DM-09: Application and database constraints are required; RLS is evaluated in REP-02

- **What:** The evaluation requested by DOM-02. Each layer stops a different failure.
- **Rule:**

| Mechanism | Stops | Does not stop | Proposal |
|---|---|---|---|
| Validated context in use cases and repositories | Tampered IDs, wrong business | A query that forgets its filter | **Required** |
| Tenant-aware foreign keys and scoped uniqueness | Cross-tenant references and collisions | Cross-tenant **reads** | **Required** |
| PostgreSQL RLS | A forgotten filter on reads and writes | Wrong context set by the application | **Evaluate in REP-02**, as defense in depth |
| One schema or database per tenant | Most accidental leaks | — | **Rejected** for shared installations; a dedicated installation already gives this separation |

- **What the RLS evaluation must answer:**
  - How the context is set per transaction with the chosen connection pool.
  - Which database role the application uses, since table owners and `BYPASSRLS` roles skip policies unless configured otherwise.
  - How the [allowed lookups](#ten-dm-07-every-entry-point-has-one-source-of-tenant-context) and workers run under it.
  - That queue tables are not covered by tenant policies.
- **Alternatives:** One schema or database per tenant was rejected because it multiplies migrations and operations, and departs from the [same tenant-aware model for every installation](./target-architecture.md#81-deployment-modes).
- **Example:** A repository forgets `tenant_id` in a read. Without RLS, only the [two-tenant negative tests](#9-future-verification) catch it, which is why those tests are required regardless of the RLS outcome. RLS must not be described as active until it is implemented.
- **Reference:** [architecture §8.2](./target-architecture.md#82-tenant-boundary-and-authentication), [MVP §6.2](../product-specs/mvp.md#62-tenant-isolation-and-future-portability).

## 7. Portability

### TEN-DM-10: Each record has a known treatment in a future move

- **What:** Conditions for moving one tenant to another installation without redesigning the model. **This defines no tool or MVP feature.**
- **Rule:** The IDs of tenant records never change. Each entity falls into one of three groups.

| Treatment | Entities |
|---|---|
| **Portable:** copied as is | `Role`, `Customer`, `Service`, `Resource`, `ServiceResource`, `AvailabilityCalendar`, `AvailabilityRule`, `AvailabilityException`, `BookingPolicy`, `Booking`, `SlotClaim`, `BookingChangeRequest`, `BookingEvent`, `WaitlistEntry`, `ExclusiveOffer`, `Charge`, `ReceivingAccount`, `PaymentReview`, `Payment`, `PaymentAllocation`, `Refund`, `CashSession`, `CashMovement`, `CashAdjustment`, `Conversation`, `Message`, `Notification`, `NotificationAttempt`, `CustomerIncident`, `CustomerRestriction`, `AuditEvent` |
| **Reconciled:** copied with specific changes | `Tenant`, `User`, `TenantMembership`, `RolePermission`, `ChannelConnection`, `StoredAsset` |
| **Matched:** never copied | `Permission` |

**Reconciled and matched records:**

| Record | Treatment |
|---|---|
| `Tenant` | Keeps its ID. `slug` may already be taken at the destination, which needs a human decision. Cursors are set after the rows they reference exist. |
| `User` | Only people with a membership in the moved tenant. Matched by `email` at the destination, never merged silently. `credential_ref` does not travel: each person re-establishes access. Other memberships are not exported. |
| `TenantMembership` | `user_id` is rewritten when the person already exists at the destination. It is the only reference to rewrite. |
| `Permission`, `RolePermission` | The destination has its own catalog. `permission_id` is resolved through `Permission.key`. An unknown key stops the import. |
| `ChannelConnection` | Same row, to keep [one continuous thread](./erd.md#27-module-6--whatsapp-conversations-and-messages). It arrives disabled, without `provider_instance_ref` or `credential_ref` values from the source, and is reconnected through [CU-18](../product-specs/uc-02/use-cases.md#cu-18). |
| `StoredAsset` | Bytes are copied and `storage_key` is rewritten, so it must stay relative to the installation's storage. Rows with `deleted_at` have no bytes to copy. |

**Data that needs care even when portable:**

| Data | Rule |
|---|---|
| `Message.provider_message_id`, `NotificationAttempt.provider_ref` | Kept as history; valid for deduplication or status recovery only if the provider instance is the same. |
| Pending jobs | Not copied. Rebuilt from record state ([TEN-DM-08](#ten-dm-08-jobs-carry-and-recheck-their-tenant)). |
| In-flight deadlines | Unchanged. A deadline that passes during the move is handled by the normal recheck; priority is [not extended by outages](./target-architecture.md#103-durable-jobs-and-notifications). |
| Customer deletion ([UC-03 §18](../product-specs/uc-03/business-rules.md#18-personal-data-and-retention-dat)) | The export uses current data, never an older backup, so executed deletions cannot return. `deletion_status` and `deletion_due_at` travel, and a pending deletion stays on its date. |

**Import order** ([ERD §6](./erd.md#6-logical-specification-by-entity) foreign keys; each level needs only earlier ones):

| Level | Entities |
|---|---|
| 0 | `Tenant` (cursors empty), `User`, `Permission` |
| 1 | `Role`, `Customer`, `Service`, `ReceivingAccount`, `ChannelConnection`, `StoredAsset` |
| 2 | `TenantMembership`, `RolePermission`, `Resource` |
| 3 | `ServiceResource`, `AvailabilityCalendar`, `BookingPolicy`, `Booking`, `WaitlistEntry`, `CashSession`, `Conversation`, `CustomerRestriction`, `AuditEvent` |
| 4 | `AvailabilityRule`, `AvailabilityException`, `BookingChangeRequest`, `BookingEvent`, `ExclusiveOffer`, `Message`, `CustomerIncident` |
| 5 | `SlotClaim`, `Charge`, `PaymentReview`, `Notification` |
| 6 | `Payment`, `NotificationAttempt` |
| 7 | `PaymentAllocation`, `Refund` |
| 8 | `CashMovement` |
| 9 | `CashAdjustment`, then the `Tenant` cursors |

The only cycle is the `Tenant` cursors, solved by setting them last. `Payment.corrects_payment_id` and `CashSession.previous_session_id` point to their own entity, so those rows go in chain order. `AuditEvent.target_id` imposes no order.

- **Example:** See the [walkthrough](#8-shared-and-dedicated-installations). If any step fails, the import is discarded as a whole and the tenant continues at the source.
- **Reference:** [architecture §8.3](./target-architecture.md#83-portability-preparation), [BR-TEN-05](../product-specs/uc-03/business-rules.md#2-tenants-and-isolation-ten), [BR-TEN-06](../product-specs/uc-03/business-rules.md#2-tenants-and-isolation-ten).

## 8. Shared and dedicated installations

### TEN-DM-11: A dedicated installation uses the same model

- **What:** Applies [architecture §8.1](./target-architecture.md#81-deployment-modes) to this design.
- **Rule:** A dedicated installation keeps `tenant_id`, memberships, tenant context and every constraint. It has no special code path. Uniqueness across an installation cannot be enforced between installations, so a WhatsApp number must be disabled at the source before it is enabled at the destination.
- **Example, on paper, moving tenant Y from a shared to a dedicated installation:**
  1. Confirm authorization and the source's fate ([TEN-Q3](#10-open-questions)), and that both installations run a compatible version.
  2. Stop tenant Y's activity at the source ([TEN-Q4](#10-open-questions)) and disable its WhatsApp connection. A disabled connection still stores incoming messages ([BR-NOT-05](../product-specs/uc-03/business-rules.md#14-notifications-and-consent-not)), so the provider instance must also stop delivering to the source.
  3. Copy tenant Y's records and asset bytes, following the [treatments and order](#ten-dm-10-each-record-has-a-known-treatment-in-a-future-move).
  4. Verify counts, references and that every record has tenant Y's `tenant_id`.
  5. Rebuild pending jobs, reconnect WhatsApp and have personnel re-establish access.
  6. **If it fails:** discard the destination and resume at the source. Enabling the destination is the point of no return.
- **Reference:** [MVP §6.2](../product-specs/mvp.md#62-tenant-isolation-and-future-portability), [CU-20 A2](../product-specs/uc-02/use-cases.md#cu-20).

## 9. Future verification

None of these checks exists yet. They are inputs for REP-02 and REP-03, using the [two seeded tenants the MVP requires](../product-specs/mvp.md#10-repository-development-and-deployment).

| Check | Expected result | Source |
|---|---|---|
| Read another tenant's booking by ID | `not_found`, no data | EJ-01 |
| Insert a booking with another tenant's service or resource | Rejected by the database | EJ-02, TEN-DM-02 |
| Same phone as a customer in two tenants | Independent records and history | EJ-03 |
| Point a `Tenant` cursor at another tenant's record | Rejected by the database | TEN-DM-02 |
| Write an `AuditEvent` naming another tenant's record | Rejected by the application | TEN-DM-03 |
| Enable the same number in a second tenant | Rejected; the first keeps working | TEN-DM-05 |
| Message whose only matching connection is disabled | Stored in that tenant's inbox; no AI reply or notices | TEN-DM-07, BR-NOT-05 |
| Message matching no connection, or several disabled ones | Not processed | TEN-DM-07 |
| Same `dedupe_key` in two tenants | Both accepted | TEN-DM-05 |
| Person with two memberships switches business | Only the new role applies; no data from the other tenant | TEN-DM-06 |
| Job with a mismatched `tenant_id` | No effect; reported | TEN-DM-08 |
| Export of one tenant, as a query | No other tenant's `tenant_id`; only its members as `User` rows | TEN-DM-10 |

## 10. Open questions

These are flagged, not resolved here.

| ID | Question | Why it matters | Owner | Blocks |
|---|---|---|---|---|
| `TEN-Q1` | Who can disable a global `User`, and what happens if that person is a tenant's last active Admin? | [BR-IAM-02](../product-specs/uc-03/business-rules.md#3-personnel-roles-and-privileges-iam) protects the last Admin, and the ERD applies that to the membership only. Disabling a `User` could leave a business without an Admin. | Product | User administration |
| `TEN-Q2` | How are technical operator actions recorded? | [CU-20](../product-specs/uc-02/use-cases.md#cu-20) proposes the operator as an actor (its actor is still pending), and `AuditEvent.actor_kind` has no such value. | Team | Onboarding audit |
| `TEN-Q3` | Who authorizes a move, and what happens to the source's data afterward? | The operator has [no default business authorization](../product-specs/uc-01/actors.md#11-human-actors), the export holds personal and financial data, and financial records have [retention duties](../product-specs/uc-03/business-rules.md#18-personal-data-and-retention-dat). Needs the legal validation in P-32. | Product and legal | Any real move, not the MVP |
| `TEN-Q4` | How is a tenant frozen during a move? | `Tenant` has no status attribute. Adding one later is compatible with this model, so it is not requested now. | Team | Any real move, not the MVP |
| `TEN-Q5` | Is RLS adopted? | See [TEN-DM-09](#ten-dm-09-application-and-database-constraints-are-required-rls-is-evaluated-in-rep-02). | REP-02 | Nothing in DOM-02 |

`TEN-Q1` and `TEN-Q2` are also listed in [ERD §7.3](./erd.md#73-pending-architectural-validation) as not blocking the ERD.

## 11. Traceability

**[DOM-02 (#7)](https://github.com/nanonoir/Agendoxa/issues/7)**

| Criterion | Where |
|---|---|
| Global and tenant-owned entities identified | §2 |
| Ownership and isolation rules documented | §3, §5, §6 |
| User and membership model defined | §4 |
| Strategy to prevent cross-tenant references | §3 |
| Identifiers compatible with future moves | TEN-DM-04 |
| Dependencies and external references identified | TEN-DM-03, §7 |
| Compatible with multi-tenant and single-tenant installations | §8 |
| ERD reviewed and adjusted as needed | TEN-DM-05: changes applied in PR #26 |
| Reviewed and approved by the team | **Pending** |

**[EPIC-02 (#5)](https://github.com/nanonoir/Agendoxa/issues/5), tenancy criteria**

| Criterion | Where |
|---|---|
| Tenant data isolation considered | §3, §5, §6 |
| Users with several memberships supported conceptually | §4 |
| Prepared to export data per tenant | §7 |

The remaining EPIC-02 criteria are covered by the [DOM-01 ERD](./erd.md#8-dom-01-completion-checklist). The Issues name `docs/domain/`; this file follows the [design catalog](./index.md), as DOM-01 did.
