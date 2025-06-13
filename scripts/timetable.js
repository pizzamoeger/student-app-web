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

function calculateEventCountsPerSlot(events) {
    const slotCounts = new Map(); // Map to store event counts for each slot
    
    events.forEach(event => {
        const eventData = typeof event === 'string' ? JSON.parse(event) : event;
        const eventDate = new Date(eventData.date);
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const day = days[eventDate.getDay()-1];
        
        // Handle both old and new time formats
        let startHour;
        if (eventData.startTime) {
            startHour = parseInt(eventData.startTime.split(':')[0]);
        } else {
            startHour = eventData.startHour || 9;
        }
        
        const slotKey = `${day}-${startHour}`;
        slotCounts.set(slotKey, (slotCounts.get(slotKey) || 0) + 1);
    });
    
    return slotCounts;
}

function showMultipleEvents(events, time) {
    const modal = document.getElementById('multiple-events-modal');
    const timeSpan = document.getElementById('multiple-events-time');
    const eventsList = document.getElementById('multiple-events-list');
    
    // Set the time
    timeSpan.textContent = time;
    
    // Clear existing events
    eventsList.innerHTML = '';
    
    // Get all events for this time slot from our data
    const allEvents = getEvents().filter(event => {
        const eventDate = new Date(event.date);
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const day = days[eventDate.getDay()-1];
        
        // Handle both old and new time formats
        let startHour;
        if (event.startTime) {
            startHour = parseInt(event.startTime.split(':')[0]);
        } else {
            startHour = event.startHour || 9;
        }
        
        // Check if this event is in the same time slot
        return event.startTime === time || `${startHour}:00` === time;
    });
    
    // Add each event to the list
    allEvents.forEach(event => {
        const classes = getClasses();
        const eventClass = classes.find(cls => cls.id === event.classesItemId);
        const classColor = eventClass ? eventClass.color : 0x2196F3;
        
        const eventItem = document.createElement('a');
        eventItem.className = 'collection-item';
        eventItem.style.borderLeft = `4px solid ${intToRGBHex(classColor)}`;
        eventItem.style.cursor = 'pointer';
        
        eventItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div class="event-title" style="color: #000;">${event.name}</div>
                    <div class="event-time" style="color: #666; font-size: 0.9em;">${event.startTime} - ${event.endTime}</div>
                </div>
                <div class="event-class" style="color: #666;">${eventClass ? eventClass.name : ''}</div>
            </div>
        `;
        
        eventItem.addEventListener('click', () => {
            M.Modal.getInstance(modal).close();
            showEventDetails(event);
        });
        
        eventsList.appendChild(eventItem);
    });
    
    // Open the modal
    M.Modal.getInstance(modal).open();
}

async function renderEvent(event, slotCounts) {
    // Parse event if it's a string
    const eventData = typeof event === 'string' ? JSON.parse(event) : event;
    
    // Get the class color from the classesItemId
    const classes = getClasses();
    const eventClass = classes.find(cls => cls.id === eventData.classesItemId);
    const classColor = eventClass ? eventClass.color : 0x2196F3; // Default blue if class not found
    
    // Convert date to day of week
    const eventDate = new Date(eventData.date);
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const day = days[eventDate.getDay()-1];
    
    // Find the day column
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
    
    // Get the total number of events for this slot from our pre-calculated counts
    const slotKey = `${day}-${startHour}`;
    const totalEvents = slotCounts.get(slotKey) || 1;
    
    // Get the current event's index in this slot
    const existingEvents = startSlot.querySelectorAll('.schedule-event');
    const eventIndex = existingEvents.length;
    
    // Calculate width and position based on total events (max 3)
    const slotWidth = startSlot.offsetWidth;
    const displayEvents = Math.min(totalEvents, 3);
    const eventWidth = Math.max((slotWidth-10) / displayEvents, 60); // Minimum width of 60px
    
    // If this is the fourth or later event, show the "+X more" indicator instead
    if (eventIndex >= 2) {
        // Only create the indicator once
        if (eventIndex === 2) {
            const moreIndicator = document.createElement('div');
            moreIndicator.className = 'schedule-event more-events-indicator';
            moreIndicator.style.borderLeftColor = '#666';
            moreIndicator.style.backgroundColor = '#f5f5f5';
            moreIndicator.style.cursor = 'pointer';
            
            // Calculate height based on duration in minutes
            const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
            moreIndicator.style.height = `${durationMinutes/60*40}px`;
            moreIndicator.style.top = `${startMinute*40/60}px`;
            
            // Calculate width and position - only take up remaining space
            const usedWidth = eventWidth * 2; // Width used by the first 2 events
            const remainingWidth = eventWidth; // Subtract padding
            moreIndicator.style.width = `${remainingWidth}px`;
            moreIndicator.style.left = `${usedWidth}px`;
            moreIndicator.style.position = 'absolute';
            
            // Add the indicator content
            const remainingEvents = totalEvents - 2;
            moreIndicator.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                    <div style="text-align: center; color: #666;">
                        <div style="font-size: 1.2em;">+${remainingEvents}</div>
                        <div style="font-size: 0.9em;">more</div>
                    </div>
                </div>
            `;
            
            // Add click handler to show all events
            moreIndicator.addEventListener('click', () => {
                // Get all events for this slot
                const slotEvents = Array.from(startSlot.querySelectorAll('.schedule-event'))
                    .filter(el => !el.classList.contains('more-events-indicator'))
                    .map(el => JSON.parse(el.dataset.event));
                showMultipleEvents(slotEvents, startTimeStr);
            });
            
            startSlot.appendChild(moreIndicator);
        }
        return; // Skip rendering this event
    }
    
    // Create event element
    const eventElement = document.createElement('div');
    eventElement.className = 'schedule-event';
    eventElement.style.borderLeftColor = intToRGBHex(classColor);
    eventElement.dataset.event = JSON.stringify(eventData); // Store event data for editing
    
    // Calculate height based on duration in minutes
    const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    
    const eventLeft = (eventWidth * eventIndex);
    
    eventElement.style.height = `${durationMinutes/60*40}px`; // 1px per minute
    eventElement.style.top = `${startMinute*40/60}px`;
    eventElement.style.width = `${eventWidth}px`;
    eventElement.style.left = `${eventLeft}px`;
    eventElement.style.position = 'absolute';
    
    // Add event details - show only title for short events (less than 30 minutes)
    if (durationMinutes < 120) {
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
        classInfo.textContent = eventClass ? eventClass.name : '';
        titleRow.appendChild(classInfo);

        eventElement.appendChild(titleRow);
    } else {
        eventElement.innerHTML = `
            <div class="event-title">${eventData.name}</div>
            <div class="event-time">${startTimeStr} - ${endTimeStr}</div>
            <div class="event-class">${eventClass ? eventClass.name : ''}</div>
        `;
    }
    
    // Add click handler for showing details
    eventElement.addEventListener('click', () => showEventDetails(eventData));
    
    startSlot.appendChild(eventElement);
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
                const option = document.createElement('option');
                option.value = cls.id;
                option.textContent = cls.name;
                classSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = "";
            option.disabled = true;
            option.textContent = 'No classes in current semester';
            classSelect.appendChild(option);
        }
    } else {
        const option = document.createElement('option');
        option.value = "";
        option.disabled = true;
        option.textContent = 'No classes available';
        classSelect.appendChild(option);
    }
    
    // Reinitialize select with proper options
    M.FormSelect.init(classSelect, {
        dropdownOptions: {
            container: document.body,
            constrainWidth: false,
            coverTrigger: false,
            closeOnClick: true
        }
    });
}

function openAddModal() {
    console.log('Opening add modal');
    currentEditingEvent = null;
    
    // Set modal title
    document.getElementById('modal-title').textContent = 'Add Event';
    
    // Reset form
    const form = document.getElementById('event-form');
    form.reset();
    form.dataset.eventId = '';
    document.getElementById('repeat-end-date-container').style.display = 'none';
    
    // Set default values
    document.getElementById('event-start').value = '09:00';
    document.getElementById('event-end').value = '10:00';
    document.getElementById('event-repeat').value = 'false';
    
    // Set default day to current day
    const today = new Date();
    const jsDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    document.getElementById('event-day').value = jsDays[today.getDay()];
    
    // Populate and set default class
    populateClassSelect();
    const classes = getClasses();
    const currentSemester = getCurrentSemester();
    if (classes && classes.length > 0 && currentSemester) {
        const currentSemesterClasses = classes.filter(cls => 
            currentSemester.classesInSemester.includes(cls.id)
        );
        if (currentSemesterClasses.length > 0) {
            document.getElementById('event-class').value = currentSemesterClasses[0].id;
            M.FormSelect.init(document.getElementById('event-class'));
        }
    }
    
    // Hide delete button
    document.getElementById('delete-event-btn').style.display = 'none';
    
    // Initialize Materialize select
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
    
    // Open modal
    const modal = M.Modal.getInstance(document.getElementById('event-modal'));
    modal.open();
}

function openEditModal(event) {
    console.log('Opening edit modal for event:', event);
    currentEditingEvent = event;
    
    // Set modal title
    document.getElementById('modal-title').textContent = 'Edit Event';
    
    // Populate classes first
    populateClassSelect();
    
    // Populate form fields
    document.getElementById('event-title').value = event.name;
    document.getElementById('event-class').value = event.classesItemId;
    document.getElementById('event-start').value = event.startTime;
    document.getElementById('event-end').value = event.endTime;
    
    // Set the day
    const eventDate = new Date(event.date);
    const jsDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayIndex = eventDate.getDay()-1;
    console.log('openEditModal day selection:', {
        eventDate,
        eventDateString: eventDate.toISOString(),
        dayIndex,
        selectedDay: jsDays[dayIndex],
        currentWeekStart
    });
    document.getElementById('event-day').value = jsDays[dayIndex];
    
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
    createScheduleSlots();
    
    // Render events first
    await renderEvents();

    // Create day headers after events are rendered
    createDayHeaders();

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

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
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
    const editEventBtn = document.getElementById('edit-event-btn');
    const deleteEventDetailsBtn = document.getElementById('delete-event-details-btn');
    const closeEventDetailsBtn = document.getElementById('close-event-details-btn');

    console.log('Event form element:', document.getElementById('event-form'));

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

    
    if (document.getElementById('event-form')) {
        console.log('Adding submit event listener to form');
        document.getElementById('event-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Form submission started');
            
            // Get form values
            const title = document.getElementById('event-title').value;
            const classId = Number(document.getElementById('event-class').value);
            const startTime = document.getElementById('event-start').value;
            const endTime = document.getElementById('event-end').value;
            const selectedDay = document.getElementById('event-day').value;
            const repeatValue = document.getElementById('event-repeat').value;
            const repeatUntil = document.getElementById('repeat-end-date').value;

            console.log('Form values:', {
                title,
                classId,
                startTime,
                endTime,
                selectedDay,
                repeatValue,
                repeatUntil
            });

            // Validate form
            if (!title) {
                console.log('Title is missing');
                M.toast({html: 'Please enter an event title'});
                return;
            }
            if (!classId) {
                console.log('Class is missing');
                M.toast({html: 'Please select a class'});
                return;
            }
            if (!startTime) {
                console.log('Start time is missing');
                M.toast({html: 'Please select a start time'});
                return;
            }
            if (!endTime) {
                console.log('End time is missing');
                M.toast({html: 'Please select an end time'});
                return;
            }
            if (!selectedDay) {
                console.log('Day is missing');
                M.toast({html: 'Please select a day'});
                return;
            }
            if (repeatValue === 'true' && !repeatUntil) {
                console.log('Repeat end date is missing');
                M.toast({html: 'Please select an end date for the repeated event'});
                return;
            }

            // Get the date for the selected day
            const eventDate = getDateForDay(selectedDay);
            console.log('Event date:', eventDate);
            
            const eventData = {
                name: title,
                classesItemId: classId,
                startTime: startTime,
                endTime: endTime,
                date: eventDate,
                repeated: repeatValue === 'true',
                repeatUntil: repeatValue === 'true' ? repeatUntil : null
            };

            // If editing, include the event ID
            const eventId = document.getElementById('event-form').dataset.eventId;
            if (eventId) {
                eventData.id = eventId;
                
                // If changing to repeating, delete the original event
                if (repeatValue === 'true' && !currentEditingEvent.repeated) {
                    try {
                        await deleteEvent(currentEditingEvent);
                    } catch (error) {
                        console.error('Error deleting original event:', error);
                        M.toast({html: 'Error updating event. Please try again.'});
                        return;
                    }
                }
            }

            console.log('Final event data:', eventData);

            try {
                console.log('Showing saving overlay');
                showSavingOverlay();
                console.log('Calling saveEvent');
                await saveEvent(eventData);
                console.log('Event saved successfully');
                const modal = M.Modal.getInstance(document.getElementById('event-modal'));
                modal.close();
                console.log('Modal closed');
                await renderTimetable();
                console.log('Timetable rendered');
            } catch (error) {
                console.error('Error saving event:', error);
                M.toast({html: 'Error saving event. Please try again.'});
            } finally {
                console.log('Hiding saving overlay');
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
                // Set default end date to current semester's end date
                const currentSemester = getCurrentSemester();
                console.log('Current semester:', currentSemester);
                if (currentSemester && currentSemester.end) {
                    const endDate = new Date(currentSemester.end);
                    const formattedDate = endDate.toISOString().split('T')[0];
                    document.getElementById('repeat-end-date').value = formattedDate;
                    console.log('Set repeat end date to:', formattedDate);
                }
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

// Helper function to get the date for a given day in the current week
function getDateForDay(day) {
    // Map the selected day to the correct day index (matching the HTML select options)
    const dayMap = {
        'monday': 0,
        'tuesday': 1,
        'wednesday': 2,
        'thursday': 3,
        'friday': 4,
        'saturday': 5,
        'sunday': 6
    };
    
    const dayIndex = dayMap[day.toLowerCase()];
    if (dayIndex === undefined) {
        console.error('Invalid day:', day);
        return null;
    }
    
    // Create a new date from the current week's start date (Monday)
    const date = new Date(currentWeekStart);
    // Add the day index to get the correct date
    date.setDate(date.getDate() + dayIndex);
    console.log('getDateForDay:', {
        inputDay: day,
        dayIndex,
        currentWeekStart,
        resultDate: date,
        resultDay: date.getDay()
    });
    return date.toISOString();
}

// Helper function to get the start of the week (Monday)
function getWeekStart(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    // Set to Monday of current week
    start.setDate(start.getDate() - start.getDay() + 1);
    return start;
}

async function renderEvents() {
    const events = getEvents();
    console.log('Events:', events);
    const weekStart = getWeekStart(currentWeekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Clear existing events
    document.querySelectorAll('.schedule-event').forEach(event => event.remove());

    // Calculate event counts for each slot before rendering
    const slotCounts = calculateEventCountsPerSlot(events);

    // Use for...of to properly await each event render
    for (const event of events) {
        const eventDate = new Date(event.date);
        
        // Handle repeated events
        if (event.repeat && event.repeat !== 'none') {
            const repeatEndDate = event.repeatEndDate ? new Date(event.repeatEndDate) : null;
            let currentDate = new Date(eventDate);
            
            while (currentDate <= weekEnd && (!repeatEndDate || currentDate <= repeatEndDate)) {
                if (currentDate >= weekStart) {
                    await renderEvent(event, slotCounts);
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
                await renderEvent(event, slotCounts);
            }
        }
    }
}
