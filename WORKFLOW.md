---
tracker:
  kind: linear
  project_slug: "hello-world-57626686d7fa"
  active_states:
    - Todo
    - In Progress
    - In Review
  terminal_states:
    - Canceled
    - Duplicate
    - Done
polling:
  interval_ms: 5000
workspace:
  root: ~/dev/workspaces/symphony
hooks:
  timeout_ms: 180000
  after_create: |
    git clone --depth 1 https://github.com/8ft0-ai/openai-symphony-bian-service-request-portal .
    workspace_name="$(basename "$PWD")"
    workspace_ticket="${workspace_name%@*}"
    workspace_branch="symphony/$workspace_ticket"
    default_ref="$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || true)"
    default_branch="${default_ref#refs/remotes/origin/}"
    default_branch="${default_branch:-main}"
    git switch -c "$workspace_branch" "origin/$default_branch" 2>/dev/null || git switch -c "$workspace_branch"
    git clone --depth 1 https://github.com/openai/symphony .symphony
    printf '/.symphony/\n' >> .git/info/exclude
    if ! command -v mise >/dev/null 2>&1; then
      echo "Missing required tool: mise. Install it from https://mise.jdx.dev/ so Symphony can bootstrap the workspace-local Elixir toolchain." >&2
      exit 1
    fi
    cd .symphony/elixir
    mise trust
    mise install
    mise exec -- mix deps.get
  before_run: |
    current_branch="$(git branch --show-current 2>/dev/null || true)"
    workspace_name="$(basename "$PWD")"
    workspace_ticket="${workspace_name%@*}"
    workspace_branch="symphony/$workspace_ticket"
    case "$current_branch" in
      ""|main|master|trunk|develop)
        if git show-ref --verify --quiet "refs/heads/$workspace_branch"; then
          git switch "$workspace_branch"
        else
          default_ref="$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || true)"
          default_branch="${default_ref#refs/remotes/origin/}"
          default_branch="${default_branch:-main}"
          git switch -c "$workspace_branch" "origin/$default_branch" 2>/dev/null || git switch -c "$workspace_branch"
        fi
        ;;
    esac
  before_remove: |
    if [ -d .symphony/elixir ]; then
      if command -v mise >/dev/null 2>&1; then
        cd .symphony/elixir && mise exec -- mix workspace.before_remove --repo 8ft0-ai/openai-symphony-bian-service-request-portal
      else
        echo "Skipping workspace.before_remove; missing required tool 'mise' in PATH" >&2
      fi
    else
      echo "Skipping workspace.before_remove; missing .symphony/elixir"
    fi
agent:
  max_concurrent_agents: 10
  max_turns: 20
codex:  
  command: codex --config model_reasoning_effort=xhigh --model gpt-5.4 app-server  
  approval_policy: never  
  thread_sandbox: workspace-write  
  turn_sandbox_policy:  
    type: workspaceWrite  
    writableRoots: ["."]  
    readOnlyAccess:  
      type: fullAccess  
    networkAccess: true  
    excludeTmpdirEnvVar: false  
    excludeSlashTmp: false
---

You are working on a Linear ticket `{{ issue.identifier }}`

{% if attempt %}
Continuation context:

- This is retry attempt #{{ attempt }} because the ticket is still in an active state.
- Resume from the current workspace state instead of restarting from scratch.
- Do not repeat already-completed investigation or validation unless needed for new code changes.
- Do not end the turn while the issue remains in an active state unless you are blocked by missing required permissions/secrets.
  {% endif %}

Issue context:
Identifier: {{ issue.identifier }}
Title: {{ issue.title }}
Current status: {{ issue.state }}
Labels: {{ issue.labels }}
URL: {{ issue.url }}

Description:
{% if issue.description %}
{{ issue.description }}
{% else %}
No description provided.
{% endif %}

Instructions:

1. This is an unattended orchestration session. Never ask a human to perform follow-up actions.
2. Only stop early for a true blocker (missing required auth/permissions/secrets). If blocked, record it in the workpad and move the issue according to workflow.
3. Final message must report completed actions and blockers only. Do not include "next steps for user".

Work only in the provided repository copy. Do not touch any other path.

## Prerequisite: Linear MCP or `linear_graphql` tool is available

The agent should be able to talk to Linear, either via a configured Linear MCP server or injected `linear_graphql` tool. If none are present, stop and ask the user to configure Linear.

## Default posture

- Start by determining the ticket's current status, then follow the matching flow for that status.
- Start every task by opening the tracking workpad comment and bringing it up to date before doing new implementation work.
- Spend extra effort up front on planning and verification design before implementation.
- Reproduce first: always confirm the current behavior/issue signal before changing code so the fix target is explicit.
- Keep ticket metadata current (state, checklist, acceptance criteria, links).
- Treat a single persistent Linear comment as the source of truth for progress.
- Use that single workpad comment for all progress and handoff notes; do not post separate "done"/summary comments.
- Treat any ticket-authored `Validation`, `Test Plan`, or `Testing` section as non-negotiable acceptance input: mirror it in the workpad and execute it before considering the work complete.
- Treat acceptance evidence as a required deliverable: every acceptance criterion must map to concrete proof captured in the workpad before handoff.
- Treat posted QA evidence as mandatory for handoff: the Linear workpad must contain artifact-backed acceptance evidence, and the PR must surface a visible `QA Evidence` section or comment that summarizes the proof and links back to the artifacts.
- Treat `.symphony/` as workspace helper infrastructure cloned alongside the ticket repo, not as ticket-owned product or frontend source. Its presence does not mean the repo has app files.
- When meaningful out-of-scope improvements are discovered during execution,
  file a separate Linear issue instead of expanding scope. The follow-up issue
  must include a clear title, description, and acceptance criteria, be placed in
  `Backlog`, be assigned to the same project as the current issue, link the
  current issue as `related`, and use `blockedBy` when the follow-up depends on
  the current issue.
- Move status only when the matching quality bar is met.
- Operate autonomously end-to-end unless blocked by missing requirements, secrets, or permissions.
- Use the blocked-access escape hatch only for true external blockers (missing required tools/auth) after exhausting documented fallbacks.

## Related skills

- `linear`: interact with Linear.
- `commit`: produce clean, logical commits during implementation.
- `push`: keep remote branch current and publish updates.
- `pull`: keep branch updated with latest `origin/main` before handoff.
- `land`: when an `In Review` ticket receives human approval, explicitly open and follow `.codex/skills/land/SKILL.md`, which includes the `land` loop.

## Status map

- `Backlog` -> out of scope for this workflow; do not modify.
- `Todo` -> queued; immediately transition to `In Progress` before active work.
  - Special case: if a PR is already attached, treat as a feedback loop (run full PR feedback sweep, address or explicitly push back, revalidate, return to `In Review`).
- `In Progress` -> implementation actively underway, including reviewer-requested changes.
- `In Review` -> PR is attached and validated; wait on human approval, then execute the `land` flow while the ticket remains in `In Review`.
- `Done` -> merge is complete; no further action required.
- `Canceled` -> terminal state; no further action required.
- `Duplicate` -> terminal state; no further action required.

## Step 0: Determine current ticket state and route

1. Fetch the issue by explicit ticket ID.
2. Read the current state.
3. Route to the matching flow:
   - `Backlog` -> do not modify issue content/state; stop and wait for human to move it to `Todo`.
   - `Todo` -> immediately move to `In Progress`, then ensure bootstrap workpad comment exists (create if missing), then start execution flow.
     - If PR is already attached, start by reviewing all open PR comments and deciding required changes vs explicit pushback responses.
   - `In Progress` -> continue execution flow from current scratchpad comment.
   - `Done` -> do nothing and shut down.
   - `In Review` -> wait and poll for decision/review updates; if approval is present, open and follow `.codex/skills/land/SKILL.md` while leaving the issue in `In Review`; if review feedback requires changes, move the issue to `In Progress` and run the review feedback flow.
   - `Canceled` -> do nothing and shut down.
   - `Duplicate` -> do nothing and shut down.
4. Resolve branch, Git writability, and PR state from the local repo before reusing prior work.
   - Derive `current_branch` from `git branch --show-current`; treat the checked-out repo as the source of truth when it disagrees with Linear `gitBranchName`, workspace folder names, or prior workpad notes.
   - Determine Git metadata writability with `git_dir="$(git rev-parse --git-dir 2>/dev/null || true)"` followed by `test -n "$git_dir" && test -w "$git_dir"`; do not probe writability by creating temporary files under `.git`.
   - When checking for an existing PR, first use any PR already attached to the issue. Otherwise query GitHub with `gh pr list --state all --head "$current_branch" --json number,state,title,url`.
   - If the head-branch lookup returns no rows, run one fallback search by issue identifier, for example `gh pr list --state all --search "{{ issue.identifier }}" --json number,state,title,url`, before concluding no PR exists.
   - If a branch PR exists and is `CLOSED` or `MERGED`, treat prior branch work as non-reusable for this run.
   - Create a fresh branch from `origin/main` and restart execution flow as a new attempt.
   - Never perform implementation work on a shared default branch such as `main`, `master`, `trunk`, or `develop`.
5. For `Todo` tickets, do startup sequencing in this exact order:
   - `update_issue(..., state: "In Progress")`
   - find/create `## Codex Workpad` bootstrap comment
   - only then begin analysis/planning/implementation work.
6. Add a short comment if state and issue content are inconsistent, then proceed with the safest flow.

## Step 1: Start/continue execution (Todo or In Progress)

1.  Find or create a single persistent scratchpad comment for the issue:
    - Search existing comments for a marker header: `## Codex Workpad`.
    - Ignore resolved comments while searching; only active/unresolved comments are eligible to be reused as the live workpad.
    - If found, reuse that comment; do not create a new workpad comment.
    - If not found, create one workpad comment and use it for all updates.
    - Persist the workpad comment ID and only write progress updates to that ID.
2.  If arriving from `Todo`, do not delay on additional status transitions: the issue should already be `In Progress` before this step begins.
3.  Immediately reconcile the workpad before new edits:
    - Check off items that are already done.
    - Expand/fix the plan so it is comprehensive for current scope.
    - Ensure `Acceptance Criteria` and `Validation` are current and still make sense for the task.
4.  Start work by writing/updating a hierarchical plan in the workpad comment.
5.  Ensure the workpad includes a compact environment stamp at the top as a code fence line:
    - Format: `<host>:<abs-workdir>@<short-sha>`
    - Example: `devbox-01:/home/dev-user/code/symphony-workspaces/MT-32@7bdde33bc`
    - Do not include metadata already inferable from Linear issue fields (`issue ID`, `status`, `branch`, `PR link`).
6.  Add explicit acceptance criteria and TODOs in checklist form in the same comment.
    - If changes are user-facing, include a UI walkthrough acceptance criterion that describes the end-to-end user path to validate.
    - If changes touch app files or app behavior, add explicit app-specific flow checks to `Acceptance Criteria` in the workpad (for example: launch path, changed interaction path, and expected result path).
    - Do not count `.symphony/` helper files toward this app-touching check unless the ticket explicitly targets Symphony helper tooling itself.
    - If the ticket description/comment context includes `Validation`, `Test Plan`, or `Testing` sections, copy those requirements into the workpad `Acceptance Criteria` and `Validation` sections as required checkboxes (no optional downgrade).
    - Add an `Acceptance Evidence` section immediately after `Acceptance Criteria` and keep one checklist item per criterion, using this structure: criterion, proof method, artifact path or URL, result, and a brief note.
    - Do not mark an acceptance criterion complete until its matching evidence item is recorded with a concrete artifact or clearly documented command output.
    - Pre-plan the PR-facing `QA Evidence` summary at the same time so the eventual PR can surface the same proof without reviewers needing to hunt through Linear.
7.  Run a principal-style self-review of the plan and refine it in the comment.
8.  Before implementing, capture a concrete reproduction signal and record it in the workpad `Notes` section (command/output, screenshot, or deterministic UI behavior).
    - Scope repo-layout observations precisely to the paths you actually inspected.
    - Distinguish ticket-owned paths from workspace helper infrastructure such as `.symphony/`.
    - Do not turn a limited file scan into a repo-wide product claim; prefer wording like `no app files found in the inspected ticket-owned paths` over `the repo has no app files` unless that broader statement is truly verified.
9.  Run the `pull` skill to sync with latest `origin/main` before any code edits, then record the pull/sync result in the workpad `Notes`.
    - Include a `pull skill evidence` note with:
      - merge source(s),
      - result (`clean` or `conflicts resolved`),
      - resulting `HEAD` short SHA.
    - If the pull cannot run because of session-local Git, network, or permission constraints, record that as a workspace/session blocker rather than as a durable repository property.
10. Compact context and proceed to execution.

## PR feedback sweep protocol (required)

When a ticket has an attached PR, run this protocol before moving to `In Review`:

1. Identify the PR number from issue links/attachments.
2. Gather feedback from all channels:
   - Top-level PR comments (`gh pr view --comments`).
   - Inline review comments (`gh api repos/<owner>/<repo>/pulls/<pr>/comments`).
   - Review summaries/states (`gh pr view --json reviews`).
3. Treat every actionable reviewer comment (human or bot), including inline review comments, as blocking until one of these is true:
   - code/test/docs updated to address it, or
   - explicit, justified pushback reply is posted on that thread.
4. Update the workpad plan/checklist to include each feedback item and its resolution status.
5. Re-run validation after feedback-driven changes and push updates.
6. Repeat this sweep until there are no outstanding actionable comments.

## Blocked-access escape hatch (required behavior)

Use this only when completion is blocked by missing required tools or missing auth/permissions that cannot be resolved in-session.

- GitHub is **not** a valid blocker by default. Always try fallback strategies first (alternate remote/auth mode, then continue publish/review flow).
- Local repository permission failures are a valid blocker when `git rev-parse --git-dir` resolves but that directory is not writable, because required `pull`/`commit`/`push` metadata updates cannot succeed.
- For GitHub publish/review failures, classify the failing layer in the current Codex turn context before declaring a blocker:
  - Git metadata permissions: `.git` is non-writable, refs/FETCH_HEAD/config cannot be locked, or similar local checkout metadata errors occur.
  - GitHub network/DNS reachability: `Could not resolve host`, `Could not resolve hostname`, `error connecting to api.github.com`, timeouts, or similar transport failures reaching `github.com` / `api.github.com` occur over HTTPS and SSH.
  - GitHub auth/authorization: no valid active GitHub account is available, or the reachable GitHub remote/API returns 401/403/access-denied style failures.
- Run lightweight diagnostics from the failing Codex turn context, not only from workspace hooks, because hook-time connectivity can differ from publish-time connectivity. Prefer evidence such as `gh auth status 2>&1 || true`, `git ls-remote origin HEAD`, `curl -I https://api.github.com || true`, and one DNS probe (`nslookup`, `host`, or `dig`) when those commands are available.
- Treat `gh auth status` carefully: it may return a non-zero exit code because an inactive stored account is invalid. Do not classify the failure as auth-related if the output still shows a valid `Active account: true` and the observed git/API failures are network/DNS failures.
- When documenting such failures, describe them as facts about the current checkout/session (for example, `this session's checkout has a non-writable .git directory`), not as a permanent characteristic of the repository itself.
- Do not move to `In Review` for GitHub access/auth until all fallback strategies have been attempted and documented in the workpad.
- If a non-GitHub required tool is missing, or required non-GitHub auth is unavailable, move the ticket to `In Review` with a short blocker brief in the workpad that includes:
  - what is missing,
  - why it blocks required acceptance/validation,
  - exact human action needed to unblock.
- Keep the brief concise and action-oriented; do not add extra top-level comments outside the workpad.

## Step 2: Execution phase (Todo -> In Progress -> In Review)

1.  Determine current repo state (`branch`, `git status`, `HEAD`) and verify the kickoff `pull` sync result is already recorded in the workpad before implementation continues.
    - Confirm the current branch is an issue-scoped branch, not a shared default branch.
    - Use `git branch --show-current` as the canonical branch name for push/PR checks; do not substitute Linear branch metadata when it differs.
    - If the repo is still on `main`, `master`, `trunk`, or `develop`, create or switch to a fresh issue-scoped branch before making edits.
2.  If current issue state is `Todo`, move it to `In Progress`; otherwise leave the current state unchanged.
3.  Load the existing workpad comment and treat it as the active execution checklist.
    - Edit it liberally whenever reality changes (scope, risks, validation approach, discovered tasks).
4.  Implement against the hierarchical TODOs and keep the comment current:
    - Check off completed items.
    - Add newly discovered items in the appropriate section.
    - Keep parent/child structure intact as scope evolves.
    - Update the workpad immediately after each meaningful milestone (for example: reproduction complete, code change landed, validation run, review feedback addressed).
    - Never leave completed work unchecked in the plan.
    - For tickets that started as `Todo` with an attached PR, run the full PR feedback sweep protocol immediately after kickoff and before new feature work.
5.  Run validation/tests required for the scope.
    - Mandatory gate: execute all ticket-provided `Validation`/`Test Plan`/ `Testing` requirements when present; treat unmet items as incomplete work.
    - Prefer a targeted proof that directly demonstrates the behavior you changed.
    - You may make temporary local proof edits to validate assumptions (for example: tweak a local build input for `make`, or hardcode a UI account / response path) when this increases confidence.
    - Revert every temporary proof edit before commit/push.
    - Document these temporary proof steps and outcomes in the workpad `Validation`/`Notes` sections so reviewers can follow the evidence.
    - If app-touching, run `launch-app` validation and capture/upload media via `github-pr-media` before handoff.
    - Changes limited to `.symphony/`, docs, or other non-app files do not by themselves trigger app runtime validation.
    - For each acceptance criterion, capture the strongest practical artifact for the proof type used: targeted test output, command log, screenshot, video, or PR check link.
6.  Re-check all acceptance criteria and close any gaps.
    - Verify every acceptance criterion has a corresponding completed item in `Acceptance Evidence`; missing or vague evidence means the task is not ready for handoff.
7.  Before every `git push` attempt, run the required validation for your scope and confirm it passes; if it fails, address issues and rerun until green, then commit and push changes.
    - Use the `push` skill to push the current branch and create or update the branch PR.
    - Resolve `current_branch` immediately before `git push` and `gh pr list`; if the head-branch PR lookup returns empty, retry once with an issue-identifier search before treating PR creation as still pending.
    - Treat an open PR for the current branch as mandatory before handoff unless blocked by documented GitHub auth/permission failure.
    - If `git push`, `gh pr list`, or `gh pr create` fails, run the GitHub publish blocker triage from the same Codex turn context and record whether the blocker is git metadata permissions, GitHub network/DNS reachability, or GitHub auth/authorization.
    - Do not treat `gh auth status` output by itself as proof of auth failure when the same output still shows a valid active account; inactive invalid accounts are noise unless the active account is also unusable.
8.  Attach PR URL to the issue (prefer attachment; use the workpad comment only if attachment is unavailable).
    - Ensure the GitHub PR has label `symphony` (add it if missing).
    - Ensure the GitHub PR body or a dedicated PR comment includes a `QA Evidence` section with automated results, manual walkthrough status, artifact links/paths, and a reference to the Linear workpad evidence.
9.  Merge latest `origin/main` into branch, resolve conflicts, and rerun checks.
10. Update the workpad comment with final checklist status and validation notes.
    - Mark completed plan/acceptance/validation checklist items as checked.
    - Add final handoff notes (commit + validation summary) in the same workpad comment.
    - Do not include PR URL in the workpad comment; keep PR linkage on the issue via attachment/link fields.
    - Add a short `### Confusions` section at the bottom when any part of task execution was unclear/confusing, with concise bullets.
    - Do not post any additional completion summary comment.
    - Ensure the workpad and PR `QA Evidence` summary are consistent; if one is updated, update the other in the same handoff pass.
11. Before moving to `In Review`, poll PR feedback and checks:
    - Read the PR `Manual QA Plan` comment (when present) and use it to sharpen UI/runtime test coverage for the current change.
    - Run the full PR feedback sweep protocol.
    - Confirm there is an open PR for the current non-default branch, using the live `git branch --show-current` value and one fallback lookup by issue identifier if the head-branch query is empty.
    - Confirm PR checks are passing (green) after the latest changes.
    - Confirm every required ticket-provided validation/test-plan item is explicitly marked complete in the workpad.
    - Confirm every acceptance criterion has linked evidence with a concrete artifact, not just a prose claim.
    - Confirm the PR contains a visible `QA Evidence` section or comment with links or paths to the supporting artifacts.
    - Repeat this check-address-verify loop until no outstanding comments remain and checks are fully passing.
    - Re-open and refresh the workpad before state transition so `Plan`, `Acceptance Criteria`, and `Validation` exactly match completed work.
12. Only then move issue to `In Review`.
    - Exception: if blocked by missing required non-GitHub tools/auth per the blocked-access escape hatch, move to `In Review` with the blocker brief and explicit unblock actions.
13. For `Todo` tickets that already had a PR attached at kickoff:
    - Ensure all existing PR feedback was reviewed and resolved, including inline review comments (code changes or explicit, justified pushback response).
    - Ensure branch was pushed with any required updates.
    - Then move to `In Review`.

## Step 3: In Review and merge handling

1. When the issue is in `In Review`, do not do implementation work or change ticket content unless review feedback requires moving the issue back to `In Progress`.
2. Poll for updates as needed, including GitHub PR review comments from humans and bots.
3. If review feedback requires changes, move the issue to `In Progress` and follow the review feedback flow.
4. If approval is present and no blocking feedback remains, keep the issue in `In Review`, open and follow `.codex/skills/land/SKILL.md`, and run the `land` skill in a loop until the PR is merged. Do not call `gh pr merge` directly.
5. After merge is complete, move the issue to `Done`.

## Step 4: Review feedback handling

1. Treat reviewer-requested changes as a full approach reset, not incremental patching.
2. Re-read the full issue body and all human comments; explicitly identify what will be done differently this attempt.
3. Close the existing PR tied to the issue.
4. Remove the existing `## Codex Workpad` comment from the issue.
5. Create a fresh branch from `origin/main`.
6. Start over from the normal kickoff flow:
   - Move the issue to `In Progress`.
   - Create a new bootstrap `## Codex Workpad` comment.
   - Build a fresh plan/checklist and execute end-to-end.

## Completion bar before In Review

- Step 1/2 checklist is fully complete and accurately reflected in the single workpad comment.
- Acceptance criteria and required ticket-provided validation items are complete.
- Every acceptance criterion has matching evidence recorded with concrete artifacts or command output.
- The PR surfaces QA evidence clearly enough for reviewers to inspect without searching Linear first.
- Validation/tests are green for the latest commit.
- Work is committed on an issue-scoped non-default branch for this workspace.
- PR feedback sweep is complete and no actionable comments remain.
- PR checks are green, branch is pushed, an open PR exists for that branch, and the PR is linked on the issue.
- Required PR metadata is present (`symphony` label).
- If app-touching, runtime validation/media requirements from `App runtime validation (required)` are complete.

## Guardrails

- If the branch PR is already closed/merged, do not reuse that branch or prior implementation state for continuation.
- For closed/merged branch PRs, create a new branch from `origin/main` and restart from reproduction/planning as if starting fresh.
- Do not test Git metadata writability by creating scratch files under `.git`; use `git rev-parse --git-dir` plus `test -w` instead.
- Do not treat the workspace-local `.symphony/elixir` helper checkout as application source when deciding scope, app ownership, or runtime validation requirements.
- If issue state is `Backlog`, do not modify it; wait for human to move to `Todo`.
- Do not edit the issue body/description for planning or progress tracking.
- Use exactly one persistent workpad comment (`## Codex Workpad`) per issue.
- If comment editing is unavailable in-session, use the update script. Only report blocked if both MCP editing and script-based editing are unavailable.
- Temporary proof edits are allowed only for local verification and must be reverted before commit.
- If out-of-scope improvements are found, create a separate Backlog issue rather
  than expanding current scope, and include a clear
  title/description/acceptance criteria, same-project assignment, a `related`
  link to the current issue, and `blockedBy` when the follow-up depends on the
  current issue.
- Do not use workspace-hook connectivity checks as the sole evidence for GitHub publish blockers; capture publish-time diagnostics from the Codex turn that actually failed.
- Do not move to `In Review` unless the `Completion bar before In Review` is satisfied.
- In `In Review`, do not do implementation work unless review feedback requires moving the issue back to `In Progress`; otherwise wait, poll, and land approved PRs.
- If state is terminal (`Done`, `Canceled`, or `Duplicate`), do nothing and shut down.
- Keep issue text concise, specific, and reviewer-oriented.
- If blocked and no workpad exists yet, add one blocker comment describing blocker, impact, and next unblock action.

## Workpad template

Use this exact structure for the persistent workpad comment and keep it updated in place throughout execution:

````md
## Codex Workpad

```text
<hostname>:<abs-path>@<short-sha>
```

### Plan

- [ ] 1\. Parent task
  - [ ] 1.1 Child task
  - [ ] 1.2 Child task
- [ ] 2\. Parent task

### Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2

### Acceptance Evidence

- [ ] Criterion 1 -> Proof: `<test|command|screenshot|video|manual walkthrough|check run>`; Artifact: `<path or URL>`; Result: `<pass|fail|partial>`; Notes: `<brief takeaway>`
- [ ] Criterion 2 -> Proof: `<...>`; Artifact: `<path or URL>`; Result: `<...>`; Notes: `<...>`

### PR QA Evidence

- [ ] PR `QA Evidence` section/comment posted
- [ ] Includes automated validation result(s): `<command or check run>`
- [ ] Includes manual validation result(s): `<walkthrough or runtime check>`
- [ ] Includes artifact link(s)/path(s): `<screenshot|video|log|check run|report>`
- [ ] Includes reference to the Linear workpad evidence: `<issue/comment URL>`

### Validation

- [ ] targeted tests: `<command>`

### Notes

- <timestamped, scope-accurate progress note>
- <if relevant: clearly separate ticket-owned path observations, helper-infrastructure observations, and session-local blocker facts>

#### Notes examples

- Good: `2026-03-22 13:53 AEDT Reproduction signal:` `rg --files` in inspected ticket-owned paths returned `README.md` and `project/linear/tickets/README_index.md`; `.symphony/` contains helper infrastructure; no frontend app files were found in the inspected ticket-owned paths.
- Bad: `2026-03-22 13:53 AEDT The repo has no frontend app files.`
- Good: `2026-03-22 13:53 AEDT Pull skill evidence:` blocked in this session because the current checkout's `.git` directory is non-writable.
- Bad: `2026-03-22 13:53 AEDT The repo's .git directory is read-only.`

### Confusions

- <only include when something was confusing during execution>
````
