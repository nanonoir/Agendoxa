# CON-02 — Initial API Contracts

> **Status:** In Review — proposal; **not team-ratified or implemented**.
> **Prepared:** 2026-11-08, on top of [CON-01 modules](./modules.md) (in review), the [DOM-01 ERD](./erd.md), [DOM-02 tenancy](./tenancy.md), [UC-02 use cases](../product-specs/uc-02/use-cases.md), [UC-03 rules](../product-specs/uc-03/business-rules.md) and [invariants](../product-specs/uc-03/invariants.md), and the [architecture proposal](./target-architecture.md) v1.2.
> **Scope:** HTTP contracts between the Next.js web, the NestJS API and its internal consumers: operations, endpoints and methods, inputs and outputs, validation, errors, authentication and tenant context, data representations, idempotency, pagination and contract evolution.
> **Files:** this document and the [OpenAPI 3.1 specification](./api-contracts.openapi.yaml) it explains.
> **Out of scope:** Controllers, endpoints, business logic, authentication, frontend or provider integrations as code; provider contracts ([CON-03 #12](https://github.com/nanonoir/Agendoxa/issues/12)); contracts for features outside the MVP.
> **Reconciled:** 2026-11-10, with CON-01 as consolidated at `5f31914` (nine functional modules plus `audit` and `assets`, `workflows` coordinators), UC-03 BR-SEN-14–16 and INV-SEN-12–13, and Issues [#11](https://github.com/nanonoir/Agendoxa/issues/11) and [#12](https://github.com/nanonoir/Agendoxa/issues/12) as rewritten on 2026-11-09. Changed sections carry a *Reconciled 2026-11-10* note and are listed in [§16](#16-reconciliation-log).
> **Next step:** Team review. Decisions are `API-DM-XX`, all **Proposed for team review**; open questions are `API-Q-XX` in [§13](#13-decisions-and-open-questions); scope differences with the rewritten Issue are in [§14.1](#141-scope-differences-with-the-rewritten-issue-11).

## 1. How to use this document

- **Two kinds of statement.** Each section separates what the domain documents already decide from what this document proposes:

| Marker | Meaning |
|---|---|
| **Defined** | Comes from UC-02, UC-03, the ERD, DOM-02, CON-01 or the implemented schema, with its source. This document only maps it to HTTP |
| **Proposed** | A contract decision made here, identified as `API-DM-XX`, pending team review |

- **The specification and this document go together.** The [OpenAPI file](./api-contracts.openapi.yaml) holds every path, schema and example; this document explains the conventions and decisions behind them. If they disagree, raise it in review; neither is implemented yet.
- **Endpoints follow CON-01 ownership.** Each endpoint names the module that owns the state it reads or changes ([modules §4](./modules.md#4-operations-by-module)) and invokes either one owner use case or, when the operation spans several owners, the `workflows` coordinator ([API-DM-12](#api-dm-12-each-endpoint-belongs-to-the-module-that-owns-its-operation)). The constraints CON-01 set for CON-02 ([modules §8.1](./modules.md#81-for-con-02-api-contracts)) are applied throughout and checked in [§14](#14-reconciliation-with-sources).
- **Nothing here is implemented.** Today the API has only `GET /health`, a liveness check outside the versioned base path; it stays as it is.

## 2. Scope

### API-DM-01: No public booking; the public API is read-only landing information

> **Reconciled 2026-11-10:** the [Issue](https://github.com/nanonoir/Agendoxa/issues/11), rewritten on 2026-11-09, now excludes web self-service and asks for deliberately public projections of business data, services, location, informational hours and the WhatsApp link. The contradiction recorded here is resolved; the rule is unchanged.

- **What:** The original text of the Issue asked for a public API to create, consult, cancel and reschedule bookings without an account. The product documents exclude it, and the rewritten Issue now agrees.
- **Defined:** WhatsApp is the only customer self-service channel (BR-CH-01). The landing is informational, with no availability calendar, booking form or customer accounts (BR-CH-02, [MVP §5.3](../product-specs/mvp.md#53-explicitly-out-of-scope), [MVP §7.2](../product-specs/mvp.md#72-informational-public-landing)). Public booking is excluded use case X-01 ([UC-02 §7](../product-specs/uc-02/use-cases.md#7-excluded-and-deferred-use-cases)). Public endpoints expose read-only landing information only ([architecture §11](./target-architecture.md#11-internal-api-and-integration-boundaries)). UC-03 already records this Issue as superseded ([UC-03 §17](../product-specs/uc-03/business-rules.md#17-differences-with-earlier-documents)), and CON-01 restricts public endpoints the same way.
- **Rule (Proposed):** The product documents prevail over the Issue text. This contract has **no public booking, consultation, cancellation or rescheduling endpoint**. Customers manage bookings over WhatsApp, through the agent and module facades ([§10](#10-internal-consumers-the-agent)).
- **Public read-only endpoints proposed:**

| Endpoint | Returns | Why it is needed |
|---|---|---|
| `GET /public/businesses/{slug}` | Name, branding, timezone, weekly hours and the WhatsApp link | The landing must show business identity, hours and a WhatsApp call to action (MVP §7.2). `apps/web` may not read the database ([architecture §5](./target-architecture.md#5-monorepo-organization)), so it needs an endpoint |
| `GET /public/businesses/{slug}/services` | Active services with duration and price | The landing lists services (BR-CH-02) |

  No public endpoint returns free slots, resources' occupancy or anything about customers or bookings. The slug only selects the business to display ([TEN-DM-07](./tenancy.md#ten-dm-07-every-entry-point-has-one-source-of-tenant-context)). Location is missing from the data model ([API-Q-01](#13-decisions-and-open-questions)). The weekly hours come from `catalog` and the WhatsApp link from `messaging`; CON-01 §8.1 names only `tenants` information and `catalog` services, so the team should confirm these two projections ([§14.1](#141-scope-differences-with-the-rewritten-issue-11)).
- **Recorded:** [§14](#14-reconciliation-with-sources) marks the former difference with the Issue as resolved. [UC-03 §17](../product-specs/uc-03/business-rules.md#17-differences-with-earlier-documents) still describes the Issue's earlier text; that product document is not edited here.

### API-DM-02: Full contracts for context and five areas; the rest of the CRM is identified

- **What:** The Issue asks for initial contracts for services, resources, hours, internal availability, customers and bookings, while the MVP's CRM also covers payments, cash, conversations, roles, the WhatsApp channel and audit. *Reconciled 2026-11-10: the rewritten Issue also asks for the priority receipt/review, allocation, financial-state and cash operations those flows need, and for typed internal contracts. This increment does not yet cover them; the difference is listed for the team in [§14.1](#141-scope-differences-with-the-rewritten-issue-11) instead of being decided here.*
- **Rule (Proposed):** This increment specifies, with schemas and OpenAPI, the session and tenant context, the business profile, catalog, availability, customers, bookings and the public endpoints. The remaining CRM operations are identified with method, path, owner and use case in [§11.2](#112-next-contract-increment), so that their later contracts keep the same conventions.
- **Coverage of the [UC-02 use cases](../product-specs/uc-02/use-cases.md#3-prioritized-catalog):**

| Use case | Where it is served |
|---|---|
| CU-01, CU-04 to CU-07, CU-19, CU-23 (customer side) | WhatsApp through the agent and module facades; not HTTP ([§10](#10-internal-consumers-the-agent)) |
| CU-02, CU-03 CRM booking, CU-04 CRM | `POST /bookings`; deposit payment and receipt recording in the next increment |
| CU-08, CU-09 | `POST /bookings/{id}/cancel`, `POST /bookings/{id}/reschedule` (CRM) |
| CU-10 | `POST /bookings/{id}/outcome`, `/outcome-correction`, `/remainder-walk-ins` |
| CU-12 | Customer restrictions and incidents |
| CU-15 | Catalog, booking policies, calendars, hours, blocks and openings; roles, accounts and AI in the next increment |
| CU-17 | Session and tenant context |
| CU-21 | `GET /agenda`, `GET /free-slots`, `GET /bookings` |
| CU-11, CU-13, CU-14, CU-18 | Next increment ([§11.2](#112-next-contract-increment)) |
| CU-16, CU-22 | System jobs; no HTTP ([modules §6.6](./modules.md#66-jobs)) |
| CU-20 | Operational tooling, a script or seed in the MVP ([CU-20](../product-specs/uc-02/use-cases.md#cu-20)); no HTTP endpoint is proposed |

## 3. General conventions

### API-DM-03: One versioned base path; reads on resources, transitions as commands

- **Rule (Proposed):**
  - Every endpoint is under `/api/v1`. CRM endpoints are under `/api/v1/tenants/{tenantId}/…`; public ones under `/api/v1/public/…`; the session under `/api/v1/session`. `GET /health` keeps its current path.
  - Reads use `GET` on resources. Configuration uses `PUT` (replace, idempotent), `PATCH` (partial update) and `DELETE` (remove or unlink).
  - A booking lifecycle change is a `POST` to a command named after its use case: `/cancel`, `/reschedule`, `/outcome`, `/outcome-correction`, `/remainder-walk-ins`. **There is no endpoint that writes `status`.** Only `bookings` changes booking statuses, and only through its use cases (**Defined:** [modules MOD-DM-02](./modules.md#mod-dm-02-every-entity-has-one-owner-only-the-owner-touches-its-tables), [INV-RES-01](../product-specs/uc-03/invariants.md#24-occupying-states)).
  - JSON field names are `camelCase`. Enum values keep the `UPPER_SNAKE` names of the ERD and the schema, for example the seven values of `booking_status`.
  - Responses always include every documented field; an absent value is `null`, never a missing key. Requests reject unknown fields with `400` (`additionalProperties: false`), so a typo never passes silently.
  - Responses are API views, never database rows ([modules §8.1](./modules.md#81-for-con-02-api-contracts)). They omit internal fields such as `tenant_id` and the payment-instruction fields of `bookings`, which belong to `payments` ([modules MOD-DM-06](./modules.md#mod-dm-06-shared-rows-have-one-row-owner-and-named-field-owners)).
- **Example:** Completing a booking is `POST …/bookings/{id}/outcome` with `{ "outcome": "COMPLETED" }`, not `PATCH …/bookings/{id}` with `{ "status": "COMPLETED" }`. The command lets the use case check timing, permission and current state, and record the event.

### API-DM-04: Data representations

| Data | Representation | Origin |
|---|---|---|
| Identifiers | UUID strings | **Defined:** [TEN-DM-04](./tenancy.md#ten-dm-04-identifiers-are-uuids-not-derived-from-the-installation) |
| Instants | RFC 3339 in UTC with `Z`, such as `2026-11-10T13:00:00Z` | **Defined:** instants stored unambiguously (BR-TEN-04); format **Proposed** |
| Intervals | `startAt` and `endAt`, half-open `[startAt, endAt)` | **Defined:** BR-RES-02, INV-DISP-02 |
| Local dates | `YYYY-MM-DD` in the tenant timezone, for agenda and slot ranges | **Proposed** |
| Weekly hours | `weekday` as a name (`MONDAY`…`SUNDAY`) with `startTime` and `endTime` as `HH:mm` local times | **Proposed**; the database stores 0–6 with no documented convention ([API-Q-07](#13-decisions-and-open-questions)) |
| Timezone | IANA name on the tenant profile; clients convert for display | **Defined:** BR-TEN-04 |
| Money | Decimal string with two places, such as `"8000.00"`, in the tenant's single currency; never a JSON number | **Defined:** exact decimals, one currency ([ERD §6.1](./erd.md#61-shared-conventions)); Drizzle already returns strings ([REP-02](./rep-02-core-persistence.md#physical-decisions)). Format **Proposed** |
| Durations | Integer minutes, with the unit in the name, such as `durationMinutes` | **Defined:** ERD `Minutes` |
| Phones | E.164, such as `+5493794111222`, the same pattern the database checks | **Defined:** ERD `Phone`, `customers_phone_e164` |

Clients never compute availability, prices or deposits; they display what the API returns (**Defined:** BR-SEN-05, [architecture §7](./target-architecture.md#7-nextjs-frontend-feature-first-organization)).

### API-DM-05: Pagination, filtering and sorting only where lists grow

- **Rule (Proposed):**
  - Lists that grow without bound are paginated by cursor: `GET /bookings` and `GET /customers`. Requests take `limit` (1–100, default 25) and `cursor`; responses return `items` and `nextCursor`, which is `null` on the last page. A cursor is opaque and valid only with the same filters.
  - Configuration lists (services, resources, policies, calendars, rules) are small and return everything in one `items` array.
  - Time-bounded reads require a range and cap it: agenda and free slots accept at most 14 days, open windows at most 31, and the exception list a `from`–`to` instant range.
  - Filters are explicit query parameters per endpoint, never a generic query language. Sorting is fixed per endpoint unless a `sort` parameter lists its allowed values, as in `GET /bookings` (`startAt` or `-startAt`).
- **Example:** Booking search by customer: `GET …/bookings?customerId=…&status=CONFIRMED&status=COMPLETED&limit=25`, then repeat with `cursor` from the response until `nextCursor` is `null`.

## 4. Authentication, authorization and tenant context

### API-DM-06: The CRM uses an opaque server-side session cookie

- **What:** CU-17 leaves the authentication method to a CON task ([CU-17](../product-specs/uc-02/use-cases.md#cu-17)); the ERD only has `User.credential_ref`. The team chose a session cookie for this proposal.
- **Rule (Proposed):**
  - `POST /session` with email and password establishes a session and sets `agendoxa_session`, an opaque identifier with `HttpOnly`, `Secure`, `SameSite=Lax` and `Path=/api`. The session state lives on the server; no token is readable from JavaScript.
  - Each request with the cookie is authenticated again against the server session. Signing out (`DELETE /session`) ends it at once.
  - **CSRF:** the session response carries a `csrfToken`; every non-safe method (`POST`, `PUT`, `PATCH`, `DELETE`) must send it in `X-CSRF-Token`. `SameSite=Lax` reduces the risk; the token closes it.
  - **CORS:** only the installation's configured web origin may send credentials. `SameSite=Lax` assumes the web and the API share a registrable domain; a deployment where they do not would need the Next.js server to proxy API calls ([API-Q-08](#13-decisions-and-open-questions)).
  - Invalid credentials return `401` with reason `invalid_credentials`, whether or not the account exists. CU-17 A1 marks this as a proposal; this contract adopts it.
- **Not decided here:** how a person first sets or recovers a password, session lifetime and idle timeout, and how personnel are invited ([TEN-Q6](./tenancy.md#10-open-questions)). They belong to the authentication design of `identity` ([API-Q-08](#13-decisions-and-open-questions)).

### API-DM-07: The tenant is a path segment, revalidated on every request

- **Defined:** The CRM tenant is the business selected among the user's active memberships, revalidated on each request; selecting it never authorizes ([TEN-DM-07](./tenancy.md#ten-dm-07-every-entry-point-has-one-source-of-tenant-context), BR-TEN-02, CU-17 A3).
- **Rule (Proposed):**
  - Every CRM endpoint includes `{tenantId}` in its path. The server holds no "current business" for the session: two browser tabs can work in two businesses, and nothing carries over between them (CU-17 A4).
  - On every request the API resolves the caller's **active** membership in that tenant and the role's effective permissions. Without one, the response is `404 not_found`, identical to a tenant that does not exist, so the API never confirms another business exists.
  - **Revocation takes effect on the next request** *(made explicit 2026-11-10 for the rewritten Issue's acceptance criteria)*. A deactivated membership returns `404 not_found` even with a valid session; a permission removed from the role returns `403 missing_permission`. Nothing is cached in the session or in the `GET /me` response that the backend trusts later.
  - A record of another tenant, reached by tampering with an ID, is `404 not_found` (**Defined:** EJ-01). The API never returns `403` for data of another tenant.
  - `GET /session` lists the user's active memberships; `GET /tenants/{tenantId}/me` returns the role and effective permission keys in one business, so the CRM can hide actions the role lacks (CU-17 step 4). Hiding is only usability: the backend checks every request.

### API-DM-08: Permissions are checked per operation; Admin-only operations stay Admin-only

- **Defined:** Permissions come only from the membership's role; the backend checks effective permissions; Admin-only operations are non-delegable (BR-IAM-01–04). The exact permission keys are detailed design ([ERD `Permission`](./erd.md#permission)).
- **Rule (Proposed):** Each operation requires one permission from the `identity` catalog. Lacking it returns `403` with reason `missing_permission`. The keys below are **placeholders** to agree with `identity` ([API-Q-02](#13-decisions-and-open-questions)); renaming them does not change the contract shape.

| Placeholder key | Operations |
|---|---|
| `schedule.view` | Agenda, free slots, booking reads and history, customer reads, catalog and availability reads, effective policy |
| `tenant.manage` | Update the business profile |
| `catalog.manage` | Create and update services and resources; compatibility links |
| `policies.manage` | Booking policies |
| `availability.manage` | Resource calendars, weekly hours, blocks and openings (BR-IAM-05) |
| `bookings.create` | CRM bookings and remainder walk-ins, including a `BLOCKED` customer after the warning (BR-CLI-09) |
| `bookings.cancel` | Cancel, including operational business cancellations (BR-CAN-06) |
| `bookings.reschedule` | Reschedule |
| `bookings.record_outcome` | Record completion or no-show |
| `bookings.correct_outcome` | Correct an outcome (BR-RES-12) |
| `customers.manage` | Create and update customers; record incidents |
| `customers.restrict` | Apply or remove restrictions (BR-CLI-08) |
| `payments.view` | Reviews and their evidence files, payments, booking financial state, receiving accounts, cash sessions and movements *(added 2026-11-10)* |
| `payments.record` | Upload and submit evidence from the CRM; record a cash payment ([matrix](../product-specs/uc-01/actors.md) "Record partial or mixed-method payment") |
| `payments.verify` | Approve or reject a review; record a transfer whose credit was checked ("Verify bank-transfer receipt", BR-COB-05) |
| `payments.allocate` | Allocate verified funds and reverse allocations (BR-COB-03, BR-COB-17) |
| `cash.operate` | Open and close the cash session (BR-CAJA-02, BR-IAM-05) |
| `cash.movements` | Record cash-in and cash-out with a reason (BR-CAJA-05) |

**Admin-only, non-delegable (Defined: BR-IAM-04):** confirming a CRM booking without its required deposit (`depositException`, BR-SEN-09), granting an exception to a late-change consequence or to the reschedule limit (`adminException`, BR-CAN-03, CU-09 A1b), and *(added 2026-11-10)* adjusting a closed cash session (BR-CAJA-09, BR-COB-11). A request that includes them from a non-Admin returns `403` with reason `admin_only`, even if the rest of the request is allowed; the API never silently drops the exception.

*Added 2026-11-10.* An optional input that performs another owner's operation also needs that operation's permission: `deposit.allocations` in `POST /bookings` needs `payments.allocate`, and `deposit.evidence` needs `payments.record`. `POST /payments` needs `payments.record` for cash and `payments.verify` for a transfer, because recording a transfer asserts that its credit was checked. Payment corrections and refunds keep their own boundaries in the later increment ([§11.2](#112-next-contract-increment)).

## 5. Errors

### API-DM-09: One problem format with stable codes and reasons

- **Defined:** Error meanings are `validation`, `unauthorized`, `forbidden`, `not_found`, `conflict` and `external_dependency`, without leaking secrets or cross-tenant data ([architecture §11](./target-architecture.md#11-internal-api-and-integration-boundaries)).
- **Rule (Proposed):**
  - Every error uses [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem details with `Content-Type: application/problem+json` and the `Problem` schema: `type`, `title`, `status`, `code`, optional `reason`, `detail` and `errors`, and `requestId`, also sent as the `X-Request-Id` header.
  - `code` is one of the categories below and decides the HTTP status. `reason` is a stable `snake_case` value within the code, so clients branch on `code` and `reason`, never on `title` or `detail`, which are human text and may change.
  - This contract adds one category, `rule_violation`, which the architecture list does not have ([API-Q-09](#13-decisions-and-open-questions)). It separates "the request is valid but a business rule refuses it" from a race on current state.
  - A problem never contains another tenant's data, stack traces, SQL or secrets (BR-TEN-05).

| `code` | HTTP | Use | Reasons in this increment |
|---|---|---|---|
| `validation` | 400 | The request does not match the schema or a cross-field rule; `errors[]` lists each `path` (JSON Pointer) and message | — (uses `errors`); `range_too_large`, `unsupported_media_type`, `file_too_large` |
| `unauthorized` | 401 | No valid session, or wrong credentials | `session_required`, `invalid_credentials` |
| `forbidden` | 403 | Valid membership, but the role lacks the permission or the operation is Admin-only | `missing_permission`, `admin_only`, `csrf_token_invalid` |
| `not_found` | 404 | Does not exist, belongs to another tenant, or the caller has no active membership in the tenant | — |
| `conflict` | 409 | Current state prevents it now; refreshing or choosing another slot may succeed | `slot_unavailable`, `state_changed`, `idempotency_key_reused`, `idempotency_request_in_progress`, `phone_already_registered`, `calendar_has_exceptions`, `opening_in_use`, `no_active_restriction`; money flows: `review_already_decided`, `upload_already_used`, `evidence_unavailable`, `allocation_already_reversed`, `cash_session_not_open`, `cash_session_already_open`, `cash_session_not_closed`, `stale_revision` |
| `rule_violation` | 422 | A business rule refuses the request as sent; it needs other input, an acceptance or an exception | `late_change_requires_acceptance`, `deposit_required`, `customer_blocked_requires_acknowledgement`, `future_booking_limit_reached`, `booking_lead_not_met`, `slot_in_past`, `outside_open_hours`, `incompatible_resource`, `inactive_service`, `inactive_resource`, `too_early_for_outcome`, `reschedule_limit_reached`, `not_in_private_remainder`, `phone_change_not_supported`; money flows: `allocation_exceeds_charge_balance`, `allocation_exceeds_available_funds`, `evidence_upload_expired`, `hold_evidence_via_whatsapp`, `booking_released`, `receiving_account_required`, `opening_difference_requires_reason` |
| `external_dependency` | 503 | A required external service failed. No operation in this increment depends on WhatsApp or the LLM (BR-CH-06) | — |
| `internal` | 500 | Unexpected failure; the client may retry with the same idempotency key | — |

- **Example:** A Staff member cancels inside the notice window without the customer's acceptance. The API answers `422`, `rule_violation`, reason `late_change_requires_acceptance`, with a `lateChange` object holding the notice and the deposit policy so the CRM can state the consequence (BR-CAN-14). Sending again with `acceptLateConsequence: true` cancels. [§8](#8-representative-examples) shows the full body.

## 6. Idempotency and concurrency

### API-DM-10: State-changing POSTs require an idempotency key

- **What:** A network retry must not create a second customer or booking, or make a successful cancellation look like a failure.
- **Defined:** Retries of the same operation never duplicate effects (MVP §6.3.14, BR-COB-16). The ERD has `idempotency_key` only on `Payment` and `Refund` (T-03).
- **Rule (Proposed):**
  - Every `POST` that creates or changes state requires an `Idempotency-Key` header: 16 to 128 characters from `[A-Za-z0-9_-]`, generated by the client once per intended operation and reused on every retry of it. `POST /session` is the only exception.
  - `PUT`, `PATCH` and `DELETE` are idempotent by their meaning and take no key: repeating them leaves the same state.
  - The API keeps each key for 24 hours, scoped to the tenant, the user and the route, with a fingerprint of the request body and the final response.
  - The same key with the same body returns the stored response, status and body included, without running the operation again. The same key with a different body returns `409 idempotency_key_reused`. A key whose first request is still running returns `409 idempotency_request_in_progress`.
  - Completed responses, including `4xx`, are stored; `5xx` are not, so the client can retry.
- **Example:** `POST …/bookings` times out on the client after the booking was created. The retry with the same key returns the original `201` and the same booking, not `409 slot_unavailable` for the slot the first request took.
- **Money operations** *(added 2026-11-10)*: `POST /payments` maps the header to `Payment.idempotency_key` (ERD T-03), and a later refund endpoint will map it to `Refund.idempotency_key`. A review decision is also protected by the review itself: it can be decided once, so a repeated approval with a new key cannot create a second payment (INV-PAY-02). Two separate entries that may be the same money are kept and flagged, never merged (INV-PAY-08).
- **Open:** where idempotency records are stored, since they are not an ERD entity ([API-Q-06](#13-decisions-and-open-questions)).

### API-DM-11: Commands are checked against current state; configuration is last-write-wins

- **Rule (Proposed):**
  - A command runs its checks against the current state inside one transaction ([modules MOD-DM-08](./modules.md#mod-dm-08-the-initiating-use-case-owns-the-transaction)). If the state no longer allows it, for example a booking cancelled by someone else a second earlier, it returns `409 state_changed` and the client reloads the booking.
  - Occupancy races end in exactly one winner: the database exclusion rejects the loser, which receives `409 slot_unavailable` (**Defined:** INV-DISP-01, EJ-08).
  - Configuration updates (`PATCH` of the profile, services and resources; `PUT` of policies and hours) are last-write-wins in this increment, without `ETag` or `If-Match`. Configuration is edited by few people and changes to it never rewrite agreed bookings (**Defined:** DM-06 snapshots, BR-DISP-08). Conditional requests can be added later as an additive change.
  - Operations that move money follow [API-DM-18](#api-dm-18-money-operations-rely-on-state-guards-and-caps-the-cash-close-and-adjustments-add-a-revision-precondition) *(added 2026-11-10, confirmed by author decision D-5)*.

### API-DM-18: Money operations rely on state guards and caps; the cash close and adjustments add a revision precondition

> **Added 2026-11-10** by author decision D-5 ([§14.1](#141-scope-differences-with-the-rewritten-issue-11)). Proposed for team review.

- **What:** Last-write-wins stays for configuration, and commands keep rechecking current state ([API-DM-11](#api-dm-11-commands-are-checked-against-current-state-configuration-is-last-write-wins)). For the new operations that move money, the question is whether a client should also prove it saw the current version.
- **Defined:** Every money writer runs inside the initiator's transaction and lock order of [modules MOD-DM-08](./modules.md#mod-dm-08-the-initiating-use-case-owns-the-transaction); this document does not restate that protocol (D-4). A review is decided once (INV-PAY-02, INV-PAY-10, EJ-20). Allocations are capped by charge balance and available funds (INV-PAY-07). A closed session is immutable and records expected cash, counted cash and the difference (INV-CAJA-03, INV-CAJA-05).
- **Rule (Proposed):**

| Operation | Precondition | Why it is enough |
|---|---|---|
| Approve or reject a review | The review is `PENDING`, checked in the transaction; otherwise `409 review_already_decided` | The decision is a one-way transition with no editable fields. A version would add nothing to the state guard |
| Allocate, including allocations inside an approval, a payment or a booking creation | Each item within the current charge balance and available funds; otherwise `422` with `allocationLimit` holding the current figures | The invariant is an upper bound checked atomically. A stale screen can only produce a refusal, never excess money or a negative balance. A version would refuse unrelated allocations of the same payment and protect nothing more |
| Reverse an allocation | The allocation is `ACTIVE`; otherwise `409 allocation_already_reversed` | Same as a review: one transition |
| Record a payment, a cash-in or a cash-out | Idempotency key; cash needs an open session | Each one appends a new fact. Two separate entries are both kept and flagged (INV-PAY-08) |
| Close the cash session | `expectedRevision` equal to the session's current `revision`; otherwise `409 stale_revision` with `currentRevision` | The close fixes forever the expected cash the person reviewed against the cash they counted. A payment that entered in between would leave an immutable difference computed against totals nobody saw |
| Adjust a closed session (Admin) | `expectedRevision`, same check | An Admin decides the amount from the adjustments already shown. Without the check, two Admins correcting the same error would double-correct an immutable session |

  - `revision` is an API value on `CashSession` that grows with every movement, adjustment and the close. How it is derived, for example from counts already stored, is implementation; it implies no new column.
  - The precondition is a **body field**, not `If-Match`. It belongs to the meaning of the command and enters the idempotency fingerprint, so a retry with the same key replays the stored answer, while a new attempt after reviewing again uses a new key. It is typed in the shared Zod schemas the web already uses, and it needs no `412`/`428` status or `ETag` generation for a single resource. `If-Match` remains available later for configuration as an additive change.
- **Residual risk accepted:** two people may each allocate a valid partial amount to the same charge at the same time; both allocations are real verified money within the caps and can be reversed with a reason.

## 7. Endpoints by owner module

### API-DM-12: Each endpoint belongs to the module that owns its operation

> **Reconciled 2026-11-10** with the consolidated CON-01: nine functional modules plus `audit` and `assets`; calendars and policy resolution in `catalog`, waitlist in `bookings`, cash in `payments`; `workflows` coordinates multi-owner operations.

- **Defined:** Operation owners and multi-owner coordinators come from [modules §4](./modules.md#4-operations-by-module); data owners from [modules MOD-DM-02](./modules.md#mod-dm-02-every-entity-has-one-owner-only-the-owner-touches-its-tables). `workflows` is application composition above the owners, not a functional module: it opens the shared transaction of a multi-owner command and invokes each owner's public facade ([modules §5.2](./modules.md#52-coordination-and-asynchronous-activation), [MOD-DM-08](./modules.md#mod-dm-08-the-initiating-use-case-owns-the-transaction)). Owners never import it. Cross-owner reads are composed above the owners, never through a finance port or cross-owner SQL ([modules §6.4](./modules.md#64-queries-and-read-compositions)).
- **Rule (Proposed):** Every endpoint is one of three kinds, and the OpenAPI shows which:

| Kind | Inbound HTTP adapter | OpenAPI |
|---|---|---|
| Owner command or query | The owner's `adapters/in/http`, calling one of its use cases ([modules §7.1](./modules.md#71-folder-and-public-contract-conventions)) | Tag = owner; no extension |
| Multi-owner command | `workflows/adapters/in/http`, calling the named coordinator, as CON-01 places multi-owner jobs in `workflows/adapters/in/jobs` ([modules §6.6](./modules.md#66-jobs)) | Tag = owner of the main state; `x-agendoxa-invokes` with `coordinator: workflows` and its `participants` |
| Cross-owner read composition | Above every participating owner; exact location open ([API-Q-10](#13-decisions-and-open-questions)) | Tag = owner of the main state; `x-agendoxa-invokes` with `composition` listing the owners read |

  The kind does not change the HTTP contract: path, permission, errors and idempotency are the same whoever composes the call. A single-owner command that only uses technical `tenants`, `identity` or `audit` support is an owner command, not a coordinator ([modules §4](./modules.md#4-operations-by-module)).

| Owner (tag) | Paths (under `/api/v1`) | Multi-owner commands (`workflows`) | Read compositions |
|---|---|---|---|
| `identity` | `/session`, `/tenants/{tenantId}/me` | — | — |
| `tenants` | `/tenants/{tenantId}`; public profile `/public/businesses/{slug}` (tag `public`) | — | Public profile: `tenants`, `catalog` weekly hours, `messaging` WhatsApp link |
| `catalog` | `/services…`, `/resources…`, `/booking-policies…`, `/calendars…`, `/resources/{resourceId}/calendar`, `/resources/{resourceId}/windows`, `/availability-exceptions…`; public `/public/businesses/{slug}/services` (tag `public`) | Removing an availability exception: `catalog`, `bookings` (reevaluation intent after a block is removed, [modules §6.3](./modules.md#63-events-and-durable-intents)) | — |
| `bookings` | `/free-slots`, `/agenda`, `/bookings…` | Create, cancel, reschedule and remainder walk-in: `bookings` with `customers`, `payments` and `notifications` as each needs ([§7.5](#75-bookings-free-slots-agenda-and-lifecycle-commands)) | Agenda and booking reads: `bookings`, `catalog`, `payments` (for `depositState`) |
| `customers` | `/customers…` | — | Customer list and detail: `customers`, `bookings` (derived indicators) |
| `payments` *(added 2026-11-10)* | `/payment-evidence-uploads`, `/payment-reviews…`, `/bookings/{bookingId}/payment-reviews`, `/bookings/{bookingId}/financial-state`, `/receiving-accounts`, `/payments…`, `/payment-allocations…`, `/cash-sessions…` | Evidence submission (`payments`, `bookings`, `assets`); approval, rejection, payment recording and allocation (`payments`, `bookings`, `notifications`) | Review reads and booking financial state: `payments`, `bookings` |

`bookings` may read `catalog` directly ([modules §5.1](./modules.md#51-dependency-diagram)); the agenda is a composition only because `depositState` needs `payments` facts. Outcome recording and correction stay `bookings` owner commands: they change only booking history and private remainder occupancy ([modules §6.2](./modules.md#62-transactions)). In `payments`, uploads, payment reads, allocation reversal and every cash operation are owner commands or queries; `payments` may use `assets` directly, but it cannot import `bookings`, so anything that needs booking facts or changes a booking goes through `workflows` ([modules §5.1](./modules.md#51-dependency-diagram)).

Below, paths are relative to `/api/v1/tenants/{tenantId}` unless they start with `/api/v1`. Every operation is in the [OpenAPI file](./api-contracts.openapi.yaml) with its schemas and responses.

### 7.1 `identity`: session and tenant context

| Method and path | Operation | Permission | Notes |
|---|---|---|---|
| `POST /api/v1/session` | `signIn` | None | Sets the cookie; returns `SessionView` with memberships and `csrfToken` |
| `GET /api/v1/session` | `getSession` | Session | Active memberships only |
| `DELETE /api/v1/session` | `signOut` | Session | Ends the server session |
| `GET /me` | `getTenantContext` | Active membership | Role and effective permission keys |

### 7.2 `tenants` and the public endpoints

| Method and path | Operation | Permission | Notes |
|---|---|---|---|
| `GET /api/v1/public/businesses/{slug}` | `getPublicBusiness` | None | [API-DM-01](#api-dm-01-no-public-booking-the-public-api-is-read-only-landing-information); `Cache-Control: public, max-age=300` |
| `GET /api/v1/public/businesses/{slug}/services` | `listPublicServices` | None | Active services only |
| `GET /` | `getTenantProfile` | `schedule.view` | Name, slug, timezone, currency, branding |
| `PATCH /` | `updateTenantProfile` | `tenant.manage` | Name and branding only |

Changing the slug, timezone or currency is not offered: the slug is an installation-wide identifier, and the other two change how existing bookings and amounts are read. Settings stored on `Tenant` that belong to other modules ([modules MOD-DM-06](./modules.md#mod-dm-06-shared-rows-have-one-row-owner-and-named-field-owners)) get their endpoints in those modules' increments ([§11.2](#112-next-contract-increment)).

### 7.3 `catalog`: services, resources, compatibility and policies

| Method and path | Operation | Permission | Notes |
|---|---|---|---|
| `GET /services` | `listServices` | `schedule.view` | `includeInactive` defaults to `false` |
| `POST /services` | `createService` | `catalog.manage` | A combination is one service (BR-CAT-01) |
| `GET`, `PATCH /services/{serviceId}` | `getService`, `updateService` | `schedule.view`, `catalog.manage` | Deactivate with `isActive: false`; no `DELETE` (ERD: deactivate). A new price applies to new bookings only |
| `GET /services/{serviceId}/resources` | `listServiceResources` | `schedule.view` | Compatible resources |
| `PUT`, `DELETE /services/{serviceId}/resources/{resourceId}` | `linkServiceResource`, `unlinkServiceResource` | `catalog.manage` | Idempotent; unlinking leaves existing bookings unchanged ([API-Q-04](#13-decisions-and-open-questions)) |
| `GET /resources`, `POST /resources` | `listResources`, `createResource` | `schedule.view`, `catalog.manage` | `kind` is `PROFESSIONAL` or `PHYSICAL`; a professional needs no CRM user (BR-CAT-02) |
| `GET`, `PATCH /resources/{resourceId}` | `getResource`, `updateResource` | `schedule.view`, `catalog.manage` | Deactivate with `isActive: false`. The receiving account belongs to `payments` |
| `GET /booking-policies` | `listBookingPolicies` | `schedule.view` | Tenant policy and every override as stored |
| `PUT /booking-policies/tenant` | `putTenantBookingPolicy` | `policies.manage` | Replaces the base policy |
| `PUT`, `DELETE /booking-policies/services/{serviceId}` | `putServiceBookingPolicy`, `deleteServiceBookingPolicy` | `policies.manage` | Override; `DELETE` makes every field inherit again |
| `PUT`, `DELETE /booking-policies/resources/{resourceId}` | `putResourceBookingPolicy`, `deleteResourceBookingPolicy` | `policies.manage` | Same, for a resource |
| `GET /booking-policies/effective?serviceId&resourceId` | `getEffectiveBookingPolicy` | `schedule.view` | Resolved values and the source of each one |

**Policy fields.** **Defined:** each field resolves resource > service > tenant, distinguishing inherit, set and disable (DM-06, BR-SEN-02); booking lead time and the future-booking limit exist only at tenant scope; bookings keep snapshots ([REP-02 T-05](./rep-02-core-persistence.md#t-05-calendar-and-policy-subset)). In overrides, `null` means inherit. `deposit.mode: DISABLED` disables the deposit explicitly; `FIXED` takes an amount and `PERCENTAGE` a value from `0.00` to `100.00`. As in the schema, an override cannot express "unlimited reschedules" for one service while the tenant has a limit.

When the tenant field is `null`, the effective policy uses the product default and reports `DEFAULT` as its source:

| Field | Value when the tenant leaves it empty | Origin |
|---|---|---|
| `noticeMinutes` | 600 (10 hours) | **Defined:** BR-CAN-01 |
| `bookingLeadMinutes` | 0 | **Defined:** BR-DISP-09 |
| `rescheduleLimit` | `null`, unlimited | **Defined:** BR-CAN-07 |
| `futureBookingLimit` | `null`, disabled | **Defined:** BR-CLI-10 |
| `deposit` | `DISABLED` | **Proposed:** a deposit is optional (BR-SEN-01) and no default is implied (BR-SEN-02) |
| `depositRefundPolicy` | `null`, not configured | **Defined:** no default was agreed (P-07) |
| `reminderLeadMinutes` | `null`, no reminder scheduled | **Proposed**, pending a product default ([API-Q-05](#13-decisions-and-open-questions)) |

### 7.4 `catalog`: calendars, hours, blocks and openings

> **Reconciled 2026-11-10:** these endpoints moved from the former `availability` module to `catalog` ([modules MOD-DM-01](./modules.md#mod-dm-01-nine-business-modules-and-two-platform-modules)); paths, schemas and permissions are unchanged.

| Method and path | Operation | Permission | Notes |
|---|---|---|---|
| `GET /calendars` | `listCalendars` | `schedule.view` | The tenant calendar and each resource-specific one |
| `PUT /resources/{resourceId}/calendar` | `ensureResourceCalendar` | `availability.manage` | `201` creates it with no hours; `200` if it exists |
| `DELETE /resources/{resourceId}/calendar` | `deleteResourceCalendar` | `availability.manage` | The resource inherits tenant hours again (BR-DISP-01); `409 calendar_has_exceptions` if it still has blocks or openings |
| `GET`, `PUT /calendars/{calendarId}/rules` | `getCalendarRules`, `replaceCalendarRules` | `schedule.view`, `availability.manage` | Replaces the whole weekly set at once. Ranges of one weekday must not overlap (`400`). Confirmed bookings outside new hours are kept (BR-DISP-08) |
| `GET /availability-exceptions?from&to&calendarId` | `listAvailabilityExceptions` | `schedule.view` | Instant range |
| `POST /availability-exceptions` | `createAvailabilityException` | `availability.manage` | `BLOCK` or `OPENING`; the actor is recorded. An opening never overrides a block or an active claim (DM-05): the block wins when windows are computed |
| `DELETE /availability-exceptions/{exceptionId}` | `deleteAvailabilityException` | `availability.manage` | Removing a block is an explicit action (BR-DISP-02) and may release capacity to the waitlist ([UC-02 §4.2](../product-specs/uc-02/use-cases.md#42-triggering-events)). Through `workflows`: the same transaction records the range/resource reevaluation intent in `bookings`, even with no earlier booking or round ([modules §6.3](./modules.md#63-events-and-durable-intents)). An opening used by a booking returns `409 opening_in_use` |
| `GET /resources/{resourceId}/windows?from&to` | `getResourceWindows` | `schedule.view` | Open windows, ignoring occupancy ([modules MOD-DM-05](./modules.md#mod-dm-05-catalog-supplies-windows-bookings-finds-free-slots)) |

### 7.5 `bookings`: free slots, agenda and lifecycle commands

> **Reconciled 2026-11-10:** the table names which commands go through `workflows`, and API-DM-13 composes `depositState` instead of using a finance port that CON-01 no longer has.

| Method and path | Operation | Permission | Notes |
|---|---|---|---|
| `GET /free-slots?serviceId&resourceId&from&to` | `listFreeSlots` | `schedule.view` | Without `resourceId`, every compatible resource. Never reserves (BR-DISP-04) |
| `GET /agenda?from&to&resourceId` | `getAgenda` | `schedule.view` | Resources, bookings and exceptions for up to 14 days (CU-21) |
| `GET /bookings` | `listBookings` | `schedule.view` | Filters `customerId`, `status`, `from`, `to`; cursor pagination |
| `POST /bookings` | `createCrmBooking` | `bookings.create` | Below; `workflows` with `bookings`, `customers`, `payments`, `notifications`. A `deposit` input also needs its payments permission |
| `GET /bookings/{bookingId}` | `getBooking` | `schedule.view` | `BookingDetail` |
| `GET /bookings/{bookingId}/events` | `listBookingEvents` | `schedule.view` | `BookingEvent` history, with actor and reason |
| `POST /bookings/{bookingId}/cancel` | `cancelBooking` | `bookings.cancel` | Below; `workflows` with `bookings`, `notifications` |
| `POST /bookings/{bookingId}/reschedule` | `rescheduleBooking` | `bookings.reschedule` | Below; `workflows` with `bookings`, `payments`, `notifications` |
| `POST /bookings/{bookingId}/outcome` | `recordBookingOutcome` | `bookings.record_outcome` | Below; `bookings` owner command |
| `POST /bookings/{bookingId}/outcome-correction` | `correctBookingOutcome` | `bookings.correct_outcome` | Below; `bookings` owner command |
| `POST /bookings/{bookingId}/remainder-walk-ins` | `createRemainderWalkIn` | `bookings.create` | Below; `workflows`, same participants as `POST /bookings` |

The participants follow the same-transaction effects of [modules §6.2](./modules.md#62-transactions): a booking creation includes the applied deposit snapshot, any charge and its notices; a cancellation its notice suppression and release intent; a reschedule its charge correction and notices. Whether a participant has work to do depends on the request (for example, no charge without a deposit); the coordinator is the same.

HOLD creation, confirmation and expiry have no HTTP endpoint: a HOLD exists only in the WhatsApp flow, through the agent (**Defined:** the CRM never creates a HOLD, BR-SEN-09), and expiry is a job (CU-22).

### API-DM-13: Seven statuses, with derived conditions as separate fields

- **Defined:** `booking_status` has exactly `HOLD`, `PENDING_PAYMENT_REVIEW`, `CONFIRMED`, `CANCELLED`, `EXPIRED`, `COMPLETED` and `NO_SHOW` ([REP-02](./rep-02-core-persistence.md)); only `bookings` changes it ([modules §11](./modules.md#11-reconciliation-with-sources)). The conditions inside `PENDING_PAYMENT_REVIEW` and "pending operational close" are not statuses ([INV §2](../product-specs/uc-03/invariants.md#2-booking-lifecycle), BR-RES-13).
- **Rule (Proposed):** `status` takes only those seven values. Derived conditions are separate read-only fields of `BookingSummary`. *Reconciled 2026-11-10: the deposit meanings below now follow the preliminary screening rules BR-SEN-14–16; values and schema are unchanged.*

| Field | Meaning | Source |
|---|---|---|
| `pendingOperationalClose` | `CONFIRMED` and its end has passed; still awaiting an outcome | BR-RES-13 |
| `holdExpiresAt` | Deadline of a `HOLD`; `null` otherwise. Never extended by a replacement file or a screening retry; a `HOLD` may still show it in the past while the screening of evidence received in time is unresolved | ERD `Booking`; BR-SEN-16, INV-SEN-13 |
| `depositState: NOT_REQUIRED` | No deposit applies | BR-SEN-01 |
| `depositState: AWAITING_EVIDENCE` | `HOLD` with a deposit and no evidence in human review yet: nothing received, a first clearly unrelated file awaiting its replacement, or a file still under preliminary screening | BR-RES-03, BR-RES-06, BR-SEN-14, BR-SEN-16 |
| `depositState: UNDER_REVIEW` | Evidence in human review: a plausible file, a second clearly unrelated attempt, an uncertain or failed screening, or the text fallback. Occupies with no inactivity timeout. Arriving here is not a human finding | BR-RES-06, BR-SEN-12, BR-SEN-14–15 |
| `depositState: CORRECTION_WINDOW` | First **human** rejection of initial evidence without verified funds; 15-minute window. A preliminary AI discard never opens it | BR-SEN-10, INV-SEN-12 |
| `depositState: AWAITING_ALLOCATION` *(added 2026-11-10)* | Verified funds whose origin is this booking exist, but nobody has allocated them to its charge and no evidence is in human review; occupies, unconfirmed. Verification alone never confirms | BR-SEN-07, EJ-20; protection open in [API-Q-13](#13-decisions-and-open-questions) |
| `depositState: PARTIAL` | Verified funds allocated below the threshold; occupies, unconfirmed | BR-SEN-11 |
| `depositState: MET` | Verified funds allocated up to the threshold | BR-SEN-07 |
| `depositState: ADMIN_EXCEPTION` | Confirmed by an Admin without the required deposit | BR-SEN-09 |
| `supplementalDepositState` *(added 2026-11-10)* | `null`, `REQUESTED`, `UNDER_REVIEW` or `MET`: the additional deposit after a permitted reschedule of a `CONFIRMED` booking. Separate from `depositState`, which keeps describing the initial deposit ([API-DM-21](#api-dm-21-initial-deposit-supplemental-deposit-credit-outcome-and-cash-are-separate-fields)) | BR-CAN-10, CU-09 A3 |

  `bookings` alone knows the applied requirement and the booking status; the review, correction, partial and met conditions need `payments` facts. So `depositState` is produced by a read composition above `bookings` and `payments`, never by a finance port inside `bookings` *(reconciled 2026-11-10: CON-01 removed that port, [modules §6.4](./modules.md#64-queries-and-read-compositions))*. Until `payments` exists, the composition can only produce `NOT_REQUIRED`, `AWAITING_EVIDENCE` and `ADMIN_EXCEPTION`. Clients must treat an unknown `depositState` as "see booking detail" ([API-DM-16](#api-dm-16-contracts-evolve-additively-within-v1)).

**`POST /bookings` — create a CRM booking (CU-02 A7, CU-03 CRM, CU-04).**

- **Input:** an existing `customerId` or a `newCustomer` (name required, phone optional, BR-CLI-04); optional attendee name and phone; `serviceId`; `resourceId`, or `null` to let the tenant's assignment mode choose a compatible one (BR-DISP-05); `startAt`. The end comes from the service duration. *Added 2026-11-10:* an optional `deposit` with `allocations` of existing verified payments, `evidence` (an upload ID or typed transfer details) for human review, or both ([§7.7](#77-payments-evidence-and-human-review), [§7.8](#78-payments-verified-payments-and-explicit-allocation)).
- **Result:** `201`, origin `CRM`, without a HOLD (**Defined:** BR-SEN-09, CU-03 CRM step 2): `CONFIRMED` when no deposit applies, when `deposit.allocations` reach the threshold, or with the Admin exception; `PENDING_PAYMENT_REVIEW` when there is evidence (`depositState: UNDER_REVIEW`) or only verified funds below the threshold (`PARTIAL`). Both occupy. The allocations, the review and the booking commit together.
- **Refusals, in the order they are checked:**
  1. The customer is `BLOCKED` and `acknowledgeBlockedCustomer` is not `true`: `422 customer_blocked_requires_acknowledgement`. With `true`, the booking is created with `blockedException` and the restriction stays (BR-CLI-09).
  2. A deposit is required, including 100% for `FULL_PREPAYMENT` (BR-SEN-04), and there is neither `deposit` nor `depositException`: `422 deposit_required`, and nothing occupies the slot (BR-SEN-09). With `depositException` from an Admin, the booking is confirmed with `depositException: true` and the full balance due; from anyone else, `403 admin_only`. Sending both `deposit` and `depositException` is `400`. *(Added 2026-11-10.)* An allocation above the payment's available funds, or above the new charge, returns `422 allocation_exceeds_available_funds` or `allocation_exceeds_charge_balance`; an expired or already used upload, `422 evidence_upload_expired` or `409 upload_already_used`.
  3. `startAt` has passed or is closer than the booking lead time: `422 slot_in_past` or `booking_lead_not_met`.
  4. Inactive service or resource, a resource incompatible with the service, or a slot outside the open windows: `422 inactive_service`, `inactive_resource`, `incompatible_resource` or `outside_open_hours`.
  5. The future-booking limit is reached: `422 future_booking_limit_reached` (BR-CLI-10).
  6. The slot is occupied when the claim is inserted: `409 slot_unavailable` (INV-DISP-01).
- *(Updated 2026-11-10.)* The `deposit` input is the additive extension this section announced. A payment is recorded before the booking, with `POST /payments` and no allocation, because a verified payment may exist without allocations (BR-COB-02); the booking then allocates it explicitly.

**`POST /bookings/{id}/cancel` — CU-08.**

- **Input:** `cause` (`CUSTOMER_REQUEST` or `BUSINESS_OPERATIONAL`); `reason`, required for a business cause (`400` otherwise, BR-CAN-06); `acceptLateConsequence`; optional `adminException`.
- **Allowed from** `HOLD`, `PENDING_PAYMENT_REVIEW` and `CONFIRMED`, including partial-deposit waiting; any other status returns `409 state_changed`. Cancelling a `HOLD` from the CRM follows the proposal in [INV §2.1](../product-specs/uc-03/invariants.md#21-allowed-transitions).
- **Late changes:** a customer-requested cancellation inside the notice window needs `acceptLateConsequence: true` or an Admin exception; otherwise `422 late_change_requires_acceptance` with the `lateChange` details. The executed change records one late cancellation (BR-CLI-12). A business-caused cancellation never counts as a late change.
- **Effects:** releases the slot at once and suppresses reminders, while any review or refund continues separately (BR-CAN-04); never moves money. The response is the cancelled `BookingDetail`.

**`POST /bookings/{id}/reschedule` — CU-09.**

- **Input:** `cause`, new `startAt`, optional `resourceId` and `serviceId`, `acceptLateConsequence`, optional `adminException` for a late consequence or the reschedule limit.
- **Allowed from** `CONFIRMED` only (CU-09 precondition); otherwise `409 state_changed`.
- **Checks:** the target is checked without releasing the current slot; a failure leaves the booking intact (BR-CAN-08). The limit returns `422 reschedule_limit_reached` without an Admin exception. Late handling is the same as for cancellation and records a late reschedule.
- **Result:** `200` with the moved booking, still `CONFIRMED`, the previous slot, `lateChange` and *(added 2026-11-10)* `supplementalDeposit`: `null`, or the additional amount the destination requires beyond the verified deposit. It is requested afterwards and never undoes the move or cancels the booking (BR-CAN-10, CU-09 A3); evidence for it uses `POST /bookings/{bookingId}/payment-reviews` and its state is `supplementalDepositState` ([API-DM-21](#api-dm-21-initial-deposit-supplemental-deposit-credit-outcome-and-cash-are-separate-fields)).

**`POST /bookings/{id}/outcome` and `/outcome-correction` — CU-10.**

- `outcome` is `COMPLETED`, allowed from the start instant, or `NO_SHOW`, from start + 15 minutes; earlier returns `422 too_early_for_outcome` (BR-RES-10–11). Only from `CONFIRMED`.
- A correction switches `COMPLETED` ↔ `NO_SHOW`, needs a `reason` and respects the destination's timing guard (BR-RES-12). Neither endpoint records or changes payments; "complete and collect" in the CRM is this call plus `POST /payments` ([§7.8](#78-payments-verified-payments-and-explicit-allocation)). A `COMPLETED` booking may still have a balance due (INV-RES-05).

**`POST /bookings/{id}/remainder-walk-ins` — CU-10 A5.** For a booking completed or marked no-show early, it creates a CRM booking inside the private remainder of the same resource, adjusting the remainder atomically (BR-RES-17). A slot outside the remainder returns `422 not_in_private_remainder`. The same customer, deposit and policy checks as `POST /bookings` apply; *(added 2026-11-10)* the request therefore accepts the same `acknowledgeBlockedCustomer`, `depositException` and `deposit` inputs, and the result is `CONFIRMED` or `PENDING_PAYMENT_REVIEW` under the same rules.

### 7.6 `customers`: customers, restrictions and incidents

| Method and path | Operation | Permission | Notes |
|---|---|---|---|
| `GET /customers?query` | `listCustomers` | `schedule.view` | Name fragment or phone prefix; cursor pagination |
| `POST /customers` | `createCustomer` | `customers.manage` | Name required, phone optional; `409 phone_already_registered` within the tenant (DM-03) |
| `GET /customers/{customerId}` | `getCustomer` | `schedule.view` | Preferences, deletion status, current restriction and indicators |
| `PATCH /customers/{customerId}` | `updateCustomer` | `customers.manage` | Name; a phone only if the customer has none, otherwise `422 phone_change_not_supported` ([API-Q-03](#13-decisions-and-open-questions)) |
| `GET /customers/{customerId}/restrictions` | `listCustomerRestrictions` | `schedule.view` | History, newest first |
| `POST /customers/{customerId}/restrictions` | `applyCustomerRestriction` | `customers.restrict` | `FULL_PREPAYMENT` or `BLOCKED` with a reason; closes any active one first, keeping at most one (DM-18) |
| `POST /customers/{customerId}/restrictions/current/removal` | `removeCustomerRestriction` | `customers.restrict` | With a reason; `409 no_active_restriction` if none |
| `GET`, `POST /customers/{customerId}/incidents` | `listCustomerIncidents`, `createCustomerIncident` | `schedule.view`, `customers.manage` | Other operational incidents, linked to a booking; never a no-show (DM-17) |

- **Indicators are derived** (**Defined:** [ERD §6.4](./erd.md#64-module-2--customers), BR-CLI-06–07, BR-CLI-12): `noShowCount` counts the customer's current `NO_SHOW` bookings as requester; `lateCancellationCount` and `lateRescheduleCount` come from booking events; `problematic` is `true` from two no-shows and restricts nothing.
- **Notice preferences are read-only here.** The customer changes them over WhatsApp (CU-19); recording consent given in person from the CRM is still a proposal in UC-02, so no endpoint changes them.
- **Deletion:** a customer with `deletionStatus: REQUESTED` stays visible so personnel can resolve their bookings and money before `deletionDueAt` (BR-DAT-08). After execution, the name and phone may be `null` (BR-DAT-03).

### 7.7 `payments`: evidence and human review

> **Added 2026-11-10** by author decision D-1 ([§14.1](#141-scope-differences-with-the-rewritten-issue-11)): the priority money operations are specified here, in §7.8–§7.10 and in the OpenAPI `payments` tag. Proposed for team review. There is no gateway or bank API: every verification is a person checking the account (BR-SEN-07, BR-SEN-08).

| Method and path | Operation | Permission | Notes |
|---|---|---|---|
| `POST /payment-evidence-uploads` | `uploadPaymentEvidence` | `payments.record` | Multipart `file`; owner command of `payments`, stored through `assets`. Returns `EvidenceUpload` with `expiresAt` |
| `POST /bookings/{bookingId}/payment-reviews` | `submitPaymentEvidence` | `payments.record` | `workflows` with `payments`, `bookings`, `assets`. An upload ID or typed transfer details; goes straight to human review |
| `GET /payment-reviews?status&bookingId` | `listPaymentReviews` | `payments.view` | Queue, oldest first, `PENDING` by default; cursor pagination. Composition of `payments` and `bookings` |
| `GET /payment-reviews/{reviewId}` | `getPaymentReview` | `payments.view` | Same composition |
| `GET /payment-reviews/{reviewId}/evidence` | `getPaymentReviewEvidence` | `payments.view` | The file, with `Cache-Control: private, no-store`; `409 evidence_unavailable` for text evidence or a file deleted under retention (BR-DAT-03) |
| `POST /payment-reviews/{reviewId}/approve` | `approvePaymentReview` | `payments.verify` | `workflows` with `payments`, `bookings`, `notifications` |
| `POST /payment-reviews/{reviewId}/reject` | `rejectPaymentReview` | `payments.verify` | Same coordinator |

### API-DM-19: Evidence reaches people through review; only a human decision approves or rejects

- **Defined:** A `PaymentReview` is human evaluation of evidence; a `Payment` is verified money; rejected evidence creates no payment (BR-COB-04, INV-PAY-10). Credit needs human verification and explicit allocation (BR-SEN-07). The agent attaches evidence but never approves (BR-COB-07, INV-PAY-04). Screening only routes evidence (BR-SEN-14–16, [§10.1](#101-receipt-evidence-screening-is-not-human-review)). Only human rejections count for BR-SEN-10. The attempt boundary after a decision is pending (P-40).
- **Rule (Proposed):**
  - **Upload first, then reference.** Files enter only through `POST /payment-evidence-uploads`; a review or a CRM booking references the upload ID in JSON. Every command stays JSON with one idempotency fingerprint, and `POST /bookings` can attach evidence in the same transaction that creates the occupancy (BR-SEN-09). An upload is private, proves nothing and is not a review; one upload backs one review (`409 upload_already_used`). An upload not linked before `expiresAt`, proposed at 24 hours, is deleted ([API-Q-12](#13-decisions-and-open-questions)). Media types and size limits are the CON-03 storage contract (`400 unsupported_media_type`, `file_too_large`).
  - **Evidence from the CRM.** Personnel attach what a customer gave them for a booking that still occupies or has a balance. The server derives `purpose`: `INITIAL_DEPOSIT` for an unconfirmed booking, `SUPPLEMENTAL_DEPOSIT` when a supplement is requested, otherwise `BALANCE`. It goes to human review without preliminary screening (`arrivedVia: CRM_SUBMISSION`), as CU-03 CRM step 2b describes the CRM receipt ([API-Q-17](#13-decisions-and-open-questions)). A `HOLD` receives evidence only over WhatsApp: `422 hold_evidence_via_whatsapp`, because [INV §2.1](../product-specs/uc-03/invariants.md#21-allowed-transitions) gives `HOLD → PENDING_PAYMENT_REVIEW` to the customer only. An `EXPIRED` or `CANCELLED` booking returns `422 booking_released`: verified late money is recorded as a payment without allocation and never revives the slot (BR-COB-12, BR-SEN-16).
  - **`arrivedVia` is routing, not a verdict.** Values: `PLAUSIBLE_FILE`, `ESCALATED_AFTER_TWO_ATTEMPTS`, `SCREENING_INCONCLUSIVE` (an uncertain result and a technical failure, which BR-SEN-15 treats alike), `TEXT_FALLBACK` and `CRM_SUBMISSION`. They tell personnel what to look at; none says "rejected by AI" or "verified by AI". The screening result values themselves belong to CON-03.
  - **P-40 is not assumed.** A review exposes no attempt counter, and neither decision says whether a next file would be a first or a second attempt.
  - **Approval** records that a person checked the actual credit: `verifiedAmount` (what was credited, never `declaredAmount`), the account that received it (by default the expected one; `422 receiving_account_required` if the review has none), and explicit `allocations`, which may be `[]` with an `unallocatedReason`. It creates exactly one `TRANSFER` payment linked to the review. Only the listed allocations reduce balances; when they bring an unconfirmed booking's initial deposit to its threshold, the booking is confirmed once (`bookingEffect: CONFIRMED`). With no allocation, the booking shows `AWAITING_ALLOCATION` ([API-Q-13](#13-decisions-and-open-questions)).
  - **Rejection** records a `reason` and creates no payment. For initial evidence without verified partial funds, the first distinct human rejection opens the 15-minute window (`CORRECTION_WINDOW_OPENED`), and a second may cancel before start after the rechecks of BR-SEN-10 (`CANCELLED`, with notices). A technical duplicate is not distinct. A supplemental or balance review, or a booking with verified partial funds, leaves the booking unchanged (`NONE`; BR-SEN-11, CU-09 A3).
  - **Errors:** `409 review_already_decided` when the review is no longer pending, including the loser of two simultaneous approvals (EJ-20); `409 state_changed` when the booking changed and the decision cannot apply as sent; the allocation reasons of [§7.8](#78-payments-verified-payments-and-explicit-allocation).
- **Example:** CU-03 A4 ending well. A second unrelated screenshot is escalated; Staff find $3,000 in the business account, approve with one allocation, and the booking is confirmed ([§8](#8-representative-examples)).

### 7.8 `payments`: verified payments and explicit allocation

> **Added 2026-11-10** by author decision D-1. Proposed for team review.

| Method and path | Operation | Permission | Notes |
|---|---|---|---|
| `GET /receiving-accounts` | `listReceivingAccounts` | `payments.view` | To choose the account that actually received a transfer. Managing accounts stays in [§11.2](#112-next-contract-increment) |
| `GET /payments?customerId&bookingId&method&availableOnly&from&to` | `listPayments` | `payments.view` | Newest verification first; cursor pagination; `availableOnly` finds funds still to allocate |
| `POST /payments` | `recordPayment` | `payments.record` for cash, `payments.verify` for a transfer | `workflows` with `payments`, `bookings`, `notifications` |
| `GET /payments/{paymentId}` | `getPayment` | `payments.view` | With its allocations |
| `POST /payments/{paymentId}/allocations` | `allocatePayment` | `payments.allocate` | Same coordinator |
| `POST /payment-allocations/{allocationId}/reversal` | `reversePaymentAllocation` | `payments.allocate` | Owner command of `payments` |

### API-DM-20: A payment is verified money; only listed allocations reduce a balance

- **Defined:** A payment is verified commercial money with a known origin and may have no allocations (BR-COB-02, INV-PAY-05). Cash is verified when the person receiving it records it; a transfer, when someone checks the credit; neither needs an image (BR-COB-05, BR-COB-06, BR-COB-08). Allocations are explicit, atomic, idempotent and capped by charge balance and available funds (BR-COB-03, BR-COB-17, INV-PAY-07). Cash needs an open session, or the configured automatic opening (BR-CAJA-03, INV-CAJA-08). Possible manual duplicates are kept and flagged (INV-PAY-08, a proposal in UC-03).
- **Rule (Proposed):**
  - **`POST /payments`** takes `method`, `amount` (greater than zero), `commercialOrigin`, optional `bookingId` and `customerId`, `receivingAccountId` (required for a transfer and absent for cash, otherwise `400`), optional `allocations` and `unallocatedReason`. The payment, its cash movement and its allocations commit together; on any refusal nothing is recorded.
  - **Cash.** With automatic opening configured, the first cash payment opens the session (`cashSession.openedByThisPayment: true`); otherwise `409 cash_session_not_open`. Collection and close are serialized: if the close commits first, the payment needs a new session (CU-13 A4). The payment links its movement once, so the same money is never counted twice.
  - **Allocation** is always a list the person chose: `chargeId` and `amount`, up to 20 items, all or nothing, across bookings of the same tenant when needed. Each item is checked against the current balance and available funds (`422 allocation_exceeds_charge_balance` or `allocation_exceeds_available_funds`, with `allocationLimit`; [API-DM-18](#api-dm-18-money-operations-rely-on-state-guards-and-caps-the-cash-close-and-adjustments-add-a-revision-precondition)). When allocations to the service charge of an unconfirmed booking reach its initial-deposit threshold, the booking is confirmed in the same transaction; for a `HOLD` paid at the counter this follows the personnel row that [INV §2.1](../product-specs/uc-03/invariants.md#21-allowed-transitions) still marks as a proposal. The response returns the payment and every affected `BookingSummary`.
  - **Reversal** marks an allocation `REVERSED` with a reason and frees its funds. It never changes a booking status: no automatic unconfirmation or cancellation ([API-Q-14](#13-decisions-and-open-questions)). A second reversal returns `409 allocation_already_reversed`.
  - **Possible duplicates** appear in `possibleDuplicateOf` and never block the payment; the matching criterion is implementation.
  - Recording corrections and refunds stay in [§11.2](#112-next-contract-increment). `refundedAmount` is already part of `Payment`, so `availableAmount` keeps its meaning when they arrive.

### 7.9 `payments`: booking financial state

> **Added 2026-11-10** by author decision D-2. Proposed for team review.

| Method and path | Operation | Permission | Notes |
|---|---|---|---|
| `GET /bookings/{bookingId}/financial-state` | `getBookingFinancialState` | `payments.view` | Composition of `payments` and `bookings`; tag `payments` because the state it shows is financial |

### API-DM-21: Initial deposit, supplemental deposit, credit, outcome and cash are separate fields

- **What:** The rewritten Issue asks to represent pending review, partial-deposit waiting and supplemental deposit separately from credit, service outcome and physical cash balance.
- **Defined:** The booking, the charge and the payment are kept apart, and the register records where physical cash is (UC-03 §10). Booking and payment state are independent (INV-RES-05). A supplemental deposit after a reschedule is requested afterwards and never auto-cancels (BR-CAN-10, BR-SEN-10, CU-09 A3). Transfers are never added to physical cash (BR-CAJA-07). A price increase is a `SUPPLEMENT` charge linked to its change request ([ERD `Charge`](./erd.md#charge)).
- **Rule (Proposed):** each concept has one place:

| Concept | Field | Where | Why there |
|---|---|---|---|
| Service outcome | `status` (`COMPLETED`, `NO_SHOW`) | `BookingSummary` | Only `bookings` changes it, and it says nothing about money (BR-COB-09) |
| Initial deposit: review, correction, awaiting allocation, partial, met | `depositState` | `BookingSummary`; amounts in `deposit` of the financial state | It governs confirmation and occupancy, so the agenda needs it on every booking |
| Supplemental deposit after a reschedule | `supplementalDepositState` | `BookingSummary`; amounts in `supplementalDeposit` and in `RescheduleResult` | The booking is already `CONFIRMED`. Folding the supplement into `depositState` would show a confirmed booking as `UNDER_REVIEW` or `PARTIAL`, which the CRM reads as unconfirmed and BR-SEN-10 could treat as releasable. A separate field keeps both meanings and is additive (API-DM-16) |
| Credit: verified money and its allocations | `charges`, `payments`, `balanceDue`, `unallocatedLinkedFunds`, `pendingReviewIds` | Financial state only | Several payments, methods and allocations per booking are too heavy for every agenda row; one read composition above `payments` and `bookings` serves the detail |
| Physical cash balance | `totals.expectedCash` | `CashSession` only, never a booking | It belongs to the tenant's shared register. A booking's money may be a transfer, and a per-booking cash figure would mix where money is with what is owed (BR-CAJA-07, INV-CAJA-04) |

  - `deposit.required` is the initial threshold; `supplementalDeposit.required` is the additional amount beyond the verified deposit; `BookingSummary.requiredDeposit` stays the requirement of the current conditions, which after a reschedule is their sum. How the supplemental requirement is stored stays ERD T-03/T-05.
  - `supplementalDepositState` is `REQUESTED` (owed, no evidence in review), `UNDER_REVIEW` or `MET`. A rejected supplemental receipt returns to `REQUESTED`, with no correction window and no automatic cancellation. No operation closes an unpaid supplement without collecting it ([API-Q-16](#13-decisions-and-open-questions)).
  - Every amount is computed by the backend (BR-SEN-05); clients only display it.

### 7.10 `payments`: cash session

> **Added 2026-11-10** by author decision D-1. Cash is a `payments` subfeature ([modules MOD-DM-01](./modules.md#mod-dm-01-nine-business-modules-and-two-platform-modules)); every operation below is an owner command or query. Proposed for team review.

| Method and path | Operation | Permission | Notes |
|---|---|---|---|
| `GET /cash-sessions/current` | `getCurrentCashSession` | `payments.view` | The open session or `null`, the previous close and whether automatic opening is on |
| `GET /cash-sessions` | `listCashSessions` | `payments.view` | Newest first; cursor pagination |
| `GET /cash-sessions/{sessionId}` | `getCashSession` | `payments.view` | Totals, close and adjustments |
| `GET /cash-sessions/{sessionId}/movements` | `listCashMovements` | `payments.view` | In order of occurrence; cursor pagination |
| `POST /cash-sessions` | `openCashSession` | `cash.operate` | `409 cash_session_already_open` (INV-CAJA-01) |
| `POST /cash-sessions/{sessionId}/movements` | `recordCashMovement` | `cash.movements` | `CASH_IN` or `CASH_OUT` with a reason; `409 cash_session_not_open` |
| `POST /cash-sessions/{sessionId}/close` | `closeCashSession` | `cash.operate` | `expectedRevision` and `countedAmount`; `409 stale_revision` or `cash_session_not_open` |
| `POST /cash-sessions/{sessionId}/adjustments` | `recordCashAdjustment` | Admin only | `expectedRevision`, a non-zero signed amount and a reason; `409 cash_session_not_closed` or `stale_revision` |

### API-DM-22: One shared cash session with physical totals; transfers shown apart

- **Defined:** BR-CAJA-01–11, INV-CAJA-01–09, BR-COB-11 and EJ-21, EJ-36–39.
- **Rule (Proposed):**
  - **Totals.** `cashPayments`, `cashRefunds`, `cashIn`, `cashOut` and `expectedCash`, which is opening cash plus signed physical movements, each cash payment counted once through its movement. `verifiedTransfers` while the session was open is shown apart and never added (EJ-37).
  - **Opening.** The first session declares `openingAmount`. Later, `getCurrentCashSession` shows the previous counted cash; a different amount needs `reconciliationReason` (`422 opening_difference_requires_reason`) and is recorded in `openingReconciliation` without touching the closed session. Accepting a difference with a reason is a proposal ([API-Q-15](#13-decisions-and-open-questions)). Automatic opening takes the previous counted cash (EJ-39).
  - **Close.** Manual, with `countedAmount` and the `expectedRevision` the person reviewed ([API-DM-18](#api-dm-18-money-operations-rely-on-state-guards-and-caps-the-cash-close-and-adjustments-add-a-revision-precondition)). It records who closed, when, expected and counted cash and the signed `difference`, which is allowed (BR-CAJA-06). Unpaid bookings never block it (BR-CAJA-08). The session survives midnight until then (BR-CAJA-11) and is immutable afterwards: no endpoint changes a closed session or its movements.
  - **Movements.** `CASH_IN` and `CASH_OUT` carry a reason and the responsible person, only in the open session. `PAYMENT` and `REFUND` movements are created by those operations, never posted here.
  - **Adjustments.** Admin only (`403 admin_only`), only on a closed session, with a non-zero signed amount, a reason and an optional link to the movement or payment. They append to `adjustments` and `adjustmentsTotal`; `close` stays as recorded (EJ-21). They are not a general financial log, a refund or a transfer correction (BR-COB-11).
  - Cash settings, such as automatic opening, remain configuration in [§11.2](#112-next-contract-increment).

## 8. Representative examples

The same examples are under `components.examples` in the [OpenAPI file](./api-contracts.openapi.yaml). Each block below names the schema it satisfies; both sets were validated against the schemas ([§15](#15-traceability)). Identifiers are illustrative; times are in UTC for a tenant in `America/Argentina/Buenos_Aires`.

**Create a walk-in for a new customer** — `POST /api/v1/tenants/2d4c6e8a-1b3d-4f5a-9c7e-0a2b4c6d8e01/bookings`, with `Idempotency-Key: 9f6c1d2e-walkin-0001` and `X-CSRF-Token`:

<!-- example: CreateCrmBookingRequest -->
```json
{
  "customer": { "newCustomer": { "fullName": "Juan Pérez", "phone": null } },
  "serviceId": "8b1d3f5a-7c9e-4b2d-8f1a-3c5e7a9b1d3f",
  "resourceId": "1f3a5c7e-9b2d-4f6a-8c1e-3a5c7e9b2d4f",
  "startAt": "2026-11-10T13:00:00Z"
}
```

`201 Created`, with `Location` pointing to the booking:

<!-- example: BookingDetail -->
```json
{
  "booking": {
    "id": "c4e6a8b0-2d4f-4a6c-8e0b-2d4f6a8c0e2a",
    "status": "CONFIRMED",
    "origin": "CRM",
    "customer": { "id": "e2a4c6e8-0b2d-4f6a-8c0e-2a4c6e8a0b2d", "fullName": "Juan Pérez" },
    "attendeeName": null,
    "service": { "id": "8b1d3f5a-7c9e-4b2d-8f1a-3c5e7a9b1d3f", "name": "Corte" },
    "resource": { "id": "1f3a5c7e-9b2d-4f6a-8c1e-3a5c7e9b2d4f", "name": "Martín" },
    "startAt": "2026-11-10T13:00:00Z",
    "endAt": "2026-11-10T13:30:00Z",
    "agreedPrice": "8000.00",
    "requiredDeposit": null,
    "depositState": "NOT_REQUIRED",
    "supplementalDepositState": null,
    "pendingOperationalClose": false,
    "holdExpiresAt": null
  },
  "attendeePhone": null,
  "noticeMinutes": 600,
  "depositRefundPolicy": null,
  "blockedException": false,
  "depositException": false,
  "createdByMembershipId": "0b6f1e3c-2a9d-4c51-8e3f-7a1b2c3d4e5f",
  "cancelReason": null,
  "createdAt": "2026-11-10T12:58:41Z",
  "updatedAt": "2026-11-10T12:58:41Z"
}
```

**The same slot taken by a concurrent HOLD** — `409 Conflict`:

<!-- example: Problem -->
```json
{
  "type": "urn:agendoxa:problem:conflict",
  "title": "The slot is no longer available",
  "status": 409,
  "code": "conflict",
  "reason": "slot_unavailable",
  "requestId": "req_01JC8Q5D0K7"
}
```

**Cancel inside the notice window without acceptance** — `POST …/bookings/{bookingId}/cancel` with `{ "cause": "CUSTOMER_REQUEST" }` returns `422`:

<!-- example: Problem -->
```json
{
  "type": "urn:agendoxa:problem:rule-violation",
  "title": "The change is inside the notice window",
  "status": 422,
  "code": "rule_violation",
  "reason": "late_change_requires_acceptance",
  "detail": "Confirm that the customer accepted the consequence, or ask an Admin for an exception.",
  "requestId": "req_01JC8Q6H3R5",
  "lateChange": {
    "noticeMinutes": 600,
    "startAt": "2026-11-10T21:00:00Z",
    "depositRefundPolicy": "NO_MONEY_BACK"
  }
}
```

After the customer accepts, the CRM sends it again with a new idempotency key:

<!-- example: CancelBookingRequest -->
```json
{ "cause": "CUSTOMER_REQUEST", "acceptLateConsequence": true }
```

**A Staff member requests the deposit exception** — `403 Forbidden`:

<!-- example: Problem -->
```json
{
  "type": "urn:agendoxa:problem:forbidden",
  "title": "The operation is not allowed for this role",
  "status": 403,
  "code": "forbidden",
  "reason": "admin_only",
  "detail": "Only an Admin can confirm a booking without its required deposit.",
  "requestId": "req_01JC8Q3M2X9"
}
```

**A booking of another tenant, reached by changing the ID** — `404 Not Found`, the same answer as for a booking that does not exist (EJ-01):

<!-- example: Problem -->
```json
{
  "type": "urn:agendoxa:problem:not-found",
  "title": "Not found",
  "status": 404,
  "code": "not_found",
  "requestId": "req_01JC8Q4B6T1"
}
```

**Invalid phone in a new customer** — `400 Bad Request`:

<!-- example: Problem -->
```json
{
  "type": "urn:agendoxa:problem:validation",
  "title": "The request does not match the contract",
  "status": 400,
  "code": "validation",
  "requestId": "req_01JC8Q2W7N4",
  "errors": [
    {
      "path": "/customer/newCustomer/phone",
      "message": "Must be an E.164 phone number, such as +5493794111222"
    }
  ]
}
```

**Effective policy of a court whose deposit is disabled on the resource** — `GET …/booking-policies/effective?serviceId=…&resourceId=…`:

<!-- example: EffectiveBookingPolicy -->
```json
{
  "serviceId": "3a1b5c7d-9e2f-4a6b-8c0d-1e3f5a7b9c2d",
  "resourceId": "5c7e9a1b-3d5f-4b7a-9c1e-3f5a7b9d1e3f",
  "noticeMinutes": 600,
  "bookingLeadMinutes": 0,
  "reminderLeadMinutes": 180,
  "deposit": { "mode": "DISABLED", "value": null },
  "depositRefundPolicy": "NO_MONEY_BACK",
  "rescheduleLimit": null,
  "futureBookingLimit": null,
  "sources": {
    "noticeMinutes": "DEFAULT",
    "bookingLeadMinutes": "DEFAULT",
    "reminderLeadMinutes": "TENANT",
    "deposit": "RESOURCE",
    "depositRefundPolicy": "TENANT",
    "rescheduleLimit": "DEFAULT",
    "futureBookingLimit": "DEFAULT"
  }
}
```

**Customer with two no-shows and no restriction** — the indicator shows, nothing is restricted (EJ-33):

<!-- example: CustomerDetail -->
```json
{
  "id": "e2a4c6e8-0b2d-4f6a-8c0e-2a4c6e8a0b2d",
  "fullName": "Lucía Fernández",
  "phone": "+5493794111222",
  "reminderPreference": "ACCEPTED",
  "waitlistPreference": "REFUSED",
  "deletionStatus": "NONE",
  "deletionDueAt": null,
  "currentRestriction": null,
  "indicators": {
    "noShowCount": 2,
    "lateCancellationCount": 1,
    "lateRescheduleCount": 0,
    "problematic": true
  },
  "createdAt": "2026-10-02T15:20:00Z"
}
```

**Public profile for the landing** — `GET /api/v1/public/businesses/barberia-centro`, without a session:

<!-- example: PublicBusinessProfile -->
```json
{
  "name": "Barbería Centro",
  "slug": "barberia-centro",
  "timezone": "America/Argentina/Buenos_Aires",
  "branding": null,
  "whatsappUrl": "https://wa.me/5493794000000",
  "regularHours": [
    { "weekday": "TUESDAY", "startTime": "09:00", "endTime": "13:00" },
    { "weekday": "TUESDAY", "startTime": "16:00", "endTime": "20:00" }
  ]
}
```

**Money flows** *(added 2026-11-10)*. One WhatsApp booking for a $10,000 service with a $3,000 deposit, created at 15:00 with a HOLD until 15:10.

**A second clearly unrelated screenshot, escalated to human review** — `GET …/payment-reviews/{reviewId}`. It is not a rejection; nothing says what the AI thought of the file (BR-SEN-14):

<!-- example: PaymentReview -->
```json
{
  "id": "9d1f3a5c-7e9b-4d2f-8a4c-6e8a0b2d4f6a",
  "status": "PENDING",
  "purpose": "INITIAL_DEPOSIT",
  "arrivedVia": "ESCALATED_AFTER_TWO_ATTEMPTS",
  "booking": {
    "id": "7b9d1f3a-5c7e-4a9b-8d1f-3a5c7e9b1d2e",
    "status": "PENDING_PAYMENT_REVIEW",
    "startAt": "2026-11-12T14:00:00Z",
    "customer": { "id": "e2a4c6e8-0b2d-4f6a-8c0e-2a4c6e8a0b2d", "fullName": "Lucía Fernández" },
    "service": { "id": "3c5e7a9b-1d3f-4b5a-9c7e-1f3a5c7e9b2d", "name": "Color" }
  },
  "changeRequestId": null,
  "evidence": { "kind": "FILE", "mediaType": "image/jpeg", "text": null, "receivedAt": "2026-11-10T15:08:12Z" },
  "declaredAmount": null,
  "expectedReceivingAccount": {
    "id": "5a7c9e1b-3d5f-4a7c-9e1b-3d5f7a9c1e3b",
    "label": "Cuenta del negocio",
    "holderName": "Barbería Centro"
  },
  "submittedAt": "2026-11-10T15:08:19Z",
  "decision": null
}
```

**Staff find the credit in the account and allocate it** — `POST …/payment-reviews/{reviewId}/approve`:

<!-- example: ApprovePaymentReviewRequest -->
```json
{
  "verifiedAmount": "3000.00",
  "receivingAccountId": null,
  "allocations": [{ "chargeId": "6c8e0a2b-4d6f-4c8e-8a2b-4d6f8a0c2e4b", "amount": "3000.00" }]
}
```

`200 OK`: one verified payment, one allocation, and the booking confirmed in the same transaction (BR-SEN-07, EJ-20):

<!-- example: PaymentReviewDecisionResult -->
```json
{
  "review": {
    "id": "9d1f3a5c-7e9b-4d2f-8a4c-6e8a0b2d4f6a",
    "status": "APPROVED",
    "purpose": "INITIAL_DEPOSIT",
    "arrivedVia": "ESCALATED_AFTER_TWO_ATTEMPTS",
    "booking": {
      "id": "7b9d1f3a-5c7e-4a9b-8d1f-3a5c7e9b1d2e",
      "status": "CONFIRMED",
      "startAt": "2026-11-12T14:00:00Z",
      "customer": { "id": "e2a4c6e8-0b2d-4f6a-8c0e-2a4c6e8a0b2d", "fullName": "Lucía Fernández" },
      "service": { "id": "3c5e7a9b-1d3f-4b5a-9c7e-1f3a5c7e9b2d", "name": "Color" }
    },
    "changeRequestId": null,
    "evidence": { "kind": "FILE", "mediaType": "image/jpeg", "text": null, "receivedAt": "2026-11-10T15:08:12Z" },
    "declaredAmount": null,
    "expectedReceivingAccount": {
      "id": "5a7c9e1b-3d5f-4a7c-9e1b-3d5f7a9c1e3b",
      "label": "Cuenta del negocio",
      "holderName": "Barbería Centro"
    },
    "submittedAt": "2026-11-10T15:08:19Z",
    "decision": {
      "decidedByMembershipId": "4d6f8a0c-2e4a-4d6f-8a0c-2e4a6c8e0a2b",
      "decidedAt": "2026-11-10T15:31:05Z",
      "paymentId": "2b4d6f8a-0c2e-4b6d-8f0a-2c4e6a8b0d1f",
      "rejectionReason": null
    }
  },
  "payment": {
    "id": "2b4d6f8a-0c2e-4b6d-8f0a-2c4e6a8b0d1f",
    "method": "TRANSFER",
    "amount": "3000.00",
    "commercialOrigin": "Seña de la reserva del 12/11",
    "bookingId": "7b9d1f3a-5c7e-4a9b-8d1f-3a5c7e9b1d2e",
    "customerId": "e2a4c6e8-0b2d-4f6a-8c0e-2a4c6e8a0b2d",
    "receivingAccountId": "5a7c9e1b-3d5f-4a7c-9e1b-3d5f7a9c1e3b",
    "paymentReviewId": "9d1f3a5c-7e9b-4d2f-8a4c-6e8a0b2d4f6a",
    "verifiedByMembershipId": "4d6f8a0c-2e4a-4d6f-8a0c-2e4a6c8e0a2b",
    "verifiedAt": "2026-11-10T15:31:05Z",
    "allocatedAmount": "3000.00",
    "refundedAmount": "0.00",
    "availableAmount": "0.00",
    "unallocatedReason": null,
    "cashMovementId": null,
    "possibleDuplicateOf": [],
    "allocations": [
      {
        "id": "8e0a2c4e-6a8b-4e0a-9c4e-6a8b0d2f4a6c",
        "paymentId": "2b4d6f8a-0c2e-4b6d-8f0a-2c4e6a8b0d1f",
        "chargeId": "6c8e0a2b-4d6f-4c8e-8a2b-4d6f8a0c2e4b",
        "bookingId": "7b9d1f3a-5c7e-4a9b-8d1f-3a5c7e9b1d2e",
        "amount": "3000.00",
        "status": "ACTIVE",
        "createdByMembershipId": "4d6f8a0c-2e4a-4d6f-8a0c-2e4a6c8e0a2b",
        "createdAt": "2026-11-10T15:31:05Z",
        "reversedByMembershipId": null,
        "reversedAt": null,
        "reversalReason": null
      }
    ]
  },
  "booking": {
    "id": "7b9d1f3a-5c7e-4a9b-8d1f-3a5c7e9b1d2e",
    "status": "CONFIRMED",
    "origin": "WHATSAPP",
    "customer": { "id": "e2a4c6e8-0b2d-4f6a-8c0e-2a4c6e8a0b2d", "fullName": "Lucía Fernández" },
    "attendeeName": null,
    "service": { "id": "3c5e7a9b-1d3f-4b5a-9c7e-1f3a5c7e9b2d", "name": "Color" },
    "resource": { "id": "1f3a5c7e-9b2d-4f6a-8c1e-3a5c7e9b2d4f", "name": "Martín" },
    "startAt": "2026-11-12T14:00:00Z",
    "endAt": "2026-11-12T15:30:00Z",
    "agreedPrice": "10000.00",
    "requiredDeposit": "3000.00",
    "depositState": "MET",
    "supplementalDepositState": null,
    "pendingOperationalClose": false,
    "holdExpiresAt": null
  },
  "bookingEffect": "CONFIRMED"
}
```

**A second member approves the same review at the same moment** — `409 Conflict`; there is still one payment (EJ-20):

<!-- example: Problem -->
```json
{
  "type": "urn:agendoxa:problem:conflict",
  "title": "The review was already decided",
  "status": 409,
  "code": "conflict",
  "reason": "review_already_decided",
  "detail": "Another member decided this review. Reload it to see the result.",
  "requestId": "req_01JC8Q7A1C2"
}
```

**A rejection when no credit is found** — `POST …/payment-reviews/{reviewId}/reject`:

<!-- example: RejectPaymentReviewRequest -->
```json
{ "reason": "No credit for this amount in the business account" }
```

**The rest of the price in cash at the counter** — `POST …/payments`, in an open session or with automatic opening (EJ-19):

<!-- example: RecordPaymentRequest -->
```json
{
  "method": "CASH",
  "amount": "7000.00",
  "commercialOrigin": "Saldo del servicio",
  "bookingId": "7b9d1f3a-5c7e-4a9b-8d1f-3a5c7e9b1d2e",
  "customerId": "e2a4c6e8-0b2d-4f6a-8c0e-2a4c6e8a0b2d",
  "receivingAccountId": null,
  "allocations": [{ "chargeId": "6c8e0a2b-4d6f-4c8e-8a2b-4d6f8a0c2e4b", "amount": "7000.00" }]
}
```

If another member already allocated $3,000 of a different payment to that charge, the request fails as a whole, with the current caps — `422`:

<!-- example: Problem -->
```json
{
  "type": "urn:agendoxa:problem:rule-violation",
  "title": "The allocation exceeds the charge balance",
  "status": 422,
  "code": "rule_violation",
  "reason": "allocation_exceeds_charge_balance",
  "detail": "The charge has 4000.00 left to cover. Nothing was recorded or allocated.",
  "requestId": "req_01JC8Q8F4D6",
  "allocationLimit": { "index": 0, "chargeBalance": "4000.00", "availableFunds": "7000.00" }
}
```

**After a reschedule to a dearer service** — `GET …/bookings/{bookingId}/financial-state`. The booking stays `CONFIRMED`, the initial deposit stays `MET` and the supplement is separate (BR-CAN-10, API-DM-21). The summary's `requiredDeposit` would now be `"4200.00"`, the sum of both:

<!-- example: BookingFinancialState -->
```json
{
  "bookingId": "7b9d1f3a-5c7e-4a9b-8d1f-3a5c7e9b1d2e",
  "bookingStatus": "CONFIRMED",
  "agreedPrice": "14000.00",
  "charges": [
    {
      "id": "6c8e0a2b-4d6f-4c8e-8a2b-4d6f8a0c2e4b",
      "kind": "SERVICE",
      "changeRequestId": null,
      "netAmount": "10000.00",
      "allocatedAmount": "3000.00",
      "balance": "7000.00"
    },
    {
      "id": "0d2f4a6c-8e0a-4d2f-9a6c-8e0a2c4e6a8b",
      "kind": "SUPPLEMENT",
      "changeRequestId": "b3d5f7a9-1c3e-4b5d-9f7a-1c3e5b7d9f1a",
      "netAmount": "4000.00",
      "allocatedAmount": "0.00",
      "balance": "4000.00"
    }
  ],
  "balanceDue": "11000.00",
  "deposit": {
    "required": "3000.00",
    "allocated": "3000.00",
    "missing": "0.00",
    "state": "MET",
    "exception": false,
    "correctionDeadlineAt": null
  },
  "supplementalDeposit": {
    "changeRequestId": "b3d5f7a9-1c3e-4b5d-9f7a-1c3e5b7d9f1a",
    "required": "1200.00",
    "allocated": "0.00",
    "missing": "1200.00",
    "state": "REQUESTED",
    "requestedAt": "2026-11-11T13:02:00Z"
  },
  "payments": [
    {
      "paymentId": "2b4d6f8a-0c2e-4b6d-8f0a-2c4e6a8b0d1f",
      "method": "TRANSFER",
      "amount": "3000.00",
      "allocatedHere": "3000.00",
      "verifiedAt": "2026-11-10T15:31:05Z"
    }
  ],
  "unallocatedLinkedFunds": "0.00",
  "pendingReviewIds": []
}
```

**Close the cash session** — `POST …/cash-sessions/{sessionId}/close`, with the revision of the totals the person reviewed (API-DM-18):

<!-- example: CloseCashSessionRequest -->
```json
{ "expectedRevision": 14, "countedAmount": "17000.00", "note": null }
```

`200 OK` for EJ-36 and EJ-37: $2,000 opening, $15,000 in cash payments, $1,000 other cash-in and $500 cash-out make $17,500 expected; $17,000 counted records −$500. The $20,000 in transfers are shown apart:

<!-- example: CashSession -->
```json
{
  "id": "a1c3e5f7-9b1d-4c3e-8f7a-9b1d3f5a7c9e",
  "status": "CLOSED",
  "openMode": "MANUAL",
  "openedAt": "2026-11-10T11:00:00Z",
  "openedByMembershipId": "0b6f1e3c-2a9d-4c51-8e3f-7a1b2c3d4e5f",
  "openingAmount": "2000.00",
  "previousSessionId": "f7a9c1e3-5b7d-4f9a-8c1e-3b5d7f9a1c3e",
  "openingReconciliation": { "previousCountedAmount": "2000.00", "difference": "0.00", "reason": null },
  "revision": 15,
  "totals": {
    "cashPayments": "15000.00",
    "cashRefunds": "0.00",
    "cashIn": "1000.00",
    "cashOut": "500.00",
    "expectedCash": "17500.00",
    "verifiedTransfers": "20000.00"
  },
  "close": {
    "closedAt": "2026-11-10T23:10:00Z",
    "closedByMembershipId": "0b6f1e3c-2a9d-4c51-8e3f-7a1b2c3d4e5f",
    "countedAmount": "17000.00",
    "expectedAmount": "17500.00",
    "difference": "-500.00",
    "note": null
  },
  "adjustments": [],
  "adjustmentsTotal": "0.00"
}
```

**A cash payment entered after the person reviewed the totals** — `409 Conflict`; nothing is closed, and the person reviews again before closing with a new idempotency key:

<!-- example: Problem -->
```json
{
  "type": "urn:agendoxa:problem:conflict",
  "title": "The cash session changed",
  "status": 409,
  "code": "conflict",
  "reason": "stale_revision",
  "detail": "A movement was recorded after you reviewed the totals. Review the expected cash again before closing.",
  "requestId": "req_01JC8Q9K2M8",
  "currentRevision": 15
}
```

## 9. Shared schemas in `packages/shared`

### API-DM-14: `packages/shared` holds the HTTP contracts, as Zod schemas, and nothing else

- **Defined:** `packages/shared` holds portable contracts and validation, never business logic, data access or secrets ([architecture §5](./target-architecture.md#5-monorepo-organization), [AGENTS.md](../../AGENTS.md#local-conventions-and-boundaries)). The existing `healthResponseSchema` and `HealthResponse` set the naming style.
- **Rule (Proposed):**
  - Each OpenAPI component becomes a Zod 4 schema named `<camelCaseName>Schema`, with its type `type <Name> = z.infer<typeof <name>Schema>`, for example `createCrmBookingRequestSchema` and `CreateCrmBookingRequest`.
  - Request objects are strict, so unknown fields fail as in the OpenAPI `additionalProperties: false`.
  - Inbound adapters in `apps/api` validate with these schemas and map the result to use-case inputs. Domain code never imports them ([modules §7.2](./modules.md#72-layer-rules)).
  - `apps/web` uses the same schemas to type its API client and to validate forms. That validation is only usability: the backend decides availability, prices, deposits and permissions.
  - Not in `packages/shared`: database rows, domain entities, permission-checking logic, error-to-HTTP mapping, or anything only one application uses.

| File (proposed) | Schemas | Used by |
|---|---|---|
| `src/contracts/common.ts` | `Uuid`, `Instant`, `LocalDate`, `LocalTime`, `Money`, `PositiveMoney`, `SignedMoney`, `NonZeroSignedMoney`, `Minutes`, `PhoneE164`, `Weekday`, `Reason`, `Page`, `TimeRange`, `NamedRef` | All of the below |
| `src/contracts/problem.ts` | `Problem`, `LateChangeNotice`, `AllocationLimit` | Web error handling; API error filter |
| `src/contracts/session.ts` | `SignInRequest`, `SessionView`, `MembershipSummary`, `TenantContextView` | Web sign-in and business selector |
| `src/contracts/tenants.ts` | `TenantProfile`, `UpdateTenantProfileRequest`, `PublicBusinessProfile`, `WeeklyHours` | CRM settings; landing |
| `src/contracts/catalog.ts` | `Service`, `Resource`, their create and update requests, `PublicService`, `DepositRule`, `TenantPolicyFields`, `OverridePolicyFields`, `BookingPolicy`, `EffectiveBookingPolicy`, `PolicySource`; calendars: `Calendar`, `WeeklyRules`, `AvailabilityException`, `CreateAvailabilityExceptionRequest`, `ResourceWindows` | CRM configuration, hours and blocks; landing |
| `src/contracts/bookings.ts` | `BookingStatus`, `DepositState`, `SupplementalDepositState`, `BookingSummary`, `BookingDetail`, `BookingEvent`, `FreeSlot`, `AgendaView`, `CustomerInput`, `AdminException`, `DepositInput`, `DepositAllocationItem`, the command requests, `RescheduleResult` | CRM agenda and booking actions |
| `src/contracts/customers.ts` | `CustomerSummary`, `CustomerDetail`, `CustomerIndicators`, `CreateCustomerRequest`, `UpdateCustomerRequest`, `Restriction`, `RestrictionKind`, the restriction requests, `Incident`, `CreateIncidentRequest` | CRM customers |
| `src/contracts/payments.ts` *(added 2026-11-10)* | Evidence: `EvidenceUpload`, `EvidenceInput`, `SubmitPaymentEvidenceRequest`, `PaymentReview`, `PaymentReviewStatus`, `ReviewArrival`, `ApprovePaymentReviewRequest`, `RejectPaymentReviewRequest`, `PaymentReviewDecisionResult`. Money: `PaymentMethod`, `Payment`, `PaymentAllocation`, `AllocationItem`, `RecordPaymentRequest`, `PaymentResult`, `AllocatePaymentRequest`, `ReverseAllocationRequest`, `AllocationResult`, `ReceivingAccount`. Financial state: `BookingFinancialState`, `ChargeView`, `InitialDeposit`, `SupplementalDeposit`. Cash: `CashSession`, `CashTotals`, `CashMovement`, `CashAdjustment`, `CurrentCashSessionView` and the cash requests | CRM review queue, collection and cash register |

Files follow the owner modules of [modules MOD-DM-01](./modules.md#mod-dm-01-nine-business-modules-and-two-platform-modules); calendar schemas live in `catalog.ts` because calendars belong to `catalog` *(reconciled 2026-11-10; the earlier `availability.ts` is merged)*, and cash schemas live in `payments.ts` for the same reason. The multipart `EvidenceUploadForm` is not a Zod schema: the API validates the file with the CON-03 storage rules. Adding these schemas is a [shared change](./modules.md#9-technical-autonomy-and-shared-changes) for `apps/web` and `apps/api`. They are created with the first endpoint that uses them, not all at once.

## 10. Internal consumers: the agent

### API-DM-15: The agent reuses module use cases in-process, not the HTTP API

- **Defined:** Agent tools call the same use cases as the CRM, with tenant and requester fixed by the validated WhatsApp connection; the model chooses neither (BR-AGT-02, BR-CH-05). The agent cannot verify transfers, infer no-shows, change cash records or obtain personnel privileges (BR-AGT-04). It may submit transfer evidence, which is recorded with its receipt time and preliminarily screened before any human review ([§10.1](#101-receipt-evidence-screening-is-not-human-review)); neither the file nor its screening proves payment (BR-COB-07, INV-PAY-04, INV-SEN-12). CON-01 lists the operations allowed to it ([modules §8.2](./modules.md#82-for-con-03-integration-contracts)).
- **Rule (Proposed):**
  - The agent has no HTTP credential, service account or endpoint of its own. It calls module facades and `workflows` coordinators inside the API process, through their plain public contracts ([modules MOD-DM-10](./modules.md#mod-dm-10-a-modules-public-surface-separates-contracts-from-nest-composition)): owners directly for reads, coordinators for composite changes, without pass-through wrappers ([modules §5.2](./modules.md#52-coordination-and-asynchronous-activation)). Authorization is the conversation's requester and never a personnel role.
  - What the customer sees is not the CRM view. A tool result never includes `currentRestriction`, `indicators`, `blockedException`, internal reasons or other labels (BR-AGT-03, INV-CLI-06). A `BLOCKED` customer is refused as when they cannot book, without the reason.
  - Tool input and output schemas belong to CON-03. They should reuse the `code` and `reason` values of [§5](#5-errors), so the agent and the CRM interpret refusals the same way.

> **Reconciled 2026-11-10:** the "Facade" column follows [modules §8.2](./modules.md#82-for-con-03-integration-contracts): waitlist is in `bookings`, and composite changes go through `workflows`.

| Operation for the requester | Facade | Equivalent CRM endpoint | Difference |
|---|---|---|---|
| Business information, services and prices | `tenants`, `catalog` | Public endpoints | Same data |
| Find free slots | `bookings` | `GET /free-slots` | Same search and lead time |
| Consult own future bookings | `bookings` | `GET /bookings` | Only bookings managed by the sender number (CU-07, INV-CAN-01) |
| Create a HOLD; confirm it without a deposit | `workflows` | None | WhatsApp only (BR-RES-03–04) |
| Cancel or reschedule own booking | `workflows` | `/cancel`, `/reschedule` | Always `CUSTOMER_REQUEST`; `acceptLateConsequence` only after the customer's explicit confirmation; never an Admin exception |
| Join the waitlist; claim an invitation | `bookings`, or `workflows` when the change spans owners | None | — |
| Read payment status | `payments` | Next increment | Customer-facing result only |
| Submit receipt evidence and have it preliminarily screened | `agent` screening adapter, then the protected `workflows` operation (`bookings`, `payments`, `assets`) | None | Routed to human review or to a replacement request as in [§10.1](#101-receipt-evidence-screening-is-not-human-review); it never verifies, credits or renews a deadline |
| Record notice preferences; request or withdraw deletion | `workflows` (`customers`, `bookings`, `audit`, and the deletion participants) | None | Customer channel only (CU-19, CU-23) |
| Escalate to a human with a summary | `messaging` | None | — |

**Never available to the agent:** recording or correcting outcomes, remainder walk-ins, restrictions and incidents, configuration, deposit and Admin exceptions, payment verification and allocation, approving or rejecting a review, cash operations and conversation control. These exist only as authenticated CRM endpoints.

### 10.1 Receipt evidence: screening is not human review

> **Added 2026-11-10** to reconcile with BR-SEN-14–16 and INV-SEN-12–13, and with the screening criterion of the rewritten [Issue #11](https://github.com/nanonoir/Agendoxa/issues/11).

- **Defined:** Evidence and its receipt time are recorded before processing; timeliness is judged by receipt, not by when screening ends (BR-SEN-16, INV-SEN-02). Screening checks only whether an image or PDF plausibly is a transfer receipt, never its authenticity or bank credit (BR-SEN-14, INV-SEN-12). The receipt and the screening record commit before the provider call, outside any transaction; the result is applied in a new transaction that rechecks current state ([modules §6.2](./modules.md#62-transactions)).

| Screening outcome (for timely evidence) | Effect on the booking | Customer is told | Human rejection? |
|---|---|---|---|
| Plausible receipt | Human review, `depositState: UNDER_REVIEW`; from a `HOLD`, the booking moves to `PENDING_PAYMENT_REVIEW` | Confirmation follows verification | No |
| First clearly unrelated file | No review; same deadline, no renewal of the `HOLD` or correction window | It does not look like a receipt; send a correct one | No |
| Second clearly unrelated attempt | Human review, without inactivity timeout, even if screening ends after the deadline | The attempts failed; wait for human review | No |
| Uncertain result or technical failure | Human review; never labelled unrelated | Confirmation follows verification, without claiming anyone checked the bank | No |
| Duplicate delivery of the same attempt | None; not another attempt | — | No |
| Text fallback after explicit inability to attach (BR-SEN-12) | Human review directly, no screening | Confirmation follows verification | No |

  Evidence received after the applicable deadline is kept for human financial handling and never revives a released slot (BR-SEN-16). Sources: BR-SEN-12, BR-SEN-14–16, INV-SEN-02, INV-SEN-12–13, [UC-02 CU-03](../product-specs/uc-02/use-cases.md#cu-03) step 5 and A4.

- **Rule (Proposed):**
  - **Two different results, two different contracts.** The screening outcome is an internal result of the agent's `receipt-screening` port, consumed by the protected `workflows` operation; it has no HTTP endpoint, and its result values belong to CON-03 ([§11.1](#111-for-con-03-external-integrations)). The human decision is only `approve` or `reject` on a payment review, an authenticated CRM command of `payments` through `workflows` ([§11.2](#112-next-contract-increment)). Only that decision counts for BR-SEN-10.
  - **No HTTP field reports a screening outcome as a financial state.** The CRM sees a review and, in the next increment, how it arrived (plausible, second unrelated attempt, uncertain or failed screening, text fallback). It never sees "rejected by AI" or "verified by AI", and personnel do not approve or override screening itself.
  - **Attempt counting is not exposed or reset by contract.** Whether the clearly unrelated count carries over after a human decision or into a later correction round is pending in [P-40](../product-specs/uc-03/business-rules.md#16-pending-decisions); no field or endpoint assumes either answer.
  - **No retry adds time.** No CRM or agent operation changes `holdExpiresAt` or the correction deadline because a file was replaced or rescreened (INV-SEN-13).

## 11. Left to CON-03 and to the next contract increment

### 11.1 For CON-03 (external integrations)

CON-03 ([#12](https://github.com/nanonoir/Agendoxa/issues/12)) defines these contracts; this document only fixes where they meet the API.

| Integration | CON-03 defines | Constraint from this document |
|---|---|---|
| WhatsApp webhook (Evolution API) | Inbound route, origin verification, payload normalization, deduplication and the responses the provider expects | An inbound adapter of `messaging`. It takes no session or CSRF token, and its tenant comes from the connection, never from a parameter (INV-MSG-02) |
| Agent tools (LangGraph) | Tool schemas, results and failure handling | The operations in [§10](#10-internal-consumers-the-agent), with the `code` and `reason` values of §5. The rewritten #11 also asks CON-02 for typed internal contracts; who writes them is open ([§14.1](#141-scope-differences-with-the-rewritten-issue-11)) |
| Durable jobs (pg-boss) | Job names, payloads, scheduling and retries | Jobs from [modules §6.6](./modules.md#66-jobs); no job is exposed over HTTP |
| Receipt screening *(added 2026-11-10)* | The replaceable `receipt-screening` port of `agent`: result values (plausible, clearly unrelated, uncertain or technical failure), model and versioning, timeout, latency measurement, recovery, data minimization. Gemini Flash and five seconds are the requested direction and an objective, not guarantees ([modules §8.2](./modules.md#82-for-con-03-integration-contracts)) | The outcomes and effects of [§10.1](#101-receipt-evidence-screening-is-not-human-review). No HTTP endpoint; no result verifies money, counts as a human rejection or adds time. The attempt boundary in P-40 stays open |
| Private file storage | Storage, authorized reads and deletion | Viewing a receipt from the CRM will be an authenticated endpoint of `payments` in the next increment; no public file links (DM-14) |
| Manual transfer instructions *(added 2026-11-10)* | How messages and the agent consume the alias or bank details already issued | Issued and persisted by `payments` before they are shown; a retry reuses them and never rotates again (BR-SEN-06). Not a provider contract |
| Payment gateway | Nothing | No provider in the MVP (BR-SEN-08, MVP §5.3). *Resolved 2026-11-10:* the rewritten [#12](https://github.com/nanonoir/Agendoxa/issues/12) removed Mercado Pago, gateways and bank APIs from its scope |

### 11.2 Next contract increment

These CRM operations are needed by the MVP and identified here so that their contracts follow the same conventions. Paths are relative to `/api/v1/tenants/{tenantId}` and are **Proposed**; schemas come in the next increment.

> **Reconciled 2026-11-10:** the former `cash-register` rows belong to `payments`; the "Through" column names the `workflows` coordinator where an operation changes several owners ([API-DM-12](#api-dm-12-each-endpoint-belongs-to-the-module-that-owns-its-operation)). Paths are unchanged.

| Owner (tag) | Method and path | Through | Use case | Note |
|---|---|---|---|---|
| `payments` | `GET /payment-reviews?status=PENDING` | Owner | CU-11 A1, CU-21 A1 | Review queue. Shows how each review arrived (plausible file, second clearly unrelated attempt, uncertain or failed screening, text fallback), never as a human or AI verdict ([§10.1](#101-receipt-evidence-screening-is-not-human-review)) |
| `payments` | `POST /bookings/{bookingId}/payment-reviews` | `workflows` (`payments`, `bookings`) | CU-03 CRM 2b | Pending receipt recorded from the CRM; the booking occupies under review (BR-SEN-09) |
| `payments` | `POST /payment-reviews/{reviewId}/approve`, `/reject` | `workflows` (`payments`, `bookings`, `notifications`) | CU-11 A1, CU-03 A3 | Human verification; only a human rejection drives BR-SEN-10 in `bookings`, never a screening discard |
| `payments` | `POST /payments`; `POST /payments/{paymentId}/allocations`; `POST /payment-allocations/{allocationId}/reversal` | `workflows` when an allocation can confirm a booking | CU-11 | Cash requires an open session; explicit manual allocation |
| `payments` | `POST /payments/{paymentId}/corrections`; `POST /payments/{paymentId}/refunds` | Owner | CU-11 A3, A6 | Corrections append history (T-03); refunds Admin-only |
| `payments` | `GET`, `POST`, `PATCH /receiving-accounts`; `PUT /settings/collection` | Owner; `tenants` stores the field ([modules MOD-DM-06](./modules.md#mod-dm-06-shared-rows-have-one-row-owner-and-named-field-owners)) | CU-15 | Collection mode and rotation (BR-COB-19) |
| `payments` | `GET /payment-reviews/{reviewId}/evidence` | Owner, with `assets` | CU-11 | Authorized receipt download |
| `payments` | `GET /cash-sessions/current`; `POST /cash-sessions`; `POST /cash-sessions/{sessionId}/close` | Owner | CU-13 | Cash subfeature; one open session per tenant |
| `payments` | `POST /cash-sessions/{sessionId}/movements`; `POST /cash-sessions/{sessionId}/adjustments`; `PUT /settings/cash` | Owner | CU-13, CU-11 A4 | Adjustments after close are Admin-only |
| `bookings` | `POST /bookings/{bookingId}/agreed-price` | `workflows` (`bookings`, `payments`) | CU-11 A5, BR-COB-13 | Admin-only; customer acceptance when it increases |
| `bookings` | `PUT /settings/resource-assignment` | Owner; `tenants` stores the field | CU-15 | Preference order or rotation (BR-DISP-05) |
| `messaging` | `GET /conversations`; `GET /conversations/{conversationId}/messages` | Owner | CU-14 | Shared inbox |
| `messaging` | `POST /conversations/{conversationId}/takeover`, `/handback`; `PUT /settings/ai` | Owner | CU-14, CU-15 | Global AI is Admin-only (BR-HND-04) |
| `messaging` | `GET /channel-connection`; `POST /channel-connection`, `/pause`, `/retire` | Owner | CU-18 | Connection lifecycle (BR-NOT-05) |
| `identity` | `GET /permissions`; `GET`, `POST`, `PATCH /roles`; `PUT /roles/{roleId}/permissions` | Owner | CU-15 | Admin-only role management |
| `identity` | `GET`, `POST`, `PATCH /memberships` | Owner | CU-15 | Depends on [TEN-Q6](./tenancy.md#10-open-questions) |
| `notifications` | `GET /notifications?status=UNKNOWN` | Owner | BR-NOT-10 | Notices that need CRM attention |
| `audit` | `GET /audit-events` | Owner | BR-AUD-02 | Personnel only |
| — | `GET /overview` | Read composition (API-Q-10) | CU-15 step 3 | Daily overview composed from several owners; no single owner |

## 12. Contract evolution

### API-DM-16: Contracts evolve additively within `v1`

- **Rule (Proposed):**
  - **Allowed without a new version:** new endpoints; new optional request fields; new response fields; new `reason` values; new values in a response enum.
  - **Clients must tolerate them:** ignore unknown response fields, and handle an unknown enum or `reason` value with a generic path. That is why the CRM must not switch on `depositState` without a default branch.
  - **Breaking, avoided:** removing or renaming a field, changing its type or meaning, making an optional request field required, tightening validation, removing an enum value, or changing a status code.
  - **When a breaking change is needed:** mark the old element `deprecated` in the OpenAPI with its replacement, accept both in the API, move `apps/web`, and remove the old element in a later PR. Because the web and the API may be deployed separately ([architecture §12.1](./target-architecture.md#121-local-development-and-independent-deployment)), the API ships first. A new `/api/v2` is only for a change too broad for that path.
  - Every contract change is a [shared change](./modules.md#9-technical-autonomy-and-shared-changes): it updates the OpenAPI, the `packages/shared` schemas and both consumers in the same PR when possible, and names the affected module owners.
  - `info.version` stays `0.x` while this is a proposal and becomes `1.0.0` when the team approves it and the first endpoints are implemented. After that, additive changes raise the minor version and documented deprecations the patch version.

### API-DM-17: The OpenAPI file lives in the design catalog until code exists

- **What:** The Issue asks for an initial OpenAPI specification next to `docs/design-docs/api-contracts.md`, but does not name its file.
- **Rule (Proposed):** The specification is [`docs/design-docs/api-contracts.openapi.yaml`](./api-contracts.openapi.yaml), next to this document and registered with it in the [design catalog](./index.md). While no endpoint exists, it is the reviewed contract. Once the `packages/shared` schemas exist, they become the source: the OpenAPI is generated from them, through Zod's JSON Schema conversion or a NestJS OpenAPI integration chosen at implementation, and served by `apps/api`. From then on, this file is regenerated, or replaced by a link to the generated one. A drift check belongs to CI when it exists (DOC-02). No dependency is added for this now.
- **Alternatives:** `apps/api/openapi.yaml` now, which would look like an implemented contract; or `docs/architecture/`, which the repository does not use and the rewritten Issue no longer names ([§14](#14-reconciliation-with-sources)).

## 13. Decisions and open questions

Every decision is **Proposed for team review**.

| ID | Decision |
|---|---|
| [API-DM-01](#api-dm-01-no-public-booking-the-public-api-is-read-only-landing-information) | No public booking; two read-only public endpoints for the landing |
| [API-DM-02](#api-dm-02-full-contracts-for-context-and-five-areas-the-rest-of-the-crm-is-identified) | Full contracts for context and five areas; other CRM operations identified |
| [API-DM-03](#api-dm-03-one-versioned-base-path-reads-on-resources-transitions-as-commands) | `/api/v1`, resource reads and command endpoints; no endpoint writes `status` |
| [API-DM-04](#api-dm-04-data-representations) | UUIDs, UTC instants, local dates and times, decimal-string money, minutes, E.164 |
| [API-DM-05](#api-dm-05-pagination-filtering-and-sorting-only-where-lists-grow) | Cursor pagination for bookings and customers; capped ranges; explicit filters |
| [API-DM-06](#api-dm-06-the-crm-uses-an-opaque-server-side-session-cookie) | Opaque server-side session cookie with a CSRF token |
| [API-DM-07](#api-dm-07-the-tenant-is-a-path-segment-revalidated-on-every-request) | Tenant in the path, revalidated per request; `404` outside the caller's memberships |
| [API-DM-08](#api-dm-08-permissions-are-checked-per-operation-admin-only-operations-stay-admin-only) | One permission per operation; Admin-only exceptions return `403 admin_only` |
| [API-DM-09](#api-dm-09-one-problem-format-with-stable-codes-and-reasons) | RFC 9457 problems with stable `code` and `reason`; adds `rule_violation` |
| [API-DM-10](#api-dm-10-state-changing-posts-require-an-idempotency-key) | `Idempotency-Key` on state-changing POSTs, kept 24 hours |
| [API-DM-11](#api-dm-11-commands-are-checked-against-current-state-configuration-is-last-write-wins) | Commands rechecked against current state; configuration last-write-wins |
| [API-DM-12](#api-dm-12-each-endpoint-belongs-to-the-module-that-owns-its-operation) | Endpoints are tagged by owner; multi-owner commands go through `workflows`, cross-owner reads through compositions *(reconciled 2026-11-10)* |
| [API-DM-13](#api-dm-13-seven-statuses-with-derived-conditions-as-separate-fields) | Seven statuses; derived conditions as separate fields |
| [API-DM-14](#api-dm-14-packagesshared-holds-the-http-contracts-as-zod-schemas-and-nothing-else) | `packages/shared` holds HTTP contracts as Zod schemas |
| [API-DM-15](#api-dm-15-the-agent-reuses-module-use-cases-in-process-not-the-http-api) | The agent uses facades in-process, with customer-facing results |
| [API-DM-16](#api-dm-16-contracts-evolve-additively-within-v1) | Additive evolution within `v1`, deprecation before removal |
| [API-DM-17](#api-dm-17-the-openapi-file-lives-in-the-design-catalog-until-code-exists) | OpenAPI in the design catalog until generated from code |

These questions are flagged, not resolved here.

| ID | Question | Why it matters | Owner | Blocks |
|---|---|---|---|---|
| `API-Q-01` | Where is the business location stored? The landing shows it (MVP §7.2), but `Tenant` has no address field | The public profile omits it until the ERD has it | Product, with DOM-01 | Location on the landing |
| `API-Q-02` | What are the real permission keys? §4 uses placeholders | Each protected endpoint names one | `identity` design | The first protected endpoint |
| `API-Q-03` | Can personnel change an existing customer's phone, and how? | The phone is the WhatsApp identity; the ERD asks for safe identity handling | Product | Phone edits only |
| `API-Q-04` | What happens to future bookings when a compatibility link is removed? | Needs the locking protocol between catalog and booking writes | [#31](https://github.com/nanonoir/Agendoxa/issues/31) | Nothing in this contract; existing bookings are kept |
| `API-Q-05` | What is the default reminder lead time? | No value is agreed; with `null` no reminder is scheduled | Product | Reminders |
| `API-Q-06` | Where are idempotency records stored? | They are not an ERD entity | Implementation, with REP-03 or [#31](https://github.com/nanonoir/Agendoxa/issues/31) | The first POST endpoint |
| `API-Q-07` | What does `availability_rules.weekday` 0–6 mean? Proposal: 0 is Sunday, as in PostgreSQL | The API uses names, so the mapping must be fixed once | REP-02 owner | The first availability endpoint |
| `API-Q-08` | How are passwords set and recovered, how long do sessions last, and how are personnel invited ([TEN-Q6](./tenancy.md#10-open-questions))? Does any installation put the web and the API on different sites? | API-DM-06 covers the session only; a cross-site deployment needs the Next.js server as a proxy | `identity` and authentication design | Sign-in implementation |
| `API-Q-09` | Should the architecture proposal add `rule_violation` to its error categories? | API-DM-09 uses it | Team, in the architecture review | Nothing |
| `API-Q-10` | Where do cross-owner read compositions live (public profile, agenda and booking reads with `depositState`, customer indicators, overview)? CON-01 requires them above the owners ([modules §6.4](./modules.md#64-queries-and-read-compositions)) but names no folder, and `workflows` is defined for multi-owner business operations | `tenants` and `customers` cannot import the owners they would compose ([modules MOD-DM-07](./modules.md#mod-dm-07-dependencies-only-point-to-lower-levels)) | Team, with CON-01 | The first composed endpoint |
| `API-Q-11` | Should the CRM see a distinct condition while timely evidence is under preliminary screening? Today it shows `AWAITING_EVIDENCE` and a `holdExpiresAt` that may already have passed ([API-DM-13](#api-dm-13-seven-statuses-with-derived-conditions-as-separate-fields)) | A new `depositState` value would be additive (API-DM-16), but depends on how CON-03 represents screening and its failures | Team, with CON-03 | Nothing in this increment |

## 14. Reconciliation with sources

> **Reconciled 2026-11-10** against the [Issue #11](https://github.com/nanonoir/Agendoxa/issues/11) and [Issue #12](https://github.com/nanonoir/Agendoxa/issues/12) as rewritten on 2026-11-09 and the consolidated CON-01. The first three rows were contradictions with the earlier Issue text and are now **resolved**; they stay listed so the history is visible. New scope differences are in [§14.1](#141-scope-differences-with-the-rewritten-issue-11).

| Topic | Sources say | This document | Status |
|---|---|---|---|
| Public API | The earlier Issue text asked to create, consult, cancel and reschedule bookings without an account. The rewritten #11 excludes web self-service and keeps read-only public projections | Excluded by BR-CH-01–02, MVP §5.3 and X-01; two read-only endpoints remain ([API-DM-01](#api-dm-01-no-public-booking-the-public-api-is-read-only-landing-information)) | **Resolved** by the rewritten #11. [UC-03 §17](../product-specs/uc-03/business-rules.md#17-differences-with-earlier-documents) still quotes the earlier text; updating it belongs to the product documents |
| Deliverable path | The earlier text named `docs/architecture/api-contracts.md`; the rewritten #11 names `docs/design-docs/api-contracts.md`, registered in the design index | This file and its OpenAPI, in the [design catalog](./index.md) | **Resolved** |
| References in the Issue | The earlier text pointed to `docs/domain/*.md`, `architecture.md` and `docs/architecture/modules.md`; the rewritten #11 points to `docs/product-specs/` and `docs/design-docs/` | Same documents | **Resolved** |
| Payment gateway | The earlier #12 included Mercado Pago contracts; the rewritten #12 removes gateways and bank APIs | No provider ([§11.1](#111-for-con-03-external-integrations)) | **Resolved** by the rewritten #12 |
| Module structure | CON-01 consolidated to nine functional modules plus `audit` and `assets`, with `workflows` coordinators and no finance port | Owners, tags, coordinators and compositions in [API-DM-12](#api-dm-12-each-endpoint-belongs-to-the-module-that-owns-its-operation); `depositState` composed (API-DM-13) | **Reconciled** 2026-11-10; composition location open (API-Q-10) |
| Receipt screening | BR-SEN-14–16, INV-SEN-12–13 (product-owner agreement 2026-11-09) | [§10.1](#101-receipt-evidence-screening-is-not-human-review), API-DM-13 meanings, §11.1 | **Reconciled** 2026-11-10; P-40 and API-Q-11 open |
| Authentication method | CU-17 leaves it to a CON task | [API-DM-06](#api-dm-06-the-crm-uses-an-opaque-server-side-session-cookie), chosen with the team; open parts in API-Q-08 | Proposed |
| Booking statuses | UC-02 §1 and UC-03 §0 call them conceptual labels; REP-02 implemented `booking_status`, and the architecture proposal now says so | The seven values, plus derived fields for conditions that are not statuses ([API-DM-13](#api-dm-13-seven-statuses-with-derived-conditions-as-separate-fields)), as in [modules §11](./modules.md#11-reconciliation-with-sources) | Consistent |
| Error categories | Architecture §11 lists six | Adds `rule_violation` and `internal` | Open (API-Q-09) |
| Landing location | MVP §5.1 and §7.2 and the rewritten #11 show location | Not in the ERD | Open (API-Q-01) |
| Weekly hours | The schema stores `weekday` 0–6 without a convention | Names in the API | Open (API-Q-07) |
| Agreed-price change | CU-11 A5 is a payment case | `agreed_price` is a `Booking` field, so its endpoint is tagged `bookings` and goes through `workflows` because it changes the charge ([§11.2](#112-next-contract-increment)) | Proposed |

### 14.1 Scope differences with the rewritten Issue #11

> **Added 2026-11-10.** These are differences between the rewritten Issue and this proposal that the documents do not settle. They are listed for the team, **not decided here**.

| # | The rewritten Issue asks | This proposal today | Decision needed |
|---|---|---|---|
| D-1 | Priority CRM operations for receipts and human review, explicit allocation, financial states and cash "needed for those flows" | Only identified, with path, owner and coordinator, in [§11.2](#112-next-contract-increment); no schemas | Which of them are priority for CON-02, and whether they are specified in this PR or in a follow-up CON-02 increment |
| D-2 | Represent pending review, partial-deposit waiting and **supplemental** deposit separately from credit, service outcome and physical cash balance | `depositState` covers the initial deposit (API-DM-13); `status` covers the outcome. Nothing represents the supplemental collection after a reschedule (BR-CAN-10) or the cash balance | Whether `BookingSummary` gets a separate supplemental field now, or with D-1 |
| D-3 | Typed contracts for internal consumers that are not HTTP (agent tools) | [§10](#10-internal-consumers-the-agent) lists the operations and refusal codes; tool input and output schemas are left to CON-03, whose rewritten #12 also asks for "typed contracts" for the agent | Which ticket owns the typed tool contracts, or how CON-02 and CON-03 split them |
| D-4 | Minimum contracts for transactional participation between owners: results and required locks or preconditions, without ORM types | API-DM-12 names each coordinator and its participants; the protocol itself is CON-01 MOD-DM-08. No participant signature or per-operation lock order is written here | Whether CON-02 specifies those application contracts or CON-01 / implementation ([#31](https://github.com/nanonoir/Agendoxa/issues/31)) does |
| D-5 | Versions and preconditions for concurrency | Commands recheck current state; configuration is last-write-wins without `ETag` ([API-DM-11](#api-dm-11-commands-are-checked-against-current-state-configuration-is-last-write-wins)) | Confirm that this answers the Issue, or require conditional requests now |
| D-6 | Public informational hours and the WhatsApp link | Included in the public profile (API-DM-01), composed from `catalog` and `messaging` | CON-01 §8.1 allows only `tenants` information and `catalog` services; confirm the two projections in the CON-01 review |
| D-7 | Public location | Not in the ERD | API-Q-01, unchanged |

**CON-01 constraints for CON-02** ([modules §8.1](./modules.md#81-for-con-02-api-contracts)):

| Constraint | Where it holds |
|---|---|
| Each endpoint invokes an owner command or the multi-owner coordinator; it never writes tables itself | [§7](#7-endpoints-by-owner-module), API-DM-12 |
| Public endpoints only for `tenants` information and `catalog` services; no booking | API-DM-01; hours and WhatsApp link to confirm (D-6) |
| `identity` resolves authentication; a selected tenant only selects | API-DM-06, API-DM-07 |
| `not_found` for another tenant's record; `conflict` for occupancy races | API-DM-07, API-DM-09, API-DM-11 |
| `packages/shared` only for HTTP contracts, never entities or rows | API-DM-03, API-DM-14 |
| Money as decimal strings, UTC instants, local times with the tenant timezone, UUIDs | API-DM-04 |
| Seven statuses; derived conditions as separate fields | API-DM-13 |
| Idempotency for payments, refunds and booking creation retries | API-DM-10 |
| Agent tools call facades, not HTTP | API-DM-15 |

## 15. Traceability

**[CON-02 (#11)](https://github.com/nanonoir/Agendoxa/issues/11)**, acceptance criteria as rewritten on 2026-11-09 *(table reconciled 2026-11-10)*:

| Criterion | Where | Coverage |
|---|---|---|
| Priority operations, owners and consumers identified | §2 (API-DM-02), §7 (API-DM-12), §10, §11.2 | Covered; payments and cash only identified (D-1) |
| Endpoints, methods and needed internal contracts defined, distinguishing landing, CRM and WhatsApp tools | API-DM-01, §7, §10 and the OpenAPI file | Partial: typed internal contracts (D-3) |
| Inputs, outputs, validation and a consistent error format | §5, §7, §9 and the OpenAPI schemas | Covered for the specified areas |
| Authentication, capabilities, requester authority and tenant context, including other tenants' IDs and revoked permissions | §4 (API-DM-06–08), §10 | Covered |
| Dates, times, amounts and identifiers | §3 (API-DM-04) | Covered |
| Idempotency and conflicts or preconditions of sensitive operations; duplicates create no extra bookings or money | §6 | Partial: money operations are not specified yet (D-1); preconditions (D-5) |
| Transactional collaborations and participant limits consistent with CON-01, without ORM in application code | API-DM-12, §7.5, [modules MOD-DM-08](./modules.md#mod-dm-08-the-initiating-use-case-owns-the-transaction) | Partial (D-4) |
| Receipt screening results and human review or credit kept apart, per UC-03, coordinated with CON-03 | §10.1, API-DM-13, §11.1 | Covered for this increment; review endpoints with D-1; P-40 and API-Q-11 open |
| Compatible with use cases, domain model and the exclusion of public web booking | §2, §7, §14 | Covered |
| Evolution, projections and shared schemas documented | API-DM-03, §9, §12 | Covered |
| Reviewed and approved by the team | — | **Pending** |

| Deliverable in the Issue | Where |
|---|---|
| `docs/design-docs/api-contracts.md`, registered in the design index | This file; [index](./index.md) |
| Initial OpenAPI for the included endpoints, and typed contracts for non-HTTP internal consumers | [api-contracts.openapi.yaml](./api-contracts.openapi.yaml) (API-DM-17); internal contracts pending D-3 |
| Schemas and types for `packages/shared` | §9 |
| Representative requests, responses, errors and conflicts, with authorized context and no sensitive data | §8 and `components.examples` in the OpenAPI file |

**Verification done for this proposal** (first on 2026-11-08, repeated on 2026-11-10 after the reconciliation; checks on documents, not on running code):

- The OpenAPI file passes Redocly CLI 2 `lint` with the recommended rules and invalid examples as errors. The only warning is the missing `info.license`, left on purpose because licensing is a project decision.
- Every example in §8 validates against its OpenAPI schema with Ajv (JSON Schema 2020-12) and is identical to an example of the same schema in the file. Every example the file attaches to an operation validates too, and every component example is used. A copy with a wrong enum value and a numeric amount fails, so the checks are effective.
- Relative links and anchors of this document and the catalog resolve, including the CON-01 anchors renamed by its consolidation, and `git diff --check` reports nothing.

## 16. Reconciliation log

**2026-11-10**, against CON-01 at `5f31914`, UC-03 BR-SEN-14–16 and INV-SEN-12–13, and Issues #11 and #12 as rewritten on 2026-11-09. No schema, path or example changed shape; the OpenAPI `info.version` moved to `0.2.0-proposal`.

| Section | What changed |
|---|---|
| Header, [§1](#1-how-to-use-this-document) | Reconciliation note; endpoints invoke an owner use case or the `workflows` coordinator |
| [API-DM-01](#api-dm-01-no-public-booking-the-public-api-is-read-only-landing-information) | Contradiction with the Issue resolved; hours and WhatsApp link flagged against CON-01 §8.1 (D-6) |
| [API-DM-02](#api-dm-02-full-contracts-for-context-and-five-areas-the-rest-of-the-crm-is-identified) | Notes the wider scope of the rewritten Issue and points to §14.1 |
| [API-DM-07](#api-dm-07-the-tenant-is-a-path-segment-revalidated-on-every-request) | Revocation of memberships and permissions made explicit |
| [API-DM-12](#api-dm-12-each-endpoint-belongs-to-the-module-that-owns-its-operation) | Rewritten: owner tags, `workflows` coordinators, read compositions, `x-agendoxa-invokes` |
| [§7.4](#74-catalog-calendars-hours-blocks-and-openings) | Calendar endpoints owned by `catalog`; block removal through `workflows` |
| [§7.5](#75-bookings-free-slots-agenda-and-lifecycle-commands), [API-DM-13](#api-dm-13-seven-statuses-with-derived-conditions-as-separate-fields) | Coordinator per command; `depositState` composed without a finance port; deposit meanings follow screening rules |
| [API-DM-14](#api-dm-14-packagesshared-holds-the-http-contracts-as-zod-schemas-and-nothing-else) | `availability.ts` merged into `catalog.ts` |
| [§10](#10-internal-consumers-the-agent), [§10.1](#101-receipt-evidence-screening-is-not-human-review) | Agent facades per CON-01 §8.2; new section separating screening from human review |
| [§11.1](#111-for-con-03-external-integrations), [§11.2](#112-next-contract-increment) | Receipt screening and transfer instruction rows; payment gateway resolved; cash rows in `payments`; "Through" column |
| [§13](#13-decisions-and-open-questions) | API-DM-12 summary; new API-Q-10 and API-Q-11 |
| [§14](#14-reconciliation-with-sources), [§14.1](#141-scope-differences-with-the-rewritten-issue-11) | Status per difference; resolved rows marked; scope differences D-1 to D-7 for the team |
| [§15](#15-traceability) | Criteria and deliverables of the rewritten #11, with coverage |
| [API-DM-17](#api-dm-17-the-openapi-file-lives-in-the-design-catalog-until-code-exists) | Issue path wording updated |
| OpenAPI | `availability` tag removed; `x-agendoxa-invokes` on 11 operations; `DepositState` and `holdExpiresAt` descriptions; version `0.2.0-proposal` |
