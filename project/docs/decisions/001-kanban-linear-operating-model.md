# Decision 001: Kanban and Linear Operating Model

Date: 2026-03-28
Status: Accepted

## Context

The project backlog is being imported from markdown files in
`project/linear/tickets` into Linear and managed using Kanban.

The backlog has explicit cross-domain dependencies across:

- `API`
- `CP`
- `CSR`
- `SEC`
- `QA`

The project also has a strong control requirement: the portal supports manual
servicing only and must not introduce straight-through processing or automatic
downstream fulfilment.

## Decisions

### 1. Isolate this work stream in its own git branch

Use a dedicated branch for the Linear/Kanban planning and import workstream.

Recommended branch pattern:

- `project/linear-kanban-setup`
- `docs/linear-import-runbook`

Reason:

- the planning/import work is operationally separate from feature delivery
- generated import artifacts can change frequently
- process documentation should not be mixed with unrelated documentation edits

Current caveat:

- the current working branch already has unrelated uncommitted changes
- do not create the new branch from a mixed worktree unless you intentionally
  want those unrelated changes carried forward

Preferred approach:

1. commit or stash unrelated work
2. create the dedicated branch
3. continue the Linear/Kanban setup there

### 2. Use one Linear project, not multiple projects

Use a single Linear project for MVP delivery:

- `Service Request Portal MVP`

Reason:

- the backlog is still small enough to manage as one delivery stream
- multiple tickets depend across domains, so multiple projects would hide
  blockers rather than reduce complexity

### 3. Keep domains as labels, not teams

Use these labels:

- `API`
- `CP`
- `CSR`
- `SEC`
- `QA`

Reason:

- the labels express work type cleanly
- a single team/project keeps the Kanban board operationally coherent

### 4. Use milestones to represent major delivery slices

Use these milestones:

- `Foundation`
- `Customer Submission`
- `CSR Processing`
- `Customer Tracking & Controls`
- `QA / UAT / Release`

### 5. Use the existing `elixir` team workflow

Use the existing Linear team states rather than introducing a second custom
workflow for this backlog.

States:

- `Backlog`
- `Todo`
- `In Progress`
- `In Review`
- `Done`
- `Canceled`
- `Duplicate`

Operating meaning:

- `Backlog` is the import and holding queue.
- `Todo` is the ready-to-pull queue for upcoming work.
- blocked work is represented through Linear dependency links and blocked views,
  not a dedicated custom state.

Suggested WIP rules for a solo or very small team:

- `In Progress`: 1
- `In Review`: 1

### 6. Import order matters

Root issues:

- `API-001`
- `CP-001`
- `CSR-001`

Dependencies should be respected during pull order and readiness decisions.

### 7. Use curated metadata where it is stronger than the raw ticket files

For import bundle generation:

- use ticket markdown files as the source of full issue descriptions
- use `project/linear/linear.md` as the source of explicit priority metadata

### 8. Normalize the known dependency loop before importing

The markdown ticket set contains a cycle:

- `CSR-009 -> CSR-010 -> CSR-009`

Normalize it by removing `CSR-010` from `CSR-009`'s dependency list and keeping:

- `CSR-010` blocked by `CSR-009`

Reason:

- the status update control should exist before the stricter transition-rule
  hardening ticket is considered complete in Kanban terms
- cyclic dependencies make readiness and blocked views unreliable

### 9. Set up Linear structure before automating dependency linking

Recommended sequence:

1. prepare the Linear project, milestones, and labels
2. import the issues
3. apply dependency links after import

Reason:

- project and milestone setup is the stable workspace-level foundation
- dependency linking only becomes useful after the issues already exist
- the dependency linker should work against the final imported issue IDs

## Consequences

- `project/docs` becomes the durable source for operating decisions
- `project/linear/generated` remains a generated artifact area
- follow-up automation should focus on:
  - exact Linear workspace/project setup first
  - dependency-link automation second
