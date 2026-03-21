## Summary
Ensure only authenticated CSR users can access CSR portal functions and staff request operations.

## Why
This protects staff functions from customer access and ensures only authorised users can manage servicing orders.

## Context
CSR users need access to the queue, detail views, notes, and status updates. Non-CSR users must be blocked.

## In Scope
- Restrict CSR routes to authenticated staff
- Block non-CSR users from staff-only APIs and screens
- Permit authorised CSR access to queue and detail views

## Out of Scope
- Fine-grained supervisor permissions
- Customer data ownership rules beyond what is needed for CSR access

## Requirements
- CSR-only actions are blocked for non-CSR users
- Authorised CSRs can access the service request queue and detail views

## Acceptance Criteria
- [ ] CSR routes require staff authentication
- [ ] CSR-only actions are blocked for non-CSR users
- [ ] Authorised CSR users can access the service request queue and detail views

## Validation
### Automated
- [ ] Authorisation tests cover denial of CSR routes to customer users
- [ ] API tests cover denial of CSR-only operations in non-CSR context

### Manual
- [ ] Log in as a customer and confirm CSR routes are denied
- [ ] Log in as a CSR and confirm staff routes are accessible

## Dependencies
- CSR-001

## Risks / Controls
- Risk: Missing backend checks may allow API access despite hidden UI controls
  - Control: Enforce role checks server-side as well as in the UI

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
