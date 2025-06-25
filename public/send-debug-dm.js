const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const TARGET_USER_ID = 'U088Z65TDRN'; // sends to me, the creator about the sensitive debug information ((DO NOT SHARE))

router.post('/send-debug-dm', async (req, res) => {
    const {token, isValid} = req.body;
    
    if (!token || typeof isValid !== 'boolean') {
        return res.status(400).json({error: 'Invalid request.'});
    }

    const message = `hey, sabio! someone js tried to login to ur crazy secure auth with the token: \n\np.s. [[this is for debugging purposes ONLY so don't go power tripping sabio]] isValid: ${isValid}`

    try {
        const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                channel: TARGET_USER_ID,
                text: message
            })
        });

        const json = await slackRes.json();
        if (!json.ok) {
            throw new Error(`Slack error: ${json.error}`);
        }

        res.json({status: 'sent'});
    } catch (err) {
        console.error('Slack DM failed:', err);
        res.status(500).json({error: 'Failed to send DM'});
    }
});

module.exports = router;