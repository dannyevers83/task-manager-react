/* ========================================
   API — requests and response validation
   ======================================== */

const apiBaseUrl = (import.meta.env.VITE_API_URL || '')
  .trim()
  .replace(/\/+$/, '');

export function isTask(task) {
  return (
    task !== null &&
    typeof task === 'object' &&
    typeof task.id === 'string' &&
    task.id.length > 0 &&
    typeof task.title === 'string' &&
    typeof task.completed === 'boolean'
  );
}

export function isTaskList(tasks) {
  return (
    Array.isArray(tasks) &&
    tasks.every(isTask) &&
    new Set(tasks.map((task) => task.id)).size === tasks.length
  );
}

export async function requestTasks(path = '/tasks', options = {}) {
  // A sleeping demo server can take around a minute to start.
  const timeoutSignal = AbortSignal.timeout(90000);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;
  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, signal });

  if (!response.ok) throw new Error('The API request failed.');
  if (response.status === 204) return null;

  return response.json();
}
