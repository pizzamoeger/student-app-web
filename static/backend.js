// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Choose your database
const database = firebase.database();  // for Realtime DB