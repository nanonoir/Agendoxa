# CON-02 — Initial API Contracts

> **Status:** In Review — proposal; **not team-ratified or implemented**.
> **Prepared:** 2026-11-08, on top of [CON-01 modules](./modules.md) (in review), the [DOM-01 ERD](./erd.md), [DOM-02 tenancy](./tenancy.md), [UC-02 use cases](../product-specs/uc-02/use-cases.md), [UC-03 rules](../product-specs/uc-03/business-rules.md) and [invariants](../product-specs/uc-03/invariants.md), and the [architecture proposal](./target-architecture.md) v1.2.
> **Scope:** HTTP contracts between the Next.js web, the NestJS API and its internal consumers: operations, endpoints and methods, inputs and outputs, validation, errors, authentication and tenant context, data representations, idempotency, pagination and contract evolution.
> **Files:** this document and the [OpenAPI 3.1 specification](./api-contracts.openapi.yaml) it explains.
> **Out of scope:** Controllers, endpoints, business logic, authentication, frontend or provider integrations as code; provider contracts ([CON-03 #12](https://github.com/nanonoir/Agendoxa/issues/12)); contracts for features outside the MVP.
> **Reconciled:** 2026-11-10, with CON-01 as consolidated at `5f31914` (nine functional modules plus `audit` and `assets`, `workflows` coordinators), UC-03 BR-SEN-14–16 and INV-SEN-12–13, and Issues [#11](https://github.com/nanonoir/Agendoxa/issues/11) and [#12](https://github.com/nanonoir/Agendoxa/issues/12) as rewritten on 2026-11-09. Changed sections carry a *Reconciled 2026-11-10* note and are listed in [§16](#16-reconciliation-log).
> **Author decisions:** 2026-11-10, D-1, D-2, D-3 and D-5 of [§14.1](#141-scope-differences-with-the-rewritten-issue-11), applied in API-DM-18 to API-DM-23 and the `payments` contracts of §7.7–§7.10; listed in [§16](#16-reconciliation-log). They are proposals for team review, not ratification.
> **Remediated:** 2026-11-12, after the [review of PR #33](https://github.com/nanonoir/Agendoxa/pull/33#issuecomment-6806679879) and the product-owner agreements of that day (cash first opening, verification that allocates, non-collected supplements, multi-owner contracts, landing location and WhatsApp link), applied as proposals in API-DM-21 to API-DM-26, [§14.1](#141-scope-differences-with-the-rewritten-issue-11) and the [reconciliation log](#16-reconciliation-log). The matching UC-03 rules (BR-SEN-07, BR-SEN-17, BR-COB-02–04, BR-COB-17, BR-CAN-11, BR-CAN-15, INV-SEN-14, INV-CAN-10) are product-owner agreements, not team ratification.
> **UC-03 rules introduced by PR #34:** the recommended merge order is PR #33 and then [PR #34](https://github.com/nanonoir/Agendoxa/pull/34) (CON-03 / UC-03 update). Until #34 merges, UC-03 in this branch lacks BR-SEN-19, BR-SEN-20, BR-SEN-21, INV-SEN-16, INV-MSG-08 and EJ-57–64, which are cited here as plain text with that note (*added to UC-03 by PR #34*). Where this document cites an existing rule whose wording #34 changes (for example BR-SEN-16 and INV-SEN-02–03 on the provider-assigned send time and the processing margin, BR-SEN-17, BR-SEN-18 and INV-SEN-15 on the resend cause, BR-CAN-15 and INV-CAN-10, BR-COB-02–04 and BR-COB-17), the cited behavior is the one #34 specifies; the UC-03 text of this branch does not yet say so.
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
| `GET /public/businesses/{slug}` | Name, branding, timezone, public location, weekly hours and the WhatsApp link | The landing must show business identity, location, hours and a WhatsApp call to action (MVP §7.2). `apps/web` may not read the database ([architecture §5](./target-architecture.md#5-monorepo-organization)), so it needs an endpoint |
| `GET /public/businesses/{slug}/services` | Active services with duration and price | The landing lists services (BR-CH-02) |

  No public endpoint returns free slots, resources' occupancy or anything about customers or bookings. The slug only selects the business to display ([TEN-DM-07](./tenancy.md#ten-dm-07-every-entry-point-has-one-source-of-tenant-context)). *Proposed 2026-11-12 (product-owner agreement, D-7 and [API-Q-01](#13-decisions-and-open-questions)):* the location is a **public business address text plus an optional Maps link** (`location: { address, mapsUrl }`, or `null` until the business sets it). It is a `tenants` attribute proposed in the [ERD](./erd.md#tenant) and **not migrated**: the contract is conditional on its adoption in DOM-01. The WhatsApp link is built from the tenant's connected WhatsApp number as a `wa.me` link, `null` with no active connection (D-6). Regular hours derive from availability rules owned by `catalog`; the connected number belongs to `messaging`. A proposed read-only composition above the owners assembles the allowlisted public DTO; no channel secrets or personnel fields are exposed ([modules §8.1](./modules.md#81-for-con-02-api-contracts)). This technical proposal is not team ratification.
- **Recorded:** [§14](#14-reconciliation-with-sources) marks the former difference with the Issue as resolved. [UC-03 §17](../product-specs/uc-03/business-rules.md#17-differences-with-earlier-documents) still describes the Issue's earlier text; that product document is not edited here.

### API-DM-02: Full contracts for context, five areas and the priority money flows; the rest of the CRM is identified

- **What:** The Issue asks for initial contracts for services, resources, hours, internal availability, customers and bookings, while the MVP's CRM also covers payments, cash, conversations, roles, the WhatsApp channel and audit. *Reconciled 2026-11-10: the rewritten Issue also asks for the priority receipt/review, allocation, financial-state and cash operations those flows need, and for typed internal contracts. Updated the same day by author decisions D-1 and D-3 ([§14.1](#141-scope-differences-with-the-rewritten-issue-11)): the money operations are specified here, and the typed tool contracts go to CON-03.*
- **Rule (Proposed):** This increment specifies, with schemas and OpenAPI, the session and tenant context, the business profile, catalog, availability, customers, bookings and the public endpoints, and *(since D-1)* the payment operations the deposit, collection and cash flows need: evidence upload and human review, verified payments, explicit allocation and its reversal, the booking financial state, receiving-account reads and the cash session ([§7.7](#77-payments-evidence-and-human-review) to [§7.10](#710-payments-cash-session)). The remaining CRM operations, including payment corrections, refunds and collection settings, are identified with method, path, owner and use case in [§11.2](#112-next-contract-increment), so that their later contracts keep the same conventions.
- **Coverage of the [UC-02 use cases](../product-specs/uc-02/use-cases.md#3-prioritized-catalog):**

| Use case | Where it is served |
|---|---|
| CU-01, CU-04 to CU-07, CU-19, CU-23 (customer side) | WhatsApp through the agent and module facades; not HTTP ([§10](#10-internal-consumers-the-agent)) |
| CU-02, CU-03 CRM booking, CU-04 CRM | `POST /bookings`, with the `deposit` input for verified funds or evidence (§7.5, §7.7, §7.8) |
| CU-03 steps 6–7, A3–A5 (human side) | Review queue, approval and rejection ([§7.7](#77-payments-evidence-and-human-review)) |
| CU-08, CU-09 | `POST /bookings/{id}/cancel`, `POST /bookings/{id}/reschedule` (CRM); the supplemental deposit in [§7.9](#79-payments-booking-financial-state) |
| CU-10 | `POST /bookings/{id}/outcome`, `/outcome-correction`, `/remainder-walk-ins` |
| CU-11 main flow, A1, A2, A7–A9 | Payments, allocations and financial state ([§7.8](#78-payments-verified-payments-and-explicit-allocation), §7.9); A3–A6 corrections, refunds and agreed price in the next increment |
| CU-12 | Customer restrictions and incidents |
| CU-13 | Cash session ([§7.10](#710-payments-cash-session)) |
| CU-15 | Catalog, booking policies, calendars, hours, blocks and openings; roles, accounts and AI in the next increment |
| CU-17 | Session and tenant context |
| CU-21 | `GET /agenda`, `GET /free-slots`, `GET /bookings`; A1 review queue in §7.7 |
| CU-14, CU-18 | Next increment ([§11.2](#112-next-contract-increment)) |
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
| `payments.allocate` | Allocate verified funds and reverse allocations (BR-COB-03, BR-COB-17); close a supplemental deposit request without collecting it (BR-CAN-15, [API-DM-26](#api-dm-26-a-supplemental-deposit-request-can-be-closed-without-collecting-it); decided by the product owner on 2026-11-12) |
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
| `conflict` | 409 | Current state prevents it now; refreshing or choosing another slot may succeed | `slot_unavailable`, `state_changed`, `idempotency_key_reused`, `idempotency_request_in_progress`, `phone_already_registered`, `calendar_has_exceptions`, `opening_in_use`, `no_active_restriction`; money flows: `review_already_decided`, `upload_already_used`, `evidence_unavailable`, `allocation_already_reversed`, `cash_session_not_open`, `cash_session_already_open`, `cash_session_not_closed`, `stale_revision`, `no_open_supplemental_deposit` *(2026-11-12)* |
| `rule_violation` | 422 | A business rule refuses the request as sent; it needs other input, an acceptance or an exception | `late_change_requires_acceptance`, `deposit_required`, `customer_blocked_requires_acknowledgement`, `future_booking_limit_reached`, `booking_lead_not_met`, `slot_in_past`, `outside_open_hours`, `incompatible_resource`, `inactive_service`, `inactive_resource`, `too_early_for_outcome`, `reschedule_limit_reached`, `not_in_private_remainder`, `phone_change_not_supported`; money flows: `allocation_exceeds_charge_balance`, `allocation_exceeds_available_funds`, `allocation_required` *(2026-11-12)*, `evidence_upload_expired`, `hold_evidence_via_whatsapp`, `booking_released`, `receiving_account_required`, `opening_difference_requires_reason` |
| `external_dependency` | 503 | A required external service failed. No operation in this increment depends on WhatsApp or the LLM (BR-CH-06) | — |
| `internal` | 500 | Unexpected failure; the client may retry with the same idempotency key | — |

- **Which statuses each operation can return** *(added 2026-11-12, after auditing every operation).* `401` wherever a session is needed. `404` for a tenant without an active membership and for another tenant's record. `403` is declared only where a delegable permission, an Admin-only check or the CSRF token is checked: every CRM operation except `getSession` and `getTenantContext`, which need only a session or an active membership. `409` for idempotency conflicts (`idempotency_key_reused`, `idempotency_request_in_progress`) is declared on every `POST` that requires `Idempotency-Key`, besides its state conflicts. `400`, `422` and the other `409` reasons appear only on the operations whose inputs or rules can produce them. The per-operation matrix is not repeated here; the OpenAPI responses are the contract.
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
| Reverse an allocation | The allocation is `ACTIVE`, and the booking's status is rechecked in the same transaction; otherwise `409 allocation_already_reversed` or `409 state_changed` | Same as a review: one transition. The booking recheck decides whether the booking returns to review (BR-SEN-18) |
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
| Command whose response is composed afterwards *(added 2026-11-12)* | The command's own adapter; the response read is composed above the owners after the commit ([API-DM-25](#api-dm-25-a-response-carries-another-owners-facts-only-if-it-is-composed-above-the-owners)) | The command's extension plus `responseComposition` listing the owners read |

  The kind does not change the HTTP contract: path, permission, errors and idempotency are the same whoever composes the call. A single-owner command that only uses technical `tenants`, `identity` or `audit` support is an owner command, not a coordinator ([modules §4](./modules.md#4-operations-by-module)).

| Owner (tag) | Paths (under `/api/v1`) | Multi-owner commands (`workflows`) | Read compositions |
|---|---|---|---|
| `identity` | `/session`, `/tenants/{tenantId}/me` | — | — |
| `tenants` | `/tenants/{tenantId}`; public profile `/public/businesses/{slug}` (tag `public`) | — | Public profile: `tenants` (including the proposed public address), `catalog` weekly hours, `messaging` WhatsApp number |
| `catalog` | `/services…`, `/resources…`, `/booking-policies…`, `/calendars…`, `/resources/{resourceId}/calendar`, `/resources/{resourceId}/windows`, `/availability-exceptions…`; public `/public/businesses/{slug}/services` (tag `public`) | Removing an availability exception: `catalog`, `bookings` (reevaluation intent after a block is removed, [modules §6.3](./modules.md#63-events-and-durable-intents)) | — |
| `bookings` | `/free-slots`, `/agenda`, `/bookings…` | Create, cancel, reschedule and remainder walk-in: `bookings` with `customers`, `payments` and `notifications` as each needs ([§7.5](#75-bookings-free-slots-agenda-and-lifecycle-commands)) | Agenda and booking reads: `bookings`, `catalog`, `payments` (for `depositState`). Post-commit response of cancel, outcome and correction: `bookings`, `payments` |
| `customers` | `/customers…` | — | Customer list and detail: `customers`, `bookings` (derived indicators); also the post-commit response of create and update |
| `payments` *(added 2026-11-10)* | `/payment-evidence-uploads`, `/payment-reviews…`, `/bookings/{bookingId}/payment-reviews`, `/bookings/{bookingId}/financial-state`, `/bookings/{bookingId}/supplemental-deposit/non-collection`, `/receiving-accounts`, `/payments…`, `/payment-allocations…`, `/cash-sessions…` | Evidence submission (`payments`, `bookings`, `assets`); approval, rejection, payment recording, allocation and allocation reversal (`payments`, `bookings`, `notifications`); closing a supplement without collection (`bookings`, `payments`) | Review reads and booking financial state: `payments`, `bookings` |

`bookings` may read `catalog` directly ([modules §5.1](./modules.md#51-dependency-diagram)); the agenda is a composition only because `depositState` needs `payments` facts. Outcome recording and correction stay `bookings` owner commands: they change only booking history and private remainder occupancy ([modules §6.2](./modules.md#62-transactions)); their response is composed after the commit ([API-DM-25](#api-dm-25-a-response-carries-another-owners-facts-only-if-it-is-composed-above-the-owners)). In `payments`, uploads, payment reads and every cash operation are owner commands or queries (allocation reversal stopped being one on 2026-11-12: it can return a booking to review, BR-SEN-18); `payments` may use `assets` directly, but it cannot import `bookings`, so anything that needs booking facts or changes a booking goes through `workflows` ([modules §5.1](./modules.md#51-dependency-diagram)).

### API-DM-24: Multi-owner commands have a minimum contract here; code-level participant contracts belong to #31

> **Added 2026-11-12** for D-4 ([§14.1](#141-scope-differences-with-the-rewritten-issue-11)), by product-owner agreement. Proposed for team review.

- **What:** D-4 asks how much of the transactional participation CON-02 specifies, as opposed to CON-01 and the future work of [#31](https://github.com/nanonoir/Agendoxa/issues/31).
- **Defined:** The protocol is CON-01's: the coordinator opens one transaction, every writer takes the tenant guard first, locks follow the documented order, and only the initiator commits or retries ([modules MOD-DM-08](./modules.md#mod-dm-08-the-initiating-use-case-owns-the-transaction)). This document does not restate it.
- **Rule (Proposed):** CON-02 fixes, for each multi-owner command, **who participates, what is rechecked inside the guarded transaction, what the result is and which errors that recheck can produce**. The participants' code-level contracts (public facade signatures, the opaque ORM-neutral scope, lock order per operation and the forced-failure rollback tests that MOD-DM-08 asks for) are delegated to Issue [#31](https://github.com/nanonoir/Agendoxa/issues/31), which implements them against this table without changing it. Anything else a participant needs is an implementation detail, not a contract.

| Operation | Participants | Rechecked in the transaction | Result | Errors from the recheck |
|---|---|---|---|---|
| `createCrmBooking` | `bookings`, `customers`, `payments`, `notifications` | Customer, phone uniqueness and restriction; applied policy and required deposit; slot claim; upload state and allocation caps; deposit threshold | `BookingDetail`, assembled from the participants' results | `403 admin_only`; `409 slot_unavailable`, `phone_already_registered`, `upload_already_used`; `422 customer_blocked_requires_acknowledgement`, `deposit_required`, `allocation_exceeds_*`, `evidence_upload_expired` and the slot reasons |
| `createRemainderWalkIn` | Same as `createCrmBooking` | Same, plus that the slot fits the private remainder | `BookingDetail`, as above | As above, plus `422 not_in_private_remainder` |
| `cancelBooking` | `bookings`, `notifications` | Status allows cancelling; notice window with acceptance or Admin exception | The command's own outcome; the returned `BookingDetail` is composed after the commit | `403 admin_only`; `409 state_changed`; `422 late_change_requires_acceptance` |
| `rescheduleBooking` | `bookings`, `payments`, `notifications` | Booking is `CONFIRMED`; target free without releasing the current slot; limit and late change; charge correction and the shortfall of the current requirement over the valid allocations | `RescheduleResult`, assembled from the participants' results | `403 admin_only`; `409 state_changed`, `slot_unavailable`; `422 late_change_requires_acceptance`, `reschedule_limit_reached` and the slot reasons |
| `submitPaymentEvidence` | `payments`, `bookings`, `assets` | Booking is neither a `HOLD` nor released; purpose derived from it; upload unused and unexpired | `PaymentReview` | `409 upload_already_used`; `422 hold_evidence_via_whatsapp`, `booking_released`, `evidence_upload_expired` |
| `approvePaymentReview` | `payments`, `bookings`, `notifications` | Review is `PENDING`; booking state and amount owed; allocation caps; threshold, confirming once | `PaymentReviewDecisionResult` | `409 review_already_decided`, `state_changed`; `422 receiving_account_required`, `allocation_required`, `allocation_exceeds_*` |
| `rejectPaymentReview` | Same as approval | Review is `PENDING`; the BR-SEN-10 rechecks of funds, review, deadline, ownership and start | `PaymentReviewDecisionResult` | `409 review_already_decided`, `state_changed` |
| `recordPayment` | `payments`, `bookings`, `notifications` | Idempotency; open cash session, never auto-opened for the tenant's first one; booking state and amount owed; allocation caps; threshold | `PaymentResult` | `409 cash_session_not_open`; `422 allocation_required`, `allocation_exceeds_*` |
| `allocatePayment` | Same as `recordPayment` | Current charge balances and available funds; threshold | `AllocationResult`, assembled from the participants' results | `422 allocation_exceeds_*` |
| `reversePaymentAllocation` *(2026-11-12, BR-SEN-18)* | `payments`, `bookings`, `notifications` | Allocation is `ACTIVE`; the allocated booking's status and start; whether the remaining valid initial-deposit allocations still reach the threshold. If the booking is `CONFIRMED`, not started and now below it, it returns to `PENDING_PAYMENT_REVIEW` in the same transaction and the resend notice is queued | `AllocationResult`, assembled from the participants' results | `409 allocation_already_reversed`, `state_changed` |
| `closeSupplementalDepositWithoutCollection` | `bookings`, `payments` | The request is `REQUESTED`: not `MET`, not closed, no evidence in review | `SupplementalDepositClosure` | `409 no_open_supplemental_deposit`, `state_changed` |
| `deleteAvailabilityException` | `catalog`, `bookings` | Exception exists; an opening is not in use; reevaluation intent recorded in `bookings` | `204` | `409 opening_in_use` |

  Every command also carries the idempotency errors of [API-DM-10](#api-dm-10-state-changing-posts-require-an-idempotency-key) and the permission errors of [API-DM-08](#api-dm-08-permissions-are-checked-per-operation-admin-only-operations-stay-admin-only). Every participant works in the one transaction the coordinator opened; none commits, and a refusal anywhere leaves nothing recorded.

### API-DM-25: A response carries another owner's facts only if it is composed above the owners

> **Added 2026-11-12** for the PR #33 review (FIX-03). Proposed for team review.

- **What:** Several responses embed facts of an owner the command does not own: a `BookingDetail` needs `payments` facts for its deposit fields, a `CustomerDetail` needs `bookings` facts for its indicators, an allocation reversal lists the bookings it affected. `payments` cannot import `bookings`, nor the reverse, and `customers` cannot import `bookings` ([modules MOD-DM-07](./modules.md#mod-dm-07-dependencies-only-point-to-lower-levels)).
- **Defined:** Cross-owner reads are composed above the owners, never through a finance port or cross-owner SQL ([modules §6.4](./modules.md#64-queries-and-read-compositions)); a multi-owner mutation goes through `workflows` ([API-DM-12](#api-dm-12-each-endpoint-belongs-to-the-module-that-owns-its-operation)).
- **Rule (Proposed):** every operation takes one of three forms, and a single-owner mutation never becomes a multi-owner one just to shape its response:
  - **In-transaction result.** The operation is already a multi-owner command and the response is assembled by the coordinator from the results its participants return inside the same transaction. No later read is involved.
  - **Owner command plus a read composed afterwards** (`responseComposition`). The command commits alone; the response is then the equivalent read composition above the owners. **No atomicity is promised between the commit and that read:** the response may already include later concurrent changes, and if the read fails after the commit the API answers `500 internal` although the command took effect, so the client reloads the resource. The contract does not promise that a retry replays the response ([API-Q-06](#13-decisions-and-open-questions)). Where the composition lives stays [API-Q-10](#13-decisions-and-open-questions).
  - **Owner data only.** The response is reduced to what the owner holds.

| Operation | Command | Response carries | Form |
|---|---|---|---|
| `createCrmBooking`, `createRemainderWalkIn`, `rescheduleBooking` | `workflows` with `payments` as a participant | Booking with deposit fields | In-transaction result |
| `submitPaymentEvidence`, `approvePaymentReview`, `rejectPaymentReview`, `recordPayment`, `allocatePayment`, `reversePaymentAllocation` *(2026-11-12)*, `closeSupplementalDepositWithoutCollection` | `workflows` with `bookings` as a participant | Review or payment plus booking summaries, or the closure record | In-transaction result |
| `cancelBooking` | `workflows` (`bookings`, `notifications`); `payments` does not take part | `BookingDetail`, with deposit fields from `payments` | Read afterwards: the `getBooking` composition |
| `recordBookingOutcome`, `correctBookingOutcome` | `bookings` owner command | `BookingDetail`, same | Read afterwards: the `getBooking` composition |
| `createCustomer`, `updateCustomer` | `customers` owner command | `CustomerDetail`, whose indicators come from `bookings` | Read afterwards: the `getCustomer` composition |
| `getAgenda`, `listBookings`, `getBooking`, `listCustomers`, `getCustomer`, `listPaymentReviews`, `getPaymentReview`, `getBookingFinancialState`, `getPublicBusiness` | Reads | Facts of several owners | Read composition, already marked `composition` |
| Every other operation | Owner command or query | Its owner's data | Owner data only |

  The OpenAPI marks the second form with `responseComposition` in `x-agendoxa-invokes`. No form needs a `payments`↔`bookings` import or a cross-owner query inside an owner.

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

**Policy fields.** **Defined:** each field resolves resource > service > tenant, distinguishing inherit, set and disable (DM-06, BR-SEN-02); booking lead time and the future-booking limit exist only at tenant scope; bookings keep snapshots ([REP-02 T-05](./rep-02-core-persistence.md#t-05-calendar-and-policy-subset)). In overrides, `null` means inherit. As in the schema, an override cannot express "unlimited reschedules" for one service while the tenant has a limit.

**`DepositRule`** *(tightened 2026-11-12)* is a union discriminated by `mode`, so a value that does not fit its mode cannot be expressed: `DISABLED` disables the deposit explicitly and always carries `value: null`; `FIXED` takes an exact money amount; `PERCENTAGE` takes an exact decimal from `0.01` to `100.00` inclusive, so `0.00`, `101.00`, `500.00` and `null` are invalid. `FIXED` takes a money amount greater than `0.00`. A configured deposit is always greater than zero and "no deposit" is expressed only as `DISABLED` (BR-SEN-03, product-owner agreement of 2026-11-12). `null` for the whole `deposit` field of an override means **inherit**, which is not the same as the explicit `DISABLED`. *Gap:* the persisted `deposit_value` check only requires a non-negative value, so the database still allows zero; the API enforces the rule and the migration that tightens it is recorded as [TD-03](../exec-plans/tech-debt-tracker.md).

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

The participants follow the same-transaction effects of [modules §6.2](./modules.md#62-transactions): a booking creation includes the applied deposit snapshot, the service charge (created from the agreed price whether or not a deposit applies), any payment instruction and its notices; a cancellation its notice suppression and release intent; a reschedule its charge correction and notices. Whether a participant has work to do depends on the request (for example, no deposit instruction without a deposit; the charge exists either way, so the financial state still shows the amount owed); the coordinator is the same.

HOLD creation, confirmation and expiry have no HTTP endpoint: a HOLD exists only in the WhatsApp flow, through the agent (**Defined:** the CRM never creates a HOLD, BR-SEN-09), and expiry is a job (CU-22).

### API-DM-13: Seven statuses, with derived conditions as separate fields

- **Defined:** `booking_status` has exactly `HOLD`, `PENDING_PAYMENT_REVIEW`, `CONFIRMED`, `CANCELLED`, `EXPIRED`, `COMPLETED` and `NO_SHOW` ([REP-02](./rep-02-core-persistence.md)); only `bookings` changes it ([modules §11](./modules.md#11-reconciliation-with-sources)). The conditions inside `PENDING_PAYMENT_REVIEW` and "pending operational close" are not statuses ([INV §2](../product-specs/uc-03/invariants.md#2-booking-lifecycle), BR-RES-13).
- **Rule (Proposed):** `status` takes only those seven values. Derived conditions are separate read-only fields of `BookingSummary`. *Reconciled 2026-11-10: the deposit meanings below now follow the preliminary screening rules BR-SEN-14–16; values and schema are unchanged.*

| Field | Meaning | Source |
|---|---|---|
| `pendingOperationalClose` | `CONFIRMED` and its end has passed; still awaiting an outcome | BR-RES-13 |
| `holdExpiresAt` | Deadline of a `HOLD`; `null` otherwise. Never extended by a replacement file, screening retry or processing margin; a `HOLD` may still show it in the past while known timely evidence is being screened | ERD `Booking`; BR-SEN-16, INV-SEN-13 |
| `depositState: NOT_REQUIRED` | No deposit applies | BR-SEN-01 |
| `depositState: AWAITING_EVIDENCE` | `HOLD` with a deposit and no evidence in human review yet: nothing received, a first clearly unrelated file awaiting its replacement, or a file still under preliminary screening | BR-RES-03, BR-RES-06, BR-SEN-14, BR-SEN-16 |
| `depositState: UNDER_REVIEW` | Evidence in human review: a plausible file, a second clearly unrelated attempt, an uncertain or failed screening, or the text fallback. Occupies with no inactivity timeout. Arriving here is not a human finding | BR-RES-06, BR-SEN-12, BR-SEN-14–15 |
| `depositState: CORRECTION_WINDOW` | First **human** rejection of initial evidence without verified funds; 15-minute window. A preliminary AI discard never opens it | BR-SEN-10, INV-SEN-12 |
| `depositState: PARTIAL` | Valid allocations to the initial deposit are above zero and below the threshold. Status-neutral *(2026-11-12)*: whether the booking occupies as unconfirmed (`PENDING_PAYMENT_REVIEW`, BR-SEN-11, also after a reversal, BR-SEN-18) or is `CONFIRMED` and started or completed comes from `status` | BR-SEN-11, BR-SEN-18 |
| `depositState: UNALLOCATED` *(added 2026-11-12)* | A deposit applied, **no** valid initial-deposit allocation remains because a personnel reversal freed it, no evidence is in review and there is no Admin exception. Status-neutral: a not-yet-started booking returned to `PENDING_PAYMENT_REVIEW` occupies with no correction window, expiry or automatic release (`holdExpiresAt` is `null`); resend is requested only for invalid verification, not valid-funds reassignment. A started or completed booking retains its status and receives no resend request. Resent evidence moves it to `UNDER_REVIEW`; rejection returns it here | BR-SEN-18, INV-SEN-15 |
| `depositState: MET` | Verified funds allocated up to the threshold | BR-SEN-07 |
| `depositState: ADMIN_EXCEPTION` | Confirmed by an Admin without the required deposit | BR-SEN-09 |
| `supplementalDepositState` *(added 2026-11-10)* | `null`, `REQUESTED`, `UNDER_REVIEW`, `MET` or, *since 2026-11-12*, the terminal `NOT_COLLECTED`: the additional deposit after a permitted reschedule of a `CONFIRMED` booking. Separate from `depositState`, which keeps describing the initial deposit ([API-DM-21](#api-dm-21-initial-deposit-supplemental-deposit-credit-outcome-and-cash-are-separate-fields)) | BR-CAN-10, BR-CAN-15, CU-09 A3 |

  **Precedence *(added 2026-11-12, orchestrator technical decision, no product change)*.** Conditions can overlap, so `depositState` is the **first** that matches, in this order; `UNDER_REVIEW` refers to initial-deposit evidence only (a balance or supplemental review does not count):

  1. `NOT_REQUIRED`: no deposit applies.
  2. `ADMIN_EXCEPTION`: confirmed by an Admin without the deposit.
  3. `MET`: valid initial-deposit allocations reach the threshold, even if more evidence is in review.
  4. `UNDER_REVIEW`: initial-deposit evidence is in human review, even when some allocations already exist (for example a partial reversal left `PARTIAL`-level funds and the customer's resent receipt is now in review).
  5. `CORRECTION_WINDOW`: first human rejection, 15-minute window. It exists only without verified funds and never after a reversal (BR-SEN-10, BR-SEN-18), so it cannot overlap `PARTIAL` or `UNALLOCATED`.
  6. `PARTIAL`: allocated above zero and below the threshold.
  7. `UNALLOCATED`: a personnel reversal left no valid allocation.
  8. `AWAITING_EVIDENCE`: everything else with a deposit, for example a `HOLD` with nothing received or a file still under preliminary screening, which is not human review.

  The order was checked pair by pair against the definitions above and the rules they cite; no pair needed adjusting. Whatever value is selected, the allocated amount stays visible in `deposit.allocated` of the financial state, so the CRM still sees partial funds while a review is pending.

  *Reworked 2026-11-12:* there is no value for verified money that nobody allocated. Verifying money for an active booking allocates it in the same human action, up to the amount owed (BR-SEN-07, INV-SEN-14), so the verification action never leaves payable debt unallocated; excess, money not matched to a booking and funds freed later by an allocation reversal stay unallocated outside the deposit states, which follow allocations and evidence in the precedence above (BR-COB-02, BR-COB-17). `AWAITING_ALLOCATION` was removed from the enum and [API-Q-13](#13-decisions-and-open-questions) is closed.

  *Added 2026-11-12 (BR-SEN-18, closes [API-Q-14](#13-decisions-and-open-questions)):* `depositState` describes the initial-deposit allocations against the threshold and the evidence, **not the booking status**; occupancy and confirmation come from `status`. A reversal of an allocation to a booking's initial-deposit charge lowers `deposit.allocated` (a reversal of another allocation or charge does not touch it). If a `CONFIRMED` booking that has not started then falls below its threshold, `reversePaymentAllocation` returns it to `PENDING_PAYMENT_REVIEW` in the same transaction. Where no Admin exception or evidence in review takes precedence (the order above), the value follows the allocations: `MET` while they still reach the threshold, `PARTIAL` while some remain below it, and the new `UNALLOCATED` when none remain. A started or completed booking keeps its status (BR-SEN-18), so it shows `PARTIAL` or `UNALLOCATED` with `status` `CONFIRMED` or `COMPLETED`, never a stale `MET`, and no resend notice is sent. **Why a new value:** `AWAITING_EVIDENCE` is defined for a `HOLD` that expires and shows a `holdExpiresAt`, and `CORRECTION_WINDOW` is a 15-minute timer; reusing either would show as releasable a booking that BR-SEN-18 forbids releasing, and a name such as "awaiting resend" would be false for a started booking. The value is additive ([API-DM-16](#api-dm-16-contracts-evolve-additively-within-v1)). Because the returned booking is no longer a first rejection, the persisted reversal on its initial-deposit allocations is the fact `payments` provides to tell `UNALLOCATED` from a booking with no evidence yet.

  `bookings` alone knows the applied requirement and the booking status; the review, correction, partial and met conditions need `payments` facts. So `depositState` is produced by a read composition above `bookings` and `payments`, never by a finance port inside `bookings` *(reconciled 2026-11-10: CON-01 removed that port, [modules §6.4](./modules.md#64-queries-and-read-compositions))*. Until `payments` exists, the composition can only produce `NOT_REQUIRED`, `AWAITING_EVIDENCE` and `ADMIN_EXCEPTION`. Clients must treat an unknown `depositState` as "see booking detail" ([API-DM-16](#api-dm-16-contracts-evolve-additively-within-v1)).

**`POST /bookings` — create a CRM booking (CU-02 A7, CU-03 CRM, CU-04).**

- **Input:** an existing `customerId` or a `newCustomer` (name required, phone optional, BR-CLI-04); optional attendee name and phone; `serviceId`; `resourceId`, or `null` to let the tenant's assignment mode choose a compatible one (BR-DISP-05); `startAt`. The end comes from the service duration. *Added 2026-11-10:* an optional `deposit` with `allocations` of existing verified payments, `evidence` (an upload ID or typed transfer details) for human review, or both ([§7.7](#77-payments-evidence-and-human-review), [§7.8](#78-payments-verified-payments-and-explicit-allocation)). *Tightened 2026-11-12:* a `deposit` needs `evidence` or a non-empty `allocations`; `declaredAmount` is accepted only together with `evidence`, never proves credit and never confirms the booking; both routes together are not two credits; unknown properties are rejected; `deposit` and `depositException` are mutually exclusive in the schema. `POST …/remainder-walk-ins` uses the same `DepositInput`.
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
- **Effects:** releases the slot at once and suppresses reminders, while any review or refund continues separately (BR-CAN-04); never moves money. The response is the cancelled `BookingDetail`, composed after the commit because its deposit fields need `payments` facts ([API-DM-25](#api-dm-25-a-response-carries-another-owners-facts-only-if-it-is-composed-above-the-owners)).

**`POST /bookings/{id}/reschedule` — CU-09.**

- **Input:** `cause`, new `startAt`, optional `resourceId` and `serviceId`, `acceptLateConsequence`, optional `adminException` for a late consequence or the reschedule limit.
- **Allowed from** `CONFIRMED` only (CU-09 precondition); otherwise `409 state_changed`.
- **Checks:** the target is checked without releasing the current slot; a failure leaves the booking intact (BR-CAN-08). The limit returns `422 reschedule_limit_reached` without an Admin exception. Late handling is the same as for cancellation and records a late reschedule.
- **Result:** `200` with the moved booking, still `CONFIRMED`, the previous slot, `lateChange` and *(added 2026-11-10)* `supplementalDeposit`, always present: `null`, or the **shortfall** of the destination's current requirement over the valid allocations *(reworded 2026-11-12)*. A destination that requires less returns `null`: nothing is refunded or credited, and the retained allocations simply reduce the balance (BR-CAN-11). The supplement is requested afterwards and never undoes the move or cancels the booking (BR-CAN-10, CU-09 A3); evidence for it uses `POST /bookings/{bookingId}/payment-reviews`, its state is `supplementalDepositState`, and personnel can close it without collecting it ([API-DM-21](#api-dm-21-initial-deposit-supplemental-deposit-credit-outcome-and-cash-are-separate-fields), [API-DM-26](#api-dm-26-a-supplemental-deposit-request-can-be-closed-without-collecting-it)).

**`POST /bookings/{id}/outcome` and `/outcome-correction` — CU-10.**

- `outcome` is `COMPLETED`, allowed from the start instant, or `NO_SHOW`, from start + 15 minutes; earlier returns `422 too_early_for_outcome` (BR-RES-10–11). Only from `CONFIRMED`.
- A correction switches `COMPLETED` ↔ `NO_SHOW`, needs a `reason` and respects the destination's timing guard (BR-RES-12). Both return the `BookingDetail` composed after the commit ([API-DM-25](#api-dm-25-a-response-carries-another-owners-facts-only-if-it-is-composed-above-the-owners)). Neither endpoint records or changes payments; "complete and collect" in the CRM is this call plus `POST /payments` ([§7.8](#78-payments-verified-payments-and-explicit-allocation)). A `COMPLETED` booking may still have a balance due (INV-RES-05).

**`POST /bookings/{id}/remainder-walk-ins` — CU-10 A5.** For a booking completed or marked no-show early, it creates a CRM booking inside the private remainder of the same resource, adjusting the remainder atomically (BR-RES-17). A slot outside the remainder returns `422 not_in_private_remainder`. The same customer, deposit and policy checks as `POST /bookings` apply; *(added 2026-11-10)* the request therefore accepts the same `acknowledgeBlockedCustomer`, `depositException` and `deposit` inputs, and the result is `CONFIRMED` or `PENDING_PAYMENT_REVIEW` under the same rules.

### 7.6 `customers`: customers, restrictions and incidents

| Method and path | Operation | Permission | Notes |
|---|---|---|---|
| `GET /customers?query` | `listCustomers` | `schedule.view` | Name fragment or phone prefix; cursor pagination |
| `POST /customers` | `createCustomer` | `customers.manage` | Name required, phone optional; `409 phone_already_registered` within the tenant (DM-03). The `CustomerDetail` returned is the `getCustomer` composition read after the commit ([API-DM-25](#api-dm-25-a-response-carries-another-owners-facts-only-if-it-is-composed-above-the-owners)); `updateCustomer` likewise |
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
  - **Upload first, then reference.** Files enter only through `POST /payment-evidence-uploads`; a review or a CRM booking references the upload ID in JSON. Every command stays JSON with one idempotency fingerprint, and `POST /bookings` can attach evidence in the same transaction that creates the occupancy (BR-SEN-09). An upload is private, proves nothing and is not a review; one upload backs one review (`409 upload_already_used`). `expiresAt` limits usability of an unlinked upload, not physical retention. No age-only automatic deletion is agreed; retention and deletion policy require product/legal resolution before deployment (INV-DAT-03, [API-Q-12](#13-decisions-and-open-questions)). Media types and size limits are the CON-03 storage contract (`400 unsupported_media_type`, `file_too_large`).
  - **Evidence from the CRM.** Personnel attach what a customer gave them for a booking that still occupies or has a balance. The server derives `purpose`: `INITIAL_DEPOSIT` for an unconfirmed booking, `SUPPLEMENTAL_DEPOSIT` when a supplement is requested, otherwise `BALANCE`. It goes to human review without preliminary screening (`arrivedVia: CRM_SUBMISSION`), as CU-03 CRM step 2b describes the CRM receipt ([API-Q-17](#13-decisions-and-open-questions)). A `HOLD` receives evidence only over WhatsApp: `422 hold_evidence_via_whatsapp`, because [INV §2.1](../product-specs/uc-03/invariants.md#21-allowed-transitions) gives `HOLD → PENDING_PAYMENT_REVIEW` to the customer only. An `EXPIRED` or `CANCELLED` booking returns `422 booking_released` for this CRM association. This does not reject or discard WhatsApp composite intake: timely WhatsApp evidence after deadline release follows BR-SEN-20, while late-sent evidence is retained for human financial handling under BR-SEN-19 (both rules added to UC-03 by PR #34).
  - **`arrivedVia` is routing, not a verdict.** Values: `PLAUSIBLE_FILE`, `ESCALATED_AFTER_TWO_ATTEMPTS`, `SCREENING_INCONCLUSIVE` (an uncertain result and a technical failure, which BR-SEN-15 treats alike), `TEXT_FALLBACK` and `CRM_SUBMISSION`. They tell personnel what to look at; none says "rejected by AI" or "verified by AI". The screening result values themselves belong to CON-03.
  - **P-40 is not assumed.** A review exposes no attempt counter, and neither decision says whether a next file would be a first or a second attempt.
  - **Approval** records that a person checked the actual credit: `verifiedAmount` (what was credited, never `declaredAmount`), the account that received it (by default the expected one; `422 receiving_account_required` if the review has none), and explicit `allocations`. It creates exactly one `TRANSFER` payment linked to the review. *Reworked 2026-11-12:* for an active booking the person confirms the allocation **in the same action**, up to the amount owed (BR-SEN-07, BR-COB-03–04, INV-SEN-14), so approving and leaving payable debt unallocated is `422 allocation_required`. `allocations: []` with an `unallocatedReason` is accepted only where the rules leave money unallocated: excess over the amount owed, money not matched to the booking, or a booking already expired or cancelled (BR-COB-02, BR-COB-17); the reason is required whenever any part of `verifiedAmount` stays unallocated. Only the listed allocations reduce balances; when they bring an unconfirmed booking's initial deposit to its threshold, the booking is confirmed once (`bookingEffect: CONFIRMED`). Approval stays a human action: no screening result, AI output or agent reaches it. There is therefore no "verified but unallocated" deposit state ([API-Q-13](#13-decisions-and-open-questions), closed).
  - **Rejection** records a `reason` and creates no payment. For initial evidence without verified partial funds, the first distinct human rejection opens the 15-minute window (`CORRECTION_WINDOW_OPENED`), and a second may cancel before start after the rechecks of BR-SEN-10 (`CANCELLED`, with notices). A technical duplicate is not distinct. A supplemental or balance review, or a booking with verified partial funds, leaves the booking unchanged (`NONE`; BR-SEN-11, CU-09 A3). The same holds for evidence resent after an allocation reversal: its rejection opens no window and releases nothing (`NONE`; BR-SEN-18).
  - **Errors:** `409 review_already_decided` when the review is no longer pending, including the loser of two simultaneous approvals (EJ-20); `409 state_changed` when the booking changed and the decision cannot apply as sent; the allocation reasons of [§7.8](#78-payments-verified-payments-and-explicit-allocation).
- **Example:** CU-03 A4 ending well. A second unrelated screenshot is escalated; Staff find $3,000 in the business account, approve with one allocation, and the booking is confirmed ([§8](#8-representative-examples)).

### 7.8 `payments`: verified payments and explicit allocation

> **Added 2026-11-10** by author decision D-1. Proposed for team review.

| Method and path | Operation | Permission | Notes |
|---|---|---|---|
| `GET /receiving-accounts` | `listReceivingAccounts` | `payments.view` | To choose the account that actually received a transfer. Managing accounts stays in [§11.2](#112-next-contract-increment) |
| `GET /payments?customerId&bookingId&method&availableOnly&from&to` | `listPayments` | `payments.view` | Newest verification first; cursor pagination; `availableOnly` finds funds still to allocate |
| `POST /payments` | `recordPayment` | `payments.record` for cash, `payments.verify` for a transfer | `workflows` with `payments`, `bookings`, `notifications`. A transfer for an active booking carries its allocation in the same action |
| `GET /payments/{paymentId}` | `getPayment` | `payments.view` | With its allocations |
| `POST /payments/{paymentId}/allocations` | `allocatePayment` | `payments.allocate` | Same coordinator |
| `POST /payment-allocations/{allocationId}/reversal` | `reversePaymentAllocation` | `payments.allocate` | `workflows` with `payments`, `bookings`, `notifications` *(since 2026-11-12, BR-SEN-18)* |

### API-DM-20: A payment is verified money; only listed allocations reduce a balance

- **Defined:** A payment is verified commercial money with a known origin and may have no allocations (BR-COB-02, INV-PAY-05). Cash is verified when the person receiving it records it; a transfer, when someone checks the credit; neither needs an image (BR-COB-05, BR-COB-06, BR-COB-08). Allocations are explicit, atomic, idempotent and capped by charge balance and available funds (BR-COB-03, BR-COB-17, INV-PAY-07). Cash needs an open session, or the configured automatic opening once a counted close exists (BR-CAJA-03, INV-CAJA-08). Possible manual duplicates are kept and flagged (INV-PAY-08, a proposal in UC-03).
- **Rule (Proposed):**
  - **`POST /payments`** takes `method`, `amount` (greater than zero), `commercialOrigin`, optional `bookingId` and `customerId`, `receivingAccountId` (required for a transfer and absent for cash, otherwise `400`), optional `allocations` and `unallocatedReason`. The payment, its cash movement and its allocations commit together; on any refusal nothing is recorded.
  - **Cash.** A cash payment needs an open session. *Reworked 2026-11-12 (product-owner agreement, FIX-02):* the tenant's **first** session is always opened manually, with an explicit `openingAmount` ([API-DM-22](#api-dm-22-one-shared-cash-session-with-physical-totals-transfers-shown-apart)), so a cash payment with no open session and no earlier close returns `409 cash_session_not_open` even when automatic opening is configured. Once a counted close exists and automatic opening is configured, the first cash payment opens the session from that counted cash (`cashSession.openedByThisPayment: true`); without automatic opening it is again `409 cash_session_not_open`. Collection and close are serialized: if the close commits first, the payment needs a new session (CU-13 A4). The payment links its movement once, so the same money is never counted twice. A retry of the first payment with the same idempotency key records one payment and opens no second session.
  - **Allocation** is always a list the person chose: `chargeId` and `amount`, up to 20 items, all or nothing, across bookings of the same tenant when needed. A payment, transfer or cash, recorded for an active booking carries its allocation in the same action, up to the amount owed (BR-SEN-07, INV-SEN-14): payable debt left unallocated is `422 allocation_required`, and `allocations` may be empty only with an `unallocatedReason` for excess, unmatched money or a released booking (BR-COB-17). Cash with no booking stays unallocated. Each item is checked against the current balance and available funds (`422 allocation_exceeds_charge_balance` or `allocation_exceeds_available_funds`, with `allocationLimit`; [API-DM-18](#api-dm-18-money-operations-rely-on-state-guards-and-caps-the-cash-close-and-adjustments-add-a-revision-precondition)). When allocations to the service charge of an unconfirmed booking reach its initial-deposit threshold, the booking is confirmed in the same transaction; for a `HOLD` paid at the counter this follows the personnel row that [INV §2.1](../product-specs/uc-03/invariants.md#21-allowed-transitions) still marks as a proposal. The response returns the payment and every affected `BookingSummary`.
  - **Reversal** marks an allocation `REVERSED` with a reason and frees its funds; it never cancels a booking. *Reworked 2026-11-12 (product-owner agreement, closes [API-Q-14](#13-decisions-and-open-questions); BR-SEN-18, INV-SEN-15):* if it leaves a not-yet-started `CONFIRMED` booking below its initial-deposit threshold, the same transaction returns it to `PENDING_PAYMENT_REVIEW`, still occupying. Invalid-verification reversal queues a resend notice in that transaction; reassignment of valid funds to the correct booking never requests another receipt from the payer, even for the same customer. Backend safe actions derive from the trusted persisted correction cause, without exposing private staff reasons to the agent. There is **no** correction window, expiry or automatic release, even if resent evidence is rejected. A started or completed booking retains its status and gets no resend notice; Admin exceptions and supplemental deposits are unaffected. The transition is in [INV §2.1](../product-specs/uc-03/invariants.md#21-allowed-transitions); the seven statuses are unchanged. A second reversal returns `409 allocation_already_reversed`; a booking that changed meanwhile, `409 state_changed`. This multi-owner command uses `workflows` ([API-DM-24](#api-dm-24-multi-owner-commands-have-a-minimum-contract-here-code-level-participant-contracts-belong-to-31)). Its `AllocationResult` contains the payment and affected booking summaries assembled in the transaction.
  - **Possible duplicates** appear in `possibleDuplicateOf` and never block the payment; the matching criterion is implementation.
  - Recording corrections and refunds stay in [§11.2](#112-next-contract-increment). `refundedAmount` is already part of `Payment`, so `availableAmount` keeps its meaning when they arrive.

### 7.9 `payments`: booking financial state

> **Added 2026-11-10** by author decision D-2. Proposed for team review.

| Method and path | Operation | Permission | Notes |
|---|---|---|---|
| `GET /bookings/{bookingId}/financial-state` | `getBookingFinancialState` | `payments.view` | Composition of `payments` and `bookings`; tag `payments` because the state it shows is financial |
| `POST /bookings/{bookingId}/supplemental-deposit/non-collection` | `closeSupplementalDepositWithoutCollection` | `payments.allocate` | `workflows` with `bookings`, `payments`; [API-DM-26](#api-dm-26-a-supplemental-deposit-request-can-be-closed-without-collecting-it) |

### API-DM-21: Initial deposit, supplemental deposit, credit, outcome and cash are separate fields

- **What:** The rewritten Issue asks to represent pending review, partial-deposit waiting and supplemental deposit separately from credit, service outcome and physical cash balance.
- **Defined:** The booking, the charge and the payment are kept apart, and the register records where physical cash is (UC-03 §10). Booking and payment state are independent (INV-RES-05). A supplemental deposit after a reschedule is requested afterwards and never auto-cancels (BR-CAN-10, BR-SEN-10, CU-09 A3). Transfers are never added to physical cash (BR-CAJA-07). A price increase is a `SUPPLEMENT` charge linked to its change request ([ERD `Charge`](./erd.md#charge)).
- **Rule (Proposed):** each concept has one place:

| Concept | Field | Where | Why there |
|---|---|---|---|
| Service outcome | `status` (`COMPLETED`, `NO_SHOW`) | `BookingSummary` | Only `bookings` changes it, and it says nothing about money (BR-COB-09) |
| Initial deposit: review, correction, partial, met | `depositState` | `BookingSummary`; amounts in `deposit` of the financial state | It governs confirmation and occupancy, so the agenda needs it on every booking |
| Supplemental deposit after a reschedule | `supplementalDepositState` | `BookingSummary`; amounts in `supplementalDeposit` and in `RescheduleResult` | The booking is already `CONFIRMED`. `depositState` describes the initial deposit only; folding the supplement into it would mix two requirements and could expose supplemental evidence to the initial-deposit rejection and release rules (BR-SEN-10), which never apply to a supplement (BR-CAN-10). Confirmation is read from `status`, not from either field. A separate field keeps both meanings and is additive (API-DM-16) |
| Credit: verified money and its allocations | `charges`, `payments`, `balanceDue`, `unallocatedLinkedFunds`, `pendingReviewIds` | Financial state only | Several payments, methods and allocations per booking are too heavy for every agenda row; one read composition above `payments` and `bookings` serves the detail |
| Physical cash balance | `totals.expectedCash` | `CashSession` only, never a booking | It belongs to the tenant's shared register. A booking's money may be a transfer, and a per-booking cash figure would mix where money is with what is owed (BR-CAJA-07, INV-CAJA-04) |

  - **Five deposit magnitudes, five places** *(reworked 2026-11-12; the earlier text defined the current requirement as the initial deposit plus the supplement, which is false whenever the destination requires less or verified funds already cover part of it)*:

| Magnitude | Field | Meaning |
|---|---|---|
| Current requirement | `BookingSummary.requiredDeposit` | What the conditions that apply to the booking now require, computed by the backend; after a reschedule, the destination's requirement. `null` when none applies. It is not a sum of other fields |
| Historical initial requirement | `deposit.required` of the financial state | The threshold applied when the booking was created. It is not recomputed after a reschedule and keeps governing `depositState` |
| Verified funds | `payments[].amount`; `unallocatedLinkedFunds` | Money a person verified. It reduces no balance by itself. Because verification allocates in the same action, `unallocatedLinkedFunds` holds only excess or funds a person freed by a reversal |
| Allocated funds | `deposit.allocated`; `charges[].allocatedAmount`; `payments[].allocatedHere` | Valid, explicit allocations: the only thing that reduces a charge balance |
| Requested supplement | `supplementalDeposit` (`required`, `allocated`, `missing`, `state`) | The shortfall of the destination's current requirement over the valid allocations when the reschedule was made: `max(0, current requirement − valid allocations)`. It exists only when positive, is never the whole requirement and is fixed when requested |

  - **No equation between them.** `requiredDeposit` is read from the conditions, not derived from `deposit.required` plus `supplementalDeposit.required`. When the numbers coincide, as in the financial-state example of [§8](#8-representative-examples) (30% of 14,000 requires 4,200; 3,000 is allocated; the shortfall is 1,200), that is arithmetic of that case, not a rule of the contract. No field was added: each magnitude already has one place, and a client that wants the current requirement next to the financial state reads `requiredDeposit` of the summary. An additive `currentRequirement` in the financial state stays possible (API-DM-16) if the team wants it.
  - **Reschedule cases** (BR-CAN-09 to BR-CAN-11; the booking is `CONFIRMED` before and after):

| Case | `requiredDeposit` | `supplementalDeposit` | Funds |
|---|---|---|---|
| Initial 3,000; the destination requires 1,500 | 1,500 | `null` | The 3,000 allocated stay valid and reduce the remaining balance; the 1,500 above the requirement are neither refunded nor credited, and any excess is resolved manually (BR-CAN-11, BR-COB-15, BR-COB-17) |
| Initial 3,000; the destination requires 5,000 | 5,000 | `required` 2,000: the 5,000 minus the 3,000 still validly allocated | Allocated funds count once and are never duplicated. The booking stays `CONFIRMED` while the supplement is unpaid (BR-CAN-10) |

  - `supplementalDepositState` is `REQUESTED` (owed, no evidence in review), `UNDER_REVIEW`, `MET` or `NOT_COLLECTED`. A rejected supplemental receipt returns to `REQUESTED`, with no correction window and no automatic cancellation. Personnel with the payments permission can close an unpaid supplement without collecting it, which ends in the terminal `NOT_COLLECTED` ([API-DM-26](#api-dm-26-a-supplemental-deposit-request-can-be-closed-without-collecting-it), closing [API-Q-16](#13-decisions-and-open-questions)). How the supplemental requirement is stored stays ERD T-03/T-05.
  - Every amount is computed by the backend (BR-SEN-05); clients only display it.

### API-DM-26: A supplemental deposit request can be closed without collecting it

> **Added 2026-11-12** by product-owner agreement ([BR-CAN-15](../product-specs/uc-03/business-rules.md#8-cancellation-and-rescheduling-can), [INV-CAN-10](../product-specs/uc-03/invariants.md#6-cancellation-rescheduling-and-ownership)). Proposed for team review. It closes [API-Q-16](#13-decisions-and-open-questions).

- **What:** After a permitted reschedule, personnel may decide not to collect the supplement, for example after a late change whose deposit was lost (BR-CAN-14). Without an operation the request stayed `REQUESTED` for ever.
- **Defined:** BR-CAN-15 and INV-CAN-10 set who may do it, what is recorded (actor, time, non-collected amount, optional reason, immutable), that it is idempotent and cannot be applied twice to a request, and that it changes no payment, charge, price, paid deposit or `CONFIRMED` status; the balance stays the price minus valid allocations, payable at the appointment. This document does not restate them.
- **Rule (Proposed):**
  - **Operation:** `POST /bookings/{bookingId}/supplemental-deposit/non-collection`, `closeSupplementalDepositWithoutCollection`, tag `payments`. A multi-owner command: `workflows` with `bookings` and `payments`, because the request belongs to the booking's change and its state needs payment facts ([API-DM-24](#api-dm-24-multi-owner-commands-have-a-minimum-contract-here-code-level-participant-contracts-belong-to-31)). It requires the session, `X-CSRF-Token` and `Idempotency-Key`.
  - **Permission:** `payments.allocate`, decided by the product owner on 2026-11-12 for this operation ([API-DM-08](#api-dm-08-permissions-are-checked-per-operation-admin-only-operations-stay-admin-only); the general catalog stays [API-Q-02](#13-decisions-and-open-questions)). Without it: `403 missing_permission`. The agent never reaches it.
  - **Input:** an optional `reason` (`CloseSupplementalDepositRequest`; `{}` is valid).
  - **Precondition**, rechecked in the transaction: the booking's supplemental request is `REQUESTED`. A request whose evidence is under review cannot be closed: the review is resolved first (BR-CAN-15, INV-CAN-10; [API-Q-18](#13-decisions-and-open-questions) closed), and meanwhile the call returns `409 state_changed`.
  - **Effect:** `supplementalDepositState` becomes the terminal `NOT_COLLECTED` and the decision is recorded once. It shows in `listBookingEvents` with its actor and reason as a proposal; where it is stored stays ERD T-03/T-05 and no migration is implied. Nothing else changes.
  - **Response:** `200` with `SupplementalDepositClosure`: `bookingId`, `changeRequestId`, `state: NOT_COLLECTED`, `nonCollectedAmount` (the request's `missing` at that moment), `reason`, `recordedByMembershipId` and `recordedAt`. It is not a payment, a refund or a booking. A client reads the financial state afterwards.
  - **Errors:**

| Status | Reason | When |
|---|---|---|
| `400` | `validation` | The reason exceeds its limit or the body has an unknown property |
| `401`, `403` | `session_required`; `missing_permission`, `csrf_token_invalid` | No session; the role lacks the permission; the CSRF token is wrong |
| `404` | `not_found` | The booking does not exist in the tenant, or the caller has no active membership |
| `409` | `no_open_supplemental_deposit` | There is no supplemental request to close, or it is already `MET` or `NOT_COLLECTED`: the second application with a new key |
| `409` | `state_changed` | The supplement's evidence is under review, or the state changed concurrently |
| `409` | `idempotency_key_reused`, `idempotency_request_in_progress` | As for every keyed `POST` ([API-DM-10](#api-dm-10-state-changing-posts-require-an-idempotency-key)) |

  - **Idempotency:** the same key and body return the stored response without recording again; a new key after the request is closed is `409 no_open_supplemental_deposit`, so the decision can never be applied twice.

### 7.10 `payments`: cash session

> **Added 2026-11-10** by author decision D-1. Cash is a `payments` subfeature ([modules MOD-DM-01](./modules.md#mod-dm-01-nine-business-modules-and-two-platform-modules)); every operation below is an owner command or query. Proposed for team review.

| Method and path | Operation | Permission | Notes |
|---|---|---|---|
| `GET /cash-sessions/current` | `getCurrentCashSession` | `payments.view` | The open session or `null`, the previous close and whether automatic opening is on; with no previous close the first opening is manual whatever that setting says |
| `GET /cash-sessions` | `listCashSessions` | `payments.view` | Newest first; cursor pagination |
| `GET /cash-sessions/{sessionId}` | `getCashSession` | `payments.view` | Totals, close and adjustments |
| `GET /cash-sessions/{sessionId}/movements` | `listCashMovements` | `payments.view` | In order of occurrence; cursor pagination |
| `POST /cash-sessions` | `openCashSession` | `cash.operate` | `409 cash_session_already_open` (INV-CAJA-01); the tenant's first session is only opened here, with an explicit `openingAmount` |
| `POST /cash-sessions/{sessionId}/movements` | `recordCashMovement` | `cash.movements` | `CASH_IN` or `CASH_OUT` with a reason; `409 cash_session_not_open` |
| `POST /cash-sessions/{sessionId}/close` | `closeCashSession` | `cash.operate` | `expectedRevision` and `countedAmount`; `409 stale_revision` or `cash_session_not_open` |
| `POST /cash-sessions/{sessionId}/adjustments` | `recordCashAdjustment` | Admin only | `expectedRevision`, a non-zero signed amount and a reason; `409 cash_session_not_closed` or `stale_revision` |

### API-DM-22: One shared cash session with physical totals; transfers shown apart

- **Defined:** BR-CAJA-01–11, INV-CAJA-01–09, BR-COB-11 and EJ-21, EJ-36–39.
- **Rule (Proposed):**
  - **Totals.** `cashPayments`, `cashRefunds`, `cashIn`, `cashOut` and `expectedCash`, which is opening cash plus signed physical movements, each cash payment counted once through its movement. `verifiedTransfers` while the session was open is shown apart and never added (EJ-37).
  - **Opening.** *Reworked 2026-11-12 (product-owner agreement; BR-CAJA-03 already asks for an explicit, auditable opening cash).* The tenant's **first** session is always opened manually with `openingAmount`, a figure a person declares: no implicit `0.00` is assumed and `openingReconciliation` is `null`. While there is no open session and no earlier counted close, a cash `POST /payments` returns `409 cash_session_not_open` even when automatic opening is configured (automatic opening cannot open the tenant's first session); once that first session is opened manually, cash payments are accepted in it. Until then, and `getCurrentCashSession` shows `session: null` and `previousClose: null`. Afterwards, `getCurrentCashSession` shows the previous counted cash; a different manual amount needs `reconciliationReason` (`422 opening_difference_requires_reason`) and is recorded in `openingReconciliation` without touching the closed session. Accepting a difference with a reason is a proposal ([API-Q-15](#13-decisions-and-open-questions)). Automatic opening, when configured, takes the previous counted cash (EJ-39).
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

**Public profile for the landing** — `GET /api/v1/public/businesses/barberia-centro`, without a session. The `location` is the proposed public address with an optional Maps link; the `wa.me` link comes from the connected WhatsApp number (D-6, D-7):

<!-- example: PublicBusinessProfile -->
```json
{
  "name": "Barbería Centro",
  "slug": "barberia-centro",
  "timezone": "America/Argentina/Buenos_Aires",
  "branding": null,
  "location": {
    "address": "San Martín 1234, Corrientes",
    "mapsUrl": "https://maps.google.com/?q=Barber%C3%ADa+Centro+Corrientes"
  },
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

**The rest of the price in cash at the counter** — `POST …/payments`, in an open session (EJ-19):

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

**The first cash payment of a business that never opened a session** — the same request fails with `409` even if automatic opening is on; the first session is opened manually with its opening amount (BR-CAJA-03, API-DM-22):

<!-- example: Problem -->
```json
{
  "type": "urn:agendoxa:problem:conflict",
  "title": "There is no open cash session",
  "status": 409,
  "code": "conflict",
  "reason": "cash_session_not_open",
  "detail": "The business has no earlier cash close, so its first session must be opened manually with an opening amount, even if automatic opening is on. Nothing was recorded.",
  "requestId": "req_01JC8QA2H5Z"
}
```

**After a reschedule to a dearer service** — `GET …/bookings/{bookingId}/financial-state`. The booking stays `CONFIRMED`, the initial deposit stays `MET` and the supplement is separate (BR-CAN-10, API-DM-21). With a 30% deposit the destination's current requirement, `requiredDeposit` in the booking summary, is `"4200.00"`; the `3000.00` allocated cover part of it and the shortfall, `"1200.00"`, is the requested supplement. The summary field is read from the conditions, not added up from the two:

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

**A reschedule to a cheaper service** — `POST …/bookings/{bookingId}/reschedule`. The initial deposit was `3000.00`; the destination requires `1500.00`, so `requiredDeposit` is `"1500.00"`, the booking stays `CONFIRMED` and `supplementalDeposit` is present and `null`. The `3000.00` stay allocated and nothing is refunded or credited (BR-CAN-11):

<!-- example: RescheduleResult -->
```json
{
  "booking": {
    "booking": {
      "id": "7b9d1f3a-5c7e-4a9b-8d1f-3a5c7e9b1d2e",
      "status": "CONFIRMED",
      "origin": "WHATSAPP",
      "customer": { "id": "e2a4c6e8-0b2d-4f6a-8c0e-2a4c6e8a0b2d", "fullName": "Lucía Fernández" },
      "attendeeName": null,
      "service": { "id": "8b1d3f5a-7c9e-4b2d-8f1a-3c5e7a9b1d3f", "name": "Corte" },
      "resource": { "id": "1f3a5c7e-9b2d-4f6a-8c1e-3a5c7e9b2d4f", "name": "Martín" },
      "startAt": "2026-11-13T14:00:00Z",
      "endAt": "2026-11-13T14:30:00Z",
      "agreedPrice": "5000.00",
      "requiredDeposit": "1500.00",
      "depositState": "MET",
      "supplementalDepositState": null,
      "pendingOperationalClose": false,
      "holdExpiresAt": null
    },
    "attendeePhone": null,
    "noticeMinutes": 600,
    "depositRefundPolicy": "NO_MONEY_BACK",
    "blockedException": false,
    "depositException": false,
    "createdByMembershipId": null,
    "cancelReason": null,
    "createdAt": "2026-11-10T15:00:00Z",
    "updatedAt": "2026-11-11T13:02:00Z"
  },
  "previousSlot": {
    "resourceId": "1f3a5c7e-9b2d-4f6a-8c1e-3a5c7e9b2d4f",
    "startAt": "2026-11-12T14:00:00Z",
    "endAt": "2026-11-12T15:30:00Z"
  },
  "lateChange": false,
  "supplementalDeposit": null
}
```

**Personnel decide not to collect the supplement** — `POST …/bookings/{bookingId}/supplemental-deposit/non-collection` with an `Idempotency-Key` and `X-CSRF-Token` (BR-CAN-15):

<!-- example: CloseSupplementalDepositRequest -->
```json
{ "reason": "El saldo se cobra en el turno" }
```

`200 OK`. The `1200.00` request is closed and recorded; no payment, charge, price or status changed, and repeating it with a new key is `409 no_open_supplemental_deposit`:

<!-- example: SupplementalDepositClosure -->
```json
{
  "bookingId": "7b9d1f3a-5c7e-4a9b-8d1f-3a5c7e9b1d2e",
  "changeRequestId": "b3d5f7a9-1c3e-4b5d-9f7a-1c3e5b7d9f1a",
  "state": "NOT_COLLECTED",
  "nonCollectedAmount": "1200.00",
  "reason": "El saldo se cobra en el turno",
  "recordedByMembershipId": "4d6f8a0c-2e4a-4d6f-8a0c-2e4a6c8e0a2b",
  "recordedAt": "2026-11-11T16:20:00Z"
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
| `src/contracts/common.ts` | `Uuid`, `Instant`, `LocalDate`, `LocalTime`, `Money`, `Percentage`, `PositiveMoney`, `SignedMoney`, `NonZeroSignedMoney`, `Minutes`, `PhoneE164`, `Weekday`, `Reason`, `Page`, `TimeRange`, `NamedRef` | All of the below |
| `src/contracts/problem.ts` | `Problem`, `LateChangeNotice`, `AllocationLimit` | Web error handling; API error filter |
| `src/contracts/session.ts` | `SignInRequest`, `SessionView`, `MembershipSummary`, `TenantContextView` | Web sign-in and business selector |
| `src/contracts/tenants.ts` | `TenantProfile`, `UpdateTenantProfileRequest`, `PublicBusinessProfile`, `PublicLocation`, `WeeklyHours` | CRM settings; landing |
| `src/contracts/catalog.ts` | `Service`, `Resource`, their create and update requests, `PublicService`, `DepositRule` (a union discriminated by `mode`: `DepositRuleDisabled`, `DepositRuleFixed`, `DepositRulePercentage`), `TenantPolicyFields`, `OverridePolicyFields`, `BookingPolicy`, `EffectiveBookingPolicy`, `PolicySource`; calendars: `Calendar`, `WeeklyRules`, `AvailabilityException`, `CreateAvailabilityExceptionRequest`, `ResourceWindows` | CRM configuration, hours and blocks; landing |
| `src/contracts/bookings.ts` | `BookingStatus`, `DepositState`, `SupplementalDepositState`, `BookingSummary`, `BookingDetail`, `BookingEvent`, `FreeSlot`, `AgendaView`, `CustomerInput`, `AdminException`, `DepositInput`, `DepositAllocationItem`, the command requests, `RescheduleResult` | CRM agenda and booking actions |
| `src/contracts/customers.ts` | `CustomerSummary`, `CustomerDetail`, `CustomerIndicators`, `CreateCustomerRequest`, `UpdateCustomerRequest`, `Restriction`, `RestrictionKind`, the restriction requests, `Incident`, `CreateIncidentRequest` | CRM customers |
| `src/contracts/payments.ts` *(added 2026-11-10)* | Evidence: `EvidenceUpload`, `EvidenceInput`, `SubmitPaymentEvidenceRequest`, `PaymentReview`, `PaymentReviewStatus`, `ReviewArrival`, `ApprovePaymentReviewRequest`, `RejectPaymentReviewRequest`, `PaymentReviewDecisionResult`. Money: `PaymentMethod`, `Payment`, `PaymentAllocation`, `AllocationItem`, `RecordPaymentRequest`, `PaymentResult`, `AllocatePaymentRequest`, `ReverseAllocationRequest`, `AllocationResult`, `ReceivingAccount`. Financial state: `BookingFinancialState`, `ChargeView`, `InitialDeposit`, `SupplementalDeposit`, `CloseSupplementalDepositRequest`, `SupplementalDepositClosure`. Cash: `CashSession`, `CashTotals`, `CashMovement`, `CashAdjustment`, `CurrentCashSessionView` and the cash requests | CRM review queue, collection and cash register |

Files follow the owner modules of [modules MOD-DM-01](./modules.md#mod-dm-01-nine-business-modules-and-two-platform-modules); calendar schemas live in `catalog.ts` because calendars belong to `catalog` *(reconciled 2026-11-10; the earlier `availability.ts` is merged)*, and cash schemas live in `payments.ts` for the same reason. The multipart `EvidenceUploadForm` is not a Zod schema: the API validates the file with the CON-03 storage rules. Adding these schemas is a [shared change](./modules.md#9-technical-autonomy-and-shared-changes) for `apps/web` and `apps/api`. They are created with the first endpoint that uses them, not all at once.

## 10. Internal consumers: the agent

### API-DM-15: The agent reuses module use cases in-process, not the HTTP API

- **Defined:** Agent tools call the same use cases as the CRM, with tenant and requester fixed by the validated WhatsApp connection; the model chooses neither (BR-AGT-02, BR-CH-05). The agent cannot verify transfers, infer no-shows, change cash records or obtain personnel privileges (BR-AGT-04). It may submit transfer evidence, recorded with the trusted timestamp and screened where applicable before human review ([§10.1](#101-receipt-evidence-screening-is-not-human-review)); neither the file nor its screening proves payment (BR-COB-07, INV-PAY-04, INV-SEN-12). CON-01 lists the operations allowed to it ([modules §8.2](./modules.md#82-for-con-03-integration-contracts)).
- **Rule (Proposed):**
  - The agent has no HTTP credential, service account or endpoint of its own. It calls module facades and `workflows` coordinators inside the API process, through their plain public contracts ([modules MOD-DM-10](./modules.md#mod-dm-10-a-modules-public-surface-separates-contracts-from-nest-composition)): owners directly for reads, coordinators for composite changes, without pass-through wrappers ([modules §5.2](./modules.md#52-coordination-and-asynchronous-activation)). Authorization is the conversation's requester and never a personnel role.
  - What the customer sees is not the CRM view. A tool result never includes `currentRestriction`, `indicators`, `blockedException`, internal reasons or other labels (BR-AGT-03, INV-CLI-06). A `BLOCKED` customer is refused as when they cannot book, without the reason.
  - Tool input and output schemas belong to CON-03 ([API-DM-23](#api-dm-23-typed-agent-tool-contracts-belong-to-con-03-this-document-fixes-operations-and-refusal-codes)). They reuse the `code` and `reason` values of [§5](#5-errors), so the agent and the CRM interpret refusals the same way.

> **Reconciled 2026-11-10:** the "Facade" column follows [modules §8.2](./modules.md#82-for-con-03-integration-contracts): waitlist is in `bookings`, and composite changes go through `workflows`.

| Operation for the requester | Facade | Equivalent CRM endpoint | Difference |
|---|---|---|---|
| Business information, services and prices | Read composition above `tenants`, `catalog`, `messaging` | Public endpoints | Allowlisted public data only |
| Find free slots | `bookings` | `GET /free-slots` | Same search and lead time |
| Consult own future bookings | `bookings` | `GET /bookings` | Only bookings managed by the sender number (CU-07, INV-CAN-01) |
| Create a HOLD; confirm it without a deposit | `workflows` | None | WhatsApp only (BR-RES-03–04) |
| Cancel or reschedule own booking | `workflows` | `/cancel`, `/reschedule` | Always `CUSTOMER_REQUEST`; `acceptLateConsequence` only after the customer's explicit confirmation; never an Admin exception |
| Join or leave the waitlist; list own entries; claim an invitation | `bookings`, or `workflows` when the change spans owners | None | Requester-owned entries and claimable invitations only |
| Read payment status | `payments`, through a read composition with `bookings` | `GET /bookings/{bookingId}/financial-state` *(2026-11-10)* | Customer-facing result only: what is still missing and whether evidence is being checked. The backend derives a safe action from the trusted persisted correction cause: resend only for invalid verification, never valid-funds reassignment or started/completed bookings. Never expose the reversal, private reason, actor, reviewer, `arrivedVia` or cash data |
| Submit receipt evidence and screen files when applicable | `agent` screening adapter, then protected `workflows` operations | `POST /bookings/{bookingId}/payment-reviews` *(2026-11-10)* | The CRM path has no screening and cannot target a `HOLD` or released booking. WhatsApp intake retains evidence and applies [§10.1](#101-receipt-evidence-screening-is-not-human-review), including booking-less personnel review and deadline-release outcomes; it never verifies, credits or renews a deadline. A reported transfer is not evidence of money (BR-SEN-17); CON-03 defines the tool contract |
| Record notice preferences; request or withdraw deletion | `workflows` (`customers`, `bookings`, `audit`, and the deletion participants) | None | Customer channel only (CU-19, CU-23) |
| Escalate to a human with a summary | `messaging` | None | — |

CON-03 also proposes `prepareCustomerAction`, `listOwnWaitlistEntries` and `leaveWaitlist` as supporting operations for already permitted customer actions; preparation does not itself change state. Evidence can be submitted without a booking for personnel review. Composite WhatsApp intake returns dispositions including `SCREENING_PENDING`, `HUMAN_REVIEW`, `LATE_FINANCIAL_HANDLING`, `REBLOCKED_FOR_REVIEW`, `PRIORITY_PERSONNEL_REVIEW` and `RELEASED_UNRELATED`; these are not HTTP deposit states. Pending screening remains `AWAITING_EVIDENCE` in the current HTTP projection; optional CRM display is API-Q-11, not a new enum.

The proposed `relinkLateReceipt` is a separate idempotent operation, not duplicate intake. Only evidence sent after the deadline of a booking released by deadline expiry and still unallocated may be linked to a new same-tenant, same-requester HOLD on current terms with explicit confirmation. It returns `HUMAN_REVIEW`, preserves the old booking and timestamps, and adds no attempt; repeating the same receipt/booking returns the same result, while a different target or failed guard changes nothing. Evidence relating to explicit cancellation or a different terminal cause is not eligible. The agent never verifies or allocates money.

**Never available to the agent:** recording or correcting outcomes, remainder walk-ins, restrictions and incidents, configuration, deposit and Admin exceptions, payment verification and allocation, approving or rejecting a review, cash operations and conversation control. These exist only as authenticated CRM endpoints. *(2026-11-10:)* the money ones are now specified: `approvePaymentReview`, `rejectPaymentReview`, `recordPayment`, `allocatePayment`, `reversePaymentAllocation` and every `/cash-sessions` command ([§7.7](#77-payments-evidence-and-human-review) to [§7.10](#710-payments-cash-session)).

### API-DM-23: Typed agent tool contracts belong to CON-03; this document fixes operations and refusal codes

> **Added 2026-11-10** by author decision D-3 ([§14.1](#141-scope-differences-with-the-rewritten-issue-11)). Proposed for team review.

- **What:** The rewritten #11 asks CON-02 for typed contracts for internal consumers that are not HTTP, and the rewritten #12 asks CON-03 for typed contracts for the agent. One ticket has to own them.
- **Defined:** Tools are inbound adapters of `agent` over the facades above; CON-03 defines the runtime adapter and the tool input and output schemas ([modules §8.2](./modules.md#82-for-con-03-integration-contracts)).
- **Rule (Proposed):**
  - **CON-03 writes the typed tool contracts:** names, input and output schemas, failures, timeouts and escalation. They are not in the OpenAPI file or in `packages/shared`, because no HTTP client uses them ([API-DM-14](#api-dm-14-packagesshared-holds-the-http-contracts-as-zod-schemas-and-nothing-else)).
  - **This document fixes authority boundaries:** the permitted operations, including the supporting operations above, and the "never available" list, plus the customer-facing projection of [API-DM-15](#api-dm-15-the-agent-reuses-module-use-cases-in-process-not-the-http-api). CON-03 defines the typed surface and its supporting operation names and outcomes; no tool returns a CRM-only field.
  - **Refusals use the shared `code` and `reason` vocabulary of §5 where applicable.** CON-03 defines additional internal-tool outcomes and refusals. The agent never reveals a restriction or label (BR-AGT-03).

| Operation for the requester | Refusals the facade may return (`code`: `reason`) |
|---|---|
| Find free slots | `validation`: `range_too_large`; `rule_violation`: `inactive_service` |
| Create a HOLD | `conflict`: `slot_unavailable`; `rule_violation`: `slot_in_past`, `booking_lead_not_met`, `outside_open_hours`, `incompatible_resource`, `inactive_service`, `inactive_resource`, `future_booking_limit_reached`, `requester_not_eligible` |
| Confirm a HOLD without deposit | `conflict`: `state_changed` (the HOLD expired or changed) |
| Cancel or reschedule own booking | `not_found` (not managed by the sender number, INV-CAN-01); `conflict`: `state_changed`, `slot_unavailable`; `rule_violation`: `late_change_requires_acceptance`, `reschedule_limit_reached`, `requester_not_eligible` and the slot reasons of a HOLD |
| Join the waitlist; claim an invitation | `conflict`: `slot_unavailable`, `state_changed`; `rule_violation`: `waitlist_full`, `invitation_no_longer_available`, `requester_not_eligible` |
| Read payment status | `not_found` |
| Submit receipt evidence | `validation`: `unsupported_media_type`, `file_too_large`. CRM `booking_released` refuses that HTTP association only; WhatsApp composite intake retains evidence and reports its disposition, not a data-losing refusal. A screening outcome is never a refusal |
| Notice preferences; deletion request | `conflict`: `state_changed` |

  `requester_not_eligible`, `waitlist_full` and `invitation_no_longer_available` are agent-only reasons proposed here: the first covers a `BLOCKED` requester without saying so (BR-AGT-03, INV-CLI-06), where the CRM would get `customer_blocked_requires_acknowledgement`; the others name BR-WL-14 and an invitation already taken or expired. `admin_only` and `missing_permission` can never reach the agent, because it never sends an exception or acts as personnel.

### 10.1 Receipt evidence: screening is not human review

> **Added 2026-11-10** to reconcile with BR-SEN-14–16 and INV-SEN-12–13, and with the screening criterion of the rewritten [Issue #11](https://github.com/nanonoir/Agendoxa/issues/11).

- **Defined:** Authenticated WhatsApp evidence is timely when the valid provider-assigned send time is at or before the deadline; if missing or invalid, trusted ingress arrival is used. Device time and screening completion are not authoritative. Committed duplicates retain the first recorded timestamp and add no attempt; if the first intake transaction never committed, the retry uses its current arrival and invents no earlier time. Expiry processing waits a configurable margin, default 15 seconds, without extending the customer deadline (BR-SEN-16, INV-SEN-02–03). Screening checks only whether an image or PDF plausibly is a transfer receipt, never its authenticity or bank credit (BR-SEN-14, INV-SEN-12). The receipt and screening record commit before the provider call, outside any transaction; the result is applied in a new transaction that rechecks current state ([modules §6.2](./modules.md#62-transactions)).

| Screening outcome (for timely evidence while the booking still occupies; after release see BR-SEN-20 below, added to UC-03 by PR #34) | Effect on the booking | Customer is told | Human rejection? |
|---|---|---|---|
| Plausible receipt | Human review, `depositState: UNDER_REVIEW`; from a `HOLD`, the booking moves to `PENDING_PAYMENT_REVIEW` | Confirmation follows verification | No |
| First clearly unrelated file | No review; same deadline, no renewal of the `HOLD` or correction window | It does not look like a receipt; send a correct one | No |
| Second clearly unrelated attempt | Human review, without inactivity timeout, even if screening ends after the deadline | The attempts failed; wait for human review | No |
| Uncertain result or technical failure | Human review; never labelled unrelated | Confirmation follows verification, without claiming anyone checked the bank | No |
| Duplicate delivery of the same attempt | None; not another attempt | — | No |
| Text fallback after explicit inability to attach (BR-SEN-12) | Human review directly, no screening | Confirmation follows verification | No |

  Evidence sent late is retained for human financial handling and never revives the old booking. Timely evidence delivered after release can reactivate the original booking only after HOLD expiry or correction-window timeout, never explicit cancellation or another terminal cause (BR-SEN-20, added to UC-03 by PR #34). Screen files first: plausible, uncertain or technical failure qualify; authorized text fallback goes directly to review. Under transactional lock, a free slot reactivates the same booking on original terms; an unclaimed exclusive waitlist claim is withdrawn atomically first, with invitee notification after commit and preserved entry priority. Any other occupancy or unavailability, including review, partial funds, blocks or private remainder, goes to priority personnel review without displacement. Clearly unrelated files do not re-block. Sources: BR-SEN-12, BR-SEN-14–16, BR-SEN-19–20 (the last two added to UC-03 by PR #34), INV-SEN-02, INV-SEN-12–13, [UC-02 CU-03](../product-specs/uc-02/use-cases.md#cu-03) step 5 and A4.

- **Rule (Proposed):**
  - **Two different results, two different contracts.** The screening outcome is an internal result of the agent's `receipt-screening` port, consumed by the protected `workflows` operation; it has no HTTP endpoint, and its result values belong to CON-03 ([§11.1](#111-for-con-03-external-integrations)). The human decision is only `approve` or `reject` on a payment review, an authenticated CRM command of `payments` through `workflows` ([§7.7](#77-payments-evidence-and-human-review), *specified 2026-11-10*). Only that decision counts for BR-SEN-10.
  - **No HTTP field reports a screening outcome as a financial state.** The CRM sees a review and how it arrived, in `arrivedVia` ([API-DM-19](#api-dm-19-evidence-reaches-people-through-review-only-a-human-decision-approves-or-rejects)). It never sees "rejected by AI" or "verified by AI", and personnel do not approve or override screening itself.
  - **Attempt counting is not exposed or reset by contract.** Whether the clearly unrelated count carries over after a human decision or into a later correction round is pending in [P-40](../product-specs/uc-03/business-rules.md#16-pending-decisions); no field or endpoint assumes either answer.
  - **No retry adds time.** No CRM or agent operation changes `holdExpiresAt` or the correction deadline because a file was replaced or rescreened (INV-SEN-13).

## 11. Left to CON-03 and to the next contract increment

### 11.1 For CON-03 (external integrations)

CON-03 ([#12](https://github.com/nanonoir/Agendoxa/issues/12)) defines these contracts; this document only fixes where they meet the API.

| Integration | CON-03 defines | Constraint from this document |
|---|---|---|
| WhatsApp webhook (Evolution API) | Inbound route, origin verification, payload normalization, deduplication and the responses the provider expects | An inbound adapter of `messaging`. It takes no session or CSRF token, and its tenant comes from the connection, never from a parameter (INV-MSG-02) |
| Agent tools (LangGraph) | The typed tool contracts: names, input and output schemas, results, failure handling and escalation *(assigned to CON-03 on 2026-11-10 by author decision D-3, [API-DM-23](#api-dm-23-typed-agent-tool-contracts-belong-to-con-03-this-document-fixes-operations-and-refusal-codes))* | Only the allowed operations of [§10](#10-internal-consumers-the-agent), never the "never available" ones; customer-facing results only; refusals with the `code` and `reason` values of §5 and the agent-only reasons of API-DM-23 |
| Durable jobs (pg-boss) | Job names, payloads, scheduling and retries | Jobs from [modules §6.6](./modules.md#66-jobs); no job is exposed over HTTP |
| Receipt screening *(added 2026-11-10)* | The replaceable `receipt-screening` port of `agent`: result values (plausible, clearly unrelated, uncertain or technical failure), model and versioning, timeout, latency measurement, recovery, data minimization. Gemini Flash and five seconds are the requested direction and an objective, not guarantees ([modules §8.2](./modules.md#82-for-con-03-integration-contracts)) | The outcomes and effects of [§10.1](#101-receipt-evidence-screening-is-not-human-review). No HTTP endpoint; no result verifies money, counts as a human rejection or adds time. The attempt boundary in P-40 stays open |
| Private file storage | Storage, authorized reads and deletion; accepted media types and size limits | Receipts enter through `POST /payment-evidence-uploads` and are read through `GET /payment-reviews/{reviewId}/evidence`, both authenticated `payments` endpoints *(2026-11-10)*; no public file links (DM-14). Deleting unlinked uploads is open ([API-Q-12](#13-decisions-and-open-questions)) |
| Manual transfer instructions *(added 2026-11-10)* | How messages and the agent consume the alias or bank details already issued | Issued and persisted by `payments` before they are shown; a retry reuses them and never rotates again (BR-SEN-06). Not a provider contract |
| Payment gateway | Nothing | No provider in the MVP (BR-SEN-08, MVP §5.3). *Resolved 2026-11-10:* the rewritten [#12](https://github.com/nanonoir/Agendoxa/issues/12) removed Mercado Pago, gateways and bank APIs from its scope |

### 11.2 Next contract increment

These CRM operations are needed by the MVP and identified here so that their contracts follow the same conventions. Paths are relative to `/api/v1/tenants/{tenantId}` and are **Proposed**; schemas come in the next increment.

> **Reconciled 2026-11-10:** the former `cash-register` rows belong to `payments`; the "Through" column names the `workflows` coordinator where an operation changes several owners ([API-DM-12](#api-dm-12-each-endpoint-belongs-to-the-module-that-owns-its-operation)). Paths are unchanged.
>
> **Updated 2026-11-10** by author decision D-1: the review queue, evidence submission and download, approval and rejection, payments, allocations and their reversal, the cash session, its movements and adjustments are now specified in [§7.7](#77-payments-evidence-and-human-review) to [§7.10](#710-payments-cash-session), and their rows are removed here. `GET /receiving-accounts` moved too; creating and editing accounts stays.

| Owner (tag) | Method and path | Through | Use case | Note |
|---|---|---|---|---|
| `payments` | `POST /payments/{paymentId}/corrections`; `POST /payments/{paymentId}/refunds` | Owner; `workflows` if a correction changes a booking's deposit state | CU-11 A3, A6 | Corrections append history (T-03); refunds Admin-only. They reuse the `allocationLimit` caps and the `refundedAmount` of [§7.8](#78-payments-verified-payments-and-explicit-allocation) |
| `payments` | `POST`, `PATCH /receiving-accounts`; `PUT /settings/collection` | Owner; `tenants` stores the field ([modules MOD-DM-06](./modules.md#mod-dm-06-shared-rows-have-one-row-owner-and-named-field-owners)) | CU-15 | Collection mode and rotation (BR-COB-19) |
| `payments` | `PUT /settings/cash` | Owner; `tenants` stores `cash_auto_open` | CU-13, CU-15 | Automatic opening (BR-CAJA-03); configuration, last-write-wins. It takes effect only after a counted close; the first session is manual ([API-DM-22](#api-dm-22-one-shared-cash-session-with-physical-totals-transfers-shown-apart)) |
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
| [API-DM-02](#api-dm-02-full-contracts-for-context-five-areas-and-the-priority-money-flows-the-rest-of-the-crm-is-identified) | Full contracts for context, five areas and the priority money flows; other CRM operations identified *(updated 2026-11-10, D-1)* |
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
| [API-DM-18](#api-dm-18-money-operations-rely-on-state-guards-and-caps-the-cash-close-and-adjustments-add-a-revision-precondition) | Money operations: state guards and caps; `expectedRevision` for cash close and adjustments *(2026-11-10, D-5)* |
| [API-DM-19](#api-dm-19-evidence-reaches-people-through-review-only-a-human-decision-approves-or-rejects) | Uploads, CRM evidence and human review; `arrivedVia` is routing, not a verdict *(2026-11-10, D-1)* |
| [API-DM-20](#api-dm-20-a-payment-is-verified-money-only-listed-allocations-reduce-a-balance) | Verified payments and explicit, capped allocation; a reversal can return a `CONFIRMED` booking below its threshold to `PENDING_PAYMENT_REVIEW`, never cancels *(2026-11-10, D-1; reworked 2026-11-12)* |
| [API-DM-21](#api-dm-21-initial-deposit-supplemental-deposit-credit-outcome-and-cash-are-separate-fields) | Initial deposit, supplemental deposit, credit, outcome and cash in separate fields *(2026-11-10, D-2)* |
| [API-DM-22](#api-dm-22-one-shared-cash-session-with-physical-totals-transfers-shown-apart) | One shared cash session with physical totals; transfers apart; Admin-only adjustments *(2026-11-10, D-1)* |
| [API-DM-23](#api-dm-23-typed-agent-tool-contracts-belong-to-con-03-this-document-fixes-operations-and-refusal-codes) | Typed agent tool contracts in CON-03; operations and refusal codes here *(2026-11-10, D-3)* |
| [API-DM-24](#api-dm-24-multi-owner-commands-have-a-minimum-contract-here-code-level-participant-contracts-belong-to-31) | Multi-owner commands: participants, rechecks, result and errors here; code-level participant contracts in #31 *(2026-11-12, D-4)* |
| [API-DM-25](#api-dm-25-a-response-carries-another-owners-facts-only-if-it-is-composed-above-the-owners) | A response carries another owner's facts only in an in-transaction result or a read composed above the owners, or is reduced to owner data *(2026-11-12)* |
| [API-DM-26](#api-dm-26-a-supplemental-deposit-request-can-be-closed-without-collecting-it) | A supplemental deposit request can be closed without collecting it; terminal `NOT_COLLECTED` *(2026-11-12)* |

These questions are flagged, not resolved here.

| ID | Question | Why it matters | Owner | Blocks |
|---|---|---|---|---|
| `API-Q-01` | Where is the business location stored? The landing shows it (MVP §7.2), but `Tenant` has no address field. *Proposed 2026-11-12 (product-owner agreement):* a public business address text plus an optional Maps link on `Tenant`, shown in the public profile as `location` | The contract carries `location` (`null` until set) but the attributes are only proposed in the [ERD](./erd.md#tenant) and not migrated | Product, with DOM-01 | Adoption of the attributes; location on the landing |
| `API-Q-02` | What are the real permission keys? §4 uses placeholders | Each protected endpoint names one | `identity` design | The first protected endpoint |
| `API-Q-03` | Can personnel change an existing customer's phone, and how? | The phone is the WhatsApp identity; the ERD asks for safe identity handling | Product | Phone edits only |
| `API-Q-04` | What happens to future bookings when a compatibility link is removed? | Needs the locking protocol between catalog and booking writes | [#31](https://github.com/nanonoir/Agendoxa/issues/31) | Nothing in this contract; existing bookings are kept |
| `API-Q-05` | What is the default reminder lead time? | No value is agreed; with `null` no reminder is scheduled | Product | Reminders |
| `API-Q-06` | Where are idempotency records stored? | They are not an ERD entity | Implementation, with REP-03 or [#31](https://github.com/nanonoir/Agendoxa/issues/31) | The first POST endpoint |
| `API-Q-07` | What does `availability_rules.weekday` 0–6 mean? Proposal: 0 is Sunday, as in PostgreSQL | The API uses names, so the mapping must be fixed once | REP-02 owner | The first availability endpoint |
| `API-Q-08` | How are passwords set and recovered, how long do sessions last, and how are personnel invited ([TEN-Q6](./tenancy.md#10-open-questions))? Does any installation put the web and the API on different sites? | API-DM-06 covers the session only; a cross-site deployment needs the Next.js server as a proxy | `identity` and authentication design | Sign-in implementation |
| `API-Q-09` | Should the architecture proposal add `rule_violation` to its error categories? | API-DM-09 uses it | Team, in the architecture review | Nothing |
| `API-Q-10` | Where do cross-owner read compositions live (public profile, agenda and booking reads with `depositState`, customer indicators, overview)? CON-01 requires them above the owners ([modules §6.4](./modules.md#64-queries-and-read-compositions)) but names no folder, and `workflows` is defined for multi-owner business operations | `tenants` and `customers` cannot import the owners they would compose ([modules MOD-DM-07](./modules.md#mod-dm-07-dependencies-only-point-to-lower-levels)) | Team, with CON-01 | The first composed endpoint |
| `API-Q-11` | Should the CRM optionally display that timely evidence is under preliminary screening? Today the HTTP deposit projection shows `AWAITING_EVIDENCE` and a `holdExpiresAt` that may already have passed ([API-DM-13](#api-dm-13-seven-statuses-with-derived-conditions-as-separate-fields)) | CON-03's separate internal screening disposition does not change the HTTP enum; any optional display is future team review | Team, with CON-03 | Nothing in this increment |
| `API-Q-12` | What approved retention and deletion policy applies to unlinked evidence uploads? Usability expiry is distinct from physical retention; no age-only deletion or retention duration is agreed ([API-DM-19](#api-dm-19-evidence-reaches-people-through-review-only-a-human-decision-approves-or-rejects)) | Personal data; INV-DAT-03 requires product/legal policy before deployment | Product/legal, with CON-03 storage | `uploadPaymentEvidence` |
| `API-Q-13` | **Closed 2026-11-12 (product-owner agreement).** The question was whether verified funds linked to a booking but not yet allocated (`AWAITING_ALLOCATION`) protect occupancy. Verifying money for an active booking now allocates it in the same human action, up to the amount owed, so the verification action never leaves payable debt unallocated (BR-SEN-07, BR-COB-03–04, INV-SEN-14); excess, unmatched money and funds freed by a reversal stay unallocated (BR-COB-02, BR-COB-17) | `AWAITING_ALLOCATION` was removed from `depositState`; BR-SEN-10 and BR-SEN-11 keep their allocation-based reading | Product (done) | Nothing |
| `API-Q-14` | **Closed 2026-11-12 (product-owner agreement, for team review).** A not-yet-started `CONFIRMED` booking dropped below its initial threshold by reversal returns to protected `PENDING_PAYMENT_REVIEW`. Only invalid verification requests another receipt; valid-payment reassignment does not, even for the same payer. Started or completed bookings retain status and get no resend notice (BR-SEN-18, INV-SEN-15; [API-DM-20](#api-dm-20-a-payment-is-verified-money-only-listed-allocations-reduce-a-balance)) | Adds the transition by personnel reversal; seven statuses unchanged; `reversePaymentAllocation` is a `workflows` command; `UNALLOCATED` and `PARTIAL` are status-neutral | Product (done) | Nothing |
| `API-Q-15` | When declared opening cash differs from the previous counted cash, is the opening accepted with a reason? Proposal: yes, recorded in `openingReconciliation` ([API-DM-22](#api-dm-22-one-shared-cash-session-with-physical-totals-transfers-shown-apart)) | BR-CAJA-03 asks to reconcile with the previous close but not what happens with a difference | Product | `openCashSession` |
| `API-Q-16` | **Closed 2026-11-12 (product-owner agreement).** The question was how personnel close a supplemental-deposit request they decide not to collect (BR-CAN-14, P-28). Answer: BR-CAN-15, specified as `closeSupplementalDepositWithoutCollection` and the terminal `NOT_COLLECTED` ([API-DM-26](#api-dm-26-a-supplemental-deposit-request-can-be-closed-without-collecting-it)) | The booking stays `CONFIRMED`; no payment, charge or price changes | Product (done) | Nothing |
| `API-Q-17` | Does evidence attached by personnel from the CRM skip preliminary screening? Proposal: yes, as CU-03 CRM step 2b records it as pending review | BR-SEN-14 speaks of submitted evidence without naming the channel | Product | `submitPaymentEvidence` |
| `API-Q-18` | **Closed 2026-11-12 (product-owner agreement).** The question was whether a supplemental request whose evidence is under review may be closed without collecting it. Answer: no; the review is resolved first (BR-CAN-15, INV-CAN-10), and the operation returns `409 state_changed` meanwhile | A rejection returns the request to `REQUESTED`, where it can be closed | Product (done) | Nothing |
| `API-Q-19` | *(2026-11-12)* `createCustomerIncident` requires a `bookingId` that the `customers` owner cannot verify without `bookings`. Where does that check live: a `workflows` coordinator, a read composition, or dropping the field? | An unverified `bookingId` could link an incident to a booking of another customer; needs an architecture decision ([API-Q-10](#13-decisions-and-open-questions), [API-DM-24](#api-dm-24-multi-owner-commands-have-a-minimum-contract-here-code-level-participant-contracts-belong-to-31)). No change in this PR | Team, with CON-01 and [#31](https://github.com/nanonoir/Agendoxa/issues/31) | `createCustomerIncident` with `bookingId` |

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
| Landing location | MVP §5.1 and §7.2 and the rewritten #11 show location | Public address text and optional Maps link, proposed on `Tenant` in the [ERD](./erd.md#tenant) (2026-11-12) and not migrated | Proposed; pending ERD/DOM-01 adoption (API-Q-01) |
| Weekly hours | The schema stores `weekday` 0–6 without a convention | Names in the API | Open (API-Q-07) |
| Agreed-price change | CU-11 A5 is a payment case | `agreed_price` is a `Booking` field, so its endpoint is tagged `bookings` and goes through `workflows` because it changes the charge ([§11.2](#112-next-contract-increment)) | Proposed |
| Money flows *(2026-11-10)* | BR-SEN-07–16, BR-COB-02–17, BR-CAJA-01–11, INV-PAY, INV-CAJA, ERD module 5, CU-03, CU-11, CU-13 | [§7.7](#77-payments-evidence-and-human-review) to [§7.10](#710-payments-cash-session), API-DM-18 to API-DM-22 | Proposed by author decisions D-1, D-2, D-5; API-Q-12 to API-Q-17 open; P-40 not assumed |
| Typed agent contracts *(2026-11-10)* | The rewritten #11 and #12 both ask for them | CON-03 writes them; operations and refusal codes here ([API-DM-23](#api-dm-23-typed-agent-tool-contracts-belong-to-con-03-this-document-fixes-operations-and-refusal-codes)) | Proposed by author decision D-3 |
| PR #33 remediation *(2026-11-12)* | UC-03 BR-SEN-07, BR-SEN-17, BR-COB-02–04, BR-COB-17, BR-CAN-11, BR-CAN-15, INV-SEN-14 and INV-CAN-10, recorded as product-owner agreements of 2026-11-12 | [API-DM-21](#api-dm-21-initial-deposit-supplemental-deposit-credit-outcome-and-cash-are-separate-fields) to API-DM-26, §7.7–§7.10 | Proposed; the agreements are not team ratification or implementation |

### 14.1 Scope differences with the rewritten Issue #11

> **Added 2026-11-10.** These are differences between the rewritten Issue and this proposal. *Updated the same day:* the author decided D-1, D-2, D-3 and D-5; their resolutions are **proposals for team review**, not ratified. D-4, D-6 and D-7 stayed open then. *Updated 2026-11-12:* the product owner agreed D-4, the location part of D-7 and the WhatsApp-link part of D-6. The precise CON-01 §8.1 read composition is now proposed for team review, not ratified.

| # | The rewritten Issue asks | This proposal before the decision | Decision needed | Status |
|---|---|---|---|---|
| D-1 | Priority CRM operations for receipts and human review, explicit allocation, financial states and cash "needed for those flows" | Only identified, with path, owner and coordinator, in [§11.2](#112-next-contract-increment); no schemas | Which of them are priority for CON-02, and whether they are specified in this PR or in a follow-up CON-02 increment | **Resolved 2026-11-10 by author decision, proposed for review:** specified in this document with endpoint, permission, schemas, errors, idempotency, examples, owner and coordinator ([§7.7](#77-payments-evidence-and-human-review) to [§7.10](#710-payments-cash-session), API-DM-19, API-DM-20, API-DM-22). Corrections, refunds and collection settings stay in §11.2 |
| D-2 | Represent pending review, partial-deposit waiting and **supplemental** deposit separately from credit, service outcome and physical cash balance | `depositState` covers the initial deposit (API-DM-13); `status` covers the outcome. Nothing represents the supplemental collection after a reschedule (BR-CAN-10) or the cash balance | Whether `BookingSummary` gets a separate supplemental field now, or with D-1 | **Resolved 2026-11-10 by author decision, proposed for review:** `supplementalDepositState` on `BookingSummary`, amounts in the financial state and `RescheduleResult`, cash balance only on `CashSession` ([API-DM-21](#api-dm-21-initial-deposit-supplemental-deposit-credit-outcome-and-cash-are-separate-fields)) |
| D-3 | Typed contracts for internal consumers that are not HTTP (agent tools) | [§10](#10-internal-consumers-the-agent) lists the operations and refusal codes; tool input and output schemas are left to CON-03, whose rewritten #12 also asks for "typed contracts" for the agent | Which ticket owns the typed tool contracts, or how CON-02 and CON-03 split them | **Resolved 2026-11-10 by author decision, proposed for review:** CON-03 writes them; §10 keeps allowed and prohibited operations and refusal codes ([API-DM-23](#api-dm-23-typed-agent-tool-contracts-belong-to-con-03-this-document-fixes-operations-and-refusal-codes), §11.1) |
| D-4 | Minimum contracts for transactional participation between owners: results and required locks or preconditions, without ORM types | API-DM-12 names each coordinator and its participants; the protocol itself is CON-01 MOD-DM-08. No participant signature or per-operation lock order is written here | Whether CON-02 specifies those application contracts or CON-01 / implementation ([#31](https://github.com/nanonoir/Agendoxa/issues/31)) does | **Resolved 2026-11-12 by product-owner agreement, proposed for review:** [API-DM-24](#api-dm-24-multi-owner-commands-have-a-minimum-contract-here-code-level-participant-contracts-belong-to-31) fixes participants, rechecks, results and errors per command and cites [MOD-DM-08](./modules.md#mod-dm-08-the-initiating-use-case-owns-the-transaction) for the protocol and lock order; the code-level participant contracts are delegated to [#31](https://github.com/nanonoir/Agendoxa/issues/31) |
| D-5 | Versions and preconditions for concurrency | Commands recheck current state; configuration is last-write-wins without `ETag` ([API-DM-11](#api-dm-11-commands-are-checked-against-current-state-configuration-is-last-write-wins)) | Confirm that this answers the Issue, or require conditional requests now | **Resolved 2026-11-10 by author decision, proposed for review:** last-write-wins for configuration and recheck for commands are kept; money operations use state guards and caps, and cash close and adjustments require `expectedRevision` ([API-DM-18](#api-dm-18-money-operations-rely-on-state-guards-and-caps-the-cash-close-and-adjustments-add-a-revision-precondition)) |
| D-6 | Public informational hours and the WhatsApp link | Included in the public profile (API-DM-01), composed from `catalog` and `messaging` | CON-01 §8.1 proposes read composition above owners using public allowlisted fields; no dependency direction changes | **Agreed source, technical proposal for team review:** connected tenant number builds `wa.me`; `catalog` availability rules supply regular hours |
| D-7 | Public location | Not in the ERD | API-Q-01, unchanged | **Proposed 2026-11-12 (product-owner agreement):** a public address text plus an optional Maps link on `Tenant` ([ERD](./erd.md#tenant)), exposed as `location`; not migrated and pending DOM-01 adoption. As a `tenants` attribute it fits the CON-01 §8.1 `tenants` information |

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
| Idempotency for payments, refunds and booking creation retries | API-DM-10; payments in API-DM-18 and API-DM-20 |
| Agent tools call facades, not HTTP | API-DM-15, API-DM-23 |

## 15. Traceability

**[CON-02 (#11)](https://github.com/nanonoir/Agendoxa/issues/11)**, acceptance criteria as rewritten on 2026-11-09 *(table reconciled 2026-11-10 and updated the same day for decisions D-1, D-2, D-3 and D-5)*:

| Criterion | Where | Coverage |
|---|---|---|
| Priority operations, owners and consumers identified | §2 (API-DM-02), §7 (API-DM-12), §7.7–§7.10, §10, §11.2 | Covered; corrections, refunds and collection settings identified only |
| Endpoints, methods and needed internal contracts defined, distinguishing landing, CRM and WhatsApp tools | API-DM-01, §7, §10 (API-DM-23) and the OpenAPI file | Covered by decision D-3: typed tool contracts assigned to CON-03; operations and refusal codes here |
| Inputs, outputs, validation and a consistent error format | §5, §7, §9 and the OpenAPI schemas | Covered for the specified areas, money flows included |
| Authentication, capabilities, requester authority and tenant context, including other tenants' IDs and revoked permissions | §4 (API-DM-06–08), §10 | Covered; payments and cash permission placeholders added (API-Q-02) |
| Dates, times, amounts and identifiers | §3 (API-DM-04); signed and positive money in §9 | Covered |
| Idempotency and conflicts or preconditions of sensitive operations; duplicates create no extra bookings or money | §6 (API-DM-10, API-DM-11, API-DM-18), §7.7, §7.8 | Covered: one decision per review, capped allocations, idempotent payments, revision preconditions for cash close and adjustments |
| Transactional collaborations and participant limits consistent with CON-01, without ORM in application code | API-DM-12, API-DM-24, API-DM-25, §7.5, §7.7–§7.10, [modules MOD-DM-08](./modules.md#mod-dm-08-the-initiating-use-case-owns-the-transaction) | Covered by D-4 (2026-11-12, proposed): API-DM-24 fixes participants, rechecks, results and errors per multi-owner command and API-DM-25 where cross-owner response facts are composed; the protocol and lock order stay in CON-01, and the code-level participant contracts are delegated to [#31](https://github.com/nanonoir/Agendoxa/issues/31). Where compositions live stays API-Q-10 |
| Receipt screening results and human review or credit kept apart, per UC-03, coordinated with CON-03 | §10.1, API-DM-13, API-DM-19, API-DM-21, §11.1 | Covered: `arrivedVia` is routing only; review decisions are human; P-40 not assumed; API-Q-11 open |
| Compatible with use cases, domain model and the exclusion of public web booking | §2, §7, §14 | Covered |
| Evolution, projections and shared schemas documented | API-DM-03, §9, §12 | Covered |
| Reviewed and approved by the team | — | **Pending** |

| Deliverable in the Issue | Where |
|---|---|
| `docs/design-docs/api-contracts.md`, registered in the design index | This file; [index](./index.md) |
| Initial OpenAPI for the included endpoints, and typed contracts for non-HTTP internal consumers | [api-contracts.openapi.yaml](./api-contracts.openapi.yaml) (API-DM-17), 78 operations in `0.4.0-proposal`; typed tool contracts in CON-03 by decision D-3 (API-DM-23) |
| Schemas and types for `packages/shared` | §9 |
| Representative requests, responses, errors and conflicts, with authorized context and no sensitive data | §8 and `components.examples` in the OpenAPI file |

**Verification of this version** (`0.4.0-proposal`, 78 operations, 27 component examples, 26 examples in §8; **re-measured on 2026-11-12 on commit `b3e1896`**, the content of this document and the OpenAPI file before the edit that refreshed this section; checks on documents, not on running code). It replaces the verification statements of the earlier versions; those are not relied on here. Figures below are the ones measured on that commit; an earlier figure that could not be reproduced is not repeated:

- **Redocly lint, run:** `npx redocly lint docs/design-docs/api-contracts.openapi.yaml` from a temporary directory outside the repository, Redocly CLI 2.78.0 on Node 24.18.0, default configuration (the repository has none). Result: valid, 0 errors, 1 warning, `info-license` ("Info object should contain `license` field", at `#/info`), left on purpose because the project's licence is a decision nobody has made here.
- **Ajv, run:** Ajv 8.20.0 in 2020-12 mode with `ajv-formats` 3.0.1 active, strict mode on except `strictRequired` (conditional schemas name required properties they do not define), with the OpenAPI annotation keywords `discriminator`, `example`, `externalDocs` and `xml` registered. All 135 component schemas compile, with the OpenAPI root keywords (`openapi`, `info`, `paths`, `components`, `servers`, `security`, `tags`, `webhooks`, `jsonSchemaDialect`) also registered. Every example attached to an operation, request body or reusable response validates against its schema (259 attachments of the 27 component examples, 0 failures), and every component example is used. The 57 paths hold 78 operations. The 26 JSON examples in §8 were counted but **not** re-validated or compared with the component examples in this re-measurement.
- **Negative and positive fixtures, run** (real UUIDs, none of them the literal `<uuid>`): 91 cases, 37 that must validate and 54 that must fail, all as expected. They cover `DepositInput` (only `declaredAmount`, `allocations: []`, an unknown property, `declaredAmount` without evidence, a zero or malformed allocation; and valid evidence, allocations or both), `DepositRule` (`PERCENTAGE` 0.00, 101.00, 100.01 and 500.00, `FIXED` 0.00, `PERCENTAGE` with `null` or no value, `DISABLED` with a value, `FIXED` with `null`; and `DISABLED`, `FIXED` 0.01 and 3000.00, `PERCENTAGE` 0.01, 30.00, 99.99 and 100.00), an override with `FIXED` 0.00, `RescheduleResult` without `supplementalDeposit` (fails) and with `null` or an object (valid), malformed money (`"1000"`, `"10.5"`, a number, a negative or a thousands separator) and percentages, approval with an empty `allocations` and no reason, `deposit` together with `depositException`, the removed `AWAITING_ALLOCATION`, the closure records and the public `location`. A fixture failing for the wrong reason is not detected by this run; each negative fixture breaks one rule.
- **Structure, run:** 989 `$ref`s and 3 discriminator mappings resolve; `operationId`s are unique; every path parameter is declared and none is extra; every tag is declared; every module in `x-agendoxa-invokes` exists in CON-01; every non-safe operation except `signIn` has the CSRF token in `security` (41 operations); every `POST` except `signIn` has `Idempotency-Key` and declares `409` (25 keyed operations); `403` is declared on every operation with a permission, an Admin-only check or the CSRF token, and on none that needs only a session or membership.
- **Links, run:** 498 relative links outside code fences (407 with an anchor) resolve to existing files and headings or explicit anchors: 361 in this document, 55 in [modules](./modules.md), 27 in the [ERD](./erd.md), 12 in the [catalog](./index.md), 28 in UC-03 business rules, 10 in UC-03 invariants and 5 in the active ExecPlan; `git diff --check` reports nothing on the tracked changes.
- **Run after the allocation-reversal decision (BR-SEN-18, API-Q-14), historical:** at that time a separate set of schema fixtures was run (100 fixtures, 43 valid accepted and 57 invalid rejected, including an `InitialDeposit` with 1000.00 of 3000.00 allocated and state `UNDER_REVIEW` and one with 0.00 allocated and `UNALLOCATED`; the `depositState` precedence itself is a rule of the composition, not something a schema can check, and was reviewed by reading). The earlier additions were: `DepositState` `UNALLOCATED` and `PARTIAL` accepted and the discarded `AWAITING_RESEND` rejected, and the `AllocationResult` of `reversePaymentAllocation` accepted with a booking back in review (`UNALLOCATED`) and with a completed one (`PARTIAL`), rejected without `affectedBookings` or with the discarded value. Not run as a check: that a started booking never shows `MET` with zero allocations, which is a rule of the composition and was reviewed by reading.
- **Not run, and not claimed:** application, end-to-end or database tests (nothing is implemented); a conversion of the schemas to Zod; any check of the UC-03 or CON-01 documents beyond their anchors. The consistency between this document and the OpenAPI file beyond the examples, the structural checks above and the operation list was reviewed by reading, not by a tool. The scripts that ran the Ajv, structure and link checks live outside the repository and are not part of this change.

## 16. Reconciliation log

**2026-11-10**, against CON-01 at `5f31914`, UC-03 BR-SEN-14–16 and INV-SEN-12–13, and Issues #11 and #12 as rewritten on 2026-11-09. No schema, path or example changed shape; the OpenAPI `info.version` moved to `0.2.0-proposal`.

| Section | What changed |
|---|---|
| Header, [§1](#1-how-to-use-this-document) | Reconciliation note; endpoints invoke an owner use case or the `workflows` coordinator |
| [API-DM-01](#api-dm-01-no-public-booking-the-public-api-is-read-only-landing-information) | Contradiction with the Issue resolved; hours and WhatsApp link flagged against CON-01 §8.1 (D-6) |
| [API-DM-02](#api-dm-02-full-contracts-for-context-five-areas-and-the-priority-money-flows-the-rest-of-the-crm-is-identified) | Notes the wider scope of the rewritten Issue and points to §14.1 |
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

**2026-11-10, author decisions D-1, D-2, D-3 and D-5** of [§14.1](#141-scope-differences-with-the-rewritten-issue-11), applied as proposals for team review. D-4, D-6 and D-7 are unchanged. No product or CON-01 document was edited. The OpenAPI `info.version` moved to `0.3.0-proposal`.

| Section | What changed |
|---|---|
| Header, [API-DM-02](#api-dm-02-full-contracts-for-context-five-areas-and-the-priority-money-flows-the-rest-of-the-crm-is-identified) | Scope now includes the priority money flows; heading and use-case coverage updated (D-1) |
| [API-DM-08](#api-dm-08-permissions-are-checked-per-operation-admin-only-operations-stay-admin-only) | Placeholder keys `payments.*` and `cash.*`; cash adjustments Admin-only; permissions for optional inputs of another owner |
| [API-DM-09](#api-dm-09-one-problem-format-with-stable-codes-and-reasons) | New `conflict`, `rule_violation` and `validation` reasons for money flows |
| [API-DM-10](#api-dm-10-state-changing-posts-require-an-idempotency-key), [API-DM-11](#api-dm-11-commands-are-checked-against-current-state-configuration-is-last-write-wins), new [API-DM-18](#api-dm-18-money-operations-rely-on-state-guards-and-caps-the-cash-close-and-adjustments-add-a-revision-precondition) | Idempotency of payments and reviews; last-write-wins and recheck kept; money preconditions and `expectedRevision` (D-5) |
| [API-DM-12](#api-dm-12-each-endpoint-belongs-to-the-module-that-owns-its-operation) | `payments` row with its coordinators and compositions |
| [§7.5](#75-bookings-free-slots-agenda-and-lifecycle-commands), [API-DM-13](#api-dm-13-seven-statuses-with-derived-conditions-as-separate-fields) | `deposit` input of CRM bookings and remainder walk-ins (which also gain `acknowledgeBlockedCustomer` and `depositException`, as their "same checks" text implied); `supplementalDeposit` in the reschedule result; `AWAITING_ALLOCATION` and `supplementalDepositState` |
| New [§7.7](#77-payments-evidence-and-human-review) to [§7.10](#710-payments-cash-session), API-DM-19 to API-DM-22 | Evidence and human review, payments and allocation, booking financial state, cash session (D-1, D-2) |
| [§8](#8-representative-examples) | `supplementalDepositState` in the walk-in example; eleven money-flow examples |
| [API-DM-14](#api-dm-14-packagesshared-holds-the-http-contracts-as-zod-schemas-and-nothing-else) | `payments.ts` and the new money primitives |
| [§10](#10-internal-consumers-the-agent), new [API-DM-23](#api-dm-23-typed-agent-tool-contracts-belong-to-con-03-this-document-fixes-operations-and-refusal-codes), [§10.1](#101-receipt-evidence-screening-is-not-human-review), [§11.1](#111-for-con-03-external-integrations) | Typed tool contracts assigned to CON-03, refusal codes per operation, three agent-only reasons; CRM equivalents of the agent's payment operations; storage row (D-3) |
| [§11.2](#112-next-contract-increment) | Specified rows removed; corrections, refunds, account management and cash settings remain |
| [§13](#13-decisions-and-open-questions) | API-DM-18 to API-DM-23; API-Q-12 to API-Q-17 |
| [§14](#14-reconciliation-with-sources), [§14.1](#141-scope-differences-with-the-rewritten-issue-11) | Money flows and typed contracts rows; status column, with D-1, D-2, D-3 and D-5 resolved as proposals |
| [§15](#15-traceability) | Coverage per criterion; verification repeated, Redocly lint not repeated |
| OpenAPI | `payments` tag with 22 operations; `DepositInput`, `SupplementalDepositState`, `AWAITING_ALLOCATION`, `AllocationLimit`, `currentRevision` and money schemas; 11 new component examples |

**2026-11-12, remediation of [PR #33](https://github.com/nanonoir/Agendoxa/pull/33)** after the [review](https://github.com/nanonoir/Agendoxa/pull/33#issuecomment-6806679879) and the product-owner agreements of that day, applied as **proposals for team review, not ratified**. The UC-03 rules they rely on (BR-SEN-07, BR-SEN-17, BR-COB-02–04, BR-COB-17, BR-CAN-11, BR-CAN-15, INV-SEN-14, INV-CAN-10) were recorded in UC-03 first and are cited here, not restated; CON-01 and the code are not edited. The OpenAPI `info.version` moved to `0.4.0-proposal` and the file now has 78 operations.

| Section | What changed |
|---|---|
| Header, [§1](#1-how-to-use-this-document) | Remediation note |
| [API-DM-01](#api-dm-01-no-public-booking-the-public-api-is-read-only-landing-information), [API-Q-01](#13-decisions-and-open-questions), D-6, D-7 | Public `location` (address text and optional Maps link, proposed in the ERD, not migrated); `wa.me` link from the connected number; the CON-01 §8.1 projections still to confirm |
| [API-DM-08](#api-dm-08-permissions-are-checked-per-operation-admin-only-operations-stay-admin-only), [API-DM-09](#api-dm-09-one-problem-format-with-stable-codes-and-reasons) | Placeholder permission of the non-collection operation; reasons `no_open_supplemental_deposit` and `allocation_required`; which statuses each operation can return (FIX-06): `403` on permission-gated reads, `409` idempotency conflicts on every keyed `POST` |
| [API-DM-12](#api-dm-12-each-endpoint-belongs-to-the-module-that-owns-its-operation), new [API-DM-24](#api-dm-24-multi-owner-commands-have-a-minimum-contract-here-code-level-participant-contracts-belong-to-31), [API-DM-25](#api-dm-25-a-response-carries-another-owners-facts-only-if-it-is-composed-above-the-owners) | Fourth operation kind (`responseComposition`); multi-owner command table and delegation to #31 (D-4); every response audited for another owner's facts (FIX-03): cancel, outcome, correction, customer create and update compose their response after the commit; `reversePaymentAllocation` returned owner data (superseded the same day, see the last rows) |
| [§7.3](#73-catalog-services-resources-compatibility-and-policies) | `DepositRule` discriminated by `mode` (FIX-05) |
| [§7.5](#75-bookings-free-slots-agenda-and-lifecycle-commands) | `DepositInput` needs evidence or non-empty allocations, `declaredAmount` only with evidence, unknown properties rejected, `deposit` and `depositException` exclusive (FIX-04); reschedule result always carries `supplementalDeposit`, `null` when none (FIX-07) |
| [API-DM-13](#api-dm-13-seven-statuses-with-derived-conditions-as-separate-fields), [API-DM-19](#api-dm-19-evidence-reaches-people-through-review-only-a-human-decision-approves-or-rejects), [API-DM-20](#api-dm-20-a-payment-is-verified-money-only-listed-allocations-reduce-a-balance) | `AWAITING_ALLOCATION` removed; approval and transfer recording allocate in the same action; cash first opening; `NOT_COLLECTED` |
| [API-DM-21](#api-dm-21-initial-deposit-supplemental-deposit-credit-outcome-and-cash-are-separate-fields) | Current requirement, historical initial requirement, verified funds, allocated funds and requested supplement kept apart; the sum equation removed; reschedule cases (FIX-01) |
| New [API-DM-26](#api-dm-26-a-supplemental-deposit-request-can-be-closed-without-collecting-it) | Closing a supplemental deposit request without collecting it; closes API-Q-16 |
| [API-DM-22](#api-dm-22-one-shared-cash-session-with-physical-totals-transfers-shown-apart), [§7.10](#710-payments-cash-session), [§11.2](#112-next-contract-increment) | First cash session opened manually with an explicit amount; `409 cash_session_not_open` before it (FIX-02) |
| [§8](#8-representative-examples) | Public profile with `location`; first-cash-payment problem; cheaper reschedule; supplement closure; the financial-state example without the sum equation |
| [§9](#9-shared-schemas-in-packagesshared), [§10](#10-internal-consumers-the-agent) | New schemas listed; the agent's treatment of an out-of-flow transfer report (BR-SEN-17) |
| [§13](#13-decisions-and-open-questions), [§14](#14-reconciliation-with-sources), [§14.1](#141-scope-differences-with-the-rewritten-issue-11), [§15](#15-traceability) | API-DM-24 to API-DM-26; API-Q-13 and API-Q-16 closed, API-Q-18 added; D-4, D-6, D-7 rows; D-4 coverage no longer partial; validation statement rewritten to the checks actually run (FIX-08) |
| [ERD](./erd.md#tenant) | `public_address` and `public_maps_url` on `Tenant`, marked as proposals and not migrated |
| [API-DM-26](#api-dm-26-a-supplemental-deposit-request-can-be-closed-without-collecting-it), [§7.3](#73-catalog-services-resources-compatibility-and-policies), [§7.8](#78-payments-verified-payments-and-explicit-allocation), [§13](#13-decisions-and-open-questions), UC-03 BR-SEN-03, BR-SEN-07, BR-CAN-15, INV-SEN-14, INV-CAN-10, UC-02 CU-11 *(later the same day, product-owner agreements)* | `payments.allocate` fixed for the non-collection operation; API-Q-18 closed (a request under review cannot be closed); cash recorded for an active booking allocates in the same action like a transfer, `422 allocation_required` included, with the first-cash `409 cash_session_not_open` unchanged; a configured deposit is always greater than zero (`DepositRule`/`Percentage` tightened, database gap in TD-03); API-Q-19 added |
| OpenAPI | `0.4.0-proposal`; `AWAITING_ALLOCATION` removed and `NOT_COLLECTED` added; `closeSupplementalDepositWithoutCollection`; `DepositRule` variants and `Percentage`; stricter `DepositInput`; `RescheduleResult.supplementalDeposit` required; `PublicLocation`; `403` on 21 permission-gated reads and on `signOut`, `409` on three keyed `POST`s; `responseComposition`; `reversePaymentAllocation` returns `Payment`; 4 new component examples and a `location` in the public profile example |
| [API-DM-12](#api-dm-12-each-endpoint-belongs-to-the-module-that-owns-its-operation), [API-DM-13](#api-dm-13-seven-statuses-with-derived-conditions-as-separate-fields), [API-DM-18](#api-dm-18-money-operations-rely-on-state-guards-and-caps-the-cash-close-and-adjustments-add-a-revision-precondition), [API-DM-24](#api-dm-24-multi-owner-commands-have-a-minimum-contract-here-code-level-participant-contracts-belong-to-31), [API-DM-25](#api-dm-25-a-response-carries-another-owners-facts-only-if-it-is-composed-above-the-owners), [§7.8](#78-payments-verified-payments-and-explicit-allocation), [§7.7](#77-payments-evidence-and-human-review), [§10](#10-internal-consumers-the-agent), [§13](#13-decisions-and-open-questions), UC-03 BR-SEN-18, INV-SEN-15 and the `CONFIRMED` → `PENDING_PAYMENT_REVIEW` row of INV §2.1 *(later the same day, product-owner agreement; closes API-Q-14)* | A reversal that drops a not-yet-started `CONFIRMED` booking below its initial-deposit threshold returns it to `PENDING_PAYMENT_REVIEW` with a resend notice and no automatic release; `reversePaymentAllocation` becomes a `workflows` command (`payments`, `bookings`, `notifications`) returning `AllocationResult`, with `409 state_changed`; `depositState` gains `UNALLOCATED` and `PARTIAL` is made status-neutral, so a started or completed booking never shows a stale `MET`; rejection of resent evidence changes nothing; the customer-facing payment status says to resend the receipt only while the booking has not started, without internal reasons; API-Q-14 closed. CON-01 `modules.md` is not edited: it lists no per-operation reversal entry that this contradicts |
| OpenAPI *(same agreement)* | `reversePaymentAllocation` carries `x-agendoxa-invokes` (`workflows`; `payments`, `bookings`, `notifications`), returns `AllocationResult`; `DepositState` gains `UNALLOCATED`, with status-neutral `PARTIAL`; `rejectPaymentReview` excludes evidence resent after a reversal from the correction window and cancellation; description of the reversal and of `unallocatedLinkedFunds` aligned |

The resend wording in the preceding historical entry is superseded by the cause distinction in BR-SEN-18 and API-Q-14: valid-payment reassignment does not request another receipt, including for the same payer. CON-01 §8.1 now proposes the public composition for team review.
