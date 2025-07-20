import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, onValue, push, set, remove, get, update, query, orderByChild } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable, listAll } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA910SEIzx0ER4Ps_EdXBUU0Jgf2wTRm8Q",
    authDomain: "fir-a7a69.firebaseapp.com",
    databaseURL: "https://fir-a7a69-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "fir-a7a69",
    storageBucket: "fir-a7a69.firebasestorage.app",
    messagingSenderId: "1060643495940",
    appId: "1:1060643495940:web:19bc515d82d737d73d1551",
    measurementId: "G-YG82VTV644"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Required document types for each student
const REQUIRED_DOCUMENTS = {
    passport: { name: 'Passport', required: true, expiry: true },
    transcript: { name: 'Academic Transcript', required: true, expiry: false },
    certificate: { name: 'Language Certificate', required: true, expiry: true },
    cv: { name: 'CV/Resume', required: true, expiry: false },
    letter: { name: 'Recommendation Letter', required: true, expiry: false },
    financial: { name: 'Financial Statement', required: true, expiry: true },
    medical: { name: 'Medical Certificate', required: true, expiry: true }
};

// DOM Elements
const studentsList = document.getElementById('studentsList');
const createStudentModal = document.getElementById('createStudentModal');
const createStudentForm = document.getElementById('createStudentForm');
const uploadDocumentModal = document.getElementById('uploadDocumentModal');
const uploadDocumentForm = document.getElementById('uploadDocumentForm');
const viewStudentDocumentsModal = document.getElementById('viewStudentDocumentsModal');
const searchInput = document.getElementById('searchInput');
const studentFilter = document.getElementById('studentFilter');
const documentTypeFilter = document.getElementById('documentTypeFilter');
const statusFilter = document.getElementById('statusFilter');
const documentStudent = document.getElementById('documentStudent');
const missingDocumentsAlert = document.getElementById('missingDocumentsAlert');
const missingDocumentsList = document.getElementById('missingDocumentsList');

// Attendance System Variables
let attendanceData = {}; // { studentId: { 'YYYY-MM-DD': 'present'|'absent' } }
let studentsCache = [];

// Attendance UI Elements
const attendanceDateInput = document.getElementById('attendanceDate');
const attendanceMarkingTable = document.getElementById('attendanceMarkingTable');
const markAllPresentBtn = document.getElementById('markAllPresentBtn');
const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');
const attendanceSaveStatus = document.getElementById('attendanceSaveStatus');
const lowAttendanceList = document.getElementById('lowAttendanceList');
const lowAttendanceThreshold = 75;

// Theme Management
const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = themeToggle.querySelector('i');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navMenu = document.querySelector('.navbar-right ul');

// Set default date to today
if (attendanceDateInput) {
  const today = new Date().toISOString().slice(0, 10);
  attendanceDateInput.value = today;
  attendanceDateInput.max = today;
}

// Fetch and display attendance when students are loaded or date changes
if (attendanceDateInput) {
  attendanceDateInput.addEventListener('change', () => {
    renderAttendanceMarkingTable();
  });
}
if (markAllPresentBtn) {
  markAllPresentBtn.addEventListener('click', () => {
    const date = attendanceDateInput.value;
    studentsCache.forEach(s => {
      if (!attendanceData[s.id]) attendanceData[s.id] = {};
      attendanceData[s.id][date] = 'present';
    });
    renderAttendanceMarkingTable();
  });
}
if (saveAttendanceBtn) {
  saveAttendanceBtn.addEventListener('click', saveAttendanceForDate);
}

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
    themeIcon.classList.toggle('fa-moon');
    themeIcon.classList.toggle('fa-sun');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
});

// Mobile Menu Toggle
mobileMenuBtn.addEventListener('click', () => {
    const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
    mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('active');
    }
});

// Modal Functions
function openCreateStudentModal() {
    createStudentModal.style.display = 'block';
}

function closeCreateStudentModal() {
    createStudentModal.style.display = 'none';
    createStudentForm.reset();
}

function openUploadDocumentModal() {
    uploadDocumentModal.style.display = 'block';
    loadStudentsForSelect();
}

function closeUploadDocumentModal() {
    uploadDocumentModal.style.display = 'none';
    uploadDocumentForm.reset();
}

function openViewStudentDocumentsModal(studentId) {
    viewStudentDocumentsModal.style.display = 'block';
    loadStudentDocuments(studentId);
}

function closeViewStudentDocumentsModal() {
    viewStudentDocumentsModal.style.display = 'none';
}

function closeMissingDocumentsAlert() {
    missingDocumentsAlert.style.display = 'none';
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === createStudentModal) {
        closeCreateStudentModal();
    }
    if (e.target === uploadDocumentModal) {
        closeUploadDocumentModal();
    }
    if (e.target === viewStudentDocumentsModal) {
        closeViewStudentDocumentsModal();
    }
});

// Create Student Form Submission
createStudentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const studentData = {
        name: document.getElementById('studentName').value,
        email: document.getElementById('studentEmail').value,
        phone: document.getElementById('studentPhone').value,
        course: document.getElementById('studentCourse').value,
        country: document.getElementById('studentCountry').value,
        startDate: document.getElementById('startDate').value,
        notes: document.getElementById('studentNotes').value,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        documents: {},
        missingDocuments: Object.keys(REQUIRED_DOCUMENTS),
        photoUrl: ''
    };

    const imageInput = document.getElementById('studentImage');
    const imageFile = imageInput.files[0];

    try {
        const submitBtn = createStudentForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;

        const studentsRef = ref(database, 'students');
        const newStudentRef = push(studentsRef);
        const newStudentKey = newStudentRef.key;

        // If image is selected, upload it first
        if (imageFile) {
            if (imageFile.size > 2 * 1024 * 1024) {
                showError('Image size must be less than 2MB.');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                return;
            }
            const imageStorageRef = storageRef(storage, `students/${newStudentKey}/profile.jpg`);
            await uploadBytes(imageStorageRef, imageFile);
            const imageUrl = await getDownloadURL(imageStorageRef);
            studentData.photoUrl = imageUrl;
        }

        await set(newStudentRef, studentData);
        
        showSuccess('Student created successfully!');
        closeCreateStudentModal();
        
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    } catch (error) {
        showError('Failed to create student. Please try again.');
        console.error('Error creating student:', error);
        
        const submitBtn = createStudentForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Create Student';
        submitBtn.disabled = false;
    }
});

// Upload Document Form Submission
uploadDocumentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('documentFile');
    const file = fileInput.files[0];
    if (!file) {
        showError('Please select a file to upload.');
        return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showError('File size must be less than 10MB.');
        return;
    }
    try {
        const submitBtn = uploadDocumentForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Uploading...';
        submitBtn.disabled = true;
        const studentId = document.getElementById('documentStudent').value;
        const documentType = document.getElementById('documentType').value;
        const documentName = document.getElementById('documentName').value;
        const expiryDate = document.getElementById('documentExpiry').value;
        const notes = document.getElementById('documentNotes').value;
        // Use uploadBytesResumable for progress
        const fileRef = storageRef(storage, `students/${studentId}/documents/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, file);
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                submitBtn.textContent = `Uploading... ${progress.toFixed(0)}%`;
            },
            (error) => {
                showError('Upload failed: ' + error.message);
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                // Save document metadata to Realtime Database
                const documentData = {
                    name: documentName,
                    type: documentType,
                    fileUrl: downloadURL,
                    fileName: file.name,
                    fileSize: file.size,
                    expiryDate: expiryDate || null,
                    notes: notes,
                    status: 'pending',
                    uploadedAt: new Date().toISOString(),
                    verifiedAt: null,
                    verifiedBy: null
                };
                const documentsRef = ref(database, `students/${studentId}/documents`);
                const newDocumentRef = push(documentsRef);
                await set(newDocumentRef, documentData);
                // Update student's missing documents list
                const studentRef = ref(database, `students/${studentId}`);
                const studentSnapshot = await get(studentRef);
                if (studentSnapshot.exists()) {
                    const student = studentSnapshot.val();
                    const missingDocs = student.missingDocuments || [];
                    const updatedMissingDocs = missingDocs.filter(doc => doc !== documentType);
                    await update(studentRef, {
                        missingDocuments: updatedMissingDocs,
                        updatedAt: new Date().toISOString()
                    });
                }
                showSuccess('Document uploaded successfully!');
                closeUploadDocumentModal();
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        );
    } catch (error) {
        showError('Failed to upload document. Please try again.');
        console.error('Error uploading document:', error);
        const submitBtn = uploadDocumentForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Upload Document';
        submitBtn.disabled = false;
    }
});

// Load Students for Select Dropdown
async function loadStudentsForSelect() {
    try {
        const studentsRef = ref(database, 'students');
        onValue(studentsRef, (snapshot) => {
            documentStudent.innerHTML = '<option value="">Select Student</option>';
            snapshot.forEach((childSnapshot) => {
                const student = childSnapshot.val();
                const option = document.createElement('option');
                option.value = childSnapshot.key;
                option.textContent = `${student.name} (${student.email})`;
                documentStudent.appendChild(option);
            });
        });
    } catch (error) {
        showError('Failed to load students. Please try again.');
        console.error('Error loading students:', error);
    }
}

// Load and Display Students with Documents
function loadStudents() {
    const studentsRef = ref(database, 'students');
    onValue(studentsRef, (snapshot) => {
        studentsList.innerHTML = '';
        studentsCache = [];
        
        if (snapshot.exists()) {
            const students = [];
            snapshot.forEach((childSnapshot) => {
                const student = { id: childSnapshot.key, ...childSnapshot.val() };
                students.push(student);
                studentsCache.push(student);
            });
            
            // Sort by creation date (newest first)
            students.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            displayStudents(students);
            updateStudentFilter(students);
            checkMissingDocuments(students);
        } else {
            studentsList.innerHTML = '<div class="no-data">No students found</div>';
        }
    });
}

let studentsStats = {
  total: 0,
  completed: 0,
  incomplete: 0,
  pending: 0,
  students: []
};

function displayStudents(students) {
    studentsList.innerHTML = '';
    
    // Calculate stats
    let total = students.length;
    let completed = 0, incomplete = 0, pending = 0;
    let studentsData = [];
    students.forEach(student => {
        const missingCount = student.missingDocuments ? student.missingDocuments.length : 0;
        const docs = student.documents ? Object.values(student.documents) : [];
        const allPending = docs.length > 0 && docs.every(doc => doc.status === 'pending');
        if (missingCount === 0 && docs.length > 0 && docs.every(doc => doc.status === 'verified')) {
            completed++;
        } else if (allPending) {
            pending++;
        } else {
            incomplete++;
        }
        studentsData.push({
          name: student.name,
          course: student.course,
          status: (missingCount === 0 && docs.length > 0 && docs.every(doc => doc.status === 'verified')) ? 'Completed' : (allPending ? 'Pending' : 'Incomplete')
        });
    });
    studentsStats = { total, completed, incomplete, pending, students: studentsData };
    updateStudentsStatsBar();
    // Always render overview after stats update
    renderStudentsOverviewChart();
    renderStudentsOverviewTable();

    students.forEach(student => {
        const studentCard = document.createElement('div');
        studentCard.className = 'student-card';
        studentCard.tabIndex = 0;
        studentCard.style.cursor = 'pointer';
        studentCard.setAttribute('role', 'button');
        studentCard.setAttribute('aria-label', `View details for ${student.name}`);
        studentCard.addEventListener('click', () => openViewStudentDocumentsModal(student.id));
        studentCard.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') openViewStudentDocumentsModal(student.id);
        });
        
        const documentsCount = student.documents ? Object.keys(student.documents).length : 0;
        const missingCount = student.missingDocuments ? student.missingDocuments.length : 0;
        const completedCount = Object.keys(REQUIRED_DOCUMENTS).length - missingCount;
        const completionPercentage = Math.round((completedCount / Object.keys(REQUIRED_DOCUMENTS).length) * 100);
        
        const startDate = new Date(student.startDate).toLocaleDateString();
        const lastActivity = student.updatedAt ? new Date(student.updatedAt).toLocaleDateString() : 'Never';
        
        // Get appropriate icon based on course
        const getCourseIcon = (course) => {
            switch(course.toLowerCase()) {
                case 'ielts': return 'fas fa-language';
                case 'pte': return 'fas fa-file-alt';
                case 'toefl': return 'fas fa-globe';
                case 'academic': return 'fas fa-graduation-cap';
                default: return 'fas fa-user-graduate';
            }
        };
        
        studentCard.innerHTML = `
            <div class="student-header">
                <div class="student-icon">
                    <i class="${getCourseIcon(student.course)}"></i>
                </div>
                <div class="student-info">
                    <h3>${student.name}</h3>
                    <p class="student-email">${student.email}</p>
                    <p class="student-course">${student.course} • ${student.country || 'No country specified'}</p>
                </div>
                <div class="student-status">
                    <span class="status-badge ${student.status}">${student.status}</span>
                </div>
            </div>
            <div class="student-details">
                <div class="detail-item">
                    <i class="fas fa-calendar"></i>
                    <span>Started: ${startDate}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>Last Activity: ${lastActivity}</span>
                </div>
            </div>
            <div class="documents-progress">
                <div class="progress-header">
                    <h4>Documents Progress</h4>
                    <span class="progress-percentage">${completionPercentage}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${completionPercentage}%"></div>
                </div>
                <div class="documents-stats">
                    <span class="stat-item">
                        <i class="fas fa-check-circle text-success"></i>
                        ${completedCount} Completed
                    </span>
                    <span class="stat-item">
                        <i class="fas fa-exclamation-triangle text-warning"></i>
                        ${missingCount} Missing
                    </span>
                </div>
            </div>
            <div class="student-actions">
                <button class="btn btn-secondary" onclick="event.stopPropagation();uploadDocumentForStudent('${student.id}')">
                    <i class="fas fa-upload"></i> Upload
                </button>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteStudent('${student.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        studentsList.appendChild(studentCard);
    });
}

function updateStudentsStatsBar() {
  document.getElementById('totalStudentsCount').textContent = studentsStats.total;
  document.getElementById('completedStudentsCount').textContent = studentsStats.completed;
  document.getElementById('incompleteStudentsCount').textContent = studentsStats.incomplete;
  document.getElementById('pendingStudentsCount').textContent = studentsStats.pending;
}

// Update Student Filter Dropdown
function updateStudentFilter(students) {
    studentFilter.innerHTML = '<option value="all">All Students</option>';
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = student.name;
        studentFilter.appendChild(option);
    });
}

// Check for Missing Documents
function checkMissingDocuments(students) {
    const studentsWithMissingDocs = students.filter(student => 
        student.missingDocuments && student.missingDocuments.length > 0
    );
    
    if (studentsWithMissingDocs.length > 0) {
        displayMissingDocumentsAlert(studentsWithMissingDocs);
    } else {
        missingDocumentsAlert.style.display = 'none';
    }
}

// Display Missing Documents Alert
function displayMissingDocumentsAlert(studentsWithMissingDocs) {
    missingDocumentsList.innerHTML = '';
    
    studentsWithMissingDocs.forEach(student => {
        const studentItem = document.createElement('div');
        studentItem.className = 'missing-document-item';
        
        const missingDocsList = student.missingDocuments.map(docType => 
            REQUIRED_DOCUMENTS[docType]?.name || docType
        ).join(', ');
        
        studentItem.innerHTML = `
            <div class="missing-student-info">
                <strong>${student.name}</strong> - ${student.email}
            </div>
            <div class="missing-documents">
                Missing: ${missingDocsList}
            </div>
            <button class="btn btn-sm btn-primary" onclick="uploadDocumentForStudent('${student.id}')">
                Upload Documents
            </button>
        `;
        
        missingDocumentsList.appendChild(studentItem);
    });
    
    missingDocumentsAlert.style.display = 'block';
}

// Load Student Documents
async function loadStudentDocuments(studentId) {
    try {
        const studentRef = ref(database, `students/${studentId}`);
        const documentsRef = ref(database, `students/${studentId}/documents`);
        
        const [studentSnapshot, documentsSnapshot] = await Promise.all([
            get(studentRef),
            get(documentsRef)
        ]);
        
        if (studentSnapshot.exists()) {
            const student = studentSnapshot.val();
            displayStudentInfo(student);
            displayStudentDocuments(documentsSnapshot.val() || {}, student);
        }
    } catch (error) {
        showError('Failed to load student documents.');
        console.error('Error loading student documents:', error);
    }
}

// Display Student Info
function displayStudentInfo(student) {
    const studentInfoSummary = document.getElementById('studentInfoSummary');
    const studentDocumentsTitle = document.getElementById('studentDocumentsTitle');
    
    studentDocumentsTitle.innerHTML = `<i class="fas fa-folder-open"></i> ${student.name}'s Documents`;
    
    studentInfoSummary.innerHTML = `
        <div class="student-summary">
            <div class="summary-item">
                <i class="fas fa-envelope"></i>
                <span>${student.email}</span>
            </div>
            <div class="summary-item">
                <i class="fas fa-phone"></i>
                <span>${student.phone}</span>
            </div>
            <div class="summary-item">
                <i class="fas fa-graduation-cap"></i>
                <span>${student.course}</span>
            </div>
            <div class="summary-item">
                <i class="fas fa-globe"></i>
                <span>${student.country || 'Not specified'}</span>
            </div>
        </div>
    `;
}

// Display Student Documents
function displayStudentDocuments(documents, student) {
    const documentsStats = document.getElementById('documentsStats');
    const studentDocumentsList = document.getElementById('studentDocumentsList');
    const documentsArray = Object.entries(documents).map(([id, doc]) => ({ id, ...doc }));
    const completedCount = documentsArray.filter(doc => doc.status === 'verified').length;
    const pendingCount = documentsArray.filter(doc => doc.status === 'pending').length;
    const missingCount = student.missingDocuments ? student.missingDocuments.length : 0;
    documentsStats.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon">
                <i class="fas fa-check-circle text-success"></i>
            </div>
            <div class="stat-content">
                <h3>${completedCount}</h3>
                <p>Verified</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">
                <i class="fas fa-clock text-warning"></i>
            </div>
            <div class="stat-content">
                <h3>${pendingCount}</h3>
                <p>Pending</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">
                <i class="fas fa-exclamation-triangle text-danger"></i>
            </div>
            <div class="stat-content">
                <h3>${missingCount}</h3>
                <p>Missing</p>
            </div>
        </div>
    `;
    studentDocumentsList.innerHTML = '';
    Object.entries(REQUIRED_DOCUMENTS).forEach(([docType, docInfo]) => {
        const existingDoc = documentsArray.find(doc => doc.type === docType);
        const documentItem = document.createElement('div');
        documentItem.className = `document-item ${existingDoc ? 'has-document' : 'missing-document'}`;
        if (existingDoc) {
            documentItem.innerHTML = `
                <div class="document-info">
                    <div class="document-icon">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div class="document-details">
                        <h4>${existingDoc.name}</h4>
                        <p class="document-type">${docInfo.name}</p>
                        <p class="document-date">Uploaded: ${new Date(existingDoc.uploadedAt).toLocaleDateString()}</p>
                        ${existingDoc.expiryDate ? `<p class="document-expiry">Expires: ${new Date(existingDoc.expiryDate).toLocaleDateString()}</p>` : ''}
                        <div class="document-preview" id="preview-${existingDoc.id}"></div>
                    </div>
                </div>
                <div class="document-status">
                    <span class="status-badge ${existingDoc.status}">${existingDoc.status}</span>
                </div>
                <div class="document-actions">
                    <button class="btn btn-sm btn-primary" onclick="viewDocument('${existingDoc.fileUrl}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="verifyDocument('${student.id}', '${existingDoc.id}')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDocument('${student.id}', '${existingDoc.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            // Render preview or link using getDownloadURL
            (async () => {
                try {
                    let url = existingDoc.fileUrl;
                    // If not a direct download URL, get it from storage
                    if (!url.startsWith('https://firebasestorage.googleapis.com/')) {
                        const fileRef = storageRef(storage, url);
                        url = await getDownloadURL(fileRef);
                    }
                    const previewDiv = documentItem.querySelector(`#preview-${existingDoc.id}`);
                    if (existingDoc.fileName && /\.(jpe?g|png)$/i.test(existingDoc.fileName)) {
                        // Image preview
                        previewDiv.innerHTML = `<img src="${url}" alt="${existingDoc.name}" style="max-width:120px;max-height:120px;margin-top:8px;border-radius:4px;box-shadow:0 1px 4px #0002;">`;
                    } else if (existingDoc.fileName && /\.pdf$/i.test(existingDoc.fileName)) {
                        // PDF link
                        previewDiv.innerHTML = `<a href="${url}" target="_blank" class="btn btn-sm btn-outline-primary" style="margin-top:8px;">View PDF</a>`;
                    } else {
                        // Other file type
                        previewDiv.innerHTML = `<a href="${url}" target="_blank" class="btn btn-sm btn-outline-secondary" style="margin-top:8px;">Download</a>`;
                    }
                } catch (err) {
                    // If preview fails, show nothing
                }
            })();
        } else {
            documentItem.innerHTML = `
                <div class="document-info">
                    <div class="document-icon missing">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="document-details">
                        <h4>${docInfo.name}</h4>
                        <p class="document-type">Required Document</p>
                        <p class="document-status-missing">Document not uploaded</p>
                    </div>
                </div>
                <div class="document-status">
                    <span class="status-badge missing">Missing</span>
                </div>
                <div class="document-actions">
                    <button class="btn btn-sm btn-primary" onclick="uploadDocumentForStudent('${student.id}', '${docType}')">
                        <i class="fas fa-upload"></i> Upload
                    </button>
                </div>
            `;
        }
        studentDocumentsList.appendChild(documentItem);
    });
}

// Utility Functions
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Global Functions (accessible from HTML)
window.openCreateStudentModal = openCreateStudentModal;
window.closeCreateStudentModal = closeCreateStudentModal;
window.openUploadDocumentModal = openUploadDocumentModal;
window.closeUploadDocumentModal = closeUploadDocumentModal;
window.openViewStudentDocumentsModal = openViewStudentDocumentsModal;
window.closeViewStudentDocumentsModal = closeViewStudentDocumentsModal;
window.closeMissingDocumentsAlert = closeMissingDocumentsAlert;

window.uploadDocumentForStudent = function(studentId, documentType = null) {
    openUploadDocumentModal();
    document.getElementById('documentStudent').value = studentId;
    if (documentType) {
        document.getElementById('documentType').value = documentType;
    }
};

// 2. Refactor viewDocument to always use getDownloadURL for CORS-safe access
window.viewDocument = async function(fileUrl) {
    try {
        // If fileUrl is already a Firebase Storage download URL, open it directly
        if (fileUrl.startsWith('https://firebasestorage.googleapis.com/')) {
            window.open(fileUrl, '_blank');
            return;
        }
        // Otherwise, treat fileUrl as a storage path and get the download URL
        const fileRef = storageRef(storage, fileUrl);
        const downloadURL = await getDownloadURL(fileRef);
        window.open(downloadURL, '_blank');
    } catch (error) {
        showError('Failed to open document: ' + error.message);
    }
};

window.verifyDocument = async function(studentId, documentId) {
    try {
        const documentRef = ref(database, `students/${studentId}/documents/${documentId}`);
        await update(documentRef, {
            status: 'verified',
            verifiedAt: new Date().toISOString(),
            verifiedBy: auth.currentUser?.uid || 'admin'
        });
        showSuccess('Document verified successfully!');
    } catch (error) {
        showError('Failed to verify document.');
        console.error('Error verifying document:', error);
    }
};

window.deleteDocument = async function(studentId, documentId) {
    if (!confirm('Are you sure you want to delete this document?')) {
        return;
    }
    
    try {
        const documentRef = ref(database, `students/${studentId}/documents/${documentId}`);
        const documentSnapshot = await get(documentRef);
        
        if (documentSnapshot.exists()) {
            const document = documentSnapshot.val();
            
            // Delete from Firebase Storage
            if (document.fileUrl) {
                const fileRef = storageRef(storage, document.fileUrl);
                await deleteObject(fileRef);
            }
            
            // Delete from Realtime Database
            await remove(documentRef);
            
            showSuccess('Document deleted successfully!');
        }
    } catch (error) {
        showError('Failed to delete document.');
        console.error('Error deleting document:', error);
    }
};

window.deleteStudent = async function(studentId) {
    if (!confirm('Are you sure you want to delete this student? This will also delete all their documents.')) {
        return;
    }
    
    try {
        // Delete student's documents from storage
        const documentsRef = ref(database, `students/${studentId}/documents`);
        const documentsSnapshot = await get(documentsRef);
        
        if (documentsSnapshot.exists()) {
            const deletePromises = [];
            documentsSnapshot.forEach((childSnapshot) => {
                const document = childSnapshot.val();
                if (document.fileUrl) {
                    const fileRef = storageRef(storage, document.fileUrl);
                    deletePromises.push(deleteObject(fileRef));
                }
            });
            
            await Promise.all(deletePromises);
        }
        
        // Delete student from database
        const studentRef = ref(database, `students/${studentId}`);
        await remove(studentRef);
        
        showSuccess('Student deleted successfully!');
    } catch (error) {
        showError('Failed to delete student.');
        console.error('Error deleting student:', error);
    }
};

window.exportDocumentsReport = function() {
    // Implementation for exporting documents report
    showSuccess('Report export feature coming soon!');
};

// Filter Functions
function filterStudents() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedStudent = studentFilter.value;
    const selectedType = documentTypeFilter.value;
    const selectedStatus = statusFilter.value;
    
    const studentCards = studentsList.getElementsByClassName('student-card');
    Array.from(studentCards).forEach(card => {
        const studentName = card.querySelector('h3').textContent.toLowerCase();
        const studentEmail = card.querySelector('.student-email').textContent.toLowerCase();
        const studentCourse = card.querySelector('.student-course').textContent.toLowerCase();
        
        const matchesSearch = studentName.includes(searchTerm) || 
                            studentEmail.includes(searchTerm) || 
                            studentCourse.includes(searchTerm);
        const matchesStudent = selectedStudent === 'all' || card.dataset.studentId === selectedStudent;
        
        card.style.display = matchesSearch && matchesStudent ? '' : 'none';
    });
}

// Event Listeners for Filters
searchInput.addEventListener('input', filterStudents);
studentFilter.addEventListener('change', filterStudents);
documentTypeFilter.addEventListener('change', filterStudents);
statusFilter.addEventListener('change', filterStudents);

// Initialize App
function initApp() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('userName').textContent = user.displayName || 'Admin';
            loadStudents();
        } else {
            window.location.href = 'login.html';
        }
    });
}

// Start the application
initApp();

// Overview card click handler
const overviewCard = document.getElementById('overviewCard');
if (overviewCard) {
  overviewCard.onclick = function() {
    document.getElementById('reports').scrollIntoView({ behavior: 'smooth' });
  };
}

// Render Chart.js bar chart
let studentsOverviewChartInstance = null;
function renderStudentsOverviewChart() {
  const ctx = document.getElementById('studentsOverviewChart').getContext('2d');
  if (studentsOverviewChartInstance) studentsOverviewChartInstance.destroy();
  studentsOverviewChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Completed', 'Incomplete', 'Pending'],
      datasets: [{
        label: 'Number of Students',
        data: [studentsStats.completed, studentsStats.incomplete, studentsStats.pending],
        backgroundColor: [
          'rgba(46, 125, 50, 0.7)',
          'rgba(255, 193, 7, 0.7)',
          'rgba(33, 150, 243, 0.7)'
        ],
        borderColor: [
          'rgba(46, 125, 50, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(33, 150, 243, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Students Overview' }
      },
      scales: {
        y: { beginAtZero: true, precision: 0 }
      }
    }
  });
}

// Render Table
function renderStudentsOverviewTable() {
  const tableDiv = document.getElementById('studentsOverviewTable');
  let html = `<table style="width:100%;margin-top:1rem;border-collapse:collapse;">
    <thead><tr style="background:#f8f9fa;"><th style="padding:8px;border:1px solid #e0e0e0;">Name</th><th style="padding:8px;border:1px solid #e0e0e0;">Course</th><th style="padding:8px;border:1px solid #e0e0e0;">Status</th></tr></thead><tbody>`;
  studentsStats.students.forEach(s => {
    html += `<tr><td style="padding:8px;border:1px solid #e0e0e0;">${s.name}</td><td style="padding:8px;border:1px solid #e0e0e0;">${s.course}</td><td style="padding:8px;border:1px solid #e0e0e0;">${s.status}</td></tr>`;
  });
  html += '</tbody></table>';
  tableDiv.innerHTML = html;
} 

// --- Image Upload and Delete Functionality for Authenticated User ---
function setupUserImageUpload() {
    const fileInput = document.getElementById('documentFile');
    const uploadBtn = document.querySelector('#uploadDocumentForm button[type="submit"]');
    const fileListContainer = document.createElement('ul');
    fileListContainer.id = 'userFileList';
    fileListContainer.style.marginTop = '1rem';
    fileInput.parentNode.appendChild(fileListContainer);

    let currentUser = null;

    function renderFileList(userId) {
        fileListContainer.innerHTML = '<li>Loading...</li>';
        const userDocsRef = storageRef(storage, `students/${userId}/documents/`);
        listAll(userDocsRef).then(async (res) => {
            if (res.items.length === 0) {
                fileListContainer.innerHTML = '<li>No files uploaded yet.</li>';
                return;
            }
            fileListContainer.innerHTML = '';
            for (const itemRef of res.items) {
                const url = await getDownloadURL(itemRef);
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.alignItems = 'center';
                li.style.gap = '8px';
                const a = document.createElement('a');
                a.href = url;
                a.textContent = itemRef.name;
                a.target = '_blank';
                li.appendChild(a);
                // Delete button
                const delBtn = document.createElement('button');
                delBtn.textContent = 'Delete';
                delBtn.className = 'btn btn-sm btn-danger';
                delBtn.onclick = async () => {
                    if (confirm('Delete this file?')) {
                        await deleteObject(itemRef);
                        renderFileList(userId);
                    }
                };
                li.appendChild(delBtn);
                fileListContainer.appendChild(li);
            }
        }).catch(err => {
            fileListContainer.innerHTML = `<li>Error loading files: ${err.message}</li>`;
        });
    }

    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            renderFileList(user.uid);
        } else {
            currentUser = null;
            fileListContainer.innerHTML = '<li>Please log in to view your files.</li>';
        }
    });

    // Intercept the upload form submit for image upload
    uploadDocumentForm.addEventListener('submit', async (e) => {
        if (!currentUser) return;
        const file = fileInput.files[0];
        if (!file) return;
        const userId = currentUser.uid;
        const filePath = `students/${userId}/documents/${Date.now()}_${file.name}`;
        const fileRef = storageRef(storage, filePath);
        const uploadTask = uploadBytesResumable(fileRef, file);
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
        uploadTask.on('state_changed',
            snapshot => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                uploadBtn.textContent = `Uploading... ${progress.toFixed(0)}%`;
            },
            error => {
                alert('Upload failed: ' + error.message);
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload Document';
            },
            async () => {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload Document';
                renderFileList(userId);
            }
        );
    });
}

// Call this after DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupUserImageUpload);
} else {
    setupUserImageUpload();
} 

function renderAttendanceMarkingTable() {
  if (!attendanceMarkingTable) return;
  const date = attendanceDateInput.value;
  let html = `<table class="table table-bordered" style="width:100%;min-width:400px;">
    <thead><tr><th>Name</th><th>Email</th><th>Attendance</th></tr></thead><tbody>`;
  studentsCache.forEach(s => {
    const status = (attendanceData[s.id] && attendanceData[s.id][date]) || '';
    html += `<tr>
      <td>${s.name}</td>
      <td>${s.email}</td>
      <td>
        <select data-student-id="${s.id}" class="attendance-select" style="padding:0.3rem 0.5rem;">
          <option value="">--</option>
          <option value="present" ${status==='present'?'selected':''}>Present</option>
          <option value="absent" ${status==='absent'?'selected':''}>Absent</option>
        </select>
      </td>
    </tr>`;
  });
  html += '</tbody></table>';
  attendanceMarkingTable.innerHTML = html;
  // Add event listeners
  document.querySelectorAll('.attendance-select').forEach(sel => {
    sel.addEventListener('change', function() {
      const studentId = this.getAttribute('data-student-id');
      if (!attendanceData[studentId]) attendanceData[studentId] = {};
      attendanceData[studentId][date] = this.value;
    });
  });
}

async function saveAttendanceForDate() {
  const date = attendanceDateInput.value;
  if (!date) return;
  attendanceSaveStatus.textContent = 'Saving...';
  try {
    const updates = {};
    studentsCache.forEach(s => {
      if (!attendanceData[s.id]) attendanceData[s.id] = {};
      const status = attendanceData[s.id][date] || '';
      updates[`students/${s.id}/attendance/${date}`] = status;
    });
    await update(ref(database), updates);
    attendanceSaveStatus.textContent = 'Attendance saved!';
    setTimeout(() => attendanceSaveStatus.textContent = '', 2000);
  } catch (e) {
    attendanceSaveStatus.textContent = 'Error saving attendance.';
  }
}

function renderLowAttendanceList() {
  if (!lowAttendanceList) return;
  // Calculate attendance % for each student
  const lowList = studentsCache.map(s => {
    const att = s.attendance || {};
    const totalDays = Object.keys(att).length;
    const presentDays = Object.values(att).filter(v => v === 'present').length;
    const percent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      percent,
      totalDays,
      presentDays
    };
  }).filter(s => s.percent < lowAttendanceThreshold).sort((a, b) => a.percent - b.percent);
  let html = `<table class="table table-bordered" style="width:100%;min-width:400px;">
    <thead><tr><th>Name</th><th>Email</th><th>Attendance %</th><th>Status</th></tr></thead><tbody>`;
  lowList.forEach(s => {
    html += `<tr>
      <td>${s.name}</td>
      <td>${s.email}</td>
      <td>${s.percent}%</td>
      <td><span class="badge badge-warning">⚠️ Low Attendance</span></td>
    </tr>`;
  });
  html += '</tbody></table>';
  lowAttendanceList.innerHTML = html;
} 