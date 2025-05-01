import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    push,
    onValue,
    update,
    remove 
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { 
    getStorage, 
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject 
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-storage.js";
import { firebaseConfig } from './config/firebase.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

// DOM Elements
const documentsTableBody = document.getElementById('documentsTableBody');
const addDocumentForm = document.getElementById('addDocumentForm');
const searchInput = document.getElementById('searchDocument');
const filterDocType = document.getElementById('filterDocType');
const filterVerification = document.getElementById('filterVerification');

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

// Load Documents
function loadDocuments() {
    const documentsRef = ref(db, 'documents');
    onValue(documentsRef, (snapshot) => {
        const documents = snapshot.val();
        displayDocuments(documents);
    });
}

// Display Documents
function displayDocuments(documents) {
    documentsTableBody.innerHTML = '';
    
    if (!documents) return;

    Object.entries(documents).forEach(([id, doc]) => {
        if (filterDocument(doc)) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${doc.studentName}</td>
                <td>${formatDocumentType(doc.documentType)}</td>
                <td>${doc.fileName}</td>
                <td>${new Date(doc.uploadDate).toLocaleDateString()}</td>
                <td><span class="status-badge ${doc.verificationStatus}">${doc.verificationStatus}</span></td>
                <td>
                    <button onclick="viewDocument('${id}')" class="btn-icon">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="downloadDocument('${id}')" class="btn-icon">
                        <i class="fas fa-download"></i>
                    </button>
                    <button onclick="deleteDocument('${id}')" class="btn-icon">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            documentsTableBody.appendChild(row);
        }
    });
}

// Filter Documents
function filterDocument(doc) {
    const searchTerm = searchInput.value.toLowerCase();
    const typeFilter = filterDocType.value;
    const verificationFilter = filterVerification.value;

    const matchesSearch = doc.studentName.toLowerCase().includes(searchTerm) ||
                         doc.documentType.toLowerCase().includes(searchTerm);
    const matchesType = !typeFilter || doc.documentType === typeFilter;
    const matchesVerification = !verificationFilter || doc.verificationStatus === verificationFilter;

    return matchesSearch && matchesType && matchesVerification;
}

// Format Document Type
function formatDocumentType(type) {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1');
}

// Upload Document
addDocumentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = addDocumentForm.documentFile.files[0];
    if (!file) return;

    const studentId = addDocumentForm.studentId.value;
    const studentName = addDocumentForm.studentId.options[addDocumentForm.studentId.selectedIndex].text;
    const documentType = addDocumentForm.documentType.value;
    
    try {
        // Upload file to Firebase Storage
        const fileRef = storageRef(storage, `documents/${studentId}/${documentType}/${file.name}`);
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);

        // Save document metadata to database
        const docData = {
            studentId,
            studentName,
            documentType,
            fileName: file.name,
            fileURL: downloadURL,
            notes: addDocumentForm.documentNotes.value,
            verificationStatus: 'pending',
            uploadDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        await push(ref(db, 'documents'), docData);
        closeAddDocumentModal();
        addDocumentForm.reset();
        alert('Document uploaded successfully!');
    } catch (error) {
        alert('Error uploading document: ' + error.message);
    }
});

// View Document
window.viewDocument = function(documentId) {
    const documentRef = ref(db, `documents/${documentId}`);
    onValue(documentRef, (snapshot) => {
        const doc = snapshot.val();
        if (doc) {
            displayDocumentDetails(doc);
            document.getElementById('viewDocumentModal').style.display = 'block';
        }
    });
};

function displayDocumentDetails(doc) {
    const detailsDiv = document.getElementById('documentDetails');
    const previewDiv = document.getElementById('documentPreview');

    detailsDiv.innerHTML = `
        <div class="details-grid">
            <div class="detail-item">
                <strong>Student:</strong> ${doc.studentName}
            </div>
            <div class="detail-item">
                <strong>Document Type:</strong> ${formatDocumentType(doc.documentType)}
            </div>
            <div class="detail-item">
                <strong>Upload Date:</strong> ${new Date(doc.uploadDate).toLocaleDateString()}
            </div>
            <div class="detail-item">
                <strong>Status:</strong> ${doc.verificationStatus}
            </div>
            <div class="detail-item">
                <strong>Notes:</strong> ${doc.notes || 'No notes'}
            </div>
        </div>
    `;

    // Set up document preview based on file type
    const fileExtension = doc.fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
        previewDiv.innerHTML = `<img src="${doc.fileURL}" alt="Document Preview" style="max-width: 100%;">`;
    } else if (fileExtension === 'pdf') {
        previewDiv.innerHTML = `<iframe src="${doc.fileURL}" style="width: 100%; height: 500px;"></iframe>`;
    } else {
        previewDiv.innerHTML = `<p>Preview not available for this file type</p>`;
    }
}

// Event Listeners for Filters
searchInput.addEventListener('input', loadDocuments);
filterDocType.addEventListener('change', loadDocuments);
filterVerification.addEventListener('change', loadDocuments);

// Modal Functions
window.openAddDocumentModal = function() {
    document.getElementById('addDocumentModal').style.display = 'block';
};

window.closeAddDocumentModal = function() {
    document.getElementById('addDocumentModal').style.display = 'none';
};

window.closeViewDocumentModal = function() {
    document.getElementById('viewDocumentModal').style.display = 'none';
};

// Initialize
loadStudents();
loadDocuments(); 