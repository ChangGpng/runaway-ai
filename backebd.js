// --- DOM Elements for Authentication ---
const authDom = {
    authModal: document.getElementById('auth-modal'),
    appWrapper: document.getElementById('app-wrapper'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    authActionBtn: document.getElementById('auth-action-btn'),
    authSwitchLink: document.getElementById('auth-switch-link'),
    authTitle: document.getElementById('auth-title'),
    authSubtitle: document.getElementById('auth-subtitle'),
    authSwitchText: document.getElementById('auth-switch-text'),
    authError: document.getElementById('auth-error'),
    logoutBtn: document.getElementById('logout-btn'),
    userInfo: document.getElementById('user-info'),
    userEmailDisplay: document.getElementById('user-email-display'),
};

// --- Firebase Initialization ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Authentication State ---
let isLoginMode = true;

// --- Functions ---

/**
 * Toggles between Login and Register modes.
 */
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    authDom.authError.textContent = ''; // Clear errors on switch
    if (isLoginMode) {
        authDom.authTitle.textContent = '欢迎回来';
        authDom.authSubtitle.textContent = '登录以继续';
        authDom.authActionBtn.textContent = '登录';
        authDom.authSwitchText.textContent = '还没有账户？';
        authDom.authSwitchLink.textContent = '立即注册';
    } else {
        authDom.authTitle.textContent = '创建新账户';
        authDom.authSubtitle.textContent = '只需几秒钟即可开始';
        authDom.authActionBtn.textContent = '注册';
        authDom.authSwitchText.textContent = '已有账户？';
        authDom.authSwitchLink.textContent = '直接登录';
    }
}

/**
 * Handles the main authentication action (login or register).
 */
function handleAuthAction() {
    const email = authDom.emailInput.value.trim();
    const password = authDom.passwordInput.value.trim();

    if (!email || !password) {
        authDom.authError.textContent = '邮箱和密码不能为空。';
        return;
    }
    authDom.authError.textContent = '';

    if (isLoginMode) {
        // --- Login ---
        auth.signInWithEmailAndPassword(email, password)
            .catch(error => {
                authDom.authError.textContent = getFirebaseErrorMessage(error.code);
            });
    } else {
        // --- Register ---
        auth.createUserWithEmailAndPassword(email, password)
            .catch(error => {
                authDom.authError.textContent = getFirebaseErrorMessage(error.code);
            });
    }
}

/**
 * Handles user logout.
 */
function handleLogout() {
    auth.signOut();
}

/**
 * Translates Firebase error codes into Chinese.
 * @param {string} errorCode - The error code from Firebase.
 * @returns {string} - The user-friendly error message in Chinese.
 */
function getFirebaseErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/user-not-found':
            return '该邮箱未注册。';
        case 'auth/wrong-password':
            return '密码错误。';
        case 'auth/invalid-email':
            return '邮箱格式不正确。';
        case 'auth/email-already-in-use':
            return '该邮箱已被注册。';
        case 'auth/weak-password':
            return '密码太弱，请至少使用6位字符。';
        default:
            return '发生未知错误，请稍后再试。';
    }
}

// --- Event Listeners ---
authDom.authSwitchLink.addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthMode();
});

authDom.authActionBtn.addEventListener('click', handleAuthAction);
authDom.logoutBtn.addEventListener('click', handleLogout);

// Listen for Enter key press
authDom.emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAuthAction();
});
authDom.passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAuthAction();
});


// --- Auth State Change Listener ---
// This is the core logic that controls what the user sees.
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in.
        authDom.authModal.classList.add('hidden');
        authDom.appWrapper.classList.remove('hidden');
        authDom.appWrapper.classList.add('flex'); // Use flex to show it

        authDom.userEmailDisplay.textContent = user.email;
        authDom.userInfo.classList.remove('hidden');
        authDom.userInfo.classList.add('flex');

        // Initialize the main application logic now that we are logged in.
        initializeApp(user, db);

    } else {
        // User is signed out.
        authDom.authModal.classList.remove('hidden');
        authDom.appWrapper.classList.add('hidden');
        authDom.appWrapper.classList.remove('flex');

        authDom.userInfo.classList.add('hidden');
        authDom.userInfo.classList.remove('flex');
    }
});

