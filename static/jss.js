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

function displayClasses(classes) {
    for (const clazz of classes) {
        const template = document.getElementById("class-blueprint")
        const container = document.getElementById("classes-div")

        const clone = template.content.cloneNode(true);
        clone.id = "class" + clazz.id;
        const card = clone.querySelector('.card');
        card.style.backgroundColor = intToRGBHex(clazz.color);
        card.querySelector('h3').textContent = clazz.name
        //clone.style.height = "20px";

        container.appendChild(clone);

        /*
                */
         
    }
}


function intToRGBHex(intValue) {
    // Convert signed integer to unsigned 24-bit
    const unsigned = (intValue + 16777216) & 0xFFFFFF;
  
    // Extract RGB components
    const r = (unsigned >> 16) & 0xFF;
    const g = (unsigned >> 8) & 0xFF;
    const b = unsigned & 0xFF;
  
    // Convert to hex and pad with zeros if necessary
    const hex = '#' + [r, g, b]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('');
  
    return hex;
}
  
function addClass() {
    location.href = "/add_class.html";
}

function getClasses() {
    const docRef = doc(db, "user", "QQdlCkXBdxd0yUQEepkjXQspxXu1"); // 🔁 Replace with your doc ID

    return getDoc(docRef)
        .then((docSnap) => {
            if (!docSnap.exists()) {
                throw new Error("Document not found");
            }

            const data = docSnap.data();
            const classString = data.classes;

            try {
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

window.onload = () => {
    getClasses()
        .then(classes => {
            displayClasses(classes);
        })
        .catch(error => {
            console.error("Error initializing classes:", error);
        });
    document.getElementById('addClassButton').addEventListener('click', function() {
        addClass()
    });
};


