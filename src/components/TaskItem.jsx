function TaskItem(props) {
  return (
    <li className="task-item">
      <input
        type="checkbox"
        checked={props.completed}
        onChange={props.onToggle}
        aria-label={props.title}
      />
      <span
        className={props.completed ? 'task-title is-completed' : 'task-title'}
      >
        {props.title}
        {props.completed ? ' — Done' : ' — To do'}
      </span>
      <button
        type="button"
        onClick={props.onDelete}
        aria-label={`Delete task: ${props.title}`}
      >
        Delete
      </button>
    </li>
  );
}

export default TaskItem;
