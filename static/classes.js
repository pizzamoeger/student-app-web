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

function hexToInt(colorHex) {
    let colorInt = parseInt(colorHex.slice(1), 16);
    colorInt = (0xFF << 24) | colorInt;
    colorInt > 0x7FFFFFFF ? colorInt - 0x100000000 : colorInt;
    return colorInt
}

function renderClassCard(clazz) {
    const template = document.getElementById("class-blueprint-normal")

    const clone = template.content.cloneNode(true);
    clone.id = "class" + clazz.id; // set id

    const card = clone.querySelector('.card');

    card.classList.add("class-card");
    card.style.backgroundColor = intToRGBHex(clazz.color); // set backgroud color
    card.querySelector('h3').textContent = clazz.name // set name
    card.querySelector('.editButton').addEventListener("click", () => {
        enterEditMode(clazz, card)
    });

    container.appendChild(card);
}


function displayClasses(classes) {
    for (const clazz of classes) {
        // for each class create a div according to the template
        renderClassCard(clazz)
    }
}

function save() {

}

function enterEditMode(clazz, oldCard) {
    // If another card is being edited, reset the UI and then try again
    if (currentlyEditingCard && currentlyEditingCard !== oldCard) {
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

    const editTemplate = document.getElementById("class-blueprint-edit");
    const clone = editTemplate.content.cloneNode(true);

    const card = clone.querySelector('.card');
    currentlyEditingCard = card;

    const colorInput = card.querySelector('.colorInput')
    colorInput.value = intToRGBHex(clazz.color);

    const nameInput = card.querySelector('.nameInput')
    nameInput.value = clazz.name

    const saveBtn = card.querySelector('.saveButton')
    saveBtn.addEventListener("click", async () => {
        const updatedName = nameInput.value.trim();
        const updatedColor = hexToInt(colorInput.value);

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
    })

    const cancelBtn = card.querySelector('.cancelButton')
    cancelBtn.addEventListener("click", () => {
        currentlyEditingCard = null;
        renderClasses();
    });

    const deleteBtn = card.querySelector('.deleteButton')
    deleteBtn.addEventListener("click", () => deleteClass(clazz.id));

    container.replaceChild(card, oldCard);
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
async function addClass() {
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    let classList = JSON.parse(docSnap.data().classes || "[]")

    // id -1 means create a new class
    let id = -1 // get the id of the new class
    for (let clazz in classList) {
        id = max(id, clazz.id)
    }
    id++

    const clazz = { // class that should be edited
        id: id,
        name: "New Class",
        color: getRandomColorInt(),
        grades: [],
        studyTime: {}
    }

    classList.push(clazz)

    await updateDoc(docRef, {
        classes: JSON.stringify(classList),
    });
    renderClasses()
}

async function deleteClass(id) {
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const classList = JSON.parse(docSnap.data().classes || "[]");
    const newClassList = classList.filter(clazz => clazz.id !== id);

    await updateDoc(docRef, {
        classes: JSON.stringify(newClassList),
    });
    currentlyEditingCard = null
    renderClasses()
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

// generates a random color int
function getRandomColorInt() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    const argb = (0xFF << 24) | (r << 16) | (g << 8) | b;

    return (argb >>> 0) > 0x7FFFFFFF ? argb - 0x100000000 : argb;
}

function max(a, b) {
    if (a >= b) return a
    return b
}

// executed as soon as window is loaded
window.onload = () => {
    renderClasses()
    
    // connect the addClassButton to the action
    document.getElementById('addClassButton').addEventListener('click', function() {
        addClass()
    });
};


