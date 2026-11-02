# ExecPlan conventions

ExecPlans preserve the context, progress, and outcome of multi-step implementation work. No existing ExecPlans were found at initialization; do not create retrospective plans merely to populate the directories.

## Location and lifecycle

- Create active plans in [exec-plans/active/](exec-plans/active/) with a descriptive kebab-case `.md` filename.
- Update the plan as work progresses, including actual validation results and unresolved blockers.
- Append the final implementation outcome before moving the same file to [exec-plans/completed/](exec-plans/completed/). Do not create a separate outcome document or mark blocked work complete.
- Keep concrete unresolved technical debt in the [debt tracker](exec-plans/tech-debt-tracker.md), not a speculative feature backlog.

## Minimum content

| Section | Record |
|---|---|
| Objective | Intended outcome and observable completion criteria |
| Context | Relevant entry points, current state, and links to specifications/designs |
| Scope | Included work, exclusions, dependencies, and unresolved decisions |
| Execution plan | Ordered, concrete implementation steps |
| Progress | Completed and pending steps; update while executing |
| Decisions | Relevant resolved decisions and rationale; link durable technical decisions in the design catalog; distinguish pending questions |
| Validation | Focused commands/checks, actual results, and anything not checked with the reason |
| Final implementation outcome | Delivered behavior, deviations, remaining work, and evidence of completion |

Plans implement requirements; they do not silently approve product proposals or replace [product specifications](product-specs/index.md) and [technical designs](design-docs/index.md). Use repository-relative links and update them when moving a plan between directories.

## Other context directories

[generated/](generated/) is reserved for automatically generated technical context. No documentation generator is currently configured; do not manufacture generated output. When introducing one, document its deterministic regeneration command.

[references/](references/) is reserved for curated supporting material. The [use case template](references/use-case-template.md) is supporting material; do not download external documents just to fill the directory. The empty-directory `.gitkeep` files carry no requirements or decisions.
