function TaskForm(props) {
  return (
    <form onSubmit={props.onAddTask}>
      <label htmlFor="new-task">New Task</label>
      <input
        id="new-task"
        type="text"
        maxLength={200}
        value={props.newTaskTitle}
        disabled={props.disabled}
        onChange={(event) => props.onTitleChange(event.target.value)}
      />
      <button type="submit" disabled={props.disabled}>
        Add Task
      </button>
    </form>
  );
}

export default TaskForm;
