# BIAN Service Request Portal — Project Brief

## 1. Project title

**BIAN-Powered Customer & Staff Service Request Portal**

## 2. Executive summary

This project is to create a dual-interface web application for a bank.

The application includes:

* a **customer-facing portal** for authenticated bank customers to submit requests to update their personal information, such as address or phone number
* an **internal staff portal** for Customer Service Representatives (CSRs) to view, manage, and manually process those requests

The full workflow is orchestrated through a defined **Service Request API**, based on the **BIAN Servicing Order** model.

A critical requirement is that **no request is processed automatically**. Every request must be reviewed and actioned manually by a CSR.

## 3. User roles and authentication

The application must support **two distinct user roles**, each with separate login flows and interfaces.

### Role 1: Customer

**Access**

* Can only view and manage their own profile information
* Can only view and manage their own service requests

**Goal**

* To provide a single, simple, and secure place to request updates and track request status

### Role 2: Customer Service Representative (CSR)

**Access**

* Can view and manage service requests from all customers

**Goal**

* To provide a centralised work queue for efficient handling of customer requests

## 4. Core features

### A. Customer-facing portal features

#### Secure customer login

* Standard email/password login or bank credential login

#### Customer dashboard

* Displays the customer’s current personal information on record
* Shows a history of the customer’s service requests with current status, such as:

  * Pending
  * In Progress
  * Completed
  * Rejected

#### Initiate information update

* A simple and intuitive form for customers to submit updates to:

  * address
  * phone number
  * email address
* The form should be pre-filled with existing information for clarity

#### Real-time status tracking

* The status of a submitted request should update on the dashboard as the CSR processes it

### B. CSR-facing portal features

#### Secure CSR login

* Separate login for bank staff

#### Centralised service request dashboard

* Displays a real-time queue of all service requests submitted by customers
* Each item should show key information:

  * customer name
  * request type
  * submission date
  * status

#### Filtering and searching

CSRs must be able to:

* filter the request queue by status
* search for requests by customer name or service order ID

#### Detailed request view

Clicking a request should open a detailed view containing:

* the customer’s full details
* the old versus new requested information
* the request history

#### Update request status

* CSRs must be able to change request status, for example:

  * Pending → In Progress
  * In Progress → Completed
  * In Progress → Rejected
* This should be done through a simple dropdown or button interface

#### Internal notes

* A dedicated text field must allow CSRs to add internal-only notes to a service request
* These notes must not be visible to the customer

## 5. API and data specification

This section defines the API endpoints and data structures used by the application.

### A. API endpoints

#### 1. Initiate a service request

**Endpoint**
`POST /ServicingOrder/Initiate`

**Usage**
Called by the customer portal when a user submits a personal information update request.

**Request body**
`InitiateRequest`

**Response**
`ServicingOrder`

---

#### 2. Get a list of service requests

**Endpoint**
`GET /ServicingOrder`

**Usage**
Called by the CSR portal to populate the main dashboard. Supports filtering.

**Query parameters**

* `status` *(optional, string)* — filters requests by status, for example `Pending`

**Response**
An array of `ServicingOrder` objects:

```json
[ServicingOrder, ...]
```

---

#### 3. Get a single service request

**Endpoint**
`GET /ServicingOrder/{servicingOrderId}`

**Usage**
Called by both portals to retrieve full details of a specific service request.

**Response**
`ServicingOrder`

---

#### 4. Update a service request

**Endpoint**
`PUT /ServicingOrder/{servicingOrderId}/Update`

**Usage**
Called by the CSR portal to change request status or add an internal note.

**Request body**
`UpdateRequest`

**Response**
`ServicingOrder`

### B. Data models

#### ServicingOrder

The core object representing a single service request.

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

#### InitiateRequest

Used by the customer application to create a new request.

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

#### UpdateRequest

Used by the CSR application to update request status and add notes.

```json
{
  "servicingOrderStatus": "In Progress",
  "newInternalNote": {
    "note": "Verified new address via phone call.",
    "author": "csr_john_smith"
  }
}
```

## 6. Critical business rule

The application must be designed with the explicit assumption that there is **no straight-through processing**.

Every service request initiated by a customer is a **ticket** that must be manually reviewed and actioned by a CSR in the bank’s other systems.

The role of this application is to **facilitate and track the manual workflow**, not to automate it.

If you’d like, I can also turn this into a cleaner **README-style markdown spec** with sections like scope, assumptions, functional requirements, and acceptance criteria.
