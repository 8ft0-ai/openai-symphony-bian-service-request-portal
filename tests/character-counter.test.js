import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { JSDOM } from "jsdom";

import {
  countCharacters,
  countWords,
  setupCharacterCounter,
} from "../web/character-counter.js";

const pageMarkup = readFileSync(
  new URL("../web/character-counter.html", import.meta.url),
  "utf8",
);

function createFixture() {
  const dom = new JSDOM(pageMarkup, { url: "http://localhost/character-counter.html" });
  const { document, Event } = dom.window;
  const controls = setupCharacterCounter(document);

  return {
    ...controls,
    document,
    Event,
  };
}

function typeText(textarea, Event, value) {
  textarea.value = value;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

test("the page renders a labelled textarea with zeroed counters", () => {
  const { document, textarea, characterCount, wordCount } = createFixture();
  const label = document.querySelector('label[for="counter-text"]');
  const helper = document.querySelector("#counter-helper");
  const helperText = helper?.textContent.replace(/\s+/g, " ").trim();

  assert.ok(label);
  assert.equal(label.textContent.trim(), "Text to analyze");
  assert.ok(textarea);
  assert.equal(textarea.getAttribute("aria-describedby"), "counter-helper");
  assert.equal(textarea.getAttribute("rows"), "8");
  assert.ok(helper);
  assert.match(helperText, /Whitespace still counts as characters/);
  assert.equal(characterCount.textContent, "0");
  assert.equal(wordCount.textContent, "0");
});

test("typing simple text updates the character and word counts", () => {
  const { textarea, characterCount, wordCount, Event } = createFixture();

  typeText(textarea, Event, "Hello world");

  assert.equal(characterCount.textContent, "11");
  assert.equal(wordCount.textContent, "2");
});

test("clearing the textarea returns both counts to zero", () => {
  const { textarea, characterCount, wordCount, Event } = createFixture();

  typeText(textarea, Event, "Hello there");
  typeText(textarea, Event, "");

  assert.equal(characterCount.textContent, "0");
  assert.equal(wordCount.textContent, "0");
});

test("whitespace-only input counts characters but not words", () => {
  const { textarea, characterCount, wordCount, Event } = createFixture();
  const whitespaceOnlyValue = "   \n ";

  typeText(textarea, Event, whitespaceOnlyValue);

  assert.equal(characterCount.textContent, String(countCharacters(whitespaceOnlyValue)));
  assert.equal(wordCount.textContent, String(countWords(whitespaceOnlyValue)));
  assert.equal(wordCount.textContent, "0");
});

test("changing the text recalculates counts immediately", () => {
  const { textarea, characterCount, wordCount, Event } = createFixture();
  const updatedValue = "Hello there friend";

  typeText(textarea, Event, "Hello");
  typeText(textarea, Event, updatedValue);

  assert.equal(characterCount.textContent, String(countCharacters(updatedValue)));
  assert.equal(wordCount.textContent, "3");
});

test("deleting text reduces the character and word counts", () => {
  const { textarea, characterCount, wordCount, Event } = createFixture();

  typeText(textarea, Event, "One two three");
  typeText(textarea, Event, "One");

  assert.equal(characterCount.textContent, "3");
  assert.equal(wordCount.textContent, "1");
});
