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

function normalizeSearchValue(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getQueueRequestUrl(apiBaseUrl, statusFilter = null) {
  const queueUrl = apiBaseUrl
    ? new URL("/ServicingOrder", apiBaseUrl)
    : new URL("/ServicingOrder", "http://localhost");

  if (statusFilter) {
    queueUrl.searchParams.set("status", statusFilter);
  }

  if (apiBaseUrl) {
    return queueUrl.toString();
  }

  return `${queueUrl.pathname}${queueUrl.search}`;
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

function setSearchControlState(customerNameSearch, clearCustomerNameSearch, enabled) {
  customerNameSearch.disabled = !enabled;
  clearCustomerNameSearch.disabled = !enabled;
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
  const statusFilterSelect = doc.querySelector("[data-queue-status-filter]");
  const clearFilterButton = doc.querySelector("[data-queue-status-clear]");
  const customerNameSearch = doc.querySelector("[data-customer-name-search]");
  const clearCustomerNameSearch = doc.querySelector("[data-clear-customer-name-search]");

  if (
    !(
      csrName
      && csrStaffId
      && csrRole
      && logoutButton
      && queueStatus
      && queueBody
      && statusFilterSelect
      && clearFilterButton
      && customerNameSearch
      && clearCustomerNameSearch
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
      customerNameSearch,
      clearCustomerNameSearch,
    };
  }

  csrName.textContent = session.name;
  csrStaffId.textContent = session.staffId;
  csrRole.textContent = session.title;

  let loadedServicingOrders = [];
  let currentQueueLoad = Promise.resolve();

  function applyClientSideSearch() {
    const selectedStatus = resolveSelectedQueueStatus(statusFilterSelect);
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
        selectedStatus
          ? `Queue ready: ${loadedServicingOrders.length} request${loadedServicingOrders.length === 1 ? "" : "s"} with status ${selectedStatus}.`
          : `Queue ready: ${loadedServicingOrders.length} request${loadedServicingOrders.length === 1 ? "" : "s"}.`,
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
      selectedStatus
        ? `Queue ready: ${filteredServicingOrders.length} of ${loadedServicingOrders.length} request${loadedServicingOrders.length === 1 ? "" : "s"} match "${searchValue.trim()}" with status ${selectedStatus}.`
        : `Queue ready: ${filteredServicingOrders.length} of ${loadedServicingOrders.length} request${loadedServicingOrders.length === 1 ? "" : "s"} match "${searchValue.trim()}".`,
    );
  }

  const loadQueue = async () => {
    const selectedStatus = resolveSelectedQueueStatus(statusFilterSelect);

    setStatusFilterControlState(clearFilterButton, selectedStatus);

    if (!fetchImpl) {
      loadedServicingOrders = [];
      setQueueStatus(
        queueStatus,
        "error",
        "Queue unavailable because this browser session cannot call the servicing API.",
      );
      renderQueueRows(doc, queueBody, []);
      setSearchControlState(customerNameSearch, clearCustomerNameSearch, false);
      return;
    }

    setQueueStatus(
      queueStatus,
      "info",
      selectedStatus
        ? `Loading queue data for status: ${selectedStatus}...`
        : "Loading queue data...",
    );

    try {
      const response = await fetchImpl(getQueueRequestUrl(apiBaseUrl, selectedStatus), {
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
      setSearchControlState(customerNameSearch, clearCustomerNameSearch, true);
      applyClientSideSearch();
    } catch (error) {
      loadedServicingOrders = [];
      setSearchControlState(customerNameSearch, clearCustomerNameSearch, false);
      renderQueueRows(doc, queueBody, []);
      setQueueStatus(
        queueStatus,
        "error",
        "Queue unavailable. Confirm the servicing API is running and try again.",
      );
      queueStatus.dataset.errorDetail = error instanceof Error ? error.message : "Unknown error";
    }
  };

  function triggerQueueLoad() {
    currentQueueLoad = loadQueue();
    return currentQueueLoad;
  }

  setSearchControlState(customerNameSearch, clearCustomerNameSearch, false);
  customerNameSearch.value = "";

  const queueLoaded = triggerQueueLoad();

  logoutButton.addEventListener("click", () => {
    clearCsrSession(storage);
    navigateTo(buildCsrLoginUrl({ signedOut: "1" }));
  });

  statusFilterSelect.addEventListener("change", () => {
    customerNameSearch.value = "";
    void triggerQueueLoad();
  });

  clearFilterButton.addEventListener("click", () => {
    statusFilterSelect.value = "";
    customerNameSearch.value = "";
    void triggerQueueLoad();
  });

  customerNameSearch.addEventListener("input", () => {
    applyClientSideSearch();
  });

  clearCustomerNameSearch.addEventListener("click", () => {
    customerNameSearch.value = "";
    applyClientSideSearch();
    customerNameSearch.focus();
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
    statusFilterSelect,
    customerNameSearch,
    clearCustomerNameSearch,
    waitForQueueLoad: () => currentQueueLoad,
  };
}

if (typeof document !== "undefined") {
  setupCsrDashboardPage(document);
}
