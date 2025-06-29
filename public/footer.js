fetch('/footer.html')
    .then(res => res.text())
    .then(html => {
        const div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div);
        setupUserCount();
        loadBuildVersion();
    })

function setupUserCount() {
    const userKey = 'client-of-making-user-' + Math.random().toString(36).slice(2);
    const bc = new BroadcastChannel('com-users');
    const userSet = new Set();

    function updateDisplay() {
        document.getElementById('footer-users').textContent = `🟢 Online: ${userSet.size}`;
    }

    bc.onmessage = (e) => {
        const {type, id} = e.data || {};
        if (!id || id === userKey) return;

        if (type === 'ping') {
            userSet.add(id);
            bc.postMessage({type: 'pong', id: userKey});
        } else if (type === 'pong') {
            userSet.add(id);
        } else if (type === 'bye') {
            userSet.delete(id);
        }
        updateDisplay();
    };

    bc.postMessage({type: 'ping', id: userKey});
    userSet.add(userKey);
    updateDisplay();

    window.addEventListener('beforeunload', () => {
        bc.postMessage({type: 'bye', id: userKey});
    });
}

async function loadBuildVersion() {
    try {
        const res = await fetch('/public/build.txt');
        const text = await res.text();

        const cleaned = text.replace(/[^\x20-\x7E]/g, '').trim();

        document.getElementById('footer-version').textContent =
            `🔁 Build: ${cleaned.slice(0, 7) || 'dev'}`;
    } catch {
        document.getElementById('footer-version').textContent = `🔁 Build: dev`;
    }
}