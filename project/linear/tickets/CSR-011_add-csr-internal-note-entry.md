## Summary
Allow CSR users to add staff-only notes to a servicing order.

## Why
CSRs need a way to record internal servicing context and operational actions without exposing it to customers.

## Context
Internal notes are part of the servicing order record and must be visible to staff but never to customers.

## In Scope
- Provide note entry control in the CSR detail page
- Save internal note text to the servicing order
- Display saved notes in CSR context

## Out of Scope
- Customer-visible notes
- Structured rejection reasons in this issue

## Requirements
- Notes are staff-only
- Notes must be associated with the servicing order and retained in history

## Acceptance Criteria
- [ ] CSR can enter internal note text
- [ ] Note can be saved successfully
- [ ] Saved note appears in CSR detail view
- [ ] Note does not appear in customer view

## Validation
### Automated
- [ ] API tests cover note append behaviour
- [ ] Response-shaping tests confirm notes are excluded from customer responses

### Manual
- [ ] Add an internal note as a CSR and confirm it appears in staff view
- [ ] Open the same request in customer view and confirm the note is not visible

## Dependencies
- CSR-008
- API-004

## Risks / Controls
- Risk: Staff-only notes may leak through shared payloads
  - Control: Separate customer and CSR response shaping and test both

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
