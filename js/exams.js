import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    push,
    onValue,
    update,
    remove 
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { firebaseConfig } from './config/firebase.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM Elements
const examsTableBody = document.getElementById('examsTableBody');
const addExamForm = document.getElementById('addExamForm');
const examType = document.getElementById('examType');
const ieltsScores = document.getElementById('ieltsScores');
const pteScores = document.getElementById('pteScores');
const searchInput = document.getElementById('searchExam');
const filterScore = document.getElementById('filterScore');
const filterDate = document.getElementById('filterDate');
const tabButtons = document.querySelectorAll('.tab-btn');

// Current active tab
let activeExamType = 'ielts';

// Load Students for Select Dropdown
function loadStudents() {
    const studentSelect = document.getElementById('studentId');
    const studentsRef = ref(db, 'students');
    
    onValue(studentsRef, (snapshot) => {
        const students = snapshot.val();
        studentSelect.innerHTML = '<option value="">Select Student</option>';
        
        if (students) {
            Object.entries(students).forEach(([id, student]) => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = student.name;
                studentSelect.appendChild(option);
            });
        }
    });
}

// Load Exams
function loadExams() {
    const examsRef = ref(db, 'exams');
    onValue(examsRef, (snapshot) => {
        const exams = snapshot.val();
        displayExams(exams);
    });
}

// Display Exams
function displayExams(exams) {
    examsTableBody.innerHTML = '';
    
    if (!exams) return;

    Object.entries(exams)
        .filter(([_, exam]) => exam.type === activeExamType)
        .forEach(([id, exam]) => {
            if (filterExam(exam)) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${exam.studentName}</td>
                    <td>${new Date(exam.examDate).toLocaleDateString()}</td>
                    <td>${getOverallScore(exam)}</td>
                    <td>${getDetailedScores(exam)}</td>
                    <td><span class="status-badge ${getScoreStatus(exam)}">${getScoreStatus(exam)}</span></td>
                    <td>
                        <button onclick="viewExam('${id}')" class="btn-icon">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="editExam('${id}')" class="btn-icon">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteExam('${id}')" class="btn-icon">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                examsTableBody.appendChild(row);
            }
        });
}

// Helper Functions
function getOverallScore(exam) {
    if (exam.type === 'ielts') {
        const scores = [
            parseFloat(exam.listening),
            parseFloat(exam.reading),
            parseFloat(exam.writing),
            parseFloat(exam.speaking)
        ];
        return (scores.reduce((a, b) => a + b, 0) / 4).toFixed(1);
    }
    return exam.overallScore;
}

function getDetailedScores(exam) {
    if (exam.type === 'ielts') {
        return `L: ${exam.listening} | R: ${exam.reading} | W: ${exam.writing} | S: ${exam.speaking}`;
    }
    return `Overall: ${exam.overallScore} | Comm: ${exam.communicativeScore} | Enable: ${exam.enablerScore}`;
}

function getScoreStatus(exam) {
    const score = exam.type === 'ielts' ? getOverallScore(exam) : exam.overallScore;
    if (exam.type === 'ielts') {
        return score >= 7 ? 'high' : score >= 6 ? 'medium' : 'low';
    }
    return score >= 65 ? 'high' : score >= 50 ? 'medium' : 'low';
}

// Filter Exams
function filterExam(exam) {
    const searchTerm = searchInput.value.toLowerCase();
    const scoreFilter = filterScore.value;
    const dateFilter = filterDate.value;

    const matchesSearch = exam.studentName.toLowerCase().includes(searchTerm);
    const matchesScore = !scoreFilter || getScoreStatus(exam) === scoreFilter;
    const matchesDate = !dateFilter || exam.examDate.includes(dateFilter);

    return matchesSearch && matchesScore && matchesDate;
}

// Event Listeners
examType.addEventListener('change', () => {
    const type = examType.value;
    ieltsScores.style.display = type === 'ielts' ? 'block' : 'none';
    pteScores.style.display = type === 'pte' ? 'block' : 'none';
});

addExamForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = {
        type: examType.value,
        studentId: addExamForm.studentId.value,
        studentName: addExamForm.studentId.options[addExamForm.studentId.selectedIndex].text,
        examDate: addExamForm.examDate.value,
        notes: addExamForm.examNotes.value,
        createdAt: new Date().toISOString()
    };

    if (examType.value === 'ielts') {
        formData.listening = addExamForm.listeningScore.value;
        formData.reading = addExamForm.readingScore.value;
        formData.writing = addExamForm.writingScore.value;
        formData.speaking = addExamForm.speakingScore.value;
    } else {
        formData.overallScore = addExamForm.overallScore.value;
        formData.communicativeScore = addExamForm.communicativeScore.value;
        formData.enablerScore = addExamForm.enablerScore.value;
    }

    push(ref(db, 'exams'), formData)
        .then(() => {
            closeAddExamModal();
            addExamForm.reset();
            alert('Exam record added successfully!');
        })
        .catch((error) => {
            alert('Error adding exam record: ' + error.message);
        });
});

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        activeExamType = button.dataset.tab;
        loadExams();
    });
});

// Modal Functions
window.openAddExamModal = function() {
    document.getElementById('addExamModal').style.display = 'block';
};

window.closeAddExamModal = function() {
    document.getElementById('addExamModal').style.display = 'none';
};

// Initialize
loadStudents();
loadExams(); 