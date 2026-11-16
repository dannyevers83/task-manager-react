import { useCallback, useEffect, useRef, useState } from 'react';
import TaskItem from './components/TaskItem';
import TaskForm from './components/TaskForm';
import { isTask, isTaskList, requestTasks } from './api';

function App() {
  /* ========================================
     State — tasks, form input and request status
     ======================================== */

  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);

  /* ========================================
     API — load tasks and cancel obsolete requests
     ======================================== */

  const loadTasks = useCallback(async (signal) => {
    try {
      const data = await requestTasks('/tasks', { signal });
      if (!isTaskList(data)) throw new Error('Invalid task list.');
      if (signal?.aborted) return;
      setTasks(data);
      setHasLoaded(true);
    } catch {
      if (!signal?.aborted) setError('Could not load tasks.');
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  function retryLoadTasks() {
    setIsLoading(true);
    setError('');
    loadTasks();
  }

  useEffect(() => {
    const controller = new AbortController();
    // State changes happen after the awaited request, not synchronously here.
    // oxlint-disable-next-line react/set-state-in-effect
    loadTasks(controller.signal);
    return () => controller.abort();
  }, [loadTasks]);

  /* ========================================
     Task actions — save on the API, then update React
     ======================================== */

  async function saveChange(action, errorMessage) {
    // The ref also prevents duplicate requests before React renders again.
    if (savingRef.current || isLoading || !hasLoaded) return;
    savingRef.current = true;
    setIsSaving(true);
    setError('');

    try {
      await action();
    } catch {
      setError(errorMessage);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  async function toggleTask(id) {
    const selectedTask = tasks.find((task) => task.id === id);
    if (!selectedTask) return;

    await saveChange(async () => {
      const updatedTask = await requestTasks(
        `/tasks/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: !selectedTask.completed }),
        },
      );
      if (!isTask(updatedTask) || updatedTask.id !== id) {
        throw new Error('Invalid updated task.');
      }

      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === id ? updatedTask : task)),
      );
    }, 'Could not update task.');
  }

  async function deleteTask(id) {
    await saveChange(async () => {
      await requestTasks(`/tasks/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
    }, 'Could not delete task.');
  }

  async function addTask(event) {
    event.preventDefault();
    const title = newTaskTitle.trim();
    if (title === '') return;

    await saveChange(async () => {
      const newTask = await requestTasks('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!isTask(newTask)) throw new Error('Invalid new task.');

      setTasks((currentTasks) => [...currentTasks, newTask]);
      setNewTaskTitle('');
    }, 'Could not add task.');
  }

  /* ========================================
     Derived values — filters, count and disabled controls
     ======================================== */

  const incompleteTaskCount = tasks.filter((task) => !task.completed).length;
  const visibleTasks = tasks.filter(
    (task) => !showOnlyIncomplete || !task.completed,
  );
  const controlsDisabled = isLoading || isSaving || !hasLoaded;

  /* ========================================
     Interface — form, request feedback and task list
     ======================================== */

  return (
    <main>
      <h1>Task Manager</h1>
      <p className="demo-notice">
        Shared demo: tasks are stored on the server and reset when it restarts.
      </p>
      {isLoading && <p role="status">Loading tasks...</p>}
      {isSaving && <p role="status">Saving changes...</p>}
      {error && <p role="alert">{error}</p>}
      {!isLoading && !hasLoaded && (
        <button type="button" onClick={retryLoadTasks}>
          Try again
        </button>
      )}
      {hasLoaded && <p>Tasks remaining: {incompleteTaskCount}</p>}

      <TaskForm
        newTaskTitle={newTaskTitle}
        onTitleChange={setNewTaskTitle}
        onAddTask={addTask}
        disabled={controlsDisabled}
      />

      <div className="task-filters">
        <button
          type="button"
          onClick={() => setShowOnlyIncomplete(false)}
          aria-pressed={!showOnlyIncomplete}
        >
          Show all tasks
        </button>
        <button
          type="button"
          onClick={() => setShowOnlyIncomplete(true)}
          aria-pressed={showOnlyIncomplete}
        >
          Show incomplete tasks
        </button>
      </div>

      {hasLoaded && !isLoading && !error && visibleTasks.length === 0 && (
        <p>No tasks to show</p>
      )}
      <ul className="task-list">
        {visibleTasks.map((task) => (
          <TaskItem
            key={task.id}
            title={task.title}
            completed={task.completed}
            onToggle={() => toggleTask(task.id)}
            onDelete={() => deleteTask(task.id)}
            disabled={controlsDisabled}
          />
        ))}
      </ul>
    </main>
  );
}

export default App;
