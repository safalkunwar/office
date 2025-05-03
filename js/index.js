import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue, get, child, push, set, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { firebaseConfig } from './config.js';
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/+esm';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Firebase configuration should be moved to a separate config file

// Initialize Firebase with error handling
let app;
let db;
let auth;

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

// Loading states
const loadingStates = {
  stats: document.querySelectorAll('.stat-card p'),
  security: document.querySelectorAll('.security-stats p')
};

// Theme Management
const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = themeToggle.querySelector('i');

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeIcon.classList.replace('fa-moon', 'fa-sun');
}

// Theme Toggle Functionality
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    // Update icon
    if (isDarkMode) {
        themeIcon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        themeIcon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'light');
    }
});

// Improved mobile menu functionality
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navMenu = document.querySelector('.navbar-right ul');
let menuTimeout;

mobileMenuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  navMenu.classList.toggle('active');
  const isExpanded = navMenu.classList.contains('active');
  mobileMenuBtn.setAttribute('aria-expanded', isExpanded);
  
  // Clear any existing timeout
  if (menuTimeout) {
    clearTimeout(menuTimeout);
  }
});

// Improved click outside handling
document.addEventListener('click', (e) => {
  if (!navMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
    menuTimeout = setTimeout(() => {
      navMenu.classList.remove('active');
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
    }, 100);
  }
});

// Improved loading state management
function showLoading(elements) {
  elements.forEach(element => {
    if (element) {
      element.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      element.setAttribute('aria-busy', 'true');
    }
  });
}

function hideLoading(elements) {
  elements.forEach(element => {
    if (element) {
      element.innerHTML = '';
      element.setAttribute('aria-busy', 'false');
    }
  });
}

// Improved error handling
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

// Fetch and Display Data
async function fetchStats() {
  try {
    showLoading(loadingStates.stats);
    const statsRef = ref(db, 'metrics');
    const snapshot = await get(statsRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(stats).forEach(key => {
        if (stats[key]) {
          stats[key].textContent = data[key] || 0;
        }
      });
    }
  } catch (error) {
    showError('Failed to load statistics. Please try again later.');
    console.error('Error fetching stats:', error);
  } finally {
    hideLoading(loadingStates.stats);
  }
}

// Fetch Security Data
async function fetchSecurityData() {
  try {
    showLoading(loadingStates.security);
    const securityRef = ref(db, 'security');
    const snapshot = await get(securityRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      stats.twoFactorStatus.textContent = data.twoFactorEnabled ? 'Enabled' : 'Disabled';
      stats.lastLogin.textContent = new Date(data.lastLogin).toLocaleString();
      stats.securityAlerts.textContent = data.alerts || 0;
    }
  } catch (error) {
    showError('Failed to load security data. Please try again later.');
    console.error('Error fetching security data:', error);
  } finally {
    hideLoading(loadingStates.security);
  }
}

// Reports Management
let charts = {
    enrollment: null,
    course: null,
    application: null,
    progress: null,
    score: null,
    visa: null
};

async function generateReport(type) {
    try {
        const reportRef = ref(db, `reports/${type}`);
        const snapshot = await get(reportRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            updateCharts(data);
        }
    } catch (error) {
        showError('Failed to generate report. Please try again later.');
        console.error('Error generating report:', error);
    }
}

function updateCharts(data) {
    // Update Enrollment Chart
    if (charts.enrollment) {
        charts.enrollment.destroy();
    }
    charts.enrollment = new Chart(document.getElementById('enrollmentChart'), {
        type: 'line',
        data: {
            labels: data.enrollment.labels,
            datasets: [{
                label: 'Total Students',
                data: data.enrollment.values,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: true,
                backgroundColor: 'rgba(75, 192, 192, 0.1)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });

    // Update Course Distribution Chart
    if (charts.course) {
        charts.course.destroy();
    }
    charts.course = new Chart(document.getElementById('courseChart'), {
        type: 'pie',
        data: {
            labels: data.courses.labels,
            datasets: [{
                data: data.courses.values,
                backgroundColor: [
                    'rgb(255, 99, 132)',
                    'rgb(54, 162, 235)',
                    'rgb(255, 205, 86)',
                    'rgb(75, 192, 192)',
                    'rgb(153, 102, 255)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                }
            }
        }
    });

    // Update Application Status Chart
    if (charts.application) {
        charts.application.destroy();
    }
    charts.application = new Chart(document.getElementById('applicationChart'), {
        type: 'bar',
        data: {
            labels: data.applications.labels,
            datasets: [{
                label: 'Applications',
                data: data.applications.values,
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgb(75, 192, 192)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Update Student Progress Chart
    if (charts.progress) {
        charts.progress.destroy();
    }
    charts.progress = new Chart(document.getElementById('progressChart'), {
        type: 'radar',
        data: {
            labels: ['IELTS', 'PTE', 'Visa', 'Documentation', 'Interview'],
            datasets: [{
                label: 'Average Progress',
                data: data.progress.values,
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgb(255, 99, 132)',
                pointBackgroundColor: 'rgb(255, 99, 132)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(255, 99, 132)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });

    // Update Test Score Distribution Chart
    if (charts.score) {
        charts.score.destroy();
    }
    charts.score = new Chart(document.getElementById('scoreChart'), {
        type: 'doughnut',
        data: {
            labels: ['6.0-6.5', '6.5-7.0', '7.0-7.5', '7.5-8.0', '8.0+'],
            datasets: [{
                data: data.scores.values,
                backgroundColor: [
                    'rgb(255, 99, 132)',
                    'rgb(54, 162, 235)',
                    'rgb(255, 205, 86)',
                    'rgb(75, 192, 192)',
                    'rgb(153, 102, 255)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                }
            }
        }
    });

    // Update Visa Application Status Chart
    if (charts.visa) {
        charts.visa.destroy();
    }
    charts.visa = new Chart(document.getElementById('visaChart'), {
        type: 'pie',
        data: {
            labels: ['Approved', 'Pending', 'Rejected', 'Under Review'],
            datasets: [{
                data: data.visa.values,
                backgroundColor: [
                    'rgb(75, 192, 192)',
                    'rgb(255, 205, 86)',
                    'rgb(255, 99, 132)',
                    'rgb(54, 162, 235)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                }
            }
        }
    });
}

// Progress and Analytics Charts
let progressCharts = {
    ielts: null,
    pte: null,
    overall: null
};

let analyticsCharts = {
    status: null,
    university: null,
    visa: null
};

function initializeProgressCharts() {
    // IELTS Progress Chart
    progressCharts.ielts = new Chart(document.getElementById('ieltsProgressChart'), {
        type: 'line',
        data: {
            labels: ['Listening', 'Reading', 'Writing', 'Speaking'],
            datasets: [{
                label: 'Average Score',
                data: [7.0, 6.5, 6.8, 7.2],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: true,
                backgroundColor: 'rgba(75, 192, 192, 0.1)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 9
                }
            }
        }
    });

    // PTE Progress Chart
    progressCharts.pte = new Chart(document.getElementById('pteProgressChart'), {
        type: 'radar',
        data: {
            labels: ['Speaking', 'Writing', 'Reading', 'Listening'],
            datasets: [{
                label: 'Current Score',
                data: [75, 68, 72, 70],
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgb(255, 99, 132)',
                pointBackgroundColor: 'rgb(255, 99, 132)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 90
                }
            }
        }
    });

    // Overall Performance Chart
    progressCharts.overall = new Chart(document.getElementById('overallPerformanceChart'), {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'IELTS Students',
                data: [65, 70, 75, 80],
                backgroundColor: 'rgba(75, 192, 192, 0.5)'
            }, {
                label: 'PTE Students',
                data: [60, 68, 72, 78],
                backgroundColor: 'rgba(255, 99, 132, 0.5)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function initializeAnalyticsCharts() {
    // Application Status Distribution
    analyticsCharts.status = new Chart(document.getElementById('applicationStatusChart'), {
        type: 'doughnut',
        data: {
            labels: ['Approved', 'Pending', 'Rejected', 'Under Review'],
            datasets: [{
                data: [45, 25, 10, 20],
                backgroundColor: [
                    'rgb(75, 192, 192)',
                    'rgb(255, 205, 86)',
                    'rgb(255, 99, 132)',
                    'rgb(54, 162, 235)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });

    // University Applications
    analyticsCharts.university = new Chart(document.getElementById('universityApplicationsChart'), {
        type: 'bar',
        data: {
            labels: ['University A', 'University B', 'University C', 'University D'],
            datasets: [{
                label: 'Applications',
                data: [25, 18, 30, 15],
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgb(54, 162, 235)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Visa Success Rate
    analyticsCharts.visa = new Chart(document.getElementById('visaSuccessChart'), {
        type: 'pie',
        data: {
            labels: ['Successful', 'Rejected', 'In Process'],
            datasets: [{
                data: [70, 15, 15],
                backgroundColor: [
                    'rgb(75, 192, 192)',
                    'rgb(255, 99, 132)',
                    'rgb(255, 205, 86)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// Filter functions
function filterProgress() {
    const courseFilter = document.getElementById('courseFilter').value;
    const progressFilter = document.getElementById('progressFilter').value;
    // Implement filtering logic here
}

function filterApplications() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    // Implement date filtering logic here
}

// Student and Exam Data Management
let students = [];
let exams = [];

async function loadStudents() {
    try {
        const studentsRef = ref(db, 'students');
        const snapshot = await get(studentsRef);
        
        if (snapshot.exists()) {
            students = Object.values(snapshot.val());
            updateStudentStats();
            updateCharts();
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showError('Failed to load student data. Please try again later.');
    }
}

async function loadExams() {
    try {
        const examsRef = ref(db, 'exams');
        const snapshot = await get(examsRef);
        
        if (snapshot.exists()) {
            exams = Object.values(snapshot.val());
            updateExamStats();
            updateCharts();
        }
    } catch (error) {
        console.error('Error loading exams:', error);
        showError('Failed to load exam data. Please try again later.');
    }
}

function updateStudentStats() {
    const totalStudents = students.length;
    const ieltsStudents = students.filter(s => s.course === 'IELTS').length;
    const pteStudents = students.filter(s => s.course === 'PTE').length;
    const activeApplications = students.filter(s => s.applicationStatus === 'active').length;

    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('ieltsStudents').textContent = ieltsStudents;
    document.getElementById('pteStudents').textContent = pteStudents;
    document.getElementById('activeApplications').textContent = activeApplications;
}

function updateExamStats() {
    const ieltsExams = exams.filter(e => e.type === 'IELTS');
    const pteExams = exams.filter(e => e.type === 'PTE');

    // Update IELTS Progress Chart
    if (progressCharts.ielts) {
        progressCharts.ielts.data.datasets[0].data = calculateAverageScores(ieltsExams);
        progressCharts.ielts.update();
    }

    // Update PTE Progress Chart
    if (progressCharts.pte) {
        progressCharts.pte.data.datasets[0].data = calculateAverageScores(pteExams);
        progressCharts.pte.update();
    }

    // Update Overall Performance Chart
    if (progressCharts.overall) {
        progressCharts.overall.data.datasets[0].data = calculateWeeklyProgress(ieltsExams);
        progressCharts.overall.data.datasets[1].data = calculateWeeklyProgress(pteExams);
        progressCharts.overall.update();
    }
}

function calculateAverageScores(exams) {
    const scores = {
        listening: [],
        reading: [],
        writing: [],
        speaking: []
    };

    exams.forEach(exam => {
        if (exam.scores) {
            scores.listening.push(exam.scores.listening || 0);
            scores.reading.push(exam.scores.reading || 0);
            scores.writing.push(exam.scores.writing || 0);
            scores.speaking.push(exam.scores.speaking || 0);
        }
    });

    return [
        calculateAverage(scores.listening),
        calculateAverage(scores.reading),
        calculateAverage(scores.writing),
        calculateAverage(scores.speaking)
    ];
}

function calculateWeeklyProgress(exams) {
    const weeks = [0, 0, 0, 0]; // Last 4 weeks
    const now = new Date();
    
    exams.forEach(exam => {
        const examDate = new Date(exam.date);
        const weekDiff = Math.floor((now - examDate) / (7 * 24 * 60 * 60 * 1000));
        
        if (weekDiff >= 0 && weekDiff < 4) {
            const totalScore = (exam.scores.listening + exam.scores.reading + 
                              exam.scores.writing + exam.scores.speaking) / 4;
            weeks[weekDiff] = totalScore;
        }
    });

    return weeks;
}

function calculateAverage(numbers) {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((a, b) => a + b, 0);
    return sum / numbers.length;
}

function updateCharts() {
    // Update Application Status Chart
    if (analyticsCharts.status) {
        const statusData = calculateApplicationStatus();
        analyticsCharts.status.data.datasets[0].data = statusData.values;
        analyticsCharts.status.update();
    }

    // Update University Applications Chart
    if (analyticsCharts.university) {
        const universityData = calculateUniversityApplications();
        analyticsCharts.university.data.datasets[0].data = universityData.values;
        analyticsCharts.university.update();
    }

    // Update Visa Success Chart
    if (analyticsCharts.visa) {
        const visaData = calculateVisaSuccess();
        analyticsCharts.visa.data.datasets[0].data = visaData.values;
        analyticsCharts.visa.update();
    }
}

function calculateApplicationStatus() {
    const statusCounts = {
        'Approved': 0,
        'Pending': 0,
        'Rejected': 0,
        'Under Review': 0
    };

    students.forEach(student => {
        if (student.applicationStatus) {
            statusCounts[student.applicationStatus]++;
        }
    });

    return {
        labels: Object.keys(statusCounts),
        values: Object.values(statusCounts)
    };
}

function calculateUniversityApplications() {
    const universityCounts = {};
    
    students.forEach(student => {
        if (student.university) {
            universityCounts[student.university] = (universityCounts[student.university] || 0) + 1;
        }
    });

    return {
        labels: Object.keys(universityCounts),
        values: Object.values(universityCounts)
    };
}

function calculateVisaSuccess() {
    const visaStatus = {
        'Successful': 0,
        'Rejected': 0,
        'In Process': 0
    };

    students.forEach(student => {
        if (student.visaStatus) {
            visaStatus[student.visaStatus]++;
        }
    });

    return {
        labels: Object.keys(visaStatus),
        values: Object.values(visaStatus)
    };
}

// Real-time updates
function setupRealTimeUpdates() {
    const studentsRef = ref(db, 'students');
    const examsRef = ref(db, 'exams');

    onValue(studentsRef, (snapshot) => {
        if (snapshot.exists()) {
            students = Object.values(snapshot.val());
            updateStudentStats();
            updateCharts();
        }
    });

    onValue(examsRef, (snapshot) => {
        if (snapshot.exists()) {
            exams = Object.values(snapshot.val());
            updateExamStats();
            updateCharts();
        }
    });
}

// Initialize the application
function initApp() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('userName').textContent = user.displayName || 'Admin';
            fetchStats();
            fetchSecurityData();
            loadStudents();
            loadExams();
            setupRealTimeUpdates();
            initializeProgressCharts();
            initializeAnalyticsCharts();
            
            // Add event listeners for filters
            document.getElementById('courseFilter').addEventListener('change', filterProgress);
            document.getElementById('progressFilter').addEventListener('change', filterProgress);
        } else {
            window.location.href = './html/login.html';
        }
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);

// Optimized real-time updates with throttling
let lastUpdate = 0;
const UPDATE_THROTTLE = 1000; // 1 second

const statsRef = ref(db, 'metrics');
onValue(statsRef, (snapshot) => {
  const now = Date.now();
  if (now - lastUpdate >= UPDATE_THROTTLE) {
    const data = snapshot.val();
    if (data) {
      Object.keys(stats).forEach(key => {
        if (stats[key]) {
          stats[key].textContent = data[key] || 0;
        }
      });
    }
    lastUpdate = now;
  }
});
