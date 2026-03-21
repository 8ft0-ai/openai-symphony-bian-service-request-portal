## Summary
Build the API endpoint to retrieve a single servicing order by ID, with role-based response shaping.

## Why
Customer and CSR detail views both rely on this endpoint, but they require different visibility rules.

## Context
Customers may retrieve only their own servicing orders and must not receive internal notes. CSRs may retrieve any authorised servicing order including internal notes.

## In Scope
- Return a servicing order by ID
- Enforce customer-versus-CSR authorisation rules
- Shape the response according to role

## Out of Scope
- Bulk retrieval
- Workflow mutation through the detail endpoint

## Requirements
- Unknown IDs return `404`
- Unauthorised access is denied
- Customer-facing responses exclude internal notes

## Acceptance Criteria
- [ ] Authorised caller can retrieve a valid servicing order
- [ ] Unknown ID returns `404`
- [ ] Unauthorised access is denied
- [ ] Customer-facing response excludes internal notes

## Validation
### Automated
- [ ] Contract tests cover valid retrieval, not found, and unauthorised cases
- [ ] Response-shaping tests confirm internal notes are omitted in customer context

### Manual
- [ ] Retrieve a request as a CSR and confirm internal notes are present
- [ ] Retrieve the same request as the owning customer and confirm internal notes are absent

## Dependencies
- API-001

## Risks / Controls
- Risk: Shared endpoint may leak staff-only data
  - Control: Implement explicit role-based shaping and test both paths

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
