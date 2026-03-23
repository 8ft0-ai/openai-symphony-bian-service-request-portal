import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { JSDOM } from "jsdom";

import { setupGreetingForm } from "../web/app.js";

const pageMarkup = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");

function createFixture() {
  const dom = new JSDOM(pageMarkup, { url: "http://localhost/" });
  const { document, Event } = dom.window;
  const controls = setupGreetingForm(document);

  return {
    ...controls,
    document,
    Event,
  };
}

function submitForm(form, Event) {
  const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
  form.dispatchEvent(submitEvent);
  return submitEvent;
}

function typeName(input, Event, value) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

test("the page renders a labelled name input and greeting trigger control", () => {
  const { document, submitButton } = createFixture();
  const label = document.querySelector('label[for="name-input"]');
  const input = document.querySelector("#name-input");

  assert.ok(label);
  assert.equal(label.textContent.trim(), "Your name");
  assert.ok(input);
  assert.equal(input.getAttribute("type"), "text");
  assert.equal(input.getAttribute("aria-describedby"), "validation-message");
  assert.equal(input.getAttribute("aria-invalid"), "false");
  assert.equal(input.required, true);
  assert.ok(submitButton);
  assert.equal(submitButton.textContent.trim(), "Show greeting");
  assert.equal(submitButton.disabled, true);
});

test("submitting a valid name displays the personalised greeting", () => {
  const { form, input, greetingOutput, validationMessage, Event } = createFixture();

  typeName(input, Event, "Alice");
  const submitEvent = submitForm(form, Event);

  assert.equal(greetingOutput.textContent, "Hello, Alice");
  assert.equal(greetingOutput.hidden, false);
  assert.equal(validationMessage.hidden, true);
  assert.equal(input.getAttribute("aria-invalid"), "false");
  assert.equal(submitEvent.defaultPrevented, true);
});

test("submitting an empty name shows validation and no personalised greeting", () => {
  const { form, input, submitButton, greetingOutput, validationMessage, Event } =
    createFixture();

  typeName(input, Event, "");
  submitForm(form, Event);

  assert.equal(submitButton.disabled, true);
  assert.equal(greetingOutput.hidden, true);
  assert.equal(greetingOutput.textContent, "");
  assert.equal(validationMessage.hidden, false);
  assert.match(validationMessage.textContent, /Please enter your name/);
  assert.equal(input.getAttribute("aria-invalid"), "true");
  assert.notEqual(greetingOutput.textContent, "Hello, ");
});

test("submitting whitespace-only input shows validation and no personalised greeting", () => {
  const { form, input, submitButton, greetingOutput, validationMessage, Event } = createFixture();

  typeName(input, Event, "   ");
  submitForm(form, Event);

  assert.equal(submitButton.disabled, true);
  assert.equal(greetingOutput.hidden, true);
  assert.equal(greetingOutput.textContent, "");
  assert.equal(validationMessage.hidden, false);
  assert.match(validationMessage.textContent, /Please enter your name/);
  assert.equal(input.getAttribute("aria-invalid"), "true");
  assert.notEqual(greetingOutput.textContent, "Hello, ");
});

test("submitting a new valid name replaces the previous greeting", () => {
  const { form, input, greetingOutput, validationMessage, Event } = createFixture();

  typeName(input, Event, "Alice");
  submitForm(form, Event);
  assert.equal(greetingOutput.textContent, "Hello, Alice");

  typeName(input, Event, "Moshi");
  submitForm(form, Event);

  assert.equal(greetingOutput.textContent, "Hello, Moshi");
  assert.equal(greetingOutput.hidden, false);
  assert.equal(validationMessage.hidden, true);
  assert.equal(input.getAttribute("aria-invalid"), "false");
});
