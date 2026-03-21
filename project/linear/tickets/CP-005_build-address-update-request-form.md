## Summary
Create a customer form for submitting an address change request.

## Why
Customers need a simple way to request an address update without directly changing bank master records.

## Context
The form must show the current address and accept the requested new address, creating a manual servicing request rather than an automatic change.

## In Scope
- Display the current address clearly
- Allow entry of a requested new address
- Validate required address fields before submission

## Out of Scope
- Automatic address updates to downstream systems
- Document upload for proof of address

## Requirements
- The request is a ticket for manual CSR review only
- The form must display current versus requested new value clearly

## Acceptance Criteria
- [ ] Current address is pre-filled or displayed clearly
- [ ] Customer can enter a new address
- [ ] Form validation prevents empty submission
- [ ] Submission triggers servicing order creation with request type `Address Update`

## Validation
### Automated
- [ ] Form validation tests cover empty and malformed submissions
- [ ] Integration test confirms request type `Address Update` is sent to the API

### Manual
- [ ] Open the address form and confirm the current address is shown
- [ ] Submit a valid new address and confirm the request proceeds

## Dependencies
- CP-004
- API-001

## Risks / Controls
- Risk: Users may assume the address is updated immediately
  - Control: Use clear UI wording that the request will be reviewed manually

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
