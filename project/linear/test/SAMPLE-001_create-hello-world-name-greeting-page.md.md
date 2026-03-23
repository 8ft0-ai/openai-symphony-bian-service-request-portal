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

## BDD Scenarios
### Feature
Display a personalised greeting after a user enters their name.

### Scenario: Show greeting for a valid name
Given the greeting page is open
And the name input is empty
When the user enters `Alice`
And the user triggers the greeting
Then the page displays `Hello, Alice`

### Scenario: Prevent empty greeting submission
Given the greeting page is open
When the user leaves the name input empty
And the user triggers the greeting
Then the page does not display `Hello, `
And the user sees a validation message or the action remains disabled

### Scenario: Prevent whitespace-only greeting submission
Given the greeting page is open
When the user enters only whitespace
And the user triggers the greeting
Then the page does not display a personalised greeting
And the user sees a validation message or the action remains disabled

### Scenario: Update the greeting when a new name is submitted
Given the greeting page is open
And the page currently displays `Hello, Alice`
When the user changes the input to `Moshi`
And the user triggers the greeting
Then the page displays `Hello, Moshi`
And the previous greeting is replaced

## Acceptance Criteria
- [ ] The page provides a clearly labelled name input and a control to trigger the greeting
- [ ] A valid submitted name produces a personalised greeting on the page without a full page reload
- [ ] Empty input is blocked from producing an invalid greeting
- [ ] Whitespace-only input is blocked from producing a personalised greeting
- [ ] Submitting a different valid name replaces the previous greeting

## Validation
### Automated
- [ ] Component or UI test confirms the page renders a labelled name input and greeting trigger control
- [ ] Component or UI test confirms Scenario: Show greeting for a valid name
- [ ] Component or UI test confirms Scenario: Prevent empty greeting submission
- [ ] Component or UI test confirms Scenario: Prevent whitespace-only greeting submission
- [ ] Component or UI test confirms Scenario: Update the greeting when a new name is submitted

### Manual
- [ ] Open the page in a browser
- [ ] Enter a sample name and confirm the greeting appears correctly
- [ ] Submit an empty value and confirm validation behaviour is acceptable
- [ ] Submit a whitespace-only value and confirm validation behaviour is acceptable
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
