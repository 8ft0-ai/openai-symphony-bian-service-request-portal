## Summary
Allow CSR users to filter the queue by servicing order status.

## Why
CSRs need to narrow the queue to the work items most relevant to the task at hand.

## Context
The queue should support filtering by statuses such as `Pending`, `In Progress`, `Completed`, and `Rejected`.

## In Scope
- Add status filter control to the CSR queue
- Apply filter to queue results
- Support clear or reset filter behaviour

## Out of Scope
- Advanced multi-filter analytics
- Customer-facing status filtering

## Requirements
- Filtering must return only matching requests
- Only supported status values may be selectable

## Acceptance Criteria
- [ ] CSR can filter by supported status values
- [ ] Filtered list returns only matching requests
- [ ] Clear filter or reset behaviour is supported

## Validation
### Automated
- [ ] UI tests cover filter selection and result updates
- [ ] API or integration tests cover status-based queue retrieval

### Manual
- [ ] Apply each status filter and confirm the queue results are correct
- [ ] Clear the filter and confirm the full queue returns

## Dependencies
- CSR-003

## Risks / Controls
- Risk: Client-side filtering may diverge from server data
  - Control: Prefer server-backed filtering where practical

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
