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
    const appId = 'client_of_making';
    const base = 'https://live.alimad.xyz';

    async function ping() {
        try {
            const res = await fetch(`${base}/ping?app=${appId}`);
            const data = await res.text();
            const el = document.getElementById('footer-users');
            if (el) el.textContent = `🟢 Online: ${data}`;
        } catch (e) {
            console.error('IsLive ping failed: ', e);
        }
    }

    // async function updateCountOnly() {
    //     try {
    //         const res = await fetch(`${base}/get?app=${appId}`);
    //         const data = await res.text();
    //         const el = document.getElementById('footer-users');
    //         if (el) el.textContent = `🟢 Online: ${data}`;
    //     } catch (e) {
    //         console.error('IsLive count failed:', e);
    //     }
    // }

    // ^ READ ONLY ^

    ping();
    setInterval(ping, 30000);
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