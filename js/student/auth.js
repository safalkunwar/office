import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { firebaseConfig } from '../config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const form = document.getElementById('studentLoginForm');
const errorEl = document.getElementById('authError');

function showError(msg) {
  if (!errorEl) return;
  errorEl.textContent = msg;
  errorEl.style.display = 'block';
  setTimeout(() => (errorEl.style.display = 'none'), 4000);
}

// Ensure only students can access portal
export async function ensureStudent(user) {
  // Try resolve student record by email or uid
  const studentsRef = ref(db, 'students');
  const q = query(studentsRef, orderByChild('email'), equalTo(user.email || ''));
  const snap = await get(q);
  if (snap.exists()) return true;
  const byUid = await get(ref(db, `students/${user.uid}`));
  return byUid.exists();
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!(await ensureStudent(cred.user))) {
        await signOut(auth);
        showError('Access denied. Student account required.');
        return;
      }
      window.location.href = './portal.html';
    } catch (err) {
      console.error(err);
      showError(err.message || 'Login failed');
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  const onLoginPage = window.location.pathname.endsWith('login.html');
  if (!user) {
    if (!onLoginPage) window.location.href = './login.html';
    return;
  }
  if (!(await ensureStudent(user))) {
    await signOut(auth);
    if (!onLoginPage) window.location.href = './login.html';
    return;
  }
  if (onLoginPage) window.location.href = './portal.html';
});

