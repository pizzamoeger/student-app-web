// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// TODO IMPORTANT http://nest.hackclub.com/
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBqQkGDw0kRlyCLUxhEb1hzUnPnfPDWMOQ",
    authDomain: "student-app-924e4.firebaseapp.com",
    projectId: "student-app-924e4",
    storageBucket: "student-app-924e4.firebasestorage.app",
    messagingSenderId: "1009631248066",
    appId: "1:1009631248066:web:53c121933b86f00204855b",
    measurementId: "G-935GV9TRS6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// TODO this is temp temp temp temp!!!!!!!!!!!!!!!!!!!!!!!!
const docRef = doc(db, "user", "QQdlCkXBdxd0yUQEepkjXQspxXu1");

const container = document.getElementById("classes-div")

var pendingSeconds = 0
let currentlyTrackingClass = 0

function intToHSL(intColor) {
    // Extract RGB components from the integer
    const r = ((intColor >> 16) & 0xFF) / 255;
    const g = ((intColor >> 8) & 0xFF) / 255;
    const b = (intColor & 0xFF) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }

    // Convert to degrees and percentage
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `hsl(${h}, ${s}%, ${l}%)`;
}

function formatSeconds(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getLastWeekDates() {
    const today = new Date();

    // Get the previous Monday (start of last week)
    const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6
    const daysSinceMonday = (dayOfWeek + 6) % 7; // days since last Monday
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - daysSinceMonday );

    // Generate all 7 dates from last Monday to Sunday
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(lastMonday);
        date.setDate(lastMonday.getDate() + i);
        dates.push(date.toISOString().split('T')[0]); // format as YYYY-MM-DD
    }

    return dates;
}

function getLastMonthDates() {
    const today = new Date();
    const firstOfMonth = new Date(today);
    firstOfMonth.setDate(1)

    const dates = [];
    for (let i = 0; i <= 31; i++) {
        const date = new Date(firstOfMonth);
        date.setDate(firstOfMonth.getDate() + i);
        if (date.getMonth() != today.getMonth()) break
        dates.push(date.toISOString().split('T')[0]);
    }

    return dates
}

function getDate(d) {
    const date = new Date(d);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0'); // Months start at 0!
    const dd = String(date.getDate()).padStart(2, '0');

    const formattedDate = `${yyyy}-${mm}-${dd}`;
    return formattedDate.toString()
}

function renderClassCard(clazz) {
    const template = document.getElementById("stopwatch-class-blueprint-normal")

    const clone = template.content.cloneNode(true);
    clone.id = "class" + clazz.id; // set id

    const card = clone.querySelector('.card');

    card.classList.add("class-card");
    card.style.backgroundColor = intToRGBHex(clazz.color); // set backgroud color
    card.querySelector('h3').textContent = clazz.name // set name

    const secToday = clazz.studyTime[getDate(new Date())]
    const secWeek = getSecondsWeek(clazz)
    const secMonth = getSecondsMonth(clazz)
    card.querySelector('.today-time').textContent = "Today: "+formatSeconds(secToday?secToday:0)
    card.querySelector('.week-time').textContent = "This week: "+formatSeconds(secWeek)
    card.querySelector('.month-time').textContent = "This month: "+formatSeconds(secMonth)

    let intervalId = null;
    card.querySelector('#start-button').addEventListener("click", async () => {
        if (!intervalId) {
            if (currentlyTrackingClass) return
            currentlyTrackingClass = clazz
            card.querySelector('#start-button').textContent = "Stop"
            intervalId = setInterval(() => {
                // Replace this with whatever you want to run every second
                pendingSeconds++
                card.querySelector('.today-time').textContent = "Today: "+formatSeconds((secToday?secToday:0)+pendingSeconds)
                card.querySelector('.week-time').textContent = "This week: "+formatSeconds(secWeek+pendingSeconds)
                card.querySelector('.month-time').textContent = "This month: "+formatSeconds(secMonth+pendingSeconds)
            }, 1000);
        } else {
            currentlyTrackingClass = null
            card.querySelector('#start-button').textContent = "Start"
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) return;
    
            const classList = JSON.parse(docSnap.data().classes || "[]");
            const index = classList.findIndex(c => c.id === clazz.id);
            if (index === -1) return;
    
            console.log(getDate(new Date()))
            classList[index].studyTime[getDate(new Date())] = clazz.studyTime[getDate(new Date())]+pendingSeconds;
    
            await updateDoc(docRef, {
                classes: JSON.stringify(classList),
            });

            pendingSeconds=0
            clearInterval(intervalId);
            intervalId = null;
        }
    });

    container.appendChild(card);
}

function getSecondsWeek(clazz) {
    let secWeek = 0
    for (const date of getLastWeekDates()) {
        const secDay = clazz.studyTime[getDate(date)]
        secWeek += (secDay?secDay:0)
    }
    return secWeek
}

function getSecondsMonth(clazz) {
    let secMonth = 0
    for (const date of getLastMonthDates()) {
        const secDay = clazz.studyTime[getDate(date)]
        secMonth += (secDay?secDay:0)
    }
    return secMonth
}


function displayClasses(classes) {
    for (const clazz of classes) {
        // for each class create a div according to the template
        renderClassCard(clazz)
    }
}

function save() {

}

function renderClasses(callback) {
    container.innerHTML = "";
    getClasses()
        .then(classes => {
            displayClasses(classes);

            // Calculate total time per class
            const pieDataDay = classes.map(clazz => {
                return { name: clazz.name, time: clazz.studyTime[getDate(new Date())], color : clazz.color };
            });

            const pieDataWeek = classes.map(clazz => {
                return { name: clazz.name, time: getSecondsWeek(clazz), color : clazz.color };
            });

            const pieDataMonth = classes.map(clazz => {
                return { name: clazz.name, time: getSecondsMonth(clazz), color : clazz.color };
            });             

            drawPieChart(pieDataDay, 'dayPieChart');
            drawPieChart(pieDataWeek, 'weekPieChart');
            drawPieChart(pieDataMonth, 'monthPieChart');
            if (callback) callback();
        })
        .catch(error => {
            console.error("Error initializing classes:", error);
        });
}

function drawPieChart(pieData, id) {
    const ctx = document.getElementById(id).getContext('2d')

    const chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: pieData.map(c => c.name),
            datasets: [{
                label: 'Study Time Day',
                data: pieData.map(c => c.time),
                backgroundColor: pieData.map((c) => intToHSL(c.color)), // unique colors
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
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

// returns classes that are stored in db
function getClasses() {
    return getDoc(docRef)
        // get the classes once the document is loaded
        .then((docSnap) => {
            if (!docSnap.exists()) {
                throw new Error("Document not found");
            }

            const data = docSnap.data();
            const classString = data.classes; // get the classes field

            try {
                // try parsing it
                const classList = JSON.parse(classString);
                if (!Array.isArray(classList)) {
                    throw new Error("Parsed classes is not an array");
                }
                return classList;
            } catch (err) {
                console.error("Error parsing 'classes':", err);
                throw err;
            }
        })
        .catch((error) => {
            console.error("Error fetching from Firestore:", error);
            throw error;
        });
}

function max(a, b) {
    if (a >= b) return a
    return b
}

// executed as soon as window is loaded
window.onload = () => {
    renderClasses()
};


