import { db, auth } from './firebase-init.js';
import { ref, get, set, push, query, orderByChild, equalTo, startAt, endAt } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

export class AttendanceSystem {
    constructor() {
        this.db = db;
        this.auth = auth;
    }

    /**
     * Get attendance for a student
     * @param {string} studentId 
     * @param {string} month (optional, format 'YYYY-MM')
     * @returns {Promise<Array>}
     */
    async getAttendance(studentId, month = null) {
        const attRef = ref(this.db, `attendance/${studentId}`);
        let q = query(attRef, orderByChild('date'));

        if (month) {
            const start = `${month}-01`;
            const end = `${month}-31`;
            q = query(attRef, orderByChild('date'), startAt(start), endAt(end));
        }

        const snapshot = await get(q);
        if (snapshot.exists()) {
            const records = [];
            snapshot.forEach((child) => {
                records.push({ id: child.key, ...child.val() });
            });
            return records.reverse(); // Newest first
        }
        return [];
    }

    /**
     * Mark attendance (Admin/Instructor)
     * @param {string} studentId 
     * @param {string} date 'YYYY-MM-DD'
     * @param {string} status 'present', 'absent', 'late'
     * @param {string} remarks 
     */
    async markAttendance(studentId, date, status, remarks = '') {
        // Check permissions (omitted for brevity, handled by Rules)
        const attRef = ref(this.db, `attendance/${studentId}`);
        const newRecordRef = push(attRef);
        await set(newRecordRef, {
            date: date,
            status: status,
            remarks: remarks,
            markedBy: this.auth.currentUser.uid,
            timestamp: Date.now()
        });
    }
}

export class AttendanceUI {
    constructor() {
        this.system = new AttendanceSystem();
    }

    async loadStudentAttendance(studentId, tableId) {
        const tbody = document.getElementById(tableId);
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

        try {
            const records = await this.system.getAttendance(studentId);
            this.renderTable(records, tbody);
            this.updateStats(records);
        } catch (error) {
            console.error("Error loading attendance:", error);
            tbody.innerHTML = '<tr><td colspan="5" class="text-center error">Failed to load attendance</td></tr>';
        }
    }

    renderTable(records, tbody) {
        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No attendance records found</td></tr>';
            return;
        }

        tbody.innerHTML = records.map(r => `
            <tr>
                <td>${new Date(r.date).toLocaleDateString()}</td>
                <td><span class="status-badge ${r.status}">${r.status}</span></td>
                <td>${r.in || '-'}</td>
                <td>${r.out || '-'}</td>
                <td>${r.remarks || '-'}</td>
            </tr>
        `).join('');
    }

    updateStats(records) {
        const total = records.length;
        const present = records.filter(r => r.status === 'present').length;
        const late = records.filter(r => r.status === 'late').length;
        const absent = records.filter(r => r.status === 'absent').length;

        const update = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        update('totalDays', total);
        update('presentDays', present);
        update('lateDays', late);
        update('absentDays', absent);
        
        // Calculate percentage
        const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
        update('attendancePercentage', `${percentage}%`);
    }
}
