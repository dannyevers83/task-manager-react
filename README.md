# React Task Manager

A responsive task manager built with React, JavaScript, and CSS.
Built as my first React learning project, this app lets users manage everyday tasks while I practice components, props, state, and effects. Tasks are saved in localStorage and remain available after refreshing the page in the same browser.

## Live demo

[View the React Task Manager](https://danny-task-manager-react.netlify.app/)

## Features

- Add tasks using the Add Task button or Enter
- Reject empty titles and remove spaces around task titles
- Mark tasks as completed or incomplete
- Delete individual tasks
- Switch between all tasks and incomplete tasks
- Display the number of remaining tasks and a message when no tasks are visible
- Save and restore tasks using localStorage
- Fall back to example tasks when saved data is invalid
- Use the app on narrow screens and navigate with the keyboard

## Accessibility

- A visible label is connected to the task input
- Checkboxes have accessible names based on their task titles
- Each Delete button identifies its task through an accessible label
- Filter buttons expose their selected state with `aria-pressed`
- Inputs, checkboxes, and buttons have visible keyboard focus styles
- Completed tasks have a written status as well as a strikethrough

## Built with

- React
- JavaScript
- CSS
- Vite
- Vitest and React Testing Library
- Testing Library user-event and jest-dom
- jsdom
- Oxlint

The interface uses custom CSS, CSS variables, Flexbox, and the Roboto typeface from Google Fonts.

## What I learned

- Split a user interface into reusable React components
- Pass values and callback functions from a parent component through props
- Manage tasks, form input, and filters with `useState`
- Keep the input value connected to React state
- Handle form submission and prevent the default page reload
- Update arrays without changing the existing state directly
- Use `map`, `filter`, and `every` to display, update, and validate tasks
- Calculate visible tasks and the remaining count from existing state
- Use conditional rendering for empty messages and completion styles
- Read stored data with a lazy state initializer and save changes with `useEffect`
- Convert data with `JSON.stringify` and `JSON.parse`, and handle storage errors
- Use automated tests to check interactions and storage behavior

## Project structure

```text
public/
  favicons/              Tab icons
src/
  components/
    TaskForm.jsx         Task input and submission form
    TaskItem.jsx         One task, its checkbox, status, and Delete button
  App.jsx                Task state, actions, filtering, and storage
  App.test.jsx           Automated interaction and storage tests
  index.css              Theme, layout, controls, and task styles
  main.jsx               React entry point
index.html               HTML entry point and font/favicon links
vite.config.js           Vite and Vitest configuration
```

`App` owns the state and passes values and callbacks to `TaskForm` and `TaskItem`. The child components display their controls and call those callbacks when the user interacts with them.

## Getting started

Install Node.js and npm, then run the following commands from the project folder:

```bash
npm install
npm run dev
```

Open the local URL shown in your terminal.

## Testing

The test suite contains 24 tests using Vitest, React Testing Library, and user-event. Tests run in jsdom, which simulates a browser's DOM in Node.js.

The tests cover:

- Displaying the page heading
- Adding tasks with the button and Enter, trimming titles, and clearing the input
- Rejecting empty or whitespace-only titles
- Toggling completion and updating task status and the remaining count
- Deleting the selected task, including tasks with identical titles
- Switching filters and updating their accessible pressed state
- Showing the empty-list message
- Saving and restoring additions, completions, deletions, and an empty list
- Falling back to example tasks for malformed JSON or invalid task data
- Keeping the app usable when reading or writing storage fails

Run the tests in watch mode, which reruns them when files change:

```bash
npm test
```

To run the tests once:

```bash
npm test -- --run
```

The tests check behavior in a simulated DOM. Responsive layout, appearance, and browser keyboard interactions are also checked manually.

## Code checks

Check the code with Oxlint:

```bash
npm run lint
```

## Production build

Build the app:

```bash
npm run build
```

Vite writes the production files to `dist`. This directory is generated and should not be edited manually.

Preview the production build locally:

```bash
npm run preview
```

## Deployment

The live app is hosted on Netlify. To deploy this Vite project, use:

| Setting           | Value           |
| ----------------- | --------------- |
| Build command     | `npm run build` |
| Publish directory | `dist`          |

## Current limitations

- Tasks are stored in the current browser for this website, rather than in a database
- There are no user accounts or synchronization between devices or browsers
- Clearing the website's browser storage removes the saved tasks
- If storage is unavailable or full, tasks remain usable in memory but new changes may be lost after refreshing
- The active filter is reset when the page is refreshed
- Task editing, due dates, and categories are not included in this version

## Author

Built by [Danny Evers](https://github.com/dannyevers83).

[Portfolio](https://dannyevers.xyz/)
