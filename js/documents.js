import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, onValue, push, set, remove } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

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
const storage = getStorage(app);
const auth = getAuth(app);

// DOM Elements
const documentsList = document.getElementById('documentsList');
const uploadDocumentModal = document.getElementById('uploadDocumentModal');
const uploadDocumentForm = document.getElementById('uploadDocumentForm');
const searchInput = document.querySelector('.search-box input');
const documentTypeFilter = document.getElementById('documentTypeFilter');
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
function openUploadDocumentModal() {
    uploadDocumentModal.style.display = 'block';
    loadStudents();
}

function closeUploadDocumentModal() {
    uploadDocumentModal.style.display = 'none';
    uploadDocumentForm.reset();
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === uploadDocumentModal) {
        closeUploadDocumentModal();
    }
});

// Form Submission
uploadDocumentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fileInput = document.getElementById('documentFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showError('Please select a file to upload.');
        return;
    }

    try {
        // Upload file to Firebase Storage
        const fileRef = storageRef(storage, `documents/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);

        // Save document metadata to Realtime Database
        const formData = {
            name: document.getElementById('documentName').value,
            type: document.getElementById('documentType').value,
            studentId: studentSelect.value,
            fileUrl: downloadURL,
            notes: document.getElementById('documentNotes').value,
            status: 'pending',
            uploadedAt: new Date().toISOString()
        };

        const documentsRef = ref(database, 'documents');
        const newDocumentRef = push(documentsRef);
        await set(newDocumentRef, formData);
        
        showSuccess('Document uploaded successfully!');
        closeUploadDocumentModal();
    } catch (error) {
        showError('Failed to upload document. Please try again.');
        console.error('Error uploading document:', error);
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

// Load and Display Documents
function loadDocuments() {
    const documentsRef = ref(database, 'documents');
    onValue(documentsRef, (snapshot) => {
        documentsList.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const document = childSnapshot.val();
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${childSnapshot.key}</td>
                <td>${document.name}</td>
                <td>${document.type}</td>
                <td>${document.studentName || 'Loading...'}</td>
                <td><span class="status-badge ${document.status}">${document.status}</span></td>
                <td>${new Date(document.uploadedAt).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewDocument('${childSnapshot.key}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="editDocument('${childSnapshot.key}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDocument('${childSnapshot.key}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            documentsList.appendChild(row);
        });
    });
}

// Filter Documents
function filterDocuments() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedType = documentTypeFilter.value;
    const selectedStatus = statusFilter.value;
    
    const rows = documentsList.getElementsByTagName('tr');
    Array.from(rows).forEach(row => {
        const cells = row.getElementsByTagName('td');
        const documentName = cells[1].textContent.toLowerCase();
        const documentType = cells[2].textContent;
        const status = cells[4].querySelector('.status-badge').textContent;
        
        const matchesSearch = documentName.includes(searchTerm);
        const matchesType = selectedType === 'all' || documentType === selectedType;
        const matchesStatus = selectedStatus === 'all' || status === selectedStatus;
        
        row.style.display = matchesSearch && matchesType && matchesStatus ? '' : 'none';
    });
}

// Event Listeners for Filters
searchInput.addEventListener('input', filterDocuments);
documentTypeFilter.addEventListener('change', filterDocuments);
statusFilter.addEventListener('change', filterDocuments);

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
            loadDocuments();
        } else {
            window.location.href = 'login.html';
        }
    });
}

// Start the application
initApp(); 