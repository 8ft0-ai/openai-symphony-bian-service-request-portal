# Linear-Ready Backlog

## BIAN-Powered Customer & Staff Service Request Portal

Below is a delivery-ready backlog formatted for easy import or manual entry into Linear.
I have used the following fields consistently:

* **Issue Type**
* **Summary**
* **Description**
* **Acceptance Criteria**
* **Priority**
* **Dependencies**

You can map these into Linear as:

* **Issue Type** → Feature / Bug / Improvement / Task
* **Summary** → Issue title
* **Description** → Main issue body
* **Acceptance Criteria** → Checklist in description or sub-issues
* **Priority** → Linear priority
* **Dependencies** → Related issues / blocked by

---

# Suggested Linear Labels / Grouping

## Teams or projects

* Customer Portal
* CSR Portal
* API
* Security & Controls
* QA / UAT
* Release

## Priority mapping

* **Urgent** = must-have blocker
* **High** = MVP critical
* **Medium** = important but not release-blocking
* **Low** = future enhancement

For this backlog:

* **P1** → High
* **P2** → Medium
* **P3** → Low

---

# Epic Group 1 — Customer Authentication and Access

## Issue: CP-001

**Issue Type:** Feature
**Summary:** Implement customer authentication flow
**Description:**
Build the customer login flow for the customer-facing portal using the bank-approved authentication mechanism. Authenticated customers must be able to access customer portal functions only. Unauthenticated users must be denied access.

**Acceptance Criteria:**

* customer login screen is available
* valid customer credentials authenticate successfully
* invalid or expired credentials are rejected
* unauthenticated users cannot access protected customer routes
* authenticated customers are redirected to the customer dashboard

**Priority:** High
**Dependencies:** None

---

## Issue: CP-002

**Issue Type:** Feature
**Summary:** Enforce customer role-based access control
**Description:**
Implement authorisation controls so customer users can only access their own data and customer-facing screens. Customer users must not be able to access CSR pages, CSR APIs, or other customers’ information.

**Acceptance Criteria:**

* customer users cannot access CSR routes
* customer users cannot call CSR-only operations successfully
* customer users can retrieve only their own data
* direct URL or API attempts to access another customer’s request are denied

**Priority:** High
**Dependencies:** CP-001

---

## Issue: CP-003

**Issue Type:** Task
**Summary:** Implement customer session handling and logout
**Description:**
Add customer session handling, timeout behaviour, and logout flow consistent with security expectations for the portal.

**Acceptance Criteria:**

* authenticated customer session persists correctly during valid use
* logout ends the session
* session expiry prevents further protected access
* expired sessions require re-authentication

**Priority:** High
**Dependencies:** CP-001

---

# Epic Group 2 — Customer Dashboard and Request Submission

## Issue: CP-004

**Issue Type:** Feature
**Summary:** Build customer dashboard with current profile display
**Description:**
Create the customer dashboard showing the customer’s current personal information on record, including address, phone number, and email address where available.

**Acceptance Criteria:**

* dashboard loads after successful login
* current address is displayed where available
* current phone number is displayed where available
* current email address is displayed where available
* displayed data matches the source provided to the portal

**Priority:** High
**Dependencies:** CP-001, CP-002

---

## Issue: CP-005

**Issue Type:** Feature
**Summary:** Build address update request form
**Description:**
Create a customer form for submitting an address change request. The form must show the current address and allow entry of the requested new address.

**Acceptance Criteria:**

* current address is pre-filled or displayed clearly
* customer can enter a new address
* form validation prevents empty submission
* submission triggers servicing order creation with request type `Address Update`

**Priority:** High
**Dependencies:** CP-004, API-001

---

## Issue: CP-006

**Issue Type:** Feature
**Summary:** Build phone number update request form
**Description:**
Create a customer form for submitting a phone number change request. The form must show the current phone number and allow entry of the requested new phone number.

**Acceptance Criteria:**

* current phone number is pre-filled or displayed clearly
* customer can enter a new phone number
* form validation prevents invalid or empty submission
* submission triggers servicing order creation with request type `Phone Update`

**Priority:** High
**Dependencies:** CP-004, API-001

---

## Issue: CP-007

**Issue Type:** Feature
**Summary:** Build email address update request form
**Description:**
Create a customer form for submitting an email address change request. The form must show the current email and allow entry of the requested new email.

**Acceptance Criteria:**

* current email is pre-filled or displayed clearly
* customer can enter a new email address
* form validation prevents invalid or empty submission
* submission triggers servicing order creation with request type `Email Update`

**Priority:** High
**Dependencies:** CP-004, API-001

---

## Issue: CP-008

**Issue Type:** Feature
**Summary:** Integrate customer request submission with servicing order initiate API
**Description:**
Connect customer request forms to the `POST /ServicingOrder/Initiate` API so valid submissions create servicing orders and return confirmation to the user.

**Acceptance Criteria:**

* form submission calls the initiate API
* successful response returns a servicing order ID
* unsuccessful responses show an appropriate error state
* created request appears in customer request history

**Priority:** High
**Dependencies:** CP-005, CP-006, CP-007, API-001

---

## Issue: CP-009

**Issue Type:** Feature
**Summary:** Show request submission confirmation to customer
**Description:**
After successful submission, display a clear confirmation state with request reference and initial status.

**Acceptance Criteria:**

* success message shown after valid submission
* servicing order ID displayed
* initial status displayed as `Pending`
* customer can navigate to request history or request detail

**Priority:** High
**Dependencies:** CP-008

---

# Epic Group 3 — Customer Request Tracking

## Issue: CP-010

**Issue Type:** Feature
**Summary:** Build customer request history list
**Description:**
Create a request history view showing all servicing orders for the authenticated customer only.

**Acceptance Criteria:**

* request history displays customer’s requests only
* each row shows request type, submission date, and status
* empty state is handled if no requests exist

**Priority:** High
**Dependencies:** CP-001, CP-002, API-002

---

## Issue: CP-011

**Issue Type:** Feature
**Summary:** Build customer request detail page
**Description:**
Create a detail page where a customer can view the information and status for a single servicing order.

**Acceptance Criteria:**

* detail page displays request type
* detail page displays submitted and last updated dates
* detail page displays request details
* detail page displays current status
* internal notes are not shown

**Priority:** High
**Dependencies:** CP-010, API-003

---

## Issue: CP-012

**Issue Type:** Improvement
**Summary:** Refresh customer-visible status after CSR updates
**Description:**
Ensure the customer portal reflects CSR status changes in real time or near real time through polling, refresh, or another approved mechanism.

**Acceptance Criteria:**

* customer sees updated request status after CSR action
* updated status appears without manual support intervention
* stale status behaviour is minimised and documented

**Priority:** High
**Dependencies:** CP-010, CP-011, CSR-009, API-004

---

# Epic Group 4 — CSR Authentication and Queue

## Issue: CSR-001

**Issue Type:** Feature
**Summary:** Implement CSR authentication flow
**Description:**
Build the staff login flow for CSRs, separate from the customer login flow.

**Acceptance Criteria:**

* CSR login screen is available
* valid staff credentials authenticate successfully
* invalid credentials are rejected
* unauthenticated users cannot access CSR routes
* authenticated CSR users land on the CSR dashboard

**Priority:** High
**Dependencies:** None

---

## Issue: CSR-002

**Issue Type:** Feature
**Summary:** Enforce CSR role-based access control
**Description:**
Ensure only authenticated CSR users can access CSR portal functions and service request operations intended for staff.

**Acceptance Criteria:**

* CSR routes require staff authentication
* CSR-only actions are blocked for non-CSR users
* authorised CSR users can access the service request queue and detail views

**Priority:** High
**Dependencies:** CSR-001

---

## Issue: CSR-003

**Issue Type:** Feature
**Summary:** Build CSR work queue dashboard
**Description:**
Create the centralised service request queue for CSRs, displaying requests across customers.

**Acceptance Criteria:**

* queue loads successfully for authenticated CSR users
* queue rows include customer name, request type, submission date, and status
* queue supports operational use for manual servicing

**Priority:** High
**Dependencies:** CSR-001, CSR-002, API-002

---

## Issue: CSR-004

**Issue Type:** Feature
**Summary:** Add status filter to CSR work queue
**Description:**
Allow CSR users to filter the queue by servicing order status.

**Acceptance Criteria:**

* CSR can filter by supported status values
* filtered list returns only matching requests
* clear filter or reset behaviour is supported

**Priority:** High
**Dependencies:** CSR-003

---

## Issue: CSR-005

**Issue Type:** Feature
**Summary:** Add search by customer name to CSR work queue
**Description:**
Enable CSR users to search the queue by customer name.

**Acceptance Criteria:**

* CSR can enter customer name search text
* matching requests are returned accurately
* no-match state is handled clearly

**Priority:** High
**Dependencies:** CSR-003

---

## Issue: CSR-006

**Issue Type:** Feature
**Summary:** Add search by servicing order ID to CSR work queue
**Description:**
Enable CSR users to search the queue by servicing order ID.

**Acceptance Criteria:**

* CSR can search by exact or supported servicing order ID match
* matching request is returned accurately
* no-match state is handled clearly

**Priority:** High
**Dependencies:** CSR-003

---

## Issue: CSR-007

**Issue Type:** Improvement
**Summary:** Add queue pagination and sorting
**Description:**
Improve the CSR queue with pagination and sorting to support growing request volumes.

**Acceptance Criteria:**

* queue supports pagination or incremental loading
* queue supports sorting by submission date and/or status
* queue remains usable with larger request volumes

**Priority:** Medium
**Dependencies:** CSR-003, API-002

---

# Epic Group 5 — CSR Review and Manual Processing

## Issue: CSR-008

**Issue Type:** Feature
**Summary:** Build CSR request detail page
**Description:**
Create a CSR detail view for a single servicing order with sufficient information to manually review and process the request.

**Acceptance Criteria:**

* detail page shows customer information
* detail page shows request type
* detail page shows old and requested new values
* detail page shows request history
* detail page shows internal notes

**Priority:** High
**Dependencies:** CSR-003, API-003

---

## Issue: CSR-009

**Issue Type:** Feature
**Summary:** Add CSR status update control
**Description:**
Provide controls for CSR users to update request status in line with the approved workflow.

**Acceptance Criteria:**

* CSR can update `Pending` to `In Progress`
* CSR can update `In Progress` to `Completed`
* CSR can update `In Progress` to `Rejected`
* status change persists successfully
* updated status is visible in queue and detail view

**Priority:** High
**Dependencies:** CSR-008, API-004

---

## Issue: CSR-010

**Issue Type:** Feature
**Summary:** Enforce valid status transitions
**Description:**
Implement workflow rules so invalid status transitions are blocked.

**Acceptance Criteria:**

* `Pending` to `Completed` is rejected
* `Pending` to `Rejected` is rejected unless explicitly allowed later
* invalid transitions return a clear error
* valid transitions succeed

**Priority:** High
**Dependencies:** CSR-009, API-004

---

## Issue: CSR-011

**Issue Type:** Feature
**Summary:** Add CSR internal note entry
**Description:**
Allow CSR users to add staff-only notes to a servicing order.

**Acceptance Criteria:**

* CSR can enter internal note text
* note can be saved successfully
* saved note appears in CSR detail view
* note does not appear in customer view

**Priority:** High
**Dependencies:** CSR-008, API-004

---

## Issue: CSR-012

**Issue Type:** Task
**Summary:** Persist internal notes with author and timestamp
**Description:**
Ensure internal notes are saved with authorship and timestamp metadata for auditability.

**Acceptance Criteria:**

* every note includes author
* every note includes timestamp
* note ordering is deterministic and visible in CSR context

**Priority:** High
**Dependencies:** CSR-011, API-004

---

## Issue: CSR-013

**Issue Type:** Improvement
**Summary:** Add optional rejection reason field
**Description:**
Support a structured rejection reason in addition to or instead of a free-text internal note for rejected requests.

**Acceptance Criteria:**

* CSR can optionally supply a rejection reason
* rejection reason is stored when provided
* exposure rules for customer visibility are defined before release

**Priority:** Medium
**Dependencies:** CSR-009, CSR-011, API-004

---

## Issue: CSR-014

**Issue Type:** Feature
**Summary:** Enforce manual processing only across CSR workflow
**Description:**
Implement controls and explicit safeguards ensuring the portal supports manual processing only and does not auto-fulfil customer changes.

**Acceptance Criteria:**

* no request is auto-completed upon submission
* no request triggers downstream profile update automatically
* workflow remains in manual states until CSR action occurs

**Priority:** High
**Dependencies:** CSR-009, API-004, SEC-005

---

# Epic Group 6 — Servicing Order API

## Issue: API-001

**Issue Type:** Feature
**Summary:** Implement POST /ServicingOrder/Initiate
**Description:**
Build the API endpoint used by the customer portal to create a new servicing order.

**Acceptance Criteria:**

* endpoint accepts valid initiate payload
* endpoint validates required fields
* endpoint creates servicing order with status `Pending`
* endpoint returns created servicing order
* invalid payloads return appropriate error responses

**Priority:** High
**Dependencies:** None

---

## Issue: API-002

**Issue Type:** Feature
**Summary:** Implement GET /ServicingOrder list endpoint
**Description:**
Build the API endpoint to return a list of servicing orders for queue and history views, with role-aware filtering as appropriate.

**Acceptance Criteria:**

* authorised callers can retrieve servicing order lists
* list supports filtering by status
* role boundaries are enforced
* response data supports CSR queue requirements

**Priority:** High
**Dependencies:** API-001

---

## Issue: API-003

**Issue Type:** Feature
**Summary:** Implement GET /ServicingOrder/{servicingOrderId} endpoint
**Description:**
Build the API endpoint to retrieve a single servicing order by ID, with role-based response shaping.

**Acceptance Criteria:**

* authorised caller can retrieve a valid servicing order
* unknown ID returns `404`
* unauthorised access is denied
* customer-facing response excludes internal notes

**Priority:** High
**Dependencies:** API-001

---

## Issue: API-004

**Issue Type:** Feature
**Summary:** Implement PUT /ServicingOrder/{servicingOrderId}/Update endpoint
**Description:**
Build the API endpoint used by CSRs to update request status and add internal notes.

**Acceptance Criteria:**

* CSR-authenticated context is required
* valid status transitions are persisted
* optional internal note is appended correctly
* invalid transitions return `409` or equivalent error
* response includes updated servicing order

**Priority:** High
**Dependencies:** API-001

---

## Issue: API-005

**Issue Type:** Task
**Summary:** Implement API validation and standard error handling
**Description:**
Add validation, standardised error payloads, and consistent failure responses across the servicing order API.

**Acceptance Criteria:**

* validation errors return `400`
* unauthenticated requests return `401`
* forbidden operations return `403`
* not found returns `404`
* invalid workflow transitions return `409`
* error payload structure is consistent

**Priority:** High
**Dependencies:** API-001, API-002, API-003, API-004

---

## Issue: API-006

**Issue Type:** Improvement
**Summary:** Expand API filtering and pagination support
**Description:**
Add richer filtering and pagination support to improve scalability for CSR queue use cases.

**Acceptance Criteria:**

* pagination parameters are supported
* response includes enough metadata for paging
* additional filters can be added without breaking existing consumers

**Priority:** Medium
**Dependencies:** API-002

---

# Epic Group 7 — Security, Audit, and Controls

## Issue: SEC-001

**Issue Type:** Feature
**Summary:** Block unauthorised access to other customers’ requests
**Description:**
Implement and verify controls preventing customers from retrieving or viewing servicing orders that do not belong to them.

**Acceptance Criteria:**

* cross-customer access attempts are denied
* denial behaviour is consistent across UI and API
* control is covered by automated tests

**Priority:** High
**Dependencies:** CP-002, API-003

---

## Issue: SEC-002

**Issue Type:** Feature
**Summary:** Suppress internal notes from customer-facing payloads
**Description:**
Ensure `internalNotes` and any other staff-only data are excluded from customer-facing API responses and UI views.

**Acceptance Criteria:**

* customer API response omits internal notes
* customer UI renders no internal notes
* CSR UI still renders internal notes correctly

**Priority:** High
**Dependencies:** API-003, CP-011, CSR-008

---

## Issue: SEC-003

**Issue Type:** Task
**Summary:** Capture audit metadata for status changes
**Description:**
Persist and expose audit metadata for status changes, including actor and timestamp.

**Acceptance Criteria:**

* every status update stores actor identity
* every status update stores timestamp
* audit metadata is retrievable for authorised internal use

**Priority:** High
**Dependencies:** API-004

---

## Issue: SEC-004

**Issue Type:** Task
**Summary:** Capture audit metadata for internal notes
**Description:**
Persist and expose audit metadata for internal note creation.

**Acceptance Criteria:**

* every note stores author
* every note stores timestamp
* metadata is preserved across reads

**Priority:** High
**Dependencies:** API-004

---

## Issue: SEC-005

**Issue Type:** Feature
**Summary:** Block automated completion and downstream auto-fulfilment paths
**Description:**
Implement explicit controls so the system cannot auto-complete servicing orders or auto-apply profile changes without CSR action.

**Acceptance Criteria:**

* new requests remain in `Pending` until CSR action
* no automatic transition to `Completed`
* no automated downstream profile update occurs from this portal
* business rule is verified in test evidence

**Priority:** High
**Dependencies:** API-001, API-004

---

## Issue: SEC-006

**Issue Type:** Task
**Summary:** Add operational logging for access denials and key workflow events
**Description:**
Add logging for important security and workflow events, including failed access attempts, request creation, status updates, and note additions.

**Acceptance Criteria:**

* access denials are logged
* request initiation events are logged
* status update events are logged
* internal note events are logged
* logs are accessible to authorised operational support

**Priority:** High
**Dependencies:** API-001, API-003, API-004

---

# Epic Group 8 — QA, UAT, and Release Readiness

## Issue: QA-001

**Issue Type:** Task
**Summary:** Create automated API test suite
**Description:**
Build automated tests covering the servicing order API happy paths, negative paths, validation, and authorisation cases.

**Acceptance Criteria:**

* initiate endpoint is covered
* list endpoint is covered
* detail endpoint is covered
* update endpoint is covered
* validation and auth failures are covered

**Priority:** High
**Dependencies:** API-001, API-002, API-003, API-004, API-005

---

## Issue: QA-002

**Issue Type:** Task
**Summary:** Create portal integration test suite
**Description:**
Build integration or end-to-end tests for customer and CSR journeys across the portal.

**Acceptance Criteria:**

* customer login and submission flows are covered
* customer request history and detail flows are covered
* CSR queue, filter, search, and detail flows are covered
* CSR status update and note flows are covered

**Priority:** High
**Dependencies:** CP-008, CP-010, CP-011, CSR-003, CSR-008, CSR-009, CSR-011

---

## Issue: QA-003

**Issue Type:** Task
**Summary:** Prepare UAT pack for customer journeys
**Description:**
Create business-readable UAT scenarios and expected outcomes for customer-facing functionality.

**Acceptance Criteria:**

* customer submission scenario included
* customer request tracking scenario included
* customer data segregation scenario included
* pass/fail criteria included

**Priority:** High
**Dependencies:** CP-008, CP-010, CP-011

---

## Issue: QA-004

**Issue Type:** Task
**Summary:** Prepare UAT pack for CSR journeys
**Description:**
Create business-readable UAT scenarios and expected outcomes for CSR-facing functionality.

**Acceptance Criteria:**

* CSR queue scenario included
* CSR review and status update scenario included
* internal note scenario included
* invalid transition scenario included

**Priority:** High
**Dependencies:** CSR-003, CSR-008, CSR-009, CSR-011

---

## Issue: QA-005

**Issue Type:** Task
**Summary:** Prepare release checklist and rollback plan
**Description:**
Create a release readiness checklist covering functional sign-off, security controls, known issues, deployment validation, and rollback steps.

**Acceptance Criteria:**

* release checklist exists
* rollback plan exists
* critical dependencies and sign-offs are identified
* manual-review rule is explicitly re-checked pre-release

**Priority:** High
**Dependencies:** QA-001, QA-002, QA-003, QA-004, SEC-005

---

## Issue: QA-006

**Issue Type:** Improvement
**Summary:** Add operational reporting dashboard requirements
**Description:**
Define reporting needs such as queue ageing, counts by status, and operational throughput for later implementation.

**Acceptance Criteria:**

* reporting requirements documented
* key measures identified
* future implementation scope defined

**Priority:** Medium
**Dependencies:** CSR-003, API-002

---

# Future / Lower-Priority Enhancements

## Issue: FUT-001

**Issue Type:** Improvement
**Summary:** Add richer customer-facing status timeline
**Description:**
Provide a more detailed timeline of request progression for customers in a later phase.

**Acceptance Criteria:**

* timeline states and events are defined
* customer-safe event model is agreed
* no internal-only data is exposed

**Priority:** Medium
**Dependencies:** CP-010, CP-011, SEC-002

---

## Issue: FUT-002

**Issue Type:** Feature
**Summary:** Add customer notifications on status change
**Description:**
Provide optional notifications to customers when request status changes.

**Acceptance Criteria:**

* notification trigger rules defined
* notification channel defined
* customer preference and compliance considerations reviewed

**Priority:** Low
**Dependencies:** CP-012, API-004

---

## Issue: FUT-003

**Issue Type:** Feature
**Summary:** Add document upload support for service requests
**Description:**
Support attachments or evidence upload for future service request types.

**Acceptance Criteria:**

* upload rules defined
* storage and security requirements defined
* file handling controls specified

**Priority:** Low
**Dependencies:** API-001, API-003

---

## Issue: FUT-004

**Issue Type:** Feature
**Summary:** Add SLA and escalation workflow support
**Description:**
Add operational SLA tracking and escalation rules for future releases.

**Acceptance Criteria:**

* SLA measures defined
* escalation triggers defined
* supervisory workflow defined

**Priority:** Low
**Dependencies:** CSR-003, API-002, API-004

---

## Issue: FUT-005

**Issue Type:** Feature
**Summary:** Add supervisor queue and team views
**Description:**
Introduce team leader or supervisor views for managing CSR workload in a later phase.

**Acceptance Criteria:**

* supervisor role defined
* team queue views defined
* reporting and access control rules defined

**Priority:** Low
**Dependencies:** CSR-003, QA-006

---

## Issue: FUT-006

**Issue Type:** Feature
**Summary:** Add controlled downstream fulfilment integration after manual approval
**Description:**
Support future integration with downstream systems only after business policy and controls permit it.

**Acceptance Criteria:**

* manual approval checkpoint remains explicit
* control design approved by risk and operations
* no straight-through processing introduced unintentionally

**Priority:** Low
**Dependencies:** CSR-014, SEC-005

---

# Suggested Parent/Child Structure in Linear

## Parent initiatives

* Customer Portal MVP
* CSR Portal MVP
* Servicing Order API MVP
* Security and Controls
* QA and Release Readiness

## Example sub-issue grouping

Under **Customer Portal MVP**:

* CP-001 to CP-012

Under **CSR Portal MVP**:

* CSR-001 to CSR-014

Under **Servicing Order API MVP**:

* API-001 to API-006

Under **Security and Controls**:

* SEC-001 to SEC-006

Under **QA and Release Readiness**:

* QA-001 to QA-006

---

# Suggested Linear Description Template

You can paste this into each issue if you want a standardised format:

```markdown
## Summary
[One-sentence statement of the outcome this issue delivers.]

## Why
[Why this matters and who it helps.]

## Context
[Background, linked issues, PRD/API context, screenshots, payloads.]

## In Scope
- [Item]
- [Item]
- [Item]

## Out of Scope
- [Item]
- [Item]

## Requirements
- [Requirement]
- [Requirement]
- [Access / visibility / workflow rule]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]
- [ ] [Negative-path or access-control criterion if relevant]

## Validation
### Automated
- [ ] [Test coverage required]

### Manual
- [ ] [QA/UAT checks]

## Dependencies
- [Issue or dependency]

## Risks / Controls
- [Risk or control note]

## Notes
- [Optional]

```

---

# Suggested MVP Cut

For a clean MVP, I would mark these as the core release set:

* CP-001 to CP-012
* CSR-001 to CSR-014
* API-001 to API-005
* SEC-001 to SEC-006
* QA-001 to QA-005

Hold these for post-MVP unless needed:

* CSR-007
* CSR-013
* API-006
* QA-006
* FUT-001 to FUT-006

If you’d like, I can next convert this into a **CSV-style import table for Linear**, with one row per issue and columns ready to paste into a spreadsheet.
