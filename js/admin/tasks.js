import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    push,
    onValue,
    update,
    remove,
    get 
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { auth } from '../config/firebase.js';
import { firebaseConfig } from '../config/firebase.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Modal Functions
window.openAddTaskModal = function() {
    document.getElementById('addTaskModal').style.display = 'block';
    loadEmployeesForTaskAssignment();
};

window.closeModal = function() {
    document.getElementById('addTaskModal').style.display = 'none';
};

// Load employees for task assignment
async function loadEmployeesForTaskAssignment() {
    const assignedToSelect = document.getElementById('assignedTo');
    if (!assignedToSelect) return;

    try {
        const employeesRef = ref(db, 'employees');
        const snapshot = await get(employeesRef);
        
        // Clear existing options
        assignedToSelect.innerHTML = '<option value="">Select Employee</option>';
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const employee = childSnapshot.val();
                const option = document.createElement('option');
                option.value = employee.email; // Using email as value
                option.textContent = `${employee.name} (${employee.role})`;
                assignedToSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading employees:', error);
        alert('Error loading employees. Please try again.');
    }
}

// Add Task Function
async function addTask(e) {
    e.preventDefault();
    
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const assignedTo = document.getElementById('assignedTo').value;
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('dueDate').value;

    try {
        const taskRef = ref(db, 'tasks');
        await push(taskRef, {
            title,
            description,
            assignedTo,
            priority,
            dueDate,
            status: 'pending',
            createdAt: new Date().toISOString(),
            createdBy: auth.currentUser.uid
        });

        // Log activity
        await logActivity('task_created', `New task created: ${title}`);

        closeModal();
        document.getElementById('addTaskForm').reset();
        alert('Task added successfully!');
        
        // Refresh task list if implemented
        loadTasks();
    } catch (error) {
        console.error('Error adding task:', error);
        alert('Error adding task. Please try again.');
    }
}

// Load Tasks
async function loadTasks() {
    const tasksContainer = document.querySelector('.tasks-container');
    const tasksRef = ref(db, 'tasks');
    
    onValue(tasksRef, (snapshot) => {
        let html = '';
        snapshot.forEach((childSnapshot) => {
            const task = childSnapshot.val();
            html += `
                <div class="task-card ${task.priority.toLowerCase()}">
                    <div class="task-header">
                        <h3>${task.title}</h3>
                        <span class="priority-badge">${task.priority}</span>
                    </div>
                    <div class="task-body">
                        <p>${task.description}</p>
                        <div class="task-meta">
                            <span><i class="fas fa-user"></i> ${task.assignedTo}</span>
                            <span><i class="fas fa-calendar"></i> ${new Date(task.dueDate).toLocaleDateString()}</span>
                            <span><i class="fas fa-flag"></i> ${task.status}</span>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="btn btn-small" onclick="editTask('${childSnapshot.key}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-small btn-danger" onclick="deleteTask('${childSnapshot.key}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        tasksContainer.innerHTML = html || '<p>No tasks found.</p>';
    });
}

// Log Activity
async function logActivity(type, description) {
    try {
        const activityRef = ref(db, 'activities');
        await push(activityRef, {
            type,
            description,
            timestamp: new Date().toISOString(),
            userId: auth.currentUser.uid
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Delete Task
window.deleteTask = async function(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        try {
            await remove(ref(db, `tasks/${taskId}`));
            alert('Task deleted successfully!');
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Error deleting task. Please try again.');
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Add form submit event listener
    const addTaskForm = document.getElementById('addTaskForm');
    if (addTaskForm) {
        addTaskForm.addEventListener('submit', addTask);
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };

    // Load initial data
    loadTasks();
});