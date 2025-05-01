import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { 
    getAuth, 
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider 
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    push,
    set,
    onValue 
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { firebaseConfig } from '../config/firebase.js';
import * as OTPAuth from 'https://cdn.skypack.dev/otpauth';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Password Change Functionality
const passwordChangeForm = document.getElementById('passwordChangeForm');
const passwordStrength = document.getElementById('passwordStrength');

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    const feedback = [];

    if (password.length >= 8) {
        strength += 1;
    } else {
        feedback.push('Password should be at least 8 characters long');
    }

    if (password.match(/[a-z]/)) strength += 1;
    if (password.match(/[A-Z]/)) strength += 1;
    if (password.match(/[0-9]/)) strength += 1;
    if (password.match(/[^a-zA-Z0-9]/)) strength += 1;

    if (!password.match(/[a-z]/)) feedback.push('Add lowercase letters');
    if (!password.match(/[A-Z]/)) feedback.push('Add uppercase letters');
    if (!password.match(/[0-9]/)) feedback.push('Add numbers');
    if (!password.match(/[^a-zA-Z0-9]/)) feedback.push('Add special characters');

    return {
        score: strength,
        feedback: feedback
    };
}

// Update password strength indicator
document.getElementById('newPassword').addEventListener('input', (e) => {
    const result = checkPasswordStrength(e.target.value);
    const strengthClasses = ['weak', 'fair', 'good', 'strong', 'very-strong'];
    passwordStrength.className = 'password-strength ' + strengthClasses[result.score - 1];
    passwordStrength.innerHTML = `
        <div class="strength-meter">
            ${Array(5).fill(0).map((_, i) => 
                `<div class="meter-section ${i < result.score ? 'filled' : ''}"></div>`
            ).join('')}
        </div>
        <div class="strength-text">${result.feedback.join(', ') || 'Strong password!'}</div>
    `;
});

// Handle password change
passwordChangeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }

    try {
        const user = auth.currentUser;
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        
        // Reauthenticate user
        await reauthenticateWithCredential(user, credential);
        
        // Update password
        await updatePassword(user, newPassword);

        // Log activity
        await logSecurityActivity('password_changed', 'Password was changed successfully');

        alert('Password updated successfully');
        passwordChangeForm.reset();
    } catch (error) {
        console.error('Error updating password:', error);
        alert('Error updating password: ' + error.message);
    }
});

// 2FA Setup
let totpSecret = null;

document.getElementById('setup2FA').addEventListener('click', async () => {
    // Generate TOTP secret
    totpSecret = generateTOTPSecret();
    
    // Create TOTP URI
    const totp = new OTPAuth.TOTP({
        issuer: "YourApp",
        label: auth.currentUser.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: totpSecret
    });

    // Generate QR code
    const qrCode = await generateQRCode(totp.toString());
    document.getElementById('qrCode').src = qrCode;
    document.getElementById('backupCode').textContent = totpSecret;
    document.getElementById('2faSetup').style.display = 'block';
});

document.getElementById('verify2FA').addEventListener('click', async () => {
    const code = document.getElementById('verificationCode').value;
    if (verifyTOTP(code, totpSecret)) {
        // Save 2FA settings to database
        const user = auth.currentUser;
        await set(ref(db, `employees/${user.uid}/twoFactorAuth`), {
            enabled: true,
            secret: totpSecret,
            enabledAt: new Date().toISOString()
        });

        await logSecurityActivity('2fa_enabled', 'Two-factor authentication was enabled');
        alert('2FA enabled successfully');
        location.reload();
    } else {
        alert('Invalid verification code');
    }
});

// Security Activity Log
function loadSecurityLog() {
    const user = auth.currentUser;
    const logRef = ref(db, `security_log/${user.uid}`);
    onValue(logRef, (snapshot) => {
        const logs = snapshot.val();
        displaySecurityLog(logs);
    });
}

function displaySecurityLog(logs) {
    const logContainer = document.getElementById('securityLog');
    if (!logs) {
        logContainer.innerHTML = '<p>No security activities found</p>';
        return;
    }

    logContainer.innerHTML = Object.entries(logs)
        .sort(([,a], [,b]) => new Date(b.timestamp) - new Date(a.timestamp))
        .map(([, log]) => `
            <div class="log-item">
                <div class="log-icon">
                    <i class="fas ${getActivityIcon(log.type)}"></i>
                </div>
                <div class="log-content">
                    <p>${log.description}</p>
                    <small>${new Date(log.timestamp).toLocaleString()}</small>
                </div>
            </div>
        `).join('');
}

// Helper Functions
function generateTOTPSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 16; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
}

async function generateQRCode(totpUri) {
    const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`);
    return response.url;
}

function verifyTOTP(code, secret) {
    const totp = new OTPAuth.TOTP({
        secret: secret
    });
    return totp.validate({ token: code, window: 1 }) !== null;
}

async function logSecurityActivity(type, description) {
    const user = auth.currentUser;
    const logRef = ref(db, `security_log/${user.uid}`);
    await push(logRef, {
        type,
        description,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ip: await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(data => data.ip)
    });
}

function getActivityIcon(type) {
    const icons = {
        'password_changed': 'fa-key',
        '2fa_enabled': 'fa-shield-alt',
        'login': 'fa-sign-in-alt',
        'logout': 'fa-sign-out-alt'
    };
    return icons[type] || 'fa-info-circle';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSecurityLog();
}); 