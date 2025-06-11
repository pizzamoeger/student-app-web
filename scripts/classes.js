import { renderClassesStopwatch } from './stopwatch.js';
import { renderAssignments } from './assignments.js';
import { updateClasses, getClasses, getCurrentSemester, getSemesters, updateSemesters } from './globalState.js'

const container = document.getElementById("classes-div")
let currentlyEditingCard = null

// executed as soon as window is loaded
export function renderScreen() { // TODO export temporary
    const currentPage = window.location.pathname;
    if (currentPage === "/index.html") {
        renderClasses()
    } else if (currentPage === "/stopwatch.html") {
        renderClassesStopwatch()
    } else if (currentPage === "/assignments.html") {
        console.log("renderAssignments")
        renderAssignments()
    } else {
        //renderClasses()
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

// Load classes for the current user
async function loadClasses() {
    try {
        const classes = getClasses();
        const classesListContent = document.getElementById('classes-list-content');
        if (!classesListContent) {
            console.error('Classes list content container not found');
            return;
        }

        // Only update the content inside classes-list-content, preserving the Add Class button
        classesListContent.innerHTML = !classes || classes.length === 0 ? 
            '<div class="no-classes">No classes found. Add your first class!</div>' :
            classes.map(clazz => {
                const backgroundColor = intToRGBHex(clazz.color) || '#2196F3';
                return `
                    <div class="class-item" data-id="${clazz.id}" style="background-color: ${backgroundColor}">
                        <div class="class-item-content">
                            <div class="class-item-main">
                                <h5>${clazz.name}</h5>
                            </div>
                        </div>
                        <div class="class-item-footer">
                            <button class="btn-flat delete-class-btn" data-id="${clazz.id}">
                                <i class="material-icons">delete</i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

        // Add click event listeners to class items
        document.querySelectorAll('.class-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking on a button or its children
                if (e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) {
                    return;
                }
                const classId = parseInt(item.dataset.id);
                const clazz = classes.find(s => s.id === classId);
                if (clazz) {
                    displayClassDetails(clazz);
                }
            });
        });

        // Add click event listeners to delete buttons
        document.querySelectorAll('.delete-class-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the class item click
                const classId = parseInt(btn.dataset.id);
                if (confirm('Are you sure you want to delete this class?')) {
                    deleteClass(classId);
                }
            });
        });

        // Hide loading overlay after successful load
        document.getElementById('saving-overlay').style.display = 'none';

    } catch (error) {
        console.error('Error loading classes:', error);
        M.toast({html: 'Error loading classes'});
        // Hide loading overlay on error
        document.getElementById('saving-overlay').style.display = 'none';
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

        await updateClasses(classList);

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

// Display class details
function displayClassDetails(clazz) {
    const detailsContainer = document.getElementById('class-details');
    if (!detailsContainer) return;

    detailsContainer.innerHTML = `
        <div class="class-header">
            <div class="editable-name">
                <h4 contenteditable="true" data-id="${clazz.id}">${clazz.name}</h4>
                <i class="material-icons edit-icon">edit</i>
            </div>
        </div>
        <div class="class-info">
            <div class="info-item">
                <i class="material-icons">color_lens</i>
                <div class="editable-color">
                    <input type="color" id="class-color" value="${intToRGBHex(clazz.color) || '#2196F3'}" data-id="${clazz.id}">
                    <span>Class Color</span>
                </div>
            </div>
        </div>
        <div class="class-actions">
            <button class="btn waves-effect waves-light save-class-btn" id="save-class-btn">
                <i class="material-icons left">save</i>Save Changes
            </button>
        </div>
    `;

    // Add event listener for save button
    const saveButton = detailsContainer.querySelector('#save-class-btn');
    saveButton.addEventListener('click', function() {
        const nameElement = detailsContainer.querySelector('.editable-name h4');
        const colorInput = detailsContainer.querySelector('#class-color');
        const newName = nameElement.textContent.trim();
        const newColor = hexToInt(colorInput.value);

        if (newName !== clazz.name || newColor !== clazz.color) {
            updateClassDetails(clazz.id, { name: newName, color: newColor });
        }
    });
}

// Update class details
async function updateClassDetails(classId, updates) {
    try {
        showSavingOverlay();
        const classes = getClasses();
        const classIndex = classes.findIndex(c => c.id === classId);
        
        if (classIndex !== -1) {
            classes[classIndex] = { ...classes[classIndex], ...updates };
            await updateClasses(classes);
            renderClasses();
            M.toast({html: 'Class updated successfully'});
        }
    } catch (error) {
        console.error('Error updating class:', error);
        M.toast({html: 'Error updating class'});
    } finally {
        hideSavingOverlay();
    }
}

function renderClasses(callback) {
    //container.innerHTML = ""
    loadClasses()
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

// Add new class
async function addClass(className, color) {
    try {
        showSavingOverlay();
        
        const classData = {
            id: Date.now(),
            name: className,
            color: hexToInt(color),
            assignments: []
        };

        const classes = getClasses();
        classes.push(classData);
        await updateClasses(classes);
        
        renderClasses();
        M.toast({html: 'Class added successfully'});
    } catch (error) {
        console.error('Error adding class:', error);
        M.toast({html: 'Error adding class'});
    } finally {
        hideSavingOverlay();
    }
}

async function deleteClass(id) {
    showSavingOverlay();
    const classList = getClasses();
    const newClassList = classList.filter(clazz => clazz.id !== id);

    await updateClasses(newClassList)
    renderClasses()
}

// generates a random color int
function getRandomColorInt() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    const argb = (0xFF << 24) | (r << 16) | (g << 8) | b;

    return argb;
}

// setup materialize components
document.addEventListener('DOMContentLoaded', function() {
    var modals = document.querySelectorAll('.modal');
    M.Modal.init(modals);
  
    var items = document.querySelectorAll('.collapsible');
    M.Collapsible.init(items);
  
    // connect the addClassButton to the action
    const addClassButton = document.getElementById('add-class-btn');
    if (addClassButton) {
        addClassButton.addEventListener('click', function(e) {
            e.preventDefault();
            // Set random defaults
            const randomNum = Math.floor(Math.random() * 1000) + 1;
            const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            
            const nameInput = document.getElementById('class-name');
            nameInput.value = `Class ${randomNum}`;
            M.textareaAutoResize(nameInput);
            M.updateTextFields();
            
            document.getElementById('class-color').value = randomColor;
            
            const modal = document.getElementById('add-class-modal');
            const instance = M.Modal.getInstance(modal);
            if (instance) {
                instance.open();
            }
        });
    }

    // Add event listener for the confirm add class button
    const confirmAddClassBtn = document.getElementById('confirm-add-class');
    if (confirmAddClassBtn) {
        confirmAddClassBtn.addEventListener('click', () => {
            const name = document.getElementById('class-name').value;
            const color = document.getElementById('class-color').value;

            if (name) {
                addClass(name, color);
                const modal = document.getElementById('add-class-modal');
                const modalInstance = M.Modal.getInstance(modal);
                modalInstance.close();
                // Reset form
                document.getElementById('add-class-form').reset();
            } else {
                M.toast({html: 'Please enter a class name'});
            }
        });
    }

    // Initial render of classes
    renderClasses();
});
