import {
  CSR_DASHBOARD_PATH,
  CSR_LOGIN_PATH,
  getCsrSession,
} from "./csr/auth.js";

export function setupPortalLanding(doc = document, options = {}) {
  const view = doc.defaultView;
  const storage = options.storage ?? view?.sessionStorage ?? null;
  const staffEntry = doc.querySelector("[data-staff-entry]");
  const staffDescription = doc.querySelector("[data-staff-description]");
  const activeStaff = doc.querySelector("[data-active-staff]");

  if (!(staffEntry && staffDescription && activeStaff)) {
    throw new Error("Portal landing markup is incomplete.");
  }

  const csrSession = getCsrSession(storage);

  if (csrSession) {
    staffEntry.href = CSR_DASHBOARD_PATH;
    staffEntry.textContent = "Return to CSR dashboard";
    staffDescription.textContent = `Continue as ${csrSession.name} from the protected staff dashboard.`;
    activeStaff.hidden = false;
    activeStaff.textContent = `${csrSession.name} is signed in as CSR staff`;
  } else {
    staffEntry.href = CSR_LOGIN_PATH;
    activeStaff.hidden = true;
    activeStaff.textContent = "";
  }

  return {
    activeStaff,
    staffDescription,
    staffEntry,
  };
}

if (typeof document !== "undefined") {
  setupPortalLanding(document);
}
