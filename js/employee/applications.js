import { db, auth } from '../firebase-init.js';
import { ref, get, query, orderByChild } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";

class ApplicationManager {
    constructor() {
        this.init();
    }

    init() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.loadApplications();
            } else {
                window.location.href = '../../login.html';
            }
        });
    }

    async loadApplications() {
        const container = document.getElementById('applicationsBoard');
        // Demo columns
        const stages = ['Counseling', 'Applied', 'Offer Received', 'Visa Applied', 'Visa Granted'];
        
        // Fetch applications (mock data for structure)
        const apps = [
            { student: 'John Doe', university: 'Harvard', stage: 'Applied' },
            { student: 'Jane Smith', university: 'Oxford', stage: 'Offer Received' },
            { student: 'Mike Ross', university: 'Toronto', stage: 'Counseling' }
        ];

        container.innerHTML = stages.map(stage => `
            <div class="kanban-column">
                <div class="kanban-header">
                    <h3>${stage}</h3>
                    <span class="count">${apps.filter(a => a.stage === stage).length}</span>
                </div>
                <div class="kanban-items">
                    ${apps.filter(a => a.stage === stage).map(app => `
                        <div class="kanban-card">
                            <h4>${app.student}</h4>
                            <p>${app.university}</p>
                            <div class="card-actions">
                                <button class="btn-xs">View</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ApplicationManager();
});
