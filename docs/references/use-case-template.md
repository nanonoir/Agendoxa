# Agendoxa — Use Case Documentation Template

> **Purpose:** A reusable reference for documenting any `UC-XX` analysis task and its functional use cases, without imposing the entire Spec Kit workflow.
>
> **Usage:** Adapt only the sections relevant to the task. Text inside `[square brackets]` is an instruction to fill in, not final content. **Do not create additional files unless the task explicitly requests them.**

## 1. Shared Conventions

- **`UC-XX`:** Identifier of a project *analysis task* (for example, UC-01: identify actors and flows).
- **`CU-XX`:** Stable identifier of a *functional use case* identified in the documentation (for example, CU-02: create a booking without a deposit). Do not confuse `UC` with `CU`.
- Each use case must describe **an observable actor goal** and its outcome. Name it with a **verb + object**.
- Document **what happens and who can do it**, not how it will be implemented (no SQL tables, endpoints, classes, prompts, or detailed screens unless explicitly requested).
- State **confirmed rules** unambiguously; visibly label any **assumptions or pending decisions**. Do not invent policies.
- Maintain **one primary definition per concept** and reference it using relative links. Avoid copying the same flow across multiple files.
- Mermaid diagrams are **supplementary to the text**. When a diagram is included, it must reflect the same conditions, alternatives, and outcomes as the written description.
- Use consistent terminology (actor, requester, attendee, `tenant`, `HOLD`, etc.) and always apply relevant authorization and isolation constraints.

---

## 2. `UC-XX` Task Header

Use this block at the beginning of the task's main documentation or each deliverable, adapting it to its purpose.

```md
# UC-XX — [Analysis Title]

> **Status:** Draft | In Review | Approved
> **Objective:** [One or two sentences: what needs to be clarified]
> **Scope:** [What is included]
> **Out of scope:** [What this task does not decide]
> **References:** [Relative links to relevant sources]

## Confirmed Decisions
- [Important decision expressed unambiguously]

## Open Questions
- [Unresolved question; state who or which stage will resolve it, if known]
```

**Rule:** Do not mark a task as "Approved" if decisions necessary to understand the documented use cases remain unresolved. Distinguish downstream design questions from actual blockers to the current task.

---

## 3. Actors and Authorization Template (`actors.md`, when applicable)

### 3.1 Actor Catalog

| ID | Actor | Goal | Channel / identification | Responsibilities and limits |
|---|---|---|---|---|
| ACT-01 | [Name] | [What they want to achieve] | [How they participate] | [What they can and cannot do] |

**Classify explicitly when relevant:**

- **Human actor:** A person who initiates, authorizes, or performs actions.
- **External system:** A third-party provider or system that exchanges information; specify what it validates and what it *does not* decide.
- **Internal automated component:** An agent or process that assists with operations but must not gain extra permissions merely because it automates a task.
- **Resource:** A bookable or manageable object; do not confuse it with a human actor.

### 3.2 Permissions Matrix

| Action / capability | [Actor A] | [Actor B] | [Actor C] | Relevant constraint |
|---|:---:|:---:|:---:|---|
| [Action] | Yes | Cond. | No | [Condition or authorization] |

**Legend:** `Yes` = permitted within the actor's context; `Cond.` = subject to a policy or special permission; `No` = not authorized.

### 3.3 Use Case Catalog and Index

| Use case | Observable goal | Primary actor | Channel | Details |
|---|---|---|---|---|
| CU-01 | [Verb + object] | [Actor] | [Channel] | [Relative link to the use case in flows.md] |

**Avoid:** Describing every step of each use case here. The sequence belongs in the flows document.

---

## 4. Functional Use Case Template (`flows.md`, when applicable)

Repeat **one entry per `CU-XX`**. Related variants may share diagrams, provided each use case remains individually accessible by its identifier.

```md
## CU-XX — [Verb + goal]

- **Primary actor:** [Who initiates the interaction or seeks the outcome]
- **Participants:** [Other actors or systems involved]
- **Channel:** [CRM / WhatsApp / other]
- **Trigger:** [What starts the use case]
- **Preconditions:** [Only the conditions required to begin]

### Main Flow
1. [Observable actor action]
2. [System response or validation]
3. [Decision, confirmation, or next action]
4. [Successful outcome]

### Alternatives and Exceptions
- **A1 — [Name]:** At step [N], if [condition], [what happens and whether the flow ends or resumes].
- **A2 — [Name]:** At step [N], if [condition], [what happens and whether the flow ends or resumes].

### Outcome / Postconditions
- **Success:** [Observable state and affected data or resource]
- **Failure:** [What remains unchanged, what is released, or what is communicated]

### Rules and Authorization
- [Concrete rule that constrains or conditions this use case]
- [Who is authorized and within what context]

### Verifiable Scenario (optional, when it clarifies a risk)
- **Given** [context], **when** [action], **then** [observable outcome].

### Diagram (optional)
[Brief Mermaid diagram or link to a shared diagram]

### Use-Case-Specific Open Questions (only if any)
- [Unresolved issue, without presenting it as an approved decision]
```

### How to Use Mermaid

- Prefer `flowchart` for decisions/alternatives and `sequenceDiagram` when the order of interactions between actors/systems adds value.
- Use **one diagram per meaningful flow**; do not draw trivial sequences just to fill in the template.
- Label decisions and branches (`Yes/No`, `Approved/Rejected`, etc.). Include error outcomes that change the result.
- Avoid duplicating shared logic across diagrams: link to the primary use case where appropriate.
- Verify that the diagram renders on GitHub and **does not contradict** the written steps.

---

## 5. Quality Checklist Before Approving a `UC-XX`

- [ ] Actors are identified, with understandable responsibilities and boundaries.
- [ ] Each use case has an **ID, goal, primary actor, and channel**.
- [ ] Each use case describes its **trigger, preconditions, main flow, and outcome**.
- [ ] Relevant alternatives explain when they occur and what changes.
- [ ] Applicable permissions and authorization rules are explicit.
- [ ] Important business variants are covered without duplicating rules.
- [ ] Diagrams are included **when useful** and agree with the written descriptions.
- [ ] Cross-file references work through relative links.
- [ ] Open questions are separated from approved decisions.
- [ ] No technical detail or functionality outside the task's scope has been added.

## 6. Applying This Template to Agendoxa — UC-01

For **UC-01: Identify Main Actors and Flows**, the only deliverables remain:

- **`docs/product-specs/uc-01/actors.md`:** Actor catalog, external systems, responsibilities, channels, permissions, and use case catalog.
- **`docs/product-specs/uc-01/flows.md`:** Concise use case entries, main alternatives, and useful Mermaid diagrams.

This template **does not require** creating a separate document for each use case or rewriting documents belonging to other tasks. For future `UC-XX` tasks, select only the sections relevant to their agreed deliverables.
