Here is a concrete example using **CSR-009: Add CSR status update control**, rewritten in the stronger project-specific template.

```markdown
## Summary
Enable CSRs to update servicing order status through the CSR portal in line with the approved manual workflow.

## Why
This allows Customer Service Representatives to accurately track manual progress on customer service requests and gives customers visibility of where their request sits in the process.

It supports operations, customer transparency, and auditability, while enforcing the core business rule that requests are manually reviewed and not auto-processed.

## Context
This issue implements the CSR-facing status update capability described in the PRD and delivery pack.

The portal supports a manual servicing workflow only. A CSR must be able to update a request as they work it, using the approved status path:
- `Pending` → `In Progress`
- `In Progress` → `Completed`
- `In Progress` → `Rejected`

This issue depends on the servicing order update API and must align with the status transition rules enforced server-side.

Related issues:
- CSR-008 Build CSR request detail page
- API-004 Implement `PUT /ServicingOrder/{servicingOrderId}/Update`
- CSR-010 Enforce valid status transitions
- SEC-003 Capture audit metadata for status changes
- SEC-005 Block automated completion and downstream auto-fulfilment paths

## In Scope
- add a status update control to the CSR request detail screen
- allow CSR users to select a valid next status
- submit the status change through the servicing order update API
- refresh the UI after a successful update
- display the updated status in the CSR detail view and queue view
- handle API validation and error responses in the UI

## Out of Scope
- changing status from the customer portal
- introducing new status values beyond the approved MVP set
- automatically applying the requested customer profile change to downstream systems
- adding structured rejection reasons in this issue
- changing workflow rules outside the approved transition model

## Requirements
- only authenticated CSR users can update request status
- status changes must use the servicing order update API
- only valid transitions are allowed
- updated status must persist and be visible on subsequent retrieval
- customer-visible status must reflect the CSR update after refresh or near-real-time update
- this capability must not trigger straight-through processing or downstream auto-fulfilment
- status changes must be attributable for audit purposes

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
- CSR-008 Build CSR request detail page
- API-004 Implement `PUT /ServicingOrder/{servicingOrderId}/Update`
- CSR-010 Enforce valid status transitions
- SEC-003 Capture audit metadata for status changes
- SEC-005 Block automated completion and downstream auto-fulfilment paths

## Risks / Controls
- Risk: invalid transitions may be allowed in the UI or backend
  - Control: enforce transition rules server-side and test negative paths

- Risk: status change may be mistaken for fulfilment completion
  - Control: explicitly separate workflow status tracking from downstream fulfilment

- Risk: unauthorised users may gain access to CSR controls
  - Control: enforce role-based access in both frontend and backend

## Notes
- Prefer dropdown or button-based status controls with only valid next states shown where practical
- Backend validation remains mandatory even if the UI hides invalid options
- Consider disabling the control while update is in progress to prevent duplicate submissions
```

This is the level of detail I would use for:

* customer-facing features
* CSR workflow features
* API features
* security/control-heavy tasks

For smaller tasks, I would trim the same structure down.

A good next step would be to convert one issue from each category so you have reusable exemplars:

* one **customer UI** issue
* one **CSR workflow** issue
* one **API** issue
* one **security/control** issue
* one **QA/UAT** issue
