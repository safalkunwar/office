import { db, auth } from '../firebase-init.js';
import { ref, push, set, get, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";

class DailyActivities {
    constructor() {
        this.init();
    }

    init() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.userId = user.uid;
                this.loadActivities();
                this.setupListeners();
            } else {
                window.location.href = '../../login.html';
            }
        });
    }

    setupListeners() {
        // Log Activity Form
        const activityForm = document.getElementById('logActivityForm');
        if (activityForm) {
            activityForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.logActivity(new FormData(activityForm));
                activityForm.reset();
                this.loadActivities();
            });
        }

        // Quick Visitor Form
        const visitorForm = document.getElementById('quickVisitorForm');
        if (visitorForm) {
            visitorForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.addVisitor(new FormData(visitorForm));
                visitorForm.reset();
                alert('Visitor added successfully!');
                this.loadActivities(); // Reload to show the new visitor in timeline
            });
        }
    }

    async logActivity(formData) {
        const activityData = {
            type: formData.get('type'),
            description: formData.get('description'),
            timestamp: Date.now(),
            userId: this.userId
        };

        const newRef = push(ref(db, 'daily_logs'));
        await set(newRef, activityData);
    }

    async addVisitor(formData) {
        const visitorData = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            purpose: formData.get('purpose'),
            checkInTime: Date.now(),
            status: 'checked-in',
            registeredBy: this.userId
        };

        const newRef = push(ref(db, 'visitors'));
        await set(newRef, visitorData);

        // Also log this as an activity
        await this.logActivity(new FormData(), {
            type: 'Visitor',
            description: `Registered visitor: ${visitorData.name}`,
            timestamp: Date.now(),
            userId: this.userId
        });
    }

    async loadActivities() {
        const container = document.getElementById('activityTimeline');
        container.innerHTML = '<div class="text-center">Loading...</div>';

        // Fetch recent logs (demo: fetch last 20)
        const logsQuery = query(ref(db, 'daily_logs'), limitToLast(20));
        const snapshot = await get(logsQuery);
        
        if (snapshot.exists()) {
            const logs = [];
            snapshot.forEach(child => {
                logs.push({ id: child.key, ...child.val() });
            });

            // Sort by timestamp desc
            logs.sort((a, b) => b.timestamp - a.timestamp);

            container.innerHTML = logs.map(log => `
                <div class="timeline-item">
                    <div class="timeline-icon ${this.getIconClass(log.type)}">
                        <i class="${this.getIcon(log.type)}"></i>
                    </div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <span class="timeline-type">${log.type}</span>
                            <span class="timeline-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p>${log.description}</p>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="text-center text-muted">No activities logged today.</div>';
        }
    }

    getIcon(type) {
        switch(type) {
            case 'Call': return 'fas fa-phone';
            case 'Meeting': return 'fas fa-users';
            case 'Email': return 'fas fa-envelope';
            case 'Visitor': return 'fas fa-user-clock';
            default: return 'fas fa-tasks';
        }
    }

    getIconClass(type) {
        switch(type) {
            case 'Call': return 'bg-info';
            case 'Meeting': return 'bg-warning';
            case 'Email': return 'bg-primary';
            case 'Visitor': return 'bg-success';
            default: return 'bg-secondary';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DailyActivities();
});
