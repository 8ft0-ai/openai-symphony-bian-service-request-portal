import assert from "node:assert/strict"
import test from "node:test"

import { createInMemoryServicingOrderStore } from "../api/servicing-order-store.js"
import {
  createServicingOrder,
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

test("blocks downstream profile-update gateway injection during request submission", () => {
  const store = createInMemoryServicingOrderStore()
  let gatewayCalled = false

  assert.throws(
    () =>
      createServicingOrder({
        authContext: {
          role: "customer",
          customerReference: "CUST_11111",
        },
        payload: buildInitiatePayload(),
        store,
        downstreamProfileUpdateGateway: () => {
          gatewayCalled = true
        },
      }),
    (error) => {
      assert.equal(error.statusCode, 409)
      assert.equal(error.error, "Conflict")
      assert.match(error.message, /Automated downstream profile updates are disabled/i)
      return true
    },
  )

  assert.equal(gatewayCalled, false)
  assert.equal(store.list().length, 0)
})

test("blocks downstream profile-update gateway injection during CSR updates", () => {
  const store = createInMemoryServicingOrderStore()

  store.create({
    servicingOrderId: "SO_TEST_MANUAL_001",
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

  let gatewayCalled = false

  assert.throws(
    () =>
      updateServicingOrder({
        authContext: { role: "csr", staffId: "csr.ops" },
        servicingOrderId: "SO_TEST_MANUAL_001",
        payload: { servicingOrderStatus: "In Progress" },
        store,
        downstreamProfileUpdateGateway: () => {
          gatewayCalled = true
        },
      }),
    (error) => {
      assert.equal(error.statusCode, 409)
      assert.equal(error.error, "Conflict")
      assert.match(error.message, /Automated downstream profile updates are disabled/i)
      return true
    },
  )

  assert.equal(gatewayCalled, false)
  assert.equal(store.getById("SO_TEST_MANUAL_001")?.servicingOrderStatus, "Pending")
})
