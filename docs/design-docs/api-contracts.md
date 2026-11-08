# CON-02 — Initial API Contracts

> **Status:** In Review — proposal; **not team-ratified or implemented**.
> **Prepared:** 2026-11-08, on top of [CON-01 modules](./modules.md) (in review), the [DOM-01 ERD](./erd.md), [DOM-02 tenancy](./tenancy.md), [UC-02 use cases](../product-specs/uc-02/use-cases.md), [UC-03 rules](../product-specs/uc-03/business-rules.md) and [invariants](../product-specs/uc-03/invariants.md), and the [architecture proposal](./target-architecture.md) v1.2.
> **Scope:** HTTP contracts between the Next.js web, the NestJS API and its internal consumers: operations, endpoints and methods, inputs and outputs, validation, errors, authentication and tenant context, data representations, idempotency, pagination and contract evolution.
> **Files:** this document and the [OpenAPI 3.1 specification](./api-contracts.openapi.yaml) it explains.
> **Out of scope:** Controllers, endpoints, business logic, authentication, frontend or provider integrations as code; provider contracts ([CON-03 #12](https://github.com/nanonoir/Agendoxa/issues/12)); contracts for features outside the MVP.
> **Next step:** Team review. Decisions are `API-DM-XX`, all **Proposed for team review**; open questions are `API-Q-XX` in [§13](#13-decisions-and-open-questions).

## 1. How to use this document

- **Two kinds of statement.** Each section separates what the domain documents already decide from what this document proposes:

| Marker | Meaning |
|---|---|
| **Defined** | Comes from UC-02, UC-03, the ERD, DOM-02, CON-01 or the implemented schema, with its source. This document only maps it to HTTP |
| **Proposed** | A contract decision made here, identified as `API-DM-XX`, pending team review |

- **The specification and this document go together.** The [OpenAPI file](./api-contracts.openapi.yaml) holds every path, schema and example; this document explains the conventions and decisions behind them. If they disagree, raise it in review; neither is implemented yet.
- **Endpoints follow CON-01 ownership.** Each endpoint belongs to the module that owns its operation ([modules §4](./modules.md#4-operations-by-module)) and calls one use case of that module. The constraints CON-01 set for CON-02 ([modules §8.1](./modules.md#81-for-con-02-api-contracts)) are applied throughout and checked in [§14](#14-reconciliation-with-sources).
- **Nothing here is implemented.** Today the API has only `GET /health`, a liveness check outside the versioned base path; it stays as it is.

## 2. Scope

### API-DM-01: No public booking; the public API is read-only landing information

- **What:** The [Issue](https://github.com/nanonoir/Agendoxa/issues/11) asks for a public API to create, consult, cancel and reschedule bookings without an account. The product documents exclude it.
- **Defined:** WhatsApp is the only customer self-service channel (BR-CH-01). The landing is informational, with no availability calendar, booking form or customer accounts (BR-CH-02, [MVP §5.3](../product-specs/mvp.md#53-explicitly-out-of-scope), [MVP §7.2](../product-specs/mvp.md#72-informational-public-landing)). Public booking is excluded use case X-01 ([UC-02 §7](../product-specs/uc-02/use-cases.md#7-excluded-and-deferred-use-cases)). Public endpoints expose read-only landing information only ([architecture §11](./target-architecture.md#11-internal-api-and-integration-boundaries)). UC-03 already records this Issue as superseded ([UC-03 §17](../product-specs/uc-03/business-rules.md#17-differences-with-earlier-documents)), and CON-01 restricts public endpoints the same way.
- **Rule (Proposed):** The product documents prevail over the Issue text. This contract has **no public booking, consultation, cancellation or rescheduling endpoint**. Customers manage bookings over WhatsApp, through the agent and module facades ([§10](#10-internal-consumers-the-agent)).
- **Public read-only endpoints proposed:**

| Endpoint | Returns | Why it is needed |
|---|---|---|
| `GET /public/businesses/{slug}` | Name, branding, timezone, weekly hours and the WhatsApp link | The landing must show business identity, hours and a WhatsApp call to action (MVP §7.2). `apps/web` may not read the database ([architecture §5](./target-architecture.md#5-monorepo-organization)), so it needs an endpoint |
| `GET /public/businesses/{slug}/services` | Active services with duration and price | The landing lists services (BR-CH-02) |

  No public endpoint returns free slots, resources' occupancy or anything about customers or bookings. The slug only selects the business to display ([TEN-DM-07](./tenancy.md#ten-dm-07-every-entry-point-has-one-source-of-tenant-context)). Location is missing from the data model ([API-Q-01](#13-decisions-and-open-questions)).
- **Recorded, not edited:** The Issue keeps its text; [§14](#14-reconciliation-with-sources) lists the difference for the team.

### API-DM-02: Full contracts for context and five areas; the rest of the CRM is identified

- **What:** The Issue asks for initial contracts for services, resources, availability, customers and bookings, while the MVP's CRM also covers payments, cash, conversations, roles, the WhatsApp channel and audit.
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

**Admin-only, non-delegable (Defined: BR-IAM-04):** confirming a CRM booking without its required deposit (`depositException`, BR-SEN-09) and granting an exception to a late-change consequence or to the reschedule limit (`adminException`, BR-CAN-03, CU-09 A1b). A request that includes them from a non-Admin returns `403` with reason `admin_only`, even if the rest of the request is allowed; the API never silently drops the exception.
