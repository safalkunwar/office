import { db, auth } from '../firebase-init.js';
import { ref, push, set, get, update, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";

class VisaTracker {
    constructor() {
        this.visas = {};
        this.init();
    }

    init() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.loadVisas();
                this.setupListeners();
            } else {
                window.location.href = '../../login.html';
            }
        });
    }

    setupListeners() {
        // Modal
        const modal = document.getElementById('addVisaModal');
        const btn = document.getElementById('addVisaBtn');
        const closeBtn = modal.querySelector('.modal-close');

        btn.addEventListener('click', () => modal.style.display = 'block');
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });

        // Form
        const form = document.getElementById('addVisaForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addVisa(new FormData(form));
            form.reset();
            modal.style.display = 'none';
        });
    }

    async addVisa(formData) {
        const visaData = {
            studentId: formData.get('studentId'),
            studentName: formData.get('studentName'),
            country: formData.get('country'),
            visaType: formData.get('visaType'),
            stage: 'preparation',
            appliedDate: null,
            interviewDate: null,
            decisionDate: null,
            grantedDate: null,
            documents: [],
            notes: '',
            addedBy: auth.currentUser.uid,
            addedAt: Date.now()
        };

        const newRef = push(ref(db, 'visas'));
        await set(newRef, visaData);
    }

    async loadVisas() {
        const visasRef = ref(db, 'visas');
        
        onValue(visasRef, (snapshot) => {
            this.visas = {};
            
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    this.visas[child.key] = child.val();
                });
            } else {
                // Add demo data
                this.addDemoVisas();
            }

            this.renderVisas();
        });
    }

    async addDemoVisas() {
        const demoVisas = [
            { studentId: 'S001', studentName: 'John Doe', country: 'USA', visaType: 'Student', stage: 'preparation' },
            { studentId: 'S002', studentName: 'Jane Smith', country: 'UK', visaType: 'Student', stage: 'applied', appliedDate: Date.now() - 86400000 * 10 },
            { studentId: 'S003', studentName: 'Bob Johnson', country: 'Canada', visaType: 'Student', stage: 'interview', interviewDate: Date.now() + 86400000 * 5 },
            { studentId: 'S004', studentName: 'Alice Brown', country: 'Australia', visaType: 'Student', stage: 'decision' },
            { studentId: 'S005', studentName: 'Charlie Wilson', country: 'Germany', visaType: 'Student', stage: 'granted', grantedDate: Date.now() - 86400000 * 2 }
        ];

        for (const visa of demoVisas) {
            const newRef = push(ref(db, 'visas'));
            await set(newRef, { ...visa, addedBy: 'system', addedAt: Date.now(), documents: [], notes: '' });
        }
    }

    renderVisas() {
        const stages = ['preparation', 'applied', 'interview', 'decision', 'granted'];
        const stageCounts = { preparation: 0, applied: 0, interview: 0, decision: 0, granted: 0 };

        // Clear all stages
        stages.forEach(stage => {
            document.getElementById(`stage${this.capitalize(stage)}`).innerHTML = '';
        });

        // Render visas
        Object.entries(this.visas).forEach(([id, visa]) => {
            const stage = visa.stage || 'preparation';
            stageCounts[stage]++;

            const card = this.createVisaCard(id, visa);
            const container = document.getElementById(`stage${this.capitalize(stage)}`);
            if (container) {
                container.appendChild(card);
            }
        });

        // Update counts
        Object.entries(stageCounts).forEach(([stage, count]) => {
            const countEl = document.getElementById(`count${this.capitalize(stage)}`);
            if (countEl) countEl.textContent = count;
        });
    }

    createVisaCard(id, visa) {
        const card = document.createElement('div');
        card.className = 'visa-card';
        card.draggable = true;
        card.dataset.visaId = id;

        card.innerHTML = `
            <h4>${visa.studentName}</h4>
            <p><i class="fas fa-id-card"></i> ${visa.studentId}</p>
            <p><i class="fas fa-globe"></i> ${visa.country} - ${visa.visaType}</p>
            ${visa.appliedDate ? `<p><i class="fas fa-calendar"></i> Applied: ${new Date(visa.appliedDate).toLocaleDateString()}</p>` : ''}
            ${visa.interviewDate ? `<p><i class="fas fa-calendar-check"></i> Interview: ${new Date(visa.interviewDate).toLocaleDateString()}</p>` : ''}
        `;

        // Drag events
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('visaId', id);
            card.style.opacity = '0.5';
        });

        card.addEventListener('dragend', () => {
            card.style.opacity = '1';
        });

        // Click to view details
        card.addEventListener('click', () => {
            alert(`Visa Details:\n\nStudent: ${visa.studentName}\nCountry: ${visa.country}\nStage: ${visa.stage}\n\n(Full detail modal coming soon)`);
        });

        return card;
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    setupDragAndDrop() {
        const stages = document.querySelectorAll('.visa-stage-body');

        stages.forEach(stage => {
            stage.addEventListener('dragover', (e) => {
                e.preventDefault();
                stage.style.background = 'rgba(212, 175, 55, 0.1)';
            });

            stage.addEventListener('dragleave', () => {
                stage.style.background = 'rgba(0,0,0,0.02)';
            });

            stage.addEventListener('drop', async (e) => {
                e.preventDefault();
                stage.style.background = 'rgba(0,0,0,0.02)';

                const visaId = e.dataTransfer.getData('visaId');
                const newStage = stage.dataset.stage;

                if (visaId && newStage) {
                    await this.updateVisaStage(visaId, newStage);
                }
            });
        });
    }

    async updateVisaStage(visaId, newStage) {
        const updates = { stage: newStage };

        // Add timestamps
        if (newStage === 'applied' && !this.visas[visaId].appliedDate) {
            updates.appliedDate = Date.now();
        } else if (newStage === 'granted' && !this.visas[visaId].grantedDate) {
            updates.grantedDate = Date.now();
        }

        await update(ref(db, `visas/${visaId}`), updates);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const tracker = new VisaTracker();
    // Setup drag and drop after a short delay to ensure DOM is ready
    setTimeout(() => tracker.setupDragAndDrop(), 500);
});
