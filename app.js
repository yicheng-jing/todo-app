const STORAGE_KEY = "vibe-todo-items";

const state = {
  todos: loadTodos(),
  filter: "all",
  recentlyCompletedId: null,
};

const elements = {
  input: document.querySelector("#todo-input"),
  dueDateInput: document.querySelector("#due-date-input"),
  addButton: document.querySelector("#add-button"),
  message: document.querySelector("#form-message"),
  list: document.querySelector("#todo-list"),
  template: document.querySelector("#todo-item-template"),
  totalCount: document.querySelector("#total-count"),
  activeCount: document.querySelector("#active-count"),
  completedCount: document.querySelector("#completed-count"),
  filterButtons: Array.from(document.querySelectorAll(".filter-button")),
};

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to read todos from storage.", error);
    return [];
  }
}

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.todos));
    return true;
  } catch (error) {
    console.error("Failed to save todos to storage.", error);
    elements.message.textContent = "保存失败了，请检查浏览器是否允许本地存储。";
    return false;
  }
}

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `todo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function addTodo(title, dueDate) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    elements.message.textContent = "先写下一个具体任务，再点新增。";
    return;
  }

  if (!dueDate) {
    elements.message.textContent = "请选择一个截止日期。";
    return;
  }

  const todo = {
    id: generateId(),
    title: trimmedTitle,
    completed: false,
    createdAt: new Date().toISOString(),
    dueDate,
  };

  state.todos.unshift(todo);
  saveTodos();
  render();

  elements.input.value = "";
  elements.dueDateInput.value = "";
  elements.input.focus();
  elements.message.textContent = "已加入清单，并记录截止日期。";
}

function toggleTodo(id) {
  const targetTodo = state.todos.find((todo) => todo.id === id);
  const willComplete = targetTodo ? !targetTodo.completed : false;

  state.todos = state.todos.reduce(
    (nextTodos, todo) => {
      if (todo.id !== id) {
        nextTodos.push(todo);
        return nextTodos;
      }

      const updatedTodo = { ...todo, completed: !todo.completed };

      if (willComplete) {
        nextTodos.push(updatedTodo);
      } else {
        nextTodos.unshift(updatedTodo);
      }

      return nextTodos;
    },
    []
  );

  state.recentlyCompletedId = willComplete ? id : null;
  saveTodos();
  render();

  if (willComplete) {
    window.setTimeout(() => {
      if (state.recentlyCompletedId === id) {
        state.recentlyCompletedId = null;
        render();
      }
    }, 450);
  }
}

function deleteTodo(id) {
  state.todos = state.todos.filter((todo) => todo.id !== id);
  saveTodos();
  render();
}

function filterTodos(status) {
  state.filter = status;
  render();
}

function getVisibleTodos() {
  if (state.filter === "active") {
    return state.todos.filter((todo) => !todo.completed);
  }

  if (state.filter === "completed") {
    return state.todos.filter((todo) => todo.completed);
  }

  const activeTodos = state.todos.filter((todo) => !todo.completed);
  const completedTodos = state.todos.filter((todo) => todo.completed);
  return [...activeTodos, ...completedTodos];
}

function formatTime(isoTime) {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return formatter.format(new Date(isoTime));
}

function formatDate(dateString) {
  if (!dateString) {
    return "未设置截止日期";
  }

  const formatter = new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  });

  return formatter.format(new Date(`${dateString}T00:00:00`));
}

function isOverdue(todo) {
  if (!todo.dueDate || todo.completed) {
    return false;
  }

  const today = new Date();
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDate = new Date(`${todo.dueDate}T00:00:00`);

  return dueDate < currentDate;
}

function renderStats() {
  const total = state.todos.length;
  const completed = state.todos.filter((todo) => todo.completed).length;
  const active = total - completed;

  elements.totalCount.textContent = String(total);
  elements.activeCount.textContent = String(active);
  elements.completedCount.textContent = String(completed);
}

function renderFilters() {
  elements.filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === state.filter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function renderList() {
  elements.list.innerHTML = "";
  const visibleTodos = getVisibleTodos();

  if (visibleTodos.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "empty-state";
    emptyState.textContent =
      state.todos.length === 0
        ? "还没有任务，先添加一条开始今天的安排。"
        : "这个筛选下暂时没有任务。";
    elements.list.appendChild(emptyState);
    return;
  }

  visibleTodos.forEach((todo) => {
    const fragment = elements.template.content.cloneNode(true);
    const item = fragment.querySelector(".todo-item");
    const toggleButton = fragment.querySelector(".toggle-button");
    const title = fragment.querySelector(".todo-title");
    const meta = fragment.querySelector(".todo-meta");
    const deadline = fragment.querySelector(".todo-deadline");
    const deleteButton = fragment.querySelector(".delete-button");

    item.dataset.id = todo.id;
    item.classList.toggle("is-celebrating", state.recentlyCompletedId === todo.id);
    toggleButton.classList.toggle("is-completed", todo.completed);
    toggleButton.setAttribute("aria-pressed", String(todo.completed));
    title.textContent = todo.title;
    title.classList.toggle("is-completed", todo.completed);
    meta.textContent = `创建于 ${formatTime(todo.createdAt)}`;
    deadline.textContent = isOverdue(todo)
      ? `已逾期，截止于 ${formatDate(todo.dueDate)}`
      : `截止日期 ${formatDate(todo.dueDate)}`;
    deadline.classList.toggle("is-overdue", isOverdue(todo));

    toggleButton.addEventListener("click", () => toggleTodo(todo.id));
    deleteButton.addEventListener("click", () => deleteTodo(todo.id));

    elements.list.appendChild(fragment);
  });
}

function render() {
  renderStats();
  renderFilters();
  renderList();
}

elements.addButton.addEventListener("click", () =>
  addTodo(elements.input.value, elements.dueDateInput.value)
);
elements.input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addTodo(elements.input.value, elements.dueDateInput.value);
  }
});

elements.input.addEventListener("input", () => {
  if (elements.message.textContent) {
    elements.message.textContent = "";
  }
});

elements.dueDateInput.addEventListener("input", () => {
  if (elements.message.textContent) {
    elements.message.textContent = "";
  }
});

elements.filterButtons.forEach((button) => {
  button.addEventListener("click", () => filterTodos(button.dataset.filter));
});

render();
