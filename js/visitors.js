import { db, storage, auth } from './firebase-init.js';
import { ref as dbRef, push, set, get, query, orderByChild, startAt, endAt } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-storage.js";

export class VisitorSystem {
    constructor() {
        this.db = db;
        this.storage = storage;
        this.auth = auth;
        this.init();
    }

    init() {
        const form = document.getElementById('visitorForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleVisitorSubmit(e));
        }
        
        this.loadAnalytics();
        document.getElementById('visitorsFilter')?.addEventListener('change', () => this.loadAnalytics());
        
        // Set default datetime
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('visitorDateTime').value = now.toISOString().slice(0, 16);
    }

    async handleVisitorSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('submitVisitorBtn');
        const msg = document.getElementById('visitorFormMsg');
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        msg.className = '';
        msg.textContent = '';

        try {
            const formData = new FormData(e.target);
            const photoFile = formData.get('visitorPhoto');
            let photoUrl = '';

            if (photoFile && photoFile.size > 0) {
                const fileRef = storageRef(this.storage, `visitors/${Date.now()}_${photoFile.name}`);
                const snapshot = await uploadBytes(fileRef, photoFile);
                photoUrl = await getDownloadURL(snapshot.ref);
            }

            const visitorData = {
                name: formData.get('visitorName'),
                contact: formData.get('visitorContact'),
                purpose: formData.get('visitorPurpose'),
                staff: formData.get('visitorStaff'),
                visitDate: formData.get('visitorDateTime'),
                photoUrl: photoUrl,
                recordedBy: this.auth.currentUser?.uid || 'anonymous',
                timestamp: Date.now()
            };

            const newRef = push(dbRef(this.db, 'visitors'));
            await set(newRef, visitorData);

            msg.className = 'success-message';
            msg.textContent = 'Visitor registered successfully!';
            e.target.reset();
            
            // Reset date
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            document.getElementById('visitorDateTime').value = now.toISOString().slice(0, 16);
            
            this.loadAnalytics();

        } catch (error) {
            console.error(error);
            msg.className = 'error-message';
            msg.textContent = 'Error saving visitor: ' + error.message;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Visitor';
        }
    }

    async loadAnalytics() {
        const filter = document.getElementById('visitorsFilter')?.value || 'today';
        const countEl = document.getElementById('totalVisitors');
        if (!countEl) return;

        // Simple count for now (fetching all and filtering client side for simplicity in demo)
        // In production, use startAt/endAt queries
        const snapshot = await get(dbRef(this.db, 'visitors'));
        if (snapshot.exists()) {
            const visitors = Object.values(snapshot.val());
            let count = 0;
            const now = new Date();
            
            visitors.forEach(v => {
                const vDate = new Date(v.visitDate);
                if (filter === 'today') {
                    if (vDate.toDateString() === now.toDateString()) count++;
                } else if (filter === 'week') {
                    // Approx week check
                    const diff = now - vDate;
                    if (diff < 7 * 24 * 60 * 60 * 1000) count++;
                } else if (filter === 'month') {
                    if (vDate.getMonth() === now.getMonth() && vDate.getFullYear() === now.getFullYear()) count++;
                } else {
                    count++;
                }
            });
            
            countEl.textContent = count;
        } else {
            countEl.textContent = '0';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VisitorSystem();
});