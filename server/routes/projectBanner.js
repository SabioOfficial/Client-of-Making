const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const router = express.Router();

router.get('/project-banner/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const response = await fetch(`https://summer.hackclub.com/projects/${id}`);
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