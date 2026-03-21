## Summary
Add validation, standardised error payloads, and consistent failure responses across the servicing order API.

## Why
Consistent validation and error handling reduce ambiguity for portal clients and simplify QA and support.

## Context
The API should return predictable status codes and payload shapes for validation failures, auth failures, not found, and invalid workflow transitions.

## In Scope
- Validate request payloads consistently across endpoints
- Standardise error payload structure
- Return consistent HTTP status codes for common failure cases

## Out of Scope
- Extended business analytics in errors
- Non-standard endpoint-specific failure formats

## Requirements
- Validation errors return `400`
- Unauthenticated requests return `401`
- Forbidden operations return `403`
- Not found returns `404`
- Invalid workflow transitions return `409`

## Acceptance Criteria
- [ ] Validation errors return `400`
- [ ] Unauthenticated requests return `401`
- [ ] Forbidden operations return `403`
- [ ] Not found returns `404`
- [ ] Invalid workflow transitions return `409`
- [ ] Error payload structure is consistent

## Validation
### Automated
- [ ] Contract tests verify status codes and payload structure for each failure class
- [ ] Regression tests confirm endpoints use the shared error contract

### Manual
- [ ] Trigger representative validation, auth, not-found, and conflict errors and confirm consistent responses

## Dependencies
- API-001
- API-002
- API-003
- API-004

## Risks / Controls
- Risk: Inconsistent errors create fragile UI handling
  - Control: Adopt and enforce a single shared error contract

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
