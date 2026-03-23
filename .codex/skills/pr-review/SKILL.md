---
name: pr-review
description: |
  Sweep pull request feedback and CI status with gh CLI, identify every
  actionable comment and failing check, and prepare the next review-response or
  fix loop. Use when asked to review PR feedback, inspect checks, or determine
  whether a PR is ready for handoff or merge.
---

# PR Review

Use this skill for PR feedback and check investigation in this repo.

## Goals

- Gather all blocking PR feedback across comments, inline reviews, and review summaries.
- Identify failing or pending CI checks and the specific run to inspect.
- Decide whether the PR is ready, needs code changes, or needs justified pushback.

## Inputs

- Current branch PR, explicit PR number, or GitHub PR URL.
- `gh` auth with access to the repo.
- Repo workflow rules from `WORKFLOW.md` and merge rules from the `land` skill.

## Required sweep

Follow the repo PR feedback sweep protocol:

1. Identify the PR number.
2. Gather all channels:
   - top-level PR comments via `gh pr view --comments`
   - inline review comments via `gh api repos/<owner>/<repo>/pulls/<pr>/comments`
   - review summaries/states via `gh pr view --json reviews`
3. Treat every actionable human or bot comment as blocking until addressed in code
   or answered with explicit, justified pushback.
4. Inspect CI with `gh pr checks` and, when needed, `gh run view --log`.
5. Inspect the PR `QA Evidence` section/comment and classify any local-only or
   non-openable artifact reference as blocking.
   - Also classify vague pasted-excerpt locators such as `see notes` or
     malformed evidence rows with duplicate/missing fields as blocking.
6. Summarize open items by category: comments, reviews, checks, QA evidence,
   mergeability.

## Commands

```sh
# Resolve PR context
pr=$(gh pr view --json number -q .number)
repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)

# Gather all review channels
gh pr view "$pr" --comments
gh pr view "$pr" --json reviews,mergeable,title,url
gh api "repos/$repo/pulls/$pr/comments"
gh api "repos/$repo/issues/$pr/comments"

# Check CI status
gh pr checks "$pr"
gh run list --branch "$(git branch --show-current)" --limit 10
gh run view <run-id>
gh run view <run-id> --log

# Inspect PR body for QA Evidence references
gh pr view "$pr" --json body

# Reply to an inline review comment
gh api -X POST "/repos/$repo/pulls/$pr/comments" \
  -f body='[codex] <response>' -F in_reply_to=<comment_id>

# Reply to a top-level PR discussion comment
gh pr comment "$pr" --body "[codex] <response>"
```

## How to classify findings

- `blocking-comment`: actionable review comment not yet addressed or answered.
- `blocking-check`: failing required validation or unresolved red CI run.
- `blocking-evidence`: QA evidence points to local files, missing uploads, or
  inaccessible artifacts; also use this when evidence rows are malformed or use
  vague pasted-excerpt locators.
- `pending-check`: still running; not ready to merge yet.
- `pushback-ready`: comment should be answered with rationale instead of code.
- `ready`: no actionable comments remain and checks are green.

## Repo-specific rules

- Include both inline review comments and top-level PR comments.
- Include bot/Codex feedback, not just human reviews.
- Prefix any GitHub comment written by the agent with `[codex]`.
- For direct merge work, do not call `gh pr merge`; use the `land` skill.
- When checks fail, include the failing job name, run URL or id, and the likely root cause.
- When reporting readiness, mention mergeability and whether the PR has the `symphony` label.
- Treat missing or non-openable QA evidence as a blocker even if tests are green.
- When no PR exists, verify the workpad contains the standardized `No PR applicable`
  explanation before treating the issue as handoff-ready.

## Output guidance

- List unresolved feedback items briefly, grouped by comment/review/check/evidence.
- Quote only the minimum necessary text from comments.
- Link each item to its source when possible: review comment, issue comment, or run.
- End with one clear status: `ready`, `needs fixes`, `needs reply`, or `waiting on checks`.
