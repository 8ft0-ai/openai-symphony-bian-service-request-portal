export function countCharacters(value) {
  return value.length;
}

export function countWords(value) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 0;
  }

  return trimmedValue.split(/\s+/).length;
}

export function setupCharacterCounter(doc = document) {
  const textarea = doc.querySelector("[data-counter-input]");
  const characterCount = doc.querySelector("[data-character-count]");
  const wordCount = doc.querySelector("[data-word-count]");

  if (!(textarea && characterCount && wordCount)) {
    throw new Error("Character counter markup is incomplete.");
  }

  const updateCounts = () => {
    characterCount.textContent = String(countCharacters(textarea.value));
    wordCount.textContent = String(countWords(textarea.value));
  };

  textarea.addEventListener("input", updateCounts);
  updateCounts();

  return {
    textarea,
    characterCount,
    wordCount,
  };
}

if (typeof document !== "undefined") {
  setupCharacterCounter(document);
}
