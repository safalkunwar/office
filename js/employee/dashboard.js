import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { 
    ref,
    get,
    query,
    orderByChild,
    equalTo,
    onValue,
    update,
    push,
    serverTimestamp,
    limitToLast
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { auth, db } from '../config/firebase.js';
import { firebaseConfig } from '../config/firebase.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// DOM Elements
const employeeName = document.getElementById('employeeName');
const taskList = document.getElementById('taskList');
const messageList = document.getElementById('messageList');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessage');
const taskStatusFilter = document.getElementById('taskStatusFilter');
const taskPriorityFilter = document.getElementById('taskPriorityFilter');
const reportsSection = document.getElementById('reportsSection');
const newMessageBtn = document.getElementById('newMessageBtn');
const messageRecipient = document.getElementById('messageRecipient');

let currentUser = null;
let currentUserRole = null;

// Initialize dashboard
async function initDashboard() {
    try {
        // Check authentication state
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }

            currentUser = user;
            
            // Get user data from database
            const userRef = ref(db, `employees/${user.uid}`);
            const snapshot = await get(userRef);
            
            if (!snapshot.exists()) {
                throw new Error('User data not found');
            }

            const userData = snapshot.val();
            currentUserRole = userData.role;

            // Set employee name
            employeeName.textContent = userData.name;

            // Show/hide reports section based on role
            if (reportsSection) {
                reportsSection.style.display = currentUserRole === 'admin' ? 'block' : 'none';
            }

            // Load tasks
            loadTasks(user.uid);

            // Load messages
            loadMessages(user.uid);

            // Load employees for messaging (admin only)
            if (currentUserRole === 'admin') {
                loadEmployeesForMessaging();
            }

            // Set up real-time updates
            setupRealtimeUpdates(user.uid);
        });
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        alert('Error loading dashboard. Please try again.');
    }
}

// Load tasks for the employee
async function loadTasks(userId) {
    try {
        const tasksRef = ref(db, 'tasks');
        const tasksQuery = query(tasksRef, orderByChild('assignedTo'), equalTo(userId));
        
        onValue(tasksQuery, (snapshot) => {
            taskList.innerHTML = '';
            const tasks = [];
            
            snapshot.forEach((childSnapshot) => {
                const task = childSnapshot.val();
                task.id = childSnapshot.key;
                tasks.push(task);
            });

            // Filter tasks based on status and priority
            const statusFilter = taskStatusFilter.value;
            const priorityFilter = taskPriorityFilter.value;
            
            const filteredTasks = tasks.filter(task => {
                const statusMatch = statusFilter === 'all' || task.status === statusFilter;
                const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
                return statusMatch && priorityMatch;
            });

            // Sort tasks by due date
            filteredTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

            // Display tasks
            filteredTasks.forEach(task => {
                const taskElement = createTaskElement(task);
                taskList.appendChild(taskElement);
            });
        });
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Load messages
async function loadMessages(userId) {
    try {
        const messagesRef = ref(db, 'messages');
        const messagesQuery = query(messagesRef, orderByChild('timestamp'));
        
        onValue(messagesQuery, (snapshot) => {
            messageList.innerHTML = '';
            const messages = [];
            
            snapshot.forEach((childSnapshot) => {
                const message = childSnapshot.val();
                message.id = childSnapshot.key;
                
                // Show messages where user is either sender or recipient
                if (message.senderId === userId || message.recipientId === userId) {
                    messages.push(message);
                }
            });

            // Sort messages by timestamp
            messages.sort((a, b) => b.timestamp - a.timestamp);

            // Display messages
            messages.forEach(message => {
                const messageElement = createMessageElement(message);
                messageList.appendChild(messageElement);
            });
        });
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Load employees for messaging (admin only)
async function loadEmployeesForMessaging() {
    try {
        const employeesRef = ref(db, 'employees');
        const snapshot = await get(employeesRef);
        
        if (snapshot.exists()) {
            messageRecipient.innerHTML = '<option value="">Select Employee</option>';
            
            snapshot.forEach((childSnapshot) => {
                const employee = childSnapshot.val();
                if (employee.role !== 'admin') {
                    const option = document.createElement('option');
                    option.value = childSnapshot.key;
                    option.textContent = employee.name;
                    messageRecipient.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

// Create message element
function createMessageElement(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `message-item ${message.isRead ? 'read' : 'unread'}`;
    
    const isSender = message.senderId === currentUser.uid;
    const senderName = isSender ? 'You' : message.senderName;
    
    messageElement.innerHTML = `
        <div class="message-header">
            <h4>${senderName}</h4>
            <span class="message-time">${new Date(message.timestamp).toLocaleString()}</span>
        </div>
        <p class="message-content">${message.content}</p>
    `;
    return messageElement;
}

// Send message
async function sendMessage(content, recipientId = null) {
    try {
        if (!content.trim()) {
            alert('Please enter a message');
            return;
        }

        const messageRef = ref(db, 'messages');
        const newMessage = {
            senderId: currentUser.uid,
            senderName: currentUser.displayName || 'Employee',
            recipientId: recipientId || (currentUserRole === 'admin' ? messageRecipient.value : 'admin'),
            content: content.trim(),
            timestamp: serverTimestamp(),
            isRead: false
        };

        await push(messageRef, newMessage);
        messageInput.value = '';
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message. Please try again.');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', initDashboard);

taskStatusFilter.addEventListener('change', () => {
    loadTasks(currentUser.uid);
});

taskPriorityFilter.addEventListener('change', () => {
    loadTasks(currentUser.uid);
});

sendMessageBtn.addEventListener('click', () => {
    sendMessage(messageInput.value);
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(messageInput.value);
    }
});

// Logout function
function logout() {
    auth.signOut().then(() => {
        localStorage.removeItem('employeeData');
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Error signing out:', error);
    });
}

async function loadStudents() {
    const studentsRef = ref(db, 'students');
    const requiredDocsRef = ref(db, 'documentRequirements');
    
    try {
        const [studentsSnapshot, requiredDocsSnapshot] = await Promise.all([
            get(studentsRef),
            get(requiredDocsRef)
        ]);
        
        const requiredDocs = requiredDocsSnapshot.val() || {};
        let html = '';
        
        studentsSnapshot.forEach((childSnapshot) => {
            const student = childSnapshot.val();
            const missingDocs = checkMissingDocuments(student.documents || {}, requiredDocs);
            
            html += `
                <div class="student-card">
                    <div class="student-info">
                        <h3>${student.name}</h3>
                        <p><i class="fas fa-envelope"></i> ${student.email}</p>
                        <p><i class="fas fa-phone"></i> ${student.phone}</p>
                        <p><i class="fas fa-graduation-cap"></i> ${student.course}</p>
                    </div>
                    <div class="document-status">
                        <h4>Document Status</h4>
                        ${missingDocs.length > 0 ? 
                            `<div class="missing-docs">
                                <p>Missing Documents:</p>
                                <ul>
                                    ${missingDocs.map(doc => `<li>${doc}</li>`).join('')}
                                </ul>
                                <button class="btn btn-small" onclick="notifyStudent('${childSnapshot.key}', ${JSON.stringify(missingDocs)})">
                                    Notify Student
                                </button>
                            </div>`
                            : 
                            '<div class="complete-docs">All documents submitted</div>'
                        }
                    </div>
                    <div class="student-actions">
                        <button class="btn btn-primary btn-small" onclick="viewStudentDocuments('${childSnapshot.key}')">
                            View Documents
                        </button>
                        <button class="btn btn-small" onclick="uploadDocuments('${childSnapshot.key}')">
                            Upload Documents
                        </button>
                    </div>
                </div>
            `;
        });
        
        document.getElementById('studentsList').innerHTML = html || '<p>No students found.</p>';
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

function checkMissingDocuments(studentDocs, requiredDocs) {
    return Object.keys(requiredDocs).filter(docType => 
        requiredDocs[docType].required && !studentDocs[docType]
    );
}

window.notifyStudent = async function(studentId, missingDocs) {
    try {
        const notificationRef = ref(db, 'notifications');
        await push(notificationRef, {
            studentId,
            type: 'missing_documents',
            documents: missingDocs,
            status: 'unread',
            createdAt: new Date().toISOString()
        });
        alert('Student notified about missing documents');
    } catch (error) {
        console.error('Error notifying student:', error);
        alert('Error sending notification');
    }
};

window.viewStudentDocuments = function(studentId) {
    window.location.href = `student-documents.html?id=${studentId}`;
};

// Load Upcoming Tasks
function loadUpcomingTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasksRef = ref(db, 'tasks');
    const tasksQuery = query(
        tasksRef,
        orderByChild('assignedTo'),
        equalTo(currentUser.email)
    );

    onValue(tasksQuery, (snapshot) => {
        const tasksContainer = document.getElementById('upcomingTasks');
        let html = '';

        const tasks = [];
        snapshot.forEach((childSnapshot) => {
            const task = childSnapshot.val();
            if (new Date(task.dueDate) >= today) {
                tasks.push({ id: childSnapshot.key, ...task });
            }
        });

        // Sort by due date
        tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        tasks.slice(0, 5).forEach(task => {
            html += `
                <div class="task-item">
                    <div class="task-header">
                        <span class="task-title">${task.title}</span>
                        <span class="task-due">Due: ${new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div class="task-status">
                        Status: <span class="status-badge ${task.status}">${task.status}</span>
                    </div>
                </div>
            `;
        });

        tasksContainer.innerHTML = html || '<p>No upcoming tasks</p>';
    });
}

// Load Recent Activities
function loadRecentActivities() {
    const activitiesRef = ref(db, 'activities');
    const activitiesQuery = query(
        activitiesRef,
        orderByChild('userId'),
        equalTo(currentUser.uid),
        limitToLast(5)
    );

    onValue(activitiesQuery, (snapshot) => {
        const activitiesContainer = document.getElementById('recentActivities');
        let html = '';

        const activities = [];
        snapshot.forEach((childSnapshot) => {
            activities.unshift(childSnapshot.val());
        });

        activities.forEach(activity => {
            html += `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas ${getActivityIcon(activity.type)}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">${activity.description}</div>
                        <div class="activity-time">${formatActivityTime(activity.timestamp)}</div>
                    </div>
                </div>
            `;
        });

        activitiesContainer.innerHTML = html || '<p>No recent activities</p>';
    });
}

// Helper Functions
function getActivityIcon(type) {
    const icons = {
        'document_upload': 'fa-file-upload',
        'student_add': 'fa-user-plus',
        'task_complete': 'fa-check-circle',
        'default': 'fa-info-circle'
    };
    return icons[type] || icons.default;
}

function formatActivityTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)} hours ago`;
    return date.toLocaleDateString();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set current date
    document.getElementById('currentDate').textContent = 
        new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

    loadUpcomingTasks();
    loadRecentActivities();
    loadStudents();
});

// Load Reports (Admin Only)
async function loadReports() {
    if (currentUserRole !== 'admin') return;

    const reportType = document.getElementById('reportType').value;
    const reportPeriod = document.getElementById('reportPeriod').value;

    try {
        const reportContent = document.getElementById('reportContent');
        reportContent.innerHTML = '<div class="loading">Loading report...</div>';

        let reportData;
        switch (reportType) {
            case 'performance':
                reportData = await loadPerformanceReport(reportPeriod);
                break;
            case 'tasks':
                reportData = await loadTaskReport(reportPeriod);
                break;
            case 'messages':
                reportData = await loadMessageReport(reportPeriod);
                break;
        }

        displayReport(reportType, reportData);
    } catch (error) {
        console.error('Error loading report:', error);
        document.getElementById('reportContent').innerHTML = '<div class="error">Error loading report</div>';
    }
}

// Load Performance Report
async function loadPerformanceReport(period) {
    const employeesRef = ref(db, 'employees');
    const tasksRef = ref(db, 'tasks');
    const startDate = getStartDate(period);

    const [employeesSnapshot, tasksSnapshot] = await Promise.all([
        get(employeesRef),
        get(tasksRef)
    ]);

    const performanceData = [];
    employeesSnapshot.forEach((employeeSnapshot) => {
        const employee = employeeSnapshot.val();
        if (employee.role !== 'admin') {
            const tasks = [];
            tasksSnapshot.forEach((taskSnapshot) => {
                const task = taskSnapshot.val();
                if (task.assignedTo === employeeSnapshot.key && 
                    new Date(task.createdAt) >= startDate) {
                    tasks.push(task);
                }
            });

            const completedTasks = tasks.filter(task => task.status === 'completed').length;
            const totalTasks = tasks.length;
            const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

            performanceData.push({
                name: employee.name,
                totalTasks,
                completedTasks,
                completionRate,
                averageTime: calculateAverageTime(tasks)
            });
        }
    });

    return performanceData;
}

// Load Task Report
async function loadTaskReport(period) {
    const tasksRef = ref(db, 'tasks');
    const startDate = getStartDate(period);

    const snapshot = await get(tasksRef);
    const tasks = [];
    
    snapshot.forEach((childSnapshot) => {
        const task = childSnapshot.val();
        if (new Date(task.createdAt) >= startDate) {
            tasks.push(task);
        }
    });

    return {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(task => task.status === 'completed').length,
        inProgressTasks: tasks.filter(task => task.status === 'in-progress').length,
        pendingTasks: tasks.filter(task => task.status === 'pending').length,
        tasksByPriority: groupTasksByPriority(tasks),
        tasksByStatus: groupTasksByStatus(tasks)
    };
}

// Load Message Report
async function loadMessageReport(period) {
    const messagesRef = ref(db, 'messages');
    const startDate = getStartDate(period);

    const snapshot = await get(messagesRef);
    const messages = [];
    
    snapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val();
        if (new Date(message.timestamp) >= startDate) {
            messages.push(message);
        }
    });

    return {
        totalMessages: messages.length,
        unreadMessages: messages.filter(msg => !msg.isRead).length,
        messagesBySender: groupMessagesBySender(messages),
        messagesByTime: groupMessagesByTime(messages)
    };
}

// Helper Functions
function getStartDate(period) {
    const now = new Date();
    switch (period) {
        case 'week':
            return new Date(now.setDate(now.getDate() - 7));
        case 'month':
            return new Date(now.setMonth(now.getMonth() - 1));
        case 'quarter':
            return new Date(now.setMonth(now.getMonth() - 3));
        default:
            return new Date(0);
    }
}

function calculateAverageTime(tasks) {
    const completedTasks = tasks.filter(task => task.status === 'completed');
    if (completedTasks.length === 0) return 0;

    const totalTime = completedTasks.reduce((sum, task) => {
        const startTime = new Date(task.createdAt);
        const endTime = new Date(task.completedAt);
        return sum + (endTime - startTime);
    }, 0);

    return totalTime / completedTasks.length;
}

function groupTasksByPriority(tasks) {
    return tasks.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
    }, {});
}

function groupTasksByStatus(tasks) {
    return tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
    }, {});
}

function groupMessagesBySender(messages) {
    return messages.reduce((acc, msg) => {
        acc[msg.senderName] = (acc[msg.senderName] || 0) + 1;
        return acc;
    }, {});
}

function groupMessagesByTime(messages) {
    return messages.reduce((acc, msg) => {
        const hour = new Date(msg.timestamp).getHours();
        const timeSlot = `${Math.floor(hour / 6) * 6}-${Math.floor(hour / 6) * 6 + 6}`;
        acc[timeSlot] = (acc[timeSlot] || 0) + 1;
        return acc;
    }, {});
}

// Display Report
function displayReport(type, data) {
    const reportContent = document.getElementById('reportContent');
    let html = '';

    switch (type) {
        case 'performance':
            html = `
                <div class="performance-report">
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Total Tasks</th>
                                <th>Completed Tasks</th>
                                <th>Completion Rate</th>
                                <th>Average Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(emp => `
                                <tr>
                                    <td>${emp.name}</td>
                                    <td>${emp.totalTasks}</td>
                                    <td>${emp.completedTasks}</td>
                                    <td>${emp.completionRate.toFixed(2)}%</td>
                                    <td>${formatTime(emp.averageTime)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            break;
        case 'tasks':
            html = `
                <div class="task-report">
                    <div class="report-summary">
                        <div class="summary-item">
                            <h3>Total Tasks</h3>
                            <p>${data.totalTasks}</p>
                        </div>
                        <div class="summary-item">
                            <h3>Completed</h3>
                            <p>${data.completedTasks}</p>
                        </div>
                        <div class="summary-item">
                            <h3>In Progress</h3>
                            <p>${data.inProgressTasks}</p>
                        </div>
                        <div class="summary-item">
                            <h3>Pending</h3>
                            <p>${data.pendingTasks}</p>
                        </div>
                    </div>
                    <div class="report-charts">
                        <canvas id="priorityChart"></canvas>
                        <canvas id="statusChart"></canvas>
                    </div>
                </div>
            `;
            break;
        case 'messages':
            html = `
                <div class="message-report">
                    <div class="report-summary">
                        <div class="summary-item">
                            <h3>Total Messages</h3>
                            <p>${data.totalMessages}</p>
                        </div>
                        <div class="summary-item">
                            <h3>Unread Messages</h3>
                            <p>${data.unreadMessages}</p>
                        </div>
                    </div>
                    <div class="report-charts">
                        <canvas id="senderChart"></canvas>
                        <canvas id="timeChart"></canvas>
                    </div>
                </div>
            `;
            break;
    }

    reportContent.innerHTML = html;
}

function formatTime(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

// Event Listeners
document.getElementById('reportType').addEventListener('change', loadReports);
document.getElementById('reportPeriod').addEventListener('change', loadReports);

// Show login notification
function showLoginNotification(userName) {
    const notification = document.createElement('div');
    notification.className = 'login-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-check-circle"></i>
            <p>Welcome back, ${userName}!</p>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Load chat history for admin
async function loadChatHistory(employeeId = null) {
    try {
        const messagesRef = ref(db, 'messages');
        const messagesQuery = query(messagesRef, orderByChild('timestamp'));
        
        onValue(messagesQuery, (snapshot) => {
            const messages = [];
            snapshot.forEach((childSnapshot) => {
                const message = childSnapshot.val();
                message.id = childSnapshot.key;
                
                // If employeeId is provided, only show messages with that employee
                if (employeeId) {
                    if ((message.senderId === employeeId && message.recipientId === currentUser.uid) ||
                        (message.senderId === currentUser.uid && message.recipientId === employeeId)) {
                        messages.push(message);
                    }
                } else {
                    // Show all messages for admin
                    messages.push(message);
                }
            });

            // Sort messages by timestamp
            messages.sort((a, b) => a.timestamp - b.timestamp);

            // Display messages
            displayChatHistory(messages, employeeId);
        });
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

// Display chat history
function displayChatHistory(messages, employeeId = null) {
    const chatHistoryContainer = document.getElementById('chatHistory');
    if (!chatHistoryContainer) return;

    let html = '';
    if (employeeId) {
        // Show conversation with specific employee
        html = messages.map(message => createMessageElement(message)).join('');
    } else {
        // Show all conversations grouped by employee
        const conversations = groupMessagesByEmployee(messages);
        html = Object.entries(conversations).map(([employeeId, conversation]) => `
            <div class="conversation-group">
                <div class="conversation-header" onclick="toggleConversation('${employeeId}')">
                    <h3>${conversation.employeeName}</h3>
                    <span class="message-count">${conversation.messages.length} messages</span>
                </div>
                <div class="conversation-messages" id="conversation-${employeeId}">
                    ${conversation.messages.map(message => createMessageElement(message)).join('')}
                </div>
            </div>
        `).join('');
    }

    chatHistoryContainer.innerHTML = html;
}

// Group messages by employee
function groupMessagesByEmployee(messages) {
    return messages.reduce((acc, message) => {
        const employeeId = message.senderId === currentUser.uid ? message.recipientId : message.senderId;
        if (!acc[employeeId]) {
            acc[employeeId] = {
                employeeName: message.senderId === currentUser.uid ? message.recipientName : message.senderName,
                messages: []
            };
        }
        acc[employeeId].messages.push(message);
        return acc;
    }, {});
}

// Toggle conversation visibility
function toggleConversation(employeeId) {
    const conversation = document.getElementById(`conversation-${employeeId}`);
    if (conversation) {
        conversation.style.display = conversation.style.display === 'none' ? 'block' : 'none';
    }
}

// Load employees for messaging
async function loadEmployeesForMessaging() {
    try {
        const employeesRef = ref(db, 'employees');
        const snapshot = await get(employeesRef);
        
        const messageRecipient = document.getElementById('messageRecipient');
        if (!messageRecipient) return;

        messageRecipient.innerHTML = '<option value="">Select Recipient</option>';
        
        snapshot.forEach((childSnapshot) => {
            const employee = childSnapshot.val();
            if (employee.role !== 'admin' || currentUserRole === 'admin') {
                const option = document.createElement('option');
                option.value = childSnapshot.key;
                option.textContent = `${employee.name} (${employee.role})`;
                messageRecipient.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

// Send message with enhanced functionality
async function sendMessage(content, recipientId = null) {
    try {
        if (!content.trim()) {
            alert('Please enter a message');
            return;
        }

        const messageRef = ref(db, 'messages');
        const recipient = recipientId || (currentUserRole === 'admin' ? messageRecipient.value : 'admin');
        
        if (!recipient) {
            alert('Please select a recipient');
            return;
        }

        const newMessage = {
            senderId: currentUser.uid,
            senderName: currentUser.displayName || 'Employee',
            recipientId: recipient,
            content: content.trim(),
            timestamp: serverTimestamp(),
            isRead: false,
            type: 'text'
        };

        await push(messageRef, newMessage);
        
        // Clear input and show success message
        messageInput.value = '';
        showMessageSentNotification();
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message. Please try again.');
    }
}

// Show message sent notification
function showMessageSentNotification() {
    const notification = document.createElement('div');
    notification.className = 'message-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-check-circle"></i>
            <p>Message sent successfully!</p>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// Initialize dashboard with enhanced features
async function initDashboard() {
    try {
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }

            currentUser = user;
            
            const userRef = ref(db, `employees/${user.uid}`);
            const snapshot = await get(userRef);
            
            if (!snapshot.exists()) {
                throw new Error('User data not found');
            }

            const userData = snapshot.val();
            currentUserRole = userData.role;

            // Set employee name and show welcome notification
            employeeName.textContent = userData.name;
            showLoginNotification(userData.name);

            // Show/hide reports section based on role
            if (reportsSection) {
                reportsSection.style.display = currentUserRole === 'admin' ? 'block' : 'none';
            }

            // Load appropriate content based on role
            if (currentUserRole === 'admin') {
                loadChatHistory();
                loadEmployeesForMessaging();
            } else {
                loadMessages(user.uid);
            }

            loadTasks(user.uid);
            setupRealtimeUpdates(user.uid);
        });
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        alert('Error loading dashboard. Please try again.');
    }
} 