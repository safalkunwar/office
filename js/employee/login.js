import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    get,
    query,
    orderByChild,
    equalTo 
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { firebaseConfig } from '../config/firebase.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Helper function to show error messages
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    const form = document.getElementById('loginForm');
    const existingError = form.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    form.insertBefore(errorDiv, form.firstChild);
}

// Test Credentials Helper
export function getTestCredentials() {
    const employeesRef = ref(db, 'employees');
    get(employeesRef).then((snapshot) => {
        if (snapshot.exists()) {
            const employees = [];
            snapshot.forEach((childSnapshot) => {
                const employee = childSnapshot.val();
                const defaultPassword = `${employee.employeeId}${employee.name.substring(0, 3).toLowerCase()}`;
                employees.push({
                    employeeId: employee.employeeId,
                    email: employee.email,
                    name: employee.name,
                    role: employee.role,
                    status: employee.status,
                    defaultPassword: defaultPassword
                });
            });
            console.log('%cAvailable Test Credentials:', 'color: green; font-weight: bold');
            employees.forEach(emp => {
                console.log(`
Employee ID: ${emp.employeeId}
Password: ${emp.defaultPassword}
Email: ${emp.email}
Name: ${emp.name}
Role: ${emp.role}
Status: ${emp.status}
------------------------`);
            });
        } else {
            console.log('%cNo employees found', 'color: red');
        }
    }).catch((error) => {
        console.error('Error getting employees:', error);
    });
}

// Test Login Helper
export function testLogin() {
    const employeesRef = ref(db, 'employees');
    get(employeesRef).then((snapshot) => {
        if (snapshot.exists()) {
            let testEmployee = null;
            snapshot.forEach((childSnapshot) => {
                const employee = childSnapshot.val();
                if (employee.status === 'active') {
                    testEmployee = employee;
                    return true;
                }
            });

            if (testEmployee) {
                const defaultPassword = `${testEmployee.employeeId}${testEmployee.name.substring(0, 3).toLowerCase()}`;
                document.getElementById('employeeId').value = testEmployee.employeeId;
                document.getElementById('password').value = defaultPassword;
                console.log('%cTest credentials filled:', 'color: blue; font-weight: bold');
                console.log(`Employee ID: ${testEmployee.employeeId}`);
                console.log(`Password: ${defaultPassword}`);
            }
        }
    }).catch((error) => {
        console.error('Error setting test credentials:', error);
    });
}

// Make functions available globally
window.getTestCredentials = getTestCredentials;
window.testLogin = testLogin;

// Handle Login Form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const employeeId = document.getElementById('employeeId').value.trim();
    const password = document.getElementById('password').value;
    const submitButton = document.querySelector('button[type="submit"]');
    
    try {
        submitButton.disabled = true;
        document.body.classList.add('loading');

        console.log('Attempting login with:', { employeeId });

        // Get employee by ID
        const employeesRef = ref(db, 'employees');
        const employeeQuery = query(employeesRef, orderByChild('employeeId'), equalTo(employeeId));
        const snapshot = await get(employeeQuery);

        if (!snapshot.exists()) {
            throw new Error('Invalid Employee ID or Password');
        }

        const employeeData = Object.values(snapshot.val())[0];

        if (employeeData.status !== 'active') {
            throw new Error('Account is inactive. Please contact administrator.');
        }

        // Attempt login
        await signInWithEmailAndPassword(auth, employeeData.email, password);
        
        // Store employee data in session
        sessionStorage.setItem('employeeData', JSON.stringify(employeeData));
        
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed. Please try again.';
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            errorMessage = 'Invalid Employee ID or Password';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed attempts. Please try again later.';
        }
        showError(errorMessage);
    } finally {
        submitButton.disabled = false;
        document.body.classList.remove('loading');
    }
});

// Toggle Password Visibility
document.querySelector('.toggle-password').addEventListener('click', function() {
    const input = this.previousElementSibling;
    const icon = this.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
});

// Forgot Password
window.forgotPassword = function() {
    alert('Please contact your administrator to reset your password.');
};