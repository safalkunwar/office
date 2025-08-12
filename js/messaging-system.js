/**
 * Modern Messaging System
 * A comprehensive messaging solution with Firebase integration
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, serverTimestamp, onSnapshot, query, orderBy, where, limit, startAfter, writeBatch } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-storage.js";
import { getDatabase, ref as rtdbRef, push, set, onValue, off, query as rtdbQuery, orderByChild, limitToLast, get, update, equalTo } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { firebaseConfig } from './config.js';

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const rtdb = getDatabase(app);

// Constants
const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  SYSTEM: 'system'
};

const USER_ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
  INSTRUCTOR: 'instructor',
  STUDENT: 'student'
};

const PLATFORMS = {
  INTERNAL: 'internal',
  WHATSAPP: 'whatsapp',
  GMAIL: 'gmail',
  FACEBOOK: 'facebook'
};

// Messaging State Class
class MessagingState {
  constructor() {
    this.currentUser = null;
    this.currentChat = null;
    this.currentPlatform = PLATFORMS.INTERNAL;
    this.contacts = [];
    this.chats = [];
    this.messages = [];
    this.unreadCounts = {};
    this.typingUsers = new Set();
    this.isTyping = false;
    this.events = {};
  }

  setCurrentUser(user) {
    this.currentUser = user;
    this.groups = [];
    this.emit('userChanged', user);
    this.loadUserData();
  }

  async loadUserData() {
    if (!this.currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', this.currentUser.uid));
      if (userDoc.exists()) {
        this.currentUser.profile = userDoc.data();
      }
      await this.loadContacts();
      await this.loadRecentChats();
      this.setupRealtimeListeners();
      await this.loadGroupsForUser();

    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }

  async loadContacts() {
    try {
      const base = collection(db, 'users');
      const role = this.currentUser.profile?.role;
      let q;

      if (role === USER_ROLES.ADMIN) {
        q = query(base, orderBy('name'));
      } else if (role === USER_ROLES.EMPLOYEE) {
        // Employees can view students + all staff (employees + instructors)
        q = query(base, where('role', 'in', [USER_ROLES.STUDENT, USER_ROLES.INSTRUCTOR, USER_ROLES.EMPLOYEE]), orderBy('name'));
      } else {
        // Students can view students + staff per spec
        q = query(base, where('role', 'in', [USER_ROLES.STUDENT, USER_ROLES.INSTRUCTOR, USER_ROLES.EMPLOYEE]), orderBy('name'));
      }

      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (e) {
        if (e.code === 'failed-precondition') {
          // Fallback without orderBy
          let q2;
          if (role === USER_ROLES.ADMIN) {
            q2 = base;
          } else {
            q2 = query(base, where('role', 'in', [USER_ROLES.STUDENT, USER_ROLES.INSTRUCTOR, USER_ROLES.EMPLOYEE]));
          }
          snapshot = await getDocs(q2);
        } else { throw e; }
      }

      // If still empty, fetch all and filter client-side (handles inconsistent casing like 'Student'/'Employee')
      if (!snapshot || snapshot.empty) {
        const allSnap = await getDocs(base);
        const all = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const meId = this.currentUser.uid;
        const norm = u => ({ ...u, role: (u.role||'').toString().toLowerCase(), avatarUrl: u.avatar || u.avatarUrl || null });
        const wantStaff = u => ['employee','instructor','admin'].includes(u.role);
        const wantStudent = u => u.role === 'student';
        const filtered = all.map(norm).filter(u => u.id !== meId && (wantStaff(u) || wantStudent(u)));
        this.contacts = filtered.sort((a,b)=> (a.name||'').localeCompare(b.name||''));
        this.emit('contactsLoaded', this.contacts);
        return;
      }

      const me = this.currentUser.uid;
      this.contacts = snapshot.docs
        .map(d => ({ id: d.id, ...d.data(), avatarUrl: d.data().avatar || d.data().avatarUrl || null }))
        .filter(u => u.id !== me)
        .sort((a,b)=> (a.name||'').localeCompare(b.name||''));

      this.emit('contactsLoaded', this.contacts);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  }

  async loadRecentChats() {
    try {
      const base = collection(db, 'chats');
      const q1 = query(base, where('participants', 'array-contains', this.currentUser.uid), orderBy('lastMessageAt', 'desc'), limit(20));
      let snapshot;
      try {
        snapshot = await getDocs(q1);
      } catch (e) {
        // Fallback if index required: drop orderBy and sort client-side
        if (e.code === 'failed-precondition') {
          const q2 = query(base, where('participants', 'array-contains', this.currentUser.uid), limit(50));
          snapshot = await getDocs(q2);
        } else { throw e; }
      }

      this.chats = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a,b)=>{
          const at = a.lastMessageAt?.toMillis?.() ?? a.lastMessageAt ?? 0;
          const bt = b.lastMessageAt?.toMillis?.() ?? b.lastMessageAt ?? 0;
          return bt - at;
        })
        .slice(0,20);

      this.emit('chatsLoaded', this.chats);
    } catch (error) {
      console.error('Failed to load recent chats:', error);
    }
  }

  async sendMessage(content, type = MESSAGE_TYPES.TEXT, metadata = {}) {
    if (!this.currentChat || !this.currentUser) return;

    try {
      const messageData = {
        content,
        type,
        senderId: this.currentUser.uid,
        senderName: this.currentUser.profile?.name || this.currentUser.email,
        timestamp: Date.now(),
        status: 'sent',
        ...metadata
      };

      const isGroup = this.currentChat.type === 'group';
      const basePath = isGroup ? `rtdb_groups/${this.currentChat.id}/messages` : `rtdb_chats/${this.currentChat.id}/messages`;
      const messagesRef = rtdbRef(rtdb, basePath);
      const newMessageRef = push(messagesRef);
      await set(newMessageRef, messageData);

      const metaDoc = isGroup ? doc(db, 'groups', this.currentChat.id) : doc(db, 'chats', this.currentChat.id);
      await updateDoc(metaDoc, {
        lastMessage: content,
        lastMessageAt: serverTimestamp(),
        lastMessageBy: this.currentUser.uid
      });

      await addDoc(collection(db, 'messages'), {
        chatId: this.currentChat.id,
        ...messageData,
        createdAt: serverTimestamp()
      });

      this.emit('messageSent', messageData);
      return newMessageRef.key;

    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  async createGroupChat(name, description, memberIds) {
    if (!this.currentUser) return;

    try {
      const info = {
        name,
        description,
        createdBy: this.currentUser.uid,
        createdAt: serverTimestamp(),
        members: Array.from(new Set([this.currentUser.uid, ...memberIds]))
      };

      const groupRef = await addDoc(collection(db, 'groups'), info);

      await set(rtdbRef(rtdb, `rtdb_groups/${groupRef.id}`), {
        info: { name, createdBy: this.currentUser.uid },
        messages: {}
      });

      // Optional: initial system message in group
      this.currentChat = { id: groupRef.id, type: 'group', name, participants: info.members };
      await this.sendMessage(`${name} group created`, MESSAGE_TYPES.SYSTEM);

      return groupRef.id;

    } catch (error) {
      console.error('Failed to create group chat:', error);
      throw error;
    }
  }

  setupRealtimeListeners() {
    try{
      const q = query(collection(db, 'chats'), where('participants', 'array-contains', this.currentUser.uid));
      this.chatsUnsub && this.chatsUnsub();
      this.chatsUnsub = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const id = change.doc.id;
          const data = { id, ...change.doc.data() };
          if (change.type === 'added') {
            this.chats.unshift(data);
          } else if (change.type === 'modified') {
            const idx = this.chats.findIndex(c => c.id === id);
            if (idx !== -1) this.chats[idx] = data;
          } else if (change.type === 'removed') {
            this.chats = this.chats.filter(c=>c.id!==id);
          }
        });
        this.emit('chatsLoaded', this.chats);
      });
    }catch(e){ console.error('setupRealtimeListeners failed', e); }
  }

  async loadGroupsForUser(){
    if(!this.currentUser) return;
    try{
      const groupsQ = query(collection(db,'groups'), where('members','array-contains', this.currentUser.uid));
      const snap = await getDocs(groupsQ);
      this.groups = snap.docs.map(d=>({ id:d.id, ...d.data() }));
      this.emit('groupsLoaded', this.groups);
    }catch(e){ console.error('Failed to load groups:', e); }
  }

  // Event system
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }

  // Utility methods
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  }

  getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  // File handling methods
  async sendFileMessage(file) {
    if (!this.currentChat || !this.currentUser) return;

    try {
      // Check file size
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File size exceeds 10MB limit');
      }

      // Upload file to Firebase Storage
      const fileRef = storageRef(storage, `chat-files/${this.currentChat.id}/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // Determine message type
      const fileType = this.getFileType(file);

      // Send message with file metadata
      const messageData = {
        content: file.name,
        type: fileType,
        senderId: this.currentUser.uid,
        senderName: this.currentUser.profile?.name || this.currentUser.email,
        timestamp: Date.now(),
        status: 'sent',
        fileUrl: downloadURL,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      };

      await this.sendMessage(file.name, fileType, {
        fileUrl: downloadURL,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      return downloadURL;

    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  }

  getFileType(file) {
    if (file.type.startsWith('image/')) {
      return MESSAGE_TYPES.IMAGE;
    }
    return MESSAGE_TYPES.FILE;
  }

  // Typing status management
  setTypingStatus(isTyping) {
    if (this.isTyping === isTyping) return;

    this.isTyping = isTyping;

    if (this.currentChat) {
      const isGroup = this.currentChat.type === 'group';
      const base = isGroup ? `rtdb_groups/${this.currentChat.id}/typing` : `rtdb_chats/${this.currentChat.id}/typing`;
      const typingRef = rtdbRef(rtdb, `${base}/${this.currentUser.uid}`);

      if (isTyping) {
        set(typingRef, {
          userId: this.currentUser.uid,
          userName: this.currentUser.profile?.name || this.currentUser.email,
          timestamp: Date.now()
        });
      } else {
        set(typingRef, null);
      }
    }
  }

  // Platform management
  setCurrentPlatform(platform) {
    this.currentPlatform = platform;
    this.emit('platformChanged', platform);
  }

  // Chat management
  async loadChatMessages(chatId, limit = 50) {
    try {
      const isGroup = this.currentChat?.type === 'group';
      const path = isGroup ? `rtdb_groups/${chatId}/messages` : `rtdb_chats/${chatId}/messages`;
      const messagesRef = rtdbRef(rtdb, path);
      const messagesQuery = rtdbQuery(messagesRef, orderByChild('timestamp'), limitToLast(limit));

      const snapshot = await get(messagesQuery);
      const messages = [];

      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      // Sort by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp);

      this.messages = messages;
      this.emit('messagesLoaded', messages);

      return messages;

    } catch (error) {
      console.error('Failed to load chat messages:', error);
      throw error;
    }
  }

  // User presence management
  updateUserPresence(status) {
    if (!this.currentUser) return;

    const userRef = doc(db, 'users', this.currentUser.uid);
    updateDoc(userRef, {
      status: status,
      lastSeen: serverTimestamp()
    });
  }

  // Search functionality
  async searchMessages(query, chatId = null) {
    try {
      let searchQuery;

      if (chatId) {
        // Search in specific chat
        searchQuery = query(
          collection(db, 'messages'),
          where('chatId', '==', chatId),
          where('content', '>=', query),
          where('content', '<=', query + '\uf8ff')
        );
      } else {
        // Search across all user's chats
        searchQuery = query(
          collection(db, 'messages'),
          where('participants', 'array-contains', this.currentUser.uid),
          where('content', '>=', query),
          where('content', '<=', query + '\uf8ff')
        );
      }

      const snapshot = await getDocs(searchQuery);
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return results;

    } catch (error) {
      console.error('Failed to search messages:', error);
      throw error;
    }
  }

  // Notification management
  async markMessageAsRead(messageId) {
    if (!this.currentChat) return;

    try {
      const messageRef = rtdbRef(rtdb, `rtdb_chats/${this.currentChat.id}/messages/${messageId}`);
      await updateDoc(messageRef, {
        status: 'read',
        readAt: Date.now(),
        readBy: this.currentUser.uid
      });

      this.emit('messageRead', messageId);

    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }

  // Chat metadata management
  async updateChatMetadata(metadata) {
    if (!this.currentChat) return;

    try {
      const chatRef = doc(db, 'chats', this.currentChat.id);
      await updateDoc(chatRef, {
        ...metadata,
        updatedAt: serverTimestamp()
      });

      this.emit('chatUpdated', this.currentChat.id);

    } catch (error) {
      console.error('Failed to update chat metadata:', error);
      throw error;
    }
  }

  setCurrentChat(chat) {
    this.currentChat = chat;
    this.emit('chatChanged', chat);

    // Clean up previous listeners
    if (this.messagesUnsub) { this.messagesUnsub(); this.messagesUnsub = null; }
    if (this.typingUnsub) { this.typingUnsub(); this.typingUnsub = null; }

    if (chat) {
      // Live subscribe to messages and typing for this chat
      this.subscribeChatMessages(chat.id);
      this.subscribeTyping(chat.id);
      // Mark messages as read
      this.markAllMessagesAsRead(chat.id);
    }
  }

  async markAllMessagesAsRead(chatId) {
    try {
      const messagesRef = rtdbRef(rtdb, `rtdb_chats/${chatId}/messages`);
      const messagesQuery = rtdbQuery(messagesRef, orderByChild('status'), equalTo('unread'));

      const snapshot = await get(messagesQuery);
      const updates = {};

      snapshot.forEach((childSnapshot) => {
        const messageKey = childSnapshot.key;
        updates[`${messageKey}/status`] = 'read';
        updates[`${messageKey}/readAt`] = Date.now();
        updates[`${messageKey}/readBy`] = this.currentUser.uid;
      });

      if (Object.keys(updates).length > 0) {
        await update(rtdbRef(rtdb, `rtdb_chats/${chatId}/messages`), updates);
      }

    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }

  // Live subscriptions
  subscribeChatMessages(chatId){
    try{
      const isGroup = this.currentChat?.type === 'group';
      const path = isGroup ? `rtdb_groups/${chatId}/messages` : `rtdb_chats/${chatId}/messages`;
      const messagesRef = rtdbRef(rtdb, path);
      const q = rtdbQuery(messagesRef, orderByChild('timestamp'), limitToLast(100));
      this.messagesUnsub = onValue(q, (snapshot)=>{
        const msgs=[]; snapshot.forEach(s=>msgs.push({ id:s.key, ...s.val() }));
        msgs.sort((a,b)=>a.timestamp-b.timestamp);
        this.messages = msgs;
        this.emit('messagesLoaded', msgs);
      });
    }catch(e){ console.error('subscribeChatMessages failed', e); }
  }

  subscribeTyping(chatId){
    try{
      const tr = rtdbRef(rtdb, `rtdb_chats/${chatId}/typing`);
      this.typingUnsub = onValue(tr, (snap)=>{
        const list=[]; snap.forEach(c=>list.push(c.key));
        this.emit('typingUpdate', list);
      });
    }catch(e){ console.error('subscribeTyping failed', e); }
  }
}

// Export
export { MessagingState, MESSAGE_TYPES, USER_ROLES, PLATFORMS };