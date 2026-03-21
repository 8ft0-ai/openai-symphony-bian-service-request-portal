---
name: gh
description: |
  Use the GitHub CLI for GitHub repository, pull request, issue, review, check,
  and workflow operations. Use when a task involves GitHub URLs, PRs, issues,
  comments, checks, runs, releases, or repo metadata.
---

# GitHub CLI

Use this skill for GitHub work in this repo.

## Goals

- Prefer `gh` over raw HTTP or browser-only workflows for GitHub tasks.
- Use the narrowest `gh` command that answers the question or performs the action.
- Return key results directly instead of dumping full JSON unless the user asks.

## Prerequisites

- `gh` is installed and available in `PATH`.
- `gh auth status` succeeds for the target GitHub host.
- The current repo has a configured GitHub remote.

## Rules

- Use `gh pr *` for pull request reads and updates.
- Use `gh issue *` for issue reads and updates.
- Use `gh run *` and `gh workflow *` for Actions runs and workflows.
- Use `gh api` when higher-level `gh` subcommands do not expose the needed data.
- If given a GitHub URL, parse the owner, repo, and object number from the URL and
  use `gh` against that target.
- For merge/land flows in this repo, follow the `land` skill instead of calling
  `gh pr merge` directly unless the user explicitly asks for direct merge work.

## Common workflow

1. Confirm the target repo, PR, issue, run, or URL.
2. Check auth if GitHub access might fail: `gh auth status`.
3. Use the highest-level matching command first.
4. Fall back to `gh api` for missing fields or special endpoints.
5. Summarize the result with the important fields, status, URLs, and next action.

## Common commands

```sh
# Auth and repo context
gh auth status
gh repo view --json nameWithOwner,defaultBranchRef,url

# Pull requests
gh pr view <number> --json title,state,author,url,body
gh pr checks <number>
gh pr diff <number>
gh pr comment <number> --body "<comment>"
gh pr edit <number> --title "<title>" --body-file <file>
gh pr create --title "<title>" --body-file <file>

# Issues
gh issue view <number> --json title,state,assignees,labels,url,body
gh issue comment <number> --body "<comment>"
gh issue edit <number> --add-label "<label>"
gh issue list --state open --limit 50

# Reviews and comments
gh pr view <number> --comments
gh pr view <number> --json reviews
gh api repos/<owner>/<repo>/pulls/<number>/comments
gh api repos/<owner>/<repo>/issues/<number>/comments

# Actions
gh run list --limit 20
gh run view <run-id>
gh run view <run-id> --log
gh workflow list

# Releases and metadata
gh release list
gh release view <tag>
gh api repos/<owner>/<repo>
```

## Repo-specific examples

Use these patterns for common work in this repository:

```sh
# Read the current branch PR with the fields used most often here
gh pr view --json number,title,state,mergeable,reviews,url

# Run the required PR feedback sweep inputs from WORKFLOW.md
pr=$(gh pr view --json number -q .number)
repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)
gh pr view "$pr" --comments
gh pr view "$pr" --json reviews
gh api "repos/$repo/pulls/$pr/comments"

# Inspect failing checks before rework or landing
gh pr checks "$pr"
gh run list --branch "$(git branch --show-current)" --limit 10
gh run view <run-id> --log

# Add the required repo label to a PR after creation
gh pr edit "$pr" --add-label symphony

# Read top-level Codex review issue comments for the PR
gh api "repos/$repo/issues/$pr/comments"
```

## URL patterns

Common GitHub URLs map to these commands:

- PR: `https://github.com/<owner>/<repo>/pull/<number>` -> `gh pr view <number> --repo <owner>/<repo>`
- Issue: `https://github.com/<owner>/<repo>/issues/<number>` -> `gh issue view <number> --repo <owner>/<repo>`
- Actions run: `https://github.com/<owner>/<repo>/actions/runs/<run-id>` -> `gh run view <run-id> --repo <owner>/<repo>`
- Repo: `https://github.com/<owner>/<repo>` -> `gh repo view <owner>/<repo>`

## When to use `gh api`

Use `gh api` when you need:

- Inline PR review comments.
- Review threads or endpoints not covered by `gh pr view`.
- Repository metadata not exposed by a higher-level command.
- Fine-grained JSON fields for automation or scripting.

Examples:

```sh
gh api repos/<owner>/<repo>/pulls/<number>/reviews
gh api repos/<owner>/<repo>/pulls/<number>/comments
gh api repos/<owner>/<repo>/issues/<number>/comments
gh api repos/<owner>/<repo>/actions/runs/<run-id>
```

## Output guidance

- Summarize titles, states, authors, review status, failing checks, and URLs.
- Mention exact `gh` errors for auth, permissions, or missing resources.
- Keep raw JSON to the minimum needed to answer the request.
- When reporting PR status in this repo, call out outstanding review comments,
  failing checks, mergeability, and whether the PR has the `symphony` label.
