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

function normalizeSearchValue(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getQueueRequestUrl(apiBaseUrl) {
  if (apiBaseUrl) {
    return new URL("/ServicingOrder", apiBaseUrl).toString();
  }

  return "/ServicingOrder";
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

function renderQueueRows(doc, queueBody, servicingOrders, { searchValue = "" } = {}) {
  queueBody.replaceChildren();
  const normalizedSearchValue = normalizeSearchValue(searchValue);

  if (!Array.isArray(servicingOrders) || servicingOrders.length === 0) {
    const emptyRow = doc.createElement("tr");
    const emptyCell = createQueueCell(
      doc,
      normalizedSearchValue
        ? `No servicing requests matched customer name "${searchValue.trim()}".`
        : "No servicing requests are currently waiting in the queue.",
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
  const customerNameSearch = doc.querySelector("[data-customer-name-search]");
  const clearCustomerNameSearch = doc.querySelector("[data-clear-customer-name-search]");

  if (
    !(
      csrName &&
      csrStaffId &&
      csrRole &&
      logoutButton &&
      queueStatus &&
      queueBody &&
      customerNameSearch &&
      clearCustomerNameSearch
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
      customerNameSearch,
      clearCustomerNameSearch,
    };
  }

  csrName.textContent = session.name;
  csrStaffId.textContent = session.staffId;
  csrRole.textContent = session.title;

  let loadedServicingOrders = [];

  function applyQueueFilter() {
    const searchValue = customerNameSearch.value;
    const normalizedSearchValue = normalizeSearchValue(searchValue);
    const filteredServicingOrders = normalizedSearchValue
      ? loadedServicingOrders.filter((order) =>
        normalizeSearchValue(order.customerName).includes(normalizedSearchValue),
      )
      : loadedServicingOrders;

    renderQueueRows(doc, queueBody, filteredServicingOrders, { searchValue });

    if (!normalizedSearchValue) {
      setQueueStatus(
        queueStatus,
        "success",
        `Queue ready: ${loadedServicingOrders.length} request${loadedServicingOrders.length === 1 ? "" : "s"}.`,
      );
      return;
    }

    if (filteredServicingOrders.length === 0) {
      setQueueStatus(
        queueStatus,
        "info",
        `No queue matches for customer name "${searchValue.trim()}".`,
      );
      return;
    }

    setQueueStatus(
      queueStatus,
      "success",
      `Queue ready: ${filteredServicingOrders.length} of ${loadedServicingOrders.length} request${loadedServicingOrders.length === 1 ? "" : "s"} match "${searchValue.trim()}".`,
    );
  }

  function setSearchEnabled(enabled) {
    customerNameSearch.disabled = !enabled;
    clearCustomerNameSearch.disabled = !enabled;
  }

  setSearchEnabled(false);
  customerNameSearch.value = "";

  customerNameSearch.addEventListener("input", () => {
    applyQueueFilter();
  });

  clearCustomerNameSearch.addEventListener("click", () => {
    customerNameSearch.value = "";
    applyQueueFilter();
    customerNameSearch.focus();
  });

  const queueLoaded = (async () => {
    if (!fetchImpl) {
      setQueueStatus(
        queueStatus,
        "error",
        "Queue unavailable because this browser session cannot call the servicing API.",
      );
      renderQueueRows(doc, queueBody, []);
      setSearchEnabled(false);
      return;
    }

    setQueueStatus(queueStatus, "info", "Loading queue data...");

    try {
      const response = await fetchImpl(getQueueRequestUrl(apiBaseUrl), {
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

      loadedServicingOrders = await response.json();
      setSearchEnabled(true);
      applyQueueFilter();
    } catch (error) {
      loadedServicingOrders = [];
      renderQueueRows(doc, queueBody, []);
      setQueueStatus(
        queueStatus,
        "error",
        "Queue unavailable. Confirm the servicing API is running and try again.",
      );
      queueStatus.dataset.errorDetail = error instanceof Error ? error.message : "Unknown error";
      setSearchEnabled(false);
    }
  })();

  logoutButton.addEventListener("click", () => {
    clearCsrSession(storage);
    navigateTo(buildCsrLoginUrl({ signedOut: "1" }));
  });

  return {
    csrName,
    csrRole,
    csrStaffId,
    logoutButton,
    queueBody,
    queueLoaded,
    queueStatus,
    session,
    customerNameSearch,
    clearCustomerNameSearch,
  };
}

if (typeof document !== "undefined") {
  setupCsrDashboardPage(document);
}
