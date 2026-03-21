# BIAN Service Request Portal — README-Style Specification

## 1. Overview

### Purpose

This document defines the functional specification for a **BIAN-powered Customer & Staff Service Request Portal** for a bank.

The solution provides two separate web interfaces:

* a **customer portal** for authenticated customers to submit and track profile update requests
* a **CSR portal** for Customer Service Representatives to review, manage, and manually process those requests

The workflow is orchestrated through a **Service Request API** aligned to the **BIAN Servicing Order** model.

### Core principle

This application is **not** a straight-through processing system.
Every customer request must be **reviewed and actioned manually by a CSR**.

---

## 2. Scope

### In scope

The system must support:

* customer authentication and access to a customer-facing portal
* CSR authentication and access to a staff-facing portal
* submission of customer information update requests
* tracking of service request lifecycle and status
* CSR review and manual processing of requests
* CSR entry of internal-only notes
* API support for initiating, retrieving, filtering, and updating servicing orders

### Out of scope

The system does not include:

* automatic processing of customer information changes
* direct updates to downstream banking systems without CSR intervention
* customer visibility of CSR internal notes
* broader customer servicing outside profile/contact information updates unless explicitly added later

---

## 3. Assumptions

The following assumptions apply:

* the bank provides separate authentication mechanisms or login flows for customers and CSRs
* customers can only access their own profile data and their own service requests
* CSRs can access service requests across the full customer base
* customer profile data already exists in an upstream or source-of-truth system
* the portal is a workflow and tracking layer, not the master system for customer records
* request status changes are triggered by CSR action only
* real-time or near-real-time status updates are available to the customer dashboard after CSR updates are made
* the API follows the BIAN Servicing Order concept, even if implementation details are adapted for the bank’s internal standards

---

## 4. User Roles

## 4.1 Customer

### Access

Customers must be able to:

* log in through the customer authentication flow
* view only their own profile information
* view only their own service requests
* submit new requests to update their personal information
* track the status of their submitted requests

### Goal

Provide a simple, secure way for customers to request profile updates and monitor progress.

## 4.2 Customer Service Representative (CSR)

### Access

CSRs must be able to:

* log in through a separate staff authentication flow
* view and manage service requests submitted by all customers
* update request statuses
* add internal-only notes to requests

### Goal

Provide a centralised operational queue for manual review and fulfilment of customer service requests.

---

## 5. Functional Requirements

## 5.1 Customer Portal

### FR-CUST-1: Customer authentication

The system must provide a secure login flow for customers.

#### Notes

Supported authentication may include:

* email and password
* bank credential login
* another approved bank authentication mechanism

### FR-CUST-2: Customer dashboard

The customer portal must display:

* current personal information on record
* a list or history of the customer’s service requests
* the current status of each request

### FR-CUST-3: Supported request types

Customers must be able to submit requests to update:

* address
* phone number
* email address

### FR-CUST-4: Pre-filled request forms

The request form must be pre-populated with the customer’s existing information where relevant, so the customer can clearly see the current value and proposed new value.

### FR-CUST-5: Request submission

When a customer submits an update request, the portal must call the service request initiation API and create a new servicing order.

### FR-CUST-6: Status visibility

Customers must be able to view the status of submitted requests using statuses such as:

* Pending
* In Progress
* Completed
* Rejected

### FR-CUST-7: Real-time or near-real-time updates

The customer dashboard must reflect status updates after CSR action without requiring the customer to contact staff separately.

---

## 5.2 CSR Portal

### FR-CSR-1: CSR authentication

The system must provide a secure and separate login flow for CSRs.

### FR-CSR-2: Centralised request queue

The CSR portal must provide a dashboard showing all submitted service requests.

Each request item must include, at minimum:

* customer name
* request type
* submission date
* current status

### FR-CSR-3: Search and filtering

CSRs must be able to:

* filter requests by status
* search by customer name
* search by servicing order ID

### FR-CSR-4: Detailed request view

CSRs must be able to open an individual request and view:

* full customer details
* current versus requested information
* request history
* internal notes

### FR-CSR-5: Manual status updates

CSRs must be able to manually update request status, including transitions such as:

* Pending → In Progress
* In Progress → Completed
* In Progress → Rejected

### FR-CSR-6: Internal notes

CSRs must be able to add internal-only notes to a request.

These notes:

* must be stored against the servicing order
* must not be visible in the customer portal

### FR-CSR-7: No automated fulfilment

The CSR portal must support manual processing only.
No action in the system may automatically apply the requested change to customer master records unless that capability is explicitly introduced in a later phase.

---

## 6. Business Rules

### BR-1: Manual review is mandatory

Every customer-submitted request must be treated as a ticket requiring CSR review.

### BR-2: No straight-through processing

The system must not automatically approve, complete, or apply customer information changes.

### BR-3: Customer visibility restrictions

Customers may only view:

* their own profile data
* their own servicing orders
* customer-visible request status information

Customers must not be able to view:

* other customers’ data
* CSR internal notes
* internal operational details not intended for customer consumption

### BR-4: CSR visibility and authority

CSRs may view and manage requests across all customers, subject to bank access controls.

### BR-5: Auditability

Changes to request status and internal notes should be attributable to a user or system actor and timestamped.

---

## 7. API Specification

## 7.1 Endpoint: Initiate a service request

### Method and path

`POST /ServicingOrder/Initiate`

### Description

Creates a new servicing order when a customer submits a personal information update request.

### Called by

Customer portal

### Request body

`InitiateRequest`

### Response

`ServicingOrder`

---

## 7.2 Endpoint: Get a list of service requests

### Method and path

`GET /ServicingOrder`

### Description

Returns a list of servicing orders for CSR queue display and filtering.

### Called by

CSR portal

### Query parameters

* `status` *(optional, string)* — filters requests by status, for example `Pending`

### Response

Array of `ServicingOrder`

```json
[ServicingOrder, ...]
```

---

## 7.3 Endpoint: Get a single service request

### Method and path

`GET /ServicingOrder/{servicingOrderId}`

### Description

Returns full details of a single servicing order.

### Called by

Customer portal and CSR portal

### Response

`ServicingOrder`

---

## 7.4 Endpoint: Update a service request

### Method and path

`PUT /ServicingOrder/{servicingOrderId}/Update`

### Description

Updates the status of a servicing order and/or appends an internal CSR note.

### Called by

CSR portal

### Request body

`UpdateRequest`

### Response

`ServicingOrder`

---

## 8. Data Models

## 8.1 ServicingOrder

Represents a single service request.

```json
{
  "servicingOrderId": "SO_1729304",
  "customerReference": "CUST_98765",
  "customerName": "Jane Doe",
  "requestType": "Address Update",
  "servicingOrderStatus": "Pending",
  "submittedDate": "2025-08-21T10:00:00Z",
  "lastUpdateDate": "2025-08-21T10:00:00Z",
  "requestDetails": {
    "oldAddress": "123 Old Street, Townsville, TX 12345",
    "newAddress": "456 New Avenue, Metropolis, NY 54321"
  },
  "internalNotes": [
    {
      "note": "Request submitted by customer.",
      "author": "System",
      "timestamp": "2025-08-21T10:00:00Z"
    }
  ]
}
```

### Required fields

At minimum, the servicing order must contain:

* unique servicing order identifier
* customer reference
* customer name
* request type
* request status
* submission timestamp
* last update timestamp
* request details payload

### Notes

`internalNotes` must be stored but excluded from customer-facing views.

---

## 8.2 InitiateRequest

Used to create a new servicing order.

```json
{
  "customerReference": "CUST_98765",
  "customerName": "Jane Doe",
  "requestType": "Address Update",
  "requestDetails": {
    "oldAddress": "123 Old Street, Townsville, TX 12345",
    "newAddress": "456 New Avenue, Metropolis, NY 54321"
  }
}
```

---

## 8.3 UpdateRequest

Used by CSR users to update status and add internal notes.

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

## 9. Non-Functional Requirements

### Security

The system must:

* enforce authentication for both portals
* enforce role-based access between customer and CSR users
* prevent customers from accessing other customers’ data
* prevent customers from viewing internal notes

### Usability

The system should provide:

* a simple customer journey for initiating update requests
* a clear CSR work queue for triage and processing
* intuitive forms and status indicators

### Performance

The system should support a responsive dashboard experience for both customers and CSRs, including filtered request retrieval and status refresh.

### Audit and traceability

The system should retain timestamps and authorship for key actions such as:

* request submission
* status updates
* note creation

---

## 10. Acceptance Criteria

## 10.1 Customer portal acceptance criteria

### AC-CUST-1

Given an authenticated customer, when they access the dashboard, then they can view their current personal information on record.

### AC-CUST-2

Given an authenticated customer, when they access the dashboard, then they can view only their own service requests and statuses.

### AC-CUST-3

Given an authenticated customer, when they open the update form, then the form is pre-filled with the current stored value where applicable.

### AC-CUST-4

Given a customer submits a valid address, phone, or email update request, when the request is sent, then a new servicing order is created through `POST /ServicingOrder/Initiate`.

### AC-CUST-5

Given a servicing order exists for a customer, when its status is updated by a CSR, then the customer dashboard reflects the new status.

### AC-CUST-6

Given a customer views a request, then internal CSR notes are not displayed.

---

## 10.2 CSR portal acceptance criteria

### AC-CSR-1

Given an authenticated CSR, when they access the CSR dashboard, then they can view a queue of service requests across customers.

### AC-CSR-2

Given the CSR dashboard contains requests, when the CSR filters by status, then only matching requests are shown.

### AC-CSR-3

Given the CSR dashboard contains requests, when the CSR searches by customer name or servicing order ID, then matching requests are returned.

### AC-CSR-4

Given a CSR opens a request, when the detail view loads, then the CSR can see customer details, previous and requested values, request history, and internal notes.

### AC-CSR-5

Given a request is in `Pending` or `In Progress`, when a CSR updates the status, then the updated status is saved and returned by the update API.

### AC-CSR-6

Given a CSR adds an internal note, when the note is submitted, then the note is stored with author and timestamp metadata.

### AC-CSR-7

Given a request is submitted by a customer, when it enters the system, then no automatic completion or fulfilment occurs without CSR action.

---

## 11. Suggested Future Enhancements

Potential future scope may include:

* additional request types beyond personal information updates
* richer audit trails and activity timelines
* SLA tracking and ageing views for CSR operations
* attachments or document upload for supporting evidence
* integration with downstream systems after CSR approval
* notifications to customers on status changes

---

## 12. Summary

This solution is a **dual-interface service request portal** aligned to the **BIAN Servicing Order** model.

Its primary purpose is to:

* let customers submit and track profile update requests
* give CSRs a centralised queue to review and manually process those requests
* enforce the business rule that **all requests are handled manually rather than automatically**

