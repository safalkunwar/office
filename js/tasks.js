import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, get, onValue, push, set, remove, update, query, orderByChild } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { firebaseConfig } from './config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// DOM Elements
const tasksList = document.getElementById('tasksList');
const createTaskModal = document.getElementById('createTaskModal');
const createTaskForm = document.getElementById('createTaskForm');
const searchInput = document.querySelector('.search-box input');
const priorityFilter = document.getElementById('priorityFilter');
const statusFilter = document.getElementById('statusFilter');

// Theme Management
const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = themeToggle.querySelector('i');

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeIcon.classList.replace('fa-moon', 'fa-sun');
}

// Theme Toggle Functionality
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    if (isDarkMode) {
        themeIcon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        themeIcon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'light');
    }
});

// Mobile Menu Toggle
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navMenu = document.querySelector('.navbar-right ul');

mobileMenuBtn.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    const isExpanded = navMenu.classList.contains('active');
    mobileMenuBtn.setAttribute('aria-expanded', isExpanded);
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        navMenu.classList.remove('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
    }
});

// Modal Functions
function openCreateTaskModal() {
    createTaskModal.style.display = 'flex';
}

function closeCreateTaskModal() {
    createTaskModal.style.display = 'none';
    createTaskForm.reset();
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === createTaskModal) {
        closeCreateTaskModal();
    }
});

// Form Submission
createTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const taskData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        priority: document.getElementById('taskPriority').value,
        dueDate: document.getElementById('taskDueDate').value,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        // Show loading state
        const submitBtn = createTaskForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;

        const tasksRef = ref(db, 'tasks');
        const newTaskRef = push(tasksRef);
        await set(newTaskRef, taskData);
        
        showSuccess('Task created successfully!');
        closeCreateTaskModal();
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    } catch (error) {
        showError('Failed to create task. Please try again.');
        console.error('Error creating task:', error);
        
        // Reset button
        const submitBtn = createTaskForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Create Task';
        submitBtn.disabled = false;
    }
});

// Load and Display Tasks
function loadTasks() {
    const tasksRef = ref(db, 'tasks');
    onValue(tasksRef, (snapshot) => {
        tasksList.innerHTML = '';
        
        if (snapshot.exists()) {
            const tasks = [];
            snapshot.forEach((childSnapshot) => {
                tasks.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Sort by due date (earliest first)
            tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            
            displayTasks(tasks);
        } else {
            tasksList.innerHTML = '<tr><td colspan="7" class="no-data">No tasks found</td></tr>';
        }
    });
}

// Display Tasks
function displayTasks(tasks) {
    tasksList.innerHTML = '';
    
    tasks.forEach(task => {
        const row = document.createElement('tr');
        const dueDate = new Date(task.dueDate).toLocaleDateString();
        const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';
        
        row.innerHTML = `
            <td>${task.id.substring(0, 8)}</td>
            <td>
                <div class="task-info">
                    <strong>${task.title}</strong>
                    <small>${task.description}</small>
                </div>
            </td>
            <td><span class="priority-badge ${task.priority.toLowerCase()}">${task.priority}</span></td>
            <td><span class="status-badge ${task.status}">${task.status}</span></td>
            <td class="${isOverdue ? 'overdue' : ''}">${dueDate}</td>
            <td>
                <button class="btn-icon" onclick="toggleTaskStatus('${task.id}', '${task.status}')" aria-label="Toggle task status">
                    <i class="fas fa-${task.status === 'completed' ? 'undo' : 'check'}"></i>
                </button>
                <button class="btn-icon" onclick="viewTask('${task.id}')" aria-label="View task">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" onclick="editTask('${task.id}')" aria-label="Edit task">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="deleteTask('${task.id}')" aria-label="Delete task">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tasksList.appendChild(row);
    });
}

// Toggle Task Status
async function toggleTaskStatus(taskId, currentStatus) {
    try {
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
        const taskRef = ref(db, `tasks/${taskId}`);
        await update(taskRef, {
            status: newStatus,
            updatedAt: new Date().toISOString()
        });
        showSuccess(`Task ${newStatus === 'completed' ? 'completed' : 'reopened'} successfully!`);
    } catch (error) {
        showError('Failed to update task status. Please try again.');
        console.error('Error updating task:', error);
    }
}

// Filter Tasks
function filterTasks() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedPriority = priorityFilter.value;
    const selectedStatus = statusFilter.value;
    
    const rows = tasksList.getElementsByTagName('tr');
    Array.from(rows).forEach(row => {
        const cells = row.getElementsByTagName('td');
        if (cells.length < 6) return; // Skip header or empty rows
        
        const taskTitle = cells[1].textContent.toLowerCase();
        const priority = cells[2].querySelector('.priority-badge')?.textContent || '';
        const status = cells[3].querySelector('.status-badge')?.textContent || '';
        
        const matchesSearch = taskTitle.includes(searchTerm);
        const matchesPriority = selectedPriority === 'all' || priority === selectedPriority;
        const matchesStatus = selectedStatus === 'all' || status === selectedStatus;
        
        row.style.display = matchesSearch && matchesPriority && matchesStatus ? '' : 'none';
    });
}

// Event Listeners for Filters
searchInput.addEventListener('input', filterTasks);
priorityFilter.addEventListener('change', filterTasks);
statusFilter.addEventListener('change', filterTasks);

// Utility Functions
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message visible';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.querySelector('.content').prepend(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message visible';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    document.querySelector('.content').prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

// View Task
async function viewTask(id) {
    try {
        const taskRef = ref(db, `tasks/${id}`);
        const snapshot = await get(taskRef);
        
        if (snapshot.exists()) {
            const task = snapshot.val();
            const dueDate = new Date(task.dueDate).toLocaleDateString();
            alert(`Task Details:\nTitle: ${task.title}\nDescription: ${task.description}\nPriority: ${task.priority}\nStatus: ${task.status}\nDue Date: ${dueDate}`);
        } else {
            showError('Task not found.');
        }
    } catch (error) {
        showError('Failed to load task details.');
        console.error('Error viewing task:', error);
    }
}

// Edit Task
async function editTask(id) {
    try {
        const taskRef = ref(db, `tasks/${id}`);
        const snapshot = await get(taskRef);
        
        if (snapshot.exists()) {
            const task = snapshot.val();
            // You can implement an edit modal here
            showSuccess('Edit functionality coming soon!');
        } else {
            showError('Task not found.');
        }
    } catch (error) {
        showError('Failed to load task for editing.');
        console.error('Error editing task:', error);
    }
}

// Delete Task
async function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
        try {
            const taskRef = ref(db, `tasks/${id}`);
            await remove(taskRef);
            showSuccess('Task deleted successfully!');
        } catch (error) {
            showError('Failed to delete task. Please try again.');
            console.error('Error deleting task:', error);
        }
    }
}

// Make functions globally available
window.openCreateTaskModal = openCreateTaskModal;
window.closeCreateTaskModal = closeCreateTaskModal;
window.toggleTaskStatus = toggleTaskStatus;
window.viewTask = viewTask;
window.editTask = editTask;
window.deleteTask = deleteTask;

// Initialize App
function initApp() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('userName').textContent = user.displayName || 'Admin';
            loadTasks();
        } else {
            window.location.href = '../login.html';
        }
    });
}

document.addEventListener('DOMContentLoaded', initApp); 