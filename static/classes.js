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

const container = document.getElementById("classes-div")

let currentlyEditingCard = null

function renderClassCard(clazz) {
    const template = document.getElementById("class-blueprint")

    const clone = template.content.cloneNode(true);
    clone.id = "class" + clazz.id; // set id

    const card = clone.querySelector('.card');

    card.classList.add("class-card");
    card.style.backgroundColor = intToRGBHex(clazz.color); // set backgroud color
    card.querySelector('h3').textContent = clazz.name // set name
    card.querySelector('.editClassButton').addEventListener("click", () => {
        enterEditMode(clazz, card)
    });
    card.querySelector('.deleteClassButton').addEventListener("click", () => deleteClass(clazz.id));

    container.appendChild(card);
}


function displayClasses(classes) {
    for (const clazz of classes) {
        // for each class create a div according to the template
        renderClassCard(clazz)
    }
}

function enterEditMode(clazz, card) {
    // If another card is being edited, reset the UI and then try again
    if (currentlyEditingCard && currentlyEditingCard !== card) {
        currentlyEditingCard = null;
        renderClasses(() => {
            // Re-enter edit mode once render is complete
            const newCard = Array.from(container.children).find(c => {
                return c.querySelector("h3")?.textContent === clazz.name;
            });
            if (newCard) enterEditMode(clazz, newCard);
        });
        return;
    }

    currentlyEditingCard = card;

    const content = card.querySelector(".content");
    content.innerHTML = "";

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = clazz.name;

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = intToRGBHex(clazz.color);

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "💾 Save";
    saveBtn.addEventListener("click", async () => {
        const updatedName = titleInput.value.trim();
        const updatedColor = colorInput.value;

        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return;

        const classList = JSON.parse(docSnap.data().classes || "[]");
        const index = classList.findIndex(c => c.id === clazz.id);
        if (index === -1) return;

        classList[index].name = updatedName;
        classList[index].color = updatedColor;

        await updateDoc(docRef, {
            classes: JSON.stringify(classList),
        });

        currentlyEditingCard = null;
        renderClasses();
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "❌ Cancel";
    cancelBtn.addEventListener("click", () => {
        currentlyEditingCard = null;
        renderClasses();
    });

    content.appendChild(titleInput);
    content.appendChild(colorInput);
    content.appendChild(saveBtn);
    content.appendChild(cancelBtn);
}

function renderClasses(callback) {
    container.innerHTML = ""
    getClasses()
        .then(classes => {
            displayClasses(classes);
            if (callback) callback(); // Run callback after display is complete
        })
        .catch(error => {
            console.error("Error initializing classes:", error);
        });
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

function deleteClass(id) {
    
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
    renderClasses()
    
    // connect the addClassButton to the action
    document.getElementById('addClassButton').addEventListener('click', function() {
        editClass(-1) // -1 is for creating a new class
    });
};


