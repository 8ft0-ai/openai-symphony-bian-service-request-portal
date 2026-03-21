## Summary
Build the staff login flow for CSRs, separate from the customer login flow.

## Why
CSRs need a secure entry point to the staff portal and operational queue.

## Context
CSR authentication must be distinct from customer authentication and should lead authorised staff to the CSR dashboard.

## In Scope
- Provide a CSR login screen and authenticated session establishment
- Handle successful and failed login attempts
- Redirect authenticated CSRs to the CSR dashboard
- Protect CSR routes behind staff authentication

## Out of Scope
- Customer authentication
- Supervisor or admin roles beyond CSR MVP access

## Requirements
- Only authenticated staff can access CSR routes
- CSR authentication remains separate from customer authentication

## Acceptance Criteria
- [ ] CSR login screen is available
- [ ] Valid staff credentials authenticate successfully
- [ ] Invalid credentials are rejected
- [ ] Unauthenticated users cannot access CSR routes
- [ ] Authenticated CSR users land on the CSR dashboard

## Validation
### Automated
- [ ] Authentication tests cover valid and invalid CSR login attempts
- [ ] Route protection tests cover unauthenticated access denial to CSR routes

### Manual
- [ ] Log in with valid CSR credentials and confirm dashboard access
- [ ] Attempt access to CSR routes without authentication and confirm denial

## Dependencies
- None

## Risks / Controls
- Risk: Shared auth configuration with customer flows may blur permissions
  - Control: Maintain separate auth and authorisation boundaries

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
