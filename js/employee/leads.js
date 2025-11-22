import { db, auth } from '../firebase-init.js';
import { ref, push, set, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";

class LeadsManager {
    constructor() {
        this.init();
    }

    init() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.userId = user.uid;
                this.loadLeads();
                this.setupListeners();
            } else {
                window.location.href = '../../login.html';
            }
        });
    }

    setupListeners() {
        const addBtn = document.getElementById('addLeadBtn');
        const modal = document.getElementById('addLeadModal');
        const closeBtn = document.querySelector('.modal-close');
        const form = document.getElementById('addLeadForm');

        if (addBtn) addBtn.onclick = () => modal.style.display = 'block';
        if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
        window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.createLead(new FormData(form));
                modal.style.display = 'none';
                form.reset();
                this.loadLeads();
            });
        }
    }

    async createLead(formData) {
        const leadData = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            interest: formData.get('interest'),
            source: formData.get('source'),
            status: 'New',
            assignedTo: this.userId,
            createdAt: Date.now(),
            notes: formData.get('notes')
        };

        const newRef = push(ref(db, 'leads'));
        await set(newRef, leadData);
        alert('Lead added successfully!');
    }

    async loadLeads() {
        const container = document.getElementById('leadsTableBody');
        container.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

        // In real app, query by assignedTo
        // const q = query(ref(db, 'leads'), orderByChild('assignedTo'), equalTo(this.userId));
        const snapshot = await get(ref(db, 'leads')); // Fetching all for demo simplicity
        
        if (snapshot.exists()) {
            const leads = [];
            snapshot.forEach(child => {
                const val = child.val();
                // Filter client-side for demo if needed, or just show all
                if (val.assignedTo === this.userId || !val.assignedTo) { 
                    leads.push({ id: child.key, ...val });
                }
            });

            if (leads.length === 0) {
                container.innerHTML = '<tr><td colspan="6" class="text-center">No leads found.</td></tr>';
                return;
            }

            container.innerHTML = leads.map(lead => `
                <tr>
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar">${lead.name.charAt(0)}</div>
                            <div>
                                <div class="font-bold">${lead.name}</div>
                                <div class="text-muted text-sm">${lead.email}</div>
                            </div>
                        </div>
                    </td>
                    <td>${lead.phone}</td>
                    <td>${lead.interest}</td>
                    <td><span class="status-badge ${lead.status.toLowerCase()}">${lead.status}</span></td>
                    <td>${new Date(lead.createdAt).toLocaleDateString()}</td>
                    <td>
                        <button class="btn-icon" onclick="window.editLead('${lead.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon" onclick="window.deleteLead('${lead.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } else {
            container.innerHTML = '<tr><td colspan="6" class="text-center">No leads found.</td></tr>';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LeadsManager();
});
