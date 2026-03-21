## Summary
Create a request history view showing all servicing orders for the authenticated customer only.

## Why
Customers need a single place to track the requests they have already submitted.

## Context
The history list should show request type, submission date, and status, and must not include other customers’ requests.

## In Scope
- List the authenticated customer’s servicing orders
- Show key request metadata in the history view
- Handle empty state when no requests exist

## Out of Scope
- CSR queue functions
- Customer-visible internal notes or staff-only metadata

## Requirements
- Only the authenticated customer’s requests may be shown
- The history list must support later navigation to request detail

## Acceptance Criteria
- [ ] Request history displays customer’s requests only
- [ ] Each row shows request type, submission date, and status
- [ ] Empty state is handled if no requests exist

## Validation
### Automated
- [ ] List rendering tests cover populated and empty states
- [ ] Authorisation tests confirm cross-customer records are not returned

### Manual
- [ ] Log in as a customer with existing requests and confirm the list contents
- [ ] Log in as a customer with no requests and confirm the empty state

## Dependencies
- CP-001
- CP-002
- API-002

## Risks / Controls
- Risk: Customer list endpoint may leak staff fields
  - Control: Use role-aware response shaping and UI filtering

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
