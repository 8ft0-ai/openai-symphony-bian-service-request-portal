import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { JSDOM } from "jsdom";

import {
  CUSTOMER_ROUTES,
  getCustomerDashboardModel,
  setupCustomerPortal,
} from "../web/app.js";

const pageMarkup = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");

function createFixture(hash = "#/customer/login", options = {}) {
  const dom = new JSDOM(pageMarkup, {
    url: `http://localhost/${hash}`,
  });
  const { document } = dom.window;
  const app = setupCustomerPortal(document, dom.window, options);

  return {
    app,
    document,
    window: dom.window,
  };
}

function submitLogin(document, window, { customerNumber, accessCode }) {
  const form = document.querySelector("[data-customer-login-form]");
  const customerNumberInput = document.querySelector("#customer-number");
  const accessCodeInput = document.querySelector("#access-code");

  customerNumberInput.value = customerNumber;
  accessCodeInput.value = accessCode;

  form.dispatchEvent(
    new window.Event("submit", {
      bubbles: true,
      cancelable: true,
    }),
  );
}

test("the portal renders a customer login screen with bank credential fields", () => {
  const { document, app } = createFixture();
  const heading = document.querySelector("#customer-login-title");
  const customerNumberInput = document.querySelector("#customer-number");
  const accessCodeInput = document.querySelector("#access-code");
  const submitButton = document.querySelector(".primary-action");
  const pageText = document.body.textContent.replace(/\s+/g, " ").trim();

  assert.equal(app.getCurrentRoute(), CUSTOMER_ROUTES.login);
  assert.equal(heading?.textContent.trim(), "Securely access your customer dashboard.");
  assert.equal(customerNumberInput?.getAttribute("autocomplete"), "username");
  assert.equal(accessCodeInput?.getAttribute("type"), "password");
  assert.match(pageText, /CSR authentication remains on a separate staff-only portal/);
  assert.equal(submitButton?.textContent.trim(), "Access customer portal");
});

test("valid customer credentials establish a session and redirect to the dashboard", () => {
  const { document, window, app } = createFixture();

  submitLogin(document, window, {
    customerNumber: "100200300",
    accessCode: "246810",
  });

  const dashboardHeading = document.querySelector("#customer-dashboard-title");
  const session = app.getSession();

  assert.equal(app.getCurrentRoute(), CUSTOMER_ROUTES.dashboard);
  assert.equal(window.location.hash, "#/customer/dashboard");
  assert.equal(dashboardHeading?.textContent.trim(), "Customer dashboard");
  assert.equal(session?.role, "customer");
  assert.equal(session?.customerNumber, "100200300");
  assert.match(document.body.textContent, /Customer session established/);
  assert.match(document.body.textContent, /Jordan Lee/);
  assert.match(document.body.textContent, /18 Harbour View Road, Sydney NSW 2000/);
  assert.match(document.body.textContent, /\+61 412 555 019/);
  assert.match(document.body.textContent, /jordan\.lee@examplebank\.test/);
});

test("invalid customer credentials are rejected and no session is created", () => {
  const { document, window, app } = createFixture();

  submitLogin(document, window, {
    customerNumber: "100200300",
    accessCode: "999999",
  });

  const errorBanner = document.querySelector("#customer-login-feedback");

  assert.equal(app.getCurrentRoute(), CUSTOMER_ROUTES.login);
  assert.equal(window.location.hash, "#/customer/login");
  assert.match(errorBanner?.textContent || "", /not recognised/);
  assert.equal(app.getSession(), null);
});

test("expired customer credentials are rejected with the expiry message", () => {
  const { document, window, app } = createFixture();

  submitLogin(document, window, {
    customerNumber: "300200100",
    accessCode: "864200",
  });

  const errorBanner = document.querySelector("#customer-login-feedback");

  assert.equal(app.getCurrentRoute(), CUSTOMER_ROUTES.login);
  assert.equal(window.location.hash, "#/customer/login");
  assert.match(errorBanner?.textContent || "", /have expired/);
  assert.equal(app.getSession(), null);
});

test("unauthenticated access to the protected dashboard route is denied", () => {
  const { document, window, app } = createFixture("#/customer/dashboard");

  assert.equal(app.getCurrentRoute(), CUSTOMER_ROUTES.login);
  assert.equal(window.location.hash, "#/customer/login");
  assert.match(document.body.textContent, /bank-approved customer credentials/);
  assert.throws(
    () => getCustomerDashboardModel(window.sessionStorage),
    /Customer authentication is required/,
  );
});

test("an authenticated customer is redirected away from the login route to the dashboard", () => {
  const { document, window, app } = createFixture();

  submitLogin(document, window, {
    customerNumber: "100200300",
    accessCode: "246810",
  });

  window.location.hash = "#/customer/login";
  app.render();

  assert.equal(app.getCurrentRoute(), CUSTOMER_ROUTES.dashboard);
  assert.equal(window.location.hash, "#/customer/dashboard");
  assert.match(document.body.textContent, /existing customer session is active/);
});

test("request history rows include type, submitted date, status, and detail links", () => {
  const { document, window } = createFixture();

  submitLogin(document, window, {
    customerNumber: "100200300",
    accessCode: "246810",
  });

  const requestCards = document.querySelectorAll(".request-card");
  const submittedDates = Array.from(
    document.querySelectorAll(".request-submitted-date strong"),
    (node) => node.textContent?.trim(),
  );
  const statusValues = Array.from(
    document.querySelectorAll(".request-status strong"),
    (node) => node.textContent?.trim(),
  );
  const detailLinks = Array.from(
    document.querySelectorAll(".request-detail-link"),
    (node) => node.getAttribute("href"),
  );

  assert.equal(requestCards.length, 2);
  assert.deepEqual(submittedDates, ["2026-04-12", "2026-04-07"]);
  assert.deepEqual(statusValues, ["Pending", "Completed"]);
  assert.deepEqual(detailLinks, [
    "#/customer/requests/SR-1042",
    "#/customer/requests/SR-1028",
  ]);
  assert.match(document.body.textContent, /Address update/);
  assert.match(document.body.textContent, /Email update/);
});

test("request history renders an empty state when the authenticated customer has no requests", () => {
  const { document, window } = createFixture();

  submitLogin(document, window, {
    customerNumber: "555666777",
    accessCode: "112233",
  });

  const emptyState = document.querySelector(".request-empty-state");
  const requestCards = document.querySelectorAll(".request-card");

  assert.equal(requestCards.length, 0);
  assert.equal(
    emptyState?.textContent?.trim(),
    "No servicing requests have been submitted yet.",
  );
});

test("dashboard gracefully handles partially populated profile fields", () => {
  const customerDirectory = Object.freeze({
    "123456789": Object.freeze({
      accessCode: "112233",
      state: "active",
      customerName: "Taylor Quinn",
      profile: Object.freeze({
        residentialAddress: "",
        mobileNumber: "   ",
        emailAddress: "taylor.quinn@examplebank.test",
      }),
      requests: Object.freeze([]),
      internalNotes: "CSR-only note",
    }),
  });
  const { document, window, app } = createFixture("#/customer/login", {
    customerDirectory,
  });

  submitLogin(document, window, {
    customerNumber: "123456789",
    accessCode: "112233",
  });

  const bodyText = document.body.textContent;

  assert.equal(app.getCurrentRoute(), CUSTOMER_ROUTES.dashboard);
  assert.match(bodyText, /taylor\.quinn@examplebank\.test/);
  assert.equal((bodyText.match(/Not provided on file/g) || []).length, 2);
  assert.doesNotMatch(bodyText, /CSR-only note/);
});

test("dashboard model exposes only the authenticated customer's source profile", () => {
  const customerDirectory = Object.freeze({
    "100200300": Object.freeze({
      accessCode: "246810",
      state: "active",
      customerName: "Jordan Lee",
      profile: Object.freeze({
        residentialAddress: "18 Harbour View Road, Sydney NSW 2000",
        mobileNumber: "+61 412 555 019",
        emailAddress: "jordan.lee@examplebank.test",
      }),
      requests: Object.freeze([]),
    }),
    "900800700": Object.freeze({
      accessCode: "334455",
      state: "active",
      customerName: "Riley Banks",
      profile: Object.freeze({
        residentialAddress: "99 Hidden Avenue, Perth WA 6000",
        mobileNumber: "+61 499 000 999",
        emailAddress: "riley.banks@examplebank.test",
      }),
      requests: Object.freeze([]),
    }),
  });
  const { document, window, app } = createFixture("#/customer/login", {
    customerDirectory,
  });

  submitLogin(document, window, {
    customerNumber: "100200300",
    accessCode: "246810",
  });

  const bodyText = document.body.textContent;

  assert.equal(app.getCurrentRoute(), CUSTOMER_ROUTES.dashboard);
  assert.match(bodyText, /Jordan Lee/);
  assert.match(bodyText, /18 Harbour View Road, Sydney NSW 2000/);
  assert.doesNotMatch(bodyText, /Riley Banks/);
  assert.doesNotMatch(bodyText, /99 Hidden Avenue, Perth WA 6000/);
});
