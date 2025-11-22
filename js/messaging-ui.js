import { MessagingSystem } from './messaging-system.js';
import { auth } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";

export class MessagingUI {
    constructor() {
        this.system = new MessagingSystem();
        this.currentConversationId = null;
        this.init();
    }

    init() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.loadConversations();
                this.setupEventListeners();
                document.getElementById('connectionStatus').className = 'connection-status connected';
                document.getElementById('connectionText').textContent = 'Connected';
            } else {
                // Redirect to login or show error
                console.log("User not logged in");
            }
        });
    }

    setupEventListeners() {
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');

        if (sendBtn && messageInput) {
            sendBtn.addEventListener('click', () => this.sendMessage());
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Sidebar tabs
        const tabs = document.querySelectorAll('.sidebar-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                // Filter conversations based on tab
            });
        });
    }

    async loadConversations() {
        const contactsList = document.getElementById('contactsList');
        if (!contactsList) return;

        contactsList.innerHTML = '<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

        try {
            const conversations = await this.system.getConversations();
            contactsList.innerHTML = ''; // Clear loading

            if (Object.keys(conversations).length === 0) {
                contactsList.innerHTML = '<div class="no-conversations">No conversations yet</div>';
                return;
            }

            Object.entries(conversations).forEach(([id, data]) => {
                const item = this.createConversationItem(id, data);
                contactsList.appendChild(item);
            });

        } catch (error) {
            console.error("Error loading conversations:", error);
            contactsList.innerHTML = '<div class="error">Failed to load conversations</div>';
        }
    }

    createConversationItem(id, data) {
        const div = document.createElement('div');
        div.className = 'contact-item'; // Use existing class or create new
        div.innerHTML = `
            <div class="contact-avatar"><i class="fas fa-user"></i></div>
            <div class="contact-info">
                <div class="contact-name">${data.name || 'Unknown'}</div>
                <div class="contact-last-msg">Click to view</div>
            </div>
        `;
        div.addEventListener('click', () => this.openConversation(id, data));
        return div;
    }

    openConversation(id, data) {
        this.currentConversationId = id;
        document.getElementById('chatName').textContent = data.name || 'Chat';
        document.getElementById('chatHeader').style.display = 'flex';
        document.getElementById('chatInput').style.display = 'flex';
        document.getElementById('chatMessages').innerHTML = ''; // Clear previous

        // Subscribe to messages
        if (this.unsubscribeMessages) this.unsubscribeMessages();
        
        this.unsubscribeMessages = this.system.subscribeToMessages(id, (messages) => {
            this.renderMessages(messages);
        });
    }

    renderMessages(messages) {
        const container = document.getElementById('chatMessages');
        container.innerHTML = '';
        const currentUser = this.system.getCurrentUser();

        messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = `message ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`;
            div.innerHTML = `
                <div class="message-content">
                    <p>${msg.text}</p>
                    <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
            `;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        if (!text || !this.currentConversationId) return;

        try {
            input.value = '';
            await this.system.sendMessage(this.currentConversationId, text);
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message");
        }
    }
}