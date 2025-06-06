// sign up
const signUpForm = document.querySelector("#signup-form");
signUpForm.addEventListener("submit", (e)=> {
    e.preventDefault();

    // get user info
    const email = signUpForm["signup-email"].value;
    const password = signUpForm["signup-password"].value;

    // sign up
    auth.createUserWithEmailAndPassword(email, password).then(cred => {
        console.log(cred.user)
        // close signup modal and reset form
        const modal = document.querySelector("#modal-signup");
        M.Modal.getInstance(modal).close();
        signUpForm.reset();
    });
});

// log out
const logout = document.querySelector("#logout");
logout.addEventListener("click", (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
        console.log("user logged out");
    });
});

// login
const loginForm = document.querySelector("#login-form");
loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // get user info
    const email = loginForm["login-email"].value;
    const password = loginForm["login-password"].value;

    auth.signInWithEmailAndPassword(email, password).then(cred => {
        console.log(cred.user);
        const modal = document.querySelector("#modal-login");
        M.Modal.getInstance(modal).close();
        loginForm.reset();
    });
});