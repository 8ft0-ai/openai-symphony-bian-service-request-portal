import { randomUUID } from "node:crypto"

const REQUEST_DETAIL_FIELDS = {
  "Address Update": ["oldAddress", "newAddress"],
  "Phone Update": ["oldPhoneNumber", "newPhoneNumber"],
  "Email Update": ["oldEmailAddress", "newEmailAddress"],
}

function createRequestError(statusCode, error, message, details = []) {
  const requestError = new Error(message)
  requestError.statusCode = statusCode
  requestError.error = error
  requestError.details = details
  return requestError
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function normalizeTextField(value) {
  return typeof value === "string" ? value.trim() : ""
}

function validateRequiredText(value, field, details) {
  const normalizedValue = normalizeTextField(value)

  if (!normalizedValue) {
    details.push({ field, message: `${field} is required.` })
  }

  return normalizedValue
}

function validateRequestDetails(requestType, requestDetails, details) {
  if (!isObject(requestDetails)) {
    details.push({
      field: "requestDetails",
      message: "requestDetails is required and must be an object.",
    })
    return {}
  }

  const requiredFields = REQUEST_DETAIL_FIELDS[requestType]

  if (!requiredFields) {
    return {}
  }

  return Object.fromEntries(
    requiredFields.map((field) => [
      field,
      validateRequiredText(requestDetails[field], `requestDetails.${field}`, details),
    ]),
  )
}

function validateInitiatePayload(payload) {
  if (!isObject(payload)) {
    throw createRequestError(
      400,
      "Bad Request",
      "The initiate payload must be a JSON object.",
      [{ field: "body", message: "A JSON object body is required." }],
    )
  }

  const details = []
  const customerReference = validateRequiredText(
    payload.customerReference,
    "customerReference",
    details,
  )
  const customerName = validateRequiredText(payload.customerName, "customerName", details)
  const requestType = validateRequiredText(payload.requestType, "requestType", details)
  const normalizedRequestType = REQUEST_DETAIL_FIELDS[requestType] ? requestType : ""

  if (requestType && !normalizedRequestType) {
    details.push({
      field: "requestType",
      message: `requestType must be one of: ${Object.keys(REQUEST_DETAIL_FIELDS).join(", ")}.`,
    })
  }

  const requestDetails = validateRequestDetails(
    normalizedRequestType,
    payload.requestDetails,
    details,
  )

  if (details.length > 0) {
    throw createRequestError(
      400,
      "Bad Request",
      "The initiate payload failed validation.",
      details,
    )
  }

  return {
    customerReference,
    customerName,
    requestType: normalizedRequestType,
    requestDetails,
  }
}

function defaultGenerateId() {
  return `SO_${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`
}

function buildInternalNote(timestamp) {
  return {
    note: "Request submitted by customer.",
    author: "System",
    timestamp,
  }
}

function normalizeOptionalText(value) {
  const normalizedValue = normalizeTextField(value)
  return normalizedValue || null
}

export function toCustomerServicingOrder(servicingOrder) {
  const { internalNotes, ...customerFacingOrder } = servicingOrder
  return structuredClone(customerFacingOrder)
}

export function createServicingOrder({
  authContext,
  payload,
  store,
  now = () => new Date().toISOString(),
  generateId = defaultGenerateId,
}) {
  if (!authContext || authContext.role !== "customer" || !authContext.customerReference) {
    throw createRequestError(
      401,
      "Unauthorized",
      "Customer-authenticated context is required.",
    )
  }

  const initiateRequest = validateInitiatePayload(payload)

  if (initiateRequest.customerReference !== authContext.customerReference) {
    throw createRequestError(
      403,
      "Forbidden",
      "Authenticated customer context does not match the request customer reference.",
    )
  }

  const timestamp = now()
  const servicingOrder = {
    servicingOrderId: generateId(),
    customerReference: initiateRequest.customerReference,
    customerName: initiateRequest.customerName,
    requestType: initiateRequest.requestType,
    servicingOrderStatus: "Pending",
    submittedDate: timestamp,
    lastUpdateDate: timestamp,
    requestDetails: initiateRequest.requestDetails,
    internalNotes: [buildInternalNote(timestamp)],
  }

  const storedOrder = store.create(servicingOrder)

  return {
    storedOrder,
    responseOrder: toCustomerServicingOrder(storedOrder),
  }
}

export function listServicingOrders({
  authContext,
  query = {},
  store,
}) {
  const role = normalizeTextField(authContext?.role).toLowerCase()
  const statusFilter = normalizeOptionalText(query.status)
  const customerReferenceFilter = normalizeOptionalText(query.customerReference)

  let orders

  if (role === "csr") {
    orders = store.list()
  } else if (role === "customer") {
    const authenticatedCustomerReference = normalizeOptionalText(
      authContext?.customerReference,
    )

    if (!authenticatedCustomerReference) {
      throw createRequestError(
        401,
        "Unauthorized",
        "Customer-authenticated context is required.",
      )
    }

    if (
      customerReferenceFilter &&
      customerReferenceFilter !== authenticatedCustomerReference
    ) {
      throw createRequestError(
        403,
        "Forbidden",
        "Authenticated customer context does not match the requested customer reference.",
      )
    }

    orders = store
      .list()
      .filter((order) => order.customerReference === authenticatedCustomerReference)
  } else {
    throw createRequestError(
      401,
      "Unauthorized",
      "Authenticated CSR or customer context is required.",
    )
  }

  if (customerReferenceFilter && role === "csr") {
    orders = orders.filter((order) => order.customerReference === customerReferenceFilter)
  }

  if (statusFilter) {
    orders = orders.filter((order) => order.servicingOrderStatus === statusFilter)
  }

  if (role === "customer") {
    return orders.map(toCustomerServicingOrder)
  }

  return orders.map((order) => structuredClone(order))
}

export function serializeRequestError(error) {
  const body = {
    error: error.error ?? "Internal Server Error",
    message: error.message ?? "Unexpected error.",
  }

  if (Array.isArray(error.details) && error.details.length > 0) {
    body.details = error.details
  }

  return body
}
