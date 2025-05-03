import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue, get, set, push } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { firebaseConfig } from './config/firebase.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// DOM Elements
const studentsList = document.getElementById('studentsList');
const addStudentModal = document.getElementById('addStudentModal');
const addStudentForm = document.getElementById('addStudentForm');
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
function openAddStudentModal() {
    addStudentModal.style.display = 'flex';
}

function closeAddStudentModal() {
    addStudentModal.style.display = 'none';
    addStudentForm.reset();
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === addStudentModal) {
        closeAddStudentModal();
    }
});

// Form Submission
addStudentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const studentData = {
        name: document.getElementById('studentName').value,
        email: document.getElementById('studentEmail').value,
        course: document.getElementById('studentCourse').value,
        phone: document.getElementById('studentPhone').value,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
    };

    try {
        const studentsRef = ref(db, 'students');
        const newStudentRef = push(studentsRef);
        await set(newStudentRef, studentData);
        
        showSuccessMessage('Student added successfully!');
        closeAddStudentModal();
    } catch (error) {
        showErrorMessage('Failed to add student. Please try again.');
        console.error('Error adding student:', error);
    }
});

// Load Students
async function loadStudents() {
    try {
        const studentsRef = ref(db, 'students');
        const snapshot = await get(studentsRef);
        
        if (snapshot.exists()) {
            const students = snapshot.val();
            displayStudents(students);
        } else {
            studentsList.innerHTML = '<tr><td colspan="6" class="no-data">No students found</td></tr>';
        }
    } catch (error) {
        showErrorMessage('Failed to load students. Please try again.');
        console.error('Error loading students:', error);
    }
}

// Display Students
function displayStudents(students) {
    studentsList.innerHTML = '';
    
    Object.entries(students).forEach(([id, student]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${id.substring(0, 8)}</td>
            <td>${student.name}</td>
            <td>${student.course.toUpperCase()}</td>
            <td><span class="status-badge ${student.status}">${student.status}</span></td>
            <td>${new Date(student.lastActivity).toLocaleDateString()}</td>
            <td>
                <button class="btn-icon" onclick="viewStudent('${id}')" aria-label="View student">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" onclick="editStudent('${id}')" aria-label="Edit student">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="deleteStudent('${id}')" aria-label="Delete student">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        studentsList.appendChild(row);
    });
}

// Filter and Search
function filterStudents() {
    const searchTerm = searchInput.value.toLowerCase();
    const courseFilterValue = courseFilter.value;
    const statusFilterValue = statusFilter.value;
    
    const rows = studentsList.getElementsByTagName('tr');
    
    Array.from(rows).forEach(row => {
        const name = row.cells[1].textContent.toLowerCase();
        const course = row.cells[2].textContent.toLowerCase();
        const status = row.cells[3].querySelector('.status-badge').textContent.toLowerCase();
        
        const matchesSearch = name.includes(searchTerm);
        const matchesCourse = courseFilterValue === 'all' || course === courseFilterValue;
        const matchesStatus = statusFilterValue === 'all' || status === statusFilterValue;
        
        row.style.display = matchesSearch && matchesCourse && matchesStatus ? '' : 'none';
    });
}

// Event Listeners
searchInput.addEventListener('input', filterStudents);
courseFilter.addEventListener('change', filterStudents);
statusFilter.addEventListener('change', filterStudents);

// Initialize
function initApp() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('userName').textContent = user.displayName || 'Admin';
            loadStudents();
        } else {
            window.location.href = './login.html';
        }
    });
}

document.addEventListener('DOMContentLoaded', initApp); 