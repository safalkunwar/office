import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    push,
    onValue,
    update,
    remove 
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { auth } from '../config/firebase.js';
import { firebaseConfig } from '../config/firebase.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Load Requirements
function loadRequirements() {
    const requirementsRef = ref(db, 'documentRequirements');
    onValue(requirementsRef, (snapshot) => {
        const requirements = snapshot.val();
        let html = '';
        
        if (requirements) {
            Object.entries(requirements).forEach(([key, req]) => {
                html += `
                    <div class="requirement-card">
                        <div class="requirement-info">
                            <h3>${req.name}</h3>
                            <p>${req.description}</p>
                            <div class="requirement-meta">
                                <span class="format-badge">
                                    <i class="fas fa-file"></i> ${req.allowedFormats}
                                </span>
                                <span class="required-badge ${req.required ? 'required' : 'optional'}">
                                    ${req.required ? 'Required' : 'Optional'}
                                </span>
                            </div>
                        </div>
                        <div class="requirement-actions">
                            <button class="btn btn-small" onclick="editRequirement('${key}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-small btn-danger" onclick="deleteRequirement('${key}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        document.getElementById('requirementsGrid').innerHTML = html || '<p>No requirements defined.</p>';
    });
}

// Add Requirement
document.getElementById('addRequirementForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const requirementData = {
        name: document.getElementById('documentName').value,
        description: document.getElementById('documentDescription').value,
        required: document.getElementById('isRequired').checked,
        allowedFormats: document.getElementById('allowedFormats').value.split(',').map(f => f.trim()),
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser.uid
    };
    
    try {
        const requirementsRef = ref(db, 'documentRequirements');
        await push(requirementsRef, requirementData);
        closeModal();
        document.getElementById('addRequirementForm').reset();
        alert('Requirement added successfully!');
    } catch (error) {
        console.error('Error adding requirement:', error);
        alert('Error adding requirement. Please try again.');
    }
});

// Edit Requirement
window.editRequirement = async function(requirementId) {
    const requirementRef = ref(db, `documentRequirements/${requirementId}`);
    const snapshot = await get(requirementRef);
    
    if (snapshot.exists()) {
        const requirement = snapshot.val();
        // Populate form
        document.getElementById('documentName').value = requirement.name;
        document.getElementById('documentDescription').value = requirement.description;
        document.getElementById('isRequired').checked = requirement.required;
        document.getElementById('allowedFormats').value = requirement.allowedFormats.join(',');
        
        // Update form submission handler
        const form = document.getElementById('addRequirementForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const updatedData = {
                name: document.getElementById('documentName').value,
                description: document.getElementById('documentDescription').value,
                required: document.getElementById('isRequired').checked,
                allowedFormats: document.getElementById('allowedFormats').value.split(',').map(f => f.trim()),
                updatedAt: new Date().toISOString(),
                updatedBy: auth.currentUser.uid
            };
            
            try {
                await update(requirementRef, updatedData);
                closeModal();
                form.reset();
                form.onsubmit = null; // Reset form handler
                alert('Requirement updated successfully!');
            } catch (error) {
                console.error('Error updating requirement:', error);
                alert('Error updating requirement. Please try again.');
            }
        };
        
        openAddRequirementModal();
    }
};

// Delete Requirement
window.deleteRequirement = async function(requirementId) {
    if (!confirm('Are you sure you want to delete this requirement?')) return;
    
    try {
        await remove(ref(db, `documentRequirements/${requirementId}`));
        alert('Requirement deleted successfully!');
    } catch (error) {
        console.error('Error deleting requirement:', error);
        alert('Error deleting requirement. Please try again.');
    }
};

// Modal Functions
window.openAddRequirementModal = function() {
    document.getElementById('addRequirementModal').style.display = 'block';
};

window.closeModal = function() {
    document.getElementById('addRequirementModal').style.display = 'none';
    document.getElementById('addRequirementForm').reset();
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadRequirements();
}); 