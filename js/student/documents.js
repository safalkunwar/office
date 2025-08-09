import { auth, db } from '../../config/firebase.js';
import { ref, onValue, push, remove, update, get, query, orderByChild, equalTo } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { uploadFileToDrive } from '../google-drive.js';

// DOM Elements
const studentAvatar = document.getElementById('studentAvatar');
const studentName = document.getElementById('studentName');
const studentId = document.getElementById('studentId');
const studentEmail = document.getElementById('studentEmail');
const documentsGrid = document.getElementById('documentsGrid');
const uploadModal = document.getElementById('uploadModal');
const uploadForm = document.getElementById('uploadDocumentForm');
const errorContainer = document.getElementById('errorContainer');

// Required document types
const requiredDocuments = [
    'marksheet',
    'financial',
    'passport',
    'ielts',
    'recommendation'
];

let currentStudentRecordId = null;

// Initialize the page
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            currentStudentRecordId = await resolveStudentRecordIdByEmail(user.email);
        } catch (_) {
            currentStudentRecordId = user.uid;
        }
        loadStudentInfo(currentStudentRecordId);
        loadDocuments(currentStudentRecordId);
        setupEventListeners(currentStudentRecordId);
    } else {
        // For demo purposes, use a mock user if not authenticated
        const mockUserId = 'demo-user-123';
        currentStudentRecordId = mockUserId;
        loadStudentInfo(mockUserId);
        loadDocuments(mockUserId);
        setupEventListeners(mockUserId);
    }
});

async function resolveStudentRecordIdByEmail(email) {
    if (!email) throw new Error('No email');
    const studentsRef = ref(db, 'students');
    const q = query(studentsRef, orderByChild('email'), equalTo(email));
    const snap = await get(q);
    if (snap.exists()) {
        const firstKey = Object.keys(snap.val())[0];
        return firstKey;
    }
    throw new Error('Student record not found by email');
}

// Load student information
function loadStudentInfo(recordId) {
    if (recordId === 'demo-user-123') {
        // Mock data for demo
        studentName.textContent = 'John Doe';
        studentId.textContent = 'Student ID: STU001';
        studentEmail.textContent = 'Email: john.doe@example.com';
        studentAvatar.src = '../../assets/default-avatar.svg';
        return;
    }

    const studentRef = ref(db, `students/${recordId}`);
    onValue(studentRef, (snapshot) => {
        const studentData = snapshot.val();
        if (studentData) {
            const displayName = `${studentData.firstName || ''} ${studentData.lastName || ''}`.trim() || (studentData.name || 'Student');
            studentName.textContent = displayName;
            studentId.textContent = `Student ID: ${studentData.studentId || recordId}`;
            studentEmail.textContent = `Email: ${studentData.email || ''}`;
            if (studentData.avatar) {
                studentAvatar.src = studentData.avatar;
            } else {
                studentAvatar.src = '../../assets/default-avatar.svg';
            }
        }
    }, (error) => {
        console.error('Error loading student info:', error);
        showError('Failed to load student information');
    });
}

// Load documents
function loadDocuments(recordId) {
    if (recordId === 'demo-user-123') {
        // Mock documents for demo
        const mockDocuments = {
            marksheet: {
                name: 'Academic Transcript.pdf',
                type: 'marksheet',
                url: '#',
                size: 1024000,
                timestamp: Date.now() - 86400000,
                notes: 'High school transcript',
                previewUrl: null,
                driveId: 'mock-drive-id-1'
            }
        };
        updateDocumentStatus(mockDocuments);
        renderDocuments(mockDocuments);
        return;
    }

    // Prefer admin path (list of documents)
    const adminDocsRef = ref(db, `students/${recordId}/documents`);
    onValue(adminDocsRef, (snapshot) => {
        if (snapshot.exists()) {
            const docsById = snapshot.val() || {};
            updateDocumentStatus(docsById);
            renderDocuments(docsById);
        } else {
            // Fallback to legacy path grouped by type
            const legacyRef = ref(db, `documents/${recordId}`);
            onValue(legacyRef, (snap2) => {
                const documents = snap2.val() || {};
                updateDocumentStatus(documents);
                renderDocuments(documents);
            }, (error) => {
                console.error('Error loading documents (legacy):', error);
                showError('Failed to load documents');
            });
        }
    }, (error) => {
        console.error('Error loading documents:', error);
        showError('Failed to load documents');
    });
}

// Update document status indicators
function updateDocumentStatus(documents) {
    // Normalize: either docs keyed by type OR keyed by id with a .type
    const presentTypes = new Set();
    Object.entries(documents || {}).forEach(([key, value]) => {
        if (value && typeof value === 'object') {
            if (value.type) presentTypes.add(value.type);
            else presentTypes.add(key);
        }
    });

    let completedCount = 0;
    requiredDocuments.forEach(type => {
        const card = document.querySelector(`.requirement-card[data-type="${type}"]`);
        const hasDoc = presentTypes.has(type);
        if (card) {
            const statusBadge = card.querySelector('.status-badge');
            if (hasDoc) {
                statusBadge.className = 'status-badge completed';
                statusBadge.textContent = 'Completed';
                completedCount++;
            } else {
                statusBadge.className = 'status-badge missing';
                statusBadge.textContent = 'Missing';
            }
        }
    });

    // Show overall completion summary
    let summaryEl = document.getElementById('docCompletionSummary');
    if (!summaryEl) {
        summaryEl = document.createElement('div');
        summaryEl.id = 'docCompletionSummary';
        summaryEl.style.margin = '8px 0 16px';
        const container = document.querySelector('.document-requirements');
        if (container) container.insertAdjacentElement('afterend', summaryEl);
    }
    const total = requiredDocuments.length;
    const isAllComplete = completedCount === total;
    summaryEl.innerHTML = `<span class="status-badge ${isAllComplete ? 'completed' : 'missing'}">${completedCount}/${total} ${isAllComplete ? 'Completed' : 'Incomplete'}</span>`;
}

// Render documents in the grid
function renderDocuments(documents) {
    documentsGrid.innerHTML = '';

    // Normalize to an array of docs
    const docsArray = [];
    Object.entries(documents || {}).forEach(([key, doc]) => {
        if (doc && typeof doc === 'object') {
            const norm = {
                id: key,
                name: doc.name || doc.filename || 'Document',
                type: doc.type || key,
                url: doc.fileUrl || doc.url || null,
                size: doc.fileSize || doc.size || 0,
                timestamp: doc.uploadedAt ? Date.parse(doc.uploadedAt) : (doc.timestamp || Date.now()),
                previewUrl: doc.previewUrl || null,
                driveId: doc.driveId || null,
                fileName: doc.fileName || doc.name || 'file'
            };
            docsArray.push(norm);
        }
    });

    if (docsArray.length === 0) {
        documentsGrid.innerHTML = '<p class="no-documents">No documents uploaded yet.</p>';
        return;
    }

    // Sort newest first
    docsArray.sort((a, b) => b.timestamp - a.timestamp);

    docsArray.forEach(doc => {
        const documentCard = createDocumentCard(doc.type, doc);
        documentsGrid.appendChild(documentCard);
    });
}

// Create document card element
function createDocumentCard(type, doc) {
    const card = document.createElement('div');
    card.className = 'document-card';
    
    const preview = document.createElement('img');
    preview.src = doc.previewUrl || '../../assets/document-placeholder.svg';
    preview.alt = doc.name;
    preview.onerror = function() {
        this.src = '../../assets/document-placeholder.svg';
    };
    
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
    viewBtn.onclick = () => {
        if (doc.driveId && doc.driveId !== 'mock-drive-id-1') {
            // Open Google Drive file
            window.open(`https://drive.google.com/file/d/${doc.driveId}/view`, '_blank');
        } else if (doc.url && doc.url !== '#') {
            window.open(doc.url, '_blank');
        } else {
            showError('Document preview not available');
        }
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    deleteBtn.onclick = () => deleteDocument(doc.id, doc.driveId);
    
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
function setupEventListeners(recordId) {
    // Upload form submission
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const file = document.getElementById('documentFile').files[0];
        const type = document.getElementById('documentType').value;
        const notes = document.getElementById('documentNotes').value;
        
        if (!file || !type) {
            showError('Please select a file and document type');
            return;
        }
        
        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            showError('File size must be less than 5MB');
            return;
        }
        
        const submitBtn = uploadForm.querySelector('button[type="submit"]');
        const originalBtnHtml = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        
        try {
            if (recordId === 'demo-user-123') {
                // Mock upload for demo
                await mockUploadDocument(file, type, notes);
            } else {
                await uploadDocumentToGoogleDrive(recordId, file, type, notes);
            }
            closeModal();
            uploadForm.reset();
            showSuccess('Document uploaded successfully');
        } catch (error) {
            console.error('Upload error:', error);
            showError(error?.message || 'Failed to upload document. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
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

// Mock upload for demo purposes
async function mockUploadDocument(file, type, notes) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const mockDoc = {
                name: file.name,
                type: type,
                url: '#',
                size: file.size,
                timestamp: Date.now(),
                notes: notes || '',
                previewUrl: null,
                driveId: 'mock-drive-id-' + Date.now()
            };
            
            // Add to mock documents
            const documentsGrid = document.getElementById('documentsGrid');
            const noDocumentsMsg = documentsGrid.querySelector('.no-documents');
            if (noDocumentsMsg) {
                noDocumentsMsg.remove();
            }
            
            const documentCard = createDocumentCard(type, mockDoc);
            documentsGrid.appendChild(documentCard);
            
            // Update status
            updateDocumentStatus({ [type]: mockDoc });
            
            resolve();
        }, 1000);
    });
}

// Upload document to Google Drive
async function uploadDocumentToGoogleDrive(recordId, file, type, notes) {
    try {
        const token = localStorage.getItem('gdrive_token');
        const folder = localStorage.getItem('gdrive_folder');
        if (!token || !folder) {
            console.warn('Google Drive not connected in localStorage; proceeding to authenticate during upload.');
        }

        const driveResponse = await uploadFileToDrive(file);
        if (!driveResponse?.id) {
            throw new Error('Failed to upload file to Google Drive');
        }

        const driveId = driveResponse.id;
        const fileUrl = `https://drive.google.com/file/d/${driveId}/view`;
        const previewUrl = file.type.startsWith('image/') ? `https://drive.google.com/uc?id=${driveId}` : null;

        // Save to admin-visible path
        const adminDocData = {
            name: file.name,
            type,
            fileUrl,
            fileName: file.name,
            fileSize: file.size,
            expiryDate: null,
            notes: notes || '',
            status: 'pending',
            uploadedAt: new Date().toISOString(),
            verifiedAt: null,
            verifiedBy: null,
            driveId
        };
        const adminDocsRef = ref(db, `students/${recordId}/documents`);
        await push(adminDocsRef, adminDocData);

        // Also keep legacy path updated for existing UI
        const legacyData = {
            name: file.name,
            type,
            url: fileUrl,
            size: file.size,
            timestamp: Date.now(),
            notes: notes || '',
            previewUrl,
            driveId
        };
        const legacyRef = ref(db, `documents/${recordId}/${type}`);
        await push(legacyRef, legacyData);

    } catch (error) {
        console.error('Upload error:', error);
        throw new Error(error.message || 'Failed to upload document');
    }
}

// Delete document
async function deleteDocument(documentId, driveId) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
        // Delete from Google Drive if it's a real file
        if (driveId && driveId !== 'mock-drive-id-1' && !driveId.startsWith('mock-drive-id-')) {
            const token = localStorage.getItem('gdrive_token');
            if (token) {
                await fetch(`https://www.googleapis.com/drive/v3/files/${driveId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        }
        
        // Delete from Firebase Database
        if (auth.currentUser && auth.currentUser.uid !== 'demo-user-123') {
            const documentRef = ref(db, `documents/${auth.currentUser.uid}/${documentId}`);
            await remove(documentRef);
        }
        
        showSuccess('Document deleted successfully');
    } catch (error) {
        console.error('Delete error:', error);
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

function showError(message) {
    if (errorContainer) {
        errorContainer.innerHTML = `<div class="error-message">${message}</div>`;
        errorContainer.style.display = 'block';
        
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

function showSuccess(message) {
    if (errorContainer) {
        errorContainer.innerHTML = `<div class="success-message">${message}</div>`;
        errorContainer.style.display = 'block';
        
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 3000);
    }
}

// Make functions globally available
window.openUploadModal = function() {
    if (uploadModal) {
        uploadModal.style.display = 'block';
    }
};

window.closeModal = function() {
    if (uploadModal) {
        uploadModal.style.display = 'none';
    }
};

// Check Google Drive connection status
function checkGoogleDriveConnection() {
    const token = localStorage.getItem('gdrive_token');
    const folder = localStorage.getItem('gdrive_folder');
    return !!(token && folder);
}

// Add Google Drive connection status to the page
function updateGoogleDriveStatus() {
    const isConnected = checkGoogleDriveConnection();
    const statusElement = document.createElement('div');
    statusElement.className = 'google-drive-status';
    statusElement.innerHTML = `
        <div class="status-indicator ${isConnected ? 'connected' : 'disconnected'}">
            <i class="fas ${isConnected ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
            <span>Google Drive: ${isConnected ? 'Connected' : 'Not Connected'}</span>
        </div>
    `;
    
    // Add to the header
    const header = document.querySelector('.content-header');
    if (header && !document.querySelector('.google-drive-status')) {
        header.appendChild(statusElement);
    }
}

// Initialize Google Drive status
document.addEventListener('DOMContentLoaded', () => {
    updateGoogleDriveStatus();
}); 