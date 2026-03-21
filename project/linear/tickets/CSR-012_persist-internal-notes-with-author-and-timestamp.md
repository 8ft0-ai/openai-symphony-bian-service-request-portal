## Summary
Ensure internal notes are saved with authorship and timestamp metadata for auditability.

## Why
Operations and control stakeholders need note history to be attributable and time-sequenced.

## Context
A free-text note without author and time metadata is not sufficient for audit and operational traceability.

## In Scope
- Store note author with each internal note
- Store note timestamp with each internal note
- Return note history in a deterministic order for CSR users

## Out of Scope
- Customer-visible note history
- Advanced note editing or deletion workflows

## Requirements
- Every note must include author and timestamp
- Metadata must persist across reads

## Acceptance Criteria
- [ ] Every note includes author
- [ ] Every note includes timestamp
- [ ] Note ordering is deterministic and visible in CSR context

## Validation
### Automated
- [ ] Persistence tests confirm author and timestamp are stored for each note
- [ ] Read tests confirm note ordering is consistent

### Manual
- [ ] Add multiple notes and confirm author and timestamp are visible in the expected order

## Dependencies
- CSR-011
- API-004

## Risks / Controls
- Risk: Missing metadata weakens auditability
  - Control: Make author and timestamp mandatory at persistence time

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
