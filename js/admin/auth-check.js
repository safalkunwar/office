import { auth } from '../config/firebase.js';

// Check authentication state
export function checkAuth() {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = './login.html';
            return;
        }
    });
}

// Logout function
export async function logout() {
    try {
        await auth.signOut();
        localStorage.removeItem('adminData');
        localStorage.removeItem('authToken');
        window.location.href = './login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Load admin data
export function loadAdminData() {
    const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
    if (adminData.name) {
        document.getElementById('adminName').textContent = adminData.name;
    }
} 