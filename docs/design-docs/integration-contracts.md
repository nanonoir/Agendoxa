# CON-03 — Integration Contracts

> **Status** — In Review, proposed for team review. Runtime implementation and provider acceptance remain pending.
> **Prepared** — 2026-11-11 for [CON-03 #12](https://github.com/nanonoir/Agendoxa/issues/12), on `develop` `af1da44`.
> **Scope** — Evolution intake and sending, LangGraph and typed agent tools, preliminary receipt screening, private assets, durable scheduling, correlation, retries, recovery and test doubles.
> **Dependencies** — [CON-01](./modules.md), [DOM-01](./erd.md), [DOM-02](./tenancy.md), [UC-03 rules](../product-specs/uc-03/business-rules.md) and [invariants](../product-specs/uc-03/invariants.md). CON-02 is the open [PR #33](https://github.com/nanonoir/Agendoxa/pull/33), read at [`d2b7d77`](https://github.com/nanonoir/Agendoxa/blob/d2b7d77769738b118b09241808bfd1edc50cfbcf/docs/design-docs/api-contracts.md).
> **Delivery boundary** — This document specifies contracts. Provider accounts, installed packages, adapters, workers, physical schema and product-policy changes require their implementation increments.

## 1. Sources, ownership and decisions

UC-03 owns functional behavior. The ERD owns logical entities and its T-01–T-05 register. CON-01 owns module boundaries, the dependency graph and cross-owner composition. CON-02 proposes HTTP contracts and the shared refusal vocabulary. References to CON-02 below point to its pinned proposal because it is absent from develop.

`INT-DM-*` identifies a proposed integration decision. `INT-Q-*` identifies a remaining decision or verification gate in [§12](#12-decisions-and-remaining-gates). A source description in [§13](#13-provider-evidence) establishes documented capability only. Acceptance against the pinned provider and the deployed configuration needs the tests in [§11](#11-doubles-examples-and-verification).

### INT-DM-01 — Keep provider ports with their capability owner

| Boundary | Owner | Consumer | Operations |
|---|---|---|---|
| Evolution transport and normalization | `messaging` | Webhook composition, notifications, CRM conversation commands | Normalize events, obtain media, send text, recover status, connection lifecycle |
| Conversation runtime | `agent` | Durable batch-ready consumer | Run a bounded conversation batch through authorized tools |
| Receipt relevance analysis | `agent` outbound adapter | Agent screening worker, through a prepared workflow task | Analyze an authorized image/PDF and return a technical classification |
| Private asset storage | `assets` | `messaging`, `payments`, workflows | Ingest, authorize access, read bytes and execute an owner-approved deletion |
| Durable scheduler | Platform | Initiating owner or workflow | Enqueue in the business transaction, claim work, retry and recover |
| Business operations and their state | Existing CON-01 owners | Tools and workflows | Apply domain rules and persist effects |

The [CON-01 DAG](./modules.md#5-dependencies) remains the dependency rule. `workflows` coordinates mutations involving several business owners. A webhook composition can sit above `messaging` and call a workflow when intake also records financial-evidence protection. The provider parser stays in `messaging`; that module holds no workflow or agent callback. Likewise, the screening worker belongs to `agent` and calls lower workflows before and after its provider request. A workflow never imports the agent to run analysis.

This specifies the composite HTTP ingress placement needed by [§4.2](#42-intake-and-evidence-at-the-deadline). CON-02's description of a messaging webhook still identifies the state owner. Its physical adapter placement must be reconciled with that proposal before implementing the composite ingress.

## 2. Common representations and trusted context

### INT-DM-02 — Inject authority outside model-generated arguments

UUIDs identify application records. UTC RFC 3339 strings identify instants. Recurring local dates/times use the tenant's IANA timezone. Money is an exact decimal string in the tenant currency. Phone numbers use E.164. The [CON-02 representations](https://github.com/nanonoir/Agendoxa/blob/d2b7d77769738b118b09241808bfd1edc50cfbcf/docs/design-docs/api-contracts.md#3-general-conventions) supply the corresponding wire conventions.

The TypeScript below is a portable specification, with runtime parsing required at each inbound boundary. `UUID`, `Instant`, `Money` and `LocalDate` need the format validations described above. Objects reject unknown input keys. Provider DTOs, ORM rows and credentials stay inside their adapters.

```typescript
type UUID = string;
type Instant = string;
type Money = string;
type LocalDate = string;
type ContractVersion = 1;

interface TransactionScope {
  readonly transactionScope: unique symbol;
}

interface CustomerContext {
  tenantId: UUID;
  connectionId: UUID;
  conversationId: UUID;
  requesterId: UUID;
  sourceMessageIds: UUID[];
  controlRevision: string;
}

interface OperationContext {
  customer: CustomerContext;
  operationId: UUID;
  requestId: UUID;
}

type RefusalCode =
  | 'validation' | 'unauthorized' | 'forbidden' | 'not_found'
  | 'conflict' | 'rule_violation' | 'external_dependency' | 'internal';

interface Refusal {
  code: RefusalCode;
  reason?: string;
  requestId: UUID;
}

type Result<T> = { kind: 'ok'; value: T } | { kind: 'refused'; error: Refusal };

type IntegrationFailureCode =
  | 'timeout' | 'unavailable' | 'rate_limited' | 'invalid_response'
  | 'unsupported' | 'authentication_failed';

interface IntegrationFailure {
  code: IntegrationFailureCode;
  retryAfterMs?: number;
}
```

The backend derives `CustomerContext` from the authenticated provider connection, validated sender and stored conversation/customer association. A job reloads those records under its tenant. Revalidate ownership at the use case, even when an ID came from a successful previous tool call. Foreign records produce `not_found`. The [TEN-DM-07 bootstrap lookups](./tenancy.md#ten-dm-07-every-entry-point-has-one-source-of-tenant-context) remain explicit exceptions for resolving an incoming connection before tenant scope exists.

`controlRevision` is an opaque routing generation issued by `messaging`. Takeover, relevant AI-mode/lifecycle changes and conversation retirement invalidate earlier authorizations. It is rechecked before executing a new tool mutation and before dispatching a reply. Physical revision and work-claim fields are implementation choices under T-04/T-05.

Technical provider errors are distinct from business refusals. Tools reuse CON-02's `code`/`reason` meanings, then produce a customer-safe projection. Internal labels, SQL, stacks, provider bodies and credentials never become customer-visible explanations. `rule_violation` and `internal` remain proposed CON-02 extensions to the architecture's error catalog.

## 3. Idempotency, transactions and recovery

### INT-DM-03 — Preserve logical identity across all retries

| Operation | Durable identity | Effect of repetition |
|---|---|---|
| Incoming message | Provider installation, connection, sender/conversation, direction and provider message ID | Reuse the stored message and intake outcome |
| Delivery update | Same outgoing provider message plus normalized status/event identity | Update correlation monotonically, without executing a customer command |
| Tool mutation | Tenant, requester, operation name and backend-issued `operationId`, with an input fingerprint | Replay its recorded result; different input with the same identity conflicts |
| Notification | Tenant-scoped logical dedupe key, including current booking slot or invitation round | Reuse one logical notice; actual send attempts have distinct numbers |
| Screening | Tenant, incoming message/evidence identity and screening generation | Apply one result; preserve original send and receipt times and attempt identity |
| Scheduled action | Tenant, job kind, target and generation | An obsolete generation becomes a no-op |

`operationId` is persisted when the backend admits a distinct intended mutation. Graph replay, process restart and a repeated model tool call reuse it. A model-generated call ID is only diagnostic correlation. The record of the operation and its business effects commit together. Retry after an uncertain commit first resolves the existing operation. A resumed workflow whose deduplication record has expired is stopped for state reconciliation instead of blindly executing an old mutation. API-Q-06 owns the physical idempotency-record design.

For explicit confirmation, the backend stores a confirmation reference bound to requester, operation, material input, current conditions and expiry. The runtime maps a recorded customer reply to it. A generated boolean or an old confirmation reference cannot approve new conditions. The original customer message remains attributable.

### INT-DM-04 — Enqueue through the initiating transaction

Propose pg-boss **12.38.2** as the scheduler baseline. Its versioned documentation supports `fromDrizzle(tx, sql)` with node-postgres. The platform adapter binds enqueue to the same checked-out transaction as the initiating workflow, preserving the opaque scope of MOD-DM-08. Migration/bootstrap privileges and queue-schema setup stay separate from tenant runtime access. [Versioned pg-boss adapter contract](https://github.com/timgit/pg-boss/blob/12.38.2/docs/api/adapters.md)

```typescript
interface ScheduledAction {
  version: ContractVersion;
  tenantId: UUID;
  kind: JobKind;
  targetId: UUID;
  generation: string;
  dueAt: Instant;
  dedupeKey: string;
}

type ScheduleResult =
  | { kind: 'scheduled'; jobId: UUID }
  | { kind: 'already_scheduled' };

interface SchedulerPort {
  enqueue(scope: TransactionScope, action: ScheduledAction): Promise<ScheduleResult>;
}
```

pg-boss may return `null` when its uniqueness/queue policy suppresses an insert. The adapter can return `already_scheduled` only for the same complete action identity, not merely a shared target. A later generation needs its own runnable work. Queue retention or a queue singleton alone does not establish permanent business idempotency. [Versioned job API](https://github.com/timgit/pg-boss/blob/12.38.2/docs/api/jobs.md)

Business rollback must also roll back enqueue. A job delivered again after a worker commits but before queue acknowledgement rechecks the committed business result. Recovery enumerates due state/intents through each owner, returns only tenant/record IDs and schedules missing actions inside a validated tenant context. A transactional intent with reconciliation is the alternative if the actual pg-boss/Drizzle combination fails its integration test. Choose and implement that alternative before starting the affected worker, preserving the same observable contract.

Provider requests, file transfer, model inference and human decisions take place outside database transactions. Every result is applied in a new guarded transaction. Follow CON-01's lock order, revalidation and whole-transaction retry rules; test the chosen isolation level against existing REP-02 triggers before exposing concurrent writers.

## 4. Evolution API and WhatsApp

### INT-DM-05 — Normalize a versioned provider at the boundary

Propose Evolution API **2.3.7**, the latest release found during this review, as the contract-test baseline. The adapter records the actual image digest and provider version used by the pilot. The [versioned webhook implementation](https://github.com/evolution-foundation/evolution-api/blob/2.3.7/src/api/integrations/event/webhook/webhook.controller.ts) supports instance-specific headers and event envelopes. Live payloads, sender identity variants, delivery mapping and recovery capabilities remain T-04 acceptance gates.

### 4.1 Webhook ingress

Proposed route `POST /integrations/evolution/v1/events`. Configure a separate secret header `X-Agendoxa-Webhook-Key` for each provider instance, over TLS or an authenticated private transport. Resolve the stored provider/instance association and compare the configured secret before using the body. This credential is separate from a CRM session and from the outgoing provider API key. The body cannot authenticate itself through its `apikey`, `server_url`, tenant or sender fields.

Normalize the event names and payload versions inside the provider adapter. Subscribe only to intake, connection/QR and send/status events needed by the MVP. `MESSAGES_UPSERT`, `MESSAGES_UPDATE`, `CONNECTION_UPDATE`, `QRCODE_UPDATED` and `SEND_MESSAGE` are provider identifiers, not domain event names. QR data and provider credentials are restricted to the authorized channel-setup operation and never enter LLM context. [Evolution webhook events](https://docs.evolutionfoundation.com.br/en/evolution-api/configuration/webhooks)

```typescript
type IncomingContent =
  | { kind: 'text'; text: string }
  | { kind: 'image' | 'pdf'; mediaReference: string; declaredMimeType: string }
  | { kind: 'unsupported'; providerContentType: string };

interface NormalizedMessage {
  version: ContractVersion;
  providerInstanceRef: string;
  providerMessageId: string;
  senderRef: string;
  direction: 'INBOUND' | 'OUTBOUND';
  author: 'CUSTOMER' | 'AI' | 'HUMAN' | 'UNRESOLVED';
  providerSentAt?: Instant;
  receivedAt: Instant;
  quotedProviderMessageId?: string;
  content: IncomingContent;
}

interface ConnectionObservation {
  providerInstanceRef: string;
  state: 'CONNECTED' | 'DISCONNECTED';
  observedAt: Instant;
}

interface QrChallenge {
  providerInstanceRef: string;
  qrData: string;
  observedAt: Instant;
  expiresAt?: Instant;
}

type NormalizedProviderEvent =
  | { kind: 'message'; message: NormalizedMessage }
  | { kind: 'delivery'; update: DeliveryUpdate }
  | { kind: 'connection'; observation: ConnectionObservation }
  | { kind: 'qr'; challenge: QrChallenge }
  | { kind: 'unsupported'; providerEventName: string };

type IntakeResult =
  | { kind: 'stored'; messageId: UUID }
  | { kind: 'duplicate'; messageId: UUID }
  | { kind: 'ignored'; reason: 'retired_connection' | 'unsupported_event' };
```

Four instants are kept distinct. `providerSentAt` is the WhatsApp-assigned message send time that arrives inside the authenticated Evolution webhook envelope. Product Owner agreement of 2026-11-12 (BR-SEN-16) treats it as trustworthy: it is assigned by WhatsApp's servers, not by the customer's device clock, and reaches this system only through the authenticated provider event, never through a customer-supplied or model-supplied value. It is the instant that judges evidence timeliness against the HOLD or correction deadline. The provider adapter validates it before exposing it: the provider field must be present, parse to a valid instant at the provider's own precision (whole seconds are expected), and not lie later than `receivedAt` plus a configured clock-skew tolerance. A value that fails any check is left absent rather than corrected or guessed. `receivedAt` is the trusted ingress receipt time, assigned once by the trusted ingress clock when the authenticated request first arrives, preserved across provider retries and persisted with the intake; it orders and audits arrival, measures delay and is the timeliness fallback below, but it never makes a message sent after the deadline timely or a message sent before it late. Database commit/visibility time is when the intake becomes visible to other transactions; it is a technical delay and never decides timeliness. The business deadline (`holdExpiresAt`, or the correction deadline) is owned by the booking. The intake records which instant it used (`PROVIDER_SENT_AT` or the fallback `RECEIVED_AT`) with the evidence. For a missing or invalid `providerSentAt`, this document proposes the conservative fallback of judging by `receivedAt`; it never grants extra time, and INT-Q-01 flags it for confirmation together with the exact deadline boundary and the skew tolerance. A `fromMe` flag identifies an outgoing direction, not whether a person or this bot authored it. Match known outbound references first. Unknown outgoing echoes cannot reset the human timer or become a customer command.

| HTTP response | Meaning |
|---|---|
| `200` | Required intake state and follow-up are committed, or an authenticated event was deliberately ignored/deduplicated |
| `400` / `413` | Invalid envelope / configured envelope-size limit exceeded |
| `401` | Instance authentication failed or does not resolve a permitted connection |
| `503` | Required persistence could not commit; no successful acknowledgement |

For ACTIVE connections, accept customer messages for the appropriate processing path. For PAUSED connections, persist inbox messages and prohibit automatic replies/notices. RETIRED connections are ignored after authenticating the old instance. Secret rotation must retain an explicitly bounded old-key overlap or drain the old webhook first. Never route by a customer's text, a display name or an unvalidated alternative sender ID. LID/phone mapping and native-app authorship need recorded pilot fixtures before enabling those paths.

### 4.2 Intake and evidence at the deadline

Ordinary conversation processing waits for the five-second batch window. Evidence protection must already be visible to expiry workers before that wait. The composite intake workflow persists the normalized message and, for an unambiguously bound receipt candidate, its trusted booking/evidence context, provider send time and receipt time, the timeliness basis used, pending-analysis state, screening deadline and durable screening/recovery actions in the same transaction. It acknowledges only after that commit. Bytes are downloaded afterwards through the trusted media adapter.

The binding comes from the backend-issued payment-instruction context, a validated reply to that instruction, or the single eligible outstanding evidence expectation for that sender. The core creates the expectation when issuing instructions. It does not come from a model-selected booking ID. Multiple possible expectations require explicit selection; INT-Q-02 gates the policy for those ambiguous arrivals at the deadline.

Proposed representation is intake/screening metadata associated with the existing `Message` and its issued-instruction correlation. `messaging` owns that row; `payments` defines the evidence meaning and the workflow coordinates updates through public APIs, following MOD-DM-06. These are proposed logical fields, absent from today's schema. T-04/T-05 must approve their exact binding and indexes before implementing receipt intake. Creating a human `PaymentReview` is reserved for the routing outcomes defined in UC-03.

An expiry workflow can inspect this correlated pending state through owner queries inside its transaction. A provider call, a delayed graph run or a failed queue acknowledgement cannot hide timely admitted evidence. While PAUSED or under human control, eligible evidence is routed to human review through the workflow, without invoking the conversational agent. The same original send-time/deadline safeguards apply.

#### Serialization with HOLD and correction expiry

Evidence and expiry can race. The protocol keeps BR-SEN-16 and BR-SEN-18 without extending any deadline. Timeliness is judged by the validated `providerSentAt` against `holdExpiresAt` or the correction deadline (the `RECEIVED_AT` fallback applies only when `providerSentAt` is missing or invalid, see §4.1). A message sent after the deadline is late even if it reaches the system within the admission margin, and a message sent before it is timely even if it arrives later. The coordinating `workflows` composition owns the protocol, as the cross-owner coordinator under MOD-DM-06 and MOD-DM-08. The bound-evidence intake workflow and the `booking.hold-expiry.v1` / `booking.correction-expiry.v1` workflows each open one transaction, take the tenant guard first, then lock the affected booking and dependent financial records in the CON-01 deterministic order, and revalidate booking status, deadline, funds and existing evidence state under that lock. `messaging`, `bookings` and `payments` each write their own rows through public owner APIs inside it. No provider call, media download, model inference or queue wait takes place in either transaction.

- **Admission margin.** Under UC-03 BR-RES-08 and BR-SEN-18, expiry waits a configurable processing margin, default **15 seconds** after the applicable deadline, validated in the pilot (INT-Q-01, INT-Q-05). The margin covers short transport and persistence delay for evidence that was sent in time: webhook delivery, ingress-to-commit latency, a retried commit and lock wait. It never grants the customer extra booking time: customer actions that depend on an active HOLD are judged against the deadline itself, the margin is not a renewal of the HOLD or correction window, and late-sent evidence stays late inside it. It is not a guarantee that every timely-sent message is admitted before expiry. Timely-sent evidence that arrives after expiry committed follows the BR-SEN-18 path below.
- **Interleaving (a): timely-sent evidence commits before expiry.** The intake takes the booking lock, finds the booking still active and the evidence timely, and commits the pending protection. Expiry, serialized behind it, sees the correlated pending intake and does not release. Screening and review continue under UC-03 BR-SEN-14–16 with the original deadline unchanged.
- **Interleaving (b): evidence sent after the deadline.** Whether it commits before or after expiry, and whether it arrives inside the margin or later, the evidence is late. It never protects the booking, never revives it and never reclaims the slot: it is retained for personnel under BR-SEN-17, BR-COB-12 and BR-SEN-16 as `LATE_FINANCIAL_HANDLING`. If the slot is still available, the agent may offer the new-booking flow of BR-SEN-17 and relink the receipt with `relinkLateReceipt` (§6). The agent's wording follows the booking status read under the lock: between the deadline and the end of the margin the booking may not be released yet, and the late disposition is already final.
- **Interleaving (c): timely-sent evidence commits after expiry released the booking.** Intake, serialized behind the expiry, finds the booking released and the evidence timely (BR-SEN-18). It does not re-block in that transaction when screening is needed; it records the pending state and follows the re-block path below.

**BR-SEN-18 re-block path.** `workflows` coordinates it across `messaging`, `payments` and `bookings`, with `notifications` for the notices. The dependency direction stays acyclic under CON-01: workflows calls each owner's public API, and no owner calls back into it.

1. **Qualification (intake transaction).** Re-blocking is possible only if the original booking closed by deadline expiry: HOLD expiry, or a correction-window timeout. Explicit customer or business cancellation, and any other terminal cause, never re-block. `bookings` exposes the closure cause as a logical fact (physical form under T-04/T-05, INT-Q-04). For any other cause the evidence is retained as `LATE_FINANCIAL_HANDLING` for personnel to decide credit or refund. A deadline-expired booking with timely evidence continues.
2. **Screening first, outside any transaction (files).** The intake commits a pending-screening state and the durable screening action. Screening follows §7 and never starts inside a database transaction. A plausible result, an inconclusive result and a technical failure (including the screening watchdog's timeout routing) qualify for re-block. `CLEARLY_UNRELATED` does not: the evidence is retained, the booking stays expired, the customer is told the file does not look like a receipt and that the booking expired, and the agent may offer BR-SEN-17 re-booking. This result is not counted as an extra evidence attempt beyond the existing rules and grants no extra time. The outcome is `RELEASED_UNRELATED`.
3. **Authorized text fallback.** Text evidence with the customer's explicit inability to attach (BR-SEN-12) skips screening. The re-block conditions apply directly in the intake transaction, which already holds the locks, and the case goes to human review.
4. **Re-block decision (separate transaction).** For a qualifying result, a new transaction takes the tenant guard and locks in CON-01 order, including the original booking, any booking now occupying the slot and the affected waitlist records, and revalidates that the original booking is still deadline-expired and not already reactivated, that the evidence generation is current, and the slot's occupancy and availability. No occupancy is held during screening, so the authoritative decision classifies the current state under those locks, never relying on a pre-lock read:
   - **Free:** This includes a slot only browsed, since browsing creates no claim. The normal `bookings` availability query can establish that the slot is free.
   - **Otherwise available and occupied only by an unclaimed exclusive waitlist invitation claim:** This is an occupying claim, not a free slot; any additional unavailability falls in the next category. Only for BR-SEN-18, `workflows` invokes the bookings/waitlist owner's public API to close that unclaimed claim atomically in this same transaction, before acquiring occupancy for the reactivated booking (BR-DISP-03, BR-WL-07). Do not route this exception through the normal free-slot availability query. The entry retains its original priority, and the invitee notice is enqueued transactionally for delivery after commit. A concurrent invitation claim that wins first creates a protected booking and falls in the next category.
   - **Any other occupying or unavailable state:** This includes another booking in `HOLD`, `PENDING_PAYMENT_REVIEW` (including protected partial-deposit waiting), or `CONFIRMED`, a claimed invitation's booking, resource blocks or closures, and private residual occupancy. Never displace or override it. The original booking stays released, the evidence is retained and the case goes to priority personnel review, which may offer another time. The outcome is `PRIORITY_PERSONNEL_REVIEW`.

   For the free slot or the guarded unclaimed-exclusive-claim exception, `bookings` acquires occupancy and reactivates the same booking with its original terms into `PENDING_PAYMENT_REVIEW`, recording and auditing the reactivation. `payments` creates the human review and personnel are notified to verify the receipt through an enqueue in the same transaction. Sent, unclaimed waitlist invitations for the slot are withdrawn through the bookings/waitlist owner API and each invitee notice ("the slot was taken") is enqueued for delivery after commit. Each entry keeps its original priority for future openings (BR-WL-06–08). Earlier waitlist work for the slot becomes obsolete by generation. A later competing attempt, including an invitation claim, gets `slot_unavailable` (BR-WL-08/09). The outcome is `REBLOCKED_FOR_REVIEW`.
5. **Idempotency.** The decision is idempotent by (evidence, original booking, generation). A redelivered job, a duplicate webhook or recovery after a crash reuses the recorded outcome: no second reactivation, notice or review, no extra evidence attempt, and no extra customer time. Review has no inactivity timeout, as for other human review.

- **Authenticated duplicates.** A repeat of the same source message resolves to the stored intake (`duplicate`) before any claim or evidence-attempt creation. It never recreates protection, never counts an extra evidence attempt and keeps the original `providerSentAt`, `receivedAt` and timeliness basis.
- **Crash and retry.** If the intake transaction fails, nothing is committed and the endpoint returns `503`, so the provider can retry. The retry has the same source identity and the same `providerSentAt`, so a retry that arrives late does not make timely-sent evidence late. If it arrives after expiry it follows interleaving (c). How long the provider retries and what the retried delivery carries are INT-Q-01 and INT-Q-05 pilot checks. A crash after commit but before the HTTP acknowledgement is a duplicate on retry. Redelivered screening or recovery work reuses the persisted intake and generation.
- **Out-of-order screening.** A screening result for a later evidence item cannot be applied as the first or second attempt before an earlier distinct item is classified; the serialized evidence sequence of §7.1 orders them. A stale or repeated result is a no-op and does not recreate a claim or add an attempt.
- **Independent timers.** The five-second conversation batching window (INT-DM-06) and the five-second screening budget (INT-DM-08) are independent of each other, of the configurable admission margin (default 15 seconds) and of this protocol. Neither extends a deadline or delays the intake commit.

### 4.3 Sending and status recovery

```typescript
interface SendTextCommand {
  tenantId: UUID;
  connectionId: UUID;
  conversationId: UUID;
  dispatchId: UUID;
  attemptId: UUID;
  recipientRef: string;
  text: string;
  authorizationRevision: string;
}

type SendRejectionCode =
  | 'invalid_recipient' | 'connection_not_ready' | 'rate_limited' | 'invalid_request';

interface SendRejection {
  code: SendRejectionCode;
  retryAfterMs?: number;
}

type SendOutcome =
  | { kind: 'accepted'; providerMessageId: string }
  | { kind: 'rejected'; rejection: SendRejection }
  | { kind: 'unknown'; correlationRef: UUID };

type DeliveryState = 'ACCEPTED' | 'DELIVERED' | 'READ' | 'FAILED' | 'UNKNOWN';

interface DeliveryUpdate {
  connectionId: UUID;
  providerMessageId: string;
  state: DeliveryState;
  occurredAt: Instant;
}

interface MessagingTransportPort {
  normalizeEvent(command: {
    authenticatedInstanceRef: string;
    rawBody: unknown;
    receivedAt: Instant;
  }): Result<NormalizedProviderEvent>;
  ensureInstance(command: {
    tenantId: UUID;
    connectionId: UUID;
    providerInstanceRef: string;
    webhookCredentialRef: string;
  }): Promise<Result<{ providerInstanceRef: string }>>;
  readConnection(command: {
    tenantId: UUID;
    connectionId: UUID;
  }): Promise<Result<ConnectionObservation>>;
  readQr(command: {
    tenantId: UUID;
    connectionId: UUID;
  }): Promise<Result<QrChallenge>>;
  readMessageMedia(command: {
    tenantId: UUID;
    connectionId: UUID;
    providerMessageId: string;
    senderRef: string;
  }): Promise<{ kind: 'bytes'; declaredMimeType: string; bytes: Uint8Array }
    | { kind: 'failed'; failure: IntegrationFailure }>;
  sendText(command: SendTextCommand): Promise<SendOutcome>;
  recoverStatus(command: {
    tenantId: UUID;
    connectionId: UUID;
    correlationRef: UUID;
    providerMessageId?: string;
  }): Promise<{ kind: 'known'; state: DeliveryState } | { kind: 'unresolved' }>;
}
```

Instance/QR operations are server-only capabilities of the channel-management use case, authorized under CU-18 before calling this port. They are absent from the customer tool allowlist. `ensureInstance` reuses the backend-selected reference on provisioning retries; reconciliation checks an existing upstream instance before creating another. Persist its intended application connection mapping before provisioning. Only a validated connected number can establish operational customer authority. A temporary disconnect retains the same connection identity. PAUSED/RETIRED are application lifecycle changes that take effect independently of provider connectivity. Exact provisioning/QR failure-state storage stays in T-04/T-05.

Before dispatch, the owner rechecks tenant, recipient, connection, notice validity, consent where applicable, and the routing generation for an AI reply. Persist the attempt and dispatch authorization before submitting to Evolution. Request submission is the linearization point for an in-flight send. Takeover invalidates queued/unsubmitted AI work; the UI must expose an already submitted attempt while its outcome is reconciled. An already submitted message may be delivered later by the provider. The exact handoff acknowledgement/send reservation protocol is INT-Q-03 and must satisfy INV-MSG-04 in implementation.

After provider acceptance, store its message reference and correlate later status events. An older ACCEPTED event cannot downgrade READ/DELIVERED. Contradictory or unmapped statuses require reconciliation. `NotificationAttempt` maps `accepted` to its existing SENT outcome and retains delivery/read updates. HTTP success proves acceptance only, never delivery or reading.

`SendOutcome` has three results, split at the submission boundary:

| Outcome | Meaning | `NotificationAttempt` outcome and next step |
|---|---|---|
| `accepted` | The provider explicitly accepted the request and returned `providerMessageId` | SENT; correlate later status events |
| `rejected` | The provider explicitly refused the request before acceptance, with a `SendRejectionCode` | Confirmed failure (BR-NOT-10); the only outcome that authorizes the single retry below |
| `unknown` | The result cannot be established; carries the `correlationRef` persisted with the attempt | Unknown outcome (BR-NOT-10); `recoverStatus`, never automatic resend |

`SendRejectionCode` is deliberately narrow: it lists only refusals the provider can make before it accepts a message (invalid or unreachable recipient, instance not connected, rate limiting, a request the provider validates and refuses). The adapter maps a provider response to a code only when that response proves the message was not accepted. A response it cannot classify, a 5xx whose effect is unclear or an unrecognized body is `unknown`, not a rejection. The general `IntegrationFailure`, including `timeout`, is not accepted by `SendOutcome`; screening and `readMessageMedia` keep it because repeating those reads cannot duplicate a customer message.

Submission boundary: a failure before the request leaves the adapter (for example the persisted dispatch authorization is stale or a local precondition fails) never reached the provider and is safe to retry or suppress as unsubmitted work. Once the request may have been submitted, or the adapter cannot exclude that it was, the result is `unknown` until correlated evidence says otherwise. A timeout, a broken connection or stream after submission, process death before the result is persisted, and a missing or unmatched correlation are all `unknown`.

Only `rejected` permits one still-valid new attempt, retaining the logical notice, after the owner rechecks consent, connection state and notice validity. `unknown` invokes `recoverStatus`; if the provider cannot establish the result, `unresolved` shows personnel attention, and the system does not automatically resend, including when a job is redelivered. Never enable a generic HTTP retry around a send. The adapter's recovery method may legitimately return `unresolved`; no provider idempotency header or lookup-by-client-key support is assumed, and these contracts make no exactly-once claim: at most one actual provider submission is attempted per `attemptId`, and a message submitted before the result was lost may still be delivered later. `dispatchId` and `attemptId` remain stable across retries and recovery, and the attempt's persisted state is what recovery and redelivery read. The versioned send route and DTO use `/message/sendText/{instance}` with `text` and `number` inside the provider adapter. [Send route](https://github.com/evolution-foundation/evolution-api/blob/2.3.7/src/api/routes/sendMessage.router.ts) · [Send DTO](https://github.com/evolution-foundation/evolution-api/blob/2.3.7/src/api/dto/sendMessage.dto.ts)

## 5. Conversation runtime and handoff

### INT-DM-06 — Persist batches and revalidate resumed work

`messaging` persists each message before batching. A grouping job uses the latest incoming-message generation and `lastReceivedAt + 5 seconds`; an obsolete job does nothing. It atomically records a neutral `conversation.batch-ready.v1` action. The `agent` consumer reads that action through the messaging facade. Only one live run may claim a conversation batch. Its processing cursor, ordered source-message IDs, stable operation identities and routing generation survive restart.

```typescript
interface ConversationBatch {
  version: ContractVersion;
  batchId: UUID;
  context: CustomerContext;
  messageIds: UUID[];
  deadlineAt: Instant;
}

type RuntimeOutcome =
  | { kind: 'reply_prepared'; draftId: UUID; sourceMessageIds: UUID[] }
  | { kind: 'handed_off'; summaryId: UUID }
  | { kind: 'superseded' }
  | { kind: 'failed'; failure: IntegrationFailure };

interface ConversationRuntimePort {
  runBatch(batch: ConversationBatch): Promise<RuntimeOutcome>;
}
```

The LangGraph adapter uses a persistent checkpointer with a backend-derived thread key containing tenant and conversation IDs. Checkpoint IDs never grant authorization. Credentials, raw provider envelopes and private file bytes are excluded from checkpoints. Avoid a separate long-term customer store for the MVP. Conversation deletion/anonymization includes associated checkpoints and prepared drafts under the same retention policy and recoverable deletion workflow.

LangGraph replay can rerun a node and its side effects. Reuse §3 operation identities at every mutating tool boundary and fetch current state before explaining a resumed result. Checkpoint persistence alone cannot prove a booking or send was committed. Proposed runtime budget is 30 seconds per run, with at most eight tool invocations; timeout or exhausted budget offers human help with the known actual outcome. Screening has its separate five-second budget in §7. These limits are technical proposals, subject to pilot measurement. [LangGraph replay and idempotency](https://docs.langchain.com/oss/javascript/langgraph/graph-api#re-execution-and-idempotency) · [Persistence](https://docs.langchain.com/oss/javascript/langgraph/checkpointers)

Before resuming a run or dispatching its draft, reload connection lifecycle, conversation control, global AI state, deletion restrictions and generation. A stale draft is superseded. Each genuine human reply refreshes the 60-minute return deadline. The return job rechecks its generation and global AI state. Native-app detection is gated by T-04; explicit CRM takeover remains available. Returning to AI leaves financial review under its existing owner.

## 6. Typed tools available to the agent

### INT-DM-07 — Expose customer operations through narrow contracts

The following proposal fills CON-02 API-DM-23. Model-visible inputs contain business selections only. `OperationContext` is passed separately by the trusted tool executor. Runtime schemas must reject `tenantId`, requester, roles, control generations, payment decisions, caller-supplied prices and unexpected fields in model arguments. Every ID is checked against context and current state.

```typescript
type ResourceSelection =
  | { mode: 'ANY' }
  | { mode: 'SPECIFIC'; resourceId: UUID };

interface SlotSelection {
  serviceId: UUID;
  resource: ResourceSelection;
  startAt: Instant;
}

type EvidenceSelection =
  | { kind: 'FILE'; messageId: UUID }
  | { kind: 'TEXT'; messageId: UUID; inabilityConfirmationId: UUID };

type NoticeChoice = 'BOTH' | 'REMINDERS' | 'WAITLIST' | 'NONE';

type CustomerAction =
  | { kind: 'CONFIRM_HOLD'; bookingId: UUID }
  | { kind: 'CANCEL'; bookingId: UUID }
  | { kind: 'RESCHEDULE'; bookingId: UUID; slot: SlotSelection }
  | { kind: 'JOIN_WAITLIST'; serviceId: UUID; resource: ResourceSelection; from: Instant; to: Instant }
  | { kind: 'CLAIM_INVITATION'; invitationId: UUID }
  | { kind: 'LEAVE_WAITLIST'; entryId: UUID }
  | { kind: 'NOTICE_PREFERENCES'; choice: NoticeChoice }
  | { kind: 'REPORT_INABILITY_TO_ATTACH'; sourceMessageId: UUID }
  | { kind: 'REQUEST_DELETION' }
  | { kind: 'WITHDRAW_DELETION' };

interface ToolInputs {
  getBusinessInformation: Record<string, never>;
  listServices: Record<string, never>;
  findFreeSlots: { serviceId: UUID; resource: ResourceSelection; from: LocalDate; to: LocalDate };
  listOwnBookings: Record<string, never>;
  listOwnWaitlistEntries: Record<string, never>;
  prepareCustomerAction: { action: CustomerAction };
  createHold: { slot: SlotSelection; attendeeName?: string };
  confirmHoldWithoutDeposit: { bookingId: UUID; confirmationId: UUID };
  cancelOwnBooking: { bookingId: UUID; confirmationId: UUID; lateAcceptanceId?: UUID };
  rescheduleOwnBooking: { bookingId: UUID; slot: SlotSelection; confirmationId: UUID; lateAcceptanceId?: UUID };
  joinWaitlist: { serviceId: UUID; resource: ResourceSelection; from: Instant; to: Instant; confirmationId: UUID };
  claimInvitation: { invitationId: UUID; confirmationId: UUID };
  leaveWaitlist: { entryId: UUID; confirmationId: UUID };
  getOwnPaymentStatus: { bookingId: UUID };
  getOwnNoticePreferences: Record<string, never>;
  submitReceiptEvidence: { bookingId?: UUID; evidence: EvidenceSelection };
  relinkLateReceipt: { receiptId: UUID; bookingId: UUID };
  setNoticePreferences: { choice: NoticeChoice; confirmationId: UUID };
  requestDataDeletion: { confirmationId: UUID };
  withdrawDataDeletion: { confirmationId: UUID };
  escalateToHuman: { reason: 'REQUESTED' | 'UNRESOLVED' | 'TOOL_FAILURE'; summary: string };
}

interface PublicService {
  id: UUID;
  name: string;
  durationMinutes: number;
  price: Money;
}

interface CustomerBooking {
  id: UUID;
  serviceName: string;
  resourceName: string;
  startAt: Instant;
  endAt: Instant;
  attendeeName?: string;
  status: 'HOLD' | 'PENDING_PAYMENT_REVIEW' | 'CONFIRMED';
}

interface PaymentInstruction {
  instructionId: UUID;
  recipientName: string;
  destination: { kind: 'ALIAS' | 'BANK_ACCOUNT'; value: string };
  amount: Money;
}

interface BookingTerms {
  totalPrice: Money;
  currency: string;
  requiredDeposit: Money;
  cancellationPolicy: string;
  reschedulePolicy: string;
}

type HoldPayment =
  | { kind: 'NOT_REQUIRED' }
  | { kind: 'INSTRUCTIONS_ISSUED'; instruction: PaymentInstruction }
  | { kind: 'PERSONNEL_REQUIRED' };

type InitialDepositProjection =
  | { state: 'NOT_REQUIRED' }
  | { state: 'AWAITING_EVIDENCE'; amountOwed: Money }
  | { state: 'UNDER_REVIEW' }
  | { state: 'CORRECTION_WINDOW'; amountOwed: Money; correctionDeadline: Instant }
  | { state: 'PARTIAL'; amountOwed: Money }
  | { state: 'MET' }
  | { state: 'ADMIN_EXCEPTION' }
  | { state: 'PERSONNEL_REQUIRED' };

type SupplementalDepositProjection =
  | { state: 'REQUESTED'; amountOwed: Money; instruction: PaymentInstruction }
  | { state: 'UNDER_REVIEW' }
  | { state: 'MET' }
  | { state: 'NOT_COLLECTED' }
  | { state: 'PERSONNEL_REQUIRED' };

interface AcquiredHold {
  booking: CustomerBooking;
  terms: BookingTerms;
  holdExpiresAt: Instant;
  confirmationId: UUID;
  payment: HoldPayment;
}

interface ToolOutputs {
  getBusinessInformation: { name: string; timezone: string; informationalHours: string[]; whatsappLink?: string };
  listServices: { items: PublicService[] };
  findFreeSlots: { items: { selection: SlotSelection; endAt: Instant; price: Money }[] };
  listOwnBookings: { items: CustomerBooking[] };
  listOwnWaitlistEntries: {
    items: {
      entryId: UUID;
      serviceName: string;
      resourceName?: string;
      from: Instant;
      to: Instant;
      invitations: { invitationId: UUID; startAt: Instant; endAt: Instant; priorityUntil?: Instant }[];
    }[];
  };
  prepareCustomerAction: {
    confirmationId: UUID;
    summary: string;
    lateConsequence?: { notice: string; acceptanceId: UUID };
  };
  createHold: AcquiredHold;
  confirmHoldWithoutDeposit: { bookingId: UUID; status: 'CONFIRMED' };
  cancelOwnBooking: { bookingId: UUID; status: 'CANCELLED'; financialHandling: 'NONE' | 'PERSONNEL_REQUIRED' };
  rescheduleOwnBooking: {
    booking: CustomerBooking;
    terms: BookingTerms;
    supplementalDeposit: SupplementalDepositProjection | null;
  };
  joinWaitlist: { entryId: UUID; enrolled: true };
  claimInvitation: AcquiredHold;
  leaveWaitlist: { entryId: UUID; closed: true };
  getOwnPaymentStatus: {
    bookingId: UUID;
    initialDeposit: InitialDepositProjection;
    supplementalDeposit: SupplementalDepositProjection | null;
  };
  getOwnNoticePreferences: { state: 'UNRECORDED' }
    | { state: 'RECORDED'; reminders: boolean; waitlist: boolean };
  submitReceiptEvidence: {
    receiptId: UUID;
    disposition:
      | 'SCREENING_PENDING'
      | 'REPLACEMENT_REQUIRED'
      | 'HUMAN_REVIEW'
      | 'LATE_FINANCIAL_HANDLING'
      | 'REBLOCKED_FOR_REVIEW'
      | 'PRIORITY_PERSONNEL_REVIEW'
      | 'RELEASED_UNRELATED';
  };
  relinkLateReceipt: { receiptId: UUID; bookingId: UUID; disposition: 'HUMAN_REVIEW' };
  setNoticePreferences: { reminders: boolean; waitlist: boolean };
  requestDataDeletion: { dueAt: Instant; confirmationRecorded: true };
  withdrawDataDeletion: { withdrawn: true };
  escalateToHuman: { handoffId: UUID };
}

type ToolName = keyof ToolInputs;

interface CustomerToolExecutor {
  execute<K extends ToolName>(
    name: K,
    input: ToolInputs[K],
    context: OperationContext,
  ): Promise<Result<ToolOutputs[K]>>;
}
```

| Tools | Facade / composition | Required checks and refusal vocabulary |
|---|---|---|
| Information and services | Read composition above `tenants` and `catalog` | Deliberately public fields. Product-owner agreement of 2026-11-12, pending reflection in PR #33: location comes from a public business address field (proposed DOM-01 addition) and the WhatsApp link from the tenant's connected number |
| Free slots and own bookings | `bookings` queries | Same tenant, current catalog, requester-owned future records; `not_found`, `range_too_large`, `inactive_service` |
| HOLD and no-deposit confirmation | `workflows` | Recheck restrictions, policy, limits and occupancy; confirm explicit current terms while valid; `slot_unavailable`, `state_changed`, slot/policy refusal reasons |
| Preparation and own cancellation/rescheduling | `workflows` | Requester ownership, current confirmation and any accepted late consequence; `not_found`, `late_change_requires_acceptance`, `reschedule_limit_reached`, `state_changed` |
| Own waitlist reads, enrollment/withdrawal and invitation claim | `bookings` queries/commands / `workflows` for cross-owner changes | Current requester-owned active entries and valid invitations; specific voluntary interest, preference, queue cap and opportunity; `waitlist_full`, `invitation_no_longer_available`, `requester_not_eligible`, `slot_unavailable` |
| Payment status | Read composition over `bookings` and `payments` | Requester-owned, tenant-scoped booking only; separate initial/supplemental customer projections and backend-calculated amounts; `not_found` |
| Evidence | Protected workflow | Same-source message and evidence context, original send time/deadline, closure cause, fallback authorization; `not_found`, `unsupported_media_type`, `file_too_large`; late evidence is retained |
| Preference reads | `customers` | Distinguish an unrecorded choice from recorded refusal; read current requester preferences before the first-confirmation/enrollment question |
| Preference changes and deletion | `workflows` | Explicit answer from this requester, scoped audit and immediate effects; `state_changed` |
| Escalation | `messaging` public command | Same conversation, bounded summary and routing update |

The table reuses [CON-02 §10](https://github.com/nanonoir/Agendoxa/blob/d2b7d77769738b118b09241808bfd1edc50cfbcf/docs/design-docs/api-contracts.md#10-internal-consumers-the-agent). Preserve the full applicable slot-policy reasons there. `requester_not_eligible` conceals internal restriction labels. Financial status is an explicit customer projection; reviewer identity, internal rejection reasons, restriction labels, cash data and personnel-only decisions are absent. Its enums are a proposed tool contract, separate from the CRM's proposed `depositState` representation.

`findFreeSlots` computes a price and compatible concrete choices in the core. `createHold` rechecks and applies the tenant's any-resource assignment mode. The backend computes duration, end, price, deposit and receiving instructions. AcquiredHold returns the actual acquired terms, including the authoritative price, currency, required deposit and configured cancellation/reschedule policy summaries. The core persists the relevant snapshots and supplies these summaries; the agent cannot reconstruct them from an older search. The same contract covers an invitation winner. The `confirmationId` in a HOLD is valid for no-deposit confirmation only when the core says that path is allowed.

NOT_REQUIRED corresponds to zero required deposit. INSTRUCTIONS_ISSUED contains the persisted receiving instruction for this acquired booking, with the amount/currency checked against its terms before presentation. PERSONNEL_REQUIRED represents a missing usable collection destination requiring the already specified human handling. The agent requests a transfer only for INSTRUCTIONS_ISSUED and communicates the complete acquired terms before doing so. Retries reuse that instruction and its recipient. Reschedule results likewise return the acquired new terms rather than an earlier quote.

**Payment projections.** `getOwnPaymentStatus` returns two separate projections for one requester-owned booking of the trusted tenant; a foreign or unknown ID is `not_found`. `initialDeposit` describes the initial deposit. `supplementalDeposit` is `null` unless a permitted reschedule of a `CONFIRMED` booking required an additional deposit (BR-CAN-10); it never replaces or reopens the initial one. Amounts (`amountOwed`) are exact decimal strings calculated by the backend from the booking's charge and valid allocations; the agent never computes, rounds or infers them. The backend maps its internal deposit, review and allocation states to these customer states in one total function: any state it cannot map, or any read that fails or is unavailable, yields `PERSONNEL_REQUIRED` rather than a guess. The agent treats that value as "personnel will confirm", offers `escalateToHuman` when the customer needs an answer, and makes no claim about payment.

Under BR-SEN-07/09/11 and BR-COB-03, personnel verification allocates the money to the booking's charge in the same human action, up to the amount owed. An active booking therefore never exposes "verified but unallocated" funds, and the proposed CON-02 `AWAITING_ALLOCATION` deposit state has no customer projection. Excess or unknown-origin money stays unallocated for manual resolution and is not part of this projection. CON-02 still lists `AWAITING_ALLOCATION` and API-Q-13; reflecting that product decision there is pending in INT-Q-07.

| Source state | What the agent may say | What it may request | Staff attention |
|---|---|---|---|
| Initial `NOT_REQUIRED` | No deposit is required for this booking | Nothing | No |
| Initial `AWAITING_EVIDENCE` | The deposit is pending and how much is owed | The transfer receipt, using the issued instruction (never a second payment) | No |
| Initial `UNDER_REVIEW` | The business is reviewing the receipt; the result is not yet known | Nothing; no new transfer, and no assumption that a reported transfer is the one under review (see the reported-transfer flow) | No (review is queued) |
| Initial `CORRECTION_WINDOW` | The receipt could not be accepted for now, the amount still owed and the `correctionDeadline` | A corrected receipt or transfer before the deadline, without implying the deadline is extended | No; the reason is never shown |
| Initial `PARTIAL` | A part is verified and `amountOwed` remains; the booking stays unconfirmed | The remaining amount through the issued instruction | Optional; the customer may ask for contact |
| Initial `MET` | The deposit requirement is met | Nothing | No |
| Initial `ADMIN_EXCEPTION` | The booking is confirmed, without presenting any payment as received or the exception as a payment or waiver | Nothing about a deposit | No |
| Supplemental `null` | Nothing about a supplement | Nothing | No |
| Supplemental `REQUESTED` | An additional deposit of `amountOwed` is requested for the new service; the booking stays confirmed | The receipt/transfer using `instruction` | No |
| Supplemental `UNDER_REVIEW` | The additional payment is being reviewed; the booking stays confirmed | Nothing | No |
| Supplemental `MET` | The additional deposit is covered | Nothing | No |
| Supplemental `NOT_COLLECTED` (proposed name) | Nothing more is owed in advance and the remainder is paid at the appointment; never that the amount was forgiven or waived (BR-CAN-15) | Nothing | No; the optional reason and the deciding person are never shown |
| Either `PERSONNEL_REQUIRED` (unknown, unmapped or unavailable) | Personnel will confirm the situation; no claim about money | Nothing | Yes |

Supplemental states never make a `CONFIRMED` booking look unconfirmed or at risk: the booking status in `CustomerBooking` is independent and the agent does not link a pending supplement to cancellation. Staff-only data are excluded from every row: reviewer identity, internal rejection notes, restriction labels, cash data, and personnel-only decisions such as the Admin-only exception or the supplement non-collection reason. The agent verifies, allocates, refunds and mutates no financial record, and states no balance beyond `amountOwed`.

`prepareCustomerAction` obtains the canonical summary and confirmation reference from the public workflow before asking the customer. It prepares only the permitted customer actions listed in the union, without changing business state or acquiring occupancy. The confirmation becomes executable only after the backend records an explicit matching customer response. Cancellation and rescheduling need a fresh confirmation bound to the displayed conditions. `lateAcceptanceId` references the recorded acceptance of the displayed consequence, never an Admin exception. A failed move preserves the original booking; later supplemental collection retains the domain's confirmed-booking safeguard. Waitlist withdrawal implements the already specified customer-requested closure in BR-WL-12/15. The preparation/withdrawal names are proposed additions to CON-02's operation catalog, covered by INT-Q-07.

For REPORT_INABILITY_TO_ATTACH, `sourceMessageId` must resolve to the customer's actual explicit inability statement or answer in the same conversation. The backend's recorded-response step binds it to that action; its confirmation reference is the `inabilityConfirmationId` used by text evidence. An already recorded explicit statement can satisfy this step without another image request. Merely selecting the action in a model call leaves the reference unusable until that source response is verified. `getOwnNoticePreferences` returns RECORDED even for both values false, so refusal is reused and the optional combined question is not repeated. An explicit customer request to change a recorded preference can still prepare NOTICE_PREFERENCES.

`listOwnWaitlistEntries` supplies current entry IDs for later withdrawal and valid notified-invitation IDs for a claim. It returns only active interests and current claimable opportunities of this requester. The runtime therefore can resolve a later request from authoritative state rather than relying on an old LLM transcript. The query is proposed supporting coverage of the existing waitlist operations and joins the catalog reconciliation in INT-Q-07.

`submitReceiptEvidence` resolves the stored message under context and crosschecks its trusted evidence binding. A matching model-supplied `bookingId` alone cannot move a file to another booking. A technical duplicate returns the receipt's current disposition. The disposition for evidence about a released booking depends on when it was sent and why the booking closed (§4.2). Evidence sent after the deadline, or sent in time for a booking closed by explicit cancellation or another terminal cause, is `LATE_FINANCIAL_HANDLING`: retained, never reviving the booking or reclaiming the slot. Evidence sent in time for a booking closed by deadline expiry (BR-SEN-18) is first `SCREENING_PENDING` for a file; the recorded result is then `REBLOCKED_FOR_REVIEW` (same booking reactivated into human review), `PRIORITY_PERSONNEL_REVIEW` (any other occupying or unavailable state is never displaced) or `RELEASED_UNRELATED` (clearly unrelated file; booking stays expired, nothing re-blocked). Authorized text fallback goes directly to `REBLOCKED_FOR_REVIEW` or `PRIORITY_PERSONNEL_REVIEW`. A repeated call returns the receipt's recorded disposition, which is how the runtime learns the outcome of a pending screening; the agent never decides or applies it. The agent says only what the disposition supports: for `REBLOCKED_FOR_REVIEW`, that the business will check the receipt, with no claim of acceptance or money received; for `PRIORITY_PERSONNEL_REVIEW`, that the business will review the case urgently, with no promise of the slot; for `RELEASED_UNRELATED`, that the file does not look like a receipt and the booking expired, optionally offering BR-SEN-17 re-booking. The proposed CON-02 `booking_released` refusal must preserve that same retained-evidence side effect when mapped to a refusal.

**Reported transfer (BR-AGT-07, INV-MSG-08).** The system cannot detect an unreported transfer, so the agent never starts a message about one. When the customer says they already transferred, the agent reads `listOwnBookings` and `getOwnPaymentStatus` for the candidates. With no booking, it follows the normal flow (service, date, `createHold`, receipt request). A booking is eligible for a receipt when `getOwnPaymentStatus` shows any outstanding expectation: initial `AWAITING_EVIDENCE`, `CORRECTION_WINDOW` or `PARTIAL`, or supplemental `REQUESTED` (including a booking created by personnel). The backend revalidates the binding of the receipt to that expectation. With exactly one eligible booking, the agent asks for the receipt and calls `submitReceiptEvidence` with that `bookingId`, so the receipt goes to human verification. With several eligible, it asks which one (INT-Q-02) and submits only the customer's explicit choice, which the backend revalidates. A booking whose initial or supplemental deposit is `UNDER_REVIEW` is not "no deposit awaiting", but the report does not by itself refer to the receipt already in review. The agent asks whether the transfer is the one already sent. If the customer says it is, the agent says it is under review by the business and requests and submits nothing. If it is a different transfer, or the answer is unclear, the agent requests the receipt and submits it: linked to a booking when a valid expectation exists (with the usual backend revalidation and choice among several), otherwise without `bookingId` as a payment for personnel review. Neither answer treats money as received or asks the customer to pay twice. If any candidate booking's projection is `PERSONNEL_REQUIRED`, or its read fails or cannot be mapped, the agent does not infer that no expectation exists and does not take the "none eligible" branch: it says personnel will confirm and offers `escalateToHuman`, requesting a receipt only to route it to personnel review without `bookingId`. With bookings but none eligible (all projections readable and none outstanding or under review), it follows the normal flow if the customer wants a new booking; otherwise it requests the receipt and calls `submitReceiptEvidence` without `bookingId`: the backend routes it as a payment for personnel review (`HUMAN_REVIEW`), changing no booking. The customer's statement is never treated as money received, the agent never asks them to pay twice, and it says only that the business will review and confirm.

**Late receipt (BR-SEN-17).** A receipt sent after the deadline of a booking released by deadline expiry returns `LATE_FINANCIAL_HANDLING`: retained for personnel, and the agent says the booking expired and the business will review the payment, never that it was received or accepted. If the released slot is still available under the normal availability check (including waitlist priority), the agent may offer to book again through the normal flow: `findFreeSlots`, `createHold` on current terms and explicit confirmation. It then links the retained late receipt to the new booking through the dedicated `relinkLateReceipt` operation, not by calling `submitReceiptEvidence` again: that tool keeps its duplicate semantics, so a repeated message returns the existing disposition and a supplied `bookingId` never moves a file. The old booking is never revived and the late receipt never reclaims the slot. If the slot is unavailable, the late-evidence handling applies.

`relinkLateReceipt` is a narrow, authorized transition coordinated by `workflows` under CON-01 ownership: `messaging` keeps the receipt/message row and `payments` the financial handling, each written through its public owner API in one transaction (tenant guard, then locks in CON-01 order). It is allowed only when (a) the receipt is in `LATE_FINANCIAL_HANDLING` because it was sent after the deadline of a booking released by deadline expiry, and is still unallocated (evidence about a booking closed by cancellation or another terminal cause is a personnel credit/refund matter and is not offered for relinking), (b) the target is a `HOLD` of the same requester and tenant created through the normal flow with current terms and explicit confirmation, and (c) the requester context matches the receipt's message. Anything else is a refusal that changes nothing. It is idempotent by (receipt/message, new booking): a duplicate returns the same result, and a different new booking for an already relinked receipt is refused. The old booking stays released and unchanged. The receipt moves to human verification for the new booking (`HUMAN_REVIEW`), where BR-COB-03 allocation applies to a personnel decision; the customer is told only that the business will review it, never that the money was received. The receipt's `providerSentAt` and `receivedAt` and the new HOLD's deadline are unaffected, and no evidence attempt is added. The name and refusal codes are a proposal for INT-Q-07. Receipts in `REBLOCKED_FOR_REVIEW`, `PRIORITY_PERSONNEL_REVIEW` or `RELEASED_UNRELATED` are not relinkable: BR-SEN-18 already decides their handling.

Tool schemas remain server-side agent contracts. HTTP schemas consumed by Next.js belong to `packages/shared` under CON-02. The tool catalog grants no payment verification/allocation, staff role, cash command, outcome correction, configuration operation or policy exception.

## 7. Preliminary receipt screening

### INT-DM-08 — Return a bounded technical classification

Propose the stable model ID **`gemini-3.8-flash`**, with replaceable configuration and structured JSON output. Google's model page documents image/PDF input and structured output. Record configured model ID, returned model version when supplied, prompt/schema version and technical result. A model/prompt upgrade reruns the fixture suite before rollout. The actual configured account must be eligible for the intended personal-data processing before real receipts are used. [Model capabilities](https://aistudio.google.com/docs/models/gemini-3.8-flash) · [Structured output](https://ai.google.dev/gemini-api/docs/structured-output)

```typescript
interface PreparedEvidenceTask {
  version: ContractVersion;
  tenantId: UUID;
  receiptId: UUID;
  assetId: UUID;
  generation: string;
  analysisDeadlineAt: Instant;
  content: { mimeType: AssetMimeType; bytes: Uint8Array };
}

interface ScreeningRequest extends PreparedEvidenceTask {
  promptVersion: 'receipt-relevance.v1';
}

type ScreeningOutcome =
  | { kind: 'PLAUSIBLE_RECEIPT' }
  | { kind: 'CLEARLY_UNRELATED' }
  | { kind: 'INCONCLUSIVE' }
  | { kind: 'TECHNICAL_FAILURE'; failure: IntegrationFailure };

interface ReceiptScreeningPort {
  analyze(request: ScreeningRequest): Promise<ScreeningOutcome>;
}
```

The worker obtains a PreparedEvidenceTask through a lower `workflows` facade. That workflow authorizes and reads validated bytes through `assets`, then returns them ephemerally. This neutral task type belongs to the workflows contract surface; the agent maps it to its own ScreeningRequest and prompt configuration. Workflows imports no agent type, and agent imports no assets facade. Its provider adapter sends only the file and fixed relevance instructions, then validates the response schema and enum. No tools, bank lookup, external URLs, payer matching, amount extraction or financial verdict are available to this classifier. Text inside the image/PDF is untrusted content. Invalid/truncated JSON, unavailable model, unreadable data and timeout become TECHNICAL_FAILURE or INCONCLUSIVE, never CLEARLY_UNRELATED. Structured output still requires semantic checks. [Google structured-output limits](https://ai.google.dev/gemini-api/docs/structured-output)

Proposed total analysis budget is **5,000 ms**, including queue delay, asset read, provider request and response validation, starting at admitted evidence receipt. It is a technical cutoff and latency objective. It never replaces `holdExpiresAt` or the correction deadline. Use cancellation on timeout. A delayed worker past `analysisDeadlineAt` routes a technical failure to human review without starting inference. One foreground provider attempt is proposed. A recovery job can complete the protected workflow after a process crash, without needing Gemini to recover.

### 7.1 Applying a result

The workflow first records pending intake and its recovery deadline as in §4.2. The agent worker prepares a still-current screening generation through the workflow facade, receives authorized ephemeral bytes, calls the analyzer outside a transaction, then supplies its trusted result to a protected workflow. No provider or storage network request runs inside a database transaction; the prepare facade revalidates its state after reading bytes. A client or LLM cannot directly call the result-application boundary. The final transaction serializes the evidence sequence, deduplicates, rechecks booking/start/funds/deadlines and applies UC-03 BR-SEN-14–16. For timely-sent evidence delivered after a deadline-based release, the same transaction (or the text-fallback intake) is the BR-SEN-18 re-block decision of §4.2, which revalidates availability under the booking locks after screening.

| Timely intake result | Applied effect |
|---|---|
| PLAUSIBLE_RECEIPT | Create/route human review and maintain the prescribed occupancy protection |
| First distinct CLEARLY_UNRELATED in the agreed initial sequence | Request replacement using the original deadline; no human rejection is counted |
| Second distinct CLEARLY_UNRELATED in that sequence | Explain the failed attempts and route to human review without inactivity expiry |
| INCONCLUSIVE / TECHNICAL_FAILURE | Preserve evidence and route to human review |
| Duplicate or stale screening generation | Reuse current result or no-op; no extra attempt, review or deadline |
| Authorized text fallback | Route directly to human review |
| Evidence sent after the deadline, or any evidence for a booking closed by cancellation or another terminal cause | Retain for financial handling (`LATE_FINANCIAL_HANDLING`), preserving the released slot |
| Timely-sent evidence after deadline-based release: PLAUSIBLE_RECEIPT, INCONCLUSIVE, TECHNICAL_FAILURE or authorized text fallback | BR-SEN-18 decision: a free slot or the guarded withdrawal of its sole unclaimed exclusive invitation claim gives `REBLOCKED_FOR_REVIEW`; any other occupying or unavailable state gives `PRIORITY_PERSONNEL_REVIEW` and is never displaced |
| Timely-sent evidence after deadline-based release: CLEARLY_UNRELATED | `RELEASED_UNRELATED`: no re-block, no extra attempt or time; re-booking may be offered under BR-SEN-17 |

An out-of-order result waits for the earlier distinct intake's terminal classification or is applied by the serialized evidence sequence. It cannot become the first/second attempt merely by finishing sooner. Recovery converts a stalled analysis to a technical failure and reuses the same intake identity. Original receipt order and technical duplicates remain distinguishable.

The watchdog applies a technical-failure result when a current analysis exceeds its budget; a late successful provider result then becomes a no-op. A first-unrelated result completed before that cutoff but after the business deadline permits the applicable expiry only after the canonical rechecks. Explicit authorized cancellation releases immediately while review/fund handling continues separately. Partial verified funds and supplemental collection retain their UC-03 safeguards.

P-40 still gates how unrelated-file counts carry across a human decision or a later correction round. This contract defines the initial two-attempt sequence and records round/provenance without choosing a reset. It does not authorize implementing an inferred count rule for later rounds.

## 8. Private assets and media

### INT-DM-09 — Expose authorized references and bounded bytes

Propose `image/jpeg`, `image/png`, `image/webp` and `application/pdf`, at most **10 MiB per file**, **20 PDF pages** and **25 megapixels per image** after decoding. These are application limits proposed under T-05, below the provider's documented document capability. Validate file signatures, complete decoded size/pages and media type. Reject encrypted/corrupt PDFs and archive/container formats before model access. File names and declared MIME types grant no trust. [Gemini PDF handling](https://ai.google.dev/gemini-api/docs/document-processing)

```typescript
type AssetMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

interface AssetMetadata {
  id: UUID;
  mimeType: AssetMimeType;
  sizeBytes: number;
  checksum: string;
}

interface AssetStoragePort {
  putPrivate(command: {
    tenantId: UUID;
    intakeId: UUID;
    mimeType: AssetMimeType;
    bytes: Uint8Array;
  }): Promise<AssetMetadata>;
  readPrivate(command: {
    tenantId: UUID;
    assetId: UUID;
    purpose: 'REVIEW' | 'SCREENING';
    authorizationRef: UUID;
  }): Promise<Uint8Array>;
  deleteAuthorized(command: {
    tenantId: UUID;
    assetId: UUID;
    deletionAuthorizationRef: UUID;
  }): Promise<{ kind: 'deleted' | 'already_deleted' | 'retained' }>;
}
```

`assets` revalidates the owner-issued authorization against tenant, purpose, current references and deletion state. The storage key and permanent object URLs stay server-side. CRM file reads go through the authorized review endpoint proposed by CON-02. Model access uses bounded inline bytes for these small files, avoiding a reusable public link. If a different provider-upload mechanism is adopted, its external copy and cleanup must be included in retention review.

The media adapter accepts the trusted provider message/connection reference, never a URL supplied by the model or copied from an untrusted webhook body. Enforce a configured provider origin, bounded redirects/size/time and validated bytes. Oversized/unsupported CRM upload errors map to CON-02 `file_too_large` / `unsupported_media_type`. An admitted WhatsApp receipt whose download/validation fails is preserved as intake metadata and routed to human handling as a technical failure, retaining original time and avoiding a false unrelated-file count. Unsafe bytes remain unavailable to rendering/inference.

Object storage and application metadata cannot share a SQL transaction. Use a backend-issued intake identity and tenant-scoped object key. Repeated writes must match its checksum. After writing bytes, attach metadata/references in the owner's transaction. If SQL fails, recovery reconciles that intake's object before retrying attachment. A deletion obtains the current owner decision, tombstones access and records durable object removal; crash/retry completes idempotently. An upload racing attachment, review or verified-payment protection must serialize with that owner's reference change. No cleanup job infers that an object is disposable merely from its creation time.

The same StoredAsset can be referenced by Message and PaymentReview. Resolve all references before deletion. Preserve pending-review and verified-payment evidence under BR-DAT-03/04. Deletion/anonymization of conversations, checkpoint data and other assets follows the existing request workflow. TD-01 retains ownership of age-based policy. The proposed 24-hour lifetime of an unlinked CRM upload is API-Q-12, pending Product agreement; it is not adopted here as an automatic deletion rule. Storage provider, data location, access lifecycle and account terms are INT-Q-06 deployment gates.

## 9. Durable jobs and their owners

### INT-DM-10 — Version job payloads and recheck generations

The platform schedules `ScheduledAction` envelopes from §3. `targetId` identifies an authoritative record owned by the handler's participants. Extra data required by a particular operation is a typed owner reference, loaded through that owner. A payload never contains credentials, raw receipt bytes, model prompts, prices or a stale decision to cancel/send. Reject unknown payload versions and alert operations without attempting domain effects.

```typescript
type JobKind =
  | 'booking.hold-expiry.v1' | 'booking.correction-expiry.v1'
  | 'waitlist.priority-expiry.v1' | 'waitlist.progress.v1' | 'waitlist.entry-expiry.v1'
  | 'waitlist.capacity-reevaluate.v1'
  | 'notification.dispatch.v1' | 'notification.status-recovery.v1'
  | 'invitation.dispatch.v1'
  | 'conversation.group.v1' | 'conversation.batch-ready.v1' | 'conversation.ai-return.v1'
  | 'evidence.screen.v1' | 'evidence.screening-timeout.v1'
  | 'customer.deletion-execute.v1' | 'asset.deletion-execute.v1';
```

| Kind | Ingress / state owner | Due time and mandatory rechecks |
|---|---|---|
| `booking.hold-expiry.v1` | `workflows` / `bookings`, with `payments` and intake queries | Original HOLD deadline plus the configured admission margin (default 15 seconds; §4.2), generation, evidence sent by the deadline and correlated intake/screening/review revalidated under the booking lock, funds, start and occupancy; records the deadline-expiry closure cause for BR-SEN-18 |
| `booking.correction-expiry.v1` | `workflows` / `bookings`, with `payments` | Correction deadline plus the configured admission margin (default 15 seconds; §4.2), distinct human-rejection sequence, evidence sent by the deadline and intake/review revalidated under the booking lock, partial funds, start and supplemental safeguard; records the deadline-expiry closure cause for BR-SEN-18 |
| Priority/progression/entry-expiry | `bookings` | Current round/generation, original priority schedule, eligibility/range/start; priority expiry preserves otherwise valid late invitations; a BR-SEN-18 re-block makes the slot's pending invitation work obsolete by generation |
| Capacity reevaluation | `bookings`, initiated by release or a catalog workflow | Actual resource/range availability after removal of a block or release, even without an earlier booking/round; exclude private remainders |
| Notification dispatch/status recovery | `notifications` / `messaging` transport | Current kind-specific audience, consent, lifecycle, slot and validity; `rejected` (confirmed failure) vs `unknown` outcome |
| Invitation dispatch | `workflows` / `notifications` and `bookings` | Persist outcome plus second-confirmed-failure advancement or its durable intent together; no priority extension or entry removal |
| Group / batch-ready | `messaging` producer; `agent` consumes batch-ready | Latest message generation and five-second quiet window; original unprocessed IDs; live run/routing authorization |
| AI return | `messaging` | Last genuine human reply plus 60 minutes, control generation, lifecycle and global AI state |
| Screening | `agent` / workflow-managed evidence state | Same intake/generation, authorized asset and remaining analysis budget; for timely-sent evidence after deadline-based release the result feeds the BR-SEN-18 re-block decision (§4.2) |
| Screening timeout | `workflows` / evidence participants | Current pending generation at cutoff; commit technical-failure routing without Gemini; for BR-SEN-18 evidence a technical failure qualifies for the re-block decision |
| Customer deletion execution | `workflows` / owning participants | Request still active and due, no withdrawal, current financial/review retention and immediate access restrictions |
| Asset deletion execution | `assets`, with owner authorization | Current tombstone/authorization and all protected references |

Proposed infrastructure policy for safe, idempotent database-only handlers is five retries with exponential backoff from one second, capped at 30 seconds, then visible failed work plus periodic owner reconciliation. These are technical retry settings, not additional business time. Handler runtime is bounded. Queue defaults cannot delete the only recoverable business intention. Due-state reconciliation runs on startup and every 60 seconds as an initial operational proposal, with capacity measurement before production.

External-send jobs override blind infrastructure retries. Once a dispatch is admitted, worker failure enters status recovery using the existing attempt. A redelivered job reads the persisted attempt: if it may have been submitted, the outcome is `unknown` and the job runs `recoverStatus` without submitting another provider request. The business's single retry after an explicit `rejected` outcome creates the second actual attempt. A delayed valid action runs after current-state rechecks; an expired opportunity is suppressed. Screening timeout/recovery preserves its original cutoff and routes conservatively.

## 10. Correlation and failure matrix

### INT-DM-11 — Persist the fact needed to recover each crash window

The following are logical responsibilities for implementation under the existing owners. Physical markers, unique indexes and idempotency storage must be approved before the corresponding adapter/worker is enabled. No custom Job entity or mandatory outbox is introduced by these contracts.

| Window / duplicate | Durable correlation | Recovery / observable result |
|---|---|---|
| Webhook repeated before/after acknowledgement | Stored source identity and intake result | One Message, same evidence identity and one logical set of follow-ups |
| Message commit before graph processing | Persisted unprocessed IDs, batching generation and batch-ready work | Resume the batch without losing messages or admitting duplicate mutations |
| Timely-sent evidence at HOLD expiry | `providerSentAt`, `receivedAt`, timeliness basis and correlated pending intake committed under the booking lock (§4.2) | Intake first: expiry sees protection before media/model processing and the original deadline remains. Expiry first, evidence sent after the deadline: late evidence, never reclaiming the slot. Expiry first, evidence sent in time: BR-SEN-18 screening, then the re-block decision |
| Timely-sent evidence after deadline-based release, slot state changes between screening and re-block | Closure cause, evidence generation and slot state revalidated under the booking locks | Re-block if free or only an unclaimed exclusive invitation claim occupies it, withdrawing that claim atomically first; any other occupancy or unavailability leads to priority personnel review without displacement. Redelivery reuses the recorded outcome |
| Provider send time missing or invalid | Absent `providerSentAt`, `receivedAt` and basis `RECEIVED_AT` | Timeliness falls back to `receivedAt` (INT-Q-01); no extra time is granted |
| Intake commit fails or crashes before acknowledgement | Nothing committed (`503`), or the stored intake on a duplicate | Provider retry reuses the source identity and the original `providerSentAt`/`receivedAt` where stored; no extra claim or evidence attempt (arrival handling: INT-Q-01) |
| Screening response lost or worker crashes | Intake generation and analysis cutoff | Timeout workflow creates the appropriate human route once; late result is stale |
| Business mutation commits before graph checkpoint | Operation identity, fingerprint and result committed with business state | Replayed tool returns the original effect and reads its current condition |
| Enqueue fails inside business transaction | Same database transaction | Both writes roll back; retry the whole operation |
| Worker commit before queue acknowledgement | Authoritative state/generation and effect identity | Redelivery observes completion and causes no second effect |
| Send submitted, result not persisted (accepted or not, timeout, broken stream, crash or missing correlation) | Persisted DISPATCHING attempt and available provider correlation | `unknown`: recover status or alert personnel on `unresolved`; no automatic resend, including on job redelivery |
| Provider explicitly rejects a send before acceptance | Attempt and `SendRejectionCode` | `rejected`: confirmed failure; one still-valid retry after rechecking consent, connection and notice validity |
| Confirmed (`rejected`) failure on invitation retry | Attempt and round facts | Workflow records terminal outcome and progression/intent in one transaction |
| Global disable/takeover while a response is prepared | Routing generation and dispatch state | Discard unsubmitted stale draft; reconcile already submitted work as in §4.3 |
| Consent revoked / deletion requested before queued send | Current preferences/deletion and notice validity | Suppress dispatch; immediate consent/deletion effects remain transactional |
| Blob written before SQL references | Tenant/intake object identity and checksum | Reconcile attachment or owner-approved removal; no unbounded orphan loss |
| Blob delete interrupted | Tombstone and durable deletion authorization | Retry byte removal while keeping protected evidence and stable references |

Observability records tenant, request/operation, connection/conversation/message, intake/screening generation, notice/attempt, job identity and safe technical error category as applicable. Redact raw provider envelopes, webhook/API keys, bank details, file bytes, message bodies and human summaries from ordinary technical logs. Access to operational records remains tenant-authorized. Measure intake-to-routing, analysis duration, queue lag, duplicate suppression, UNKNOWN sends and recovery backlog independently.

## 11. Doubles, examples and verification

### INT-DM-12 — Test the contracts independently of live providers

| Double | Scripted behavior | Required assertions |
|---|---|---|
| Messaging provider | Repeat/reorder webhook fixtures with valid, missing, invalid and future-skewed provider send times; `accepted`, each `rejected` code, `unknown` (timeout, broken stream, missing correlation) and late status outcomes | Tenant resolution, direction/authorship, intake dedupe, one retry only after `rejected`, `unknown` recovery without resend, no resend on job redelivery |
| Conversation runtime | Scripted permitted tool calls, repeated calls, interruption and stale generation | Same operation identity on replay, customer projection, actual results, takeover/global-disable suppression |
| Receipt analyzer | Every ScreeningOutcome, malformed response, timeout and reversed completion order | Initial attempt sequence, original send and receipt times, conservative human routing and no financial approval |
| Scheduler/clock | Explicit due work, duplicate delivery, crash before/after commit | Rollback with enqueue, stale-generation no-op, business idempotency and startup reconciliation |
| Private storage | Bounded fixtures, partial upload, unavailable read, checksum conflict and interrupted delete | Authorized access, byte/type limits, recoverable attachment and evidence-retention protection |

Illustrative identities below are synthetic. These JSON examples must conform to the TypeScript contracts in this document.

<!-- contract-example: ToolInputs['createHold'] -->
```json
{
  "slot": {
    "serviceId": "00000000-0000-4000-8000-000000000011",
    "resource": { "mode": "ANY" },
    "startAt": "2026-11-20T13:00:00Z"
  },
  "attendeeName": "Cliente de prueba"
}
```

<!-- contract-example: ToolOutputs['createHold'] -->
```json
{
  "booking": {
    "id": "00000000-0000-4000-8000-000000000021",
    "serviceName": "Servicio de prueba",
    "resourceName": "Recurso de prueba",
    "startAt": "2026-11-20T13:00:00Z",
    "endAt": "2026-11-20T13:30:00Z",
    "status": "HOLD"
  },
  "holdExpiresAt": "2026-11-11T15:10:00Z",
  "confirmationId": "00000000-0000-4000-8000-000000000031",
  "terms": {
    "totalPrice": "8000.00",
    "currency": "ARS",
    "requiredDeposit": "0.00",
    "cancellationPolicy": "Condiciones configuradas del negocio de prueba",
    "reschedulePolicy": "Condiciones configuradas del negocio de prueba"
  },
  "payment": { "kind": "NOT_REQUIRED" }
}
```

This `SendOutcome` example is an interrupted send: the request may have been submitted but its result was lost, so it is `unknown` and goes to status recovery, never to automatic resend.

<!-- contract-example: SendOutcome -->
```json
{
  "kind": "unknown",
  "correlationRef": "00000000-0000-4000-8000-000000000041"
}
```

<!-- contract-example: ScreeningOutcome -->
```json
{
  "kind": "TECHNICAL_FAILURE",
  "failure": { "code": "timeout" }
}
```

The next examples are `getOwnPaymentStatus` outputs and one `submitReceiptEvidence` input, each showing a single situation. First, a correction window:

<!-- contract-example: ToolOutputs['getOwnPaymentStatus'] -->
```json
{
  "bookingId": "00000000-0000-4000-8000-000000000021",
  "initialDeposit": {
    "state": "CORRECTION_WINDOW",
    "amountOwed": "2000.00",
    "correctionDeadline": "2026-11-11T15:25:00Z"
  },
  "supplementalDeposit": null
}
```

An Admin exception shows no payment amount or reason:

<!-- contract-example: ToolOutputs['getOwnPaymentStatus'] -->
```json
{
  "bookingId": "00000000-0000-4000-8000-000000000022",
  "initialDeposit": { "state": "ADMIN_EXCEPTION" },
  "supplementalDeposit": null
}
```

A confirmed booking with a pending supplemental deposit, and a customer reporting an out-of-band transfer for a booking that still awaits its deposit (the agent reads this status, then calls `submitReceiptEvidence` with that `bookingId`):

<!-- contract-example: ToolOutputs['getOwnPaymentStatus'] -->
```json
{
  "bookingId": "00000000-0000-4000-8000-000000000023",
  "initialDeposit": { "state": "MET" },
  "supplementalDeposit": {
    "state": "REQUESTED",
    "amountOwed": "1200.00",
    "instruction": {
      "instructionId": "00000000-0000-4000-8000-000000000051",
      "recipientName": "Negocio de prueba",
      "destination": { "kind": "ALIAS", "value": "negocio.prueba" },
      "amount": "1200.00"
    }
  }
}
```

<!-- contract-example: ToolOutputs['getOwnPaymentStatus'] -->
```json
{
  "bookingId": "00000000-0000-4000-8000-000000000024",
  "initialDeposit": { "state": "AWAITING_EVIDENCE", "amountOwed": "2000.00" },
  "supplementalDeposit": null
}
```

A supplement personnel decided not to collect:

<!-- contract-example: ToolOutputs['getOwnPaymentStatus'] -->
```json
{
  "bookingId": "00000000-0000-4000-8000-000000000023",
  "initialDeposit": { "state": "MET" },
  "supplementalDeposit": { "state": "NOT_COLLECTED" }
}
```

A reported transfer when no booking awaits a deposit goes to personnel review without a booking:

<!-- contract-example: ToolInputs['submitReceiptEvidence'] -->
```json
{
  "evidence": { "kind": "FILE", "messageId": "00000000-0000-4000-8000-000000000061" }
}
```

After a late receipt and a new confirmed HOLD, the retained receipt is relinked to it, and a repeat of the same call returns the same result:

<!-- contract-example: ToolInputs['relinkLateReceipt'] -->
```json
{
  "receiptId": "00000000-0000-4000-8000-000000000062",
  "bookingId": "00000000-0000-4000-8000-000000000025"
}
```

<!-- contract-example: ToolOutputs['relinkLateReceipt'] -->
```json
{
  "receiptId": "00000000-0000-4000-8000-000000000062",
  "bookingId": "00000000-0000-4000-8000-000000000025",
  "disposition": "HUMAN_REVIEW"
}
```

A normalized intake message carries both the validated provider send time and the trusted receipt time. Here the send time is before a 15:10:00 deadline and the message arrives after it:

<!-- contract-example: NormalizedMessage -->
```json
{
  "version": 1,
  "providerInstanceRef": "instancia-de-prueba",
  "providerMessageId": "PRUEBA-0001",
  "senderRef": "5490000000000",
  "direction": "INBOUND",
  "author": "CUSTOMER",
  "providerSentAt": "2026-11-11T15:09:59Z",
  "receivedAt": "2026-11-11T15:10:42Z",
  "content": { "kind": "image", "mediaReference": "media-de-prueba", "declaredMimeType": "image/jpeg" }
}
```

The recorded outcome of such evidence when its booking was released by deadline expiry and the slot was free:

<!-- contract-example: ToolOutputs['submitReceiptEvidence'] -->
```json
{
  "receiptId": "00000000-0000-4000-8000-000000000062",
  "disposition": "REBLOCKED_FOR_REVIEW"
}
```

<!-- contract-example: ScheduledAction -->
```json
{
  "version": 1,
  "tenantId": "00000000-0000-4000-8000-000000000001",
  "kind": "booking.hold-expiry.v1",
  "targetId": "00000000-0000-4000-8000-000000000021",
  "generation": "hold:1",
  "dueAt": "2026-11-11T15:10:00Z",
  "dedupeKey": "00000000-0000-4000-8000-000000000001:booking.hold-expiry.v1:00000000-0000-4000-8000-000000000021:hold:1"
}
```

The following scenarios are requirements for implementation tests. Their presence does not claim executed provider, PostgreSQL or runtime tests.

| ID | Scenario | Expected result |
|---|---|---|
| INT-E01 | Repeat an authenticated incoming event on two connections and across a restart | One stored message/evidence identity per source; no cross-tenant effect |
| INT-E02 | Message claims tenant B or a requester/booking from another conversation | Trusted context wins; foreign record is not found and no data leaks |
| INT-E03 | Evidence sent at 15:09:59, HOLD deadline 15:10:00, graph batching still pending | Correlated intake is visible to expiry; later processing uses the original send time |
| INT-E03a | **Future PostgreSQL test (not run).** Two independent connections: evidence with `providerSentAt` 15:09:59 (deadline 15:10:00) and `receivedAt` 15:10:03, forced pause before the intake commit; the expiry job, due at the deadline plus the 15-second margin (15:10:15), starts afterwards and waits on the booking lock | Interleaving (a): intake commits first; expiry revalidates under lock, sees the protection and does not release; the booking stays protected and the deadline is unchanged; screening proceeds |
| INT-E03b | **Future PostgreSQL test (not run).** Evidence with `providerSentAt` 15:10:05 (after the deadline) and `receivedAt` 15:10:08 (inside the margin), run twice: intake commits before expiry, and expiry commits before intake, with a forced pause on the other connection | Interleaving (b): late in both orders; `LATE_FINANCIAL_HANDLING`, it never protects the HOLD and expiry still releases at 15:10:15; the slot is never reclaimed or revived and no extra evidence attempt is counted; `relinkLateReceipt` is available only after release by expiry with a free slot |
| INT-E03c | **Future PostgreSQL test (not run).** Evidence with `providerSentAt` 15:09:59 whose intake commits after expiry released the booking (forced pause beyond the margin), with the slot free or only browsed by another customer; variants: plausible file, `INCONCLUSIVE`, `TECHNICAL_FAILURE`, and a correction-window timeout instead of HOLD expiry | Interleaving (c): screening runs outside any transaction; the separate decision transaction revalidates under the locks and reactivates the same booking with its original terms into `PENDING_PAYMENT_REVIEW`, audited, with human review and personnel notified (`REBLOCKED_FOR_REVIEW`); no extra time or evidence attempt; the browsing customer's later booking attempt gets `slot_unavailable` |
| INT-E03d | **Future PostgreSQL test (not run).** Timely-sent evidence arrives after the booking was closed by explicit customer cancellation, by business cancellation, or by another terminal cause | No re-block and no reactivation; `LATE_FINANCIAL_HANDLING` for personnel credit/refund; the slot stays as it is |
| INT-E03e | **Future PostgreSQL test (not run).** Timely-sent image after deadline-based release is `CLEARLY_UNRELATED` | `RELEASED_UNRELATED`: not re-blocked, the evidence is retained, the booking stays expired, no extra evidence attempt or time; the customer is told the file does not look like a receipt and the booking expired, with BR-SEN-17 re-booking offered if the slot is available |
| INT-E03f | **Future PostgreSQL test (not run).** Two independent connections race a re-block against claiming an unclaimed exclusive waitlist invitation occupying the released slot; include sent nonexclusive invitations | If re-block wins, it closes the exclusive claim through the owner API before acquiring occupancy in the same transaction, withdraws unclaimed invitations and enqueues notices for after commit; entries retain original priority and obsolete waitlist jobs are no-ops. The losing claim gets `slot_unavailable`. If the invitation claim wins first, its booking is protected and re-block returns `PRIORITY_PERSONNEL_REVIEW` without displacing it |
| INT-E03g | **Future PostgreSQL test (not run).** Another customer's HOLD, `PENDING_PAYMENT_REVIEW` (including protected partial-deposit waiting), or confirmed booking occupies the slot at the decision, including one acquired during screening; also test resource blocks, closures and private residual occupancy | `PRIORITY_PERSONNEL_REVIEW`: the occupying or unavailable state is never displaced or overridden, the original booking stays released and the evidence is retained for priority personnel review |
| INT-E03h | **Future PostgreSQL test (not run).** Authorized text fallback (explicit inability to attach) sent in time and committed after deadline-based release, with variants for a free slot, an unclaimed exclusive invitation claim and other occupying or unavailable states | No screening: the intake transaction applies the re-block conditions directly and routes to human review (`REBLOCKED_FOR_REVIEW`); an unclaimed exclusive invitation claim is withdrawn atomically before re-block; any other occupying or unavailable state gives `PRIORITY_PERSONNEL_REVIEW` |
| INT-E03i | **Future contract test (not run).** Webhook with a missing, unparsable or future-skewed provider send time | `providerSentAt` is absent, timeliness falls back to `receivedAt` with that basis recorded, and no extra time is granted (INT-Q-01) |
| INT-E04 | First unrelated file, then a distinct second one sent on time but analyzed later | Same deadline; second routes to human review; neither is a human payment rejection |
| INT-E05 | Analyzer fails, crashes or exceeds five seconds | Same intake routes conservatively once; no indefinitely unresolved analysis or verified payment |
| INT-E06 | Explicit inability to attach and timely text evidence | Direct human review through the authorized fallback |
| INT-E07 | Evidence sent after the deadline arrives after release (timely-sent evidence follows INT-E03c-g), or a cancelled booking later receives verified money | Financial handling continues; released occupancy and another customer's booking remain intact |
| INT-E08 | A send times out, its stream breaks after submission, or the worker dies before persisting the result (the provider may or may not have accepted it); also a redelivered dispatch job | `unknown`: `recoverStatus`, personnel attention if `unresolved`; no automatic retransmission, no second submission on redelivery and no retry authorized |
| INT-E09 | First and second explicitly `rejected` invitation sends | At most two actual attempts; atomic progression/intent, preserved entry and original priority |
| INT-E10 | Job runs with old booking, reminder, grouping, return or deletion generation | Recheck current state and no-op when obsolete |
| INT-E11 | Failure after owner writes but before transactional enqueue/commit | Complete rollback; a later successful transaction has recoverable work |
| INT-E12 | Tool commits a HOLD, then LangGraph restarts before checkpointing | Same operation returns its recorded effect; no second HOLD |
| INT-E13 | Takeover/global disable races with tool execution and response dispatch | Current authorization rejects stale unsubmitted work; submitted work is tracked under the agreed handoff boundary |
| INT-E14 | Revoke notice consent or confirm deletion while dispatch is queued | Current guards suppress send and immediate effects are preserved |
| INT-E15 | Same asset referenced by a message and a pending/verified payment review | Access is tenant-scoped and protected bytes survive deletion/cleanup races |
| INT-E16 | File exceeds a proposed size/page/pixel limit or has a mismatched signature | Bounded technical failure; unsafe bytes never reach inference or public rendering |
| INT-E17 | PAUSED and RETIRED connections receive messages; native-app echo has unknown authorship | PAUSED persists without AI, RETIRED ignores, ambiguous echoes never become customer commands/human timers |
| INT-E18 | Valid initial-deposit partial funds or a confirmed reschedule supplement faces expiry/rejection | Preserve the domain's manual-resolution/confirmed-booking safeguards |
| INT-E19 | A job is redelivered after business commit, or due work is missing after restart | Existing effect is reused; owner reconciliation restores eligible work |
| INT-E20 | Model supplies forbidden arguments or asks a restricted tool operation | Strict input/allowlist rejection before any business mutation |
| INT-E21 | Customer already recorded refusal or another preference and later confirms/enrolls again | Current RECORDED preference is reused without asking again; an explicit requested change still works |
| INT-E22 | Customer says they already transferred: no booking; one booking with an outstanding expectation (initial `AWAITING_EVIDENCE`, `CORRECTION_WINDOW` or `PARTIAL`; supplemental `REQUESTED`); several; a booking `UNDER_REVIEW` (customer confirms it is the transfer already sent, then says it is a different or unclear one); a candidate with `PERSONNEL_REQUIRED` or an unavailable/unmappable projection; bookings but none outstanding | Normal flow; receipt linked to the one booking after backend revalidation of the binding; the agent asks which (INT-Q-02); for `UNDER_REVIEW` the agent first asks whether it is the transfer already sent: if yes it says it is under review and requests/submits nothing, if different or unclear it requests the receipt and routes it (linked when a valid expectation exists, otherwise as a payment for personnel review); for `PERSONNEL_REQUIRED`/unavailable the agent infers no absence of expectation, says personnel will confirm and routes any receipt to personnel review without `bookingId`; otherwise receipt routed to personnel without a booking. Money is never treated as received, no second payment is requested and the agent never initiates the topic |
| INT-E23 | Status for a booking in a correction window, with an Admin exception, with an unmapped/unavailable source state | `CORRECTION_WINDOW` with deadline and owed amount and no rejection note; `ADMIN_EXCEPTION` never presented as payment; `PERSONNEL_REQUIRED` fallback without guessing |
| INT-E24 | Rescheduled CONFIRMED booking: supplement requested, under review, met, and not collected by personnel | `REQUESTED` with instruction/amount, `UNDER_REVIEW`, `MET`; `NOT_COLLECTED` says nothing more is owed in advance and the rest is paid at the appointment, never "forgiven". Booking stays confirmed in every case |
| INT-E25 | Receipt sent after the deadline of an expired, released booking while the slot is free, then while it is taken | Late evidence retained; booking expired and business reviews the payment; if free, new HOLD on current terms with explicit confirmation and `relinkLateReceipt` moves the receipt to it for human verification (idempotent on a repeat; old booking unchanged; refused for a non-late receipt, another requester/tenant or a non-HOLD target); otherwise late handling, with no revival or reclaim |
| INT-E26 | Model or customer asks the agent to verify, allocate, refund or record a payment, or cites verified-but-unallocated funds | Not exposed as a tool; the projection has no unallocated state for an active booking and nothing mutates financial records |

INT-E03a through INT-E03h are implementation acceptance tests for the PostgreSQL integration suite (two independent connections, forced pause before the intake commit), and INT-E03i is a contract test. They have not been executed and no pass is claimed here.

The live pilot additionally checks actual sender/LID identity, per-instance header delivery, send/status mapping, native human replies, loss of provider responses, model/file compatibility and measured latency. Ordinary contract tests use synthetic data and doubles. PostgreSQL tests cover enqueue rollback, owner locking, sequence races, generations and recovery with separate connections. Cross-module rollback and context tests remain required by CON-01 and REP-03.

## 12. Decisions and remaining gates

All INT-DM decisions are proposed for team review.

| ID | Decision |
|---|---|
| INT-DM-01 | Capability owners and higher composition for cross-owner ingress |
| INT-DM-02 | Backend-injected tenant/requester/control context and portable representations |
| INT-DM-03 | Stable operation, intake, attempt and generation identities across retry/replay |
| INT-DM-04 | Transactional pg-boss enqueue through the Drizzle adapter |
| INT-DM-05 | Versioned Evolution normalization and explicit intake/send/recovery outcomes |
| INT-DM-06 | Durable batching/checkpoints with fresh routing authorization |
| INT-DM-07 | Typed, customer-scoped tools and server-held confirmation references |
| INT-DM-08 | Replaceable Gemini Flash relevance classifier and bounded recovery |
| INT-DM-09 | Private authorized assets with proposed validation limits and recoverable byte operations |
| INT-DM-10 | Versioned state-aware job catalog, bounded retries and due-state reconciliation |
| INT-DM-11 | Correlation and recovery facts for each crash window |
| INT-DM-12 | Scripted doubles and positive/negative acceptance scenarios |

| ID | Remaining decision / verification | Owner / blocks |
|---|---|---|
| INT-Q-01 | Resolved by Product Owner agreement of 2026-11-12 (BR-SEN-16, BR-SEN-18): the timeliness source (validated `providerSentAt`, WhatsApp-assigned and received through the authenticated webhook), the 15-second admission margin as the starting value, and the formerly undecided timely-but-released case (the BR-SEN-18 re-block path). Still open: the inclusive/exclusive boundary at exactly the deadline, given second-level timestamp precision; handling a missing or invalid `providerSentAt` (proposed conservative fallback to `receivedAt`, flagged for confirmation) and the clock-skew tolerance; arrival handling when the first intake commit fails (`503`) and the provider retries; pilot validation of the 15-second margin and of Evolution 2.3.7 timestamp fields and retry/delay behavior under INT-Q-05 | Product/technical review with T-04 and CU-22; blocks receipt intake and expiry implementation only for these remaining points |
| INT-Q-02 | Ambiguous unquoted evidence with several outstanding booking expectations, including its effect at a deadline | Product and payments/messaging maintainers; ambiguous-evidence path |
| INT-Q-03 | Dispatch reservation, takeover acknowledgement and treatment of an already submitted reply | Messaging maintainers and pilot, preserving INV-MSG-04; concurrent handoff/send implementation |
| INT-Q-04 | Exact physical metadata/constraints for intake protection (including provider send time, receipt time and timeliness basis), booking closure cause and reactivation audit, operation dedupe, screening generations, dispatch states, confirmation and batch leases | T-04/T-05, API-Q-06 and affected owners; corresponding adapters/workers |
| INT-Q-05 | Verify Evolution 2.3.7 sender/LID variants, status mapping, recovery limits, custom headers and image digest, plus the message send-timestamp field (semantics, precision and clock skew) and webhook delivery delay/retry behavior; qualify any version change | T-04 pilot; enabling each real provider path |
| INT-Q-06 | Private storage implementation/location, provider-account data handling and approved retention/cleanup for external copies | Deployment/Product/legal under P-32; real personal-data processing |
| INT-Q-07 | Reconcile this proposal with PR #33, including tool projections/errors, composed ingress, API-Q-11 screening display, API-Q-12 unlinked uploads, any new shared refusal, the landing location/WhatsApp-link sources, allocation on human verification (closing API-Q-13 and removing `AWAITING_ALLOCATION` from active-booking deposit states); the proposed non-collected supplemental-deposit state, named `NOT_COLLECTED` here, with its payments-permission decision and optional reason; the `CORRECTION_WINDOW`/`ADMIN_EXCEPTION`/`PERSONNEL_REQUIRED` customer projections and the separate initial/supplemental `getOwnPaymentStatus` shape, including `rescheduleOwnBooking.supplementalDeposit` replacing `additionalDeposit`; an optional `bookingId` in `submitReceiptEvidence` for a reported transfer with no booking awaiting a deposit (a payment review without a booking), with the `REBLOCKED_FOR_REVIEW`, `PRIORITY_PERSONNEL_REVIEW` and `RELEASED_UNRELATED` dispositions (replacing the earlier `TIMELY_RELEASED_REVIEW` proposal), the BR-SEN-18 reactivation of a deadline-expired booking into `PENDING_PAYMENT_REVIEW` with its closure cause and audit, the priority personnel-review queue and notifications, withdrawal of unclaimed waitlist invitations, `slot_unavailable` for competing attempts, and evidence timeliness judged by the provider send time rather than arrival; and the proposed `relinkLateReceipt` operation (name, refusal codes, `workflows` coordination) that relinks a retained late receipt to a new HOLD under BR-SEN-17; then repin the CON-02 references to its final revision | CON-02/CON-03 team review; incompatible contract implementation |
| Existing P-40 | Counter continuation across later human-review/correction rounds | Product; later-round unrelated-file counting |
| Existing T-01–T-05 / TEN-Q | Occupancy, money, actors, consent, schema and provider gates remain in their sources | Existing owners; affected implementations |

These gates do not authorize silent product defaults. The current implementation remains the [workspace and core persistence described in ARCHITECTURE.md](../../ARCHITECTURE.md). The parent issue requires human review and integration; this proposal is not evidence of runtime delivery.

## 13. Provider evidence

Primary sources inspected on 2026-11-11. Versioned repository references are used where available. Documentation may evolve independently of the installed pilot.

| Source | What it establishes | Still needs implementation/pilot evidence |
|---|---|---|
| [Evolution 2.3.7 release](https://github.com/evolution-foundation/evolution-api/releases/tag/2.3.7), [webhook controller](https://github.com/evolution-foundation/evolution-api/blob/2.3.7/src/api/integrations/event/webhook/webhook.controller.ts), [events documentation](https://docs.evolutionfoundation.com.br/en/evolution-api/configuration/webhooks) | Instance-specific headers, event envelopes and webhook configuration | Deployment authentication, real payload variants, identity/authorship and delivery/recovery behavior |
| [Evolution send route](https://github.com/evolution-foundation/evolution-api/blob/2.3.7/src/api/routes/sendMessage.router.ts), [DTO](https://github.com/evolution-foundation/evolution-api/blob/2.3.7/src/api/dto/sendMessage.dto.ts) | Versioned text-send boundary | Acceptance/status mapping and uncertain-result correlation |
| [pg-boss 12.38.2 adapters](https://github.com/timgit/pg-boss/blob/12.38.2/docs/api/adapters.md), [job API](https://github.com/timgit/pg-boss/blob/12.38.2/docs/api/jobs.md) | Transaction-bound Drizzle enqueue, deferred jobs and retry/uniqueness options | Actual Drizzle/node-postgres/PostgreSQL combination, rollback and redelivery tests |
| [LangGraph checkpointers](https://docs.langchain.com/oss/javascript/langgraph/checkpointers), [graph replay](https://docs.langchain.com/oss/javascript/langgraph/graph-api#re-execution-and-idempotency) | Thread-scoped persistence and possible node/side-effect re-execution | Selected package versions, durable checkpoint adapter, lease/replay behavior and retention |
| [Gemini 3.8 Flash](https://aistudio.google.com/docs/models/gemini-3.8-flash), [structured output](https://ai.google.dev/gemini-api/docs/structured-output), [PDF input](https://ai.google.dev/gemini-api/docs/document-processing) | Stable model ID, image/PDF input and structured JSON capability | Receipt relevance quality, semantic handling, account eligibility, timeout and measured latency |

## 14. Acceptance traceability

| CON-03 #12 criterion | Coverage |
|---|---|
| MVP integrations and owners identified | §1, §4–§9 |
| Issued instructions/evidence separated from manual verification/allocation | §6, §7 and canonical BR-SEN/BR-COB references |
| Screening port, initial attempts/escalation, Gemini direction and latency objective | §7, INT-DM-08; later-round boundary retained as P-40 |
| Timeliness, duplicates, technical uncertainty and preserved HOLD deadline | §3, §4.2 (serialization with expiry), §7.1, INT-E03/E03a-E03i (BR-SEN-18 re-block in §4.2 and §7.1), INT-E04-07 |
| Messaging/media, lifecycle, human control and send correlation | §4, §5, §8, INT-E08/13/17 |
| Durable work, recovery, invitation failures and current-state rechecks | §3, §9, §10, INT-E09–12/19 |
| Allowed/prohibited tools and authorized context | §2, §6 (payment projections, reported transfers, late receipts), INT-E02/20/22-26 |
| Private storage, limits and retention responsibilities | §8, INT-E15/16; API-Q-12 and P-32 retained |
| Simulations and representative failure/retry examples | §11 |
| Consistency with CON-01/02 and explicit pending provider/legal questions | §1, §12, §13; PR #33 remains a pinned proposal |
| Team review and approval | Pending, followed by implementation increments and their acceptance tests |
