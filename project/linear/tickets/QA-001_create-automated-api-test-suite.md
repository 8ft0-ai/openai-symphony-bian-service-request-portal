## Summary
Build automated tests covering the servicing order API happy paths, negative paths, validation, and authorisation cases.

## Why
Reliable API test coverage reduces regression risk and supports confident release decisions.

## Context
The servicing order API underpins both portals, so its contracts and controls need broad automated coverage.

## In Scope
- Cover initiate, list, detail, and update endpoints
- Cover validation failures and auth failures
- Cover key workflow rules such as invalid status transitions

## Out of Scope
- UI end-to-end tests
- Operational reporting validation

## Requirements
- All core API endpoints must be covered
- Negative paths and authorisation paths must be tested

## Acceptance Criteria
- [ ] Initiate endpoint is covered
- [ ] List endpoint is covered
- [ ] Detail endpoint is covered
- [ ] Update endpoint is covered
- [ ] Validation and auth failures are covered

## Validation
### Automated
- [ ] Implement the automated API suite itself

### Manual
- [ ] Review test reports and confirm coverage of required endpoints and failure classes

## Dependencies
- API-001
- API-002
- API-003
- API-004
- API-005

## Risks / Controls
- Risk: Gaps in API test coverage may hide control regressions
  - Control: Make the suite part of release gating

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
