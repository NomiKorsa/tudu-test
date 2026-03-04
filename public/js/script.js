let tasks = [];          // кеш всех задач с сервера
let currentFilter = 'all';
let currentPage = 1;
const limit = 5;         // задач на странице

// Элементы DOM
const form = document.getElementById('todo-form');
const input = document.getElementById('task-input');
const tasksContainer = document.getElementById('tasks-container');
const selectAllCheckbox = document.getElementById('select-all');
const deleteCompletedBtn = document.getElementById('delete-completed');
const deleteAllBtn = document.getElementById('delete-all');
const tabButtons = document.querySelectorAll('.tab');
const countAllSpan = document.getElementById('count-all');
const countActiveSpan = document.getElementById('count-active');
const countCompletedSpan = document.getElementById('count-completed');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const currentPageSpan = document.getElementById('current-page');

// ------------------- Работа с API -------------------
async function fetchTasks() {
  const url = `/tasks?filter=${currentFilter}&page=${currentPage}&limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error('Ошибка загрузки задач');
    return [];
  }
  return await response.json();
}

async function loadTasks() {
  tasks = await fetchTasks();
  renderTasks();
  updateCounters();
  updatePaginationButtons();
}

async function addTask(text) {
  const response = await fetch('/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, completed: false })
  });
  if (!response.ok) {
    const err = await response.json();
    alert('Ошибка: ' + err.error);
  }
  // после добавления переходим на первую страницу текущего фильтра
  currentPage = 1;
  loadTasks();
}

async function updateTask(id, data) {
  await fetch(`/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  loadTasks();
}

async function deleteTask(id) {
  await fetch(`/tasks/${id}`, { method: 'DELETE' });
  loadTasks();
}

async function deleteCompletedTasks() {
  console.log('🖱️ Нажата кнопка удаления выполненных задач');
  try {
    const response = await fetch('/tasks/completed', { method: 'DELETE' });
    const data = await response.json();
    console.log('📦 Ответ сервера:', data);
    loadTasks(); // перезагружаем список
  } catch (error) {
    console.error('❌ Ошибка при запросе:', error);
  }
}

async function deleteAllTasks() {
  // нет готового endpoint'а, но можно получить все и удалить по одному (или создать спец endpoint)
  // Для простоты получим все задачи и удалим каждую
  const response = await fetch('/tasks?filter=all&limit=1000');
  const allTasks = await response.json();
  for (let task of allTasks) {
    await fetch(`/tasks/${task.id}`, { method: 'DELETE' });
  }
  loadTasks();
}

// ------------------- Отрисовка -------------------
function renderTasks() {
  tasksContainer.innerHTML = '';
  tasks.forEach(task => {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'task-item';

    // Чекбокс
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.classList.add('task-checkbox');
    checkbox.addEventListener('change', () => {
      updateTask(task.id, { completed: checkbox.checked });
    });

    // Текст задачи (кликабельный для редактирования)
    const textSpan = document.createElement('span');
    textSpan.className = 'task-text' + (task.completed ? ' completed' : '');
    // ⚠️ Используем innerHTML для XSS (вставляем необработанный текст)
    textSpan.innerHTML = task.text;
    textSpan.addEventListener('click', () => startEditing(taskDiv, task, textSpan, checkbox));

    // Кнопка удаления
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Удалить';
    deleteBtn.classList.add('delete-task-btn');
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    taskDiv.appendChild(checkbox);
    taskDiv.appendChild(textSpan);
    taskDiv.appendChild(deleteBtn);
    tasksContainer.appendChild(taskDiv);
  });
}

// Редактирование задачи (по клику на текст)
function startEditing(taskDiv, task, textSpan, checkbox) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = task.text;
  input.classList.add('task-edit-input');
  input.maxLength = 250;

  // Заменяем span на input
  taskDiv.replaceChild(input, textSpan);

  input.focus();

  const saveEdit = () => {
    const newText = input.value.trim() || task.text; // если пусто, оставляем старый
    updateTask(task.id, { text: newText });
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      // отмена – возвращаем span без сохранения
      taskDiv.replaceChild(textSpan, input);
    }
  });

  input.addEventListener('blur', () => {
    // Потеря фокуса тоже сохраняет (для удобства)
    saveEdit();
  });
}

// Обновление счётчиков (получаем общее количество через отдельные запросы)
async function updateCounters() {
  // Получаем все задачи (без пагинации) для подсчёта
  const [all, active, completed] = await Promise.all([
    fetch('/tasks?filter=all&limit=10000').then(r => r.json()),
    fetch('/tasks?filter=active&limit=10000').then(r => r.json()),
    fetch('/tasks?filter=completed&limit=10000').then(r => r.json())
  ]);
  countAllSpan.textContent = all.length;
  countActiveSpan.textContent = active.length;
  countCompletedSpan.textContent = completed.length;
}

function updatePaginationButtons() {
  // Показывать/скрывать кнопки в зависимости от наличия задач на следующей странице
  // Для простоты предполагаем, что если на текущей странице меньше limit, то следующей нет
  // (в реальности надо бы знать общее количество, но для учебного проекта сойдёт)
  prevPageBtn.disabled = currentPage <= 1;
  // next станет disabled, если задач меньше limit (но может быть ровно limit и есть следующая)
  // Более точный способ – запросить следующую страницу и проверить, но для простоты оставим так
  // Лучше сделать дополнительный запрос /tasks/count, но опустим.
  // Для демо просто включим кнопку всегда, а при клине будем проверять
  // Сейчас мы не знаем, есть ли следующая страница, поэтому next не блокируем принудительно
  // Заблокируем, если на текущей странице задач < limit (но если последняя страница содержит ровно limit, то это неточно)
  // Упростим: не блокируем next вообще, пусть пользователь нажимает, а при пустом ответе переходим обратно
}

// ------------------- Обработчики событий -------------------
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) {
    alert('Введите текст задачи!');
    return;
  }
  addTask(text);
  input.value = '';
  input.focus(); // фокус остаётся
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    input.value = '';
    input.blur();
  }
});

selectAllCheckbox.addEventListener('change', () => {
  // Установить всем задачам на сервере состояние, равное чекбоксу
  // Это требует обновления каждой задачи. Можно сделать отдельный endpoint, но для демо пройдёмся по всем
  fetch('/tasks?filter=all&limit=10000')
    .then(r => r.json())
    .then(allTasks => {
      const promises = allTasks.map(task =>
        fetch(`/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: selectAllCheckbox.checked })
        })
      );
      Promise.all(promises).then(() => loadTasks());
    });
});

deleteCompletedBtn.addEventListener('click', () => {
  if (confirm('Удалить все выполненные задачи?')) {
    deleteCompletedTasks();
  }
});

deleteAllBtn.addEventListener('click', () => {
  if (confirm('Удалить ВСЕ задачи?')) {
    deleteAllTasks();
  }
});

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    currentPage = 1;
    loadTasks();
  });
});

prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    loadTasks();
  }
});

nextPageBtn.addEventListener('click', () => {
  // Просто увеличиваем страницу и загружаем (если задач нет, остаёмся)
  currentPage++;
  loadTasks().then(() => {
    // если после загрузки tasks.length === 0, откатываем страницу назад
    if (tasks.length === 0 && currentPage > 1) {
      currentPage--;
      loadTasks();
    }
  });
});

// Инициализация
loadTasks();