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
    
    // Create time slots for all 24 hours
    for (let hour = 0; hour < 24; hour++) {
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
        
        // Create time slots for all 24 hours
        for (let hour = 0; hour < 24; hour++) {
            const slot = document.createElement('div');
            slot.className = 'schedule-slot';
            slot.dataset.time = `${hour}:00`;
            dayColumn.appendChild(slot);
        }
        
        scheduleSlots.appendChild(dayColumn);
    });
}

function showEventDetails(event) {
    const eventData = typeof event === 'string' ? JSON.parse(event) : event;
    const classes = getClasses();
    const eventClass = classes.find(cls => cls.id === eventData.classesItemId);
    
    // Format the date
    const eventDate = new Date(eventData.date);
    const formattedDate = eventDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Handle both old and new time formats
    let timeDisplay;
    if (eventData.startTime && eventData.endTime) {
        // New format (HH:mm)
        timeDisplay = `${eventData.startTime} - ${eventData.endTime}`;
    } else {
        // Old format (hour only)
        const startHour = eventData.startHour || 9;
        const endHour = eventData.endHour || 10;
        timeDisplay = `${startHour}:00 - ${endHour}:00`;
    }
    
    // Set the modal content
    document.getElementById('event-details-title').textContent = eventData.name;
    document.getElementById('event-details-time').textContent = timeDisplay;
    document.getElementById('event-details-date').textContent = formattedDate;
    document.getElementById('event-details-class').textContent = eventClass ? eventClass.name : 'No class';
    
    // Store the event data for the edit and delete buttons
    const detailsModal = document.getElementById('event-details-modal');
    detailsModal.dataset.event = JSON.stringify(eventData);
    
    // Open the modal
    const modal = M.Modal.getInstance(detailsModal);
    modal.open();
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
    
    // Handle both old and new time formats
    let startHour, startMinute, endHour, endMinute, startTimeStr, endTimeStr;
    
    if (eventData.startTime && eventData.endTime) {
        // New format (HH:mm)
        const startTime = eventData.startTime.split(':');
        const endTime = eventData.endTime.split(':');
        startHour = parseInt(startTime[0]);
        startMinute = parseInt(startTime[1]);
        endHour = parseInt(endTime[0]);
        endMinute = parseInt(endTime[1]);
        startTimeStr = eventData.startTime;
        endTimeStr = eventData.endTime;
    } else {
        // Old format (hour only)
        startHour = eventData.startHour || 9;
        endHour = eventData.endHour || 10;
        startMinute = 0;
        endMinute = 0;
        startTimeStr = `${startHour}:00`;
        endTimeStr = `${endHour}:00`;
    }
    
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
    
    // Calculate height based on duration in minutes
    const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    eventElement.style.height = `${durationMinutes}px`; // 1px per minute
    
    // Calculate top offset based on start minute
    eventElement.style.top = `${startMinute}px`;
    
    // Add event details - show only title for short events (less than 30 minutes)
    if (durationMinutes < 30) {
        eventElement.innerHTML = `
            <div class="event-title">${eventData.name}</div>
        `;
        eventElement.classList.add('short-event');
    } else {
        eventElement.innerHTML = `
            <div class="event-title">${eventData.name}</div>
            <div class="event-time">${startTimeStr} - ${endTimeStr}</div>
            <div class="event-class">${eventClass ? eventClass.name : ''}</div>
        `;
    }
    
    // Add click handler for showing details
    eventElement.addEventListener('click', () => showEventDetails(eventData));
    
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
    document.getElementById('event-start').value = event.startTime;
    document.getElementById('event-end').value = event.endTime;
    
    // Set the day
    const eventDate = new Date(event.date);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    document.getElementById('event-day').value = days[eventDate.getDay()];
    
    // Set repeat options
    document.getElementById('event-repeat').value = event.repeated ? 'true' : 'false';
    if (event.repeated) {
        document.getElementById('repeat-end-date-container').style.display = 'block';
        document.getElementById('repeat-end-date').value = event.repeatUntil;
    } else {
        document.getElementById('repeat-end-date-container').style.display = 'none';
    }
    
    // Store event ID for editing
    document.getElementById('event-form').dataset.eventId = event.id;
    
    // Show delete button
    document.getElementById('delete-event-btn').style.display = 'block';
    
    // Initialize Materialize select
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
    document.getElementById('event-form').dataset.eventId = '';
    document.getElementById('repeat-end-date-container').style.display = 'none';
    
    // Hide delete button
    document.getElementById('delete-event-btn').style.display = 'none';
    
    // Initialize Materialize select
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
    
    // Render events
    renderEvents();

    // Scroll to 8 AM by default
    setTimeout(() => {
        const scheduleGrid = document.querySelector('.schedule-grid');
        const timeSlots = document.querySelectorAll('.time-slot');
        const eightAMSlot = Array.from(timeSlots).find(slot => slot.textContent.includes('8:00'));
        if (eightAMSlot) {
            scheduleGrid.scrollTop = eightAMSlot.offsetTop - 50; // Subtract header height
        }
    }, 100); // Small delay to ensure DOM is ready
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
    
    // Reinitialize select with proper options
    const selectInstance = M.FormSelect.init(classSelect, {
        dropdownOptions: {
            container: document.body,
            constrainWidth: false,
            coverTrigger: false,
            closeOnClick: true
        }
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Materialize components
    const modals = document.querySelectorAll('.modal');
    M.Modal.init(modals);
    
    // Initialize all selects with proper options
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        M.FormSelect.init(select, {
            dropdownOptions: {
                container: document.body,
                constrainWidth: false,
                coverTrigger: false,
                closeOnClick: true
            }
        });
    });
    
    // Set all buttons to blue
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.style.backgroundColor = '#2196F3';
    });
    
    // Week navigation
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');
    const addEventBtn = document.getElementById('add-event-btn');
    const cancelEventBtn = document.getElementById('cancel-event-btn');
    const deleteEventBtn = document.getElementById('delete-event-btn');
    const eventForm = document.getElementById('event-form');
    const editEventBtn = document.getElementById('edit-event-btn');
    const deleteEventDetailsBtn = document.getElementById('delete-event-details-btn');
    const closeEventDetailsBtn = document.getElementById('close-event-details-btn');

    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', async () => {
            currentWeekStart.setDate(currentWeekStart.getDate() - 7);
            await renderTimetable();
        });
    }
    
    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', async () => {
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            await renderTimetable();
        });
    }
    
    if (addEventBtn) {
        addEventBtn.addEventListener('click', () => {
            populateClassSelect();
            openAddModal();
        });
    }
    
    if (cancelEventBtn) {
        cancelEventBtn.addEventListener('click', () => {
            const modal = M.Modal.getInstance(document.getElementById('event-modal'));
            modal.close();
        });
    }
    
    if (deleteEventBtn) {
        deleteEventBtn.addEventListener('click', async () => {
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
    }
    
    if (eventForm) {
        eventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get the selected day and convert it to a date
            const selectedDay = document.getElementById('event-day').value;
            const eventDate = getDateForDay(selectedDay);
            
            const eventData = {
                name: document.getElementById('event-title').value,
                classesItemId: document.getElementById('event-class').value,
                startTime: document.getElementById('event-start').value,
                endTime: document.getElementById('event-end').value,
                date: eventDate,
                repeated: document.getElementById('event-repeat').value,
                repeatUntil: document.getElementById('event-repeat').value === 'true' ? 
                    document.getElementById('repeat-end-date').value : null
            };

            // If editing, include the event ID
            const eventId = document.getElementById('event-form').dataset.eventId;
            if (eventId) {
                eventData.id = eventId;
            }

            try {
                showSavingOverlay();
                console.log('Saving event data:', eventData);
                await saveEvent(eventData);
                const modal = M.Modal.getInstance(document.getElementById('event-modal'));
                modal.close();
                await renderTimetable();
            } catch (error) {
                console.error('Error saving event:', error);
                M.toast({html: 'Error saving event. Please try again.'});
            } finally {
                hideSavingOverlay();
            }
        });
    }

    if (editEventBtn) {
        editEventBtn.addEventListener('click', () => {
            const detailsModal = document.getElementById('event-details-modal');
            const eventData = JSON.parse(detailsModal.dataset.event);
            M.Modal.getInstance(detailsModal).close();
            openEditModal(eventData);
        });
    }

    if (deleteEventDetailsBtn) {
        deleteEventDetailsBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this event?')) {
                const detailsModal = document.getElementById('event-details-modal');
                const eventData = JSON.parse(detailsModal.dataset.event);
                try {
                    showSavingOverlay();
                    await deleteEvent(eventData);
                    M.Modal.getInstance(detailsModal).close();
                    await renderTimetable();
                } catch (error) {
                    console.error('Error deleting event:', error);
                    M.toast({html: 'Error deleting event. Please try again.'});
                } finally {
                    hideSavingOverlay();
                }
            }
        });
    }

    if (closeEventDetailsBtn) {
        closeEventDetailsBtn.addEventListener('click', () => {
            const detailsModal = document.getElementById('event-details-modal');
            M.Modal.getInstance(detailsModal).close();
        });
    }

    // Add event listener for repeat select
    const repeatSelect = document.getElementById('event-repeat');
    if (repeatSelect) {
        repeatSelect.addEventListener('change', function(e) {
            const repeatEndDateContainer = document.getElementById('repeat-end-date-container');
            if (e.target.value === 'true') {
                repeatEndDateContainer.style.display = 'block';
            } else {
                repeatEndDateContainer.style.display = 'none';
            }
        });
    }
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

// Helper function to get the start of the week (Monday)
function getWeekStart(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    // Set to Monday of current week
    start.setDate(start.getDate() - start.getDay() + 1);
    return start;
}

function renderEvents() {
    const events = getEvents();
    console.log('Events:', events);
    const weekStart = getWeekStart(currentWeekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Clear existing events
    document.querySelectorAll('.schedule-event').forEach(event => event.remove());

    events.forEach(event => {
        const eventDate = new Date(event.date);
        
        // Handle repeated events
        if (event.repeat && event.repeat !== 'none') {
            const repeatEndDate = event.repeatEndDate ? new Date(event.repeatEndDate) : null;
            let currentDate = new Date(eventDate);
            
            while (currentDate <= weekEnd && (!repeatEndDate || currentDate <= repeatEndDate)) {
                if (currentDate >= weekStart) {
                    renderSingleEvent(event, currentDate);
                }
                
                // Move to next occurrence based on repeat type
                switch (event.repeat) {
                    case 'daily':
                        currentDate.setDate(currentDate.getDate() + 1);
                        break;
                    case 'weekly':
                        currentDate.setDate(currentDate.getDate() + 7);
                        break;
                    case 'monthly':
                        currentDate.setMonth(currentDate.getMonth() + 1);
                        break;
                }
            }
        } else {
            // Handle non-repeated events
            if (eventDate >= weekStart && eventDate <= weekEnd) {
                renderSingleEvent(event, eventDate);
            }
        }
    });
}

// Helper function to render a single event
function renderSingleEvent(event, eventDate) {
    const dayIndex = eventDate.getDay();
    const dayColumn = document.querySelector(`.day-column:nth-child(${dayIndex + 1})`);
    if (!dayColumn) return;

    const eventElement = document.createElement('div');
    eventElement.className = 'schedule-event';
    
    // Get class color from classesItemId
    const classes = getClasses();
    const eventClass = classes.find(cls => cls.id === event.classesItemId);
    const classColor = eventClass ? eventClass.color : 0x2196F3; // Default blue if class not found
    eventElement.style.backgroundColor = intToRGBHex(classColor);
    eventElement.style.borderLeft = `4px solid ${intToRGBHex(classColor)}`;

    // Parse start and end times
    if (!event.startTime || event.startTime === '') {
        event.startTime = event.startHour + ':00';
    }
    if (!event.endTime || event.endTime === '') {
        event.endTime = event.endHour + ':00';
    }
    const [startHour, startMinute] = event.startTime.split(':').map(Number);
    const [endHour, endMinute] = event.endTime.split(':').map(Number);

    // Calculate position and height
    const startPosition = (startHour + startMinute / 60) * 40; // 40px per hour
    const endPosition = (endHour + endMinute / 60) * 40;
    const height = endPosition - startPosition - 1; // Subtract 1px to account for border

    // Calculate duration in hours
    const duration = (endHour + endMinute / 60) - (startHour + startMinute / 60);

    eventElement.style.top = `${startPosition}px`;
    eventElement.style.height = `${height}px`;

    // Create event content
    const eventContent = document.createElement('div');
    eventContent.className = 'event-content';
    
    // Get class name if available
    const className = eventClass ? eventClass.name : '';
    
    if (duration >= 2) {
        // For events >= 2 hours: title, class name in gray, time
        const title = document.createElement('div');
        title.className = 'event-title';
        title.textContent = event.name;
        eventContent.appendChild(title);

        const classInfo = document.createElement('div');
        classInfo.className = 'event-class';
        classInfo.style.color = '#666';
        classInfo.textContent = className;
        eventContent.appendChild(classInfo);

        const time = document.createElement('div');
        time.className = 'event-time';
        time.textContent = `${event.startTime} - ${event.endTime}`;
        eventContent.appendChild(time);
    } else if (duration >= 1) {
        // For events 1-2 hours: title and class name in gray on the same line
        const titleRow = document.createElement('div');
        titleRow.style.display = 'flex';
        titleRow.style.justifyContent = 'space-between';
        titleRow.style.alignItems = 'center';

        const title = document.createElement('div');
        title.className = 'event-title';
        title.textContent = event.name;
        titleRow.appendChild(title);

        const classInfo = document.createElement('div');
        classInfo.className = 'event-class';
        classInfo.style.color = '#666';
        classInfo.textContent = className;
        titleRow.appendChild(classInfo);

        eventContent.appendChild(titleRow);
    } else {
        // For events < 1 hour: just title
        const title = document.createElement('div');
        title.className = 'event-title';
        title.textContent = event.name;
        eventContent.appendChild(title);
    }
    
    eventElement.appendChild(eventContent);

    // Add click handler for editing
    eventElement.addEventListener('click', () => {
        openEditModal(event);
    });

    dayColumn.appendChild(eventElement);
}

// Helper function to get the date for a given day in the current week
function getDateForDay(day) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = days.indexOf(day.toLowerCase());
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + dayIndex);
    return date.toISOString();
} 