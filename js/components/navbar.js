export class AdminNavbar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <nav class="admin-navbar">
                <div class="navbar-left">
                    <div class="logo">
                        <h2><i class="fas fa-graduation-cap"></i> Admin Panel</h2>
                    </div>
                </div>
                <div class="navbar-right">
                    <ul>
                        <li><a href="dashboard.html" class="${this.isActive('dashboard.html')}"><i class="fas fa-home"></i> Dashboard</a></li>
                        <li><a href="students.html" class="${this.isActive('students.html')}"><i class="fas fa-users"></i> Students</a></li>
                        <li><a href="exams.html" class="${this.isActive('exams.html')}"><i class="fas fa-file-alt"></i> Exams</a></li>
                        <li><a href="applications.html" class="${this.isActive('applications.html')}"><i class="fas fa-university"></i> Applications</a></li>
                        <li><a href="documents.html" class="${this.isActive('documents.html')}"><i class="fas fa-folder"></i> Documents</a></li>
                        <li><a href="messages.html" class="${this.isActive('messages.html')}"><i class="fas fa-envelope"></i> Messages</a></li>
                        <li><a href="tasks.html" class="${this.isActive('tasks.html')}"><i class="fas fa-tasks"></i> Tasks</a></li>
                        <li><a href="security.html" class="${this.isActive('security.html')}"><i class="fas fa-shield-alt"></i> Security</a></li>
                        <li><a href="reports.html" class="${this.isActive('reports.html')}"><i class="fas fa-chart-bar"></i> Reports</a></li>
                        <li><a href="instructors.html" class="${this.isActive('instructors.html')}"><i class="fas fa-chalkboard-teacher"></i> Instructors</a></li>
                        <li><a href="employees.html" class="${this.isActive('employees.html')}"><i class="fas fa-user-tie"></i> Employees</a></li>
                    </ul>
                </div>
            </nav>
        `;
    }

    isActive(page) {
        const path = window.location.pathname;
        if (page === 'dashboard.html' && (path.endsWith('/') || path.endsWith('admin/'))) return 'active';
        return path.includes(page) ? 'active' : '';
    }
}

customElements.define('admin-navbar', AdminNavbar);
