import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue, get, set, push, update, remove } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { firebaseConfig } from './config/firebase.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// DOM Elements
const examsList = document.getElementById('examsList');
const createExamModal = document.getElementById('createExamModal');
const createExamForm = document.getElementById('createExamForm');
const searchInput = document.querySelector('.search-box input');
const examTypeFilter = document.getElementById('examTypeFilter');
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
function openCreateExamModal() {
    createExamModal.style.display = 'flex';
}

function closeCreateExamModal() {
    createExamModal.style.display = 'none';
    createExamForm.reset();
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === createExamModal) {
        closeCreateExamModal();
    }
});

// Form Submission
createExamForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const examData = {
        name: document.getElementById('examName').value,
        type: document.getElementById('examType').value,
        date: document.getElementById('examDate').value,
        duration: parseInt(document.getElementById('examDuration').value),
        description: document.getElementById('examDescription').value,
        status: 'upcoming',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        const examsRef = ref(db, 'exams');
        const newExamRef = push(examsRef);
        await set(newExamRef, examData);
        
        showSuccessMessage('Exam created successfully!');
        closeCreateExamModal();
    } catch (error) {
        showErrorMessage('Failed to create exam. Please try again.');
        console.error('Error creating exam:', error);
    }
});

// Load Exams
async function loadExams() {
    try {
        const examsRef = ref(db, 'exams');
        const snapshot = await get(examsRef);
        
        if (snapshot.exists()) {
            const exams = snapshot.val();
            displayExams(exams);
        } else {
            examsList.innerHTML = '<tr><td colspan="7" class="no-data">No exams found</td></tr>';
        }
    } catch (error) {
        showErrorMessage('Failed to load exams. Please try again.');
        console.error('Error loading exams:', error);
    }
}

// Display Exams
function displayExams(exams) {
    examsList.innerHTML = '';
    
    Object.entries(exams).forEach(([id, exam]) => {
        const row = document.createElement('tr');
        const examDate = new Date(exam.date);
        const status = getExamStatus(examDate, exam.duration);
        
        row.innerHTML = `
            <td>${id.substring(0, 8)}</td>
            <td>${exam.name}</td>
            <td>${exam.type.toUpperCase()}</td>
            <td>${examDate.toLocaleString()}</td>
            <td>${exam.duration} minutes</td>
            <td><span class="status-badge ${status.toLowerCase()}">${status}</span></td>
            <td>
                <button class="btn-icon" onclick="viewExam('${id}')" aria-label="View exam">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" onclick="editExam('${id}')" aria-label="Edit exam">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="deleteExam('${id}')" aria-label="Delete exam">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        examsList.appendChild(row);
    });
}

// Get Exam Status
function getExamStatus(date, duration) {
    const now = new Date();
    const endTime = new Date(date.getTime() + duration * 60000);
    
    if (now < date) {
        return 'Upcoming';
    } else if (now >= date && now <= endTime) {
        return 'Ongoing';
    } else {
        return 'Completed';
    }
}

// Filter and Search
function filterExams() {
    const searchTerm = searchInput.value.toLowerCase();
    const examTypeValue = examTypeFilter.value;
    const statusValue = statusFilter.value;
    
    const rows = examsList.getElementsByTagName('tr');
    
    Array.from(rows).forEach(row => {
        const name = row.cells[1].textContent.toLowerCase();
        const type = row.cells[2].textContent.toLowerCase();
        const status = row.cells[5].querySelector('.status-badge').textContent.toLowerCase();
        
        const matchesSearch = name.includes(searchTerm);
        const matchesType = examTypeValue === 'all' || type === examTypeValue;
        const matchesStatus = statusValue === 'all' || status === statusValue;
        
        row.style.display = matchesSearch && matchesType && matchesStatus ? '' : 'none';
    });
}

// Event Listeners
searchInput.addEventListener('input', filterExams);
examTypeFilter.addEventListener('change', filterExams);
statusFilter.addEventListener('change', filterExams);

// Initialize
function initApp() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('userName').textContent = user.displayName || 'Admin';
            loadExams();
        } else {
            window.location.href = './login.html';
        }
    });
}

document.addEventListener('DOMContentLoaded', initApp);

// Utility Functions
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message visible';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.querySelector('.content').prepend(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message visible';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    document.querySelector('.content').prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

// View Exam
function viewExam(id) {
    const examsRef = ref(db, `exams/${id}`);
    get(examsRef).then((snapshot) => {
        if (snapshot.exists()) {
            const exam = snapshot.val();
            // Open a modal or navigate to a detailed view
            console.log('Viewing exam:', exam);
        }
    });
}

// Edit Exam
function editExam(id) {
    const examsRef = ref(db, `exams/${id}`);
    get(examsRef).then((snapshot) => {
        if (snapshot.exists()) {
            const exam = snapshot.val();
            // Open edit modal with pre-filled data
            console.log('Editing exam:', exam);
        }
    });
}

// Delete Exam
function deleteExam(id) {
    if (confirm('Are you sure you want to delete this exam?')) {
        const examsRef = ref(db, `exams/${id}`);
        remove(examsRef)
            .then(() => {
                showSuccessMessage('Exam deleted successfully!');
            })
            .catch((error) => {
                showErrorMessage('Failed to delete exam. Please try again.');
                console.error('Error deleting exam:', error);
            });
    }
} 