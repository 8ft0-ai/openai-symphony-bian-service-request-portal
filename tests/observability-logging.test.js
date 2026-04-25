import assert from "node:assert/strict"
import test from "node:test"

import { createInMemoryServicingOrderStore } from "../api/servicing-order-store.js"
import {
  createServicingOrder,
  listServicingOrders,
  updateServicingOrder,
} from "../api/servicing-order-service.js"

function buildInitiatePayload() {
  return {
    customerReference: "CUST_11111",
    customerName: "Alex Quinn",
    requestType: "Address Update",
    requestDetails: {
      oldAddress: "100 Example Street, Sydney NSW 2000",
      newAddress: "200 Updated Avenue, Sydney NSW 2000",
    },
  }
}

test("emits request initiation workflow logs with non-sensitive fields", () => {
  const store = createInMemoryServicingOrderStore()
  const events = []

  createServicingOrder({
    authContext: {
      role: "customer",
      customerReference: "CUST_11111",
    },
    payload: buildInitiatePayload(),
    store,
    now: () => "2026-04-25T00:00:00.000Z",
    generateId: () => "SO_TEST_LOG_001",
    logEvent: (event) => {
      events.push(event)
    },
  })

  assert.equal(events.length, 1)
  assert.deepEqual(events[0], {
    category: "workflow",
    eventType: "request_initiated",
    action: "servicing_order.initiate",
    servicingOrderId: "SO_TEST_LOG_001",
    customerReference: "CUST_11111",
    requestType: "Address Update",
    status: "Pending",
  })
  assert.equal("requestDetails" in events[0], false)
})

test("emits workflow logs for status updates and internal notes without note text leakage", () => {
  const store = createInMemoryServicingOrderStore()
  const events = []

  store.create({
    servicingOrderId: "SO_TEST_LOG_002",
    customerReference: "CUST_11111",
    customerName: "Alex Quinn",
    requestType: "Address Update",
    servicingOrderStatus: "Pending",
    submittedDate: "2026-04-01T00:00:00.000Z",
    lastUpdateDate: "2026-04-01T00:00:00.000Z",
    requestDetails: {
      oldAddress: "100 Example Street, Sydney NSW 2000",
      newAddress: "200 Updated Avenue, Sydney NSW 2000",
    },
    internalNotes: [
      {
        note: "Request submitted by customer.",
        author: "System",
        timestamp: "2026-04-01T00:00:00.000Z",
      },
    ],
  })

  updateServicingOrder({
    authContext: { role: "csr", staffId: "csr.queue.ops" },
    servicingOrderId: "SO_TEST_LOG_002",
    payload: {
      servicingOrderStatus: "In Progress",
      newInternalNote: {
        note: "Verified update details with customer.",
        author: "csr.queue.ops",
      },
    },
    store,
    now: () => "2026-04-25T00:30:00.000Z",
    logEvent: (event) => {
      events.push(event)
    },
  })

  assert.equal(events.length, 2)
  assert.deepEqual(events[0], {
    category: "workflow",
    eventType: "request_status_updated",
    action: "servicing_order.update",
    servicingOrderId: "SO_TEST_LOG_002",
    actor: {
      role: "csr",
      staffId: "csr.queue.ops",
    },
    previousStatus: "Pending",
    nextStatus: "In Progress",
  })
  assert.deepEqual(events[1], {
    category: "workflow",
    eventType: "internal_note_added",
    action: "servicing_order.update",
    servicingOrderId: "SO_TEST_LOG_002",
    actor: {
      role: "csr",
      staffId: "csr.queue.ops",
    },
    noteAuthor: "csr.queue.ops",
  })
  assert.equal("note" in events[1], false)
})

test("emits security access-denial logs for failed access attempts", () => {
  const store = createInMemoryServicingOrderStore()
  const events = []

  assert.throws(
    () =>
      listServicingOrders({
        authContext: {
          role: "customer",
          customerReference: "CUST_11111",
        },
        query: {
          customerReference: "CUST_22222",
        },
        store,
        logEvent: (event) => {
          events.push(event)
        },
      }),
    /restricted to CSR-authenticated context/i,
  )

  assert.equal(events.length, 1)
  assert.deepEqual(events[0], {
    category: "security",
    eventType: "access_denied",
    action: "servicing_order.list",
    statusCode: 403,
    errorCode: "forbidden",
    actor: {
      role: "customer",
      customerReference: "CUST_11111",
    },
  })
})
