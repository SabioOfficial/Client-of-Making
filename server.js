const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const cheerio = require('cheerio');

require('dotenv').config();
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'testing')));

const projectBannerRoute = require('./server/routes/projectBanner');
app.use(projectBannerRoute)

const allowedPaths = new Set(['/vote', '/shop', '/projects', '/campfire', '/explore']);
const cache = {};

const DEFAULT_CACHE_LIFETIME_MS = 60 * 1000;

const PATH_CACHE_LIFETIMES = {
    '/explore': 10 * 60 * 1000,
};

app.get('/slack/user/:id', async (req, res) => {
    const slackId = req.params.id;
    if (!slackId) return res.status(400).json({error: 'Missing slack ID'});

    try {
        const slackRes = await axios.get(`https://slack.com/api/users.info?user=${slackId}`, {
            headers: {
                Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
            }
        });

        if (!slackRes.data.ok) {
            return res.status(500).json({error: 'Slack API error', detail: slackRes.data});
        }

        const user = slackRes.data.user;
        const name = user?.profile?.display_name || user?.real_name || 'Unknown';
        const image_24 = user?.profile?.image_24 || user?.profile?.image_32 || 'Unknown';
        return res.json({name, image_24});
    } catch (err) {
        console.error(`Error fetching Slack user for ${slackId}:`, err.message);
        return res.status(500).json({error: 'Internal server error'});
    }
});

app.post('/fetch', async (req, res) => {
    const { cookie, path: requestedPath } = req.body;
    
    if (!cookie || !requestedPath) {
        return res.status(400).send('Missing cookie or path');
    }
    
    if (!allowedPaths.has(requestedPath)) {
        return res.status(403).send('Forbidden path');
    }

    const cacheKey = requestedPath;
    const cachedEntry = cache[requestedPath];

    const effectiveCacheLifetime = PATH_CACHE_LIFETIMES[requestedPath] || DEFAULT_CACHE_LIFETIME_MS;

    if (cachedEntry && (Date.now() - cachedEntry.timestamp < effectiveCacheLifetime)) {
        console.log(`Serving ${requestedPath} from cache (still valid for ${effectiveCacheLifetime / 1000} seconds).`);
        return res.send(cachedEntry.data);
    } else if (cachedEntry) {
        console.log(`Cache for ${requestedPath} expired (lifetime was ${effectiveCacheLifetime / 1000} seconds). Re-fetching.`);
        delete cache[cacheKey];
    } else {
        console.log(`No cache for ${requestedPath}. Fetching.`)
    }

    try {
        console.log(`Fetching ${requestedPath} from upstream.`);
        const response = await axios.get(`https://summer.hackclub.com${requestedPath}`, {
            headers: {
                'Cookie': cookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br', 
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
            decompress: true, 
        });

        const htmlContent = response.data;
        const $ = cheerio.load(htmlContent);

        let apiResponseData = {
            path: requestedPath,
            status: 'success',
            extractedData: {}
        }

        if (requestedPath === '/campfire') {
            const todayTime = $('[data-hackatime-dashboard-target="todayTime"]').text().trim();
            const totalTime = $('[data-hackatime-dashboard-target="totalTime"]').text().trim();

            apiResponseData.extractedData = {
                todayCodingTime: todayTime,
                totalCodingTime: totalTime
            };
        } else if (requestedPath === '/explore') {
            try {
                const exploreResponse = await axios.get('https://summer.hackclub.com/api/v1/projects', {
                    headers: {
                        'Cookie': cookie,
                        'User-Agent': 'Mozilla/5.0',
                        'Accept': 'application/json'
                    }
                });

                let projects = exploreResponse.data;
                const projectTitles = projects.map(project => project.name || project.title || 'Untitled');

                apiResponseData.extractedData = {
                    projectTitles,
                    rawProjects: projects
                }
            } catch (apiErr) {
                console.error('Error fetching /explore project API:', apiErr.message);
                apiResponseData.extractedData = {
                    projectTitles: [],
                    rawProjects: []
                };
            }
        } else if (requestedPath === '/projects') {
            const yourProjects = [];
            apiResponseData.extractedData.yourProjects = yourProjects
        } else if (requestedPath === '/shop') {
            const shopItems = [];
            apiResponseData.extractedData.shopItems = shopItems;
        } else if (requestedPath === '/vote') {
            const voteInfo = {};
            apiResponseData.extractedData.voteInfo = voteInfo;
        };

        cache[cacheKey] = {
            data: apiResponseData,
            timestamp: Date.now()
        };

        res.json(apiResponseData);
    } catch (err) {
        console.error(`Error fetching ${requestedPath}: `, err.message);
        res.status(500).json({ status: 'error', message: `Failed to fetch data for ${requestedPath}` });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Client proxy server running on http://localhost:${PORT}`);
    console.log(`Access the client at http://localhost:${PORT}/index.html`);
});