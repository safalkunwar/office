// WhatsApp Integration
const whatsappConfig = {
    apiKey: process.env.WHATSAPP_API_KEY,
    apiUrl: 'https://api.whatsapp.com/v1/messages',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID
};

async function sendWhatsAppMessage(phoneNumber, message) {
    try {
        const response = await fetch(whatsappConfig.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${whatsappConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: phoneNumber,
                type: 'text',
                text: { body: message }
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send WhatsApp message');
        }

        return await response.json();
    } catch (error) {
        console.error('WhatsApp API Error:', error);
        throw error;
    }
}

// Email Integration
const emailConfig = {
    apiKey: process.env.EMAIL_API_KEY,
    apiUrl: 'https://api.email-service.com/v1/send',
    fromEmail: process.env.FROM_EMAIL
};

async function sendEmail(to, subject, content, attachments = []) {
    try {
        const formData = new FormData();
        formData.append('to', to);
        formData.append('subject', subject);
        formData.append('content', content);
        formData.append('from', emailConfig.fromEmail);

        if (attachments.length > 0) {
            attachments.forEach((file, index) => {
                formData.append(`attachment${index}`, file);
            });
        }

        const response = await fetch(emailConfig.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${emailConfig.apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to send email');
        }

        return await response.json();
    } catch (error) {
        console.error('Email API Error:', error);
        throw error;
    }
}

// WebRTC Integration for Video/Voice Calls
const webRTCConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

class WebRTCManager {
    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
    }

    async initializeCall(isVideo = true) {
        try {
            this.peerConnection = new RTCPeerConnection(webRTCConfig);
            
            // Get local media stream
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: isVideo,
                audio: true
            });

            // Add local stream to peer connection
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            // Handle remote stream
            this.peerConnection.ontrack = (event) => {
                this.remoteStream = event.streams[0];
                // Update UI with remote stream
                const remoteVideo = document.getElementById('remoteVideo');
                if (remoteVideo) {
                    remoteVideo.srcObject = this.remoteStream;
                }
            };

            // Create and send offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            // Send offer to other peer through Firebase
            await this.sendSignalingData({
                type: 'offer',
                sdp: offer
            });

            return true;
        } catch (error) {
            console.error('WebRTC Error:', error);
            throw error;
        }
    }

    async handleAnswer(answer) {
        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
            console.error('Error handling answer:', error);
            throw error;
        }
    }

    async sendSignalingData(data) {
        // Implement signaling through Firebase
        const signalingRef = ref(db, `calls/${currentConversationId}/signaling`);
        await push(signalingRef, {
            ...data,
            timestamp: serverTimestamp(),
            senderId: auth.currentUser.uid
        });
    }

    endCall() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
    }
}

// Export functions
export {
    sendWhatsAppMessage,
    sendEmail,
    WebRTCManager
}; 