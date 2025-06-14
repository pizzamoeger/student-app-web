import { renderScreen } from './classes.js'; // TODO temp
import { initializeGlobalState, setUID } from './globalState.js';

// get data from db
// listen for auth status changes
auth.onAuthStateChanged(async user => {
    console.log("auth state changed", user);
    if (user) { // user is logged in
        setUID(user.uid);
        document.body.classList.remove('auth-logged-out');
        document.body.classList.add('auth-logged-in');
        // Initialize global state when user logs in
        await initializeGlobalState();
    } else {
        setUID(null);
        document.body.classList.remove('auth-logged-in');
        document.body.classList.add('auth-logged-out');
    }
    renderScreen()
});

// sign up
const signUpForm = document.querySelector("#signup-form");
signUpForm.addEventListener("submit", (e)=> {
    e.preventDefault();
    showSavingOverlay()

    // get user info
    const email = signUpForm["signup-email"].value;
    const password = signUpForm["signup-password"].value;

    // sign up
    auth.createUserWithEmailAndPassword(email, password).then(cred => {
        // close signup modal and reset form
        const modal = document.querySelector("#modal-signup");
        M.Modal.getInstance(modal).close();
        signUpForm.reset();
        hideSavingOverlay()
    });
});

// log out
const logout = document.querySelector("#logout");
logout.addEventListener("click", (e) => {
    e.preventDefault();
    auth.signOut();
});

// login
const loginForm = document.querySelector("#login-form");
loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    showSavingOverlay()

    // get user info
    const email = loginForm["login-email"].value;
    const password = loginForm["login-password"].value;

    auth.signInWithEmailAndPassword(email, password).then(cred => {
        const modal = document.querySelector("#modal-login");
        M.Modal.getInstance(modal).close();
        loginForm.reset();
        hideSavingOverlay()
    });
});

function showSavingOverlay() {
    document.getElementById('saving-overlay').style.display = 'flex';
}

function hideSavingOverlay() {
    document.getElementById('saving-overlay').style.display = 'none';
}

// Initialize Materialize components
document.addEventListener('DOMContentLoaded', function() {
    // Initialize modals
    var modals = document.querySelectorAll('.modal');
    M.Modal.init(modals);

    // Initialize mobile navigation
    var sidenav = document.querySelectorAll('.sidenav');
    M.Sidenav.init(sidenav);

    // Initialize select dropdowns
    var selects = document.querySelectorAll('select');
    M.FormSelect.init(selects);
});