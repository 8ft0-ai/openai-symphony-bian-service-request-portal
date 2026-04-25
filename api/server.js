import http from "node:http"
import { pathToFileURL } from "node:url"

import {
  createRequestError,
  createServicingOrder,
  getServicingOrderById,
  getCustomerProfile,
  listServicingOrders,
  serializeRequestError,
  updateServicingOrder,
} from "./servicing-order-service.js"
import { createInMemoryServicingOrderStore } from "./servicing-order-store.js"
import { createOperationalLogEventWriter } from "./operational-logger.js"

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

function writeError(response, error) {
  const statusCode = error.statusCode ?? 500
  writeJson(response, statusCode, serializeRequestError(error))
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
    throw createRequestError(
      400,
      "Bad Request",
      "Request body must be valid JSON.",
      [{ field: "body", message: "Malformed JSON payload." }],
    )
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
      logEvent: dependencies.logEvent,
    })

    writeJson(response, 201, responseOrder)
  } catch (error) {
    writeError(response, error)
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
      logEvent: dependencies.logEvent,
    })

    writeJson(response, 200, updatedOrder)
  } catch (error) {
    writeError(response, error)
  }
}

function handleListRoute(request, response, dependencies, requestUrl) {
  try {
    const servicingOrders = listServicingOrders({
      authContext: buildAuthContext(request.headers),
      query: {
        status: requestUrl.searchParams.get("status"),
        customerReference: requestUrl.searchParams.get("customerReference"),
        customerName: requestUrl.searchParams.get("customerName"),
      },
      store: dependencies.store,
      logEvent: dependencies.logEvent,
    })

    writeJson(response, 200, servicingOrders)
  } catch (error) {
    writeError(response, error)
  }
}

function handleGetByIdRoute(request, response, dependencies, servicingOrderId) {
  try {
    const servicingOrder = getServicingOrderById({
      authContext: buildAuthContext(request.headers),
      servicingOrderId,
      store: dependencies.store,
      logEvent: dependencies.logEvent,
    })

    writeJson(response, 200, servicingOrder)
  } catch (error) {
    writeError(response, error)
  }
}

function handleCustomerProfileRoute(request, response, dependencies, requestUrl) {
  try {
    const customerProfile = getCustomerProfile({
      authContext: buildAuthContext(request.headers),
      query: {
        customerReference: requestUrl.searchParams.get("customerReference"),
      },
      logEvent: dependencies.logEvent,
    })

    writeJson(response, 200, customerProfile)
  } catch (error) {
    writeError(response, error)
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
    writeError(
      response,
      createRequestError(
        405,
        "Method Not Allowed",
        "Use PUT for /ServicingOrder/{servicingOrderId}/Update.",
      ),
    )
    return
  }

  if (requestUrl.pathname === "/CustomerProfile" && request.method === "GET") {
    handleCustomerProfileRoute(request, response, dependencies, requestUrl)
    return
  }

  if (requestUrl.pathname === "/CustomerProfile") {
    writeError(
      response,
      createRequestError(405, "Method Not Allowed", "Use GET for /CustomerProfile."),
    )
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
    writeError(
      response,
      createRequestError(405, "Method Not Allowed", "Use GET for /ServicingOrder."),
    )
    return
  }

  if (servicingOrderDetailMatch) {
    writeError(
      response,
      createRequestError(
        405,
        "Method Not Allowed",
        "Use GET for /ServicingOrder/{servicingOrderId}.",
      ),
    )
    return
  }

  if (requestUrl.pathname === "/ServicingOrder/Initiate" && request.method === "POST") {
    void handleInitiateRoute(request, response, dependencies)
    return
  }

  if (requestUrl.pathname === "/ServicingOrder/Initiate") {
    writeError(
      response,
      createRequestError(405, "Method Not Allowed", "Use POST for /ServicingOrder/Initiate."),
    )
    return
  }

  writeError(response, createRequestError(404, "Not Found", "Route not found."))
}

export function createApiServer({
  store = createInMemoryServicingOrderStore(),
  now,
  generateId,
  logEvent = createOperationalLogEventWriter(),
} = {}) {
  const server = http.createServer((request, response) => {
    routeRequest(request, response, { store, now, generateId, logEvent })
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
