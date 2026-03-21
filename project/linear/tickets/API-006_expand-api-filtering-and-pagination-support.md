## Summary
Add richer filtering and pagination support to improve scalability for CSR queue use cases.

## Why
As request volume grows, queue retrieval needs more control and better performance characteristics.

## Context
This is a post-MVP enhancement building on the basic list endpoint to support pagination and broader filtering.

## In Scope
- Add pagination parameters to list retrieval
- Return enough metadata for paging
- Support additional filters in a backwards-compatible way

## Out of Scope
- Changes to core workflow rules
- Supervisor reporting endpoints

## Requirements
- Pagination must not weaken authorisation behaviour
- Additional filtering must remain backwards compatible

## Acceptance Criteria
- [ ] Pagination parameters are supported
- [ ] Response includes enough metadata for paging
- [ ] Additional filters can be added without breaking existing consumers

## Validation
### Automated
- [ ] Contract tests cover paged retrieval and response metadata
- [ ] Regression tests confirm existing consumers still work

### Manual
- [ ] Retrieve multiple pages of queue results and confirm paging behaviour

## Dependencies
- API-002

## Risks / Controls
- Risk: Paging design may complicate customer history unnecessarily
  - Control: Keep advanced paging focused on CSR queue use cases

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
