// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getMessaging } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDWlZqbK3G6QGvLyg2gzYQP6D9ocEY3Ahs",
    authDomain: "cheques-pre.firebaseapp.com",
    projectId: "cheques-pre",
    storageBucket: "cheques-pre.appspot.com",
    messagingSenderId: "1098835722634",
    appId: "1:1098835722634:web:c2e3c0d7d3c8f3b9f3c2e1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const messaging = getMessaging(app);

// Export initialized services
export { app, auth, db, storage, messaging }; 