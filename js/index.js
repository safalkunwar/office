import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, get, onValue, push, set, remove, update, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { firebaseConfig } from './config.js';
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/+esm';

// Initialize Firebase
let app, db, auth;
try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  auth = getAuth(app);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  showError('Failed to initialize the application. Please try again later.');
}

// DOM Elements
const stats = {
  totalStudents: document.getElementById("totalStudents"),
  ieltsStudents: document.getElementById("ieltsStudents"),
  pteStudents: document.getElementById("pteStudents"),
  activeApplications: document.getElementById("activeApplications"),
  twoFactorStatus: document.getElementById("twoFactorStatus"),
  lastLogin: document.getElementById("lastLogin"),
  securityAlerts: document.getElementById("securityAlerts")
};

// Chart instances
let ieltsChart, pteChart, overallChart, statusChart, universityChart, visaChart;

// Theme Management
const themeToggle = document.querySelector('.theme-toggle');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navMenu = document.querySelector('.navbar-right ul');

// Initialize theme
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeIcon();
    }
}

// Update theme icon
function updateThemeIcon() {
    const icon = themeToggle.querySelector('i');
    if (document.body.classList.contains('dark-mode')) {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

// Toggle theme
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
    updateChartsForTheme();
}

// Update charts for current theme
function updateChartsForTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#ecf0f1' : '#2c3e50';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    // Update existing charts
    Chart.instances.forEach(chart => {
        if (chart.options.scales) {
            if (chart.options.scales.x) {
                chart.options.scales.x.grid.color = gridColor;
                chart.options.scales.x.ticks.color = textColor;
            }
            if (chart.options.scales.y) {
                chart.options.scales.y.grid.color = gridColor;
                chart.options.scales.y.ticks.color = textColor;
            }
        }
        if (chart.options.plugins) {
            if (chart.options.plugins.legend) {
                chart.options.plugins.legend.labels.color = textColor;
            }
            if (chart.options.plugins.title) {
                chart.options.plugins.title.color = textColor;
            }
        }
        chart.update();
    });
}

// Mobile menu functionality
function toggleMobileMenu() {
    navMenu.classList.toggle('active');
    const isExpanded = navMenu.classList.contains('active');
    mobileMenuBtn.setAttribute('aria-expanded', isExpanded);
}

// Close mobile menu when clicking outside
function handleClickOutside(e) {
    if (!navMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        navMenu.classList.remove('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
    }
}

// Loading state management
function showLoading(element) {
    if (element) {
        element.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        element.setAttribute('aria-busy', 'true');
    }
}

function hideLoading(element) {
    if (element) {
        element.setAttribute('aria-busy', 'false');
    }
}

// Error and success handling
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message visible';
    errorDiv.setAttribute('role', 'alert');
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    const content = document.querySelector('.content');
    if (content) {
        content.prepend(errorDiv);
        setTimeout(() => {
            errorDiv.classList.remove('visible');
            setTimeout(() => errorDiv.remove(), 300);
        }, 5000);
    }
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message visible';
    successDiv.setAttribute('role', 'alert');
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    const content = document.querySelector('.content');
    if (content) {
        content.prepend(successDiv);
        setTimeout(() => {
            successDiv.classList.remove('visible');
            setTimeout(() => successDiv.remove(), 300);
        }, 3000);
    }
}

// Fetch and Display Data from Firebase
async function fetchStats() {
    try {
        // Show loading for all stats
        Object.values(stats).forEach(stat => showLoading(stat));
        
        // Fetch students data
        const studentsRef = ref(db, 'students');
        const studentsSnapshot = await get(studentsRef);
        let totalStudents = 0, ieltsStudents = 0, pteStudents = 0;
        
        if (studentsSnapshot.exists()) {
            const students = studentsSnapshot.val();
            totalStudents = Object.keys(students).length;
            
            // Count by course type
            Object.values(students).forEach(student => {
                if (student.course && student.course.toLowerCase().includes('ielts')) {
                    ieltsStudents++;
                } else if (student.course && student.course.toLowerCase().includes('pte')) {
                    pteStudents++;
                }
            });
        }
        
        // Fetch applications data
        const applicationsRef = ref(db, 'applications');
        const applicationsSnapshot = await get(applicationsRef);
        let activeApplications = 0;
        
        if (applicationsSnapshot.exists()) {
            const applications = applicationsSnapshot.val();
            activeApplications = Object.values(applications).filter(app => 
                ['pending', 'submitted', 'under review'].includes(app.status)
            ).length;
        }
        
        // Update stats
        if (stats.totalStudents) stats.totalStudents.textContent = totalStudents;
        if (stats.ieltsStudents) stats.ieltsStudents.textContent = ieltsStudents;
        if (stats.pteStudents) stats.pteStudents.textContent = pteStudents;
        if (stats.activeApplications) stats.activeApplications.textContent = activeApplications;
        
    } catch (error) {
        showError('Failed to load statistics. Please try again later.');
        console.error('Error fetching stats:', error);
    } finally {
        // Hide loading for all stats
        Object.values(stats).forEach(stat => hideLoading(stat));
    }
}

// Fetch Security Data from Firebase
async function fetchSecurityData() {
    try {
        const securityRef = ref(db, 'security');
        const snapshot = await get(securityRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (stats.twoFactorStatus) {
                stats.twoFactorStatus.textContent = data.twoFactorEnabled ? 'Enabled' : 'Disabled';
                const badge = stats.twoFactorStatus.parentElement.querySelector('.stat-badge');
                if (badge) {
                    badge.textContent = data.twoFactorEnabled ? 'Active' : 'Setup Required';
                    badge.className = `stat-badge ${data.twoFactorEnabled ? 'success' : 'warning'}`;
                }
            }
            if (stats.lastLogin) {
                stats.lastLogin.textContent = data.lastLogin ? new Date(data.lastLogin).toLocaleString() : 'Never';
            }
            if (stats.securityAlerts) {
                stats.securityAlerts.textContent = data.alerts || 0;
                const badge = stats.securityAlerts.parentElement.querySelector('.stat-badge');
                if (badge) {
                    badge.textContent = (data.alerts || 0) === 0 ? 'All Clear' : 'Attention Required';
                    badge.className = `stat-badge ${(data.alerts || 0) === 0 ? 'success' : 'warning'}`;
                }
            }
        } else {
            // Set default values if no security data exists
            if (stats.twoFactorStatus) stats.twoFactorStatus.textContent = 'Disabled';
            if (stats.lastLogin) stats.lastLogin.textContent = 'Never';
            if (stats.securityAlerts) stats.securityAlerts.textContent = '0';
        }
    } catch (error) {
        showError('Failed to load security data. Please try again later.');
        console.error('Error fetching security data:', error);
    }
}

// Load tasks for dashboard
async function loadTasks() {
    try {
        const tasksRef = ref(db, 'tasks');
        const snapshot = await get(tasksRef);
        const tasksList = document.getElementById('tasksList');
        
        if (!tasksList) return;
        
        if (snapshot.exists()) {
            const tasks = Object.entries(snapshot.val())
                .map(([id, task]) => ({ id, ...task }))
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                .slice(0, 5); // Show only 5 tasks
            
            tasksList.innerHTML = tasks.map(task => `
                <div class="task-item ${task.status}">
                    <div class="task-checkbox">
                        <input type="checkbox" ${task.status === 'completed' ? 'checked' : ''} 
                               onchange="toggleTaskStatus('${task.id}', this.checked)">
                    </div>
                    <div class="task-content">
                        <h4>${task.title}</h4>
                        <p>${task.description}</p>
                        <div class="task-meta">
                            <span class="priority ${task.priority.toLowerCase()}">${task.priority}</span>
                            <span class="due-date">${new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            tasksList.innerHTML = '<div class="no-tasks">No tasks found</div>';
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        const tasksList = document.getElementById('tasksList');
        if (tasksList) {
            tasksList.innerHTML = '<div class="no-tasks">Failed to load tasks</div>';
        }
    }
}

// Toggle task status
async function toggleTaskStatus(taskId, completed) {
    try {
        const taskRef = ref(db, `tasks/${taskId}`);
        await update(taskRef, {
            status: completed ? 'completed' : 'pending',
            updatedAt: new Date().toISOString()
        });
        showSuccess(`Task ${completed ? 'completed' : 'reopened'} successfully!`);
    } catch (error) {
        showError('Failed to update task status. Please try again.');
        console.error('Error updating task:', error);
    }
}

// Filter applications
function filterApplications() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (startDate && endDate) {
        updateAnalyticsCharts(startDate, endDate);
        showSuccess('Applications filtered successfully!');
    } else {
        showError('Please select both start and end dates.');
    }
}

// Update analytics charts with date filter
function updateAnalyticsCharts(startDate, endDate) {
    // This would update the analytics charts based on the date range
    console.log('Filtering analytics from', startDate, 'to', endDate);
    // Re-fetch data and update charts
    fetchChartData(startDate, endDate);
}

// Initialize Progress Charts with real data
async function initializeProgressCharts() {
    try {
        // Fetch exam data for charts
        const examsRef = ref(db, 'exams');
        const snapshot = await get(examsRef);
        
        let ieltsData = { reading: [], writing: [], listening: [], speaking: [] };
        let pteData = { speaking: [], writing: [], reading: [], listening: [] };
        
        if (snapshot.exists()) {
            const exams = snapshot.val();
            Object.values(exams).forEach(exam => {
                if (exam.type === 'IELTS' && exam.scores) {
                    if (exam.scores.reading) ieltsData.reading.push(exam.scores.reading);
                    if (exam.scores.writing) ieltsData.writing.push(exam.scores.writing);
                    if (exam.scores.listening) ieltsData.listening.push(exam.scores.listening);
                    if (exam.scores.speaking) ieltsData.speaking.push(exam.scores.speaking);
                } else if (exam.type === 'PTE' && exam.scores) {
                    if (exam.scores.speaking) pteData.speaking.push(exam.scores.speaking);
                    if (exam.scores.writing) pteData.writing.push(exam.scores.writing);
                    if (exam.scores.reading) pteData.reading.push(exam.scores.reading);
                    if (exam.scores.listening) pteData.listening.push(exam.scores.listening);
                }
            });
        }
        
        // IELTS Progress Chart
        const ieltsCtx = document.getElementById('ieltsProgressChart');
        if (ieltsCtx) {
            ieltsChart = new Chart(ieltsCtx, {
                type: 'line',
                data: {
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
                    datasets: [{
                        label: 'Reading',
                        data: ieltsData.reading.length > 0 ? ieltsData.reading.slice(-6) : [6.5, 7.0, 7.5, 7.0, 7.5, 8.0],
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        tension: 0.4
                    }, {
                        label: 'Writing',
                        data: ieltsData.writing.length > 0 ? ieltsData.writing.slice(-6) : [6.0, 6.5, 7.0, 6.5, 7.0, 7.5],
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        tension: 0.4
                    }, {
                        label: 'Listening',
                        data: ieltsData.listening.length > 0 ? ieltsData.listening.slice(-6) : [7.0, 7.5, 8.0, 7.5, 8.0, 8.5],
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        tension: 0.4
                    }, {
                        label: 'Speaking',
                        data: ieltsData.speaking.length > 0 ? ieltsData.speaking.slice(-6) : [6.5, 7.0, 7.5, 7.0, 7.5, 8.0],
                        borderColor: '#f39c12',
                        backgroundColor: 'rgba(243, 156, 18, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        title: {
                            display: true,
                            text: 'IELTS Progress Over Time'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            min: 5,
                            max: 9,
                            ticks: {
                                stepSize: 0.5
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        }

        // PTE Progress Chart
        const pteCtx = document.getElementById('pteProgressChart');
        if (pteCtx) {
            pteChart = new Chart(pteCtx, {
                type: 'line',
                data: {
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
                    datasets: [{
                        label: 'Speaking',
                        data: pteData.speaking.length > 0 ? pteData.speaking.slice(-6) : [65, 70, 75, 72, 78, 82],
                        borderColor: '#9b59b6',
                        backgroundColor: 'rgba(155, 89, 182, 0.1)',
                        tension: 0.4
                    }, {
                        label: 'Writing',
                        data: pteData.writing.length > 0 ? pteData.writing.slice(-6) : [60, 65, 70, 68, 72, 75],
                        borderColor: '#e67e22',
                        backgroundColor: 'rgba(230, 126, 34, 0.1)',
                        tension: 0.4
                    }, {
                        label: 'Reading',
                        data: pteData.reading.length > 0 ? pteData.reading.slice(-6) : [70, 75, 80, 78, 82, 85],
                        borderColor: '#1abc9c',
                        backgroundColor: 'rgba(26, 188, 156, 0.1)',
                        tension: 0.4
                    }, {
                        label: 'Listening',
                        data: pteData.listening.length > 0 ? pteData.listening.slice(-6) : [68, 72, 76, 74, 78, 81],
                        borderColor: '#34495e',
                        backgroundColor: 'rgba(52, 73, 94, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        title: {
                            display: true,
                            text: 'PTE Progress Over Time'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            min: 50,
                            max: 90,
                            ticks: {
                                stepSize: 5
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        }

    } catch (error) {
        console.error('Error initializing progress charts:', error);
    }
}

// Initialize Analytics Charts with real data
async function initializeAnalyticsCharts() {
    try {
        // Fetch applications data
        const applicationsRef = ref(db, 'applications');
        const snapshot = await get(applicationsRef);
        
        let statusData = { submitted: 0, 'under review': 0, approved: 0, rejected: 0, 'pending documents': 0 };
        let universityData = {};
        
        if (snapshot.exists()) {
            const applications = snapshot.val();
            Object.values(applications).forEach(app => {
                // Count by status
                if (app.status) {
                    statusData[app.status] = (statusData[app.status] || 0) + 1;
                }
                
                // Count by university
                if (app.university) {
                    universityData[app.university] = (universityData[app.university] || 0) + 1;
                }
            });
        }
        
        // Application Status Distribution
        const statusCtx = document.getElementById('applicationStatusChart');
        if (statusCtx) {
            statusChart = new Chart(statusCtx, {
                type: 'pie',
                data: {
                    labels: Object.keys(statusData),
                    datasets: [{
                        data: Object.values(statusData),
                        backgroundColor: [
                            '#3498db',
                            '#f39c12',
                            '#27ae60',
                            '#e74c3c',
                            '#95a5a6'
                        ],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        title: {
                            display: true,
                            text: 'Application Status Distribution'
                        }
                    }
                }
            });
        }

        // University Applications
        const universityCtx = document.getElementById('universityApplicationsChart');
        if (universityCtx) {
            const topUniversities = Object.entries(universityData)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5);
            
            universityChart = new Chart(universityCtx, {
                type: 'bar',
                data: {
                    labels: topUniversities.map(([uni]) => uni),
                    datasets: [{
                        label: 'Applications',
                        data: topUniversities.map(([,count]) => count),
                        backgroundColor: [
                            'rgba(52, 152, 219, 0.8)',
                            'rgba(155, 89, 182, 0.8)',
                            'rgba(26, 188, 156, 0.8)',
                            'rgba(230, 126, 34, 0.8)',
                            'rgba(231, 76, 60, 0.8)'
                        ],
                        borderColor: [
                            '#3498db',
                            '#9b59b6',
                            '#1abc9c',
                            '#e67e22',
                            '#e74c3c'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'University Applications'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        }

        // Overall Performance Chart
        const overallCtx = document.getElementById('overallPerformanceChart');
        if (overallCtx) {
            // Fetch students data for overall performance
            const studentsRef = ref(db, 'students');
            const studentsSnapshot = await get(studentsRef);
            
            let ieltsCount = 0, pteCount = 0, completedCount = 0, inProgressCount = 0;
            
            if (studentsSnapshot.exists()) {
                const students = studentsSnapshot.val();
                Object.values(students).forEach(student => {
                    if (student.course && student.course.toLowerCase().includes('ielts')) {
                        ieltsCount++;
                    } else if (student.course && student.course.toLowerCase().includes('pte')) {
                        pteCount++;
                    }
                    
                    if (student.status === 'completed') {
                        completedCount++;
                    } else {
                        inProgressCount++;
                    }
                });
            }
            
            overallChart = new Chart(overallCtx, {
                type: 'doughnut',
                data: {
                    labels: ['IELTS Students', 'PTE Students', 'Completed', 'In Progress'],
                    datasets: [{
                        data: [ieltsCount, pteCount, completedCount, inProgressCount],
                        backgroundColor: [
                            '#3498db',
                            '#9b59b6',
                            '#27ae60',
                            '#f39c12'
                        ],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        title: {
                            display: true,
                            text: 'Overall Student Distribution'
                        }
                    }
                }
            });
        }

        // Visa Success Rate
        const visaCtx = document.getElementById('visaSuccessChart');
        if (visaCtx) {
            // Fetch visa data
            const visasRef = ref(db, 'visas');
            const visaSnapshot = await get(visasRef);
            
            let approvedCount = 0, pendingCount = 0, rejectedCount = 0;
            
            if (visaSnapshot.exists()) {
                const visas = visaSnapshot.val();
                Object.values(visas).forEach(visa => {
                    if (visa.status === 'approved') approvedCount++;
                    else if (visa.status === 'pending') pendingCount++;
                    else if (visa.status === 'rejected') rejectedCount++;
                });
            }
            
            visaChart = new Chart(visaCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Approved', 'Pending', 'Rejected'],
                    datasets: [{
                        data: [approvedCount, pendingCount, rejectedCount],
                        backgroundColor: [
                            '#27ae60',
                            '#f39c12',
                            '#e74c3c'
                        ],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        title: {
                            display: true,
                            text: 'Visa Success Rate'
                        }
                    }
                }
            });
        }

    } catch (error) {
        console.error('Error initializing analytics charts:', error);
    }
}

// Fetch chart data with date filter
async function fetchChartData(startDate, endDate) {
    try {
        // Re-fetch data and update charts based on date range
        await initializeAnalyticsCharts();
        showSuccess('Charts updated with filtered data!');
    } catch (error) {
        showError('Failed to update charts. Please try again.');
        console.error('Error updating charts:', error);
    }
}

// Setup real-time updates
function setupRealTimeUpdates() {
    // Listen for real-time updates from Firebase
    const metricsRef = ref(db, 'metrics');
    onValue(metricsRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            updateDashboardMetrics(data);
        }
    });

    // Listen for security updates
    const securityRef = ref(db, 'security');
    onValue(securityRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            updateSecurityMetrics(data);
        }
    });
}

// Update dashboard metrics
function updateDashboardMetrics(data) {
    if (stats.totalStudents) stats.totalStudents.textContent = data.totalStudents || 0;
    if (stats.ieltsStudents) stats.ieltsStudents.textContent = data.ieltsStudents || 0;
    if (stats.pteStudents) stats.pteStudents.textContent = data.pteStudents || 0;
    if (stats.activeApplications) stats.activeApplications.textContent = data.activeApplications || 0;
}

// Update security metrics
function updateSecurityMetrics(data) {
    if (stats.twoFactorStatus) {
        stats.twoFactorStatus.textContent = data.twoFactorEnabled ? 'Enabled' : 'Disabled';
        const badge = stats.twoFactorStatus.parentElement.querySelector('.stat-badge');
        if (badge) {
            badge.textContent = data.twoFactorEnabled ? 'Active' : 'Setup Required';
            badge.className = `stat-badge ${data.twoFactorEnabled ? 'success' : 'warning'}`;
        }
    }
    if (stats.lastLogin) {
        stats.lastLogin.textContent = data.lastLogin ? new Date(data.lastLogin).toLocaleString() : 'Never';
    }
    if (stats.securityAlerts) {
        stats.securityAlerts.textContent = data.alerts || 0;
        const badge = stats.securityAlerts.parentElement.querySelector('.stat-badge');
        if (badge) {
            badge.textContent = (data.alerts || 0) === 0 ? 'All Clear' : 'Attention Required';
            badge.className = `stat-badge ${(data.alerts || 0) === 0 ? 'success' : 'warning'}`;
        }
    }
}

// Initialize the application
async function initApp() {
    try {
        // Initialize theme
        initializeTheme();
        
        // Add event listeners
        themeToggle.addEventListener('click', toggleTheme);
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
        document.addEventListener('click', handleClickOutside);
        
        // Load data
        await fetchStats();
        await fetchSecurityData();
        await loadTasks();
        
        // Initialize charts
        await initializeProgressCharts();
        await initializeAnalyticsCharts();
        
        // Set up real-time updates
        setupRealTimeUpdates();
        
        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showError('Failed to initialize dashboard. Please refresh the page.');
    }
}

// Create sample data for testing
async function createSampleData() {
    try {
        // Sample universities
        const universitiesData = [
            {
                name: "University of Toronto",
                country: "Canada",
                city: "Toronto",
                type: "Public",
                ranking: 25,
                website: "https://www.utoronto.ca",
                description: "One of Canada's top universities, known for research excellence and diverse programs",
                status: "active",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                name: "McGill University",
                country: "Canada",
                city: "Montreal",
                type: "Public",
                ranking: 31,
                website: "https://www.mcgill.ca",
                description: "Renowned for medical research and international student programs",
                status: "active",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                name: "University of British Columbia",
                country: "Canada",
                city: "Vancouver",
                type: "Public",
                ranking: 47,
                website: "https://www.ubc.ca",
                description: "Leading research university with beautiful campus and strong international focus",
                status: "active",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                name: "University of Alberta",
                country: "Canada",
                city: "Edmonton",
                type: "Public",
                ranking: 111,
                website: "https://www.ualberta.ca",
                description: "Comprehensive research university with strong engineering and business programs",
                status: "active",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                name: "University of Waterloo",
                country: "Canada",
                city: "Waterloo",
                type: "Public",
                ranking: 154,
                website: "https://uwaterloo.ca",
                description: "Known for co-op programs and strong computer science and engineering",
                status: "active",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        // Sample students
        const studentsData = [
            {
                name: "John Smith",
                email: "john.smith@email.com",
                phone: "+1234567890",
                course: "IELTS",
                startDate: "2024-01-15",
                status: "active",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                name: "Sarah Johnson",
                email: "sarah.johnson@email.com",
                phone: "+1234567891",
                course: "PTE",
                startDate: "2024-02-01",
                status: "active",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                name: "Michael Brown",
                email: "michael.brown@email.com",
                phone: "+1234567892",
                course: "IELTS",
                startDate: "2024-01-20",
                status: "active",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        // Sample applications (updated to use university IDs)
        const applicationsData = [
            {
                studentId: "student1",
                studentName: "John Smith (IELTS)",
                universityId: "university1",
                universityName: "University of Toronto (Toronto, Canada)",
                program: "Master's Degree",
                intake: "Fall 2024",
                notes: "Strong candidate with excellent academic background",
                status: "pending",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                studentId: "student2",
                studentName: "Sarah Johnson (PTE)",
                universityId: "university2",
                universityName: "McGill University (Montreal, Canada)",
                program: "Bachelor's Degree",
                intake: "Spring 2025",
                notes: "PTE score: 75, good communication skills",
                status: "under review",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        // Sample exams
        const examsData = [
            {
                name: "IELTS Practice Test 1",
                type: "IELTS",
                date: "2024-03-15T09:00",
                duration: 180,
                description: "Full IELTS practice test covering all four skills",
                status: "upcoming",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                name: "PTE Academic Test",
                type: "PTE",
                date: "2024-03-20T10:00",
                duration: 195,
                description: "Official PTE Academic test simulation",
                status: "upcoming",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                name: "TOEFL Practice Test",
                type: "TOEFL",
                date: "2024-03-25T14:00",
                duration: 200,
                description: "TOEFL iBT practice test with all sections",
                status: "upcoming",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        // Sample tasks
        const tasksData = [
            {
                title: "Review John Smith's application",
                description: "Check all documents and prepare recommendation",
                priority: "High",
                status: "pending",
                dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                title: "Schedule IELTS test for new students",
                description: "Arrange test dates for 5 new IELTS students",
                priority: "Medium",
                status: "in-progress",
                dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        // Add universities first
        const universitiesRef = ref(db, 'universities');
        for (const university of universitiesData) {
            await push(universitiesRef, university);
        }

        // Add students
        const studentsRef = ref(db, 'students');
        for (const student of studentsData) {
            await push(studentsRef, student);
        }

        // Add applications
        const applicationsRef = ref(db, 'applications');
        for (const application of applicationsData) {
            await push(applicationsRef, application);
        }

        // Add exams
        const examsRef = ref(db, 'exams');
        for (const exam of examsData) {
            await push(examsRef, exam);
        }

        // Add tasks
        const tasksRef = ref(db, 'tasks');
        for (const task of tasksData) {
            await push(tasksRef, task);
        }

        showSuccess('Sample data created successfully! You can now test all functions including universities.');
    } catch (error) {
        showError('Failed to create sample data. Please try again.');
        console.error('Error creating sample data:', error);
    }
}

// Make functions globally available
window.filterApplications = filterApplications;
window.toggleTaskStatus = toggleTaskStatus;
window.openCreateTaskModal = function() {
    showSuccess('Create task functionality coming soon!');
};
window.createSampleData = createSampleData;

// Exam Modal Functions
window.openCreateExamModal = function() {
    const modal = document.getElementById('createExamModal');
    if (modal) {
        modal.style.display = 'flex';
        // Set default date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        document.getElementById('examDate').value = tomorrow.toISOString().slice(0, 16);
    }
};

window.closeCreateExamModal = function() {
    const modal = document.getElementById('createExamModal');
    const form = document.getElementById('createExamForm');
    if (modal) {
        modal.style.display = 'none';
    }
    if (form) {
        form.reset();
    }
};

// University Modal Functions
window.openCreateUniversityModal = function() {
    const modal = document.getElementById('createUniversityModal');
    if (modal) {
        modal.style.display = 'flex';
    }
};

window.closeCreateUniversityModal = function() {
    const modal = document.getElementById('createUniversityModal');
    const form = document.getElementById('createUniversityForm');
    if (modal) {
        modal.style.display = 'none';
    }
    if (form) {
        form.reset();
    }
};

// Add university form submission handler
document.addEventListener('DOMContentLoaded', function() {
    const createUniversityForm = document.getElementById('createUniversityForm');
    if (createUniversityForm) {
        createUniversityForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const universityData = {
                name: document.getElementById('universityName').value,
                country: document.getElementById('universityCountry').value,
                city: document.getElementById('universityCity').value,
                type: document.getElementById('universityType').value,
                ranking: document.getElementById('universityRanking').value || null,
                website: document.getElementById('universityWebsite').value || null,
                description: document.getElementById('universityDescription').value || '',
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            try {
                // Show loading state
                const submitBtn = createUniversityForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Creating...';
                submitBtn.disabled = true;

                const universitiesRef = ref(db, 'universities');
                const newUniversityRef = push(universitiesRef);
                await set(newUniversityRef, universityData);
                
                showSuccess('University created successfully!');
                closeCreateUniversityModal();
                
                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            } catch (error) {
                showError('Failed to create university. Please try again.');
                console.error('Error creating university:', error);
                
                // Reset button
                const submitBtn = createUniversityForm.querySelector('button[type="submit"]');
                submitBtn.textContent = 'Create University';
                submitBtn.disabled = false;
            }
        });
    }

    // Close university modal when clicking outside
    const createUniversityModal = document.getElementById('createUniversityModal');
    if (createUniversityModal) {
        createUniversityModal.addEventListener('click', function(e) {
            if (e.target === createUniversityModal) {
                closeCreateUniversityModal();
            }
        });
    }
});

// Add exam form submission handler
document.addEventListener('DOMContentLoaded', function() {
    const createExamForm = document.getElementById('createExamForm');
    if (createExamForm) {
        createExamForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const examData = {
                name: document.getElementById('examName').value,
                type: document.getElementById('examType').value,
                date: document.getElementById('examDate').value,
                duration: parseInt(document.getElementById('examDuration').value),
                description: document.getElementById('examDescription').value || '',
                status: 'upcoming',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            try {
                // Show loading state
                const submitBtn = createExamForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Creating...';
                submitBtn.disabled = true;

                const examsRef = ref(db, 'exams');
                const newExamRef = push(examsRef);
                await set(newExamRef, examData);
                
                showSuccess('Exam created successfully!');
                closeCreateExamModal();
                
                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            } catch (error) {
                showError('Failed to create exam. Please try again.');
                console.error('Error creating exam:', error);
                
                // Reset button
                const submitBtn = createExamForm.querySelector('button[type="submit"]');
                submitBtn.textContent = 'Create Exam';
                submitBtn.disabled = false;
            }
        });
    }

    // Close exam modal when clicking outside
    const createExamModal = document.getElementById('createExamModal');
    if (createExamModal) {
        createExamModal.addEventListener('click', function(e) {
            if (e.target === createExamModal) {
                closeCreateExamModal();
            }
        });
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
