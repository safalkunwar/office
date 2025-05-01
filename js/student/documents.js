import { auth, db, storage } from '../../config/firebase.js';
import { ref, onValue, push, remove, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';

// DOM Elements
const studentAvatar = document.getElementById('studentAvatar');
const studentName = document.getElementById('studentName');
const studentId = document.getElementById('studentId');
const studentEmail = document.getElementById('studentEmail');
const documentsGrid = document.getElementById('documentsGrid');
const uploadModal = document.getElementById('uploadModal');
const uploadForm = document.getElementById('uploadDocumentForm');

// Required document types
const requiredDocuments = [
    'marksheet',
    'financial',
    'passport',
    'ielts',
    'recommendation'
];

// Initialize the page
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadStudentInfo(user.uid);
        loadDocuments(user.uid);
        setupEventListeners(user.uid);
    } else {
        window.location.href = '../login.html';
    }
});

// Load student information
function loadStudentInfo(userId) {
    const studentRef = ref(db, `students/${userId}`);
    onValue(studentRef, (snapshot) => {
        const studentData = snapshot.val();
        if (studentData) {
            studentName.textContent = `${studentData.firstName} ${studentData.lastName}`;
            studentId.textContent = `Student ID: ${studentData.studentId}`;
            studentEmail.textContent = `Email: ${studentData.email}`;
            
            if (studentData.avatar) {
                studentAvatar.src = studentData.avatar;
            }
        }
    });
}

// Load documents
function loadDocuments(userId) {
    const documentsRef = ref(db, `documents/${userId}`);
    onValue(documentsRef, (snapshot) => {
        const documents = snapshot.val() || {};
        updateDocumentStatus(documents);
        renderDocuments(documents);
    });
}

// Update document status indicators
function updateDocumentStatus(documents) {
    requiredDocuments.forEach(type => {
        const card = document.querySelector(`.requirement-card[data-type="${type}"]`);
        const statusBadge = card.querySelector('.status-badge');
        
        if (documents[type]) {
            statusBadge.className = 'status-badge completed';
            statusBadge.textContent = 'Completed';
        } else {
            statusBadge.className = 'status-badge missing';
            statusBadge.textContent = 'Missing';
        }
    });
}

// Render documents in the grid
function renderDocuments(documents) {
    documentsGrid.innerHTML = '';
    
    Object.entries(documents).forEach(([type, doc]) => {
        const documentCard = createDocumentCard(type, doc);
        documentsGrid.appendChild(documentCard);
    });
}

// Create document card element
function createDocumentCard(type, doc) {
    const card = document.createElement('div');
    card.className = 'document-card';
    
    const preview = document.createElement('img');
    preview.src = doc.previewUrl || '../../assets/document-placeholder.png';
    preview.alt = doc.name;
    
    const info = document.createElement('div');
    info.className = 'document-info';
    
    const title = document.createElement('h4');
    title.textContent = getDocumentTypeName(type);
    
    const date = document.createElement('p');
    date.textContent = new Date(doc.timestamp).toLocaleDateString();
    
    const size = document.createElement('p');
    size.textContent = formatFileSize(doc.size);
    
    const actions = document.createElement('div');
    actions.className = 'document-actions';
    
    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn-view';
    viewBtn.innerHTML = '<i class="fas fa-eye"></i> View';
    viewBtn.onclick = () => window.open(doc.url, '_blank');
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    deleteBtn.onclick = () => deleteDocument(doc.id);
    
    info.appendChild(title);
    info.appendChild(date);
    info.appendChild(size);
    
    actions.appendChild(viewBtn);
    actions.appendChild(deleteBtn);
    
    card.appendChild(preview);
    card.appendChild(info);
    card.appendChild(actions);
    
    return card;
}

// Setup event listeners
function setupEventListeners(userId) {
    // Upload form submission
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const file = document.getElementById('documentFile').files[0];
        const type = document.getElementById('documentType').value;
        const notes = document.getElementById('documentNotes').value;
        
        if (!file || !type) return;
        
        try {
            await uploadDocument(userId, file, type, notes);
            closeModal();
            uploadForm.reset();
        } catch (error) {
            showError('Failed to upload document. Please try again.');
        }
    });
    
    // Requirement card clicks
    document.querySelectorAll('.requirement-card').forEach(card => {
        card.addEventListener('click', () => {
            const type = card.dataset.type;
            document.getElementById('documentType').value = type;
            openUploadModal();
        });
    });
}

// Upload document to Firebase
async function uploadDocument(userId, file, type, notes) {
    const fileRef = storageRef(storage, `documents/${userId}/${type}/${file.name}`);
    const snapshot = await uploadBytes(fileRef, file);
    const url = await getDownloadURL(snapshot.ref);
    
    const documentData = {
        name: file.name,
        type: type,
        url: url,
        size: file.size,
        timestamp: Date.now(),
        notes: notes || '',
        previewUrl: file.type.startsWith('image/') ? url : null
    };
    
    const documentsRef = ref(db, `documents/${userId}/${type}`);
    await push(documentsRef, documentData);
}

// Delete document
async function deleteDocument(documentId) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
        const documentRef = ref(db, `documents/${auth.currentUser.uid}/${documentId}`);
        await remove(documentRef);
        
        // Also delete from storage if needed
        const storageReference = storageRef(storage, `documents/${auth.currentUser.uid}/${documentId}`);
        await deleteObject(storageReference);
    } catch (error) {
        showError('Failed to delete document. Please try again.');
    }
}

// Helper functions
function getDocumentTypeName(type) {
    const types = {
        marksheet: 'Academic Marksheets',
        financial: 'Financial Documents',
        passport: 'Passport',
        ielts: 'IELTS/PTE Score',
        recommendation: 'Recommendation Letters',
        other: 'Other Documents'
    };
    return types[type] || type;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function openUploadModal() {
    uploadModal.style.display = 'block';
}

function closeModal() {
    uploadModal.style.display = 'none';
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Close modal when clicking outside
window.onclick = (event) => {
    if (event.target === uploadModal) {
        closeModal();
    }
}; 