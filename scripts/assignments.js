import { getCurrentSemester, getSemesters, getAssignments, updateAssignments, getClasses, initializeGlobalState, isStateInitialized } from './globalState.js';

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
async function init() {
    console.log('Initializing assignments page');
    try {
        // Show loading state
        document.getElementById('saving-overlay').style.display = 'flex';
        
        // Wait for global state to be initialized
        if (!isStateInitialized()) {
            console.log('Waiting for global state initialization...');
            await initializeGlobalState();
        }
        
        // Verify that initialization was successful
        if (!isStateInitialized()) {
            throw new Error('Failed to initialize global state');
        }

        // Wait for Materialize to be ready
        await new Promise(resolve => {
            if (typeof M !== 'undefined') {
                resolve();
            } else {
                document.addEventListener('DOMContentLoaded', resolve);
            }
        });
        
        // Initialize Materialize components
        initializeMaterialize();
        
        // Now that global state is ready, load assignments
        assignments = getAssignments() || [];
        console.log('Assignments loaded successfully:', assignments);

        // Setup event listeners after DOM is ready
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setupEventListeners();
        } else {
            document.addEventListener('DOMContentLoaded', setupEventListeners);
        }

        populateFilters();
        populateClassSelect();
        renderAssignments();
        console.log('Initialization complete');
        
        // Hide loading state
        document.getElementById('saving-overlay').style.display = 'none';
    } catch (error) {
        console.error('Error during initialization:', error);
        // Only show error toast if we actually failed to initialize
        if (!isStateInitialized()) {
            M.toast({html: 'Error loading data. Please try refreshing the page.'});
        }
        document.getElementById('saving-overlay').style.display = 'none';
    }
}

// Initialize Materialize components
function initializeMaterialize() {
    console.log('Initializing Materialize components');
    
    // Initialize select dropdowns
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        // Remove any existing initialization
        if (select.M_FormSelect) {
            select.M_FormSelect.destroy();
        }
        // Remove tabindex
        select.removeAttribute('tabindex');
        // Initialize with proper options
        M.FormSelect.init(select, {
            dropdownOptions: {
                container: document.body
            }
        });
    });

    // Initialize modal with proper options
    const modalElement = document.getElementById('assignment-modal');
    if (modalElement.M_Modal) {
        modalElement.M_Modal.destroy();
    }
    M.Modal.init(modalElement, {
        dismissible: true,
        onOpenStart: () => {
            // Reset validation state and repopulate classes
            const selects = modalElement.querySelectorAll('select');
            selects.forEach(select => {
                select.classList.remove('invalid');
                select.classList.remove('valid');
                select.removeAttribute('tabindex');
            });
            populateClassSelect();  // Repopulate classes when modal opens
        },
        onCloseEnd: () => {
            // Reset form and editing state when modal is closed
            assignmentForm.reset();
            currentlyEditingId = null;
            M.updateTextFields();
            
            // Reset select validation
            const selects = modalElement.querySelectorAll('select');
            selects.forEach(select => {
                select.classList.remove('invalid');
                select.classList.remove('valid');
                select.removeAttribute('tabindex');
            });
        }
    });
    
    // Initialize textareas
    const textareas = document.querySelectorAll('.materialize-textarea');
    textareas.forEach(textarea => {
        if (textarea.M_TextareaMaterial) {
            textarea.M_TextareaMaterial.destroy();
        }
        M.textareaAutoResize(textarea);
    });
    
    console.log('Materialize components initialized');
}

// Setup event listeners
function setupEventListeners() {
    // Add assignment button
    const addButton = document.getElementById('add-assignment-btn');
    if (addButton) {
        addButton.addEventListener('click', () => {
            currentlyEditingId = null;
            assignmentForm.reset();
            const modal = M.Modal.getInstance(assignmentModal);
            modal.open();
        });
    }

    // Form submission
    if (assignmentForm) {
        console.log('Setting up form submission listener');
        assignmentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Form submitted');

            // Custom validation
            const name = document.getElementById('assignment-name').value.trim();
            const dueDate = document.getElementById('assignment-due-date').value;
            const classId = document.getElementById('assignment-class').value;

            // Validate required fields
            if (!name || !dueDate) {
                console.log('Validation failed:', { name, dueDate });
                M.toast({html: 'Please fill in the assignment name and due date'});
                return;
            }
            
            console.log('Selected class ID:', classId);
            const classes = getClasses();
            const selectedClass = classes.find(c => Number(c.id) === Number(classId));
            console.log('Found class:', selectedClass);
            
            try {
                const assignmentData = {
                    title: name,
                    classId: classId ? Number(classId) : null,  // Convert to number if present
                    dueDate: dueDate,
                    description: document.getElementById('assignment-description').value.trim(),
                    status: document.getElementById('assignment-status').value || 'pending'
                };
                console.log('Form data:', assignmentData);

                const assignments = getAssignments();
                console.log('Current assignments:', assignments);
                console.log('Currently editing ID:', currentlyEditingId);

                if (currentlyEditingId) {
                    // Update existing assignment
                    const index = assignments.findIndex(a => Number(a.id) === Number(currentlyEditingId));
                    console.log('Found assignment at index:', index);
                    
                    if (index !== -1) {
                        assignments[index] = {
                            ...assignments[index],
                            ...assignmentData,
                            id: Number(assignments[index].id)  // Ensure ID remains a number
                        };
                        await updateAssignments(assignments);
                        M.toast({html: 'Assignment updated successfully'});
                    } else {
                        console.error('Could not find assignment to update');
                        M.toast({html: 'Error updating assignment'});
                        return;
                    }
                } else {
                    // Add new assignment
                    const newAssignment = {
                        ...assignmentData,
                        id: Date.now(),  // This will be a number
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
                
                // Reset the form and currentlyEditingId
                assignmentForm.reset();
                currentlyEditingId = null;
                
            } catch (error) {
                console.error('Error saving assignment:', error);
                M.toast({html: 'Error saving assignment'});
            }
        });
    }
    
    // Filter event listeners
    if (semesterFilter) {
        semesterFilter.addEventListener('change', () => {
            updateClassFilter();
            renderAssignments();
        });
    }
    if (classFilter) {
        classFilter.addEventListener('change', renderAssignments);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', renderAssignments);
    }

    // Add click event delegation for edit and delete buttons
    if (assignmentsList) {
        assignmentsList.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-btn');
            const deleteBtn = e.target.closest('.delete-btn');
            
            if (editBtn) {
                const id = editBtn.dataset.id;
                editAssignment(id);
            } else if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                deleteAssignment(id);
            }
        });
    }
}

// Populate filter dropdowns
function populateFilters() {
    // Populate semesters
    const semesters = getSemesters();
    semesterFilter.innerHTML = '<option value="all">All Semesters</option>';
    semesters.forEach(semester => {
        semesterFilter.innerHTML += `<option value="${Number(semester.id)}">${semester.name}</option>`;
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
    console.log('Classes:', classes);
    console.log('Selected semester:', selectedSemester);
    
    classFilter.innerHTML = '<option value="all">All Classes</option>';
    
    if (selectedSemester === 'all') {
        classes.forEach(cls => {
            classFilter.innerHTML += `<option value="${Number(cls.id)}">${cls.name}</option>`;
        });
    } else {
        const semester = getSemesters().find(sem => Number(sem.id) === Number(selectedSemester));
        console.log('Found semester:', semester);
        if (semester) {
            const semesterClasses = classes.filter(cls => 
                semester.classesInSemester.includes(Number(cls.id))
            );
            console.log('Classes in semester:', semesterClasses);
            semesterClasses.forEach(cls => {
                classFilter.innerHTML += `<option value="${Number(cls.id)}">${cls.name}</option>`;
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
    const currentSemester = getCurrentSemester();
    console.log('Available classes:', classes);
    console.log('Current semester:', currentSemester);
    
    // Clear existing options
    classSelect.innerHTML = '<option value="">Choose a class</option>';
    
    // Add class options only from current semester
    if (classes && classes.length > 0 && currentSemester) {
        const currentSemesterClasses = classes.filter(cls => 
            currentSemester.classesInSemester.includes(cls.id)
        );
        
        if (currentSemesterClasses.length > 0) {
            currentSemesterClasses.forEach(cls => {
                console.log('Adding class option:', cls);
                classSelect.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
            });
        } else {
            console.log('No classes in current semester');
            classSelect.innerHTML += '<option value="" disabled>No classes in current semester</option>';
        }
    } else {
        console.log('No classes found or no current semester');
        classSelect.innerHTML += '<option value="" disabled>No classes available</option>';
    }
    
    // Reinitialize select
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
    const classes = getClasses();
    console.log('Rendering assignments with classes:', classes);

    // Apply filters
    if (selectedClass !== 'all') {
        filteredAssignments = filteredAssignments.filter(a => Number(a.classId) === Number(selectedClass));
    } else if (selectedSemester !== 'all') {
        const semester = getSemesters().find(sem => Number(sem.id) === Number(selectedSemester));
        if (semester) {
            filteredAssignments = filteredAssignments.filter(a => {
                const assignmentClass = classes.find(c => Number(c.id) === Number(a.classId));
                return assignmentClass && semester.classesInSemester.includes(Number(assignmentClass.id));
            });
        }
    }

    // Check for overdue assignments and apply status filter
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to start of day for fair comparison

    if (selectedStatus === 'overdue') {
        filteredAssignments = filteredAssignments.filter(a => {
            const dueDate = new Date(a.dueDate);
            return dueDate < now && a.status !== 'completed';
        });
    } else if (selectedStatus !== 'all') {
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
        
        // Find the class for this assignment
        const assignmentClass = classes.find(c => Number(c.id) === Number(assignment.classId));
        
        const dueDate = new Date(assignment.dueDate);
        const isOverdue = dueDate < now && assignment.status !== 'completed';
        const dueDateStr = dueDate.toLocaleDateString();
        const status = isOverdue ? 'overdue' : (assignment.status || 'pending');
        const classColor = assignmentClass ? intToRGBHex(assignmentClass.color) : '#cccccc';
        
        return `
            <div class="assignment-card ${isOverdue ? 'assignment-overdue' : ''}" style="border-left: 4px solid ${classColor}">
                <div class="assignment-info">
                    <div class="assignment-title">${assignment.title || 'Untitled Assignment'}</div>
                    <div class="assignment-details">
                        <span class="assignment-class">
                            ${assignmentClass ? assignmentClass.name : 'Unknown Class'}
                        </span>
                        <span class="assignment-due-date">Due: ${dueDateStr}</span>
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
                    <button class="edit-btn" data-id="${assignment.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" data-id="${assignment.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Edit assignment
function editAssignment(id) {
    console.log('Editing assignment:', id);
    const assignments = getAssignments();
    console.log('All assignments:', assignments);
    
    // Convert id to both formats for comparison
    const numId = parseInt(id);
    const strId = id.toString();
    
    // Try to find assignment with either format
    const assignment = assignments.find(a => a.id === strId || a.id === numId);
    
    if (!assignment) {
        console.error('Assignment not found:', id);
        return;
    }

    currentlyEditingId = assignment.id;
    document.getElementById('modal-title').textContent = 'Edit Assignment';
    
    // Populate form fields
    document.getElementById('assignment-name').value = assignment.name || assignment.title;
    
    // Handle class select - make sure to populate classes first
    populateClassSelect();
    const classSelect = document.getElementById('assignment-class');
    if (assignment.classId) {
        classSelect.value = assignment.classId;
        M.FormSelect.init(classSelect);
    }
    
    // Set other fields
    document.getElementById('assignment-due-date').value = assignment.dueDate;
    document.getElementById('assignment-description').value = assignment.description || '';
    
    // Handle status select
    const statusSelect = document.getElementById('assignment-status');
    statusSelect.value = assignment.status || (assignment.completed ? 'completed' : 'pending');
    M.FormSelect.init(statusSelect);

    // Update all Materialize form fields
    M.updateTextFields();

    // Open modal
    const modal = M.Modal.getInstance(document.getElementById('assignment-modal'));
    modal.open();
}

// Delete assignment
async function deleteAssignment(id) {
    if (confirm('Are you sure you want to delete this assignment?')) {
        const assignments = getAssignments();
        const numId = Number(id);
        const newAssignments = assignments.filter(a => Number(a.id) !== numId);
        await updateAssignments(newAssignments);
        renderAssignments();
        M.toast({html: 'Assignment deleted successfully'});
    }
}

// Initialize when DOM is loaded and user is authenticated
auth.onAuthStateChanged(async user => {
    if (user) {
        console.log('User logged in, initializing assignments page');
        try {
            await init();
        } catch (error) {
            console.error('Error during initialization:', error);
            M.toast({html: 'Error initializing page. Please try refreshing.'});
            document.getElementById('saving-overlay').style.display = 'none';
        }
    } else {
        console.log('No user logged in');
        // Clear any existing assignments
        assignmentsList.innerHTML = '';
        noAssignmentsMessage.style.display = 'none';
        // Hide loading state if shown
        document.getElementById('saving-overlay').style.display = 'none';
    }
}); 