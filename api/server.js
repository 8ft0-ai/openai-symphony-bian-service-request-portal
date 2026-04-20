import http from "node:http"
import { pathToFileURL } from "node:url"

import {
  createServicingOrder,
  getServicingOrderById,
  getCustomerProfile,
  listServicingOrders,
  serializeRequestError,
  updateServicingOrder,
} from "./servicing-order-service.js"
import { createInMemoryServicingOrderStore } from "./servicing-order-store.js"

function getHeaderValue(value) {
  return Array.isArray(value) ? value[0] : value
}

function buildAuthContext(headers) {
  return {
    role: getHeaderValue(headers["x-authenticated-role"])?.trim(),
    staffId: getHeaderValue(headers["x-csr-staff-id"])?.trim(),
    customerReference: getHeaderValue(headers["x-customer-reference"])?.trim(),
    customerName: getHeaderValue(headers["x-customer-name"])?.trim(),
  }
}

function writeJson(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" })
  response.end(JSON.stringify(body))
}

async function readJsonBody(request) {
  let body = ""

  for await (const chunk of request) {
    body += chunk
  }

  if (!body) {
    return {}
  }

  try {
    return JSON.parse(body)
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON."), {
      statusCode: 400,
      error: "Bad Request",
      details: [{ field: "body", message: "Malformed JSON payload." }],
    })
  }
}

async function handleInitiateRoute(request, response, dependencies) {
  try {
    const payload = await readJsonBody(request)
    const { responseOrder } = createServicingOrder({
      authContext: buildAuthContext(request.headers),
      payload,
      store: dependencies.store,
      now: dependencies.now,
      generateId: dependencies.generateId,
    })

    writeJson(response, 201, responseOrder)
  } catch (error) {
    const statusCode = error.statusCode ?? 500
    writeJson(response, statusCode, serializeRequestError(error))
  }
}

async function handleUpdateRoute(request, response, dependencies, servicingOrderId) {
  try {
    const payload = await readJsonBody(request)
    const updatedOrder = updateServicingOrder({
      authContext: buildAuthContext(request.headers),
      servicingOrderId,
      payload,
      store: dependencies.store,
      now: dependencies.now,
    })

    writeJson(response, 200, updatedOrder)
  } catch (error) {
    const statusCode = error.statusCode ?? 500
    writeJson(response, statusCode, serializeRequestError(error))
  }
}

function handleListRoute(request, response, dependencies, requestUrl) {
  try {
    const servicingOrders = listServicingOrders({
      authContext: buildAuthContext(request.headers),
      query: {
        status: requestUrl.searchParams.get("status"),
        customerReference: requestUrl.searchParams.get("customerReference"),
      },
      store: dependencies.store,
    })

    writeJson(response, 200, servicingOrders)
  } catch (error) {
    const statusCode = error.statusCode ?? 500
    writeJson(response, statusCode, serializeRequestError(error))
  }
}

function handleGetByIdRoute(request, response, dependencies, servicingOrderId) {
  try {
    const servicingOrder = getServicingOrderById({
      authContext: buildAuthContext(request.headers),
      servicingOrderId,
      store: dependencies.store,
    })

    writeJson(response, 200, servicingOrder)
  } catch (error) {
    const statusCode = error.statusCode ?? 500
    writeJson(response, statusCode, serializeRequestError(error))
  }
}

function handleCustomerProfileRoute(request, response, requestUrl) {
  try {
    const customerProfile = getCustomerProfile({
      authContext: buildAuthContext(request.headers),
      query: {
        customerReference: requestUrl.searchParams.get("customerReference"),
      },
    })

    writeJson(response, 200, customerProfile)
  } catch (error) {
    const statusCode = error.statusCode ?? 500
    writeJson(response, statusCode, serializeRequestError(error))
  }
}

function routeRequest(request, response, dependencies) {
  const requestUrl = new URL(request.url, "http://127.0.0.1")
  const servicingOrderDetailMatch = requestUrl.pathname.match(/^\/ServicingOrder\/(?!Initiate$)([^/]+)$/)
  const updateRouteMatch = requestUrl.pathname.match(/^\/ServicingOrder\/([^/]+)\/Update$/)

  if (updateRouteMatch && request.method === "PUT") {
    const servicingOrderId = decodeURIComponent(updateRouteMatch[1])
    void handleUpdateRoute(request, response, dependencies, servicingOrderId)
    return
  }

  if (updateRouteMatch) {
    writeJson(response, 405, {
      error: "Method Not Allowed",
      message: "Use PUT for /ServicingOrder/{servicingOrderId}/Update.",
    })
    return
  }

  if (requestUrl.pathname === "/CustomerProfile" && request.method === "GET") {
    handleCustomerProfileRoute(request, response, requestUrl)
    return
  }

  if (requestUrl.pathname === "/CustomerProfile") {
    writeJson(response, 405, {
      error: "Method Not Allowed",
      message: "Use GET for /CustomerProfile.",
    })
    return
  }

  if (requestUrl.pathname === "/ServicingOrder" && request.method === "GET") {
    handleListRoute(request, response, dependencies, requestUrl)
    return
  }

  if (servicingOrderDetailMatch && request.method === "GET") {
    const servicingOrderId = decodeURIComponent(servicingOrderDetailMatch[1])
    handleGetByIdRoute(request, response, dependencies, servicingOrderId)
    return
  }

  if (requestUrl.pathname === "/ServicingOrder") {
    writeJson(response, 405, {
      error: "Method Not Allowed",
      message: "Use GET for /ServicingOrder.",
    })
    return
  }

  if (servicingOrderDetailMatch) {
    writeJson(response, 405, {
      error: "Method Not Allowed",
      message: "Use GET for /ServicingOrder/{servicingOrderId}.",
    })
    return
  }

  if (requestUrl.pathname === "/ServicingOrder/Initiate" && request.method === "POST") {
    void handleInitiateRoute(request, response, dependencies)
    return
  }

  if (requestUrl.pathname === "/ServicingOrder/Initiate") {
    writeJson(response, 405, {
      error: "Method Not Allowed",
      message: "Use POST for /ServicingOrder/Initiate.",
    })
    return
  }

  writeJson(response, 404, {
    error: "Not Found",
    message: "Route not found.",
  })
}

export function createApiServer({
  store = createInMemoryServicingOrderStore(),
  now,
  generateId,
} = {}) {
  const server = http.createServer((request, response) => {
    routeRequest(request, response, { store, now, generateId })
  })

  return { server, store }
}

function startStandaloneServer() {
  const port = Number(process.env.PORT ?? "3000")
  const { server } = createApiServer()

  server.listen(port, () => {
    console.log(`Servicing Order API listening on http://127.0.0.1:${port}`)
  })
}

const isMainModule =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (isMainModule) {
  startStandaloneServer()
}
