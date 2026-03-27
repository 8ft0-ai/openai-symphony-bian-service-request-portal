#!/usr/bin/env python3
"""
Import the generated Linear bundle into a target team/project.

This reads `linear_import_rich.csv` and creates issues with the intended
project, milestone, label, priority, and workflow state metadata. It writes an
optional manifest that can be used later by the dependency linker.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List

from upload_linear_backlog import LinearClient, LinearError, normalise_priority


DEFAULT_CSV = Path("project/linear/generated/linear_import_rich.csv")
DEFAULT_TEAM_NAME = "elixir"


@dataclass(frozen=True)
class BundleRow:
    issue_key: str
    title: str
    description: str
    priority: str
    project: str
    milestone: str
    state: str
    labels: List[str]
    recommended_order: int
    source_file: str


def parse_csv_list(value: str) -> List[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def load_rows(path: Path) -> List[BundleRow]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows = [
            BundleRow(
                issue_key=row["IssueKey"].strip(),
                title=row["LinearTitle"].strip(),
                description=row["Description"],
                priority=row["Priority"].strip(),
                project=row["Project"].strip(),
                milestone=row["Milestone"].strip(),
                state=row["StatusSuggestion"].strip() or "Backlog",
                labels=parse_csv_list(row["Labels"]),
                recommended_order=int(row["RecommendedOrder"]),
                source_file=row["SourceFile"].strip(),
            )
            for row in reader
        ]
    if not rows:
        raise LinearError(f"No rows found in {path}")
    return sorted(rows, key=lambda row: row.recommended_order)


def resolve_state_ids(client: LinearClient, team_id: str) -> Dict[str, str]:
    query = """
    query TeamStates($id: String!) {
      team(id: $id) {
        states {
          nodes {
            id
            name
          }
        }
      }
    }
    """
    data = client.graphql(query, {"id": team_id})["team"]["states"]["nodes"]
    return {item["name"]: item["id"] for item in data}


def resolve_project_milestones(client: LinearClient, project_id: str) -> Dict[str, str]:
    query = """
    query ProjectMilestones($id: String!) {
      project(id: $id) {
        projectMilestones {
          nodes {
            id
            name
          }
        }
      }
    }
    """
    data = client.graphql(query, {"id": project_id})["project"]["projectMilestones"]["nodes"]
    return {item["name"]: item["id"] for item in data}


def create_issue(
    client: LinearClient,
    *,
    team_id: str,
    state_id: str,
    project_id: str,
    milestone_id: str,
    label_ids: List[str],
    title: str,
    description: str,
    priority: int | None,
) -> Dict[str, str]:
    query = """
    mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          title
          url
        }
      }
    }
    """
    input_obj = {
        "teamId": team_id,
        "stateId": state_id,
        "projectId": project_id,
        "projectMilestoneId": milestone_id,
        "labelIds": label_ids,
        "title": title,
        "description": description,
    }
    if priority is not None:
        input_obj["priority"] = priority

    result = client.graphql(query, {"input": input_obj})["issueCreate"]
    if not result.get("success"):
        raise LinearError(f"Issue creation failed for {title}")
    return result["issue"]


def unique_labels(rows: Iterable[BundleRow]) -> List[str]:
    names: List[str] = []
    seen = set()
    for row in rows:
        for label in row.labels:
            if label not in seen:
                seen.add(label)
                names.append(label)
    return names


def write_manifest_json(path: Path, manifest: List[Dict[str, str]]) -> None:
    path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def write_manifest_csv(path: Path, manifest: List[Dict[str, str]]) -> None:
    fieldnames = sorted({key for row in manifest for key in row.keys()})
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(manifest)


def main() -> int:
    parser = argparse.ArgumentParser(description="Import the generated Linear bundle into Linear")
    parser.add_argument("--csv", default=str(DEFAULT_CSV), help="Path to linear_import_rich.csv")
    parser.add_argument("--team-id", help="Linear team UUID")
    parser.add_argument("--team-key", help="Linear team key, e.g. EXR")
    parser.add_argument("--team-name", default=DEFAULT_TEAM_NAME, help="Linear team name")
    parser.add_argument("--project-id", help="Optional Linear project UUID")
    parser.add_argument("--project", help="Optional Linear project name override")
    parser.add_argument("--state", help="Override all issue states with this workflow state name")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be created without creating issues")
    parser.add_argument("--delay-seconds", type=float, default=0.15, help="Delay between create calls")
    parser.add_argument("--manifest-json", help="Write created issue manifest to JSON")
    parser.add_argument("--manifest-csv", help="Write created issue manifest to CSV")
    parser.add_argument("--api-key", help="Linear API key. Falls back to LINEAR_API_KEY env var")
    args = parser.parse_args()

    api_key = args.api_key or os.getenv("LINEAR_API_KEY")
    if not api_key:
        print("Error: provide --api-key or set LINEAR_API_KEY", file=sys.stderr)
        return 2

    rows = load_rows(Path(args.csv))
    project_name = args.project or rows[0].project

    client = LinearClient(api_key=api_key)
    viewer = client.get_viewer()
    print(f"Authenticated to Linear as {viewer['name']} <{viewer['email']}>")

    team = client.resolve_team(args.team_id, args.team_key, args.team_name)
    print(f"Using team: {team['key']} ({team['name']}) [{team['id']}]")

    project = client.resolve_project(args.project_id, project_name)
    if not project:
        raise LinearError(f"Could not resolve project: {project_name}")
    print(f"Using project: {project['name']} [{project['id']}]")

    state_ids = resolve_state_ids(client, team["id"])
    milestone_ids = resolve_project_milestones(client, project["id"])
    resolved_labels = client.resolve_labels(unique_labels(rows))
    label_ids = {label["name"]: label["id"] for label in resolved_labels}

    manifest: List[Dict[str, str]] = []

    for row in rows:
        state_name = args.state or row.state
        if state_name not in state_ids:
            raise LinearError(f"Unknown workflow state on team {team['name']}: {state_name}")
        if row.milestone not in milestone_ids:
            raise LinearError(f"Unknown milestone on project {project['name']}: {row.milestone}")
        missing_labels = [label for label in row.labels if label not in label_ids]
        if missing_labels:
            raise LinearError(f"Missing labels in Linear: {', '.join(missing_labels)}")

        priority = normalise_priority(row.priority)
        print(f"\n---\n{row.issue_key} ({row.recommended_order})")
        print(f"Title: {row.title}")
        print(f"State: {state_name} | Milestone: {row.milestone} | Labels: {', '.join(row.labels)}")

        if args.dry_run:
            manifest.append(
                {
                    "issue_key": row.issue_key,
                    "title": row.title,
                    "state": state_name,
                    "milestone": row.milestone,
                    "status": "dry-run",
                    "source_file": row.source_file,
                }
            )
            continue

        created = create_issue(
            client,
            team_id=team["id"],
            state_id=state_ids[state_name],
            project_id=project["id"],
            milestone_id=milestone_ids[row.milestone],
            label_ids=[label_ids[name] for name in row.labels],
            title=row.title,
            description=row.description,
            priority=priority,
        )
        print(f"Created: {created['identifier']} -> {created['url']}")
        manifest.append(
            {
                "issue_key": row.issue_key,
                "title": row.title,
                "linear_id": created["id"],
                "linear_identifier": created["identifier"],
                "linear_url": created["url"],
                "state": state_name,
                "milestone": row.milestone,
                "project": project["name"],
                "source_file": row.source_file,
            }
        )
        time.sleep(args.delay_seconds)

    if args.manifest_json:
        write_manifest_json(Path(args.manifest_json), manifest)
        print(f"\nWrote JSON manifest: {args.manifest_json}")
    if args.manifest_csv:
        write_manifest_csv(Path(args.manifest_csv), manifest)
        print(f"Wrote CSV manifest: {args.manifest_csv}")

    print(f"\nDone. Processed {len(rows)} bundle rows.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
