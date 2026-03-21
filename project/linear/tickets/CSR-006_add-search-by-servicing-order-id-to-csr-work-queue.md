## Summary
Enable CSR users to search the queue by servicing order ID.

## Why
CSRs need a precise way to locate a request when a reference has already been provided.

## Context
Servicing order ID search should return the exact matching request or a clear no-match state.

## In Scope
- Add servicing order ID search control to the queue
- Return the exact matching request where present
- Handle no-match state clearly

## Out of Scope
- Cross-entity search outside servicing orders
- Customer-facing reference search

## Requirements
- Search must support exact or approved ID matching
- Search remains restricted to CSR-authorised users

## Acceptance Criteria
- [ ] CSR can search by exact or supported servicing order ID match
- [ ] Matching request is returned accurately
- [ ] No-match state is handled clearly

## Validation
### Automated
- [ ] Search tests cover exact matching by servicing order ID
- [ ] No-match tests cover unknown IDs

### Manual
- [ ] Search for a known servicing order ID and confirm the expected request is returned
- [ ] Search for an unknown ID and confirm the no-match state

## Dependencies
- CSR-003

## Risks / Controls
- Risk: Formatting differences may cause false no-match results
  - Control: Normalise accepted ID input where appropriate

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
