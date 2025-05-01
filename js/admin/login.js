import { auth, db } from '../config/firebase.js';
import { 
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { 
    ref,
    get,
    update,
    set,
    remove
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// Get DOM elements
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const connectionStatus = document.getElementById('connectionStatus');

// Test database connection
async function testDatabaseConnection() {
    if (!connectionStatus) return;
    
    try {
        // Test write
        const testRef = ref(db, 'test/connection');
        await set(testRef, {
            timestamp: new Date().toISOString(),
            status: 'testing'
        });
        console.log("✅ Write test successful");

        // Test read
        const snapshot = await get(testRef);
        if (snapshot.exists()) {
            console.log("✅ Read test successful", snapshot.val());
            
            // Clean up test data
            await remove(testRef);
            console.log("✅ Cleanup successful");

            // Update status display
            connectionStatus.innerHTML = `
                <div class="connection-success">
                    <i class="fas fa-check-circle"></i> Database connection successful
                </div>
            `;
            return true;
        }
    } catch (error) {
        console.error("❌ Database test failed:", error);
        
        // Update status display
        if (connectionStatus) {
            connectionStatus.innerHTML = `
                <div class="connection-error">
                    <i class="fas fa-exclamation-circle"></i> 
                    Database connection failed: ${error.message}
                </div>
            `;
        }
        return false;
    }
}

// Check if user is already logged in
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Check if user is an admin
        const adminRef = ref(db, `admins/${user.uid}`);
        const snapshot = await get(adminRef);
        const adminData = snapshot.val();
        
        if (adminData && adminData.role === 'admin') {
            window.location.href = 'dashboard.html';
        } else {
            // If not an admin, sign out
            await signOut(auth);
        }
    }
});

// Handle Forgot Password
forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    if (!email) {
        errorMessage.textContent = 'Please enter your email address first';
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        return;
    }

    try {
        // Send password reset email directly without checking admin status
        await sendPasswordResetEmail(auth, email);
        
        // Show success message
        successMessage.textContent = 'Password reset email sent. Please check your inbox.';
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    } catch (error) {
        console.error('Password reset error:', error);
        errorMessage.textContent = 'Failed to send password reset email. Please try again later.';
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
    }
});

// Handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Check admin status
        const adminRef = ref(db, `admins/${user.uid}`);
        const snapshot = await get(adminRef);
        const adminData = snapshot.val();
        
        if (!adminData || adminData.role !== 'admin') {
            throw new Error('Access denied. Admin privileges required.');
        }
        
        // Update last login
        await update(ref(db, `admins/${user.uid}`), {
            lastLogin: new Date().toISOString()
        });
        
        // Store admin data
        localStorage.setItem('adminData', JSON.stringify(adminData));
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Login error:', error);
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
    }
});

// Run connection test
testDatabaseConnection().then(success => {
    if (success) {
        console.log("🎉 Database connection and operations working correctly!");
    } else {
        console.log("❌ Database connection test failed");
    }
}); 