import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const db = getDatabase(app);

// DOM Elements
const stats = {
  visitorsToday: document.getElementById("visitorsToday"),
  visitorsYesterday: document.getElementById("visitorsYesterday"),
  ieltsStudents: document.getElementById("ieltsStudents"),
  applyingStudents: document.getElementById("applyingStudents"),
  pendingStudents: document.getElementById("pendingStudents"),
};

// Fetch and Display Data
Object.keys(stats).forEach((key) => {
  onValue(ref(db, `metrics/${key}`), (snapshot) => {
    stats[key].textContent = snapshot.val() || 0;
  });
});
