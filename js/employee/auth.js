import { auth, db } from '../config/firebase.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { 
    ref,
    set,
    get,
    query,
    equalTo
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const tabButtons = document.querySelectorAll('.tab-btn');
const forms = document.querySelectorAll('.form');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');
const signupSuccess = document.getElementById('signupSuccess');

// Tab Switching
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        
        // Update active tab
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Show corresponding form
        forms.forEach(form => form.classList.remove('active'));
        document.getElementById(`${tab}Form`).classList.add('active');
    });
});

// Toggle Password Visibility
document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', () => {
        const input = button.previousElementSibling;
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        button.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    });
});

// Login Form Submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        // Sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Check if employee is approved
        const employeeRef = ref(db, `employees/${user.uid}`);
        const snapshot = await get(employeeRef);
        
        if (!snapshot.exists()) {
            throw new Error('Employee record not found');
        }
        
        const employeeData = snapshot.val();
        if (employeeData.status !== 'approved') {
            await auth.signOut();
            throw new Error('Your account is pending admin approval');
        }
        
        // Store employee data in localStorage
        localStorage.setItem('employeeData', JSON.stringify(employeeData));
        
        // Redirect to dashboard
        window.location.href = '../employee/dashboard.html';
    } catch (error) {
        loginError.textContent = error.message;
    }
});

// Signup Form Submission
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupError.textContent = '';
    signupSuccess.style.display = 'none';
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const phone = document.getElementById('signupPhone').value;
    
    try {
        // Check if email already exists
        const employeesRef = ref(db, 'employees');
        const emailQuery = query(employeesRef, equalTo('email', email));
        const snapshot = await get(emailQuery);
        
        if (snapshot.exists()) {
            throw new Error('Email already registered');
        }
        
        // Create Firebase Auth account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create employee record
        const employeeData = {
            name,
            email,
            phone,
            status: 'pending',
            createdAt: Date.now(),
            role: 'employee'
        };
        
        await set(ref(db, `employees/${user.uid}`), employeeData);
        
        // Sign out the user
        await auth.signOut();
        
        // Show success message
        signupSuccess.style.display = 'block';
        signupForm.reset();
        
    } catch (error) {
        signupError.textContent = error.message;
    }
});

// Forgot Password
document.querySelector('.forgot-password').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = prompt('Please enter your email address:');
    
    if (email) {
        try {
            await sendPasswordResetEmail(auth, email);
            alert('Password reset email sent. Please check your inbox.');
        } catch (error) {
            alert(error.message);
        }
    }
}); 