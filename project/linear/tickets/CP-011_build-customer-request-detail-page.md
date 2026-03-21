## Summary
Create a detail page where a customer can view the information and status for a single servicing order.

## Why
Customers need to confirm the exact change they requested and see the current workflow state.

## Context
The page should show request type, dates, request details, and current status, but must never show internal notes.

## In Scope
- Display request type, dates, request details, and status
- Load detail by servicing order ID in customer context
- Hide internal notes and staff-only fields

## Out of Scope
- CSR-only controls such as status update or note entry
- Customer-visible rejection reasoning unless added later

## Requirements
- Only the authenticated customer’s own request may be retrieved
- Customer-facing responses must exclude internal notes

## Acceptance Criteria
- [ ] Detail page displays request type
- [ ] Detail page displays submitted and last updated dates
- [ ] Detail page displays request details
- [ ] Detail page displays current status
- [ ] Internal notes are not shown

## Validation
### Automated
- [ ] Response-shaping tests confirm internal notes are omitted in customer context
- [ ] UI tests cover detail rendering for supported request types

### Manual
- [ ] Open a request detail page as the owning customer and confirm displayed fields
- [ ] Inspect the view and confirm no internal notes are exposed

## Dependencies
- CP-010
- API-003

## Risks / Controls
- Risk: API parity with CSR detail may accidentally expose staff-only data
  - Control: Separate customer and CSR response shaping explicitly

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
