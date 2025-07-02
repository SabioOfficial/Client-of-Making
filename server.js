const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const cheerio = require('cheerio');
const { WebClient } = require('@slack/web-api');
const fs = require('fs');

require('dotenv').config();
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

const slack = new WebClient(SLACK_BOT_TOKEN);
const LOG_CHANNEL = 'C0935TQ3M16';

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'testing')));

const projectBannerRoute = require('./server/routes/projectBanner');
app.use(projectBannerRoute);
const sendDebugDM = require('./public/send-debug-dm');
const { error } = require('console');
app.use(sendDebugDM);

const allowedPaths = new Set([
    '/vote',
    '/votes',
    '/shop',
    '/my_projects',
    '/campfire',
    '/explore',
    '/votes/locked'
]);
const cache = new Map();
const DEFAULT_CACHE_LIFETIME_MS = 60 * 1000;
const PATH_CACHE_LIFETIMES = {
    '/explore': 60 * 60 * 1000,
    '/votes/locked': 30 * 60 * 1000,
    '/shop': 30 * 60 * 1000
};

const userScopedPaths = new Set(['/campfire', '/my_projects']);

const slackCache = new Map();
const SLACK_CACHE_DURATION = 60 * 60 * 1000;

const CUSTOM_ITEMS_PATH = path.join(__dirname, 'custom-items.json');

let customItems = [];
if (fs.existsSync(CUSTOM_ITEMS_PATH)) {
    try {
        customItems = JSON.parse(fs.readFileSync(CUSTOM_ITEMS_PATH, 'utf8'));
    } catch (parseError) {
        customItems = [];
        fs.writeFileSync(CUSTOM_ITEMS_PATH, '[]', 'utf8');
    }
} else {
    fs.writeFileSync(CUSTOM_ITEMS_PATH, '[]', 'utf8');
}

app.get('/slack/user/:id', async (req, res) => {
    const slackId = req.params.id;
    if (!slackId) return res.status(400).json({ error: 'Missing slack ID' });

    const cached = slackCache.get(slackId);
    if (cached && Date.now() - cached.timestamp < SLACK_CACHE_DURATION) {
        return res.json(cached.data);
    }

    try {
        const { data } = await axios.get(
            `https://slack.com/api/users.info?user=${slackId}`,
            {
                headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` }
            }
        );

        if (!data.ok)
            return res.status(500).json({ error: 'Slack API Error', detail: data });

        const profile = data.user?.profile || {};
        const name = profile.display_name || data.user.real_name || 'Unknown';
        const image_24 = profile.image_24 || profile.image_32 || 'Unknown';
        const payload = { name, image_24 };

        slackCache.set(slackId, { data: payload, timestamp: Date.now() });
        return res.json(payload);
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/projects/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'project.html'));
});

app.post('/api/proxy-search', async (req, res) => {
    const { query } = req.body;
    const token = process.env.SEARCH_API_TOKEN;

    if (!query) return res.status(400).json({ error: 'Missing query'});

    const url = `https://somps.vercel.app/api/search?q=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const text = await response.text();

        if (!response.ok) {
            return res
                .status(response.status)
                .json({ error: `Search API failed with status ${response.status}` });
        }

        const data = JSON.parse(text);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/save-item', express.json(), (req, res) => {
    const { cookie, item } = req.body;

    if (customItems.some((i) => i.name === item.name)) {
        return res.status(400).json({ error: 'Item already exists' });
    }

    customItems.push(item);
    fs.writeFileSync(CUSTOM_ITEMS_PATH, JSON.stringify(customItems, null, 2), 'utf8');
    return res.json({ success: true, item });
});

app.post('/fetch', async (req, res) => {
    const { cookie, path: requestedPath, region } = req.body;
    const regionKey = region ? `?region=${region}` : '';
    const cacheKey = `${requestedPath}${regionKey}`;
    if (!cookie || !requestedPath)
        return res.status(400).send('Missing cookie or path');
    if (!allowedPaths.has(requestedPath))
        return res.status(403).send('Forbidden path');

    if (typeof cookie !== 'string' || cookie.length > 5000) {
        return res.status(400).json({error: 'Invalid cookie'});
    }

    const effectiveCacheLifetime =
        PATH_CACHE_LIFETIMES[requestedPath] || DEFAULT_CACHE_LIFETIME_MS;
    let cacheEntry = cache.get(cacheKey);

    if (userScopedPaths.has(requestedPath)) {
        cacheEntry = null;
    }

    if (cacheEntry && Date.now() - cacheEntry.timestamp < effectiveCacheLifetime) {
        return res.send(cacheEntry.data);
    }

    try {
        let extractedData = {};

        if (requestedPath === '/explore') {
            const { data: rawData } = await axios.get(
                'https://somps.vercel.app/api/projects'
            );
            const projects = Object.values(rawData);
            extractedData = {
                projectTitles: projects.map((p) => p.title || p.name || 'Untitled'),
                rawProjects: projects
            };
        } else {
            let url = `https://summer.hackclub.com${requestedPath}`;
            if (requestedPath === '/shop' && region) {
                url += url.includes('?') ? `&region=${region}` : `?region=${region}`;
            }

            const { data: html } = await axios.get(
                url,
                {
                    headers: {
                        Cookie: cookie,
                        'User-Agent': 'Mozilla/5.0',
                        Accept: 'text/html'
                    }
                }
            );

            const $ = cheerio.load(html);
            if (requestedPath === '/campfire') {
                extractedData = {
                    todayCodingTime: $(
                        '[data-hackatime-dashboard-target="todayTime"]'
                    )
                        .text()
                        .trim(),
                    totalCodingTime: $(
                        '[data-hackatime-dashboard-target="totalTime"]'
                    )
                        .text()
                        .trim()
                };
            } else if (requestedPath === '/my_projects') {
                const projects = [];
                $('a[href^="/projects/"]').each((i, el) => {
                    const $el = $(el);
                    projects.push({
                        title: $el.find('h2.line-clamp-1').text().trim(),
                        description: $el.find('p.line-clamp-3').text().trim(),
                        codingTime: $el
                            .find('p.text-gray-400')
                            .html()
                            ?.split('<br>')[0]
                            ?.trim(),
                        devlogCount: $el
                            .find('p.text-gray-400')
                            .html()
                            ?.split('<br>')[1]
                            ?.trim()
                    });
                });
                extractedData = { yourProjects: projects };
            } else if (requestedPath === '/shop') {
                const shopItems = [];
                $('.card-with-gradient').each((i, el) => {
                    const $card = $(el);
                    const $content = $card.find('.card-content');
                    shopItems.push({
                        name: $content.find('h3').text().trim(),
                        description: $content.find('p.text-gray-700').text().trim(),
                        price: $content.find('div.absolute.top-2.right-2').text().trim(),
                        imageUrl:
                            $card
                                .find(
                                    'img.rounded-lg.w-full.h-auto.object-scale-down.aspect-square.max-h-48'
                                )
                                .attr('src')
                                ?.trim() || null,
                        purchaseUrl:
                            $content.find('form.button_to').attr('action')?.trim() ||
                            null,
                        purchasable: !$content.find('button.w-full').attr('disabled'),
                        stock: $content.find('p.text-orange-600').text().trim() || null,
                        limited: !!$content.find('p.text-orange-600').text()
                    });
                });
                // THIS IS THE KEY CHANGE: Combine fetched shop items with custom items
                extractedData = { shopItems: [...shopItems, ...customItems] };
            } else if (requestedPath === '/votes/locked') {
                const votes = [];
                $('.card-with-gradient.text-lg.text-center').each((i, el) => {
                    const $card = $(el);
                    const $content = $card.find('.card-content');
                    votes.push({
                        approved: $content
                            .find('p.text-2xl')
                            .text()
                            .trim()
                            .split('/')[0]
                            .trim(),
                        certified:
                            Number(
                                $content
                                    .find('p')
                                    .filter((i, el) =>
                                        $(el)
                                            .text()
                                            .includes('certified projects, any amount of coding time)')
                                    )
                                    .first()
                                    .text()
                                    .match(/\d+/)?.[0] || 0
                            )
                    });
                });
                extractedData = { votes };
            }
        }

        const apiResponseData = { path: requestedPath, status: 'success', extractedData };
        cache.set(cacheKey, { data: apiResponseData, timestamp: Date.now() });
        res.json(apiResponseData);
    } catch (err) {
        res.status(500).json({ status: 'error', message: `Failed to fetch data for ${requestedPath}` });
    }
});

app.use((req, res) => {
    res.status(404);
    if (req.accepts('html')) {
        return res.sendFile(path.join(__dirname, 'error/404/index.html'));
    } else if (req.accepts('json')) {
        return res.json({
            error: 'Not found',
            message: `The requested URL ${req.originalUrl} was not found.`
        });
    }
    res.type('txt').send('Not found');
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Client proxy server running on http://localhost:${PORT}`);
});