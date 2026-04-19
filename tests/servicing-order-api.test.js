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

async function listRequest(baseUrl, { query = "", headers = {} } = {}) {
  const response = await fetch(`${baseUrl}/ServicingOrder${query}`, {
    method: "GET",
    headers,
  })

  return {
    status: response.status,
    body: await response.json(),
  }
}

async function customerProfileRequest(baseUrl, { query = "", headers = {} } = {}) {
  const response = await fetch(`${baseUrl}/CustomerProfile${query}`, {
    method: "GET",
    headers,
  })

  return {
    status: response.status,
    body: await response.json(),
  }
}

function createStoredOrder({
  servicingOrderId,
  customerReference,
  customerName,
  requestType,
  servicingOrderStatus,
  submittedDate,
}) {
  return {
    servicingOrderId,
    customerReference,
    customerName,
    requestType,
    servicingOrderStatus,
    submittedDate,
    lastUpdateDate: submittedDate,
    requestDetails: {
      oldAddress: "100 Example Street, Sydney NSW 2000",
      newAddress: "200 Updated Avenue, Sydney NSW 2000",
    },
    internalNotes: [
      {
        note: "Request submitted by customer.",
        author: "System",
        timestamp: submittedDate,
      },
    ],
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

test("returns servicing order queue data for CSR users", async () => {
  await withApiServer(async ({ baseUrl, store }) => {
    store.create(
      createStoredOrder({
        servicingOrderId: "SO_TEST_2001",
        customerReference: "CUST_11111",
        customerName: "Alex Quinn",
        requestType: "Address Update",
        servicingOrderStatus: "Pending",
        submittedDate: "2026-04-01T00:00:00.000Z",
      }),
    )
    store.create(
      createStoredOrder({
        servicingOrderId: "SO_TEST_2002",
        customerReference: "CUST_22222",
        customerName: "Riley Hart",
        requestType: "Email Update",
        servicingOrderStatus: "Completed",
        submittedDate: "2026-04-02T00:00:00.000Z",
      }),
    )

    const response = await listRequest(baseUrl, {
      headers: {
        "x-authenticated-role": "csr",
        "x-csr-staff-id": "csr.queue.ops",
      },
    })

    assert.equal(response.status, 200)
    assert.equal(response.body.length, 2)
    assert.deepEqual(
      response.body.map((order) => ({
        servicingOrderId: order.servicingOrderId,
        customerReference: order.customerReference,
        servicingOrderStatus: order.servicingOrderStatus,
      })),
      [
        {
          servicingOrderId: "SO_TEST_2001",
          customerReference: "CUST_11111",
          servicingOrderStatus: "Pending",
        },
        {
          servicingOrderId: "SO_TEST_2002",
          customerReference: "CUST_22222",
          servicingOrderStatus: "Completed",
        },
      ],
    )
    assert.ok(Array.isArray(response.body[0].internalNotes))
  })
})

test("supports status filtering for CSR queue retrieval", async () => {
  await withApiServer(async ({ baseUrl, store }) => {
    store.create(
      createStoredOrder({
        servicingOrderId: "SO_TEST_3001",
        customerReference: "CUST_11111",
        customerName: "Alex Quinn",
        requestType: "Address Update",
        servicingOrderStatus: "Pending",
        submittedDate: "2026-04-01T00:00:00.000Z",
      }),
    )
    store.create(
      createStoredOrder({
        servicingOrderId: "SO_TEST_3002",
        customerReference: "CUST_22222",
        customerName: "Riley Hart",
        requestType: "Email Update",
        servicingOrderStatus: "Completed",
        submittedDate: "2026-04-02T00:00:00.000Z",
      }),
    )

    const response = await listRequest(baseUrl, {
      query: "?status=Pending",
      headers: {
        "x-authenticated-role": "csr",
        "x-csr-staff-id": "csr.queue.ops",
      },
    })

    assert.equal(response.status, 200)
    assert.deepEqual(response.body.map((order) => order.servicingOrderId), ["SO_TEST_3001"])
  })
})

test("rejects list retrieval without an authenticated role context", async () => {
  await withApiServer(async ({ baseUrl }) => {
    const response = await listRequest(baseUrl)

    assert.equal(response.status, 401)
    assert.deepEqual(response.body, {
      error: "Unauthorized",
      message: "Authenticated CSR or customer context is required.",
    })
  })
})

test("rejects CSR list retrieval without staff authentication context", async () => {
  await withApiServer(async ({ baseUrl }) => {
    const response = await listRequest(baseUrl, {
      headers: {
        "x-authenticated-role": "csr",
      },
    })

    assert.equal(response.status, 401)
    assert.deepEqual(response.body, {
      error: "Unauthorized",
      message: "CSR-authenticated context is required.",
    })
  })
})

test("rejects customer list retrieval without customer reference context", async () => {
  await withApiServer(async ({ baseUrl }) => {
    const response = await listRequest(baseUrl, {
      headers: {
        "x-authenticated-role": "customer",
      },
    })

    assert.equal(response.status, 401)
    assert.deepEqual(response.body, {
      error: "Unauthorized",
      message: "Customer-authenticated context is required.",
    })
  })
})

test("returns only own servicing orders for customer history retrieval", async () => {
  await withApiServer(async ({ baseUrl, store }) => {
    store.create(
      createStoredOrder({
        servicingOrderId: "SO_TEST_4001",
        customerReference: "CUST_11111",
        customerName: "Alex Quinn",
        requestType: "Address Update",
        servicingOrderStatus: "Pending",
        submittedDate: "2026-04-01T00:00:00.000Z",
      }),
    )
    store.create(
      createStoredOrder({
        servicingOrderId: "SO_TEST_4002",
        customerReference: "CUST_22222",
        customerName: "Riley Hart",
        requestType: "Email Update",
        servicingOrderStatus: "Completed",
        submittedDate: "2026-04-02T00:00:00.000Z",
      }),
    )

    const response = await listRequest(baseUrl, {
      headers: {
        "x-authenticated-role": "customer",
        "x-customer-reference": "CUST_11111",
      },
    })

    assert.equal(response.status, 200)
    assert.deepEqual(response.body.map((order) => order.servicingOrderId), ["SO_TEST_4001"])
    assert.equal(response.body[0].customerReference, "CUST_11111")
    assert.equal("internalNotes" in response.body[0], false)
  })
})

test("rejects customer attempts to query another customer's servicing orders", async () => {
  await withApiServer(async ({ baseUrl, store }) => {
    store.create(
      createStoredOrder({
        servicingOrderId: "SO_TEST_5001",
        customerReference: "CUST_11111",
        customerName: "Alex Quinn",
        requestType: "Address Update",
        servicingOrderStatus: "Pending",
        submittedDate: "2026-04-01T00:00:00.000Z",
      }),
    )

    const response = await listRequest(baseUrl, {
      query: "?customerReference=CUST_22222",
      headers: {
        "x-authenticated-role": "customer",
        "x-customer-reference": "CUST_11111",
      },
    })

    assert.equal(response.status, 403)
    assert.deepEqual(response.body, {
      error: "Forbidden",
      message: "customerReference filtering is restricted to CSR-authenticated context.",
    })
  })
})

test("returns only the authenticated customer's profile data", async () => {
  await withApiServer(async ({ baseUrl }) => {
    const response = await customerProfileRequest(baseUrl, {
      headers: {
        "x-authenticated-role": "customer",
        "x-customer-reference": "CUST_98765",
      },
    })

    assert.equal(response.status, 200)
    assert.deepEqual(response.body, {
      customerReference: "CUST_98765",
      customerName: "Jane Doe",
      profile: {
        residentialAddress: "123 Old Street, Townsville, QLD 4810",
        mobileNumber: "+61 2 1111 2222",
        emailAddress: "jane.old@example.com",
      },
    })
  })
})

test("rejects customer attempts to retrieve another customer's profile", async () => {
  await withApiServer(async ({ baseUrl }) => {
    const response = await customerProfileRequest(baseUrl, {
      query: "?customerReference=CUST_22222",
      headers: {
        "x-authenticated-role": "customer",
        "x-customer-reference": "CUST_11111",
      },
    })

    assert.equal(response.status, 403)
    assert.deepEqual(response.body, {
      error: "Forbidden",
      message:
        "Authenticated customer context does not match the requested customer reference.",
    })
  })
})

test("rejects CSR-authenticated access to customer profile endpoint", async () => {
  await withApiServer(async ({ baseUrl }) => {
    const response = await customerProfileRequest(baseUrl, {
      headers: {
        "x-authenticated-role": "csr",
      },
    })

    assert.equal(response.status, 403)
    assert.deepEqual(response.body, {
      error: "Forbidden",
      message: "Customer-only operation. CSR-authenticated context is not allowed.",
    })
  })
})
