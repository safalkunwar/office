import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue, get, set, push, update, remove } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { firebaseConfig } from '../config.js';

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
        // Show loading state
        const submitBtn = createExamForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;

        const examsRef = ref(db, 'exams');
        const newExamRef = push(examsRef);
        await set(newExamRef, examData);
        
        showSuccess('Exam created successfully!');
        closeCreateExamModal();
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    } catch (error) {
        showError('Failed to create exam. Please try again.');
        console.error('Error creating exam:', error);
        
        // Reset button
        const submitBtn = createExamForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Create Exam';
        submitBtn.disabled = false;
    }
});

// Load and Display Exams
function loadExams() {
    const examsRef = ref(db, 'exams');
    onValue(examsRef, (snapshot) => {
        examsList.innerHTML = '';
        
        if (snapshot.exists()) {
            const exams = [];
            snapshot.forEach((childSnapshot) => {
                exams.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Sort by date (earliest first)
            exams.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            displayExams(exams);
        } else {
            examsList.innerHTML = '<tr><td colspan="7" class="no-data">No exams found</td></tr>';
        }
    });
}

// Display Exams
function displayExams(exams) {
    examsList.innerHTML = '';
    
    exams.forEach(exam => {
        const row = document.createElement('tr');
        const examDate = new Date(exam.date);
        const status = getExamStatus(examDate, exam.duration);
        
        row.innerHTML = `
            <td>${exam.id.substring(0, 8)}</td>
            <td>
                <div class="exam-info">
                    <strong>${exam.name}</strong>
                    <small>${exam.description}</small>
                </div>
            </td>
            <td><span class="exam-type-badge ${exam.type.toLowerCase()}">${exam.type}</span></td>
            <td>${examDate.toLocaleString()}</td>
            <td>${exam.duration} minutes</td>
            <td><span class="status-badge ${status.toLowerCase()}">${status}</span></td>
            <td>
                <button class="btn-icon" onclick="viewExam('${exam.id}')" aria-label="View exam">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" onclick="editExam('${exam.id}')" aria-label="Edit exam">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="deleteExam('${exam.id}')" aria-label="Delete exam">
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

// Filter Exams
function filterExams() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedType = examTypeFilter.value;
    const selectedStatus = statusFilter.value;
    
    const rows = examsList.getElementsByTagName('tr');
    Array.from(rows).forEach(row => {
        const cells = row.getElementsByTagName('td');
        if (cells.length < 7) return; // Skip header or empty rows
        
        const examName = cells[1].textContent.toLowerCase();
        const examType = cells[2].querySelector('.exam-type-badge')?.textContent || '';
        const status = cells[5].querySelector('.status-badge')?.textContent || '';
        
        const matchesSearch = examName.includes(searchTerm);
        const matchesType = selectedType === 'all' || examType.toLowerCase() === selectedType;
        const matchesStatus = selectedStatus === 'all' || status === selectedStatus;
        
        row.style.display = matchesSearch && matchesType && matchesStatus ? '' : 'none';
    });
}

// Event Listeners for Filters
searchInput.addEventListener('input', filterExams);
examTypeFilter.addEventListener('change', filterExams);
statusFilter.addEventListener('change', filterExams);

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

// View Exam
async function viewExam(id) {
    try {
        const examRef = ref(db, `exams/${id}`);
        const snapshot = await get(examRef);
        
        if (snapshot.exists()) {
            const exam = snapshot.val();
            const examDate = new Date(exam.date);
            alert(`Exam Details:\nName: ${exam.name}\nType: ${exam.type}\nDate: ${examDate.toLocaleString()}\nDuration: ${exam.duration} minutes\nDescription: ${exam.description}`);
        } else {
            showError('Exam not found.');
        }
    } catch (error) {
        showError('Failed to load exam details.');
        console.error('Error viewing exam:', error);
    }
}

// Edit Exam
async function editExam(id) {
    try {
        const examRef = ref(db, `exams/${id}`);
        const snapshot = await get(examRef);
        
        if (snapshot.exists()) {
            const exam = snapshot.val();
            // You can implement an edit modal here
            showSuccess('Edit functionality coming soon!');
        } else {
            showError('Exam not found.');
        }
    } catch (error) {
        showError('Failed to load exam for editing.');
        console.error('Error editing exam:', error);
    }
}

// Delete Exam
async function deleteExam(id) {
    if (confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
        try {
            const examRef = ref(db, `exams/${id}`);
            await remove(examRef);
            showSuccess('Exam deleted successfully!');
        } catch (error) {
            showError('Failed to delete exam. Please try again.');
            console.error('Error deleting exam:', error);
        }
    }
}

// Make functions globally available
window.openCreateExamModal = openCreateExamModal;
window.closeCreateExamModal = closeCreateExamModal;
window.viewExam = viewExam;
window.editExam = editExam;
window.deleteExam = deleteExam;

// Initialize App
function initApp() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('userName').textContent = user.displayName || 'Admin';
            loadExams();
        } else {
            window.location.href = '../login.html';
        }
    });
}

document.addEventListener('DOMContentLoaded', initApp); 