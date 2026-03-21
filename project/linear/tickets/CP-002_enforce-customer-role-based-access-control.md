## Summary
Implement authorisation controls so customer users can only access their own data and customer-facing screens.

## Why
This protects customer privacy and ensures customers cannot access CSR functions or other customers’ information.

## Context
Customer users must only retrieve their own profile data and their own servicing orders. Direct URL or API attempts against another customer’s records must be denied.

## In Scope
- Enforce customer-only access to customer portal routes
- Restrict API access to the authenticated customer’s own data
- Block access to CSR pages and CSR-only operations

## Out of Scope
- CSR permissions model beyond what is needed to block customer access
- Supervisor or admin roles

## Requirements
- Customers can retrieve only their own profile data
- Customers can retrieve only their own servicing orders
- Customers must not access CSR routes or CSR-only APIs

## Acceptance Criteria
- [ ] Customer users cannot access CSR routes
- [ ] Customer users cannot call CSR-only operations successfully
- [ ] Customer users can retrieve only their own data
- [ ] Direct URL or API attempts to access another customer’s request are denied

## Validation
### Automated
- [ ] Authorisation tests cover cross-customer access denial
- [ ] API tests cover denial of CSR-only operations in customer context

### Manual
- [ ] Attempt to access another customer’s request and confirm denial
- [ ] Attempt to access a CSR page while logged in as a customer and confirm denial

## Dependencies
- CP-001

## Risks / Controls
- Risk: Response shaping mistakes may leak data
  - Control: Enforce access checks server-side and test negative paths

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
