## Summary
Build the API endpoint to return a list of servicing orders for queue and history views.

## Why
Both the CSR queue and customer history depend on retrieving servicing orders in list form.

## Context
The endpoint must support status filtering and role-aware access. CSR users can see all relevant requests; customer access must remain restricted to their own records or be filtered through a service layer.

## In Scope
- Return a list of servicing orders
- Support filtering by status
- Enforce role-aware access boundaries

## Out of Scope
- Advanced analytics or reporting responses
- Supervisor-specific views

## Requirements
- Authorised callers can retrieve servicing order lists
- Role boundaries must be enforced
- Response data must support CSR queue requirements

## Acceptance Criteria
- [ ] Authorised callers can retrieve servicing order lists
- [ ] List supports filtering by status
- [ ] Role boundaries are enforced
- [ ] Response data supports CSR queue requirements

## Validation
### Automated
- [ ] Contract tests cover status filtering and role-based access
- [ ] List tests cover CSR queue and customer history retrieval cases

### Manual
- [ ] Retrieve the list as a CSR and confirm cross-customer queue data appears
- [ ] Retrieve the list in customer context and confirm only own requests are returned if applicable

## Dependencies
- API-001

## Risks / Controls
- Risk: Shared list endpoint may return too much data in customer context
  - Control: Apply strict role-aware filtering or separate service behaviour

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
