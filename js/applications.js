import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, onValue, push, set, remove, get } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA910SEIzx0ER4Ps_EdXBUU0Jgf2wTRm8Q",
    authDomain: "fir-a7a69.firebaseapp.com",
    databaseURL: "https://fir-a7a69-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "fir-a7a69",
    storageBucket: "fir-a7a69.firebasestorage.app",
    messagingSenderId: "1060643495940",
    appId: "1:1060643495940:web:19bc515d82d737d73d1551",
    measurementId: "G-YG82VTV644"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// DOM Elements
const applicationsList = document.getElementById('applicationsList');
const createApplicationModal = document.getElementById('createApplicationModal');
const createApplicationForm = document.getElementById('createApplicationForm');
const searchInput = document.querySelector('.search-box input');
const universityFilter = document.getElementById('universityFilter');
const statusFilter = document.getElementById('statusFilter');
const studentSelect = document.getElementById('studentSelect');
const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = themeToggle.querySelector('i');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navMenu = document.querySelector('.navbar-right ul');

// Theme Management
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeIcon.classList.replace('fa-moon', 'fa-sun');
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    themeIcon.classList.toggle('fa-moon');
    themeIcon.classList.toggle('fa-sun');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
});

// Mobile Menu Toggle
mobileMenuBtn.addEventListener('click', () => {
    const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
    mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('active');
    }
});

// Modal Functions
function openCreateApplicationModal() {
    createApplicationModal.style.display = 'block';
    loadStudents();
}

function closeCreateApplicationModal() {
    createApplicationModal.style.display = 'none';
    createApplicationForm.reset();
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === createApplicationModal) {
        closeCreateApplicationModal();
    }
});

// Form Submission
createApplicationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        studentId: studentSelect.value,
        university: document.getElementById('universitySelect').value,
        program: document.getElementById('programSelect').value,
        intake: document.getElementById('intakeSelect').value,
        notes: document.getElementById('applicationNotes').value,
        status: 'pending',
        submittedAt: new Date().toISOString()
    };

    try {
        const applicationsRef = ref(database, 'applications');
        const newApplicationRef = push(applicationsRef);
        await set(newApplicationRef, formData);
        
        showSuccess('Application created successfully!');
        closeCreateApplicationModal();
    } catch (error) {
        showError('Failed to create application. Please try again.');
        console.error('Error creating application:', error);
    }
});

// Load Students for Select
async function loadStudents() {
    try {
        const studentsRef = ref(database, 'students');
        onValue(studentsRef, (snapshot) => {
            studentSelect.innerHTML = '<option value="">Select Student</option>';
            snapshot.forEach((childSnapshot) => {
                const student = childSnapshot.val();
                const option = document.createElement('option');
                option.value = childSnapshot.key;
                option.textContent = `${student.name} (${student.email})`;
                studentSelect.appendChild(option);
            });
        });
    } catch (error) {
        showError('Failed to load students. Please try again.');
        console.error('Error loading students:', error);
    }
}

// Load and Display Applications
function loadApplications() {
    const applicationsRef = ref(database, 'applications');
    onValue(applicationsRef, (snapshot) => {
        applicationsList.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const application = childSnapshot.val();
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${childSnapshot.key}</td>
                <td>${application.studentName || 'Loading...'}</td>
                <td>${application.university}</td>
                <td>${application.program}</td>
                <td><span class="status-badge ${application.status}">${application.status}</span></td>
                <td>${new Date(application.submittedAt).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewApplication('${childSnapshot.key}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="editApplication('${childSnapshot.key}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteApplication('${childSnapshot.key}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            applicationsList.appendChild(row);
        });
    });
}

// Filter Applications
function filterApplications() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedUniversity = universityFilter.value;
    const selectedStatus = statusFilter.value;
    
    const rows = applicationsList.getElementsByTagName('tr');
    Array.from(rows).forEach(row => {
        const cells = row.getElementsByTagName('td');
        const studentName = cells[1].textContent.toLowerCase();
        const university = cells[2].textContent;
        const status = cells[4].querySelector('.status-badge').textContent;
        
        const matchesSearch = studentName.includes(searchTerm);
        const matchesUniversity = selectedUniversity === 'all' || university === selectedUniversity;
        const matchesStatus = selectedStatus === 'all' || status === selectedStatus;
        
        row.style.display = matchesSearch && matchesUniversity && matchesStatus ? '' : 'none';
    });
}

// Event Listeners for Filters
searchInput.addEventListener('input', filterApplications);
universityFilter.addEventListener('change', filterApplications);
statusFilter.addEventListener('change', filterApplications);

// Utility Functions
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Initialize App
function initApp() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('userName').textContent = user.displayName || 'Admin';
            loadApplications();
        } else {
            window.location.href = 'login.html';
        }
    });
}

// Start the application
initApp();

// View Application
function viewApplication(id) {
    const applicationsRef = ref(database, `applications/${id}`);
    get(applicationsRef).then((snapshot) => {
        if (snapshot.exists()) {
            const application = snapshot.val();
            // Open a modal or navigate to a detailed view
            console.log('Viewing application:', application);
        }
    });
}

// Edit Application
function editApplication(id) {
    const applicationsRef = ref(database, `applications/${id}`);
    get(applicationsRef).then((snapshot) => {
        if (snapshot.exists()) {
            const application = snapshot.val();
            // Open edit modal with pre-filled data
            console.log('Editing application:', application);
        }
    });
}

// Delete Application
function deleteApplication(id) {
    if (confirm('Are you sure you want to delete this application?')) {
        const applicationsRef = ref(database, `applications/${id}`);
        remove(applicationsRef)
            .then(() => {
                showSuccess('Application deleted successfully!');
            })
            .catch((error) => {
                showError('Failed to delete application. Please try again.');
                console.error('Error deleting application:', error);
            });
    }
} 