import {
  buildCsrLoginUrl,
  clearCsrSession,
  CSR_DASHBOARD_PATH,
  getCsrSession,
} from "./auth.js";

export const CSR_REQUEST_DETAIL_PATH = "/csr/request-detail.html";

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

function getQueueRequestUrl(apiBaseUrl) {
  if (apiBaseUrl) {
    return new URL("/ServicingOrder", apiBaseUrl).toString();
  }

  return "/ServicingOrder";
}

function normalizeServicingOrderId(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function withQueueFilters(apiBaseUrl, filters = {}) {
  const queueUrl = new URL(getQueueRequestUrl(apiBaseUrl), "http://localhost");

  if (filters.servicingOrderId) {
    queueUrl.searchParams.set("servicingOrderId", filters.servicingOrderId);
  }

  const requestPath = `${queueUrl.pathname}${queueUrl.search}`;

  if (apiBaseUrl) {
    return new URL(requestPath, apiBaseUrl).toString();
  }

  return requestPath;
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
    const emptyCell = createQueueCell(
      doc,
      emptyMessage,
      "queue-empty-cell",
    );
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

  if (
    !(
      csrName &&
      csrStaffId &&
      csrRole &&
      logoutButton &&
      queueStatus &&
      queueBody &&
      queueSearchForm &&
      queueSearchInput &&
      queueSearchClear
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
      session: null,
    };
  }

  csrName.textContent = session.name;
  csrStaffId.textContent = session.staffId;
  csrRole.textContent = session.title;

  async function loadQueue(filters = {}) {
    const hasServicingOrderSearch = Boolean(filters.servicingOrderId);

    if (!fetchImpl) {
      setQueueStatus(
        queueStatus,
        "error",
        "Queue unavailable because this browser session cannot call the servicing API.",
      );
      renderQueueRows(doc, queueBody, [], {
        emptyMessage: hasServicingOrderSearch
          ? `No request matched servicing order ID "${filters.servicingOrderId}".`
          : "No servicing requests are currently waiting in the queue.",
      });
      return;
    }

    setQueueStatus(
      queueStatus,
      "info",
      hasServicingOrderSearch
        ? `Searching for servicing order ID "${filters.servicingOrderId}"...`
        : "Loading queue data...",
    );

    try {
      const response = await fetchImpl(withQueueFilters(apiBaseUrl, filters), {
        headers: {
          "x-authenticated-role": "csr",
          "x-csr-staff-id": session.staffId,
        },
      });

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
        renderQueueRows(doc, queueBody, servicingOrders, {
          emptyMessage: `No request matched servicing order ID "${filters.servicingOrderId}".`,
        });
        setQueueStatus(
          queueStatus,
          "info",
          `No request matched servicing order ID "${filters.servicingOrderId}".`,
        );
        return;
      }

      renderQueueRows(doc, queueBody, servicingOrders, {
        emptyMessage: hasServicingOrderSearch
          ? `No request matched servicing order ID "${filters.servicingOrderId}".`
          : "No servicing requests are currently waiting in the queue.",
      });

      if (hasServicingOrderSearch) {
        setQueueStatus(
          queueStatus,
          "success",
          `Matched ${servicingOrders.length} request${servicingOrders.length === 1 ? "" : "s"} for servicing order ID "${filters.servicingOrderId}".`,
        );
        return;
      }

      setQueueStatus(
        queueStatus,
        "success",
        `Queue ready: ${servicingOrders.length} request${servicingOrders.length === 1 ? "" : "s"}.`,
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
  }

  const queueLoaded = loadQueue();

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

    void loadQueue({ servicingOrderId: normalizedId });
  });

  queueSearchClear.addEventListener("click", () => {
    queueSearchInput.value = "";
    void loadQueue();
  });

  logoutButton.addEventListener("click", () => {
    clearCsrSession(storage);
    navigateTo(buildCsrLoginUrl({ signedOut: "1" }));
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
  };
}

if (typeof document !== "undefined") {
  setupCsrDashboardPage(document);
}
