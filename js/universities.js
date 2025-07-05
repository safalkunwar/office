import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, get, onValue, push, set, remove, update, query, orderByChild } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { firebaseConfig } from './config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// DOM Elements
const universitiesList = document.getElementById('universitiesList');
const createUniversityModal = document.getElementById('createUniversityModal');
const createUniversityForm = document.getElementById('createUniversityForm');
const searchInput = document.querySelector('.search-box input');
const countryFilter = document.getElementById('countryFilter');
const typeFilter = document.getElementById('typeFilter');

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
function openCreateUniversityModal() {
    createUniversityModal.style.display = 'flex';
}

function closeCreateUniversityModal() {
    createUniversityModal.style.display = 'none';
    createUniversityForm.reset();
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === createUniversityModal) {
        closeCreateUniversityModal();
    }
});

// Form Submission
createUniversityForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const universityData = {
        name: document.getElementById('universityName').value,
        country: document.getElementById('universityCountry').value,
        city: document.getElementById('universityCity').value,
        type: document.getElementById('universityType').value,
        ranking: document.getElementById('universityRanking').value || null,
        website: document.getElementById('universityWebsite').value || null,
        description: document.getElementById('universityDescription').value || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        // Show loading state
        const submitBtn = createUniversityForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;

        const universitiesRef = ref(db, 'universities');
        const newUniversityRef = push(universitiesRef);
        await set(newUniversityRef, universityData);
        
        showSuccess('University created successfully!');
        closeCreateUniversityModal();
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    } catch (error) {
        showError('Failed to create university. Please try again.');
        console.error('Error creating university:', error);
        
        // Reset button
        const submitBtn = createUniversityForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Create University';
        submitBtn.disabled = false;
    }
});

// Load and Display Universities
function loadUniversities() {
    const universitiesRef = ref(db, 'universities');
    onValue(universitiesRef, (snapshot) => {
        universitiesList.innerHTML = '';
        
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
            
            displayUniversities(universities);
        } else {
            universitiesList.innerHTML = '<tr><td colspan="7" class="no-data">No universities found</td></tr>';
        }
    });
}

// Display Universities
function displayUniversities(universities) {
    universitiesList.innerHTML = '';
    
    universities.forEach(university => {
        const row = document.createElement('tr');
        const ranking = university.ranking ? `#${university.ranking}` : 'N/A';
        
        row.innerHTML = `
            <td>${university.id.substring(0, 8)}</td>
            <td>
                <div class="university-info">
                    <strong>${university.name}</strong>
                    <small>${university.city}, ${university.country}</small>
                </div>
            </td>
            <td><span class="country-badge ${university.country.toLowerCase()}">${university.country}</span></td>
            <td><span class="type-badge ${university.type.toLowerCase()}">${university.type}</span></td>
            <td>${ranking}</td>
            <td><span class="status-badge ${university.status}">${university.status}</span></td>
            <td>
                <button class="btn-icon" onclick="viewUniversity('${university.id}')" aria-label="View university">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" onclick="editUniversity('${university.id}')" aria-label="Edit university">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="deleteUniversity('${university.id}')" aria-label="Delete university">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        universitiesList.appendChild(row);
    });
}

// Filter Universities
function filterUniversities() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCountry = countryFilter.value;
    const selectedType = typeFilter.value;
    
    const rows = universitiesList.getElementsByTagName('tr');
    Array.from(rows).forEach(row => {
        const cells = row.getElementsByTagName('td');
        if (cells.length < 7) return; // Skip header or empty rows
        
        const universityName = cells[1].textContent.toLowerCase();
        const country = cells[2].querySelector('.country-badge')?.textContent || '';
        const type = cells[3].querySelector('.type-badge')?.textContent || '';
        
        const matchesSearch = universityName.includes(searchTerm);
        const matchesCountry = selectedCountry === 'all' || country === selectedCountry;
        const matchesType = selectedType === 'all' || type === selectedType;
        
        row.style.display = matchesSearch && matchesCountry && matchesType ? '' : 'none';
    });
}

// Event Listeners for Filters
searchInput.addEventListener('input', filterUniversities);
countryFilter.addEventListener('change', filterUniversities);
typeFilter.addEventListener('change', filterUniversities);

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

// View University
async function viewUniversity(id) {
    try {
        const universityRef = ref(db, `universities/${id}`);
        const snapshot = await get(universityRef);
        
        if (snapshot.exists()) {
            const university = snapshot.val();
            const ranking = university.ranking ? `#${university.ranking}` : 'N/A';
            const website = university.website ? university.website : 'N/A';
            
            alert(`University Details:\nName: ${university.name}\nLocation: ${university.city}, ${university.country}\nType: ${university.type}\nQS Ranking: ${ranking}\nWebsite: ${website}\nDescription: ${university.description}`);
        } else {
            showError('University not found.');
        }
    } catch (error) {
        showError('Failed to load university details.');
        console.error('Error viewing university:', error);
    }
}

// Edit University
async function editUniversity(id) {
    try {
        const universityRef = ref(db, `universities/${id}`);
        const snapshot = await get(universityRef);
        
        if (snapshot.exists()) {
            const university = snapshot.val();
            // You can implement an edit modal here
            showSuccess('Edit functionality coming soon!');
        } else {
            showError('University not found.');
        }
    } catch (error) {
        showError('Failed to load university for editing.');
        console.error('Error editing university:', error);
    }
}

// Delete University
async function deleteUniversity(id) {
    if (confirm('Are you sure you want to delete this university? This action cannot be undone.')) {
        try {
            const universityRef = ref(db, `universities/${id}`);
            await remove(universityRef);
            showSuccess('University deleted successfully!');
        } catch (error) {
            showError('Failed to delete university. Please try again.');
            console.error('Error deleting university:', error);
        }
    }
}

// Make functions globally available
window.openCreateUniversityModal = openCreateUniversityModal;
window.closeCreateUniversityModal = closeCreateUniversityModal;
window.viewUniversity = viewUniversity;
window.editUniversity = editUniversity;
window.deleteUniversity = deleteUniversity;

// Initialize App
function initApp() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('userName').textContent = user.displayName || 'Admin';
            loadUniversities();
        } else {
            window.location.href = '../login.html';
        }
    });
}

document.addEventListener('DOMContentLoaded', initApp); 