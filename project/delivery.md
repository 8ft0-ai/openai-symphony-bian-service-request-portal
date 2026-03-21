# Delivery-Ready Pack

## BIAN-Powered Customer & Staff Service Request Portal

**Document status:** Delivery draft
**Version:** 1.0
**Date:** 21 March 2026

---

# 1. Overview

This delivery-ready pack translates the PRD into implementation-facing artefacts for product, engineering, QA, and delivery teams.

It includes:

* epics
* user stories
* backlog items
* non-functional requirements matrix
* API contract section
* test scenarios
* UAT cases

The product remains governed by one critical rule:

> **No service request is processed automatically.**
> Every request must be manually reviewed and actioned by a CSR.

---

# 2. Delivery Scope

## In scope for MVP

* customer authentication and customer portal access
* CSR authentication and CSR portal access
* customer dashboard
* CSR work queue
* request submission for address, phone, and email updates
* service request detail views
* status tracking
* CSR internal notes
* BIAN-aligned servicing order API
* role-based access control
* auditability of request changes

## Out of scope for MVP

* straight-through processing into master systems
* automated approval or fulfilment
* customer-visible comments from CSR notes
* document upload
* notifications
* SLA automation
* supervisor workflows
* downstream system integration beyond manual handling support

---

# 3. Epics

## Epic 1 — Customer Authentication and Access

Deliver secure customer access to the customer portal and enforce customer-only data boundaries.

## Epic 2 — Customer Service Request Submission

Enable customers to view their current details and submit profile update requests.

## Epic 3 — Customer Request Tracking

Enable customers to track the lifecycle of their submitted service requests.

## Epic 4 — CSR Authentication and Work Queue

Deliver secure CSR access and a centralised queue for manual servicing.

## Epic 5 — CSR Request Review and Processing

Enable CSRs to inspect, update, and manually manage service requests.

## Epic 6 — Servicing Order API

Provide API capabilities for initiation, retrieval, filtering, and update of servicing orders.

## Epic 7 — Security, Audit, and Controls

Enforce data segregation, auditability, and the manual-review operating model.

## Epic 8 — Testing, Release Readiness, and UAT

Prepare the solution for controlled release with end-to-end testing and business validation.

---

# 4. User Stories

## Epic 1 — Customer Authentication and Access

### US-1.1 Customer login

**As a** customer
**I want** to log in securely
**So that** I can access my personal information and service requests.

**Acceptance criteria**

* customer authentication is required before portal access
* unauthenticated users are denied access
* authenticated customers can access only customer-facing functions

### US-1.2 Customer data isolation

**As a** customer
**I want** to see only my own information
**So that** my privacy is protected.

**Acceptance criteria**

* customer can retrieve only their own profile data
* customer can retrieve only their own servicing orders
* attempts to access another customer’s data are denied

---

## Epic 2 — Customer Service Request Submission

### US-2.1 View current details

**As a** customer
**I want** to view my current stored contact details
**So that** I know what information is currently on file.

**Acceptance criteria**

* dashboard shows current address, phone, and email where available
* data shown matches the source profile record presented to the portal

### US-2.2 Submit address update

**As a** customer
**I want** to submit a request to update my address
**So that** the bank can review and process the change.

**Acceptance criteria**

* form displays current address
* customer can enter requested new address
* submission creates a new servicing order with request type `Address Update`

### US-2.3 Submit phone update

**As a** customer
**I want** to submit a request to update my phone number
**So that** the bank can review and process the change.

**Acceptance criteria**

* form displays current phone number
* customer can enter requested new phone number
* submission creates a new servicing order with request type `Phone Update`

### US-2.4 Submit email update

**As a** customer
**I want** to submit a request to update my email address
**So that** the bank can review and process the change.

**Acceptance criteria**

* form displays current email address
* customer can enter requested new email address
* submission creates a new servicing order with request type `Email Update`

### US-2.5 Confirmation of request submission

**As a** customer
**I want** confirmation that my request has been submitted
**So that** I know it has entered the servicing workflow.

**Acceptance criteria**

* successful submission returns a servicing order ID
* request appears in customer request history
* initial status is visible as `Pending`

---

## Epic 3 — Customer Request Tracking

### US-3.1 View request history

**As a** customer
**I want** to see all of my submitted requests
**So that** I can track what I have asked the bank to do.

**Acceptance criteria**

* request history lists servicing orders for that customer only
* each row shows request type, submission date, and status

### US-3.2 View request detail

**As a** customer
**I want** to open a request and see its detail
**So that** I can confirm the requested change and current status.

**Acceptance criteria**

* detail view shows request type, request details, dates, and status
* internal notes are not visible

### US-3.3 See updated status

**As a** customer
**I want** status changes to appear in the portal
**So that** I know when my request is being worked on or completed.

**Acceptance criteria**

* CSR updates are reflected in the customer portal
* visible statuses include `Pending`, `In Progress`, `Completed`, `Rejected`

---

## Epic 4 — CSR Authentication and Work Queue

### US-4.1 CSR login

**As a** CSR
**I want** to log in through a staff access flow
**So that** I can access the servicing work queue.

**Acceptance criteria**

* CSR authentication is separate from customer authentication
* only authenticated CSR users can access CSR screens

### US-4.2 View queue

**As a** CSR
**I want** a centralised queue of requests
**So that** I can manage customer service work efficiently.

**Acceptance criteria**

* queue shows requests across all customers
* queue shows customer name, request type, submission date, and status

### US-4.3 Filter queue by status

**As a** CSR
**I want** to filter the queue by status
**So that** I can focus on relevant work items.

**Acceptance criteria**

* queue can be filtered by supported status values
* filtered results update correctly

### US-4.4 Search queue

**As a** CSR
**I want** to search by customer name or servicing order ID
**So that** I can quickly locate a request.

**Acceptance criteria**

* search supports customer name
* search supports servicing order ID
* matching results are returned accurately

---

## Epic 5 — CSR Request Review and Processing

### US-5.1 View full request details

**As a** CSR
**I want** to inspect a request in detail
**So that** I can compare old and requested new values before processing it.

**Acceptance criteria**

* detail view shows customer information
* detail view shows old versus new requested values
* detail view shows request history and internal notes

### US-5.2 Update request to in progress

**As a** CSR
**I want** to move a request from `Pending` to `In Progress`
**So that** work can be tracked accurately.

**Acceptance criteria**

* CSR can update status from `Pending` to `In Progress`
* change is persisted and timestamped

### US-5.3 Complete a request

**As a** CSR
**I want** to mark a request as `Completed` after manual action
**So that** the workflow accurately reflects final state.

**Acceptance criteria**

* CSR can update status from `In Progress` to `Completed`
* change is persisted and visible to the customer

### US-5.4 Reject a request

**As a** CSR
**I want** to mark a request as `Rejected` where necessary
**So that** the workflow accurately reflects an unsuccessful outcome.

**Acceptance criteria**

* CSR can update status from `In Progress` to `Rejected`
* change is persisted and visible to the customer

### US-5.5 Add internal note

**As a** CSR
**I want** to add an internal note to a request
**So that** servicing context is recorded for staff.

**Acceptance criteria**

* note can be added from request detail screen
* note stores text, author, and timestamp
* note is never visible to customer users

### US-5.6 Manual processing only

**As a** CSR
**I want** the system to support manual handling only
**So that** requests are not auto-fulfilled without review.

**Acceptance criteria**

* no request is automatically completed
* no request automatically updates downstream customer master data

---

## Epic 6 — Servicing Order API

### US-6.1 Initiate servicing order

**As a** consuming client
**I want** to create a servicing order through an API
**So that** customer-submitted requests can be captured consistently.

### US-6.2 Retrieve queue

**As a** consuming client
**I want** to retrieve a list of servicing orders
**So that** I can render the CSR queue.

### US-6.3 Retrieve single servicing order

**As a** consuming client
**I want** to retrieve a specific servicing order
**So that** I can display request detail.

### US-6.4 Update servicing order

**As a** consuming client
**I want** to update servicing order status and internal notes
**So that** CSR actions can be persisted.

---

## Epic 7 — Security, Audit, and Controls

### US-7.1 Record audit data

**As a** risk and operations stakeholder
**I want** status changes and notes to be attributable
**So that** actions can be audited.

**Acceptance criteria**

* status changes are timestamped
* note additions are timestamped
* actor identity is captured for each update

### US-7.2 Prevent customer access to internal notes

**As a** control owner
**I want** internal notes hidden from customer channels
**So that** staff-only information remains protected.

### US-7.3 Enforce no straight-through processing

**As a** control owner
**I want** automated fulfilment blocked
**So that** the manual-review rule is enforced.

---

## Epic 8 — Testing, Release Readiness, and UAT

### US-8.1 End-to-end test coverage

**As a** delivery lead
**I want** end-to-end test coverage across both portals and the API
**So that** MVP release risk is controlled.

### US-8.2 Business UAT validation

**As a** product owner
**I want** formal UAT scenarios and expected outcomes
**So that** business stakeholders can approve release readiness.

---

# 5. Backlog Items

## Priority legend

* **P1** = mandatory for MVP
* **P2** = important but can follow shortly after MVP if required
* **P3** = future enhancement

| ID     | Epic   | Backlog Item                                                | Priority |
| ------ | ------ | ----------------------------------------------------------- | -------- |
| BI-001 | 1      | Implement customer authentication flow                      | P1       |
| BI-002 | 1      | Enforce customer role-based access control                  | P1       |
| BI-003 | 1      | Implement customer session handling and logout              | P1       |
| BI-004 | 2      | Build customer dashboard with current profile display       | P1       |
| BI-005 | 2      | Build address update form with pre-filled current value     | P1       |
| BI-006 | 2      | Build phone update form with pre-filled current value       | P1       |
| BI-007 | 2      | Build email update form with pre-filled current value       | P1       |
| BI-008 | 2      | Integrate customer request submission with initiate API     | P1       |
| BI-009 | 2      | Show request submission confirmation and servicing order ID | P1       |
| BI-010 | 3      | Build customer request history list                         | P1       |
| BI-011 | 3      | Build customer request detail page                          | P1       |
| BI-012 | 3      | Refresh customer-visible status after CSR update            | P1       |
| BI-013 | 4      | Implement CSR authentication flow                           | P1       |
| BI-014 | 4      | Enforce CSR role-based access control                       | P1       |
| BI-015 | 4      | Build CSR queue dashboard                                   | P1       |
| BI-016 | 4      | Add status filter to CSR queue                              | P1       |
| BI-017 | 4      | Add search by customer name to CSR queue                    | P1       |
| BI-018 | 4      | Add search by servicing order ID to CSR queue               | P1       |
| BI-019 | 5      | Build CSR request detail page                               | P1       |
| BI-020 | 5      | Display old versus new values in CSR detail view            | P1       |
| BI-021 | 5      | Add CSR status update control                               | P1       |
| BI-022 | 5      | Enforce valid status transitions                            | P1       |
| BI-023 | 5      | Add CSR internal note entry                                 | P1       |
| BI-024 | 5      | Persist internal notes with author and timestamp            | P1       |
| BI-025 | 5      | Suppress internal notes from customer-facing payloads       | P1       |
| BI-026 | 6      | Implement POST /ServicingOrder/Initiate                     | P1       |
| BI-027 | 6      | Implement GET /ServicingOrder                               | P1       |
| BI-028 | 6      | Implement GET /ServicingOrder/{id}                          | P1       |
| BI-029 | 6      | Implement PUT /ServicingOrder/{id}/Update                   | P1       |
| BI-030 | 6      | Implement request validation and API error handling         | P1       |
| BI-031 | 7      | Capture audit metadata for status changes                   | P1       |
| BI-032 | 7      | Capture audit metadata for internal notes                   | P1       |
| BI-033 | 7      | Block unauthorised access to other customers’ requests      | P1       |
| BI-034 | 7      | Block any automated completion behaviour                    | P1       |
| BI-035 | 8      | Create automated API test suite                             | P1       |
| BI-036 | 8      | Create portal integration test suite                        | P1       |
| BI-037 | 8      | Create UAT pack for customer journeys                       | P1       |
| BI-038 | 8      | Create UAT pack for CSR journeys                            | P1       |
| BI-039 | 8      | Prepare release checklist and rollback plan                 | P1       |
| BI-040 | 4      | Add queue pagination/sorting                                | P2       |
| BI-041 | 3      | Add richer status timeline for customers                    | P2       |
| BI-042 | 5      | Add optional rejection reason field                         | P2       |
| BI-043 | 8      | Add operational reporting dashboards                        | P2       |
| BI-044 | 6      | Add API pagination/filter expansion                         | P2       |
| BI-045 | Future | Add customer notifications on status change                 | P3       |
| BI-046 | Future | Add document upload                                         | P3       |
| BI-047 | Future | Add SLA and escalation workflows                            | P3       |
| BI-048 | Future | Add supervisor queue and team views                         | P3       |
| BI-049 | Future | Add downstream fulfilment integration after manual approval | P3       |

---

# 6. Non-Functional Requirements Matrix

| NFR ID | Category        | Requirement                                                                            | Measure / Expectation                                                                           | Applies To                       | Priority |
| ------ | --------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------- | -------- |
| NFR-01 | Security        | All users must be authenticated before accessing protected functions                   | No protected page or API callable without authentication                                        | Customer portal, CSR portal, API | P1       |
| NFR-02 | Security        | Role-based access must segregate customer and CSR capabilities                         | Customer cannot access CSR functions or data; CSR can access staff functions only as authorised | Portals, API                     | P1       |
| NFR-03 | Security        | Customers must not access other customers’ data                                        | Access attempts return authorisation failure                                                    | Portals, API                     | P1       |
| NFR-04 | Security        | Internal notes must not be exposed to customers                                        | Customer-facing views and payloads exclude internal notes                                       | Portals, API                     | P1       |
| NFR-05 | Auditability    | Status changes must be attributable                                                    | Each status update stores actor and timestamp                                                   | API, CSR portal                  | P1       |
| NFR-06 | Auditability    | Internal note changes must be attributable                                             | Each note stores actor and timestamp                                                            | API, CSR portal                  | P1       |
| NFR-07 | Control         | No automatic fulfilment may occur                                                      | No workflow path updates customer master data without CSR action outside this application       | End-to-end solution              | P1       |
| NFR-08 | Availability    | Solution should be available during business and agreed customer access windows        | Availability target to be set by hosting standard                                               | Portals, API                     | P1       |
| NFR-09 | Performance     | Queue and dashboard screens should load promptly                                       | Target to be agreed; suitable for operational use                                               | Portals                          | P1       |
| NFR-10 | Performance     | API responses should support responsive user journeys                                  | Standard response times within agreed engineering SLOs                                          | API                              | P1       |
| NFR-11 | Reliability     | Status and note updates must persist correctly                                         | No silent data loss on update                                                                   | API                              | P1       |
| NFR-12 | Usability       | Key tasks must be simple and low-friction                                              | Customer can submit request with minimal steps; CSR can triage quickly                          | Portals                          | P1       |
| NFR-13 | Maintainability | Design should support new request types later                                          | New request types can be added with limited redesign                                            | API, UI                          | P2       |
| NFR-14 | Observability   | Errors and key actions should be logged                                                | Logs available for failures, access denials, and update actions                                 | API, Portals                     | P1       |
| NFR-15 | Compliance      | Handling of customer information must align with bank privacy and control requirements | Compliance review passed prior to production release                                            | End-to-end solution              | P1       |
| NFR-16 | Data Integrity  | Request history must remain consistent across reads                                    | Same servicing order state returned across authorised channels                                  | API, Portals                     | P1       |
| NFR-17 | Scalability     | Queue retrieval should remain usable as request volume grows                           | Pagination or scalable retrieval approach available                                             | CSR portal, API                  | P2       |
| NFR-18 | Accessibility   | Portal UI should meet agreed accessibility standards                                   | Standard to be confirmed by delivery team                                                       | Portals                          | P2       |

---

# 7. API Contract Section

## 7.1 Design Notes

The API is aligned to the BIAN **Servicing Order** concept.
For MVP, it supports creation, retrieval, list/filter, and update of service requests.

### Supported status values

* `Pending`
* `In Progress`
* `Completed`
* `Rejected`

### Supported request types

* `Address Update`
* `Phone Update`
* `Email Update`

### Business rule

The API must not trigger downstream fulfilment automatically.

---

## 7.2 Resource Model

### ServicingOrder

```json
{
  "servicingOrderId": "SO_1729304",
  "customerReference": "CUST_98765",
  "customerName": "Jane Doe",
  "requestType": "Address Update",
  "servicingOrderStatus": "Pending",
  "submittedDate": "2026-03-21T10:00:00Z",
  "lastUpdateDate": "2026-03-21T10:00:00Z",
  "requestDetails": {
    "oldAddress": "123 Old Street, Townsville, QLD 4810",
    "newAddress": "456 New Avenue, Parramatta, NSW 2150"
  },
  "internalNotes": [
    {
      "note": "Request submitted by customer.",
      "author": "System",
      "timestamp": "2026-03-21T10:00:00Z"
    }
  ]
}
```

---

## 7.3 Request Models

### InitiateRequest

```json
{
  "customerReference": "CUST_98765",
  "customerName": "Jane Doe",
  "requestType": "Address Update",
  "requestDetails": {
    "oldAddress": "123 Old Street, Townsville, QLD 4810",
    "newAddress": "456 New Avenue, Parramatta, NSW 2150"
  }
}
```

### UpdateRequest

```json
{
  "servicingOrderStatus": "In Progress",
  "newInternalNote": {
    "note": "Verified new address via phone call.",
    "author": "csr_john_smith"
  }
}
```

---

## 7.4 Endpoint Contracts

## 7.4.1 POST /ServicingOrder/Initiate

### Purpose

Create a new servicing order from a customer-submitted request.

### Auth

Customer-authenticated context required.

### Request body

`InitiateRequest`

### Validation rules

* `customerReference` is required
* `customerName` is required
* `requestType` is required and must be supported
* `requestDetails` is required
* old and new values must be present for the selected request type
* customer may submit only for their own customer reference in authenticated context

### Response

**201 Created**

```json
{
  "servicingOrderId": "SO_1729304",
  "customerReference": "CUST_98765",
  "customerName": "Jane Doe",
  "requestType": "Address Update",
  "servicingOrderStatus": "Pending",
  "submittedDate": "2026-03-21T10:00:00Z",
  "lastUpdateDate": "2026-03-21T10:00:00Z",
  "requestDetails": {
    "oldAddress": "123 Old Street, Townsville, QLD 4810",
    "newAddress": "456 New Avenue, Parramatta, NSW 2150"
  },
  "internalNotes": [
    {
      "note": "Request submitted by customer.",
      "author": "System",
      "timestamp": "2026-03-21T10:00:00Z"
    }
  ]
}
```

### Error responses

* `400 Bad Request` for invalid payload
* `401 Unauthorized` for unauthenticated request
* `403 Forbidden` if customer context does not match request customer reference

---

## 7.4.2 GET /ServicingOrder

### Purpose

Return a list of servicing orders.

### Auth

CSR-authenticated context required for all-customer queue access.
Customer-facing list access should be implemented through role-aware filtering or a dedicated customer-facing service layer.

### Query parameters

* `status` *(optional)*
* `customerReference` *(optional, if role-appropriate)*
* `requestType` *(optional, future-ready)*
* `page` *(optional, if pagination enabled)*
* `pageSize` *(optional, if pagination enabled)*

### Response

**200 OK**

```json
[
  {
    "servicingOrderId": "SO_1729304",
    "customerReference": "CUST_98765",
    "customerName": "Jane Doe",
    "requestType": "Address Update",
    "servicingOrderStatus": "Pending",
    "submittedDate": "2026-03-21T10:00:00Z",
    "lastUpdateDate": "2026-03-21T10:00:00Z",
    "requestDetails": {
      "oldAddress": "123 Old Street, Townsville, QLD 4810",
      "newAddress": "456 New Avenue, Parramatta, NSW 2150"
    },
    "internalNotes": [
      {
        "note": "Request submitted by customer.",
        "author": "System",
        "timestamp": "2026-03-21T10:00:00Z"
      }
    ]
  }
]
```

### Error responses

* `401 Unauthorized`
* `403 Forbidden`

---

## 7.4.3 GET /ServicingOrder/{servicingOrderId}

### Purpose

Retrieve a single servicing order by ID.

### Auth

Customer or CSR authenticated context required.

### Authorisation rules

* customer may retrieve only their own servicing order
* CSR may retrieve any servicing order within authorised scope

### Response

**200 OK**

```json
{
  "servicingOrderId": "SO_1729304",
  "customerReference": "CUST_98765",
  "customerName": "Jane Doe",
  "requestType": "Address Update",
  "servicingOrderStatus": "In Progress",
  "submittedDate": "2026-03-21T10:00:00Z",
  "lastUpdateDate": "2026-03-21T10:15:00Z",
  "requestDetails": {
    "oldAddress": "123 Old Street, Townsville, QLD 4810",
    "newAddress": "456 New Avenue, Parramatta, NSW 2150"
  },
  "internalNotes": [
    {
      "note": "Request submitted by customer.",
      "author": "System",
      "timestamp": "2026-03-21T10:00:00Z"
    },
    {
      "note": "Verified new address via phone call.",
      "author": "csr_john_smith",
      "timestamp": "2026-03-21T10:15:00Z"
    }
  ]
}
```

### Error responses

* `401 Unauthorized`
* `403 Forbidden`
* `404 Not Found`

### Response shaping rule

Customer-facing responses must omit `internalNotes`.

---

## 7.4.4 PUT /ServicingOrder/{servicingOrderId}/Update

### Purpose

Update request status and/or append an internal note.

### Auth

CSR-authenticated context required.

### Request body

`UpdateRequest`

### Validation rules

* CSR authentication required
* status transition must be valid
* internal note, if supplied, must include `note` and `author`
* request cannot be auto-completed outside allowed CSR action path

### Supported status transitions

* `Pending` → `In Progress`
* `In Progress` → `Completed`
* `In Progress` → `Rejected`

### Response

**200 OK**

```json
{
  "servicingOrderId": "SO_1729304",
  "customerReference": "CUST_98765",
  "customerName": "Jane Doe",
  "requestType": "Address Update",
  "servicingOrderStatus": "Completed",
  "submittedDate": "2026-03-21T10:00:00Z",
  "lastUpdateDate": "2026-03-21T10:30:00Z",
  "requestDetails": {
    "oldAddress": "123 Old Street, Townsville, QLD 4810",
    "newAddress": "456 New Avenue, Parramatta, NSW 2150"
  },
  "internalNotes": [
    {
      "note": "Request submitted by customer.",
      "author": "System",
      "timestamp": "2026-03-21T10:00:00Z"
    },
    {
      "note": "Verified new address via phone call.",
      "author": "csr_john_smith",
      "timestamp": "2026-03-21T10:15:00Z"
    }
  ]
}
```

### Error responses

* `400 Bad Request` for invalid update body
* `401 Unauthorized`
* `403 Forbidden`
* `404 Not Found`
* `409 Conflict` for invalid status transition

---

## 7.5 Example Error Contract

```json
{
  "errorCode": "INVALID_STATUS_TRANSITION",
  "message": "Transition from Pending to Completed is not allowed.",
  "timestamp": "2026-03-21T10:20:00Z"
}
```

---

# 8. Test Scenarios

## 8.1 Functional Test Scenarios

## Customer portal

### TS-001 Customer can log in

**Precondition:** valid customer account exists
**Steps:** customer enters valid credentials and signs in
**Expected result:** customer lands on dashboard and sees customer-facing portal

### TS-002 Customer can see current personal information

**Precondition:** authenticated customer with stored profile data
**Steps:** open dashboard
**Expected result:** address, phone, and email on file are shown as available

### TS-003 Customer can submit address update request

**Precondition:** authenticated customer
**Steps:** open address form, review current value, enter new value, submit
**Expected result:** request created, servicing order ID returned, status shown as `Pending`

### TS-004 Customer can submit phone update request

**Precondition:** authenticated customer
**Steps:** open phone form, enter new value, submit
**Expected result:** request created successfully

### TS-005 Customer can submit email update request

**Precondition:** authenticated customer
**Steps:** open email form, enter new value, submit
**Expected result:** request created successfully

### TS-006 Customer can see request history

**Precondition:** customer has one or more servicing orders
**Steps:** open request history
**Expected result:** only that customer’s requests are shown

### TS-007 Customer can see updated status

**Precondition:** CSR has changed a request to `In Progress` or `Completed`
**Steps:** customer refreshes or revisits request history/detail
**Expected result:** updated status is displayed

### TS-008 Customer cannot see internal notes

**Precondition:** servicing order contains internal notes
**Steps:** customer opens request detail
**Expected result:** internal notes are not shown anywhere in UI or payload

### TS-009 Customer cannot access another customer’s request

**Precondition:** another customer’s servicing order ID exists
**Steps:** attempt direct access to another customer’s request
**Expected result:** access denied

---

## CSR portal

### TS-010 CSR can log in

**Precondition:** valid CSR account exists
**Steps:** CSR signs in with staff credentials
**Expected result:** CSR lands on work queue

### TS-011 CSR can view request queue

**Precondition:** one or more servicing orders exist
**Steps:** CSR opens dashboard
**Expected result:** queue shows requests with customer name, request type, submission date, status

### TS-012 CSR can filter by status

**Precondition:** requests with mixed statuses exist
**Steps:** apply `Pending` filter
**Expected result:** only pending requests displayed

### TS-013 CSR can search by customer name

**Precondition:** matching request exists
**Steps:** search using customer name
**Expected result:** relevant request returned

### TS-014 CSR can search by servicing order ID

**Precondition:** known servicing order ID exists
**Steps:** search by ID
**Expected result:** exact request returned

### TS-015 CSR can view request detail

**Precondition:** servicing order exists
**Steps:** open request detail
**Expected result:** customer details, old/new values, history, and internal notes shown

### TS-016 CSR can move request from Pending to In Progress

**Precondition:** request in `Pending` state
**Steps:** update status to `In Progress`
**Expected result:** update succeeds, timestamp recorded, status visible in queue and detail

### TS-017 CSR can complete request

**Precondition:** request in `In Progress` state
**Steps:** update status to `Completed`
**Expected result:** update succeeds

### TS-018 CSR can reject request

**Precondition:** request in `In Progress` state
**Steps:** update status to `Rejected`
**Expected result:** update succeeds

### TS-019 CSR can add internal note

**Precondition:** servicing order exists
**Steps:** add note and save
**Expected result:** note stored with author and timestamp

### TS-020 Invalid status transition is blocked

**Precondition:** request in `Pending` state
**Steps:** attempt to update directly to `Completed`
**Expected result:** system rejects update with validation/conflict response

---

## API and control scenarios

### TS-021 Initiate API validates required fields

**Precondition:** authenticated customer context
**Steps:** submit invalid payload missing required field
**Expected result:** `400 Bad Request`

### TS-022 Update API requires CSR auth

**Precondition:** request exists
**Steps:** call update endpoint without CSR authentication
**Expected result:** `401` or `403`

### TS-023 Customer response excludes internal notes

**Precondition:** request contains internal notes
**Steps:** retrieve request in customer context
**Expected result:** response excludes `internalNotes`

### TS-024 Audit metadata captured on status update

**Precondition:** CSR updates request
**Steps:** inspect persisted record/logs
**Expected result:** actor and timestamp recorded

### TS-025 Audit metadata captured on note creation

**Precondition:** CSR adds note
**Steps:** inspect persisted record/logs
**Expected result:** actor and timestamp recorded

### TS-026 No auto-processing occurs after submission

**Precondition:** customer submits request
**Steps:** wait without CSR action
**Expected result:** request remains in manual workflow and is not auto-completed

---

# 9. UAT Cases

## UAT-01 Customer submits an address change request

**Business objective:** confirm a customer can initiate a manual service request digitally

**Given**

* a valid authenticated customer
* an existing address on file

**When**

* the customer opens the address update form
* reviews the current address
* enters a new address
* submits the request

**Then**

* a servicing order is created
* the request is visible in request history
* the initial status is `Pending`

**UAT owner:** Product owner / customer operations
**Pass criteria:** all expected results occur without manual workaround

---

## UAT-02 Customer tracks request progress

**Business objective:** confirm the portal gives customers transparent status visibility

**Given**

* a customer has an existing submitted request

**When**

* a CSR updates the request to `In Progress`
* the customer views the request again

**Then**

* the customer sees the updated status in the portal

**UAT owner:** Product owner
**Pass criteria:** status reflects CSR action correctly

---

## UAT-03 Customer cannot see staff-only notes

**Business objective:** confirm control over internal-only data

**Given**

* a servicing order contains CSR internal notes

**When**

* the customer views request detail

**Then**

* no internal note content is visible

**UAT owner:** Risk / control representative
**Pass criteria:** zero internal note exposure

---

## UAT-04 CSR can triage pending requests

**Business objective:** confirm CSRs can work from a centralised queue

**Given**

* multiple servicing orders exist in mixed statuses

**When**

* the CSR opens the queue
* filters to `Pending`

**Then**

* only pending requests are shown and available for triage

**UAT owner:** CSR team lead
**Pass criteria:** queue supports real operational filtering

---

## UAT-05 CSR can inspect old versus new customer values

**Business objective:** confirm CSR has enough context to review manually

**Given**

* a customer request exists

**When**

* the CSR opens the detail view

**Then**

* the CSR sees the current value and requested new value clearly

**UAT owner:** Operations lead
**Pass criteria:** review can be completed without referring to hidden or missing UI data

---

## UAT-06 CSR can record manual work in the system

**Business objective:** confirm CSR workflow supports manual processing

**Given**

* a request is in `Pending`

**When**

* the CSR moves it to `In Progress`
* adds an internal note
* later marks it `Completed`

**Then**

* the status progression is stored correctly
* the note is retained with author and timestamp

**UAT owner:** CSR team lead
**Pass criteria:** manual servicing lifecycle can be tracked end-to-end

---

## UAT-07 Invalid status change is blocked

**Business objective:** confirm process control over workflow states

**Given**

* a request is in `Pending`

**When**

* the CSR attempts to mark it `Completed` directly

**Then**

* the system prevents the transition

**UAT owner:** Product owner / QA lead
**Pass criteria:** invalid transition blocked consistently

---

## UAT-08 Customer data segregation is enforced

**Business objective:** confirm customer privacy protections

**Given**

* two customers with distinct requests

**When**

* customer A attempts to access customer B’s request

**Then**

* access is denied

**UAT owner:** Security / risk representative
**Pass criteria:** no cross-customer data access

---

## UAT-09 No automatic fulfilment occurs

**Business objective:** confirm the central business rule

**Given**

* a customer has submitted a request

**When**

* no CSR action has yet occurred

**Then**

* the request remains pending in the manual workflow
* no downstream profile change is automatically applied by this portal

**UAT owner:** Operations and control stakeholders
**Pass criteria:** zero evidence of straight-through processing

---

# 10. Definition of Done

A backlog item is complete only when:

* functional acceptance criteria are met
* relevant role-based access controls are implemented
* negative-path and authorisation tests pass
* audit requirements are satisfied
* no conflict exists with the manual-review rule
* QA evidence is recorded
* product owner acceptance is obtained where applicable

For release readiness, the MVP is done when:

* all P1 backlog items are complete
* critical UAT cases pass
* no high-severity defects remain open
* security and control checks are signed off
* the delivery team confirms no straight-through processing path exists

---

# 11. Suggested Delivery Sequence

## Sprint 1

* authentication foundations
* role-based access control
* core API skeleton
* customer dashboard foundations
* CSR queue foundations

## Sprint 2

* customer submission flows
* request history and detail views
* CSR detail view
* status update capability
* internal notes

## Sprint 3

* security hardening
* auditability
* negative-path testing
* UAT execution
* release readiness

---

# 12. Summary

This pack is structured so delivery teams can move directly into implementation and test planning. It provides:

* epics for planning
* user stories for delivery
* backlog items for prioritisation
* NFRs for architecture and controls
* API contracts for engineering
* test scenarios for QA
* UAT cases for business sign-off

The single most important implementation constraint remains unchanged:

> **This system tracks and supports manual servicing. It must not automatically process customer change requests.**

