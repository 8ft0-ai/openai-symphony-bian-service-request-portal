import {
  authenticateCsr,
  buildCsrLoginUrl,
  CSR_DASHBOARD_PATH,
  getCsrSession,
  resolveCsrDestination,
  saveCsrSession,
} from "./auth.js";

function setTone(feedback, tone, message) {
  feedback.dataset.tone = tone;
  feedback.textContent = message;
  feedback.hidden = false;
}

function clearFeedback(feedback) {
  feedback.hidden = true;
  feedback.textContent = "";
  delete feedback.dataset.tone;
}

function setFieldValidity(fields, isInvalid) {
  const value = String(isInvalid);

  fields.forEach((field) => {
    field.setAttribute("aria-invalid", value);
  });
}

function isSubmissionReady(staffId, password) {
  return staffId.trim().length > 0 && password.length > 0;
}

export function setupCsrLoginPage(doc = document, options = {}) {
  const view = doc.defaultView;
  const storage = options.storage ?? view?.sessionStorage ?? null;
  const location = options.location ?? view?.location ?? { search: "" };
  const navigateTo =
    options.navigateTo ?? ((target) => view.location.assign(target));

  const form = doc.querySelector("[data-csr-login-form]");
  const staffIdInput = doc.querySelector("#staff-id");
  const passwordInput = doc.querySelector("#staff-password");
  const submitButton = doc.querySelector("#staff-login-button");
  const feedback = doc.querySelector("#login-feedback");

  if (!(form && staffIdInput && passwordInput && submitButton && feedback)) {
    throw new Error("CSR login markup is incomplete.");
  }

  if (getCsrSession(storage)) {
    navigateTo(CSR_DASHBOARD_PATH);
  }

  const syncButtonState = () => {
    submitButton.disabled = !isSubmissionReady(staffIdInput.value, passwordInput.value);
  };

  const clearInvalidState = () => {
    setFieldValidity([staffIdInput, passwordInput], false);
  };

  const showAccessMessage = () => {
    const params = new URLSearchParams(location.search ?? "");

    if (params.get("signedOut") === "1") {
      setTone(feedback, "info", "CSR session ended. Sign in again to return to the dashboard.");
      return;
    }

    if (params.get("reason") === "auth-required") {
      setTone(
        feedback,
        "info",
        "Sign in as CSR staff to access the protected servicing dashboard.",
      );
      return;
    }

    clearFeedback(feedback);
  };

  const resetFormState = () => {
    clearInvalidState();
    showAccessMessage();
    syncButtonState();
  };

  [staffIdInput, passwordInput].forEach((field) => {
    field.addEventListener("input", resetFormState);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const csrSession = authenticateCsr({
      password: passwordInput.value,
      staffId: staffIdInput.value,
    });

    if (!csrSession) {
      setFieldValidity([staffIdInput, passwordInput], true);
      setTone(
        feedback,
        "error",
        "The staff ID or password is incorrect. Use the demo CSR credentials to continue.",
      );
      passwordInput.value = "";
      syncButtonState();
      return;
    }

    clearInvalidState();
    clearFeedback(feedback);
    saveCsrSession(storage, csrSession);
    navigateTo(resolveCsrDestination(location.search ?? ""));
  });

  showAccessMessage();
  syncButtonState();

  return {
    feedback,
    form,
    passwordInput,
    staffIdInput,
    submitButton,
  };
}

if (typeof document !== "undefined") {
  setupCsrLoginPage(document);
}
