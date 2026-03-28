#!/usr/bin/env python3
"""
Build a Linear import bundle from the markdown backlog.

Outputs:
- linear_import.csv: strict CSV for Linear CSV import
- linear_import_rich.csv: richer planning/export file with project and milestone metadata
- linear_dependencies.csv: issue dependency edges for a post-import linking pass
- README.md: import notes tailored to this backlog

The source of truth is split intentionally:
- ticket markdown files provide full issue descriptions
- linear.md provides explicit priority metadata
- a small override removes the known CSR-009 <-> CSR-010 dependency loop
"""

from __future__ import annotations

import argparse
import csv
import re
from collections import defaultdict, deque
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Sequence


README_INDEX = "README_index.md"
FILE_NAME_RE = re.compile(r"^(?P<key>[A-Z]+-\d+)[_-](?P<slug>.+)\.md$")
SUMMARY_SECTION_RE = re.compile(
    r"^##\s+Summary\s*\n(?P<body>.*?)(?:\n##\s+|\Z)", re.MULTILINE | re.DOTALL
)
DEPENDENCIES_SECTION_RE = re.compile(
    r"^##\s+Dependencies\s*\n(?P<body>.*?)(?:\n##\s+|\Z)", re.MULTILINE | re.DOTALL
)
LINEAR_ISSUE_BLOCK_RE = re.compile(
    r"^## Issue: (?P<key>[A-Z]+-\d+)\n(?P<body>.*?)(?=^## Issue: |\Z)",
    re.MULTILINE | re.DOTALL,
)
LINEAR_PRIORITY_RE = re.compile(r"^\*\*Priority:\*\*\s*(?P<priority>.+)$", re.MULTILINE)

PROJECT_NAME = "Service Request Portal MVP"
STRICT_IMPORT_HEADERS = ["Title", "Description", "Priority", "Status", "Labels", "Estimate"]
RICH_EXPORT_HEADERS = [
    "IssueKey",
    "LinearTitle",
    "Summary",
    "Priority",
    "Project",
    "Milestone",
    "StatusSuggestion",
    "Labels",
    "DependencyLayer",
    "RecommendedOrder",
    "BlockedBy",
    "Blocks",
    "SourceFile",
    "Description",
]
DEPENDENCY_HEADERS = [
    "BlockedIssueKey",
    "BlockedIssueTitle",
    "BlockingIssueKey",
    "BlockingIssueTitle",
    "RelationType",
    "Notes",
]

PRIORITY_DEFAULT = "High"
STATUS_SUGGESTION = "Backlog"
DEPENDENCY_REMOVALS = {"CSR-009": {"CSR-010"}}
PREFIX_LABELS = {
    "API": "API",
    "CP": "CP",
    "CSR": "CSR",
    "SEC": "SEC",
    "QA": "QA",
}


@dataclass(frozen=True)
class Ticket:
    issue_key: str
    slug: str
    title: str
    content: str
    path: Path
    priority: str
    dependencies: List[str]
    milestone: str
    label: str


def slug_to_title(slug: str) -> str:
    parts = re.split(r"[-_]+", slug)
    lower_words = {"a", "an", "the", "and", "or", "for", "to", "of", "in", "on", "by", "with", "from"}
    acronym_words = {"API", "CSR", "UAT", "QA", "MVP", "PUT", "GET", "POST", "ID"}
    words: List[str] = []
    for index, part in enumerate(parts):
        if not part:
            continue
        upper = part.upper()
        lower = part.lower()
        if upper in acronym_words:
            words.append(upper)
        elif index > 0 and lower in lower_words:
            words.append(lower)
        else:
            words.append(part.capitalize())
    return " ".join(words)


def extract_summary_title(content: str) -> str | None:
    match = SUMMARY_SECTION_RE.search(content)
    if not match:
        return None
    body = match.group("body").strip()
    if not body:
        return None
    first_para = body.split("\n\n", 1)[0].strip()
    first_line = first_para.splitlines()[0].strip()
    first_line = re.sub(r"^[-*]\s+", "", first_line)
    first_line = re.sub(r"\s+", " ", first_line).rstrip(".")
    return first_line or None


def extract_dependencies(content: str) -> List[str]:
    match = DEPENDENCIES_SECTION_RE.search(content)
    if not match:
        return []
    deps = [
        raw
        for raw in re.findall(r"^-\s+(\S+)", match.group("body"), re.MULTILINE)
        if raw != "None"
    ]
    return deps


def load_priority_map(linear_md: Path) -> Dict[str, str]:
    priorities: Dict[str, str] = {}
    text = linear_md.read_text(encoding="utf-8")
    for match in LINEAR_ISSUE_BLOCK_RE.finditer(text):
        issue_key = match.group("key")
        block = match.group("body")
        priority_match = LINEAR_PRIORITY_RE.search(block)
        if priority_match:
            priorities[issue_key] = priority_match.group("priority").strip()
    return priorities


def apply_dependency_overrides(issue_key: str, dependencies: Iterable[str]) -> List[str]:
    seen = set()
    ordered: List[str] = []
    removals = DEPENDENCY_REMOVALS.get(issue_key, set())
    for dep in dependencies:
        if dep in removals or dep in seen:
            continue
        seen.add(dep)
        ordered.append(dep)
    return ordered


def infer_milestone(issue_key: str) -> str:
    prefix, raw_num = issue_key.split("-", 1)
    number = int(raw_num)

    if prefix == "QA":
        return "QA / UAT / Release"
    if prefix == "SEC":
        if issue_key == "SEC-002":
            return "Customer Tracking & Controls"
        return "Foundation"
    if prefix == "API":
        if issue_key == "API-006":
            return "CSR Processing"
        return "Foundation"
    if prefix == "CP":
        if number <= 4:
            return "Foundation"
        if number <= 9:
            return "Customer Submission"
        return "Customer Tracking & Controls"
    if prefix == "CSR":
        if number <= 3:
            return "Foundation"
        return "CSR Processing"
    return "Foundation"


def load_tickets(folder: Path, priority_map: Dict[str, str]) -> List[Ticket]:
    tickets: List[Ticket] = []
    for path in sorted(folder.glob("*.md")):
        if path.name == README_INDEX:
            continue
        match = FILE_NAME_RE.match(path.name)
        if not match:
            continue
        issue_key = match.group("key")
        slug = match.group("slug")
        content = path.read_text(encoding="utf-8")
        title = extract_summary_title(content) or slug_to_title(slug)
        prefix = issue_key.split("-", 1)[0]
        priority = priority_map.get(issue_key, PRIORITY_DEFAULT)
        dependencies = apply_dependency_overrides(issue_key, extract_dependencies(content))
        tickets.append(
            Ticket(
                issue_key=issue_key,
                slug=slug,
                title=title,
                content=content,
                path=path,
                priority=priority,
                dependencies=dependencies,
                milestone=infer_milestone(issue_key),
                label=PREFIX_LABELS.get(prefix, prefix),
            )
        )
    return tickets


def topo_layers(tickets: Sequence[Ticket]) -> tuple[Dict[str, int], Dict[str, List[str]]]:
    ticket_map = {ticket.issue_key: ticket for ticket in tickets}
    indegree = {ticket.issue_key: 0 for ticket in tickets}
    blocks: Dict[str, List[str]] = defaultdict(list)

    for ticket in tickets:
        for dep in ticket.dependencies:
            if dep not in ticket_map:
                continue
            indegree[ticket.issue_key] += 1
            blocks[dep].append(ticket.issue_key)

    queue = deque(sorted(issue_key for issue_key, degree in indegree.items() if degree == 0))
    layers = {issue_key: 0 for issue_key in queue}
    processed = 0

    while queue:
        issue_key = queue.popleft()
        processed += 1
        for blocked_key in sorted(blocks.get(issue_key, [])):
            indegree[blocked_key] -= 1
            if indegree[blocked_key] == 0:
                layers[blocked_key] = layers[issue_key] + 1
                queue.append(blocked_key)

    if processed != len(tickets):
        unresolved = sorted(issue_key for issue_key, degree in indegree.items() if degree > 0)
        raise SystemExit(
            "Unresolved dependency cycle remains after overrides: " + ", ".join(unresolved)
        )

    for issue_key in blocks:
        blocks[issue_key] = sorted(blocks[issue_key])
    return layers, blocks


def build_linear_title(ticket: Ticket) -> str:
    return f"{ticket.issue_key}: {ticket.title}"


def build_import_description(ticket: Ticket, blocks: Sequence[str]) -> str:
    blocked_by = ", ".join(ticket.dependencies) if ticket.dependencies else "None"
    blocks_text = ", ".join(blocks) if blocks else "None"
    metadata = [
        "## Import Metadata",
        f"- Issue key: `{ticket.issue_key}`",
        f"- Project: {PROJECT_NAME}",
        f"- Milestone: {ticket.milestone}",
        f"- Domain label: `{ticket.label}`",
        f"- Priority: {ticket.priority}",
        f"- Blocked by: {blocked_by}",
        f"- Blocks: {blocks_text}",
        f"- Source file: `{ticket.path.as_posix()}`",
        "",
        "---",
        "",
    ]
    return "\n".join(metadata) + ticket.content.strip() + "\n"


def write_csv(path: Path, headers: Sequence[str], rows: Sequence[Dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(headers))
        writer.writeheader()
        writer.writerows(rows)


def build_readme(
    tickets: Sequence[Ticket],
    layers: Dict[str, int],
    output_dir: Path,
) -> str:
    milestone_counts: Dict[str, int] = defaultdict(int)
    label_counts: Dict[str, int] = defaultdict(int)
    priority_counts: Dict[str, int] = defaultdict(int)

    for ticket in tickets:
        milestone_counts[ticket.milestone] += 1
        label_counts[ticket.label] += 1
        priority_counts[ticket.priority] += 1

    roots = sorted(ticket.issue_key for ticket in tickets if not ticket.dependencies)
    lines = [
        "# Linear Import Bundle",
        "",
        f"Generated from `{output_dir.parent.joinpath('tickets').as_posix()}`.",
        "",
        "## Files",
        "",
        "- `linear_import.csv`: strict CSV for Linear import. Status is intentionally blank so the target team's default intake state is used.",
        "- `linear_import_rich.csv`: planning matrix with milestone, order, dependency, and source-path metadata.",
        "- `linear_dependencies.csv`: issue dependency edges for a post-import blocker-link pass.",
        "",
        "## Suggested Project Setup",
        "",
        f"- Project: `{PROJECT_NAME}`",
        "- Labels: `API`, `CP`, `CSR`, `SEC`, `QA`",
        "- Milestones:",
    ]
    for milestone in sorted(milestone_counts):
        lines.append(f"  - {milestone} ({milestone_counts[milestone]} issues)")
    lines.extend(
        [
            "",
            "## Priority Mix",
            "",
        ]
    )
    for priority in sorted(priority_counts, key=lambda value: ("Urgent", "High", "Medium", "Low").index(value)):
        lines.append(f"- {priority}: {priority_counts[priority]}")
    lines.extend(
        [
            "",
            "## Domain Label Mix",
            "",
        ]
    )
    for label in sorted(label_counts):
        lines.append(f"- {label}: {label_counts[label]}")
    lines.extend(
        [
            "",
            "## Root Issues",
            "",
            f"- {', '.join(roots)}",
            "",
            "## Import Flow",
            "",
            "1. Create the project and milestone shells in Linear.",
            "2. Create the five domain labels before import if your import path does not auto-create labels.",
            "3. Import `linear_import.csv` into the target team.",
            "4. Use `linear_import_rich.csv` to bulk-assign milestones and verify recommended order.",
            "5. Use `linear_dependencies.csv` to apply `blocked by` relations after the issues exist in Linear.",
            "",
            "## Notes",
            "",
            "- The known `CSR-009` -> `CSR-010` -> `CSR-009` dependency loop from the ticket markdown has been normalized by removing `CSR-010` from `CSR-009`'s blocker list.",
            "- Ticket descriptions in `linear_import.csv` include an `Import Metadata` section so milestone and dependency context is still visible even if you use CSV import rather than the direct API uploader.",
        ]
    )
    return "\n".join(lines) + "\n"


def build_rows(tickets: Sequence[Ticket]) -> tuple[List[Dict[str, str]], List[Dict[str, str]], List[Dict[str, str]], Dict[str, int]]:
    layers, blocks = topo_layers(tickets)
    ordered_tickets = sorted(tickets, key=lambda ticket: (layers[ticket.issue_key], ticket.issue_key))
    order_lookup = {ticket.issue_key: index + 1 for index, ticket in enumerate(ordered_tickets)}

    strict_rows: List[Dict[str, str]] = []
    rich_rows: List[Dict[str, str]] = []
    dependency_rows: List[Dict[str, str]] = []
    title_lookup = {ticket.issue_key: build_linear_title(ticket) for ticket in tickets}

    for ticket in ordered_tickets:
        blocked_by = ", ".join(ticket.dependencies)
        blocks_text = ", ".join(blocks.get(ticket.issue_key, []))
        description = build_import_description(ticket, blocks.get(ticket.issue_key, []))

        strict_rows.append(
            {
                "Title": title_lookup[ticket.issue_key],
                "Description": description,
                "Priority": ticket.priority,
                "Status": "",
                "Labels": ticket.label,
                "Estimate": "",
            }
        )

        rich_rows.append(
            {
                "IssueKey": ticket.issue_key,
                "LinearTitle": title_lookup[ticket.issue_key],
                "Summary": ticket.title,
                "Priority": ticket.priority,
                "Project": PROJECT_NAME,
                "Milestone": ticket.milestone,
                "StatusSuggestion": STATUS_SUGGESTION,
                "Labels": ticket.label,
                "DependencyLayer": str(layers[ticket.issue_key]),
                "RecommendedOrder": str(order_lookup[ticket.issue_key]),
                "BlockedBy": blocked_by,
                "Blocks": blocks_text,
                "SourceFile": ticket.path.as_posix(),
                "Description": description,
            }
        )

        for dep in ticket.dependencies:
            dependency_rows.append(
                {
                    "BlockedIssueKey": ticket.issue_key,
                    "BlockedIssueTitle": title_lookup[ticket.issue_key],
                    "BlockingIssueKey": dep,
                    "BlockingIssueTitle": title_lookup.get(dep, dep),
                    "RelationType": "blocked_by",
                    "Notes": "Derived from markdown Dependencies section",
                }
            )

    return strict_rows, rich_rows, dependency_rows, layers


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a Linear import bundle from markdown tickets")
    parser.add_argument(
        "--tickets-folder",
        default="project/linear/tickets",
        help="Folder containing markdown ticket files",
    )
    parser.add_argument(
        "--priority-source",
        default="project/linear/linear.md",
        help="Markdown file containing priority metadata",
    )
    parser.add_argument(
        "--output-dir",
        default="project/linear/generated",
        help="Directory where the bundle will be written",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    tickets_folder = Path(args.tickets_folder)
    priority_source = Path(args.priority_source)
    output_dir = Path(args.output_dir)

    if not tickets_folder.is_dir():
        raise SystemExit(f"Ticket folder not found: {tickets_folder}")
    if not priority_source.is_file():
        raise SystemExit(f"Priority source not found: {priority_source}")

    output_dir.mkdir(parents=True, exist_ok=True)

    priority_map = load_priority_map(priority_source)
    tickets = load_tickets(tickets_folder, priority_map)
    strict_rows, rich_rows, dependency_rows, layers = build_rows(tickets)

    write_csv(output_dir / "linear_import.csv", STRICT_IMPORT_HEADERS, strict_rows)
    write_csv(output_dir / "linear_import_rich.csv", RICH_EXPORT_HEADERS, rich_rows)
    write_csv(output_dir / "linear_dependencies.csv", DEPENDENCY_HEADERS, dependency_rows)
    readme = build_readme(tickets, layers, output_dir)
    (output_dir / "README.md").write_text(readme, encoding="utf-8")

    print(f"Wrote {output_dir / 'linear_import.csv'}")
    print(f"Wrote {output_dir / 'linear_import_rich.csv'}")
    print(f"Wrote {output_dir / 'linear_dependencies.csv'}")
    print(f"Wrote {output_dir / 'README.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
