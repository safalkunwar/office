/**
 * Messaging System UI Controller
 * Handles DOM interactions and UI state management
 */

import { MessagingState, MESSAGE_TYPES, USER_ROLES, PLATFORMS } from './messaging-system.js';

class MessagingUI {
  constructor() {
    this.messagingState = new MessagingState();
    this.currentPlatform = PLATFORMS.INTERNAL;
    this.emojiPickerVisible = false;
    this.typingTimeout = null;

    this.initializeElements();
    this.setupEventListeners();
    this.initializeEmojiPicker();
    this.setupAuthListener();
  }

  initializeElements() {
    // Sidebar elements
    this.sidebar = document.getElementById('messagingSidebar');
    this.contactsList = document.getElementById('contactsList');
    this.contactSearchInput = document.getElementById('contactSearchInput');
    this.platformTabs = document.querySelectorAll('.sidebar-tab');

    // Main chat elements
    this.chatHeader = document.getElementById('chatHeader');
    this.chatMessages = document.getElementById('chatMessages');
    this.chatInput = document.getElementById('chatInput');
    this.messageInput = document.getElementById('messageInput');
    this.sendBtn = document.getElementById('sendBtn');

    // Chat info elements
    this.chatName = document.getElementById('chatName');
    this.chatStatus = document.getElementById('chatStatus');
    this.chatAvatar = document.getElementById('chatAvatar');
    this.infoContent = document.getElementById('infoContent');

    // Action buttons
    this.newChatBtn = document.getElementById('newChatBtn');
    this.newChatFab = document.getElementById('newChatFab');
    this.newGroupFab = document.getElementById('newGroupFab');
    this.broadcastFab = document.getElementById('broadcastFab');

    // File inputs
    this.imageInput = document.getElementById('imageInput');
    this.fileInput = document.getElementById('fileInput');

    // Emoji picker
    this.emojiPicker = document.getElementById('emojiPicker');
    this.emojiBtn = document.getElementById('emojiBtn');
    this.emojiGrid = document.getElementById('emojiGrid');

    // Typing indicator
    this.typingIndicator = document.getElementById('typingIndicator');
    this.typingText = document.getElementById('typingText');

    // Badges
    this.badges = {
      internal: document.getElementById('badgeInternal'),
      whatsapp: document.getElementById('badgeWhatsApp'),
      gmail: document.getElementById('badgeGmail'),
      facebook: document.getElementById('badgeFacebook')
    };
  }

  setupEventListeners() {
    // Platform tab switching
    this.platformTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchPlatform(tab.dataset.platform);
      });
    });

    // Search functionality
    this.contactSearchInput.addEventListener('input', (e) => {
      this.filterContacts(e.target.value);
    });

    // Message input events
    this.messageInput.addEventListener('input', () => {
      this.handleTyping();
      this.messagingState.setTypingStatus(true);
    });

    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Send button
    this.sendBtn.addEventListener('click', () => {
      this.sendMessage();
    });

    // File attachments
    this.imageInput.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        this.handleFileUpload(e.target.files[0], MESSAGE_TYPES.IMAGE);
      }
    });

    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        this.handleFileUpload(e.target.files[0], MESSAGE_TYPES.FILE);
      }
    });

    // Emoji picker
    this.emojiBtn.addEventListener('click', () => {
      this.toggleEmojiPicker();
    });

    // Action buttons
    this.newChatBtn.addEventListener('click', () => {
      this.showNewChatModal();
    });

    this.newChatFab.addEventListener('click', () => {
      this.showNewChatModal();
    });

    this.newGroupFab.addEventListener('click', () => {
      this.showNewGroupModal();
    });

    // Modal primary actions
    document.getElementById('createGroupBtn')?.addEventListener('click', ()=> this.handleGroupCreation());

    this.broadcastFab.addEventListener('click', () => {
      this.showBroadcastModal();
    });

    // Messaging state events
    this.messagingState.on('contactsLoaded', (contacts) => {
      this.renderContacts(contacts);
    });

    this.messagingState.on('chatsLoaded', (chats) => {
      this.renderRecentChats(chats);
    });

    this.messagingState.on('messagesLoaded', (messages) => {
      this.renderMessages(messages);
    });

    this.messagingState.on('messageSent', (message) => {
      this.addMessageToUI(message);
    });

    this.messagingState.on('typingUpdate', (typingUsers) => {
      this.updateTypingIndicator(typingUsers);
    });

    this.messagingState.on('platformChanged', (platform) => {
    this.messagingState.on('groupsLoaded', (groups) => {
      this.renderGroups(groups);
    });

      this.handlePlatformChange(platform);
    });
  }

  setupAuthListener() {
    // Use Firebase Auth session
    import('https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js').then(({ getAuth, onAuthStateChanged })=>{
      const auth = getAuth();
      onAuthStateChanged(auth, (user)=>{
        if(user){
          this.messagingState.setCurrentUser(user);
        } else {
          // redirect to login (adjust path if needed)
          window.location.href = '/html/student/login.html';
        }
      });
    }).catch(()=>{
      // Fallback: demo user (in case CDN blocked)
      const demoUser = { uid:'demo-admin', email:'admin@consultancy.com', profile:{ name:'Admin User', role: USER_ROLES.ADMIN } };
      this.messagingState.setCurrentUser(demoUser);
    });
  }

  initRoleTabs(){
    if(this._roleTabsInit) return;
    const bar = document.createElement('div');
    bar.className = 'role-tabs';
    bar.innerHTML = `
      <button class="role-tab active" data-role="all">All</button>
      <button class="role-tab" data-role="student">Students</button>
      <button class="role-tab" data-role="employee">Employees</button>
      <button class="role-tab" data-role="group">Groups</button>
    `;
    const afterEl = this.sidebar.querySelector('.sidebar-search');
    if(afterEl) afterEl.after(bar);
    bar.querySelectorAll('.role-tab').forEach(btn=>{
      btn.addEventListener('click',()=>{
        bar.querySelectorAll('.role-tab').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const role = btn.getAttribute('data-role');
        this.applyRoleFilter(role);
      });
    });
    this._roleTabsInit = true;
  }



  switchPlatform(platform) {
    this.currentPlatform = platform;

    // Update active tab
    this.platformTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.platform === platform);
    });

    // Switch platform in messaging state
    this.messagingState.setCurrentPlatform(platform);

    // Update UI based on platform
    this.updatePlatformUI(platform);
  }

  updatePlatformUI(platform) {
    // Update colors and styling based on platform
    const platformColors = {
      [PLATFORMS.INTERNAL]: { primary: '#2563eb', accent: '#1d4ed8' },
      [PLATFORMS.WHATSAPP]: { primary: '#25d366', accent: '#128c7e' },
      [PLATFORMS.GMAIL]: { primary: '#ea4335', accent: '#c5221f' },
      [PLATFORMS.FACEBOOK]: { primary: '#1877f2', accent: '#0d6efd' }
    };

    const colors = platformColors[platform];
    if (colors) {
      document.documentElement.style.setProperty('--msg-primary', colors.primary);
      document.documentElement.style.setProperty('--msg-primary-hover', colors.accent);
    }
  }

  handlePlatformChange(platform) {
    // Handle platform-specific functionality
    switch (platform) {
      case PLATFORMS.WHATSAPP:
        this.handleWhatsAppPlatform();
        break;
      case PLATFORMS.GMAIL:
        this.handleGmailPlatform();
        break;
      case PLATFORMS.FACEBOOK:
        this.handleFacebookPlatform();
        break;
      default:
        this.handleInternalPlatform();
        break;
    }
  }

  handleWhatsAppPlatform() {
    // Check if WhatsApp is connected
    if (!this.messagingState.whatsappConnected) {
      this.showNotification('Info', 'Connecting to WhatsApp...', 'info');
      // This would integrate with WhatsApp Business API
    }
  }

  handleGmailPlatform() {
    // Check if Gmail is connected
    if (!this.messagingState.gmailConnected) {
      this.showNotification('Info', 'Connecting to Gmail...', 'info');
      // This would integrate with Gmail API
    }
  }

  handleFacebookPlatform() {
    // Check if Facebook is connected
    if (!this.messagingState.facebookConnected) {
      this.showNotification('Info', 'Connecting to Facebook...', 'info');
      // This would integrate with Facebook Messenger API
    }
  }

  handleInternalPlatform() {
    // Show a WhatsApp-inspired quick actions header for Internal
    this.showInternalQuickActions();
    this.initRoleTabs();
    this.messagingState.loadContacts();
    this.messagingState.loadRecentChats();
  }

  showInternalQuickActions(){
    // Adds a pill row above contacts to quickly start chats with members
    if(this._quickActionsAdded) return;
    const header = this.sidebar.querySelector('.sidebar-header');
    if(!header) return;
    const bar = document.createElement('div');
    bar.className = 'internal-quick-actions';
    bar.innerHTML = `
      <div class="qa-scroll">
        <button class="qa-pill" id="qaNewChat"><i class="fas fa-user-plus"></i><span>New chat</span></button>
        <button class="qa-pill" id="qaNewGroup"><i class="fas fa-users"></i><span>New group</span></button>
        <button class="qa-pill" id="qaBroadcast"><i class="fas fa-bullhorn"></i><span>Broadcast</span></button>
      </div>`;
    header.after(bar);
    document.getElementById('qaNewChat').addEventListener('click',()=>this.showNewChatModal());
    document.getElementById('qaNewGroup').addEventListener('click',()=>this.showNewGroupModal());
    document.getElementById('qaBroadcast').addEventListener('click',()=>this.showBroadcastModal());
    this._quickActionsAdded = true;
  }


  async filterContacts(query) {
    const searchTerm = query.toLowerCase();
    const contacts = this.messagingState.contacts;

    if (!searchTerm) {
      this.renderContacts(contacts);
      return;
    }

    const filtered = contacts.filter(contact =>
      contact.name?.toLowerCase().includes(searchTerm) ||
      contact.email?.toLowerCase().includes(searchTerm) ||
      contact.role?.toLowerCase().includes(searchTerm)
    );

    this.renderContacts(filtered);
  }

  renderContacts(contacts) {
    // Separate into Students and Employees
    const students = contacts.filter(c => (c.role||'').toLowerCase()==='student');
    const employees = contacts.filter(c => (c.role||'').toLowerCase()!=='student');

    const section = (title, list) => `
      <div class="contact-group">
        <div class="contact-group-title">${title}</div>
        ${list.length? list.map(c=> this.renderContactItem(c)).join('') : `<div class="no-contacts"><span>No ${title.toLowerCase()} found</span></div>`}
      </div>`;

    this.contactsList.innerHTML = section('Students', students) + section('Employees', employees);

    // Add click handlers
    this.contactsList.querySelectorAll('.contact-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-contact-id');
        const c = contacts.find(x=>x.id===id);
        if(c){ this.selectContact(c); }
      });
    });
  }

  renderContactItem(contact) {
    const initials = this.messagingState.getInitials(contact.name);
    const statusClass = contact.status || 'offline';

    return `
      <div class="contact-item" data-contact-id="${contact.id}">
        <div class="contact-avatar">
          ${contact.avatarUrl ?
            `<img src="${contact.avatarUrl}" alt="${contact.name}">` :
            initials
          }
          <div class="contact-status ${statusClass}"></div>
        </div>
        <div class="contact-info">
          <div class="contact-name">${contact.name || 'Unknown'}</div>
          <div class="contact-subtitle">${contact.role || contact.email || ''}</div>
        </div>
        <div class="contact-meta">
          <div class="contact-time">${this.getLastSeen(contact.lastSeen)}</div>
          ${contact.unreadCount ? `<div class="contact-unread">${contact.unreadCount}</div>` : ''}
        </div>
      </div>
    `;
  }

  renderGroups(groups){
    // Insert a Groups section at the bottom of contacts list
    const html = `
      <div class="contact-group">
        <div class="contact-group-title">Groups</div>
        ${groups.map(g=>`
          <div class="contact-item" data-group-id="${g.id}">
            <div class="contact-avatar">${(g.name||'G')[0]}</div>
            <div class="contact-info">
              <div class="contact-name">${g.name||'Group'}</div>
              <div class="contact-subtitle">${(g.members||[]).length} members</div>
            </div>
          </div>
        `).join('')}
      </div>`;
    this.contactsList.insertAdjacentHTML('beforeend', html);
    this.contactsList.querySelectorAll('[data-group-id]').forEach(item=>{
      item.addEventListener('click',()=>{
        const id = item.getAttribute('data-group-id');
        const g = groups.find(x=>x.id===id);
        if(g){ this.selectGroup(g); }
      });
    });
  }

  selectGroup(group){
    // Treat as chat with id = group.id, and use RTDB path rtdb_groups/{id}
    this.messagingState.setCurrentChat({
      id: group.id,
      type: 'group',
      name: group.name || 'Group',
      participants: group.members || []
    });
    // Update header immediately
    this.chatName.textContent = group.name || 'Group';
    this.chatStatus.textContent = `${(group.members||[]).length} members`;
    this.chatHeader.style.display = 'flex';
    this.chatInput.style.display = 'block';
  }

  renderRecentChats(chats) {
    if (!chats.length) return;

    const chatsHTML = chats.map(chat => this.renderChatItem(chat)).join('');
    const recentChatsSection = `
      <div class="contact-group">
        <div class="contact-group-title">Recent Chats</div>
        ${chatsHTML}
      </div>
    `;

    // Insert at the beginning of contacts list
    this.contactsList.insertAdjacentHTML('afterbegin', recentChatsSection);
  }

  renderMessages(messages) {
    if (!messages.length) {
      this.chatMessages.innerHTML = `
        <div class="no-messages">
          <i class="fas fa-comments"></i>
          <span>No messages yet</span>
        </div>
      `;
      return;
    }

    // Clear existing messages
    this.chatMessages.innerHTML = '';

    // Group messages by date
    const groupedMessages = this.groupMessagesByDate(messages);

    // Render each group
    Object.entries(groupedMessages).forEach(([date, dateMessages]) => {
      // Add date separator
      const dateSeparator = document.createElement('div');
      dateSeparator.className = 'message-date-separator';
      dateSeparator.innerHTML = `<span>${this.formatDate(date)}</span>`;
      this.chatMessages.appendChild(dateSeparator);

      // Add messages for this date
      dateMessages.forEach(message => {
        const messageElement = this.createMessageElement(message);
        this.chatMessages.appendChild(messageElement);
      });
    });

    // Scroll to bottom
    this.scrollToBottom();
  }

  groupMessagesByDate(messages) {
    const grouped = {};

    messages.forEach(message => {
      const date = new Date(message.timestamp).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(message);
    });

    return grouped;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  }

  async ensureDirectChat(chatId, participants){
    try{
      const { getFirestore, doc, getDoc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js');
      const db = getFirestore();
      const ref = doc(db, 'chats', chatId);
      const snap = await getDoc(ref);
      if(!snap.exists()){
        await setDoc(ref, {
          id: chatId,
          type: 'direct',
          participants,
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp()
        });
      }
    }catch(e){ console.warn('ensureDirectChat failed', e); }
  }

  renderChatItem(chat) {
    const lastMessage = chat.lastMessage || 'No messages yet';
    const lastMessageTime = chat.lastMessageAt ?
      this.messagingState.formatTimestamp(chat.lastMessageAt.toDate()) : '';

    return `
      <div class="contact-item" data-chat-id="${chat.id}">
        <div class="contact-avatar">
          <i class="fas fa-${chat.type === 'group' ? 'users' : 'user'}"></i>
        </div>
        <div class="contact-info">
          <div class="contact-name">${chat.name}</div>
          <div class="contact-subtitle">${lastMessage}</div>
        </div>
        <div class="contact-meta">
          <div class="contact-time">${lastMessageTime}</div>
        </div>
      </div>
    `;
  }

  async selectContact(contact) {
    // Deterministic chat id and ensure chat document exists
    const uidA = this.messagingState.currentUser.uid;
    const uidB = contact.id;
    const parts = [uidA, uidB].sort();
    const chatId = parts.join('_');
    await this.ensureDirectChat(chatId, parts);

    // Update active contact
    this.messagingState.setCurrentChat({
      id: chatId,
      type: 'direct',
      participants: parts,
      name: contact.name,
      avatar: contact.avatarUrl
    });

    // Show chat interface
    this.showChatInterface(contact);
  }

  showChatInterface(contact) {
    // Update chat header
    this.chatName.textContent = contact.name || 'Unknown';
    this.chatStatus.textContent = contact.status === 'online' ? 'Online' : 'Offline';

    if (contact.avatarUrl) {
      this.chatAvatar.innerHTML = `<img src="${contact.avatarUrl}" alt="${contact.name}">`;
    } else {
      this.chatAvatar.innerHTML = this.messagingState.getInitials(contact.name);
    }

    // Show chat elements
    this.chatHeader.style.display = 'flex';
    this.chatInput.style.display = 'block';

    // Update info sidebar
    this.updateInfoSidebar(contact);
  }

  updateInfoSidebar(contact) {
    this.infoContent.innerHTML = `
      <div class="info-section">
        <h5>Contact Information</h5>
        <div class="info-item">
          <span class="info-label">Name:</span>
          <span class="info-value">${contact.name || 'Unknown'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Role:</span>
          <span class="info-value">${contact.role || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Email:</span>
          <span class="info-value">${contact.email || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Status:</span>
          <span class="info-value">${contact.status || 'Offline'}</span>
        </div>
      </div>
    `;
  }

  async sendMessage() {
    const content = this.messageInput.value.trim();
    if (!content) return;

    try {
      await this.messagingState.sendMessage(content, MESSAGE_TYPES.TEXT);
      this.messageInput.value = '';
      this.messagingState.setTypingStatus(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      this.showNotification('Error', 'Failed to send message', 'error');
    }
  }

  addMessageToUI(message) {
    const messageElement = this.createMessageElement(message);
    this.chatMessages.appendChild(messageElement);
    this.scrollToBottom();
  }

  createMessageElement(message) {
    const isMine = message.senderId === this.messagingState.currentUser.uid;
    const messageClass = isMine ? 'message sent' : 'message received';

    const messageHTML = `
      <div class="message-container">
        <div class="${messageClass}">
          <div class="message-content">
            ${this.renderMessageContent(message)}
            <div class="message-time">
              ${this.messagingState.formatTimestamp(message.timestamp)}
              ${this.renderMessageStatus(message.status)}
            </div>
          </div>
        </div>
      </div>
    `;

    const messageElement = document.createElement('div');
    messageElement.innerHTML = messageHTML;
    return messageElement.firstElementChild;
  }

  renderMessageContent(message) {
    switch (message.type) {
      case MESSAGE_TYPES.IMAGE:
        return `<img src="${message.fileUrl}" alt="Image" style="max-width: 200px; border-radius: 8px;">`;
      case MESSAGE_TYPES.FILE:
        return `
          <div class="message-attachment">
            <div class="attachment-preview">
              <i class="fas fa-file attachment-icon"></i>
              <div class="attachment-info">
                <div class="attachment-name">${message.fileName}</div>
                <div class="attachment-size">${this.formatFileSize(message.fileSize)}</div>
              </div>
            </div>
          </div>
        `;
      case MESSAGE_TYPES.SYSTEM:
        return `<em class="system-message">${message.content}</em>`;
      default:
        return `<p class="message-text">${this.linkifyText(message.content)}</p>`;
    }
  }

  renderMessageStatus(status) {
    const statusIcons = {
      'sent': '<i class="fas fa-check"></i>',
      'delivered': '<i class="fas fa-check-double"></i>',
      'read': '<i class="fas fa-check-double" style="color: var(--msg-primary);"></i>'
    };

    return statusIcons[status] || '';
  }

  handleTyping() {
    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Set new timeout to stop typing indicator
    this.typingTimeout = setTimeout(() => {
      this.messagingState.setTypingStatus(false);
    }, 2000);
  }

  updateTypingIndicator(typingUsers) {
    if (typingUsers.length > 0) {
      const userNames = typingUsers.map(uid => {
        const contact = this.messagingState.contacts.find(c => c.id === uid);
        return contact?.name || 'Someone';
      }).join(', ');

      this.typingText.textContent = `${userNames} ${typingUsers.length === 1 ? 'is' : 'are'} typing`;
      this.typingIndicator.style.display = 'flex';
    } else {
      this.typingIndicator.style.display = 'none';
    }
  }

  async handleFileUpload(file, type) {
    try {
      await this.messagingState.sendFileMessage(file);
    } catch (error) {
      console.error('Failed to upload file:', error);
      this.showNotification('Error', 'Failed to upload file', 'error');
    }
  }

  initializeEmojiPicker() {
    const emojis = ['😀','😁','😂','😊','😍','😎','😇','😉','👍','🙏','🎉','🔥','💯','✅','❗','❓','📌','📎','📷','📝'];

    this.emojiGrid.innerHTML = emojis.map(emoji =>
      `<button class="emoji-btn" data-emoji="${emoji}">${emoji}</button>`
    ).join('');

    // Add click handlers
    this.emojiGrid.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.insertEmoji(btn.dataset.emoji);
        this.toggleEmojiPicker();
      });
    });
  }

  toggleEmojiPicker() {
    this.emojiPickerVisible = !this.emojiPickerVisible;
    this.emojiPicker.classList.toggle('show', this.emojiPickerVisible);
  }

  insertEmoji(emoji) {
    const textarea = this.messageInput;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    textarea.value = text.substring(0, start) + emoji + text.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
    textarea.focus();
  }

  scrollToBottom() {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  // Utility methods
  getLastSeen(timestamp) {
    if (!timestamp) return 'Never';
    return this.messagingState.formatTimestamp(timestamp);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  linkifyText(text) {
    return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }

  showNotification(title, message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;
    notification.innerHTML = `
      <div class="notification-header">
        <span class="notification-title">${title}</span>
        <button class="notification-close">&times;</button>
      </div>
      <div class="notification-message">${message}</div>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);

    // Close button handler
    notification.querySelector('.notification-close').addEventListener('click', () => {
      this.removeNotification(notification);
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.removeNotification(notification);
    }, 5000);
  }

  removeNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }
  applyRoleFilter(role){
    const all = this.messagingState.contacts || [];
    if(role==='all'){ this.renderContacts(all); return; }
    if(role==='group'){ this.contactsList.innerHTML=''; this.renderGroups(this.messagingState.groups||[]); return; }
    const filtered = role==='employee'
      ? all.filter(c=>{
          const r = (c.role||'').toLowerCase();
          return r==='employee' || r==='instructor' || r==='admin';
        })
      : all.filter(c=> (c.role||'').toLowerCase()==='student');
    this.renderContacts(filtered);
  }


  // Modal methods (to be implemented)
  showNewChatModal() {
    const modal = document.getElementById('newChatModal');
    if (modal) {
      modal.style.display = 'block';
      this.populateNewChatModal();
    }
  }

  showNewGroupModal() {
    const modal = document.getElementById('newGroupModal');
    if (modal) {
      modal.style.display = 'block';
      this.populateGroupModal();
    }
  }

  showBroadcastModal() {
    const modal = document.getElementById('broadcastModal');
    if (modal) {
      modal.style.display = 'block';
      this.populateBroadcastModal();
    }
  }

  // Modal population methods
  populateNewChatModal() {
    const searchInput = document.getElementById('newChatSearch');
    const resultsContainer = document.getElementById('newChatContacts');

    if (searchInput && resultsContainer) {
      searchInput.addEventListener('input', (e) => {
        this.searchContactsForModal(e.target.value, resultsContainer);
      });

      // Show all contacts initially
      this.searchContactsForModal('', resultsContainer);
    }
  }

  populateGroupModal() {
    const membersContainer = document.getElementById('groupMembersSelection');

    if (membersContainer) {
      this.renderGroupMembersSelection(membersContainer);
    }
  }

  populateBroadcastModal() {
    // Broadcast modal is already populated with static options
    // Additional dynamic content can be added here if needed
  }

  // Helper methods for modals
  searchContactsForModal(query, container) {
    const searchTerm = query.toLowerCase();
    const contacts = this.messagingState.contacts;

    if (!searchTerm) {
      this.renderContactResults(contacts, container);
      return;
    }

    const filtered = contacts.filter(contact =>
      contact.name?.toLowerCase().includes(searchTerm) ||
      contact.email?.toLowerCase().includes(searchTerm) ||
      contact.role?.toLowerCase().includes(searchTerm)
    );

    this.renderContactResults(filtered, container);
  }

  renderContactResults(contacts, container) {
    if (!contacts.length) {
      container.innerHTML = `
        <div class="no-contacts">
          <i class="fas fa-users"></i>
          <span>No contacts found</span>
        </div>
      `;
      return;
    }

    const contactsHTML = contacts.map(contact => `
      <div class="contact-result-item" data-contact-id="${contact.id}">
        <div class="contact-info">
          <div class="contact-avatar">
            ${this.messagingState.getInitials(contact.name)}
          </div>
          <div class="contact-details">
            <div class="contact-name">${contact.name || 'Unknown'}</div>
            <div class="contact-role">${contact.role || contact.email || ''}</div>
          </div>
        </div>
      </div>
    `).join('');

    container.innerHTML = contactsHTML;

    // Add click handlers
    container.querySelectorAll('.contact-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const contactId = item.dataset.contactId;
        const contact = contacts.find(c => c.id === contactId);
        if (contact) {
          this.selectContact(contact);
          this.hideModal('newChatModal');
        }
      });
    });
  }

  renderGroupMembersSelection(container) {
    const contacts = this.messagingState.contacts;

    if (!contacts.length) {
      container.innerHTML = `
        <div class="no-contacts">
          <i class="fas fa-users"></i>
          <span>No contacts available</span>
        </div>
      `;
      return;
    }

    const membersHTML = contacts.map(contact => `
      <div class="member-checkbox">
        <input type="checkbox" id="member_${contact.id}" value="${contact.id}">
        <label for="member_${contact.id}">
          <div class="contact-avatar">
            ${this.messagingState.getInitials(contact.name)}
          </div>
          <div class="contact-details">
            <div class="contact-name">${contact.name || 'Unknown'}</div>
            <div class="contact-role">${contact.role || contact.email || ''}</div>
          </div>
        </label>
      </div>
    `).join('');

    container.innerHTML = membersHTML;
  }

  // Modal utility methods
  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Group creation handler
  async handleGroupCreation() {
    const groupName = document.getElementById('groupNameInput')?.value.trim();
    const description = document.getElementById('groupDescriptionInput')?.value.trim();
    const selectedMembers = Array.from(
      document.querySelectorAll('#groupMembersSelection input[type="checkbox"]:checked')
    ).map(cb => cb.value);

    if (!groupName) {
      this.showNotification('Error', 'Please enter a group name', 'error');
      return;
    }

    if (selectedMembers.length === 0) {
      this.showNotification('Error', 'Please select at least one member', 'error');
      return;
    }

    try {
      const groupId = await this.messagingState.createGroupChat(groupName, description, selectedMembers);
      this.showNotification('Success', 'Group created successfully', 'success');
      this.hideModal('newGroupModal');

      // Clear form
      document.getElementById('groupNameInput').value = '';
      document.getElementById('groupDescriptionInput').value = '';
      document.querySelectorAll('#groupMembersSelection input[type="checkbox"]').forEach(cb => cb.checked = false);

    } catch (error) {
      console.error('Failed to create group:', error);
      this.showNotification('Error', 'Failed to create group', 'error');
    }
  }

  // Broadcast handler
  async handleBroadcast() {
    const recipients = document.getElementById('broadcastRecipients')?.value;
    const message = document.getElementById('broadcastMessage')?.value.trim();
    const schedule = document.getElementById('broadcastSchedule')?.value;

    if (!message) {
      this.showNotification('Error', 'Please enter a message', 'error');
      return;
    }

    try {
      // This would integrate with your broadcast system
      this.showNotification('Success', 'Broadcast message sent successfully', 'success');
      this.hideModal('broadcastModal');

      // Clear form
      document.getElementById('broadcastMessage').value = '';
      document.getElementById('broadcastSchedule').value = '';

    } catch (error) {
      console.error('Failed to send broadcast:', error);
      this.showNotification('Error', 'Failed to send broadcast', 'error');
    }
  }
}

// Initialize the messaging UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.messagingUI = new MessagingUI();
});

export { MessagingUI };