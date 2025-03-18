// Import Firebase SDK
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBsW0RnByjUhzNE7C-OQ5tA1nqrMdOKR2A",
    authDomain: "chequepre-dc235.firebaseapp.com",
    projectId: "chequepre-dc235",
    storageBucket: "chequepre-dc235.firebasestorage.app",
    messagingSenderId: "600845161373",
    appId: "1:600845161373:web:180a678f46f888fbbd5574",
    measurementId: "G-0VD0D75XM0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db)
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled in one tab at a time
            console.log('Persistence failed');
        } else if (err.code == 'unimplemented') {
            // The current browser does not support persistence
            console.log('Persistence is not available');
        }
    });

// Auth state observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        console.log('User is signed in:', user.email);
        // You can update UI elements here
    } else {
        // User is signed out
        console.log('User is signed out');
        // Redirect to login page or update UI
        window.location.href = '/login.html';
    }
});

// Export initialized services
export { auth, db, storage, analytics }; 