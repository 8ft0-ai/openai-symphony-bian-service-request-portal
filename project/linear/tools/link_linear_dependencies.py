#!/usr/bin/env python3
"""
Apply Linear issue blocker relations from the generated dependency CSV.

This uses the manifest emitted by `import_linear_bundle.py` so the source issue
keys from the markdown backlog can be mapped to the created Linear issue IDs.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, Iterable, List, Set, Tuple

from upload_linear_backlog import LinearClient, LinearError


DEFAULT_DEPENDENCIES_CSV = Path("project/linear/generated/linear_dependencies.csv")


def load_manifest(path: Path) -> Dict[str, Dict[str, str]]:
    if path.suffix.lower() == ".json":
        rows = json.loads(path.read_text(encoding="utf-8"))
    else:
        with path.open(newline="", encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))

    mapping: Dict[str, Dict[str, str]] = {}
    for row in rows:
        issue_key = (row.get("issue_key") or row.get("IssueKey") or "").strip()
        linear_id = (row.get("linear_id") or row.get("LinearId") or "").strip()
        if issue_key and linear_id:
            mapping[issue_key] = row
    if not mapping:
        raise LinearError(f"No issue key -> Linear ID mappings found in {path}")
    return mapping


def load_dependencies(path: Path) -> List[Tuple[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return [
            (row["BlockingIssueKey"].strip(), row["BlockedIssueKey"].strip())
            for row in reader
            if row["BlockingIssueKey"].strip() and row["BlockedIssueKey"].strip()
        ]


def fetch_existing_blocks(client: LinearClient, issue_id: str) -> Set[str]:
    query = """
    query ExistingRelations($id: String!) {
      issue(id: $id) {
        relations(first: 250) {
          nodes {
            type
            relatedIssue {
              id
            }
          }
        }
      }
    }
    """
    data = client.graphql(query, {"id": issue_id})["issue"]["relations"]["nodes"]
    return {
        node["relatedIssue"]["id"]
        for node in data
        if node["type"] == "blocks"
    }


def create_blocks_relation(client: LinearClient, blocker_id: str, blocked_id: str) -> Dict[str, str]:
    query = """
    mutation IssueRelationCreate($input: IssueRelationCreateInput!) {
      issueRelationCreate(input: $input) {
        success
        issueRelation {
          id
          type
          issue {
            id
          }
          relatedIssue {
            id
          }
        }
      }
    }
    """
    result = client.graphql(
        query,
        {
            "input": {
                "type": "blocks",
                "issueId": blocker_id,
                "relatedIssueId": blocked_id,
            }
        },
    )["issueRelationCreate"]
    if not result.get("success"):
        raise LinearError(f"Failed to create blocks relation {blocker_id} -> {blocked_id}")
    return result["issueRelation"]


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply Linear blocker relations from linear_dependencies.csv")
    parser.add_argument("--dependencies-csv", default=str(DEFAULT_DEPENDENCIES_CSV), help="Path to linear_dependencies.csv")
    parser.add_argument("--manifest-json", help="Manifest JSON from import_linear_bundle.py")
    parser.add_argument("--manifest-csv", help="Manifest CSV from import_linear_bundle.py")
    parser.add_argument("--dry-run", action="store_true", help="Show planned links without creating them")
    parser.add_argument("--delay-seconds", type=float, default=0.05, help="Delay between relation calls")
    parser.add_argument("--api-key", help="Linear API key. Falls back to LINEAR_API_KEY env var")
    args = parser.parse_args()

    api_key = args.api_key or os.getenv("LINEAR_API_KEY")
    if not api_key:
        print("Error: provide --api-key or set LINEAR_API_KEY", file=sys.stderr)
        return 2
    manifest_path = args.manifest_json or args.manifest_csv
    if not manifest_path:
        print("Error: provide --manifest-json or --manifest-csv", file=sys.stderr)
        return 2

    mapping = load_manifest(Path(manifest_path))
    dependencies = load_dependencies(Path(args.dependencies_csv))
    client = LinearClient(api_key=api_key)

    cache: Dict[str, Set[str]] = {}
    created = 0
    skipped = 0

    for blocking_key, blocked_key in dependencies:
        if blocking_key not in mapping:
            raise LinearError(f"Blocking issue key not found in manifest: {blocking_key}")
        if blocked_key not in mapping:
            raise LinearError(f"Blocked issue key not found in manifest: {blocked_key}")

        blocker_id = mapping[blocking_key]["linear_id"]
        blocked_id = mapping[blocked_key]["linear_id"]
        blocker_identifier = mapping[blocking_key].get("linear_identifier", blocker_id)
        blocked_identifier = mapping[blocked_key].get("linear_identifier", blocked_id)

        if blocker_id not in cache:
            cache[blocker_id] = fetch_existing_blocks(client, blocker_id)

        if blocked_id in cache[blocker_id]:
            print(f"Skip existing: {blocking_key} ({blocker_identifier}) blocks {blocked_key} ({blocked_identifier})")
            skipped += 1
            continue

        if args.dry_run:
            print(f"Would create: {blocking_key} ({blocker_identifier}) blocks {blocked_key} ({blocked_identifier})")
            created += 1
            continue

        create_blocks_relation(client, blocker_id, blocked_id)
        cache[blocker_id].add(blocked_id)
        created += 1
        print(f"Created: {blocking_key} ({blocker_identifier}) blocks {blocked_key} ({blocked_identifier})")
        time.sleep(args.delay_seconds)

    print(f"\nDone. Created {created} relation(s); skipped {skipped} existing relation(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
