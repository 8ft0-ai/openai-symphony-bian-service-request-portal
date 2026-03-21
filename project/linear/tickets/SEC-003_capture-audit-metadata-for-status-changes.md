## Summary
Persist and expose audit metadata for status changes, including actor and timestamp.

## Why
Operations and risk stakeholders need servicing order status changes to be attributable and traceable.

## Context
Status updates are key operational actions and must be logged and persisted with enough metadata for audit and support.

## In Scope
- Store actor identity for each status change
- Store timestamp for each status change
- Make audit metadata retrievable for authorised internal use

## Out of Scope
- Customer-visible audit history
- Advanced reporting and analytics

## Requirements
- Every status update stores actor identity
- Every status update stores timestamp

## Acceptance Criteria
- [ ] Every status update stores actor identity
- [ ] Every status update stores timestamp
- [ ] Audit metadata is retrievable for authorised internal use

## Validation
### Automated
- [ ] Persistence tests confirm actor and timestamp are stored for status changes
- [ ] Read tests confirm metadata remains available to authorised internal consumers

### Manual
- [ ] Update a request status as a CSR and verify actor and timestamp are recorded

## Dependencies
- API-004

## Risks / Controls
- Risk: Missing metadata weakens audit posture
  - Control: Make audit capture part of the update transaction

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
