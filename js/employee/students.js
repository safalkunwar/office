import { db, auth } from '../firebase-init.js';
import { ref, get, query, orderByChild } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";

class StudentManager {
    constructor() {
        this.init();
    }

    init() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.loadStudents();
            } else {
                window.location.href = '../../login.html';
            }
        });
    }

    async loadStudents() {
        const container = document.getElementById('studentsTableBody');
        container.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

        const snapshot = await get(ref(db, 'students'));
        
        if (snapshot.exists()) {
            const students = [];
            snapshot.forEach(child => {
                students.push({ id: child.key, ...child.val() });
            });

            this.renderStudents(students);
        } else {
            container.innerHTML = '<tr><td colspan="5" class="text-center">No students found.</td></tr>';
        }
    }

    renderStudents(students) {
        const container = document.getElementById('studentsTableBody');
        container.innerHTML = students.map(student => `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar">${student.name.charAt(0)}</div>
                        <div>
                            <div class="font-bold">${student.name}</div>
                            <div class="text-muted text-sm">${student.email}</div>
                        </div>
                    </div>
                </td>
                <td>${student.phone || '-'}</td>
                <td>${student.course || 'N/A'}</td>
                <td><span class="status-badge success">Active</span></td>
                <td>
                    <button class="btn-sm btn-outline" onclick="window.viewStudent('${student.id}')">View Profile</button>
                </td>
            </tr>
        `).join('');
    }
}

// Global function for view student button
window.viewStudent = (studentId) => {
    alert(`Student Profile Modal\n\nStudent ID: ${studentId}\n\n(Full profile modal coming soon with:\n- Academic history\n- Test scores\n- Assigned universities\n- Documents\n- Application status)`);
};

document.addEventListener('DOMContentLoaded', () => {
    new StudentManager();
});
