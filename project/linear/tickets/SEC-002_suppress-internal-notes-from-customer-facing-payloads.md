## Summary
Ensure internal notes and other staff-only data are excluded from customer-facing API responses and UI views.

## Why
Internal notes are for staff operations only and must not be visible to customers.

## Context
The same servicing order can be viewed by customers and CSRs, but only CSR contexts may receive internal notes.

## In Scope
- Exclude internal notes from customer API responses
- Ensure customer UI renders no internal notes
- Preserve note visibility in CSR contexts

## Out of Scope
- Broader data-classification work outside servicing orders
- Changing CSR note visibility

## Requirements
- Customer-facing responses omit internal notes
- CSR-facing responses continue to include internal notes where authorised

## Acceptance Criteria
- [ ] Customer API response omits internal notes
- [ ] Customer UI renders no internal notes
- [ ] CSR UI still renders internal notes correctly

## Validation
### Automated
- [ ] Response-shaping tests confirm omission in customer context and inclusion in CSR context
- [ ] UI regression tests confirm customer views do not render notes

### Manual
- [ ] Open the same request in customer and CSR contexts and compare visible fields

## Dependencies
- API-003
- CP-011
- CSR-008

## Risks / Controls
- Risk: Shared DTOs or serializers may leak note data
  - Control: Use explicit role-specific response mapping

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
