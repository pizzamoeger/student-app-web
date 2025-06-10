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
            return {"classes":"[]", "semester":"[]"};
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
                globalState.classes = JSON.parse(data.classes);
            } catch (err) {
                console.error("Error parsing classes data:", err);
                globalState.classes = [];
            }
        }

        globalState.isLoading = false;
    } catch (error) {
        console.error("Error initializing global state:", error);
        globalState.error = error;
        globalState.isLoading = false;
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
    return globalState.classes;
}

export function getCurrentSemester() {
    return globalState.currentSemester;
}

export function getUserData() {
    return globalState.userData;
}

// Setters
export function setCurrentSemester(semester) {
    globalState.currentSemester = semester;
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

// Helper function to check if state is initialized
export function isStateInitialized() {
    return globalState.userData !== null;
}

export function setUID(newUid) {
    globalState.uid = newUid
}