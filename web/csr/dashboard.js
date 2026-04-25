import {
  buildCsrLoginUrl,
  clearCsrSession,
  CSR_DASHBOARD_PATH,
  getCsrSession,
} from "./auth.js";

export const CSR_REQUEST_DETAIL_PATH = "/csr/request-detail.html";
export const CSR_QUEUE_SUPPORTED_STATUSES = Object.freeze([
  "Pending",
  "In Progress",
  "Completed",
  "Rejected",
]);

function formatSubmittedDate(value) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.valueOf())) {
    return "Unavailable";
  }

  return parsed.toISOString().slice(0, 10);
}

function setQueueStatus(statusNode, tone, message) {
  statusNode.dataset.tone = tone;
  statusNode.textContent = message;
}

function buildQueueRequestUrl(apiBaseUrl, { status = null, servicingOrderId = null } = {}) {
  const queueUrl = apiBaseUrl
    ? new URL("/ServicingOrder", apiBaseUrl)
    : new URL("/ServicingOrder", "http://localhost");

  if (status) {
    queueUrl.searchParams.set("status", status);
  }

  if (servicingOrderId) {
    queueUrl.searchParams.set("servicingOrderId", servicingOrderId);
  }

  if (apiBaseUrl) {
    return queueUrl.toString();
  }

  return `${queueUrl.pathname}${queueUrl.search}`;
}

function normalizeServicingOrderId(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function getRequestDetailUrl(servicingOrderId) {
  return `${CSR_REQUEST_DETAIL_PATH}?servicingOrderId=${encodeURIComponent(servicingOrderId)}`;
}

function createQueueCell(doc, value, className) {
  const cell = doc.createElement("td");
  cell.textContent = value;

  if (className) {
    cell.className = className;
  }

  return cell;
}

function renderQueueRows(
  doc,
  queueBody,
  servicingOrders,
  { emptyMessage = "No servicing requests are currently waiting in the queue." } = {},
) {
  queueBody.replaceChildren();

  if (!Array.isArray(servicingOrders) || servicingOrders.length === 0) {
    const emptyRow = doc.createElement("tr");
    const emptyCell = createQueueCell(doc, emptyMessage, "queue-empty-cell");
    emptyCell.colSpan = 5;
    emptyRow.append(emptyCell);
    queueBody.append(emptyRow);
    return;
  }

  const rows = servicingOrders.map((servicingOrder) => {
    const row = doc.createElement("tr");

    row.append(
      createQueueCell(doc, servicingOrder.customerName ?? "Unavailable"),
      createQueueCell(doc, servicingOrder.requestType ?? "Unavailable"),
      createQueueCell(doc, formatSubmittedDate(servicingOrder.submittedDate)),
      createQueueCell(doc, servicingOrder.servicingOrderStatus ?? "Unavailable"),
    );

    const actionCell = doc.createElement("td");
    const detailLink = doc.createElement("a");
    detailLink.className = "request-detail-link";
    detailLink.href = getRequestDetailUrl(servicingOrder.servicingOrderId ?? "");
    detailLink.textContent = "Open request";
    actionCell.append(detailLink);
    row.append(actionCell);

    return row;
  });

  queueBody.append(...rows);
}

function resolveSelectedQueueStatus(statusFilterSelect) {
  const selectedStatus = statusFilterSelect?.value ?? "";

  if (!selectedStatus) {
    return null;
  }

  if (!CSR_QUEUE_SUPPORTED_STATUSES.includes(selectedStatus)) {
    return null;
  }

  return selectedStatus;
}

function setStatusFilterControlState(clearFilterButton, selectedStatus) {
  clearFilterButton.disabled = !selectedStatus;
}

export function setupCsrDashboardPage(doc = document, options = {}) {
  const view = doc.defaultView;
  const storage = options.storage ?? view?.sessionStorage ?? null;
  const location = options.location ?? view?.location ?? { pathname: CSR_DASHBOARD_PATH };
  const navigateTo = options.navigateTo ?? ((target) => view.location.assign(target));
  const fetchImpl = options.fetchImpl ?? view?.fetch?.bind(view) ?? null;
  const apiBaseUrl = options.apiBaseUrl;

  const csrName = doc.querySelector("[data-csr-name]");
  const csrStaffId = doc.querySelector("[data-csr-staff-id]");
  const csrRole = doc.querySelector("[data-csr-role]");
  const logoutButton = doc.querySelector("[data-csr-logout]");
  const queueStatus = doc.querySelector("[data-queue-status]");
  const queueBody = doc.querySelector("[data-csr-queue-body]");
  const queueSearchForm = doc.querySelector("[data-queue-search-form]");
  const queueSearchInput = doc.querySelector("[data-queue-search-input]");
  const queueSearchClear = doc.querySelector("[data-queue-search-clear]");
  const statusFilterSelect = doc.querySelector("[data-queue-status-filter]");
  const clearFilterButton = doc.querySelector("[data-queue-status-clear]");

  if (
    !(
      csrName
      && csrStaffId
      && csrRole
      && logoutButton
      && queueStatus
      && queueBody
      && queueSearchForm
      && queueSearchInput
      && queueSearchClear
      && statusFilterSelect
      && clearFilterButton
    )
  ) {
    throw new Error("CSR dashboard markup is incomplete.");
  }

  const session = getCsrSession(storage);

  if (!session) {
    navigateTo(
      buildCsrLoginUrl({
        next: location.pathname ?? CSR_DASHBOARD_PATH,
        reason: "auth-required",
      }),
    );

    return {
      csrName,
      csrRole,
      csrStaffId,
      logoutButton,
      queueBody,
      queueStatus,
      queueLoaded: Promise.resolve(),
      waitForQueueLoad: () => Promise.resolve(),
      session: null,
      statusFilterSelect,
      queueSearchForm,
      queueSearchInput,
    };
  }

  csrName.textContent = session.name;
  csrStaffId.textContent = session.staffId;
  csrRole.textContent = session.title;

  let currentQueueLoad = Promise.resolve();

  const loadQueue = async ({ status, servicingOrderId } = {}) => {
    const selectedStatus = status === undefined ? resolveSelectedQueueStatus(statusFilterSelect) : status;
    const normalizedServicingOrderId =
      servicingOrderId === undefined ? normalizeServicingOrderId(queueSearchInput.value) : servicingOrderId;
    const hasServicingOrderSearch = Boolean(normalizedServicingOrderId);

    setStatusFilterControlState(clearFilterButton, selectedStatus);

    if (!fetchImpl) {
      setQueueStatus(
        queueStatus,
        "error",
        "Queue unavailable because this browser session cannot call the servicing API.",
      );
      renderQueueRows(doc, queueBody, [], {
        emptyMessage: hasServicingOrderSearch
          ? `No request matched servicing order ID "${normalizedServicingOrderId}".`
          : "No servicing requests are currently waiting in the queue.",
      });
      return;
    }

    const loadingMessage = hasServicingOrderSearch
      ? `Searching for servicing order ID "${normalizedServicingOrderId}"${selectedStatus ? ` with status ${selectedStatus}` : ""}...`
      : selectedStatus
        ? `Loading queue data for status: ${selectedStatus}...`
        : "Loading queue data...";

    setQueueStatus(queueStatus, "info", loadingMessage);

    try {
      const response = await fetchImpl(
        buildQueueRequestUrl(apiBaseUrl, {
          servicingOrderId: normalizedServicingOrderId || null,
          status: selectedStatus,
        }),
        {
          headers: {
            "x-authenticated-role": "csr",
            "x-csr-staff-id": session.staffId,
          },
        },
      );

      if (response.status === 401 || response.status === 403) {
        clearCsrSession(storage);
        navigateTo(
          buildCsrLoginUrl({
            next: location.pathname ?? CSR_DASHBOARD_PATH,
            reason: "auth-required",
          }),
        );
        return;
      }

      if (!response.ok) {
        throw new Error(`Queue request failed with status ${response.status}.`);
      }

      const servicingOrders = await response.json();

      if (hasServicingOrderSearch && servicingOrders.length === 0) {
        const noMatchMessage = `No request matched servicing order ID "${normalizedServicingOrderId}".`;
        renderQueueRows(doc, queueBody, servicingOrders, {
          emptyMessage: noMatchMessage,
        });
        setQueueStatus(queueStatus, "info", noMatchMessage);
        return;
      }

      renderQueueRows(doc, queueBody, servicingOrders, {
        emptyMessage: hasServicingOrderSearch
          ? `No request matched servicing order ID "${normalizedServicingOrderId}".`
          : "No servicing requests are currently waiting in the queue.",
      });

      if (hasServicingOrderSearch) {
        setQueueStatus(
          queueStatus,
          "success",
          `Matched ${servicingOrders.length} request${servicingOrders.length === 1 ? "" : "s"} for servicing order ID "${normalizedServicingOrderId}"${selectedStatus ? ` with status ${selectedStatus}` : ""}.`,
        );
        return;
      }

      setQueueStatus(
        queueStatus,
        "success",
        selectedStatus
          ? `Queue ready: ${servicingOrders.length} request${servicingOrders.length === 1 ? "" : "s"} with status ${selectedStatus}.`
          : `Queue ready: ${servicingOrders.length} request${servicingOrders.length === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      renderQueueRows(doc, queueBody, []);
      setQueueStatus(
        queueStatus,
        "error",
        "Queue unavailable. Confirm the servicing API is running and try again.",
      );
      queueStatus.dataset.errorDetail = error instanceof Error ? error.message : "Unknown error";
    }
  };

  function triggerQueueLoad(overrides = {}) {
    currentQueueLoad = loadQueue(overrides);
    return currentQueueLoad;
  }

  const queueLoaded = triggerQueueLoad();

  queueSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const normalizedId = normalizeServicingOrderId(queueSearchInput.value);

    if (!normalizedId) {
      setQueueStatus(queueStatus, "info", "Enter a servicing order ID to search the queue.");
      renderQueueRows(doc, queueBody, [], {
        emptyMessage: "Enter a servicing order ID to run the queue search.",
      });
      return;
    }

    void triggerQueueLoad({ servicingOrderId: normalizedId });
  });

  queueSearchClear.addEventListener("click", () => {
    queueSearchInput.value = "";
    void triggerQueueLoad({ servicingOrderId: null });
  });

  logoutButton.addEventListener("click", () => {
    clearCsrSession(storage);
    navigateTo(buildCsrLoginUrl({ signedOut: "1" }));
  });

  statusFilterSelect.addEventListener("change", () => {
    void triggerQueueLoad();
  });

  clearFilterButton.addEventListener("click", () => {
    statusFilterSelect.value = "";
    void triggerQueueLoad();
  });

  return {
    csrName,
    csrRole,
    csrStaffId,
    logoutButton,
    queueSearchForm,
    queueSearchInput,
    queueBody,
    queueLoaded,
    queueStatus,
    session,
    statusFilterSelect,
    waitForQueueLoad: () => currentQueueLoad,
  };
}

if (typeof document !== "undefined") {
  setupCsrDashboardPage(document);
}
