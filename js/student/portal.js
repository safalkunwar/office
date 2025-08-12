import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, get, set, push, update, onValue, serverTimestamp, query, orderByChild, equalTo, limitToLast } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getStorage, ref as sref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-storage.js";
import { firebaseConfig } from '../config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

let studentId = null;

function $(id) { return document.getElementById(id); }

async function resolveStudentRecordIdByEmail(email) {
  if (!email) throw new Error('No email');
  const studentsRef = ref(db, 'students');
  const q = query(studentsRef, orderByChild('email'), equalTo(email));
  const snap = await get(q);
  if (snap.exists()) return Object.keys(snap.val())[0];
  return email; // fallback
}

function percent(n, d) { return d ? Math.round((n / d) * 100) : 0; }
function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg; requestAnimationFrame(()=>{ t.classList.add('show'); });
  clearTimeout(showToast._to);
  showToast._to = setTimeout(()=> t.classList.remove('show'), 2000);
}
async function promptFileSelection() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    input.onchange = () => resolve(input.files[0] || null);
    input.click();
    setTimeout(()=> resolve(null), 20000); // fail-safe after 20s
  });
}



function renderList(el, items, render) { el.innerHTML = items.map(render).join(''); }

// Load Overview, Announcements, Resources
async function loadOverviewAndExtras() {
  // Announcements
  onValue(ref(db, 'announcements'), (snap) => {
    const list = snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : [];
    renderList($('announcementsList'), list.slice(-5).reverse(), a => `
      <div class="item">
        <div>
          <strong>${a.title || 'Announcement'}</strong>
          <div class="meta"><span>${new Date(a.createdAt || Date.now()).toLocaleString()}</span> ${a.tag ? `<span class="badge pending">${a.tag}</span>` : ''}</div>
        </div>
      </div>`);
  });

  // Overview next deadline
  onValue(ref(db, `students/${studentId}/assignments`), (snap) => {
    const items = snap.exists() ? Object.values(snap.val()) : [];
    const upcoming = items.filter(i => i.status !== 'graded' && i.dueDate).sort((a,b)=> (a.dueDate||0)-(b.dueDate||0));
    $('ovUpcoming').textContent = upcoming[0]?.title ? upcoming[0].title : upcoming.length ? new Date(upcoming[0].dueDate).toLocaleDateString() : '--';
  });

  // Resources
  onValue(ref(db, 'resources'), (snap) => {
    const list = snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : [];
    $('resourcesList').innerHTML = list.map(r => `
      <div class="resource"><h4>${r.title || 'Resource'}</h4><p>${r.description || ''}</p>
        ${r.url ? `<a href="${r.url}" target="_blank">Open</a>` : ''}
      </div>`).join('');
  });
}

// Assignments
async function loadAssignments() {
  const listEl = $('assignmentsList');
  const subjectF = $('assignmentSubjectFilter');
  const teacherF = $('assignmentTeacherFilter');
  const dueF = $('assignmentDueFilter');

  onValue(ref(db, `students/${studentId}/assignments`), (snap) => {
    let items = snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : [];
    // Collect filters
    const subjects = Array.from(new Set(items.map(x => x.subject).filter(Boolean)));
    const teachers = Array.from(new Set(items.map(x => x.teacher).filter(Boolean)));
    subjectF.innerHTML = '<option value="all">All Subjects</option>' + subjects.map(s => `<option>${s}</option>`).join('');
    teacherF.innerHTML = '<option value="all">All Teachers</option>' + teachers.map(t => `<option>${t}</option>`).join('');

    function applyFilter() {
      let filtered = items;
      if (subjectF.value !== 'all') filtered = filtered.filter(i => i.subject === subjectF.value);
      if (teacherF.value !== 'all') filtered = filtered.filter(i => i.teacher === teacherF.value);
      if (dueF.value) filtered = filtered.filter(i => (i.dueDate || '').slice(0,10) === dueF.value);
      renderList(listEl, filtered, a => {
        const status = (a.status||'pending').toLowerCase();
        const emoji = status==='graded' ? '🏅' : status==='submitted' ? '✉️' : '⏳';
        const anim  = status==='graded' ? 'emoji-pulse' : status==='submitted' ? 'emoji-bounce' : 'emoji-spin';
        return `
        <div class="item hover-3d">
          <div>
            <strong>${a.title || 'Assignment'}</strong>
            <div class="meta">
              <span>${a.subject || ''}</span>
              <span>By ${a.teacher || 'Teacher'}</span>
              <span>Due ${a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '-'}</span>
              <span class="emoji-badge"><span class="${anim}">${emoji}</span><span>${status}</span></span>
            </div>
          </div>
          <div class="actions">
            <span class="badge ${status === 'graded' ? 'success' : status === 'submitted' ? 'pending' : 'warning'}">${status}</span>
            ${status === 'pending' ? `<button class="submit-btn" data-id="${a.id}">Submit</button>` : ''}
          </div>
        </div>`;
      });

      // Wire submission with optional file upload
      listEl.querySelectorAll('.submit-btn').forEach(btn => btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        try {
          const file = await promptFileSelection();
          if (file) {
            const p = sref(storage, `students/${studentId}/assignments/${id}/${Date.now()}_${file.name}`);
            await uploadBytes(p, file);
            const url = await getDownloadURL(p);
            await update(ref(db, `students/${studentId}/assignments/${id}`), {
              status: 'submitted', submittedAt: serverTimestamp(), submission: { fileName: file.name, size: file.size, url }
            });
          } else {
            await update(ref(db, `students/${studentId}/assignments/${id}`), { status: 'submitted', submittedAt: serverTimestamp() });
          }
          showToast('Assignment submitted');
        } catch (err) {
          console.error(err);
          showToast('Submission failed');
        }
      }));
      const submitted = filtered.filter(x => x.status === 'submitted' || x.status === 'graded').length;
      $('ovAssignments').textContent = `${submitted}/${filtered.length || items.length || 0}`;
    }

    [subjectF, teacherF, dueF].forEach(el => el.addEventListener('change', applyFilter));
  // Click on notif opens announcements panel
  $('notifBtn')?.addEventListener('click', () => {
    document.querySelector('.announcements-card')?.scrollIntoView({behavior:'smooth'});
  });

    applyFilter();
  });
}

// Attendance
async function loadAttendance() {
  const monthSel = $('attendanceMonth');
  onValue(ref(db, `students/${studentId}/attendance`), (snap) => {
    const att = snap.exists() ? snap.val() : {};
    const dates = Object.keys(att).sort();
    const months = Array.from(new Set(dates.map(d => d.slice(0,7))));
    monthSel.innerHTML = months.map(m => `<option value="${m}">${m}</option>`).join('');

    function renderMonth(m) {
      const rows = dates.filter(d => d.startsWith(m)).map(d => ({ date: d, status: (typeof att[d] === 'object' ? att[d].status : att[d]) || 'absent' }));
      const present = rows.filter(r => r.status === 'present').length;
      const absent = rows.filter(r => r.status !== 'present').length;
      $('attPresent').textContent = present;
      $('attAbsent').textContent = absent;
      $('attPercent').textContent = percent(present, rows.length) + '%';
      $('ovAttendance').textContent = percent(present, rows.length) + '%';
      $('attendanceTable').innerHTML = '<table><thead><tr><th>Date</th><th>Status</th></tr></thead><tbody>' +
        rows.map(r => `<tr><td>${r.date}</td><td>${r.status}</td></tr>`).join('') + '</tbody></table>';
    }

    monthSel.onchange = () => renderMonth(monthSel.value);
    if (months.length) renderMonth(months[months.length - 1]);
  });
}

// Tasks
async function loadTasks() {
  onValue(ref(db, `students/${studentId}/tasks`), (snap) => {
    const items = snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : [];
    renderList($('tasksList'), items, t => {
      const pct = (t.progress ?? (t.status==='completed'?100:t.status==='in-progress'?60:t.status==='awaiting-review'?85:20));
      const emoji = t.status==='completed' ? '🎉' : t.status==='in-progress' ? '🚀' : t.status==='awaiting-review' ? '🧐' : '⏳';
      const anim = t.status==='completed' ? 'emoji-pulse' : t.status==='in-progress' ? 'emoji-bounce' : 'emoji-spin';
      return `
      <div class="item hover-3d">
        <div><strong>${t.title || 'Task'}</strong>
          <div class="meta"><span>${t.priority || ''}</span><span>${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ''}</span>
            <span class="emoji-badge"><span class="${anim}">${emoji}</span><span>${t.status||'pending'}</span></span>
          </div>
        </div>
        <div class="progress">
          <div class="progress-bar"><span style="--val:${pct}%"></span></div>
        </div>
      </div>`;
    });
    $('ovUpcoming').textContent = items.filter(t => t.status !== 'completed').length;
  });
}

// Documents
  // Notifications: announcements + new messages badge
  const badge = $('notifBadge');
  let unread = 0;
  onValue(ref(db, 'announcements'), (snap) => { if (snap.exists()) { unread += 1; badge.textContent = Math.min(unread, 99); }});
  onValue(ref(db, 'conversations'), (snap) => { if (snap.exists()) { unread += 1; badge.textContent = Math.min(unread, 99); }});
  $('notifBtn')?.addEventListener('click', ()=> { unread = 0; badge.textContent = 0; });

async function loadDocuments() {
  onValue(ref(db, `students/${studentId}/documents`), (snap) => {
    const list = snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : [];
    renderList($('documentsList'), list, d => {
      const status = (d.status||'pending').toLowerCase();
      const emoji = status==='verified' ? '✅' : status==='pending' ? '⏳' : '❌';
      const anim  = status==='verified' ? 'emoji-pulse' : status==='pending' ? 'emoji-spin' : 'emoji-bounce';
      return `
      <div class="item hover-3d">
        <div><strong>${d.type || 'Document'}</strong>
          <div class="meta"><span><span class="${anim}">${emoji}</span> ${status}</span>${d.uploadedAt ? `<span>${new Date(d.uploadedAt).toLocaleDateString()}</span>` : ''}</div>
        </div>
        <div><span class="badge ${status === 'verified' ? 'success' : status === 'pending' ? 'pending' : 'warning'}">${status}</span></div>
      </div>`;
    });
    const verified = list.filter(d => (d.status||'').toLowerCase() === 'verified').length;
    $('ovDocuments').textContent = `${verified}/${list.length}`;
  });

  $('uploadDocumentBtn').addEventListener('click', async () => {
    const file = $('documentFile').files[0];
    const type = $('documentType').value;
    if (!file) return alert('Select a file');
    const path = `students/${studentId}/documents/${Date.now()}_${file.name}`;
    const r = sref(storage, path);
    await uploadBytes(r, file);
    const url = await getDownloadURL(r);
    await push(ref(db, `students/${studentId}/documents`), {
      type,
      url,
      status: 'pending',
      uploadedAt: serverTimestamp()
    });
  });
}

// Messages (uses conversations similar to admin side)
let currentConversationId = null;
function conversationIdFor(a, b) { return [a, b].sort().join('_'); }

async function initMessaging() {
  const conversationsEl = $('conversations');
  const messageList = $('messageList');
  const recipientSelect = $('recipientSelect');
  const targetSel = $('messageTarget');

  // Populate recipients based on target type
  async function loadRecipients() {
    recipientSelect.innerHTML = '<option value="">Select</option>';
    if (targetSel.value === 'group') {
      // groups path: groups/{id} with memberIds[]
      const snap = await get(ref(db, 'groups'));
      if (snap.exists()) {
        Object.entries(snap.val()).forEach(([id, g]) => {
          if (g.memberIds && !g.memberIds[studentId]) return;
          const opt = document.createElement('option');
          opt.value = `group:${id}`;
          opt.textContent = g.name || id;
          recipientSelect.appendChild(opt);
        });
      }
    } else {
      const snap = await get(ref(db, 'employees'));
      if (snap.exists()) {
        Object.entries(snap.val()).forEach(([id, u]) => {
          const role = (u.role||'').toLowerCase();
          if (targetSel.value === 'teacher' && !role.includes('teacher') && !role.includes('instructor')) return;
          if (targetSel.value === 'staff' && (role.includes('teacher') || role.includes('instructor'))) return;
          const opt = document.createElement('option');
          opt.value = id;
          opt.textContent = `${u.name || u.email || id}${u.role ? ' (' + u.role + ')' : ''}`;
          recipientSelect.appendChild(opt);
        });
      }
    }
  }
  targetSel.addEventListener('change', loadRecipients);
  await loadRecipients();

  // Load my conversations
  onValue(query(ref(db, 'conversations'), orderByChild('lastMessage/timestamp')), (snap) => {
  // Mobile menu toggle
  document.querySelector('.menu-toggle')?.addEventListener('click', ()=>{
    document.querySelector('.topbar')?.classList.toggle('open');
  });

    const list = [];
    snap.forEach(cs => {
      const cv = cs.val();
      if (cv.participants && Object.keys(cv.participants).includes(studentId)) {
        list.push({ id: cs.key, ...cv });
      }
    });
    list.sort((a,b) => (a.lastMessage?.timestamp || 0) - (b.lastMessage?.timestamp || 0));
    conversationsEl.innerHTML = list.map(c => `<div class="conv" data-id="${c.id}"><strong>${c.title || 'Conversation'}</strong><div class="meta">${new Date(c.lastMessage?.timestamp || Date.now()).toLocaleString()}</div></div>`).join('');
    conversationsEl.querySelectorAll('.conv').forEach(el => el.addEventListener('click', () => openConversation(el.dataset.id)));
  });

  async function ensureConversation(recipientValue) {
    if (recipientValue.startsWith('group:')) {
      const gid = recipientValue.split(':')[1];
      return conversationIdFor(studentId, `group_${gid}`);
    }
  // Initialize personalization once UI is present
  initPersonalization();

    return conversationIdFor(studentId, recipientValue);
  }

  async function openConversation(id) {
    currentConversationId = id;
    onValue(query(ref(db, `conversations/${id}/messages`), orderByChild('timestamp')), (snap) => {
      const msgs = [];
      snap.forEach(c => msgs.push({ id: c.key, ...c.val() }));
      messageList.innerHTML = msgs.map(m => `
        <div class="message ${m.senderId===studentId ? 'me' : ''}"><div class="bubble">${m.type==='file' ? `<a href="${m.content}" target="_blank">${m.fileName||'file'}</a>` : (m.content||'')}</div></div>`).join('');
      messageList.scrollTop = messageList.scrollHeight;
    });
  }

  $('attachBtn').addEventListener('click', () => $('messageFile').click());
  $('sendBtn').addEventListener('click', sendMessage);

  async function sendMessage() {
    const text = $('messageText').value.trim();
    const file = $('messageFile').files[0];
    const recipient = recipientSelect.value;
    if (!recipient) return alert('Select a recipient');
    const cid = await ensureConversation(recipient);
    currentConversationId = cid;

    let message = null;
    if (file) {
      const path = `messages/${cid}/${Date.now()}_${file.name}`;
      const rr = sref(storage, path);
      await uploadBytes(rr, file);
      const url = await getDownloadURL(rr);
      message = { type: 'file', content: url, fileName: file.name, fileSize: file.size, senderId: studentId, timestamp: serverTimestamp(), status: 'sent' };
      $('messageFile').value = '';
    } else if (text) {
      message = { type: 'text', content: text, senderId: studentId, timestamp: serverTimestamp(), status: 'sent' };
      $('messageText').value = '';
    }
    if (!message) return;

    await push(ref(db, `conversations/${cid}/messages`), message);
    await update(ref(db, `conversations/${cid}`), {
      participants: { [studentId]: true, [recipient]: true },
      lastMessage: message,
    });
  }
}

// Boot
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = './login.html';
    return;
  }
  // Resolve student record id
  try {
    studentId = await resolveStudentRecordIdByEmail(user.email);
  } catch (_) {
    studentId = user.uid;
  }

  $('logoutBtn').onclick = () => signOut(auth);

  const i18n = {
    en: { title: 'Student Portal', logout: 'Logout', overview: 'Overview', assignments: 'Assignments', attendance: 'Attendance', tasks: 'Tasks', documents: 'Documents', messages: 'Messages', resources: 'Resources', announcements: 'Announcements', upcoming: 'Upcoming' },
    hi: { title: 'विद्यार्थी पोर्टल', logout: 'लॉगआउट', overview: 'सारांश', assignments: 'असाइनमेंट', attendance: 'उपस्थिति', tasks: 'कार्य', documents: 'दस्तावेज', messages: 'संदेश', resources: 'संसाधन', announcements: 'घोषणाएँ', upcoming: 'आगामी' },
    ne: { title: 'विद्यार्थी पोर्टल', logout: 'लगआउट', overview: 'समग्र', assignments: 'असाइनमेन्ट', attendance: 'हाजिरी', tasks: 'कार्यहरू', documents: 'कागजात', messages: 'सन्देश', resources: 'स्रोतहरू', announcements: 'सूचनाहरू', upcoming: 'आगामी' },
  };
  function applyLang(lang) {
    const dict = i18n[lang] || i18n.en;
    document.querySelectorAll('[data-i18n]').forEach(el => { const k = el.getAttribute('data-i18n'); if (dict[k]) el.textContent = dict[k]; });
  }
  const langs = ['en','hi','ne'];
  const currentLang = localStorage.getItem('lang') || 'en';
  applyLang(currentLang);
  $('langToggle').onclick = () => {
    const cur = localStorage.getItem('lang') || 'en';
    const idx = langs.indexOf(cur);
    const next = langs[(idx + 1) % langs.length];
    localStorage.setItem('lang', next);

function setAccent(color){
  document.documentElement.style.setProperty('--sp-accent', color);
  localStorage.setItem('accent', color);
}

function initPersonalization(){
  const logoImg = document.getElementById('portalLogoImg');
  const avatarImg = document.getElementById('avatarImg');
  const logoBtn = document.getElementById('logoBtn');
  const avatarBtn = document.getElementById('avatarBtn');
  const logoInput = document.getElementById('logoFileInput');
  const avatarInput = document.getElementById('avatarFileInput');
  const customizeBtn = document.getElementById('customizeBtn');

  // Load saved assets
  const savedLogo = localStorage.getItem('portalLogoUrl');
  const savedAvatar = localStorage.getItem('avatarUrl');
  const savedAccent = localStorage.getItem('accent');
  if (savedLogo && logoImg) logoImg.src = savedLogo;
  if (savedAvatar && avatarImg) avatarImg.src = savedAvatar;
  if (savedAccent) setAccent(savedAccent);

  logoBtn?.addEventListener('click', ()=> logoInput?.click());
  avatarBtn?.addEventListener('click', ()=> avatarInput?.click());

  logoInput?.addEventListener('change', async ()=>{
    const file = logoInput.files[0]; if(!file) return;
    const p = sref(storage, `students/${studentId}/profile/logo_${Date.now()}_${file.name}`);
    await uploadBytes(p, file); const url = await getDownloadURL(p);
    localStorage.setItem('portalLogoUrl', url); if (logoImg) logoImg.src = url;
  });

  avatarInput?.addEventListener('change', async ()=>{
    const file = avatarInput.files[0]; if(!file) return;
    const p = sref(storage, `students/${studentId}/profile/avatar_${Date.now()}_${file.name}`);
    await uploadBytes(p, file); const url = await getDownloadURL(p);
    localStorage.setItem('avatarUrl', url); if (avatarImg) avatarImg.src = url;
  });

  customizeBtn?.addEventListener('click', async ()=>{
    const color = prompt('Enter accent hex color (e.g., #ff6b6b) or CSS color:','');
    if (color) setAccent(color);
  });
}

    applyLang(next);
  };

  await loadOverviewAndExtras();
  await loadAssignments();
  await loadAttendance();
  await loadTasks();
  await loadDocuments();
  await initMessaging();
});

