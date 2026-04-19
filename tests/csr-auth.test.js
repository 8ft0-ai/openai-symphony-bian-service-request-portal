import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { JSDOM } from "jsdom";

import {
  authenticateCsr,
  buildCsrLoginUrl,
  CSR_DASHBOARD_PATH,
  CSR_LOGIN_PATH,
  CSR_SESSION_STORAGE_KEY,
  DEMO_CSR_ACCOUNT,
} from "../web/csr/auth.js";
import { setupCsrDashboardPage } from "../web/csr/dashboard.js";
import { setupCsrLoginPage } from "../web/csr/login.js";

const loginMarkup = readFileSync(new URL("../web/csr/login.html", import.meta.url), "utf8");
const dashboardMarkup = readFileSync(
  new URL("../web/csr/dashboard.html", import.meta.url),
  "utf8",
);

function createLoginFixture({ search = "", session = null } = {}) {
  const dom = new JSDOM(loginMarkup, { url: `http://localhost${CSR_LOGIN_PATH}${search}` });
  const { document, Event, sessionStorage } = dom.window;

  if (session) {
    sessionStorage.setItem(CSR_SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  let navigatedTo = null;

  const controls = setupCsrLoginPage(document, {
    location: dom.window.location,
    navigateTo: (target) => {
      navigatedTo = target;
    },
    storage: sessionStorage,
  });

  return {
    ...controls,
    Event,
    document,
    getNavigatedTo: () => navigatedTo,
    sessionStorage,
  };
}

function createDashboardFixture({ session = null } = {}) {
  const dom = new JSDOM(dashboardMarkup, { url: `http://localhost${CSR_DASHBOARD_PATH}` });
  const { document, Event, sessionStorage } = dom.window;

  if (session) {
    sessionStorage.setItem(CSR_SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  let navigatedTo = null;

  const controls = setupCsrDashboardPage(document, {
    location: dom.window.location,
    navigateTo: (target) => {
      navigatedTo = target;
    },
    storage: sessionStorage,
  });

  return {
    ...controls,
    Event,
    document,
    getNavigatedTo: () => navigatedTo,
    sessionStorage,
  };
}

function createDashboardFixtureWithCustomerSession({
  customerSession = null,
  session = null,
} = {}) {
  const fixture = createDashboardFixture({ session });

  if (customerSession) {
    fixture.sessionStorage.setItem("customerPortal.session", JSON.stringify(customerSession));
  }

  return fixture;
}

function dispatchInput(field, Event, value) {
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

function submitForm(form, Event) {
  const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
  form.dispatchEvent(submitEvent);
  return submitEvent;
}

test("the CSR login page renders dedicated staff-only fields and seeded credentials", () => {
  const { document, submitButton } = createLoginFixture();

  assert.equal(document.querySelector("#csr-login-title")?.textContent?.trim(), "Sign in to the servicing queue.");
  assert.equal(document.querySelector('label[for="staff-id"]')?.textContent?.trim(), "Staff ID");
  assert.equal(document.querySelector('label[for="staff-password"]')?.textContent?.trim(), "Password");
  assert.equal(document.querySelector("[data-demo-staff-id]")?.textContent?.trim(), DEMO_CSR_ACCOUNT.staffId);
  assert.equal(document.querySelector("[data-demo-password]")?.textContent?.trim(), DEMO_CSR_ACCOUNT.password);
  assert.equal(submitButton.disabled, true);
});

test("valid CSR credentials establish a staff session and redirect to the dashboard", () => {
  const { Event, feedback, form, getNavigatedTo, passwordInput, sessionStorage, staffIdInput } =
    createLoginFixture();

  dispatchInput(staffIdInput, Event, DEMO_CSR_ACCOUNT.staffId);
  dispatchInput(passwordInput, Event, DEMO_CSR_ACCOUNT.password);
  const submitEvent = submitForm(form, Event);

  assert.equal(submitEvent.defaultPrevented, true);
  assert.equal(getNavigatedTo(), CSR_DASHBOARD_PATH);
  assert.equal(feedback.hidden, true);
  assert.deepEqual(
    JSON.parse(sessionStorage.getItem(CSR_SESSION_STORAGE_KEY)),
    authenticateCsr({
      password: DEMO_CSR_ACCOUNT.password,
      staffId: DEMO_CSR_ACCOUNT.staffId,
    }),
  );
});

test("invalid CSR credentials are rejected without creating a session", () => {
  const { Event, feedback, form, getNavigatedTo, passwordInput, sessionStorage, staffIdInput } =
    createLoginFixture();

  dispatchInput(staffIdInput, Event, DEMO_CSR_ACCOUNT.staffId);
  dispatchInput(passwordInput, Event, "wrong-password");
  submitForm(form, Event);

  assert.equal(getNavigatedTo(), null);
  assert.equal(sessionStorage.getItem(CSR_SESSION_STORAGE_KEY), null);
  assert.equal(feedback.hidden, false);
  assert.equal(feedback.dataset.tone, "error");
  assert.match(feedback.textContent, /incorrect/i);
  assert.equal(staffIdInput.getAttribute("aria-invalid"), "true");
  assert.equal(passwordInput.getAttribute("aria-invalid"), "true");
});

test("visiting the dashboard without a CSR session redirects back to staff login", () => {
  const { getNavigatedTo, session } = createDashboardFixture();

  assert.equal(session, null);
  assert.equal(
    getNavigatedTo(),
    buildCsrLoginUrl({ next: CSR_DASHBOARD_PATH, reason: "auth-required" }),
  );
});

test("an authenticated CSR can render the dashboard and sign out again", () => {
  const session = authenticateCsr({
    password: DEMO_CSR_ACCOUNT.password,
    staffId: DEMO_CSR_ACCOUNT.staffId,
  });
  const { Event, document, getNavigatedTo, logoutButton, sessionStorage } = createDashboardFixture({
    session,
  });

  assert.equal(getNavigatedTo(), null);
  assert.equal(document.querySelector("[data-csr-name]")?.textContent, DEMO_CSR_ACCOUNT.name);
  assert.equal(document.querySelector("[data-csr-staff-id]")?.textContent, DEMO_CSR_ACCOUNT.staffId);
  assert.equal(document.querySelector("[data-csr-role]")?.textContent, DEMO_CSR_ACCOUNT.role);

  logoutButton.dispatchEvent(new Event("click", { bubbles: true }));

  assert.equal(sessionStorage.getItem(CSR_SESSION_STORAGE_KEY), null);
  assert.equal(getNavigatedTo(), buildCsrLoginUrl({ signedOut: "1" }));
});

test("a customer-authenticated session does not grant CSR dashboard access", () => {
  const { getNavigatedTo, session } = createDashboardFixtureWithCustomerSession({
    customerSession: {
      role: "customer",
      customerNumber: "100200300",
      customerName: "Jordan Lee",
      authenticatedAt: "2026-04-19T00:00:00.000Z",
    },
  });

  assert.equal(session, null);
  assert.equal(
    getNavigatedTo(),
    buildCsrLoginUrl({ next: CSR_DASHBOARD_PATH, reason: "auth-required" }),
  );
});

test("an existing CSR session skips the login screen and returns directly to the dashboard", () => {
  const session = authenticateCsr({
    password: DEMO_CSR_ACCOUNT.password,
    staffId: DEMO_CSR_ACCOUNT.staffId,
  });
  const { getNavigatedTo } = createLoginFixture({ session });

  assert.equal(getNavigatedTo(), CSR_DASHBOARD_PATH);
});
