import { auth, db } from '../firebase-init.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

export const AuthService = {
    login: async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            // Fetch role
            const role = await AuthService.getUserRole(user.uid);
            return { user, role };
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    },

    logout: async () => {
        try {
            await signOut(auth);
            return true;
        } catch (error) {
            console.error("Logout failed:", error);
            throw error;
        }
    },

    getUserRole: async (uid) => {
        try {
            // Check 'users' path in DB
            const userRef = ref(db, `users/${uid}/role`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                return snapshot.val();
            }
            // Fallback: Check if user is in specific role nodes if structure is different
            // For now assume 'users/{uid}/role' exists
            return 'student'; // Default role
        } catch (error) {
            console.error("Error fetching user role:", error);
            return 'student';
        }
    },

    observeAuth: (callback) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const role = await AuthService.getUserRole(user.uid);
                callback(user, role);
            } else {
                callback(null, null);
            }
        });
    }
};
