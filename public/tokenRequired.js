let tokenCheckInProgress = false;
let lastRedirectTime = 0;
const REDIRECT_THROTTLE_MS = 3000;

function getToken() {
    return localStorage.getItem('som_token');
}

async function isTokenValid(token) {
    if (!token) return false;

    try {
        const res = await fetch('/fetch', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                cookie: token,
                path: '/campfire',
            })
        });

        if (!res.ok) return false;

        const data = await res.json();
        const time = data?.extractedData?.todayCodingTime?.trim();

        return data.status === 'success' && time && /\d+h/.test(time);
    } catch (err) {
        console.error('Token validation failed:', err);
        return 'network_error';
    }
}

function throttleRedirect(path) {
    const now = Date.now();
    if (now - lastRedirectTime < REDIRECT_THROTTLE_MS) {
        console.warn(`Throttled redirect to ${path}`);
        return false;
    }
    lastRedirectTime = now;
    window.location.pathname = path;
    return false;
}

async function requireTokenOrRedirect() {
    if (tokenCheckInProgress) return;
    tokenCheckInProgress = true;

    const token = getToken();
    const valid = await isTokenValid(token);

    if (valid === false) {
        alert('ur not loged in >:(');
        window.location.pathname = '/auth';
    } else if (valid === 'network_error') {
        console.warn('Skipping redirect due to temporary network issue.')
    } else {
        tokenCheckInProgress = false;
    }
}

async function notLoggedInOrRedirection() {
    if (tokenCheckInProgress) return;
    tokenCheckInProgress = true;

    const token = getToken();
    const valid = await isTokenValid(token);

    if (valid === true) {
        window.location.pathname = '/campfire';
    } else if (valid === 'network_error') {
        console.warn('Skipping redirect due to network issue.')
    } else {
        tokenCheckInProgress = false;
    }
}