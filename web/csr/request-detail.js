import {
  buildCsrLoginUrl,
  CSR_DASHBOARD_PATH,
  getCsrSession,
} from "./auth.js";

export function setupCsrRequestDetailPage(doc = document, options = {}) {
  const view = doc.defaultView;
  const storage = options.storage ?? view?.sessionStorage ?? null;
  const location =
    options.location ?? view?.location ?? { pathname: "/csr/request-detail.html", search: "" };
  const navigateTo = options.navigateTo ?? ((target) => view.location.assign(target));

  const csrName = doc.querySelector("[data-csr-name]");
  const requestDetailId = doc.querySelector("[data-request-detail-id]");
  const requestDetailNote = doc.querySelector("[data-request-detail-note]");

  if (!(csrName && requestDetailId && requestDetailNote)) {
    throw new Error("CSR request detail markup is incomplete.");
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
      requestDetailId,
      requestDetailNote,
      session: null,
    };
  }

  csrName.textContent = session.name;

  const params = new URLSearchParams(location.search ?? "");
  const servicingOrderId = String(params.get("servicingOrderId") ?? "").trim();

  if (servicingOrderId) {
    requestDetailId.textContent = servicingOrderId;
    requestDetailNote.textContent =
      "Queue navigation is active. Full detail fields are delivered in CSR-008.";
  }

  return {
    csrName,
    requestDetailId,
    requestDetailNote,
    session,
    servicingOrderId,
  };
}

if (typeof document !== "undefined") {
  setupCsrRequestDetailPage(document);
}
