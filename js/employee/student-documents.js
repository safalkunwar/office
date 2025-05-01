import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    onValue,
    push,
    update,
    get,
    remove 
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { 
    getStorage, 
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject 
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-storage.js";
import { auth } from '../config/firebase.js';
import { firebaseConfig } from '../config/firebase.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

// Get student ID from URL
const urlParams = new URLSearchParams(window.location.search);
const studentId = urlParams.get('id');

if (!studentId) {
    window.location.href = 'dashboard.html';
}

// Load Student Information
async function loadStudentInfo() {
    const studentRef = ref(db, `students/${studentId}`);
    const snapshot = await get(studentRef);
    
    if (snapshot.exists()) {
        const student = snapshot.val();
        document.getElementById('studentInfo').innerHTML = `
            <div class="student-details">
                <h2>${student.name}</h2>
                <p><i class="fas fa-envelope"></i> ${student.email}</p>
                <p><i class="fas fa-phone"></i> ${student.phone}</p>
                <p><i class="fas fa-graduation-cap"></i> ${student.course}</p>
            </div>
        `;
    }
}

// Load Document Requirements
async function loadDocumentRequirements() {
    const requirementsRef = ref(db, 'documentRequirements');
    const snapshot = await get(requirementsRef);
    
    if (snapshot.exists()) {
        const requirements = snapshot.val();
        const select = document.getElementById('documentType');
        select.innerHTML = '<option value="">Select Document Type</option>';
        
        Object.entries(requirements).forEach(([key, req]) => {
            select.innerHTML += `<option value="${key}">${req.name}</option>`;
        });
    }
}

// Load Student Documents
async function loadStudentDocuments() {
    const documentsRef = ref(db, `students/${studentId}/documents`);
    const requirementsRef = ref(db, 'documentRequirements');
    
    try {
        const [docsSnapshot, reqSnapshot] = await Promise.all([
            get(documentsRef),
            get(requirementsRef)
        ]);
        
        const requirements = reqSnapshot.val() || {};
        const documents = docsSnapshot.val() || {};
        let html = '<div class="documents-list">';
        
        // First show uploaded documents
        Object.entries(documents).forEach(([type, doc]) => {
            const requirement = requirements[type] || {};
            html += createDocumentCard(type, doc, requirement);
        });
        
        // Then show missing required documents
        Object.entries(requirements).forEach(([type, req]) => {
            if (req.required && !documents[type]) {
                html += createMissingDocumentCard(type, req);
            }
        });
        
        html += '</div>';
        document.getElementById('documentsGrid').innerHTML = html;
    } catch (error) {
        console.error('Error loading documents:', error);
    }
}

function createDocumentCard(type, doc, requirement) {
    return `
        <div class="document-card uploaded">
            <div class="document-info">
                <h3>${requirement.name || type}</h3>
                <p>Uploaded: ${new Date(doc.uploadedAt).toLocaleDateString()}</p>
                <div class="document-actions">
                    <a href="${doc.url}" target="_blank" class="btn btn-small">
                        <i class="fas fa-eye"></i> View
                    </a>
                    <button class="btn btn-small btn-danger" onclick="deleteDocument('${type}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `;
}

function createMissingDocumentCard(type, requirement) {
    return `
        <div class="document-card missing">
            <div class="document-info">
                <h3>${requirement.name}</h3>
                <p class="missing-text">Required document not uploaded</p>
                <button class="btn btn-primary btn-small" onclick="openUploadModal('${type}')">
                    <i class="fas fa-upload"></i> Upload Now
                </button>
            </div>
        </div>
    `;
}

// Update the upload function
async function uploadDocument(file, documentType) {
    try {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('File type not supported. Please upload a JPG, PNG or PDF file.');
        }

        // Create a unique filename
        const fileExtension = file.name.split('.').pop();
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
        
        // Create storage reference with correct path
        const fileRef = storageRef(storage, `documents/${studentId}/${documentType}/${uniqueFileName}`);
        
        // Set metadata with CORS headers
        const metadata = {
            contentType: file.type,
            customMetadata: {
                'uploadedBy': auth.currentUser.uid,
                'documentType': documentType,
                'originalName': file.name
            }
        };

        // Upload file
        const snapshot = await uploadBytes(fileRef, file, metadata);
        console.log('Upload completed');

        // Get download URL with custom token
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Update database
        await update(ref(db, `students/${studentId}/documents/${documentType}`), {
            url: downloadURL,
            filename: uniqueFileName,
            originalName: file.name,
            contentType: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            uploadedBy: auth.currentUser.uid
        });

        // Log activity
        await logActivity('document_upload', `Uploaded ${documentType} for student ${studentId}`);

        return downloadURL;
    } catch (error) {
        console.error('Error in uploadDocument:', error);
        throw new Error(error.message || 'Error uploading document. Please try again.');
    }
}

// Add this function to handle document preview
function createDocumentPreview(url, type) {
    if (type.startsWith('image/')) {
        return `<img src="${url}" alt="Document Preview" class="document-preview">`;
    } else {
        return `<iframe src="${url}" class="document-preview"></iframe>`;
    }
}

// Update the document display function
function displayDocument(doc, type) {
    return `
        <div class="document-card uploaded">
            <div class="document-info">
                <h3>${doc.originalName || doc.filename}</h3>
                <div class="document-preview-container">
                    ${createDocumentPreview(doc.url, doc.contentType)}
                </div>
                <div class="document-meta">
                    <p>Uploaded: ${new Date(doc.uploadedAt).toLocaleDateString()}</p>
                    <p>Type: ${doc.contentType}</p>
                </div>
                <div class="document-actions">
                    <a href="${doc.url}" class="btn btn-small" target="_blank">
                        <i class="fas fa-download"></i> Download
                    </a>
                    <button class="btn btn-danger btn-small" onclick="deleteDocument('${type}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Update the form submission handler
document.getElementById('uploadDocumentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const documentType = document.getElementById('documentType').value;
    const file = document.getElementById('documentFile').files[0];
    const uploadButton = e.target.querySelector('button[type="submit"]');
    const originalButtonText = uploadButton.innerHTML;
    
    if (!documentType || !file) {
        alert('Please select a document type and file');
        return;
    }
    
    try {
        // Disable button and show loading state
        uploadButton.disabled = true;
        uploadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        
        await uploadDocument(file, documentType);
        
        closeModal();
        loadStudentDocuments();
        alert('Document uploaded successfully!');
    } catch (error) {
        console.error('Upload error:', error);
        alert(error.message);
    } finally {
        // Reset button state
        uploadButton.disabled = false;
        uploadButton.innerHTML = originalButtonText;
    }
});

// Delete Document
window.deleteDocument = async function(documentType) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
        const docRef = ref(db, `students/${studentId}/documents/${documentType}`);
        const snapshot = await get(docRef);
        
        if (snapshot.exists()) {
            const doc = snapshot.val();
            // Delete from storage
            const fileRef = storageRef(storage, `students/${studentId}/documents/${documentType}_${doc.filename}`);
            await deleteObject(fileRef);
            
            // Delete from database
            await remove(docRef);
            
            loadStudentDocuments();
            alert('Document deleted successfully!');
        }
    } catch (error) {
        console.error('Error deleting document:', error);
        alert('Error deleting document. Please try again.');
    }
};

// Modal Functions
window.openUploadModal = function(preselectedType = '') {
    document.getElementById('uploadModal').style.display = 'block';
    if (preselectedType) {
        document.getElementById('documentType').value = preselectedType;
    }
};

window.closeModal = function() {
    document.getElementById('uploadModal').style.display = 'none';
    document.getElementById('uploadDocumentForm').reset();
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadStudentInfo();
    loadDocumentRequirements();
    loadStudentDocuments();
}); 