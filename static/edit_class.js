// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
const db = getFirestore(app);

const form = document.getElementById('addClassForm');

function max(a, b) {
    if (a>= b) return a
    return b
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  console.log("aaa")

  const name = document.getElementById('class-name').value;
  const colorHex = document.getElementById('class-color').value;

  // Convert hex color (#rrggbb) to signed int like before
  let colorInt = parseInt(colorHex.slice(1), 16);
  colorInt = (0xFF << 24) | colorInt; // Add full alpha
  colorInt > 0x7FFFFFFF ? colorInt - 0x100000000 : colorInt;

  try {
    // Add a new document to the "classes" collection
    // TODO temp user id is fixed
    const docRef = doc(db, "user", "QQdlCkXBdxd0yUQEepkjXQspxXu1");
    const docSnap = await getDoc(docRef);

    let newClass = {
      id: 1,
      name: name,
      color: colorInt,
      grades: [],
      studyTime: {}
    };

    if (docSnap.exists()) {
      const data = docSnap.data();
      let classList = [];

    if (data.classes) {
      try {
        console.log(data.classes)
        classList = JSON.parse(data.classes);
        let id = -1
        for (let clazz in classList) id = max(id, clazz.id)
            id++
            newClass = {
            id: id,
            name: name,
            color: colorInt,
            grades: [],
            studyTime: {}
            };
            if (!Array.isArray(classList)) throw new Error("Classes is not an array");
      } catch (err) {
        alert("Failed to parse existing classes JSON.");
        console.log(err)
        return;
      }
    }

    classList.push(newClass);
    console.log(JSON.stringify(classList))

    await updateDoc(docRef, {
      classes: JSON.stringify(classList)
    });

      alert("Class added successfully!");
      form.reset();
    } else {
      alert("Document not found.");
    }
  } catch (error) {
    console.error(error);
    alert("Error: " + error.message);
  }
});