const CUSTOMER_SESSION_KEY = "customerPortal.session";

export const CUSTOMER_ROUTES = Object.freeze({
  login: "/customer/login",
  dashboard: "/customer/dashboard",
});

const REDIRECT_MESSAGES = Object.freeze({
  authRequired:
    "Sign in with your bank-approved customer credentials to access customer portal functions.",
  sessionEstablished: "Customer session established. Redirecting to the dashboard.",
  sessionRestored: "An existing customer session is active. Redirecting to the dashboard.",
});

const PROFILE_VALUE_FALLBACK = "Not provided on file";

const CUSTOMER_DIRECTORY = Object.freeze({
  "100200300": Object.freeze({
    accessCode: "246810",
    state: "active",
    customerName: "Jordan Lee",
    profile: Object.freeze({
      residentialAddress: "18 Harbour View Road, Sydney NSW 2000",
      mobileNumber: "+61 412 555 019",
      emailAddress: "jordan.lee@examplebank.test",
    }),
    requests: Object.freeze([
      Object.freeze({
        id: "SR-1042",
        type: "Address update",
        submittedDate: "2026-04-12T09:15:00.000Z",
        status: "Pending",
      }),
      Object.freeze({
        id: "SR-1028",
        type: "Email update",
        submittedDate: "2026-04-07T03:40:00.000Z",
        status: "Completed",
      }),
    ]),
  }),
  "555666777": Object.freeze({
    accessCode: "112233",
    state: "active",
    customerName: "Taylor Brooks",
    profile: Object.freeze({
      residentialAddress: "77 River Road, Brisbane QLD 4000",
      mobileNumber: "+61 419 555 077",
      emailAddress: "taylor.brooks@examplebank.test",
    }),
    requests: Object.freeze([]),
  }),
  "300200100": Object.freeze({
    accessCode: "864200",
    state: "expired",
    customerName: "Casey Morgan",
    profile: Object.freeze({
      residentialAddress: "2 Market Street, Melbourne VIC 3000",
      mobileNumber: "+61 422 555 014",
      emailAddress: "casey.morgan@examplebank.test",
    }),
    requests: Object.freeze([
      Object.freeze({
        id: "SR-1001",
        type: "Phone number update",
        status: "Rejected",
      }),
    ]),
  }),
});

class CustomerAuthError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CustomerAuthError";
    this.code = code;
  }
}

function formatSubmittedDate(value) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.valueOf())) {
    return "Unavailable";
  }

  return parsedDate.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function normalizeCustomerNumber(value) {
  return String(value).replace(/\D/g, "");
}

export function normalizeAccessCode(value) {
  return String(value).trim();
}

export function authenticateCustomer(
  { customerNumber, accessCode },
  customerDirectory = CUSTOMER_DIRECTORY,
) {
  const normalizedCustomerNumber = normalizeCustomerNumber(customerNumber);
  const normalizedAccessCode = normalizeAccessCode(accessCode);
  const customerRecord = customerDirectory[normalizedCustomerNumber];

  if (!(customerRecord && customerRecord.accessCode === normalizedAccessCode)) {
    return {
      ok: false,
      code: "invalid_credentials",
      message: "Customer number or access code was not recognised.",
    };
  }

  if (customerRecord.state === "expired") {
    return {
      ok: false,
      code: "expired_credentials",
      message:
        "These bank credentials have expired. Use your current bank-approved access code to continue.",
    };
  }

  return {
    ok: true,
    customer: {
      customerNumber: normalizedCustomerNumber,
      customerName: customerRecord.customerName,
    },
  };
}

export function buildCustomerSession(customer) {
  return {
    role: "customer",
    customerNumber: customer.customerNumber,
    customerName: customer.customerName,
    authenticatedAt: new Date().toISOString(),
  };
}

export function readCustomerSession(storage) {
  const rawSession = storage.getItem(CUSTOMER_SESSION_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(rawSession);

    if (
      parsedSession?.role !== "customer" ||
      !parsedSession.customerNumber ||
      !parsedSession.customerName
    ) {
      return null;
    }

    return parsedSession;
  } catch {
    return null;
  }
}

export function writeCustomerSession(storage, customer) {
  const session = buildCustomerSession(customer);
  storage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearCustomerSession(storage) {
  storage.removeItem(CUSTOMER_SESSION_KEY);
}

export function requireCustomerSession(storage) {
  const session = readCustomerSession(storage);

  if (!session) {
    throw new CustomerAuthError(
      "unauthenticated",
      "Customer authentication is required for this portal route.",
    );
  }

  return session;
}

export function getCustomerDashboardModel(
  storage,
  customerDirectory = CUSTOMER_DIRECTORY,
) {
  const session = requireCustomerSession(storage);
  const customerRecord = customerDirectory[session.customerNumber];

  if (!(customerRecord && customerRecord.state === "active")) {
    clearCustomerSession(storage);
    throw new CustomerAuthError(
      "unauthenticated",
      "Customer authentication is required for this portal route.",
    );
  }

  return {
    session,
    customerNumber: session.customerNumber,
    customerName: customerRecord.customerName,
    profile: customerRecord.profile,
    requests: customerRecord.requests,
  };
}

export function formatProfileValue(value) {
  if (value === null || value === undefined) {
    return PROFILE_VALUE_FALLBACK;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : PROFILE_VALUE_FALLBACK;
}

export function normalizeCustomerRoute(route) {
  const normalizedRoute = String(route || "").replace(/^#/, "");

  if (normalizedRoute === CUSTOMER_ROUTES.dashboard) {
    return CUSTOMER_ROUTES.dashboard;
  }

  return CUSTOMER_ROUTES.login;
}

export function resolveCustomerRoute(route, storage) {
  const normalizedRoute = normalizeCustomerRoute(route);
  const session = readCustomerSession(storage);

  if (normalizedRoute === CUSTOMER_ROUTES.dashboard && !session) {
    return {
      route: CUSTOMER_ROUTES.login,
      notice: REDIRECT_MESSAGES.authRequired,
    };
  }

  if (normalizedRoute === CUSTOMER_ROUTES.login && session) {
    return {
      route: CUSTOMER_ROUTES.dashboard,
      notice: REDIRECT_MESSAGES.sessionRestored,
    };
  }

  return {
    route: normalizedRoute,
    notice: null,
  };
}

function buildLoginMarkup({ customerNumber, errorMessage, noticeMessage }) {
  const fieldDescriptionIds = ["customer-login-help"];

  if (errorMessage) {
    fieldDescriptionIds.push("customer-login-feedback");
  }

  return `
    <section class="portal-layout portal-layout-login" aria-labelledby="customer-login-title">
      <div class="portal-copy">
        <p class="eyebrow">Customer service request portal</p>
        <h1 id="customer-login-title">Securely access your customer dashboard.</h1>
        <p class="intro">
          Sign in with the bank-approved customer credential flow to review your
          profile details and the status of submitted servicing requests.
        </p>
        <div class="info-card">
          <p class="info-card-title">Channel boundary</p>
          <p>
            This experience is limited to customer access. CSR authentication
            remains on a separate staff-only portal.
          </p>
        </div>
        <div class="credential-preview" aria-label="Demo customer bank credentials">
          <div class="credential-card">
            <p class="credential-label">Active demo credentials</p>
            <p><strong>Customer number</strong> 100200300</p>
            <p><strong>Access code</strong> 246810</p>
          </div>
          <div class="credential-card credential-card-muted">
            <p class="credential-label">Expired credential scenario</p>
            <p><strong>Customer number</strong> 300200100</p>
            <p><strong>Access code</strong> 864200</p>
          </div>
        </div>
      </div>

      <section class="auth-card" aria-labelledby="bank-sign-in-title">
        <p class="auth-kicker">Bank credential sign-in</p>
        <h2 id="bank-sign-in-title">Authenticate to continue</h2>
        <p id="customer-login-help" class="helper-copy">
          Use your customer number and access code to establish a customer-only
          session for this portal.
        </p>
        ${
          noticeMessage
            ? `<p class="banner banner-info" role="status">${escapeHtml(noticeMessage)}</p>`
            : ""
        }
        ${
          errorMessage
            ? `<p id="customer-login-feedback" class="banner banner-error" role="alert">${escapeHtml(errorMessage)}</p>`
            : ""
        }
        <form class="auth-form" data-customer-login-form novalidate>
          <label class="field-label" for="customer-number">Customer number</label>
          <input
            id="customer-number"
            name="customerNumber"
            type="text"
            inputmode="numeric"
            autocomplete="username"
            placeholder="100200300"
            value="${escapeHtml(customerNumber)}"
            aria-describedby="${fieldDescriptionIds.join(" ")}"
            aria-invalid="${String(Boolean(errorMessage))}"
            required
          />

          <label class="field-label" for="access-code">Access code</label>
          <input
            id="access-code"
            name="accessCode"
            type="password"
            autocomplete="current-password"
            placeholder="Enter your access code"
            aria-describedby="${fieldDescriptionIds.join(" ")}"
            aria-invalid="${String(Boolean(errorMessage))}"
            required
          />

          <button class="primary-action" type="submit">Access customer portal</button>
        </form>
      </section>
    </section>
  `;
}

function buildDashboardMarkup({ model, noticeMessage }) {
  const requestCards = model.requests
    .map(
      (request) => `
        <article class="request-card">
          <p class="request-id">${escapeHtml(request.id)}</p>
          <h3>${escapeHtml(request.type)}</h3>
          <p class="request-submitted-date">
            <span>Submitted</span>
            <strong>${escapeHtml(formatSubmittedDate(request.submittedDate))}</strong>
          </p>
          <p class="request-status">
            <span>Status</span>
            <strong>${escapeHtml(request.status)}</strong>
          </p>
          <a class="request-detail-link" href="#/customer/requests/${encodeURIComponent(request.id)}">
            View request detail
          </a>
        </article>
      `,
    )
    .join("");
  const requestHistoryMarkup =
    requestCards ||
    `
      <p class="request-empty-state" role="status">
        No servicing requests have been submitted yet.
      </p>
    `;

  return `
    <section class="portal-layout portal-layout-dashboard" aria-labelledby="customer-dashboard-title">
      <header class="dashboard-hero">
        <div>
          <p class="eyebrow">Authenticated customer channel</p>
          <h1 id="customer-dashboard-title">Customer dashboard</h1>
          <p class="intro">
            Signed in as ${escapeHtml(model.customerName)}. Customer portal
            functions stay protected behind this customer-only session.
          </p>
        </div>
        <div class="session-chip" aria-label="Authenticated customer session">
          <span>Bank-approved session</span>
          <strong>Customer ${escapeHtml(model.customerNumber)}</strong>
        </div>
      </header>

      ${
        noticeMessage
          ? `<p class="banner banner-success" role="status">${escapeHtml(noticeMessage)}</p>`
          : ""
      }

      <div class="dashboard-grid">
        <section class="dashboard-card" aria-labelledby="profile-summary-title">
          <p class="section-label">Current profile on record</p>
          <h2 id="profile-summary-title">Protected customer profile summary</h2>
          <dl class="profile-list">
            <div>
              <dt>Residential address</dt>
              <dd>${escapeHtml(formatProfileValue(model.profile.residentialAddress))}</dd>
            </div>
            <div>
              <dt>Mobile number</dt>
              <dd>${escapeHtml(formatProfileValue(model.profile.mobileNumber))}</dd>
            </div>
            <div>
              <dt>Email address</dt>
              <dd>${escapeHtml(formatProfileValue(model.profile.emailAddress))}</dd>
            </div>
          </dl>
        </section>

        <section class="dashboard-card" aria-labelledby="request-history-title">
          <p class="section-label">Customer-visible request history</p>
          <h2 id="request-history-title">Recent servicing requests</h2>
          <div class="request-list">
            ${requestHistoryMarkup}
          </div>
        </section>
      </div>
    </section>
  `;
}

export function setupCustomerPortal(doc = document, win = window, options = {}) {
  const customerDirectory = options.customerDirectory || CUSTOMER_DIRECTORY;
  const root = doc.querySelector("[data-portal-root]");

  if (!root) {
    throw new Error("Customer portal root markup is incomplete.");
  }

  const storage = win.sessionStorage;
  const viewState = {
    customerNumber: "",
    errorMessage: "",
    noticeMessage: "",
  };
  let programmaticHash = null;

  const renderCurrentRoute = () => {
    const currentRoute = normalizeCustomerRoute(win.location.hash);
    const resolvedRoute = resolveCustomerRoute(currentRoute, storage);

    if (resolvedRoute.route !== currentRoute) {
      viewState.errorMessage = "";
      viewState.noticeMessage = resolvedRoute.notice || "";
      navigateTo(resolvedRoute.route);
      return;
    }

    if (resolvedRoute.route === CUSTOMER_ROUTES.dashboard) {
      const dashboardModel = getCustomerDashboardModel(storage, customerDirectory);
      doc.title = "Customer Dashboard | Service Request Portal";
      root.innerHTML = buildDashboardMarkup({
        model: dashboardModel,
        noticeMessage: viewState.noticeMessage,
      });
      viewState.noticeMessage = "";
      return;
    }

    doc.title = "Customer Login | Service Request Portal";
    root.innerHTML = buildLoginMarkup({
      customerNumber: viewState.customerNumber,
      errorMessage: viewState.errorMessage,
      noticeMessage: viewState.noticeMessage,
    });
    viewState.noticeMessage = "";
  };

  const navigateTo = (route) => {
    const targetHash = `#${route}`;

    if (win.location.hash === targetHash) {
      renderCurrentRoute();
      return;
    }

    programmaticHash = targetHash;
    win.location.hash = targetHash;
    renderCurrentRoute();
  };

  root.addEventListener("submit", (event) => {
    const form = event.target;

    if (!(form instanceof win.HTMLFormElement && form.matches("[data-customer-login-form]"))) {
      return;
    }

    event.preventDefault();

    const formData = new win.FormData(form);
    const customerNumber = String(formData.get("customerNumber") || "");
    const accessCode = String(formData.get("accessCode") || "");
    const authResult = authenticateCustomer(
      { customerNumber, accessCode },
      customerDirectory,
    );

    viewState.customerNumber = normalizeCustomerNumber(customerNumber);

    if (!authResult.ok) {
      viewState.errorMessage = authResult.message;
      viewState.noticeMessage = "";
      renderCurrentRoute();
      return;
    }

    viewState.errorMessage = "";
    viewState.noticeMessage = REDIRECT_MESSAGES.sessionEstablished;
    writeCustomerSession(storage, authResult.customer);
    navigateTo(CUSTOMER_ROUTES.dashboard);
  });

  win.addEventListener("hashchange", () => {
    if (programmaticHash && programmaticHash === win.location.hash) {
      programmaticHash = null;
      return;
    }

    renderCurrentRoute();
  });

  if (!win.location.hash) {
    win.location.hash = `#${CUSTOMER_ROUTES.login}`;
  }

  renderCurrentRoute();

  return {
    root,
    render: renderCurrentRoute,
    navigateTo,
    getCurrentRoute: () => normalizeCustomerRoute(win.location.hash),
    getSession: () => readCustomerSession(storage),
  };
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  setupCustomerPortal(document, window);
}
