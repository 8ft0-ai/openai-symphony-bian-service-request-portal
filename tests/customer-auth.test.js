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

function createFixture(hash = "#/customer/login") {
  const dom = new JSDOM(pageMarkup, {
    url: `http://localhost/${hash}`,
  });
  const { document } = dom.window;
  const app = setupCustomerPortal(document, dom.window);

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
