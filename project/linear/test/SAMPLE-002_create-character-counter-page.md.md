## Summary
Create a simple web page with a textarea that shows live character and word counts as the user types.

## Why
This provides a minimal end-to-end example of reactive UI behaviour, derived state, and basic text input handling without requiring backend integration.

It is useful as a parallel sample ticket because it can be delivered on its own route or page using isolated local state only.

## Context
This is a simple sample feature intended to demonstrate the ticket structure and serve as a low-risk implementation example that does not conflict with other sample pages.

The page should contain:
- a clearly labelled textarea for entering text
- a live character count
- a live word count
- a small helper message explaining how counts behave

Example:
- user enters `Hello world`
- app displays `11 characters`
- app displays `2 words`

## In Scope
- create a simple web page with a labelled textarea
- display a live character count as the user types
- display a live word count as the user types
- update counts without a full page reload
- handle empty input gracefully
- apply basic readable layout and styling
- present the page as a focused text utility card with clear visual hierarchy

## Out of Scope
- backend or database integration
- saving or restoring entered text
- authentication or user accounts
- advanced text analysis such as reading time or grammar checks
- file uploads or rich text editing

## Requirements
- the page must include a clearly labelled multiline text input
- the page must display the current character count
- the page must display the current word count
- counts must update immediately as the input changes
- empty input must display zero characters and zero words
- whitespace-only input must count characters normally but must not count as words
- the interaction must happen on the page without a full page reload
- the feature should be implemented on its own page or route so it remains non-conflicting with other sample tasks
- the page should use a distinct card-style layout so the sample demonstrates intentional UI design, not just default browser styling

## BDD Scenarios
### Feature
Display live character and word counts while a user types into a textarea.

### Scenario: Show counts for simple text
Given the character counter page is open
And the textarea is empty
When the user enters `Hello world`
Then the page displays `11` characters
And the page displays `2` words

### Scenario: Show zero counts for empty input
Given the character counter page is open
When the textarea is empty
Then the page displays `0` characters
And the page displays `0` words

### Scenario: Do not count whitespace-only input as words
Given the character counter page is open
When the user enters only whitespace
Then the page displays the matching character count
And the page displays `0` words

### Scenario: Update counts as text changes
Given the character counter page is open
And the textarea currently contains `Hello`
When the user changes the text to `Hello there friend`
Then the page updates the character count to match the new text
And the page updates the word count to `3`

### Scenario: Reduce counts when text is deleted
Given the character counter page is open
And the textarea currently contains `One two three`
When the user deletes text until only `One` remains
Then the page displays the updated character count
And the page displays `1` word

## Acceptance Criteria
- [ ] The page provides a clearly labelled textarea for text entry
- [ ] The page displays both character count and word count
- [ ] Character and word counts update live as the textarea value changes
- [ ] Empty input displays zero characters and zero words
- [ ] Whitespace-only input does not produce a non-zero word count
- [ ] The feature exists on its own route or page and does not require changes to shared business logic
- [ ] The page uses a focused utility card presentation with clear visual hierarchy for the heading, textarea, helper text, and count outputs

## Validation
### Automated
- [ ] Component or UI test confirms the page renders a labelled textarea
- [ ] Component or UI test confirms Scenario: Show counts for simple text
- [ ] Component or UI test confirms Scenario: Show zero counts for empty input
- [ ] Component or UI test confirms Scenario: Do not count whitespace-only input as words
- [ ] Component or UI test confirms Scenario: Update counts as text changes
- [ ] Component or UI test confirms Scenario: Reduce counts when text is deleted

### Manual
- [ ] Open the page in a browser
- [ ] Type sample text and confirm character and word counts update immediately
- [ ] Clear the textarea and confirm both counts return to zero
- [ ] Enter whitespace-only text and confirm the word count remains zero
- [ ] Delete part of the text and confirm both counts decrease correctly
- [ ] Confirm the page looks intentionally designed rather than relying on unstyled browser defaults

## Dependencies
- project frontend scaffold or starter app exists
- agreed frontend framework or plain HTML/JS approach is available

## Risks / Controls
- Risk: word count behaviour may be inconsistent around whitespace handling
  - Control: define word counting explicitly so whitespace-only input returns zero words

- Risk: the sample may accidentally expand into a shared text utility instead of staying isolated
  - Control: keep the implementation page-scoped and local-state driven

## Notes
- A plain HTML/CSS/JavaScript implementation is sufficient
- A simple React implementation is also acceptable if that matches the project standard
- Keep the implementation intentionally minimal so it remains a reference example
- Keep routing and state isolated so this sample can be implemented in parallel with other sample tickets
