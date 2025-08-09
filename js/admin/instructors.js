// js/admin/instructors.js
let instructors = [];
let selectedInstructors = new Set();
let currentSort = { key: 'name', asc: true };
let currentPage = 1;
const pageSize = 5;

const instructorsList = document.getElementById('instructorsList');
const createInstructorModal = document.getElementById('createInstructorModal');
const createInstructorForm = document.getElementById('createInstructorForm');
const searchInput = document.getElementById('searchInstructorInput');
const departmentFilter = document.getElementById('departmentFilter');
const statusFilter = document.getElementById('statusFilter');
const exportBtn = document.getElementById('exportInstructorsBtn');

function openCreateInstructorModal(editId = null) {
    createInstructorModal.style.display = 'flex';
    if (editId) {
        const instructor = instructors.find(i => i.id === editId);
        document.getElementById('modalTitle').textContent = 'Edit Instructor';
        document.getElementById('instructorId').value = instructor.id;
        document.getElementById('instructorName').value = instructor.name;
        document.getElementById('instructorEmail').value = instructor.email;
        document.getElementById('instructorDepartment').value = instructor.department;
        document.getElementById('instructorStatus').value = instructor.status;
    } else {
        document.getElementById('modalTitle').textContent = 'Add Instructor';
        createInstructorForm.reset();
        document.getElementById('instructorId').value = '';
    }
}

function closeCreateInstructorModal() {
    createInstructorModal.style.display = 'none';
    createInstructorForm.reset();
}

window.openCreateInstructorModal = openCreateInstructorModal;
window.closeCreateInstructorModal = closeCreateInstructorModal;

function renderPagination(total) {
    const totalPages = Math.ceil(total / pageSize);
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-secondary'}" onclick="goToPage(${i})">${i}</button>`;
    }
    document.getElementById('instructorPagination')?.remove();
    instructorsList.insertAdjacentHTML('afterend', `<div id="instructorPagination" style="margin:10px 0;">${html}</div>`);
}
window.goToPage = function(page) {
    currentPage = page;
    displayInstructors();
};

function sortInstructors(key) {
    if (currentSort.key === key) currentSort.asc = !currentSort.asc;
    else { currentSort.key = key; currentSort.asc = true; }
    displayInstructors();
}
window.sortInstructors = sortInstructors;

function toggleSelectInstructor(id) {
    if (selectedInstructors.has(id)) selectedInstructors.delete(id);
    else selectedInstructors.add(id);
    displayInstructors();
}
window.toggleSelectInstructor = toggleSelectInstructor;

function selectAllInstructors(checked) {
    if (checked) instructors.forEach(i => selectedInstructors.add(i.id));
    else selectedInstructors.clear();
    displayInstructors();
}
window.selectAllInstructors = selectAllInstructors;

function bulkDeleteInstructors() {
    instructors = instructors.filter(i => !selectedInstructors.has(i.id));
    selectedInstructors.clear();
    displayInstructors();
}
window.bulkDeleteInstructors = bulkDeleteInstructors;

function bulkChangeStatus(status) {
    instructors.forEach(i => { if (selectedInstructors.has(i.id)) i.status = status; });
    displayInstructors();
}
window.bulkChangeStatus = bulkChangeStatus;

function viewInstructorDetails(id) {
    const i = instructors.find(x => x.id === id);
    if (!i) return;
    let modal = document.getElementById('viewInstructorModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'viewInstructorModal';
        modal.className = 'modal';
        modal.innerHTML = `<div class='modal-content'><span class='close' onclick='closeViewInstructorModal()'>&times;</span><div id='instructorDetails'></div></div>`;
        document.body.appendChild(modal);
    }
    document.getElementById('instructorDetails').innerHTML = `
        <h2>${i.name}</h2>
        <img src='${i.photo || 'https://via.placeholder.com/100'}' alt='Profile' style='width:100px;height:100px;border-radius:50%;object-fit:cover;margin-bottom:10px;'>
        <p><b>Email:</b> ${i.email}</p>
        <p><b>Department:</b> ${i.department}</p>
        <p><b>Status:</b> ${i.status}</p>
        <p><b>Added:</b> ${i.added || '-'}</p>
    `;
    modal.style.display = 'flex';
}
window.viewInstructorDetails = viewInstructorDetails;
window.closeViewInstructorModal = function() {
    document.getElementById('viewInstructorModal').style.display = 'none';
};

function toggleStatus(id) {
    const i = instructors.find(x => x.id === id);
    if (i) { i.status = i.status === 'active' ? 'inactive' : 'active'; displayInstructors(); }
}
window.toggleStatus = toggleStatus;

createInstructorForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('instructorId').value || Date.now().toString();
    const name = document.getElementById('instructorName').value;
    const email = document.getElementById('instructorEmail').value;
    const department = document.getElementById('instructorDepartment').value;
    const status = document.getElementById('instructorStatus').value;
    const photo = document.getElementById('instructorPhoto')?.files?.[0] ? URL.createObjectURL(document.getElementById('instructorPhoto').files[0]) : '';
    const added = new Date().toLocaleString();
    const existingIndex = instructors.findIndex(i => i.id === id);
    if (existingIndex > -1) {
        instructors[existingIndex] = { ...instructors[existingIndex], id, name, email, department, status, photo, added };
    } else {
        instructors.push({ id, name, email, department, status, photo, added });
    }
    closeCreateInstructorModal();
    displayInstructors();
});

function displayInstructors() {
    let filtered = instructors.filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(searchInput.value.toLowerCase()) || i.email.toLowerCase().includes(searchInput.value.toLowerCase());
        const matchesDept = departmentFilter.value === 'all' || i.department === departmentFilter.value;
        const matchesStatus = statusFilter.value === 'all' || i.status === statusFilter.value;
        return matchesSearch && matchesDept && matchesStatus;
    });
    filtered = filtered.sort((a, b) => {
        let v1 = a[currentSort.key], v2 = b[currentSort.key];
        if (typeof v1 === 'string') v1 = v1.toLowerCase();
        if (typeof v2 === 'string') v2 = v2.toLowerCase();
        if (v1 < v2) return currentSort.asc ? -1 : 1;
        if (v1 > v2) return currentSort.asc ? 1 : -1;
        return 0;
    });
    const total = filtered.length;
    const start = (currentPage - 1) * pageSize;
    const page = filtered.slice(start, start + pageSize);
    instructorsList.innerHTML = `
        <tr>
            <th><input type='checkbox' onchange='selectAllInstructors(this.checked)'></th>
            <th onclick="sortInstructors('name')">Name</th>
            <th onclick="sortInstructors('email')">Email</th>
            <th onclick="sortInstructors('department')">Department</th>
            <th onclick="sortInstructors('status')">Status</th>
            <th>Photo</th>
            <th>Actions</th>
        </tr>
        ${page.map(i => `
        <tr>
            <td><input type='checkbox' ${selectedInstructors.has(i.id) ? 'checked' : ''} onclick='toggleSelectInstructor("${i.id}")'></td>
            <td>${i.name}</td>
            <td>${i.email}</td>
            <td>${i.department}</td>
            <td><button class='btn btn-sm ${i.status === 'active' ? 'btn-success' : 'btn-warning'}' onclick='toggleStatus("${i.id}")'>${i.status}</button></td>
            <td><img src='${i.photo || 'https://via.placeholder.com/40'}' style='width:40px;height:40px;border-radius:50%;object-fit:cover;'></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewInstructorDetails('${i.id}')"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-primary" onclick="openCreateInstructorModal('${i.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteInstructor('${i.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
        `).join('')}
    `;
    renderPagination(total);
}

function deleteInstructor(id) {
    instructors = instructors.filter(i => i.id !== id);
    displayInstructors();
}
window.deleteInstructor = deleteInstructor;

searchInput.addEventListener('input', displayInstructors);
departmentFilter.addEventListener('change', displayInstructors);
statusFilter.addEventListener('change', displayInstructors);

exportBtn.addEventListener('click', function() {
    let csv = 'ID,Name,Email,Department,Status\n';
    instructors.forEach(i => {
        csv += `${i.id},${i.name},${i.email},${i.department},${i.status}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'instructors.csv';
    a.click();
    URL.revokeObjectURL(url);
});

// Demo data for UI preview
instructors = [
    { id: '1', name: 'Dr. Alice Smith', email: 'alice@university.edu', department: 'Computer Science', status: 'active' },
    { id: '2', name: 'Dr. Bob Johnson', email: 'bob@university.edu', department: 'Mathematics', status: 'inactive' },
    { id: '3', name: 'Dr. Carol Lee', email: 'carol@university.edu', department: 'Physics', status: 'active' }
];
displayInstructors(); 