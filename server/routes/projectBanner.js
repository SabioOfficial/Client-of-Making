const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

router.get('/project-banner/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const response = await fetch(`https://somps.vercel.app/api/project/${id}`);

        if (!response.ok) {
            return res.status(response.status).json({error: 'Failed to fetch project data'});
        }

        const project = await response.json();
        let imageUrl = project.imageUrl;

        if (!imageUrl) {
            return res.status(404).json({error: 'Banner image not found.'});
        }

        if (imageUrl.startsWith('/')) {
            imageUrl = `https://summer.hackclub.com${imageUrl}`
        } else if (imageUrl === "https://hc-cdn.hel1.your-objectstorage.com/s/v3/42eb885e3ebc20bd5e94782b7b4bcb31bcc956d3_i.png" || imageUrl === null) {
            imageUrl = "/public/banner-placeholder.png"
        }

        return res.json({url: imageUrl});
    } catch (err) {
        console.error('Failed to fetch banner: ', err.message);
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;