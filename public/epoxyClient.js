import initEpoxy, {EpoxyClient, EpoxyClientOptions} from './pkg/epoxy-bundled.js';

let epoxyClient;

export async function getEpoxyClient() {
    if (!epoxyClient) {
        await initEpoxy();
        const options = new EpoxyClientOptions();
        options.user_agent = navigator.userAgent;
        options.wisp_v2 = true;
        epoxyClient = new EpoxyClient('wss://wisp.mercurywork.shop', options);
    }
    return epoxyClient;
}

export async function fetchWithEpoxy(url, headers = {}) {
    const client = await getEpoxyClient();
    const response = await client.fetch(url, {headers});
    return response.text();
}