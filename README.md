# React Task Manager

A responsive task manager built with React, JavaScript, and CSS, connected to an Express REST API. This learning project started with localStorage and now uses the backend as the source of task data.

## Demo and deployment status

[Hosted frontend demo](https://danny-task-manager-react.netlify.app/)

The existing hosted demo may still run the earlier localStorage version until the API release is deployed. The current source needs the Express API running locally or hosted separately. This README does not confirm that the new backend has been deployed.

The API uses temporary server memory. Tasks survive a browser refresh while that server stays running, but reset after a server restart, redeploy, or a free hosting instance sleeping. All visitors to one API instance share its demo tasks. There is no database or account system.

## Features

- Fetch tasks from Express with GET
- Add a trimmed, nonempty title with POST, using the server-generated UUID
- Change completion with PATCH and delete with DELETE
- Switch between all and incomplete tasks and display the remaining count
- Show loading, saving, empty-list, and accessible error messages
- Retry a failed initial request
- Disable mutation controls while loading or saving to prevent duplicate submissions
- Cancel obsolete initial requests, including React StrictMode's development checks
- Validate API task data before placing it in state
- Preserve the current list and form input when a request fails
- Use a responsive layout, visible keyboard focus, and accessible control labels

## Built with

React, JavaScript, CSS, Vite, Vitest, React Testing Library, user-event, jest-dom, jsdom, and Oxlint. The separate backend uses Node.js and Express. The interface uses Roboto from Google Fonts.

## What I practiced

- Components, JSX, props, callbacks, and lifting state to a common parent
- Controlled forms, immutable array updates, filters, and derived counts
- Hooks for state and effects, with cleanup for requests
- Fetching JSON with async/await and HTTP methods/status codes
- Handling HTTP, network, parsing, and invalid-data errors
- Reading server responses instead of inventing IDs or guessing updated values
- Functional state updates after asynchronous requests
- Preventing duplicate writes while saving
- Mocking API requests in automated tests
- Local development with a Vite proxy and deployment with an API base URL

The original browser-storage patterns remain useful learning material, but localStorage no longer stores this version's tasks.

## Run locally

Use Node.js 24 (or a supported newer version) and npm. The expected local structure is:

```text
task-manager-projects/
  task-manager-api/
  task-manager-react/
```

In one terminal, start the API:

```bash
cd ../task-manager-api
npm install
npm run dev
```

In a second terminal, start this frontend:

```bash
npm install
npm run dev
```

Open the Vite URL, usually `http://localhost:5173/`. Leave both terminals running. Vite forwards `/tasks` requests to `http://localhost:3000`.

`http://localhost:5173/tasks` shows the raw API response, not the React interface. Use the root URL to see the app and its browser console.

## Project structure

```text
public/favicons/          Browser tab icons
src/
  components/
    TaskForm.jsx         Controlled input and submit button
    TaskItem.jsx         Checkbox, task text, and delete button
  api.js                 API URL, requests, timeouts, and response validation
  App.jsx                State, API actions, filters, and request feedback
  App.test.jsx           API interaction and error-handling tests
  index.css              Theme, responsive layout, and control styles
  main.jsx               React root and StrictMode
.env.example             Public API URL configuration example
index.html               HTML entry point and external fonts
netlify.toml             Frontend build and publish configuration
vite.config.js           Development proxy and test environment
```

## Tests and checks

```bash
npm test
npm test -- --run
npm run lint
npm run build
npm run preview
```

The React suite contains **32 tests** covering initial loading, malformed API data, retry, aborted requests, POST/PATCH/DELETE behavior, blank input, duplicate submission prevention, mutation failures, filters, empty states, and reading the server's data again after remounting.

Tests use mocked fetch responses in jsdom. They do not require a running API or prove the hosted service is reachable. They do not replace browser checks of layout, zoom, focus, and actual networking. The backend has its own request tests and README.

## Deploy the backend first

Run the Express service on a Node host such as Render using its own repository. The API directory includes a `render.yaml` blueprint, a health route, a configurable `PORT`, and `CORS_ORIGINS`.

On Render Free, a sleeping instance can take about a minute to wake. Client requests have a 90-second timeout to allow for this. Temporary tasks are lost when the instance restarts. This is a learning demo, not a production booking service.

## Deploy the frontend to Netlify

| Setting                    | Value                                            |
| -------------------------- | ------------------------------------------------ |
| Build command              | `npm run build`                                  |
| Publish directory          | `dist`                                           |
| Node version               | `24`                                             |
| Build environment variable | `VITE_API_URL` = the deployed API's HTTPS origin |

Set `VITE_API_URL` to the actual backend URL, without `/tasks`, for example `https://your-api-host.example`. It is a public URL, not a secret. Vite embeds `VITE_*` variables in the frontend bundle; never put an API token or password there.

Netlify builds intentionally fail if the API URL is missing, to avoid replacing the working frontend with a build that has no backend. Set the variable before publishing this version and rebuild after changing it.

The backend's `CORS_ORIGINS` must include `https://danny-task-manager-react.netlify.app`, plus any additional frontend origins you deliberately use. The Vite proxy only exists during local development; it does not run on Netlify. Browser CORS rules are not account authorization.

## Current limitations

- Shared, temporary in-memory data; no PostgreSQL or durable storage
- No accounts, authentication, private task lists, or authorization
- Tasks and example IDs reset when the API restarts
- Free-host cold starts can delay the first request
- The filter resets after a page refresh
- No title editing, due dates, or categories

## Author

Built by [Danny Evers](https://github.com/dannyevers83).

[Portfolio](https://dannyevers.xyz/)
