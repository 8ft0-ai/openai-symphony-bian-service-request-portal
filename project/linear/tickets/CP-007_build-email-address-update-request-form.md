## Summary
Create a customer form for submitting an email address change request.

## Why
Customers need a secure and straightforward way to request email updates while preserving manual review controls.

## Context
The form must show the current email address and allow a new requested email to be entered for CSR review.

## In Scope
- Display the current email address clearly
- Allow entry of a requested new email address
- Validate email format and required fields before submission

## Out of Scope
- Automatic email address changes in downstream systems
- Email verification flows beyond the service request process

## Requirements
- The request is submitted for manual review only
- The form must show current versus requested values clearly

## Acceptance Criteria
- [ ] Current email is pre-filled or displayed clearly
- [ ] Customer can enter a new email address
- [ ] Form validation prevents invalid or empty submission
- [ ] Submission triggers servicing order creation with request type `Email Update`

## Validation
### Automated
- [ ] Validation tests cover empty and malformed email submissions
- [ ] Integration test confirms request type `Email Update` is sent to the API

### Manual
- [ ] Open the email form and confirm the current email is shown
- [ ] Submit a valid new email and confirm the request proceeds

## Dependencies
- CP-004
- API-001

## Risks / Controls
- Risk: Customers may expect immediate confirmation of the new email as active
  - Control: Use UI wording that the request is pending manual review

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
