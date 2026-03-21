## Summary
Build the customer login flow for the customer-facing portal using the bank-approved authentication mechanism.

## Why
This enables customers to securely access the portal and is the entry point for all customer self-service activity.

## Context
Customer users need a separate authenticated experience from CSR users. Unauthenticated users must be denied access to protected customer routes and APIs.

## In Scope
- Provide a customer login screen and authenticated session establishment
- Handle successful and failed login attempts
- Redirect authenticated customers to the customer dashboard
- Protect customer-facing routes behind authentication

## Out of Scope
- CSR authentication
- Customer profile editing outside the service request workflow

## Requirements
- Only authenticated customers can access customer portal functions
- Invalid or expired credentials are rejected
- Customer authentication must remain separate from CSR authentication

## Acceptance Criteria
- [ ] A customer login screen is available
- [ ] Valid customer credentials authenticate successfully
- [ ] Invalid or expired credentials are rejected
- [ ] Unauthenticated users cannot access protected customer routes
- [ ] Authenticated customers are redirected to the customer dashboard

## Validation
### Automated
- [ ] Authentication integration tests cover successful and failed login attempts
- [ ] Route protection tests cover unauthenticated access denial

### Manual
- [ ] Log in with valid customer credentials and confirm dashboard access
- [ ] Attempt access to a protected route without authentication and confirm denial

## Dependencies
- None

## Risks / Controls
- Risk: Misconfigured auth could expose customer routes
  - Control: Enforce route and API protection in both frontend and backend

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
