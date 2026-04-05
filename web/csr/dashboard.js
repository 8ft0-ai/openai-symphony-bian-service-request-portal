import {
  buildCsrLoginUrl,
  clearCsrSession,
  CSR_DASHBOARD_PATH,
  getCsrSession,
} from "./auth.js";

export function setupCsrDashboardPage(doc = document, options = {}) {
  const view = doc.defaultView;
  const storage = options.storage ?? view?.sessionStorage ?? null;
  const location = options.location ?? view?.location ?? { pathname: CSR_DASHBOARD_PATH };
  const navigateTo =
    options.navigateTo ?? ((target) => view.location.assign(target));

  const csrName = doc.querySelector("[data-csr-name]");
  const csrStaffId = doc.querySelector("[data-csr-staff-id]");
  const csrRole = doc.querySelector("[data-csr-role]");
  const logoutButton = doc.querySelector("[data-csr-logout]");

  if (!(csrName && csrStaffId && csrRole && logoutButton)) {
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
      session: null,
    };
  }

  csrName.textContent = session.name;
  csrStaffId.textContent = session.staffId;
  csrRole.textContent = session.title;

  logoutButton.addEventListener("click", () => {
    clearCsrSession(storage);
    navigateTo(buildCsrLoginUrl({ signedOut: "1" }));
  });

  return {
    csrName,
    csrRole,
    csrStaffId,
    logoutButton,
    session,
  };
}

if (typeof document !== "undefined") {
  setupCsrDashboardPage(document);
}
