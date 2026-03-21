## Summary
Implement explicit controls so the system cannot auto-complete servicing orders or auto-apply profile changes without CSR action.

## Why
This enforces the single most important control requirement in the project.

## Context
The portal is a workflow tracker for manual servicing. It must not automatically complete requests or trigger downstream customer profile updates.

## In Scope
- Prevent auto-completion of servicing orders
- Prevent automatic downstream profile update triggers from portal actions
- Provide test evidence that no straight-through processing path exists

## Out of Scope
- Future controlled fulfilment integration after policy change
- Operational activity outside the portal

## Requirements
- New requests remain in `Pending` until CSR action
- No automatic transition to `Completed`
- No automated downstream profile update occurs from this portal

## Acceptance Criteria
- [ ] New requests remain in `Pending` until CSR action
- [ ] No automatic transition to `Completed`
- [ ] No automated downstream profile update occurs from this portal
- [ ] Business rule is verified in test evidence

## Validation
### Automated
- [ ] End-to-end tests confirm submission alone does not complete a request
- [ ] Integration tests confirm portal actions do not call downstream fulfilment paths

### Manual
- [ ] Submit a request and confirm it remains pending until a CSR acts
- [ ] Verify no downstream profile change occurs from submission or status update alone

## Dependencies
- API-001
- API-004

## Risks / Controls
- Risk: Hidden integrations may create accidental straight-through processing
  - Control: Review boundaries explicitly and test for absence of auto-fulfilment

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
