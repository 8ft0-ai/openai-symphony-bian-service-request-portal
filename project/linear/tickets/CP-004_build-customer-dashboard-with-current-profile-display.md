## Summary
Create the customer dashboard showing the customer’s current personal information on record.

## Why
Customers need to understand what details are currently on file before they submit an update request.

## Context
The dashboard is the landing experience after login and should show address, phone number, and email address where available.

## In Scope
- Display current address, phone number, and email on file
- Load dashboard after successful login
- Handle empty or partially populated profile fields gracefully

## Out of Scope
- Direct editing of profile data
- CSR-only information or internal notes

## Requirements
- Dashboard data must reflect the source profile record presented to the portal
- Only the authenticated customer’s profile may be shown

## Acceptance Criteria
- [ ] Dashboard loads after successful login
- [ ] Current address is displayed where available
- [ ] Current phone number is displayed where available
- [ ] Current email address is displayed where available
- [ ] Displayed data matches the source provided to the portal

## Validation
### Automated
- [ ] UI tests cover dashboard rendering with full and partial profile data
- [ ] Authorisation tests confirm only the authenticated customer’s data is shown

### Manual
- [ ] Log in as a customer and confirm current profile fields are displayed correctly
- [ ] Verify the dashboard does not expose CSR-only information

## Dependencies
- CP-001
- CP-002

## Risks / Controls
- Risk: Incorrect source mapping may show stale data
  - Control: Use a clear profile source contract and verify test fixtures

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
