// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBqQkGDw0kRlyCLUxhEb1hzUnPnfPDWMOQ",
    authDomain: "student-app-924e4.firebaseapp.com",
    projectId: "student-app-924e4",
    storageBucket: "student-app-924e4.firebasestorage.app",
    messagingSenderId: "1009631248066",
    appId: "1:1009631248066:web:53c121933b86f00204855b",
    measurementId: "G-935GV9TRS6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db }; 