function getToken() {
    return localStorage.getItem('som_token');
}

function requireTokenOrRedirect() {
    if (!getToken()) {
        alert('ur not logged in >:(');
        window.location.pathname = '';
    }
}