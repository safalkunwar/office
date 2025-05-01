import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { firebaseConfig } from '../config/firebase.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);
const storage = getStorage(app);

// Database Structure
const dbStructure = {
    settings: {
        branding: {
            companyName: '',
            tagline: '',
            logoUrl: ''
        },
        notifications: {
            email: false,
            system: false,
            tasks: false,
            applications: false
        },
        system: {
            timezone: '',
            dateFormat: 'MM/DD/YYYY'
        }
    },
    employees: {
        // employeeId: {
        //     name: '',
        //     email: '',
        //     role: '',
        //     status: '',
        //     permissions: []
        // }
    },
    tasks: {
        // taskId: {
        //     title: '',
        //     description: '',
        //     assignedTo: '',
        //     priority: '',
        //     status: '',
        //     dueDate: '',
        //     createdAt: '',
        //     createdBy: ''
        // }
    },
    activities: {
        // activityId: {
        //     type: '',
        //     description: '',
        //     timestamp: '',
        //     userId: ''
        // }
    },
    notifications: {
        // notificationId: {
        //     type: '',
        //     title: '',
        //     message: '',
        //     recipients: [],
        //     read: false,
        //     timestamp: ''
        // }
    }
};

// Load Settings
async function loadSettings() {
    try {
        const settingsRef = ref(db, 'settings');
        const snapshot = await get(settingsRef);
        
        // If settings don't exist, initialize with default structure
        if (!snapshot.exists()) {
            await set(settingsRef, dbStructure.settings);
            return dbStructure.settings;
        }

        const settings = snapshot.val();

        // Update UI with settings
        if (settings.branding) {
            document.getElementById('companyName').value = settings.branding.companyName || '';
            document.getElementById('companyTagline').value = settings.branding.tagline || '';
            if (settings.branding.logoUrl) {
                document.getElementById('logoPreview').src = settings.branding.logoUrl;
                updateLogoDisplay(settings.branding.logoUrl);
            }
        }

        // Load notification settings
        if (settings.notifications) {
            Object.entries(settings.notifications).forEach(([key, value]) => {
                const checkbox = document.querySelector(`input[name="notifications"][value="${key}"]`);
                if (checkbox) checkbox.checked = value;
            });
        }

        // Load system settings
        if (settings.system) {
            document.getElementById('timezone').value = settings.system.timezone || '';
            document.getElementById('dateFormat').value = settings.system.dateFormat || 'MM/DD/YYYY';
        }

        return settings;
    } catch (error) {
        console.error('Error loading settings:', error);
        return null;
    }
}

// Handle Logo Upload
document.getElementById('logoInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        alert('File size should not exceed 2MB');
        return;
    }

    try {
        const logoRef = storageRef(storage, `branding/logo_${Date.now()}`);
        await uploadBytes(logoRef, file);
        const logoUrl = await getDownloadURL(logoRef);
        
        // Update settings in database
        const brandingRef = ref(db, 'settings/branding');
        const currentBranding = (await get(brandingRef)).val() || {};
        await set(brandingRef, {
            ...currentBranding,
            logoUrl
        });

        // Update UI
        document.getElementById('logoPreview').src = logoUrl;
        updateLogoDisplay(logoUrl);

        // Log activity
        logActivity('branding_updated', 'Company logo updated');
    } catch (error) {
        console.error('Error uploading logo:', error);
        alert('Error uploading logo. Please try again.');
    }
});

// Log Activity
async function logActivity(type, description) {
    try {
        const activityRef = ref(db, 'activities');
        await push(activityRef, {
            type,
            description,
            timestamp: new Date().toISOString(),
            userId: 'admin' // Replace with actual user ID when auth is implemented
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Save Branding Settings
document.getElementById('brandingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const brandingData = {
        companyName: document.getElementById('companyName').value,
        tagline: document.getElementById('companyTagline').value,
        logoUrl: document.getElementById('logoPreview').src
    };

    try {
        await set(ref(db, 'settings/branding'), brandingData);
        alert('Branding settings saved successfully!');
    } catch (error) {
        console.error('Error saving branding settings:', error);
        alert('Error saving settings. Please try again.');
    }
});

// Save Notification Settings
document.getElementById('notificationSettingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const notificationSettings = {};
    document.querySelectorAll('input[name="notifications"]').forEach(checkbox => {
        notificationSettings[checkbox.value] = checkbox.checked;
    });

    try {
        await set(ref(db, 'settings/notifications'), notificationSettings);
        alert('Notification settings saved successfully!');
    } catch (error) {
        console.error('Error saving notification settings:', error);
        alert('Error saving settings. Please try again.');
    }
});

// Save System Settings
document.getElementById('systemSettingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const systemSettings = {
        timezone: document.getElementById('timezone').value,
        dateFormat: document.getElementById('dateFormat').value
    };

    try {
        await set(ref(db, 'settings/system'), systemSettings);
        alert('System settings saved successfully!');
    } catch (error) {
        console.error('Error saving system settings:', error);
        alert('Error saving settings. Please try again.');
    }
});

// Update Logo Display
function updateLogoDisplay(logoUrl) {
    // Update logo in sidebar
    const sidebarLogo = document.querySelector('.sidebar .logo img');
    if (sidebarLogo) {
        sidebarLogo.src = logoUrl;
    }

    // Dispatch event for other pages to update logo
    window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { logoUrl } }));
}

// Initialize Settings
loadSettings(); 