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

async function detailRequest(baseUrl, servicingOrderId, { headers = {} } = {}) {
  const response = await fetch(`${baseUrl}/ServicingOrder/${encodeURIComponent(servicingOrderId)}`, {
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

async function updateRequest(
  baseUrl,
  servicingOrderId,
  payload,
  headers = {},
) {
  const response = await fetch(`${baseUrl}/ServicingOrder/${servicingOrderId}/Update`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "x-authenticated-role": "csr",
      "x-csr-staff-id": "csr.queue.ops",
      ...headers,
    },
    body: JSON.stringify(payload),
  })

  return {
    status: response.status,
    body: await response.json(),
  }
}

function expectedErrorCode(status) {
  return {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    500: "internal_server_error",
  }[status]
}

function assertErrorResponse(response, { status, error, message, details = [] }) {
  assert.equal(response.status, status)
  assert.deepEqual(response.body, {
    status,
    code: expectedErrorCode(status),
    error,
    message,
    details,
  })
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
    statusChangeAudit: [],
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

    assertErrorResponse(response, {
      status: 400,
      error: "Bad Request",
      message: "The initiate payload failed validation.",
      details: [
        { field: "customerName", message: "customerName is required." },
        {
          field: "requestDetails.newAddress",
          message: "requestDetails.newAddress is required.",
        },
      ],
    })
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

    assertErrorResponse(response, {
      status: 400,
      error: "Bad Request",
      message: "The initiate payload failed validation.",
      details: [
        {
          field: "requestType",
          message: "requestType must be one of: Address Update, Phone Update, Email Update.",
        },
      ],
    })
  })
})

test("rejects auto-completion and profile-update automation controls on submission", async () => {
  await withApiServer(async ({ baseUrl }) => {
    const response = await initiateRequest(baseUrl, {
      customerReference: "CUST_98765",
      customerName: "Jane Doe",
      requestType: "Address Update",
      requestDetails: {
        oldAddress: "123 Old Street, Townsville, QLD 4810",
        newAddress: "456 New Avenue, Parramatta, NSW 2150",
      },
      servicingOrderStatus: "Completed",
      autoApplyProfileChanges: true,
    })

    assert.equal(response.status, 400)
    assert.equal(response.body.error, "Bad Request")
    assert.match(response.body.message, /failed validation/i)
    assert.deepEqual(response.body.details, [
      {
        field: "servicingOrderStatus",
        message:
          "servicingOrderStatus is system-controlled and remains Pending until CSR action.",
      },
      {
        field: "autoApplyProfileChanges",
        message:
          "autoApplyProfileChanges is not supported. Profile changes must be processed manually by CSR.",
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

    assertErrorResponse(response, {
      status: 401,
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

    assertErrorResponse(response, {
      status: 403,
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
    assert.ok(Array.isArray(response.body[0].statusChangeAudit))
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

    assertErrorResponse(response, {
      status: 401,
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

    assertErrorResponse(response, {
      status: 401,
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

    assertErrorResponse(response, {
      status: 401,
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
    assert.equal("statusChangeAudit" in response.body[0], false)
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

    assertErrorResponse(response, {
      status: 403,
      error: "Forbidden",
      message: "customerReference filtering is restricted to CSR-authenticated context.",
    })
  })
})

test("returns a single servicing order by id for CSR users with internal notes", async () => {
  await withApiServer(async ({ baseUrl, store }) => {
    store.create(
      createStoredOrder({
        servicingOrderId: "SO_TEST_6001",
        customerReference: "CUST_11111",
        customerName: "Alex Quinn",
        requestType: "Address Update",
        servicingOrderStatus: "Pending",
        submittedDate: "2026-04-01T00:00:00.000Z",
      }),
    )

    const response = await detailRequest(baseUrl, "SO_TEST_6001", {
      headers: {
        "x-authenticated-role": "csr",
      },
    })

    assert.equal(response.status, 200)
    assert.equal(response.body.servicingOrderId, "SO_TEST_6001")
    assert.ok(Array.isArray(response.body.internalNotes))
    assert.equal(response.body.internalNotes.length, 1)
    assert.ok(Array.isArray(response.body.statusChangeAudit))
  })
})

test("returns a single servicing order by id for owning customer without internal notes", async () => {
  await withApiServer(async ({ baseUrl, store }) => {
    store.create(
      createStoredOrder({
        servicingOrderId: "SO_TEST_6002",
        customerReference: "CUST_11111",
        customerName: "Alex Quinn",
        requestType: "Address Update",
        servicingOrderStatus: "Pending",
        submittedDate: "2026-04-01T00:00:00.000Z",
      }),
    )

    const response = await detailRequest(baseUrl, "SO_TEST_6002", {
      headers: {
        "x-authenticated-role": "customer",
        "x-customer-reference": "CUST_11111",
      },
    })

    assert.equal(response.status, 200)
    assert.equal(response.body.servicingOrderId, "SO_TEST_6002")
    assert.equal(response.body.customerReference, "CUST_11111")
    assert.equal("internalNotes" in response.body, false)
    assert.equal("statusChangeAudit" in response.body, false)
  })
})

test("returns 404 for unknown servicing order id on detail retrieval", async () => {
  await withApiServer(async ({ baseUrl }) => {
    const response = await detailRequest(baseUrl, "SO_TEST_UNKNOWN", {
      headers: {
        "x-authenticated-role": "csr",
      },
    })

    assertErrorResponse(response, {
      status: 404,
      error: "Not Found",
      message: "Servicing order not found.",
    })
  })
})

test("rejects unauthenticated detail retrieval requests", async () => {
  await withApiServer(async ({ baseUrl, store }) => {
    store.create(
      createStoredOrder({
        servicingOrderId: "SO_TEST_6003",
        customerReference: "CUST_11111",
        customerName: "Alex Quinn",
        requestType: "Address Update",
        servicingOrderStatus: "Pending",
        submittedDate: "2026-04-01T00:00:00.000Z",
      }),
    )

    const response = await detailRequest(baseUrl, "SO_TEST_6003")

    assertErrorResponse(response, {
      status: 401,
      error: "Unauthorized",
      message: "Authenticated CSR or customer context is required.",
    })
  })
})

test("rejects customer detail retrieval for another customer's servicing order", async () => {
  await withApiServer(async ({ baseUrl, store }) => {
    store.create(
      createStoredOrder({
        servicingOrderId: "SO_TEST_6004",
        customerReference: "CUST_11111",
        customerName: "Alex Quinn",
        requestType: "Address Update",
        servicingOrderStatus: "Pending",
        submittedDate: "2026-04-01T00:00:00.000Z",
      }),
    )

    const response = await detailRequest(baseUrl, "SO_TEST_6004", {
      headers: {
        "x-authenticated-role": "customer",
        "x-customer-reference": "CUST_22222",
      },
    })

    assertErrorResponse(response, {
      status: 403,
      error: "Forbidden",
      message: "Authenticated customer context does not match the requested servicing order.",
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

    assertErrorResponse(response, {
      status: 403,
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

    assertErrorResponse(response, {
      status: 403,
      error: "Forbidden",
      message: "Customer-only operation. CSR-authenticated context is not allowed.",
    })
  })
})

test("allows CSR status update with internal note append for a valid transition", async () => {
  const now = () => "2026-04-03T00:00:00.000Z"

  await withApiServer(
    async ({ baseUrl, store }) => {
      store.create(
        createStoredOrder({
          servicingOrderId: "SO_TEST_6001",
          customerReference: "CUST_11111",
          customerName: "Alex Quinn",
          requestType: "Address Update",
          servicingOrderStatus: "Pending",
          submittedDate: "2026-04-01T00:00:00.000Z",
        }),
      )

      const response = await updateRequest(baseUrl, "SO_TEST_6001", {
        servicingOrderStatus: "In Progress",
        newInternalNote: {
          note: "Verified update details with customer.",
          author: "csr.queue.ops",
        },
      })

      assert.equal(response.status, 200)
      assert.equal(response.body.servicingOrderId, "SO_TEST_6001")
      assert.equal(response.body.servicingOrderStatus, "In Progress")
      assert.equal(response.body.lastUpdateDate, now())
      assert.deepEqual(response.body.statusChangeAudit.at(-1), {
        fromStatus: "Pending",
        toStatus: "In Progress",
        actor: "csr.queue.ops",
        timestamp: now(),
      })
      assert.deepEqual(response.body.internalNotes.at(-1), {
        note: "Verified update details with customer.",
        author: "csr.queue.ops",
        timestamp: now(),
      })

      const [storedOrder] = store.list()
      assert.equal(storedOrder.servicingOrderStatus, "In Progress")
      assert.equal(storedOrder.lastUpdateDate, now())
      assert.deepEqual(storedOrder.statusChangeAudit.at(-1), {
        fromStatus: "Pending",
        toStatus: "In Progress",
        actor: "csr.queue.ops",
        timestamp: now(),
      })
      assert.deepEqual(storedOrder.internalNotes.at(-1), {
        note: "Verified update details with customer.",
        author: "csr.queue.ops",
        timestamp: now(),
      })
    },
    { now },
  )
})

test("rejects invalid servicing order status transitions with conflict response", async () => {
  await withApiServer(async ({ baseUrl, store }) => {
    store.create(
      createStoredOrder({
        servicingOrderId: "SO_TEST_6002",
        customerReference: "CUST_11111",
        customerName: "Alex Quinn",
        requestType: "Address Update",
        servicingOrderStatus: "Pending",
        submittedDate: "2026-04-01T00:00:00.000Z",
      }),
    )

    const response = await updateRequest(baseUrl, "SO_TEST_6002", {
      servicingOrderStatus: "Completed",
    })

    assertErrorResponse(response, {
      status: 409,
      error: "Conflict",
      message: "Invalid servicing order status transition from Pending to Completed.",
    })
    assert.equal(store.list()[0].servicingOrderStatus, "Pending")
  })
})

test("rejects non-CSR update attempts", async () => {
  await withApiServer(async ({ baseUrl, store }) => {
    store.create(
      createStoredOrder({
        servicingOrderId: "SO_TEST_6003",
        customerReference: "CUST_11111",
        customerName: "Alex Quinn",
        requestType: "Address Update",
        servicingOrderStatus: "Pending",
        submittedDate: "2026-04-01T00:00:00.000Z",
      }),
    )

    const response = await updateRequest(
      baseUrl,
      "SO_TEST_6003",
      { servicingOrderStatus: "In Progress" },
      { "x-authenticated-role": "customer", "x-customer-reference": "CUST_11111" },
    )

    assertErrorResponse(response, {
      status: 401,
      error: "Unauthorized",
      message: "CSR-authenticated context is required.",
    })
  })
})

test("rejects status updates when CSR staff identity is missing", async () => {
  await withApiServer(async ({ baseUrl, store }) => {
    store.create(
      createStoredOrder({
        servicingOrderId: "SO_TEST_6006",
        customerReference: "CUST_11111",
        customerName: "Alex Quinn",
        requestType: "Address Update",
        servicingOrderStatus: "Pending",
        submittedDate: "2026-04-01T00:00:00.000Z",
      }),
    )

    const response = await updateRequest(
      baseUrl,
      "SO_TEST_6006",
      { servicingOrderStatus: "In Progress" },
      { "x-csr-staff-id": "" },
    )

    assertErrorResponse(response, {
      status: 401,
      error: "Unauthorized",
      message: "CSR staff identity is required for servicing order status updates.",
    })
  })
})

test("validates required internal note fields when note is supplied", async () => {
  await withApiServer(async ({ baseUrl, store }) => {
    store.create(
      createStoredOrder({
        servicingOrderId: "SO_TEST_6004",
        customerReference: "CUST_11111",
        customerName: "Alex Quinn",
        requestType: "Address Update",
        servicingOrderStatus: "In Progress",
        submittedDate: "2026-04-01T00:00:00.000Z",
      }),
    )

    const response = await updateRequest(baseUrl, "SO_TEST_6004", {
      newInternalNote: {
        note: " ",
        author: "",
      },
    })

    assertErrorResponse(response, {
      status: 400,
      error: "Bad Request",
      message: "The update payload failed validation.",
      details: [
        { field: "newInternalNote.note", message: "newInternalNote.note is required." },
        { field: "newInternalNote.author", message: "newInternalNote.author is required." },
      ],
    })
  })
})

test("returns standardized bad request payload for malformed JSON", async () => {
  await withApiServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/ServicingOrder/Initiate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-authenticated-role": "customer",
        "x-customer-reference": "CUST_98765",
      },
      body: "{not-valid-json}",
    })

    const body = await response.json()
    assertErrorResponse(
      { status: response.status, body },
      {
        status: 400,
        error: "Bad Request",
        message: "Request body must be valid JSON.",
        details: [{ field: "body", message: "Malformed JSON payload." }],
      },
    )
  })
})

test("returns standardized method-not-allowed payload for route mismatch", async () => {
  await withApiServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/ServicingOrder/Initiate`, {
      method: "GET",
    })

    const body = await response.json()
    assertErrorResponse(
      { status: response.status, body },
      {
        status: 405,
        error: "Method Not Allowed",
        message: "Use POST for /ServicingOrder/Initiate.",
      },
    )
  })
})

test("returns standardized not-found payload for unknown routes", async () => {
  await withApiServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/unknown-route`, {
      method: "GET",
    })

    const body = await response.json()
    assertErrorResponse(
      { status: response.status, body },
      {
        status: 404,
        error: "Not Found",
        message: "Route not found.",
      },
    )
  })
})

test("rejects downstream profile automation controls on update", async () => {
  await withApiServer(async ({ baseUrl, store }) => {
    store.create(
      createStoredOrder({
        servicingOrderId: "SO_TEST_6005",
        customerReference: "CUST_11111",
        customerName: "Alex Quinn",
        requestType: "Address Update",
        servicingOrderStatus: "Pending",
        submittedDate: "2026-04-01T00:00:00.000Z",
      }),
    )

    const response = await updateRequest(baseUrl, "SO_TEST_6005", {
      servicingOrderStatus: "In Progress",
      autoApplyProfileChanges: true,
    })

    assert.equal(response.status, 400)
    assert.equal(response.body.error, "Bad Request")
    assert.match(response.body.message, /failed validation/i)
    assert.deepEqual(response.body.details, [
      {
        field: "autoApplyProfileChanges",
        message:
          "autoApplyProfileChanges is not supported. Profile changes must be processed manually by CSR.",
      },
    ])
    assert.equal(store.list()[0].servicingOrderStatus, "Pending")
  })
})
