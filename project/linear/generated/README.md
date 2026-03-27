# Linear Import Bundle

Generated from `project/linear/tickets`.

## Files

- `linear_import.csv`: strict CSV for Linear import. Status is intentionally blank so the target team's default intake state is used.
- `linear_import_rich.csv`: planning matrix with milestone, order, dependency, and source-path metadata.
- `linear_dependencies.csv`: issue dependency edges for a post-import blocker-link pass.

## Suggested Project Setup

- Project: `Service Request Portal MVP`
- Labels: `API`, `CP`, `CSR`, `SEC`, `QA`
- Milestones:
  - CSR Processing (12 issues)
  - Customer Submission (5 issues)
  - Customer Tracking & Controls (4 issues)
  - Foundation (17 issues)
  - QA / UAT / Release (6 issues)

## Priority Mix

- High: 40
- Medium: 4

## Domain Label Mix

- API: 6
- CP: 12
- CSR: 14
- QA: 6
- SEC: 6

## Root Issues

- API-001, CP-001, CSR-001

## Import Flow

1. Create the project and milestone shells in Linear.
2. Create the five domain labels before import if your import path does not auto-create labels.
3. Import `linear_import.csv` into the target team.
4. Use `linear_import_rich.csv` to bulk-assign milestones and verify recommended order.
5. Use `linear_dependencies.csv` to apply `blocked by` relations after the issues exist in Linear.

## Notes

- The known `CSR-009` -> `CSR-010` -> `CSR-009` dependency loop from the ticket markdown has been normalized by removing `CSR-010` from `CSR-009`'s blocker list.
- Ticket descriptions in `linear_import.csv` include an `Import Metadata` section so milestone and dependency context is still visible even if you use CSV import rather than the direct API uploader.
