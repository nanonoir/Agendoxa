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
| Screening | Tenant, incoming message/evidence identity and screening generation | Apply one result; preserve original receipt time and attempt identity |
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
  providerOccurredAt?: Instant;
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

`receivedAt` is assigned once by the trusted ingress clock, preserved across provider retries and persisted with the intake. Keep provider timestamps separately for display/correlation. Their validation and the exact deadline boundary are INT-Q-01. A `fromMe` flag identifies an outgoing direction, not whether a person or this bot authored it. Match known outbound references first. Unknown outgoing echoes cannot reset the human timer or become a customer command.

| HTTP response | Meaning |
|---|---|
| `200` | Required intake state and follow-up are committed, or an authenticated event was deliberately ignored/deduplicated |
| `400` / `413` | Invalid envelope / configured envelope-size limit exceeded |
| `401` | Instance authentication failed or does not resolve a permitted connection |
| `503` | Required persistence could not commit; no successful acknowledgement |

For ACTIVE connections, accept customer messages for the appropriate processing path. For PAUSED connections, persist inbox messages and prohibit automatic replies/notices. RETIRED connections are ignored after authenticating the old instance. Secret rotation must retain an explicitly bounded old-key overlap or drain the old webhook first. Never route by a customer's text, a display name or an unvalidated alternative sender ID. LID/phone mapping and native-app authorship need recorded pilot fixtures before enabling those paths.

### 4.2 Intake and evidence at the deadline

Ordinary conversation processing waits for the five-second batch window. Evidence protection must already be visible to expiry workers before that wait. The composite intake workflow persists the normalized message and, for an unambiguously bound receipt candidate, its trusted booking/evidence context, original receipt time, pending-analysis state, screening deadline and durable screening/recovery actions in the same transaction. It acknowledges only after that commit. Bytes are downloaded afterwards through the trusted media adapter.

The binding comes from the backend-issued payment-instruction context, a validated reply to that instruction, or the single eligible outstanding evidence expectation for that sender. The core creates the expectation when issuing instructions. It does not come from a model-selected booking ID. Multiple possible expectations require explicit selection; INT-Q-02 gates the policy for those ambiguous arrivals at the deadline.

Proposed representation is intake/screening metadata associated with the existing `Message` and its issued-instruction correlation. `messaging` owns that row; `payments` defines the evidence meaning and the workflow coordinates updates through public APIs, following MOD-DM-06. These are proposed logical fields, absent from today's schema. T-04/T-05 must approve their exact binding and indexes before implementing receipt intake. Creating a human `PaymentReview` is reserved for the routing outcomes defined in UC-03.

An expiry workflow can inspect this correlated pending state through owner queries inside its transaction. A provider call, a delayed graph run or a failed queue acknowledgement cannot hide a timely admitted receipt. While PAUSED or under human control, eligible evidence is routed to human review through the workflow, without invoking the conversational agent. The same original receipt/deadline safeguards apply.

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

type SendOutcome =
  | { kind: 'accepted'; providerMessageId: string }
  | { kind: 'failed'; failure: IntegrationFailure }
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

After provider acceptance, store its message reference and correlate later status events. An older ACCEPTED event cannot downgrade READ/DELIVERED. Contradictory or unmapped statuses require reconciliation. `NotificationAttempt` maps provider acceptance to its existing SENT outcome and retains delivery/read updates. HTTP success proves acceptance only. Timeouts, broken connections after submission and process death before result persistence are UNKNOWN unless provider evidence establishes a definitive outcome.

A confirmed failed notification permits one still-valid new attempt, retaining the logical notice. UNKNOWN invokes `recoverStatus`; if the provider cannot establish the result, show personnel attention and do not automatically resend. Never enable a generic HTTP retry around an uncertain send. The adapter's recovery method may legitimately return `unresolved`; no provider idempotency header or lookup-by-client-key support is assumed. The versioned send route and DTO use `/message/sendText/{instance}` with `text` and `number` inside the provider adapter. [Send route](https://github.com/evolution-foundation/evolution-api/blob/2.3.7/src/api/routes/sendMessage.router.ts) · [Send DTO](https://github.com/evolution-foundation/evolution-api/blob/2.3.7/src/api/dto/sendMessage.dto.ts)

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
  submitReceiptEvidence: { bookingId: UUID; evidence: EvidenceSelection };
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
  rescheduleOwnBooking: { booking: CustomerBooking; terms: BookingTerms; additionalDeposit?: PaymentInstruction };
  joinWaitlist: { entryId: UUID; enrolled: true };
  claimInvitation: AcquiredHold;
  leaveWaitlist: { entryId: UUID; closed: true };
  getOwnPaymentStatus: { bookingId: UUID; state: 'AWAITING_EVIDENCE' | 'UNDER_REVIEW' | 'PARTIAL' | 'SATISFIED' | 'PERSONNEL_REQUIRED'; missingAmount: Money };
  getOwnNoticePreferences: { state: 'UNRECORDED' }
    | { state: 'RECORDED'; reminders: boolean; waitlist: boolean };
  submitReceiptEvidence: { receiptId: UUID; disposition: 'SCREENING_PENDING' | 'REPLACEMENT_REQUIRED' | 'HUMAN_REVIEW' | 'LATE_FINANCIAL_HANDLING' };
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
| Information and services | Read composition above `tenants` and `catalog` | Deliberately public fields; location/source of WhatsApp link remain CON-02 questions |
| Free slots and own bookings | `bookings` queries | Same tenant, current catalog, requester-owned future records; `not_found`, `range_too_large`, `inactive_service` |
| HOLD and no-deposit confirmation | `workflows` | Recheck restrictions, policy, limits and occupancy; confirm explicit current terms while valid; `slot_unavailable`, `state_changed`, slot/policy refusal reasons |
| Preparation and own cancellation/rescheduling | `workflows` | Requester ownership, current confirmation and any accepted late consequence; `not_found`, `late_change_requires_acceptance`, `reschedule_limit_reached`, `state_changed` |
| Own waitlist reads, enrollment/withdrawal and invitation claim | `bookings` queries/commands / `workflows` for cross-owner changes | Current requester-owned active entries and valid invitations; specific voluntary interest, preference, queue cap and opportunity; `waitlist_full`, `invitation_no_longer_available`, `requester_not_eligible`, `slot_unavailable` |
| Payment status | Read composition over `bookings` and `payments` | Only required/missing amount and customer-facing condition; `not_found` |
| Evidence | Protected workflow | Same-source message and evidence context, original receipt/deadline, fallback authorization; `not_found`, `unsupported_media_type`, `file_too_large`; late evidence is retained |
| Preference reads | `customers` | Distinguish an unrecorded choice from recorded refusal; read current requester preferences before the first-confirmation/enrollment question |
| Preference changes and deletion | `workflows` | Explicit answer from this requester, scoped audit and immediate effects; `state_changed` |
| Escalation | `messaging` public command | Same conversation, bounded summary and routing update |

The table reuses [CON-02 §10](https://github.com/nanonoir/Agendoxa/blob/d2b7d77769738b118b09241808bfd1edc50cfbcf/docs/design-docs/api-contracts.md#10-internal-consumers-the-agent). Preserve the full applicable slot-policy reasons there. `requester_not_eligible` conceals internal restriction labels. Financial status is an explicit customer projection; reviewer identity, internal rejection reasons, cash state and restriction indicators are absent. Its enum is a proposed tool contract, separate from the CRM's proposed `depositState` representation.

`findFreeSlots` computes a price and compatible concrete choices in the core. `createHold` rechecks and applies the tenant's any-resource assignment mode. The backend computes duration, end, price, deposit and receiving instructions. AcquiredHold returns the actual acquired terms, including the authoritative price, currency, required deposit and configured cancellation/reschedule policy summaries. The core persists the relevant snapshots and supplies these summaries; the agent cannot reconstruct them from an older search. The same contract covers an invitation winner. The `confirmationId` in a HOLD is valid for no-deposit confirmation only when the core says that path is allowed.

NOT_REQUIRED corresponds to zero required deposit. INSTRUCTIONS_ISSUED contains the persisted receiving instruction for this acquired booking, with the amount/currency checked against its terms before presentation. PERSONNEL_REQUIRED represents a missing usable collection destination requiring the already specified human handling. The agent requests a transfer only for INSTRUCTIONS_ISSUED and communicates the complete acquired terms before doing so. Retries reuse that instruction and its recipient. Reschedule results likewise return the acquired new terms rather than an earlier quote.

`prepareCustomerAction` obtains the canonical summary and confirmation reference from the public workflow before asking the customer. It prepares only the permitted customer actions listed in the union, without changing business state or acquiring occupancy. The confirmation becomes executable only after the backend records an explicit matching customer response. Cancellation and rescheduling need a fresh confirmation bound to the displayed conditions. `lateAcceptanceId` references the recorded acceptance of the displayed consequence, never an Admin exception. A failed move preserves the original booking; later supplemental collection retains the domain's confirmed-booking safeguard. Waitlist withdrawal implements the already specified customer-requested closure in BR-WL-12/15. The preparation/withdrawal names are proposed additions to CON-02's operation catalog, covered by INT-Q-07.

For REPORT_INABILITY_TO_ATTACH, `sourceMessageId` must resolve to the customer's actual explicit inability statement or answer in the same conversation. The backend's recorded-response step binds it to that action; its confirmation reference is the `inabilityConfirmationId` used by text evidence. An already recorded explicit statement can satisfy this step without another image request. Merely selecting the action in a model call leaves the reference unusable until that source response is verified. `getOwnNoticePreferences` returns RECORDED even for both values false, so refusal is reused and the optional combined question is not repeated. An explicit customer request to change a recorded preference can still prepare NOTICE_PREFERENCES.

`listOwnWaitlistEntries` supplies current entry IDs for later withdrawal and valid notified-invitation IDs for a claim. It returns only active interests and current claimable opportunities of this requester. The runtime therefore can resolve a later request from authoritative state rather than relying on an old LLM transcript. The query is proposed supporting coverage of the existing waitlist operations and joins the catalog reconciliation in INT-Q-07.

`submitReceiptEvidence` resolves the stored message under context and crosschecks its trusted evidence binding. A matching model-supplied `bookingId` alone cannot move a file to another booking. A technical duplicate returns the receipt's current disposition. A released booking produces retained `LATE_FINANCIAL_HANDLING`, not a renewed slot. The proposed CON-02 `booking_released` refusal must preserve that same retained-evidence side effect when mapped to a refusal.

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

The workflow first records pending intake and its recovery deadline as in §4.2. The agent worker prepares a still-current screening generation through the workflow facade, receives authorized ephemeral bytes, calls the analyzer outside a transaction, then supplies its trusted result to a protected workflow. No provider or storage network request runs inside a database transaction; the prepare facade revalidates its state after reading bytes. A client or LLM cannot directly call the result-application boundary. The final transaction serializes the evidence sequence, deduplicates, rechecks booking/start/funds/deadlines and applies UC-03 BR-SEN-14–16.

| Timely intake result | Applied effect |
|---|---|
| PLAUSIBLE_RECEIPT | Create/route human review and maintain the prescribed occupancy protection |
| First distinct CLEARLY_UNRELATED in the agreed initial sequence | Request replacement using the original deadline; no human rejection is counted |
| Second distinct CLEARLY_UNRELATED in that sequence | Explain the failed attempts and route to human review without inactivity expiry |
| INCONCLUSIVE / TECHNICAL_FAILURE | Preserve evidence and route to human review |
| Duplicate or stale screening generation | Reuse current result or no-op; no extra attempt, review or deadline |
| Authorized text fallback | Route directly to human review |
| Late evidence / booking already released | Retain for financial handling, preserving the released slot |

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
| `booking.hold-expiry.v1` | `workflows` / `bookings`, with `payments` and intake queries | Current original HOLD deadline, generation, timely correlated intake/screening/review, funds, start and occupancy |
| `booking.correction-expiry.v1` | `workflows` / `bookings`, with `payments` | Current correction deadline, distinct human-rejection sequence, timely intake/review, partial funds, start and supplemental safeguard |
| Priority/progression/entry-expiry | `bookings` | Current round/generation, original priority schedule, eligibility/range/start; priority expiry preserves otherwise valid late invitations |
| Capacity reevaluation | `bookings`, initiated by release or a catalog workflow | Actual resource/range availability after removal of a block or release, even without an earlier booking/round; exclude private remainders |
| Notification dispatch/status recovery | `notifications` / `messaging` transport | Current kind-specific audience, consent, lifecycle, slot and validity; confirmed failure vs unknown outcome |
| Invitation dispatch | `workflows` / `notifications` and `bookings` | Persist outcome plus second-confirmed-failure advancement or its durable intent together; no priority extension or entry removal |
| Group / batch-ready | `messaging` producer; `agent` consumes batch-ready | Latest message generation and five-second quiet window; original unprocessed IDs; live run/routing authorization |
| AI return | `messaging` | Last genuine human reply plus 60 minutes, control generation, lifecycle and global AI state |
| Screening | `agent` / workflow-managed evidence state | Same intake/generation, authorized asset and remaining analysis budget |
| Screening timeout | `workflows` / evidence participants | Current pending generation at cutoff; commit technical-failure routing without Gemini |
| Customer deletion execution | `workflows` / owning participants | Request still active and due, no withdrawal, current financial/review retention and immediate access restrictions |
| Asset deletion execution | `assets`, with owner authorization | Current tombstone/authorization and all protected references |

Proposed infrastructure policy for safe, idempotent database-only handlers is five retries with exponential backoff from one second, capped at 30 seconds, then visible failed work plus periodic owner reconciliation. These are technical retry settings, not additional business time. Handler runtime is bounded. Queue defaults cannot delete the only recoverable business intention. Due-state reconciliation runs on startup and every 60 seconds as an initial operational proposal, with capacity measurement before production.

External-send jobs override blind infrastructure retries. Once a dispatch is admitted, worker failure enters status recovery using the existing attempt. It must not submit another provider request because a queue redelivered it. The business's single confirmed-failure retry creates the second actual attempt. A delayed valid action runs after current-state rechecks; an expired opportunity is suppressed. Screening timeout/recovery preserves its original cutoff and routes conservatively.

## 10. Correlation and failure matrix

### INT-DM-11 — Persist the fact needed to recover each crash window

The following are logical responsibilities for implementation under the existing owners. Physical markers, unique indexes and idempotency storage must be approved before the corresponding adapter/worker is enabled. No custom Job entity or mandatory outbox is introduced by these contracts.

| Window / duplicate | Durable correlation | Recovery / observable result |
|---|---|---|
| Webhook repeated before/after acknowledgement | Stored source identity and intake result | One Message, same evidence identity and one logical set of follow-ups |
| Message commit before graph processing | Persisted unprocessed IDs, batching generation and batch-ready work | Resume the batch without losing messages or admitting duplicate mutations |
| Timely receipt at HOLD expiry | Correlated pending intake committed under the shared protocol | Expiry sees protection before media/model processing; original deadline remains |
| Screening response lost or worker crashes | Intake generation and analysis cutoff | Timeout workflow creates the appropriate human route once; late result is stale |
| Business mutation commits before graph checkpoint | Operation identity, fingerprint and result committed with business state | Replayed tool returns the original effect and reads its current condition |
| Enqueue fails inside business transaction | Same database transaction | Both writes roll back; retry the whole operation |
| Worker commit before queue acknowledgement | Authoritative state/generation and effect identity | Redelivery observes completion and causes no second effect |
| Send accepted, result not persisted | Persisted DISPATCHING attempt and available provider correlation | UNKNOWN, recover status or alert personnel; no automatic resend |
| Confirmed failure on invitation retry | Attempt and round facts | Workflow records terminal outcome and progression/intent in one transaction |
| Global disable/takeover while a response is prepared | Routing generation and dispatch state | Discard unsubmitted stale draft; reconcile already submitted work as in §4.3 |
| Consent revoked / deletion requested before queued send | Current preferences/deletion and notice validity | Suppress dispatch; immediate consent/deletion effects remain transactional |
| Blob written before SQL references | Tenant/intake object identity and checksum | Reconcile attachment or owner-approved removal; no unbounded orphan loss |
| Blob delete interrupted | Tombstone and durable deletion authorization | Retry byte removal while keeping protected evidence and stable references |

Observability records tenant, request/operation, connection/conversation/message, intake/screening generation, notice/attempt, job identity and safe technical error category as applicable. Redact raw provider envelopes, webhook/API keys, bank details, file bytes, message bodies and human summaries from ordinary technical logs. Access to operational records remains tenant-authorized. Measure intake-to-routing, analysis duration, queue lag, duplicate suppression, UNKNOWN sends and recovery backlog independently.

## 11. Doubles, examples and verification

### INT-DM-12 — Test the contracts independently of live providers

| Double | Scripted behavior | Required assertions |
|---|---|---|
| Messaging provider | Repeat/reorder webhook fixtures; accepted, failed, timed-out and late status outcomes | Tenant resolution, direction/authorship, intake dedupe, one confirmed-failure retry, UNKNOWN recovery |
| Conversation runtime | Scripted permitted tool calls, repeated calls, interruption and stale generation | Same operation identity on replay, customer projection, actual results, takeover/global-disable suppression |
| Receipt analyzer | Every ScreeningOutcome, malformed response, timeout and reversed completion order | Initial attempt sequence, original receipt time, conservative human routing and no financial approval |
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
| INT-E03 | Receipt at 15:09:59, HOLD deadline 15:10:00, graph batching still pending | Correlated intake is visible to expiry; later processing uses original receipt time |
| INT-E04 | First unrelated file, then a distinct second one received on time but analyzed later | Same deadline; second routes to human review; neither is a human payment rejection |
| INT-E05 | Analyzer fails, crashes or exceeds five seconds | Same intake routes conservatively once; no indefinitely unresolved analysis or verified payment |
| INT-E06 | Explicit inability to attach and timely text evidence | Direct human review through the authorized fallback |
| INT-E07 | Evidence arrives after release, or a cancelled booking later receives verified money | Financial handling continues; released occupancy and another customer's booking remain intact |
| INT-E08 | Provider accepts a send, then the client/worker loses the result | UNKNOWN with recovery or personnel attention, no automatic retransmission |
| INT-E09 | First and second confirmed invitation-send failures | At most two actual attempts; atomic progression/intent, preserved entry and original priority |
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
| INT-Q-01 | Trust policy for provider timestamps and the exact inclusive/exclusive receipt/deadline boundary, under retries and transport delay | Product/technical review with T-04 and CU-22; receipt/expiry implementation |
| INT-Q-02 | Ambiguous unquoted evidence with several outstanding booking expectations, including its effect at a deadline | Product and payments/messaging maintainers; ambiguous-evidence path |
| INT-Q-03 | Dispatch reservation, takeover acknowledgement and treatment of an already submitted reply | Messaging maintainers and pilot, preserving INV-MSG-04; concurrent handoff/send implementation |
| INT-Q-04 | Exact physical metadata/constraints for intake protection, operation dedupe, screening generations, dispatch states, confirmation and batch leases | T-04/T-05, API-Q-06 and affected owners; corresponding adapters/workers |
| INT-Q-05 | Verify Evolution 2.3.7 sender/LID variants, status mapping, recovery limits, custom headers and image digest; qualify any version change | T-04 pilot; enabling each real provider path |
| INT-Q-06 | Private storage implementation/location, provider-account data handling and approved retention/cleanup for external copies | Deployment/Product/legal under P-32; real personal-data processing |
| INT-Q-07 | Reconcile this proposal with PR #33, including tool projections/errors, composed ingress, API-Q-11 screening display, API-Q-12 unlinked uploads and any new shared refusal | CON-02/CON-03 team review; incompatible contract implementation |
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
| Timeliness, duplicates, technical uncertainty and preserved HOLD deadline | §3, §4.2, §7.1, INT-E03–07 |
| Messaging/media, lifecycle, human control and send correlation | §4, §5, §8, INT-E08/13/17 |
| Durable work, recovery, invitation failures and current-state rechecks | §3, §9, §10, INT-E09–12/19 |
| Allowed/prohibited tools and authorized context | §2, §6, INT-E02/20 |
| Private storage, limits and retention responsibilities | §8, INT-E15/16; API-Q-12 and P-32 retained |
| Simulations and representative failure/retry examples | §11 |
| Consistency with CON-01/02 and explicit pending provider/legal questions | §1, §12, §13; PR #33 remains a pinned proposal |
| Team review and approval | Pending, followed by implementation increments and their acceptance tests |
