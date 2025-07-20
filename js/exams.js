// Remove all import statements and use global firebase object
// Assumes firebaseConfig is available globally (from config.js or inline in HTML)

// Use ES module imports for Firebase v9+
import { getDatabase, ref, set, push, onValue, get, remove } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js';

// Use the initialized app from window (set in exams.html)
const app = window.firebaseApp;
const db = window.firebaseDb;
const auth = window.firebaseAuth;

// Fix: define currentViewedExamId at top-level
let currentViewedExamId = null;

document.addEventListener('DOMContentLoaded', function() {
  // Initialize Firebase
  // const app = firebase.initializeApp(firebaseConfig);
  // const db = firebase.database();
  // const auth = firebase.auth();

  // DOM Elements
  const examsList = document.getElementById('examsList');
  const createExamModal = document.getElementById('createExamModal');
  const createExamForm = document.getElementById('createExamForm');
  const searchInput = document.getElementById('searchInput');
  const examTypeFilter = document.getElementById('examTypeFilter');
  const statusFilter = document.getElementById('statusFilter');
  const dateFilter = document.getElementById('dateFilter');
  const upcomingExamsGrid = document.getElementById('upcomingExamsGrid');
  const totalExamsElement = document.getElementById('totalExams');
  const upcomingExamsElement = document.getElementById('upcomingExams');
  const assignedStudentsElement = document.getElementById('assignedStudents');
  const completedExamsElement = document.getElementById('completedExams');
  const assignStudentModal = document.getElementById('assignStudentModal');
  const assignStudentForm = document.getElementById('assignStudentForm');
  const assignExamSelect = document.getElementById('assignExamSelect');
  const assignStudentSelect = document.getElementById('assignStudentSelect');
  const examDetailsModal = document.getElementById('examDetailsModal');
  const examDetailsContent = document.getElementById('examDetailsContent');
  const themeToggle = document.querySelector('.theme-toggle');
  const themeIcon = themeToggle?.querySelector('i');

  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
      if (themeIcon) {
          themeIcon.classList.replace('fa-moon', 'fa-sun');
      }
  }

  // Theme Toggle Functionality
  if (themeToggle) {
      themeToggle.addEventListener('click', () => {
          document.body.classList.toggle('dark-mode');
          const isDarkMode = document.body.classList.contains('dark-mode');
          
          if (themeIcon) {
              if (isDarkMode) {
                  themeIcon.classList.replace('fa-moon', 'fa-sun');
                  localStorage.setItem('theme', 'dark');
              } else {
                  themeIcon.classList.replace('fa-sun', 'fa-moon');
                  localStorage.setItem('theme', 'light');
              }
          }
      });
  }

  // Mobile Menu Toggle
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navMenu = document.querySelector('.navbar-right ul');

  if (mobileMenuBtn && navMenu) {
      mobileMenuBtn.addEventListener('click', () => {
          navMenu.classList.toggle('active');
          const isExpanded = navMenu.classList.contains('active');
          mobileMenuBtn.setAttribute('aria-expanded', isExpanded);
      });

      // Close mobile menu when clicking outside
      document.addEventListener('click', (e) => {
          if (!navMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
              navMenu.classList.remove('active');
              mobileMenuBtn.setAttribute('aria-expanded', 'false');
          }
      });
  }

  // Modal Functions
  function openCreateExamModal() {
      if (createExamModal) {
          createExamModal.style.display = 'flex';
          // Set default date to tomorrow
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);
          const examDateInput = document.getElementById('examDate');
          if (examDateInput) {
              examDateInput.value = tomorrow.toISOString().slice(0, 16);
          }
      }
  }

  function closeCreateExamModal() {
      if (createExamModal) {
          createExamModal.style.display = 'none';
          if (createExamForm) {
              createExamForm.reset();
          }
      }
  }

  function openAssignStudentModal() {
      if (assignStudentModal) {
          assignStudentModal.style.display = 'flex';
          loadExamOptions();
          loadStudentOptions();
      }
  }

  function closeAssignStudentModal() {
      if (assignStudentModal) {
          assignStudentModal.style.display = 'none';
          if (assignStudentForm) {
              assignStudentForm.reset();
          }
      }
  }

  function openExamDetailsModal() {
      if (examDetailsModal) {
          examDetailsModal.style.display = 'flex';
      }
  }

  function closeExamDetailsModal() {
      if (examDetailsModal) {
          examDetailsModal.style.display = 'none';
      }
  }

  // Close modals when clicking outside
  window.addEventListener('click', (e) => {
      if (e.target === createExamModal) {
          closeCreateExamModal();
      }
      if (e.target === assignStudentModal) {
          closeAssignStudentModal();
      }
      if (e.target === examDetailsModal) {
          closeExamDetailsModal();
      }
  });

  // Form Submission
  if (createExamForm) {
      createExamForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const examData = {
              name: document.getElementById('examName')?.value || '',
              type: document.getElementById('examType')?.value || '',
              date: document.getElementById('examDate')?.value || '',
              duration: parseInt(document.getElementById('examDuration')?.value || '0'),
              venue: document.getElementById('examVenue')?.value || '',
              instructor: document.getElementById('examInstructor')?.value || '',
              description: document.getElementById('examDescription')?.value || '',
              maxStudents: parseInt(document.getElementById('examMaxStudents')?.value || '0') || null,
              fee: parseFloat(document.getElementById('examFee')?.value || '0') || null,
              status: 'upcoming',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
          };

          try {
              // Show loading state
              const submitBtn = createExamForm.querySelector('button[type="submit"]');
              const originalText = submitBtn?.textContent || 'Create Exam';
              if (submitBtn) {
                  submitBtn.textContent = 'Creating...';
                  submitBtn.disabled = true;
              }

              const examsRef = ref(db, 'exams');
              const newExamRef = push(examsRef, examData);
              await set(newExamRef, examData);
              
              showSuccess('Exam created successfully!');
              closeCreateExamModal();
              
              // Reset button
              if (submitBtn) {
                  submitBtn.textContent = originalText;
                  submitBtn.disabled = false;
              }
          } catch (error) {
              showError('Failed to create exam. Please try again.');
              console.error('Error creating exam:', error);
              
              // Reset button
              const submitBtn = createExamForm.querySelector('button[type="submit"]');
              if (submitBtn) {
                  submitBtn.textContent = 'Create Exam';
                  submitBtn.disabled = false;
              }
          }
      });
  }

  // --- Enhance Assign Student Modal for Multiple Students and Category ---
  // Update loadStudentOptions to support categories and multiple selection
  async function loadStudentOptions() {
      try {
          const studentsRef = ref(db, 'students');
          const snapshot = await get(studentsRef);
          if (assignStudentSelect) {
              assignStudentSelect.innerHTML = '';
              assignStudentSelect.multiple = true; // Allow multiple selection
              assignStudentSelect.size = 6; // Show more options
          }
          // Collect categories
          let categories = new Set();
          let students = [];
          if (snapshot.exists()) {
              snapshot.forEach((childSnapshot) => {
                  const student = {
                      id: childSnapshot.key,
                      ...childSnapshot.val()
                  };
                  students.push(student);
                  if (student.category) categories.add(student.category);
              });
          }
          // Add category filter above select
          let categoryFilter = document.getElementById('studentCategoryFilter');
          if (!categoryFilter) {
              categoryFilter = document.createElement('select');
              categoryFilter.id = 'studentCategoryFilter';
              categoryFilter.className = 'form-control';
              categoryFilter.style.marginBottom = '0.5rem';
              assignStudentSelect.parentNode.insertBefore(categoryFilter, assignStudentSelect);
              categoryFilter.addEventListener('change', () => {
                  renderStudentOptions(students, categoryFilter.value);
              });
          }
          categoryFilter.innerHTML = '<option value="all">All Categories</option>' +
              Array.from(categories).map(cat => `<option value="${cat}">${cat}</option>`).join('');
          renderStudentOptions(students, categoryFilter.value);
      } catch (error) {
          console.error('Error loading student options:', error);
      }
  }
  // Helper to render students by category
  function renderStudentOptions(students, category) {
      if (!assignStudentSelect) return;
      assignStudentSelect.innerHTML = '';
      let filtered = students.filter(s => category === 'all' || s.category === category);
      filtered.forEach(student => {
          const option = document.createElement('option');
          option.value = student.id;
          option.textContent = `${student.name} (${student.email})${student.category ? ' - ' + student.category : ''}`;
          assignStudentSelect.appendChild(option);
      });
  }

  // --- Update Assign Student Form Submission for Multiple Students ---
  if (assignStudentForm) {
      assignStudentForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          // Get all selected students
          const selectedOptions = Array.from(assignStudentSelect.selectedOptions).map(opt => opt.value);
          const examId = assignExamSelect?.value || '';
          const status = document.getElementById('assignStatus')?.value || 'confirmed';
          const notes = document.getElementById('assignNotes')?.value || '';
          const assignedAt = new Date().toISOString();
          if (!examId || selectedOptions.length === 0) {
              showError('Please select an exam and at least one student.');
              return;
          }
          try {
              const submitBtn = assignStudentForm.querySelector('button[type="submit"]');
              const originalText = submitBtn?.textContent || 'Assign Student';
              if (submitBtn) {
                  submitBtn.textContent = 'Assigning...';
                  submitBtn.disabled = true;
              }
              const assignmentsRef = ref(db, 'examAssignments');
              // Assign each selected student
              for (const studentId of selectedOptions) {
                  const assignmentData = {
                      examId,
                      studentId,
                      status,
                      notes,
                      assignedAt
                  };
                  await push(assignmentsRef, assignmentData);
              }
              showSuccess('Student(s) assigned to exam successfully!');
              closeAssignStudentModal();
              if (submitBtn) {
                  submitBtn.textContent = originalText;
                  submitBtn.disabled = false;
              }
          } catch (error) {
              showError('Failed to assign student(s). Please try again.');
              console.error('Error assigning student(s):', error);
              const submitBtn = assignStudentForm.querySelector('button[type="submit"]');
              if (submitBtn) {
                  submitBtn.textContent = 'Assign Student';
                  submitBtn.disabled = false;
              }
          }
      });
  }

  // Load and Display Exams
  async function loadExams() {
      const examsRef = ref(db, 'exams');
      onValue(examsRef, async (snapshot) => {
          if (examsList) {
              examsList.innerHTML = '';
          }
          
          if (snapshot.exists()) {
              const exams = [];
              snapshot.forEach((childSnapshot) => {
                  exams.push({
                      id: childSnapshot.key,
                      ...childSnapshot.val()
                  });
              });
              
              // Sort by date (earliest first)
              exams.sort((a, b) => new Date(a.date) - new Date(b.date));
              
              displayExams(exams);
              updateExamStats(exams);
              await displayUpcomingExams(exams);
          } else {
              if (examsList) {
                  examsList.innerHTML = '<tr><td colspan="8" class="no-data">No exams found</td></tr>';
              }
              updateExamStats([]);
              await displayUpcomingExams([]);
          }
      });
  }

  // --- Notify Students Modal Helper ---
  function showNotifyModal(exams) {
      let modal = document.getElementById('notifyModal');
      if (!modal) {
          modal = document.createElement('div');
          modal.id = 'notifyModal';
          modal.className = 'modal';
          modal.innerHTML = `<div class=\"modal-content large\"><div class=\"modal-header\"><h2><i class='fas fa-bell'></i> Notify Students</h2><button class=\"close-btn\" onclick=\"document.getElementById('notifyModal').style.display='none'\"><i class=\"fas fa-times\"></i></button></div><div id=\"notifyModalBody\"></div></div>`;
          document.body.appendChild(modal);
      }
      let body = modal.querySelector('#notifyModalBody');
      let examOptions = exams.map(e => `<option value=\"${e.id}\">${e.name} (${new Date(e.date).toLocaleString()})</option>`).join('');
      body.innerHTML = `<label>Select Exam:</label><select id=\"notifyExamSelect\">${examOptions}</select><div id=\"notifyTemplateBox\"></div>`;
      let select = body.querySelector('#notifyExamSelect');
      select.addEventListener('change', () => updateNotifyTemplate(exams, select.value));
      updateNotifyTemplate(exams, select.value);
      modal.style.display = 'flex';
  }
  function updateNotifyTemplate(exams, examId) {
      let exam = exams.find(e => e.id === examId) || exams[0];
      let template = `Subject: Upcoming Exam Notification\n\nDear [Student Name],\n\nThis is to inform you that your upcoming exam for ${exam.name} is scheduled on ${new Date(exam.date).toLocaleDateString()} at ${new Date(exam.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}. Please be prepared and ensure timely attendance.\n\nFor any queries, feel free to contact your coordinator.\n\nBest regards,\nAdmin Team`;
      let box = document.getElementById('notifyTemplateBox');
      let encoded = encodeURIComponent(template);
      box.innerHTML = `<textarea id='notifyMsg' rows='8' style='width:100%;margin-bottom:1rem;'>${template}</textarea><div style='display:flex;gap:1rem;flex-wrap:wrap;'><button class='btn btn-primary' onclick='navigator.clipboard.writeText(document.getElementById("notifyMsg").value)'>Copy</button><a class='btn btn-secondary' href='mailto:?subject=Upcoming Exam Notification&body=${encoded}' target='_blank'>Send via Email</a><a class='btn btn-secondary' href='https://wa.me/?text=${encoded}' target='_blank'>Send via WhatsApp</a></div>`;
  }

  // --- Sort/highlight high-priority and incomplete exams ---
  function displayExams(exams) {
      if (!examsList) return;
      examsList.innerHTML = '';
      // Sort: high-priority, incomplete, then others by date
      exams = exams.slice();
      exams.sort((a, b) => {
          // High priority first
          if ((b.priority === 'high') - (a.priority === 'high')) return (b.priority === 'high') - (a.priority === 'high');
          // Incomplete next
          if ((b.status === 'incomplete') - (a.status === 'incomplete')) return (b.status === 'incomplete') - (a.status === 'incomplete');
          // Then by date
          return new Date(a.date) - new Date(b.date);
      });
      exams.forEach(exam => {
          const row = document.createElement('tr');
          const examDate = new Date(exam.date);
          const status = getExamStatus(examDate, exam.duration);
          const isUrgent = isExamUrgent(examDate);
          // Highlight badges
          let priorityBadge = exam.priority === 'high' ? `<span class='priority-badge high'>High</span>` : '';
          let incompleteBadge = exam.status === 'incomplete' ? `<span class='status-badge incomplete'>Incomplete</span>` : '';
          row.innerHTML = `
              <td>
                  <div class=\"exam-info\">
                      <strong>${exam.name}</strong>
                      ${exam.description ? `<small>${exam.description}</small>` : ''}
                  </div>
              </td>
              <td><span class=\"exam-type-badge ${exam.type ? exam.type.toLowerCase() : ''}\">${exam.type || ''}</span> ${priorityBadge}</td>
              <td>
                  <div class=\"exam-date-info\">
                      <span class=\"exam-date\">${examDate.toLocaleDateString()}</span>
                      <span class=\"exam-time\">${examDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      ${isUrgent ? '<span class=\"urgent-badge\">Urgent</span>' : ''}
                  </div>
              </td>
              <td>${exam.duration} minutes</td>
              <td>${exam.venue || 'TBD'}</td>
              <td>${exam.instructor || 'TBD'}</td>
              <td><span class=\"status-badge ${status.toLowerCase()}\">${status}</span> ${incompleteBadge}</td>
              <td>
                  <div class=\"action-buttons\">
                      <button class=\"btn-icon\" onclick=\"viewExamDetails('${exam.id}')\" aria-label=\"View exam details\">
                          <i class=\"fas fa-eye\"></i>
                      </button>
                      <button class=\"btn-icon\" onclick=\"editExam('${exam.id}')\" aria-label=\"Edit exam\">
                          <i class=\"fas fa-edit\"></i>
                      </button>
                      <button class=\"btn-icon\" onclick=\"deleteExam('${exam.id}')\" aria-label=\"Delete exam\">
                          <i class=\"fas fa-trash\"></i>
                      </button>
                  </div>
              </td>
          `;
          examsList.appendChild(row);
      });
  }

  // Display Upcoming Exams Grid
  // Patch displayUpcomingExams to show assigned student count per exam
  async function displayUpcomingExams(exams) {
      if (!upcomingExamsGrid) return;
      
      // Fetch all assignments
      let assignments = [];
      try {
          const assignmentsRef = ref(db, 'examAssignments');
          const snapshot = await get(assignmentsRef);
          if (snapshot.exists()) {
              snapshot.forEach(child => assignments.push(child.val()));
          }
      } catch (e) {}
      // Map examId to assigned count
      const assignedMap = {};
      assignments.forEach(a => {
          if (!assignedMap[a.examId]) assignedMap[a.examId] = 0;
          assignedMap[a.examId]++;
      });

      const upcomingExams = exams.filter(exam => {
          const examDate = new Date(exam.date);
          const now = new Date();
          const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
          return examDate > now && examDate <= thirtyDaysFromNow;
      }).slice(0, 6); // Show only first 6 upcoming exams
      
      if (upcomingExams.length === 0) {
          upcomingExamsGrid.innerHTML = `
              <div class="no-upcoming-exams">
                  <i class="fas fa-calendar-check"></i>
                  <p>No upcoming exams in the next 30 days</p>
              </div>
          `;
          return;
      }
      
      upcomingExamsGrid.innerHTML = upcomingExams.map(exam => createExamCardWithAssigned(exam, assignedMap[exam.id] || 0)).join('');
      setupExamCardCountdowns();
  }

  // Create Exam Card
  function createExamCard(exam) {
      const examDate = new Date(exam.date);
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
      const isUrgent = examDate <= sevenDaysFromNow;
      const isThisWeek = examDate <= sevenDaysFromNow;
      
      const timeUntilExam = examDate - now;
      const days = Math.floor(timeUntilExam / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeUntilExam % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      let countdownText = '';
      if (days > 0) {
          countdownText = `${days} day${days !== 1 ? 's' : ''}`;
      } else if (hours > 0) {
          countdownText = `${hours} hour${hours !== 1 ? 's' : ''}`;
      } else {
          countdownText = 'Less than 1 hour';
      }
      
      return `
          <div class="exam-card ${isUrgent ? 'urgent' : ''} ${isThisWeek ? 'this-week' : ''}" data-exam-id="${exam.id}">
              <div class="exam-header">
                  <div class="exam-title">${exam.name}</div>
                  <div class="exam-type">${exam.type}</div>
                  <div class="exam-badge ${isUrgent ? 'urgent' : isThisWeek ? 'this-week' : 'upcoming'}">
                      ${isUrgent ? 'Urgent' : isThisWeek ? 'This Week' : 'Upcoming'}
                  </div>
              </div>
              <div class="exam-details">
                  <div class="exam-detail">
                      <i class="fas fa-calendar"></i>
                      <span>${examDate.toLocaleDateString()}</span>
                  </div>
                  <div class="exam-detail">
                      <i class="fas fa-clock"></i>
                      <span>${examDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div class="exam-detail">
                      <i class="fas fa-hourglass-half"></i>
                      <span>${exam.duration} min</span>
                  </div>
                  ${exam.venue ? `
                      <div class="exam-detail">
                          <i class="fas fa-map-marker-alt"></i>
                          <span>${exam.venue}</span>
                      </div>
                  ` : ''}
              </div>
              <div class="countdown" data-exam-date="${exam.date}">
                  <div class="time-left">${countdownText}</div>
                  <div class="countdown-label">remaining</div>
              </div>
              <div class="exam-actions">
                  <button class="btn-sm btn-primary" onclick="viewExamDetails('${exam.id}')">
                      <i class="fas fa-eye"></i> View
                  </button>
                  <button class="btn-sm btn-secondary" onclick="assignStudentsToExam('${exam.id}')">
                      <i class="fas fa-user-plus"></i> Assign
                  </button>
              </div>
          </div>
      `;
  }

  // Helper to create exam card with assigned count
  function createExamCardWithAssigned(exam, assignedCount) {
      const examDate = new Date(exam.date);
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
      const isUrgent = examDate <= sevenDaysFromNow;
      const isThisWeek = examDate <= sevenDaysFromNow;
      const timeUntilExam = examDate - now;
      const days = Math.floor(timeUntilExam / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeUntilExam % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      let countdownText = '';
      if (days > 0) {
          countdownText = `${days} day${days !== 1 ? 's' : ''}`;
      } else if (hours > 0) {
          countdownText = `${hours} hour${hours !== 1 ? 's' : ''}`;
      } else {
          countdownText = 'Less than 1 hour';
      }
      return `
          <div class="exam-card ${isUrgent ? 'urgent' : ''} ${isThisWeek ? 'this-week' : ''}" data-exam-id="${exam.id}">
              <div class="exam-header">
                  <div class="exam-title">${exam.name}</div>
                  <div class="exam-type">${exam.type}</div>
                  <div class="exam-badge ${isUrgent ? 'urgent' : isThisWeek ? 'this-week' : 'upcoming'}">
                      ${isUrgent ? 'Urgent' : isThisWeek ? 'This Week' : 'Upcoming'}
                  </div>
              </div>
              <div class="exam-details">
                  <div class="exam-detail">
                      <i class="fas fa-calendar"></i>
                      <span>${examDate.toLocaleDateString()}</span>
                  </div>
                  <div class="exam-detail">
                      <i class="fas fa-clock"></i>
                      <span>${examDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div class="exam-detail">
                      <i class="fas fa-hourglass-half"></i>
                      <span>${exam.duration} min</span>
                  </div>
                  ${exam.venue ? `
                      <div class="exam-detail">
                          <i class="fas fa-map-marker-alt"></i>
                          <span>${exam.venue}</span>
                      </div>
                  ` : ''}
                  <div class="exam-detail">
                      <i class="fas fa-users"></i>
                      <span>Assigned: <strong>${assignedCount}</strong></span>
                  </div>
              </div>
              <div class="countdown" data-exam-date="${exam.date}">
                  <div class="time-left">${countdownText}</div>
                  <div class="countdown-label">remaining</div>
              </div>
              <div class="exam-actions">
                  <button class="btn-sm btn-primary" onclick="viewExamDetails('${exam.id}')">
                      <i class="fas fa-eye"></i> View
                  </button>
                  <button class="btn-sm btn-secondary" onclick="assignStudentsToExam('${exam.id}')">
                      <i class="fas fa-user-plus"></i> Assign
                  </button>
              </div>
          </div>
      `;
  }

  // Setup countdown timers for exam cards
  function setupExamCardCountdowns() {
      const countdownElements = document.querySelectorAll('.countdown');
      
      countdownElements.forEach(element => {
          const examDate = new Date(element.dataset.examDate);
          
          const updateCountdown = () => {
              const now = new Date();
              const timeUntilExam = examDate - now;
              
              if (timeUntilExam <= 0) {
                  element.innerHTML = '<div class="time-left">Started</div><div class="countdown-label">exam in progress</div>';
                  return;
              }
              
              const days = Math.floor(timeUntilExam / (1000 * 60 * 60 * 24));
              const hours = Math.floor((timeUntilExam % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const minutes = Math.floor((timeUntilExam % (1000 * 60 * 60)) / (1000 * 60));
              
              let countdownText = '';
              if (days > 0) {
                  countdownText = `${days} day${days !== 1 ? 's' : ''}`;
              } else if (hours > 0) {
                  countdownText = `${hours} hour${hours !== 1 ? 's' : ''}`;
              } else {
                  countdownText = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
              }
              
              const timeLeftElement = element.querySelector('.time-left');
              if (timeLeftElement) {
                  timeLeftElement.textContent = countdownText;
              }
          };
          
          // Update immediately and then every minute
          updateCountdown();
          setInterval(updateCountdown, 60000);
      });
  }

  // Update Exam Statistics to count assigned students from assignments
  async function updateExamStats(exams) {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
      if (totalExamsElement) totalExamsElement.textContent = '...';
      if (upcomingExamsElement) upcomingExamsElement.textContent = '...';
      if (assignedStudentsElement) assignedStudentsElement.textContent = '...';
      if (completedExamsElement) completedExamsElement.textContent = '...';
      const totalExams = exams.length;
      const upcomingExams = exams.filter(exam => {
          const examDate = new Date(exam.date);
          return examDate > now && examDate <= sevenDaysFromNow;
      }).length;
      const completedExams = exams.filter(exam => {
          const examDate = new Date(exam.date);
          const endTime = new Date(examDate.getTime() + exam.duration * 60000);
          return now > endTime;
      }).length;
      // Fetch all assignments and count unique studentIds
      let assignedStudents = 0;
      try {
          const assignmentsRef = ref(db, 'examAssignments');
          const snapshot = await get(assignmentsRef);
          if (snapshot.exists()) {
              const studentSet = new Set();
              snapshot.forEach(child => {
                  const assignment = child.val();
                  if (assignment && assignment.studentId) {
                      studentSet.add(assignment.studentId);
                  }
              });
              assignedStudents = studentSet.size;
          }
      } catch (e) {}
      if (totalExamsElement) totalExamsElement.textContent = totalExams;
      if (upcomingExamsElement) upcomingExamsElement.textContent = upcomingExams;
      if (assignedStudentsElement) assignedStudentsElement.textContent = assignedStudents;
      if (completedExamsElement) completedExamsElement.textContent = completedExams;
  }

  // Get Exam Status
  function getExamStatus(date, duration) {
      const now = new Date();
      const endTime = new Date(date.getTime() + duration * 60000);
      
      if (now < date) {
          return 'Upcoming';
      } else if (now >= date && now <= endTime) {
          return 'Ongoing';
      } else {
          return 'Completed';
      }
  }

  // Check if exam is urgent (within 7 days)
  function isExamUrgent(date) {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
      return date <= sevenDaysFromNow;
  }

  // Filter Exams
  function filterExams() {
      if (!searchInput || !examsList) return;
      
      const searchTerm = searchInput.value.toLowerCase();
      const selectedType = examTypeFilter?.value || 'all';
      const selectedStatus = statusFilter?.value || 'all';
      const selectedDate = dateFilter?.value || 'all';
      
      const rows = examsList.getElementsByTagName('tr');
      Array.from(rows).forEach(row => {
          const cells = row.getElementsByTagName('td');
          if (cells.length < 8) return; // Skip header or empty rows
          
          const examName = cells[0].textContent.toLowerCase();
          const examType = cells[1].querySelector('.exam-type-badge')?.textContent || '';
          const examDate = cells[2].textContent;
          const status = cells[6].querySelector('.status-badge')?.textContent || '';
          
          const matchesSearch = examName.includes(searchTerm);
          const matchesType = selectedType === 'all' || examType.toLowerCase() === selectedType.toLowerCase();
          const matchesStatus = selectedStatus === 'all' || status.toLowerCase() === selectedStatus.toLowerCase();
          const matchesDate = selectedDate === 'all' || matchesDateFilter(examDate, selectedDate);
          
          row.style.display = matchesSearch && matchesType && matchesStatus && matchesDate ? '' : 'none';
      });
  }

  // Date filter helper
  function matchesDateFilter(examDateText, filterType) {
      const examDate = new Date(examDateText);
      const now = new Date();
      
      switch (filterType) {
          case 'today':
              return examDate.toDateString() === now.toDateString();
          case 'week':
              const weekFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
              return examDate >= now && examDate <= weekFromNow;
          case 'month':
              const monthFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
              return examDate >= now && examDate <= monthFromNow;
          default:
              return true;
      }
  }

  function resetFilters() {
      if (searchInput) searchInput.value = '';
      if (examTypeFilter) examTypeFilter.value = 'all';
      if (statusFilter) statusFilter.value = 'all';
      if (dateFilter) dateFilter.value = 'all';
      filterExams();
  }

  // Event Listeners for Filters
  if (searchInput) {
      searchInput.addEventListener('input', filterExams);
  }
  if (examTypeFilter) {
      examTypeFilter.addEventListener('change', filterExams);
  }
  if (statusFilter) {
      statusFilter.addEventListener('change', filterExams);
  }
  if (dateFilter) {
      dateFilter.addEventListener('change', filterExams);
  }

  // Utility Functions
  function showSuccess(message) {
      const successDiv = document.createElement('div');
      successDiv.className = 'success-message visible';
      successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
      const content = document.querySelector('.content');
      if (content) {
          content.prepend(successDiv);
          setTimeout(() => successDiv.remove(), 3000);
      }
  }

  // --- 5. Fallback UI for errors ---
  function showError(message) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message visible';
      errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
      const content = document.querySelector('.content');
      if (content) {
          content.prepend(errorDiv);
          setTimeout(() => errorDiv.remove(), 3000);
      }
  }

  // View Exam Details
  async function viewExamDetails(id) {
      currentViewedExamId = id;
      try {
          const examRef = ref(db, `exams/${id}`);
          const snapshot = await get(examRef);
          
          if (snapshot.exists()) {
              const exam = snapshot.val();
              const examDate = new Date(exam.date);
              const status = getExamStatus(examDate, exam.duration);
              const isUrgent = isExamUrgent(examDate);
              
              const timeUntilExam = examDate - new Date();
              const days = Math.floor(timeUntilExam / (1000 * 60 * 60 * 24));
              const hours = Math.floor((timeUntilExam % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const minutes = Math.floor((timeUntilExam % (1000 * 60 * 60)) / (1000 * 60));
              
              let countdownText = '';
              if (days > 0) {
                  countdownText = `${days} day${days !== 1 ? '' : ''}, ${hours} hour${hours !== 1 ? '' : ''}, ${minutes} minute${minutes !== 1 ? '' : ''}`;
              } else if (hours > 0) {
                  countdownText = `${hours} hour${hours !== 1 ? '' : ''}, ${minutes} minute${minutes !== 1 ? '' : ''}`;
              } else {
                  countdownText = `${minutes} minute${minutes !== 1 ? '' : ''}`;
              }
              
              if (examDetailsContent) {
                  examDetailsContent.innerHTML = `
                      <div class="exam-details-grid">
                          <div class="exam-detail-item">
                              <h4><i class="fas fa-file-alt"></i> Exam Information</h4>
                              <p><strong>Name:</strong> ${exam.name}</p>
                              <p><strong>Type:</strong> <span class="exam-type-badge ${exam.type.toLowerCase()}">${exam.type}</span></p>
                              <p><strong>Date:</strong> ${examDate.toLocaleDateString()}</p>
                              <p><strong>Time:</strong> ${examDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                              <p><strong>Duration:</strong> ${exam.duration} minutes</p>
                              <p><strong>Status:</strong> <span class="status-badge ${status.toLowerCase()}">${status}</span></p>
                              ${isUrgent ? '<p><strong>Priority:</strong> <span class="urgent-badge">Urgent</span></p>' : ''}
                          </div>
                          <div class="exam-detail-item">
                              <h4><i class="fas fa-map-marker-alt"></i> Location & Instructor</h4>
                              <p><strong>Venue:</strong> ${exam.venue || 'TBD'}</p>
                              <p><strong>Instructor:</strong> ${exam.instructor || 'TBD'}</p>
                              ${exam.maxStudents ? `<p><strong>Max Students:</strong> ${exam.maxStudents}</p>` : ''}
                              ${exam.fee ? `<p><strong>Fee:</strong> $${exam.fee}</p>` : ''}
                          </div>
                          <div class="exam-detail-item">
                              <h4><i class="fas fa-clock"></i> Countdown</h4>
                              <p><strong>Time Remaining:</strong> ${countdownText}</p>
                              <p><strong>Created:</strong> ${new Date(exam.createdAt).toLocaleDateString()}</p>
                              <p><strong>Last Updated:</strong> ${new Date(exam.updatedAt).toLocaleDateString()}</p>
                          </div>
                          ${exam.description ? `
                              <div class="exam-detail-item full-width">
                                  <h4><i class="fas fa-info-circle"></i> Description</h4>
                                  <p>${exam.description}</p>
                              </div>
                          ` : ''}
                      </div>
                      <div class="assigned-students">
                          <h3><i class="fas fa-users"></i> Assigned Students</h3>
                          <div class="student-list">
                              <p>Loading assigned students...</p>
                          </div>
                      </div>
                  `;
              }
              
              openExamDetailsModal();
              
              // Load assigned students
              loadAssignedStudents(id);
          } else {
              showError('Exam not found.');
          }
      } catch (error) {
          showError('Failed to load exam details.');
          console.error('Error viewing exam:', error);
      }
  }

  // Load assigned students for an exam
  async function loadAssignedStudents(examId) {
      try {
          const assignmentsRef = ref(db, 'examAssignments');
          const snapshot = await get(assignmentsRef);
          
          const studentList = document.querySelector('.student-list');
          if (!studentList) return;
          
          if (snapshot.exists()) {
              const assignments = [];
              snapshot.forEach((childSnapshot) => {
                  const assignment = childSnapshot.val();
                  if (assignment.examId === examId) {
                      assignments.push(assignment);
                  }
              });
              
              // Sort: high-priority first
              assignments.sort((a, b) => (b.priority === 'high') - (a.priority === 'high'));
              
              if (assignments.length > 0) {
                  // In a real implementation, you would fetch student details
                  // For now, we'll show placeholder data
                  studentList.innerHTML = assignments.map(assignment => `
                      <div class="student-item">
                          <div class="student-avatar">
                              <i class="fas fa-user"></i>
                          </div>
                          <div class="student-info">
                              <h4>Student ${assignment.studentId} ${assignment.priority === 'high' ? '<span class=\'priority-badge high\'>High</span>' : ''}</h4>
                              <p>Status: ${assignment.status}</p>
                          </div>
                      </div>
                  `).join('');
              } else {
                  studentList.innerHTML = '<p>No students assigned to this exam yet.</p>';
              }
          } else {
              studentList.innerHTML = '<p>No students assigned to this exam yet.</p>';
          }
      } catch (error) {
          console.error('Error loading assigned students:', error);
          const studentList = document.querySelector('.student-list');
          if (studentList) {
              studentList.innerHTML = '<p>Error loading assigned students.</p>';
          }
      }
  }

  // Edit Exam
  async function editExam(id) {
      try {
          const examRef = ref(db, `exams/${id}`);
          const snapshot = await get(examRef);
          
          if (snapshot.exists()) {
              const exam = snapshot.val();
              
              // Populate the create exam form with existing data
              const examNameInput = document.getElementById('examName');
              const examTypeInput = document.getElementById('examType');
              const examDateInput = document.getElementById('examDate');
              const examDurationInput = document.getElementById('examDuration');
              const examVenueInput = document.getElementById('examVenue');
              const examInstructorInput = document.getElementById('examInstructor');
              const examDescriptionInput = document.getElementById('examDescription');
              const examMaxStudentsInput = document.getElementById('examMaxStudents');
              const examFeeInput = document.getElementById('examFee');
              
              if (examNameInput) examNameInput.value = exam.name;
              if (examTypeInput) examTypeInput.value = exam.type;
              if (examDateInput) examDateInput.value = exam.date.slice(0, 16);
              if (examDurationInput) examDurationInput.value = exam.duration;
              if (examVenueInput) examVenueInput.value = exam.venue || '';
              if (examInstructorInput) examInstructorInput.value = exam.instructor || '';
              if (examDescriptionInput) examDescriptionInput.value = exam.description || '';
              if (examMaxStudentsInput) examMaxStudentsInput.value = exam.maxStudents || '';
              if (examFeeInput) examFeeInput.value = exam.fee || '';
              
              // Change form to update mode
              if (createExamForm) {
                  const submitBtn = createExamForm.querySelector('button[type="submit"]');
                  if (submitBtn) {
                      submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Exam';
                  }
                  
                  // Store the exam ID for updating
                  createExamForm.dataset.editExamId = id;
              }
              
              openCreateExamModal();
          } else {
              showError('Exam not found.');
          }
      } catch (error) {
          showError('Failed to load exam for editing.');
          console.error('Error editing exam:', error);
      }
  }

  // Delete Exam
  async function deleteExam(id) {
      if (confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
          try {
              const examRef = ref(db, `exams/${id}`);
              await remove(examRef);
              showSuccess('Exam deleted successfully!');
          } catch (error) {
              showError('Failed to delete exam. Please try again.');
              console.error('Error deleting exam:', error);
          }
      }
  }

  // Load exam options for assignment
  async function loadExamOptions() {
      try {
          const examsRef = ref(db, 'exams');
          const snapshot = await get(examsRef);
          
          if (assignExamSelect) {
              assignExamSelect.innerHTML = '<option value="">Choose an exam...</option>';
          }
          
          if (snapshot.exists()) {
              const exams = [];
              snapshot.forEach((childSnapshot) => {
                  const exam = {
                      id: childSnapshot.key,
                      ...childSnapshot.val()
                  };
                  
                  // Only show upcoming exams
                  const examDate = new Date(exam.date);
                  const now = new Date();
                  if (examDate > now) {
                      exams.push(exam);
                  }
              });
              
              // Sort by date
              exams.sort((a, b) => new Date(a.date) - new Date(b.date));
              
              exams.forEach(exam => {
                  if (assignExamSelect) {
                      const option = document.createElement('option');
                      option.value = exam.id;
                      option.textContent = `${exam.name} - ${new Date(exam.date).toLocaleDateString()}`;
                      assignExamSelect.appendChild(option);
                  }
              });
          }
      } catch (error) {
          console.error('Error loading exam options:', error);
      }
  }

  // Load student options for assignment
  async function loadStudentOptions() {
      try {
          const studentsRef = ref(db, 'students');
          const snapshot = await get(studentsRef);
          
          if (assignStudentSelect) {
              assignStudentSelect.innerHTML = '<option value="">Choose a student...</option>';
          }
          
          if (snapshot.exists()) {
              const students = [];
              snapshot.forEach((childSnapshot) => {
                  const student = {
                      id: childSnapshot.key,
                      ...childSnapshot.val()
                  };
                  students.push(student);
              });
              
              students.forEach(student => {
                  if (assignStudentSelect) {
                      const option = document.createElement('option');
                      option.value = student.id;
                      option.textContent = `${student.name} (${student.email})`;
                      assignStudentSelect.appendChild(option);
                  }
              });
          }
      } catch (error) {
          console.error('Error loading student options:', error);
      }
  }

  // Quick action functions
  function viewAllExams() {
      // Scroll to the exams table
      const tableContainer = document.querySelector('.table-container');
      if (tableContainer) {
          tableContainer.scrollIntoView({ behavior: 'smooth' });
      }
  }

  function assignStudentsToExams() {
      openAssignStudentModal();
  }

  // --- 3. Notify Students Modal ---
  function notifyUpcomingExams() {
      // Find upcoming exams in next 7 days
      const now = new Date();
      const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      get(ref(db, 'exams')).then(snapshot => {
          let exams = [];
          snapshot.forEach(child => {
              const exam = { id: child.key, ...child.val() };
              const examDate = new Date(exam.date);
              if (examDate > now && examDate <= sevenDays) exams.push(exam);
          });
          if (exams.length === 0) return showError('No upcoming exams to notify about');
          showNotifyModal(exams);
      }).catch(() => showError('Failed to load exams'));
  }

  // --- 2. Export to CSV ---
  function exportExamSchedule() {
      if (!examsList) return showError('No data to export');
      let rows = Array.from(examsList.querySelectorAll('tr')).filter(row => row.style.display !== 'none');
      if (rows.length === 0) return showError('No visible data to export');
      let csv = 'Exam Name,Type,Date & Time,Duration,Venue,Instructor,Status\n';
      rows.forEach(row => {
          let cells = row.querySelectorAll('td');
          if (cells.length < 8) return;
          let data = [0,1,2,3,4,5,6].map(i => '"' + (cells[i].innerText || '').replace(/"/g, '""') + '"');
          csv += data.join(',') + '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'exam_schedule.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess('Exam schedule exported as CSV!');
  }

  // Implement assignStudentsToExam
  function assignStudentsToExam(examId) {
      // Open the assign student modal and pre-select the exam
      openAssignStudentModal();
      if (assignExamSelect) {
          assignExamSelect.value = examId;
          assignExamSelect.dispatchEvent(new Event('change'));
      }
  }

  // Implement editExamFromModal
  function editExamFromModal() {
      if (currentViewedExamId) {
          editExam(currentViewedExamId);
      }
  }

  // --- Add Print/View Static Button ---
  function addPrintButton() {
      let container = document.querySelector('.filters-container .filter-options');
      if (!container || document.getElementById('printStaticBtn')) return;
      let btn = document.createElement('button');
      btn.className = 'btn btn-outline';
      btn.id = 'printStaticBtn';
      btn.innerHTML = '<i class="fas fa-print"></i> Print/View Static';
      btn.onclick = printExamTable;
      container.appendChild(btn);
  }
  // Call this after DOMContentLoaded
  addPrintButton();

  // --- Print Exam Table Handler ---
  function printExamTable() {
      if (!examsList) return showError('No data to print');
      let tableHtml = '<table style="width:100%;border-collapse:collapse"><thead>' +
        '<tr><th>Exam Name</th><th>Type</th><th>Date & Time</th><th>Duration</th><th>Venue</th><th>Instructor</th><th>Status</th></tr></thead><tbody>';
      let rows = Array.from(examsList.querySelectorAll('tr')).filter(row => row.style.display !== 'none');
      if (rows.length === 0) return showError('No visible data to print');
      rows.forEach(row => {
          let cells = row.querySelectorAll('td');
          if (cells.length < 8) return;
          tableHtml += '<tr>' + [0,1,2,3,4,5,6].map(i => `<td style="border:1px solid #ccc;padding:4px;">${cells[i].innerHTML}</td>`).join('') + '</tr>';
      });
      tableHtml += '</tbody></table>';
      let win = window.open('', '_blank');
      win.document.write('<html><head><title>Exam Table Snapshot</title><link rel="stylesheet" href="../css/style.css"><link rel="stylesheet" href="../css/admin.css"></head><body>' + tableHtml + '</body></html>');
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
  }

  // Expose globally
  window.openCreateExamModal = openCreateExamModal;
  window.closeCreateExamModal = closeCreateExamModal;
  window.openAssignStudentModal = openAssignStudentModal;
  window.closeAssignStudentModal = closeAssignStudentModal;
  window.openExamDetailsModal = openExamDetailsModal;
  window.closeExamDetailsModal = closeExamDetailsModal;
  window.viewAllExams = viewAllExams;
  window.assignStudentsToExams = assignStudentsToExams;
  window.notifyUpcomingExams = notifyUpcomingExams;
  window.exportExamSchedule = exportExamSchedule;
  window.filterExams = filterExams;
  window.resetFilters = resetFilters;
  window.assignStudentsToExam = assignStudentsToExam;
  window.editExamFromModal = editExamFromModal;
  window.viewExamDetails = viewExamDetails;
  window.editExam = editExam;
  window.deleteExam = deleteExam;

  // Initialize App
  onAuthStateChanged(auth, (user) => {
      if (user) {
          const userNameElement = document.getElementById('userName');
          if (userNameElement) {
              userNameElement.textContent = user.displayName || 'Admin';
          }
          loadExams();
      } else {
          window.location.href = '../login.html';
      }
  });

  // --- Assign Modal: Filter students by time/category ---
  const studentTimeCategory = document.getElementById('studentTimeCategory');
  if (studentTimeCategory) {
    studentTimeCategory.addEventListener('change', () => {
      if (window._allStudentsForAssign) {
        renderStudentOptions(window._allStudentsForAssign, studentTimeCategory.value);
      }
    });
  }
  // Patch loadStudentOptions to cache all students and filter by time/category
  async function loadStudentOptions() {
    try {
      const studentsRef = ref(db, 'students');
      const snapshot = await get(studentsRef);
      if (assignStudentSelect) {
        assignStudentSelect.innerHTML = '';
        assignStudentSelect.multiple = true;
        assignStudentSelect.size = 6;
      }
      let students = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const student = {
            id: childSnapshot.key,
            ...childSnapshot.val()
          };
          students.push(student);
        });
      }
      window._allStudentsForAssign = students;
      renderStudentOptions(students, studentTimeCategory ? studentTimeCategory.value : 'all');
    } catch (error) {
      console.error('Error loading student options:', error);
    }
  }
  function renderStudentOptions(students, category) {
    if (!assignStudentSelect) return;
    assignStudentSelect.innerHTML = '';
    let filtered = students.filter(s => {
      if (!category || category === 'all') return true;
      if (!s.timeCategory && !s.category) return false;
      // Support both 'timeCategory' and 'category' fields
      return (s.timeCategory && s.timeCategory === category) || (s.category && s.category === category);
    });
    filtered.forEach(student => {
      const option = document.createElement('option');
      option.value = student.id;
      option.textContent = `${student.name} (${student.email})${student.timeCategory ? ' - ' + student.timeCategory : (student.category ? ' - ' + student.category : '')}`;
      assignStudentSelect.appendChild(option);
    });
  }
  // --- Stat Card Click Handlers ---
  function statCardHandler(stat) {
    switch (stat) {
      case 'total-exams':
        filterExamsByStat('all');
        showSuccess('Showing all exams');
        break;
      case 'upcoming-exams':
        filterExamsByStat('upcoming');
        showSuccess('Showing upcoming exams (7 days)');
        break;
      case 'assigned-students':
        filterExamsByStat('assigned');
        showSuccess('Showing exams with assigned students');
        break;
      case 'completed-exams':
        filterExamsByStat('completed');
        showSuccess('Showing completed exams');
        break;
    }
  }
  function filterExamsByStat(type) {
    if (!examsList) return;
    const rows = examsList.getElementsByTagName('tr');
    Array.from(rows).forEach(row => {
      const cells = row.getElementsByTagName('td');
      if (cells.length < 8) return;
      const status = cells[6].querySelector('.status-badge')?.textContent.toLowerCase() || '';
      if (type === 'all') row.style.display = '';
      else if (type === 'upcoming') row.style.display = status === 'upcoming' ? '' : 'none';
      else if (type === 'completed') row.style.display = status === 'completed' ? '' : 'none';
      else if (type === 'assigned') row.style.display = (parseInt(cells[5].textContent) > 0) ? '' : 'none';
    });
  }
  // Attach click handlers to stat cards
  ['statTotalExams','statUpcomingExams','statAssignedStudents','statCompletedExams'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => statCardHandler(el.dataset.stat));
      el.addEventListener('keypress', e => { if (e.key === 'Enter') statCardHandler(el.dataset.stat); });
    }
  });
}); 