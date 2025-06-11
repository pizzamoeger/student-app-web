import { getClasses } from './globalState.js';

let currentWeekStart = new Date();
currentWeekStart.setHours(0, 0, 0, 0);
// Set to Monday of current week
currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1);

function formatDate(date) {
    return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

function formatWeekDisplay(startDate) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    return `Week of ${formatDate(startDate)}`;
}

function createDayColumn(date) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day-column';
    
    const header = document.createElement('div');
    header.className = 'day-header';
    header.textContent = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    dayDiv.appendChild(header);
    return dayDiv;
}

function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card';
    
    const title = document.createElement('div');
    title.className = 'event-title';
    title.textContent = event.title;
    
    const time = document.createElement('div');
    time.className = 'event-time';
    time.textContent = `${event.startTime} - ${event.endTime}`;
    
    const classInfo = document.createElement('div');
    classInfo.className = 'event-class';
    classInfo.textContent = event.class;
    
    card.appendChild(title);
    card.appendChild(time);
    card.appendChild(classInfo);
    
    return card;
}

function renderTimetable() {
    const grid = document.getElementById('timetable-grid');
    grid.innerHTML = '';
    
    // Create columns for each day
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        const dayColumn = createDayColumn(date);
        grid.appendChild(dayColumn);
    }
    
    // Update week display
    document.getElementById('week-display').textContent = formatWeekDisplay(currentWeekStart);
    
    // Load and display events
    loadEvents();
}

async function loadEvents() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const eventsRef = db.collection('users').doc(user.uid).collection('events');
    const snapshot = await eventsRef.get();
    
    snapshot.forEach(doc => {
        const event = doc.data();
        const dayIndex = getDayIndex(event.day);
        if (dayIndex !== -1) {
            const dayColumn = document.querySelectorAll('.day-column')[dayIndex];
            const eventCard = createEventCard(event);
            dayColumn.appendChild(eventCard);
        }
    });
}

function getDayIndex(day) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days.indexOf(day.toLowerCase());
}

async function saveEvent(eventData) {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const eventsRef = db.collection('users').doc(user.uid).collection('events');
    await eventsRef.add(eventData);
    
    renderTimetable();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Materialize components
    const modals = document.querySelectorAll('.modal');
    M.Modal.init(modals);
    
    const selects = document.querySelectorAll('select');
    M.FormSelect.init(selects);
    
    // Week navigation
    document.getElementById('prev-week').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderTimetable();
    });
    
    document.getElementById('next-week').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderTimetable();
    });
    
    // Add event button
    document.getElementById('add-event-btn').addEventListener('click', () => {
        const modal = M.Modal.getInstance(document.getElementById('add-event-modal'));
        modal.open();
    });
    
    // Save event
    document.getElementById('save-event-btn').addEventListener('click', async () => {
        const title = document.getElementById('event-title').value;
        const class_ = document.getElementById('event-class').value;
        const startTime = document.getElementById('event-start').value;
        const endTime = document.getElementById('event-end').value;
        const day = document.getElementById('event-day').value;
        
        if (title && class_ && startTime && endTime && day) {
            const eventData = {
                title,
                class: class_,
                startTime,
                endTime,
                day,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await saveEvent(eventData);
            
            // Reset form and close modal
            document.getElementById('add-event-form').reset();
            M.updateTextFields();
            const modal = M.Modal.getInstance(document.getElementById('add-event-modal'));
            modal.close();
        }
    });
    
    // Initial render
    renderTimetable();
}); 