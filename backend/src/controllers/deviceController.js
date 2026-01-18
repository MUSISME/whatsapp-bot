const whatsappService = require('../services/whatsappService');

class DeviceController {
    async addPhone(req, res) {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        const session = whatsappService.getSession(phoneNumber);
        if (session) {
            return res.status(400).json({ message: 'Phone already registered' });
        }

        try {
            await whatsappService.startSession(phoneNumber);

            const pairingCode = await new Promise((resolve, reject) => {
                let attempts = 0;
                const interval = setInterval(() => {
                    attempts++;
                    const session = whatsappService.getSession(phoneNumber);
                    if (session?.pairingCode) {
                        clearInterval(interval);
                        resolve(session.pairingCode);
                    } else if (attempts > 120) { // increased timeout
                        clearInterval(interval);
                        reject(new Error('Pairing code timeout'));
                    }
                }, 500);
            });

            res.json({ pairingCode });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Failed to start session', error: err.message });
        }
    }

    deletePhone(req, res) {
        const phone = req.params.phone;
        const session = whatsappService.getSession(phone);
        if (!session) {
            return res.status(404).json({ message: 'Phone not found' });
        }

        try {
            whatsappService.deleteSession(phone);
            res.json({ message: 'Deleted and logged out' });
        } catch (err) {
            res.status(500).json({ message: 'Failed to delete session', error: err.message });
        }
    }

    getQR(req, res) {
        const phone = req.params.phone;
        const session = whatsappService.getSession(phone);
        if (!session) {
            return res.status(404).json({ message: 'Phone not found' });
        }
        if (!session.qr) {
            return res.status(404).json({ message: 'QR code not available yet' });
        }

        res.json({ qr: session.qr });
    }

    getRegisteredDevices(req, res) {
        const devices = whatsappService.getAllSessions();
        res.json(devices);
    }

    async sendMessage(req, res) {
        const { phoneNumber, to, message } = req.body;
        if (!phoneNumber || !to || !message) {
            return res.status(400).json({ message: 'phoneNumber, to, and message are required' });
        }

        const session = whatsappService.getSession(phoneNumber);
        if (!session || !session.isConnected) {
            return res.status(400).json({ message: 'Session not found or not connected' });
        }

        try {
            await whatsappService.sendMessage(phoneNumber, to, message);
            res.json({ message: 'Message sent successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Failed to send message', error: err.message });
        }
    }
}

module.exports = new DeviceController(); 