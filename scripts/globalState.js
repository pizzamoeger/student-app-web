// Global state object
const globalState = {
    uid: null,
    // User data
    userData: null,
    // Current semester
    currentSemester: null,
    // All semesters
    semesters: [],
    // All classes
    classes: [],
    // All assignments
    assignments: [],
    // Loading state
    isLoading: false,
    // Error state
    error: null
};

async function getData() {
    try {
        const doc = await db.collection("user").doc(globalState.uid).get();
        if (doc.exists) {
            console.log("Document data:", doc.data());
            return doc.data();
        } else {
            console.log("No such document for this user.");
            return {"classes":"[]", "semester":"[]", "assignments":"[]"};
        }
    } catch (error) {
        console.error("Error getting document:", error);
        throw error;
    }
}

// Initialize function to be called when any page loads
export async function initializeGlobalState() {
    try {
        globalState.isLoading = true;
        
        // Get the current user
        const user = auth.currentUser;
        if (!user || !user.uid) {
            throw new Error('No user logged in');
        }
        
        // Set the user ID
        globalState.uid = user.uid;
        
        const data = await getData();
        globalState.userData = data;
        
        // Parse and set semesters
        if (data.semester) {
            try {
                globalState.semesters = JSON.parse(data.semester);
            } catch (err) {
                console.error("Error parsing semester data:", err);
                globalState.semesters = [];
            }
        }

        // Parse and set classes
        if (data.classes) {
            try {
                console.log('Raw classes data:', data.classes);
                const parsedClasses = JSON.parse(data.classes);
                console.log('Parsed classes:', parsedClasses);
                
                // Ensure class IDs are consistent by converting them to numbers
                globalState.classes = parsedClasses.map(cls => ({
                    ...cls,
                    id: Number(cls.id)  // Convert all IDs to numbers for consistency
                }));
                console.log('Normalized classes:', globalState.classes);
            } catch (err) {
                console.error("Error parsing classes data:", err);
                globalState.classes = [];
            }
        } else {
            console.log('No classes data found in Firebase');
            globalState.classes = [];
        }

        // Parse and set assignments
        if (data.assignments) {
            try {
                globalState.assignments = JSON.parse(data.assignments);
            } catch (err) {
                console.error("Error parsing assignments data:", err);
                globalState.assignments = [];
            }
        }

        // Set current semester if it exists in the data
        if (data.currentSemesterId) {
            const currentSemester = globalState.semesters.find(s => s.id === data.currentSemesterId);
            if (currentSemester) {
                globalState.currentSemester = currentSemester;
            }
        }

        globalState.isLoading = false;
    } catch (error) {
        console.error("Error initializing global state:", error);
        globalState.error = error;
        globalState.isLoading = false;
        throw error;
    }
}

// Getters
export function getGlobalState() {
    return globalState;
}

export function getSemesters() {
    return globalState.semesters;
}

export function getClasses() {
    console.log('Getting classes from global state:', globalState.classes);
    return globalState.classes;
}

export function getCurrentSemester() {
    return globalState.currentSemester;
}

export function getUserData() {
    return globalState.userData;
}

export function getAssignments() {
    return globalState.assignments;
}

// Setters
export function setCurrentSemester(semester) {
    globalState.currentSemester = semester;
    // Update current semester ID in database
    saveCurrentSemesterIdToDB(semester.id);
}

async function saveCurrentSemesterIdToDB(semesterId) {
    const docRef = db.collection("user").doc(globalState.uid);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        console.log("No such document exists. Creating it...");
        await docRef.set({
            currentSemesterId: semesterId,
        });
    } else {
        console.log("Document exists. Updating it...");
        await docRef.update({
            currentSemesterId: semesterId,
        });
    }
}

export async function updateSemesters(newSemesters) {
    globalState.semesters = newSemesters;
    // Update in database
    await saveNewSemesterListToDB(JSON.stringify(newSemesters));
}

async function saveNewSemesterListToDB(semesterString) {
    const docRef = db.collection("user").doc(globalState.uid);
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


export async function updateClasses(newClasses) {
    globalState.classes = newClasses;
    // Update in database
    await saveNewClassListToDB(JSON.stringify(newClasses));
}

async function saveNewClassListToDB(classString) {
    const docRef = db.collection("user").doc(globalState.uid);
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

export async function updateAssignments(newAssignments) {
    globalState.assignments = newAssignments;
    // Update in database
    await saveAssignmentsToDB(JSON.stringify(newAssignments));
}

async function saveAssignmentsToDB(assignmentsString) {
    const docRef = db.collection("user").doc(globalState.uid);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        console.log("No such document exists. Creating it...");
        await docRef.set({
            assignments: assignmentsString,
        });
    } else {
        console.log("Document exists. Updating it...");
        await docRef.update({
            assignments: assignmentsString,
        });
    }
}

// Helper function to check if state is initialized
export function isStateInitialized() {
    return globalState.userData !== null;
}

export function setUID(newUid) {
    globalState.uid = newUid
}