## Summary
Connect customer request forms to the servicing order initiate API so valid submissions create servicing orders.

## Why
This is the core integration that turns customer input into trackable servicing orders.

## Context
Address, phone, and email update forms all rely on `POST /ServicingOrder/Initiate` to create a request with initial status `Pending`.

## In Scope
- Call the initiate API from each customer request form
- Handle successful and failed API responses
- Return the created servicing order reference to the UI

## Out of Scope
- Direct updates to downstream profile systems
- CSR status updates

## Requirements
- Successful submission creates a servicing order
- Errors must be surfaced clearly to the customer
- Created requests must enter the manual workflow with status `Pending`

## Acceptance Criteria
- [ ] Form submission calls the initiate API
- [ ] Successful response returns a servicing order ID
- [ ] Unsuccessful responses show an appropriate error state
- [ ] Created request appears in customer request history

## Validation
### Automated
- [ ] Integration tests cover successful submission from each request type
- [ ] Error handling tests cover API validation and failure responses

### Manual
- [ ] Submit each request type and confirm a servicing order is created
- [ ] Trigger an API validation failure and confirm the UI displays an error

## Dependencies
- CP-005
- CP-006
- CP-007
- API-001

## Risks / Controls
- Risk: Requests may be submitted without enough feedback to the customer
  - Control: Show confirmation state with reference and initial status

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
