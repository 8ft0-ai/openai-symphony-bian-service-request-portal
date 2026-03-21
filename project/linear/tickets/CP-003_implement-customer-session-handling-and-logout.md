## Summary
Add customer session handling, timeout behaviour, and logout flow consistent with portal security requirements.

## Why
Customers need a stable and secure authenticated session, and the bank needs sessions to expire and terminate correctly.

## Context
The customer portal must preserve authenticated access during normal use while preventing continued access after logout or expiry.

## In Scope
- Session creation and persistence for authenticated customers
- Logout flow that ends the session
- Session expiry handling and re-authentication prompts

## Out of Scope
- Single sign-on enhancements beyond MVP
- CSR session handling

## Requirements
- Authenticated sessions persist correctly during valid use
- Logout ends the customer session
- Expired sessions require re-authentication

## Acceptance Criteria
- [ ] Authenticated customer session persists correctly during valid use
- [ ] Logout ends the session
- [ ] Session expiry prevents further protected access
- [ ] Expired sessions require re-authentication

## Validation
### Automated
- [ ] Session expiry tests cover protected route denial after timeout
- [ ] Logout tests confirm session invalidation

### Manual
- [ ] Log in, navigate across customer pages, and confirm session continuity
- [ ] Log out and confirm protected pages are no longer accessible

## Dependencies
- CP-001

## Risks / Controls
- Risk: Stale sessions may keep sensitive pages available
  - Control: Invalidate session tokens and enforce backend checks

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
