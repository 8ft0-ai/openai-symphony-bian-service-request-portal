---
name: qa-evidence
description: |
  Post openable QA evidence to the Linear workpad and GitHub PR, replacing
  local-only artifact references with uploaded URLs or pasted excerpts.
---

# QA Evidence

Use this skill when a task needs screenshots, videos, logs, test output, or
other artifacts posted for reviewer consumption.

## Goals

- Turn local proof artifacts into reviewer-openable evidence.
- Update the Linear workpad so each acceptance criterion points to real proof.
- Update the PR `QA Evidence` section or comment with accessible artifacts.
- Eliminate local-only artifact references before handoff.

## Related Skills

- `linear`: upload files to Linear and edit the workpad comment.
- `gh`: update PR body/comments and link GitHub checks or accessible media.
- `push`: final publish step after evidence is posted.

## Rules

- Local-only paths do not count as posted evidence.
- Workpad examples/templates do not count as evidence.
- Short text evidence should usually be pasted directly into the workpad or PR.
- Screenshots, videos, and longer files should be uploaded to Linear or linked
  from an accessible GitHub location.
- Do not mark acceptance evidence complete until the final comment/body contains
  openable URLs or pasted excerpts.

## Workflow

1. Inventory every artifact referenced in the workpad and PR draft.
2. Classify each artifact:
   - `paste-inline`: short command output, short notes, short logs
   - `upload-linear`: screenshots, videos, markdown reports, larger logs
   - `link-check`: GitHub Actions/check run already proves the criterion
3. Replace local file paths with one of:
   - Linear asset URL
   - GitHub check/run URL
   - PR comment location containing pasted evidence
   - clearly named pasted evidence section in the workpad
4. Re-read the Linear comment and PR body/comment.
5. Confirm there are no remaining local-only paths such as `artifacts/...` or
   `/Users/...`.

## Minimum acceptance bar

- Each acceptance criterion has matching evidence with an openable URL or pasted
  excerpt location.
- The PR `QA Evidence` section contains only reviewer-openable references.
- Reviewers do not need local filesystem access to inspect any artifact.

## Good evidence examples

- `Artifact: https://uploads.linear.app/...`
- `Artifact: https://github.com/<org>/<repo>/actions/runs/<id>`
- `Artifact: PR comment dated 2026-03-23 with pasted Playwright output`

## Bad evidence examples

- `Artifact: artifacts/exr-10-greeting-page.png`
- `Artifact: /Users/name/Desktop/greeting.png`
- `Artifact: see local notes`
