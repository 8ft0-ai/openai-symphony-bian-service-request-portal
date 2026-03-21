## Summary
Enable CSR users to search the queue by customer name.

## Why
CSRs need to locate specific customer requests quickly during servicing activity.

## Context
Customer name search should work within the central queue and return relevant matching servicing orders.

## In Scope
- Add customer name search control to the queue
- Return matching requests accurately
- Handle no-match state clearly

## Out of Scope
- Advanced fuzzy search tuning beyond MVP
- Search across non-servicing entities

## Requirements
- Search must return accurate matches
- Search must remain restricted to CSR-authorised users

## Acceptance Criteria
- [ ] CSR can enter customer name search text
- [ ] Matching requests are returned accurately
- [ ] No-match state is handled clearly

## Validation
### Automated
- [ ] Search tests cover exact and partial supported matches
- [ ] Authorisation tests confirm search is available only to CSR users

### Manual
- [ ] Search by customer name and confirm the expected requests are returned
- [ ] Search for a non-existent name and confirm the no-match state

## Dependencies
- CSR-003

## Risks / Controls
- Risk: Overly broad matching may produce operational noise
  - Control: Define a clear search matching rule and verify expected results

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
