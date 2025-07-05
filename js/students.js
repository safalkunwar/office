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
createStudentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const studentData = {
        name: document.getElementById('studentName').value,
        email: document.getElementById('studentEmail').value,
        phone: document.getElementById('studentPhone').value,
        course: document.getElementById('studentCourse').value,
        startDate: document.getElementById('startDate').value,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        // Show loading state
        const submitBtn = createStudentForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;

        const studentsRef = ref(db, 'students');
        const newStudentRef = push(studentsRef);
        await set(newStudentRef, studentData);
        
        showSuccess('Student created successfully!');
        closeCreateStudentModal();
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    } catch (error) {
        showError('Failed to create student. Please try again.');
        console.error('Error creating student:', error);
        
        // Reset button
        const submitBtn = createStudentForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Create Student';
        submitBtn.disabled = false;
    }
});

// Load and Display Students
function loadStudents() {
    const studentsRef = ref(db, 'students');
    onValue(studentsRef, (snapshot) => {
        studentsList.innerHTML = '';
        
        if (snapshot.exists()) {
            const students = [];
            snapshot.forEach((childSnapshot) => {
                students.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Sort by creation date (newest first)
            students.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            displayStudents(students);
        } else {
            studentsList.innerHTML = '<tr><td colspan="6" class="no-data">No students found</td></tr>';
        }
    });
}

// Display Students
function displayStudents(students) {
    studentsList.innerHTML = '';
    
    students.forEach(student => {
        const row = document.createElement('tr');
        const startDate = new Date(student.startDate).toLocaleDateString();
        const lastActivity = student.updatedAt ? new Date(student.updatedAt).toLocaleDateString() : 'Never';
        
        row.innerHTML = `
            <td>${student.id.substring(0, 8)}</td>
            <td>
                <div class="student-info">
                    <strong>${student.name}</strong>
                    <small>${student.email}</small>
                </div>
            </td>
            <td><span class="course-badge ${student.course.toLowerCase()}">${student.course}</span></td>
            <td><span class="status-badge ${student.status}">${student.status}</span></td>
            <td>${lastActivity}</td>
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

// Filter Students
function filterStudents() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCourse = courseFilter.value;
    const selectedStatus = statusFilter.value;
    
    const rows = studentsList.getElementsByTagName('tr');
    Array.from(rows).forEach(row => {
        const cells = row.getElementsByTagName('td');
        if (cells.length < 6) return; // Skip header or empty rows
        
        const studentName = cells[1].textContent.toLowerCase();
        const course = cells[2].querySelector('.course-badge')?.textContent || '';
        const status = cells[3].querySelector('.status-badge')?.textContent || '';
        
        const matchesSearch = studentName.includes(searchTerm);
        const matchesCourse = selectedCourse === 'all' || course.toLowerCase() === selectedCourse;
        const matchesStatus = selectedStatus === 'all' || status === selectedStatus;
        
        row.style.display = matchesSearch && matchesCourse && matchesStatus ? '' : 'none';
    });
}

// Event Listeners for Filters
searchInput.addEventListener('input', filterStudents);
courseFilter.addEventListener('change', filterStudents);
statusFilter.addEventListener('change', filterStudents);

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
            // You can implement a modal to show detailed student information
            alert(`Student Details:\nName: ${student.name}\nEmail: ${student.email}\nPhone: ${student.phone}\nCourse: ${student.course}\nStatus: ${student.status}`);
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
            // You can implement an edit modal here
            showSuccess('Edit functionality coming soon!');
        } else {
            showError('Student not found.');
        }
    } catch (error) {
        showError('Failed to load student for editing.');
        console.error('Error editing student:', error);
    }
}

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