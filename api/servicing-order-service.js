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

const INITIATE_AUTOMATION_CONTROL_MESSAGES = Object.freeze({
  servicingOrderStatus:
    "servicingOrderStatus is system-controlled and remains Pending until CSR action.",
  autoComplete:
    "autoComplete is not supported. Servicing orders remain Pending until CSR action.",
  autoApplyProfileChanges:
    "autoApplyProfileChanges is not supported. Profile changes must be processed manually by CSR.",
  triggerDownstreamProfileUpdate:
    "triggerDownstreamProfileUpdate is not supported. Profile changes must be processed manually by CSR.",
})

const UPDATE_AUTOMATION_CONTROL_MESSAGES = Object.freeze({
  autoComplete:
    "autoComplete is not supported. Status updates require explicit CSR action.",
  autoApplyProfileChanges:
    "autoApplyProfileChanges is not supported. Profile changes must be processed manually by CSR.",
  triggerDownstreamProfileUpdate:
    "triggerDownstreamProfileUpdate is not supported. Profile changes must be processed manually by CSR.",
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

const DEFAULT_ERROR_CODES = Object.freeze({
  400: "bad_request",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  405: "method_not_allowed",
  409: "conflict",
  500: "internal_server_error",
})

export function createRequestError(statusCode, error, message, details = [], code) {
  const requestError = new Error(message)
  requestError.statusCode = statusCode
  requestError.code = code ?? DEFAULT_ERROR_CODES[statusCode] ?? "internal_server_error"
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

function validateManualOnlyPayloadControls(payload, details, controlMessages) {
  for (const [field, message] of Object.entries(controlMessages)) {
    if (payload[field] !== undefined) {
      details.push({ field, message })
    }
  }
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
  validateManualOnlyPayloadControls(payload, details, INITIATE_AUTOMATION_CONTROL_MESSAGES)

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

function buildOperationalActor(authContext) {
  const role = normalizeTextField(authContext?.role).toLowerCase() || "unknown"
  const actor = { role }

  const customerReference = normalizeOptionalText(authContext?.customerReference)
  const staffId = normalizeOptionalText(authContext?.staffId)

  if (customerReference) {
    actor.customerReference = customerReference
  }

  if (staffId) {
    actor.staffId = staffId
  }

  return actor
}

function emitOperationalEvent(logEvent, eventType, fields = {}) {
  if (typeof logEvent !== "function") {
    return
  }

  logEvent({
    category: eventType === "access_denied" ? "security" : "workflow",
    eventType,
    ...fields,
  })
}

function createAccessDeniedError({
  logEvent,
  authContext,
  action,
  statusCode,
  error,
  message,
  details = [],
}) {
  const requestError = createRequestError(statusCode, error, message, details)

  emitOperationalEvent(logEvent, "access_denied", {
    action,
    statusCode,
    errorCode: requestError.code,
    actor: buildOperationalActor(authContext),
  })

  return requestError
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
  validateManualOnlyPayloadControls(payload, details, UPDATE_AUTOMATION_CONTROL_MESSAGES)

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

function assertDownstreamProfileAutomationDisabled(downstreamProfileUpdateGateway, action) {
  if (downstreamProfileUpdateGateway === undefined || downstreamProfileUpdateGateway === null) {
    return
  }

  throw createRequestError(
    409,
    "Conflict",
    `Automated downstream profile updates are disabled for ${action}. Manual CSR processing is required.`,
    [
      {
        field: "downstreamProfileUpdateGateway",
        message: "Remove downstream profile update automation from the portal flow.",
      },
    ],
  )
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
  const {
    internalNotes,
    statusChangeAudit,
    ...customerFacingOrder
  } = servicingOrder
  return structuredClone(customerFacingOrder)
}

export function createServicingOrder({
  authContext,
  payload,
  store,
  now = () => new Date().toISOString(),
  generateId = defaultGenerateId,
  downstreamProfileUpdateGateway,
  logEvent,
}) {
  if (!authContext || authContext.role !== "customer" || !authContext.customerReference) {
    throw createAccessDeniedError({
      logEvent,
      authContext,
      action: "servicing_order.initiate",
      statusCode: 401,
      error: "Unauthorized",
      message: "Customer-authenticated context is required.",
    })
  }

  const initiateRequest = validateInitiatePayload(payload)

  if (initiateRequest.customerReference !== authContext.customerReference) {
    throw createAccessDeniedError({
      logEvent,
      authContext,
      action: "servicing_order.initiate",
      statusCode: 403,
      error: "Forbidden",
      message: "Authenticated customer context does not match the request customer reference.",
    })
  }

  assertDownstreamProfileAutomationDisabled(
    downstreamProfileUpdateGateway,
    "request submission",
  )

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
    statusChangeAudit: [],
  }

  const storedOrder = store.create(servicingOrder)

  emitOperationalEvent(logEvent, "request_initiated", {
    action: "servicing_order.initiate",
    servicingOrderId: storedOrder.servicingOrderId,
    customerReference: storedOrder.customerReference,
    requestType: storedOrder.requestType,
    status: storedOrder.servicingOrderStatus,
  })

  return {
    storedOrder,
    responseOrder: toCustomerServicingOrder(storedOrder),
  }
}

export function listServicingOrders({
  authContext,
  query = {},
  store,
  logEvent,
}) {
  const role = normalizeTextField(authContext?.role).toLowerCase()
  const authenticatedCsrStaffId = normalizeOptionalText(authContext?.staffId)
  const statusFilter = normalizeOptionalText(query.status)
  const customerReferenceFilter = normalizeOptionalText(query.customerReference)
  const customerNameFilter = normalizeOptionalText(query.customerName)

  let orders

  if (role === "csr") {
    if (!authenticatedCsrStaffId) {
      throw createAccessDeniedError({
        logEvent,
        authContext,
        action: "servicing_order.list",
        statusCode: 401,
        error: "Unauthorized",
        message: "CSR-authenticated context is required.",
      })
    }

    orders = store.list()
  } else if (role === "customer") {
    const authenticatedCustomerReference = normalizeOptionalText(
      authContext?.customerReference,
    )

    if (!authenticatedCustomerReference) {
      throw createAccessDeniedError({
        logEvent,
        authContext,
        action: "servicing_order.list",
        statusCode: 401,
        error: "Unauthorized",
        message: "Customer-authenticated context is required.",
      })
    }

    if (
      customerReferenceFilter
    ) {
      throw createAccessDeniedError({
        logEvent,
        authContext,
        action: "servicing_order.list",
        statusCode: 403,
        error: "Forbidden",
        message: "customerReference filtering is restricted to CSR-authenticated context.",
      })
    }

    if (customerNameFilter) {
      throw createRequestError(
        403,
        "Forbidden",
        "customerName filtering is restricted to CSR-authenticated context.",
      )
    }

    orders = store
      .list()
      .filter((order) => order.customerReference === authenticatedCustomerReference)
  } else {
    throw createAccessDeniedError({
      logEvent,
      authContext,
      action: "servicing_order.list",
      statusCode: 401,
      error: "Unauthorized",
      message: "Authenticated CSR or customer context is required.",
    })
  }

  if (customerReferenceFilter && role === "csr") {
    orders = orders.filter((order) => order.customerReference === customerReferenceFilter)
  }

  if (statusFilter) {
    orders = orders.filter((order) => order.servicingOrderStatus === statusFilter)
  }

  if (customerNameFilter && role === "csr") {
    const normalizedCustomerNameFilter = customerNameFilter.toLowerCase()
    orders = orders.filter((order) =>
      normalizeTextField(order.customerName).toLowerCase().includes(normalizedCustomerNameFilter),
    )
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
  logEvent,
}) {
  const role = normalizeTextField(authContext?.role).toLowerCase()

  if (!role) {
    throw createAccessDeniedError({
      logEvent,
      authContext,
      action: "servicing_order.get_by_id",
      statusCode: 401,
      error: "Unauthorized",
      message: "Authenticated CSR or customer context is required.",
    })
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
      throw createAccessDeniedError({
        logEvent,
        authContext,
        action: "servicing_order.get_by_id",
        statusCode: 401,
        error: "Unauthorized",
        message: "Customer-authenticated context is required.",
      })
    }

    if (servicingOrder.customerReference !== authenticatedCustomerReference) {
      throw createAccessDeniedError({
        logEvent,
        authContext,
        action: "servicing_order.get_by_id",
        statusCode: 403,
        error: "Forbidden",
        message: "Authenticated customer context does not match the requested servicing order.",
      })
    }

    return toCustomerServicingOrder(servicingOrder)
  }

  throw createAccessDeniedError({
    logEvent,
    authContext,
    action: "servicing_order.get_by_id",
    statusCode: 401,
    error: "Unauthorized",
    message: "Authenticated CSR or customer context is required.",
  })
}

export function getCustomerProfile({
  authContext,
  query = {},
  profileDirectory = CUSTOMER_PROFILE_DIRECTORY,
  logEvent,
}) {
  const role = normalizeTextField(authContext?.role).toLowerCase()
  const authenticatedCustomerReference = normalizeOptionalText(
    authContext?.customerReference,
  )
  const requestedCustomerReference = normalizeOptionalText(query.customerReference)

  if (!role) {
    throw createAccessDeniedError({
      logEvent,
      authContext,
      action: "customer_profile.get",
      statusCode: 401,
      error: "Unauthorized",
      message: "Customer-authenticated context is required.",
    })
  }

  if (role !== "customer") {
    throw createAccessDeniedError({
      logEvent,
      authContext,
      action: "customer_profile.get",
      statusCode: 403,
      error: "Forbidden",
      message: "Customer-only operation. CSR-authenticated context is not allowed.",
    })
  }

  if (!authenticatedCustomerReference) {
    throw createAccessDeniedError({
      logEvent,
      authContext,
      action: "customer_profile.get",
      statusCode: 401,
      error: "Unauthorized",
      message: "Customer-authenticated context is required.",
    })
  }

  if (
    requestedCustomerReference &&
    requestedCustomerReference !== authenticatedCustomerReference
  ) {
    throw createAccessDeniedError({
      logEvent,
      authContext,
      action: "customer_profile.get",
      statusCode: 403,
      error: "Forbidden",
      message: "Authenticated customer context does not match the requested customer reference.",
    })
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
  downstreamProfileUpdateGateway,
  logEvent,
}) {
  const role = normalizeTextField(authContext?.role).toLowerCase()
  const authenticatedCsrStaffId = normalizeOptionalText(authContext?.staffId)

  if (role !== "csr") {
    throw createAccessDeniedError({
      logEvent,
      authContext,
      action: "servicing_order.update",
      statusCode: 401,
      error: "Unauthorized",
      message: "CSR-authenticated context is required.",
    })
  }

  const existingOrder = store.getById(servicingOrderId)

  if (!existingOrder) {
    throw createRequestError(
      404,
      "Not Found",
      "Servicing order not found.",
    )
  }

  assertDownstreamProfileAutomationDisabled(
    downstreamProfileUpdateGateway,
    "servicing order update",
  )

  const { requestedStatus, internalNote } = validateUpdatePayload(payload)
  assertValidStatusTransition(existingOrder.servicingOrderStatus, requestedStatus)

  const timestamp = now()
  const updatedOrder = structuredClone(existingOrder)
  const statusChanged =
    Boolean(requestedStatus) && requestedStatus !== existingOrder.servicingOrderStatus

  if (statusChanged && !authenticatedCsrStaffId) {
    throw createRequestError(
      401,
      "Unauthorized",
      "CSR staff identity is required for servicing order status updates.",
    )
  }

  if (!Array.isArray(updatedOrder.statusChangeAudit)) {
    updatedOrder.statusChangeAudit = []
  }

  if (requestedStatus && requestedStatus !== updatedOrder.servicingOrderStatus) {
    const previousStatus = updatedOrder.servicingOrderStatus
    updatedOrder.servicingOrderStatus = requestedStatus
    emitOperationalEvent(logEvent, "request_status_updated", {
      action: "servicing_order.update",
      servicingOrderId,
      actor: buildOperationalActor(authContext),
      previousStatus,
      nextStatus: requestedStatus,
    })
  }

  if (statusChanged) {
    updatedOrder.statusChangeAudit.push({
      fromStatus: existingOrder.servicingOrderStatus,
      toStatus: requestedStatus,
      actor: authenticatedCsrStaffId,
      timestamp,
    })
  }

  if (internalNote) {
    updatedOrder.internalNotes.push({
      note: internalNote.note,
      author: internalNote.author,
      timestamp,
    })
    emitOperationalEvent(logEvent, "internal_note_added", {
      action: "servicing_order.update",
      servicingOrderId,
      actor: buildOperationalActor(authContext),
      noteAuthor: internalNote.author,
    })
  }

  if (requestedStatus || internalNote) {
    updatedOrder.lastUpdateDate = timestamp
  }

  const storedOrder = store.updateById(servicingOrderId, updatedOrder)

  return structuredClone(storedOrder)
}

export function serializeRequestError(error) {
  const statusCode = error.statusCode ?? 500

  const body = {
    status: statusCode,
    code: error.code ?? DEFAULT_ERROR_CODES[statusCode] ?? "internal_server_error",
    error: error.error ?? "Internal Server Error",
    message: error.message ?? "Unexpected error.",
    details: Array.isArray(error.details) ? error.details : [],
  }

  return body
}
