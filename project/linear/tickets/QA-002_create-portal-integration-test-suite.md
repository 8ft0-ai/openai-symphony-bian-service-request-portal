## Summary
Build integration or end-to-end tests for customer and CSR journeys across the portal.

## Why
Portal-level tests confirm the UI and API work together for the main user journeys.

## Context
The suite should cover login, request submission, queue handling, detail views, status updates, and note workflows.

## In Scope
- Cover customer login and request submission flows
- Cover customer history and detail views
- Cover CSR queue, filter, search, detail, status update, and note flows

## Out of Scope
- Broad performance testing
- Supervisor feature testing

## Requirements
- Both customer and CSR journeys must be covered
- Integration tests must include key negative paths where practical

## Acceptance Criteria
- [ ] Customer login and submission flows are covered
- [ ] Customer request history and detail flows are covered
- [ ] CSR queue, filter, search, and detail flows are covered
- [ ] CSR status update and note flows are covered

## Validation
### Automated
- [ ] Implement end-to-end coverage for the specified journeys

### Manual
- [ ] Review integration test reports and verify the expected journeys are covered

## Dependencies
- CP-008
- CP-010
- CP-011
- CSR-003
- CSR-008
- CSR-009
- CSR-011

## Risks / Controls
- Risk: Untested UI-to-API integration may cause late-stage failures
  - Control: Run the suite against release candidates

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
