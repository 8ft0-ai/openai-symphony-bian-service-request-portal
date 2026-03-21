## Summary
Enable CSRs to update servicing order status through the CSR portal in line with the approved manual workflow.

## Why
This allows CSRs to accurately track manual progress and gives customers visibility of where their request sits in the process.

## Context
The approved workflow supports `Pending` → `In Progress`, and `In Progress` → `Completed` or `Rejected`. Status updates depend on the servicing order update API and server-side workflow validation.

## In Scope
- Add a status update control to the CSR request detail screen
- Allow CSR users to select a valid next status
- Submit status changes through the update API
- Refresh the UI after successful update
- Display the updated status in detail and queue views
- Handle API validation and error responses in the UI

## Out of Scope
- Changing status from the customer portal
- New status values outside the approved MVP set
- Automatically applying customer profile changes to downstream systems
- Structured rejection reasons in this issue

## Requirements
- Only authenticated CSR users can update request status
- Status changes must use the servicing order update API
- Only valid transitions are allowed
- Updated status must persist and be visible on subsequent retrieval
- Updating status must not trigger straight-through processing or downstream auto-fulfilment
- Status changes must be attributable for audit purposes

## Acceptance Criteria
- [ ] A CSR can update a request from `Pending` to `In Progress` from the CSR detail screen
- [ ] A CSR can update a request from `In Progress` to `Completed`
- [ ] A CSR can update a request from `In Progress` to `Rejected`
- [ ] After a successful update, the new status is shown in the CSR detail view
- [ ] After a successful update, the new status is shown in the CSR queue view
- [ ] Invalid transitions are blocked and an appropriate error is shown
- [ ] Non-CSR users cannot access or use the status update control
- [ ] Updating status does not automatically apply the customer change to downstream systems

## Validation
### Automated
- [ ] API integration test covers valid status update from `Pending` to `In Progress`
- [ ] API integration test covers valid status update from `In Progress` to `Completed`
- [ ] API integration test covers invalid transition rejection
- [ ] Authorisation test confirms non-CSR user cannot update status
- [ ] UI integration test confirms updated status is rendered after successful response

### Manual
- [ ] Log in as CSR and update a `Pending` request to `In Progress`
- [ ] Confirm updated status appears in CSR detail and queue views
- [ ] Attempt invalid transition and confirm error behaviour
- [ ] Confirm customer channel shows updated status but no internal-only workflow controls
- [ ] Confirm no downstream profile update is automatically triggered by status change

## Dependencies
- CSR-008
- API-004
- CSR-010
- SEC-003
- SEC-005

## Risks / Controls
- Risk: Invalid transitions may be allowed in the UI or backend
  - Control: Enforce transition rules server-side and test negative paths
- Risk: Status change may be mistaken for fulfilment completion
  - Control: Explicitly separate workflow status tracking from downstream fulfilment
- Risk: Unauthorised users may gain access to CSR controls
  - Control: Enforce role-based access in both frontend and backend

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
