# Product specifications

This catalog points to the behavioral references and their declared status. No requirements are inferred from the starter implementation.

| Reference | Functional responsibility | Declared status |
|---|---|---|
| [MVP definition](mvp.md) | Product scope, exclusions, delivery stages, acceptance criteria, risks, and open questions | Proposed consolidated MVP definition for team review, v0.2 |
| [UC-01 actors and catalog](uc-01/actors.md) | Actors, channels, permissions, and CU-01 through CU-16 catalog | In Review; contains an explicitly labeled Confirmed Decisions section |
| [UC-01 functional flows](uc-01/flows.md) | Main scenarios, exceptions, shared rules, diagrams, and deferred decisions | In review; not final persistence/API/UI contracts |

Use these documents according to their stated status; the catalog does not approve proposals or resolve open decisions. The flow file retains explicit anchors, for example [CU-01](uc-01/flows.md#cu-01). The working application is much smaller: see [current architecture](../../ARCHITECTURE.md).

`rules.md` and `architecture-bootcamp.md` are mentioned in existing text but are not present. No missing content or historical decisions have been reconstructed. The consolidated MVP and architecture proposal discuss supersession; that does not change their review status or resolve deferred questions.

Technical proposals belong in the [design catalog](../design-docs/index.md), not a second behavioral source. Add future product specifications here with their scope and status; retain one authoritative home for each requirement.
