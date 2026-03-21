## Summary
Persist and expose audit metadata for internal note creation.

## Why
Internal notes need clear authorship and timing for operational continuity and audit.

## Context
Notes are operational artefacts and should be attributable in the same way as status changes.

## In Scope
- Store author for each note
- Store timestamp for each note
- Preserve note metadata across reads

## Out of Scope
- Customer-visible note metadata
- Advanced note editing or redaction workflows

## Requirements
- Every note stores author
- Every note stores timestamp

## Acceptance Criteria
- [ ] Every note stores author
- [ ] Every note stores timestamp
- [ ] Metadata is preserved across reads

## Validation
### Automated
- [ ] Persistence tests confirm note author and timestamp are stored
- [ ] Read tests confirm metadata remains intact across retrievals

### Manual
- [ ] Add a note and confirm author and timestamp are visible in staff context

## Dependencies
- API-004

## Risks / Controls
- Risk: Notes without metadata reduce usefulness and trust
  - Control: Make note metadata mandatory

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
