const SUPABASE_URL = "https://vbyusryrxqszoqdcgqlg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_KHTURQwQK2G-8Q0r4HMUfg_zbGILfnI";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const state = {
  todos: [],
  filter: "all",
  recentlyCompletedId: null,
  user: null,
  isLoading: true,
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
  signInButton: document.querySelector("#sign-in-button"),
  signOutButton: document.querySelector("#sign-out-button"),
  userStatus: document.querySelector("#user-status"),
};

function showMessage(message) {
  elements.message.textContent = message;
}

function mapTodoFromDatabase(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    completed: row.completed,
    dueDate: row.due_date,
    createdAt: row.created_at,
  };
}

function moveUpdatedTodo(todos, id, updatedTodo, shouldMoveToBottom) {
  const nextTodos = todos.filter((todo) => todo.id !== id);

  if (shouldMoveToBottom) {
    nextTodos.push(updatedTodo);
  } else {
    nextTodos.unshift(updatedTodo);
  }

  return nextTodos;
}

async function signInWithGoogle() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    showMessage("Google 登录启动失败，请稍后再试。");
    console.error("Failed to sign in with Google.", error);
  }
}

async function signOut() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    showMessage("退出登录失败，请稍后再试。");
    console.error("Failed to sign out.", error);
    return;
  }

  state.user = null;
  state.todos = [];
  render();
}

async function fetchTodos() {
  if (!state.user) {
    state.todos = [];
    state.isLoading = false;
    render();
    return;
  }

  state.isLoading = true;
  render();

  const { data, error } = await supabaseClient
    .from("todos")
    .select("id,user_id,title,completed,due_date,created_at")
    .order("created_at", { ascending: false });

  state.isLoading = false;

  if (error) {
    showMessage("读取云端任务失败，请检查 Supabase 配置。");
    console.error("Failed to fetch todos.", error);
    render();
    return;
  }

  state.todos = data.map(mapTodoFromDatabase);
  render();
}

async function addTodo(title, dueDate) {
  if (!state.user) {
    showMessage("请先用 Google 登录，再添加任务。");
    return;
  }

  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    showMessage("先写下一个具体任务，再点新增。");
    return;
  }

  if (!dueDate) {
    showMessage("请选择一个截止日期。");
    return;
  }

  elements.addButton.disabled = true;

  const { data, error } = await supabaseClient
    .from("todos")
    .insert({
      title: trimmedTitle,
      due_date: dueDate,
      completed: false,
      user_id: state.user.id,
    })
    .select("id,user_id,title,completed,due_date,created_at")
    .single();

  elements.addButton.disabled = false;

  if (error) {
    showMessage("新增任务失败，请稍后再试。");
    console.error("Failed to add todo.", error);
    return;
  }

  state.todos.unshift(mapTodoFromDatabase(data));
  render();

  elements.input.value = "";
  elements.dueDateInput.value = "";
  elements.input.focus();
  showMessage("已保存到云端。");
}

async function toggleTodo(id) {
  if (!state.user) return;

  const targetTodo = state.todos.find((todo) => todo.id === id);
  if (!targetTodo) return;

  const willComplete = !targetTodo.completed;

  const { data, error } = await supabaseClient
    .from("todos")
    .update({ completed: willComplete })
    .eq("id", id)
    .select("id,user_id,title,completed,due_date,created_at")
    .single();

  if (error) {
    showMessage("更新任务失败，请稍后再试。");
    console.error("Failed to update todo.", error);
    return;
  }

  state.todos = moveUpdatedTodo(
    state.todos,
    id,
    mapTodoFromDatabase(data),
    willComplete
  );
  state.recentlyCompletedId = willComplete ? id : null;
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

async function deleteTodo(id) {
  if (!state.user) return;

  const { error } = await supabaseClient.from("todos").delete().eq("id", id);

  if (error) {
    showMessage("删除任务失败，请稍后再试。");
    console.error("Failed to delete todo.", error);
    return;
  }

  state.todos = state.todos.filter((todo) => todo.id !== id);
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

function renderAuth() {
  const isSignedIn = Boolean(state.user);

  elements.userStatus.textContent = isSignedIn
    ? `已登录：${state.user.email}`
    : "登录后可跨设备同步任务。";
  elements.signInButton.hidden = isSignedIn;
  elements.signOutButton.hidden = !isSignedIn;
  elements.input.disabled = !isSignedIn;
  elements.dueDateInput.disabled = !isSignedIn;
  elements.addButton.disabled = !isSignedIn || state.isLoading;
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

  if (state.isLoading) {
    const loadingState = document.createElement("li");
    loadingState.className = "empty-state";
    loadingState.textContent = "正在同步云端任务...";
    elements.list.appendChild(loadingState);
    return;
  }

  if (!state.user) {
    const signedOutState = document.createElement("li");
    signedOutState.className = "empty-state";
    signedOutState.textContent = "请先登录，查看你的云端 To-do 清单。";
    elements.list.appendChild(signedOutState);
    return;
  }

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
  renderAuth();
  renderStats();
  renderFilters();
  renderList();
}

async function initializeApp() {
  const {
    data: { session },
    error,
  } = await supabaseClient.auth.getSession();

  if (error) {
    showMessage("读取登录状态失败，请刷新页面再试。");
    console.error("Failed to read auth session.", error);
  }

  state.user = session?.user ?? null;
  state.isLoading = false;
  render();

  if (state.user) {
    await fetchTodos();
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user ?? null;
    fetchTodos();
  });
}

elements.signInButton.addEventListener("click", signInWithGoogle);
elements.signOutButton.addEventListener("click", signOut);
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
initializeApp();
