## Summary
Implement controls ensuring the portal supports manual processing only and does not auto-fulfil customer changes.

## Why
This enforces the project’s central business rule and avoids accidental straight-through processing.

## Context
The portal is a workflow and tracking layer. It must not automatically apply address, phone, or email changes to downstream systems.

## In Scope
- Ensure requests remain in manual workflow states until CSR action
- Block automatic completion behaviour
- Prevent automatic downstream profile update triggers from this portal

## Out of Scope
- Post-approval downstream integration
- Any straight-through processing path

## Requirements
- No request is auto-completed upon submission
- No request automatically updates downstream customer master data
- Manual workflow remains explicit and testable

## Acceptance Criteria
- [ ] No request is auto-completed upon submission
- [ ] No request triggers downstream profile update automatically
- [ ] Workflow remains in manual states until CSR action occurs

## Validation
### Automated
- [ ] End-to-end tests confirm submission alone does not complete a request
- [ ] Integration tests confirm no downstream fulfilment path is triggered by portal actions

### Manual
- [ ] Submit a request and confirm it remains pending until CSR action
- [ ] Verify no downstream profile data changes occur from portal submission alone

## Dependencies
- CSR-009
- API-004
- SEC-005

## Risks / Controls
- Risk: Implicit integrations may introduce accidental fulfilment
  - Control: Review integration boundaries and test for absence of auto-processing

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
