const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// Add a new phone number
router.post('/add-phone', deviceController.addPhone);

// Delete a phone number
router.delete('/delete-phone/:phone', deviceController.deletePhone);

// Get QR code for a phone number
router.get('/get-qr/:phone', deviceController.getQR);

// Get all registered devices
router.get('/get-registered-devices', deviceController.getRegisteredDevices);

// Send a message
router.post('/send-message', deviceController.sendMessage);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

module.exports = router; 