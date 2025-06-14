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
                    <div class="class-item" data-id="${clazz.id}" style="border-top: 4px solid ${backgroundColor}">
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

    // Calculate weighted average if there are grades
    let weightedAverage = 0;
    let totalWeight = 0;
    if (clazz.grades && clazz.grades.length > 0) {
        clazz.grades.forEach(grade => {
            weightedAverage += (grade.value * grade.weight);
            totalWeight += grade.weight;
        });
        weightedAverage = totalWeight > 0 ? (weightedAverage / totalWeight).toFixed(1) : 0;
    }

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
        <div class="grades-section">
            <div class="grades-header">
                <div class="grades-title">
                    <h5>Grades</h5>
                    ${weightedAverage > 0 ? `<span class="weighted-average">Weighted Average: ${weightedAverage}%</span>` : ''}
                </div>
                <button class="btn waves-effect waves-light add-grade-btn" id="add-grade-btn">
                    <i class="material-icons left">add</i>Add Grade
                </button>
            </div>
            <div class="grades-list">
                ${clazz.grades && clazz.grades.length > 0 ? 
                    clazz.grades.map((grade, index) => `
                        <div class="grade-item" data-index="${index}">
                            <div class="grade-info">
                                <span class="grade-name">${grade.name}</span>
                                <span class="grade-value">${grade.value}%</span>
                                <span class="grade-weight">Weight: ${grade.weight}</span>
                            </div>
                            <div class="grade-actions">
                                <button class="btn-flat edit-grade-btn" data-index="${index}">
                                    <i class="material-icons">edit</i>
                                </button>
                                <button class="btn-flat delete-grade-btn" data-index="${index}">
                                    <i class="material-icons">delete</i>
                                </button>
                            </div>
                        </div>
                    `).join('') : 
                    '<div class="no-grades">No grades added yet</div>'
                }
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

    // Add event listener for add grade button
    const addGradeBtn = detailsContainer.querySelector('#add-grade-btn');
    if (addGradeBtn) {
        addGradeBtn.addEventListener('click', () => {
            const modal = document.getElementById('add-grade-modal');
            const instance = M.Modal.getInstance(modal);
            if (instance) {
                instance.open();
            }
        });
    }

    // Add event listeners for edit and delete grade buttons
    detailsContainer.querySelectorAll('.edit-grade-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(btn.dataset.index);
            const grade = clazz.grades[index];
            const modal = document.getElementById('edit-grade-modal');
            const instance = M.Modal.getInstance(modal);
            
            // Set the current grade values in the modal
            const nameInput = document.getElementById('edit-grade-name');
            const valueInput = document.getElementById('edit-grade-value');
            const weightInput = document.getElementById('edit-grade-weight');
            const indexInput = document.getElementById('edit-grade-index');

            nameInput.value = grade.name;
            valueInput.value = grade.value;
            weightInput.value = grade.weight;
            indexInput.value = index;

            // Trigger Materialize's form initialization
            M.updateTextFields();
            
            if (instance) {
                instance.open();
            }
        });
    });

    detailsContainer.querySelectorAll('.delete-grade-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(btn.dataset.index);
            if (confirm('Are you sure you want to delete this grade?')) {
                const updatedGrades = [...clazz.grades];
                updatedGrades.splice(index, 1);
                updateClassDetails(clazz.id, { grades: updatedGrades });
            }
        });
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
            // Refresh the class details view with the updated class
            displayClassDetails(classes[classIndex]);
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

        // get the max class id
        const allClasses = getClasses();
        const maxClassId = Math.max(...allClasses.map(c => c.id));
        
        const classData = {
            id: maxClassId ? maxClassId + 1 : 1,
            name: className,
            color: hexToInt(color),
            assignments: [],
            grades: [] // Add grades array to store grade entries
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

    // Add event listener for the confirm add grade button
    const confirmAddGradeBtn = document.getElementById('confirm-add-grade');
    if (confirmAddGradeBtn) {
        confirmAddGradeBtn.addEventListener('click', () => {
            const name = document.getElementById('grade-name').value;
            const value = parseFloat(document.getElementById('grade-value').value);
            const weight = parseFloat(document.getElementById('grade-weight').value);

            if (name && !isNaN(value) && value >= 0 && value <= 100 && 
                !isNaN(weight) && weight > 0) {
                const classes = getClasses();
                const selectedClass = classes.find(c => c.id === parseInt(document.querySelector('.editable-name h4').dataset.id));
                
                if (selectedClass) {
                    const updatedGrades = [...(selectedClass.grades || [])];
                    updatedGrades.push({ name, value, weight });
                    updateClassDetails(selectedClass.id, { grades: updatedGrades });
                    
                    const modal = document.getElementById('add-grade-modal');
                    const modalInstance = M.Modal.getInstance(modal);
                    modalInstance.close();
                    // Reset form
                    document.getElementById('add-grade-form').reset();
                }
            } else {
                M.toast({html: 'Please enter a valid grade name, value (0-100), and weight (> 0)'});
            }
        });
    }

    // Add event listener for the confirm edit grade button
    const confirmEditGradeBtn = document.getElementById('confirm-edit-grade');
    if (confirmEditGradeBtn) {
        confirmEditGradeBtn.addEventListener('click', () => {
            const name = document.getElementById('edit-grade-name').value;
            const value = parseFloat(document.getElementById('edit-grade-value').value);
            const weight = parseFloat(document.getElementById('edit-grade-weight').value);
            const index = parseInt(document.getElementById('edit-grade-index').value);

            if (name && !isNaN(value) && value >= 0 && value <= 100 && 
                !isNaN(weight) && weight > 0 && !isNaN(index)) {
                const classes = getClasses();
                const selectedClass = classes.find(c => c.id === parseInt(document.querySelector('.editable-name h4').dataset.id));
                
                if (selectedClass && selectedClass.grades && selectedClass.grades[index]) {
                    const updatedGrades = [...selectedClass.grades];
                    updatedGrades[index] = { name, value, weight };
                    updateClassDetails(selectedClass.id, { grades: updatedGrades });
                    
                    const modal = document.getElementById('edit-grade-modal');
                    const modalInstance = M.Modal.getInstance(modal);
                    modalInstance.close();
                    // Reset form
                    document.getElementById('edit-grade-form').reset();
                }
            } else {
                M.toast({html: 'Please enter a valid grade name, value (0-100), and weight (> 0)'});
            }
        });
    }

    // Initial render of classes
    renderClasses();
});
