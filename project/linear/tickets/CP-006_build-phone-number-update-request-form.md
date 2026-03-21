## Summary
Create a customer form for submitting a phone number change request.

## Why
Customers need a controlled way to request phone number updates through the manual servicing workflow.

## Context
The form must show the current phone number and allow the user to request a new number, without altering records directly.

## In Scope
- Display the current phone number clearly
- Allow entry of a requested new phone number
- Validate phone format and required fields before submission

## Out of Scope
- Automatic phone number updates to downstream systems
- Support for non-MVP request types

## Requirements
- The request remains subject to manual CSR review
- The form must show current and requested values clearly

## Acceptance Criteria
- [ ] Current phone number is pre-filled or displayed clearly
- [ ] Customer can enter a new phone number
- [ ] Form validation prevents invalid or empty submission
- [ ] Submission triggers servicing order creation with request type `Phone Update`

## Validation
### Automated
- [ ] Validation tests cover missing and malformed phone input
- [ ] Integration test confirms request type `Phone Update` is sent to the API

### Manual
- [ ] Open the phone update form and confirm the current phone number is shown
- [ ] Submit a valid new phone number and confirm the request proceeds

## Dependencies
- CP-004
- API-001

## Risks / Controls
- Risk: Input rules may reject valid formats unexpectedly
  - Control: Define accepted phone formatting rules and test representative examples

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
