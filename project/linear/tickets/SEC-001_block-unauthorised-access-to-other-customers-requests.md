## Summary
Implement and verify controls preventing customers from retrieving servicing orders that do not belong to them.

## Why
This is a core privacy and access-control requirement for the product.

## Context
Customer users must only ever see their own servicing orders, regardless of UI path or direct API request attempts.

## In Scope
- Enforce ownership checks on customer request retrieval
- Deny cross-customer access through UI and API
- Cover the control with automated tests

## Out of Scope
- CSR access rules beyond normal staff authorisation
- Supervisor-specific exceptions

## Requirements
- Cross-customer access attempts are denied
- Denial behaviour is consistent across UI and API

## Acceptance Criteria
- [ ] Cross-customer access attempts are denied
- [ ] Denial behaviour is consistent across UI and API
- [ ] Control is covered by automated tests

## Validation
### Automated
- [ ] Authorisation tests cover direct API attempts against another customer’s request
- [ ] UI tests cover blocked navigation where applicable

### Manual
- [ ] Attempt to open another customer’s request while logged in as a customer and confirm denial

## Dependencies
- CP-002
- API-003

## Risks / Controls
- Risk: Identifier guessing or direct linking may expose data
  - Control: Enforce ownership checks server-side on every read

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
