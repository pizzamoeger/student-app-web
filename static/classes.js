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

// TODO this is temp temp temp temp!!!!!!!!!!!!!!!!!!!!!!!!
const docRef = doc(db, "user", "QQdlCkXBdxd0yUQEepkjXQspxXu1");

function displayClasses(classes) {
    for (const clazz of classes) {
        // for each class create a div according to the template
        const template = document.getElementById("class-blueprint")
        const container = document.getElementById("classes-div")

        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.card');

        clone.id = "class" + clazz.id; // set id
        card.style.backgroundColor = intToRGBHex(clazz.color); // set backgroud color
        card.querySelector('h3').textContent = clazz.name // set name
        card.querySelector('button').addEventListener('click', function() { // connect to edit class
            editClass(clazz.id) 
        });

        container.appendChild(clone); // add it to the page 
    }
}

// convert int color to hex color
function intToRGBHex(intValue) {
    const unsigned = (intValue + 0x100000000) & 0xFFFFFFFF;
    const r = (unsigned >> 16) & 0xFF;
    const g = (unsigned >> 8) & 0xFF;
    const b = unsigned & 0xFF;
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}
  
// what to do when add class is pressed
function editClass(id) {
    // id -1 means create a new class
    location.href = `/edit_class.html?id=${id}`;
}

// returns classes that are stored in db
function getClasses() {
    return getDoc(docRef)
        // get the classes once the document is loaded
        .then((docSnap) => {
            if (!docSnap.exists()) {
                throw new Error("Document not found");
            }

            const data = docSnap.data();
            const classString = data.classes; // get the classes field

            try {
                // try parsing it
                const classList = JSON.parse(classString);
                if (!Array.isArray(classList)) {
                    throw new Error("Parsed classes is not an array");
                }
                return classList;
            } catch (err) {
                console.error("Error parsing 'classes':", err);
                throw err;
            }
        })
        .catch((error) => {
            console.error("Error fetching from Firestore:", error);
            throw error;
        });
}

// executed as soon as window is loaded
window.onload = () => {
    getClasses() // once get classes returns
        .then(classes => {
            displayClasses(classes); // display the classes
        })
        .catch(error => {
            console.error("Error initializing classes:", error);
        });
    
    // connect the addClassButton to the action
    document.getElementById('addClassButton').addEventListener('click', function() {
        editClass(-1) // -1 is for creating a new class
    });
};


