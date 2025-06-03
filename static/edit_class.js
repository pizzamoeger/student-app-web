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
const userRef = doc(db, "user", "QQdlCkXBdxd0yUQEepkjXQspxXu1");

const form = document.getElementById('addClassForm');
const nameInput = document.getElementById('class-name');
const colorInput = document.getElementById('class-color');

const classID = parseInt(new URLSearchParams(window.location.search).get("id"))

let classList = [], classIndex = -1
let editedClass = { // class that should be edited
    id: -1,
    name: "",
    color: getRandomColorInt(),
    grades: [],
    studyTime: {}
}

// generates a random color int
function getRandomColorInt() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    const argb = (0xFF << 24) | (r << 16) | (g << 8) | b;

    return (argb >>> 0) > 0x7FFFFFFF ? argb - 0x100000000 : argb;
}

// convert int to rgb
function intToRGBHex(intValue) {
    const unsigned = (intValue + 0x100000000) & 0xFFFFFFFF;
    const r = (unsigned >> 16) & 0xFF;
    const g = (unsigned >> 8) & 0xFF;
    const b = unsigned & 0xFF;
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// is executed as soon as userRef is assigned
getDoc(userRef).then(docSnap => {

    if (!docSnap.exists()) {
        alert("User data not found");
        return;
    }

    classList = JSON.parse(docSnap.data().classes || []); // get class list
    
    if (classID == -1) { // if we want to create a new class
        
        let id = -1 // get the id of the new class
        for (let clazz in classList) {
            id = max(id, clazz.id)
        }
        id++

        editedClass.id = id // set the id
        classIndex = -1
    } else {
        // find the class with the corresponding id and set editedClass to id
        classIndex = classList.findIndex(c => c.id === classID);
        if (classIndex === -1) {
            alert("Class not found");
            return;
        }
        editedClass = { ...classList[classIndex] };
        
    }
  
    console.log(editedClass)
    // set name and color to the one of the editedClass
    nameInput.value = editedClass.name;
    colorInput.value = intToRGBHex(editedClass.color);
});

function max(a, b) {
    if (a >= b) return a
    return b
}

// is executed as soon as submit on form is pressed
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // get name and color
    const name = document.getElementById('class-name').value;
    const colorHex = document.getElementById('class-color').value;

    // get int color from color
    let colorInt = parseInt(colorHex.slice(1), 16);
    colorInt = (0xFF << 24) | colorInt;
    colorInt > 0x7FFFFFFF ? colorInt - 0x100000000 : colorInt;

    editedClass.name = name
    editedClass.color = colorInt

    // add or update the edited class
    if (classIndex == -1) {
        classList.push(editedClass)
    } else {
        classList[classIndex] = editedClass
    }

    try {
        // update classes in the firebase doc
        await updateDoc(userRef, {
            classes: JSON.stringify(classList)
        });

        alert("Class saved successfully!");
        window.location.href = "/classes.html"; // go back to classes
    } catch (err) {
        console.error("Failed to update Firestore:", err);
        alert("Failed to save class.");
    }
});