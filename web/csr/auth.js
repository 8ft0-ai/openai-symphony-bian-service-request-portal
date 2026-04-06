export const CSR_LOGIN_PATH = "/csr/login.html";
export const CSR_DASHBOARD_PATH = "/csr/dashboard.html";
export const CSR_SESSION_STORAGE_KEY = "service-request-portal.csr-session";

const CSR_DIRECTORY = Object.freeze([
  Object.freeze({
    name: "Mina Patel",
    password: "QueueReady!",
    role: "Customer Service Representative",
    staffId: "csr.queue.ops",
  }),
]);

export const DEMO_CSR_ACCOUNT = CSR_DIRECTORY[0];

export function normalizeStaffId(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function buildCsrSession(account) {
  return Object.freeze({
    name: account.name,
    role: "csr",
    staffId: account.staffId,
    title: account.role,
  });
}

export function authenticateCsr({ password, staffId } = {}) {
  const normalizedStaffId = normalizeStaffId(staffId);
  const submittedPassword = String(password ?? "");
  const account = CSR_DIRECTORY.find(
    (candidate) =>
      normalizeStaffId(candidate.staffId) === normalizedStaffId &&
      candidate.password === submittedPassword,
  );

  return account ? buildCsrSession(account) : null;
}

export function getCsrSession(storage) {
  if (!storage) {
    return null;
  }

  const rawSession = storage.getItem(CSR_SESSION_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSession);

    if (
      parsed?.role !== "csr" ||
      typeof parsed.name !== "string" ||
      typeof parsed.staffId !== "string" ||
      typeof parsed.title !== "string"
    ) {
      storage.removeItem(CSR_SESSION_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    storage.removeItem(CSR_SESSION_STORAGE_KEY);
    return null;
  }
}

export function saveCsrSession(storage, session) {
  storage.setItem(CSR_SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function clearCsrSession(storage) {
  storage.removeItem(CSR_SESSION_STORAGE_KEY);
}

export function sanitizeCsrNextPath(nextPath) {
  if (typeof nextPath !== "string" || !nextPath.startsWith("/csr/")) {
    return CSR_DASHBOARD_PATH;
  }

  return nextPath === CSR_LOGIN_PATH ? CSR_DASHBOARD_PATH : nextPath;
}

export function buildCsrLoginUrl({ next, reason, signedOut } = {}) {
  const params = new URLSearchParams();

  if (reason) {
    params.set("reason", reason);
  }

  if (signedOut) {
    params.set("signedOut", signedOut);
  }

  if (next) {
    params.set("next", sanitizeCsrNextPath(next));
  }

  const query = params.toString();
  return query ? `${CSR_LOGIN_PATH}?${query}` : CSR_LOGIN_PATH;
}

export function resolveCsrDestination(search = "") {
  const params = new URLSearchParams(search);
  return sanitizeCsrNextPath(params.get("next"));
}
