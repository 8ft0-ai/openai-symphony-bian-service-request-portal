## Summary
Create a simple web page where a user enters their name and the app displays a personalised greeting in the form `Hello, <name>`.

## Why
This provides a minimal end-to-end example of a user-facing web app with input handling, basic validation, and dynamic UI update behaviour.

It is useful as a starter ticket for validating project setup, frontend conventions, and delivery workflow.

## Context
This is a simple sample feature intended to demonstrate the ticket structure and serve as a low-risk implementation example.

The page should contain:
- a text input for the user’s name
- a button to submit or trigger the greeting
- an output area showing the personalised greeting

Example:
- user enters `Moshi`
- app displays `Hello, Moshi`

## In Scope
- create a simple web page with a name input field
- add a submit button or equivalent trigger
- display `Hello, <name>` after user interaction
- handle empty input with a simple validation message or disabled action
- apply basic readable layout and styling

## Out of Scope
- backend or database integration
- authentication or user accounts
- persistent storage of entered names
- multilingual support
- advanced styling or branding

## Requirements
- the page must include a text input labelled clearly for the user’s name
- the page must include a control to trigger the greeting
- when a valid name is entered, the app must display `Hello, <name>`
- empty or whitespace-only input must not produce a personalised greeting
- the interaction must happen on the page without a full page reload

## Acceptance Criteria
- [ ] A user can open the page and see a text input for their name
- [ ] A user can enter a name into the input field
- [ ] A user can trigger the greeting using the provided button or control
- [ ] When the user enters `Alice`, the page displays `Hello, Alice`
- [ ] Empty input is handled gracefully and does not display `Hello, `
- [ ] The greeting updates correctly if the user enters a different name and submits again

## Validation
### Automated
- [ ] Component or UI test confirms the input field renders
- [ ] Component or UI test confirms the button renders
- [ ] Component or UI test confirms entering a valid name displays the correct greeting
- [ ] Component or UI test confirms empty input does not display an invalid greeting

### Manual
- [ ] Open the page in a browser
- [ ] Enter a sample name and confirm the greeting appears correctly
- [ ] Submit an empty value and confirm validation behaviour is acceptable
- [ ] Change the name and confirm the greeting updates correctly

## Dependencies
- project frontend scaffold or starter app exists
- agreed frontend framework or plain HTML/JS approach is available

## Risks / Controls
- Risk: empty input may produce a poor user experience
  - Control: add simple validation or disable submit until input is valid

- Risk: unclear UI may make the sample less useful as a reference
  - Control: keep labels and layout simple and explicit

## Notes
- A plain HTML/CSS/JavaScript implementation is sufficient
- A simple React implementation is also acceptable if that matches the project standard
- Keep the implementation intentionally minimal so it remains a reference example