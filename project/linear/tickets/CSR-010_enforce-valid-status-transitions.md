## Summary
Implement workflow rules so invalid servicing order status transitions are blocked.

## Why
Controlled status transitions protect operational integrity and stop users from bypassing required manual workflow steps.

## Context
The MVP workflow permits `Pending` → `In Progress`, and `In Progress` → `Completed` or `Rejected`. Transitions such as `Pending` → `Completed` must be rejected.

## In Scope
- Define valid servicing order transitions
- Reject invalid transitions at the API and service layer
- Return clear error responses for invalid transition attempts

## Out of Scope
- New status values beyond the approved MVP set
- Supervisor override behaviour

## Requirements
- Server-side validation is mandatory even if the UI hides invalid options
- Invalid transitions must not persist

## Acceptance Criteria
- [ ] `Pending` to `Completed` is rejected
- [ ] `Pending` to `Rejected` is rejected unless explicitly allowed later
- [ ] Invalid transitions return a clear error
- [ ] Valid transitions succeed

## Validation
### Automated
- [ ] Contract tests cover all valid and invalid transition paths
- [ ] Error response tests confirm invalid transitions return the expected status code and payload

### Manual
- [ ] Attempt an invalid transition through the UI and confirm it is blocked
- [ ] Attempt each valid transition and confirm it succeeds

## Dependencies
- CSR-009
- API-004

## Risks / Controls
- Risk: UI-only validation could be bypassed
  - Control: Enforce workflow rules on the backend

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
