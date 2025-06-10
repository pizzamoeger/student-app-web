import { getSemesters, updateSemesters } from './globalState.js';

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
        
        // Clear existing list
        semesterList.innerHTML = '';
        
        if (!allSemesters || allSemesters.length === 0) {
            console.log('No semesters found');
        } else {
            console.log('Found', allSemesters.length, 'semesters');
            
            // Sort semesters by start date
            allSemesters.sort((a, b) => new Date(a.start) - new Date(b.start));
            
            allSemesters.forEach(semester => {
                console.log('Loading semester:', semester);
                
                const item = document.createElement('div');
                item.className = 'semester-item';
                item.dataset.id = semester.id;
                
                item.innerHTML = `
                    <div class="semester-item-name">${semester.name}</div>
                    <div class="semester-item-dates">
                        ${formatDate(semester.start)} - ${formatDate(semester.end)}
                    </div>
                `;
                
                semesterList.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error loading semesters:', error);
        M.toast({html: 'Error loading semesters'});
    }
}

// Add new semester
async function addNewSemester(name, startDate, endDate) {
    try {
        console.log('Adding new semester:', { name, startDate, endDate });

        const semesterData = {
            id: Date.now(), // Use timestamp as unique ID
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
auth.onAuthStateChanged(user => {
    if (user) {
        console.log('User logged in:', user.uid);
        loadSemesters();
    } else {
        console.log('No user logged in');
    }
}); 