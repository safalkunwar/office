import { auth, db, storage } from '../../config/firebase.js';
import { 
    ref, 
    push,
    onValue,
    update,
    query,
    orderByChild,
    startAt,
    set,
    get,
    serverTimestamp,
    equalTo,
    limitToLast,
    onChildAdded
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-storage.js";
import { sendWhatsAppMessage, sendEmail, WebRTCManager } from './external-services.js';

// DOM Elements
const conversationsList = document.getElementById('conversationsList');
const messagesList = document.getElementById('messagesList');
const messageInput = document.getElementById('messageInput');
const searchConversations = document.getElementById('searchConversations');
const recipientName = document.getElementById('recipientName');
const recipientAvatar = document.getElementById('recipientAvatar');
const recipientStatus = document.getElementById('recipientStatus');

// Message Type Selector
const messageTypeButtons = document.querySelectorAll('.message-type-selector .btn');
let currentMessageType = 'internal';

// Current conversation
let currentConversationId = null;
let currentRecipientId = null;

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = './login.html';
        return;
    }
    initializeMessaging();
});

// Initialize messaging
async function initializeMessaging() {
    try {
        // Load conversations
        loadConversations();
        
        // Set up event listeners
        setupEventListeners();
        
        // Set up real-time updates
        setupRealtimeUpdates();
    } catch (error) {
        console.error('Error initializing messaging:', error);
    }
}

// Set up event listeners
function setupEventListeners() {
    // Message type selector
    messageTypeButtons.forEach(button => {
        button.addEventListener('click', () => {
            messageTypeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentMessageType = button.dataset.type;
            updateMessageInterface();
        });
    });

    // Search conversations
    searchConversations.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const conversations = document.querySelectorAll('.conversation-item');
        
        conversations.forEach(conversation => {
            const name = conversation.querySelector('h4').textContent.toLowerCase();
            const lastMessage = conversation.querySelector('.last-message').textContent.toLowerCase();
            
            if (name.includes(searchTerm) || lastMessage.includes(searchTerm)) {
                conversation.style.display = 'flex';
            } else {
                conversation.style.display = 'none';
            }
        });
    });

    // Message input
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// Update message interface based on selected type
function updateMessageInterface() {
    const messageInput = document.getElementById('messageInput');
    const inputActions = document.querySelector('.input-actions');
    
    switch (currentMessageType) {
        case 'internal':
            messageInput.placeholder = 'Type a message...';
            inputActions.style.display = 'flex';
            break;
        case 'whatsapp':
            messageInput.placeholder = 'Type a WhatsApp message...';
            inputActions.style.display = 'flex';
            break;
        case 'email':
            messageInput.placeholder = 'Type an email message...';
            inputActions.style.display = 'none';
            break;
    }
}

// Load conversations
async function loadConversations() {
    try {
        const conversationsRef = ref(db, 'conversations');
        const conversationsQuery = query(conversationsRef, orderByChild('lastMessage/timestamp'));
        
        onValue(conversationsQuery, (snapshot) => {
            const conversations = [];
            snapshot.forEach((childSnapshot) => {
                conversations.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });

            if (conversationsList) {
                conversationsList.innerHTML = conversations.map(conversation => `
                    <div class="conversation-item" data-conversation-id="${conversation.id}">
                        <img src="${conversation.participantAvatar || '../../assets/default-avatar.png'}" 
                             alt="${conversation.participantName}" 
                             class="conversation-avatar">
                        <div class="conversation-content">
                            <h4>${conversation.participantName}</h4>
                            <p class="last-message">${conversation.lastMessage.text}</p>
                            <small class="last-message-time">${formatTime(conversation.lastMessage.timestamp)}</small>
                        </div>
                        ${conversation.unreadCount > 0 ? `
                            <span class="unread-badge">${conversation.unreadCount}</span>
                        ` : ''}
                    </div>
                `).join('');

                // Add click handlers for conversations
                document.querySelectorAll('.conversation-item').forEach(item => {
                    item.addEventListener('click', () => loadMessages(item.dataset.conversationId));
                });
            }
        });
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

// Load messages for a conversation
async function loadMessages(conversationId) {
    try {
        currentConversationId = conversationId;
        const messagesRef = ref(db, `conversations/${conversationId}/messages`);
        const messagesQuery = query(messagesRef, orderByChild('timestamp'));
        
        onValue(messagesQuery, (snapshot) => {
            const messages = [];
            snapshot.forEach((childSnapshot) => {
                messages.push(childSnapshot.val());
            });

            if (messagesList) {
                messagesList.innerHTML = messages.map(message => `
                    <div class="message ${message.senderId === auth.currentUser.uid ? 'sent' : 'received'}">
                        ${message.type === 'text' ? `
                            <p>${message.text}</p>
                        ` : message.type === 'file' ? `
                            <div class="file-message" onclick="previewFile('${message.fileUrl}', '${message.fileName}', '${message.fileType}')">
                                <i class="fas fa-file"></i>
                                <span>${message.fileName}</span>
                            </div>
                        ` : message.type === 'voice' ? `
                            <div class="voice-message">
                                <audio controls>
                                    <source src="${message.audioUrl}" type="audio/mpeg">
                                </audio>
                            </div>
                        ` : message.type === 'location' ? `
                            <div class="location-message">
                                <a href="https://www.google.com/maps?q=${message.latitude},${message.longitude}" 
                                   target="_blank">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>View Location</span>
                                </a>
                            </div>
                        ` : ''}
                        <span class="message-time">${formatTime(message.timestamp)}</span>
                        ${message.status === 'delivered' ? `
                            <span class="message-status"><i class="fas fa-check-double"></i></span>
                        ` : message.status === 'read' ? `
                            <span class="message-status"><i class="fas fa-check-double" style="color: blue;"></i></span>
                        ` : ''}
                    </div>
                `).join('');

                // Scroll to bottom
                messagesList.scrollTop = messagesList.scrollHeight;
            }
        });

        // Mark messages as read
        markMessagesAsRead(conversationId);
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Enhanced send message function
async function sendMessage() {
    const messageText = messageInput.value.trim();
    if (!messageText) return;

    try {
        let messageData = {
            text: messageText,
            senderId: auth.currentUser.uid,
            timestamp: serverTimestamp(),
            type: 'text',
            status: 'sent'
        };

        // Handle different message types
        switch (currentMessageType) {
            case 'whatsapp':
                const phoneNumber = await getRecipientPhoneNumber(currentRecipientId);
                await sendWhatsAppMessage(phoneNumber, messageText);
                messageData.platform = 'whatsapp';
                break;

            case 'email':
                const email = await getRecipientEmail(currentRecipientId);
                await sendEmail(email, 'New Message', messageText);
                messageData.platform = 'email';
                break;

            case 'internal':
            default:
                // Internal message handling remains the same
                break;
        }

        // Save message to Firebase
        const messagesRef = ref(db, `conversations/${currentConversationId}/messages`);
        await push(messagesRef, messageData);

        // Update conversation
        const conversationRef = ref(db, `conversations/${currentConversationId}`);
        await update(conversationRef, {
            lastMessage: messageData,
            unreadCount: 1
        });

        // Clear input
        messageInput.value = '';
    } catch (error) {
        console.error('Error sending message:', error);
        showError('Failed to send message. Please try again.');
    }
}

// Enhanced file attachment function
async function attachFile(file) {
    try {
        // Create a loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-spinner';
        loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        document.body.appendChild(loadingIndicator);

        // Create a reference to the file location
        const storageRef = ref(storage, `messages/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
        
        // Upload the file
        const snapshot = await uploadBytes(storageRef, file);
        
        // Get the download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        // Remove loading indicator
        document.body.removeChild(loadingIndicator);

        // Create file message
        const message = {
            type: 'file',
            content: downloadURL,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            timestamp: Date.now(),
            senderId: auth.currentUser.uid
        };

        // Send the message
        await sendMessage(message);
        
        // Show success message
        showSuccess('File uploaded successfully');
    } catch (error) {
        console.error('Error uploading file:', error);
        showError('Failed to upload file. Please try again.');
    }
}

// Record and send voice message
async function recordVoice() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            audioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
            
            // Upload audio to Firebase Storage
            const storageRef = ref(storage, `messages/${currentConversationId}/voice_${Date.now()}.mp3`);
            await uploadBytes(storageRef, audioBlob);
            const audioUrl = await getDownloadURL(storageRef);

            // Send voice message
            const message = {
                type: 'voice',
                audioUrl: audioUrl,
                senderId: auth.currentUser.uid,
                timestamp: serverTimestamp(),
                status: 'sent'
            };

            const messagesRef = ref(db, `conversations/${currentConversationId}/messages`);
            await push(messagesRef, message);

            // Update conversation
            const conversationRef = ref(db, `conversations/${currentConversationId}`);
            await update(conversationRef, {
                lastMessage: message,
                unreadCount: 1
            });
        };

        mediaRecorder.start();
        setTimeout(() => mediaRecorder.stop(), 5000); // Record for 5 seconds
    } catch (error) {
        console.error('Error recording voice:', error);
    }
}

// Send location
async function sendLocation() {
    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const message = {
            type: 'location',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            senderId: auth.currentUser.uid,
            timestamp: serverTimestamp(),
            status: 'sent'
        };

        const messagesRef = ref(db, `conversations/${currentConversationId}/messages`);
        await push(messagesRef, message);

        // Update conversation
        const conversationRef = ref(db, `conversations/${currentConversationId}`);
        await update(conversationRef, {
            lastMessage: message,
            unreadCount: 1
        });
    } catch (error) {
        console.error('Error sending location:', error);
    }
}

// Video/Voice Call Implementation
let webRTCManager = null;

async function startVideoCall() {
    try {
        if (!webRTCManager) {
            webRTCManager = new WebRTCManager();
        }

        // Show call UI
        const callModal = document.createElement('div');
        callModal.className = 'call-modal';
        callModal.innerHTML = `
            <div class="call-container">
                <video id="localVideo" autoplay muted></video>
                <video id="remoteVideo" autoplay></video>
                <div class="call-controls">
                    <button class="btn btn-icon" onclick="toggleMute()">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <button class="btn btn-icon" onclick="toggleVideo()">
                        <i class="fas fa-video"></i>
                    </button>
                    <button class="btn btn-icon" onclick="endCall()">
                        <i class="fas fa-phone-slash"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(callModal);

        // Initialize call
        await webRTCManager.initializeCall(true);

        // Listen for call events
        const signalingRef = ref(db, `calls/${currentConversationId}/signaling`);
        onChildAdded(signalingRef, (snapshot) => {
            const data = snapshot.val();
            if (data.senderId !== auth.currentUser.uid) {
                handleSignalingData(data);
            }
        });
    } catch (error) {
        console.error('Error starting video call:', error);
        showError('Failed to start video call. Please try again.');
    }
}

async function startVoiceCall() {
    try {
        if (!webRTCManager) {
            webRTCManager = new WebRTCManager();
        }

        // Show call UI
        const callModal = document.createElement('div');
        callModal.className = 'call-modal';
        callModal.innerHTML = `
            <div class="call-container">
                <div class="call-info">
                    <h3>Voice Call</h3>
                    <p>Connected to ${recipientName.textContent}</p>
                </div>
                <div class="call-controls">
                    <button class="btn btn-icon" onclick="toggleMute()">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <button class="btn btn-icon" onclick="endCall()">
                        <i class="fas fa-phone-slash"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(callModal);

        // Initialize call
        await webRTCManager.initializeCall(false);

        // Listen for call events
        const signalingRef = ref(db, `calls/${currentConversationId}/signaling`);
        onChildAdded(signalingRef, (snapshot) => {
            const data = snapshot.val();
            if (data.senderId !== auth.currentUser.uid) {
                handleSignalingData(data);
            }
        });
    } catch (error) {
        console.error('Error starting voice call:', error);
        showError('Failed to start voice call. Please try again.');
    }
}

async function handleSignalingData(data) {
    if (!webRTCManager) return;

    try {
        switch (data.type) {
            case 'offer':
                await webRTCManager.handleOffer(data.sdp);
                break;
            case 'answer':
                await webRTCManager.handleAnswer(data.sdp);
                break;
            case 'ice-candidate':
                await webRTCManager.handleIceCandidate(data.candidate);
                break;
        }
    } catch (error) {
        console.error('Error handling signaling data:', error);
    }
}

function endCall() {
    if (webRTCManager) {
        webRTCManager.endCall();
        webRTCManager = null;
    }
    const callModal = document.querySelector('.call-modal');
    if (callModal) {
        callModal.remove();
    }
}

// Helper functions
async function getRecipientPhoneNumber(recipientId) {
    const userRef = ref(db, `users/${recipientId}`);
    const snapshot = await get(userRef);
    return snapshot.val().phoneNumber;
}

async function getRecipientEmail(recipientId) {
    const userRef = ref(db, `users/${recipientId}`);
    const snapshot = await get(userRef);
    return snapshot.val().email;
}

// Toggle mute notifications
function toggleMute() {
    const button = document.querySelector('.btn-icon[onclick="toggleMute()"]');
    button.classList.toggle('muted');
    // Implement mute functionality
}

// Enhanced file preview function
function previewFile(fileUrl, fileName, fileType) {
    const filePreviewContent = document.getElementById('filePreviewContent');
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    let previewHtml = '';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
        previewHtml = `
            <div class="image-preview">
                <img src="${fileUrl}" alt="${fileName}" class="file-preview">
                <div class="preview-actions">
                    <button class="btn btn-primary" onclick="downloadFile('${fileUrl}', '${fileName}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `;
    } else if (['mp4', 'webm'].includes(fileExtension)) {
        previewHtml = `
            <div class="video-preview">
                <video controls class="file-preview">
                    <source src="${fileUrl}" type="video/${fileExtension}">
                </video>
                <div class="preview-actions">
                    <button class="btn btn-primary" onclick="downloadFile('${fileUrl}', '${fileName}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `;
    } else if (['mp3', 'wav'].includes(fileExtension)) {
        previewHtml = `
            <div class="audio-preview">
                <audio controls class="file-preview">
                    <source src="${fileUrl}" type="audio/${fileExtension}">
                </audio>
                <div class="preview-actions">
                    <button class="btn btn-primary" onclick="downloadFile('${fileUrl}', '${fileName}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `;
    } else if (['pdf'].includes(fileExtension)) {
        previewHtml = `
            <div class="pdf-preview">
                <iframe src="${fileUrl}" class="file-preview"></iframe>
                <div class="preview-actions">
                    <button class="btn btn-primary" onclick="downloadFile('${fileUrl}', '${fileName}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `;
    } else {
        previewHtml = `
            <div class="file-info">
                <i class="fas fa-file"></i>
                <span>${fileName}</span>
                <div class="preview-actions">
                    <button class="btn btn-primary" onclick="downloadFile('${fileUrl}', '${fileName}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `;
    }
    
    filePreviewContent.innerHTML = previewHtml;
    openModal('filePreviewModal');
}

// Download file function
async function downloadFile(fileUrl, fileName) {
    try {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error downloading file:', error);
        showError('Failed to download file. Please try again.');
    }
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Error handling function
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Mark messages as read
async function markMessagesAsRead(conversationId) {
    try {
        const conversationRef = ref(db, `conversations/${conversationId}`);
        await update(conversationRef, {
            unreadCount: 0
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

// Helper functions
function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
}

// Modal functions
window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
};

// Export functions to window
window.sendMessage = sendMessage;
window.attachFile = attachFile;
window.recordVoice = recordVoice;
window.sendLocation = sendLocation;
window.startVideoCall = startVideoCall;
window.startVoiceCall = startVoiceCall;
window.toggleMute = toggleMute;
window.previewFile = previewFile; 