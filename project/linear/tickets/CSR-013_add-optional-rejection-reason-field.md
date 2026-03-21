## Summary
Support a structured rejection reason in addition to or instead of a free-text internal note for rejected requests.

## Why
A structured rejection reason can improve consistency in rejected request handling and later customer communications if adopted.

## Context
This is a post-MVP usability and data-quality enhancement. Exposure rules for any customer-facing use must be defined before release.

## In Scope
- Add an optional rejection reason input for rejected requests
- Store the rejection reason when supplied
- Define where the rejection reason is shown in staff context

## Out of Scope
- Automatic customer notifications
- Customer-visible rejection reason without explicit design approval

## Requirements
- Rejection reason is optional
- Customer visibility rules must be explicitly defined before exposure outside staff context

## Acceptance Criteria
- [ ] CSR can optionally supply a rejection reason
- [ ] Rejection reason is stored when provided
- [ ] Exposure rules for customer visibility are defined before release

## Validation
### Automated
- [ ] Tests cover storing a rejection reason and leaving it empty
- [ ] Response-shaping tests confirm visibility rules are enforced

### Manual
- [ ] Reject a request with and without a rejection reason and confirm behaviour

## Dependencies
- CSR-009
- CSR-011
- API-004

## Risks / Controls
- Risk: Rejection reasons may be exposed before policy is agreed
  - Control: Keep them staff-only until explicit approval

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
