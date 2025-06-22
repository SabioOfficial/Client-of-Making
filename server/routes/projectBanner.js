const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const router = express.Router();

router.get('/project-banner/:id', async (req, res) => {
    const { id } = req.params;
    const cookie = req.params.cookie;

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
            return res.status(401).json({error: 'Unauthorized or redirected.'});
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        let bannerUrl = $('main > div:nth-of-type(2) div:nth-of-type(2) > div:nth-of-type(1) img').attr('src');

        if (bannerUrl) {
            if (bannerUrl.startsWith('/')) {
                bannerUrl = `https://summer.hackclub.com${bannerUrl}`;
            }
            res.json({ url: bannerUrl });
        } else {
            res.status(404).json({ error: 'Banner not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;