import { useEffect, useState } from 'react';
import TaskItem from './components/TaskItem';
import TaskForm from './components/TaskForm';

function App() {
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(true);

  const [tasks, setTasks] = useState(() => {
    try {
      const savedTasks = localStorage.getItem('react-task-manager-tasks');
      if (savedTasks !== null) {
        const parsedTasks = JSON.parse(savedTasks);

        const hasValidTasks =
          Array.isArray(parsedTasks) &&
          parsedTasks.every(
            (task) =>
              task !== null &&
              typeof task === 'object' &&
              (typeof task.id === 'number' || typeof task.id === 'string') &&
              typeof task.title === 'string' &&
              typeof task.completed === 'boolean',
          );

        if (hasValidTasks) {
          return parsedTasks;
        }
      }
    } catch (error) {
      console.error('Could not read saved tasks:', error);
    }

    return [
      { id: 1, title: 'Practice JavaScript', completed: false },
      { id: 2, title: 'Learn React', completed: true },
      { id: 3, title: 'Build my first API', completed: false },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('react-task-manager-tasks', JSON.stringify(tasks));
    } catch (error) {
      console.error('Could not save tasks:', error);
    }
  }, [tasks]);

  const [newTaskTitle, setNewTaskTitle] = useState('');

  function toggleTask(id) {
    const updateTask = tasks.map((task) => {
      if (task.id === id) {
        return { ...task, completed: !task.completed };
      }

      return task;
    });

    setTasks(updateTask);
  }

  function deleteTask(id) {
    const remainingTasks = tasks.filter((task) => task.id !== id);
    setTasks(remainingTasks);
  }

  function addTask(event) {
    event.preventDefault();

    const title = newTaskTitle.trim();

    if (title === '') {
      return;
    }

    const newTask = {
      id: crypto.randomUUID(),
      title: title,
      completed: false,
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
  }

  const incompleteTaskCount = tasks.filter(
    (task) => task.completed === false,
  ).length;

  const visibleTasks = tasks.filter(
    (task) => !showOnlyIncomplete || task.completed === false,
  );

  return (
    <main>
      <h1>Task Manager</h1>

      <p>Tasks remaining: {incompleteTaskCount}</p>

      <TaskForm
        newTaskTitle={newTaskTitle}
        onTitleChange={setNewTaskTitle}
        onAddTask={addTask}
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

      {visibleTasks.length === 0 && <p>No tasks to show</p>}

      <ul className="task-list">
        {visibleTasks.map((task) => (
          <TaskItem
            key={task.id}
            title={task.title}
            completed={task.completed}
            onToggle={() => toggleTask(task.id)}
            onDelete={() => deleteTask(task.id)}
          />
        ))}
      </ul>
    </main>
  );
}

export default App;
