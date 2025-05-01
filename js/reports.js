import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    query,
    orderByChild,
    startAt,
    get
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { firebaseConfig } from './config/firebase.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Chart instances
let applicationsByCountryChart;
let studentProgressChart;
let examScoresChart;
let revenueTrendsChart;

// Initialize Reports
async function initializeReports() {
    await loadMetrics();
    initializeCharts();
    setupEventListeners();
}

// Load Key Metrics
async function loadMetrics() {
    const period = document.getElementById('reportPeriod').value;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    try {
        // Fetch students data
        const studentsRef = ref(db, 'students');
        const studentsSnapshot = await get(studentsRef);
        const totalStudents = studentsSnapshot.size;
        document.getElementById('totalStudentsMetric').textContent = totalStudents;

        // Fetch applications data
        const applicationsRef = ref(db, 'applications');
        const applicationsSnapshot = await get(applicationsRef);
        const applications = [];
        applicationsSnapshot.forEach(snap => {
            applications.push(snap.val());
        });

        // Calculate success rate
        const successfulApplications = applications.filter(app => app.status === 'completed');
        const successRate = (successfulApplications.length / applications.length * 100).toFixed(1);
        document.getElementById('successRateMetric').textContent = `${successRate}%`;

        // Count active applications
        const activeApplications = applications.filter(app => 
            ['pending', 'documents', 'submitted', 'visa'].includes(app.status)
        );
        document.getElementById('activeApplicationsMetric').textContent = activeApplications.length;

        // Calculate revenue (example calculation)
        const revenue = calculateRevenue(applications);
        document.getElementById('revenueMetric').textContent = `$${revenue.toLocaleString()}`;

    } catch (error) {
        console.error('Error loading metrics:', error);
    }
}

// Initialize Charts
function initializeCharts() {
    // Applications by Country Chart
    const applicationsByCountryCtx = document.getElementById('applicationsByCountry').getContext('2d');
    applicationsByCountryChart = new Chart(applicationsByCountryCtx, {
        type: 'pie',
        data: {
            labels: ['USA', 'UK', 'Canada', 'Australia', 'New Zealand'],
            datasets: [{
                data: [30, 25, 20, 15, 10],
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF'
                ]
            }]
        }
    });

    // Student Progress Timeline
    const studentProgressCtx = document.getElementById('studentProgress').getContext('2d');
    studentProgressChart = new Chart(studentProgressCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'New Students',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: '#36A2EB'
            }]
        }
    });

    // Exam Scores Distribution
    const examScoresCtx = document.getElementById('examScores').getContext('2d');
    examScoresChart = new Chart(examScoresCtx, {
        type: 'bar',
        data: {
            labels: ['5.0-5.5', '5.5-6.0', '6.0-6.5', '6.5-7.0', '7.0-7.5', '7.5+'],
            datasets: [{
                label: 'IELTS Scores',
                data: [5, 10, 15, 20, 15, 5],
                backgroundColor: '#4BC0C0'
            }]
        }
    });

    // Revenue Trends
    const revenueTrendsCtx = document.getElementById('revenueTrends').getContext('2d');
    revenueTrendsChart = new Chart(revenueTrendsCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Revenue',
                data: [5000, 7000, 6000, 8000, 9000, 11000],
                borderColor: '#FF6384'
            }]
        }
    });
}

// Generate Detailed Report
async function generateDetailedReport() {
    const reportType = document.getElementById('reportType').value;
    const tableHeaders = getReportHeaders(reportType);
    const reportData = await fetchReportData(reportType);

    // Update table headers
    const thead = document.querySelector('#reportTable thead');
    thead.innerHTML = `<tr>${tableHeaders.map(header => `<th>${header}</th>`).join('')}</tr>`;

    // Update table body
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = '';

    reportData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = tableHeaders.map(header => `<td>${row[header.toLowerCase()] || ''}</td>`).join('');
        tbody.appendChild(tr);
    });
}

// Helper Functions
function getReportHeaders(reportType) {
    const headers = {
        students: ['Name', 'Email', 'Course', 'Status', 'Join Date'],
        applications: ['Student', 'University', 'Course', 'Country', 'Status'],
        exams: ['Student', 'Exam Type', 'Score', 'Date', 'Status'],
        financial: ['Date', 'Student', 'Type', 'Amount', 'Status']
    };
    return headers[reportType] || [];
}

async function fetchReportData(reportType) {
    try {
        const ref = getDatabase().ref(reportType);
        const snapshot = await ref.once('value');
        return Object.values(snapshot.val() || {});
    } catch (error) {
        console.error('Error fetching report data:', error);
        return [];
    }
}

function calculateRevenue(applications) {
    // Example revenue calculation
    return applications.reduce((total, app) => {
        return total + (app.applicationFee || 0);
    }, 0);
}

// Export Report
window.exportReport = function() {
    const reportType = document.getElementById('reportType').value;
    const period = document.getElementById('reportPeriod').value;
    
    // Implementation for exporting report (e.g., to CSV or PDF)
    alert('Exporting report... (Implementation needed)');
};

// Event Listeners
function setupEventListeners() {
    document.getElementById('reportPeriod').addEventListener('change', loadMetrics);
    document.getElementById('reportType').addEventListener('change', generateDetailedReport);
}

// Initialize
initializeReports(); 