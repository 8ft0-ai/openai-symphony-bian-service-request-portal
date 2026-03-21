## Summary
Add logging for important security and workflow events, including failed access attempts and request lifecycle actions.

## Why
Support, security, and operations teams need observable records of important events and failures.

## Context
Key events include request creation, status updates, note additions, and access denials.

## In Scope
- Log access denials
- Log request initiation events
- Log status update events
- Log internal note events

## Out of Scope
- Full analytics pipeline implementation
- Customer-visible event history

## Requirements
- Logs must be accessible to authorised operational support
- Logging must not expose sensitive data unnecessarily

## Acceptance Criteria
- [ ] Access denials are logged
- [ ] Request initiation events are logged
- [ ] Status update events are logged
- [ ] Internal note events are logged
- [ ] Logs are accessible to authorised operational support

## Validation
### Automated
- [ ] Observability tests confirm log emission for each event type
- [ ] Security review confirms logged fields are appropriate

### Manual
- [ ] Trigger representative events and verify logs are present and usable

## Dependencies
- API-001
- API-003
- API-004

## Risks / Controls
- Risk: Over-logging may expose sensitive data
  - Control: Define approved log fields and review them explicitly

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
