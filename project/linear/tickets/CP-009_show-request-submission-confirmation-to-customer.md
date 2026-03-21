## Summary
Display a clear confirmation state after a customer successfully submits a servicing request.

## Why
Customers need confidence that their request has been received and entered the workflow.

## Context
After a successful initiate API call, the portal should show a reference and the initial status so the customer can track it later.

## In Scope
- Show success confirmation after valid submission
- Display servicing order ID and initial status
- Provide navigation to request history or detail

## Out of Scope
- Outbound notifications
- Expanded workflow timeline beyond initial confirmation

## Requirements
- Confirmation must only display after a successful API response
- Initial status should be shown as `Pending`

## Acceptance Criteria
- [ ] Success message shown after valid submission
- [ ] Servicing order ID displayed
- [ ] Initial status displayed as `Pending`
- [ ] Customer can navigate to request history or request detail

## Validation
### Automated
- [ ] UI tests cover confirmation rendering after successful submission
- [ ] Integration tests confirm reference and status values are shown from the API response

### Manual
- [ ] Submit a valid request and confirm the success state displays correctly
- [ ] Use the confirmation links to navigate to request history or detail

## Dependencies
- CP-008

## Risks / Controls
- Risk: Weak confirmation may drive avoidable contact centre follow-up
  - Control: Provide a prominent reference and clear next step

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
