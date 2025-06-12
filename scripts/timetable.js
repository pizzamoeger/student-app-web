import { getClasses, getCurrentSemester, getEvents, saveEvent, intToRGBHex } from './globalState.js';

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
    
    // Set the border color based on the class color
    if (event.classColor) {
        card.style.borderLeft = `4px solid ${intToRGBHex(event.classColor)}`;
    }
    
    const title = document.createElement('div');
    title.className = 'event-title';
    title.textContent = event.title;
    
    const time = document.createElement('div');
    time.className = 'event-time';
    time.textContent = `${event.startTime} - ${event.endTime}`;
    
    const classInfo = document.createElement('div');
    classInfo.className = 'event-class';
    classInfo.textContent = event.className;
    
    card.appendChild(title);
    card.appendChild(time);
    card.appendChild(classInfo);
    
    return card;
}

function showSavingOverlay() {
    document.getElementById('saving-overlay').style.display = 'flex';
}

function hideSavingOverlay() {
    document.getElementById('saving-overlay').style.display = 'none';
}

function createTimeSlots() {
    const timeColumn = document.querySelector('.time-column');
    const timeHeader = timeColumn.querySelector('.time-header');
    timeHeader.innerHTML = 'Time';
    
    // Create time slots from 8 AM to 8 PM
    for (let hour = 8; hour <= 20; hour++) {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.innerHTML = `${hour}:00`;
        timeColumn.appendChild(timeSlot);
    }
}

function createDayHeaders() {
    const daysHeader = document.querySelector('.days-header');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    days.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.innerHTML = day;
        daysHeader.appendChild(dayHeader);
    });
}

function createScheduleSlots() {
    const scheduleSlots = document.querySelector('.schedule-slots');
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    // Create slots for each day
    days.forEach(day => {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        dayColumn.dataset.day = day;
        
        // Create time slots for each day
        for (let hour = 8; hour <= 20; hour++) {
            const slot = document.createElement('div');
            slot.className = 'schedule-slot';
            slot.dataset.time = `${hour}:00`;
            dayColumn.appendChild(slot);
        }
        
        scheduleSlots.appendChild(dayColumn);
    });
}

function renderEvent(event) {
    const dayColumn = document.querySelector(`.day-column[data-day="${event.day}"]`);
    if (!dayColumn) return;
    
    const startHour = parseInt(event.startTime.split(':')[0]);
    const endHour = parseInt(event.endTime.split(':')[0]);
    
    // Find the slot that matches the event's start time
    const startSlot = dayColumn.querySelector(`.schedule-slot[data-time="${startHour}:00"]`);
    if (!startSlot) return;
    
    // Create event element
    const eventElement = document.createElement('div');
    eventElement.className = 'schedule-event';
    eventElement.style.backgroundColor = intToRGBHex(event.classColor);
    eventElement.style.color = 'white';
    
    // Calculate height based on duration
    const duration = endHour - startHour;
    eventElement.style.height = `${duration * 60}px`; // 60px per hour
    
    // Add event details
    eventElement.innerHTML = `
        <div class="event-title">${event.title}</div>
        <div class="event-time">${event.startTime} - ${event.endTime}</div>
        <div class="event-class">${event.className}</div>
    `;
    
    startSlot.appendChild(eventElement);
}

async function renderTimetable() {
    const weekDisplay = document.getElementById('week-display');
    const startDate = new Date(currentWeekStart);
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);
    
    weekDisplay.textContent = `Week of ${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    
    // Clear existing schedule
    const scheduleSlots = document.querySelector('.schedule-slots');
    const daysHeader = document.querySelector('.days-header');
    const timeColumn = document.querySelector('.time-column');
    
    // Clear all existing content
    scheduleSlots.innerHTML = '';
    daysHeader.innerHTML = '';
    timeColumn.innerHTML = '<div class="time-header"></div>';
    
    // Recreate the schedule structure
    createTimeSlots();
    createDayHeaders();
    createScheduleSlots();
    
    // Get and render events
    const events = await getEvents();
    if (events) {
        events.forEach(event => {
            renderEvent(event);
        });
    }
}

async function loadEvents() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    try {
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
    } catch (error) {
        console.error('Error loading events:', error);
        M.toast({html: 'Error loading events. Please try refreshing.'});
    }
}

function getDayIndex(day) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days.indexOf(day.toLowerCase());
}

function updateButtonColors(classColor) {
    if (!classColor) return;
    
    const color = intToRGBHex(classColor);
    
    // Update add event button
    const addButton = document.getElementById('add-event-btn');
    if (addButton) {
        addButton.style.backgroundColor = color;
    }
    
    // Update save event button
    const saveButton = document.getElementById('save-event-btn');
    if (saveButton) {
        saveButton.style.backgroundColor = color;
    }
    
    // Update login/signup buttons
    const loginButton = document.getElementById('login-btn');
    const signupButton = document.getElementById('signup-btn');
    if (loginButton) loginButton.style.backgroundColor = color;
    if (signupButton) signupButton.style.backgroundColor = color;
}

function populateClassSelect() {
    const classSelect = document.getElementById('event-class');
    const classes = getClasses();
    const currentSemester = getCurrentSemester();
    
    // Clear existing options
    classSelect.innerHTML = '<option value="" disabled selected>Choose a class</option>';
    
    // Add class options only from current semester
    if (classes && classes.length > 0 && currentSemester) {
        const currentSemesterClasses = classes.filter(cls => 
            currentSemester.classesInSemester.includes(cls.id)
        );
        
        if (currentSemesterClasses.length > 0) {
            currentSemesterClasses.forEach(cls => {
                classSelect.innerHTML += `<option value="${cls.id}" data-color="${cls.color}">${cls.name}</option>`;
            });
        } else {
            classSelect.innerHTML += '<option value="" disabled>No classes in current semester</option>';
        }
    } else {
        classSelect.innerHTML += '<option value="" disabled>No classes available</option>';
    }
    
    // Reinitialize select
    M.FormSelect.init(classSelect);
    
    // Add change event listener to update button colors
    classSelect.addEventListener('change', () => {
        const selectedOption = classSelect.options[classSelect.selectedIndex];
        const classColor = selectedOption.dataset.color;
        updateButtonColors(classColor);
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Materialize components
    const modals = document.querySelectorAll('.modal');
    M.Modal.init(modals);
    
    const selects = document.querySelectorAll('select');
    M.FormSelect.init(selects);
    
    // Week navigation
    document.getElementById('prev-week').addEventListener('click', async () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        await renderTimetable();
    });
    
    document.getElementById('next-week').addEventListener('click', async () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        await renderTimetable();
    });
    
    // Add event button
    document.getElementById('add-event-btn').addEventListener('click', () => {
        populateClassSelect(); // Populate classes when modal opens
        const modal = M.Modal.getInstance(document.getElementById('add-event-modal'));
        modal.open();
    });
    
    // Save event
    document.getElementById('save-event-btn').addEventListener('click', async () => {
        const title = document.getElementById('event-title').value;
        const classSelect = document.getElementById('event-class');
        const selectedOption = classSelect.options[classSelect.selectedIndex];
        const classId = classSelect.value;
        const className = selectedOption.text;
        const classColor = selectedOption.dataset.color;
        const startTime = document.getElementById('event-start').value;
        const endTime = document.getElementById('event-end').value;
        const day = document.getElementById('event-day').value;
        
        if (title && classId && startTime && endTime && day) {
            const eventData = {
                title,
                classId,
                className,
                classColor,
                startTime,
                endTime,
                day,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            try {
                await saveEvent(eventData);
                // Reset form and close modal
                document.getElementById('add-event-form').reset();
                M.updateTextFields();
                const modal = M.Modal.getInstance(document.getElementById('add-event-modal'));
                modal.close();
            } catch (error) {
                console.error('Error saving event:', error);
                M.toast({html: 'Error saving event. Please try again.'});
            }
        }
    });
});

// Listen for auth state changes
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in, render the timetable
        await renderTimetable();
    } else {
        // User is signed out, clear the timetable
        const scheduleSlots = document.querySelector('.schedule-slots');
        const daysHeader = document.querySelector('.days-header');
        const timeColumn = document.querySelector('.time-column');
        
        scheduleSlots.innerHTML = '';
        daysHeader.innerHTML = '';
        timeColumn.innerHTML = '<div class="time-header"></div>';
        
        document.getElementById('week-display').textContent = formatWeekDisplay(currentWeekStart);
    }
}); 