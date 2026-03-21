## Summary
Create a CSR detail view for a single servicing order with enough information to review and process it manually.

## Why
CSRs need a complete view of the customer request, including old and requested new values, before taking action.

## Context
The CSR detail page is the operational surface for reviewing a request, adding notes, and changing status.

## In Scope
- Display customer information, request type, and request details
- Show old versus new values clearly
- Show request history and internal notes

## Out of Scope
- Customer-facing request detail
- Supervisor-only workflow features

## Requirements
- Only authenticated CSR users can access the page
- The page must show the information needed for manual review

## Acceptance Criteria
- [ ] Detail page shows customer information
- [ ] Detail page shows request type
- [ ] Detail page shows old and requested new values
- [ ] Detail page shows request history
- [ ] Detail page shows internal notes

## Validation
### Automated
- [ ] UI tests cover rendering of supported request types and note history
- [ ] Authorisation tests confirm only CSR users can access the page

### Manual
- [ ] Open a request as a CSR and confirm all expected fields are visible
- [ ] Confirm the page distinguishes old versus requested new values clearly

## Dependencies
- CSR-003
- API-003

## Risks / Controls
- Risk: Poor information layout may slow manual handling
  - Control: Prioritise comparison of old and requested new values in the UI

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
