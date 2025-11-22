class EmployeeNavbar extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.innerHTML = `
        <nav class="top-navbar">
            <div class="nav-container">
                <div class="nav-brand">
                    <i class="fas fa-briefcase"></i>
                    <span>Employee Portal</span>
                </div>
                <ul class="nav-links">
                    <li><a href="dashboard.html" class="${this.isActive('dashboard.html')}"><i class="fas fa-home"></i> Dashboard</a></li>
                    <li><a href="leads.html" class="${this.isActive('leads.html')}"><i class="fas fa-user-plus"></i> Leads</a></li>
                    <li><a href="students.html" class="${this.isActive('students.html')}"><i class="fas fa-user-graduate"></i> Students</a></li>
                    <li><a href="applications.html" class="${this.isActive('applications.html')}"><i class="fas fa-file-import"></i> Applications</a></li>
                    <li><a href="universities.html" class="${this.isActive('universities.html')}"><i class="fas fa-university"></i> Universities</a></li>
                    <li><a href="visa-tracker.html" class="${this.isActive('visa-tracker.html')}"><i class="fas fa-passport"></i> Visa Tracker</a></li>
                    <li><a href="documents.html" class="${this.isActive('documents.html')}"><i class="fas fa-folder-open"></i> Docs</a></li>
                    <li><a href="attendance.html" class="${this.isActive('attendance.html')}"><i class="fas fa-calendar-check"></i> Attendance</a></li>
                    <li><a href="daily-activities.html" class="${this.isActive('daily-activities.html')}"><i class="fas fa-clipboard-list"></i> Daily Log</a></li>
                    <li><a href="messages.html" class="${this.isActive('messages.html')}"><i class="fas fa-comment-alt"></i> Messages</a></li>
                    <li><a href="tasks.html" class="${this.isActive('tasks.html')}"><i class="fas fa-tasks"></i> Tasks</a></li>
                </ul>
                <div class="nav-user">
                    <span class="user-name" id="navUserName">Employee</span>
                    <button id="logoutBtn" class="logout-btn" title="Logout">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </div>
        </nav>
        `;

        this.setupLogout();
        this.loadUserProfile();
    }

    isActive(page) {
        return window.location.pathname.includes(page) ? 'active' : '';
    }

    setupLogout() {
        const btn = this.querySelector('#logoutBtn');
        if (btn) {
            btn.addEventListener('click', async () => {
                const { auth } = await import('../firebase-init.js');
                try {
                    await auth.signOut();
                    window.location.href = '../../index.html';
                } catch (error) {
                    console.error('Logout failed:', error);
                }
            });
        }
    }

    async loadUserProfile() {
        const { auth, db } = await import('../firebase-init.js');
        const { ref, get } = await import("https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js");
        const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js");

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const nameEl = this.querySelector('#navUserName');
                if (nameEl) {
                    const userRef = ref(db, `users/${user.uid}`);
                    const snapshot = await get(userRef);
                    if (snapshot.exists()) {
                        nameEl.textContent = snapshot.val().name || user.email.split('@')[0];
                    } else {
                        nameEl.textContent = user.email.split('@')[0];
                    }
                }
            }
        });
    }
}

customElements.define('employee-navbar', EmployeeNavbar);
