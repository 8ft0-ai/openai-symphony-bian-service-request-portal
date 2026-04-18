# Linear Import Runbook

Date: 2026-03-28

## Purpose

This runbook defines how to prepare and import the project backlog into Linear
without losing dependency information or the intended Kanban operating model.

## Inputs

Source backlog:

- `project/linear/tickets`

Priority metadata:

- `project/linear/linear.md`

Bundle builder:

- `project/linear/tools/build_linear_import_bundle.py`

Generated outputs:

- `project/linear/generated/linear_import.csv`
- `project/linear/generated/linear_import_rich.csv`
- `project/linear/generated/linear_dependencies.csv`
- `project/linear/generated/README.md`

## Preconditions

- work on a dedicated branch for this planning/import stream
- avoid mixing unrelated documentation or skill changes into this branch
- confirm the target Linear team where the issues will be imported

## Step 1: Build the import bundle

Run:

```bash
python3 project/linear/tools/build_linear_import_bundle.py
```

What this does:

- parses the markdown tickets
- prefixes issue titles with the ticket key
- applies priority metadata from `project/linear/linear.md`
- writes a strict import CSV and a richer planning CSV
- writes a dependency edge file for the post-import linking pass
- normalizes the known `CSR-009` / `CSR-010` dependency loop

## Step 2: Prepare Linear structure

Before importing issues, create the stable project shell in Linear.

Project:

- `Service Request Portal MVP`

Labels:

- `API`
- `CP`
- `CSR`
- `SEC`
- `QA`

Milestones:

- `Foundation`
- `Customer Submission`
- `CSR Processing`
- `Customer Tracking & Controls`
- `QA / UAT / Release`

Use the existing `elixir` team states:

- `Backlog`
- `Todo`
- `In Progress`
- `In Review`
- `Done`
- `Canceled`
- `Duplicate`

Notes:

- do not create a second custom state model such as `Triage` or `Ready` for
  this backlog
- use `Backlog` as the initial import state
- use `Todo` as the ready queue after review
- represent blocked work via dependency links and saved views rather than a
  dedicated `Blocked` state

## Step 3: Import issues

Import:

- `project/linear/generated/linear_import.csv`

Optional repo automation path:

```bash
python3 project/linear/tools/import_linear_bundle.py \
  --team-name elixir \
  --manifest-json /tmp/service-request-portal-import-manifest.json \
  --manifest-csv /tmp/service-request-portal-import-manifest.csv
```

Notes:

- the strict CSV keeps `Status` blank so the target team defaults apply
- if the target team default is not `Backlog`, move imported issues to
  `Backlog` before review
- descriptions include an `Import Metadata` section for milestone, labels,
  blocker context, and source file path
- use `linear_import_rich.csv` to verify titles, order, milestone mapping, and
  blocker relationships after import

## Step 4: Assign milestones and verify order

Use `project/linear/generated/linear_import_rich.csv` to:

- bulk-assign milestones
- verify the recommended pull order
- review the root issues and dependency layers

Important root issues:

- `API-001`
- `CP-001`
- `CSR-001`

## Step 5: Apply dependency links

After import, use `project/linear/generated/linear_dependencies.csv` to apply
`blocked by` issue relations in Linear.

Do not do this before the import exists, because the dependency file references
ticket keys, while Linear blocker relations need actual imported issues.

Optional repo automation path:

```bash
python3 project/linear/tools/link_linear_dependencies.py \
  --manifest-json /tmp/service-request-portal-import-manifest.json
```

## Step 6: Export dependency graphs

Use the exporter to generate a project-wide dependency graph or a focused
ticket subgraph.

Offline export from the generated CSV:

```bash
python3 project/linear/tools/export_linear_dependency_graph.py \
  --source csv \
  --dependencies-csv project/linear/generated/linear_dependencies.csv
```

Live export from Linear relations:

```bash
python3 project/linear/tools/export_linear_dependency_graph.py \
  --source linear \
  --project-slug service-request-portal-mvp-7b4ee5582c2d
```

Focused ticket view with 2 hops of upstream/downstream context:

```bash
python3 project/linear/tools/export_linear_dependency_graph.py \
  --source linear \
  --project-slug service-request-portal-mvp-7b4ee5582c2d \
  --issue CP-001 \
  --depth 2
```

Output files land in `project/linear/generated/`:

- `.mmd` for Mermaid embedding in Markdown
- `.dot` for Graphviz editing
- `.svg` for a static visual artifact

## Recommended next automation step

Prepare the exact Linear project/milestone setup before building a dependency
linker.

Reason:

- setup is the first stable workspace-level change
- labels and milestones need to exist before the imported backlog is usable
- the dependency linker should target the final imported issues after setup and
  import are complete

After that, add a dependency-link script that:

1. reads `linear_dependencies.csv`
2. resolves imported issues by ticket key or manifest
3. creates `blocked by` relations in Linear

## Operating rules after import

Use Kanban with small WIP.

Suggested WIP:

- `In Progress`: 1
- `In Review`: 1

Saved views to create in Linear:

- `Backlog`
- `Todo`
- `Blocked` filtered from dependency relations
- `Root Issues`
- `QA / Release`

## Review cadence

When the backlog changes:

1. update the ticket markdown
2. update project-level decisions in `project/docs` if the operating model changed
3. rebuild the import bundle
4. review diffs in generated output before re-import or applying updates
