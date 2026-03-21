# Product Requirements Document (PRD)

## BIAN-Powered Customer & Staff Service Request Portal

**Document status:** Draft
**Version:** 1.0
**Prepared for:** Banking service operations and delivery stakeholders
**Prepared by:** OpenAI
**Date:** 21 March 2026

---

## 1. Purpose

This Product Requirements Document defines the business and product requirements for a **BIAN-Powered Customer & Staff Service Request Portal**.

The product will provide:

* a **customer-facing portal** for authenticated customers to submit requests to update selected personal information
* an **internal CSR portal** for Customer Service Representatives to review, manage, and manually process those requests
* a **BIAN-aligned Service Request API** based on the **Servicing Order** model to support the end-to-end workflow

The product is intended to improve customer experience, operational visibility, and request traceability while preserving a strict manual-review operating model.

---

## 2. Background

Banks commonly receive customer requests to update profile and contact information such as residential address, phone number, and email address. These requests are often fragmented across channels, lack visibility for customers, and require manual handling by service staff.

This product addresses that problem by creating a controlled digital workflow that:

* gives customers a secure self-service channel to lodge requests
* gives CSRs a centralised queue to manage those requests
* tracks request progression in a structured and auditable way
* aligns the workflow to the BIAN Servicing Order concept

A key business constraint is that **no request is to be processed automatically**. The system supports orchestration, visibility, and tracking only. Fulfilment remains a manual CSR activity.

---

## 3. Product Vision

Create a secure, traceable, and operationally efficient service request portal that improves customer transparency and CSR workflow management for profile update requests, while enforcing mandatory manual review and action.

---

## 4. Objectives

### 4.1 Business objectives

* Reduce friction for customers requesting updates to personal information
* Improve visibility of request status for customers
* Provide CSRs with a centralised work queue for manual servicing
* Increase process consistency and auditability
* Establish a BIAN-aligned pattern that can be expanded to other service request types later

### 4.2 Product objectives

* Deliver separate, fit-for-purpose interfaces for customers and CSRs
* Support secure role-based access control
* Enable initiation, retrieval, and update of servicing orders
* Provide clear status tracking throughout the request lifecycle
* Ensure internal notes remain staff-only
* Prevent any straight-through processing of customer change requests

---

## 5. Success Metrics

The following measures should be used to evaluate product success after release:

### Customer metrics

* percentage of eligible requests submitted through the portal
* customer completion rate for request submission
* average time to submit a request
* reduction in customer follow-up contacts asking for status updates

### Operational metrics

* average time for CSR triage of a new request
* average end-to-end resolution time
* queue size by status and ageing bucket
* percentage of requests with complete audit trail
* percentage of requests manually actioned without workflow exception

### Quality and control metrics

* zero instances of unauthorised customer access to another customer’s data
* zero instances of customer visibility of internal notes
* zero instances of automated completion without CSR action

---

## 6. Scope

## 6.1 In scope

The initial release includes:

* customer login and customer portal access
* CSR login and CSR portal access
* customer dashboard showing current personal details and request history
* request submission for:

  * address update
  * phone number update
  * email address update
* CSR request queue and request detail view
* CSR search and filtering
* CSR status updates
* CSR internal note entry
* API support for servicing order initiation, retrieval, and update
* customer visibility of request status

## 6.2 Out of scope

The initial release excludes:

* automated approval or automated execution of updates in downstream systems
* customer self-service editing of bank master records directly
* non-profile service request types unless later added
* document upload and evidence attachment
* SLA engine or automated escalation workflows
* outbound customer notifications unless explicitly added later
* integration-led fulfilment into core banking or CRM systems

---

## 7. Assumptions

* the bank has separate authentication arrangements for customer and staff channels
* customer identity is already established through existing bank identity controls
* source profile data exists in upstream systems and is retrievable for display
* CSR users are authorised internal staff with role-based access
* a servicing order is the primary record for tracking a submitted request in this product
* the portal is not the authoritative system of record for customer master data
* request status values will be controlled centrally
* all request fulfilment actions occur outside this application unless future phases expand scope

---

## 8. Stakeholders

### Business stakeholders

* Customer Service Operations
* Retail or Consumer Banking Product Owners
* Service Delivery and Operational Excellence teams
* Risk and Compliance stakeholders

### Technology stakeholders

* Engineering team
* Solution architecture
* Identity and access management
* API platform team
* Security team
* Data and audit stakeholders

### End users

* retail or business banking customers using the customer portal
* Customer Service Representatives using the staff portal

---

## 9. Users and Personas

## 9.1 Customer persona

**Description:**
Authenticated banking customer seeking to update their personal details.

**Needs:**

* simple and trustworthy request submission
* visibility of current details
* confidence that the request has been received
* ability to monitor progress without calling the bank

**Pain points addressed:**

* uncertainty about request status
* repetitive data entry
* lack of a single digital service channel

## 9.2 CSR persona

**Description:**
Customer Service Representative responsible for manually reviewing and processing profile update requests.

**Needs:**

* a centralised and searchable queue
* quick access to old versus new customer information
* ability to record work progress and internal reasoning
* confidence that requests are not silently auto-processed

**Pain points addressed:**

* fragmented servicing channels
* poor operational visibility
* inconsistent note taking and status handling

---

## 10. Core Business Rule

### Mandatory manual review

Every customer-submitted service request must be treated as a ticket requiring manual CSR review and action.

### No straight-through processing

The product must not automatically approve, complete, or apply customer information changes.

### Product implication

The system’s role is to **facilitate, track, and expose the manual workflow**, not to automate fulfilment.

This is a non-negotiable requirement.

---

## 11. Functional Requirements

## 11.1 Customer portal requirements

### PRD-FR-1: Customer authentication

The product must provide a secure customer login flow using approved bank authentication methods.

### PRD-FR-2: Customer dashboard

The product must provide a dashboard where the customer can view:

* current personal information on record
* their submitted service requests
* the status of each request

### PRD-FR-3: Supported request types

The customer must be able to initiate requests for:

* address update
* phone number update
* email address update

### PRD-FR-4: Pre-filled request forms

The request form must display the existing recorded value and allow entry of a new requested value.

### PRD-FR-5: Request submission

When the customer submits a request, the system must create a servicing order using the initiation API.

### PRD-FR-6: Request history

The customer must be able to view a historical list of their own requests.

### PRD-FR-7: Status visibility

The customer must be able to view the current servicing order status, including at minimum:

* Pending
* In Progress
* Completed
* Rejected

### PRD-FR-8: Customer access restriction

The customer must only be able to access their own data and their own service requests.

---

## 11.2 CSR portal requirements

### PRD-FR-9: CSR authentication

The product must provide a secure and separate CSR login flow.

### PRD-FR-10: Centralised request queue

The CSR portal must provide a dashboard showing all customer service requests.

Each queue item must show at least:

* customer name
* request type
* submission date
* current status

### PRD-FR-11: Search and filtering

CSR users must be able to:

* filter by status
* search by customer name
* search by servicing order ID

### PRD-FR-12: Detailed request view

CSR users must be able to open a request and see:

* customer details
* old and requested new information
* request history
* internal notes

### PRD-FR-13: Status update capability

CSR users must be able to manually update request status.

At minimum, the following transitions must be supported:

* Pending → In Progress
* In Progress → Completed
* In Progress → Rejected

### PRD-FR-14: Internal notes

CSR users must be able to add internal-only notes to a servicing order.

### PRD-FR-15: Note visibility restriction

Internal notes must not be visible to customers under any circumstance.

### PRD-FR-16: Manual fulfilment support

The CSR portal must support manual operational handling rather than automatic execution of requested changes.

---

## 11.3 Shared requirements

### PRD-FR-17: Servicing order retrieval

Both portals must be able to retrieve servicing order details appropriate to the user’s role.

### PRD-FR-18: Audit-relevant metadata

The system must store timestamps and actor attribution for key servicing order changes, including note addition and status update.

### PRD-FR-19: Real-time or near-real-time status visibility

A status update made by a CSR must be reflected in the customer-facing portal without material delay.

---

## 12. API Requirements

The product depends on a BIAN-aligned API layer supporting the following operations.

## 12.1 Initiate service request

**Endpoint:** `POST /ServicingOrder/Initiate`

**Purpose:**
Create a new servicing order from a customer-submitted request.

**Input:**
`InitiateRequest`

**Output:**
`ServicingOrder`

## 12.2 Get list of service requests

**Endpoint:** `GET /ServicingOrder`

**Purpose:**
Return a list of servicing orders for queue display and operational filtering.

**Parameters:**

* `status` (optional)

**Output:**
Array of `ServicingOrder`

## 12.3 Get single service request

**Endpoint:** `GET /ServicingOrder/{servicingOrderId}`

**Purpose:**
Retrieve full details of a specific servicing order.

**Output:**
`ServicingOrder`

## 12.4 Update service request

**Endpoint:** `PUT /ServicingOrder/{servicingOrderId}/Update`

**Purpose:**
Allow a CSR to update request status and add internal notes.

**Input:**
`UpdateRequest`

**Output:**
`ServicingOrder`

---

## 13. Data Requirements

## 13.1 Core entity: ServicingOrder

A servicing order must support at least the following fields:

* servicing order ID
* customer reference
* customer name
* request type
* servicing order status
* submitted date
* last updated date
* request details
* internal notes

## 13.2 Request details

The request details payload must support old versus new values for the relevant profile field being updated.

## 13.3 Internal notes

Internal notes must include at minimum:

* note content
* author
* timestamp

## 13.4 Role-based data exposure

The customer-facing response model must exclude internal notes and any other staff-only operational data.

---

## 14. User Experience Requirements

## 14.1 Customer experience principles

The customer journey should be:

* simple
* secure
* transparent
* low-friction

The customer should be able to understand:

* what information is currently on file
* what change they are requesting
* where their request is in the process

## 14.2 CSR experience principles

The CSR experience should prioritise:

* queue visibility
* fast triage
* quick comparison of old and new values
* efficient status updates
* clear internal documentation

---

## 15. Non-Functional Requirements

## 15.1 Security

The system must:

* enforce authentication for all users
* enforce role-based authorisation
* prevent cross-customer data access
* prevent access to internal notes by customers
* follow bank security and data handling standards

## 15.2 Availability

The application should be available during agreed service windows for customer and CSR use.

## 15.3 Performance

The application should provide responsive page loads and request retrieval suitable for operational use.

Particular attention should be given to:

* CSR queue retrieval
* customer dashboard loading
* request detail views
* status refresh behaviour

## 15.4 Auditability

All status changes and note additions should be attributable and timestamped.

## 15.5 Maintainability

The solution should be designed so additional request types can be introduced in future with minimal redesign.

## 15.6 Compliance

The solution must comply with relevant banking, privacy, and internal control obligations applicable to customer information handling.

---

## 16. Dependencies

Key dependencies may include:

* customer identity provider
* staff identity provider
* customer profile data source
* BIAN-aligned servicing order API
* operational hosting environment
* logging and audit platform
* bank security controls and review processes

---

## 17. Risks and Mitigations

## 17.1 Risk: Misinterpretation of manual workflow requirement

**Description:** Teams may assume requests should auto-complete or auto-apply to downstream systems.
**Mitigation:** Treat the manual review rule as a hard requirement in design, delivery, and testing.

## 17.2 Risk: Data leakage across roles

**Description:** Customer users may be exposed to staff-only data such as internal notes.
**Mitigation:** Enforce strict role-based response shaping and test customer-visible payloads explicitly.

## 17.3 Risk: Poor CSR adoption

**Description:** CSRs may continue using manual side channels if the queue is not efficient.
**Mitigation:** Optimise queue usability, search, filtering, and note-taking.

## 17.4 Risk: Status staleness

**Description:** Customers may not see updated progress promptly.
**Mitigation:** Implement reliable refresh or push-based status update patterns.

## 17.5 Risk: Scope creep

**Description:** Broader servicing scenarios may be added before the initial workflow is stabilised.
**Mitigation:** Keep the first release tightly focused on profile update requests.

---

## 18. Release Scope

## 18.1 MVP release

The minimum viable product should include:

* customer login
* CSR login
* customer dashboard
* CSR queue dashboard
* request initiation for address, phone, and email
* request detail view
* CSR status updates
* internal notes
* role-based data separation
* servicing order APIs

## 18.2 Future enhancements

Potential future enhancements include:

* additional service request categories
* attachments and evidence capture
* notifications
* SLA monitoring and escalation
* operational reporting dashboards
* deeper system integration after CSR approval
* controlled automation for post-approval fulfilment if business policy changes

---

## 19. Acceptance Criteria

## 19.1 Customer portal

### AC-1

Given an authenticated customer, when they access the portal, then they can see their current personal information on record.

### AC-2

Given an authenticated customer, when they access their request history, then they can see only their own servicing orders.

### AC-3

Given an authenticated customer, when they open a request form, then the form shows the current stored value and permits entry of a replacement value.

### AC-4

Given a valid request submission, when the customer submits the form, then a new servicing order is created and returned.

### AC-5

Given an existing customer request, when a CSR changes its status, then the updated status is visible in the customer portal.

### AC-6

Given a customer views a servicing order, when the details are displayed, then no internal CSR notes are shown.

## 19.2 CSR portal

### AC-7

Given an authenticated CSR, when they access the CSR dashboard, then they can see a queue of customer service requests.

### AC-8

Given requests exist in the queue, when the CSR filters by status, then only matching requests are displayed.

### AC-9

Given requests exist in the queue, when the CSR searches by customer name or servicing order ID, then matching requests are returned.

### AC-10

Given a CSR opens a request, when the detail view loads, then it shows customer details, requested changes, status history, and internal notes.

### AC-11

Given a request is pending or in progress, when the CSR updates the status, then the new status is saved and visible in subsequent retrievals.

### AC-12

Given a CSR adds an internal note, when the update is submitted, then the note is stored with author and timestamp.

### AC-13

Given a customer request has been initiated, when it enters the workflow, then it is not automatically completed or applied without manual CSR action.

## 19.3 Control and security

### AC-14

A customer must not be able to retrieve another customer’s servicing order.

### AC-15

A customer must not be able to retrieve internal note data through any customer-facing screen or API response.

### AC-16

All relevant status and note changes must be traceable to an actor and timestamp.

---

## 20. Open Questions

The following items should be resolved during detailed design:

1. What are the exact authentication mechanisms for customers and CSRs?
2. What customer profile source is authoritative for displayed existing values?
3. Is request history shown as full timeline or current-state plus note/event history?
4. Are there formal rules around valid status transitions?
5. Are customer-facing comments or rejection reasons required?
6. Is real-time update implemented via polling, refresh, or push events?
7. Are there retention and archival requirements for servicing orders and notes?
8. What operational reporting is required for supervisors or team leads?

---

## 21. Summary

This PRD defines a dual-portal banking product that digitises profile update request submission and tracking while preserving a strict manual servicing model.

The product’s defining characteristics are:

* separate customer and CSR experiences
* BIAN-aligned servicing order workflow
* strong role-based access control
* full support for manual CSR review and processing
* explicit prohibition on straight-through processing

A strong implementation should deliver better customer transparency, better CSR workflow management, and stronger operational control without compromising the bank’s manual review requirements.

