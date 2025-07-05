import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, onValue, push, set, remove, get, update, query, orderByChild } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { firebaseConfig } from './config.js';

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
const universitySelect = document.getElementById('universitySelect');
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
    createApplicationModal.style.display = 'flex';
    loadStudents();
    loadUniversities();
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
    
    const applicationData = {
        studentId: document.getElementById('studentSelect').value,
        studentName: studentSelect.options[studentSelect.selectedIndex].text,
        universityId: document.getElementById('universitySelect').value,
        universityName: universitySelect.options[universitySelect.selectedIndex].text,
        program: document.getElementById('programSelect').value,
        intake: document.getElementById('intakeSelect').value,
        notes: document.getElementById('applicationNotes').value || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        // Show loading state
        const submitBtn = createApplicationForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;

        const applicationsRef = ref(database, 'applications');
        const newApplicationRef = push(applicationsRef);
        await set(newApplicationRef, applicationData);
        
        showSuccess('Application created successfully!');
        closeCreateApplicationModal();
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    } catch (error) {
        showError('Failed to create application. Please try again.');
        console.error('Error creating application:', error);
        
        // Reset button
        const submitBtn = createApplicationForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Create Application';
        submitBtn.disabled = false;
    }
});

// Load Students for Dropdown
function loadStudents() {
    const studentsRef = ref(database, 'students');
    onValue(studentsRef, (snapshot) => {
        studentSelect.innerHTML = '<option value="">Select Student</option>';
        
        if (snapshot.exists()) {
            const students = [];
            snapshot.forEach((childSnapshot) => {
                students.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Sort by name
            students.sort((a, b) => a.name.localeCompare(b.name));
            
            students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.name} (${student.course})`;
                studentSelect.appendChild(option);
            });
        }
    });
}

// Load Universities for Dropdown
function loadUniversities() {
    const universitiesRef = ref(database, 'universities');
    onValue(universitiesRef, (snapshot) => {
        universitySelect.innerHTML = '<option value="">Select University</option>';
        universityFilter.innerHTML = '<option value="all">All Universities</option>';
        
        if (snapshot.exists()) {
            const universities = [];
            snapshot.forEach((childSnapshot) => {
                universities.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Sort by name
            universities.sort((a, b) => a.name.localeCompare(b.name));
            
            universities.forEach(university => {
                // For application form
                const option = document.createElement('option');
                option.value = university.id;
                option.textContent = `${university.name} (${university.city}, ${university.country})`;
                universitySelect.appendChild(option);
                
                // For filter dropdown
                const filterOption = document.createElement('option');
                filterOption.value = university.name;
                filterOption.textContent = university.name;
                universityFilter.appendChild(filterOption);
            });
        }
    });
}

// Load and Display Applications
function loadApplications() {
    const applicationsRef = ref(database, 'applications');
    onValue(applicationsRef, (snapshot) => {
        applicationsList.innerHTML = '';
        
        if (snapshot.exists()) {
            const applications = [];
            snapshot.forEach((childSnapshot) => {
                applications.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Sort by creation date (newest first)
            applications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            displayApplications(applications);
        } else {
            applicationsList.innerHTML = '<tr><td colspan="7" class="no-data">No applications found</td></tr>';
        }
    });
}

// Display Applications
function displayApplications(applications) {
    applicationsList.innerHTML = '';
    
    applications.forEach(application => {
        const row = document.createElement('tr');
        const submittedDate = new Date(application.createdAt).toLocaleDateString();
        
        row.innerHTML = `
            <td>${application.id.substring(0, 8)}</td>
            <td>
                <div class="student-info">
                    <strong>${application.studentName}</strong>
                </div>
            </td>
            <td>
                <div class="university-info">
                    <strong>${application.universityName}</strong>
                </div>
            </td>
            <td><span class="program-badge">${application.program}</span></td>
            <td><span class="status-badge ${application.status}">${application.status}</span></td>
            <td>${submittedDate}</td>
            <td>
                <button class="btn-icon" onclick="viewApplication('${application.id}')" aria-label="View application">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" onclick="editApplication('${application.id}')" aria-label="Edit application">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="deleteApplication('${application.id}')" aria-label="Delete application">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        applicationsList.appendChild(row);
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
        if (cells.length < 7) return; // Skip header or empty rows
        
        const studentName = cells[1].textContent.toLowerCase();
        const universityName = cells[2].textContent.toLowerCase();
        const status = cells[4].querySelector('.status-badge')?.textContent || '';
        
        const matchesSearch = studentName.includes(searchTerm) || universityName.includes(searchTerm);
        const matchesUniversity = selectedUniversity === 'all' || universityName.includes(selectedUniversity.toLowerCase());
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

// View Application
async function viewApplication(id) {
    try {
        const applicationRef = ref(database, `applications/${id}`);
        const snapshot = await get(applicationRef);
        
        if (snapshot.exists()) {
            const application = snapshot.val();
            const submittedDate = new Date(application.createdAt).toLocaleDateString();
            alert(`Application Details:\nStudent: ${application.studentName}\nUniversity: ${application.universityName}\nProgram: ${application.program}\nIntake: ${application.intake}\nStatus: ${application.status}\nSubmitted: ${submittedDate}\nNotes: ${application.notes}`);
        } else {
            showError('Application not found.');
        }
    } catch (error) {
        showError('Failed to load application details.');
        console.error('Error viewing application:', error);
    }
}

// Edit Application
async function editApplication(id) {
    try {
        const applicationRef = ref(database, `applications/${id}`);
        const snapshot = await get(applicationRef);
        
        if (snapshot.exists()) {
            const application = snapshot.val();
            // You can implement an edit modal here
            showSuccess('Edit functionality coming soon!');
        } else {
            showError('Application not found.');
        }
    } catch (error) {
        showError('Failed to load application for editing.');
        console.error('Error editing application:', error);
    }
}

// Delete Application
async function deleteApplication(id) {
    if (confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
        try {
            const applicationRef = ref(database, `applications/${id}`);
            await remove(applicationRef);
            showSuccess('Application deleted successfully!');
        } catch (error) {
            showError('Failed to delete application. Please try again.');
            console.error('Error deleting application:', error);
        }
    }
}

// Make functions globally available
window.openCreateApplicationModal = openCreateApplicationModal;
window.closeCreateApplicationModal = closeCreateApplicationModal;
window.viewApplication = viewApplication;
window.editApplication = editApplication;
window.deleteApplication = deleteApplication;

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('userName').textContent = user.displayName || 'Admin';
            loadStudents();
            loadUniversities();
            loadApplications();
        } else {
            window.location.href = '../login.html';
        }
    });
}); 