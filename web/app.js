export function normalizeName(value) {
  return value.trim();
}

export function isNameValid(value) {
  return normalizeName(value).length > 0;
}

export function buildGreeting(name) {
  return `Hello, ${name}`;
}

function setHiddenState(element, isHidden) {
  element.hidden = isHidden;
}

export function setupGreetingForm(doc = document) {
  const form = doc.querySelector("[data-greeting-form]");
  const input = doc.querySelector("#name-input");
  const submitButton = doc.querySelector("#greet-button");
  const validationMessage = doc.querySelector("#validation-message");
  const greetingOutput = doc.querySelector("#greeting-output");

  if (!(form && input && submitButton && validationMessage && greetingOutput)) {
    throw new Error("Greeting form markup is incomplete.");
  }

  const syncButtonState = () => {
    submitButton.disabled = !isNameValid(input.value);
  };

  const clearValidation = () => {
    validationMessage.textContent =
      "Please enter your name before greeting yourself.";
    setHiddenState(validationMessage, true);
  };

  const showValidation = () => {
    validationMessage.textContent =
      "Please enter your name before greeting yourself.";
    setHiddenState(validationMessage, false);
  };

  const showGreeting = (message) => {
    greetingOutput.textContent = message;
    setHiddenState(greetingOutput, false);
  };

  const hideGreeting = () => {
    greetingOutput.textContent = "";
    setHiddenState(greetingOutput, true);
  };

  input.addEventListener("input", () => {
    if (isNameValid(input.value)) {
      clearValidation();
    } else {
      hideGreeting();
    }

    syncButtonState();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = normalizeName(input.value);

    if (!name) {
      hideGreeting();
      showValidation();
      syncButtonState();
      return;
    }

    clearValidation();
    showGreeting(buildGreeting(name));
    syncButtonState();
  });

  syncButtonState();

  return {
    form,
    input,
    submitButton,
    validationMessage,
    greetingOutput,
  };
}

if (typeof document !== "undefined") {
  setupGreetingForm(document);
}
