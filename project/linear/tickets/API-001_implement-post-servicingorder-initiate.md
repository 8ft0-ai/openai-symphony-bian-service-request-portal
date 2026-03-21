## Summary
Build the API endpoint used by the customer portal to create a new servicing order.

## Why
This endpoint is the entry point for all customer-submitted update requests and creates the trackable workflow record.

## Context
The endpoint accepts an initiate payload and must create a servicing order with initial status `Pending` for manual CSR review.

## In Scope
- Accept valid initiate payloads
- Validate required fields and request type
- Create a servicing order with status `Pending`
- Return the created servicing order

## Out of Scope
- Downstream fulfilment of customer changes
- CSR status updates

## Requirements
- Customer-authenticated context is required
- Required fields and request details must be validated
- Created requests must enter the manual workflow only

## Acceptance Criteria
- [ ] Endpoint accepts valid initiate payload
- [ ] Endpoint validates required fields
- [ ] Endpoint creates servicing order with status `Pending`
- [ ] Endpoint returns created servicing order
- [ ] Invalid payloads return appropriate error responses

## Validation
### Automated
- [ ] Contract tests cover valid request creation and required-field validation
- [ ] Authorisation tests cover unauthenticated and mismatched customer context

### Manual
- [ ] Call the endpoint with a valid payload and confirm a servicing order is returned
- [ ] Call the endpoint with missing fields and confirm validation errors

## Dependencies
- None

## Risks / Controls
- Risk: Weak validation may create malformed workflow records
  - Control: Validate request type, customer context, and request details strictly

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
