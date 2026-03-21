#!/usr/bin/env python3
"""
Upload backlog markdown files to Linear as issues.

This script is designed for the generated markdown backlog pack where each file
is named like:
  CSR-009_add-csr-status-update-control.md

It will:
- read all .md files in a folder
- derive an issue title from the filename and/or Summary section
- create one Linear issue per file
- set the full markdown file contents as the Linear issue description
- optionally assign a project, labels, and priority mapping
- optionally write a CSV/JSON manifest of created issues

It intentionally does NOT create Linear dependency links between issues. The
source markdown's Dependencies section is preserved in the issue description, so
nothing is lost. If you later want a second-pass dependency linker, it can be
added once you confirm the exact dependency semantics you want in your Linear
workspace.

Usage example:
  export LINEAR_API_KEY=lin_api_xxx
  python upload_linear_backlog.py \
    --folder /path/to/linear_backlog \
    --team-key ENG \
    --project "BIAN Service Request Portal" \
    --default-priority 2 \
    --apply-label backlog --apply-label imported

References:
- Linear GraphQL API endpoint: https://api.linear.app/graphql
- Linear uses GraphQL for issue creation and requires API auth headers.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

import requests

LINEAR_API_URL = "https://api.linear.app/graphql"

# Linear priority values are numeric in the API. Common convention:
# 0 = no priority, 1 = urgent, 2 = high, 3 = normal, 4 = low
DEFAULT_PRIORITY_MAP = {
    "urgent": 1,
    "high": 2,
    "medium": 3,
    "normal": 3,
    "low": 4,
}

FILE_NAME_RE = re.compile(r"^(?P<key>[A-Z]+-\d+)[_-](?P<slug>.+)\.md$")
SUMMARY_SECTION_RE = re.compile(
    r"^##\s+Summary\s*\n(?P<body>.*?)(?:\n##\s+|\Z)", re.MULTILINE | re.DOTALL
)
PRIORITY_LINE_RE = re.compile(r"^\*\*Priority:\*\*\s*(?P<value>.+)$", re.MULTILINE)
README_INDEX = "README_index.md"


class LinearError(RuntimeError):
    pass


@dataclass
class BacklogDoc:
    path: Path
    issue_key: str
    slug: str
    title: str
    content: str
    inferred_priority: Optional[int] = None


def slug_to_title(slug: str) -> str:
    parts = re.split(r"[-_]+", slug)
    if not parts:
        return slug

    lower_words = {
        "a", "an", "the", "and", "or", "for", "to", "of", "in", "on", "by", "with", "from",
    }
    words: List[str] = []
    for i, part in enumerate(parts):
        if not part:
            continue
        if part.upper() in {"API", "CSR", "UAT", "QA", "MVP", "PUT", "GET", "POST"}:
            words.append(part.upper())
        elif i > 0 and part.lower() in lower_words:
            words.append(part.lower())
        else:
            words.append(part.capitalize())
    return " ".join(words)


def extract_summary_title(content: str) -> Optional[str]:
    m = SUMMARY_SECTION_RE.search(content)
    if not m:
        return None
    body = m.group("body").strip()
    if not body:
        return None
    first_para = body.split("\n\n", 1)[0].strip()
    first_line = first_para.splitlines()[0].strip()
    first_line = re.sub(r"^[-*]\s+", "", first_line)
    first_line = re.sub(r"\s+", " ", first_line)
    if not first_line:
        return None
    # Keep the title concise for Linear.
    title = first_line.rstrip(".")
    if len(title) > 110:
        title = title[:107].rstrip() + "..."
    return title


def infer_priority_from_content(content: str) -> Optional[int]:
    m = PRIORITY_LINE_RE.search(content)
    if not m:
        return None
    val = m.group("value").strip().lower()
    return DEFAULT_PRIORITY_MAP.get(val)


def load_backlog_docs(folder: Path) -> List[BacklogDoc]:
    docs: List[BacklogDoc] = []
    for path in sorted(folder.glob("*.md")):
        if path.name == README_INDEX:
            continue
        m = FILE_NAME_RE.match(path.name)
        if not m:
            print(f"Skipping non-ticket markdown: {path.name}", file=sys.stderr)
            continue
        content = path.read_text(encoding="utf-8")
        issue_key = m.group("key")
        slug = m.group("slug")
        title = extract_summary_title(content) or slug_to_title(slug)
        inferred_priority = infer_priority_from_content(content)
        docs.append(
            BacklogDoc(
                path=path,
                issue_key=issue_key,
                slug=slug,
                title=title,
                content=content,
                inferred_priority=inferred_priority,
            )
        )
    return docs


class LinearClient:
    def __init__(self, api_key: str, timeout: int = 60) -> None:
        self.api_key = api_key
        self.timeout = timeout
        self.session = requests.Session()
        # Linear docs show Authorization: <API_KEY> for personal API keys.
        self.session.headers.update(
            {
                "Authorization": api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "linear-backlog-uploader/1.0",
            }
        )

    def graphql(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        payload = {"query": query, "variables": variables or {}}
        resp = self.session.post(LINEAR_API_URL, json=payload, timeout=self.timeout)
        try:
            data = resp.json()
        except Exception as exc:
            raise LinearError(f"Non-JSON response from Linear: {resp.status_code} {resp.text[:500]}") from exc

        if resp.status_code >= 400:
            raise LinearError(f"HTTP {resp.status_code}: {json.dumps(data, indent=2)}")

        if data.get("errors"):
            raise LinearError(json.dumps(data["errors"], indent=2))

        return data.get("data", {})

    def get_viewer(self) -> Dict[str, Any]:
        q = """
        query Viewer {
          viewer {
            id
            name
            email
          }
        }
        """
        return self.graphql(q)["viewer"]

    def get_teams(self) -> List[Dict[str, Any]]:
        q = """
        query Teams {
          teams {
            nodes {
              id
              key
              name
            }
          }
        }
        """
        return self.graphql(q)["teams"]["nodes"]

    def resolve_team(self, team_id: Optional[str], team_key: Optional[str], team_name: Optional[str]) -> Dict[str, Any]:
        if team_id:
            q = """
            query Team($id: String!) {
              team(id: $id) {
                id
                key
                name
              }
            }
            """
            return self.graphql(q, {"id": team_id})["team"]

        teams = self.get_teams()
        if team_key:
            for t in teams:
                if (t.get("key") or "").lower() == team_key.lower():
                    return t
        if team_name:
            for t in teams:
                if (t.get("name") or "").lower() == team_name.lower():
                    return t

        available = ", ".join(f"{t['key']} ({t['name']})" for t in teams)
        
        raise LinearError(
            f"Could not resolve team from "
            f"team_id={team_id!r}, team_key={team_key!r}, team_name={team_name!r}. "
            f"Available teams: {available}"
)

    def get_projects(self) -> List[Dict[str, Any]]:
        q = """
        query Projects {
          projects {
            nodes {
              id
              name
            }
          }
        }
        """
        return self.graphql(q)["projects"]["nodes"]

    def resolve_project(self, project_id: Optional[str], project_name: Optional[str]) -> Optional[Dict[str, Any]]:
        if not project_id and not project_name:
            return None
        if project_id:
            q = """
            query Project($id: String!) {
              project(id: $id) {
                id
                name
              }
            }
            """
            return self.graphql(q, {"id": project_id})["project"]

        for p in self.get_projects():
            if (p.get("name") or "").lower() == project_name.lower():
                return p
        raise LinearError(f"Could not resolve project by name: {project_name}")

    def get_labels(self) -> List[Dict[str, Any]]:
        q = """
        query Labels {
          issueLabels {
            nodes {
              id
              name
            }
          }
        }
        """
        return self.graphql(q)["issueLabels"]["nodes"]

    def resolve_labels(self, label_names: Iterable[str]) -> List[Dict[str, Any]]:
        wanted = {name.strip().lower(): name.strip() for name in label_names if name.strip()}
        if not wanted:
            return []
        all_labels = self.get_labels()
        found: List[Dict[str, Any]] = []
        missing: List[str] = []
        for lower_name, original in wanted.items():
            match = next((l for l in all_labels if (l.get("name") or "").lower() == lower_name), None)
            if match:
                found.append(match)
            else:
                missing.append(original)
        if missing:
            raise LinearError(
                "These labels do not exist in Linear yet: "
                + ", ".join(missing)
                + ". Create them first, or omit --apply-label."
            )
        return found

    def create_issue(
        self,
        *,
        team_id: str,
        title: str,
        description: str,
        priority: Optional[int] = None,
        project_id: Optional[str] = None,
        label_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        q = """
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
        input_obj: Dict[str, Any] = {
            "teamId": team_id,
            "title": title,
            "description": description,
        }
        if priority is not None:
            input_obj["priority"] = priority
        if project_id:
            input_obj["projectId"] = project_id
        if label_ids:
            input_obj["labelIds"] = label_ids

        result = self.graphql(q, {"input": input_obj})["issueCreate"]
        if not result.get("success"):
            raise LinearError(f"Issue creation did not succeed for title: {title}")
        return result["issue"]


def normalise_priority(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    value = value.strip().lower()
    if value.isdigit():
        return int(value)
    if value in DEFAULT_PRIORITY_MAP:
        return DEFAULT_PRIORITY_MAP[value]
    raise ValueError(f"Unsupported priority value: {value}")


def build_title(doc: BacklogDoc, include_issue_key: bool) -> str:
    if include_issue_key:
        return f"{doc.issue_key}: {doc.title}"
    return doc.title


def main() -> int:
    parser = argparse.ArgumentParser(description="Upload markdown backlog files to Linear as issues")
    parser.add_argument("--folder", required=True, help="Folder containing .md issue files")
    parser.add_argument("--team-id", help="Linear team UUID")
    parser.add_argument("--team-key", help="Linear team key, e.g. ENG")
    parser.add_argument("--team-name", help="Linear team name")
    parser.add_argument("--project-id", help="Optional Linear project UUID")
    parser.add_argument("--project", help="Optional Linear project name")
    parser.add_argument("--apply-label", action="append", default=[], help="Existing Linear label to apply; can be repeated")
    parser.add_argument("--default-priority", help="Default priority: 1/2/3/4 or urgent/high/medium/low")
    parser.add_argument("--use-file-priority", action="store_true", help="Use priority inferred from markdown if present")
    parser.add_argument("--include-issue-key-in-title", action="store_true", help="Prefix issue title with ticket key, e.g. CSR-009")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be created without creating issues")
    parser.add_argument("--delay-seconds", type=float, default=0.2, help="Delay between issue creation calls")
    parser.add_argument("--manifest-json", help="Write created issue manifest to JSON file")
    parser.add_argument("--manifest-csv", help="Write created issue manifest to CSV file")
    parser.add_argument("--api-key", help="Linear API key. Falls back to LINEAR_API_KEY env var")

    args = parser.parse_args()

    api_key = args.api_key or os.getenv("LINEAR_API_KEY")
    if not api_key:
        print("Error: provide --api-key or set LINEAR_API_KEY", file=sys.stderr)
        return 2

    folder = Path(args.folder)
    if not folder.is_dir():
        print(f"Error: folder not found: {folder}", file=sys.stderr)
        return 2

    docs = load_backlog_docs(folder)
    if not docs:
        print(f"No ticket markdown files found in: {folder}", file=sys.stderr)
        return 2

    default_priority = normalise_priority(args.default_priority) if args.default_priority else None

    client = LinearClient(api_key=api_key)
    viewer = client.get_viewer()
    print(f"Authenticated to Linear as {viewer['name']} <{viewer['email']}>")

    team = client.resolve_team(args.team_id, args.team_key, args.team_name)
    print(f"Using team: {team['key']} ({team['name']}) [{team['id']}]")

    project = client.resolve_project(args.project_id, args.project)
    if project:
        print(f"Using project: {project['name']} [{project['id']}]")

    labels = client.resolve_labels(args.apply_label)
    if labels:
        print("Using labels:", ", ".join(l["name"] for l in labels))

    manifest: List[Dict[str, Any]] = []

    for doc in docs:
        title = build_title(doc, include_issue_key=args.include_issue_key_in_title)
        issue_priority = doc.inferred_priority if args.use_file_priority and doc.inferred_priority is not None else default_priority

        print(f"\n---\n{doc.path.name}")
        print(f"Title: {title}")
        if issue_priority is not None:
            print(f"Priority: {issue_priority}")

        if args.dry_run:
            manifest.append(
                {
                    "source_file": str(doc.path),
                    "issue_key": doc.issue_key,
                    "title": title,
                    "status": "dry-run",
                }
            )
            continue

        created = client.create_issue(
            team_id=team["id"],
            title=title,
            description=doc.content,
            priority=issue_priority,
            project_id=project["id"] if project else None,
            label_ids=[label["id"] for label in labels] if labels else None,
        )
        print(f"Created: {created['identifier']} -> {created['url']}")
        manifest.append(
            {
                "source_file": str(doc.path),
                "issue_key": doc.issue_key,
                "title": title,
                "linear_id": created["id"],
                "linear_identifier": created["identifier"],
                "linear_url": created["url"],
            }
        )
        time.sleep(args.delay_seconds)

    if args.manifest_json:
        Path(args.manifest_json).write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        print(f"\nWrote JSON manifest: {args.manifest_json}")

    if args.manifest_csv:
        with open(args.manifest_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=sorted({k for row in manifest for k in row.keys()}))
            writer.writeheader()
            writer.writerows(manifest)
        print(f"Wrote CSV manifest: {args.manifest_csv}")

    print(f"\nDone. Processed {len(docs)} markdown files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
