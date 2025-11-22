import { db, auth } from '../firebase-init.js';
import { ref, get, query, orderByChild, equalTo, limitToLast } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";

class EmployeeDashboard {
    constructor() {
        this.init();
    }

    init() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.loadStats(user.uid);
                this.loadRecentLeads();
                this.loadTasks(user.uid);
            } else {
                window.location.href = '../../login.html';
            }
        });
    }

    async loadStats(userId) {
        // Placeholder stats - in real app, query DB
        // For now, we'll just set some demo numbers or fetch if available
        
        // Example: Fetch total leads assigned to this employee
        // const leadsRef = query(ref(db, 'leads'), orderByChild('assignedTo'), equalTo(userId));
        // const snapshot = await get(leadsRef);
        // const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        
        document.getElementById('totalLeads').textContent = '12'; // Demo
        document.getElementById('activeApplications').textContent = '5'; // Demo
        document.getElementById('pendingTasks').textContent = '3'; // Demo
        document.getElementById('conversionRate').textContent = '15%'; // Demo
    }

    async loadRecentLeads() {
        const container = document.getElementById('recentLeadsList');
        // Demo data
        const leads = [
            { name: 'John Doe', interest: 'USA', status: 'Hot', date: new Date().toLocaleDateString() },
            { name: 'Jane Smith', interest: 'UK', status: 'Warm', date: new Date().toLocaleDateString() },
            { name: 'Mike Ross', interest: 'Canada', status: 'New', date: new Date().toLocaleDateString() }
        ];

        container.innerHTML = leads.map(lead => `
            <div class="activity-item">
                <div class="activity-icon"><i class="fas fa-user"></i></div>
                <div class="activity-details">
                    <h4>${lead.name}</h4>
                    <p>Interested in ${lead.interest} • <span class="status-badge ${lead.status.toLowerCase()}">${lead.status}</span></p>
                </div>
                <div class="activity-time">${lead.date}</div>
            </div>
        `).join('');
    }

    async loadTasks(userId) {
        const container = document.getElementById('tasksList');
        // Demo data
        const tasks = [
            { title: 'Call John regarding visa', due: 'Today', priority: 'High' },
            { title: 'Email University of Toronto', due: 'Tomorrow', priority: 'Medium' },
            { title: 'Update Jane\'s application', due: 'Aug 25', priority: 'Low' }
        ];

        container.innerHTML = tasks.map(task => `
            <div class="task-item">
                <div class="task-checkbox">
                    <input type="checkbox">
                </div>
                <div class="task-content">
                    <h4>${task.title}</h4>
                    <div class="task-meta">
                        <span class="priority ${task.priority.toLowerCase()}">${task.priority}</span>
                        <span class="due-date">${task.due}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new EmployeeDashboard();
});