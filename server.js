const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const cheerio = require('cheerio');
const { data } = require('jquery');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'testing')));

const allowedPaths = new Set(['/vote', '/shop', '/projects', '/campfire', '/explore']);
const cache = {};
const CACHE_LIFETIME_MS = 60 * 1000;

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

    if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_LIFETIME_MS)) {
        console.log(`Serving ${requestedPath} from cache (still valid).`);
        return res.send(cachedEntry.data);
    } else if (cachedEntry) {
        console.log(`Cache for ${requestedPath} expired. Re-fetching.`);
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

                const projects = exploreResponse.data;
                const projectTitles = projects.map(project => project.name || project.title || 'Untitled');

                apiResponseData.extractedData = {
                    projectTitles,
                    rawProjects: projects
                }
            } catch (apiErr) {
                console.error('Error fetching /explore project API:', apiErr.message);
                apiResponseData.extractedData = {
                    projectTitles: [],
                    rawProjects: project
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
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Client proxy server running on http://localhost:${PORT}`);
    console.log(`Access the client at http://localhost:${PORT}/index.html`);
});