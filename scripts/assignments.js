import { getCurrentSemester, getSemesters, getAssignments, updateAssignments, getClasses } from './globalState.js';

// Assignment structure in localStorage:
// assignments = [
//   {
//     id: string,
//     name: string,
//     classId: string,
//     dueDate: string (YYYY-MM-DD),
//     description: string,
//     status: 'pending' | 'in-progress' | 'completed',
//     createdAt: number (timestamp)
//   }
// ]

let assignments = [];
let currentlyEditingId = null;

// DOM Elements
const assignmentsList = document.getElementById('assignments-list');
const noAssignmentsMessage = document.getElementById('no-assignments-message');
const assignmentModal = document.getElementById('assignment-modal');
const assignmentForm = document.getElementById('assignment-form');

// Filter Elements
const semesterFilter = document.getElementById('semester-filter');
const classFilter = document.getElementById('class-filter');
const statusFilter = document.getElementById('status-filter');

// Initialize the page
function init() {
    loadAssignments();
    setupEventListeners();
    initializeMaterialize();
    populateFilters();
    renderAssignments();
}

// Initialize Materialize components
function initializeMaterialize() {
    // Initialize select dropdowns
    const selects = document.querySelectorAll('select');
    M.FormSelect.init(selects);

    // Initialize modal
    M.Modal.init(document.querySelectorAll('.modal'));
}

// Load assignments from Firebase
function loadAssignments() {
    // Assignments are already loaded in global state during initialization
    const assignments = getAssignments();
    if (!assignments) {
        console.error('No assignments found');
        return;
    }
}

// Save assignments to localStorage
function saveAssignments() {
    localStorage.setItem('assignments', JSON.stringify(assignments));
}

// Setup event listeners
function setupEventListeners() {
    // Add assignment button
    document.getElementById('add-assignment-btn').addEventListener('click', () => {
        currentlyEditingId = null;
        assignmentForm.reset();
        const modal = M.Modal.getInstance(assignmentModal);
        modal.open();
        populateClassSelect();
    });

    // Form submission
    assignmentForm.addEventListener('submit', handleFormSubmit);
    
    // Filter event listeners
    semesterFilter.addEventListener('change', () => {
        updateClassFilter();
        renderAssignments();
    });
    classFilter.addEventListener('change', renderAssignments);
    statusFilter.addEventListener('change', renderAssignments);
}

// Populate filter dropdowns
function populateFilters() {
    // Populate semesters
    const semesters = getSemesters();
    semesterFilter.innerHTML = '<option value="all">All Semesters</option>';
    semesters.forEach(semester => {
        semesterFilter.innerHTML += `<option value="${semester.id}">${semester.name}</option>`;
    });

    // Populate classes
    updateClassFilter();

    // Reinitialize Materialize selects
    M.FormSelect.init(semesterFilter);
    M.FormSelect.init(classFilter);
    M.FormSelect.init(statusFilter);
}

// Update class filter based on selected semester
function updateClassFilter() {
    const selectedSemester = semesterFilter.value;
    const classes = getClasses();
    
    classFilter.innerHTML = '<option value="all">All Classes</option>';
    
    if (selectedSemester === 'all') {
        classes.forEach(cls => {
            classFilter.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
        });
    } else {
        const semester = getSemesters().find(sem => sem.id === selectedSemester);
        if (semester) {
            classes.filter(cls => semester.classesInSemester.includes(cls.id))
                .forEach(cls => {
                    classFilter.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
                });
        }
    }

    // Reinitialize Materialize select
    M.FormSelect.init(classFilter);
}

// Populate class select in modal
function populateClassSelect() {
    const classSelect = document.getElementById('assignment-class');
    const classes = getClasses();
    classSelect.innerHTML = '<option value="">Select a Class</option>';
    classes.forEach(cls => {
        classSelect.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
    });
    M.FormSelect.init(classSelect);
}

// Convert integer color to RGB hex (copied from classes.js for consistency)
function intToRGBHex(number) {
    const red = (number >> 16) & 255;
    const green = (number >> 8) & 255;
    const blue = number & 255;
    return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
}

// Render assignments list
export function renderAssignments() {
    const selectedSemester = semesterFilter.value;
    const selectedClass = classFilter.value;
    const selectedStatus = statusFilter.value;
    
    let filteredAssignments = getAssignments() || [];

    // Apply filters
    if (selectedClass !== 'all') {
        filteredAssignments = filteredAssignments.filter(a => a.classId === selectedClass);
    } else if (selectedSemester !== 'all') {
        const semester = getSemesters().find(sem => sem.id === selectedSemester);
        if (semester) {
            filteredAssignments = filteredAssignments.filter(a => {
                const assignmentClass = getClasses().find(c => c.id === a.classId);
                return assignmentClass && semester.classesInSemester.includes(assignmentClass.id);
            });
        }
    }

    if (selectedStatus !== 'all') {
        filteredAssignments = filteredAssignments.filter(a => a.status === selectedStatus);
    }

    // Sort by due date
    filteredAssignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    // Show/hide no assignments message
    if (filteredAssignments.length === 0) {
        noAssignmentsMessage.style.display = 'block';
        assignmentsList.style.display = 'none';
    } else {
        noAssignmentsMessage.style.display = 'none';
        assignmentsList.style.display = 'block';
    }

    // Render assignments
    assignmentsList.innerHTML = filteredAssignments.map(assignment => {
        if (!assignment) return '';
        
        const assignmentClass = getClasses().find(c => c.id === assignment.classId);
        const dueDate = assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date';
        const status = assignment.status || 'pending';
        const classColor = assignmentClass ? intToRGBHex(assignmentClass.color) : '#cccccc';
        
        return `
            <div class="assignment-card" style="border-left: 4px solid ${classColor}">
                <div class="assignment-info">
                    <div class="assignment-title">${assignment.name || 'Untitled Assignment'}</div>
                    <div class="assignment-details">
                        <span class="assignment-class">
                            ${assignmentClass ? assignmentClass.name : 'Unknown Class'}
                        </span>
                        <span class="assignment-due-date">Due: ${dueDate}</span>
                        <span class="assignment-status status-${status}">
                            ${status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                    </div>
                    ${assignment.description ? `
                        <div class="assignment-description">
                            ${assignment.description}
                        </div>
                    ` : ''}
                </div>
                <div class="assignment-actions">
                    <button class="edit-btn" onclick="editAssignment('${assignment.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteAssignment('${assignment.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Edit assignment
async function editAssignment(id) {
    const assignments = getAssignments();
    const assignment = assignments.find(a => a.id === id);
    if (!assignment) return;

    currentlyEditingId = id;
    document.getElementById('modal-title').textContent = 'Edit Assignment';
    
    // Populate form fields
    document.getElementById('assignment-name').value = assignment.name;
    document.getElementById('assignment-class').value = assignment.classId;
    document.getElementById('assignment-due-date').value = assignment.dueDate;
    document.getElementById('assignment-description').value = assignment.description || '';
    document.getElementById('assignment-status').value = assignment.status;

    // Update Materialize form fields
    M.updateTextFields();
    M.FormSelect.init(document.getElementById('assignment-class'));
    M.FormSelect.init(document.getElementById('assignment-status'));

    // Open modal
    const modal = M.Modal.getInstance(assignmentModal);
    modal.open();
}

// Delete assignment
async function deleteAssignment(id) {
    if (confirm('Are you sure you want to delete this assignment?')) {
        const assignments = getAssignments();
        const newAssignments = assignments.filter(a => a.id !== id);
        await updateAssignments(newAssignments);
        renderAssignments();
        M.toast({html: 'Assignment deleted successfully'});
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    const assignmentData = {
        name: document.getElementById('assignment-name').value,
        classId: document.getElementById('assignment-class').value,
        dueDate: document.getElementById('assignment-due-date').value,
        description: document.getElementById('assignment-description').value,
        status: document.getElementById('assignment-status').value
    };

    const assignments = getAssignments();

    if (currentlyEditingId) {
        // Update existing assignment
        const index = assignments.findIndex(a => a.id === currentlyEditingId);
        if (index !== -1) {
            assignments[index] = {
                ...assignments[index],
                ...assignmentData
            };
            await updateAssignments(assignments);
            M.toast({html: 'Assignment updated successfully'});
        }
    } else {
        // Add new assignment
        const newAssignment = {
            ...assignmentData,
            id: Date.now().toString(),
            createdAt: Date.now()
        };
        assignments.push(newAssignment);
        await updateAssignments(assignments);
        M.toast({html: 'Assignment added successfully'});
    }

    renderAssignments();

    // Close modal
    const modal = M.Modal.getInstance(assignmentModal);
    modal.close();
}

// Make functions available globally for onclick handlers
window.editAssignment = editAssignment;
window.deleteAssignment = deleteAssignment;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 