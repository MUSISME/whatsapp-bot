const fetch = require('node-fetch');
const config = require('../config');

class GASService {
    async sendMessage(messageInfo) {
        try {
            const res = await fetch(config.GAS_WEBAPP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(messageInfo),
            });
            const json = await res.json();
            if (json.status !== 'success') {
                console.error('Failed to send message to GAS:', json.message);
            }
        } catch (err) {
            console.error('Error sending to GAS:', err);
        }
    }
}

module.exports = new GASService(); 