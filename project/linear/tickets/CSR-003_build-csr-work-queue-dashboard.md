## Summary
Create the centralised service request queue for CSRs, displaying requests across customers.

## Why
CSRs need a single operational queue to triage and manage manual servicing work efficiently.

## Context
The queue is the main CSR working surface and should show customer name, request type, submission date, and status.

## In Scope
- Display a queue of servicing orders across customers
- Show key metadata in each queue row
- Support navigation from queue to request detail

## Out of Scope
- Supervisor analytics and team views
- Customer-facing request history

## Requirements
- Queue data must be available only to authenticated CSR users
- Queue must support manual servicing operations

## Acceptance Criteria
- [ ] Queue loads successfully for authenticated CSR users
- [ ] Queue rows include customer name, request type, submission date, and status
- [ ] Queue supports operational use for manual servicing

## Validation
### Automated
- [ ] UI tests cover queue rendering with multiple requests
- [ ] Authorisation tests confirm only CSR users can access the queue

### Manual
- [ ] Log in as a CSR and confirm the queue displays expected requests and fields
- [ ] Open a request from the queue and confirm navigation works

## Dependencies
- CSR-001
- CSR-002
- API-002

## Risks / Controls
- Risk: Queue usability may be poor if core metadata is missing
  - Control: Include the minimum operational fields in every row

## Notes
- This issue must remain consistent with the project rule that customer profile changes are not processed automatically by this portal.
