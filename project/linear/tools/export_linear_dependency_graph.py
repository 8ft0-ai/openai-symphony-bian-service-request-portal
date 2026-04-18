#!/usr/bin/env python3
"""
Export Linear dependency graphs as Mermaid, Graphviz DOT, and optional SVG.

This script can use either:
- live Linear issue relations for a project, or
- the generated `linear_dependencies.csv` file for offline verification.

Examples:

  export LINEAR_API_KEY=lin_api_xxx

  python3 project/linear/tools/export_linear_dependency_graph.py \
    --source linear \
    --project-slug service-request-portal-mvp-7b4ee5582c2d

  python3 project/linear/tools/export_linear_dependency_graph.py \
    --source linear \
    --project-slug service-request-portal-mvp-7b4ee5582c2d \
    --issue CP-001 \
    --depth 2

  python3 project/linear/tools/export_linear_dependency_graph.py \
    --source csv \
    --dependencies-csv project/linear/generated/linear_dependencies.csv
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import shutil
import subprocess
import sys
import textwrap
from collections import defaultdict, deque
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple

from upload_linear_backlog import LinearClient, LinearError


DEFAULT_DEPENDENCIES_CSV = Path("project/linear/generated/linear_dependencies.csv")
DEFAULT_OUTPUT_DIR = Path("project/linear/generated")
DOMAIN_ORDER = ["API", "CP", "CSR", "SEC", "QA"]
ISSUE_KEY_RE = re.compile(r"\b([A-Z]+-\d+)\b")
TITLE_KEY_RE = re.compile(r"^(?P<key>[A-Z]+-\d+):\s*(?P<title>.+)$")
IMPORT_METADATA_KEY_RE = re.compile(
    r"^\*\s+Issue key:\s+`(?P<key>[A-Z]+-\d+)`", re.MULTILINE
)
PROJECT_SLUG_RE = re.compile(r"/project/(?P<slug>[^/?#]+)")

DEFAULT_NODE_FILL = "#ffffff"
ROOT_NODE_FILL = "#ecfdf5"
FOCUS_NODE_FILL = "#fffbeb"
EXTERNAL_NODE_FILL = "#f8fafc"
DEFAULT_EDGE_COLOR = "#64748b"
STATE_BORDER_COLORS = {
    "Backlog": "#94a3b8",
    "Todo": "#2563eb",
    "In Progress": "#d97706",
    "In Review": "#7c3aed",
    "Done": "#059669",
    "Canceled": "#b91c1c",
    "Duplicate": "#6b7280",
}


@dataclass(frozen=True)
class Node:
    node_id: str
    identifier: str
    display_key: str
    title: str
    domain: str
    milestone: str = ""
    state: str = ""
    external: bool = False


@dataclass(frozen=True)
class GraphData:
    name: str
    slug: str
    source: str
    nodes: Dict[str, Node]
    edges: Set[Tuple[str, str]]


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "dependency-graph"


def parse_project_slug(url: str) -> str:
    match = PROJECT_SLUG_RE.search(url)
    if match:
        return match.group("slug")
    return slugify(url)


def extract_issue_key(title: str, description: str, identifier: str) -> str:
    title_match = TITLE_KEY_RE.match(title.strip())
    if title_match:
        return title_match.group("key")

    metadata_match = IMPORT_METADATA_KEY_RE.search(description or "")
    if metadata_match:
        return metadata_match.group("key")

    identifier_match = ISSUE_KEY_RE.search(identifier or "")
    if identifier_match:
        return identifier_match.group(1)

    title_fallback = ISSUE_KEY_RE.search(title or "")
    if title_fallback:
        return title_fallback.group(1)

    return identifier or title or "unknown"


def strip_issue_key_prefix(title: str, display_key: str) -> str:
    if title.startswith(f"{display_key}:"):
        return title[len(display_key) + 1 :].strip()
    return title.strip()


def domain_from_key(display_key: str) -> str:
    if "-" in display_key:
        return display_key.split("-", 1)[0]
    return "Other"


def normalise_issue(issue: Dict[str, object], *, external: bool) -> Node:
    title = str(issue.get("title") or "").strip()
    description = str(issue.get("description") or "")
    identifier = str(issue.get("identifier") or issue.get("id") or "").strip()
    display_key = extract_issue_key(title, description, identifier)
    return Node(
        node_id=str(issue["id"]),
        identifier=identifier or str(issue["id"]),
        display_key=display_key,
        title=strip_issue_key_prefix(title or identifier, display_key),
        domain=domain_from_key(display_key),
        milestone=str((issue.get("projectMilestone") or {}).get("name") or ""),
        state=str((issue.get("state") or {}).get("name") or ""),
        external=external,
    )


def load_csv_graph(path: Path) -> GraphData:
    nodes: Dict[str, Node] = {}
    edges: Set[Tuple[str, str]] = set()

    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            blocker_key = row["BlockingIssueKey"].strip()
            blocked_key = row["BlockedIssueKey"].strip()
            blocker_title = strip_issue_key_prefix(
                row["BlockingIssueTitle"].strip(), blocker_key
            )
            blocked_title = strip_issue_key_prefix(
                row["BlockedIssueTitle"].strip(), blocked_key
            )
            nodes.setdefault(
                blocker_key,
                Node(
                    node_id=blocker_key,
                    identifier=blocker_key,
                    display_key=blocker_key,
                    title=blocker_title,
                    domain=domain_from_key(blocker_key),
                ),
            )
            nodes.setdefault(
                blocked_key,
                Node(
                    node_id=blocked_key,
                    identifier=blocked_key,
                    display_key=blocked_key,
                    title=blocked_title,
                    domain=domain_from_key(blocked_key),
                ),
            )
            edges.add((blocker_key, blocked_key))

    if not nodes:
        raise LinearError(f"No dependency rows found in {path}")

    return GraphData(
        name=path.stem.replace("_", " "),
        slug=slugify(path.stem),
        source=f"csv:{path}",
        nodes=nodes,
        edges=edges,
    )


def fetch_projects(client: LinearClient) -> List[Dict[str, str]]:
    query = """
    query ProjectsForGraph {
      projects(first: 250) {
        nodes {
          id
          name
          url
        }
      }
    }
    """
    return client.graphql(query)["projects"]["nodes"]


def resolve_project(
    client: LinearClient,
    *,
    project_id: Optional[str],
    project_name: Optional[str],
    project_url: Optional[str],
    project_slug: Optional[str],
) -> Dict[str, str]:
    if project_id:
        query = """
        query ProjectForGraph($id: String!) {
          project(id: $id) {
            id
            name
            url
          }
        }
        """
        return client.graphql(query, {"id": project_id})["project"]

    if not any([project_name, project_url, project_slug]):
        raise LinearError(
            "Provide one of --project-id, --project-name, --project-url, or --project-slug"
        )

    for project in fetch_projects(client):
        if project_url and project["url"] == project_url:
            return project
        if project_name and project["name"].lower() == project_name.lower():
            return project
        if project_slug and parse_project_slug(project["url"]) == project_slug:
            return project

    raise LinearError(
        "Could not resolve project from "
        f"project_name={project_name!r}, project_url={project_url!r}, "
        f"project_slug={project_slug!r}"
    )


def fetch_project_issues(
    client: LinearClient, project_id: str
) -> Tuple[str, str, List[Dict[str, object]]]:
    query = """
    query ProjectIssuePage($id: String!, $after: String) {
      project(id: $id) {
        id
        name
        url
        issues(first: 250, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            identifier
            title
            description
            state {
              name
            }
            projectMilestone {
              name
            }
          }
        }
      }
    }
    """

    after: Optional[str] = None
    issues: List[Dict[str, object]] = []
    project_name = ""
    project_url = ""

    while True:
        project = client.graphql(query, {"id": project_id, "after": after})["project"]
        project_name = project["name"]
        project_url = project["url"]
        page = project["issues"]
        issues.extend(page["nodes"])

        if not page["pageInfo"]["hasNextPage"]:
            break
        after = page["pageInfo"]["endCursor"]

    return project_name, project_url, issues


def fetch_issue_relations(client: LinearClient, issue_id: str) -> List[Dict[str, object]]:
    query = """
    query IssueRelationsPage($id: String!, $after: String) {
      issue(id: $id) {
        relations(first: 250, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            type
            relatedIssue {
              id
              identifier
              title
              description
              state {
                name
              }
              projectMilestone {
                name
              }
            }
          }
        }
      }
    }
    """

    after: Optional[str] = None
    relations: List[Dict[str, object]] = []

    while True:
        issue = client.graphql(query, {"id": issue_id, "after": after})["issue"]
        page = issue["relations"]
        relations.extend(page["nodes"])

        if not page["pageInfo"]["hasNextPage"]:
            break
        after = page["pageInfo"]["endCursor"]

    return relations


def load_linear_graph(
    client: LinearClient,
    *,
    project_id: Optional[str],
    project_name: Optional[str],
    project_url: Optional[str],
    project_slug: Optional[str],
    include_external: bool,
) -> GraphData:
    project = resolve_project(
        client,
        project_id=project_id,
        project_name=project_name,
        project_url=project_url,
        project_slug=project_slug,
    )
    name, url, issues = fetch_project_issues(client, project["id"])

    nodes: Dict[str, Node] = {
        str(issue["id"]): normalise_issue(issue, external=False) for issue in issues
    }
    edges: Set[Tuple[str, str]] = set()

    for issue in issues:
        blocker_id = str(issue["id"])
        for relation in fetch_issue_relations(client, blocker_id):
            if relation["type"] != "blocks":
                continue
            related_issue = relation.get("relatedIssue")
            if not related_issue:
                continue

            blocked_id = str(related_issue["id"])
            if blocked_id not in nodes:
                if not include_external:
                    continue
                nodes[blocked_id] = normalise_issue(related_issue, external=True)
            edges.add((blocker_id, blocked_id))

    return GraphData(
        name=name,
        slug=parse_project_slug(url),
        source=f"linear:{url}",
        nodes=nodes,
        edges=edges,
    )


def build_alias_map(nodes: Iterable[Node]) -> Dict[str, str]:
    aliases: Dict[str, str] = {}
    for node in nodes:
        for alias in {node.node_id, node.identifier, node.display_key}:
            if alias:
                aliases.setdefault(alias.lower(), node.node_id)
    return aliases


def select_nodes(
    graph: GraphData, issue_ref: Optional[str], depth: int
) -> Tuple[Set[str], Optional[str]]:
    if not issue_ref:
        return set(graph.nodes.keys()), None

    aliases = build_alias_map(graph.nodes.values())
    focus_id = aliases.get(issue_ref.strip().lower())
    if not focus_id:
        raise LinearError(
            f"Could not resolve issue {issue_ref!r}. Use a project issue key, Linear identifier, or internal id."
        )

    outgoing: Dict[str, Set[str]] = defaultdict(set)
    incoming: Dict[str, Set[str]] = defaultdict(set)
    for blocker_id, blocked_id in graph.edges:
        outgoing[blocker_id].add(blocked_id)
        incoming[blocked_id].add(blocker_id)

    visited = {focus_id}
    frontier = deque([(focus_id, 0)])
    while frontier:
        node_id, current_depth = frontier.popleft()
        if current_depth >= depth:
            continue
        neighbours = outgoing[node_id] | incoming[node_id]
        for neighbour_id in neighbours:
            if neighbour_id in visited:
                continue
            visited.add(neighbour_id)
            frontier.append((neighbour_id, current_depth + 1))

    return visited, focus_id


def derive_group(node: Node, group_by: str) -> str:
    if group_by == "none":
        return ""
    if group_by == "milestone":
        return node.milestone or "(No milestone)"
    return node.domain or "Other"


def sort_group_names(group_names: Sequence[str]) -> List[str]:
    domain_positions = {name: i for i, name in enumerate(DOMAIN_ORDER)}
    return sorted(group_names, key=lambda name: (domain_positions.get(name, 999), name))


def shorten(text: str, width: int) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= width:
        return text
    return text[: width - 3].rstrip() + "..."


def wrap_html_lines(text: str, width: int, max_lines: int) -> str:
    chunks = textwrap.wrap(re.sub(r"\s+", " ", text).strip(), width=width)
    if not chunks:
        return ""
    if len(chunks) > max_lines:
        kept = chunks[:max_lines]
        kept[-1] = shorten(" ".join(chunks[max_lines - 1 :]), width)
        chunks = kept
    return "<br/>".join(escape_html(chunk) for chunk in chunks)


def wrap_text_lines(text: str, width: int, max_lines: int) -> str:
    chunks = textwrap.wrap(re.sub(r"\s+", " ", text).strip(), width=width)
    if not chunks:
        return ""
    if len(chunks) > max_lines:
        kept = chunks[:max_lines]
        kept[-1] = shorten(" ".join(chunks[max_lines - 1 :]), width)
        chunks = kept
    return "\n".join(chunks)


def escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def dot_quote(text: str) -> str:
    return '"' + text.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n") + '"'


def mermaid_label(node: Node, mode: str) -> str:
    if mode == "identifier":
        return escape_html(node.identifier)
    if mode == "key":
        return escape_html(node.display_key)
    if mode == "key-title":
        title = wrap_html_lines(node.title, width=24, max_lines=2)
        if not title or title == escape_html(node.display_key):
            return escape_html(node.display_key)
        return f"{escape_html(node.display_key)}<br/>{title}"
    raise ValueError(f"Unsupported Mermaid label mode: {mode}")


def dot_label(node: Node, include_state: bool) -> str:
    wrapped_title = wrap_text_lines(node.title, width=28, max_lines=3)
    parts = [node.display_key]
    if wrapped_title and wrapped_title != node.display_key:
        parts.append(wrapped_title)
    if include_state and node.state:
        parts.append(f"[{node.state}]")
    return "\n".join(parts)


def compute_degrees(
    node_ids: Set[str], edges: Set[Tuple[str, str]]
) -> Tuple[Dict[str, int], Dict[str, int]]:
    indegree = {node_id: 0 for node_id in node_ids}
    outdegree = {node_id: 0 for node_id in node_ids}
    for blocker_id, blocked_id in edges:
        if blocker_id not in node_ids or blocked_id not in node_ids:
            continue
        indegree[blocked_id] += 1
        outdegree[blocker_id] += 1
    return indegree, outdegree


def grouped_nodes(
    graph: GraphData, node_ids: Set[str], group_by: str
) -> List[Tuple[str, List[Node]]]:
    buckets: Dict[str, List[Node]] = defaultdict(list)
    for node_id in node_ids:
        node = graph.nodes[node_id]
        buckets[derive_group(node, group_by)].append(node)

    groups: List[Tuple[str, List[Node]]] = []
    for group_name in sort_group_names(list(buckets.keys())):
        groups.append(
            (
                group_name,
                sorted(
                    buckets[group_name],
                    key=lambda node: (node.domain, node.display_key, node.identifier),
                ),
            )
        )
    return groups


def build_mermaid(
    graph: GraphData,
    *,
    node_ids: Set[str],
    edges: Set[Tuple[str, str]],
    focus_id: Optional[str],
    group_by: str,
    label_mode: str,
) -> str:
    indegree, _ = compute_degrees(node_ids, edges)
    root_ids = {node_id for node_id, degree in indegree.items() if degree == 0}

    if label_mode == "auto":
        resolved_label_mode = "key-title" if focus_id else "key"
    else:
        resolved_label_mode = label_mode

    groups = grouped_nodes(graph, node_ids, group_by)
    ordered_nodes = [node for _, group_nodes in groups for node in group_nodes]
    mermaid_ids = {node.node_id: f"n{index}" for index, node in enumerate(ordered_nodes, start=1)}

    lines = [
        "%% Generated by project/linear/tools/export_linear_dependency_graph.py",
        f"%% Source: {graph.source}",
        "flowchart LR",
        "  classDef default fill:#ffffff,stroke:#475569,stroke-width:1px,color:#0f172a;",
        "  classDef root fill:#ecfdf5,stroke:#059669,stroke-width:1.5px,color:#0f172a;",
        "  classDef focus fill:#fffbeb,stroke:#d97706,stroke-width:3px,color:#0f172a;",
        "  classDef external fill:#f8fafc,stroke:#94a3b8,stroke-dasharray: 4 2,color:#0f172a;",
    ]

    for group_name, nodes in groups:
        if group_name:
            subgraph_id = slugify(group_name).replace("-", "_") or "group"
            lines.append(f'  subgraph {subgraph_id}["{escape_html(group_name)}"]')
            lines.append("    direction TB")
            indent = "    "
        else:
            indent = "  "

        for node in nodes:
            lines.append(
                f'{indent}{mermaid_ids[node.node_id]}["{mermaid_label(node, resolved_label_mode)}"]'
            )

        if group_name:
            lines.append("  end")

    for blocker_id, blocked_id in sorted(
        edges,
        key=lambda edge: (
            graph.nodes[edge[0]].display_key,
            graph.nodes[edge[1]].display_key,
        ),
    ):
        lines.append(f"  {mermaid_ids[blocker_id]} --> {mermaid_ids[blocked_id]}")

    for node in ordered_nodes:
        mermaid_id = mermaid_ids[node.node_id]
        if focus_id == node.node_id:
            lines.append(f"  class {mermaid_id} focus;")
        elif node.external:
            lines.append(f"  class {mermaid_id} external;")
        elif node.node_id in root_ids:
            lines.append(f"  class {mermaid_id} root;")

    return "\n".join(lines) + "\n"


def node_fill(node: Node, root_ids: Set[str], focus_id: Optional[str]) -> str:
    if focus_id == node.node_id:
        return FOCUS_NODE_FILL
    if node.external:
        return EXTERNAL_NODE_FILL
    if node.node_id in root_ids:
        return ROOT_NODE_FILL
    return DEFAULT_NODE_FILL


def node_border(node: Node) -> str:
    return STATE_BORDER_COLORS.get(node.state, "#475569")


def build_dot(
    graph: GraphData,
    *,
    node_ids: Set[str],
    edges: Set[Tuple[str, str]],
    focus_id: Optional[str],
    group_by: str,
) -> str:
    indegree, _ = compute_degrees(node_ids, edges)
    root_ids = {node_id for node_id, degree in indegree.items() if degree == 0}
    groups = grouped_nodes(graph, node_ids, group_by)

    title_suffix = ""
    if focus_id:
        focus_node = graph.nodes[focus_id]
        title_suffix = f" - {focus_node.display_key} depth subgraph"

    lines = [
        "digraph Dependencies {",
        "  rankdir=LR;",
        "  graph [",
        f"    label={dot_quote(graph.name + title_suffix)},",
        '    labelloc="t",',
        '    labeljust="l",',
        '    fontname="Helvetica",',
        "    fontsize=16,",
        "    pad=0.2,",
        "    nodesep=0.35,",
        "    ranksep=0.65,",
        "    splines=true",
        "  ];",
        '  node [shape=box, style="rounded,filled", fillcolor="#ffffff", color="#475569", fontname="Helvetica", fontsize=10, margin="0.14,0.08"];',
        f"  edge [color={dot_quote(DEFAULT_EDGE_COLOR)}, arrowsize=0.7, penwidth=1.0];",
    ]

    cluster_index = 0
    for group_name, nodes in groups:
        if group_name:
            lines.append(f"  subgraph cluster_{cluster_index} {{")
            lines.append(f"    label={dot_quote(group_name)};")
            lines.append('    color="#cbd5e1";')
            lines.append('    style="rounded";')
            lines.append('    penwidth=1.0;')
            indent = "    "
            cluster_index += 1
        else:
            indent = "  "

        for node in nodes:
            lines.append(
                indent
                + f"{dot_quote(node.node_id)} "
                + "["
                + ", ".join(
                    [
                        f"label={dot_quote(dot_label(node, include_state=bool(focus_id)))}",
                        f"fillcolor={dot_quote(node_fill(node, root_ids, focus_id))}",
                        f"color={dot_quote(node_border(node))}",
                    ]
                )
                + "];"
            )

        if group_name:
            lines.append("  }")

    for blocker_id, blocked_id in sorted(
        edges,
        key=lambda edge: (
            graph.nodes[edge[0]].display_key,
            graph.nodes[edge[1]].display_key,
        ),
    ):
        lines.append(
            f"  {dot_quote(blocker_id)} -> {dot_quote(blocked_id)};"
        )

    lines.append("}")
    return "\n".join(lines) + "\n"


def render_svg(dot_text: str, path: Path) -> None:
    dot_binary = shutil.which("dot")
    if not dot_binary:
        raise LinearError("Graphviz `dot` is not installed; cannot render SVG.")

    result = subprocess.run(
        [dot_binary, "-Tsvg", "-o", str(path)],
        input=dot_text,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        stderr = result.stderr.strip() or result.stdout.strip()
        raise LinearError(f"Graphviz render failed: {stderr}")


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def default_output_prefix(graph: GraphData, focus_id: Optional[str], depth: int) -> Path:
    base_name = f"{graph.slug}-deps"
    if focus_id:
        base_name = f"{graph.slug}-{graph.nodes[focus_id].display_key.lower()}-d{depth}-deps"
    return DEFAULT_OUTPUT_DIR / base_name


def resolve_source(args: argparse.Namespace) -> str:
    if args.source:
        return args.source
    if any([args.project_id, args.project_name, args.project_url, args.project_slug]):
        return "linear"
    return "csv"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export dependency graphs for a Linear project or dependency CSV"
    )
    parser.add_argument(
        "--source",
        choices=["linear", "csv"],
        help="Data source. Defaults to linear when project args are provided, otherwise csv.",
    )
    parser.add_argument(
        "--dependencies-csv",
        default=str(DEFAULT_DEPENDENCIES_CSV),
        help="Path to linear_dependencies.csv for offline export",
    )
    parser.add_argument("--project-id", help="Linear project UUID")
    parser.add_argument("--project-name", help="Linear project name")
    parser.add_argument("--project-url", help="Linear project URL")
    parser.add_argument(
        "--project-slug",
        help="Linear project slug suffix, e.g. service-request-portal-mvp-7b4ee5582c2d",
    )
    parser.add_argument(
        "--issue",
        help="Focus the graph on one issue key, Linear identifier, or internal issue id",
    )
    parser.add_argument(
        "--depth",
        type=int,
        default=1,
        help="Traversal depth around --issue when exporting a focused subgraph",
    )
    parser.add_argument(
        "--group-by",
        choices=["domain", "milestone", "none"],
        default="domain",
        help="How to cluster nodes in the output",
    )
    parser.add_argument(
        "--include-external",
        action="store_true",
        help="Include related issues outside the project when using --source linear",
    )
    parser.add_argument(
        "--label-mode",
        choices=["auto", "key", "key-title", "identifier"],
        default="auto",
        help="Mermaid node label style",
    )
    parser.add_argument(
        "--output-prefix",
        help="Write <prefix>.mmd, <prefix>.dot, and <prefix>.svg",
    )
    parser.add_argument(
        "--no-svg",
        action="store_true",
        help="Skip Graphviz SVG rendering",
    )
    parser.add_argument(
        "--api-key",
        help="Linear API key. Falls back to LINEAR_API_KEY when using --source linear",
    )
    return parser.parse_args()


def main() -> int:
    try:
        args = parse_args()
        if args.depth < 0:
            print("--depth must be >= 0", file=sys.stderr)
            return 2
        source = resolve_source(args)
        if source == "linear":
            api_key = args.api_key or os.getenv("LINEAR_API_KEY")
            if not api_key:
                print(
                    "Error: provide --api-key or set LINEAR_API_KEY for --source linear",
                    file=sys.stderr,
                )
                return 2
            client = LinearClient(api_key=api_key)
            viewer = client.get_viewer()
            print(f"Authenticated to Linear as {viewer['name']} <{viewer['email']}>")
            graph = load_linear_graph(
                client,
                project_id=args.project_id,
                project_name=args.project_name,
                project_url=args.project_url,
                project_slug=args.project_slug,
                include_external=args.include_external,
            )
        else:
            graph = load_csv_graph(Path(args.dependencies_csv))

        group_by = args.group_by
        if group_by == "milestone" and not any(
            node.milestone for node in graph.nodes.values()
        ):
            print(
                "Milestone grouping is unavailable for this source; falling back to domain.",
                file=sys.stderr,
            )
            group_by = "domain"

        selected_ids, focus_id = select_nodes(graph, args.issue, args.depth)
        selected_edges = {
            edge
            for edge in graph.edges
            if edge[0] in selected_ids and edge[1] in selected_ids
        }

        output_prefix = (
            Path(args.output_prefix)
            if args.output_prefix
            else default_output_prefix(graph, focus_id, args.depth)
        )
        mermaid_path = output_prefix.with_suffix(".mmd")
        dot_path = output_prefix.with_suffix(".dot")
        svg_path = output_prefix.with_suffix(".svg")

        mermaid_text = build_mermaid(
            graph,
            node_ids=selected_ids,
            edges=selected_edges,
            focus_id=focus_id,
            group_by=group_by,
            label_mode=args.label_mode,
        )
        dot_text = build_dot(
            graph,
            node_ids=selected_ids,
            edges=selected_edges,
            focus_id=focus_id,
            group_by=group_by,
        )

        ensure_parent(mermaid_path)
        mermaid_path.write_text(mermaid_text, encoding="utf-8")
        dot_path.write_text(dot_text, encoding="utf-8")

        print(
            f"Exported {len(selected_ids)} node(s) and {len(selected_edges)} edge(s) "
            f"from {graph.source}"
        )
        print(f"Wrote Mermaid: {mermaid_path}")
        print(f"Wrote DOT: {dot_path}")

        if not args.no_svg:
            render_svg(dot_text, svg_path)
            print(f"Wrote SVG: {svg_path}")

        return 0
    except LinearError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("Interrupted.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
