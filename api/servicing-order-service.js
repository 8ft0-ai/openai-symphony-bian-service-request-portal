import { randomUUID } from "node:crypto"

const REQUEST_DETAIL_FIELDS = {
  "Address Update": ["oldAddress", "newAddress"],
  "Phone Update": ["oldPhoneNumber", "newPhoneNumber"],
  "Email Update": ["oldEmailAddress", "newEmailAddress"],
}

const ALLOWED_SERVICING_ORDER_STATUSES = new Set([
  "Pending",
  "In Progress",
  "Completed",
  "Rejected",
])

const VALID_STATUS_TRANSITIONS = Object.freeze({
  Pending: new Set(["In Progress"]),
  "In Progress": new Set(["Completed", "Rejected"]),
  Completed: new Set(),
  Rejected: new Set(),
})

const CUSTOMER_PROFILE_DIRECTORY = Object.freeze({
  CUST_98765: Object.freeze({
    customerName: "Jane Doe",
    residentialAddress: "123 Old Street, Townsville, QLD 4810",
    mobileNumber: "+61 2 1111 2222",
    emailAddress: "jane.old@example.com",
  }),
  CUST_11111: Object.freeze({
    customerName: "Alex Quinn",
    residentialAddress: "100 Example Street, Sydney NSW 2000",
    mobileNumber: "+61 400 111 111",
    emailAddress: "alex.quinn@example.com",
  }),
  CUST_22222: Object.freeze({
    customerName: "Riley Hart",
    residentialAddress: "200 Updated Avenue, Sydney NSW 2000",
    mobileNumber: "+61 400 222 222",
    emailAddress: "riley.hart@example.com",
  }),
})

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

function validateUpdateInternalNote(newInternalNote, details) {
  if (!isObject(newInternalNote)) {
    details.push({
      field: "newInternalNote",
      message: "newInternalNote must be an object when supplied.",
    })
    return null
  }

  return {
    note: validateRequiredText(newInternalNote.note, "newInternalNote.note", details),
    author: validateRequiredText(newInternalNote.author, "newInternalNote.author", details),
  }
}

function validateUpdatePayload(payload) {
  if (!isObject(payload)) {
    throw createRequestError(
      400,
      "Bad Request",
      "The update payload must be a JSON object.",
      [{ field: "body", message: "A JSON object body is required." }],
    )
  }

  const details = []
  const requestedStatus = normalizeOptionalText(payload.servicingOrderStatus)
  const hasInternalNote = payload.newInternalNote !== undefined && payload.newInternalNote !== null

  if (!requestedStatus && !hasInternalNote) {
    details.push({
      field: "body",
      message: "At least one of servicingOrderStatus or newInternalNote is required.",
    })
  }

  if (requestedStatus && !ALLOWED_SERVICING_ORDER_STATUSES.has(requestedStatus)) {
    details.push({
      field: "servicingOrderStatus",
      message: `servicingOrderStatus must be one of: ${Array.from(ALLOWED_SERVICING_ORDER_STATUSES).join(", ")}.`,
    })
  }

  const internalNote = hasInternalNote
    ? validateUpdateInternalNote(payload.newInternalNote, details)
    : null

  if (details.length > 0) {
    throw createRequestError(
      400,
      "Bad Request",
      "The update payload failed validation.",
      details,
    )
  }

  return {
    requestedStatus,
    internalNote,
  }
}

function assertValidStatusTransition(currentStatus, nextStatus) {
  if (!nextStatus || nextStatus === currentStatus) {
    return
  }

  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] ?? new Set()

  if (!allowedTransitions.has(nextStatus)) {
    throw createRequestError(
      409,
      "Conflict",
      `Invalid servicing order status transition from ${currentStatus} to ${nextStatus}.`,
    )
  }
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
      customerReferenceFilter
    ) {
      throw createRequestError(
        403,
        "Forbidden",
        "customerReference filtering is restricted to CSR-authenticated context.",
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

export function getServicingOrderById({
  authContext,
  servicingOrderId,
  store,
}) {
  const role = normalizeTextField(authContext?.role).toLowerCase()

  if (!role) {
    throw createRequestError(
      401,
      "Unauthorized",
      "Authenticated CSR or customer context is required.",
    )
  }

  const servicingOrder = store.getById(servicingOrderId)

  if (!servicingOrder) {
    throw createRequestError(
      404,
      "Not Found",
      "Servicing order not found.",
    )
  }

  if (role === "csr") {
    return structuredClone(servicingOrder)
  }

  if (role === "customer") {
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

    if (servicingOrder.customerReference !== authenticatedCustomerReference) {
      throw createRequestError(
        403,
        "Forbidden",
        "Authenticated customer context does not match the requested servicing order.",
      )
    }

    return toCustomerServicingOrder(servicingOrder)
  }

  throw createRequestError(
    401,
    "Unauthorized",
    "Authenticated CSR or customer context is required.",
  )
}

export function getCustomerProfile({
  authContext,
  query = {},
  profileDirectory = CUSTOMER_PROFILE_DIRECTORY,
}) {
  const role = normalizeTextField(authContext?.role).toLowerCase()
  const authenticatedCustomerReference = normalizeOptionalText(
    authContext?.customerReference,
  )
  const requestedCustomerReference = normalizeOptionalText(query.customerReference)

  if (!role) {
    throw createRequestError(
      401,
      "Unauthorized",
      "Customer-authenticated context is required.",
    )
  }

  if (role !== "customer") {
    throw createRequestError(
      403,
      "Forbidden",
      "Customer-only operation. CSR-authenticated context is not allowed.",
    )
  }

  if (!authenticatedCustomerReference) {
    throw createRequestError(
      401,
      "Unauthorized",
      "Customer-authenticated context is required.",
    )
  }

  if (
    requestedCustomerReference &&
    requestedCustomerReference !== authenticatedCustomerReference
  ) {
    throw createRequestError(
      403,
      "Forbidden",
      "Authenticated customer context does not match the requested customer reference.",
    )
  }

  const profile = profileDirectory[authenticatedCustomerReference]

  if (!profile) {
    throw createRequestError(
      404,
      "Not Found",
      "Customer profile not found for the authenticated customer context.",
    )
  }

  return {
    customerReference: authenticatedCustomerReference,
    customerName: profile.customerName,
    profile: {
      residentialAddress: profile.residentialAddress,
      mobileNumber: profile.mobileNumber,
      emailAddress: profile.emailAddress,
    },
  }
}

export function updateServicingOrder({
  authContext,
  servicingOrderId,
  payload,
  store,
  now = () => new Date().toISOString(),
}) {
  const role = normalizeTextField(authContext?.role).toLowerCase()

  if (role !== "csr") {
    throw createRequestError(
      401,
      "Unauthorized",
      "CSR-authenticated context is required.",
    )
  }

  const existingOrder = store.getById(servicingOrderId)

  if (!existingOrder) {
    throw createRequestError(
      404,
      "Not Found",
      "Servicing order not found.",
    )
  }

  const { requestedStatus, internalNote } = validateUpdatePayload(payload)
  assertValidStatusTransition(existingOrder.servicingOrderStatus, requestedStatus)

  const timestamp = now()
  const updatedOrder = structuredClone(existingOrder)

  if (requestedStatus) {
    updatedOrder.servicingOrderStatus = requestedStatus
  }

  if (internalNote) {
    updatedOrder.internalNotes.push({
      note: internalNote.note,
      author: internalNote.author,
      timestamp,
    })
  }

  if (requestedStatus || internalNote) {
    updatedOrder.lastUpdateDate = timestamp
  }

  const storedOrder = store.updateById(servicingOrderId, updatedOrder)

  return structuredClone(storedOrder)
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
