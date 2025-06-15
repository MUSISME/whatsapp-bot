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

            const qr = await new Promise((resolve, reject) => {
                let attempts = 0;
                const interval = setInterval(() => {
                    attempts++;
                    const session = whatsappService.getSession(phoneNumber);
                    if (session?.qr) {
                        clearInterval(interval);
                        resolve(session.qr);
                    } else if (attempts > 20) {
                        clearInterval(interval);
                        reject(new Error('QR code timeout'));
                    }
                }, 500);
            });

            res.json({ qr });
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
}

module.exports = new DeviceController(); 