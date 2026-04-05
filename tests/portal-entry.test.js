import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { JSDOM } from "jsdom";

import {
  CSR_DASHBOARD_PATH,
  CSR_LOGIN_PATH,
  CSR_SESSION_STORAGE_KEY,
  DEMO_CSR_ACCOUNT,
  authenticateCsr,
} from "../web/csr/auth.js";
import { setupPortalLanding } from "../web/app.js";

const pageMarkup = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");

function createFixture({ session = null } = {}) {
  const dom = new JSDOM(pageMarkup, { url: "http://localhost/" });
  const { document, sessionStorage } = dom.window;

  if (session) {
    sessionStorage.setItem(CSR_SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  const controls = setupPortalLanding(document, { storage: sessionStorage });

  return {
    ...controls,
    document,
  };
}

test("the portal landing routes signed-out visitors to the CSR login entry point", () => {
  const { activeStaff, staffDescription, staffEntry } = createFixture();

  assert.equal(staffEntry.getAttribute("href"), CSR_LOGIN_PATH);
  assert.equal(staffEntry.textContent.trim(), "Open CSR staff login");
  assert.match(staffDescription.textContent, /protected operational dashboard/i);
  assert.equal(activeStaff.hidden, true);
  assert.equal(activeStaff.textContent, "");
});

test("the portal landing surfaces the active CSR session and return path", () => {
  const session = authenticateCsr({
    password: DEMO_CSR_ACCOUNT.password,
    staffId: DEMO_CSR_ACCOUNT.staffId,
  });
  const { activeStaff, staffDescription, staffEntry } = createFixture({ session });

  assert.equal(staffEntry.getAttribute("href"), CSR_DASHBOARD_PATH);
  assert.equal(staffEntry.textContent.trim(), "Return to CSR dashboard");
  assert.match(staffDescription.textContent, /Continue as Mina Patel/i);
  assert.equal(activeStaff.hidden, false);
  assert.equal(activeStaff.textContent, "Mina Patel is signed in as CSR staff");
});
