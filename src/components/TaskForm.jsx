function TaskForm(props) {
  return (
    <form onSubmit={props.onAddTask}>
      <label htmlFor="new-task">New Task</label>
      <input
        id="new-task"
        type="text"
        value={props.newTaskTitle}
        onChange={(event) => props.onTitleChange(event.target.value)}
      />
      <button type="submit">Add Task</button>
    </form>
  );
}

export default TaskForm;
