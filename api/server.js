import http from "node:http"
import { pathToFileURL } from "node:url"

import {
  createServicingOrder,
  listServicingOrders,
  serializeRequestError,
} from "./servicing-order-service.js"
import { createInMemoryServicingOrderStore } from "./servicing-order-store.js"

function getHeaderValue(value) {
  return Array.isArray(value) ? value[0] : value
}

function buildAuthContext(headers) {
  return {
    role: getHeaderValue(headers["x-authenticated-role"])?.trim(),
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

function routeRequest(request, response, dependencies) {
  const requestUrl = new URL(request.url, "http://127.0.0.1")

  if (requestUrl.pathname === "/ServicingOrder" && request.method === "GET") {
    handleListRoute(request, response, dependencies, requestUrl)
    return
  }

  if (requestUrl.pathname === "/ServicingOrder") {
    writeJson(response, 405, {
      error: "Method Not Allowed",
      message: "Use GET for /ServicingOrder.",
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
