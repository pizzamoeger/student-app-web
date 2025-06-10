import { getData, uid } from './auth.js';

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
    try {
        const data = await getData();
        console.log("Received data:", data);

        const semesterString = data.semester; // get the semester field
        if (!semesterString) {
            console.log("No semester data found");
            return [];
        }

        try {
            // try parsing it
            const semesterList = JSON.parse(semesterString);
            if (!Array.isArray(semesterList)) {
                console.error("Parsed semester data is not an array");
                return [];
            }
            console.log("Parsed semester list:", semesterList);
            return semesterList;
        } catch (err) {
            console.error("Error parsing semester data:", err);
            return [];
        }
    } catch (error) {
        console.error("Error loading semesters:", error);
        return [];
    }
}

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
                // const progress = calculateProgress(semester.startDate, semester.endDate);
                
                const item = document.createElement('div');
                item.className = 'semester-item';
                item.dataset.id = semester.id;
                
                item.innerHTML = `
                    <div class="semester-item-name">${semester.name}</div>
                    <div class="semester-item-dates">
                        ${formatDate(semester.startDate)} - ${formatDate(semester.endDate)}
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

export async function saveNewSemesterList(newSemesterList) {
    const semesterString = JSON.stringify(newSemesterList)
    const data = getData()
    data.semester = semesterString;
    console.log(semesterString)
    await saveNewSemesterListToDB(semesterString)
}

async function saveNewSemesterListToDB(semesterString) {
    const docRef = db.collection("user").doc(uid);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        console.log("No such document exists. Creating it...");
        await docRef.set({
            semester: semesterString,
        });
    } else {
        console.log("Document exists. Updating it...");
        await docRef.update({
            semester: semesterString,
        });
    }
}

// Add new semester
async function addNewSemester(name, startDate, endDate) {
    try {
        console.log('Adding new semester:', { name, startDate, endDate });
        
        /*const semesterData = {
            name,
            startDate,
            endDate
        };*/

        const semesterData = { // class that should be edited
            id: 5,
            name: name,
            end: endDate,
            start: startDate,
            classesInSemester: []        
        }

        let semesterList = await loadAllSemesters();
        (semesterList).push(semesterData);


        console.log('Saving new semester data:', semesterList);
        await saveNewSemesterList(semesterList);

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