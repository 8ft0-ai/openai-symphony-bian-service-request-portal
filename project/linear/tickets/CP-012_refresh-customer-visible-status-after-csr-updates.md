## Summary
Ensure the customer portal reflects CSR status changes in real time or near real time.

## Why
Customers need trustworthy visibility of progress without contacting staff for status updates.

## Context
When a CSR changes a request to `In Progress`, `Completed`, or `Rejected`, the customer portal should show the updated status after refresh or near-real-time update.

## In Scope
- Refresh request history and detail status after CSR updates
- Implement polling, refresh, or another approved update mechanism
- Minimise stale status behaviour and document expected behaviour

## Out of Scope
- Outbound notifications
- Customer-visible internal workflow controls

## Requirements
- CSR updates must be reflected in customer-visible status
- Status updates must not expose internal notes or staff-only data

## Acceptance Criteria
- [ ] Customer sees updated request status after CSR action
- [ ] Updated status appears without manual support intervention
- [ ] Stale status behaviour is minimised and documented

## Validation
### Automated
- [ ] Integration tests cover status propagation from CSR update to customer views
- [ ] UI tests confirm updated status renders in history and detail views

### Manual
- [ ] Update a request as a CSR and confirm the customer view reflects the new status
- [ ] Confirm no additional staff-only fields become visible during refresh

## Dependencies
- CP-010
- CP-011
- CSR-009
- API-004

## Risks / Controls
- Risk: Status may appear stale and undermine trust
  - Control: Set a clear refresh strategy and verify it in testing

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
