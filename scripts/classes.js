import { uid } from './auth.js'; // TODO temp
import { renderClassesStopwatch } from './stopwatch.js';
export var data = null
const container = document.getElementById("classes-div")
let currentlyEditingCard = null

// executed as soon as window is loaded
export function renderScreen() { // TODO export temporary
    const currentPage = window.location.pathname;
    if (currentPage === "/index.html") {
        data = null

        if (!uid) { // user is not logged in
            renderClasses()
            return
        }
    
        db.collection("user").doc(uid).get().then(doc => {
            if (doc.exists) {
                data = doc.data()
            } else {
                console.log("No such document for this user.");
                data = {"classes":"[]"}
            }
            renderClasses()
        });
    } else {
        data = null

        if (!uid) { // user is not logged in
            renderClassesStopwatch()
            return
        }
    
        db.collection("user").doc(uid).get().then(doc => {
            if (doc.exists) {
                data = doc.data()
            } else {
                console.log("No such document for this user.");
            }
            renderClassesStopwatch()
        });
    }
};

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
        showSavingOverlay()
        const updatedName = nameInput.value.trim();
        const updatedColor = hexToInt(colorInput.value);

        const classList = getClasses();

        const index = classList.findIndex(c => c.id === clazz.id);
        if (index === -1) return;

        classList[index].name = updatedName;
        classList[index].color = updatedColor;

        await saveNewClassList(classList);

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
    displayClasses(getClasses())
    if (callback) callback()
    hideSavingOverlay();
}

// convert int color to hex color
// TODO figure out the correct formula
function intToRGBHex(intValue) {
    const unsigned = (intValue)// + 0x100000000) & 0xFFFFFFFF;
    const r = (unsigned >> 16) & 0xFF;
    const g = (unsigned >> 8) & 0xFF;
    const b = unsigned & 0xFF;
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function showSavingOverlay() {
    document.getElementById('saving-overlay').style.display = 'flex';
}

function hideSavingOverlay() {
    document.getElementById('saving-overlay').style.display = 'none';
}

export async function saveNewClassList(newClassList) {
    const classString = JSON.stringify(newClassList)
    data.classes = classString;
    console.log(classString)
    await saveNewClassListToDB(classString)
}

async function saveNewClassListToDB(classString) {
    const docRef = db.collection("user").doc(uid);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        console.log("No such document exists. Creating it...");
        await docRef.set({
            classes: classString,
        });
    } else {
        console.log("Document exists. Updating it...");
        await docRef.update({
            classes: classString,
        });
    }
}
  
// what to do when add class is pressed
async function addClass() {
    showSavingOverlay()
    const classList = getClasses()

    // id -1 means create a new class
    let id = -1 // get the id of the new class
    for (let clazz of classList) {
        id = max(id, clazz.id)
    }
    if (id == -1) id = 0
    id++

    const clazz = { // class that should be edited
        id: id,
        name: "New Class",
        color: getRandomColorInt(),
        grades: [],
        studyTime: {}
    }

    let newClassList = []
    newClassList.push(clazz)
    for (const cl of classList) {
        newClassList.push(cl)
    }

    await saveNewClassList(newClassList)
    renderScreen()
}

async function deleteClass(id) {
    showSavingOverlay();
    const classList = getClasses();
    const newClassList = classList.filter(clazz => clazz.id !== id);

    await saveNewClassList(newClassList)
    renderClasses()
}

// returns classes that are stored in db
export function getClasses() {
    if (!data) return []

    const classString = data.classes; // get the classes field
    if (!classString) return []
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
}

// generates a random color int
function getRandomColorInt() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    const argb = (0xFF << 24) | (r << 16) | (g << 8) | b;

    return argb;
}

function max(a, b) {
    if (a >= b) return a
    return b
}

// setup materialize components
document.addEventListener('DOMContentLoaded', function() {

    var modals = document.querySelectorAll('.modal');
    M.Modal.init(modals);
  
    var items = document.querySelectorAll('.collapsible');
    M.Collapsible.init(items);
  
    // connect the addClassButton to the action
    document.getElementById('addClassButton').addEventListener('click', function() {
        addClass()
    });
});
