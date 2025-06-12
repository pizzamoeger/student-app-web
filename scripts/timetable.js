import { getClasses, getCurrentSemester, getEvents, saveEvent, intToRGBHex, initializeGlobalState, isStateInitialized, deleteEvent } from './globalState.js';

let currentWeekStart = new Date();
currentWeekStart.setHours(0, 0, 0, 0);
// Set to Monday of current week
currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1);

let currentEditingEvent = null;

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
    console.log('Rendering event:', event);
    
    // Parse event if it's a string
    const eventData = typeof event === 'string' ? JSON.parse(event) : event;
    
    // Get the class color from the classesItemId
    const classes = getClasses();
    const eventClass = classes.find(cls => cls.id === eventData.classesItemId);
    const classColor = eventClass ? eventClass.color : 0x2196F3; // Default blue if class not found
    
    // Convert date to day of week
    const eventDate = new Date(eventData.date);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const day = days[eventDate.getDay()];
    
    console.log('Event date:', eventData.date, 'Day:', day); // Debug log
    
    const dayColumn = document.querySelector(`.day-column[data-day="${day}"]`);
    if (!dayColumn) {
        console.log('Day column not found for:', day);
        return;
    }
    
    // Get start and end hours from the event
    const startHour = eventData.startHour || 9;
    const endHour = eventData.endHour || 10;
    
    console.log('Start hour:', startHour, 'End hour:', endHour);
    
    // Find the slot that matches the event's start time
    const startSlot = dayColumn.querySelector(`.schedule-slot[data-time="${startHour}:00"]`);
    if (!startSlot) {
        console.log('Start slot not found for time:', startHour);
        return;
    }
    
    // Create event element
    const eventElement = document.createElement('div');
    eventElement.className = 'schedule-event';
    eventElement.style.borderLeftColor = intToRGBHex(classColor);
    eventElement.dataset.event = JSON.stringify(eventData); // Store event data for editing
    
    // Calculate height based on duration
    const duration = endHour - startHour;
    eventElement.style.height = `${duration * 60}px`; // 60px per hour
    
    // Add event details
    eventElement.innerHTML = `
        <div class="event-title">${eventData.name}</div>
        <div class="event-time">${startHour}:00 - ${endHour}:00</div>
        <div class="event-class">${eventClass ? eventClass.name : ''}</div>
    `;
    
    // Add click handler for editing
    eventElement.addEventListener('click', () => openEditModal(eventData));
    
    // Check for overlapping events
    const existingEvents = startSlot.querySelectorAll('.schedule-event');
    if (existingEvents.length > 0) {
        // Mark all events in this slot as overlapping
        existingEvents.forEach(existingEvent => {
            existingEvent.classList.add('overlapping');
        });
        eventElement.classList.add('overlapping');
    }
    
    startSlot.appendChild(eventElement);
}

function openEditModal(event) {
    currentEditingEvent = event;
    
    // Set modal title
    document.getElementById('modal-title').textContent = 'Edit Event';
    
    // Populate form fields
    document.getElementById('event-title').value = event.name;
    document.getElementById('event-class').value = event.classesItemId;
    document.getElementById('event-start').value = event.startHour;
    document.getElementById('event-end').value = event.endHour;
    
    // Set the day based on the event date
    const eventDate = new Date(event.date);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const day = days[eventDate.getDay()];
    document.getElementById('event-day').value = day;
    
    // Show delete button
    document.getElementById('delete-event-btn').style.display = 'inline-block';
    
    // Update Materialize select elements
    M.updateTextFields();
    M.FormSelect.init(document.querySelectorAll('select'));
    
    // Open modal
    const modal = M.Modal.getInstance(document.getElementById('event-modal'));
    modal.open();
}

function openAddModal() {
    currentEditingEvent = null;
    
    // Set modal title
    document.getElementById('modal-title').textContent = 'Add Event';
    
    // Reset form
    document.getElementById('event-form').reset();
    
    // Hide delete button
    document.getElementById('delete-event-btn').style.display = 'none';
    
    // Update Materialize select elements
    M.updateTextFields();
    M.FormSelect.init(document.querySelectorAll('select'));
    
    // Open modal
    const modal = M.Modal.getInstance(document.getElementById('event-modal'));
    modal.open();
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
    const events = getEvents();
    console.log('Fetched events:', events); // Debug log
    
    if (events) {
        // Convert single event to array if needed
        const eventsArray = Array.isArray(events) ? events : [events];
        
        if (eventsArray.length > 0) {
            eventsArray.forEach(event => {
                renderEvent(event);
            });
        } else {
            console.log('No events found or events array is empty'); // Debug log
        }
    } else {
        console.log('No events found or events is null'); // Debug log
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
                classSelect.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
            });
        } else {
            classSelect.innerHTML += '<option value="" disabled>No classes in current semester</option>';
        }
    } else {
        classSelect.innerHTML += '<option value="" disabled>No classes available</option>';
    }
    
    // Reinitialize select
    M.FormSelect.init(classSelect);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Materialize components
    const modals = document.querySelectorAll('.modal');
    M.Modal.init(modals);
    
    const selects = document.querySelectorAll('select');
    M.FormSelect.init(selects);
    
    // Set all buttons to blue
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.style.backgroundColor = '#2196F3';
    });
    
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
        populateClassSelect();
        openAddModal();
    });
    
    // Cancel button
    document.getElementById('cancel-event-btn').addEventListener('click', () => {
        const modal = M.Modal.getInstance(document.getElementById('event-modal'));
        modal.close();
    });
    
    // Delete button
    document.getElementById('delete-event-btn').addEventListener('click', async () => {
        if (currentEditingEvent) {
            try {
                showSavingOverlay();
                await deleteEvent(currentEditingEvent);
                const modal = M.Modal.getInstance(document.getElementById('event-modal'));
                modal.close();
                await renderTimetable();
            } catch (error) {
                console.error('Error deleting event:', error);
                M.toast({html: 'Error deleting event. Please try again.'});
            } finally {
                hideSavingOverlay();
            }
        }
    });
    
    // Save event form
    document.getElementById('event-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('event-title').value;
        const classSelect = document.getElementById('event-class');
        const selectedOption = classSelect.options[classSelect.selectedIndex];
        const classId = classSelect.value;
        const startHour = parseInt(document.getElementById('event-start').value);
        const endHour = parseInt(document.getElementById('event-end').value);
        const day = document.getElementById('event-day').value;
        
        if (title && classId && startHour && endHour && day) {
            // Calculate the date based on the selected day and current week
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayIndex = days.indexOf(day.toLowerCase());
            const eventDate = new Date(currentWeekStart);
            eventDate.setDate(eventDate.getDate() + dayIndex);
            
            // Create the event data object
            const eventData = {
                name: title,
                classesItemId: parseInt(classId),
                date: eventDate.toISOString().split('T')[0],
                startHour: startHour,
                endHour: endHour,
                createdAt: new Date().toISOString()
            };
            
            // If editing, add the original event's ID
            if (currentEditingEvent) {
                eventData.id = currentEditingEvent.id;
            }
            
            // Convert the entire event data to a JSON string
            const eventJsonString = JSON.stringify(eventData);
            console.log('Saving event as JSON string:', eventJsonString);
            
            try {
                showSavingOverlay();
                await saveEvent(eventJsonString);
                // Reset form and close modal
                document.getElementById('event-form').reset();
                M.updateTextFields();
                const modal = M.Modal.getInstance(document.getElementById('event-modal'));
                modal.close();
                // Refresh the timetable to show the new event
                await renderTimetable();
            } catch (error) {
                console.error('Error saving event:', error);
                M.toast({html: 'Error saving event. Please try again.'});
            } finally {
                hideSavingOverlay();
            }
        } else {
            M.toast({html: 'Please fill in all fields'});
        }
    });
});

// Listen for auth state changes
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        try {
            // Initialize global state first
            await initializeGlobalState();
            // Then render the timetable
            await renderTimetable();
        } catch (error) {
            console.error('Error initializing state or rendering timetable:', error);
        }
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