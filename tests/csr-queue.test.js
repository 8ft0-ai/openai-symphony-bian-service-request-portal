import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { JSDOM } from "jsdom";

import {
  authenticateCsr,
  buildCsrLoginUrl,
  CSR_DASHBOARD_PATH,
  CSR_SESSION_STORAGE_KEY,
  DEMO_CSR_ACCOUNT,
} from "../web/csr/auth.js";
import {
  CSR_REQUEST_DETAIL_PATH,
  CSR_QUEUE_SUPPORTED_STATUSES,
  setupCsrDashboardPage,
} from "../web/csr/dashboard.js";

const dashboardMarkup = readFileSync(
  new URL("../web/csr/dashboard.html", import.meta.url),
  "utf8",
);

function createDashboardFixture({ session = null, fetchImpl } = {}) {
  const dom = new JSDOM(dashboardMarkup, { url: `http://localhost${CSR_DASHBOARD_PATH}` });
  const { document, sessionStorage } = dom.window;

  if (session) {
    sessionStorage.setItem(CSR_SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  let navigatedTo = null;

  const controls = setupCsrDashboardPage(document, {
    fetchImpl,
    location: dom.window.location,
    navigateTo: (target) => {
      navigatedTo = target;
    },
    storage: sessionStorage,
  });

  return {
    ...controls,
    document,
    getNavigatedTo: () => navigatedTo,
    sessionStorage,
  };
}

test("renders queue rows with customer, request type, submitted date, status, and detail link", async () => {
  const session = authenticateCsr({
    password: DEMO_CSR_ACCOUNT.password,
    staffId: DEMO_CSR_ACCOUNT.staffId,
  });
  const servicingOrders = [
    {
      servicingOrderId: "SO_10001",
      customerName: "Jane Doe",
      requestType: "Address Update",
      submittedDate: "2026-04-22T10:15:00.000Z",
      servicingOrderStatus: "Pending",
    },
    {
      servicingOrderId: "SO_10002",
      customerName: "Alex Quinn",
      requestType: "Email Update",
      submittedDate: "2026-04-23T06:20:00.000Z",
      servicingOrderStatus: "In Progress",
    },
  ];

  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ options, url });
    return {
      ok: true,
      status: 200,
      json: async () => servicingOrders,
    };
  };

  const fixture = createDashboardFixture({ fetchImpl, session });

  await fixture.queueLoaded;

  const rows = [...fixture.document.querySelectorAll("[data-csr-queue-body] tr")];
  assert.equal(rows.length, 2);

  const firstRowCells = [...rows[0].querySelectorAll("td")].map((cell) => cell.textContent?.trim());
  assert.deepEqual(firstRowCells.slice(0, 4), [
    "Jane Doe",
    "Address Update",
    "2026-04-22",
    "Pending",
  ]);

  const detailLink = rows[0].querySelector("a.request-detail-link");
  assert.ok(detailLink);
  assert.equal(
    detailLink.getAttribute("href"),
    `${CSR_REQUEST_DETAIL_PATH}?servicingOrderId=SO_10001`,
  );

  const queueStatus = fixture.document.querySelector("[data-queue-status]");
  assert.equal(queueStatus?.dataset.tone, "success");
  assert.match(queueStatus?.textContent ?? "", /Queue ready: 2 requests/i);
  assert.equal(fixture.getNavigatedTo(), null);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/ServicingOrder");
  assert.equal(calls[0].options?.headers?.["x-authenticated-role"], "csr");
  assert.equal(calls[0].options?.headers?.["x-csr-staff-id"], DEMO_CSR_ACCOUNT.staffId);
});

test("supports status filtering with clear/reset behavior for CSR queue", async () => {
  const session = authenticateCsr({
    password: DEMO_CSR_ACCOUNT.password,
    staffId: DEMO_CSR_ACCOUNT.staffId,
  });
  const allServicingOrders = [
    {
      servicingOrderId: "SO_20001",
      customerName: "Jamie Cortez",
      requestType: "Address Update",
      submittedDate: "2026-04-21T10:15:00.000Z",
      servicingOrderStatus: "Pending",
    },
    {
      servicingOrderId: "SO_20002",
      customerName: "Ash Knight",
      requestType: "Email Update",
      submittedDate: "2026-04-22T06:20:00.000Z",
      servicingOrderStatus: "Completed",
    },
  ];
  const pendingServicingOrders = allServicingOrders.filter(
    (order) => order.servicingOrderStatus === "Pending",
  );

  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ options, url });

    if (url.includes("?status=Pending")) {
      return {
        ok: true,
        status: 200,
        json: async () => pendingServicingOrders,
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => allServicingOrders,
    };
  };

  const fixture = createDashboardFixture({ fetchImpl, session });

  await fixture.queueLoaded;

  const filterOptions = [...fixture.statusFilterSelect.options].map((option) => option.value);
  assert.deepEqual(filterOptions, ["", ...CSR_QUEUE_SUPPORTED_STATUSES]);

  fixture.statusFilterSelect.value = "Pending";
  fixture.statusFilterSelect.dispatchEvent(new fixture.document.defaultView.Event("change"));
  await fixture.waitForQueueLoad();

  assert.equal(calls[1].url, "/ServicingOrder?status=Pending");
  const filteredRows = [...fixture.document.querySelectorAll("[data-csr-queue-body] tr")];
  assert.equal(filteredRows.length, 1);
  assert.equal(filteredRows[0].querySelectorAll("td")[3]?.textContent?.trim(), "Pending");
  assert.match(
    fixture.document.querySelector("[data-queue-status]")?.textContent ?? "",
    /with status Pending/i,
  );

  const clearFilterButton = fixture.document.querySelector("[data-queue-status-clear]");
  assert.ok(clearFilterButton);
  clearFilterButton.click();
  await fixture.waitForQueueLoad();

  assert.equal(fixture.statusFilterSelect.value, "");
  assert.equal(calls[2].url, "/ServicingOrder");
});

test("redirects to CSR login and clears session when queue API responds unauthorized", async () => {
  const session = authenticateCsr({
    password: DEMO_CSR_ACCOUNT.password,
    staffId: DEMO_CSR_ACCOUNT.staffId,
  });

  const fixture = createDashboardFixture({
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      json: async () => ({ message: "Unauthorized" }),
    }),
    session,
  });

  await fixture.queueLoaded;

  assert.equal(
    fixture.getNavigatedTo(),
    buildCsrLoginUrl({ next: CSR_DASHBOARD_PATH, reason: "auth-required" }),
  );
  assert.equal(fixture.sessionStorage.getItem(CSR_SESSION_STORAGE_KEY), null);
});

test("searches queue by servicing order ID using supported normalized matching", async () => {
  const session = authenticateCsr({
    password: DEMO_CSR_ACCOUNT.password,
    staffId: DEMO_CSR_ACCOUNT.staffId,
  });

  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);

    if (url.includes("servicingOrderId=SO10001")) {
      return {
        ok: true,
        status: 200,
        json: async () => [
          {
            servicingOrderId: "SO_10001",
            customerName: "Jane Doe",
            requestType: "Address Update",
            submittedDate: "2026-04-22T10:15:00.000Z",
            servicingOrderStatus: "Pending",
          },
        ],
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => [],
    };
  };

  const fixture = createDashboardFixture({ fetchImpl, session });
  await fixture.queueLoaded;

  fixture.queueSearchInput.value = "so-10001";
  fixture.queueSearchForm.dispatchEvent(
    new fixture.document.defaultView.Event("submit", { bubbles: true, cancelable: true }),
  );

  await new Promise((resolve) => setTimeout(resolve, 0));

  const queueStatus = fixture.document.querySelector("[data-queue-status]");
  assert.equal(queueStatus?.dataset.tone, "success");
  assert.match(queueStatus?.textContent ?? "", /Matched 1 request for servicing order ID "SO10001"/i);

  const rows = [...fixture.document.querySelectorAll("[data-csr-queue-body] tr")];
  assert.equal(rows.length, 1);
  assert.match(rows[0].textContent ?? "", /Jane Doe/);
  assert.equal(calls[1], "/ServicingOrder?servicingOrderId=SO10001");
});

test("shows clear no-match state when servicing order ID search returns no results", async () => {
  const session = authenticateCsr({
    password: DEMO_CSR_ACCOUNT.password,
    staffId: DEMO_CSR_ACCOUNT.staffId,
  });

  const fixture = createDashboardFixture({
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => [],
    }),
    session,
  });

  await fixture.queueLoaded;

  fixture.queueSearchInput.value = "SO_UNKNOWN_9999";
  fixture.queueSearchForm.dispatchEvent(
    new fixture.document.defaultView.Event("submit", { bubbles: true, cancelable: true }),
  );

  await new Promise((resolve) => setTimeout(resolve, 0));

  const queueStatus = fixture.document.querySelector("[data-queue-status]");
  assert.equal(queueStatus?.dataset.tone, "info");
  assert.match(
    queueStatus?.textContent ?? "",
    /No request matched servicing order ID "SOUNKNOWN9999"/i,
  );

  const emptyCell = fixture.document.querySelector(".queue-empty-cell");
  assert.ok(emptyCell);
  assert.match(
    emptyCell.textContent ?? "",
    /No request matched servicing order ID "SOUNKNOWN9999"/i,
  );
});
