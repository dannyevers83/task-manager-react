import { StrictMode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import App from './App';

/* ========================================
   Test API — each test gets its own in-memory server data
   ======================================== */

const exampleTasks = [
  { id: 'read-js', title: 'Practice JavaScript', completed: false },
  { id: 'learn-react', title: 'Learn React', completed: true },
  { id: 'build-api', title: 'Build my first API', completed: false },
];
let serverTasks;
let fetchMock;
let nextId;

function reply(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn(async () => structuredClone(body)),
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  serverTasks = structuredClone(exampleTasks);
  nextId = 1;
  localStorage.clear();
  fetchMock = vi.fn(async (url, options = {}) => {
    const method = options.method || 'GET';
    const id = decodeURIComponent(url.split('/').at(-1));
    if (method === 'GET') return reply(200, serverTasks);
    if (method === 'POST') {
      const { title } = JSON.parse(options.body);
      const task = { id: `new-${nextId++}`, title, completed: false };
      serverTasks.push(task);
      return reply(201, task);
    }
    const index = serverTasks.findIndex((task) => task.id === id);
    if (index === -1) return reply(404, { error: 'Task not found' });
    if (method === 'PATCH') {
      serverTasks[index].completed = JSON.parse(options.body).completed;
      return reply(200, serverTasks[index]);
    }
    if (method === 'DELETE') {
      serverTasks.splice(index, 1);
      return reply(204);
    }
    throw new Error('Unexpected test request');
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

async function renderLoaded() {
  const view = render(<App />);
  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: 'New Task' })).toBeEnabled(),
  );
  return view;
}

function requests(method) {
  return fetchMock.mock.calls.filter(
    ([, options]) => (options?.method || 'GET') === method,
  );
}

/* ========================================
   Loading, validation and request failures
   ======================================== */

test('loads API tasks and shows the heading and remaining count', async () => {
  await renderLoaded();
  expect(
    screen.getByRole('heading', { name: 'Task Manager', level: 1 }),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(
    '/tasks',
    expect.objectContaining({ signal: expect.anything() }),
  );
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(screen.getByText('Tasks remaining: 2')).toBeInTheDocument();
  expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
});

test('shows loading feedback and disables mutations until the request completes', async () => {
  const pending = deferred();
  fetchMock.mockReturnValueOnce(pending.promise);
  render(<App />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading tasks...');
  expect(screen.getByRole('button', { name: 'Add Task' })).toBeDisabled();
  expect(screen.queryByText('No tasks to show')).not.toBeInTheDocument();
  expect(screen.queryByText(/Tasks remaining:/)).not.toBeInTheDocument();
  await act(async () => pending.resolve(reply(200, exampleTasks)));
  expect(
    await screen.findByRole('checkbox', { name: 'Practice JavaScript' }),
  ).toBeInTheDocument();
});

test.each(['HTTP', 'network', 'JSON'])(
  'shows an accessible loading error after a %s failure',
  async (kind) => {
    if (kind === 'HTTP') fetchMock.mockResolvedValueOnce(reply(503, {}));
    if (kind === 'network')
      fetchMock.mockRejectedValueOnce(new TypeError('Offline'));
    if (kind === 'JSON')
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load tasks.',
    );
    expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
    expect(screen.queryByText('No tasks to show')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Task' })).toBeDisabled();
  },
);

test.each([
  null,
  {},
  [null],
  [{ id: 'bad', title: 1, completed: false }],
  [{ id: 'bad', title: 'Invalid', completed: 'false' }],
  [exampleTasks[0], exampleTasks[0]],
])('rejects malformed API task data: %j', async (data) => {
  fetchMock.mockResolvedValueOnce(reply(200, data));
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not load tasks.',
  );
  expect(screen.queryAllByRole('listitem')).toHaveLength(0);
});

test('retries a failed initial request and clears the error', async () => {
  fetchMock.mockRejectedValueOnce(new Error('Offline'));
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('alert');
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(
    await screen.findByRole('checkbox', { name: 'Practice JavaScript' }),
  ).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('ignores an aborted StrictMode request that resolves after the newer request', async () => {
  const old = deferred();
  fetchMock.mockReturnValueOnce(old.promise);
  render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  await screen.findByRole('checkbox', { name: 'Practice JavaScript' });
  await act(async () =>
    old.resolve(
      reply(200, [{ id: 'obsolete', title: 'Stale data', completed: false }]),
    ),
  );
  expect(
    screen.queryByRole('checkbox', { name: 'Stale data' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('checkbox', { name: 'Practice JavaScript' }),
  ).toBeInTheDocument();
});

/* ========================================
   Creating tasks and preventing duplicate submissions
   ======================================== */

test('posts a trimmed title, uses the server ID, and clears the input', async () => {
  const user = userEvent.setup();
  await renderLoaded();
  await user.type(screen.getByRole('textbox'), '  Practice React hooks  ');
  await user.click(screen.getByRole('button', { name: 'Add Task' }));
  expect(
    await screen.findByRole('checkbox', { name: 'Practice React hooks' }),
  ).toBeInTheDocument();
  const [url, options] = requests('POST')[0];
  expect(url).toBe('/tasks');
  expect(options.headers['Content-Type']).toBe('application/json');
  expect(JSON.parse(options.body)).toEqual({ title: 'Practice React hooks' });
  expect(serverTasks.at(-1).id).toBe('new-1');
  expect(screen.getByRole('textbox')).toHaveValue('');
  expect(screen.getByText('Tasks remaining: 3')).toBeInTheDocument();
});

test('adds a task with Enter', async () => {
  const user = userEvent.setup();
  await renderLoaded();
  await user.type(screen.getByRole('textbox'), 'Use the API{Enter}');
  expect(
    await screen.findByRole('checkbox', { name: 'Use the API' }),
  ).toBeInTheDocument();
  expect(requests('POST')).toHaveLength(1);
});

test.each(['', '   '])('does not post an empty title: %j', async (title) => {
  const user = userEvent.setup();
  await renderLoaded();
  if (title) await user.type(screen.getByRole('textbox'), title);
  await user.click(screen.getByRole('button', { name: 'Add Task' }));
  expect(requests('POST')).toHaveLength(0);
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});

test('prevents duplicate submissions while a save is pending', async () => {
  const user = userEvent.setup();
  await renderLoaded();
  const input = screen.getByRole('textbox');
  await user.type(input, 'Only once');
  const pending = deferred();
  fetchMock.mockReturnValueOnce(pending.promise);
  fireEvent.submit(input.closest('form'));
  fireEvent.submit(input.closest('form'));
  expect(requests('POST')).toHaveLength(1);
  expect(screen.getByRole('status')).toHaveTextContent('Saving changes...');
  expect(input).toBeDisabled();
  await act(async () =>
    pending.resolve(
      reply(201, { id: 'once', title: 'Only once', completed: false }),
    ),
  );
  expect(
    screen.getByRole('checkbox', { name: 'Only once' }),
  ).toBeInTheDocument();
});

test.each(['HTTP', 'network', 'invalid response'])(
  'preserves input and existing tasks when adding fails: %s',
  async (kind) => {
    const user = userEvent.setup();
    await renderLoaded();
    await user.type(screen.getByRole('textbox'), 'Keep my input');
    if (kind === 'HTTP') fetchMock.mockResolvedValueOnce(reply(400, {}));
    if (kind === 'network')
      fetchMock.mockRejectedValueOnce(new Error('Offline'));
    if (kind === 'invalid response')
      fetchMock.mockResolvedValueOnce(reply(201, { error: 'Not a task' }));
    await user.click(screen.getByRole('button', { name: 'Add Task' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not add task.',
    );
    expect(screen.getByRole('textbox')).toHaveValue('Keep my input');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Add Task' })).toBeEnabled();
  },
);

/* ========================================
   Updating, deleting, filtering and remounting
   ======================================== */

test('patches completion in both directions and updates the count', async () => {
  const user = userEvent.setup();
  await renderLoaded();
  await user.click(screen.getByRole('button', { name: 'Show all tasks' }));
  const checkbox = screen.getByRole('checkbox', {
    name: 'Practice JavaScript',
  });
  await user.click(checkbox);
  await waitFor(() => expect(checkbox).toBeChecked());
  expect(requests('PATCH')[0][0]).toBe('/tasks/read-js');
  expect(JSON.parse(requests('PATCH')[0][1].body)).toEqual({ completed: true });
  expect(screen.getByText('Tasks remaining: 1')).toBeInTheDocument();
  await waitFor(() => expect(checkbox).toBeEnabled());
  await user.click(checkbox);
  await waitFor(() => expect(checkbox).not.toBeChecked());
  expect(screen.getByText('Tasks remaining: 2')).toBeInTheDocument();
});

test('uses the task returned by PATCH rather than guessing the new state', async () => {
  const user = userEvent.setup();
  await renderLoaded();
  await user.click(screen.getByRole('button', { name: 'Show all tasks' }));
  fetchMock.mockResolvedValueOnce(
    reply(200, { id: 'read-js', title: 'Server title', completed: true }),
  );
  await user.click(
    screen.getByRole('checkbox', { name: 'Practice JavaScript' }),
  );
  expect(
    await screen.findByRole('checkbox', { name: 'Server title' }),
  ).toBeChecked();
});

test.each(['HTTP', 'network'])(
  'keeps the original status when PATCH fails: %s',
  async (kind) => {
    const user = userEvent.setup();
    await renderLoaded();
    if (kind === 'HTTP') fetchMock.mockResolvedValueOnce(reply(404, {}));
    else fetchMock.mockRejectedValueOnce(new Error('Offline'));
    await user.click(
      screen.getByRole('checkbox', { name: 'Practice JavaScript' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not update task.',
    );
    expect(
      screen.getByRole('checkbox', { name: 'Practice JavaScript' }),
    ).not.toBeChecked();
    expect(screen.getByText('Tasks remaining: 2')).toBeInTheDocument();
  },
);

test('deletes a task after a successful empty 204 response', async () => {
  const user = userEvent.setup();
  await renderLoaded();
  const response = reply(204);
  fetchMock.mockResolvedValueOnce(response);
  await user.click(
    screen.getByRole('button', { name: 'Delete task: Practice JavaScript' }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole('checkbox', { name: 'Practice JavaScript' }),
    ).not.toBeInTheDocument(),
  );
  expect(requests('DELETE')[0][0]).toBe('/tasks/read-js');
  expect(response.json).not.toHaveBeenCalled();
  expect(screen.getByText('Tasks remaining: 1')).toBeInTheDocument();
});

test.each(['HTTP', 'network'])(
  'keeps a task visible when DELETE fails: %s',
  async (kind) => {
    const user = userEvent.setup();
    await renderLoaded();
    if (kind === 'HTTP') fetchMock.mockResolvedValueOnce(reply(500, {}));
    else fetchMock.mockRejectedValueOnce(new Error('Offline'));
    await user.click(
      screen.getByRole('button', { name: 'Delete task: Practice JavaScript' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not delete task.',
    );
    expect(
      screen.getByRole('checkbox', { name: 'Practice JavaScript' }),
    ).toBeInTheDocument();
  },
);

test('switches filters and marks the active filter', async () => {
  const user = userEvent.setup();
  await renderLoaded();
  const all = screen.getByRole('button', { name: 'Show all tasks' });
  const incomplete = screen.getByRole('button', {
    name: 'Show incomplete tasks',
  });
  expect(incomplete).toHaveAttribute('aria-pressed', 'true');
  await user.click(all);
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(all).toHaveAttribute('aria-pressed', 'true');
  expect(incomplete).toHaveAttribute('aria-pressed', 'false');
  await user.click(incomplete);
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});

test('shows the empty message for an empty API list', async () => {
  serverTasks = [];
  render(<App />);
  expect(await screen.findByText('No tasks to show')).toBeInTheDocument();
  expect(screen.getByText('Tasks remaining: 0')).toBeInTheDocument();
});

test('removes newly completed tasks from the incomplete filter', async () => {
  const user = userEvent.setup();
  await renderLoaded();
  await user.click(
    screen.getByRole('checkbox', { name: 'Practice JavaScript' }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole('checkbox', { name: 'Practice JavaScript' }),
    ).not.toBeInTheDocument(),
  );
  expect(
    screen.getByRole('checkbox', { name: 'Build my first API' }),
  ).toBeInTheDocument();
});

test('reads saved API changes after remounting and ignores old browser storage', async () => {
  localStorage.setItem(
    'react-task-manager-tasks',
    JSON.stringify([
      { id: 'old', title: 'Old browser task', completed: false },
    ]),
  );
  const user = userEvent.setup();
  const view = await renderLoaded();
  await user.type(screen.getByRole('textbox'), 'Keep on server{Enter}');
  await screen.findByRole('checkbox', { name: 'Keep on server' });
  await user.click(
    screen.getByRole('checkbox', { name: 'Practice JavaScript' }),
  );
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Add Task' })).toBeEnabled(),
  );
  await user.click(
    screen.getByRole('button', { name: 'Delete task: Build my first API' }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole('checkbox', { name: 'Build my first API' }),
    ).not.toBeInTheDocument(),
  );
  view.unmount();
  await renderLoaded();
  expect(
    screen.getByRole('checkbox', { name: 'Keep on server' }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('checkbox', { name: 'Old browser task' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('checkbox', { name: 'Build my first API' }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Show all tasks' }));
  expect(
    screen.getByRole('checkbox', { name: 'Practice JavaScript' }),
  ).toBeChecked();
});
