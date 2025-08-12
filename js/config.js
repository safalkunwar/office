/**
 * Configuration file for the messaging system
 * Contains Firebase configuration and external API settings
 */

// Firebase Configuration
export const firebaseConfig = {
    apiKey: "AIzaSyA910SEIzx0ER4Ps_EdXBUU0Jgf2wTRm8Q",
    authDomain: "fir-a7a69.firebaseapp.com",
    projectId: "fir-a7a69",
    storageBucket: "fir-a7a69.appspot.com",
    messagingSenderId: "1060643495940",
    appId: "1:1060643495940:web:19bc515d82d737d73d1551",
    databaseURL: "https://fir-a7a69-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// WhatsApp Business API Configuration
export const whatsappConfig = {
    apiUrl: "https://graph.facebook.com/v17.0",
    phoneNumberId: "your-phone-number-id",
    accessToken: "your-access-token",
    webhookVerifyToken: "your-webhook-verify-token"
};

// Gmail API Configuration
export const gmailConfig = {
    clientId: "your-gmail-client-id",
    clientSecret: "your-gmail-client-secret",
    redirectUri: "your-redirect-uri",
    scopes: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.modify"
    ]
};

// Facebook Messenger Configuration
export const facebookConfig = {
    pageId: "your-page-id",
    accessToken: "your-page-access-token",
    appSecret: "your-app-secret",
    verifyToken: "your-verify-token"
};

// Application Settings
export const appConfig = {
    // Message pagination
    messagesPerPage: 50,
    
    // File upload limits
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedFileTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    
    // Typing indicator timeout
    typingTimeout: 2000,
    
    // Notification settings
    notificationDuration: 5000,
    enableDesktopNotifications: true,
    
    // Theme settings
    defaultTheme: 'light',
    enableAutoTheme: true,
    
    // Security settings
    enableMessageEncryption: false,
    enableTwoFactorAuth: false,
    
    // Performance settings
    enableMessageCaching: true,
    cacheExpiryTime: 5 * 60 * 1000, // 5 minutes
    enableLazyLoading: true
};

// User Role Permissions
export const rolePermissions = {
    admin: {
        canCreateGroups: true,
        canSendBroadcasts: true,
        canDeleteMessages: true,
        canManageUsers: true,
        canAccessAllChats: true,
        canExportData: true
    },
    employee: {
        canCreateGroups: true,
        canSendBroadcasts: true,
        canDeleteMessages: false,
        canManageUsers: false,
        canAccessAllChats: true,
        canExportData: false
    },
    instructor: {
        canCreateGroups: true,
        canSendBroadcasts: false,
        canDeleteMessages: false,
        canManageUsers: false,
        canAccessAllChats: false,
        canExportData: false
    },
    student: {
        canCreateGroups: false,
        canSendBroadcasts: false,
        canDeleteMessages: false,
        canManageUsers: false,
        canAccessAllChats: false,
        canExportData: false
    }
};

// Platform-specific settings
export const platformSettings = {
    internal: {
        name: 'Internal Chat',
        color: '#2563eb',
        icon: 'fas fa-comment-dots',
        enabled: true,
        requiresAuth: true
    },
    whatsapp: {
        name: 'WhatsApp',
        color: '#25d366',
        icon: 'fab fa-whatsapp',
        enabled: true,
        requiresAuth: true,
        requiresPhoneNumber: true
    },
    gmail: {
        name: 'Gmail',
        color: '#ea4335',
        icon: 'fas fa-envelope',
        enabled: true,
        requiresAuth: true,
        requiresOAuth: true
    },
    facebook: {
        name: 'Facebook Messenger',
        color: '#1877f2',
        icon: 'fab fa-facebook',
        enabled: true,
        requiresAuth: true,
        requiresPageAccess: true
    }
};

// Error Messages
export const errorMessages = {
    auth: {
        userNotFound: 'User not found. Please check your credentials.',
        invalidPassword: 'Invalid password. Please try again.',
        tooManyRequests: 'Too many failed attempts. Please try again later.',
        networkError: 'Network error. Please check your connection.',
        unknown: 'An unknown error occurred. Please try again.'
    },
    messaging: {
        messageFailed: 'Failed to send message. Please try again.',
        fileUploadFailed: 'File upload failed. Please try again.',
        chatNotFound: 'Chat not found.',
        permissionDenied: 'You do not have permission to perform this action.',
        rateLimitExceeded: 'Rate limit exceeded. Please wait before trying again.'
    },
    external: {
        whatsappNotConnected: 'WhatsApp is not connected. Please authenticate first.',
        gmailNotConnected: 'Gmail is not connected. Please authenticate first.',
        facebookNotConnected: 'Facebook Messenger is not connected. Please authenticate first.',
        apiError: 'External service error. Please try again later.'
    }
};

// Success Messages
export const successMessages = {
    auth: {
        loginSuccess: 'Successfully logged in.',
        logoutSuccess: 'Successfully logged out.',
        passwordReset: 'Password reset email sent.'
    },
    messaging: {
        messageSent: 'Message sent successfully.',
        fileUploaded: 'File uploaded successfully.',
        groupCreated: 'Group created successfully.',
        broadcastSent: 'Broadcast message sent successfully.'
    },
    external: {
        whatsappConnected: 'WhatsApp connected successfully.',
        gmailConnected: 'Gmail connected successfully.',
        facebookConnected: 'Facebook Messenger connected successfully.'
    }
};

// Development/Production Environment
export const isDevelopment = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' ||
                            window.location.hostname.includes('dev');

// Logging configuration
export const loggingConfig = {
    enabled: isDevelopment,
    level: isDevelopment ? 'debug' : 'error',
    includeTimestamp: true,
    includeUserInfo: true
};

// Export all configurations
export default {
    firebaseConfig,
    whatsappConfig,
    gmailConfig,
    facebookConfig,
    appConfig,
    rolePermissions,
    platformSettings,
    errorMessages,
    successMessages,
    isDevelopment,
    loggingConfig
}; 