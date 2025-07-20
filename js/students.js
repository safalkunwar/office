import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, get, onValue, push, set, remove, update, query, orderByChild } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { firebaseConfig } from './config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// DOM Elements
const studentsList = document.getElementById('studentsList');
const createStudentModal = document.getElementById('createStudentModal');
const createStudentForm = document.getElementById('createStudentForm');
const searchInput = document.querySelector('.search-box input');
const courseFilter = document.getElementById('courseFilter');
const statusFilter = document.getElementById('statusFilter');
const categoryFilter = document.getElementById('categoryFilter');

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
function openCreateStudentModal() {
    createStudentModal.style.display = 'flex';
}

function closeCreateStudentModal() {
    createStudentModal.style.display = 'none';
    createStudentForm.reset();
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === createStudentModal) {
        closeCreateStudentModal();
    }
});

// Form Submission
const studentCategoryInput = document.getElementById('studentCategory');
if (createStudentForm && studentCategoryInput) {
createStudentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentData = {
        name: document.getElementById('studentName').value,
        email: document.getElementById('studentEmail').value,
        phone: document.getElementById('studentPhone').value,
        course: document.getElementById('studentCourse').value,
      category: studentCategoryInput.value,
        startDate: document.getElementById('startDate').value,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    try {
        const submitBtn = createStudentForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;
        const studentsRef = ref(db, 'students');
        const newStudentRef = push(studentsRef);
        await set(newStudentRef, studentData);
        showSuccess('Student created successfully!');
        closeCreateStudentModal();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    } catch (error) {
        showError('Failed to create student. Please try again.');
        const submitBtn = createStudentForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Create Student';
        submitBtn.disabled = false;
    }
});
}

// Attendance System Variables
let attendanceData = {}; // { studentId: { 'YYYY-MM-DD': { status: 'present'|'absent', note: '...' } } }
let studentsCache = [];
let attendanceCourseFilter = 'all';
let ieltsCount = 0;
let pteCount = 0;

// Attendance UI Elements
const attendanceDateInput = document.getElementById('attendanceDate');
const attendanceMarkingTable = document.getElementById('attendanceMarkingTable');
const markAllPresentBtn = document.getElementById('markAllPresentBtn');
const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');
const attendanceSaveStatus = document.getElementById('attendanceSaveStatus');
const lowAttendanceList = document.getElementById('lowAttendanceList');
const lowAttendanceThreshold = 75;

const ieltsCard = document.getElementById('ieltsCard');
const pteCard = document.getElementById('pteCard');
const ieltsCountDiv = document.getElementById('ieltsCount');
const pteCountDiv = document.getElementById('pteCount');
const attendanceFilterBtns = document.querySelectorAll('.attendance-filter-btn');
let lowAttendanceChartInstance = null;

attendanceFilterBtns.forEach(btn => {
  btn.addEventListener('click', function() {
    attendanceCourseFilter = this.getAttribute('data-course');
    attendanceFilterBtns.forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    renderAttendanceMarkingTable();
  });
});
if (ieltsCard) ieltsCard.onclick = () => {
  attendanceCourseFilter = 'ielts';
  attendanceFilterBtns.forEach(b => b.classList.remove('active'));
  document.querySelector('.attendance-filter-btn[data-course="ielts"]').classList.add('active');
  renderAttendanceMarkingTable();
};
if (pteCard) pteCard.onclick = () => {
  attendanceCourseFilter = 'pte';
  attendanceFilterBtns.forEach(b => b.classList.remove('active'));
  document.querySelector('.attendance-filter-btn[data-course="pte"]').classList.add('active');
  renderAttendanceMarkingTable();
};

const attendanceCategoryFilterBtns = document.querySelectorAll('.attendance-category-filter-btn');
let attendanceCategoryFilter = 'all';
attendanceCategoryFilterBtns.forEach(btn => {
  btn.addEventListener('click', function() {
    attendanceCategoryFilter = this.getAttribute('data-category');
    attendanceCategoryFilterBtns.forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    renderAttendanceMarkingTable();
  });
});

// Add event listener for attendanceCategoryFilter
const attendanceCategoryFilterSelect = document.getElementById('attendanceCategoryFilter');
if (attendanceCategoryFilterSelect) {
  attendanceCategoryFilterSelect.addEventListener('change', function() {
    attendanceCategoryFilter = this.value;
    renderAttendanceMarkingTable();
    renderLowAttendanceChart();
  });
}

// Set default date to today
if (attendanceDateInput) {
  const today = new Date().toISOString().slice(0, 10);
  attendanceDateInput.value = today;
  attendanceDateInput.max = today;
}

// Fetch and display attendance when students are loaded or date changes
if (attendanceDateInput) {
  attendanceDateInput.addEventListener('change', () => {
    renderAttendanceMarkingTable();
  });
}
if (markAllPresentBtn) {
  markAllPresentBtn.addEventListener('click', () => {
    const date = attendanceDateInput.value;
    studentsCache.forEach(s => {
      if (!attendanceData[s.id]) attendanceData[s.id] = {};
      attendanceData[s.id][date] = { status: 'present', note: '' };
    });
    renderAttendanceMarkingTable();
  });
}
if (saveAttendanceBtn) {
  saveAttendanceBtn.addEventListener('click', saveAttendanceForDate);
}

const attendancePeriodSelect = document.getElementById('attendancePeriod');
const attendanceStartTime = document.getElementById('attendanceStartTime');
const attendanceEndTime = document.getElementById('attendanceEndTime');
let attendancePeriod = 'day';
let attendancePeriodKey = '';

if (attendancePeriodSelect) {
  attendancePeriodSelect.addEventListener('change', function() {
    attendancePeriod = this.value;
    if (attendancePeriod === 'custom') {
      attendanceStartTime.style.display = '';
      attendanceEndTime.style.display = '';
    } else {
      attendanceStartTime.style.display = 'none';
      attendanceEndTime.style.display = 'none';
    }
    renderAttendanceMarkingTable();
  });
}
if (attendanceStartTime) attendanceStartTime.addEventListener('change', renderAttendanceMarkingTable);
if (attendanceEndTime) attendanceEndTime.addEventListener('change', renderAttendanceMarkingTable);

function getAttendancePeriodKey() {
  const date = attendanceDateInput.value;
  if (attendancePeriod === 'day') return date + '_day';
  if (attendancePeriod === 'morning') return date + '_morning';
  if (attendancePeriod === 'custom') {
    const start = attendanceStartTime.value;
    const end = attendanceEndTime.value;
    if (start && end) return date + '_' + start.replace(':','') + '-' + end.replace(':','');
    return date + '_custom';
  }
  return date;
}

// Load and Display Students with Attendance
function loadStudents() {
    const studentsRef = ref(db, 'students');
    onValue(studentsRef, (snapshot) => {
        studentsList.innerHTML = '';
        studentsCache = [];
        attendanceData = {};
        ieltsCount = 0;
        pteCount = 0;
        if (snapshot.exists()) {
            const students = [];
            snapshot.forEach((childSnapshot) => {
                const student = { id: childSnapshot.key, ...childSnapshot.val() };
                students.push(student);
                studentsCache.push(student);
                if (student.attendance) attendanceData[student.id] = student.attendance;
                if (student.course && student.course.toLowerCase() === 'ielts') ieltsCount++;
                if (student.course && student.course.toLowerCase() === 'pte') pteCount++;
            });
            students.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            displayStudents(students);
            renderAttendanceMarkingTable();
            renderLowAttendanceChart();
            if (ieltsCountDiv) ieltsCountDiv.textContent = ieltsCount;
            if (pteCountDiv) pteCountDiv.textContent = pteCount;
        } else {
            studentsList.innerHTML = '<tr><td colspan="7" class="no-data">No students found</td></tr>';
            attendanceMarkingTable.innerHTML = '';
            if (ieltsCountDiv) ieltsCountDiv.textContent = 0;
            if (pteCountDiv) pteCountDiv.textContent = 0;
            if (lowAttendanceChartInstance) lowAttendanceChartInstance.destroy();
        }
    });
}

// --- Advanced Attendance Features ---
let selectedStudentForHistory = null;
let attendanceHistoryChartInstance = null;

// Export Attendance as CSV
const exportAttendanceBtn = document.getElementById('exportAttendanceBtn');
if (exportAttendanceBtn) {
  exportAttendanceBtn.addEventListener('click', exportAttendanceCSV);
}
function exportAttendanceCSV() {
  let csv = 'Name,Email,Course,Date,Period,Status,Note\n';
  studentsCache.forEach(s => {
    const att = s.attendance || {};
    Object.entries(att).forEach(([key, value]) => {
      let [date, period] = key.split('_');
      let status = typeof value === 'object' ? value.status : value;
      let note = typeof value === 'object' ? (value.note || '') : '';
      csv += `"${s.name}","${s.email}","${s.course}","${date}","${period}","${status}","${note}"\n`;
    });
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'attendance_export.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Bulk Marking
const markSelectedPresentBtn = document.getElementById('markSelectedPresentBtn');
const markSelectedAbsentBtn = document.getElementById('markSelectedAbsentBtn');
if (markSelectedPresentBtn) markSelectedPresentBtn.onclick = () => bulkMarkAttendance('present');
if (markSelectedAbsentBtn) markSelectedAbsentBtn.onclick = () => bulkMarkAttendance('absent');
function bulkMarkAttendance(status) {
  document.querySelectorAll('.attendance-checkbox:checked').forEach(cb => {
    const studentId = cb.getAttribute('data-student-id');
    if (!attendanceData[studentId]) attendanceData[studentId] = {};
    attendanceData[studentId][attendancePeriodKey] = { status: status, note: '' };
    // Also update select dropdown
    const sel = document.querySelector(`select.attendance-select[data-student-id="${studentId}"]`);
    if (sel) sel.value = status;
  });
}

// Attendance Notes
function getAttendanceNote(studentId, periodKey) {
  if (attendanceData[studentId] && attendanceData[studentId][periodKey] && typeof attendanceData[studentId][periodKey] === 'object') {
    return attendanceData[studentId][periodKey].note || '';
  }
  return '';
}
function setAttendanceNote(studentId, periodKey, note) {
  if (!attendanceData[studentId]) attendanceData[studentId] = {};
  if (!attendanceData[studentId][periodKey] || typeof attendanceData[studentId][periodKey] !== 'object') {
    attendanceData[studentId][periodKey] = { status: '', note: '' };
  }
  attendanceData[studentId][periodKey].note = note;
}

// Absence Alert (consecutive absences)
function getConsecutiveAbsences(student) {
  const att = student.attendance || {};
  const sortedKeys = Object.keys(att).sort();
  let maxStreak = 0, currentStreak = 0;
  sortedKeys.forEach(k => {
    const v = typeof att[k] === 'object' ? att[k].status : att[k];
    if (v === 'absent') currentStreak++;
    else currentStreak = 0;
    if (currentStreak > maxStreak) maxStreak = currentStreak;
  });
  return maxStreak;
}

// Attendance History Modal
window.openAttendanceHistoryModal = function(studentId) {
  selectedStudentForHistory = studentsCache.find(s => s.id === studentId);
  if (!selectedStudentForHistory) return;
  const modal = document.getElementById('attendanceHistoryModal');
  const title = document.getElementById('attendanceHistoryTitle');
  const statsDiv = document.getElementById('attendanceHistoryStats');
  const chartDiv = document.getElementById('attendanceHistoryChart');
  const tableDiv = document.getElementById('attendanceHistoryTable');
  title.innerHTML = `<i class='fas fa-user'></i> Attendance History - ${selectedStudentForHistory.name}`;
  // Stats
  const att = selectedStudentForHistory.attendance || {};
  const total = Object.keys(att).length;
  const present = Object.values(att).filter(v => (typeof v === 'object' ? v.status : v) === 'present').length;
  const absent = Object.values(att).filter(v => (typeof v === 'object' ? v.status : v) === 'absent').length;
  statsDiv.innerHTML = `<b>Total Records:</b> ${total} &nbsp; <b>Present:</b> ${present} &nbsp; <b>Absent:</b> ${absent}`;
  // Chart
  if (attendanceHistoryChartInstance) attendanceHistoryChartInstance.destroy();
  attendanceHistoryChartInstance = new Chart(chartDiv.getContext('2d'), {
    type: 'line',
    data: {
      labels: Object.keys(att),
      datasets: [{
        label: 'Attendance',
        data: Object.values(att).map(v => (typeof v === 'object' ? v.status : v) === 'present' ? 1 : 0),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.2)',
        stepped: true,
        fill: true
      }]
    },
    options: {
      scales: {
        y: {
          min: 0,
          max: 1,
          ticks: { callback: v => v === 1 ? 'Present' : 'Absent' }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
  // Table
  let html = `<table class='table table-bordered'><thead><tr><th>Date</th><th>Period</th><th>Status</th><th>Note</th></tr></thead><tbody>`;
  Object.entries(att).sort().forEach(([k, v]) => {
    let [date, period] = k.split('_');
    let status = typeof v === 'object' ? v.status : v;
    let note = typeof v === 'object' ? (v.note || '') : '';
    html += `<tr><td>${date}</td><td>${period}</td><td>${status}</td><td>${note}</td></tr>`;
  });
  html += '</tbody></table>';
  tableDiv.innerHTML = html;
  modal.style.display = 'flex';
};
window.closeAttendanceHistoryModal = function() {
  document.getElementById('attendanceHistoryModal').style.display = 'none';
};

function getAvatar(name) {
  if (!name) return '<div class="avatar-circle" style="background:#e0e7ef;color:#2563eb;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;font-weight:700;font-size:1rem;">?</div>';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
  return `<div class="avatar-circle" style="background:#e0e7ef;color:#2563eb;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;font-weight:700;font-size:1rem;">${initials}</div>`;
}
function getCategoryBadge(category) {
  if (category === 'morning') return '<span class="badge badge-info" title="Morning Student"><i class="fas fa-sun"></i> Morning</span>';
  if (category === 'day') return '<span class="badge badge-primary" title="Day Student"><i class="fas fa-calendar-day"></i> Day</span>';
  if (category === 'custom') return '<span class="badge badge-secondary" title="Custom Student"><i class="fas fa-clock"></i> Custom</span>';
  return '';
}
function displayStudents(students) {
    studentsList.innerHTML = '';
    students.forEach(student => {
        const row = document.createElement('tr');
        const startDate = new Date(student.startDate).toLocaleDateString();
        const lastActivity = student.updatedAt ? new Date(student.updatedAt).toLocaleDateString() : 'Never';
        // Attendance %
        const att = student.attendance || {};
        const totalDays = Object.keys(att).length;
        const presentDays = Object.values(att).filter(v => (typeof v === 'object' ? v.status : v) === 'present').length;
        const percent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
        const lowBadge = percent < lowAttendanceThreshold ? '<span class="badge badge-warning" title="Low Attendance">⚠️</span>' : '';
        const absStreak = getConsecutiveAbsences(student);
        const absAlert = absStreak >= 3 ? `<span class='badge badge-danger' title='${absStreak} consecutive absences'>🚨 ${absStreak}</span>` : '';
        row.innerHTML = `
            <td>${student.id.substring(0, 8)}</td>
            <td>
                <div class="student-info" style="display:flex;align-items:center;gap:0.5rem;">
                    ${getAvatar(student.name)}
                    <div>
                      <strong style="cursor:pointer;color:#2563eb;" onclick="openAttendanceHistoryModal('${student.id}')">${student.name}</strong>
                    <small>${student.email}</small>
                    </div>
                </div>
            </td>
            <td><span class="course-badge ${student.course ? student.course.toLowerCase() : ''}">${student.course || ''}</span></td>
            <td>${getCategoryBadge(student.category)}</td>
            <td><span class="status-badge ${student.status}">${student.status}</span></td>
            <td>${lastActivity}</td>
            <td><span class="attendance-percent">${percent}% ${lowBadge} ${absAlert}</span></td>
            <td>
                <button class="btn-icon" onclick="viewStudent('${student.id}')" aria-label="View student">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" onclick="editStudent('${student.id}')" aria-label="Edit student">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="deleteStudent('${student.id}')" aria-label="Delete student">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        studentsList.appendChild(row);
    });
}

// Add warning modal for attendance overwrite
if (!document.getElementById('attendanceWarningModal')) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'attendanceWarningModal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:350px;text-align:center;">
      <h3 style="margin-bottom:1rem;color:#b45309;"><i class="fas fa-exclamation-triangle"></i> Warning</h3>
      <div id="attendanceWarningText" style="margin-bottom:1.5rem;font-size:1.08em;"></div>
      <button class="btn btn-primary" id="attendanceWarningYes">Yes</button>
      <button class="btn btn-secondary" id="attendanceWarningCancel">Cancel</button>
    </div>
  `;
  document.body.appendChild(modal);
}
let pendingAttendanceChange = null;
function showAttendanceWarningModal(text, onYes) {
  document.getElementById('attendanceWarningText').textContent = text;
  document.getElementById('attendanceWarningModal').style.display = 'flex';
  pendingAttendanceChange = onYes;
}
document.getElementById('attendanceWarningYes').onclick = function() {
  document.getElementById('attendanceWarningModal').style.display = 'none';
  if (pendingAttendanceChange) pendingAttendanceChange();
  pendingAttendanceChange = null;
};
document.getElementById('attendanceWarningCancel').onclick = function() {
  document.getElementById('attendanceWarningModal').style.display = 'none';
  pendingAttendanceChange = null;
};

// Update renderAttendanceMarkingTable for category filter, avatars, badges, row highlights
function renderAttendanceMarkingTable() {
  if (!attendanceMarkingTable) return;
  const date = attendanceDateInput.value;
  attendancePeriodKey = getAttendancePeriodKey();
  let periodLabel = 'Day';
  if (attendancePeriod === 'morning') periodLabel = 'Morning';
  if (attendancePeriod === 'custom') {
    const start = attendanceStartTime.value;
    const end = attendanceEndTime.value;
    periodLabel = (start && end) ? `${start} - ${end}` : 'Custom';
  }
  // No grouping by arrival time, just show all filtered students
  let html = `<table class="table table-bordered modern-table" style="width:100%;min-width:400px;">
    <thead><tr><th><input type='checkbox' id='attendanceSelectAll'></th><th>Avatar</th><th>Name</th><th>Email</th><th>Category</th><th>Attendance <span style='font-weight:400;font-size:0.95em;'>(${periodLabel})</span></th><th>Note</th></tr></thead><tbody>`;
  studentsCache.filter(s => {
    if (attendanceCourseFilter === 'all') return attendanceCategoryFilter === 'all' || s.category === attendanceCategoryFilter;
    const courseMatch = s.course && s.course.toLowerCase() === attendanceCourseFilter;
    const catMatch = attendanceCategoryFilter === 'all' || s.category === attendanceCategoryFilter;
    return courseMatch && catMatch;
  }).forEach(s => {
    const val = (attendanceData[s.id] && attendanceData[s.id][attendancePeriodKey]) || '';
    let status = typeof val === 'object' ? val.status : val;
    let note = typeof val === 'object' ? (val.note || '') : '';
    let rowClass = status === 'present' ? 'row-present' : (status === 'absent' ? 'row-absent' : '');
    html += `<tr class='${rowClass}'>
      <td><input type='checkbox' class='attendance-checkbox' data-student-id='${s.id}'></td>
      <td>${getAvatar(s.name)}</td>
      <td>${s.name}</td>
      <td>${s.email}</td>
      <td>${getCategoryBadge(s.category)}</td>
      <td>
        <select data-student-id="${s.id}" class="attendance-select" style="padding:0.3rem 0.5rem;">
          <option value="">--</option>
          <option value="present" ${status==='present'?'selected':''}>Present</option>
          <option value="absent" ${status==='absent'?'selected':''}>Absent</option>
        </select>
      </td>
      <td><input type='text' class='attendance-note' data-student-id='${s.id}' value="${note}" placeholder='Add note...' style='width:120px;padding:0.2rem 0.4rem;'></td>
    </tr>`;
  });
  html += '</tbody></table>';
  attendanceMarkingTable.innerHTML = html;
  // Select all
  const selectAll = document.getElementById('attendanceSelectAll');
  if (selectAll) {
    selectAll.addEventListener('change', function() {
      document.querySelectorAll('.attendance-checkbox').forEach(cb => cb.checked = selectAll.checked);
    });
  }
  // Add event listeners
  document.querySelectorAll('.attendance-select').forEach(sel => {
    sel.addEventListener('change', function() {
      const studentId = this.getAttribute('data-student-id');
      let val = attendanceData[studentId] && attendanceData[studentId][attendancePeriodKey];
      if (typeof val !== 'object') val = { status: '', note: '' };
      const today = new Date().toISOString().slice(0, 10);
      // Only show warning if attendance is already recorded in Firebase (exists in attendanceData) AND the new value is different
      const recordExists = attendanceData[studentId] && Object.prototype.hasOwnProperty.call(attendanceData[studentId], attendancePeriodKey);
      if (
        attendanceDateInput.value === today &&
        recordExists &&
        val.status && (val.status === 'present' || val.status === 'absent') &&
        this.value !== val.status
      ) {
        showAttendanceWarningModal('Changing attendance will overwrite the previous record. Are you sure?', () => {
          val.status = this.value;
          attendanceData[studentId] = attendanceData[studentId] || {};
          attendanceData[studentId][attendancePeriodKey] = val;
          renderAttendanceMarkingTable();
        });
        // Reset select to previous value
        this.value = val.status;
        return;
      }
      val.status = this.value;
      attendanceData[studentId] = attendanceData[studentId] || {};
      attendanceData[studentId][attendancePeriodKey] = val;
    });
  });
  document.querySelectorAll('.attendance-edit-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const studentId = this.getAttribute('data-student-id');
      // Enable select and note for editing
      // Find the row and enable the select and note
      const row = this.closest('tr');
      const select = document.createElement('select');
      select.className = 'attendance-select';
      select.setAttribute('data-student-id', studentId);
      select.innerHTML = `<option value="">--</option><option value="present">Present</option><option value="absent">Absent</option>`;
      const val = attendanceData[studentId] && attendanceData[studentId][attendancePeriodKey];
      select.value = val && val.status ? val.status : '';
      const td = this.parentElement;
      td.innerHTML = '';
      td.appendChild(select);
      // Enable note
      const noteTd = row.querySelector('td:last-child input');
      noteTd.disabled = false;
      // Add event listener for select
      select.addEventListener('change', function() {
        showAttendanceWarningModal('Changing attendance will overwrite the previous record. Are you sure?', () => {
          let v = attendanceData[studentId] && attendanceData[studentId][attendancePeriodKey];
          if (typeof v !== 'object') v = { status: '', note: '' };
          v.status = select.value;
          attendanceData[studentId] = attendanceData[studentId] || {};
          attendanceData[studentId][attendancePeriodKey] = v;
          renderAttendanceMarkingTable();
        });
        select.value = val.status;
      });
    });
  });
  document.querySelectorAll('.attendance-note').forEach(input => {
    input.addEventListener('input', function() {
      const studentId = this.getAttribute('data-student-id');
      setAttendanceNote(studentId, attendancePeriodKey, this.value);
    });
  });
}

async function saveAttendanceForDate() {
  const date = attendanceDateInput.value;
  attendancePeriodKey = getAttendancePeriodKey();
  if (!date) return;
  if (attendancePeriod === 'custom' && (!attendanceStartTime.value || !attendanceEndTime.value)) {
    attendanceSaveStatus.textContent = 'Please select start and end time.';
    return;
  }
  attendanceSaveStatus.textContent = 'Saving...';
  try {
    const updates = {};
    studentsCache.filter(s => {
      if (attendanceCourseFilter === 'all') return true;
      return (s.course && s.course.toLowerCase() === attendanceCourseFilter);
    }).forEach(s => {
      if (!attendanceData[s.id]) attendanceData[s.id] = {};
      let val = attendanceData[s.id][attendancePeriodKey];
      if (typeof val !== 'object') val = { status: val || '', note: '' };
      updates[`students/${s.id}/attendance/${attendancePeriodKey}`] = val;
    });
    await update(ref(db), updates);
    attendanceSaveStatus.textContent = 'Attendance saved!';
    setTimeout(() => attendanceSaveStatus.textContent = '', 2000);
    renderLowAttendanceChart();
  } catch (e) {
    attendanceSaveStatus.textContent = 'Error saving attendance.';
  }
}

function renderLowAttendanceChart() {
  const ctx = document.getElementById('lowAttendanceChart').getContext('2d');
  const lowList = studentsCache
    .filter(s => attendanceCategoryFilter === 'all' || s.category === attendanceCategoryFilter)
    .map(s => {
      const att = s.attendance || {};
      const totalDays = Object.keys(att).length;
      const presentDays = Object.values(att).filter(v => (typeof v === 'object' ? v.status : v) === 'present').length;
      const percent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
      return {
        name: s.name,
        percent,
        course: s.course || ''
      };
    })
    .filter(s => s.percent < lowAttendanceThreshold)
    .sort((a, b) => a.percent - b.percent);
  if (lowAttendanceChartInstance) lowAttendanceChartInstance.destroy();
  lowAttendanceChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: lowList.map(s => s.name),
      datasets: [{
        label: 'Attendance %',
        data: lowList.map(s => s.percent),
        backgroundColor: lowList.map(s => s.course.toLowerCase() === 'ielts' ? 'rgba(37,99,235,0.7)' : 'rgba(5,150,105,0.7)'),
        borderColor: lowList.map(s => s.course.toLowerCase() === 'ielts' ? 'rgba(37,99,235,1)' : 'rgba(5,150,105,1)'),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Low Attendance Students' }
      },
      scales: {
        y: { beginAtZero: true, max: 100, title: { display: true, text: 'Attendance %' } }
      }
    }
  });
}

// Filter Students
function filterStudents() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCourse = courseFilter.value;
    const selectedStatus = statusFilter.value;
    const selectedCategory = categoryFilter ? categoryFilter.value : 'all';
    
    const rows = studentsList.getElementsByTagName('tr');
    Array.from(rows).forEach(row => {
        const cells = row.getElementsByTagName('td');
        if (cells.length < 6) return; // Skip header or empty rows
        const studentName = cells[1].textContent.toLowerCase();
        const course = cells[2].querySelector('.course-badge')?.textContent || '';
        const category = cells[3].querySelector('.badge')?.textContent.toLowerCase() || '';
        const status = cells[4].querySelector('.status-badge')?.textContent || '';
        const matchesSearch = studentName.includes(searchTerm);
        const matchesCourse = selectedCourse === 'all' || course.toLowerCase() === selectedCourse;
        const matchesStatus = selectedStatus === 'all' || status === selectedStatus;
        const matchesCategory = selectedCategory === 'all' || category === selectedCategory;
        row.style.display = matchesSearch && matchesCourse && matchesStatus && matchesCategory ? '' : 'none';
    });
}

// Event Listeners for Filters
searchInput.addEventListener('input', filterStudents);
courseFilter.addEventListener('change', filterStudents);
statusFilter.addEventListener('change', filterStudents);
if (categoryFilter) categoryFilter.addEventListener('change', filterStudents);

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

// View Student
async function viewStudent(id) {
    try {
        const studentRef = ref(db, `students/${id}`);
        const snapshot = await get(studentRef);
        if (snapshot.exists()) {
            const student = snapshot.val();
            // Fill modal fields
            document.getElementById('viewStudentAvatar').innerHTML = getAvatar(student.name);
            document.getElementById('viewStudentName').textContent = student.name || '';
            document.getElementById('viewStudentEmail').textContent = student.email || '';
            document.getElementById('viewStudentPhone').textContent = student.phone || '';
            document.getElementById('viewStudentCourse').textContent = student.course || '';
            document.getElementById('viewStudentStartDate').textContent = student.startDate ? new Date(student.startDate).toLocaleDateString() : '';
            document.getElementById('viewStudentStatus').innerHTML = `<span class="status-badge ${student.status}">${student.status}</span>`;
            document.getElementById('viewStudentCategory').innerHTML = getCategoryBadge(student.category);
            document.getElementById('viewStudentModal').style.display = 'flex';
        } else {
            showError('Student not found.');
        }
    } catch (error) {
        showError('Failed to load student details.');
        console.error('Error viewing student:', error);
    }
}

// Edit Student
async function editStudent(id) {
    try {
        const studentRef = ref(db, `students/${id}`);
        const snapshot = await get(studentRef);
        if (snapshot.exists()) {
            const student = snapshot.val();
            // Fill modal fields
            document.getElementById('editStudentId').value = id;
            document.getElementById('editStudentName').value = student.name || '';
            document.getElementById('editStudentEmail').value = student.email || '';
            document.getElementById('editStudentPhone').value = student.phone || '';
            document.getElementById('editStudentCourse').value = student.course || '';
            document.getElementById('editStudentCategory').value = student.category || '';
            document.getElementById('editStartDate').value = student.startDate || '';
            document.getElementById('editStudentModal').style.display = 'flex';
        } else {
            showError('Student not found.');
        }
    } catch (error) {
        showError('Failed to load student for editing.');
        console.error('Error editing student:', error);
    }
}

// Edit Student Form Submission
const editStudentForm = document.getElementById('editStudentForm');
if (editStudentForm) {
  editStudentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editStudentId').value;
    const updatedData = {
      name: document.getElementById('editStudentName').value,
      email: document.getElementById('editStudentEmail').value,
      phone: document.getElementById('editStudentPhone').value,
      course: document.getElementById('editStudentCourse').value,
      category: document.getElementById('editStudentCategory').value,
      startDate: document.getElementById('editStartDate').value,
      updatedAt: new Date().toISOString()
    };
    try {
      const submitBtn = editStudentForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Saving...';
      submitBtn.disabled = true;
      await update(ref(db, `students/${id}`), updatedData);
      showSuccess('Student updated successfully!');
      document.getElementById('editStudentModal').style.display = 'none';
      editStudentForm.reset();
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    } catch (error) {
      showError('Failed to update student. Please try again.');
      const submitBtn = editStudentForm.querySelector('button[type="submit"]');
      submitBtn.textContent = 'Save Changes';
      submitBtn.disabled = false;
    }
  });
}

// Close edit modal when clicking outside
const editStudentModal = document.getElementById('editStudentModal');
window.addEventListener('click', (e) => {
  if (e.target === editStudentModal) {
    editStudentModal.style.display = 'none';
    editStudentForm.reset();
  }
});

// Delete Student
async function deleteStudent(id) {
    if (confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
        try {
            const studentRef = ref(db, `students/${id}`);
            await remove(studentRef);
            showSuccess('Student deleted successfully!');
        } catch (error) {
            showError('Failed to delete student. Please try again.');
            console.error('Error deleting student:', error);
        }
    }
}

// Make functions globally available
window.openCreateStudentModal = openCreateStudentModal;
window.closeCreateStudentModal = closeCreateStudentModal;
window.viewStudent = viewStudent;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;

// --- Attendance History Tab Logic ---
const historyDateInput = document.getElementById('historyDate');
const loadAttendanceHistoryBtn = document.getElementById('loadAttendanceHistoryBtn');
const attendanceHistoryTableContainer = document.getElementById('attendanceHistoryTableContainer');
const attendanceHistoryAnalytics = document.getElementById('attendanceHistoryAnalytics');

if (loadAttendanceHistoryBtn && historyDateInput) {
  loadAttendanceHistoryBtn.addEventListener('click', () => {
    const date = historyDateInput.value;
    if (!date) {
      attendanceHistoryTableContainer.innerHTML = '<div class="error-message">Please select a date.</div>';
      attendanceHistoryAnalytics.innerHTML = '';
      return;
    }
    renderAttendanceHistoryTable(date);
  });
}

function renderAttendanceHistoryTable(date) {
  // Gather attendance for all students for the selected date
  let rows = [];
  let present = 0, absent = 0, total = 0, lowAttendance = 0;
  studentsCache.forEach(s => {
    const att = s.attendance || {};
    // Find all period keys for this date
    const periodKeys = Object.keys(att).filter(k => k.startsWith(date));
    if (periodKeys.length === 0) return;
    periodKeys.forEach(periodKey => {
      const v = att[periodKey];
      const status = typeof v === 'object' ? v.status : v;
      const note = typeof v === 'object' ? (v.note || '') : '';
      total++;
      if (status === 'present') present++;
      if (status === 'absent') absent++;
      // Attendance % for this student
      const allDays = Object.keys(att).length;
      const presentDays = Object.values(att).filter(val => (typeof val === 'object' ? val.status : val) === 'present').length;
      const percent = allDays > 0 ? Math.round((presentDays / allDays) * 100) : 0;
      if (percent < lowAttendanceThreshold) lowAttendance++;
      rows.push({
        student: s,
        periodKey,
        status,
        note,
        percent
      });
    });
  });
  // Analytics
  attendanceHistoryAnalytics.innerHTML = `<b>Total Records:</b> ${total} &nbsp; <b>Present:</b> ${present} &nbsp; <b>Absent:</b> ${absent} &nbsp; <b>Low Attendance (&lt;${lowAttendanceThreshold}%):</b> ${lowAttendance}`;
  // Table
  let html = `<table class='table table-bordered modern-table' style='width:100%;min-width:400px;'>
    <thead><tr><th>Avatar</th><th>Name</th><th>Course</th><th>Category</th><th>Period</th><th>Status</th><th>Note</th><th>Attendance %</th><th>Edit</th></tr></thead><tbody>`;
  if (rows.length === 0) {
    html += `<tr><td colspan='9' class='no-data'>No attendance records for this date.</td></tr>`;
  } else {
    rows.forEach(r => {
      let rowClass = r.status === 'present' ? 'row-present' : (r.status === 'absent' ? 'row-absent' : '');
      let lowBadge = r.percent < lowAttendanceThreshold ? '<span class="badge badge-warning" title="Low Attendance">⚠️</span>' : '';
      html += `<tr class='${rowClass}'>
        <td>${getAvatar(r.student.name)}</td>
        <td>${r.student.name}</td>
        <td><span class="course-badge ${r.student.course ? r.student.course.toLowerCase() : ''}">${r.student.course || ''}</span></td>
        <td>${getCategoryBadge(r.student.category)}</td>
        <td>${r.periodKey.split('_')[1] || 'Day'}</td>
        <td><span class="status-badge ${r.status}">${r.status}</span></td>
        <td>${r.note}</td>
        <td>${r.percent}% ${lowBadge}</td>
        <td><button class='btn btn-sm btn-primary' onclick="openEditAttendanceRecordModal('${r.student.id}','${r.periodKey}')"><i class='fas fa-edit'></i></button></td>
      </tr>`;
    });
  }
  html += '</tbody></table>';
  attendanceHistoryTableContainer.innerHTML = html;
}

// Edit Attendance Record Modal Logic
window.openEditAttendanceRecordModal = function(studentId, periodKey) {
  const student = studentsCache.find(s => s.id === studentId);
  if (!student) return;
  const att = student.attendance || {};
  const v = att[periodKey] || { status: '', note: '' };
  document.getElementById('editAttendanceStudentId').value = studentId;
  document.getElementById('editAttendanceDate').value = periodKey;
  document.getElementById('editAttendanceStatus').value = typeof v === 'object' ? v.status : v;
  document.getElementById('editAttendanceNote').value = typeof v === 'object' ? (v.note || '') : '';
  document.getElementById('editAttendanceRecordModal').style.display = 'flex';
};

const editAttendanceRecordForm = document.getElementById('editAttendanceRecordForm');
if (editAttendanceRecordForm) {
  editAttendanceRecordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = document.getElementById('editAttendanceStudentId').value;
    const periodKey = document.getElementById('editAttendanceDate').value;
    const status = document.getElementById('editAttendanceStatus').value;
    const note = document.getElementById('editAttendanceNote').value;
    try {
      // Confirmation
      if (!confirm('Are you sure you want to update this attendance record?')) return;
      // Update in Firebase
      await update(ref(db, `students/${studentId}/attendance/${periodKey}`), { status, note });
      showSuccess('Attendance record updated!');
      document.getElementById('editAttendanceRecordModal').style.display = 'none';
      editAttendanceRecordForm.reset();
      // Refresh students and table
      loadStudents();
      if (historyDateInput.value) renderAttendanceHistoryTable(historyDateInput.value);
    } catch (error) {
      showError('Failed to update attendance record.');
    }
  });
}
window.closeEditAttendanceRecordModal = function() {
  document.getElementById('editAttendanceRecordModal').style.display = 'none';
  document.getElementById('editAttendanceRecordForm').reset();
};

// Initialize App
function initApp() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('userName').textContent = user.displayName || 'Admin';
            loadStudents();
        } else {
            window.location.href = '../login.html';
        }
    });
}

document.addEventListener('DOMContentLoaded', initApp); 