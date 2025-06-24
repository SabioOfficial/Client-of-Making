const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const router = express.Router();

// thanks to Alimad Co for doing this amazing ~scraping~ API, API....
const BIN_URL = 'https://api.jsonbin.io/v3/b/685add9d8a456b7966b4ee06/latest';
const BIN_KEY = '$2a$10$B4zVEH/1/wujcr7gMMlHsu0/tQwihEJrtQtOjLX07Ec4eIqINMU1m';

router.get('/project-banner/:id', async (req, res) => {
    const { id } = req.params;
    const index = parseInt(id, 10);

    try {
        const response = await fetch(`https://summer.hackclub.com/projects/${id}`, {
            headers: {
                'Cookie': cookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
            redirect: 'manual'
        });

        if (response.status >= 300 && response.status < 400) {
            return res.status(401).json({ error: 'Unauthorized or redirected.' });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        let bannerUrl = $('img.object-contain.w-full.h-full.max-h-full.max-w-full').attr('src')?.trim();

        if (bannerUrl) {
            if (bannerUrl.startsWith('/')) {
                bannerUrl = `https://summer.hackclub.com${bannerUrl}`;
            }
            return res.json({ url: bannerUrl });
        } else {
            return res.status(404).json({ error: 'Banner not found' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;