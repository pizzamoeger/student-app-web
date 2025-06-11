import { getSemesters, updateSemesters, initializeGlobalState, setCurrentSemester, getCurrentSemester, getClasses } from './globalState.js';

// Convert integer color to RGB hex string
function intToRGBHex(intValue) {
    const unsigned = (intValue) & 0xFFFFFFFF;
    const r = (unsigned >> 16) & 0xFF;
    const g = (unsigned >> 8) & 0xFF;
    const b = unsigned & 0xFF;
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// DOM Elements
const semesterList = document.getElementById('semester-list');
const addSemesterForm = document.getElementById('add-semester-form');

// Initialize Materialize components
document.addEventListener('DOMContentLoaded', function() {
    const modals = document.querySelectorAll('.modal');
    M.Modal.init(modals);

    // Initialize the add semester modal
    const addSemesterModal = document.getElementById('add-semester-modal');
    if (addSemesterModal) {
        const modalInstance = M.Modal.init(addSemesterModal, {
            onOpenStart: () => {
                const today = new Date();
                const sixMonthsFromNow = new Date();
                sixMonthsFromNow.setMonth(today.getMonth() + 6);

                // Format dates as YYYY-MM-DD
                const formatDate = (date) => {
                    return date.toISOString().split('T')[0];
                };

                document.getElementById('start-date').value = formatDate(today);
                document.getElementById('end-date').value = formatDate(sixMonthsFromNow);
            }
        });
    }

    // Add event listener for the confirm add semester button
    const confirmAddSemesterBtn = document.getElementById('confirm-add-semester');
    if (confirmAddSemesterBtn) {
        confirmAddSemesterBtn.addEventListener('click', () => {
            const name = document.getElementById('semester-name').value;
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;

            if (name && startDate && endDate) {
                addNewSemester(name, startDate, endDate);
                const modal = M.Modal.getInstance(addSemesterModal);
                modal.close();
                // Reset form
                document.getElementById('add-semester-form').reset();
            } else {
                M.toast({html: 'Please fill in all fields'});
            }
        });
    }

    // Load semesters
    loadSemesters();
});

// Format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Delete semester
async function deleteSemester(semesterId) {
    try {
        const allSemesters = getSemesters();
        const semesterToDelete = allSemesters.find(s => s.id === semesterId);
        
        if (!semesterToDelete) {
            throw new Error('Semester not found');
        }

        // Check if it's the current semester
        const currentSemester = getCurrentSemester();
        if (currentSemester && currentSemester.id === semesterId) {
            M.toast({html: 'Cannot delete the current semester. Please set another semester as current first.'});
            return;
        }

        // Check if there are other semesters
        if (allSemesters.length <= 1) {
            M.toast({html: 'Cannot delete the last semester. At least one semester must remain.'});
            return;
        }

        // Remove the semester
        const updatedSemesters = allSemesters.filter(s => s.id !== semesterId);
        await updateSemesters(updatedSemesters);
        
        M.toast({html: 'Semester deleted successfully'});
        loadSemesters(); // Reload the list
    } catch (error) {
        console.error('Error deleting semester:', error);
        M.toast({html: 'Error deleting semester'});
    }
}

// Load semesters for the current user
async function loadSemesters() {
    try {
        const semesters = getSemesters();
        const semesterList = document.getElementById('semester-list');
        const currentSemester = getCurrentSemester();
        
        // Sort semesters: current semester first, then by start date (newest first)
        const sortedSemesters = semesters ? [...semesters].sort((a, b) => {
            // If a is current semester, it comes first
            if (currentSemester && a.id === currentSemester.id) return -1;
            // If b is current semester, it comes first
            if (currentSemester && b.id === currentSemester.id) return 1;
            // Otherwise sort by start date
            return new Date(b.start) - new Date(a.start);
        }) : [];

        semesterList.innerHTML = `
            <button class="btn waves-effect waves-light add-semester-btn" id="add-semester-btn">
                <i class="material-icons left">add</i>Add Semester
            </button>
            <div class="semester-list-content">
                ${!sortedSemesters || sortedSemesters.length === 0 ? 
                    '<div class="no-semesters">No semesters found. Add your first semester!</div>' :
                    sortedSemesters.map(semester => {
                        const isCurrentSemester = currentSemester && currentSemester.id === semester.id;
                        const startDate = new Date(semester.start);
                        const endDate = new Date(semester.end);
                        const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)); // Duration in days
                        
                        return `
                            <div class="semester-item ${isCurrentSemester ? 'current' : ''}" data-id="${semester.id}">
                                <div class="semester-item-content">
                                    <div class="semester-item-main">
                                        <h5>${semester.name}</h5>
                                        <div class="semester-dates">
                                            ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div class="semester-item-footer">
                                    <div class="semester-stats">
                                        <div class="stat-item">
                                            <i class="material-icons">schedule</i>
                                            <span>${duration} days</span>
                                        </div>
                                        <div class="stat-item">
                                            <i class="material-icons">class</i>
                                            <span>${semester.classesInSemester.length} classes</span>
                                        </div>
                                    </div>
                                    <button class="btn-flat delete-semester-btn" data-id="${semester.id}">
                                        <i class="material-icons">delete</i>
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')
                }
            </div>
        `;

        // Add click event listener for the Add Semester button
        const addSemesterBtn = document.getElementById('add-semester-btn');
        if (addSemesterBtn) {
            addSemesterBtn.addEventListener('click', () => {
                const modal = document.getElementById('add-semester-modal');
                const instance = M.Modal.getInstance(modal);
                if (instance) {
                    instance.open();
                }
            });
        }

        // Add click event listeners to semester items
        document.querySelectorAll('.semester-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking on a button or its children
                if (e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) {
                    return;
                }
                const semesterId = parseInt(item.dataset.id);
                const semester = sortedSemesters.find(s => s.id === semesterId);
                if (semester) {
                    displaySemesterDetails(semester);
                }
            });
        });

        // Add click event listeners to delete buttons
        document.querySelectorAll('.delete-semester-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the semester item click
                const semesterId = parseInt(btn.dataset.id);
                if (confirm('Are you sure you want to delete this semester?')) {
                    deleteSemester(semesterId);
                }
            });
        });

        // If there's a current semester, display its details
        if (currentSemester) {
            displaySemesterDetails(currentSemester);
        }

        // Hide loading overlay after successful load
        document.getElementById('saving-overlay').style.display = 'none';

    } catch (error) {
        console.error('Error loading semesters:', error);
        M.toast({html: 'Error loading semesters'});
        // Hide loading overlay on error
        document.getElementById('saving-overlay').style.display = 'none';
    }
}

// Calculate semester progress
function calculateProgress(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    const totalDuration = end - start;
    const elapsed = today - start;
    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
}

// Update progress bar display
function updateProgressBar(progress) {
    const progressBar = document.querySelector('.progress-bar');
    const progressPercentage = document.querySelector('.progress-percentage');
    if (progressBar && progressPercentage) {
        progressBar.style.width = `${progress}%`;
        progressPercentage.textContent = `${Math.round(progress)}%`;
    }
}

// Update semester details
async function updateSemesterDetails(semesterId, updates) {
    try {
        const allSemesters = getSemesters();
        const semesterIndex = allSemesters.findIndex(s => s.id === semesterId);
        
        if (semesterIndex === -1) {
            throw new Error('Semester not found');
        }

        // Update the semester
        allSemesters[semesterIndex] = {
            ...allSemesters[semesterIndex],
            ...updates
        };

        // Save changes
        await updateSemesters(allSemesters);
        
        // If this is the current semester, update it
        const currentSemester = getCurrentSemester();
        if (currentSemester && currentSemester.id === semesterId) {
            setCurrentSemester(allSemesters[semesterIndex]);
        }

        M.toast({html: 'Semester updated successfully'});
        loadSemesters(); // Reload the list
    } catch (error) {
        console.error('Error updating semester:', error);
        M.toast({html: 'Error updating semester'});
    }
}

// Add class to semester
async function addClassToSemester(semesterId, classId) {
    try {
        const allSemesters = getSemesters();
        const semesterIndex = allSemesters.findIndex(s => s.id === semesterId);
        
        if (semesterIndex === -1) {
            throw new Error('Semester not found');
        }

        // Check if class is already in the semester
        if (allSemesters[semesterIndex].classesInSemester.includes(classId)) {
            M.toast({html: 'Class is already in this semester'});
            return;
        }

        // Add class to semester
        allSemesters[semesterIndex].classesInSemester.push(classId);

        // Save changes
        await updateSemesters(allSemesters);
        
        // If this is the current semester, update it
        const currentSemester = getCurrentSemester();
        if (currentSemester && currentSemester.id === semesterId) {
            setCurrentSemester(allSemesters[semesterIndex]);
        }

        M.toast({html: 'Class added to semester'});
        displaySemesterDetails(allSemesters[semesterIndex]); // Refresh the details view
    } catch (error) {
        console.error('Error adding class to semester:', error);
        M.toast({html: 'Error adding class to semester'});
    }
}

// Remove class from semester
async function removeClassFromSemester(semesterId, classId) {
    try {
        const allSemesters = getSemesters();
        const semesterIndex = allSemesters.findIndex(s => s.id === semesterId);
        
        if (semesterIndex === -1) {
            throw new Error('Semester not found');
        }

        // Remove class from semester
        allSemesters[semesterIndex].classesInSemester = 
            allSemesters[semesterIndex].classesInSemester.filter(id => id !== classId);

        // Save changes
        await updateSemesters(allSemesters);
        
        // If this is the current semester, update it
        const currentSemester = getCurrentSemester();
        if (currentSemester && currentSemester.id === semesterId) {
            setCurrentSemester(allSemesters[semesterIndex]);
        }

        M.toast({html: 'Class removed from semester'});
        displaySemesterDetails(allSemesters[semesterIndex]); // Refresh the details view
    } catch (error) {
        console.error('Error removing class from semester:', error);
        M.toast({html: 'Error removing class from semester'});
    }
}

// Display semester details
function displaySemesterDetails(semester) {
    const detailsContainer = document.getElementById('semester-details');
    const currentSemester = getCurrentSemester();
    const isCurrentSemester = currentSemester && currentSemester.id === semester.id;
    
    // Remove selected class from all semester items
    document.querySelectorAll('.semester-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Add selected class to the current semester item
    const selectedItem = document.querySelector(`.semester-item[data-id="${semester.id}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    // Calculate semester duration
    const startDate = new Date(semester.start);
    const endDate = new Date(semester.end);
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)); // Duration in days
    
    // Calculate progress
    const progress = calculateProgress(semester.start, semester.end);
    
    const currentSemesterBadge = isCurrentSemester ? 
        '<span class="current-semester-badge"><span>Current Semester</span></span>' :
        '<button class="set-current-btn" id="set-current-btn"><i class="material-icons">star</i><span>Set as Current</span></button>';
    
    // Get all classes and filter for classes in this semester
    const allClasses = getClasses();
    const semesterClasses = semester.classesInSemester.map(classId => {
        const classData = allClasses.find(c => c.id === classId);
        return classData ? classData : null;
    }).filter(Boolean);

    // Get classes not in this semester
    const availableClasses = allClasses.filter(c => !semester.classesInSemester.includes(c.id));
    
    detailsContainer.innerHTML = `
        <div class="semester-details-content">
            <div class="semester-header">
                <div class="editable-name">
                    <h4 id="semester-name" contenteditable="true">${semester.name}</h4>
                    <i class="material-icons edit-icon">edit</i>
                </div>
                <div class="semester-header-right">
                    ${currentSemesterBadge}
                </div>
            </div>
            <div class="semester-info">
                <div class="info-item">
                    <i class="material-icons">event</i>
                    <div class="editable-date">
                        <span>Start Date: </span>
                        <input type="date" id="semester-start-date" value="${semester.start}" class="date-input">
                    </div>
                </div>
                <div class="info-item">
                    <i class="material-icons">event</i>
                    <div class="editable-date">
                        <span>End Date: </span>
                        <input type="date" id="semester-end-date" value="${semester.end}" class="date-input">
                    </div>
                </div>
                <div class="info-item">
                    <i class="material-icons">schedule</i>
                    <span>Duration: ${duration} days</span>
                </div>
            </div>
            <div class="semester-progress">
                <div class="progress-label">Semester Progress</div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
                <div class="progress-percentage">${Math.round(progress)}%</div>
            </div>
            <div class="semester-classes">
                <div class="classes-header">
                    <h5>Classes in this Semester</h5>
                    <div class="class-selector">
                        <select id="class-select" class="browser-default">
                            <option value="" disabled selected>Add a class</option>
                            ${availableClasses.map(c => 
                                `<option value="${c.id}">${c.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                <div class="">
                    ${semesterClasses.length > 0 
                        ? semesterClasses.map(c => {
                            const colorHex = intToRGBHex(c.color);
                            return `
                                <div class="semester-class-tag" style="background-color: ${colorHex}">
                                    <span class="semester-class-name">${c.name}</span>
                                    <button class="remove-class-btn" data-id="${c.id}">
                                        <i class="material-icons">close</i>
                                    </button>
                                </div>
                            `;
                        }).join('')
                        : '<div class="no-classes">No classes added to this semester yet</div>'}
                </div>
            </div>
        </div>
    `;

    // Add event listeners for editing
    const nameElement = document.getElementById('semester-name');
    const startDateInput = document.getElementById('semester-start-date');
    const endDateInput = document.getElementById('semester-end-date');
    const classSelect = document.getElementById('class-select');

    // Handle name editing
    nameElement.addEventListener('blur', () => {
        const newName = nameElement.textContent.trim();
        if (newName && newName !== semester.name) {
            updateSemesterDetails(semester.id, { name: newName });
        }
    });

    // Handle date editing
    startDateInput.addEventListener('change', () => {
        const newStartDate = startDateInput.value;
        if (newStartDate && newStartDate !== semester.start) {
            // Update progress bar immediately
            const newProgress = calculateProgress(newStartDate, semester.end);
            updateProgressBar(newProgress);
            // Save the change
            updateSemesterDetails(semester.id, { start: newStartDate });
        }
    });

    endDateInput.addEventListener('change', () => {
        const newEndDate = endDateInput.value;
        if (newEndDate && newEndDate !== semester.end) {
            // Update progress bar immediately
            const newProgress = calculateProgress(semester.start, newEndDate);
            updateProgressBar(newProgress);
            // Save the change
            updateSemesterDetails(semester.id, { end: newEndDate });
        }
    });

    // Handle class selection
    classSelect.addEventListener('change', () => {
        const selectedClassId = parseInt(classSelect.value);
        if (selectedClassId) {
            addClassToSemester(semester.id, selectedClassId);
            classSelect.value = ''; // Reset selection
        }
    });

    // Handle class removal
    document.querySelectorAll('.remove-class-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const classId = parseInt(btn.dataset.id);
            if (confirm('Are you sure you want to remove this class from the semester?')) {
                removeClassFromSemester(semester.id, classId);
            }
        });
    });

    // Add event listener for the "Set as Current" button if it exists
    const setCurrentBtn = document.getElementById('set-current-btn');
    if (setCurrentBtn) {
        setCurrentBtn.addEventListener('click', async () => {
            await setCurrentSemester(semester);
            M.toast({html: `${semester.name} set as current semester`});
            // Update the UI immediately
            const semesterHeader = document.querySelector('.semester-header-right');
            if (semesterHeader) {
                semesterHeader.innerHTML = '<span class="current-semester-badge"><span>Current Semester</span></span>';
            }
            // Update the semester list to show the current indicator
            loadSemesters();
        });
    }

    // Add event listener for the current semester badge
    const currentBadge = document.querySelector('.current-semester-badge');
    if (currentBadge) {
        currentBadge.addEventListener('click', async () => {
            await setCurrentSemester(semester);
            M.toast({html: `${semester.name} is already the current semester`});
        });
    }
}

// Add a new semester
async function addNewSemester(name, startDate, endDate) {
    try {
        // Set default dates if not provided
        const today = new Date();
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(today.getMonth() + 6);
        
        const defaultStartDate = startDate || today.toISOString().split('T')[0];
        const defaultEndDate = endDate || sixMonthsFromNow.toISOString().split('T')[0];

        // Get existing semesters and find max ID
        const existingSemesters = getSemesters();
        const maxId = existingSemesters.reduce((max, semester) => Math.max(max, semester.id), 0);
        const newId = maxId + 1;

        const semesterData = {
            id: newId,
            name: name,
            start: defaultStartDate,
            end: defaultEndDate,
            classesInSemester: []
        };

        let semesterList = getSemesters();
        // Add new semester at the beginning of the list
        semesterList = [semesterData, ...semesterList];

        await updateSemesters(semesterList);
        
        // Set it as current semester
        setCurrentSemester(semesterData);
        
        M.toast({html: 'New semester added successfully!'});
        loadSemesters(); // Reload the semester list
        displaySemesterDetails(semesterData); // Show the new semester details
    } catch (error) {
        console.error('Error adding semester:', error);
        M.toast({html: 'Error adding semester'});
    }
}

// Initialize
auth.onAuthStateChanged(async user => {
    if (user) {
        console.log('User logged in:', user.uid);
        try {
            // Show loading overlay
            document.getElementById('saving-overlay').style.display = 'flex';
            
            // Wait for global state to be initialized
            await initializeGlobalState();
            
            // Only load semesters if we have a valid user ID
            if (user.uid) {
                await loadSemesters();
            } else {
                console.error('No user ID available');
                M.toast({html: 'Error: No user ID available'});
                document.getElementById('saving-overlay').style.display = 'none';
            }
        } catch (error) {
            console.error('Error during initialization:', error);
            M.toast({html: 'Error initializing application'});
            document.getElementById('saving-overlay').style.display = 'none';
        }
    } else {
        console.log('No user logged in');
        // Clear the semester list when logged out
        semesterList.innerHTML = '<div class="no-semesters">Please log in to view semesters</div>';
        // Hide loading overlay when not logged in
        document.getElementById('saving-overlay').style.display = 'none';
    }
}); 