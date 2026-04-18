#!/usr/bin/env bash
set -eo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
project_root="$repo_root/elixir"
git_doctor="$repo_root/scripts/git-doctor.sh"

if ! command -v mise >/dev/null 2>&1; then
  echo "mise is required. Install it from https://mise.jdx.dev/getting-started.html" >&2
  exit 1
fi

if [[ -x "$git_doctor" ]]; then
  "$git_doctor" "$repo_root"
  if [[ -d "$project_root" ]]; then
    "$git_doctor" "$project_root"
  fi
fi

cd "$project_root"
mise trust

make setup
