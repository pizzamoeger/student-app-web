import { renderClasses } from './classes.js';
import { renderClassesStopwatch } from './stopwatch.js';
import { renderAssignments } from './assignments.js';

// executed as soon as window is loaded
export function renderScreen() {
    const currentPage = window.location.pathname;
    if (currentPage === "/index.html") {
        renderClasses();
    } else if (currentPage === "/stopwatch.html") {
        renderClassesStopwatch();
    } else if (currentPage === "/assignments.html") {
        console.log("renderAssignments");
        renderAssignments();
    }
} 