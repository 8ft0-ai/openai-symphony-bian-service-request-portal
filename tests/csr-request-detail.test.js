import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { JSDOM } from "jsdom";

import {
  authenticateCsr,
  buildCsrLoginUrl,
  CSR_SESSION_STORAGE_KEY,
  DEMO_CSR_ACCOUNT,
} from "../web/csr/auth.js";
import { CSR_REQUEST_DETAIL_PATH } from "../web/csr/dashboard.js";
import { setupCsrRequestDetailPage } from "../web/csr/request-detail.js";

const requestDetailMarkup = readFileSync(
  new URL("../web/csr/request-detail.html", import.meta.url),
  "utf8",
);

function buildRequestDetailResponse(overrides = {}) {
  return {
    servicingOrderId: "SO_7001",
    customerName: "Alex Quinn",
    customerReference: "CUST_11111",
    requestType: "Address Update",
    servicingOrderStatus: "In Progress",
    submittedDate: "2026-04-01T00:00:00.000Z",
    lastUpdateDate: "2026-04-03T00:00:00.000Z",
    requestDetails: {
      oldAddress: "100 Example Street, Sydney NSW 2000",
      newAddress: "200 Updated Avenue, Sydney NSW 2000",
    },
    statusChangeAudit: [
      {
        fromStatus: "Pending",
        toStatus: "In Progress",
        actor: "csr.queue.ops",
        timestamp: "2026-04-02T00:00:00.000Z",
      },
    ],
    internalNotes: [
      {
        note: "Verified details with customer.",
        author: "csr.queue.ops",
        timestamp: "2026-04-03T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function createRequestDetailFixture({
  fetchImpl,
  search = "?servicingOrderId=SO_7001",
  session = null,
} = {}) {
  const dom = new JSDOM(requestDetailMarkup, {
    url: `http://localhost${CSR_REQUEST_DETAIL_PATH}${search}`,
  });
  const { document, sessionStorage } = dom.window;

  if (session) {
    sessionStorage.setItem(CSR_SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  let navigatedTo = null;

  const controls = setupCsrRequestDetailPage(document, {
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

test("unauthenticated CSR request detail route redirects to login", () => {
  const fixture = createRequestDetailFixture();

  assert.equal(fixture.session, null);
  assert.equal(
    fixture.getNavigatedTo(),
    buildCsrLoginUrl({
      next: `${CSR_REQUEST_DETAIL_PATH}?servicingOrderId=SO_7001`,
      reason: "auth-required",
    }),
  );
});

test("renders customer information, comparison table, history, and internal notes", async () => {
  const session = authenticateCsr({
    password: DEMO_CSR_ACCOUNT.password,
    staffId: DEMO_CSR_ACCOUNT.staffId,
  });
  const calls = [];
  const fixture = createRequestDetailFixture({
    fetchImpl: async (url, options) => {
      calls.push({ options, url });
      return {
        ok: true,
        status: 200,
        json: async () => buildRequestDetailResponse(),
      };
    },
    session,
  });

  await fixture.detailLoaded;

  assert.equal(fixture.document.querySelector("[data-request-customer-name]")?.textContent, "Alex Quinn");
  assert.equal(
    fixture.document.querySelector("[data-request-customer-reference]")?.textContent,
    "CUST_11111",
  );
  assert.equal(fixture.document.querySelector("[data-request-type]")?.textContent, "Address Update");
  assert.equal(fixture.document.querySelector("[data-request-status]")?.textContent, "In Progress");

  const comparisonRows = [...fixture.document.querySelectorAll("[data-request-comparison-body] tr")];
  assert.equal(comparisonRows.length, 1);
  assert.deepEqual(
    [...comparisonRows[0].querySelectorAll("td")].map((cell) => cell.textContent?.trim()),
    [
      "Address",
      "100 Example Street, Sydney NSW 2000",
      "200 Updated Avenue, Sydney NSW 2000",
    ],
  );

  const historyItems = [...fixture.document.querySelectorAll("[data-request-history-list] li")].map(
    (item) => item.textContent?.trim(),
  );
  assert.equal(historyItems.length, 2);
  assert.match(historyItems[0] ?? "", /Request submitted/i);
  assert.match(historyItems[1] ?? "", /Status changed: Pending -> In Progress/i);

  const notesItems = [...fixture.document.querySelectorAll("[data-request-internal-notes] li")].map(
    (item) => item.textContent?.trim(),
  );
  assert.equal(notesItems.length, 1);
  assert.match(notesItems[0] ?? "", /Verified details with customer/i);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/ServicingOrder/SO_7001");
  assert.equal(calls[0].options?.headers?.["x-authenticated-role"], "csr");
  assert.equal(calls[0].options?.headers?.["x-csr-staff-id"], DEMO_CSR_ACCOUNT.staffId);
  assert.equal(fixture.getNavigatedTo(), null);
  assert.equal(
    fixture.document.querySelector("[data-request-detail-status]")?.dataset.tone,
    "success",
  );
});

test("renders supported request types in old-vs-new comparison table and keeps note history visible", async () => {
  const session = authenticateCsr({
    password: DEMO_CSR_ACCOUNT.password,
    staffId: DEMO_CSR_ACCOUNT.staffId,
  });
  const scenarios = [
    {
      requestType: "Address Update",
      requestDetails: {
        oldAddress: "100 Example Street, Sydney NSW 2000",
        newAddress: "200 Updated Avenue, Sydney NSW 2000",
      },
      expectedField: "Address",
      expectedOldValue: "100 Example Street, Sydney NSW 2000",
      expectedNewValue: "200 Updated Avenue, Sydney NSW 2000",
    },
    {
      requestType: "Phone Update",
      requestDetails: {
        oldPhoneNumber: "+61 400 111 111",
        newPhoneNumber: "+61 400 111 999",
      },
      expectedField: "Phone Number",
      expectedOldValue: "+61 400 111 111",
      expectedNewValue: "+61 400 111 999",
    },
    {
      requestType: "Email Update",
      requestDetails: {
        oldEmailAddress: "alex.quinn@example.com",
        newEmailAddress: "alex.quinn+new@example.com",
      },
      expectedField: "Email Address",
      expectedOldValue: "alex.quinn@example.com",
      expectedNewValue: "alex.quinn+new@example.com",
    },
  ];

  for (const scenario of scenarios) {
    const fixture = createRequestDetailFixture({
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () =>
          buildRequestDetailResponse({
            requestDetails: scenario.requestDetails,
            requestType: scenario.requestType,
          }),
      }),
      session,
    });

    await fixture.detailLoaded;

    const rowCells = [
      ...fixture.document.querySelectorAll("[data-request-comparison-body] tr:first-child td"),
    ].map((cell) => cell.textContent?.trim());

    assert.deepEqual(rowCells, [
      scenario.expectedField,
      scenario.expectedOldValue,
      scenario.expectedNewValue,
    ]);

    const notesItems = fixture.document.querySelectorAll("[data-request-internal-notes] li");
    assert.equal(notesItems.length, 1);
    assert.match(notesItems[0].textContent ?? "", /csr\.queue\.ops/i);
  }
});

test("clears CSR session and redirects to login when detail API returns unauthorized", async () => {
  const session = authenticateCsr({
    password: DEMO_CSR_ACCOUNT.password,
    staffId: DEMO_CSR_ACCOUNT.staffId,
  });
  const fixture = createRequestDetailFixture({
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      json: async () => ({ message: "Unauthorized" }),
    }),
    session,
  });

  await fixture.detailLoaded;

  assert.equal(fixture.sessionStorage.getItem(CSR_SESSION_STORAGE_KEY), null);
  assert.equal(
    fixture.getNavigatedTo(),
    buildCsrLoginUrl({
      next: `${CSR_REQUEST_DETAIL_PATH}?servicingOrderId=SO_7001`,
      reason: "auth-required",
    }),
  );
});
