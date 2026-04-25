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
  setupCsrDashboardPage,
} from "../web/csr/dashboard.js";

const dashboardMarkup = readFileSync(
  new URL("../web/csr/dashboard.html", import.meta.url),
  "utf8",
);

function createDashboardFixture({ session = null, fetchImpl } = {}) {
  const dom = new JSDOM(dashboardMarkup, { url: `http://localhost${CSR_DASHBOARD_PATH}` });
  const { document, Event, sessionStorage } = dom.window;

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
    Event,
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

test("supports exact and partial customer-name search with clear no-match messaging", async () => {
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
    {
      servicingOrderId: "SO_10003",
      customerName: "Riley Hart",
      requestType: "Phone Update",
      submittedDate: "2026-04-24T06:20:00.000Z",
      servicingOrderStatus: "Pending",
    },
  ];

  const fixture = createDashboardFixture({
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => servicingOrders,
    }),
    session,
  });

  await fixture.queueLoaded;

  const searchInput = fixture.document.querySelector("[data-customer-name-search]");
  const clearSearchButton = fixture.document.querySelector("[data-clear-customer-name-search]");

  assert.ok(searchInput);
  assert.ok(clearSearchButton);
  assert.equal(searchInput.disabled, false);
  assert.equal(clearSearchButton.disabled, false);

  searchInput.value = "Alex Quinn";
  searchInput.dispatchEvent(new fixture.Event("input", { bubbles: true }));

  let rows = [...fixture.document.querySelectorAll("[data-csr-queue-body] tr")];
  assert.equal(rows.length, 1);
  assert.equal(rows[0].querySelector("td")?.textContent?.trim(), "Alex Quinn");

  searchInput.value = "ri";
  searchInput.dispatchEvent(new fixture.Event("input", { bubbles: true }));

  rows = [...fixture.document.querySelectorAll("[data-csr-queue-body] tr")];
  assert.equal(rows.length, 1);
  assert.equal(rows[0].querySelector("td")?.textContent?.trim(), "Riley Hart");

  searchInput.value = "No Match";
  searchInput.dispatchEvent(new fixture.Event("input", { bubbles: true }));

  const noMatchRowText =
    fixture.document.querySelector("[data-csr-queue-body] tr .queue-empty-cell")?.textContent ?? "";
  assert.match(noMatchRowText, /No servicing requests matched customer name "No Match"\./i);
  assert.match(
    fixture.document.querySelector("[data-queue-status]")?.textContent ?? "",
    /No queue matches for customer name "No Match"\./i,
  );

  clearSearchButton.dispatchEvent(new fixture.Event("click", { bubbles: true }));
  rows = [...fixture.document.querySelectorAll("[data-csr-queue-body] tr")];
  assert.equal(rows.length, 3);
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
