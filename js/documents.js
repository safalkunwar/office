import { db, storage, auth } from './firebase-init.js';
import { ref as dbRef, get, set, push, update, query, orderByChild, equalTo, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-storage.js";
import { uploadFileToDrive } from './google-drive.js';

export class DocumentsSystem {
    constructor() {
        this.db = db;
        this.storage = storage;
        this.auth = auth;
    }

    getCurrentUser() {
        return this.auth.currentUser;
    }

    /**
     * Get documents for a specific student
     * @param {string} studentId 
     * @returns {Promise<Array>}
     */
    async getStudentDocuments(studentId) {
        const docsRef = dbRef(this.db, `documents/${studentId}`);
        const snapshot = await get(docsRef);
        if (snapshot.exists()) {
            const docs = [];
            snapshot.forEach((child) => {
                docs.push({ id: child.key, ...child.val() });
            });
            return docs;
        }
        return [];
    }

    /**
     * Upload a document
     * @param {string} studentId 
     * @param {File} file 
     * @param {Object} metadata 
     */
    async uploadDocument(studentId, file, metadata) {
        const user = this.getCurrentUser();
        if (!user) throw new Error("Not authenticated");

        let fileUrl = '';
        let storageType = 'firebase';
        let driveId = null;

        // Try Google Drive first if available/configured
        try {
            if (localStorage.getItem('gdrive_connected') === '1') {
                const driveFile = await uploadFileToDrive(file, `Student_${studentId}`);
                fileUrl = driveFile.webViewLink;
                driveId = driveFile.id;
                storageType = 'google_drive';
            } else {
                throw new Error("Drive not connected");
            }
        } catch (e) {
            console.log("Drive upload failed or not configured, falling back to Firebase Storage", e);
            // Fallback to Firebase Storage
            const fileRef = storageRef(this.storage, `documents/${studentId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(fileRef, file);
            fileUrl = await getDownloadURL(snapshot.ref);
        }

        // Save metadata to Database
        const docsRef = dbRef(this.db, `documents/${studentId}`);
        const newDocRef = push(docsRef);
        
        const docData = {
            name: metadata.name,
            type: metadata.type,
            url: fileUrl,
            storageType: storageType,
            driveId: driveId,
            uploadedBy: user.uid,
            uploadedAt: serverTimestamp(),
            status: 'pending', // pending, verified, rejected
            notes: metadata.notes || ''
        };

        await set(newDocRef, docData);
        return newDocRef.key;
    }

    /**
     * Verify or Reject a document (Admin only)
     * @param {string} studentId 
     * @param {string} docId 
     * @param {string} status 'verified' or 'rejected'
     * @param {string} feedback 
     */
    async updateDocumentStatus(studentId, docId, status, feedback = '') {
        const docRef = dbRef(this.db, `documents/${studentId}/${docId}`);
        await update(docRef, {
            status: status,
            feedback: feedback,
            verifiedBy: this.auth.currentUser.uid,
            verifiedAt: serverTimestamp()
        });
    }
}

// UI Helper Class
export class DocumentsUI {
    constructor() {
        this.system = new DocumentsSystem();
        this.init();
    }

    init() {
        // Initialize UI components
        console.log("Documents UI Initialized");
        this.setupModalListeners();
    }

    setupModalListeners() {
        // Generic modal closing
        document.querySelectorAll('.modal-close, .btn-secondary').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });

        window.onclick = (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = "none";
            }
        };
    }

    async loadStudentDocuments(studentId, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '<div class="loading" style="grid-column: 1/-1; text-align: center; padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> Loading documents...</div>';

        try {
            const docs = await this.system.getStudentDocuments(studentId);
            this.renderDocumentsList(docs, container);
        } catch (error) {
            console.error("Error loading documents:", error);
            container.innerHTML = '<div class="error" style="grid-column: 1/-1; text-align: center; padding: 2rem;">Failed to load documents</div>';
        }
    }

    renderDocumentsList(docs, container) {
        if (docs.length === 0) {
            container.innerHTML = '<div class="no-docs" style="grid-column: 1/-1; text-align: center; padding: 2rem;">No documents found.</div>';
            return;
        }

        container.innerHTML = '';
        docs.forEach(doc => {
            const div = document.createElement('div');
            div.className = 'document-card';
            
            // Handle timestamp - could be server timestamp or regular number
            let dateStr = 'N/A';
            if (doc.uploadedAt) {
                try {
                    dateStr = new Date(doc.uploadedAt).toLocaleDateString();
                } catch (e) {
                    dateStr = 'Recently';
                }
            }
            
            div.innerHTML = `
                <div class="doc-icon">
                    <i class="fas ${this.getIconForType(doc.type)}"></i>
                </div>
                <div class="doc-info">
                    <h4>${doc.name}</h4>
                    <p>${doc.type} • ${dateStr}</p>
                    <span class="status-badge ${doc.status}">${doc.status}</span>
                </div>
                <div class="doc-actions">
                    <a href="${doc.url}" target="_blank" class="btn-icon" title="View"><i class="fas fa-eye"></i></a>
                </div>
            `;
            container.appendChild(div);
        });
    }

    getIconForType(type) {
        const map = {
            'passport': 'fa-passport',
            'transcript': 'fa-file-alt',
            'certificate': 'fa-certificate',
            'cv': 'fa-file-user',
            'financial': 'fa-file-invoice-dollar',
            'medical': 'fa-notes-medical'
        };
        return map[type] || 'fa-file';
    }
}

// Auto-initialize if on a page with the script
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('script[src*="documents.js"]')) {
        window.documentsUI = new DocumentsUI();
    }
});