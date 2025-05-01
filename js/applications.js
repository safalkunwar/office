import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    push,
    onValue,
    update,
    remove 
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { firebaseConfig } from './config/firebase.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM Elements
const applicationsTableBody = document.getElementById('applicationsTableBody');
const addApplicationForm = document.getElementById('addApplicationForm');
const searchInput = document.getElementById('searchApplication');
const filterStatus = document.getElementById('filterStatus');
const filterCountry = document.getElementById('filterCountry');

// Load Students for Select Dropdown
function loadStudents() {
    const studentSelect = document.getElementById('studentId');
    const studentsRef = ref(db, 'students');
    
    onValue(studentsRef, (snapshot) => {
        const students = snapshot.val();
        studentSelect.innerHTML = '<option value="">Select Student</option>';
        
        if (students) {
            Object.entries(students).forEach(([id, student]) => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = student.name;
                studentSelect.appendChild(option);
            });
        }
    });
}

// Load Applications
function loadApplications() {
    const applicationsRef = ref(db, 'applications');
    onValue(applicationsRef, (snapshot) => {
        const applications = snapshot.val();
        displayApplications(applications);
    });
}

// Display Applications
function displayApplications(applications) {
    applicationsTableBody.innerHTML = '';
    
    if (!applications) return;

    Object.entries(applications).forEach(([id, application]) => {
        if (filterApplication(application)) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${application.studentName}</td>
                <td>${application.university}</td>
                <td>${application.course}</td>
                <td>${application.country.toUpperCase()}</td>
                <td><span class="status-badge ${application.status}">${application.status}</span></td>
                <td>${new Date(application.lastUpdated).toLocaleDateString()}</td>
                <td>
                    <button onclick="viewApplication('${id}')" class="btn-icon">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editApplication('${id}')" class="btn-icon">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="updateStatus('${id}')" class="btn-icon">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </td>
            `;
            applicationsTableBody.appendChild(row);
        }
    });
}

// Filter Applications
function filterApplication(application) {
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilter = filterStatus.value;
    const countryFilter = filterCountry.value;

    const matchesSearch = application.studentName.toLowerCase().includes(searchTerm) ||
                         application.university.toLowerCase().includes(searchTerm);
    const matchesStatus = !statusFilter || application.status === statusFilter;
    const matchesCountry = !countryFilter || application.country === countryFilter;

    return matchesSearch && matchesStatus && matchesCountry;
}

// Add New Application
addApplicationForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = {
        studentId: addApplicationForm.studentId.value,
        studentName: addApplicationForm.studentId.options[addApplicationForm.studentId.selectedIndex].text,
        university: addApplicationForm.university.value,
        course: addApplicationForm.course.value,
        country: addApplicationForm.country.value,
        intake: addApplicationForm.intake.value,
        applicationFee: addApplicationForm.applicationFee.value,
        notes: addApplicationForm.applicationNotes.value,
        status: 'pending',
        timeline: [{
            status: 'pending',
            date: new Date().toISOString(),
            note: 'Application initiated'
        }],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };

    push(ref(db, 'applications'), formData)
        .then(() => {
            closeAddApplicationModal();
            addApplicationForm.reset();
            alert('Application created successfully!');
        })
        .catch((error) => {
            alert('Error creating application: ' + error.message);
        });
});

// Update Application Status
window.updateStatus = function(applicationId) {
    const newStatus = prompt('Enter new status:\npending, documents, submitted, accepted, rejected, visa, completed');
    if (!newStatus) return;

    const updates = {
        [`applications/${applicationId}/status`]: newStatus,
        [`applications/${applicationId}/lastUpdated`]: new Date().toISOString(),
        [`applications/${applicationId}/timeline`]: push(ref(db, `applications/${applicationId}/timeline`), {
            status: newStatus,
            date: new Date().toISOString(),
            note: `Status updated to ${newStatus}`
        })
    };

    update(ref(db), updates)
        .then(() => alert('Status updated successfully!'))
        .catch(error => alert('Error updating status: ' + error.message));
};

// View Application Details
window.viewApplication = function(applicationId) {
    const applicationRef = ref(db, `applications/${applicationId}`);
    onValue(applicationRef, (snapshot) => {
        const application = snapshot.val();
        if (application) {
            displayApplicationDetails(application);
            document.getElementById('viewApplicationModal').style.display = 'block';
        }
    });
};

function displayApplicationDetails(application) {
    const detailsDiv = document.getElementById('applicationDetails');
    const timelineDiv = document.getElementById('applicationTimeline');

    detailsDiv.innerHTML = `
        <div class="details-grid">
            <div class="detail-item">
                <strong>Student:</strong> ${application.studentName}
            </div>
            <div class="detail-item">
                <strong>University:</strong> ${application.university}
            </div>
            <div class="detail-item">
                <strong>Course:</strong> ${application.course}
            </div>
            <div class="detail-item">
                <strong>Country:</strong> ${application.country.toUpperCase()}
            </div>
            <div class="detail-item">
                <strong>Intake:</strong> ${application.intake}
            </div>
            <div class="detail-item">
                <strong>Status:</strong> ${application.status}
            </div>
            <div class="detail-item">
                <strong>Application Fee:</strong> ${application.applicationFee || 'N/A'}
            </div>
            <div class="detail-item">
                <strong>Notes:</strong> ${application.notes || 'No notes'}
            </div>
        </div>
    `;

    timelineDiv.innerHTML = application.timeline.map(event => `
        <div class="timeline-item">
            <div class="timeline-date">${new Date(event.date).toLocaleDateString()}</div>
            <div class="timeline-status ${event.status}">${event.status}</div>
            <div class="timeline-note">${event.note}</div>
        </div>
    `).join('');
}

// Event Listeners for Filters
searchInput.addEventListener('input', loadApplications);
filterStatus.addEventListener('change', loadApplications);
filterCountry.addEventListener('change', loadApplications);

// Modal Functions
window.openAddApplicationModal = function() {
    document.getElementById('addApplicationModal').style.display = 'block';
};

window.closeAddApplicationModal = function() {
    document.getElementById('addApplicationModal').style.display = 'none';
};

window.closeViewApplicationModal = function() {
    document.getElementById('viewApplicationModal').style.display = 'none';
};

// Initialize
loadStudents();
loadApplications(); 