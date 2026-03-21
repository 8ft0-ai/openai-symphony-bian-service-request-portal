## Summary
Improve the CSR queue with pagination and sorting to support growing request volumes.

## Why
Operational queues need to remain usable as the number of requests increases.

## Context
This is a scalability and usability enhancement for the CSR queue rather than a core MVP workflow capability.

## In Scope
- Add pagination or incremental loading to the queue
- Add sorting by submission date and or status
- Keep queue interaction responsive with larger datasets

## Out of Scope
- Complex analytics or supervisor views
- Changes to the servicing workflow itself

## Requirements
- Pagination and sorting must not change authorisation behaviour
- Queue remains usable with larger request volumes

## Acceptance Criteria
- [ ] Queue supports pagination or incremental loading
- [ ] Queue supports sorting by submission date and or status
- [ ] Queue remains usable with larger request volumes

## Validation
### Automated
- [ ] UI tests cover pagination controls and sorting behaviour
- [ ] Integration tests cover paged queue retrieval

### Manual
- [ ] Load a queue with multiple pages of data and confirm navigation works
- [ ] Apply sorting and confirm record order changes correctly

## Dependencies
- CSR-003
- API-002

## Risks / Controls
- Risk: Pagination may mask records unexpectedly during triage
  - Control: Provide clear paging state and sort order indicators

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
