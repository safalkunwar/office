import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, get, push } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-storage.js";
import { firebaseConfig } from './config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

const totalVisitors = document.getElementById('totalVisitors');
const visitorsFilter = document.getElementById('visitorsFilter');
const visitorForm = document.getElementById('visitorForm');
const visitorFormMsg = document.getElementById('visitorFormMsg');

let allVisitors = [];

function getDateRange(filter) {
    const now = new Date();
    let start, end = new Date(now);
    switch (filter) {
        case 'today':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week':
            start = new Date(now);
            start.setDate(now.getDate() - now.getDay());
            break;
        case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'year':
            start = new Date(now.getFullYear(), 0, 1);
            break;
        default:
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    return { start, end };
}

async function fetchVisitors() {
    const visitorsRef = ref(db, 'visitors');
    const snapshot = await get(visitorsRef);
    allVisitors = [];
    if (snapshot.exists()) {
        snapshot.forEach(child => {
            allVisitors.push({ id: child.key, ...child.val() });
        });
    }
    updateVisitorsUI();
}

function updateVisitorsUI() {
    const filter = visitorsFilter.value;
    const { start, end } = getDateRange(filter);
    const filtered = allVisitors.filter(v => {
        const dt = new Date(v.dateTime);
        return dt >= start && dt <= end;
    });
    totalVisitors.textContent = filtered.length;
}

if (visitorsFilter) visitorsFilter.addEventListener('change', updateVisitorsUI);

document.addEventListener('DOMContentLoaded', fetchVisitors);

document.addEventListener('DOMContentLoaded', function() {
    if (visitorForm) {
        visitorForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            visitorFormMsg.innerHTML = '';
            const name = visitorForm.visitorName.value.trim();
            const contact = visitorForm.visitorContact.value.trim();
            const purpose = visitorForm.visitorPurpose.value.trim();
            const staff = visitorForm.visitorStaff.value.trim();
            const dateTime = visitorForm.visitorDateTime.value;
            const photoFile = visitorForm.visitorPhoto.files[0];
            if (!name || !contact || !purpose || !dateTime) {
                showMsg('Please fill all required fields.', false);
                return;
            }
            let photoUrl = '';
            try {
                if (photoFile) {
                    const photoRef = storageRef(storage, `visitors/${Date.now()}_${photoFile.name}`);
                    await uploadBytes(photoRef, photoFile);
                    photoUrl = await getDownloadURL(photoRef);
                }
                const newVisitor = { name, contact, purpose, staff, dateTime, photoUrl };
                const visitorsRef = ref(db, 'visitors');
                await push(visitorsRef, newVisitor);
                showMsg('Visitor added successfully!', true);
                visitorForm.reset();
                fetchVisitors();
            } catch (err) {
                showMsg('Error saving visitor. Please try again.', false);
            }
        });
    }
});

function showMsg(msg, success) {
    visitorFormMsg.innerHTML = `<div class="${success ? 'success-message' : 'error-message'}">${msg}</div>`;
} 