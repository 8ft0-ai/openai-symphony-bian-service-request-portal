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

test("the page renders a labelled name input", () => {
  const { document } = createFixture();
  const label = document.querySelector('label[for="name-input"]');
  const input = document.querySelector("#name-input");

  assert.ok(label);
  assert.equal(label.textContent.trim(), "Your name");
  assert.ok(input);
  assert.equal(input.getAttribute("type"), "text");
});

test("the page renders the greeting button", () => {
  const { submitButton } = createFixture();

  assert.ok(submitButton);
  assert.equal(submitButton.textContent.trim(), "Show greeting");
});

test("submitting a valid name displays the personalised greeting", () => {
  const { form, input, greetingOutput, validationMessage, Event } = createFixture();

  input.value = "Alice";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  assert.equal(greetingOutput.textContent, "Hello, Alice");
  assert.equal(greetingOutput.hidden, false);
  assert.equal(validationMessage.hidden, true);
});

test("empty input never produces an invalid greeting", () => {
  const { form, input, submitButton, greetingOutput, validationMessage, Event } = createFixture();

  assert.equal(submitButton.disabled, true);

  input.value = "";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  assert.equal(submitButton.disabled, true);
  assert.equal(greetingOutput.hidden, true);
  assert.equal(greetingOutput.textContent, "");
  assert.equal(validationMessage.hidden, false);
  assert.match(validationMessage.textContent, /Please enter your name/);
  assert.notEqual(greetingOutput.textContent, "Hello, ");
});

test("whitespace-only input never produces an invalid greeting", () => {
  const { form, input, submitButton, greetingOutput, validationMessage, Event } = createFixture();

  input.value = "   ";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  assert.equal(submitButton.disabled, true);
  assert.equal(greetingOutput.hidden, true);
  assert.equal(greetingOutput.textContent, "");
  assert.equal(validationMessage.hidden, false);
  assert.match(validationMessage.textContent, /Please enter your name/);
  assert.notEqual(greetingOutput.textContent, "Hello, ");
});

test("submitting a different valid name replaces the previous greeting", () => {
  const { form, input, greetingOutput, validationMessage, Event } = createFixture();

  input.value = "Alice";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  input.value = "Moshi";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  assert.equal(greetingOutput.textContent, "Hello, Moshi");
  assert.equal(greetingOutput.hidden, false);
  assert.equal(validationMessage.hidden, true);
});
