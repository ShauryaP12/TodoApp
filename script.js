// DOM Elements
const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const prioritySelect = document.getElementById('priority');
const dueDateInput = document.getElementById('due-date');
const advancedOptions = document.getElementById('advanced-options');
const toggleAdvancedBtn = document.getElementById('toggle-advanced');
const categoryInput = document.getElementById('category');
const reminderInput = document.getElementById('reminder');
const notesInput = document.getElementById('notes');
const recurrenceSelect = document.getElementById('recurrence');

const searchInput = document.getElementById('search');
const filterButtons = document.querySelectorAll('.filter-btn');
const sortSelect = document.getElementById('sort');
const todoList = document.getElementById('todo-list');
const statsDiv = document.getElementById('stats');
const progressBar = document.querySelector('.progress-bar');

const completeSelectedBtn = document.getElementById('complete-selected');
const deleteSelectedBtn = document.getElementById('delete-selected');
const clearCompletedBtn = document.getElementById('clear-completed');
const exportBtn = document.getElementById('export-tasks');
const importBtn = document.getElementById('import-tasks');
const importFileInput = document.getElementById('import-file');

const darkModeToggle = document.getElementById('toggle-dark-mode');
const fabAddTask = document.getElementById('fab-add-task');

const editModal = document.getElementById('edit-modal');
const closeModal = document.querySelector('.modal .close');
const editForm = document.getElementById('edit-form');
const editInput = document.getElementById('edit-todo-input');
const editPriority = document.getElementById('edit-priority');
const editDueDate = document.getElementById('edit-due-date');
const editCategory = document.getElementById('edit-category');
const editReminder = document.getElementById('edit-reminder');
const editNotes = document.getElementById('edit-notes');
const editRecurrence = document.getElementById('edit-recurrence');

const toast = document.getElementById('toast');

let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentFilter = 'all';
let currentSearch = '';
let currentSort = 'none';
let draggedTaskIndex = null;
let reminderTimers = [];
let editIndex = null;
let lastDeleted = null; // For undo delete

// Load dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark');
}

// Save to localStorage
function saveTodos() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

// Clear scheduled reminder timers
function clearReminderTimers() {
  reminderTimers.forEach(timer => clearTimeout(timer));
  reminderTimers = [];
}

// Schedule notifications for tasks with reminders
function scheduleReminders() {
  clearReminderTimers();
  if (!("Notification" in window)) return;
  if (Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
  todos.forEach((todo, i) => {
    if (todo.reminder && !todo.completed) {
      const reminderTime = new Date(todo.reminder).getTime();
      const now = Date.now();
      const delay = reminderTime - now;
      if (delay > 0) {
        const timer = setTimeout(() => {
          if (Notification.permission === 'granted') {
            new Notification('Task Reminder', { body: todo.text });
          }
        }, delay);
        reminderTimers.push(timer);
      }
    }
  });
}

// Update progress bar based on completed tasks
function updateProgressBar() {
  const total = todos.length;
  const completed = todos.filter(t => t.completed).length;
  const percent = total ? (completed / total) * 100 : 0;
  progressBar.style.width = percent + '%';
}

// Render stats
function renderStats() {
  const total = todos.length;
  const completed = todos.filter(t => t.completed).length;
  const active = total - completed;
  statsDiv.textContent = `Total: ${total} | Active: ${active} | Completed: ${completed}`;
}

// Helper: Calculate next due date for recurring tasks
function getNextDueDate(currentDate, recurrence) {
  let date = currentDate ? new Date(currentDate) : new Date();
  switch(recurrence) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      break;
  }
  return date.toISOString().split('T')[0]; // Return date in YYYY-MM-DD
}

// Show toast notification with undo option
function showToast(message, undoCallback) {
  toast.textContent = message + ' ';
  const undoBtn = document.createElement('button');
  undoBtn.textContent = 'Undo';
  undoBtn.style.background = 'transparent';
  undoBtn.style.color = '#fff';
  undoBtn.style.border = 'none';
  undoBtn.style.cursor = 'pointer';
  toast.appendChild(undoBtn);
  toast.style.display = 'block';
  // Hide after 5 seconds
  const timeout = setTimeout(() => {
    toast.style.display = 'none';
  }, 5000);
  undoBtn.addEventListener('click', () => {
    clearTimeout(timeout);
    toast.style.display = 'none';
    if (typeof undoCallback === 'function') {
      undoCallback();
    }
  });
}

// Render To-Do List
function renderTodos() {
  let visibleIndices = [];
  todos.forEach((todo, i) => {
    if (currentFilter === 'active' && todo.completed) return;
    if (currentFilter === 'completed' && !todo.completed) return;
    if (currentSearch && !todo.text.toLowerCase().includes(currentSearch.toLowerCase())) return;
    visibleIndices.push(i);
  });

  if (currentSort === 'dueDate') {
    visibleIndices.sort((a, b) => {
      const dateA = todos[a].dueDate ? new Date(todos[a].dueDate) : new Date(8640000000000000);
      const dateB = todos[b].dueDate ? new Date(todos[b].dueDate) : new Date(8640000000000000);
      return dateA - dateB;
    });
  } else if (currentSort === 'priority') {
    const order = { high: 1, medium: 2, low: 3 };
    visibleIndices.sort((a, b) => order[todos[a].priority] - order[todos[b].priority]);
  }

  todoList.innerHTML = '';
  visibleIndices.forEach(i => {
    const todo = todos[i];
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    li.setAttribute('draggable', 'true');
    li.dataset.index = i;
    li.setAttribute('data-badge', todo.completed ? '✔' : '');

    const dueDateStr = todo.dueDate ? `<span class="info">Due: ${new Date(todo.dueDate).toLocaleDateString()}</span>` : '';
    const categoryStr = todo.category ? `<span class="info">Category: ${todo.category}</span>` : '';
    const reminderStr = todo.reminder ? `<span class="info">Reminds: ${new Date(todo.reminder).toLocaleString()}</span>` : '';
    const notesStr = todo.notes ? `<div class="notes">${todo.notes}</div>` : '';

    let subtasksHTML = '';
    if (todo.subtasks && todo.subtasks.length > 0) {
      subtasksHTML += '<ul class="subtask-list">';
      todo.subtasks.forEach((sub, j) => {
        subtasksHTML += `
          <li class="subtask-item">
            <input type="checkbox" class="subtask-checkbox" data-parent="${i}" data-index="${j}" ${sub.completed ? 'checked' : ''}>
            <span ${sub.completed ? 'class="completed"' : ''}>${sub.text}</span>
          </li>
        `;
      });
      subtasksHTML += '</ul>';
    }
    subtasksHTML += `
      <div class="add-subtask" data-index="${i}">
        <input type="text" placeholder="Add subtask..." />
        <button type="button" class="subtask-btn">Add</button>
      </div>
    `;

    li.innerHTML = `
      <input type="checkbox" class="select-task" data-index="${i}">
      <span class="${todo.priority}">${todo.text}</span>
      ${categoryStr} ${dueDateStr} ${reminderStr}
      ${notesStr}
      <div>
        <button class="complete-btn" data-index="${i}">${todo.recurrence !== 'none' ? 'Complete & Update' : (todo.completed ? 'Undo' : 'Complete')}</button>
        <button class="edit-btn" data-index="${i}">Edit</button>
        <button class="delete-btn" data-index="${i}">Delete</button>
      </div>
      <div class="subtasks-container">
        ${subtasksHTML}
      </div>
    `;

    li.addEventListener('dragstart', (e) => {
      draggedTaskIndex = i;
      e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetIndex = parseInt(li.dataset.index);
      if (draggedTaskIndex === null || draggedTaskIndex === targetIndex) return;
      const draggedTask = todos.splice(draggedTaskIndex, 1)[0];
      todos.splice(targetIndex, 0, draggedTask);
      saveTodos();
      renderTodos();
    });

    todoList.appendChild(li);
  });
  renderStats();
  updateProgressBar();
  scheduleReminders();
}

// Add new task
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  const priority = prioritySelect.value;
  const dueDate = dueDateInput.value;
  const category = categoryInput.value.trim();
  const reminder = reminderInput.value;
  const notes = notesInput.value.trim();
  const recurrence = recurrenceSelect.value;
  if (text) {
    todos.push({ text, priority, dueDate, category, reminder, notes, recurrence, completed: false, subtasks: [] });
    input.value = '';
    dueDateInput.value = '';
    categoryInput.value = '';
    reminderInput.value = '';
    notesInput.value = '';
    recurrenceSelect.value = 'none';
    saveTodos();
    renderTodos();
  }
});

// Toggle advanced options
toggleAdvancedBtn.addEventListener('click', () => {
  if (advancedOptions.style.display === 'none') {
    advancedOptions.style.display = 'flex';
    toggleAdvancedBtn.textContent = 'Hide Advanced Options';
  } else {
    advancedOptions.style.display = 'none';
    toggleAdvancedBtn.textContent = 'Show Advanced Options';
  }
});

// Task actions
todoList.addEventListener('click', (e) => {
  const index = e.target.dataset.index;
  if (index === undefined) return;
  if (e.target.classList.contains('complete-btn')) {
    const task = todos[index];
    // For recurring tasks, update due date and do not mark as completed
    if (task.recurrence !== 'none' && !task.completed) {
      task.dueDate = getNextDueDate(task.dueDate, task.recurrence);
      showToast('Recurring task updated for next occurrence');
    } else {
      task.completed = !task.completed;
    }
  } else if (e.target.classList.contains('edit-btn')) {
    editIndex = index;
    const task = todos[index];
    editInput.value = task.text;
    editPriority.value = task.priority;
    editDueDate.value = task.dueDate || '';
    editCategory.value = task.category || '';
    editReminder.value = task.reminder || '';
    editNotes.value = task.notes || '';
    editRecurrence.value = task.recurrence || 'none';
    editModal.style.display = 'block';
  } else if (e.target.classList.contains('delete-btn')) {
    // Save deleted task for undo
    lastDeleted = { index: index, task: todos[index] };
    todos.splice(index, 1);
    saveTodos();
    renderTodos();
    showToast('Task deleted', () => {
      // Undo deletion
      if (lastDeleted) {
        todos.splice(lastDeleted.index, 0, lastDeleted.task);
        saveTodos();
        renderTodos();
        lastDeleted = null;
      }
    });
  }
  saveTodos();
  renderTodos();
});

// Subtask events
todoList.addEventListener('click', (e) => {
  if (e.target.classList.contains('subtask-btn')) {
    const parentIndex = e.target.parentElement.dataset.index;
    const subInput = e.target.previousElementSibling;
    const subText = subInput.value.trim();
    if (subText) {
      if (!todos[parentIndex].subtasks) {
        todos[parentIndex].subtasks = [];
      }
      todos[parentIndex].subtasks.push({ text: subText, completed: false });
      subInput.value = '';
      saveTodos();
      renderTodos();
    }
  }
  if (e.target.classList.contains('subtask-checkbox')) {
    const parent = e.target.dataset.parent;
    const subIndex = e.target.dataset.index;
    todos[parent].subtasks[subIndex].completed = e.target.checked;
    saveTodos();
    renderTodos();
  }
});

// Bulk actions
completeSelectedBtn.addEventListener('click', () => {
  const selected = document.querySelectorAll('.select-task:checked');
  selected.forEach(cb => {
    const i = cb.dataset.index;
    todos[i].completed = true;
  });
  saveTodos();
  renderTodos();
});
deleteSelectedBtn.addEventListener('click', () => {
  const selected = document.querySelectorAll('.select-task:checked');
  const indices = Array.from(selected).map(cb => parseInt(cb.dataset.index)).sort((a, b) => b - a);
  indices.forEach(i => { todos.splice(i, 1); });
  saveTodos();
  renderTodos();
});
clearCompletedBtn.addEventListener('click', () => {
  todos = todos.filter(todo => !todo.completed);
  saveTodos();
  renderTodos();
});

// Search, Filter, and Sort controls
searchInput.addEventListener('input', (e) => {
  currentSearch = e.target.value;
  renderTodos();
});
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTodos();
  });
});
sortSelect.addEventListener('change', (e) => {
  currentSort = e.target.value;
  renderTodos();
});

// Floating Action Button
fabAddTask.addEventListener('click', () => {
  input.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Dark Mode Toggle with persistence
darkModeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', document.body.classList.contains('dark'));
});

// Export tasks
exportBtn.addEventListener('click', () => {
  const dataStr = JSON.stringify(todos, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "tasks.json";
  a.click();
  URL.revokeObjectURL(url);
});

// Import tasks
importBtn.addEventListener('click', () => {
  importFileInput.click();
});
importFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const importedTodos = JSON.parse(evt.target.result);
      if (Array.isArray(importedTodos)) {
        todos = importedTodos;
        saveTodos();
        renderTodos();
      } else {
        alert("Invalid file format");
      }
    } catch (error) {
      alert("Error parsing file");
    }
  };
  reader.readAsText(file);
});

// Modal for editing tasks
closeModal.addEventListener('click', () => {
  editModal.style.display = 'none';
});
window.addEventListener('click', (e) => {
  if (e.target === editModal) {
    editModal.style.display = 'none';
  }
});
editForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (editIndex !== null) {
    todos[editIndex].text = editInput.value.trim();
    todos[editIndex].priority = editPriority.value;
    todos[editIndex].dueDate = editDueDate.value;
    todos[editIndex].category = editCategory.value.trim();
    todos[editIndex].reminder = editReminder.value;
    todos[editIndex].notes = editNotes.value.trim();
    todos[editIndex].recurrence = editRecurrence.value;
    saveTodos();
    renderTodos();
    editModal.style.display = 'none';
  }
});

// Initial render
renderTodos();
