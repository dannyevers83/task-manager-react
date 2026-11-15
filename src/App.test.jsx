import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import App from './App';

const storageKey = 'react-task-manager-tasks';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

/* ========================================
   Initial view and adding tasks
   ======================================== */

test('shows the page heading', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: 'Task Manager', level: 1 }),
  ).toBeInTheDocument();
});

test('adds a task', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.type(
    screen.getByRole('textbox', { name: 'New Task' }),
    'Practice React hooks',
  );

  await user.click(screen.getByRole('button', { name: 'Add Task' }));

  expect(screen.getByText('Practice React hooks — To do')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'New Task' })).toHaveValue('');
  expect(screen.getByText('Tasks remaining: 3')).toBeInTheDocument();
});

test('adds a task with Enter and trims spaces around the title', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.type(
    screen.getByRole('textbox', { name: 'New Task' }),
    '  Learn PostgreSQL  {Enter}',
  );

  expect(
    screen.getByRole('checkbox', { name: 'Learn PostgreSQL' }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(screen.getByRole('textbox', { name: 'New Task' })).toHaveValue('');
});

test.each(['', '   '])(
  'rejects an empty or whitespace-only title: %j',
  async (title) => {
    const user = userEvent.setup();
    render(<App />);

    if (title !== '') {
      await user.type(screen.getByRole('textbox', { name: 'New Task' }), title);
    }
    await user.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Tasks remaining: 2')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(storageKey))).toHaveLength(3);
  },
);

/* ========================================
   Completing, deleting and filtering tasks
   ======================================== */

test('toggles a task in both directions and updates its status and count', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Show all tasks' }));

  const checkbox = screen.getByRole('checkbox', {
    name: 'Practice JavaScript',
  });
  await user.click(checkbox);

  expect(checkbox).toBeChecked();
  expect(screen.getByText('Practice JavaScript — Done')).toBeInTheDocument();
  expect(screen.getByText('Tasks remaining: 1')).toBeInTheDocument();

  await user.click(checkbox);

  expect(checkbox).not.toBeChecked();
  expect(screen.getByText('Practice JavaScript — To do')).toBeInTheDocument();
  expect(screen.getByText('Tasks remaining: 2')).toBeInTheDocument();
});

test('removes a completed task from the incomplete filter', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(
    screen.getByRole('checkbox', { name: 'Practice JavaScript' }),
  );

  expect(
    screen.queryByRole('checkbox', { name: 'Practice JavaScript' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('checkbox', { name: 'Build my first API' }),
  ).toBeInTheDocument();
  expect(screen.getByText('Tasks remaining: 1')).toBeInTheDocument();
});

test('deletes only the selected task, including when two titles are identical', async () => {
  localStorage.setItem(
    storageKey,
    JSON.stringify([
      { id: 'first', title: 'Practice React', completed: false },
      { id: 'second', title: 'Practice React', completed: false },
    ]),
  );
  const user = userEvent.setup();
  render(<App />);

  await user.click(
    screen.getAllByRole('button', { name: 'Delete task: Practice React' })[0],
  );

  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  expect(screen.getByText('Tasks remaining: 1')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(storageKey))).toEqual([
    { id: 'second', title: 'Practice React', completed: false },
  ]);
});

test('deleting a completed task leaves the remaining count unchanged', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Show all tasks' }));
  await user.click(
    screen.getByRole('button', { name: 'Delete task: Learn React' }),
  );

  expect(
    screen.queryByRole('checkbox', { name: 'Learn React' }),
  ).not.toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(screen.getByText('Tasks remaining: 2')).toBeInTheDocument();
});

test('switches filters and identifies the active filter', async () => {
  const user = userEvent.setup();
  render(<App />);
  const allButton = screen.getByRole('button', { name: 'Show all tasks' });
  const incompleteButton = screen.getByRole('button', {
    name: 'Show incomplete tasks',
  });

  expect(incompleteButton).toHaveAttribute('aria-pressed', 'true');
  expect(allButton).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getAllByRole('listitem')).toHaveLength(2);

  await user.click(allButton);

  expect(allButton).toHaveAttribute('aria-pressed', 'true');
  expect(incompleteButton).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(screen.getByRole('checkbox', { name: 'Learn React' })).toBeChecked();

  await user.click(incompleteButton);

  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(
    screen.queryByRole('checkbox', { name: 'Learn React' }),
  ).not.toBeInTheDocument();
  expect(incompleteButton).toHaveAttribute('aria-pressed', 'true');
  expect(allButton).toHaveAttribute('aria-pressed', 'false');
});

test('shows the empty message when no tasks match the filter', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    screen.getByRole('checkbox', { name: 'Practice JavaScript' }),
  );
  await user.click(
    screen.getByRole('checkbox', { name: 'Build my first API' }),
  );

  expect(screen.getByText('No tasks to show')).toBeInTheDocument();
  expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  expect(screen.getByText('Tasks remaining: 0')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Show all tasks' }));

  expect(screen.queryByText('No tasks to show')).not.toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
});

/* ========================================
   Saving, restoring and storage failures
   ======================================== */

test('restores saved tasks and their completion status', async () => {
  localStorage.setItem(
    storageKey,
    JSON.stringify([
      { id: 'saved-open', title: 'Book a haircut', completed: false },
      { id: 'saved-done', title: 'Choose a barber', completed: true },
    ]),
  );
  const user = userEvent.setup();
  render(<App />);

  expect(
    screen.getByRole('checkbox', { name: 'Book a haircut' }),
  ).not.toBeChecked();
  expect(screen.getByText('Tasks remaining: 1')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Show all tasks' }));

  expect(
    screen.getByRole('checkbox', { name: 'Choose a barber' }),
  ).toBeChecked();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});

test('keeps added, completed and deleted tasks after remounting the app', async () => {
  const user = userEvent.setup();
  const view = render(<App />);
  await user.type(
    screen.getByRole('textbox', { name: 'New Task' }),
    'Keep this task{Enter}',
  );
  await user.click(
    screen.getByRole('checkbox', { name: 'Practice JavaScript' }),
  );
  await user.click(
    screen.getByRole('button', { name: 'Delete task: Build my first API' }),
  );

  view.unmount();
  render(<App />);

  expect(
    screen.getByRole('checkbox', { name: 'Keep this task' }),
  ).not.toBeChecked();
  expect(screen.getByText('Tasks remaining: 1')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Show all tasks' }));
  expect(
    screen.getByRole('checkbox', { name: 'Practice JavaScript' }),
  ).toBeChecked();
  expect(
    screen.queryByRole('checkbox', { name: 'Build my first API' }),
  ).not.toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
});

test('preserves an empty saved list instead of restoring the example tasks', async () => {
  const user = userEvent.setup();
  const view = render(<App />);
  await user.click(screen.getByRole('button', { name: 'Show all tasks' }));

  for (const button of screen.getAllByRole('button', {
    name: /^Delete task:/,
  })) {
    await user.click(button);
  }

  expect(JSON.parse(localStorage.getItem(storageKey))).toEqual([]);
  view.unmount();
  render(<App />);

  expect(screen.getByText('No tasks to show')).toBeInTheDocument();
  expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  expect(screen.getByText('Tasks remaining: 0')).toBeInTheDocument();
});

test.each([
  ['invalid JSON', '{broken'],
  ['null', 'null'],
  ['an object instead of an array', '{}'],
  ['a null task', '[null]'],
  ['a primitive task', '[42]'],
  ['a missing ID', '[{"title":"Invalid","completed":false}]'],
  ['an invalid title', '[{"id":1,"title":42,"completed":false}]'],
  [
    'an invalid completion status',
    '[{"id":1,"title":"Invalid","completed":"false"}]',
  ],
])(
  'uses example tasks when storage contains %s',
  (_description, savedValue) => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(storageKey, savedValue);
    render(<App />);

    expect(
      screen.getByRole('checkbox', { name: 'Practice JavaScript' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Tasks remaining: 2')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(JSON.parse(localStorage.getItem(storageKey))).toHaveLength(3);
    if (savedValue === '{broken') {
      expect(errorSpy).toHaveBeenCalledWith(
        'Could not read saved tasks:',
        expect.any(Error),
      );
    }
  },
);

test('keeps the app usable when reading storage fails', async () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Storage is unavailable');
  });
  const user = userEvent.setup();
  render(<App />);

  expect(errorSpy).toHaveBeenCalledWith(
    'Could not read saved tasks:',
    expect.any(Error),
  );
  await user.type(
    screen.getByRole('textbox', { name: 'New Task' }),
    'Still works{Enter}',
  );
  expect(
    screen.getByRole('checkbox', { name: 'Still works' }),
  ).toBeInTheDocument();
});

test('keeps tasks usable in memory when saving storage fails', async () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage is full');
  });
  const user = userEvent.setup();
  render(<App />);

  await user.type(
    screen.getByRole('textbox', { name: 'New Task' }),
    'Temporary task{Enter}',
  );
  expect(
    screen.getByRole('checkbox', { name: 'Temporary task' }),
  ).toBeInTheDocument();
  expect(errorSpy).toHaveBeenCalledWith(
    'Could not save tasks:',
    expect.any(Error),
  );

  const list = screen.getByRole('list');
  await user.click(
    within(list).getByRole('button', { name: 'Delete task: Temporary task' }),
  );
  expect(
    screen.queryByRole('checkbox', { name: 'Temporary task' }),
  ).not.toBeInTheDocument();
});
