import { db, auth } from './firebase-init.js';
import { ref, push, set, onValue, query, orderByChild, equalTo, serverTimestamp, get, update } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

export class MessagingSystem {
    constructor() {
        this.db = db;
        this.auth = auth;
    }

    getCurrentUser() {
        return this.auth.currentUser;
    }

    /**
     * Get list of conversations for the current user
     * @returns {Promise<Object>}
     */
    async getConversations() {
        const user = this.getCurrentUser();
        if (!user) return {};

        const userConvosRef = ref(this.db, `user_conversations/${user.uid}`);
        const snapshot = await get(userConvosRef);
        
        if (snapshot.exists()) {
            const convos = snapshot.val();
            // Enrich with details if needed (e.g. other participant name)
            // For now return as is
            return convos;
        }
        return {};
    }

    /**
     * Subscribe to messages in a conversation
     * @param {string} conversationId 
     * @param {function} callback 
     * @returns {function} unsubscribe function
     */
    subscribeToMessages(conversationId, callback) {
        const messagesRef = ref(this.db, `messages/${conversationId}`);
        const q = query(messagesRef, orderByChild('timestamp'));
        
        return onValue(q, (snapshot) => {
            const messages = [];
            snapshot.forEach((child) => {
                messages.push({ id: child.key, ...child.val() });
            });
            callback(messages);
        });
    }

    /**
     * Send a message
     * @param {string} conversationId 
     * @param {string} text 
     * @param {string} type 
     */
    async sendMessage(conversationId, text, type = 'text') {
        const user = this.getCurrentUser();
        if (!user) throw new Error("Not authenticated");

        const messagesRef = ref(this.db, `messages/${conversationId}`);
        const newMessageRef = push(messagesRef);
        
        const messageData = {
            senderId: user.uid,
            text: text,
            timestamp: serverTimestamp(),
            type: type
        };

        await set(newMessageRef, messageData);

        // Update last message in conversation metadata
        const updates = {};
        updates[`conversations/${conversationId}/lastMessage`] = text;
        updates[`conversations/${conversationId}/lastMessageTimestamp`] = serverTimestamp();
        
        // Also update for all participants in user_conversations (if we tracked participants there)
        // For now, just update the main conversation node
        await update(ref(this.db), updates);
        
        return newMessageRef.key;
    }

    /**
     * Create a new conversation
     * @param {Array<string>} participantIds 
     * @param {string} type 
     * @param {string} name 
     */
    async createConversation(participantIds, type = 'private', name = '') {
        const user = this.getCurrentUser();
        if (!user) throw new Error("Not authenticated");

        const allParticipants = [...participantIds, user.uid];
        const conversationsRef = ref(this.db, 'conversations');
        const newConvoRef = push(conversationsRef);
        const conversationId = newConvoRef.key;

        const conversationData = {
            type: type,
            participants: allParticipants.reduce((acc, uid) => ({...acc, [uid]: true}), {}),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            name: name
        };

        await set(newConvoRef, conversationData);

        // Add to user_conversations for each participant
        const updates = {};
        allParticipants.forEach(uid => {
            updates[`user_conversations/${uid}/${conversationId}`] = {
                type: type,
                name: name,
                lastSeen: serverTimestamp()
            };
        });

        await update(ref(this.db), updates);
        return conversationId;
    }
}