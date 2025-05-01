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
const studentsTableBody = document.getElementById('studentsTableBody');
const addStudentForm = document.getElementById('addStudentForm');
const searchInput = document.getElementById('searchStudent');
const filterStatus = document.getElementById('filterStatus');
const filterCourse = document.getElementById('filterCourse');

// Load Students
function loadStudents() {
    const studentsRef = ref(db, 'students');
    onValue(studentsRef, (snapshot) => {
        const students = snapshot.val();
        displayStudents(students);
    });
}

// Display Students
function displayStudents(students) {
    studentsTableBody.innerHTML = '';
    
    if (!students) return;

    Object.entries(students).forEach(([id, student]) => {
        if (filterStudents(student)) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${id}</td>
                <td>${student.name}</td>
                <td>${student.email}<br>${student.phone}</td>
                <td>${student.course}</td>
                <td><span class="status-badge ${student.status}">${student.status}</span></td>
                <td>
                    <button onclick="viewStudent('${id}')" class="btn-icon">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editStudent('${id}')" class="btn-icon">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteStudent('${id}')" class="btn-icon">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            studentsTableBody.appendChild(row);
        }
    });
}

// Filter Students
function filterStudents(student) {
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilter = filterStatus.value;
    const courseFilter = filterCourse.value;

    const matchesSearch = student.name.toLowerCase().includes(searchTerm) ||
                         student.email.toLowerCase().includes(searchTerm);
    const matchesStatus = !statusFilter || student.status === statusFilter;
    const matchesCourse = !courseFilter || student.course === courseFilter;

    return matchesSearch && matchesStatus && matchesCourse;
}

// Add New Student
addStudentForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newStudent = {
        name: addStudentForm.studentName.value,
        email: addStudentForm.studentEmail.value,
        phone: addStudentForm.studentPhone.value,
        course: addStudentForm.studentCourse.value,
        notes: addStudentForm.studentNotes.value,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    push(ref(db, 'students'), newStudent)
        .then(() => {
            closeAddStudentModal();
            addStudentForm.reset();
            alert('Student added successfully!');
        })
        .catch((error) => {
            alert('Error adding student: ' + error.message);
        });
});

// Event Listeners for Filters
searchInput.addEventListener('input', loadStudents);
filterStatus.addEventListener('change', loadStudents);
filterCourse.addEventListener('change', loadStudents);

// Modal Functions
window.openAddStudentModal = function() {
    document.getElementById('addStudentModal').style.display = 'block';
};

window.closeAddStudentModal = function() {
    document.getElementById('addStudentModal').style.display = 'none';
};

// Initialize
loadStudents(); 