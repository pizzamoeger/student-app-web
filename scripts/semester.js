import { data } from './classes.js';

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

async function loadAllSemesters() {
    data = 
    if (!data) return []


    const semesterString = data.semester; // get the classes field
    if (!semesterString) return []
    try {
        // try parsing it
        const semesterList = JSON.parse(semesterString);
        if (!Array.isArray(semesterList)) {
            throw new Error("Parsed classes is not an array");
        }
        return semesterList;
    } catch (err) {
        console.error("Error parsing 'classes':", err);
        throw err;
    }
}

// Load all semesters from the database
/*async function loadAllSemesters() {
    try {
        console.log('Loading all semesters from database');
        const semestersRef = db.collection('semesters');
        const snapshot = await semestersRef.get();
        
        if (snapshot.empty) {
            console.log('No semesters found in database');
            return;
        }

        console.log('Found', snapshot.size, 'semesters in database');
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error loading all semesters:', error);
        throw error;
    }
}*/

// Load semesters for the current user
async function loadSemesters() {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('No user logged in');
            return;
        }

        console.log('Loading semesters for user:', user.uid);
        
        // First, get all semesters from the database
        const allSemesters = await loadAllSemesters();
        
        // Clear existing list
        semesterList.innerHTML = '';
        
        if (!allSemesters || allSemesters.length === 0) {
            console.log('No semesters found');
        } else {
            console.log('Found', allSemesters.length, 'semesters');
            
            // Sort semesters by start date
            allSemesters.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
            
            allSemesters.forEach(semester => {
                console.log('Loading semester:', semester);
                const progress = calculateProgress(semester.startDate, semester.endDate);
                
                const item = document.createElement('div');
                item.className = 'semester-item';
                item.dataset.id = semester.id;
                
                item.innerHTML = `
                    <div class="semester-item-name">${semester.name}</div>
                    <div class="semester-item-dates">
                        ${formatDate(semester.startDate)} - ${formatDate(semester.endDate)}
                    </div>
                    <div class="semester-progress">
                        <div class="progress-bar" style="width: ${progress}%"></div>
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
        const user = auth.currentUser;
        if (!user) {
            console.error('No user logged in');
            return;
        }

        console.log('Adding new semester:', { name, startDate, endDate });
        const semestersRef = db.collection('semesters');
        
        const semesterData = {
            name,
            startDate,
            endDate,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        console.log('Saving new semester data:', semesterData);
        await semestersRef.add(semesterData);

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