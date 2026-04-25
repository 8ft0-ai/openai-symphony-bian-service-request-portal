import {
  buildCsrLoginUrl,
  clearCsrSession,
  CSR_DASHBOARD_PATH,
  getCsrSession,
} from "./auth.js";

function formatDate(value) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.valueOf())) {
    return "Unavailable";
  }

  return parsed.toISOString().slice(0, 10);
}

function formatText(value, fallback = "Unavailable") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : fallback;
}

function formatFieldLabel(key) {
  return String(key ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}

function getRequestDetailUrl(servicingOrderId, apiBaseUrl) {
  if (apiBaseUrl) {
    return new URL(`/ServicingOrder/${encodeURIComponent(servicingOrderId)}`, apiBaseUrl).toString();
  }

  return `/ServicingOrder/${encodeURIComponent(servicingOrderId)}`;
}

function setRequestDetailStatus(statusNode, tone, message, errorDetail = null) {
  statusNode.dataset.tone = tone;
  statusNode.textContent = message;

  if (errorDetail) {
    statusNode.dataset.errorDetail = errorDetail;
    return;
  }

  delete statusNode.dataset.errorDetail;
}

function toComparisonRows(requestDetails) {
  if (!requestDetails || typeof requestDetails !== "object" || Array.isArray(requestDetails)) {
    return [];
  }

  const rows = [];
  const consumedKeys = new Set();

  for (const [key, oldValue] of Object.entries(requestDetails)) {
    if (!key.startsWith("old") || key.length <= 3) {
      continue;
    }

    const suffix = key.slice(3);
    const newKey = `new${suffix}`;
    const newValue = requestDetails[newKey];

    rows.push({
      field: formatFieldLabel(suffix),
      oldValue: formatText(oldValue),
      newValue: formatText(newValue),
    });

    consumedKeys.add(key);
    consumedKeys.add(newKey);
  }

  for (const [key, value] of Object.entries(requestDetails)) {
    if (consumedKeys.has(key)) {
      continue;
    }

    if (key.startsWith("new") && key.length > 3) {
      rows.push({
        field: formatFieldLabel(key.slice(3)),
        oldValue: "Unavailable",
        newValue: formatText(value),
      });
      consumedKeys.add(key);
      continue;
    }

    rows.push({
      field: formatFieldLabel(key),
      oldValue: formatText(value),
      newValue: "Unavailable",
    });
  }

  return rows.sort((a, b) => a.field.localeCompare(b.field));
}

function renderComparisonRows(doc, comparisonBody, requestDetails) {
  comparisonBody.replaceChildren();
  const rows = toComparisonRows(requestDetails);

  if (rows.length === 0) {
    const row = doc.createElement("tr");
    const cell = doc.createElement("td");
    cell.className = "queue-empty-cell";
    cell.colSpan = 3;
    cell.textContent = "No request details available.";
    row.append(cell);
    comparisonBody.append(row);
    return;
  }

  for (const entry of rows) {
    const row = doc.createElement("tr");
    const fieldCell = doc.createElement("td");
    const oldValueCell = doc.createElement("td");
    const newValueCell = doc.createElement("td");

    fieldCell.textContent = entry.field;
    oldValueCell.textContent = entry.oldValue;
    newValueCell.textContent = entry.newValue;

    row.append(fieldCell, oldValueCell, newValueCell);
    comparisonBody.append(row);
  }
}

function toHistoryEntries(servicingOrder) {
  const entries = [];

  entries.push({
    actor: "System",
    event: "Request submitted",
    timestamp: servicingOrder?.submittedDate,
  });

  if (Array.isArray(servicingOrder?.statusChangeAudit)) {
    for (const transition of servicingOrder.statusChangeAudit) {
      entries.push({
        actor: formatText(transition.actor, "CSR"),
        event: `Status changed: ${formatText(transition.fromStatus)} -> ${formatText(transition.toStatus)}`,
        timestamp: transition.timestamp,
      });
    }
  }

  return entries;
}

function renderHistoryList(doc, historyList, servicingOrder) {
  historyList.replaceChildren();

  const entries = toHistoryEntries(servicingOrder).filter((entry) => entry.timestamp);

  if (entries.length === 0) {
    const item = doc.createElement("li");
    item.className = "request-empty-state";
    item.textContent = "No request history is available.";
    historyList.append(item);
    return;
  }

  entries.sort((a, b) => new Date(a.timestamp).valueOf() - new Date(b.timestamp).valueOf());

  for (const entry of entries) {
    const item = doc.createElement("li");
    item.className = "request-history-item";
    item.textContent = `${formatDate(entry.timestamp)} - ${entry.event} (${entry.actor})`;
    historyList.append(item);
  }
}

function renderInternalNotes(doc, notesList, internalNotes) {
  notesList.replaceChildren();

  if (!Array.isArray(internalNotes) || internalNotes.length === 0) {
    const item = doc.createElement("li");
    item.className = "request-empty-state";
    item.textContent = "No internal notes are available.";
    notesList.append(item);
    return;
  }

  for (const note of internalNotes) {
    const item = doc.createElement("li");
    item.className = "request-history-item";
    item.textContent = `${formatDate(note.timestamp)} - ${formatText(note.note)} (${formatText(note.author, "Unknown")})`;
    notesList.append(item);
  }
}

export function setupCsrRequestDetailPage(doc = document, options = {}) {
  const view = doc.defaultView;
  const storage = options.storage ?? view?.sessionStorage ?? null;
  const location =
    options.location ?? view?.location ?? { pathname: "/csr/request-detail.html", search: "" };
  const navigateTo = options.navigateTo ?? ((target) => view.location.assign(target));
  const fetchImpl = options.fetchImpl ?? view?.fetch?.bind(view) ?? null;
  const apiBaseUrl = options.apiBaseUrl;
  const csrName = doc.querySelector("[data-csr-name]");
  const requestDetailId = doc.querySelector("[data-request-detail-id]");
  const requestDetailStatus = doc.querySelector("[data-request-detail-status]");
  const requestCustomerName = doc.querySelector("[data-request-customer-name]");
  const requestCustomerReference = doc.querySelector("[data-request-customer-reference]");
  const requestType = doc.querySelector("[data-request-type]");
  const requestStatus = doc.querySelector("[data-request-status]");
  const requestSubmittedDate = doc.querySelector("[data-request-submitted-date]");
  const requestLastUpdateDate = doc.querySelector("[data-request-last-update-date]");
  const requestComparisonBody = doc.querySelector("[data-request-comparison-body]");
  const requestHistoryList = doc.querySelector("[data-request-history-list]");
  const requestInternalNotes = doc.querySelector("[data-request-internal-notes]");

  if (
    !(
      csrName &&
      requestDetailId &&
      requestDetailStatus &&
      requestCustomerName &&
      requestCustomerReference &&
      requestType &&
      requestStatus &&
      requestSubmittedDate &&
      requestLastUpdateDate &&
      requestComparisonBody &&
      requestHistoryList &&
      requestInternalNotes
    )
  ) {
    throw new Error("CSR request detail markup is incomplete.");
  }

  const session = getCsrSession(storage);

  if (!session) {
    navigateTo(
      buildCsrLoginUrl({
        next: `${location.pathname ?? CSR_DASHBOARD_PATH}${location.search ?? ""}`,
        reason: "auth-required",
      }),
    );
    return {
      csrName,
      requestDetailId,
      requestDetailStatus,
      session: null,
    };
  }

  csrName.textContent = session.name;

  const params = new URLSearchParams(location.search ?? "");
  const servicingOrderId = String(params.get("servicingOrderId") ?? "").trim();

  if (!servicingOrderId) {
    setRequestDetailStatus(
      requestDetailStatus,
      "error",
      "No servicing order was selected from the queue.",
    );
    return {
      csrName,
      requestDetailId,
      requestDetailStatus,
      session,
      servicingOrderId,
      detailLoaded: Promise.resolve(),
    };
  }

  requestDetailId.textContent = servicingOrderId;

  const detailLoaded = (async () => {
    if (!fetchImpl) {
      setRequestDetailStatus(
        requestDetailStatus,
        "error",
        "Request detail is unavailable because this browser session cannot call the servicing API.",
      );
      return;
    }

    setRequestDetailStatus(requestDetailStatus, "info", "Loading servicing request detail...");

    try {
      const response = await fetchImpl(getRequestDetailUrl(servicingOrderId, apiBaseUrl), {
        headers: {
          "x-authenticated-role": "csr",
          "x-csr-staff-id": session.staffId,
        },
      });

      if (response.status === 401 || response.status === 403) {
        clearCsrSession(storage);
        navigateTo(
          buildCsrLoginUrl({
            next: `${location.pathname ?? CSR_DASHBOARD_PATH}${location.search ?? ""}`,
            reason: "auth-required",
          }),
        );
        return;
      }

      if (!response.ok) {
        throw new Error(`Request detail retrieval failed with status ${response.status}.`);
      }

      const servicingOrder = await response.json();

      requestCustomerName.textContent = formatText(servicingOrder.customerName);
      requestCustomerReference.textContent = formatText(servicingOrder.customerReference);
      requestType.textContent = formatText(servicingOrder.requestType);
      requestStatus.textContent = formatText(servicingOrder.servicingOrderStatus);
      requestSubmittedDate.textContent = formatDate(servicingOrder.submittedDate);
      requestLastUpdateDate.textContent = formatDate(servicingOrder.lastUpdateDate);

      renderComparisonRows(doc, requestComparisonBody, servicingOrder.requestDetails);
      renderHistoryList(doc, requestHistoryList, servicingOrder);
      renderInternalNotes(doc, requestInternalNotes, servicingOrder.internalNotes);

      setRequestDetailStatus(requestDetailStatus, "success", "Servicing request detail is ready.");
    } catch (error) {
      setRequestDetailStatus(
        requestDetailStatus,
        "error",
        "Request detail is unavailable. Confirm the servicing API is running and try again.",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  })();

  return {
    csrName,
    requestDetailId,
    requestDetailStatus,
    session,
    servicingOrderId,
    detailLoaded,
  };
}

if (typeof document !== "undefined") {
  setupCsrRequestDetailPage(document);
}
