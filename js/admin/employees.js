import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    push,
    onValue,
    update,
    get,
    set,
    remove,
    query,
    orderByChild,
    equalTo
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { auth } from '../config/firebase.js';
import { firebaseConfig } from '../config/firebase.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Modal Functions
window.openAddEmployeeModal = function() {
    document.getElementById('addEmployeeModal').style.display = 'block';
};

window.closeModal = function() {
    document.getElementById('addEmployeeModal').style.display = 'none';
};

// Add this function to generate employee credentials
async function generateEmployeeCredentials(name, role) {
    // Get current count of employees with same role
    const employeesRef = ref(db, 'employees');
    const roleQuery = query(employeesRef, orderByChild('role'), equalTo(role));
    const snapshot = await get(roleQuery);
    const employeeCount = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
    
    // Generate sequence number (padded with zeros)
    const sequence = String(employeeCount + 1).padStart(3, '0');
    
    // Get year
    const year = new Date().getFullYear().toString().substr(-2);
    
    // Get role prefix
    const rolePrefix = {
        'counselor': 'CNS',
        'coordinator': 'COR',
        'manager': 'MGR'
    }[role] || 'EMP';

    // Generate employee ID (e.g., CNS24001)
    const employeeId = `${rolePrefix}${year}${sequence}`;

    // Generate default password (employeeId + first 3 letters of name)
    const defaultPassword = `${employeeId}${name.substring(0, 3).toLowerCase()}`;
    
    return { employeeId, defaultPassword };
}

// Add Employee Function
async function addEmployee(e) {
    e.preventDefault();
    
    const name = document.getElementById('employeeName').value;
    const email = document.getElementById('employeeEmail').value;
    const role = document.getElementById('employeeRole').value;
    const phone = document.getElementById('employeePhone').value;

    try {
        // Get current count for role
        const employeesRef = ref(db, 'employees');
        const roleQuery = query(employeesRef, orderByChild('role'), equalTo(role));
        const snapshot = await get(roleQuery);
        const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;

        // Generate employee ID
        const timestamp = new Date().getFullYear().toString().substr(-2);
        const rolePrefix = {
            'counselor': 'CNS',
            'coordinator': 'COR',
            'manager': 'MGR'
        }[role] || 'EMP';
        const sequence = String(count + 1).padStart(3, '0');
        const employeeId = `${rolePrefix}${timestamp}${sequence}`;
        
        // Generate password
        const defaultPassword = `${employeeId}${name.substring(0, 3).toLowerCase()}`;

        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, defaultPassword);
        
        // Add to employees collection
        const employeeRef = ref(db, `employees/${userCredential.user.uid}`);
        await set(employeeRef, {
            name,
            email,
            role,
            phone,
            employeeId,
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy: auth.currentUser.uid
        });

        // Show credentials
        alert(`
Employee added successfully!

Employee ID: ${employeeId}
Default Password: ${defaultPassword}

Please share these credentials with the employee.
        `);
        
        closeModal();
        document.getElementById('addEmployeeForm').reset();
        loadEmployees();
    } catch (error) {
        console.error('Error adding employee:', error);
        alert(`Error adding employee: ${error.message}`);
    }
}

// Add this function to show credentials in a modal
function showCredentialsModal(employeeId, password, email) {
    const credentialsHtml = `
        <div class="credentials-box">
            <h3>Employee Credentials</h3>
            <div class="credential-item">
                <label>Employee ID:</label>
                <input type="text" value="${employeeId}" readonly>
                <button onclick="copyToClipboard(this.previousElementSibling)">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
            <div class="credential-item">
                <label>Password:</label>
                <div class="password-field">
                    <input type="password" value="${password}" readonly>
                    <button class="toggle-password" onclick="togglePasswordVisibility(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="copyToClipboard(this.previousElementSibling.previousElementSibling)">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="credential-item">
                <label>Email:</label>
                <input type="text" value="${email}" readonly>
                <button onclick="copyToClipboard(this.previousElementSibling)">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
            <div class="credentials-note">
                <p>Please save these credentials securely and share them with the employee.</p>
                <p>The employee will be required to change their password on first login.</p>
            </div>
            <button class="btn btn-primary" onclick="closeCredentialsModal()">Close</button>
        </div>
    `;

    const modal = document.createElement('div');
    modal.className = 'modal credentials-modal';
    modal.innerHTML = credentialsHtml;
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// Add helper functions
window.copyToClipboard = function(element) {
    element.select();
    document.execCommand('copy');
    const originalText = element.nextElementSibling.innerHTML;
    element.nextElementSibling.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => {
        element.nextElementSibling.innerHTML = originalText;
    }, 1000);
};

window.closeCredentialsModal = function() {
    const modal = document.querySelector('.credentials-modal');
    if (modal) {
        modal.remove();
    }
};

// Load Employees
async function loadEmployees() {
    const employeesRef = ref(db, 'employees');
    
    onValue(employeesRef, (snapshot) => {
        let html = '';
        snapshot.forEach((childSnapshot) => {
            const employee = childSnapshot.val();
            html += `
                <div class="employee-card ${employee.status === 'inactive' ? 'inactive' : ''}">
                    <div class="employee-info">
                        <h3>${employee.name}</h3>
                        <p><i class="fas fa-id-badge"></i> ${employee.employeeId}</p>
                        <p><i class="fas fa-envelope"></i> ${employee.email}</p>
                        <p><i class="fas fa-user-tag"></i> ${employee.role}</p>
                        <p><i class="fas fa-phone"></i> ${employee.phone || 'N/A'}</p>
                        <p><i class="fas fa-circle"></i> ${employee.status || 'active'}</p>
                    </div>
                    <div class="employee-actions">
                        <button class="btn btn-small" onclick="editEmployee('${childSnapshot.key}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger btn-small" onclick="deleteEmployee('${childSnapshot.key}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        });
        document.getElementById('employeesContainer').innerHTML = html || '<p>No employees found.</p>';
    });
}

// Delete Employee
window.deleteEmployee = async function(employeeId) {
    if (confirm('Are you sure you want to delete this employee?')) {
        try {
            await remove(ref(db, `employees/${employeeId}`));
            alert('Employee deleted successfully!');
        } catch (error) {
            console.error('Error deleting employee:', error);
            alert('Error deleting employee. Please try again.');
        }
    }
};

// Log Activity
async function logActivity(type, description) {
    try {
        const activityRef = ref(db, 'activities');
        await push(activityRef, {
            type,
            description,
            timestamp: new Date().toISOString(),
            userId: auth.currentUser.uid
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Edit Employee
window.editEmployee = async function(employeeId) {
    const employeeRef = ref(db, `employees/${employeeId}`);
    const snapshot = await get(employeeRef);
    const employee = snapshot.val();

    document.getElementById('editEmployeeId').value = employeeId;
    document.getElementById('editEmployeeIdDisplay').value = employee.employeeId;
    document.getElementById('editEmployeeName').value = employee.name;
    document.getElementById('editEmployeeEmail').value = employee.email;
    document.getElementById('editEmployeeRole').value = employee.role;
    document.getElementById('editEmployeePhone').value = employee.phone;
    document.getElementById('editEmployeeStatus').value = employee.status || 'active';

    document.getElementById('editEmployeeModal').style.display = 'block';
};

// Reset Password
window.resetPassword = async function() {
    const employeeId = document.getElementById('editEmployeeId').value;
    const employeeRef = ref(db, `employees/${employeeId}`);
    const snapshot = await get(employeeRef);
    const employee = snapshot.val();

    try {
        // Send password reset email
        await sendPasswordResetEmail(auth, employee.email);

        // Log activity
        await logActivity('password_reset_requested', `Password reset email sent to: ${employee.name}`);

        // Update employee status in database
        await update(employeeRef, {
            passwordResetRequested: new Date().toISOString()
        });

        alert(`Password reset email has been sent to ${employee.email}. Please ask the employee to check their email and follow the instructions to reset their password.`);
    } catch (error) {
        console.error('Error requesting password reset:', error);
        alert('Error requesting password reset. Please try again.');
    }
};

// Add function to handle employee status updates
window.updateEmployeeStatus = async function(e) {
    e.preventDefault();
    
    const employeeId = document.getElementById('editEmployeeId').value;
    const name = document.getElementById('editEmployeeName').value;
    const role = document.getElementById('editEmployeeRole').value;
    const phone = document.getElementById('editEmployeePhone').value;
    const status = document.getElementById('editEmployeeStatus').value;

    try {
        const employeeRef = ref(db, `employees/${employeeId}`);
        await update(employeeRef, {
            name,
            role,
            phone,
            status,
            updatedAt: new Date().toISOString(),
            updatedBy: auth.currentUser.uid
        });

        // Log activity
        await logActivity('employee_updated', `Updated employee details: ${name}`);

        closeModal();
        alert('Employee details updated successfully!');
    } catch (error) {
        console.error('Error updating employee:', error);
        alert('Error updating employee details. Please try again.');
    }
};

// Update the edit employee form submission
document.getElementById('editEmployeeForm').addEventListener('submit', updateEmployeeStatus);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Add form submit event listener
    const addEmployeeForm = document.getElementById('addEmployeeForm');
    if (addEmployeeForm) {
        addEmployeeForm.addEventListener('submit', addEmployee);
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };

    // Load initial data
    loadEmployees();
});

// Add the toggle password visibility function
window.togglePasswordVisibility = function(button) {
    const input = button.previousElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
};

// Add this function to fix existing employees
async function fixEmployeeIds() {
    const employeesRef = ref(db, 'employees');
    const snapshot = await get(employeesRef);
    
    if (snapshot.exists()) {
        const updates = {};
        const roleCount = {
            counselor: 0,
            coordinator: 0,
            manager: 0
        };

        // First pass to count roles
        snapshot.forEach((childSnapshot) => {
            const employee = childSnapshot.val();
            if (employee.role) {
                roleCount[employee.role] = (roleCount[employee.role] || 0) + 1;
            }
        });

        // Second pass to update IDs
        snapshot.forEach((childSnapshot) => {
            const employee = childSnapshot.val();
            if (!employee.employeeId) {
                const rolePrefix = {
                    'counselor': 'CNS',
                    'coordinator': 'COR',
                    'manager': 'MGR'
                }[employee.role] || 'EMP';
                
                const timestamp = new Date().getFullYear().toString().substr(-2);
                const sequence = String(roleCount[employee.role]).padStart(3, '0');
                const employeeId = `${rolePrefix}${timestamp}${sequence}`;
                
                updates[`employees/${childSnapshot.key}/employeeId`] = employeeId;
            }
        });

        // Apply updates if any
        if (Object.keys(updates).length > 0) {
            await update(ref(db), updates);
            console.log('Employee IDs updated');
        }
    }
}

// Call this once to fix existing employees
// window.fixEmployeeIds = fixEmployeeIds; 

// Make fixEmployeeIds available globally
window.fixEmployeeIds = async function() {
    console.log('Starting employee ID fix...');
    const employeesRef = ref(db, 'employees');
    
    try {
        const snapshot = await get(employeesRef);
        if (!snapshot.exists()) {
            console.log('No employees found');
            return;
        }

        const updates = {};
        const employees = [];
        
        // First collect all employees
        snapshot.forEach((childSnapshot) => {
            employees.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });

        // Count by role
        const roleCount = {
            counselor: 0,
            coordinator: 0,
            manager: 0
        };

        // Update each employee
        employees.forEach((employee) => {
            roleCount[employee.role] = (roleCount[employee.role] || 0) + 1;
            
            const rolePrefix = {
                'counselor': 'CNS',
                'coordinator': 'COR',
                'manager': 'MGR'
            }[employee.role] || 'EMP';
            
            const timestamp = new Date().getFullYear().toString().substr(-2);
            const sequence = String(roleCount[employee.role]).padStart(3, '0');
            const employeeId = `${rolePrefix}${timestamp}${sequence}`;
            
            updates[`employees/${employee.id}/employeeId`] = employeeId;
            
            console.log(`Updating ${employee.name}: ${employeeId}`);
        });

        // Apply updates
        if (Object.keys(updates).length > 0) {
            await update(ref(db), updates);
            console.log('Employee IDs updated successfully');
            return true;
        } else {
            console.log('No updates needed');
            return false;
        }
    } catch (error) {
        console.error('Error fixing employee IDs:', error);
        throw error;
    }
};