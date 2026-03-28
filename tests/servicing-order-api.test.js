import assert from "node:assert/strict"
import { once } from "node:events"
import test from "node:test"

import { createApiServer } from "../api/server.js"
import { createInMemoryServicingOrderStore } from "../api/servicing-order-store.js"

const requestFixtures = [
  {
    name: "Address Update",
    payload: {
      customerReference: "CUST_98765",
      customerName: "Jane Doe",
      requestType: "Address Update",
      requestDetails: {
        oldAddress: "123 Old Street, Townsville, QLD 4810",
        newAddress: "456 New Avenue, Parramatta, NSW 2150",
      },
    },
  },
  {
    name: "Phone Update",
    payload: {
      customerReference: "CUST_98765",
      customerName: "Jane Doe",
      requestType: "Phone Update",
      requestDetails: {
        oldPhoneNumber: "+61 2 1111 2222",
        newPhoneNumber: "+61 2 3333 4444",
      },
    },
  },
  {
    name: "Email Update",
    payload: {
      customerReference: "CUST_98765",
      customerName: "Jane Doe",
      requestType: "Email Update",
      requestDetails: {
        oldEmailAddress: "jane.old@example.com",
        newEmailAddress: "jane.new@example.com",
      },
    },
  },
]

async function withApiServer(run, { now, generateId } = {}) {
  const store = createInMemoryServicingOrderStore()
  const { server } = createApiServer({ store, now, generateId })

  server.listen(0)
  await once(server, "listening")

  const address = server.address()
  const baseUrl =
    typeof address === "object" && address ? `http://127.0.0.1:${address.port}` : null

  try {
    await run({ baseUrl, store })
  } finally {
    server.close()
    await once(server, "close")
  }
}

async function initiateRequest(baseUrl, payload, headers = {}) {
  const response = await fetch(`${baseUrl}/ServicingOrder/Initiate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-authenticated-role": "customer",
      "x-customer-reference": payload.customerReference ?? "CUST_98765",
      ...headers,
    },
    body: JSON.stringify(payload),
  })

  return {
    status: response.status,
    body: await response.json(),
  }
}

for (const fixture of requestFixtures) {
  test(`creates a Pending servicing order for ${fixture.name}`, async () => {
    const now = () => "2026-03-28T00:30:00.000Z"

    await withApiServer(
      async ({ baseUrl, store }) => {
        const response = await initiateRequest(baseUrl, fixture.payload, {
          "x-customer-name": fixture.payload.customerName,
        })

        assert.equal(response.status, 201)
        assert.deepEqual(response.body, {
          servicingOrderId: "SO_TEST_0001",
          customerReference: fixture.payload.customerReference,
          customerName: fixture.payload.customerName,
          requestType: fixture.payload.requestType,
          servicingOrderStatus: "Pending",
          submittedDate: now(),
          lastUpdateDate: now(),
          requestDetails: fixture.payload.requestDetails,
        })

        const [storedOrder] = store.list()

        assert.equal(storedOrder.servicingOrderStatus, "Pending")
        assert.deepEqual(storedOrder.internalNotes, [
          {
            note: "Request submitted by customer.",
            author: "System",
            timestamp: now(),
          },
        ])
      },
      { now, generateId: () => "SO_TEST_0001" },
    )
  })
}

test("returns validation errors for missing required fields", async () => {
  await withApiServer(async ({ baseUrl }) => {
    const response = await initiateRequest(baseUrl, {
      customerReference: "CUST_98765",
      customerName: "",
      requestType: "Address Update",
      requestDetails: {
        oldAddress: "123 Old Street, Townsville, QLD 4810",
        newAddress: "",
      },
    })

    assert.equal(response.status, 400)
    assert.equal(response.body.error, "Bad Request")
    assert.match(response.body.message, /failed validation/i)
    assert.deepEqual(response.body.details, [
      { field: "customerName", message: "customerName is required." },
      {
        field: "requestDetails.newAddress",
        message: "requestDetails.newAddress is required.",
      },
    ])
  })
})

test("rejects unsupported request types", async () => {
  await withApiServer(async ({ baseUrl }) => {
    const response = await initiateRequest(baseUrl, {
      customerReference: "CUST_98765",
      customerName: "Jane Doe",
      requestType: "Name Update",
      requestDetails: {
        oldName: "Jane Doe",
        newName: "Jane Smith",
      },
    })

    assert.equal(response.status, 400)
    assert.deepEqual(response.body.details, [
      {
        field: "requestType",
        message: "requestType must be one of: Address Update, Phone Update, Email Update.",
      },
    ])
  })
})

test("rejects unauthenticated requests", async () => {
  await withApiServer(async ({ baseUrl }) => {
    const response = await initiateRequest(
      baseUrl,
      requestFixtures[0].payload,
      {
        "x-authenticated-role": "",
        "x-customer-reference": "",
      },
    )

    assert.equal(response.status, 401)
    assert.deepEqual(response.body, {
      error: "Unauthorized",
      message: "Customer-authenticated context is required.",
    })
  })
})

test("rejects mismatched customer context", async () => {
  await withApiServer(async ({ baseUrl }) => {
    const response = await initiateRequest(
      baseUrl,
      requestFixtures[0].payload,
      {
        "x-customer-reference": "CUST_11111",
      },
    )

    assert.equal(response.status, 403)
    assert.deepEqual(response.body, {
      error: "Forbidden",
      message: "Authenticated customer context does not match the request customer reference.",
    })
  })
})
