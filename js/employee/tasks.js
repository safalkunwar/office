import { db, auth } from '../firebase-init.js';
import { ref, push, set, get, query, orderByChild, equalTo, update, remove } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";

class TaskManager {
    constructor() {
        this.init();
    }

    init() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.userId = user.uid;
                this.loadTasks();
                this.setupListeners();
            } else {
                window.location.href = '../../login.html';
            }
        });
    }

    setupListeners() {
        const form = document.getElementById('addTaskForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.addTask(new FormData(form));
                form.reset();
                this.loadTasks();
            });
        }
    }

    async addTask(formData) {
        const taskData = {
            title: formData.get('title'),
            dueDate: formData.get('dueDate'),
            priority: formData.get('priority'),
            status: 'pending',
            assignedTo: this.userId,
            createdAt: Date.now()
        };

        const newRef = push(ref(db, 'tasks'));
        await set(newRef, taskData);
    }

    async loadTasks() {
        const container = document.getElementById('tasksList');
        container.innerHTML = '<div class="text-center">Loading...</div>';

        // Query by assignedTo
        // const q = query(ref(db, 'tasks'), orderByChild('assignedTo'), equalTo(this.userId));
        const snapshot = await get(ref(db, 'tasks')); // Fetching all for demo
        
        if (snapshot.exists()) {
            const tasks = [];
            snapshot.forEach(child => {
                const val = child.val();
                if (val.assignedTo === this.userId || !val.assignedTo) {
                    tasks.push({ id: child.key, ...val });
                }
            });

            if (tasks.length === 0) {
                container.innerHTML = '<div class="text-center text-muted">No tasks found.</div>';
                return;
            }

            container.innerHTML = tasks.map(task => `
                <div class="task-item ${task.status}">
                    <div class="task-checkbox">
                        <input type="checkbox" ${task.status === 'completed' ? 'checked' : ''} 
                               onchange="window.toggleTask('${task.id}', this.checked)">
                    </div>
                    <div class="task-content">
                        <h4>${task.title}</h4>
                        <div class="task-meta">
                            <span class="priority ${task.priority.toLowerCase()}">${task.priority}</span>
                            <span class="due-date"><i class="far fa-calendar"></i> ${task.dueDate}</span>
                        </div>
                    </div>
                    <button class="btn-icon text-danger" onclick="window.deleteTask('${task.id}')"><i class="fas fa-trash"></i></button>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="text-center text-muted">No tasks found.</div>';
        }
    }
}

// Global helpers
window.toggleTask = async (id, checked) => {
    const { db } = await import('../firebase-init.js');
    const { ref, update } = await import("https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js");
    await update(ref(db, `tasks/${id}`), { status: checked ? 'completed' : 'pending' });
};

window.deleteTask = async (id) => {
    if(!confirm('Delete task?')) return;
    const { db } = await import('../firebase-init.js');
    const { ref, remove } = await import("https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js");
    await remove(ref(db, `tasks/${id}`));
    document.location.reload(); // Simple reload for demo
};

document.addEventListener('DOMContentLoaded', () => {
    new TaskManager();
});
