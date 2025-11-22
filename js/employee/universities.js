import { db, auth } from '../firebase-init.js';
import { ref, push, set, get, query, orderByChild } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";

class UniversitiesManager {
    constructor() {
        this.universities = [];
        this.init();
    }

    init() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.loadUniversities();
                this.setupListeners();
            } else {
                window.location.href = '../../login.html';
            }
        });
    }

    setupListeners() {
        // Modal
        const modal = document.getElementById('addUniversityModal');
        const btn = document.getElementById('addUniversityBtn');
        const closeBtn = modal.querySelector('.modal-close');

        btn.addEventListener('click', () => modal.style.display = 'block');
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });

        // Form
        const form = document.getElementById('addUniversityForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addUniversity(new FormData(form));
            form.reset();
            modal.style.display = 'none';
            this.loadUniversities();
        });

        // Filters
        document.getElementById('searchUniversity').addEventListener('input', () => this.filterUniversities());
        document.getElementById('countryFilter').addEventListener('change', () => this.filterUniversities());
        document.getElementById('courseFilter').addEventListener('change', () => this.filterUniversities());
        document.getElementById('rankingFilter').addEventListener('change', () => this.filterUniversities());
    }

    async addUniversity(formData) {
        const universityData = {
            name: formData.get('name'),
            country: formData.get('country'),
            ranking: parseInt(formData.get('ranking')) || 0,
            courses: formData.get('courses').split(',').map(c => c.trim()),
            commission: parseFloat(formData.get('commission')) || 0,
            website: formData.get('website'),
            addedBy: auth.currentUser.uid,
            addedAt: Date.now()
        };

        const newRef = push(ref(db, 'universities'));
        await set(newRef, universityData);
    }

    async loadUniversities() {
        const container = document.getElementById('universitiesGrid');
        container.innerHTML = '<div class="text-center" style="grid-column: 1/-1;">Loading...</div>';

        const snapshot = await get(ref(db, 'universities'));
        this.universities = [];

        if (snapshot.exists()) {
            snapshot.forEach(child => {
                this.universities.push({ id: child.key, ...child.val() });
            });
        } else {
            // Add demo data
            await this.addDemoUniversities();
            await this.loadUniversities();
            return;
        }

        this.filterUniversities();
    }

    async addDemoUniversities() {
        const demoUniversities = [
            { name: "Harvard University", country: "USA", ranking: 1, courses: ["Computer Science", "Business", "Medicine"], commission: 2000, website: "https://harvard.edu" },
            { name: "University of Oxford", country: "UK", ranking: 2, courses: ["Engineering", "Arts", "Medicine"], commission: 1800, website: "https://ox.ac.uk" },
            { name: "University of Toronto", country: "Canada", ranking: 18, courses: ["Computer Science", "Business"], commission: 1500, website: "https://utoronto.ca" },
            { name: "University of Melbourne", country: "Australia", ranking: 33, courses: ["Engineering", "Business"], commission: 1600, website: "https://unimelb.edu.au" },
            { name: "Technical University of Munich", country: "Germany", ranking: 50, courses: ["Engineering", "Computer Science"], commission: 1200, website: "https://tum.de" }
        ];

        for (const uni of demoUniversities) {
            const newRef = push(ref(db, 'universities'));
            await set(newRef, { ...uni, addedBy: 'system', addedAt: Date.now() });
        }
    }

    filterUniversities() {
        const search = document.getElementById('searchUniversity').value.toLowerCase();
        const country = document.getElementById('countryFilter').value;
        const course = document.getElementById('courseFilter').value;
        const ranking = document.getElementById('rankingFilter').value;

        let filtered = this.universities.filter(uni => {
            const matchSearch = uni.name.toLowerCase().includes(search);
            const matchCountry = !country || uni.country === country;
            const matchCourse = !course || uni.courses.includes(course);
            const matchRanking = !ranking || 
                (ranking === 'top50' && uni.ranking <= 50) ||
                (ranking === 'top100' && uni.ranking <= 100) ||
                (ranking === 'top200' && uni.ranking <= 200);

            return matchSearch && matchCountry && matchCourse && matchRanking;
        });

        this.displayUniversities(filtered);
    }

    displayUniversities(universities) {
        const container = document.getElementById('universitiesGrid');

        if (universities.length === 0) {
            container.innerHTML = '<div class="text-center text-muted" style="grid-column: 1/-1;">No universities found.</div>';
            return;
        }

        container.innerHTML = universities.map(uni => `
            <div class="card university-card">
                <div class="card-header">
                    <h3>${uni.name}</h3>
                    <span class="badge">#${uni.ranking}</span>
                </div>
                <div class="card-body">
                    <p><i class="fas fa-globe"></i> ${uni.country}</p>
                    <p><i class="fas fa-graduation-cap"></i> ${uni.courses.join(', ')}</p>
                    <p><i class="fas fa-dollar-sign"></i> Commission: $${uni.commission}</p>
                    ${uni.website ? `<p><a href="${uni.website}" target="_blank" class="btn-link"><i class="fas fa-external-link-alt"></i> Website</a></p>` : ''}
                </div>
                <div class="card-footer">
                    <button class="btn btn-primary btn-sm" onclick="window.recommendUniversity('${uni.id}')">
                        <i class="fas fa-share"></i> Recommend to Student
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// Global function for recommend button
window.recommendUniversity = (universityId) => {
    alert(`Recommend functionality coming soon! University ID: ${universityId}`);
    // TODO: Implement modal to select student and send recommendation
};

document.addEventListener('DOMContentLoaded', () => {
    new UniversitiesManager();
});
