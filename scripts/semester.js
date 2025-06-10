import { getSemesters, updateSemesters, initializeGlobalState, setCurrentSemester, getCurrentSemester } from './globalState.js';

// DOM Elements
const semesterList = document.getElementById('semester-list');
const addSemesterForm = document.getElementById('add-semester-form');

// Initialize Materialize components
document.addEventListener('DOMContentLoaded', function() {
    const modals = document.querySelectorAll('.modal');
    M.Modal.init(modals);
});

// Format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Load semesters for the current user
async function loadSemesters() {
    try {
        const allSemesters = getSemesters();
        const currentSemester = getCurrentSemester();
        console.log(allSemesters)
        
        // Clear existing list
        semesterList.innerHTML = '';
        
        if (!allSemesters || allSemesters.length === 0) {
            console.log('No semesters found, creating default semester');
            
            // Create default semester
            const today = new Date();
            const endDate = new Date();
            endDate.setMonth(today.getMonth() + 6); // 6 months from now
            
            const defaultSemester = {
                id: 1, // First semester gets ID 1
                name: "Default Semester",
                start: today.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0],
                classesInSemester: []
            };

            // Add the default semester
            await updateSemesters([defaultSemester]);
            
            // Set it as current semester
            setCurrentSemester(defaultSemester);
            
            // Reload the list with the new semester
            await loadSemesters();
            return;
        }
        
        console.log('Found', allSemesters.length, 'semesters');
        
        // Sort semesters by start date
        allSemesters.sort((a, b) => new Date(a.start) - new Date(b.start));
        
        allSemesters.forEach(semester => {
            console.log('Loading semester:', semester);
            
            const item = document.createElement('div');
            item.className = 'semester-item';
            item.dataset.id = semester.id;
            
            // Add active class if this is the current semester
            if (currentSemester && currentSemester.id === semester.id) {
                item.classList.add('active');
            }
            
            item.innerHTML = `
                <div class="semester-item-name">
                    ${semester.name}
                    ${currentSemester && currentSemester.id === semester.id ? 
                        '<span class="current-semester-badge">Current</span>' : ''}
                </div>
                <div class="semester-item-dates">
                    ${formatDate(semester.start)} - ${formatDate(semester.end)}
                </div>
            `;
            
            // Add click handler for semester selection
            item.addEventListener('click', () => {
                // Remove active class from all items
                document.querySelectorAll('.semester-item').forEach(el => {
                    el.classList.remove('active');
                });
                // Add active class to clicked item
                item.classList.add('active');
                // Display semester details
                displaySemesterDetails(semester);
            });
            
            semesterList.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading semesters:', error);
        M.toast({html: 'Error loading semesters'});
    }
}

// Display semester details
function displaySemesterDetails(semester) {
    const detailsContainer = document.getElementById('semester-details');
    const currentSemester = getCurrentSemester();
    const isCurrentSemester = currentSemester && currentSemester.id === semester.id;
    
    // Calculate semester duration
    const startDate = new Date(semester.start);
    const endDate = new Date(semester.end);
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)); // Duration in days
    
    // Calculate progress
    const today = new Date();
    const totalDuration = endDate - startDate;
    const elapsed = today - startDate;
    const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
    
    const currentSemesterBadge = isCurrentSemester ? 
        '<span class="current-semester-badge">Current Semester</span>' :
        '<button class="btn waves-effect waves-light set-current-btn" id="set-current-btn">' +
        '<i class="material-icons left">star</i>Set as Current Semester</button>';
    
    detailsContainer.innerHTML = `
        <div class="semester-details-content">
            <div class="semester-header">
                <h4>${semester.name}</h4>
                ${currentSemesterBadge}
            </div>
            <div class="semester-info">
                <div class="info-item">
                    <i class="material-icons">event</i>
                    <span>Start Date: ${formatDate(semester.start)}</span>
                </div>
                <div class="info-item">
                    <i class="material-icons">event</i>
                    <span>End Date: ${formatDate(semester.end)}</span>
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
                <h5>Classes in this Semester</h5>
                <div class="classes-list">
                    ${semester.classesInSemester.length > 0 
                        ? semester.classesInSemester.map(classId => `<div class="class-item">Class ID: ${classId}</div>`).join('')
                        : '<div class="no-classes">No classes added to this semester yet</div>'}
                </div>
            </div>
        </div>
    `;

    // Add event listener for the "Set as Current" button if it exists
    const setCurrentBtn = document.getElementById('set-current-btn');
    if (setCurrentBtn) {
        setCurrentBtn.addEventListener('click', () => {
            setCurrentSemester(semester);
            M.toast({html: `${semester.name} set as current semester`});
            loadSemesters(); // Reload the list to update the current semester indicator
        });
    }
}

// Add new semester
async function addNewSemester(name, startDate, endDate) {
    try {
        console.log('Adding new semester:', { name, startDate, endDate });

        // Get existing semesters and find max ID
        const existingSemesters = getSemesters();
        const maxId = existingSemesters.reduce((max, semester) => Math.max(max, semester.id), 0);
        const newId = maxId + 1;

        const semesterData = {
            id: newId,
            name: name,
            end: endDate,
            start: startDate,
            classesInSemester: []        
        };

        let semesterList = getSemesters();
        semesterList.push(semesterData);

        console.log('Saving new semester data:', semesterList);
        await updateSemesters(semesterList);

        M.toast({html: 'New semester added successfully!'});
        loadSemesters(); // Reload the semester list
    } catch (error) {
        console.error('Error adding semester:', error);
        M.toast({html: 'Error adding semester'});
    }
}

// Event Listeners
addSemesterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('new-semester-name').value;
    const startDate = document.getElementById('new-start-date').value;
    const endDate = document.getElementById('new-end-date').value;
    
    addNewSemester(name, startDate, endDate);
    
    // Reset form and close modal
    addSemesterForm.reset();
    const modal = M.Modal.getInstance(document.getElementById('modal-add-semester'));
    modal.close();
});

// Initialize
auth.onAuthStateChanged(async user => {
    if (user) {
        console.log('User logged in:', user.uid);
        // Wait for global state to be initialized
        await initializeGlobalState();
        loadSemesters();
    } else {
        console.log('No user logged in');
    }
}); 