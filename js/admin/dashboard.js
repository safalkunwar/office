import { auth, db } from '../config/firebase.js';
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
    createUserWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";

// DOM Elements
const tasksList = document.getElementById('tasksList');
const performanceList = document.getElementById('performanceList');
const activitiesList = document.getElementById('activitiesList');
const employeeCount = document.getElementById('employeeCount');
const activeTasksCount = document.getElementById('activeTasksCount');
const dueTodayCount = document.getElementById('dueTodayCount');
const messagesLink = document.getElementById('messagesLink');

// Task Filters
const taskPriorityFilter = document.getElementById('taskPriorityFilter');
const taskStatusFilter = document.getElementById('taskStatusFilter');

// Performance Filter
const performancePeriod = document.getElementById('performancePeriod');

// Messaging Elements
const messageThread = document.getElementById('messageThread');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessage');
const conversationList = document.getElementById('conversationList');

// Message Notification
let currentNotification = null;

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = './login.html';
        return;
    }
    initializeDashboard();
});

// Initialize dashboard
async function initializeDashboard() {
    try {
        // Load admin name
        const adminRef = ref(db, `admins/${auth.currentUser.uid}`);
        const adminSnapshot = await get(adminRef);
        const adminData = adminSnapshot.val();
        document.getElementById('adminName').textContent = adminData.name;

        // Load all dashboard components
        await Promise.all([
            loadStatistics(),
            loadTasks(),
            loadPerformanceData(),
            loadActivities(),
            loadConversations()
        ]);

        // Initialize messaging
        initializeMessaging();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
}

// Load dashboard statistics
async function loadStatistics() {
    try {
        // Employee count
        const employeesRef = ref(db, 'employees');
        const employeesSnapshot = await get(employeesRef);
        employeeCount.textContent = employeesSnapshot.size || 0;

        // Active tasks count
        const tasksRef = ref(db, 'tasks');
        const tasksSnapshot = await get(tasksRef);
        const activeTasks = Array.from(tasksSnapshot.val() || []).filter(task => 
            task.status !== 'completed'
        );
        activeTasksCount.textContent = activeTasks.length;

        // Tasks due today
        const today = new Date().toISOString().split('T')[0];
        const dueToday = activeTasks.filter(task => task.dueDate === today);
        dueTodayCount.textContent = dueToday.length;
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Load and display tasks
async function loadTasks() {
    try {
        const tasksRef = ref(db, 'tasks');
        const tasksQuery = query(tasksRef, orderByChild('dueDate'));
        
        onValue(tasksQuery, (snapshot) => {
            const tasks = [];
            snapshot.forEach((childSnapshot) => {
                tasks.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });

            // Sort tasks by priority and due date
            tasks.sort((a, b) => {
                const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
                if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                }
                return new Date(a.dueDate) - new Date(b.dueDate);
            });

            // Filter tasks based on selected filters
            const priorityFilter = taskPriorityFilter.value;
            const statusFilter = taskStatusFilter.value;
            
            const filteredTasks = tasks.filter(task => {
                const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
                const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
                return matchesPriority && matchesStatus;
            });

            // Display tasks
            displayTasks(filteredTasks);
        });
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Display tasks in the UI
function displayTasks(tasks) {
    if (!tasksList) return;
    
    tasksList.innerHTML = tasks.map(task => `
        <div class="task-card ${task.priority.toLowerCase()}-priority">
            <div class="task-header">
                <h3 class="task-title">${task.title}</h3>
                <span class="task-due-date">Due: ${formatDate(task.dueDate)}</span>
            </div>
            <p>${task.description}</p>
            <div class="task-footer">
                <span class="task-status status-${task.status.toLowerCase()}">${task.status}</span>
                <span class="task-assigned">Assigned to: ${task.assignedTo}</span>
            </div>
        </div>
    `).join('');
}

// Load and display employee performance
async function loadPerformanceData() {
    try {
        const period = performancePeriod.value;
        const employeesRef = ref(db, 'employees');
        const employeesSnapshot = await get(employeesRef);
        
        if (!employeesSnapshot.exists()) {
            performanceList.innerHTML = '<div class="no-data">No employee data available</div>';
            return;
        }

        const performanceData = [];
        const tasksRef = ref(db, 'tasks');
        const tasksSnapshot = await get(tasksRef);
        const tasks = tasksSnapshot.val() || {};

        employeesSnapshot.forEach((childSnapshot) => {
            const employee = childSnapshot.val();
            const employeeTasks = Object.values(tasks).filter(task => task.assignedTo === childSnapshot.key);
            
            const completedTasks = employeeTasks.filter(task => task.status === 'completed');
            const onTimeTasks = completedTasks.filter(task => 
                new Date(task.completedAt) <= new Date(task.dueDate)
            );

            const performance = {
                employeeId: childSnapshot.key,
                name: employee.name,
                totalTasks: employeeTasks.length,
                completedTasks: completedTasks.length,
                onTimeTasks: onTimeTasks.length,
                completionRate: employeeTasks.length ? (completedTasks.length / employeeTasks.length) * 100 : 0,
                onTimeRate: completedTasks.length ? (onTimeTasks.length / completedTasks.length) * 100 : 0
            };

            performanceData.push(performance);
        });

        // Sort by completion rate
        performanceData.sort((a, b) => b.completionRate - a.completionRate);
        displayPerformanceData(performanceData);
    } catch (error) {
        console.error('Error loading performance data:', error);
        performanceList.innerHTML = '<div class="error-message">Error loading performance data</div>';
    }
}

// Display performance data in the UI
function displayPerformanceData(performanceData) {
    if (!performanceList) return;
    
    if (performanceData.length === 0) {
        performanceList.innerHTML = '<div class="no-data">No performance data available</div>';
        return;
    }

    performanceList.innerHTML = performanceData.map(employee => `
        <div class="performance-card">
            <div class="performance-header">
                <h3>${employee.name}</h3>
                <span class="completion-rate">${employee.completionRate.toFixed(1)}% Completion</span>
            </div>
            <div class="performance-metrics">
                <div class="metric">
                    <div class="metric-value">${employee.totalTasks}</div>
                    <div class="metric-label">Total Tasks</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${employee.completedTasks}</div>
                    <div class="metric-label">Completed</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${employee.onTimeRate.toFixed(1)}%</div>
                    <div class="metric-label">On Time</div>
                </div>
            </div>
            <div class="performance-bar">
                <div class="bar-fill" style="width: ${employee.completionRate}%"></div>
            </div>
        </div>
    `).join('');
}

// Load and display activities
async function loadActivities() {
    try {
        const activitiesRef = ref(db, 'activities');
        const activitiesQuery = query(activitiesRef, orderByChild('timestamp'), limitToLast(10));
        
        onValue(activitiesQuery, (snapshot) => {
            if (!snapshot.exists()) {
                activitiesList.innerHTML = '<div class="no-data">No recent activities</div>';
                return;
            }

            const activities = [];
            snapshot.forEach((childSnapshot) => {
                activities.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });

            // Sort by timestamp (newest first)
            activities.sort((a, b) => b.timestamp - a.timestamp);

            if (activitiesList) {
                activitiesList.innerHTML = activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <i class="fas ${getActivityIcon(activity.type)}"></i>
                        </div>
                        <div class="activity-content">
                            <h4>${getActivityTitle(activity.type)}</h4>
                            <p>${activity.description}</p>
                            <span class="activity-time">${formatTime(activity.timestamp)}</span>
                        </div>
                    </div>
                `).join('');
            }
        });
    } catch (error) {
        console.error('Error loading activities:', error);
        activitiesList.innerHTML = '<div class="error-message">Error loading activities</div>';
    }
}

// Get activity title based on type
function getActivityTitle(type) {
    const titles = {
        'employee_added': 'New Employee Added',
        'task_created': 'Task Created',
        'task_completed': 'Task Completed',
        'task_updated': 'Task Updated',
        'notification_sent': 'Notification Sent',
        'default': 'Activity'
    };
    return titles[type] || titles.default;
}

// Load and display conversations
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

            if (conversationList) {
                conversationList.innerHTML = conversations.map(conversation => `
                    <div class="conversation-item" data-conversation-id="${conversation.id}">
                        <div class="conversation-header">
                            <h4>${conversation.participantName}</h4>
                            <span class="last-message-time">${formatTime(conversation.lastMessage.timestamp)}</span>
                        </div>
                        <p class="last-message">${conversation.lastMessage.text}</p>
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
        const messagesRef = ref(db, `conversations/${conversationId}/messages`);
        const messagesQuery = query(messagesRef, orderByChild('timestamp'));
        
        onValue(messagesQuery, (snapshot) => {
            const messages = [];
            snapshot.forEach((childSnapshot) => {
                messages.push(childSnapshot.val());
            });

            if (messageThread) {
                messageThread.innerHTML = messages.map(message => `
                    <div class="message ${message.senderId === auth.currentUser.uid ? 'sent' : 'received'}">
                        <p>${message.text}</p>
                        <span class="message-time">${formatTime(message.timestamp)}</span>
                    </div>
                `).join('');

                // Scroll to bottom
                messageThread.scrollTop = messageThread.scrollHeight;
            }
        });
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Send a new message
async function sendMessage(conversationId, text) {
    if (!text.trim()) return;

    try {
        const message = {
            text,
            senderId: auth.currentUser.uid,
            timestamp: serverTimestamp()
        };

        const messagesRef = ref(db, `conversations/${conversationId}/messages`);
        await push(messagesRef, message);

        // Update last message in conversation
        const conversationRef = ref(db, `conversations/${conversationId}`);
        await update(conversationRef, {
            lastMessage: message
        });

        if (messageInput) {
            messageInput.value = '';
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// Helper functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
}

function getActivityIcon(type) {
    const icons = {
        'employee_added': 'fa-user-plus',
        'task_created': 'fa-tasks',
        'notification_sent': 'fa-bell',
        'default': 'fa-info-circle'
    };
    return icons[type] || icons.default;
}

// Event Listeners
if (taskPriorityFilter) {
    taskPriorityFilter.addEventListener('change', loadTasks);
}

if (taskStatusFilter) {
    taskStatusFilter.addEventListener('change', loadTasks);
}

if (performancePeriod) {
    performancePeriod.addEventListener('change', loadPerformanceData);
}

if (messagesLink) {
    messagesLink.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('messagingModal');
    });
}

if (sendMessageBtn) {
    sendMessageBtn.addEventListener('click', () => {
        const activeConversation = document.querySelector('.conversation-item.active');
        if (activeConversation && messageInput) {
            sendMessage(activeConversation.dataset.conversationId, messageInput.value);
        }
    });
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add form submit event listeners
    const addEmployeeForm = document.getElementById('addEmployeeForm');
    if (addEmployeeForm) {
        addEmployeeForm.addEventListener('submit', addEmployee);
    }

    const createTaskForm = document.getElementById('createTaskForm');
    if (createTaskForm) {
        createTaskForm.addEventListener('submit', createTask);
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
});

// Add Employee
window.addEmployee = async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('employeeName').value;
    const email = document.getElementById('employeeEmail').value;
    const role = document.getElementById('employeeRole').value;
    const phone = document.getElementById('employeePhone').value;

    try {
        // Create auth account
        const userCredential = await createUserWithEmailAndPassword(auth, email, "TempPass123!");
        const uid = userCredential.user.uid;

        // Add to employees collection
        const employeeRef = ref(db, `employees/${uid}`);
        await set(employeeRef, {
            name,
            email,
            role,
            phone,
            status: 'active',
            createdAt: serverTimestamp(),
            createdBy: auth.currentUser.uid
        });

        // Log activity
        await logActivity('employee_added', `New employee added: ${name}`);

        // Close modal and reset form
        closeModal('addEmployeeModal');
        document.getElementById('addEmployeeForm').reset();
        alert('Employee added successfully!');
    } catch (error) {
        console.error('Error adding employee:', error);
        alert(`Error adding employee: ${error.message}`);
    }
};

// Create Task
window.createTask = async function(e) {
    e.preventDefault();
    
    const taskTitle = document.getElementById('taskTitle').value;
    const taskDescription = document.getElementById('taskDescription').value;
    const assignedTo = document.getElementById('assignedTo').value;
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('dueDate').value;

    try {
        const taskRef = ref(db, 'tasks');
        await push(taskRef, {
            title: taskTitle,
            description: taskDescription,
            assignedTo: assignedTo,
            priority: priority,
            dueDate: dueDate,
            status: 'pending',
            createdAt: serverTimestamp(),
            createdBy: auth.currentUser.uid
        });

        await logActivity('task_created', `New task created: ${taskTitle}`);
        closeModal('createTaskModal');
        document.getElementById('createTaskForm').reset();
        alert('Task created successfully!');
    } catch (error) {
        console.error('Error creating task:', error);
        alert('Error creating task. Please try again.');
    }
};

// Logout function
window.logout = async function() {
    try {
        await signOut(auth);
        localStorage.removeItem('adminData');
        localStorage.removeItem('authToken');
        window.location.href = './login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
};

// Log Activity
async function logActivity(type, description) {
    try {
        const activityRef = ref(db, 'activities');
        await push(activityRef, {
            type: type,
            description: description,
            timestamp: serverTimestamp(),
            userId: auth.currentUser.uid
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Modal Functions
window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        if (modalId === 'createTaskModal') {
            loadEmployeesForTaskAssignment();
        }
    }
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
};

// Load employees for task assignment dropdown
async function loadEmployeesForTaskAssignment() {
    const assignedToSelect = document.getElementById('assignedTo');
    if (!assignedToSelect) return;

    try {
        const employeesRef = ref(db, 'employees');
        const snapshot = await get(employeesRef);
        
        // Clear existing options
        assignedToSelect.innerHTML = '<option value="">Select Employee</option>';
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const employee = childSnapshot.val();
                const option = document.createElement('option');
                option.value = employee.email;
                option.textContent = `${employee.name} (${employee.role})`;
                assignedToSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading employees:', error);
        alert('Error loading employees. Please try again.');
    }
}

// Message Notification
function showMessageNotification(employeeName, message, employeeId) {
    // Remove existing notification if any
    if (currentNotification) {
        currentNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'message-notification fade-in';
    notification.innerHTML = `
        <img src="../../assets/employee-avatar.png" alt="${employeeName}" class="notification-avatar">
        <div class="notification-content">
            <h4>New Message from ${employeeName}</h4>
            <p>${message}</p>
        </div>
    `;

    // Add click handler
    notification.addEventListener('click', () => {
        openMessagingModal(employeeId);
        notification.remove();
        currentNotification = null;
    });

    // Add to document
    document.body.appendChild(notification);
    currentNotification = notification;

    // Auto remove after 10 seconds
    setTimeout(() => {
        if (currentNotification === notification) {
            notification.remove();
            currentNotification = null;
        }
    }, 10000);
}

// Enhanced Messaging Modal
function openMessagingModal(selectedEmployeeId = null) {
    const modal = document.getElementById('messagingModal');
    modal.style.display = 'block';

    // Load employees for selection
    loadEmployeesForMessaging();

    // If an employee is selected, open their conversation
    if (selectedEmployeeId) {
        const employeeOption = document.querySelector(`.employee-option[data-employee-id="${selectedEmployeeId}"]`);
        if (employeeOption) {
            employeeOption.click();
        }
    }
}

// Load employees for messaging
async function loadEmployeesForMessaging() {
    const employeeSelector = document.querySelector('.employee-selector');
    if (!employeeSelector) return;

    try {
        const employeesRef = ref(db, 'employees');
        const snapshot = await get(employeesRef);
        
        const employeeGrid = document.createElement('div');
        employeeGrid.className = 'employee-grid';
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const employee = childSnapshot.val();
                const option = document.createElement('div');
                option.className = 'employee-option';
                option.dataset.employeeId = childSnapshot.key;
                option.innerHTML = `
                    <img src="../../assets/employee-avatar.png" alt="${employee.name}" class="notification-avatar">
                    <span>${employee.name}</span>
                `;
                
                option.addEventListener('click', () => {
                    document.querySelectorAll('.employee-option').forEach(opt => 
                        opt.classList.remove('selected')
                    );
                    option.classList.add('selected');
                    loadMessages(childSnapshot.key);
                });
                
                employeeGrid.appendChild(option);
            });
        }
        
        employeeSelector.innerHTML = '<h3>Select Employee to Message</h3>';
        employeeSelector.appendChild(employeeGrid);
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

// Listen for new messages
function setupMessageListener() {
    const messagesRef = ref(db, 'messages');
    onChildAdded(messagesRef, (snapshot) => {
        const message = snapshot.val();
        if (message.senderId !== auth.currentUser.uid) {
            // Get employee name
            const employeeRef = ref(db, `employees/${snapshot.key}`);
            get(employeeRef).then((employeeSnapshot) => {
                if (employeeSnapshot.exists()) {
                    const employee = employeeSnapshot.val();
                    showMessageNotification(employee.name, message.text, snapshot.key);
                }
            });
        }
    });
}

// Initialize messaging
function initializeMessaging() {
    setupMessageListener();
    
    // Add event listeners for messaging
    messagesLink.addEventListener('click', (e) => {
        e.preventDefault();
        openMessagingModal();
    });

    sendMessageBtn.addEventListener('click', () => {
        const selectedEmployee = document.querySelector('.employee-option.selected');
        if (selectedEmployee) {
            sendMessage(selectedEmployee.dataset.employeeId, messageInput.value);
        }
    });
}

// Task Management Functions
window.openCreateTaskModal = function() {
    document.getElementById('createTaskModal').style.display = 'block';
    loadEmployeesForTaskAssignment();
};

// Security Functions
async function loadSecurityOverview() {
    try {
        const userRef = ref(db, `admins/${auth.currentUser.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            
            // Update 2FA status
            document.getElementById('twoFactorStatus').textContent = 
                userData.twoFactorEnabled ? 'Enabled' : 'Disabled';
            
            // Update last login
            if (userData.lastLogin) {
                document.getElementById('lastLogin').textContent = 
                    formatDate(userData.lastLogin);
            }
            
            // Load security events
            loadSecurityEvents();
        }
    } catch (error) {
        console.error('Error loading security overview:', error);
    }
}

async function loadSecurityEvents() {
    try {
        const eventsRef = ref(db, 'securityEvents');
        const eventsQuery = query(eventsRef, orderByChild('timestamp'), limitToLast(5));
        
        onValue(eventsQuery, (snapshot) => {
            const eventsList = document.getElementById('securityEventsList');
            if (!eventsList) return;
            
            const events = [];
            snapshot.forEach((childSnapshot) => {
                events.push(childSnapshot.val());
            });
            
            // Update security alerts count
            const alertCount = events.filter(event => event.type === 'alert').length;
            document.getElementById('securityAlerts').textContent = alertCount;
            
            // Display events
            eventsList.innerHTML = events.map(event => `
                <div class="event-item ${event.type}">
                    <i class="fas ${getEventIcon(event.type)}"></i>
                    <div class="event-details">
                        <p>${event.description}</p>
                        <small>${formatDate(event.timestamp)}</small>
                    </div>
                </div>
            `).join('');
        });
    } catch (error) {
        console.error('Error loading security events:', error);
    }
}

function getEventIcon(eventType) {
    switch (eventType) {
        case 'alert':
            return 'fa-exclamation-triangle';
        case 'login':
            return 'fa-sign-in-alt';
        case 'logout':
            return 'fa-sign-out-alt';
        case 'password_change':
            return 'fa-key';
        default:
            return 'fa-info-circle';
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Load initial data
    loadTasks();
    loadSecurityOverview();
    
    // Add event listeners for task filters
    const taskPriorityFilter = document.getElementById('taskPriorityFilter');
    const taskStatusFilter = document.getElementById('taskStatusFilter');
    
    if (taskPriorityFilter) {
        taskPriorityFilter.addEventListener('change', loadTasks);
    }
    if (taskStatusFilter) {
        taskStatusFilter.addEventListener('change', loadTasks);
    }
    
    // Add form submit event listener for task creation
    const createTaskForm = document.getElementById('createTaskForm');
    if (createTaskForm) {
        createTaskForm.addEventListener('submit', createTask);
    }
});
  