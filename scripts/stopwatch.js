import { updateClasses, getClasses, getCurrentSemester } from './globalState.js';

const container = document.getElementById("classes-div")

var pendingSeconds = 0
let currentlyTrackingClass = 0
let dailyGoalHours = 4; // Default goal

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

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}  

function renderClassCard(clazz) {
    const template = document.getElementById("stopwatch-class-blueprint-normal")
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.class-list-item');
    
    // Set the class name
    const title = card.querySelector('h3');
    if (title) title.textContent = clazz.name;

    // Initialize studyTime if it doesn't exist
    if (!clazz.studyTime) {
        clazz.studyTime = {};
    }

    // Set today's time
    const today = getDate(new Date());
    var secToday = clazz.studyTime[today] || 0;
    const timeDisplay = card.querySelector('.today-time');
    if (timeDisplay) timeDisplay.textContent = "Today: " + formatSeconds(secToday);

    // Setup timer
    let intervalId = null;
    const startButton = card.querySelector('#start-button');
    const startIcon = startButton.querySelector('i');

    if (startButton && startIcon) {
        // Set the button color to match the class
        startButton.style.color = intToRGBHex(clazz.color);

        // If this class is currently being tracked, show pause icon
        if (currentlyTrackingClass && currentlyTrackingClass.id === clazz.id) {
            startIcon.classList.remove('fa-play');
            startIcon.classList.add('fa-pause');
        }

        startButton.addEventListener("click", async () => {
        if (!intervalId) {
                if (currentlyTrackingClass) return;
                currentlyTrackingClass = clazz;
                startIcon.classList.remove('fa-play');
                startIcon.classList.add('fa-pause');
            intervalId = setInterval(() => {
                    pendingSeconds++;
                    secToday++;
                    if (timeDisplay) timeDisplay.textContent = "Today: " + formatSeconds(secToday);
            }, 1000);
        } else {
                showSavingOverlay();
                currentlyTrackingClass = null;
    
            const classList = getClasses();
            const index = classList.findIndex(c => c.id === clazz.id);
            if (index === -1) return;
    
                // Initialize studyTime if it doesn't exist
                if (!classList[index].studyTime) {
                    classList[index].studyTime = {};
                }
                
                const today = getDate(new Date());
                let curSecs = classList[index].studyTime[today] || 0;
                classList[index].studyTime[today] = curSecs + pendingSeconds;

                pendingSeconds = 0;
                clearInterval(intervalId);
                intervalId = null;
                startIcon.classList.remove('fa-pause');
                startIcon.classList.add('fa-play');
            
                await updateClasses(classList);
                console.log(classList);

                hideSavingOverlay();
                renderClassesStopwatch();
        }
    });
    }

    container.appendChild(card);
}

function showSavingOverlay() {
    document.getElementById('saving-overlay').style.display = 'flex';
}

function hideSavingOverlay() {
    document.getElementById('saving-overlay').style.display = 'none';
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
    const currentSemester = getCurrentSemester();
    
    if (!currentSemester) {
        container.innerHTML = '<div class="no-semester-selected">Please select a semester first</div>';
        return;
    }

    // Filter classes to only show those in the current semester
    const semesterClasses = classes.filter(clazz => 
        currentSemester.classesInSemester.includes(clazz.id)
    );

    if (semesterClasses.length === 0) {
        container.innerHTML = '<div class="no-classes">No classes in this semester yet</div>';
        return;
    }

    // Display only the classes in the current semester
    for (const clazz of semesterClasses) {
        renderClassCard(clazz);
    }
}

let dayChart = null;
let weekChart = null;
let monthChart = null;
export function renderClassesStopwatch(callback) {
    container.innerHTML = "";
    const classes = getClasses();
    const currentSemester = getCurrentSemester();
    
    if (!currentSemester) {
        container.innerHTML = '<div class="no-semester-selected">Please select a semester first</div>';
        return;
    }

    // Filter classes to only show those in the current semester
    const semesterClasses = classes.filter(clazz => 
        currentSemester.classesInSemester.includes(clazz.id)
    );

    displayClasses(semesterClasses);
    updateInsights(semesterClasses);

    const noClassesMessage = document.getElementById('no-classes-message');
    const chartsContainer = document.getElementById('charts-container');

    if (semesterClasses.length === 0) {
        if (noClassesMessage) noClassesMessage.style.display = 'block';
        if (chartsContainer) chartsContainer.style.display = 'none';
        return;
    } else {
        if (noClassesMessage) noClassesMessage.style.display = 'none';
        if (chartsContainer) chartsContainer.style.display = 'block';
    }

    // Calculate total time per class
    const pieDataDay = semesterClasses.map(clazz => {
        return { name: clazz.name, time: clazz.studyTime[getDate(new Date())], color : clazz.color };
    }).filter(entry => entry.time > 0);

    const pieDataWeek = semesterClasses.map(clazz => {
        return { name: clazz.name, time: getSecondsWeek(clazz), color : clazz.color };
    }).filter(entry => entry.time > 0);

    const pieDataMonth = semesterClasses.map(clazz => {
        return { name: clazz.name, time: getSecondsMonth(clazz), color : clazz.color };
    }).filter(entry => entry.time > 0);             

    // Handle day chart
    const dayChartCanvas = document.getElementById('dayPieChart');
    const noDayData = document.getElementById('no-data-day');
    if (pieDataDay.length === 0) {
        if (dayChartCanvas) dayChartCanvas.style.display = 'none';
        if (noDayData) noDayData.style.display = 'block';
    } else {
        if (dayChartCanvas) dayChartCanvas.style.display = 'block';
        if (noDayData) noDayData.style.display = 'none';
    dayChart = drawPieChart(pieDataDay, 'dayPieChart', dayChart);
    }

    // Handle week chart
    const weekChartCanvas = document.getElementById('weekPieChart');
    const noWeekData = document.getElementById('no-data-week');
    if (pieDataWeek.length === 0) {
        if (weekChartCanvas) weekChartCanvas.style.display = 'none';
        if (noWeekData) noWeekData.style.display = 'block';
    } else {
        if (weekChartCanvas) weekChartCanvas.style.display = 'block';
        if (noWeekData) noWeekData.style.display = 'none';
    weekChart = drawPieChart(pieDataWeek, 'weekPieChart', weekChart);
    }

    // Handle month chart
    const monthChartCanvas = document.getElementById('monthPieChart');
    const noMonthData = document.getElementById('no-data-month');
    if (pieDataMonth.length === 0) {
        if (monthChartCanvas) monthChartCanvas.style.display = 'none';
        if (noMonthData) noMonthData.style.display = 'block';
    } else {
        if (monthChartCanvas) monthChartCanvas.style.display = 'block';
        if (noMonthData) noMonthData.style.display = 'none';
    monthChart = drawPieChart(pieDataMonth, 'monthPieChart', monthChart);
    }

    if (callback) callback();
}

function drawPieChart(pieData, id, chartRef) {
    const ctx = document.getElementById(id).getContext('2d')

    if (chartRef && chartRef instanceof Chart) {
        chartRef.destroy();
    }

    return new Chart(ctx, {
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

function max(a, b) {
    if (a >= b) return a
    return b
}

// setup materialize components
document.addEventListener('DOMContentLoaded', function() {
    var modals = document.querySelectorAll('.modal');
    M.Modal.init(modals);
  
    var items = document.querySelectorAll('.collapsible');
    M.Collapsible.init(items);
  
    // Load saved goal
    loadDailyGoal();
    
    // Setup goal settings
    const goalSettingsBtn = document.getElementById('goal-settings-btn');
    const goalSettingsModal = document.getElementById('goal-settings-modal');
    const saveGoalBtn = document.getElementById('save-goal-btn');
    const goalHoursInput = document.getElementById('goal-hours');
    
    if (goalSettingsBtn && goalSettingsModal) {
        goalSettingsBtn.addEventListener('click', () => {
            goalHoursInput.value = dailyGoalHours;
            const modal = M.Modal.getInstance(goalSettingsModal);
            modal.open();
        });
    }
    
    if (saveGoalBtn && goalHoursInput) {
        saveGoalBtn.addEventListener('click', () => {
            const hours = parseInt(goalHoursInput.value);
            if (hours >= 1 && hours <= 24) {
                saveDailyGoal(hours);
                const modal = M.Modal.getInstance(goalSettingsModal);
                modal.close();
            } else {
                M.toast({html: 'Please enter a valid number of hours (1-24)'});
            }
        });
    }
  
    renderClassesStopwatch();
});

function calculateStreak(classes) {
    let streak = 0;
    const today = new Date();
    let currentDate = new Date(today);
    
    while (true) {
        const dateStr = getDate(currentDate);
        let hasStudyTime = false;
        
        for (const clazz of classes) {
            if (clazz.studyTime && clazz.studyTime[dateStr] > 0) {
                hasStudyTime = true;
                break;
            }
        }
        
        if (!hasStudyTime) break;
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
}

function findMostStudied(classes) {
    let mostStudied = { name: '-', time: 0 };
    const today = getDate(new Date());
    
    for (const clazz of classes) {
        const studyTime = clazz.studyTime[today] || 0;
        if (studyTime > mostStudied.time) {
            mostStudied = { name: clazz.name, time: studyTime };
        }
    }
    
    return mostStudied;
}

function loadDailyGoal() {
    const savedGoal = localStorage.getItem('dailyGoalHours');
    if (savedGoal) {
        dailyGoalHours = parseInt(savedGoal);
    }
}

function saveDailyGoal(hours) {
    dailyGoalHours = hours;
    localStorage.setItem('dailyGoalHours', hours.toString());
    updateInsights(getClasses());
}

function calculateDailyGoal(classes) {
    const today = getDate(new Date());
    let totalTime = 0;
    
    for (const clazz of classes) {
        totalTime += clazz.studyTime[today] || 0;
    }
    
    const goalSeconds = dailyGoalHours * 3600;
    const progress = Math.min(100, (totalTime / goalSeconds) * 100);
    
    return {
        progress: Math.round(progress),
        totalTime: totalTime,
        goalHours: dailyGoalHours
    };
}

function updateInsights(classes) {
    // Update streak
    const streak = calculateStreak(classes);
    document.getElementById('streak-count').textContent = streak;
    
    // Update most studied
    const mostStudied = findMostStudied(classes);
    const mostStudiedEl = document.getElementById('most-studied');
    mostStudiedEl.querySelector('.subject-name').textContent = mostStudied.name;
    mostStudiedEl.querySelector('.study-time').textContent = formatSeconds(mostStudied.time);
    
    // Update daily goal
    const goal = calculateDailyGoal(classes);
    const progressBar = document.getElementById('goal-progress');
    const progressText = document.getElementById('goal-text');
    
    progressBar.style.width = `${goal.progress}%`;
    progressText.textContent = `${goal.progress}%`;
    
    // Update progress bar color based on progress
    if (goal.progress >= 100) {
        progressBar.style.background = 'linear-gradient(90deg, #4CAF50, #81C784)';
    } else if (goal.progress >= 75) {
        progressBar.style.background = 'linear-gradient(90deg, #2196F3, #64B5F6)';
    } else if (goal.progress >= 50) {
        progressBar.style.background = 'linear-gradient(90deg, #FFC107, #FFD54F)';
    } else {
        progressBar.style.background = 'linear-gradient(90deg, #F44336, #E57373)';
    }
}
