## Summary
Build the API endpoint used by CSRs to update request status and add internal notes.

## Why
This endpoint persists the key operational actions performed by CSRs during manual servicing.

## Context
The endpoint must require CSR-authenticated context, support valid status transitions, and append internal notes when supplied.

## In Scope
- Accept update requests from CSR-authenticated context
- Persist valid status changes
- Append internal notes when supplied
- Return the updated servicing order

## Out of Scope
- Customer-initiated updates
- Automatic fulfilment of requested profile changes

## Requirements
- CSR authentication is required
- Status transition must be valid
- Internal notes must include required fields when supplied
- Invalid transitions must be rejected

## Acceptance Criteria
- [ ] CSR-authenticated context is required
- [ ] Valid status transitions are persisted
- [ ] Optional internal note is appended correctly
- [ ] Invalid transitions return `409` or equivalent error
- [ ] Response includes updated servicing order

## Validation
### Automated
- [ ] Contract tests cover valid status updates and note appends
- [ ] Error tests cover invalid transitions and unauthorised access

### Manual
- [ ] Call the endpoint as a CSR and confirm status and note updates persist
- [ ] Attempt an invalid transition and confirm the error response

## Dependencies
- API-001

## Risks / Controls
- Risk: Update endpoint may become a hidden fulfilment path
  - Control: Keep it limited to workflow state and note changes only

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
