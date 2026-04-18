#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: git-doctor.sh [repo_path]

Ensures Git metadata directories are user-writable for the target repository.
Exits non-zero only when metadata remains non-writable after local remediation.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

repo_path="${1:-$PWD}"

if ! git -C "$repo_path" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "git-doctor: not a git worktree: $repo_path" >&2
  exit 2
fi

canonical_dir() {
  local repo="$1"
  local raw_dir="$2"
  (
    cd "$repo"
    cd "$raw_dir"
    pwd -P
  )
}

repair_dir() {
  local dir="$1"

  # Remove immutable flag / ACLs where supported, then ensure owner rwx bits.
  chflags -R nouchg "$dir" >/dev/null 2>&1 || true
  chmod -RN "$dir" >/dev/null 2>&1 || true
  chmod -R u+rwX "$dir" >/dev/null 2>&1 || true
}

git_dir_raw="$(git -C "$repo_path" rev-parse --git-dir)"
common_dir_raw="$(git -C "$repo_path" rev-parse --git-common-dir)"
git_dir="$(canonical_dir "$repo_path" "$git_dir_raw")"
common_dir="$(canonical_dir "$repo_path" "$common_dir_raw")"

declare -a targets=("$git_dir")
if [[ "$common_dir" != "$git_dir" ]]; then
  targets+=("$common_dir")
fi

echo "git-doctor: repo=$repo_path"

non_writable=0
for dir in "${targets[@]}"; do
  if [[ -w "$dir" ]]; then
    echo "git-doctor: writable OK -> $dir"
    continue
  fi

  echo "git-doctor: attempting repair -> $dir"
  repair_dir "$dir"

  if [[ -w "$dir" ]]; then
    echo "git-doctor: repaired -> $dir"
  else
    echo "git-doctor: still non-writable -> $dir" >&2
    non_writable=1
  fi
done

if [[ "$non_writable" -ne 0 ]]; then
  echo "git-doctor: remediation incomplete." >&2
  echo "git-doctor: if ownership is wrong, run with elevated privileges:" >&2
  echo "  sudo chown -R \"$(id -un):$(id -gn)\" \"$git_dir\"" >&2
  if [[ "$common_dir" != "$git_dir" ]]; then
    echo "  sudo chown -R \"$(id -un):$(id -gn)\" \"$common_dir\"" >&2
  fi
  exit 3
fi

exit 0
